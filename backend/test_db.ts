import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();
async function run() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const Answer = mongoose.model('Answer', new mongoose.Schema({ answerText: String, level1QuestionId: mongoose.Schema.Types.ObjectId }));
  const Level1Question = mongoose.model('Level1Question', new mongoose.Schema({ canonicalQuestionText: String }));
  const a = await Answer.findOne({ answerText: /tu chutiya hai/i });
  console.log('Answer:', a);
  if (a) {
    const q = await Level1Question.findById(a.level1QuestionId);
    console.log('Question:', q);
  }
  process.exit(0);
}
run();
