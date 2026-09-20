# Backend & MongoDB Atlas Data Layer Survey — Handoff Report

## Executive Summary
This survey establishes the authoritative technical architecture and implementation roadmap for the **Healing Hands4U Web Admin Portal and Backend API** (Milestone 4 / Follow-up 2026-09-19T02:10:43Z).
Key discoveries:
1. **Live MongoDB Atlas Cluster**: Successfully validated live connectivity to MongoDB Atlas v8.0.32 (`cluster0.iifejq3.mongodb.net`). Programmatically verified that `collection.createSearchIndex()` supports Atlas Vector Search (`type: "vectorSearch"`) with cosine similarity and 1536 dimensions.
2. **Deterministic Seed Dataset Architecture**: In `/Users/aditya/workspace/hh4u/database-dummy.xlsx`:
   - `level1` (185 sheet rows = 1 header + 184 unique user questions).
   - `ConsultationQueries` (185 sheet rows = 1 header + 184 question trees, perfectly 1:1 aligned with `level1`).
   - `Answers` (221 sheet rows = 1 header + 220 answer records). Crucially, 184 answer rows correspond to direct Level 1 questions, and the remaining 36 answer rows correspond to the 36 unique diagnostic questions shared across consultation trees! 195/220 rows contain embedded YouTube video links.
3. **Backwards-Compatible Schema Evolution**: Existing Express/Mongoose services (`chatbotService.ts`, `consultationService.ts`) and test suites (6 suites, 99 tests passing) require `Answer.level1QuestionId` to be made optional (`required: false`) and enhanced with `questionText`, `reason`, `remedy`, and `answerType` to accommodate both direct and diagnostic consultation answers without breaking existing logic.
4. **Vector Search Dual-Mode Execution**: In production, leverage native Atlas `$vectorSearch` pipeline. For offline Jest/CI with `mongodb-memory-server`, fall back transparently to the existing in-memory cosine similarity ranking.

---

## 1. Observation

### 1.1 Tech Stack & Backend Dependencies
- **Runtime & Language**: Node.js v25.2.1, TypeScript v5.9.3, CommonJS module system (`tsconfig.json: "target": "es2020", "module": "commonjs"`).
- **Web Framework**: Express v5.2.1 (`backend/package.json:19`).
- **Database ODM**: Mongoose v9.10.1 (`backend/package.json:23`), MongoDB Driver v6.14+.
- **Authentication**: `jsonwebtoken` v9.0.3, `google-auth-library` v11.1.0 (`backend/package.json:20,22`).
- **Security & Config**: `cors` v2.8.6, `helmet` v8.3.0, `dotenv` v17.4.2 (`backend/package.json:17,18,21`).
- **Testing Suite**: `jest` v30.5.1, `ts-jest` v29.4.12, `supertest` v7.2.2, `mongodb-memory-server` v11.2.0 (`backend/package.json:28-35`).
- **Test Baseline**: Executing `npm test` inside `backend/` executed 6 suites and 99 tests:
  ```
  Test Suites: 6 passed, 6 total
  Tests:       99 passed, 99 total
  Snapshots:   0 total
  Time:        10.837 s
  ```
- **Missing Required Dependencies**:
  - Excel parser: Neither `xlsx` nor `exceljs` is installed in `backend/package.json`.
  - Multipart upload middleware: `multer` and `@types/multer` are not installed.
  - Password hashing for admin authentication: `bcryptjs` and `@types/bcryptjs` are not installed (or native Node `crypto` must be used).

### 1.2 MongoDB Atlas Configuration & Live Cluster Probing
- **Configuration File**: `/Users/aditya/workspace/hh4u/backend/.env`
- **Environment Variables**:
  ```ini
  MONGODB_USERNAME="test1magnitude_db_user"
  MONGODB_PASSWORD="[REDACTED]"
  MONGODB_URI="mongodb+srv://test1magnitude_db_user:[REDACTED]@cluster0.iifejq3.mongodb.net"
  ```
- **Connection Logic**: `backend/src/config/db.ts:6-19`:
  ```typescript
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  const conn = await mongoose.connect(mongoUri);
  ```
