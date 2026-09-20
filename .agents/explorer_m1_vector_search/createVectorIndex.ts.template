#!/usr/bin/env ts-node
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/db';
import {
  createVectorSearchIndex,
  checkVectorIndexStatus,
  VECTOR_INDEX_NAME,
} from '../services/vectorSearchService';

dotenv.config();

async function main() {
  console.log('================================================================');
  console.log('  Healing Hands4U: MongoDB Atlas Vector Search Index Creator');
  console.log('================================================================\n');

  try {
    // 1. Connect to MongoDB Atlas
    console.log('[1/4] Connecting to MongoDB Atlas...');
    await connectDB();
    console.log('[1/4] Connected successfully.\n');

    // 2. Check current status of vector index
    console.log(`[2/4] Checking status of index "${VECTOR_INDEX_NAME}"...`);
    const currentStatus = await checkVectorIndexStatus(VECTOR_INDEX_NAME);
    console.log(`      Exists:    ${currentStatus.exists}`);
    console.log(`      Queryable: ${currentStatus.queryable}`);
    console.log(`      Status:    ${currentStatus.status || 'N/A'}\n`);

    if (currentStatus.exists && currentStatus.queryable) {
      console.log(`✔ SUCCESS: Vector search index "${VECTOR_INDEX_NAME}" is already active and queryable.`);
      process.exit(0);
    }

    // 3. Initiate index creation
    console.log(`[3/4] Creating "${VECTOR_INDEX_NAME}" (1536 dims, cosine, filter: isActive)...`);
    const result = await createVectorSearchIndex({
      waitForReady: true,
      timeoutMs: 120000, // 2-minute polling limit
      pollIntervalMs: 2500,
    });

    // 4. Report final result
    console.log(`\n[4/4] Final Status:`);
    console.log(`      Success:   ${result.success}`);
    console.log(`      Queryable: ${result.queryable}`);
    console.log(`      Message:   ${result.message}\n`);

    if (result.queryable) {
      console.log('================================================================');
      console.log('✔ VECTOR SEARCH INDEX READY FOR QUERIES');
      console.log('================================================================');
      process.exit(0);
    } else {
      console.warn('⚠ WARNING: Index was submitted but did not finish building within timeout.');
      console.warn('  Atlas builds indexes asynchronously. It should become queryable shortly.');
      console.warn('  Run this script again in a moment to verify status.');
      process.exit(0);
    }
  } catch (error) {
    console.error('\n✖ ERROR: Failed to create vector search index:', (error as Error).message);
    process.exit(1);
  } finally {
    try {
      await mongoose.disconnect();
    } catch {
      // Ignore disconnect errors on exit
    }
  }
}

if (require.main === module) {
  main();
}
