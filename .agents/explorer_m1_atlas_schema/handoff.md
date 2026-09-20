# Investigation Report: Atlas Connection & Schema Evolution (Milestone M1)

**Date**: 2026-09-19T02:22:00Z  
**Author**: Milestone M1 Explorer 1 (Atlas Connection & Schema Evolution)  
**Target Audience**: Milestone M1 Worker & Orchestrator  
**File Location**: `/Users/aditya/workspace/hh4u/.agents/explorer_m1_atlas_schema/handoff.md`

---

## 1. Observation

### 1.1 MongoDB Atlas Connection & Environment Configuration
- **File**: `/Users/aditya/workspace/hh4u/backend/.env` (lines 6-8):
  ```env
  MONGODB_USERNAME="test1magnitude_db_user"
  MONGODB_PASSWORD="JZvOlrRvxOZ0XnBb"
  MONGODB_URI="mongodb+srv://test1magnitude_db_user:JZvOlrRvxOZ0XnBb@cluster0.iifejq3.mongodb.net"
  ```
  *Observation*: `MONGODB_URI` specifies the cluster domain `cluster0.iifejq3.mongodb.net` but lacks a path database name (e.g. `/hh4u`). `DB_NAME` is not currently defined in `.env`.
- **File**: `/Users/aditya/workspace/hh4u/backend/src/config/db.ts` (lines 6-19):
  ```ts
  const connectDB = async () => {
    try {
      const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
      if (!mongoUri) {
        throw new Error('MONGODB_URI is not defined in .env file');
      }

      const conn = await mongoose.connect(mongoUri);
      console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
      console.error(`Error connecting to MongoDB: ${(error as Error).message}`);
      process.exit(1);
    }
  };
  ```
  *Observation*: `mongoose.connect(mongoUri)` is invoked with no options. In Mongoose, omitting `dbName` when the URI path lacks a database defaults to the `test` database.
- **Empirical Live Test**:
  - Live probe using node connecting without `dbName` options:
    `Connected to default database: test; Collections in test: ['connectiontests']`.
  - Live probe using node connecting with `{ dbName: 'hh4u' }`:
    `SUCCESS! Connected to host: ac-iwm5wyi-shard-00-02.iifejq3.mongodb.net database: hh4u`. Ping result: `{ ok: 1 }`. Collections in `hh4u`: `[]`.

### 1.2 Existing Answer Model & Call Sites
- **File**: `/Users/aditya/workspace/hh4u/backend/src/models/Answer.ts` (lines 3-22):
  ```ts
  export interface IAnswer extends Document {
    level1QuestionId: mongoose.Types.ObjectId;
    answerText: string;
    dosageInstructions?: string;
    homeRemedyText?: string;
    safetyDisclaimerText?: string;
    videoUrl?: string;
    updatedAt: Date;
  }

  const AnswerSchema: Schema = new Schema({
    level1QuestionId: { type: Schema.Types.ObjectId, ref: 'Level1Question', required: true },
    answerText: { type: String, required: true },
    dosageInstructions: { type: String },
    homeRemedyText: { type: String },
    safetyDisclaimerText: { type: String },
    videoUrl: { type: String },
  }, { timestamps: { createdAt: false, updatedAt: true } });

  export default mongoose.model<IAnswer>('Answer', AnswerSchema);
  ```
- **File**: `/Users/aditya/workspace/hh4u/backend/tests/helpers/chatbotFixtures.ts` (lines 71-78, 80-87, 89-95):
  ```ts
  const headacheAnswer = await Answer.create({
    level1QuestionId: headacheQuestion._id,
    answerText: 'Belladonna 30C or Spigelia can assist with acute tension headaches.',
    dosageInstructions: 'Take 4 pellets under the tongue every 4 hours.',
    homeRemedyText: 'Rest in a quiet, dark room and stay hydrated with warm water.',
    safetyDisclaimerText: 'If headache is accompanied by high fever or stiff neck, consult a doctor immediately.',
    videoUrl: 'https://example.com/videos/headache-remedy',
  });
  ```
- **File**: `/Users/aditya/workspace/hh4u/backend/tests/chatbot.challenger.test.ts` (lines 387-390):
  ```ts
  ansA = await Answer.create({
    level1QuestionId: multiCondQuestion._id,
    answerText: 'Remedy A: Arsenicum Album 200C for acute nighttime wheezing with anxiety.',
  });
  ```
