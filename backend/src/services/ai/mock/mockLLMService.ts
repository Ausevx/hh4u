import { ILLMService, TranslateResult, PersonalizeAnswerParams } from '../types';

export class MockLLMService implements ILLMService {
  private customTranslations: Map<string, { translatedText: string; detectedLanguage: string }> = new Map();

  constructor() {
    // Seed common multilingual clinical query phrases for deterministic tests
    this.registerTranslation('मुझे सिरदर्द है', 'I have a headache', 'hi');
    this.registerTranslation('सिरदर्द', 'headache', 'hi');
    this.registerTranslation('मुझे तेज सिरदर्द और चक्कर आ रहे हैं', 'I have a severe headache and dizziness', 'hi');
    this.registerTranslation('मुझे माइग्रेन की शिकायत है', 'I suffer from migraines', 'hi');
    this.registerTranslation('खांसी और जुकाम', 'cough and cold', 'hi');
    this.registerTranslation('पेट दर्द का इलाज', 'treatment for stomach pain', 'hi');
    this.registerTranslation('tengo dolor de cabeza', 'I have a headache', 'es');
  }

  public registerTranslation(source: string, translated: string, detectedLang: string = 'hi'): void {
    this.customTranslations.set(source.trim().toLowerCase(), {
      translatedText: translated,
      detectedLanguage: detectedLang,
    });
  }

  public async translateToEnglish(text: string, sourceLanguage?: string): Promise<TranslateResult> {
    if (!text) {
      return { translatedText: '', detectedLanguage: sourceLanguage || 'en' };
    }

    const trimmed = text.trim();
    const lower = trimmed.toLowerCase();

    // Check direct registration
    if (this.customTranslations.has(lower)) {
      return this.customTranslations.get(lower)!;
    }

    // Check partial phrase match
    for (const [phrase, result] of this.customTranslations.entries()) {
      if (lower.includes(phrase)) {
        return {
          translatedText: result.translatedText,
          detectedLanguage: result.detectedLanguage,
        };
      }
    }

    // Check for Devanagari script (Hindi)
    const isDevanagari = /[\u0900-\u097F]/.test(trimmed);
    if (isDevanagari) {
      return {
        translatedText: `Translated: ${trimmed}`,
        detectedLanguage: sourceLanguage || 'hi',
      };
    }

    // If already English or other ASCII text
    return {
      translatedText: trimmed,
      detectedLanguage: sourceLanguage || 'en',
    };
  }

  public async generateAnswer(prompt: string, context?: Record<string, any>): Promise<string> {
    if (context?.baseAnswer) {
      return `Consultation recommendation for "${prompt}": ${context.baseAnswer}`;
    }
    return `Guidance for query: "${prompt}". Please consult Dr. Anjali Jariwala for detailed homeopathic follow-up.`;
  }

  public async generatePersonalizedAnswer(params: PersonalizeAnswerParams): Promise<string> {
    const { originalQuery, templateText, userLanguage, additionalContext } = params;
    
    let symptomsSummary = '';
    if (additionalContext?.answers) {
      const positiveSymptoms: string[] = [];
      const answersObj = additionalContext.answers;
      for (const [qId, ans] of Object.entries(answersObj)) {
        if (ans === 'yes') {
          positiveSymptoms.push(qId);
        }
      }
      if (positiveSymptoms.length > 0) {
        symptomsSummary = ` (Affirmed symptoms: ${positiveSymptoms.join(', ')})`;
      }
    }

    const languageNote = userLanguage && userLanguage !== 'en' ? ` [Localized for ${userLanguage}]` : '';
    return `Personalized Homeopathic Plan for "${originalQuery}"${symptomsSummary}: ${templateText}${languageNote}`;
  }
}
