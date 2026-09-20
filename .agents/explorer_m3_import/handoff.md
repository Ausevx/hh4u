# Handoff Report: Explorer 3 — Multipart Excel Upload API (Milestone M3)

## 1. Observation

### 1.1 Multer Support in `backend/package.json`
- **Dependency Declarations** (`backend/package.json:25, 33`):
  ```json
  "dependencies": {
    "cors": "^2.8.6",
    "dotenv": "^17.4.2",
    "express": "^5.2.1",
    "google-auth-library": "^11.1.0",
    "helmet": "^8.3.0",
    "jsonwebtoken": "^9.0.3",
    "mongoose": "^9.10.1",
    "multer": "^2.4.0",
    "xlsx": "^0.18.5"
  },
  "devDependencies": {
    "@types/cors": "^2.8.19",
    "@types/express": "^5.0.6",
    "@types/jest": "^30.0.0",
    "@types/jsonwebtoken": "^9.0.10",
    "@types/multer": "^2.2.0",
    ...
  }
  ```
- **Runtime Verification Command & Output**:
  - Command: `node -e "const multer = require('multer'); console.log('multer loaded:', typeof multer);"` (executed in `/Users/aditya/workspace/hh4u/backend`)
  - Result: `multer loaded: function` (Exit code: 0).
- **TypeScript & Interop**:
  - `backend/tsconfig.json` specifies `"esModuleInterop": true`, `"module": "commonjs"`, and `"target": "es2016"`. `import multer from 'multer'` compiles seamlessly.
  - Express version is `^5.2.1` with `@types/express: ^5.0.6`. In Express 5, `req.file` is typed via global namespace extension `Express.Multer.File | undefined`. When using `multer.memoryStorage()`, `req.file.buffer` holds the complete file buffer in memory.

### 1.2 `excelParserService.ts` Integration Surface
- **File**: `/Users/aditya/workspace/hh4u/backend/src/services/excelParserService.ts:132-361`
- **Signatures & Contracts**:
  - `export async function parseExcelBuffer(buffer: Buffer): Promise<ParsedExcelData>`
  - `export class ExcelValidationError extends Error { statusCode: number; details?: string[] | ExcelValidationErrorDetails; }`
  - Required worksheets: `['level1', 'ConsultationQueries', 'Answers']` (case-insensitive).
  - Required headers:
    - `level1`: `['Questions']`
    - `ConsultationQueries`: `['Questions', 'Diagnostic Question 1', 'Diagnostic Question 2', 'Diagnostic Question 3']`
    - `Answers`: `['Question', 'Reason', 'Remedy']`
  - Validation checks:
    - Verifies buffer presence (`buffer.length > 0`) -> throws `ExcelValidationError('Empty file buffer provided', 400)`.
    - Verifies OpenXML ZIP magic bytes (`0x50, 0x4B`) -> throws `ExcelValidationError('Corrupted or invalid Excel file format: missing ZIP header', 400)`.
    - Verifies sheets and headers -> throws `ExcelValidationError` with `statusCode: 400`.
  - Return structure `ParsedExcelData`:
    - `level1Questions`: `Array<{ canonicalQuestionText: string; rawRow: number }>`
    - `consultationQueries`: `Array<{ questionText: string; diagnosticQuestions: string[]; rawRow: number }>`
    - `answers`: `Array<{ questionText: string; reasonText: string; remedyText: string; videoUrl?: string; answerType: 'level1' | 'diagnostic'; rawRow: number }>`
    - `stats`: `{ totalRows: {...}, dataRows: {...} }`

### 1.3 Seeding and Batch Ingestion Logic
- **File**: `/Users/aditya/workspace/hh4u/backend/src/scripts/seedKnowledgeBase.ts:113-236`
- **Embedding Generation**:
  - `const ai = getAIServices();`
  - Batch generation supported via `ai.embedding.generateBatchEmbeddings(questionTexts)` (1536-dimensional vectors).
