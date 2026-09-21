require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

(async () => {
  try {
    const result = await ai.models.list();
    for await (const model of result) {
      console.log(model.name, '|', model.supportedActions?.join(',') || 'N/A');
    }
  } catch (err) {
    console.log('Error listing models:', err.message?.substring(0, 500));
  }
})();