- **Cluster Diagnostics (Executed Live)**:
  - Cluster Primary Host: `ac-iwm5wyi-shard-00-00.iifejq3.mongodb.net:27017`
  - MongoDB Engine Version: `8.0.32`
  - Databases Present on Cluster: `['sample_mflix', 'test', 'admin', 'local']`
  - Default Active DB: Because `MONGODB_URI` contains no path suffix (e.g. `/hh4u`), Mongoose connects to database `test`.
  - Existing Collections in `test`: `['connectiontests']` (0 documents). The database is clean.
- **Atlas Vector Search Probing (Executed Live)**:
  - Invoked `coll.createSearchIndex({ name: 'test_vector_index', type: 'vectorSearch', definition: { fields: [{ type: 'vector', path: 'embedding', numDimensions: 1536, similarity: 'cosine' }] } })`.
  - Result: Atlas accepted and registered the index definition in `PENDING` state:
    ```json
    {
      "id": "6aadf0311e9da21a52943d5c",
      "name": "test_vector_index",
      "type": "vectorSearch",
      "status": "PENDING",
      "queryable": false
    }
    ```
  - Cleaned up probe index using `coll.dropSearchIndex('test_vector_index')`.
  - Conclusion: Database credentials have full DDL permissions to create and manage Atlas Search indexes.

### 1.3 Inspection of Reference Data (`database-dummy.xlsx`)
Probing `/Users/aditya/workspace/hh4u/database-dummy.xlsx` using `openpyxl` revealed:
- **Sheet 1: `level1`**:
  - Excel Range: `A1:A185` (185 rows total = 1 header row + 184 data rows).
  - Column Header: `Questions` (plural).
  - Unique Non-Empty Questions: Exactly 184.
  - Zero null or empty cells.
- **Sheet 2: `ConsultationQueries`**:
  - Excel Range: `A1:D185` (185 rows total = 1 header row + 184 data rows).
  - Column Headers: `['Questions', 'Diagnostic Question 1', 'Diagnostic Question 2', 'Diagnostic Question 3']`.
  - Alignment: Questions in column `Questions` match the 184 questions in `level1` row-for-row in identical order (0 mismatches).
  - Unique Diagnostic Questions: Across all 184 rows (552 total diagnostic cells), there are exactly 36 unique diagnostic questions.
  - Sharing Pattern: All 36 diagnostic questions are reused across multiple Level 1 conditions (e.g., `"Have you been experiencing the problem described in your question repeatedly or persistently?"` appears in 98 questions; diabetes-related diagnostic questions appear across 11 questions).
- **Sheet 3: `Answers`**:
  - Excel Range: `A1:C221` (221 rows total = 1 header row + 220 data rows).
  - Column Headers: `['Question', 'Reason', 'Remedy']` (Note singular `Question`).
  - Row Distribution:
    - Rows 1 to 184: Correspond 100% to the 184 Level 1 canonical questions in the exact same sequence.
    - Rows 185 to 220 (36 rows): Correspond 100% to the 36 unique diagnostic questions from `ConsultationQueries`.
    - Zero leftover or unmapped rows ($184 + 36 = 220$ data rows).
  - Rich Content & Media Links:
    - 195 out of 220 rows contain YouTube URLs (`https://youtu.be/...`).
    - 152 URLs in `Remedy` column; 120 URLs in `Reason` column.
    - Fields contain trailing newlines (`\n\n`) that require sanitization/trimming.

### 1.4 Existing Models & Schemas (`backend/src/models/`)
- `Level1Question.ts`:
  - Collection name: `level1questions`
  - Fields: `canonicalQuestionText` (String, required), `embedding` ([Number], 1536-dim), `tags` ([String]), `isActive` (Boolean, default: true), `version` (Number, default: 1).
- `ConsultationQuery.ts`:
  - Collection name: `consultationqueries`
  - Fields: `level1QuestionId` (ObjectId, ref: Level1Question, required), `diagnosticQuestions` (Array of `{ id: string, questionText: string }`), `answerBranches` (Array of `{ conditions: Map<string, string>, resolvedAnswerId: ObjectId }`).
