import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import Level1Question from '../models/Level1Question';
import { checkVectorIndexStatus } from '../services/vectorSearchService';
import { GeminiEmbeddingService } from '../services/ai/gemini/geminiEmbeddingService';

async function main() {
  await connectDB();
  const status = await checkVectorIndexStatus();
  const questions = await Level1Question.find({ isActive: true }).select('canonicalQuestionText embedding').lean();
  const invalidIds = questions.filter(q => q.embedding?.length !== 1536 || q.embedding.some(v => !Number.isFinite(v)) || !q.embedding.some(v => v !== 0)).map(q => String(q._id));
  console.log(JSON.stringify({ activeQuestions: questions.length, invalidIds,
    vectorIndex: { exists: status.exists, queryable: status.queryable, status: status.status },
    model: process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-2',
    note: 'Dimensions alone cannot establish historical model provenance. Rebuild if unknown or if fake quota-fallback vectors may exist.' }, null, 2));
  if (process.argv.includes('--rebuild')) {
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is required');
    const embedding = new GeminiEmbeddingService(process.env.GEMINI_API_KEY);
    // Stage all vectors before changing live records, so API failure leaves originals untouched.
    const vectors = await embedding.generateBatchEmbeddings(questions.map(q => q.canonicalQuestionText));
    await Level1Question.bulkWrite(questions.map((q, i) => ({ updateOne: {
      filter: { _id: q._id, canonicalQuestionText: q.canonicalQuestionText }, update: { $set: { embedding: vectors[i] } },
    } })));
    console.log(JSON.stringify({ rebuilt: vectors.length, reminder: 'Wait for Atlas indexing and evaluate multilingual accuracy before release.' }));
  }
}
main().catch(() => { console.error('Search audit/rebuild failed; check configuration and database access.'); process.exitCode = 1; }).finally(() => mongoose.disconnect());
