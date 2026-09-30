import { CloudTranslationService, localLanguage, LanguageUncertainError } from '../src/services/ai/cloudTranslationService';
import { ContentCache } from '../src/services/contentCache';
import { TranslationUnavailableError } from '../src/services/ai/serviceError';

describe('Cloud Translation only, with on-demand cache', () => {
  let service: CloudTranslationService;
  let request: jest.SpyInstance;
  beforeEach(() => { service = new CloudTranslationService(); request = jest.spyOn(service, 'request'); });
  it.each([
    ['I have a headache', 'en'], ['मुझे सिर में दर्द है', 'hi'], ['मला डोके दुखत आहे', 'mr'],
    ['mujhe stomach mein dard hai', 'hi-Latn'], ['mala headache aahe', 'mr-Latn'],
  ])('recognizes %s without a generative call', (text, expected) => expect(localLanguage(text)).toBe(expected));
  it('does not assume every Latin question is English', () => expect(localLanguage('pet mein jalan')).toBeUndefined());
  it('explicit Marathi selection permits native-script reply to Latin input', () => expect(localLanguage('mala headache aahe', 'mr')).toBe('mr'));
  it('uses Cloud detection for unfamiliar input', async () => {
    request.mockResolvedValue({ languages: [{ languageCode: 'mr', confidence: 0.9 }] });
    expect(await service.detectLanguage('पोटात जळजळ')).toBe('mr');
    expect(request).toHaveBeenCalledWith('detectLanguage', expect.any(Object));
  });
  it('does not silently return English for ambiguous Hinglish', async () => {
    request.mockResolvedValue({ languages: [{ languageCode: 'en', confidence: 0.9 }] });
    await expect(service.detectLanguage('pet dard')).rejects.toBeInstanceOf(LanguageUncertainError);
  });
  it('rejects low confidence language detection', async () => {
    request.mockResolvedValue({ languages: [{ languageCode: 'hi', confidence: 0.2 }] });
    await expect(service.detectLanguage('xyz')).rejects.toBeInstanceOf(LanguageUncertainError);
  });
  it('English answers are unchanged and make no translation request', async () => {
    expect(await service.translateFields({ answerText: 'Saved.\n\nExact text.' }, 'en')).toEqual({ answerText: 'Saved.\n\nExact text.' });
    expect(request).not.toHaveBeenCalled();
  });
  it('batches fields and invalidates cache when source changes', async () => {
    request.mockImplementation(async (_method, body) => ({ translations: body.contents.map((s: string) => ({ translatedText: 'अनुवाद ' + s })) }));
    const source = { reasonText: 'Reason', homeRemedyText: 'Water' };
    await service.translateFields(source, 'hi');
    await service.translateFields(source, 'hi');
    expect(request).toHaveBeenCalledTimes(1);
    await service.translateFields({ ...source, reasonText: 'New reason' }, 'hi');
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls[0][1].contents).toHaveLength(2);
    expect(request.mock.calls[0][1].model).toMatch(/general\/nmt$/);
  });
  it('preserves URLs, doses and potencies through placeholders', async () => {
    request.mockImplementation(async (_method, body) => ({ translations: body.contents.map((s: string) => ({ translatedText: 'अनुवाद ' + s })) }));
    const source = 'Take 4 pills of 30C. https://youtu.be/IUy9hg8iT3Q';
    expect((await service.translateFields({ answerText: source }, 'hi')).answerText).toBe('अनुवाद ' + source);
  });
  it('rejects dropped placeholders rather than caching damaged advice', async () => {
    request.mockResolvedValue({ translations: [{ translatedText: 'Missing dose' }] });
    await expect(service.translateFields({ answerText: 'Take 4 pills.' }, 'hi')).rejects.toBeInstanceOf(TranslationUnavailableError);
    await expect(service.translateFields({ answerText: 'Take 4 pills.' }, 'hi')).rejects.toBeInstanceOf(TranslationUnavailableError);
    expect(request).toHaveBeenCalledTimes(2);
  });
  it('rejects missing fields', async () => {
    request.mockResolvedValue({ translations: [] });
    await expect(service.translateFields({ reasonText: 'Reason' }, 'mr')).rejects.toBeInstanceOf(TranslationUnavailableError);
  });
  it('Hinglish uses Cloud Hindi translation then Cloud romanization', async () => {
    request.mockResolvedValueOnce({ translations: [{ translatedText: 'पानी पिएं' }] })
      .mockResolvedValueOnce({ romanizations: [{ romanizedText: 'Paani piyen' }] });
    expect(await service.translateFields({ answerText: 'Drink water' }, 'hi-Latn')).toEqual({ answerText: 'Paani piyen' });
    expect(request.mock.calls.map(x => x[0])).toEqual(['translateText', 'romanizeText']);
  });
  it('does not claim Cloud supports Marathi romanization', async () => {
    await expect(service.translateFields({ answerText: 'Drink water' }, 'mr-Latn')).rejects.toBeInstanceOf(TranslationUnavailableError);
    expect(request).not.toHaveBeenCalled();
  });
  it('coalesces concurrent identical cache misses', async () => {
    const cache = new ContentCache('test', 1000);
    let resolve!: (value: string[]) => void;
    const work = jest.fn(() => new Promise<string[]>(done => { resolve = done; }));
    const one = cache.get('key', work); const two = cache.get('key', work);
    resolve(['value']);
    const results = await Promise.all([one, two]);
    results[0].push('mutation');
    expect(results[1]).toEqual(['value']); expect(work).toHaveBeenCalledTimes(1);
  });
  it('never generates advice', async () => {
    await expect(service.generateAnswer('hello')).rejects.toThrow('disabled');
    expect(request).not.toHaveBeenCalled();
  });
});