- `Answer.ts`:
  - Collection name: `answers`
  - Current Fields: `level1QuestionId` (ObjectId, required: true), `answerText` (String, required), `dosageInstructions` (String), `homeRemedyText` (String), `safetyDisclaimerText` (String), `videoUrl` (String).
- `Admin.ts`:
  - Collection name: `admins`
  - Fields: `email` (String, required, unique), `passwordHash` (String), `authProvider` ('password' | 'google'), `role` ('admin').
  - Note: No admin auth controller or login endpoints currently exist.
- Other models: `User.ts`, `Otp.ts`, `ChatbotSession.ts`, `NeedsReviewQuery.ts`, `QueryClickStats.ts`, `AppDatabaseVersion.ts`.

### 1.5 Existing REST API Routes (`backend/src/routes/` & `app.ts`)
- `app.ts:18`: `GET /health` -> `{ status: 'ok', message: 'Healing Hands4U API is running' }`
- `routes/authRoutes.ts:13-18`:
  - `POST /api/auth/guest`
  - `POST /api/auth/otp/request`
  - `POST /api/auth/otp/send`
  - `POST /api/auth/otp/verify`
  - `POST /api/auth/google`
  - `GET /api/auth/me` (protected by `authenticateToken`)
- `routes/chatbotRoutes.ts:33-39`:
  - `POST /chatbot/query` & `POST /api/chatbot/query` (mounted in `app.ts:23-24`)
  - `POST /chatbot/consultation-answer` & `POST /api/chatbot/consultation-answer`

---

## 2. Logic Chain

1. **Premise 1 (Atlas Connection & Configuration)**:
   - `backend/.env` provides valid credentials to MongoDB Atlas cluster `cluster0.iifejq3.mongodb.net`.
   - Live execution confirmed read, write, and search index creation privileges.
   - Because `MONGODB_URI` does not contain a specific database path, Mongoose defaults to `test`.
   - *Inference*: The application should support an explicit `DB_NAME` environment variable (e.g. `DB_NAME=hh4u` or `healinghands4u`) passed in `mongoose.connect(mongoUri, { dbName: process.env.DB_NAME || 'hh4u' })` or configure the URI path to keep production/demo data isolated from the raw default `test` database.

2. **Premise 2 (Vector Search Index Specification)**:
   - Chatbot vector similarity in `services/ai/mock/mockEmbeddingService.ts:4` produces 1536-dimensional unit vectors.
   - Requirement R1 mandates creating an Atlas Vector Search index on the questions collection.
   - Probing confirmed that `collection.createSearchIndex` works directly via Mongoose/MongoDB Driver v6+.
   - *Inference*: The vector index must be defined as:
     - Collection: `level1questions`
     - Index Name: `vector_index` (or `vector_search_index`)
     - Type: `vectorSearch`
     - Definition: `fields: [{ type: "vector", path: "embedding", numDimensions: 1536, similarity: "cosine" }, { type: "filter", path: "isActive" }]`.

3. **Premise 3 (Dual-Mode Execution for Test Pass Rate)**:
   - Unit and adversarial tests rely on `mongodb-memory-server`, which does not support the `$vectorSearch` pipeline stage and throws an error if called.
   - `backend/src/utils/vectorSimilarity.ts:55` currently implements an in-memory cosine similarity loop over all active questions.
   - *Inference*: The query helper `searchLevel1Questions` should attempt the native MongoDB `$vectorSearch` aggregation pipeline on the collection, but catch errors (or inspect connection topology) to fall back seamlessly to the in-memory cosine similarity loop. This guarantees 100% compatibility in both local Jest tests and live Atlas environments.

