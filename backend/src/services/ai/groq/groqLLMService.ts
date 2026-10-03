import Groq from 'groq-sdk';
import { ILLMService, PersonalizeAnswerParams, TranslateResult } from '../types';
import { isClearlyEnglish } from '../../englishQuery';

export class GroqLLMService implements ILLMService {
  private ai: Groq;
  private model: string;

  constructor(apiKey: string, modelName?: string) {
    this.ai = new Groq({ apiKey });
    this.model = modelName || process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
  }

  async detectLanguage(text: string, hint?: string): Promise<string> {
    const trimmed = text.trim();
    if (!trimmed) return 'en';
    if (isClearlyEnglish(trimmed, hint)) return 'en';

    // Fast check: Latin alphabet vs non-Latin
    const isLatin = !/[^\u0000-\u024f\s\p{P}\p{N}]/u.test(trimmed);
    if (isLatin) {
      // Check for common Hinglish words
      const words = new Set(trimmed.toLowerCase().match(/[\p{L}\p{M}]+/gu) || []);
      const isHinglish = [
        'mujhe', 'mera', 'meri', 'mere', 'hai', 'hain', 'ho', 'gaya', 'gayi',
        'dard', 'pet', 'sar', 'sir', 'kya', 'karu', 'kare', 'kaise', 'hota',
        'hoti', 'hote', 'nahi', 'kuch', 'batao', 'dawa', 'dawakhana', 'bukhar',
        'khansi', 'sardi', 'ahe', 'aahe', 'mala', 'majha', 'majhe', 'dukhta'
      ].some(w => words.has(w));

      if (isHinglish) return 'hi-Latn';
      return 'en';
    }

    // Check for Devanagari script (Hindi vs Marathi)
    if (/[\u0900-\u097f]/.test(trimmed)) {
      const words = new Set(trimmed.match(/[\p{L}\p{M}]+/gu) || []);
      const isMarathi = ['मला', 'माझे', 'माझ्या', 'आहे', 'होते', 'दुखत', 'कसे', 'काय'].some(w => words.has(w));
      return isMarathi ? 'mr' : 'hi';
    }

    // Fallback to Groq API detection for other languages
    try {
      const result = await this.translateToEnglish(trimmed, hint);
      return result.detectedLanguage || 'en';
    } catch {
      return 'en';
    }
  }

  async translateToEnglish(text: string, sourceLanguage?: string): Promise<TranslateResult> {
    const prompt = `Translate the following user query or message into clear English. It can be about any topic (healthcare, medical, general Q&A, lifestyle, greetings, instructions, etc.). If it is already in English, output the original text.
If written in Latin script with Hindi/Indian words (Hinglish), detect the language as "hi-Latn". If Devanagari Hindi, detect as "hi". If Marathi, detect as "mr". Otherwise, detect the appropriate ISO language code.
Source language hint: ${sourceLanguage || 'Auto-detect'}
Text: "${text}"

Respond ONLY with a JSON object:
{
  "translatedText": "Clear English translation",
  "detectedLanguage": "en | hi-Latn | hi | mr | etc."
}`;

    try {
      const response = await this.ai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        max_tokens: 1024,
        temperature: 0.1,
      });

