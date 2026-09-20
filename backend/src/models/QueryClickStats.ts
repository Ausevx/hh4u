import mongoose, { Schema, Document } from 'mongoose';

export interface IQueryClickStats extends Document {
  userEmail?: string; // Guest might not have email, could use userId
  userId?: mongoose.Types.ObjectId;
  level1QuestionId: mongoose.Types.ObjectId;
  firstAskedAt: Date;
  clickCount: number;
}

const QueryClickStatsSchema: Schema = new Schema({
  userEmail: { type: String },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  level1QuestionId: { type: Schema.Types.ObjectId, ref: 'Level1Question', required: true },
  firstAskedAt: { type: Date, default: Date.now },
  clickCount: { type: Number, default: 1 }
});

export default mongoose.model<IQueryClickStats>('QueryClickStats', QueryClickStatsSchema);