4. **Premise 4 (Excel Seed Dataset Relational Structure)**:
   - `database-dummy.xlsx` contains 184 canonical questions (`level1`), 184 consultation query trees (`ConsultationQueries`), and 220 answer records (`Answers`).
   - The first 184 answers map 1:1 to the 184 Level 1 questions.
   - The remaining 36 answers map to the 36 unique diagnostic questions in `ConsultationQueries`.
   - Currently, `backend/src/models/Answer.ts:14` enforces `level1QuestionId: { type: Schema.Types.ObjectId, ref: 'Level1Question', required: true }`.
   - *Inference*: If `level1QuestionId` remains `required: true`, inserting the 36 diagnostic question answers will fail validation.
   - *Inference*: `Answer.ts` must be updated to make `level1QuestionId` optional (`required: false`) and add `questionText: { type: String, required: true }`, `questionType: { type: String, enum: ['level1', 'diagnostic'], default: 'level1' }`, `reasonText?: string`, and `remedyText?: string`.

5. **Premise 5 (Admin Portal & Authentication Architecture)**:
   - Requirement R3 specifies admin authentication for the Web Portal with hardcoded or seeded admin credentials.
   - `backend/src/models/Admin.ts` already has `email`, `passwordHash`, and `role`.
   - *Inference*: We need an admin auth controller (`POST /api/admin/auth/login`) that issues a JWT containing `role: 'admin'`, and a middleware `requireAdmin` that rejects unauthenticated requests with 401 and non-admins with 403.
   - *Inference*: A seed routine or default admin account (`admin@hh4u.com` / configurable via `ADMIN_PASSWORD` in `.env`) must be initialized during startup/seeding.

6. **Premise 6 (Excel Parser & File Upload Pipeline)**:
   - Requirement R2 requires both a CLI seed script and a Web Portal file-upload endpoint (`POST /api/admin/upload-excel` or `/api/admin/import`).
   - *Inference*: Install `exceljs` (or `xlsx`) and `multer` (`@types/multer`).
   - *Inference*: Structure the parser as a shared reusable module (`backend/src/services/excelParserService.ts` or `utils/excelParser.ts`) that accepts either a file path or a Buffer (from `req.file.buffer`).
   - *Inference*: Implement strict schema validation: verify presence of all 3 required sheets (`level1`, `ConsultationQueries`, `Answers`) and exact required columns; reject malformed files with descriptive 400 Bad Request error messages.

---

## 3. Caveats

1. **Row Count Terminology (185 vs 184 / 221 vs 220)**:
   - In `ORIGINAL_REQUEST.md`, row counts are stated as: `level1 (185 rows)`, `ConsultationQueries (185 rows)`, `Answers (221 rows)`.
   - In Excel, Row 1 is the header. The actual data row counts are 184, 184, and 220.
   - Programmatic tests must assert against `184` unique questions or clarify whether total rows (including header) or data rows are counted.
2. **Atlas Vector Search Asynchronous Provisioning**:
   - Creating an index via `collection.createSearchIndex()` is asynchronous on MongoDB Atlas. It enters `PENDING` status and may take 15 to 90 seconds to become `queryable: true`.
   - The seed script and test suite should include a polling utility that checks `collection.listSearchIndexes()` until `queryable === true` with a configurable timeout.
3. **Pluralization of Mongoose Collections**:
   - Mongoose defaults:
     - `Level1Question` -> `level1questions`
     - `ConsultationQuery` -> `consultationqueries`
     - `Answer` -> `answers`
     - `Admin` -> `admins`
   - Any Atlas Vector Search index must target the exact underlying collection name `level1questions`.
4. **Header Casing & Pluralization Nuance**:
   - Sheet 1 header: `'Questions'` (plural).
   - Sheet 2 header: `'Questions'` (plural).
   - Sheet 3 header: `'Question'` (singular).
   - The parser must account for this discrepancy to avoid key lookup failures.
5. **Admin Portal Skeleton**:
   - `/Users/aditya/workspace/hh4u/admin-panel` currently only has subdirectories (`components`, `contexts`, `pages`, `services`) with no `package.json` or code files. It is an empty workspace awaiting frontend initialization.

---

## 4. Conclusion & Actionable Recommendations