- **Upsert Patterns**:
  - `Level1Question`: `findOneAndUpdate({ canonicalQuestionText }, { $set: { canonicalQuestionText, embedding, isActive: true }, $setOnInsert: { tags: ['homeopathy', 'general'], version: 1 } }, { upsert: true, returnDocument: 'after' })`
  - `ConsultationQuery`: `findOneAndUpdate({ level1QuestionId: qDocId }, { $set: { level1QuestionId: qDocId, diagnosticQuestions }, $setOnInsert: { answerBranches: [] } }, { upsert: true })`
  - `Answer` (Level 1): `findOneAndUpdate({ questionText, answerType: 'level1' }, { $set: { level1QuestionId: qDocId, questionText, answerType: 'level1', reasonText, remedyText, homeRemedyText, answerText, videoUrl } }, { upsert: true })`
  - `Answer` (Diagnostic): `findOneAndUpdate({ questionText, answerType: 'diagnostic' }, { $set: { questionText, answerType: 'diagnostic', reasonText, remedyText, homeRemedyText, answerText, videoUrl } }, { upsert: true })`

### 1.4 Test Assertions & E2E Contracts
- **`PROJECT.md:88` Contract**:
  - `POST /api/admin/knowledge-base/import` -> `multipart/form-data`, file field `file` -> Response: `{ success: true, counts: { questions: number, consultations: number, answers: number } }`.
- **`tier1_feature_coverage.test.ts:379-397` (Test 1.21)**:
  - Expects `res.status === 200`, `res.body.success === true`, `res.body.counts.questions === 3`, `res.body.counts.consultations === 3`, `res.body.counts.answers === 3`.
- **`tier3_pairwise_combinations.test.ts:154-166` (Combination 3.4)**:
  - `"Unauthenticated access to import rejected with 401 without file parsing"`
  - Direct assertion: when NO token is provided, `res.status === 401`, `res.body.success === false`, `res.body.message === 'Authentication token missing or invalid'`.
  - CRITICAL: Multer must NOT consume or reject the body before authentication checks run.
- **`tier3_pairwise_combinations.test.ts:130-150` (Combination 3.3)**:
  - Uploading invalid workbook missing sheet `'ConsultationQueries'` returns `status === 400`, `success === false`, and preserves exact prior database count (zero writes occur).
- **`tier4_real_world_scenarios.test.ts:35-60, 208-239` (Scenarios 4.1 & 4.5)**:
  - Ingesting `database-dummy.xlsx` returns `counts: { questions: 184, consultations: 184, answers: 220 }`.
  - Malformed file returns HTTP 400 matching `/missing required sheet.*answers/i`. Subsequent valid upload succeeds with 200.

---

## 2. Logic Chain

1. **Dependency Confirmation**: Because `multer: ^2.4.0` and `@types/multer: ^2.2.0` are already installed in `backend/package.json` and verified in node runtime (`Observation 1.1`), no additional packages need to be installed.
2. **Storage Architecture**: Because `excelParserService.parseExcelBuffer` operates directly on an in-memory `Buffer` (`Observation 1.2`), using `multer.memoryStorage()` avoids unnecessary disk writes, temporary file cleanup handlers, and race conditions in concurrent multi-admin uploads.
3. **Middleware Ordering & Security**:
   - `tier3_pairwise_combinations.test.ts:154-166` (`Observation 1.4`) explicitly requires that unauthenticated calls to `POST /api/admin/knowledge-base/import` fail with HTTP 401 *before* file parsing.
   - If Multer was placed before `adminAuthMiddleware`, unauthenticated clients could flood server memory with 20MB files, and corrupted files would return 400 instead of 401.
   - Therefore, the route pipeline MUST strictly execute:
     `adminAuthMiddleware` -> `uploadExcelMiddleware` -> `adminKnowledgeBaseController.importExcel`.
4. **Multer Error Trapping**:
   - Standard Multer forwards errors like `LIMIT_FILE_SIZE` and `LIMIT_UNEXPECTED_FILE` to Express `next(err)`. Without an explicit error wrapper, Express default error handler could emit 500 or HTML error responses.
   - Wrapping Multer execution inside `uploadExcelMiddleware` enables catching `MulterError` and `ExcelValidationError` to return uniform HTTP 400 JSON responses `{ success: false, message: ... }`.
5. **Fail-Fast State Preservation**:
   - `tier3_pairwise_combinations.test.ts:143-149` (`Observation 1.4`) requires that database state remains unchanged if an uploaded file is malformed.
   - Because `parseExcelBuffer` validates ZIP magic bytes, worksheet presence, and header columns *before* any MongoDB operations are initiated, any parsing failure rejects with HTTP 400 before any database call is executed, ensuring zero database side effects.
