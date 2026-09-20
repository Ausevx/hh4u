import mongoose, { Schema, Document } from 'mongoose';

export interface IMatchCandidate {
  level1QuestionId: mongoose.Types.ObjectId;
  score: number;
}

export interface IChatbotSession extends Document {
  userId?: mongoose.Types.ObjectId; // Guest sessions might not have a full user ID initially, or guest user gets one
  originalQueryText: string;
  originalLanguage: string; // e.g. hi, en
  translatedQueryText: string;
  inputMode: 'text' | 'voice';
  intent: 'direct_answer' | 'consultation';
  matchCandidates: IMatchCandidate[];
  matchedLevel1QuestionId?: mongoose.Types.ObjectId;
  matchConfident: boolean;
  consultationAnswers?: Record<string, 'yes' | 'no'>;
  finalAnswerId?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const ChatbotSessionSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  originalQueryText: { type: String, required: true },
  originalLanguage: { type: String, required: true },
  translatedQueryText: { type: String, required: true },
  inputMode: { type: String, enum: ['text', 'voice'], required: true },
  intent: { type: String, enum: ['direct_answer', 'consultation'], required: true },
  matchCandidates: [{
    level1QuestionId: { type: Schema.Types.ObjectId, ref: 'Level1Question' },
    score: { type: Number }
  }],
  matchedLevel1QuestionId: { type: Schema.Types.ObjectId, ref: 'Level1Question' },
  matchConfident: { type: Boolean, default: false },
  consultationAnswers: { type: Map, of: String },
  finalAnswerId: { type: Schema.Types.ObjectId, ref: 'Answer' },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IChatbotSession>('ChatbotSession', ChatbotSessionSchema);
