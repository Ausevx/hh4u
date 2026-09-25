jest.mock('@google/genai', () => ({ GoogleGenAI: jest.fn() }));

import { GoogleGenAI } from '@google/genai';
import { GeminiLanguageService } from '../src/services/ai/gemini/geminiLanguageService';
import { localizeFields, ANSWER_FIELDS } from '../src/services/localizationService';
import { ILLMService } from '../src/services/ai/types';

describe('Indian-language detection and batched translation', () => {
  let generateContent: jest.Mock;
  let service: GeminiLanguageService;
  beforeEach(() => {
    generateContent = jest.fn();
    (GoogleGenAI as unknown as jest.Mock).mockImplementation(() => ({ models: { generateContent } }));
    service = new GeminiLanguageService('test-key');
  });

  it.each([
    ['मुझे सिरदर्द है', 'hi'], ['எனக்கு தலைவலி', 'ta'], ['મને માથું દુખે છે', 'gu'],
    ['আমার মাথাব্যথা', 'bn'], ['నాకు తలనొప్పి', 'te'], ['ನನಗೆ ತಲೆನೋವು', 'kn'],
    ['मला डोकेदुखी आहे', 'mr'], ['ਮੇਰਾ ਸਿਰ ਦੁਖਦਾ ਹੈ', 'pa'], ['എനിക്ക് തലവേദന', 'ml'],
    ['میرے سر میں درد ہے', 'ur'], ['mujhe sir dard hai', 'hi-Latn'],
    ['মোৰ মূৰৰ বিষ', 'as'], ['ମୋର ମୁଣ୍ଡ ବିନ୍ଧୁଛି', 'or'], ['हमरा माथ दुखैत अछि', 'mai'],
    ['सिर में दर्द', 'doi'], ['म्हजें तकलें दुखता', 'kok'], ['मलाई टाउको दुखेको छ', 'ne'],
    ['मम शिरः पीड्यते', 'sa'], ['مون کي مٿي ۾ سور آهي', 'sd'],
    ['سر درد', 'ks'], ['ꯀꯣꯛ ꯅꯥꯕ', 'mni'], ['ᱵᱚᱦᱚᱜ ᱦᱟᱥᱩ', 'sat'], ['खर बोरै', 'brx'],
  ])('does not bypass detection for %s', async (query, language) => {
    generateContent.mockResolvedValue({ text: JSON.stringify({ intent: 'MEDICAL', translatedText: 'I have a headache', detectedLanguage: language }) });
    expect(await service.classifyAndTranslate(query, 'en')).toEqual({
      intent: 'MEDICAL', translatedText: 'I have a headache', detectedLanguage: language,
    });
    expect(generateContent).toHaveBeenCalledTimes(1);
    expect(generateContent.mock.calls[0][0].config.systemInstruction).toContain('Latin letters alone DO NOT mean English');
  });

  it('coalesces concurrent identical queries and caches the successful detection', async () => {
    generateContent.mockResolvedValue({ text: JSON.stringify({ intent: 'MEDICAL', translatedText: 'Stomach pain', detectedLanguage: 'hi-Latn' }) });
    await Promise.all([service.classifyAndTranslate('pet dard'), service.classifyAndTranslate('pet dard')]);
    await service.classifyAndTranslate('pet dard');
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it('translates all fields in one call and partitions cache by language and source content', async () => {
    generateContent.mockImplementation(async ({ contents }) => ({ text: JSON.stringify(JSON.parse(contents).fields) }));
    const fields = { answerText: 'Rest for 2 days.', dosageInstructions: '4 pills', safetyDisclaimerText: 'Consult a doctor.' };
    await Promise.all([service.translateFields(fields, 'hi'), service.translateFields(fields, 'hi')]);
    await service.translateFields(fields, 'hi');
    expect(generateContent).toHaveBeenCalledTimes(1);
    await service.translateFields(fields, 'ta');
    await service.translateFields({ ...fields, dosageInstructions: '2 pills' }, 'hi');
    expect(generateContent).toHaveBeenCalledTimes(3);
    expect(generateContent.mock.calls[0][0].config.httpOptions.retryOptions.attempts).toBe(1);
  });

  it('does not translate an already English answer', async () => {
    expect(await service.translateFields({ answerText: 'Rest' }, 'en-IN')).toEqual({ answerText: 'Rest' });
    expect(generateContent).not.toHaveBeenCalled();
  });

  it('rejects modified dose quantities and retries on the next request instead of caching a failure', async () => {
    generateContent.mockResolvedValueOnce({ text: '{"dosageInstructions":"40 गोलियां"}' })
      .mockResolvedValueOnce({ text: '{"dosageInstructions":"4 गोलियां"}' });
    await expect(service.translateFields({ dosageInstructions: '4 pills' }, 'hi')).rejects.toMatchObject({ code: 'TRANSLATION_UNAVAILABLE' });
    expect(await service.translateFields({ dosageInstructions: '4 pills' }, 'hi')).toEqual({ dosageInstructions: '4 गोलियां' });
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it('rejects malformed detection and missing translated fields', async () => {
    generateContent.mockResolvedValue({ text: '{}' });
    await expect(service.classifyAndTranslate('pet dard')).rejects.toMatchObject({ statusCode: 503 });
    await expect(service.translateFields({ answerText: 'Rest' }, 'hi')).rejects.toMatchObject({ statusCode: 503 });
  });

  it('propagates provider failures without silently claiming an English response is translated', async () => {
    generateContent.mockRejectedValue(new Error('quota exceeded'));
    await expect(service.classifyAndTranslate('வலி')).rejects.toMatchObject({ code: 'TRANSLATION_UNAVAILABLE' });
  });

  it('preserves IDs and video links even if a provider returns extra fields', async () => {
    const llm = { translateFields: jest.fn().mockResolvedValue({ answerText: 'आराम करें', id: 'wrong', videoUrl: 'wrong' }) } as unknown as ILLMService;
    const source = { id: 'answer-1', answerText: 'Rest', videoUrl: 'https://example.com/video' };
    expect(await localizeFields(llm, source, 'hi', ANSWER_FIELDS)).toEqual({ ...source, answerText: 'आराम करें' });
    expect(source.answerText).toBe('Rest');
  });

  it('expires translations and detects changed database text without reusing stale content', async () => {
    let now = 1000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    generateContent.mockResolvedValue({ text: '{"answerText":"आराम करें"}' });
    await service.translateFields({ answerText: 'Rest' }, 'hi');
    now += 61 * 60 * 1000;
    await service.translateFields({ answerText: 'Rest' }, 'hi');
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it('aborts a stalled translation at its deadline', async () => {
    jest.useFakeTimers();
    try {
      generateContent.mockImplementation(({ config }) => new Promise((_, reject) => {
        config.abortSignal.addEventListener('abort', () => reject(new Error('aborted')));
      }));
      const request = service.translateFields({ answerText: 'Rest' }, 'hi');
      const assertion = expect(request).rejects.toMatchObject({ code: 'TRANSLATION_UNAVAILABLE' });
      await jest.advanceTimersByTimeAsync(15000);
      await assertion;
      expect(generateContent).toHaveBeenCalledTimes(1);
    } finally { jest.useRealTimers(); }
  });
});