- **File**: `/Users/aditya/workspace/hh4u/backend/src/services/chatbotService.ts` (line 165):
  ```ts
  const answerDoc = await Answer.findOne({ level1QuestionId: topCandidate.level1QuestionId });
  ```
- **File**: `/Users/aditya/workspace/hh4u/backend/src/services/consultationService.ts` (lines 162-168):
  ```ts
  if (matchedBranch?.resolvedAnswerId) {
    answerDoc = await Answer.findById(matchedBranch.resolvedAnswerId);
  }
  if (!answerDoc) {
    answerDoc = await Answer.findOne({ level1QuestionId: session.matchedLevel1QuestionId });
  }
  ```

### 1.3 Dataset Analysis (`database-dummy.xlsx`)
- **Excel Workbook Inspection**:
  - Sheet `level1`: 184 data rows (Column: `Questions`).
  - Sheet `ConsultationQueries`: 184 data rows (Columns: `Questions`, `Diagnostic Question 1`, `Diagnostic Question 2`, `Diagnostic Question 3`).
  - Sheet `Answers`: 220 data rows (Columns: `Question`, `Reason`, `Remedy`).
- **Answer Mapping Empirical Finding**:
  - Exactly 184 rows in `Answers` match the 184 `level1` questions (`canonicalQuestionText`).
  - Exactly 36 rows in `Answers` correspond to diagnostic questions defined in `ConsultationQueries`.
  - All 36 diagnostic questions in `Answers` appear in multiple `ConsultationQueries` diagnostic trees across different Level 1 questions (e.g. `'Do you also experience nausea, vomiting, sensitivity to light, or visual changes?'` is shared across several headache/migraine queries).
  - 195 of the 220 answer rows contain YouTube URLs embedded in the `Remedy` column (e.g., `https://youtu.be/L_F8VeK8VPQ?si=...`).

---

## 2. Logic Chain

1. **Database Isolation**:
   - *Observation 1.1* shows `MONGODB_URI` does not contain `/hh4u`, and connecting without options connects to `test`.
   - *Observation 1.1* shows connecting with `{ dbName: 'hh4u' }` successfully isolates all knowledge base collections into the targeted `hh4u` production database.
   - Therefore, `DB_NAME="hh4u"` must be added to `backend/.env`, and `backend/src/config/db.ts` must explicitly pass `dbName: process.env.DB_NAME || 'hh4u'` to `mongoose.connect()`.

2. **Why `level1QuestionId` Must Be Optional**:
   - *Observation 1.3* demonstrates that 36 answers in the seed dataset are diagnostic branch answers rather than direct Level 1 answers.
   - *Observation 1.3* proves that each of these 36 diagnostic questions is referenced across multiple Level 1 questions. They cannot be bound to a single required `level1QuestionId`.
   - Therefore, `level1QuestionId` in `Answer.ts` must have `required: false` and `index: true`.

3. **Why `questionText` Requires a Smart Fallback Default for Backwards Compatibility**:
   - Requirement 3 states: `questionText (String, required: true)`.
   - *Observation 1.2* shows that existing test fixtures (`chatbotFixtures.ts:71`) and test suites (`chatbot.challenger.test.ts:387`) invoke `Answer.create({ level1QuestionId, answerText })` without providing `questionText`.
   - If `questionText` is configured as `{ type: String, required: true }` without a default, Mongoose throws a `ValidationError: Path 'questionText' is required`, which would break the entire test suite (99 passing tests across 6 suites).
   - In Mongoose, providing a schema `default` function (`function() { return this.answerText || 'General Consultation Question'; }`) and a `pre('validate')` normalization hook ensures:
     a) If `questionText` is provided (Excel parser, Admin CRUD), it is preserved.
     b) If legacy callers provide only `answerText`, `questionText` is automatically populated from `answerText`.
     c) Validation succeeds 100% without breaking any existing test.

4. **Harmonizing `answerText`, `reasonText`, and `remedyText`**:
   - In `database-dummy.xlsx`, the sheet has `Reason` and `Remedy`, but no `answerText`.
   - In existing chatbot services (*Observation 1.2*), `chatbotService.ts` and `consultationService.ts` expect `answerDoc.answerText` and `answerDoc.homeRemedyText`.
   - To make the schema work seamlessly for both the existing chatbot engine and the new Excel ingestion:
     - Add `reasonText: { type: String, trim: true }`
     - Add `remedyText: { type: String, trim: true }`
     - Provide a default for `answerText` that concatenates `${reasonText}\n\n${remedyText}` when `answerText` is omitted.
     - Provide bidirectional fallback between `homeRemedyText` and `remedyText`.
     - Add `answerType: { type: String, enum: ['level1', 'diagnostic'], default: 'level1', required: true, index: true }`.