### 4.1 Schema Evolution Plan
1. **`Answer.ts`**:
   - Make `level1QuestionId` optional (`required: false`).
   - Add fields:
     - `questionText: { type: String, required: true, index: true }`
     - `questionType: { type: String, enum: ['level1', 'diagnostic'], default: 'level1', index: true }`
     - `reason: { type: String }`
     - `remedy: { type: String }`
     - `videoUrl: { type: String }`
   - Set `answerText` = `${reason}\n\n${remedy}` to maintain 100% backward compatibility with `chatbotService.ts`.
2. **`Level1Question.ts`**:
   - Retain existing fields (`canonicalQuestionText`, `embedding`, `tags`, `isActive`, `version`).
   - Add text index on `canonicalQuestionText` for fast text search in Admin Portal table.
3. **`ConsultationQuery.ts`**:
   - Retain existing schema.
   - Map diagnostic questions (`Diagnostic Question 1, 2, 3`) to `diagnosticQuestions: [{ id: 'q1', questionText: ... }, { id: 'q2', ... }, { id: 'q3', ... }]`.
   - Wire `answerBranches`:
     - `{ conditions: { q1: 'yes' }, resolvedAnswerId: <diagnosticAnswer1._id> }`
     - `{ conditions: { q2: 'yes' }, resolvedAnswerId: <diagnosticAnswer2._id> }`
     - `{ conditions: { q3: 'yes' }, resolvedAnswerId: <diagnosticAnswer3._id> }`
     - `{ conditions: { q1: 'no', q2: 'no', q3: 'no' }, resolvedAnswerId: <directAnswer._id> }`

### 4.2 MongoDB Atlas Vector Search Integration
1. **Index Creation Utility (`backend/src/utils/atlasVectorSearch.ts`)**:
   - Function `ensureVectorSearchIndex(collection: Collection, indexName = 'vector_index')`:
     - Calls `collection.listSearchIndexes()` to check if index already exists.
     - If missing, calls `collection.createSearchIndex(...)`.
     - Optional helper: `waitForIndexReady(collection, indexName, timeoutMs = 60000)`.
2. **Aggregation Pipeline for Semantic Search**:
   ```typescript
   const pipeline = [
     {
       $vectorSearch: {
         index: 'vector_index',
         path: 'embedding',
         queryVector: queryEmbedding,
         numCandidates: 50,
         limit: topK,
         filter: { isActive: { $eq: true } }
       }
     },
     {
       $project: {
         canonicalQuestionText: 1,
         tags: 1,
         isActive: 1,
         score: { $meta: 'vectorSearchScore' }
       }
     }
   ];
   ```
3. **Dual-Mode Fallback in `vectorSimilarity.ts`**:
   - Try executing `$vectorSearch` pipeline via Mongoose `Level1Question.aggregate(pipeline)`.
   - If error occurs (e.g. `MongoServerError: Unrecognized pipeline stage name: '$vectorSearch'` in memory-server), catch and fall back to `searchLevel1QuestionsInMemory()`.

### 4.3 REST API Endpoints Specification

#### A. Admin Authentication
- `POST /api/admin/auth/login`
  - Body: `{ email: string, password: string }`
  - Returns: `{ success: true, token: string, admin: { id: string, email: string, role: 'admin' } }`
- `GET /api/admin/auth/me`
  - Header: `Authorization: Bearer <adminToken>`
  - Returns: `{ success: true, admin: { id, email, role } }`

#### B. Knowledge Base Management (CRUD)
- `GET /api/admin/questions`
  - Query: `?page=1&limit=20&search=headache&tag=chronic`
  - Returns: `{ success: true, total: number, page: number, limit: number, questions: [...] }`
  - Each item includes populated consultation queries and direct answer.
- `GET /api/admin/questions/:id`
  - Returns question detail with consultation questions and answers.
- `POST /api/admin/questions`
  - Body: `{ canonicalQuestionText, tags, isActive, diagnosticQuestions: [string, string, string], answer: { reason, remedy, videoUrl } }`
  - Generates embedding, creates `Level1Question`, creates `Answer`, creates `ConsultationQuery` with branches.
- `PUT /api/admin/questions/:id`
  - Body: update question text, tags, active state, diagnostic questions, or remedy text.
  - Updates documents and regenerates embedding if question text changed.
