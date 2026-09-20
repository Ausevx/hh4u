import mongoose, { PipelineStage } from 'mongoose';
import Level1Question, { ILevel1Question } from '../models/Level1Question';
import { cosineSimilarity, ScoredCandidate } from '../utils/vectorSimilarity';

export const VECTOR_INDEX_NAME = 'vector_index';
export const VECTOR_COLLECTION_NAME = 'level1questions';
export const EMBEDDING_DIMENSION = 768; // Gemini text-embedding-004

export interface VectorIndexStatus {
  exists: boolean;
  queryable: boolean;
  status?: string;
  indexName: string;
  error?: string;
  details?: any;
}

export interface CreateVectorIndexOptions {
  waitForReady?: boolean;
  timeoutMs?: number;
  pollIntervalMs?: number;
}

export interface SearchOptions {
  forceFallback?: boolean;
  numCandidates?: number;
  minScore?: number;
}

/**
 * Checks the status of the Atlas Vector Search index on the level1questions collection.
 * Safely handles environments where Atlas Search commands are unsupported (e.g. MongoMemoryServer).
 */
export async function checkVectorIndexStatus(
  indexName: string = VECTOR_INDEX_NAME
): Promise<VectorIndexStatus> {
  try {
    const db = mongoose.connection.db;
    if (!db) {
      return { exists: false, queryable: false, status: 'NO_CONNECTION', indexName };
    }

    const collection = db.collection(VECTOR_COLLECTION_NAME);
    const cursor = collection.listSearchIndexes(indexName);
    const indexes = await cursor.toArray();
    const target = indexes.find((idx: any) => idx.name === indexName) as any;

    if (!target) {
      return { exists: false, queryable: false, status: 'NOT_FOUND', indexName };
    }

    return {
      exists: true,
      queryable: target.queryable === true || target.status === 'READY',
      status: target.status || (target.queryable ? 'READY' : 'BUILDING'),
      indexName,
      details: target,
    };
  } catch (err) {
    // MongoMemoryServer or local standalone instance without Atlas Search mongot process
    return {
      exists: false,
      queryable: false,
      status: 'UNSUPPORTED',
      indexName,
      error: (err as Error).message,
    };
  }
}

/**
 * Checks if the vector search index exists and is ready to query.
 * Useful for health checks and GET /api/admin/stats (vectorIndexActive).
 */
export async function isVectorIndexReady(indexName: string = VECTOR_INDEX_NAME): Promise<boolean> {
  const status = await checkVectorIndexStatus(indexName);
  return status.queryable;
}

/**
 * DDL helper to create the Atlas Vector Search index on level1questions.
 * Idempotent: if index already exists and is queryable, returns immediately.
 */
export async function createVectorSearchIndex(
  options: CreateVectorIndexOptions = {}
): Promise<{ success: boolean; indexName: string; queryable: boolean; message: string }> {
  const { waitForReady = true, timeoutMs = 60000, pollIntervalMs = 2000 } = options;

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection not established');
  }

  // 1. Ensure target collection exists in the database
  const collections = await db.listCollections({ name: VECTOR_COLLECTION_NAME }).toArray();
  let collection = db.collection(VECTOR_COLLECTION_NAME);
  if (collections.length === 0) {
    collection = await db.createCollection(VECTOR_COLLECTION_NAME);
  }

  // 2. Check if index already exists and is ready
  try {
    const existing = await checkVectorIndexStatus(VECTOR_INDEX_NAME);
    if (existing.exists && existing.queryable) {
      return {
        success: true,
        indexName: VECTOR_INDEX_NAME,
        queryable: true,
        message: `Vector search index "${VECTOR_INDEX_NAME}" already exists and is queryable.`,
      };
    }
  } catch {
    // If checking throws, proceed with creation attempt
  }

  // 3. Define the Atlas Vector Search index specification
  const indexDefinition = {
    name: VECTOR_INDEX_NAME,
    type: 'vectorSearch',
    definition: {
      fields: [
        {
          type: 'vector',
          path: 'embedding',
          numDimensions: EMBEDDING_DIMENSION,
          similarity: 'cosine',
        },
        {
          type: 'filter',
          path: 'isActive',
        },
      ],
    },
  };

  await collection.createSearchIndex(indexDefinition);

  // 4. Poll until index becomes queryable if waitForReady is true
  if (waitForReady) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      const status = await checkVectorIndexStatus(VECTOR_INDEX_NAME);
      if (status.queryable) {
        return {
          success: true,
          indexName: VECTOR_INDEX_NAME,
          queryable: true,
          message: `Vector search index "${VECTOR_INDEX_NAME}" created and is now queryable.`,
        };
      }
      if (status.status === 'FAILED') {
        throw new Error(`Vector search index "${VECTOR_INDEX_NAME}" build failed on Atlas.`);
      }
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    return {
      success: true,
      indexName: VECTOR_INDEX_NAME,
      queryable: false,
      message: `Vector search index "${VECTOR_INDEX_NAME}" created but still building (timeout of ${timeoutMs}ms exceeded).`,
    };
  }

  return {
    success: true,
    indexName: VECTOR_INDEX_NAME,
    queryable: false,
    message: `Vector search index "${VECTOR_INDEX_NAME}" creation submitted successfully.`,
  };
}

