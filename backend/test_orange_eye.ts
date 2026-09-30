import { GeminiLanguageService } from './src/services/ai/gemini/geminiLanguageService';
import * as dotenv from 'dotenv';
dotenv.config();
const s = new GeminiLanguageService(process.env.GEMINI_API_KEY!);
s.classifyAndTranslate('i have a orange eye').then(console.log).catch(console.error);