      const textResponse = response.choices[0]?.message?.content || '{}';
      const data = JSON.parse(textResponse);
      return {
        translatedText: data.translatedText || text,
        detectedLanguage: data.detectedLanguage || 'unknown',
      };
    } catch (e) {
      console.error('Groq translate parsing error', e);
      return { translatedText: text, detectedLanguage: 'unknown' };
    }
  }

  async translateFields(fields: Record<string, string>, targetLanguage: string): Promise<Record<string, string>> {
    // English, Hinglish, and any Latin-script queries skip answer translation
    if (/^(en(?:-|$)|english$|.*-latn$|hinglish$)/i.test(targetLanguage)) {
      return fields;
    }

    const prompt = `You are a versatile, professional translation assistant capable of translating any kind of content, advice, questions, or guidance into ${targetLanguage}.
Translate the following JSON object's values into ${targetLanguage}.

CRITICAL RULES:
1. Homeopathic medicine names (e.g., Arnica Montana, Belladonna, Nux Vomica, Pulsatilla, Bryonia Alba, etc.) and potencies (e.g., 30C, 200C, 1M, 6X, Q), as well as any specific pharmaceuticals, must be preserved VERBATIM in English alphabet or transliterated phonetically with the English name in parentheses (e.g. 'Belladonna 30C' or 'बेलाडोना 30C (Belladonna 30C)'). Do NOT invent or translate medicine names.
2. For all other content—including general knowledge, explanations, symptom descriptions, causes, practical dietary remedies, lifestyle guidance, and dosage directions—translate accurately, naturally, politely, and fluently into ${targetLanguage}.
3. Preserve all punctuation, bullet points, numbers, and newlines.
4. Respond ONLY with a valid JSON object containing the exact same keys with translated values. Do NOT wrap in markdown code fences.

JSON to translate:
${JSON.stringify(fields, null, 2)}`;

    try {
      const response = await this.ai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        max_tokens: 2048,
        temperature: 0.1,
      });
      const textResponse = response.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(textResponse);
      return { ...fields, ...parsed };
    } catch (e) {
      console.error('Groq translateFields error', e);
      return fields;
    }
  }

  async classifyAndTranslate(text: string, sourceLanguage?: string): Promise<{ intent: 'MEDICAL' | 'GREETING' | 'CHITCHAT' | 'UNCLEAR'; translatedText: string; detectedLanguage: string }> {
    const prompt = `Analyze the following text: 
Source language hint: ${sourceLanguage || 'Auto-detect'}
Text: "${text}"

Determine if the intent is MEDICAL, GREETING, CHITCHAT, or UNCLEAR.
Translate the text to English. If it is already in English, output the original text.
Detect the language code:
- If pure English: "en"
- If Latin script with Hindi/Indian words (Hinglish): "hi-Latn"
- If Devanagari Hindi: "hi"
- If Marathi: "mr"
- Otherwise: ISO language code

Respond ONLY with a JSON object:
{
  "intent": "MEDICAL" | "GREETING" | "CHITCHAT" | "UNCLEAR",
  "translatedText": "English translation",
  "detectedLanguage": "language code"
}`;

    try {
      const response = await this.ai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        max_tokens: 1024,
        temperature: 0.1,
      });
      const textResponse = response.choices[0]?.message?.content || '{}';
      const data = JSON.parse(textResponse);
      return {
        intent: data.intent || 'MEDICAL',
        translatedText: data.translatedText || text,
        detectedLanguage: data.detectedLanguage || sourceLanguage || 'en',
      };
    } catch (e) {
      console.error('Groq classifyAndTranslate error', e);
      return { intent: 'MEDICAL', translatedText: text, detectedLanguage: sourceLanguage || 'en' };
    }
  }

  async generateConversationalResponse(userMessage: string, targetLanguage?: string): Promise<string> {
    const response = await this.ai.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: `You are a helpful and friendly homeopathic assistant. If a language is specified, respond in that language. Target language: ${targetLanguage || 'English'}` },
        { role: 'user', content: `The user said: "${userMessage}"\nRespond in a friendly conversational manner and ask them to describe their medical symptoms so you can help them. Do not output just a few words. Provide a complete, conversational response.` }
      ],
      max_tokens: 512,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content || 'Please describe your symptoms so I can look for saved advice.';
  }

  async generateAnswer(prompt: string, context?: Record<string, any>): Promise<string> {
    let fullPrompt = prompt;
    if (context && Object.keys(context).length > 0) {
      fullPrompt += `\n\nContext:\n${JSON.stringify(context, null, 2)}`;
    }

    const response = await this.ai.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: 'You are a helpful, professional, and empathetic homeopathic chatbot assistant.' },
        { role: 'user', content: fullPrompt }
      ],
      max_tokens: 2048,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content || 'I am sorry, I could not generate an answer.';
  }

  async generatePersonalizedAnswer(params: PersonalizeAnswerParams): Promise<string> {
    try {
      return params.templateText;
    } catch (e) {
      console.error('Groq generatePersonalizedAnswer error', e);
      return params.templateText;
    }
  }
}
export default GroqLLMService;
