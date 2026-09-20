import mongoose, { Schema, Document } from 'mongoose';

export interface IDiagnosticQuestion {
  id: string;
  questionText: string;
}

export interface IAnswerBranch {
  conditions: Record<string, 'yes' | 'no'>;
  resolvedAnswerId: mongoose.Types.ObjectId;
}

export interface IConsultationQuery extends Document {
  level1QuestionId: mongoose.Types.ObjectId;
  diagnosticQuestions: IDiagnosticQuestion[];
  answerBranches: IAnswerBranch[];
  updatedAt: Date;
}

const ConsultationQuerySchema: Schema = new Schema({
  level1QuestionId: { type: Schema.Types.ObjectId, ref: 'Level1Question', required: true },
  diagnosticQuestions: [{
    id: { type: String, required: true },
    questionText: { type: String, required: true }
  }],
  answerBranches: [{
    conditions: { type: Map, of: String },
    resolvedAnswerId: { type: Schema.Types.ObjectId, ref: 'Answer' }
  }],
}, { timestamps: { createdAt: false, updatedAt: true } });

export default mongoose.model<IConsultationQuery>('ConsultationQuery', ConsultationQuerySchema);
