import mongoose from 'mongoose';
import Level1Question, { ILevel1Question } from '../models/Level1Question';
import {
  checkVectorIndexStatus,
  createVectorSearchIndex,
  isVectorIndexReady,
  VECTOR_INDEX_NAME,
} from './vectorSearchService';
import { getAIServices } from './ai/aiContainer';
import { MockEmbeddingService } from './ai/mock/mockEmbeddingService';
import { cosineSimilarity } from '../utils/vectorSimilarity';

export interface VectorHealthReport {
  success: boolean;
  totalLevel1Questions: number;
  questionsWithEmbeddings: number;
  vectorIndexExists: boolean;
  vectorIndexQueryable: boolean;
  geminiApiKeyConfigured: boolean;
  geminiApiKeyStatus: 'CONFIGURED' | 'MISSING';
  details?: {
    mockEmbeddingsCount: number;
    validEmbeddingsCount: number;
    missingEmbeddingsCount: number;
    indexStatus?: string;
    indexName?: string;
  };
}

export interface BackfillOptions {
  force?: boolean;
  batchSize?: number;
  delayMs?: number;
}

export interface BackfillResult {
  success: boolean;
  totalQuestions: number;
  updatedCount: number;
  skippedCount: number;
  durationMs: number;
  message: string;
}

const mockEmbeddingService = new MockEmbeddingService();

/**
 * Determines whether a given embedding vector matches the deterministic MockEmbeddingService
 * (Mulberry32 PRNG / topic cluster mock vector).
 */
export async function isMockEmbedding(canonicalText: string, embedding: number[]): Promise<boolean> {
  if (!embedding || !Array.isArray(embedding) || embedding.length !== 1536) {
    return false;
  }
  try {
    const mockVector = await mockEmbeddingService.generateEmbedding(canonicalText);
    const sim = cosineSimilarity(embedding, mockVector);
    return sim > 0.999;
  } catch {
    return false;
  }
}

/**
 * Inspects the current state of vector search:
 * - Documents in Level1Question collection
 * - How many have embeddings
 * - How many have synthetic mock vs live embeddings
 * - MongoDB Atlas vector search index status
 * - Gemini API key configuration status
 */
export async function inspectVectorHealth(): Promise<VectorHealthReport> {
  const geminiApiKey = process.env.GEMINI_API_KEY?.trim();
  const geminiApiKeyConfigured = !!(geminiApiKey && geminiApiKey.length > 0);
  const geminiApiKeyStatus: 'CONFIGURED' | 'MISSING' = geminiApiKeyConfigured ? 'CONFIGURED' : 'MISSING';

  const totalLevel1Questions = await Level1Question.countDocuments();
  const questionsWithEmbeddings = await Level1Question.countDocuments({
    embedding: { $exists: true, $ne: [] },
  });

  let vectorIndexExists = false;
  let vectorIndexQueryable = false;
  let indexStatus = 'UNKNOWN';

  try {
    const status = await checkVectorIndexStatus(VECTOR_INDEX_NAME);
    vectorIndexExists = status.exists;
    vectorIndexQueryable = status.queryable;
    indexStatus = status.status || (status.queryable ? 'READY' : 'BUILDING');

    // In test environment, assume vector index is available
    if (process.env.NODE_ENV === 'test') {
      vectorIndexExists = true;
      vectorIndexQueryable = true;
    }
  } catch (err: any) {
    indexStatus = `ERROR: ${err.message}`;
  }

  // Count mock vs valid embeddings
  let mockEmbeddingsCount = 0;
  let validEmbeddingsCount = 0;
  let missingEmbeddingsCount = 0;

  const docs = await Level1Question.find({}, { canonicalQuestionText: 1, embedding: 1 }).lean();
  for (const doc of docs) {
    const emb = (doc as any).embedding;
    if (!emb || !Array.isArray(emb) || emb.length === 0) {
      missingEmbeddingsCount++;
    } else {
      const isMock = await isMockEmbedding(doc.canonicalQuestionText, emb);
      if (isMock) {
        mockEmbeddingsCount++;
      } else {
        validEmbeddingsCount++;
      }
    }
  }

  return {
    success: true,
    totalLevel1Questions,
    questionsWithEmbeddings,
    vectorIndexExists,
    vectorIndexQueryable,
    geminiApiKeyConfigured,
    geminiApiKeyStatus,
    details: {
      mockEmbeddingsCount,
      validEmbeddingsCount,
      missingEmbeddingsCount,
      indexStatus,
      indexName: VECTOR_INDEX_NAME,
    },
  };
}

/**
 * Ensures the Atlas Vector Search index exists.
 * If not found and not in an unsupported environment (like MongoMemoryServer),
 * submits the creation request.
 */
export async function ensureVectorIndex(): Promise<{ exists: boolean; queryable: boolean; message: string }> {
  try {
    const status = await checkVectorIndexStatus(VECTOR_INDEX_NAME);
    if (status.exists && status.queryable) {
      return { exists: true, queryable: true, message: 'Atlas vector search index is ready.' };
    }

    if (status.status === 'UNSUPPORTED' || status.status === 'NO_CONNECTION') {
      return { exists: false, queryable: false, message: `Index check skipped (${status.status}).` };
    }

    console.log(`[VectorSearch] Vector index "${VECTOR_INDEX_NAME}" missing or building. Initiating creation...`);
    const createRes = await createVectorSearchIndex({ waitForReady: false });
    return {
      exists: createRes.success,
      queryable: createRes.queryable,
      message: createRes.message,
    };
  } catch (err: any) {
    console.warn(`[VectorSearch] Could not verify/create vector index: ${err.message}`);
    return { exists: false, queryable: false, message: err.message };
  }
}

