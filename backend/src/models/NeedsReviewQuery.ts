import mongoose, { Schema, Document } from 'mongoose';

export interface INeedsReviewQuery extends Document {
  originalQueryText: string;
  originalLanguage: string;
  translatedQueryText: string;
  userId?: mongoose.Types.ObjectId;
  sessionId?: mongoose.Types.ObjectId;
  status: 'pending' | 'resolved' | 'ignored';
  resolvedLevel1QuestionId?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const NeedsReviewQuerySchema: Schema = new Schema({
  originalQueryText: { type: String, required: true },
  originalLanguage: { type: String, required: true },
  translatedQueryText: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  sessionId: { type: Schema.Types.ObjectId, ref: 'ChatbotSession' },
  status: { type: String, enum: ['pending', 'resolved', 'ignored'], default: 'pending' },
  resolvedLevel1QuestionId: { type: Schema.Types.ObjectId, ref: 'Level1Question' },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<INeedsReviewQuery>('NeedsReviewQuery', NeedsReviewQuerySchema);