/**
 * In-memory fallback top-K cosine ranker.
 * Operates offline without requiring MongoDB Atlas Search.
 */
export async function searchLevel1QuestionsInMemory(
  queryEmbedding: number[],
  topK: number = 5
): Promise<ScoredCandidate[]> {
  if (!queryEmbedding || !Array.isArray(queryEmbedding) || queryEmbedding.length === 0) {
    return [];
  }

  const activeQuestions = await Level1Question.find({ isActive: true }).exec();
  const scored: ScoredCandidate[] = [];

  for (const q of activeQuestions) {
    if (q.embedding && Array.isArray(q.embedding) && q.embedding.length > 0) {
      const rawScore = cosineSimilarity(queryEmbedding, q.embedding);
      const score = Math.max(0, parseFloat(rawScore.toFixed(4)));
      scored.push({
        item: q,
        level1QuestionId: q._id,
        canonicalQuestionText: q.canonicalQuestionText,
        score,
      });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

/**
 * Dual-Mode Vector Search Query:
 * 1. Primary: Native Atlas $vectorSearch pipeline stage with pre-filter on isActive: true.
 * 2. Fallback: Gracefully catches missing index or MongoMemoryServer, falling back to in-memory cosine ranking.
 */
export async function searchLevel1QuestionsDualMode(
  queryEmbedding: number[],
  topK: number = 5,
  options: SearchOptions = {}
): Promise<ScoredCandidate[]> {
  if (!queryEmbedding || !Array.isArray(queryEmbedding) || queryEmbedding.length === 0) {
    return [];
  }

  // Allow explicit fallback override (useful for testing fallback path)
  if (options.forceFallback) {
    return searchLevel1QuestionsInMemory(queryEmbedding, topK);
  }

  try {
    const numCandidates = options.numCandidates || Math.max(topK * 10, 100);

    const pipeline: any[] = [
      {
        $vectorSearch: {
          index: VECTOR_INDEX_NAME,
          path: 'embedding',
          queryVector: queryEmbedding,
          numCandidates,
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

    const results = await Level1Question.aggregate(pipeline).exec();

    // Map results to ScoredCandidate format
    const candidates: ScoredCandidate[] = results.map((doc: any) => ({
      item: doc as ILevel1Question,
      level1QuestionId: doc._id,
      canonicalQuestionText: doc.canonicalQuestionText,
      score: Math.max(0, parseFloat(Number(doc.score).toFixed(4))),
    }));

    return candidates;
  } catch (error) {
    // Graceful fallback to local in-memory cosine ranking
    console.warn(
      `[VectorSearch] Atlas $vectorSearch stage unavailable (${(error as Error).message}). Falling back to in-memory cosine ranking.`
    );
    return searchLevel1QuestionsInMemory(queryEmbedding, topK);
  }
}
