jest.mock('@google/genai', () => ({ GoogleGenAI: jest.fn() }));
jest.mock('../src/services/ai/aiContainer', () => ({ getAIServices: jest.fn() }));
jest.mock('../src/utils/vectorSimilarity', () => ({ searchLevel1Questions: jest.fn() }));

import mongoose from 'mongoose';
import { getAIServices } from '../src/services/ai/aiContainer';
import { searchLevel1Questions } from '../src/utils/vectorSimilarity';
import { ChatbotService } from '../src/services/chatbotService';
import { ConsultationService } from '../src/services/consultationService';
import ChatbotSession from '../src/models/ChatbotSession';
import ConsultationQuery from '../src/models/ConsultationQuery';
import Answer from '../src/models/Answer';
import QueryClickStats from '../src/models/QueryClickStats';

describe('English database search with localized consultation and direct answers', () => {
  const questionId = new mongoose.Types.ObjectId();
  const answerId = new mongoose.Types.ObjectId();
  let sessions: Map<string, any>;
  let llm: any;
  let embedding: any;
  const sourceAnswer = {
    reasonText: 'Saved clinical reason. Second sentence.', _id: answerId, answerText: 'Rest for 2 days.', remedyText: 'Named remedy 30C',
    dosageInstructions: '4 pills', homeRemedyText: 'Drink water.',
    safetyDisclaimerText: 'Consult a doctor.', videoUrl: 'https://example.com/video',
  };
  beforeEach(() => {
    sessions = new Map();
    llm = {
      classifyAndTranslate: jest.fn().mockResolvedValue({ intent: 'MEDICAL', translatedText: 'I have a headache', detectedLanguage: 'hi' }),
      translateFields: jest.fn().mockImplementation(async (fields: Record<string, string>, language: string) =>
        Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, `[${language}] ${value}`]))),
      generateAnswer: jest.fn(), generatePersonalizedAnswer: jest.fn(),
    };
    embedding = { generateEmbedding: jest.fn().mockResolvedValue([0.1, 0.2]) };
    (getAIServices as jest.Mock).mockReturnValue({ llm, embedding });
    (searchLevel1Questions as jest.Mock).mockResolvedValue([{
      level1QuestionId: questionId, canonicalQuestionText: 'Headache relief', score: 0.95,
    }]);
    jest.spyOn(ChatbotSession.prototype, 'save').mockImplementation(async function (this: any) {
      await this.validate();
      sessions.set(String(this._id), this);
      return this;
    } as any);
    jest.spyOn(ChatbotSession, 'findById').mockImplementation(((id: any) => Promise.resolve(sessions.get(String(id)))) as any);
    jest.spyOn(QueryClickStats, 'findOneAndUpdate').mockImplementation((() => Promise.resolve(null)) as any);
    jest.spyOn(Answer, 'findOne').mockImplementation((() => Promise.resolve(sourceAnswer)) as any);
    jest.spyOn(Answer, 'findById').mockImplementation((() => Promise.resolve(sourceAnswer)) as any);
    jest.spyOn(ConsultationQuery, 'findOne').mockImplementation((() => Promise.resolve({
      _id: new mongoose.Types.ObjectId(),
      diagnosticQuestions: [{ id: 'q1', questionText: 'Does light make it worse?' }, { id: 'q2', questionText: 'Do you have nausea?' }],
      answerBranches: [{ conditions: { q1: 'yes', q2: 'no' }, resolvedAnswerId: answerId }],
    })) as any);
  });

  it.each(['hi', 'ta', 'gu', 'bn', 'mr', 'te', 'kn', 'ml', 'pa', 'ur', 'hi-Latn'])(
    'searches English and preserves %s through questions and final answer', async language => {
      llm.classifyAndTranslate.mockResolvedValue({ intent: 'MEDICAL', translatedText: 'I have a headache', detectedLanguage: language });
      const start = await new ChatbotService().processQuery({ queryText: 'original language input', intent: 'consultation', language: 'en' });
      expect(embedding.generateEmbedding).toHaveBeenCalledWith('I have a headache');
      expect(start.language).toBe(language);
      expect(start.diagnosticQuestions?.map(q => q.id)).toEqual(['q1', 'q2']);
      expect(start.diagnosticQuestions?.[0].questionText).toBe(`[${language}] Does light make it worse?`);
      expect(sessions.get(start.sessionId).originalLanguage).toBe(language);
      const result = await new ConsultationService().resolveConsultationAnswer({ sessionId: start.sessionId, answers: { q1: 'yes', q2: 'no' } });
      expect(result.answer.answerText).toBe(`[${language}] Rest for 2 days.`);
      expect(result.answer.reasonText).toBe(`[${language}] ${sourceAnswer.reasonText}`);
      expect(result.answer.personalizedAnswer).toBe(result.answer.answerText);
      expect(result.answer.dosageInstructions).toBe(`[${language}] 4 pills`);
      expect(result.answer.videoUrl).toBe(sourceAnswer.videoUrl);
      expect(result.answer.id).toBe(String(answerId));
      expect(llm.classifyAndTranslate).toHaveBeenCalledTimes(1);
      expect(llm.translateFields).toHaveBeenCalledTimes(2); // all questions, then all answer fields
      expect(llm.generatePersonalizedAnswer).not.toHaveBeenCalled();
    }
  );

  it('translates the saved direct answer and all display fields without generating new advice', async () => {
    const result = await new ChatbotService().processQuery({ queryText: 'मुझे सिरदर्द है', intent: 'direct_answer' });
    expect(result.answer?.answerText).toBe('[hi] Rest for 2 days.');
    expect(result.answer?.safetyDisclaimerText).toBe('[hi] Consult a doctor.');
    expect(llm.translateFields).toHaveBeenCalledTimes(1);
    expect(llm.generateAnswer).not.toHaveBeenCalled();
  });

  it('skips answer translation for English but still creates fresh valid sessions on repeat queries', async () => {
    llm.classifyAndTranslate.mockResolvedValue({ intent: 'MEDICAL', translatedText: 'Headache', detectedLanguage: 'en' });
    const service = new ChatbotService();
    const first = await service.processQuery({ queryText: 'Headache', intent: 'consultation' });
    const second = await service.processQuery({ queryText: 'Headache', intent: 'consultation' });
    expect(first.sessionId).not.toBe(second.sessionId);
    expect(sessions.get(second.sessionId).matchedLevel1QuestionId).toEqual(questionId);
    const result = await new ConsultationService().resolveConsultationAnswer({ sessionId: second.sessionId, answers: { q1: 'yes', q2: 'no' } });
    expect(result.answer.answerText).toBe(sourceAnswer.answerText);
    expect(result.answer.reasonText).toBe(sourceAnswer.reasonText);
    expect(llm.translateFields).not.toHaveBeenCalled();
  });

  it('returns the exact current English database text without any language model calls', async () => {
    const text = 'Saved advice.\n\nSecond paragraph.\nhttps://youtu.be/abcdefghijk';
    (Answer.findOne as jest.Mock).mockResolvedValueOnce({ ...sourceAnswer, answerText: text });
    const service = new ChatbotService();
    const first = await service.processQuery({ queryText: 'I have a headache', intent: 'direct_answer' });
    const second = await service.processQuery({ queryText: 'I have a headache', intent: 'direct_answer' });
    expect(first.answer?.answerText).toBe(text);
    expect(second.answer?.answerText).toBe(sourceAnswer.answerText);
    expect(first.language).toBe('en');
    expect(embedding.generateEmbedding).toHaveBeenCalledWith('I have a headache');
    expect(llm.classifyAndTranslate).not.toHaveBeenCalled();
    expect(llm.translateFields).not.toHaveBeenCalled();
    expect(llm.generateAnswer).not.toHaveBeenCalled();
  });

  it('never embeds untranslated text when language detection fails', async () => {
    llm.classifyAndTranslate.mockRejectedValue(new Error('Translation unavailable'));
    await expect(new ChatbotService().processQuery({ queryText: 'pet dard', intent: 'consultation' })).rejects.toThrow('Translation unavailable');
    expect(embedding.generateEmbedding).not.toHaveBeenCalled();
  });
});
