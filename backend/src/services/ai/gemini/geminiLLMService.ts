import { GoogleGenAI } from '@google/genai';
import { ILLMService, PersonalizeAnswerParams, TranslateResult } from '../types';
import { GeminiLanguageService } from './geminiLanguageService';

export class GeminiLLMService implements ILLMService {
  private ai: GoogleGenAI;
  private model = process.env.GEMINI_LLM_MODEL || 'gemini-3.5-flash';
  private languageService: GeminiLanguageService;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
    this.languageService = new GeminiLanguageService(apiKey);
  }

  private responseCache: Map<string, any> = new Map();

  private async generateContentWithFallback(params: { contents: any; config?: any }): Promise<any> {
    const cacheKey = JSON.stringify(params);
    if (this.responseCache.has(cacheKey)) {
      return this.responseCache.get(cacheKey);
    }

    // Simplified: try primary model, then one fallback. No exponential backoff cascade.
    const modelsToTry = [this.model, 'gemini-3.5-flash'].filter((m, i, arr) => arr.indexOf(m) === i);

    let lastError: any;
    for (const model of modelsToTry) {
      try {
        const response = await this.ai.models.generateContent({
          model,
          contents: params.contents,
          config: {
            ...params.config,
            safetySettings: [
              { category: 'HARM_CATEGORY_DANGEROUS_CONTENT' as any, threshold: 'BLOCK_NONE' as any },
              { category: 'HARM_CATEGORY_HARASSMENT' as any, threshold: 'BLOCK_NONE' as any },
              { category: 'HARM_CATEGORY_HATE_SPEECH' as any, threshold: 'BLOCK_NONE' as any },
              { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT' as any, threshold: 'BLOCK_NONE' as any }
            ]
          },
        });
        this.responseCache.set(cacheKey, response);
        return response;
      } catch (err: any) {
        lastError = err;
        console.warn(`[GeminiLLMService] Model ${model} failed (${err.message}).`);
        if (err.status === 403 || err.status === 429 || err.status === 400 || (err.message && err.message.includes('429'))) {
           throw err; // Do not retry on permanent or quota errors
        }
      }
    }
    throw lastError;
  }

  /**
   * Combined intent classification + translation in ONE Gemini API call.
   * Saves 1 API call per query (merges classifyIntent + translateToEnglish).
   */
  async classifyAndTranslate(text: string, sourceLanguage?: string): Promise<{
    intent: 'MEDICAL' | 'GREETING' | 'CHITCHAT' | 'UNCLEAR';
    translatedText: string;
    detectedLanguage: string;
  }> {
    return this.languageService.classifyAndTranslate(text, sourceLanguage);
  }

  async translateFields(fields: Record<string, string>, targetLanguage: string): Promise<Record<string, string>> {
    return this.languageService.translateFields(fields, targetLanguage);
  }

  
  async classifyIntent(text: string): Promise<'MEDICAL' | 'GREETING' | 'CHITCHAT' | 'UNCLEAR'> {
    // Fast path: pure regex for extremely common greetings to save API quota
    const trimmed = text.trim().toLowerCase();
    if (/^(hi|hello|hey|yo|greetings|good morning|good afternoon|good evening|sup|what\'s up|whats up)[!?]*$/.test(trimmed)) {
      return 'GREETING';
    }

    const prompt = `Classify the following user message into exactly one of these four categories:
- "MEDICAL": The user is asking about health, symptoms, diseases, treatments, or homeopathic remedies.
- "GREETING": The user is simply saying hello, hi, hey, or a similar greeting.
- "CHITCHAT": The user is making casual conversation unrelated to health (e.g., asking about the weather, telling a joke).
- "UNCLEAR": The message is too vague to determine the intent.

User message: "${text}"

Respond with a JSON object containing a single field "intent" with one of the four category strings. Do not include markdown formatting.`;

    try {
      // Use the lightest, fastest model for classification
      const response = await this.ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          safetySettings: [
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT' as any, threshold: 'BLOCK_NONE' as any },
            { category: 'HARM_CATEGORY_HARASSMENT' as any, threshold: 'BLOCK_NONE' as any },
            { category: 'HARM_CATEGORY_HATE_SPEECH' as any, threshold: 'BLOCK_NONE' as any },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT' as any, threshold: 'BLOCK_NONE' as any }
          ]
        }
      });
      
      const responseText = response.text || '{}';
      try {
        const data = JSON.parse(responseText);
        const intent = (data.intent || 'UNCLEAR').toUpperCase();
        if (['MEDICAL', 'GREETING', 'CHITCHAT', 'UNCLEAR'].includes(intent)) {
          return intent as any;
        }
      } catch (parseError) {
        // Regex fallback if JSON parse fails
        if (responseText.toUpperCase().includes('GREETING')) return 'GREETING';
        if (responseText.toUpperCase().includes('MEDICAL')) return 'MEDICAL';
        if (responseText.toUpperCase().includes('CHITCHAT')) return 'CHITCHAT';
      }
      return 'UNCLEAR';
    } catch (e) {
      console.warn('[GeminiLLMService] Intent classification failed, defaulting to MEDICAL to allow vector search', e);
      return 'MEDICAL'; // Default to medical so it still tries to search the DB
    }
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
    const targetLanguage = context?.targetLanguage ? context.targetLanguage : 'English';
    fullPrompt += `\nYour task is simply to map the user's query to the provided clinical guidance. Briefly (in 1-2 sentences) acknowledge their specific problem, and then present the 'baseAnswer' exactly as provided in the guidance. Do NOT hallucinate long extra medical advice.\n\nCRITICAL INSTRUCTION: Do NOT use any markdown formatting (no hashes #, no asterisks **). Use plain text suitable for a standard mobile chat bubble with 1-2 friendly emojis.\n\nIMPORTANT: You MUST generate your response in the following language: ${targetLanguage}.`;

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
      if (context?.homeRemedyText && context.homeRemedyText !== context.remedy) advice += `Home Care: ${context.homeRemedyText}\n`;
      if (context?.safetyDisclaimerText) advice += `Safety Instructions: ${context.safetyDisclaimerText}\n`;
      return advice;
    }
  }
  async generateConversationalResponse(userMessage: string, targetLanguage: string = 'English'): Promise<string> {
    const prompt = `You are a warm, friendly homeopathic health assistant chatbot for Healing Hands4U clinic (Dr. Anjali Jariwala).

The user just sent: "${userMessage}"

This message doesn't appear to be a specific health question. Respond naturally and conversationally:
- If it's a greeting (hi, hello, yo, hey, etc.), greet them warmly back.
- If it's casual chat, be friendly and steer the conversation toward health.
- If the user is being malicious, toxic, or clearly does not want any answers, politely decline to engage further or offer irrelevant responses.
- If they genuinely have a query but it is not health-related, politely explain that you can only assist with health and medical questions.
- If it's a greeting or casual chat, always end by gently asking them to describe their symptoms or health concerns so you can help.
- Keep your response short (2-3 sentences max), warm, and human.
- Do NOT give any medical advice or mention remedies here. Just be friendly and guide them.

IMPORTANT: You MUST write your response in the following language: ${targetLanguage}.

Respond directly (no JSON, no formatting):

CRITICAL INSTRUCTION: Do NOT use any markdown formatting (no hashes #, no asterisks ** for bolding, no bullet points). Use plain text suitable for a standard mobile chat bubble. Keep the response very concise (max 3 sentences) and include 1 or 2 friendly emojis.`;

    try {
      const response = await this.generateContentWithFallback({
        contents: prompt,
      });
      return response.text || "I am currently unable to process your request.";
    } catch (err: any) {
      console.warn(`[GeminiLLMService] Conversational response failed: ${err?.message}`);
      throw err;
    }
  }

  async generatePersonalizedAnswer(params: PersonalizeAnswerParams): Promise<string> {
    const prompt = `You are a helpful, professional, and empathetic homeopathic chatbot assistant representing Dr. Anjali Jariwala at Healing Hands4U.
Based on the following information, provide a personalized response to the user.

Original Query: "${params.originalQuery}"
Standard Template Answer: "${params.templateText}"
User Language Preference: ${params.userLanguage || 'English'}
Additional Context: ${JSON.stringify(params.additionalContext || {})}

Your task is simply to map the user's specific context to the provided 'Standard Template Answer'. Briefly (in 1-2 sentences) acknowledge their symptoms, and then present the template answer exactly as provided. Do NOT hallucinate long extra medical advice.

CRITICAL INSTRUCTION: Do NOT use any markdown formatting (no hashes, no asterisks for bolding). Use plain text suitable for a standard mobile chat bubble. Keep the response very concise (max 3 sentences) and include 1 or 2 friendly emojis.`;

    try {
      const response = await this.generateContentWithFallback({
        contents: prompt,
      });
      return response.text || `Personalized Homeopathic Plan for "${params.originalQuery}": ${params.templateText}`;
    } catch (err: any) {
      console.warn(`[GeminiLLMService] Gemini API quota/rate-limit reached (${err?.message}). Generating dynamic personalized fallback.`);
      return `Personalized Homeopathic Plan for "${params.originalQuery}":\n${params.templateText}`;
    }
  }
}
