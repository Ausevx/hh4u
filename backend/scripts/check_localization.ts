import dotenv from 'dotenv';
import { GeminiLanguageService } from '../src/services/ai/gemini/geminiLanguageService';

dotenv.config({ quiet: true });

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.error('Configure GEMINI_API_KEY in backend/.env to run the live language and latency check.');
    process.exitCode = 1;
    return;
  }
  const service = new GeminiLanguageService(process.env.GEMINI_API_KEY);
  for (const query of ['मुझे सिरदर्द है', 'mera pet dard ho raha hai', 'எனக்கு தலைவலி உள்ளது']) {
    const started = Date.now();
    const detected = await service.classifyAndTranslate(query);
    const detectedAt = Date.now();
    const translated = await service.translateFields({ answerText: 'Rest for 2 days. Drink water.' }, detected.detectedLanguage);
    const translatedAt = Date.now();
    await service.classifyAndTranslate(query);
    await service.translateFields({ answerText: 'Rest for 2 days. Drink water.' }, detected.detectedLanguage);
    console.log(JSON.stringify({ query, ...detected, output: translated.answerText,
      detectionMs: detectedAt - started, answerTranslationMs: translatedAt - detectedAt,
      cachedRepeatMs: Date.now() - translatedAt }));
  }
}

main().catch(error => {
  console.error('Language check failed:', error.code || error.name);
  process.exitCode = 1;
});
