import { ILLMService } from './ai/types';
import { TranslationUnavailableError } from './ai/gemini/geminiLanguageService';

/** Translate only display text; IDs, branch conditions, and links remain untouched. */
export async function localizeFields<T extends Record<string, any>>(
  llm: ILLMService, source: T, language: string, keys: string[]
): Promise<T> {
  if (/^(en(?:-|$)|english$)/i.test(language)) return { ...source };
  const fields: Record<string, string> = {};
  for (const key of keys) if (typeof source[key] === 'string' && source[key].trim()) fields[key] = source[key];
  if (!Object.keys(fields).length) return { ...source };
  if (!llm.translateFields) throw new TranslationUnavailableError();
  const translated = await llm.translateFields(fields, language);
  const result = { ...source };
  for (const key of Object.keys(fields)) {
    if (typeof translated[key] !== 'string' || !translated[key].trim()) throw new TranslationUnavailableError();
    (result as any)[key] = translated[key];
  }
  return result;
}

export const ANSWER_FIELDS = ['answerText', 'reasonText', 'remedyName', 'dosageInstructions', 'homeRemedyText', 'safetyDisclaimerText'];
