import mongoose from 'mongoose';
import { adminKnowledgeBaseService } from './src/services/adminKnowledgeBaseService';
import connectDB from './src/config/db';
import dotenv from 'dotenv';

dotenv.config();

async function testDelete() {
  await connectDB();
  console.log('Connected to DB');
  
  // create dummy
  const q = await adminKnowledgeBaseService.createKnowledgeBaseItem({
    canonicalQuestionText: 'Dummy delete test',
    answerText: 'Dummy answer',
  });
  console.log('Created dummy with ID:', q.id);

  // attempt delete
  const res = await adminKnowledgeBaseService.deleteKnowledgeBaseItem(q.id);
  console.log('Delete result:', res);
  
  process.exit(0);
}
testDelete().catch(console.error);
