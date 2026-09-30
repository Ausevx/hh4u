import Groq from 'groq-sdk';
import { ILLMService, PersonalizeAnswerParams, TranslateResult } from '../types';

export class GroqLLMService implements ILLMService {
  private ai: Groq;
  private model = 'llama-3.1-70b-versatile';

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

  async generateAnswer(prompt: string, context?: Record<string, any>): Promise<string> {
    let fullPrompt = prompt;
    if (context && Object.keys(context).length > 0) {
      fullPrompt += `\n\nContext:\n${JSON.stringify(context, null, 2)}`;
    }

    const response = await this.ai.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: fullPrompt }],
    });

    return response.choices[0]?.message?.content || 'I am sorry, I could not generate an answer.';
  }

  async generatePersonalizedAnswer(params: PersonalizeAnswerParams): Promise<string> {
    const prompt = `You are a helpful, professional, and empathetic homeopathic chatbot assistant.
Based on the following information, provide a personalized response to the user.

Original Query: "${params.originalQuery}"
Standard Template Answer: "${params.templateText}"
User Language Preference: ${params.userLanguage || 'English'}
Additional Context: ${JSON.stringify(params.additionalContext || {})}

Ensure the response is compassionate, medically safe (include a disclaimer if necessary), and accurately reflects the standard template advice in the requested language.`;

    const response = await this.ai.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
    });

    return response.choices[0]?.message?.content || params.templateText;
  }
}
