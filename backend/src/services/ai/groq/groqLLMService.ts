import Groq from 'groq-sdk';
import { ILLMService, PersonalizeAnswerParams, TranslateResult } from '../types';

export class GroqLLMService implements ILLMService {
  private ai: Groq;
  private model = 'openai/gpt-oss-20b';

  constructor(apiKey: string) {
    this.ai = new Groq({ apiKey });
  }

  async translateToEnglish(text: string, sourceLanguage?: string): Promise<TranslateResult> {
    const prompt = `Translate the following text to English. If it is already in English, output the original text.
Source language: ${sourceLanguage || 'Auto-detect'}
Text: "${text}"

Respond with a JSON object containing two fields:
- translatedText: The English translation
- detectedLanguage: The detected original language of the text.

Only output valid JSON. Do not output markdown code blocks, just raw JSON.`;

    const response = await this.ai.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 1024,
      temperature: 0.1,
    });

    try {
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
    const prompt = `Translate the following JSON object's values to ${targetLanguage}.
Respond with only a valid JSON object containing the same keys with translated string values. Do not use markdown blocks.

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
      return JSON.parse(textResponse);
    } catch (e) {
      console.error('Groq translateFields error', e);
      return fields;
    }
  }

  async classifyAndTranslate(text: string, sourceLanguage?: string): Promise<{ intent: 'MEDICAL' | 'GREETING' | 'CHITCHAT' | 'UNCLEAR'; translatedText: string; detectedLanguage: string }> {
    const prompt = `Analyze the following text. 
Source language: ${sourceLanguage || 'Auto-detect'}
Text: "${text}"

Determine if the intent is MEDICAL, GREETING, CHITCHAT, or UNCLEAR.
Translate the text to English. If it is already in English, output the original text.
Detect the original language of the text.

Respond with a JSON object containing three fields:
- intent: The classified intent (MEDICAL, GREETING, CHITCHAT, or UNCLEAR)
- translatedText: The English translation
- detectedLanguage: The detected original language.

Only output valid JSON.`;

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
      const response = await this.ai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: `You are a helpful assistant. Generate ONLY a brief greeting or introductory phrase (e.g., "Hello!", "I can help with that.") in ${params.userLanguage || 'English'} based on the user's query. Output nothing else. Do not provide medical advice or answer the question.` },
          { role: 'user', content: `User query: "${params.originalQuery}"` }
        ],
        max_tokens: 50,
        temperature: 0.1,
      });

      const greeting = response.choices[0]?.message?.content?.trim() || '';
      
      if (greeting && !greeting.toLowerCase().includes('here is')) {
        return `${greeting}\n\n${params.templateText}`;
      }
      return params.templateText;
    } catch (e) {
      console.error('Groq generatePersonalizedAnswer error', e);
      return params.templateText;
    }
  }
}