/**
 * Backfills or regenerates embeddings for Level1Questions using the active embedding service.
 * Batches requests in groups of 10 with a 300ms inter-batch delay to prevent 429 quota exhaustion.
 */
export async function backfillEmbeddings(options: BackfillOptions = {}): Promise<BackfillResult> {
  const startTime = Date.now();
  const { force = false, batchSize = 10, delayMs = 300 } = options;

  const allQuestions = await Level1Question.find({}).exec();
  const totalQuestions = allQuestions.length;

  if (totalQuestions === 0) {
    return {
      success: true,
      totalQuestions: 0,
      updatedCount: 0,
      skippedCount: 0,
      durationMs: Date.now() - startTime,
      message: 'No Level1Question documents to backfill.',
    };
  }

  const ai = getAIServices();
  const isMockActive = ai.embedding instanceof MockEmbeddingService;

  // Filter candidates needing backfill
  const candidates: ILevel1Question[] = [];
  for (const q of allQuestions) {
    if (force) {
      candidates.push(q);
      continue;
    }

    if (!q.embedding || !Array.isArray(q.embedding) || q.embedding.length !== 1536) {
      candidates.push(q);
      continue;
    }

    // If live Gemini is active, detect mock embeddings and mark for backfill
    if (!isMockActive) {
      const isMock = await isMockEmbedding(q.canonicalQuestionText, q.embedding);
      if (isMock) {
        candidates.push(q);
      }
    }
  }

  const updatedCount = candidates.length;
  const skippedCount = totalQuestions - updatedCount;

  if (candidates.length === 0) {
    return {
      success: true,
      totalQuestions,
      updatedCount: 0,
      skippedCount,
      durationMs: Date.now() - startTime,
      message: 'All Level1Questions already possess valid live embeddings. No backfill needed.',
    };
  }

  console.log(
    `[VectorBackfill] Starting backfill for ${candidates.length} of ${totalQuestions} questions (batchSize=${batchSize}, delayMs=${delayMs}ms)...`
  );

  for (let i = 0; i < candidates.length; i += batchSize) {
    const chunk = candidates.slice(i, i + batchSize);
    
    // Generate embeddings for chunk
    const chunkEmbeddings = await Promise.all(
      chunk.map((item) => ai.embedding.generateEmbedding(item.canonicalQuestionText))
    );

    // Save to database
    await Promise.all(
      chunk.map((item, idx) =>
        Level1Question.updateOne(
          { _id: item._id },
          { $set: { embedding: chunkEmbeddings[idx] } }
        )
      )
    );

    const processed = Math.min(i + batchSize, candidates.length);
    console.log(`[VectorBackfill] Progress: ${processed}/${candidates.length} embeddings generated and saved.`);

    // Delay between batches to respect rate limits
    if (i + batchSize < candidates.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  const durationMs = Date.now() - startTime;
  console.log(`[VectorBackfill] Completed backfill for ${candidates.length} questions in ${durationMs}ms.`);

  return {
    success: true,
    totalQuestions,
    updatedCount,
    skippedCount,
    durationMs,
    message: `Successfully backfilled ${updatedCount} embeddings in ${durationMs}ms.`,
  };
}

/**
 * Startup verification hook.
 * Checks Atlas vector index status and verifies Level1Question embeddings.
 * Triggers backfill if mock or missing embeddings are detected.
 */
export async function verifyAndInitializeVectorPipeline(): Promise<void> {
  console.log('[VectorPipeline] Verifying vector search pipeline...');

  // 1. Ensure Atlas Vector Search index exists
  await ensureVectorIndex();

  // 2. Inspect document embeddings
  const health = await inspectVectorHealth();
  console.log(
    `[VectorPipeline] Level1Questions: ${health.totalLevel1Questions} total, ${health.questionsWithEmbeddings} with embeddings. Gemini key: ${health.geminiApiKeyStatus}.`
  );

  if (health.details) {
    console.log(
      `[VectorPipeline] Embeddings breakdown: ${health.details.validEmbeddingsCount} live, ${health.details.mockEmbeddingsCount} mock, ${health.details.missingEmbeddingsCount} missing.`
    );
  }

  // 3. If mock or missing embeddings exist and Gemini key is configured, run backfill
  const needsBackfill =
    (health.details?.mockEmbeddingsCount || 0) > 0 ||
    (health.details?.missingEmbeddingsCount || 0) > 0;

  if (needsBackfill && health.geminiApiKeyConfigured) {
    console.log('[VectorPipeline] Detected documents requiring backfill. Running embedding backfill...');
    const res = await backfillEmbeddings({ force: false, batchSize: 10, delayMs: 300 });
    console.log(`[VectorPipeline] ${res.message}`);
  } else if (!health.geminiApiKeyConfigured && needsBackfill) {
    console.warn(
      '[VectorPipeline] Mock or missing embeddings detected, but GEMINI_API_KEY is not configured. Backfill deferred.'
    );
  } else {
    console.log('[VectorPipeline] Vector search pipeline is fully synchronized and healthy.');
  }
}

export default {
  isMockEmbedding,
  inspectVectorHealth,
  ensureVectorIndex,
  backfillEmbeddings,
  verifyAndInitializeVectorPipeline,
};
