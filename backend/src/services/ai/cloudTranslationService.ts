import { GoogleAuth } from 'google-auth-library';
import { ILLMService, PersonalizeAnswerParams } from './types';
import { ContentCache } from '../contentCache';
import { isClearlyEnglish } from '../englishQuery';
import { TranslationUnavailableError } from './serviceError';

export class LanguageUncertainError extends Error {
  readonly statusCode = 422;
  readonly code = 'LANGUAGE_UNCERTAIN';
  constructor() { super('Please select your question language and retry.'); }
}
export function localLanguage(text: string, hint?: string): string | undefined {
  const latin = !/[^\u0000-\u024f\s\p{P}\p{N}]/u.test(text);
  // A non-English language selection is explicit; default English is not proof of English.
  if (hint && /^(hi|mr)(-Latn)?$/i.test(hint)) {
    if (latin) return hint.slice(0, 2).toLowerCase() + (/-Latn$/i.test(hint) ? '-Latn' : '');
    if (/[\u0900-\u097f]/u.test(text)) return hint.slice(0, 2).toLowerCase();
  }
  if (isClearlyEnglish(text)) return 'en';
  const words = new Set(text.toLowerCase().match(/[\p{L}\p{M}]+/gu) || []);
  const count = (items: string[]) => items.filter(w => words.has(w)).length;
  const mr = count(['मला', 'माझे', 'माझ्या', 'आहे', 'होते', 'दुखत', 'mala', 'majha', 'majhe', 'mazya', 'aahe', 'ahe', 'dukhta', 'dukhte']);
  const hi = count(['मुझे', 'मेरे', 'मेरा', 'है', 'दर्द', 'mujhe', 'mere', 'mera', 'hai', 'hain', 'dard']);
  if (mr >= 2 && hi === 0) return latin ? 'mr-Latn' : 'mr';
  if (hi >= 2 && mr === 0) return latin ? 'hi-Latn' : 'hi';
  return undefined;
}

/** NMT + language detection only. This adapter cannot generate clinical advice. */
export class CloudTranslationService implements ILLMService {
  private auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-translation'] });
  private translations = new ContentCache('cloud-nmt-v1', 30 * 24 * 60 * 60 * 1000);
  private detections = new ContentCache('cloud-detect-v1', 24 * 60 * 60 * 1000);
  private project = process.env.GOOGLE_CLOUD_PROJECT || '';
  private location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
  private glossary = process.env.GOOGLE_TRANSLATION_GLOSSARY || '';

