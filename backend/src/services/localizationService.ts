import { timed } from './searchTelemetry';
import { ILLMService } from './ai/types';
import { TranslationUnavailableError } from './ai/serviceError';
import { ContentCache } from './contentCache';

// 30-day bounded LRU and MongoDB TTL cache for translated answer fields
const translationCache = new ContentCache('field-translations-v1', 30 * 24 * 60 * 60 * 1000);

/** 
 * Translate display text into user's language.
 * English and Hinglish (Latin-script) queries skip translation completely and return original English.
 * IDs, branch conditions, and video URLs remain untouched.
 */
export async function localizeFields<T extends Record<string, any>>(
  llm: ILLMService, source: T, language: string, keys: string[]
): Promise<T> {
  // English, Hinglish, and any Latin-script queries skip answer translation
  if (/^(en(?:-|$)|english$|.*-latn$|hinglish$)/i.test(language)) return { ...source };

  const fields: Record<string, string> = {};
  for (const key of keys) if (typeof source[key] === 'string' && source[key].trim()) fields[key] = source[key];
  if (!Object.keys(fields).length) return { ...source };
  if (!llm.translateFields) throw new TranslationUnavailableError();

  // Use content-hashed cache so repetitive queries for the same condition return in 0ms
  const translated = await translationCache.get([fields, language], async () => {
    return timed('translation', () => llm.translateFields!(fields, language));
  });

  const result = { ...source };
  for (const key of Object.keys(fields)) {
    if (typeof translated[key] === 'string' && translated[key].trim()) {
      (result as any)[key] = translated[key];
    }
  }
  return result;
}

export const ANSWER_FIELDS = ['answerText', 'reasonText', 'remedyName', 'dosageInstructions', 'homeRemedyText', 'safetyDisclaimerText'];
