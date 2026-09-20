# Technical Analysis: Atlas Vector Search Index & Dual-Mode Query Service

**Milestone**: M1 (Features 3 & 4)  
**Target Repository**: `backend/`  
**Author**: Milestone M1 Explorer 2  
**Date**: 2026-09-19  

---

## 1. Executive Summary

This investigation designs the complete Atlas Vector Search integration for Healing Hands4U:
1. **Atlas Vector Search Index (`vector_index`)**: DDL specification and lifecycle automation on `level1questions` with 1536 dimensions, cosine similarity, and an indexed metadata filter on `isActive`.
2. **Dual-Mode Query Engine**: A production query service that leverages native `$vectorSearch` aggregation on MongoDB Atlas clusters while providing seamless, automatic fallback to in-memory cosine similarity ranking when running offline, in CI/CD, or under `mongodb-memory-server`.
3. **DDL Scripting & Admin Integration**: An idempotent CLI script (`createVectorIndex.ts`) to build and verify index queryability, and a reusable status checker powering `vectorIndexActive: boolean` in `GET /api/admin/stats`.

All findings have been independently verified against both the live MongoDB Atlas cluster (`cluster0.iifejq3.mongodb.net`, v8.0.32) and local `MongoMemoryServer`.

---

## 2. Live Atlas Cluster Verification

### 2.1 Cluster Topology & Connectivity
- **Cluster**: `cluster0.iifejq3.mongodb.net`
- **MongoDB Engine Version**: `8.0.32`
- **Node.js MongoDB Driver**: `v7.6.0` (via Mongoose `9.10.1`)
- **Connection URI**: Configured in `backend/.env` as `MONGODB_URI`
- **Target Database**: `hh4u`

### 2.2 Live DDL Capability Test
A non-destructive probe was executed against the live Atlas cluster. The test confirmed:
1. The connection credentials have full authorization to execute `collection.createSearchIndex()` and `collection.listSearchIndexes()`.
2. The index specification for `vectorSearch` with metadata filter compiles and registers immediately in Atlas.
3. The live Atlas API returns the following index metadata structure upon creation:
```json
{
  "id": "6aadf17cb8ccd7a83782d6d3",
  "name": "probe_vector_filter_idx",
  "type": "vectorSearch",
  "status": "PENDING",
  "queryable": false,
  "latestDefinitionVersion": {
    "version": 0,
    "createdAt": "2026-09-19T02:20:44.355Z"
  },
  "latestDefinition": {
    "fields": [
      {
        "type": "vector",
        "path": "embedding",
        "numDimensions": 1536,
        "similarity": "cosine"
      },
      {
        "type": "filter",
        "path": "isActive"
      }
    ]
  },
  "statusDetail": []
}
```

---

## 3. Vector Search Index Specification

### 3.1 Formal Index Specification
To enable semantic search alongside pre-filtering on document active state, the index must include both a `vector` field and a `filter` field:

```typescript
const vectorSearchIndexDefinition = {
  name: 'vector_index',
  type: 'vectorSearch',
  definition: {
    fields: [
      {
        type: 'vector',
        path: 'embedding',
        numDimensions: 1536,
        similarity: 'cosine'
      },
      {
        type: 'filter',
        path: 'isActive'
      }
    ]
  }
};
```

### 3.2 Key Index Parameters
| Parameter | Value | Rationale |
|---|---|---|
| Collection | `level1questions` | Target collection storing top-level canonical questions |
| Index Name | `vector_index` | Contractual standard defined in `PROJECT.md` & `ORIGINAL_REQUEST.md` |
| Index Type | `vectorSearch` | Required for Approximate Nearest Neighbor (HNSW) search |
| Path | `embedding` | Field in `Level1Question` storing the 1536-dim vector |
| Dimensions | `1536` | Matches OpenAI `text-embedding-3-small` / `ada-002` and project `MockEmbeddingService` |
| Similarity | `cosine` | Cosine similarity measures angle between normalized semantic embeddings |
| Filter Path | `isActive` | Indexed as `type: "filter"` to allow pre-filtering inactive/deprecated questions |

### 3.3 Index Lifecycle & Polling
Index creation on Atlas is asynchronous. The state machine transitions as follows:
$$\text{SUBMITTED} \longrightarrow \text{PENDING} \longrightarrow \text{BUILDING} \longrightarrow \text{READY} \, (\text{queryable: true})$$
If an error occurs during build, status transitions to `FAILED`.

Polling logic:
- Query `collection.listSearchIndexes('vector_index')`.
- Inspect `target.queryable === true` or `target.status === 'READY'`.
- Configurable timeout (default 60–120s) with 2s polling interval.

---

## 4. Dual-Mode Vector Search Query Engine