- `DELETE /api/admin/questions/:id`
  - Deletes `Level1Question` and cascades delete to linked `ConsultationQuery` and direct `Answer`.

#### C. Bulk Import (Excel Parser)
- `POST /api/admin/import-excel` (or `/api/admin/upload-excel`)
  - Content-Type: `multipart/form-data`, file field: `file`
  - Validates `.xlsx` format, validates 3 sheets and required columns.
  - Upserts data and generates embeddings.
  - Returns: `{ success: true, message: 'Import completed', counts: { level1: 184, consultationQueries: 184, answers: 220 } }`

### 4.4 Seed Script Architecture (`backend/scripts/seedKnowledgeBase.ts`)
- Script entry: `npm run seed` or `npx ts-node scripts/seedKnowledgeBase.ts [path-to-file]`
- Defaults to `/Users/aditya/workspace/hh4u/database-dummy.xlsx`.
- Pipeline Steps:
  1. Connect to MongoDB Atlas using `MONGODB_URI` and `DB_NAME`.
  2. Parse `.xlsx` using `exceljs` into strongly-typed in-memory structures.
  3. Validate row counts and columns.
  4. Seed Default Admin (`admin@hh4u.com`) with hashed password.
  5. Generate embeddings for all 184 Level 1 questions via `aiContainer.embedding.generateEmbedding()`.
  6. Upsert `Level1Question` documents.
  7. Upsert `Answer` documents (184 direct + 36 diagnostic). Extract YouTube URLs.
  8. Upsert `ConsultationQuery` documents linking diagnostic questions and answer branches to the resolved answer IDs.
  9. Trigger Atlas Vector Search index creation (`vector_index`) on `level1questions`.
  10. Output completion summary with counts.

---

## 5. Verification Method

### 5.1 Project Test Suite (Regression Baseline)
```bash
cd /Users/aditya/workspace/hh4u/backend
npm test
```
*Expected*: All 6 existing test suites and 99 test cases pass without regressions.

### 5.2 MongoDB Atlas Live Connection & Database Check
```bash
cd /Users/aditya/workspace/hh4u/backend
node -r ts-node/register -e "
require('dotenv').config();
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DB_NAME || 'hh4u' })
  .then(conn => {
    console.log('Connected to Atlas host:', conn.connection.host);
    console.log('Database name:', conn.connection.db.databaseName);
    return mongoose.disconnect();
  });
"
```
*Expected*: Logs successful connection to Atlas host and confirms database name.

### 5.3 Programmatic Atlas Vector Search Index Verification
```bash
cd /Users/aditya/workspace/hh4u/backend
node -r ts-node/register -e "
require('dotenv').config();
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DB_NAME || 'hh4u' })
  .then(async conn => {
    const coll = conn.connection.db.collection('level1questions');
    const indexes = await coll.listSearchIndexes().toArray();
    console.log('Atlas search indexes:', indexes);
    await mongoose.disconnect();
  });
"
```
*Expected*: Returns list containing index `vector_index` with `type: "vectorSearch"`.

### 5.4 Excel Parser Verification Test
```bash
cd /Users/aditya/workspace/hh4u/backend
npm test -- -t "Excel Parser"
```
*Expected*:
1. Verifies parsing of `/Users/aditya/workspace/hh4u/database-dummy.xlsx` returns 184 level1 questions, 184 consultation query sets, and 220 answers.
2. Verifies rejection of malformed files (missing columns or sheets) with informative 400 errors.

### 5.5 Admin Authentication Verification Test
```bash
cd /Users/aditya/workspace/hh4u/backend
npm test -- -t "Admin Auth"
```
*Expected*:
1. Unauthenticated requests to `/api/admin/*` endpoints return 401.
2. Authenticated requests with valid admin credentials return 200 and access data.

### 5.6 Invalidation Conditions
- Any changes that alter the existing `chatbotService.ts` method signature or break `backend/tests/chatbot.test.ts`.
- Any seed script or schema change that requires external internet access for unit testing (must always support offline mocks).
- Hardcoding database name to `test` when production isolation requires `hh4u` or `healinghands4u`.
