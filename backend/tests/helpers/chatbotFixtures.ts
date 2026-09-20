import mongoose from 'mongoose';
import Level1Question, { ILevel1Question } from '../../src/models/Level1Question';
import Answer, { IAnswer } from '../../src/models/Answer';
import ConsultationQuery, { IConsultationQuery } from '../../src/models/ConsultationQuery';
import User, { IUser } from '../../src/models/User';
import { getAIServices } from '../../src/services/ai/aiContainer';

export interface SeededChatbotData {
  headacheQuestion: ILevel1Question;
  migraineQuestion: ILevel1Question;
  allergyQuestion: ILevel1Question;
  inactiveQuestion: ILevel1Question;
  headacheAnswer: IAnswer;
  severeMigraineAnswer: IAnswer;
  mildMigraineAnswer: IAnswer;
  migraineConsultation: IConsultationQuery;
  testUser: IUser;
}

export async function seedChatbotFixtures(): Promise<SeededChatbotData> {
  const ai = getAIServices();

  // 1. Generate realistic embeddings using active MockEmbeddingService
  const headacheEmbedding = await ai.embedding.generateEmbedding(
    'What is the recommended homeopathic treatment for tension headaches?'
  );
  const migraineEmbedding = await ai.embedding.generateEmbedding(
    'What homeopathic remedies help with acute migraine pain?'
  );
  const allergyEmbedding = await ai.embedding.generateEmbedding(
    'Homeopathic care for seasonal allergic rhinitis and sneezing'
  );
  const inactiveEmbedding = await ai.embedding.generateEmbedding(
    'Outdated treatment guideline for archived symptoms'
  );

  // 2. Seed Level 1 Questions
  const headacheQuestion = await Level1Question.create({
    canonicalQuestionText: 'What is the recommended homeopathic treatment for tension headaches?',
    embedding: headacheEmbedding,
    tags: ['headache', 'tension'],
    isActive: true,
    version: 1,
  });

  const migraineQuestion = await Level1Question.create({
    canonicalQuestionText: 'What homeopathic remedies help with acute migraine pain?',
    embedding: migraineEmbedding,
    tags: ['migraine', 'headache', 'pain'],
    isActive: true,
    version: 1,
  });

  const allergyQuestion = await Level1Question.create({
    canonicalQuestionText: 'Homeopathic care for seasonal allergic rhinitis and sneezing',
    embedding: allergyEmbedding,
    tags: ['allergy', 'rhinitis', 'sneezing'],
    isActive: true,
    version: 1,
  });

  const inactiveQuestion = await Level1Question.create({
    canonicalQuestionText: 'Outdated treatment guideline for archived symptoms',
    embedding: inactiveEmbedding,
    tags: ['archived'],
    isActive: false,
    version: 1,
  });

  // 3. Seed Direct Answers
  const headacheAnswer = await Answer.create({
    level1QuestionId: headacheQuestion._id,
    answerText: 'Belladonna 30C or Spigelia can assist with acute tension headaches.',
    dosageInstructions: 'Take 4 pellets under the tongue every 4 hours.',
    homeRemedyText: 'Rest in a quiet, dark room and stay hydrated with warm water.',
    safetyDisclaimerText: 'If headache is accompanied by high fever or stiff neck, consult a doctor immediately.',
    videoUrl: 'https://example.com/videos/headache-remedy',
  });

  const severeMigraineAnswer = await Answer.create({
    level1QuestionId: migraineQuestion._id,
    answerText: 'Severe throbbing migraine with nausea: Belladonna 200C and Glonoinum are strongly recommended.',
    dosageInstructions: 'Take 3 pellets twice daily for 2 days.',
    homeRemedyText: 'Apply cold compress on forehead, avoid bright sunlight.',
    safetyDisclaimerText: 'Seek emergency care if sudden vision loss or numbness occurs.',
    videoUrl: 'https://example.com/videos/severe-migraine',
  });

  const mildMigraineAnswer = await Answer.create({
    level1QuestionId: migraineQuestion._id,
    answerText: 'Mild dull migraine: Gelsemium 30C and Kali Phos are suitable for gradual relief.',
    dosageInstructions: 'Take 4 pellets 3 times daily.',
    homeRemedyText: 'Gentle neck stretches and chamomile tea.',
    safetyDisclaimerText: 'Consult clinic if headaches recur more than 3 times a week.',
  });

  // 4. Seed Consultation Query with Diagnostic Questions & Answer Branches
  const migraineConsultation = await ConsultationQuery.create({
    level1QuestionId: migraineQuestion._id,
    diagnosticQuestions: [
      { id: 'q1', questionText: 'Is the headache throbbing or pulsating in nature?' },
      { id: 'q2', questionText: 'Is there associated nausea or severe sensitivity to light?' },
    ],
    answerBranches: [
      {
        conditions: { q1: 'yes', q2: 'yes' },
        resolvedAnswerId: severeMigraineAnswer._id,
      },
      {
        conditions: { q1: 'no', q2: 'no' },
        resolvedAnswerId: mildMigraineAnswer._id,
      },
      {
        conditions: { q1: 'yes', q2: 'no' },
        resolvedAnswerId: headacheAnswer._id,
      },
    ],
  });

  // 5. Seed Test User
  const testUser = await User.create({
    displayName: 'Patient Test User',
    email: 'patient@example.com',
    authProvider: 'email_otp',
  });

  return {
    headacheQuestion,
    migraineQuestion,
    allergyQuestion,
    inactiveQuestion,
    headacheAnswer,
    severeMigraineAnswer,
    mildMigraineAnswer,
    migraineConsultation,
    testUser,
  };
}
