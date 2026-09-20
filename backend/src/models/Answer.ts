import mongoose, { Schema, Document } from 'mongoose';

export type AnswerType = 'level1' | 'diagnostic';

export interface IAnswer extends Document {
  level1QuestionId?: mongoose.Types.ObjectId;
  questionText: string;
  answerType: AnswerType;
  answerText: string;
  reasonText?: string;
  remedyText?: string;
  homeRemedyText?: string;
  dosageInstructions?: string;
  safetyDisclaimerText?: string;
  videoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AnswerSchema: Schema = new Schema(
  {
    level1QuestionId: {
      type: Schema.Types.ObjectId,
      ref: 'Level1Question',
      required: false,
      index: true,
    },
    questionText: {
      type: String,
      required: true,
      trim: true,
      index: true,
      default: function (this: any) {
        return this.answerText || 'General Consultation Question';
      },
    },
    answerType: {
      type: String,
      enum: ['level1', 'diagnostic'],
      default: 'level1',
      required: true,
      index: true,
    },
    answerText: {
      type: String,
      required: true,
      trim: true,
      default: function (this: any) {
        if (this.remedyText && this.reasonText) {
          return `${this.reasonText}\n\n${this.remedyText}`;
        }
        return this.remedyText || this.reasonText || 'Homeopathic guidance.';
      },
    },
    reasonText: {
      type: String,
      trim: true,
    },
    remedyText: {
      type: String,
      trim: true,
      default: function (this: any) {
        return this.homeRemedyText || undefined;
      },
    },
    homeRemedyText: {
      type: String,
      trim: true,
      default: function (this: any) {
        return this.remedyText || undefined;
      },
    },
    dosageInstructions: {
      type: String,
      trim: true,
    },
    safetyDisclaimerText: {
      type: String,
      trim: true,
    },
    videoUrl: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-validation hook to ensure cross-field normalization and backwards compatibility
AnswerSchema.pre('validate', function () {
  if (!this.questionText && this.answerText) {
    this.questionText = this.answerText;
  }
  if (!this.answerText) {
    if (this.remedyText && this.reasonText) {
      this.answerText = `${this.reasonText}\n\n${this.remedyText}`;
    } else if (this.remedyText) {
      this.answerText = this.remedyText;
    } else if (this.reasonText) {
      this.answerText = this.reasonText;
    }
  }
  if (!this.homeRemedyText && this.remedyText) {
    this.homeRemedyText = this.remedyText;
  }
  if (!this.remedyText && this.homeRemedyText) {
    this.remedyText = this.homeRemedyText;
  }
});

export default mongoose.model<IAnswer>('Answer', AnswerSchema);
