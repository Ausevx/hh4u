import { isClearlyEnglish } from '../src/services/englishQuery';

describe('conservative English fast path', () => {
  it.each(['I have a headache', 'My stomach hurts', 'burning while urinating', 'Headache!!!'])('recognizes %s', text => {
    expect(isClearlyEnglish(text)).toBe(true);
  });
  it.each(['मुझे सिरदर्द है', 'माझे डोके दुखते', 'mere pet me dard hai', 'mala headache aahe'])('keeps detection for %s', text => {
    expect(isClearlyEnglish(text, 'en')).toBe(false);
  });
  it('respects a non-English language hint', () => {
    expect(isClearlyEnglish('headache', 'mr')).toBe(false);
  });
});