  // Public for dependency injection in tests; never receives a caller-supplied URL.
  async request(method: string, body: unknown): Promise<any> {
    if (!this.project) throw new TranslationUnavailableError('Cloud Translation is not configured on the server.');
    const configured = Number(process.env.TRANSLATION_TIMEOUT_MS || 8000);
    const timeout = Number.isFinite(configured) ? Math.max(1000, Math.min(15000, configured)) : 8000;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const job = (async () => {
        const client = await this.auth.getClient();
        const response = await client.request({
          url: `https://translation.googleapis.com/v3/projects/${encodeURIComponent(this.project)}/locations/${encodeURIComponent(this.location)}:${method}`,
          method: 'POST', data: body, timeout, signal: controller.signal, retry: false,
        });
        return response.data;
      })();
      return await Promise.race([job, new Promise((_, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new TranslationUnavailableError()); }, timeout);
      })]);
    } catch { throw new TranslationUnavailableError(); }
    finally { if (timer) clearTimeout(timer); }
  }

  async detectLanguage(text: string, hint?: string): Promise<string> {
    const local = localLanguage(text, hint);
    if (local) return local;
    return this.detections.get([text.trim(), hint || 'auto'], async () => {
      const result = await this.request('detectLanguage', { content: text, mimeType: 'text/plain' });
      const language = result.languages?.[0];
      if (!language || typeof language.languageCode !== 'string' || !(language.confidence >= 0.5)) throw new LanguageUncertainError();
      const code = language.languageCode;
      if (!/^[a-z]{2,3}(?:-[a-zA-Z0-9]+)*$/.test(code)) throw new LanguageUncertainError();
      const isLatin = !/[^\u0000-\u024f\s\p{P}\p{N}]/u.test(text);
      // Short mixed-language text must not silently be labelled English based on script alone.
      if (isLatin && /\b(hai|hain|mujhe|dard|mala|aahe|ahe|dukhta)\b/i.test(text) && code === 'en') throw new LanguageUncertainError();
      return isLatin && ['hi', 'mr'].includes(code) ? `${code}-Latn` : code;
    });
  }

  async translateFields(fields: Record<string, string>, language: string): Promise<Record<string, string>> {
    if (/^en(?:-|$)/i.test(language)) return { ...fields };
    const entries = Object.entries(fields).sort(([a], [b]) => a.localeCompare(b));
    if (!entries.length) return {};
    const target = language.split('-')[0].toLowerCase();
    const romanized = /-Latn$/i.test(language);
    // Cloud romanization currently supports Hindi, not Marathi. Do not change scripts silently.
    if (romanized && target !== 'hi') throw new TranslationUnavailableError('Romanized replies for this language are not supported by Cloud Translation. Select Marathi to receive a Marathi-script reply.');
    return this.translations.get([this.project, this.location, this.glossary, process.env.TRANSLATION_PROTECTED_TERMS || '', language, entries], async () => {
      const protectedTerms = (process.env.TRANSLATION_PROTECTED_TERMS || '').split('|').map(x => x.trim()).filter(Boolean);
      const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(['https?://[^\\s<>"\\u200b]+', ...protectedTerms.map(escape), '\\b\\d+(?:[.,]\\d+)*(?:\\s*(?:mg|mcg|ml|kg|CH|CK|LM|X|C))?\\b'].join('|'), 'gi');
      const protectedValues: string[][] = [];
      const contents = entries.map(([, value]) => {
        const tokens: string[] = []; protectedValues.push(tokens);
        return value.replace(pattern, match => { tokens.push(match); return `ZXQ${tokens.length - 1}QXZ`; });
      });
      if (contents.join('').length > 28000) throw new TranslationUnavailableError('The saved answer is too long for a single translation request.');
      const response = await this.request('translateText', { contents, mimeType: 'text/plain',
        sourceLanguageCode: 'en', targetLanguageCode: target,
        model: `projects/${this.project}/locations/${this.location}/models/general/nmt`,
        ...(this.glossary ? { glossaryConfig: { glossary: this.glossary } } : {}),
      });
      let values: string[] = (this.glossary ? response.glossaryTranslations : response.translations)?.map((x: any) => x.translatedText);
      if (!Array.isArray(values) || values.length !== entries.length || values.some(x => typeof x !== 'string' || !x.trim())) throw new TranslationUnavailableError();
      if (romanized) {
        const response = await this.request('romanizeText', { sourceLanguageCode: target, contents: values });
        values = response.romanizations?.map((x: any) => x.romanizedText);
        if (!Array.isArray(values) || values.length !== entries.length || values.some(x => typeof x !== 'string' || !x.trim())) throw new TranslationUnavailableError();
      }
      return Object.fromEntries(entries.map(([key], i) => {
        let translated = values[i];
        protectedValues[i].forEach((original, index) => {
          const token = `ZXQ${index}QXZ`;
          if (translated.split(token).length !== 2) throw new TranslationUnavailableError();
          translated = translated.replace(token, () => original);
        });
        // Reject introduced quantities as well as dropped/changed source quantities.
        const numbers = (s: string) => (s.match(/\d+(?:[.,]\d+)*/g) || []).sort().join('|');
        if (numbers(translated) !== numbers(entries[i][1])) throw new TranslationUnavailableError();
        return [key, translated];
      }));
    });
  }
  async translateToEnglish(text: string, hint?: string) {
    const language = await this.detectLanguage(text, hint);
    if (language === 'en') return { translatedText: text, detectedLanguage: language };
    const result = await this.request('translateText', { contents: [text], targetLanguageCode: 'en', mimeType: 'text/plain' });
    const translatedText = result.translations?.[0]?.translatedText;
    if (!translatedText) throw new TranslationUnavailableError();
    return { translatedText, detectedLanguage: language };
  }
  async classifyIntent(text: string): Promise<'MEDICAL' | 'GREETING'> {
    return /^(hi|hello|hey|thanks|thank you|नमस्ते|नमस्कार)[!.\s]*$/i.test(text.trim()) ? 'GREETING' : 'MEDICAL';
  }
  async classifyAndTranslate(text: string, hint?: string) {
    return { intent: await this.classifyIntent(text), translatedText: text, detectedLanguage: await this.detectLanguage(text, hint) };
  }
  async generateAnswer(_prompt: string): Promise<string> { throw new Error('Answer generation is disabled; use saved database content.'); }
  async generateConversationalResponse(_text: string, _language?: string): Promise<string> { throw new Error('Text generation is disabled.'); }
  async generatePersonalizedAnswer(_params: PersonalizeAnswerParams): Promise<string> { throw new Error('Text generation is disabled.'); }
}
