import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';
dotenv.config();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: JSON.stringify({ message: "i have a orange eye", languageHint: "auto" }),
      config: {
        systemInstruction: `Detect the actual language and translate the user message faithfully into English in ONE step.\nReturn only JSON {"intent":"...","translatedText":"English text","detectedLanguage":"code"}.`,
        responseMimeType: 'application/json', temperature: 0,
        responseJsonSchema: { type: 'object', properties: {
          intent: { type: 'string', enum: ['MEDICAL', 'GREETING', 'CHITCHAT', 'UNCLEAR'] },
          translatedText: { type: 'string' }, detectedLanguage: { type: 'string' },
        }, required: ['intent', 'translatedText', 'detectedLanguage'], additionalProperties: false }
      },
    });
    console.log(response.text);
  } catch (e) { console.error(e); }
}
run();