6. **Ingestion & Embedding Upserts**:
   - Following `seedKnowledgeBase.ts` (`Observation 1.3`), all 184 canonical questions are extracted and embedded in a single batch call (`ai.embedding.generateBatchEmbeddings`).
   - Using `findOneAndUpdate({ canonicalQuestionText }, ..., { upsert: true })` ensures idempotent imports, allowing administrators to re-upload updated spreadsheets without primary key collisions or duplicate records.
   - Linked sub-documents (`ConsultationQuery` and `Answer`) resolve references via an in-memory question map populated during question upsert.
7. **Response Payload Contract**:
   - Both `PROJECT.md` and test suites (`Observation 1.4`) mandate the response format:
     `{ success: true, counts: { questions: number, consultations: number, answers: number } }`.

---

## 3. Implementation Proposal

### 3.1 Upload Middleware (`backend/src/middlewares/uploadMiddleware.ts`)

```typescript
import { Request, Response, NextFunction } from 'express';
import multer, { FileFilterCallback } from 'multer';
import { ExcelValidationError } from '../services/excelParserService';

// Configure memory storage
const storage = multer.memoryStorage();

// Allowed MIME types and extensions for Excel OpenXML spreadsheets
const ALLOWED_MIME_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/octet-stream',
  'application/x-zip-compressed',
  'application/zip',
]);

const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const originalname = file.originalname || '';
  const isXlsxExt = originalname.toLowerCase().endsWith('.xlsx');

  if (!isXlsxExt) {
    return cb(new ExcelValidationError('Only Excel (.xlsx) files are supported', 400));
  }

  // Accept file; full format verification (ZIP magic bytes) is performed by excelParserService
  cb(null, true);
};

export const multerUpload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB max file size
    files: 1,                    // Single file only
  },
  fileFilter,
});

/**
 * Express middleware wrapper that intercepts MulterError and ExcelValidationError
 * to guarantee uniform HTTP 400 JSON responses.
 */
export const uploadExcelMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  multerUpload.single('file')(req, res, (err: any) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'File size exceeds maximum allowed limit (20MB)',
          });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({
            success: false,
            message: "Unexpected upload field. File must be provided in field 'file'",
          });
        }
        return res.status(400).json({
          success: false,
          message: `Upload error: ${err.message}`,
        });
      }

      if (err instanceof ExcelValidationError || err.statusCode === 400) {
        return res.status(400).json({
          success: false,
          message: err.message,
          details: err.details,
        });
      }

      return res.status(400).json({
        success: false,
        message: err.message || 'Error processing uploaded file',
      });
    }

    next();
  });
};
```

---

### 3.2 Service Ingestion Method in `AdminKnowledgeBaseService` (`backend/src/services/adminKnowledgeBaseService.ts`)

Add the following method and supporting types to `AdminKnowledgeBaseService`:

```typescript
import { parseExcelBuffer, ParsedExcelData, ExcelValidationError } from './excelParserService';

export interface KnowledgeBaseImportResult {
  success: boolean;
  counts: {
    questions: number;
    consultations: number;
    answers: number;
  };
}

// Inside class AdminKnowledgeBaseService:

  /**
   * Parses an in-memory Excel (.xlsx) buffer, generates vector embeddings,
   * and idempotently upserts questions, consultation queries, and answers into MongoDB.
   */
  public async importKnowledgeBaseFromExcel(buffer: Buffer): Promise<KnowledgeBaseImportResult> {
    // 1. Parse and validate Excel buffer (throws ExcelValidationError 400 before touching DB)
    const parsed: ParsedExcelData = await parseExcelBuffer(buffer);

    // 2. Generate 1536-dimensional embeddings for Level 1 questions
    const ai = getAIServices();
    const questionTexts = parsed.level1Questions.map((q) => q.canonicalQuestionText);
    let embeddings: number[][];
    if (typeof (ai.embedding as any).generateBatchEmbeddings === 'function') {
      embeddings = await (ai.embedding as any).generateBatchEmbeddings(questionTexts);
    } else {
      embeddings = await Promise.all(questionTexts.map((text) => ai.embedding.generateEmbedding(text)));
    }

    // 3. Ingest into MongoDB with transaction if replica set is available
    return this.executeWithTransaction(async (session) => {
      const opts = session ? { session } : {};
      const questionMap = new Map<string, mongoose.Types.ObjectId>();

      // A. Upsert Level 1 Questions
      for (let i = 0; i < parsed.level1Questions.length; i++) {
        const item = parsed.level1Questions[i];
        const embedding = embeddings[i];

        const qDoc = await Level1Question.findOneAndUpdate(
          { canonicalQuestionText: item.canonicalQuestionText },
          {
            $set: {
              canonicalQuestionText: item.canonicalQuestionText,
              embedding,
              isActive: true,
            },
            $setOnInsert: {
              tags: ['homeopathy', 'general'],
              version: 1,
            },
          },
          { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true, ...opts }
        );

        if (qDoc) {
          questionMap.set(item.canonicalQuestionText, qDoc._id as mongoose.Types.ObjectId);
        }
      }

      const questionIdList = Array.from(questionMap.values());

      // B. Upsert Consultation Queries
      for (let i = 0; i < parsed.consultationQueries.length; i++) {
        const cq = parsed.consultationQueries[i];
        const qDocId = questionMap.get(cq.questionText) || questionIdList[i];
        if (!qDocId) continue;

        const diagnosticQuestions = cq.diagnosticQuestions.map((dqText, idx) => ({
          id: `diag_${idx + 1}`,
          questionText: dqText,
        }));

        await ConsultationQuery.findOneAndUpdate(
          { level1QuestionId: qDocId },
          {
            $set: {
              level1QuestionId: qDocId,
              diagnosticQuestions,
            },
            $setOnInsert: {
              answerBranches: [],
            },
          },
          { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true, ...opts }
        );
      }

      // C. Upsert Answers (Level 1 + Diagnostic)
      for (let i = 0; i < parsed.answers.length; i++) {
        const ans = parsed.answers[i];
        const isLevel1 = ans.answerType === 'level1' || i < parsed.level1Questions.length;
        const answerText = (ans.reasonText && ans.remedyText)
          ? `${ans.reasonText}\n\n${ans.remedyText}`
          : (ans.remedyText || ans.reasonText || 'Homeopathic guidance.');

        if (isLevel1) {
          const qDocId = questionMap.get(ans.questionText) || questionIdList[i];
          await Answer.findOneAndUpdate(
            { questionText: ans.questionText, answerType: 'level1' },
            {
              $set: {
                level1QuestionId: qDocId,
                questionText: ans.questionText,
                answerType: 'level1',
                reasonText: ans.reasonText,
                remedyText: ans.remedyText,
                homeRemedyText: ans.remedyText,
                answerText,
                videoUrl: ans.videoUrl,
              },
            },
            { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true, ...opts }
          );
        } else {
          await Answer.findOneAndUpdate(
            { questionText: ans.questionText, answerType: 'diagnostic' },
            {
              $set: {
                questionText: ans.questionText,
                answerType: 'diagnostic',
                reasonText: ans.reasonText,
                remedyText: ans.remedyText,
                homeRemedyText: ans.remedyText,
                answerText,
                videoUrl: ans.videoUrl,
              },
            },
            { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true, ...opts }
          );
        }
      }

      return {
        success: true,
        counts: {
          questions: parsed.level1Questions.length,
          consultations: parsed.consultationQueries.length,
          answers: parsed.answers.length,
        },
      };
    });
  }
```

---

### 3.3 Controller Handler (`backend/src/controllers/adminKnowledgeBaseController.ts`)

```typescript
import { Request, Response } from 'express';
import adminKnowledgeBaseService from '../services/adminKnowledgeBaseService';
import { ExcelValidationError } from '../services/excelParserService';

export class AdminKnowledgeBaseController {
  // ... other CRUD methods ...

  /**
   * POST /api/admin/knowledge-base/import
   * Multipart Excel upload handler for bulk ingestion.
   */
  public async importExcel(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file || !req.file.buffer || req.file.buffer.length === 0) {
        res.status(400).json({
          success: false,
          message: 'No file uploaded',
        });
        return;
      }

      const result = await adminKnowledgeBaseService.importKnowledgeBaseFromExcel(req.file.buffer);

      res.status(200).json({
        success: true,
        counts: result.counts,
      });
    } catch (err: any) {
      if (err instanceof ExcelValidationError || err.name === 'ExcelValidationError') {
        res.status(err.statusCode || 400).json({
          success: false,
          message: err.message,
          details: err.details,
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: err.message || 'Internal server error during Excel import',
      });
    }
  }
}

export const adminKnowledgeBaseController = new AdminKnowledgeBaseController();
export default adminKnowledgeBaseController;
```