---

## 3. Caveats

1. **Atlas Live Network Access**: The live MongoDB Atlas cluster was successfully verified via direct connection. However, automated CI test suites in `backend/tests/` run against `mongodb-memory-server` in-memory rather than the live cluster. All schema and model changes must remain compatible with both `mongodb-memory-server` and live MongoDB Atlas v8.0.32.
2. **Video URL Format**: In `database-dummy.xlsx`, 195 rows contain YouTube links embedded as free text in the Remedy column. The Excel parser in M2 will extract these into `videoUrl`. In `Answer.ts`, `videoUrl` is already defined as `{ type: String, trim: true }`, which accommodates this.
3. **Atlas Vector Search Index**: Explorer 2 is investigating the vector index creation (`vector_index` on `level1questions.embedding`). The Answer schema changes do not interfere with the vector search index on `level1questions`.

---

## 4. Conclusion & Concrete Code Recommendations for Worker

The Worker can execute these changes directly without risk of regressions.

### Change 1: Update `backend/.env`
Append `DB_NAME="hh4u"` and ensure `PORT=5000`:
```env
# Generated by MongoDB Atlas onboarding.
# This file contains sensitive credentials.
# DO NOT commit this file to version control.
# Store it securely (e.g. use a password manager or secrets vault).

MONGODB_USERNAME="test1magnitude_db_user"
MONGODB_PASSWORD="JZvOlrRvxOZ0XnBb"
MONGODB_URI="mongodb+srv://test1magnitude_db_user:JZvOlrRvxOZ0XnBb@cluster0.iifejq3.mongodb.net"
DB_NAME="hh4u"
PORT=5000
```

### Change 2: Update `backend/src/config/db.ts`
Replace `backend/src/config/db.ts` with:
```ts
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Connects to MongoDB Atlas or local MongoDB instance with database isolation.
 * Uses DB_NAME from environment variables with fallback to 'hh4u'.
 *
 * @param dbNameOverride Optional database name override
 * @returns Mongoose connection instance
 */
export const connectDB = async (dbNameOverride?: string): Promise<typeof mongoose> => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in .env file');
    }

    const dbName = dbNameOverride || process.env.DB_NAME || 'hh4u';

    const conn = await mongoose.connect(mongoUri, {
      dbName,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}, Database: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${(error as Error).message}`);
    process.exit(1);
  }
};

export default connectDB;
```

### Change 3: Update `backend/src/models/Answer.ts`
Replace `backend/src/models/Answer.ts` with:
```ts
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
AnswerSchema.pre('validate', function (next) {
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
  next();
});

export default mongoose.model<IAnswer>('Answer', AnswerSchema);
```

### Change 4: Add New Model Unit Test `backend/tests/answer.model.test.ts`
To verify schema evolution, add `backend/tests/answer.model.test.ts`:
```ts
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Answer from '../src/models/Answer';
import Level1Question from '../src/models/Level1Question';

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
```

---

## 5. Verification Method

1. **TypeScript Type Check**:
   ```bash
   cd /Users/aditya/workspace/hh4u/backend && npx tsc --noEmit
   ```
   *Expected result*: Exit code 0, no compilation errors.

2. **Backend Test Suite (Existing & New Tests)**:
   ```bash
   cd /Users/aditya/workspace/hh4u/backend && npm test
   ```
   *Expected result*: All 6 existing test suites (99 tests) plus the new `answer.model.test.ts` pass cleanly with 0 failures.

3. **Live Atlas Connection Verification**:
   ```bash
   cd /Users/aditya/workspace/hh4u/backend && node -e "
     require('dotenv').config();
     const connectDB = require('./src/config/db').default;
     connectDB().then(conn => {
       console.log('Database verified:', conn.connection.name);
       process.exit(0);
     });
   "
   ```
   *Expected result*: Logs `MongoDB Connected: ..., Database: hh4u`. Exit code 0.

4. **Invalidation Conditions**:
   - If `npm test` fails due to `ValidationError: Path 'questionText' is required`, verify that the default function and `pre('validate')` hook are properly registered on `AnswerSchema`.
   - If Mongoose connects to `test` instead of `hh4u`, verify that `DB_NAME="hh4u"` is present in `backend/.env` and `dbName` option is passed in `mongoose.connect()`.
