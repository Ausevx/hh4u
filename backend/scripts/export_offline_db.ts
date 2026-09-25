import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { buildOfflineKnowledgeSnapshot } from '../src/services/offlineKnowledgeService';

dotenv.config({ quiet: true });

async function exportOfflineDb() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error('Configure MONGODB_URI or MONGO_URI before exporting.');
  try {
    await mongoose.connect(uri, { dbName: process.env.DB_NAME || 'hh4u', serverSelectionTimeoutMS: 15000 });
    const snapshot = await buildOfflineKnowledgeSnapshot();
    const entries = snapshot.items.map(({ diagnosticQuestions, answerBranches, tags, ...entry }) => ({
      ...entry, tags: tags.join(','),
      consultationJson: JSON.stringify({ questions: diagnosticQuestions, branches: answerBranches }),
    }));
    const outPath = path.resolve(__dirname, '../../app/src/main/assets/knowledge_base.json');
    fs.writeFileSync(outPath, JSON.stringify(entries, null, 2));
    console.log(`Exported ${entries.length} active questions, ${snapshot.items.reduce((sum, i) => sum + i.diagnosticQuestions.length, 0)} diagnostic questions and ${snapshot.items.reduce((sum, i) => sum + i.answerBranches.length, 0)} answer branches.`);
  } finally {
    await mongoose.disconnect();
  }
}
exportOfflineDb().catch(error => {
  // Do not log connection strings or credentials on connection failures.
  console.error('Offline export failed:', error.name);
  process.exitCode = 1;
});
