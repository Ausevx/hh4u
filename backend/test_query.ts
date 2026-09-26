import mongoose from 'mongoose';
import chatbotService from './src/services/chatbotService';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI!).then(async () => {
  try {
    const res = await chatbotService.processQuery({
      text: "Why do I have acidity, gas or bloating?",
      intent: "direct_answer"
    });
    console.log(JSON.stringify(res, null, 2));
  } catch (e) {
    console.error(e);
  }
  mongoose.disconnect();
});