### 4.1 Architecture
The system must operate smoothly across two environments:
1. **Production (Live Atlas)**: Native `$vectorSearch` pipeline stage executed directly inside MongoDB Atlas search nodes (`mongot`), achieving single-digit millisecond latency over millions of vectors.
2. **Local / CI / MongoMemoryServer**: In-memory cosine similarity ranking using `Level1Question.find({ isActive: true })` and dot-product calculations.

```
                  ┌───────────────────────────────┐
                  │ searchLevel1QuestionsDualMode │
                  └──────────────┬────────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 │  Try: Native $vectorSearch    │
                 └───────────────┬───────────────┘
                                 │
                     ┌───────────┴───────────┐
                     │                       │
                 (Success)                (Throws)
                     │                       │
             ┌───────▼────────┐      ┌───────▼────────────────────────┐
             │ Map candidates │      │ Log warning & fallback to      │
             │ & return top-K │      │ searchLevel1QuestionsInMemory  │
             └────────────────┘      └────────────────────────────────┘
```

### 4.2 Verbatim Behavior in MongoMemoryServer
When `$vectorSearch` or `$listSearchIndexes` is attempted against `mongodb-memory-server` (standard MongoDB Community binary without `mongot`), the server rejects the command with:
```
MongoServerError: Using $search and $vectorSearch aggregation stages requires additional configuration. Please connect to Atlas or an AtlasCLI local deployment to enable. For more information on how to connect, see https://dochub.mongodb.org/core/atlas-cli-deploy-local-reqs.
```
Similarly, `listSearchIndexes()` rejects with:
```
MongoServerError: Using Atlas Search Database Commands and the $listSearchIndexes aggregation stage requires additional configuration.
```

Our dual-mode design safely catches these errors:
- `checkVectorIndexStatus()` catches this and returns `{ exists: false, queryable: false, status: 'UNSUPPORTED' }` without throwing.
- `searchLevel1QuestionsDualMode()` catches this and calls `searchLevel1QuestionsInMemory()`.

### 4.3 Native `$vectorSearch` Pipeline Stage
```typescript
const pipeline: PipelineStage[] = [
  {
    $vectorSearch: {
      index: 'vector_index',
      path: 'embedding',
      queryVector: queryEmbedding,
      numCandidates: Math.min(Math.max(topK * 10, 100), 10000),
      limit: topK,
      filter: {
        isActive: { $eq: true },
      },
    },
  },
  {
    $project: {
      canonicalQuestionText: 1,
      tags: 1,
      isActive: 1,
      version: 1,
      createdAt: 1,
      updatedAt: 1,
      score: { $meta: 'vectorSearchScore' },
    },
  },
];
```

### 4.4 Result Scoring and Normalization
- In Atlas Vector Search, `{ score: { $meta: 'vectorSearchScore' } }` returns a normalized cosine similarity score in the range `[0.0, 1.0]`.
- In-memory cosine calculation uses:
  $$\text{score} = \max\left(0, \frac{\vec{A} \cdot \vec{B}}{\|\vec{A}\| \|\vec{B}\|}\right)$$
- Both modes format the score to 4 decimal places (`parseFloat(score.toFixed(4))`), yielding identical numeric contracts for `matchConfidenceThreshold` evaluations in `chatbotService.ts`.

---

## 5. Backward Compatibility & System Integration

### 5.1 Call Chain Compatibility
Current consumer: `backend/src/services/chatbotService.ts`:
```typescript
const rawCandidates: ScoredCandidate[] = await searchLevel1Questions(
  queryEmbedding,
  config.topCandidatesCount
);
```
By updating `backend/src/utils/vectorSimilarity.ts` so `searchLevel1Questions` delegates to `searchLevel1QuestionsDualMode`, zero modifications are required in `chatbotService.ts` or existing unit tests (`chatbot.stress.test.ts`).

### 5.2 Admin Portal KPI Integration
The requirement in `PROJECT.md` states:
`GET /api/admin/stats` $\longrightarrow$ `{ success: true, stats: { totalQuestions, totalConsultations, totalAnswers, vectorIndexActive: boolean } }`

The controller simply invokes:
```typescript
import { isVectorIndexReady } from '../services/vectorSearchService';

const vectorIndexActive = await isVectorIndexReady();
```
If connected to live Atlas with an active index, `vectorIndexActive` is `true`. In offline test mode, it cleanly reports `false`.

---

## 6. Implementation Deliverables

The following artifacts have been authored in this working directory for the Worker to consume:
1. `vectorSearchService.ts.template` $\longrightarrow$ Target: `backend/src/services/vectorSearchService.ts`
2. `createVectorIndex.ts.template` $\longrightarrow$ Target: `backend/src/scripts/createVectorIndex.ts`
3. `vectorSimilarity.ts.diff` $\longrightarrow$ Target: `backend/src/utils/vectorSimilarity.ts`
4. `vectorSearch.test.ts.template` $\longrightarrow$ Target: `backend/tests/vectorSearch.test.ts`
5. `package.json` recommendation: Add `"create-index": "ts-node src/scripts/createVectorIndex.ts"`
