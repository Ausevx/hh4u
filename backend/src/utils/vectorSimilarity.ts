import Level1Question, { ILevel1Question } from '../models/Level1Question';
import { searchLevel1QuestionsDualMode } from '../services/vectorSearchService';

export interface ScoredCandidate<T = ILevel1Question> {
  item: T;
  level1QuestionId: any;
  canonicalQuestionText: string;
  score: number;
}

/**
 * Computes cosine similarity between two numerical vectors.
 * Returns a value between -1.0 and 1.0 (typically 0.0 to 1.0 for normalized text embeddings).
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) {
    return 0;
  }

  const minLen = Math.min(vecA.length, vecB.length);
  let dotProduct = 0;
  let normASq = 0;
  let normBSq = 0;

  for (let i = 0; i < minLen; i++) {
    dotProduct += vecA[i] * vecB[i];
    normASq += vecA[i] * vecA[i];
    normBSq += vecB[i] * vecB[i];
  }

  // Account for remaining dimensions if lengths differ
  for (let i = minLen; i < vecA.length; i++) {
    normASq += vecA[i] * vecA[i];
  }
  for (let i = minLen; i < vecB.length; i++) {
    normBSq += vecB[i] * vecB[i];
  }

  if (normASq === 0 || normBSq === 0) {
    return 0;
  }

  const similarity = dotProduct / (Math.sqrt(normASq) * Math.sqrt(normBSq));
  
  // Guard against floating point rounding precision exceeding [-1, 1]
  if (similarity > 1) return 1;
  if (similarity < -1) return -1;
  return similarity;
}

/**
 * Dual-mode top-K candidate ranker over Level1Question documents.
 * Automatically executes native MongoDB Atlas $vectorSearch pipeline stage when connected to
 * an Atlas cluster with an active vector_index. Seamlessly falls back to in-memory cosine
 * ranking when offline, in CI/CD, or during local unit testing with MongoMemoryServer.
 */
export async function searchLevel1Questions(
  queryEmbedding: number[],
  topK: number = 5
): Promise<ScoredCandidate[]> {
  return searchLevel1QuestionsDualMode(queryEmbedding, topK);
}

