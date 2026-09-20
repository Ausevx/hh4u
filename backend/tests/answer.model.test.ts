import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Answer from '../src/models/Answer';

describe('Answer Model Schema Evolution & Backwards Compatibility', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await Answer.deleteMany({});
  });

  it('preserves backwards compatibility with legacy answer creation', async () => {
    const fakeL1Id = new mongoose.Types.ObjectId();
    const doc = await Answer.create({
      level1QuestionId: fakeL1Id,
      answerText: 'Legacy homeopathic answer',
      homeRemedyText: 'Drink warm water',
    });

    expect(doc.level1QuestionId?.toString()).toBe(fakeL1Id.toString());
    expect(doc.answerText).toBe('Legacy homeopathic answer');
    expect(doc.questionText).toBe('Legacy homeopathic answer');
    expect(doc.answerType).toBe('level1');
    expect(doc.remedyText).toBe('Drink warm water');
  });

  it('supports Excel-style answer creation without level1QuestionId', async () => {
    const doc = await Answer.create({
      questionText: 'Are antibiotics safe for children?',
      reasonText: 'Chemical compounds may cause side effects.',
      remedyText: 'Offer turmeric milk.',
      videoUrl: 'https://youtu.be/sample',
    });

    expect(doc.level1QuestionId).toBeUndefined();
    expect(doc.questionText).toBe('Are antibiotics safe for children?');
    expect(doc.answerType).toBe('level1');
    expect(doc.reasonText).toBe('Chemical compounds may cause side effects.');
    expect(doc.remedyText).toBe('Offer turmeric milk.');
    expect(doc.homeRemedyText).toBe('Offer turmeric milk.');
    expect(doc.answerText).toContain('Chemical compounds may cause side effects.');
    expect(doc.answerText).toContain('Offer turmeric milk.');
    expect(doc.videoUrl).toBe('https://youtu.be/sample');
  });

  it('supports diagnostic answer creation with answerType=diagnostic', async () => {
    const doc = await Answer.create({
      questionText: 'Do you also experience nausea, vomiting, or visual changes?',
      answerType: 'diagnostic',
      reasonText: 'Nausea indicates migraine progression.',
      remedyText: 'Belladonna 200C.',
    });

    expect(doc.level1QuestionId).toBeUndefined();
    expect(doc.answerType).toBe('diagnostic');
    expect(doc.questionText).toBe('Do you also experience nausea, vomiting, or visual changes?');
  });

  it('rejects invalid answerType enum values', async () => {
    await expect(
      Answer.create({
        questionText: 'Test question',
        answerType: 'invalid_type' as any,
        answerText: 'Test answer',
      })
    ).rejects.toThrow();
  });
});