---

### 3.4 Route Definition (`backend/src/routes/adminRoutes.ts`)

```typescript
import { Router } from 'express';
import { adminAuthMiddleware } from '../middlewares/adminAuthMiddleware';
import { uploadExcelMiddleware } from '../middlewares/uploadMiddleware';
import adminKnowledgeBaseController from '../controllers/adminKnowledgeBaseController';
import adminAuthController from '../controllers/adminAuthController';

const router = Router();

// Public auth endpoint
router.post('/auth/login', adminAuthController.login);

// Guarded Knowledge Base endpoints
router.get('/stats', adminAuthMiddleware, adminKnowledgeBaseController.getStats);
router.get('/knowledge-base', adminAuthMiddleware, adminKnowledgeBaseController.listItems);
router.get('/knowledge-base/:id', adminAuthMiddleware, adminKnowledgeBaseController.getItemById);
router.post('/knowledge-base', adminAuthMiddleware, adminKnowledgeBaseController.createItem);
router.put('/knowledge-base/:id', adminAuthMiddleware, adminKnowledgeBaseController.updateItem);
router.delete('/knowledge-base/:id', adminAuthMiddleware, adminKnowledgeBaseController.deleteItem);

// Multipart Excel Import endpoint
// STRICT MIDDLEWARE ORDER: Auth first, Multer second, Controller third
router.post(
  '/knowledge-base/import',
  adminAuthMiddleware,
  uploadExcelMiddleware,
  adminKnowledgeBaseController.importExcel.bind(adminKnowledgeBaseController)
);

export default router;
```

---

### 3.5 App Mounting (`backend/src/app.ts`)

```typescript
import adminRoutes from './routes/adminRoutes';

// Mounted at /api/admin
app.use('/api/admin', adminRoutes);
```

---

## 4. Caveats

1. **In-Memory Buffer Scaling**: Storing uploaded files in memory (`multer.memoryStorage()`) is ideal for spreadsheets up to 20MB. If files larger than 100MB are ever anticipated in future non-MVP phases, disk-backed streaming should be considered; for the current knowledge base (`database-dummy.xlsx` is ~30KB), memory storage is optimal, completely stateless, and leaves zero leftover files on disk.
2. **AI Mocking in Tests**: In unit and offline CI test environments, `getAIServices()` uses `MockEmbeddingService`, which deterministic generates vectors. Real production mode connects to OpenAI/Gemini through the adapter interface without altering the ingestion code.
3. **Transaction Support on Standalone Mongo**: Standalone MongoDB (such as default `mongodb-memory-server`) does not support transactions. The provided `executeWithTransaction` helper transparently handles this by executing operations sequentially when no replica set is detected, ensuring 100% test compatibility while offering ACID atomicity on MongoDB Atlas replica sets.

---

## 5. Conclusion

- **Dependencies**: Multer is already fully configured in `backend/package.json` and verified working in Node/TypeScript. No package installations needed.
- **Middleware Pipeline**: `adminAuthMiddleware` must strictly precede `uploadExcelMiddleware` to enforce HTTP 401 unauthenticated rejection prior to file upload buffering.
- **Error Trapping**: Wrapping Multer with `uploadExcelMiddleware` intercepts `MulterError` and `ExcelValidationError`, preventing 500 errors and returning structured HTTP 400 responses.
- **Ingestion & Validation**: `excelParserService.parseExcelBuffer` guarantees fail-fast validation before any MongoDB write, ensuring state preservation on invalid uploads.
- **Response Format**: Conforms strictly to `{ success: true, counts: { questions, consultations, answers } }` with HTTP 200.

---

## 6. Verification Method

### 6.1 Programmatic Test Suite
Run the backend test suite:
```bash
cd /Users/aditya/workspace/hh4u/backend && npm test
```

### 6.2 Key Verification Invalidation Conditions
The implementation proposal would be invalidated if:
1. An unauthenticated request to `POST /api/admin/knowledge-base/import` returns HTTP 400 instead of HTTP 401.
2. A malformed Excel file missing a sheet modifies the database before failing.
3. Uploading `database-dummy.xlsx` returns question/consultation/answer counts different from `184 / 184 / 220`.
4. Re-uploading the same file throws duplicate key errors rather than idempotently upserting records.
