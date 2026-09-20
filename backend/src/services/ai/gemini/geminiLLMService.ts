import { GoogleGenAI } from '@google/genai';
import { ILLMService, PersonalizeAnswerParams, TranslateResult } from '../types';

export class GeminiLLMService implements ILLMService {
  private ai: GoogleGenAI;
  private model = process.env.GEMINI_LLM_MODEL || 'gemini-3.6-flash';

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  private responseCache: Map<string, any> = new Map();

  private async generateContentWithFallback(params: { contents: any; config?: any }): Promise<any> {
    const cacheKey = JSON.stringify(params);
    if (this.responseCache.has(cacheKey)) {
      return this.responseCache.get(cacheKey);
    }

    const candidateModels = [
      this.model,
      'gemini-3.5-flash',
      'gemini-flash-latest',
      'gemini-3.8-flash',
    ].filter((m, i, arr) => m && arr.indexOf(m) === i);

    let lastError: any;
    for (let attempt = 0; attempt < 3; attempt++) {
      for (const model of candidateModels) {
        try {
          const response = await this.ai.models.generateContent({
            model,
            contents: params.contents,
            config: params.config,
          });
          this.responseCache.set(cacheKey, response);
          return response;
        } catch (err: any) {
          lastError = err;
          console.warn(`[GeminiLLMService] Model ${model} failed (${err.message}). Trying next candidate...`);
        }
      }
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 2000 * Math.pow(2, attempt)));
      }
    }
    throw lastError;
  }

  async translateToEnglish(text: string, sourceLanguage?: string): Promise<TranslateResult> {
    const prompt = `Translate the following text to English. If it is already in English, output the original text.
Source language: ${sourceLanguage || 'Auto-detect'}
Text: "${text}"

Respond with a JSON object containing two fields:
- translatedText: The English translation
- detectedLanguage: The detected original language of the text.

Only output valid JSON.`;

    try {
      const response = await this.generateContentWithFallback({
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        }
      });

      const data = JSON.parse(response.text || '{}');
      let detectedLanguage = data.detectedLanguage || 'unknown';
      const langLower = detectedLanguage.toLowerCase();
      if (langLower.includes('hindi') || langLower === 'hi') {
        detectedLanguage = 'hi';
      } else if (langLower.includes('english') || langLower === 'en') {
        detectedLanguage = 'en';
      } else if (langLower.includes('spanish') || langLower === 'es') {
        detectedLanguage = 'es';
      }

      return {
        translatedText: data.translatedText || text,
        detectedLanguage,
      };
    } catch (e) {
      console.warn('Gemini translate error or rate limit, passing original text', e);
      return { translatedText: text, detectedLanguage: sourceLanguage || 'en' };
    }
  }

  async generateAnswer(prompt: string, context?: Record<string, any>): Promise<string> {
    let fullPrompt = `You are an expert, compassionate homeopathic medical assistant representing Dr. Anjali Jariwala at Healing Hands4U.\nUser Query: "${prompt}"\n`;
    if (context && Object.keys(context).length > 0) {
      fullPrompt += `\nClinical Knowledge Base Guidance:\n${JSON.stringify(context, null, 2)}\n`;
    }
    fullPrompt += `\nProvide a clear, reassuring, and structured homeopathic recommendation incorporating the above clinical guidance. Include dosage and safety instructions where appropriate.`;

    try {
      const response = await this.generateContentWithFallback({
        contents: fullPrompt,
      });
      return response.text || 'I am sorry, I could not generate an answer.';
    } catch (err: any) {
      console.warn(`[GeminiLLMService] Gemini API quota/rate-limit reached (${err?.message}). Generating dynamic clinical fallback.`);
      let advice = `Homeopathic Assessment for "${prompt}":\n`;
      if (context?.remedy) advice += `Recommended Remedy: ${context.remedy}\n`;
      if (context?.dosageInstructions) advice += `Dosage: ${context.dosageInstructions}\n`;
      if (context?.homeRemedyText) advice += `Home Care: ${context.homeRemedyText}\n`;
      if (context?.safetyDisclaimerText) advice += `Safety Instructions: ${context.safetyDisclaimerText}\n`;
      return advice;
    }
  }

  async generatePersonalizedAnswer(params: PersonalizeAnswerParams): Promise<string> {
    const prompt = `You are a helpful, professional, and empathetic homeopathic chatbot assistant representing Dr. Anjali Jariwala at Healing Hands4U.
Based on the following information, provide a personalized response to the user.

Original Query: "${params.originalQuery}"
Standard Template Answer: "${params.templateText}"
User Language Preference: ${params.userLanguage || 'English'}
Additional Context: ${JSON.stringify(params.additionalContext || {})}

Ensure the response begins with "Personalized Homeopathic Plan" and is compassionate, medically safe (include a disclaimer if necessary), and accurately reflects the standard template advice in the requested language.`;

    try {
      const response = await this.generateContentWithFallback({
        contents: prompt,
      });
      return response.text || `Personalized Homeopathic Plan for "${params.originalQuery}": ${params.templateText}`;
    } catch (err: any) {
      console.warn(`[GeminiLLMService] Gemini API quota/rate-limit reached (${err?.message}). Generating dynamic personalized fallback.`);
      return `Personalized Homeopathic Plan for "${params.originalQuery}": ${params.templateText}`;
    }
  }
}
