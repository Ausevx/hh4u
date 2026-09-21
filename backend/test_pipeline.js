require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const mongoose = require('mongoose');
const { ChatbotService } = require('./dist/services/chatbotService');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DB_NAME });
  
  const service = new ChatbotService();

  async function testQ(text) {
    console.log('\n========================');
    console.log('Query:', text);
    try {
      const start = Date.now();
      const res = await service.processQuery({
        queryText: text,
        intent: 'direct_answer',
        inputMode: 'text'
      });
      console.log('Elapsed:', Date.now() - start, 'ms');
      console.log('Success:', res.success);
      console.log('Match Confident:', res.matchConfident);
      if (res.matchConfident) {
        console.log('Matched Question:', res.matchedLevel1Question?.canonicalQuestionText);
        console.log('Score:', res.confidenceScore);
        console.log('Answer Text:', res.answer?.answerText?.substring(0, 100) + '...');
      } else {
        console.log('Fallback Message:', res.message?.substring(0, 100) + '...');
      }
    } catch (e) {
      console.error('FAILED:', e);
    }
  }

  await testQ('Hello');
  await testQ('I have a bad headache');
  
  mongoose.disconnect();
})();
