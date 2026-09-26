/** Conservative local fast path. Unknown/romanized wording still needs language detection. */
const englishWords = new Set((
  'i am is are was were have has had a an the my me we our you your he she his her it its they their ' +
  'and or but of for to in on with from at by this that these those do does did please help while ' +
  'what why how when where can should could would will not no yes been being since after before ' +
  'suffering experiencing feel feeling need some very severe mild frequent frequently persistent recurring ' +
  'today yesterday day days week weeks month months year years long short time morning evening night ' +
  'headache headaches head pain painful pains ache aches aching stomach tummy abdomen abdominal belly ' +
  'fever cough coughing cold flu throat sore chest breathing breath breathlessness shortness tightness ' +
  'burning sensation urine urination urinating passing blood pressure bp diabetes sugar high low ' +
  'sleep sleeping insomnia tired fatigue tiredness weakness weak dizzy dizziness nausea vomiting vomit ' +
  'diarrhea diarrhoea constipation acidity acid reflux gas bloating heartburn indigestion appetite ' +
  'back neck shoulder knee knees joint joints muscle muscles body ear ears eye eyes tooth teeth ' +
  'skin rash itching itchy allergy allergies hair loss weight stress anxiety depression ' +
  'child children baby adult adults woman women man men period periods menstrual menopause ' +
  'asthma arthritis infection infections swelling swollen nose runny sneezing dry wet mucus ' +
  'relief remedy remedies treatment medicine medicines medication medications home natural ayurvedic ' +
  'homeopathic homeopathy ayurveda advice doctor safe safely cause causes causing caused ' +
  'getting get gets got going away often worse better improve reduce control manage cure ' +
  'all over hurts hurt keep keeps happen happening give take taking drink eat eating food diet exercise ' +
  'serious normal related because due every almost always constantly repeated repeatedly ' +
  'problem problems symptom symptoms other any also more than less much many there so as ' +
  'two three four five one first second help hello hi hey thanks thank good'
).split(/\s+/));

export function isClearlyEnglish(text: string, hint?: string): boolean {
  if (hint && !/^(en(?:-|$)|english$)/i.test(hint)) return false;
  // Numbers and punctuation are harmless; other scripts must be detected/translated.
  if (/[^\x00-\x7F\u2018\u2019\u201c\u201d\u2013\u2014]/.test(text)) return false;
  const words = text.toLowerCase().replace(/['’](s|m|ve|re|ll|d)\b/g, '').match(/[a-z]+/g) || [];
  return words.length > 0 && words.every(word => englishWords.has(word));
}
