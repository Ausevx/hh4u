import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import Level1Question from '../src/models/Level1Question';
import Answer from '../src/models/Answer';
import ConsultationQuery from '../src/models/ConsultationQuery';

dotenv.config();

async function exportOfflineDb() {
  const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/healing_hands_db';
  console.log('Connecting to MongoDB:', MONGO_URI);
  await mongoose.connect(MONGO_URI);
  console.log('Connected.');

  try {
    const questions = await Level1Question.find({ isActive: true });
    console.log(`Found ${questions.length} active Level1Questions.`);

    const exportData = [];

    for (const q of questions) {
      const answer = await Answer.findOne({ level1QuestionId: q._id, answerType: 'level1' });
      const consultation = await ConsultationQuery.findOne({ level1QuestionId: q._id });

      const dQ1 = consultation?.diagnosticQuestions?.[0]?.questionText || null;
      const dQ2 = consultation?.diagnosticQuestions?.[1]?.questionText || null;
      const dQ3 = consultation?.diagnosticQuestions?.[2]?.questionText || null;

      exportData.push({
        id: q._id.toString(),
        questionText: q.canonicalQuestionText,
        answerText: answer?.answerText || null,
        reasonText: answer?.reasonText || null,
        remedyText: answer?.remedyText || null,
        homeRemedyText: answer?.homeRemedyText || null,
        dosageInstructions: answer?.dosageInstructions || null,
        safetyDisclaimerText: answer?.safetyDisclaimerText || null,
        videoUrl: answer?.videoUrl || null,
        diagnosticQ1: dQ1,
        diagnosticQ2: dQ2,
        diagnosticQ3: dQ3,
        tags: q.tags?.join(',') || null,
        updatedAt: q.updatedAt ? new Date(q.updatedAt).getTime() : Date.now(),
      });
    }

    const outPath = path.resolve(__dirname, '../../app/src/main/assets/knowledge_base.json');
    const outDir = path.dirname(outPath);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    fs.writeFileSync(outPath, JSON.stringify(exportData, null, 2));
    console.log(`Exported ${exportData.length} records to ${outPath}`);
  } catch (error) {
    console.error('Export failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

exportOfflineDb();
