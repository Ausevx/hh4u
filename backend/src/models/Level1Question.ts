import mongoose, { Schema, Document } from 'mongoose';

export interface ILevel1Question extends Document {
  canonicalQuestionText: string; // English
  embedding?: number[]; // 1536-dim
  tags: string[];
  isActive: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const Level1QuestionSchema: Schema = new Schema({
  canonicalQuestionText: { type: String, required: true },
  embedding: { type: [Number] },
  tags: { type: [String], default: [] },
  isActive: { type: Boolean, default: true },
  version: { type: Number, default: 1 },
}, { timestamps: true });

export default mongoose.model<ILevel1Question>('Level1Question', Level1QuestionSchema);
