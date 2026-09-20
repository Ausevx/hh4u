# Backend Architecture Survey Report — Chatbot Engine

**Survey Agent**: Backend Architecture Explorer (`explorer_survey_2`)  
**Target Project**: Healing Hands4U (`hh4u/backend`)  
**Date**: 2026-09-17  
**Status**: Complete  

---

## 1. Observation

### 1.1 Runtime, Framework & Language
- **Runtime**: Node.js (v22.20.3 types installed)
- **Framework**: Express 5.2.1 (`"express": "^5.2.1"`)
- **Language**: TypeScript 5.9.3 (`"typescript": "^5.9.3"`)
- **Module System**: CommonJS (`"type": "commonjs"` in `package.json`, `"module": "commonjs"`, `"target": "es2016"` in `tsconfig.json`)
- **Build & Dev Tooling**:
  - Dev runner: `ts-node-dev --respawn src/index.ts`
  - Compiler: `tsc` producing output into `dist/` (`rootDir: "./src"`, `outDir: "./dist"`)
  - Test runner: `NODE_OPTIONS=--experimental-vm-modules jest --runInBand --detectOpenHandles` with `ts-jest` (v29.4.12) and `mongodb-memory-server` (v11.2.0)

### 1.2 Package.json Dependencies & Scripts
From `/Users/aditya/workspace/hh4u/backend/package.json`:
```json
{
  "name": "backend",
  "version": "1.0.0",
  "scripts": {
    "test": "NODE_OPTIONS=--experimental-vm-modules jest --runInBand --detectOpenHandles",
    "dev": "ts-node-dev --respawn src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "type": "commonjs",
  "dependencies": {
    "cors": "^2.8.6",
    "dotenv": "^17.4.2",
    "express": "^5.2.1",
    "google-auth-library": "^11.1.0",
    "helmet": "^8.3.0",
    "jsonwebtoken": "^9.0.3",
    "mongoose": "^9.10.1"
  },
  "devDependencies": {
    "@types/cors": "^2.8.19",
    "@types/express": "^5.0.6",
    "@types/jest": "^30.0.0",
    "@types/jsonwebtoken": "^9.0.10",
    "@types/node": "^22.20.3",
    "@types/supertest": "^7.2.1",
    "jest": "^30.5.1",
    "mongodb-memory-server": "^11.2.0",
    "supertest": "^7.2.2",
    "ts-jest": "^29.4.12",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.9.3"
  }
}
```

### 1.3 Server Structure & Routing Pattern
The application strictly enforces **App/Server separation**:
1. **`src/app.ts`**:
   - Initializes `express()`, applies middleware (`cors()`, `helmet()`, `express.json()`).
   - Registers root `/health` health-check route.
   - Mounts routes (currently `app.use('/api/auth', authRoutes)`).
   - Exports `app` and `{ app }` without calling `.listen()`.
   - Allows Supertest tests in `tests/*.test.ts` to make in-process HTTP requests against `app` without binding network ports.
2. **`src/index.ts`**:
   - Imports `app` from `./app` and `connectDB` from `./config/db`.
   - Calls `connectDB()`.
   - Starts HTTP server on `process.env.PORT || 5000`.
3. **Directory Structure in `backend/src/`**:
   - `config/`: Database connection (`db.ts`).
   - `controllers/`: Request handlers (`authController.ts`).
   - `middlewares/`: Middleware functions (`authMiddleware.ts`).
   - `models/`: Mongoose schemas and models.
   - `routes/`: Express routers (`authRoutes.ts`).
   - `services/`: **Currently an empty directory** (`backend/src/services/` exists).
   - `utils/`: Utilities (`jwt.ts`).

### 1.4 Database Connection & Configuration
From `src/config/db.ts`:
- Uses Mongoose 9.10.1:
  ```typescript
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  const conn = await mongoose.connect(mongoUri);
  ```
- Dev/production URI in `backend/.env`: `mongodb+srv://test1magnitude_db_user:...@cluster0.iifejq3.mongodb.net`
- Test isolation: `mongodb-memory-server` is used in test suites (`tests/auth.test.ts` and `tests/auth.adversarial.test.ts`), creating an isolated in-memory MongoDB instance per test suite run.

### 1.5 Existing Mongoose Models & Schemas
All 5 required Chatbot Engine collections/models already exist in `backend/src/models/`!
1. **`Level1Question` (`src/models/Level1Question.ts`)**:
   ```typescript
   export interface ILevel1Question extends Document {
     canonicalQuestionText: string; // English
     embedding?: number[]; // 1536-dim
     tags: string[];
     isActive: boolean;
     version: number;
     createdAt: Date;
     updatedAt: Date;
   }
   // Schema: canonicalQuestionText (required), embedding ([Number]), tags ([String]), isActive (Boolean, def: true), version (Number, def: 1), timestamps: true
   // Export: mongoose.model<ILevel1Question>('Level1Question', Level1QuestionSchema);
   ```
2. **`ConsultationQuery` (`src/models/ConsultationQuery.ts`)**:
   ```typescript
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
   // Schema: level1QuestionId (ref 'Level1Question', required), diagnosticQuestions [{ id, questionText }], answerBranches [{ conditions: Map of String, resolvedAnswerId: ref 'Answer' }]
   // Export: mongoose.model<IConsultationQuery>('ConsultationQuery', ConsultationQuerySchema);
   ```
3. **`NeedsReviewQuery` (`src/models/NeedsReviewQuery.ts`)**:
   ```typescript
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
   // Schema: originalQueryText (required), originalLanguage (required), translatedQueryText (required), userId (ref 'User'), sessionId (ref 'ChatbotSession'), status (enum, def: 'pending'), resolvedLevel1QuestionId (ref 'Level1Question'), createdAt (Date, def: Date.now)
   // Export: mongoose.model<INeedsReviewQuery>('NeedsReviewQuery', NeedsReviewQuerySchema);
   ```
4. **`ChatbotSession` (`src/models/ChatbotSession.ts`)**:
   ```typescript
   export interface IMatchCandidate {
     level1QuestionId: mongoose.Types.ObjectId;
     score: number;
   }
   export interface IChatbotSession extends Document {
     userId?: mongoose.Types.ObjectId;
     originalQueryText: string;
     originalLanguage: string;
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
   // Export: mongoose.model<IChatbotSession>('ChatbotSession', ChatbotSessionSchema);
   ```
5. **`QueryClickStats` (`src/models/QueryClickStats.ts`)**:
   ```typescript
   export interface IQueryClickStats extends Document {
     userEmail?: string;
     userId?: mongoose.Types.ObjectId;
     level1QuestionId: mongoose.Types.ObjectId;
     firstAskedAt: Date;
     clickCount: number;
   }
   // Schema: userEmail (String), userId (ref 'User'), level1QuestionId (ref 'Level1Question', required), firstAskedAt (Date, def: Date.now), clickCount (Number, def: 1)
   // Export: mongoose.model<IQueryClickStats>('QueryClickStats', QueryClickStatsSchema);
   ```
6. **`Answer` (`src/models/Answer.ts`)**:
   ```typescript
   export interface IAnswer extends Document {
     level1QuestionId: mongoose.Types.ObjectId;
     answerText: string;
     dosageInstructions?: string;
     homeRemedyText?: string;
     safetyDisclaimerText?: string;
     videoUrl?: string;
     updatedAt: Date;
   }
   // Export: mongoose.model<IAnswer>('Answer', AnswerSchema);
   ```

### 1.6 AI Integrations & Vector Search
- **Grep check results**:
  - No external AI vendor SDKs (no OpenAI, Anthropic, Gemini, LangChain) are installed in `package.json` or imported anywhere in `backend/src/`.
  - No vector math or cosine similarity routines exist in `src/`.
  - `src/services/` directory is present but completely empty.
- **Test Suite Status**:
  - Ran `npm test` synchronously: 2 test suites (`tests/auth.test.ts`, `tests/auth.adversarial.test.ts`), 29 tests passed in 2.29s.
  - Ran `npm run build` synchronously: `tsc` compiled with 0 errors.

---

## 2. Logic Chain

1. **Architecture Consistency**:
   - Since `src/app.ts` and `src/index.ts` separate routing from server listening, all chatbot endpoints should be registered on an Express `Router` in `src/routes/chatbotRoutes.ts` and mounted into `src/app.ts`.
   - In `ORIGINAL_REQUEST.md`, endpoints are referenced as:
     - `POST /chatbot/query`
     - `POST /chatbot/consultation-answer`
   - To ensure compatibility with both `/chatbot/*` and `/api/chatbot/*` (given existing `/api/auth/*`), `src/app.ts` should mount the chatbot router at both prefixes (`app.use('/chatbot', chatbotRoutes); app.use('/api/chatbot', chatbotRoutes);`).

2. **Controller & Service Layering**:
   - `src/controllers/chatbotController.ts` should handle HTTP request validation, status codes, parameter parsing (text vs voice, intent enum validation, session ID format), and response formatting.
   - `src/services/chatbotService.ts` should implement the business logic pipeline:
     1. Text extraction (if voice, call `STTService`).
     2. Language detection and translation to English (call `LLMService.translateToEnglish`).
     3. Query embedding generation (call `EmbeddingsService.generateEmbedding`).
     4. Vector similarity search against active `Level1Question` documents (computing cosine similarity between query embedding and question embeddings).
     5. Top 3-5 candidates ranking with confidence scores.
     6. Confidence check against `MATCH_CONFIDENCE_THRESHOLD` (env configurable, default `0.75`).
     7. Threshold branching:
        - If score < threshold: log to `NeedsReviewQuery` (status: `'pending'`), create session in `ChatbotSession` (`matchConfident: false`), return fallback message.
        - If score >= threshold and intent === `'direct_answer'`: fetch matching `Answer` for `Level1Question`, generate personalized direct answer (via `LLMService`), log to `ChatbotSession` (`matchConfident: true`, `matchedLevel1QuestionId`, `finalAnswerId`), increment `QueryClickStats` (`clickCount: { $inc: 1 }`), return answer response.
        - If score >= threshold and intent === `'consultation'`: fetch `ConsultationQuery` for `Level1Question`, return `diagnosticQuestions`, log to `ChatbotSession` (`matchConfident: true`, `matchedLevel1QuestionId`).
     8. Consultation answer resolution (`resolveConsultationAnswer`):
        - Validate `sessionId` and submitted Yes/No answers.
        - Load session from `ChatbotSession`.
        - Retrieve `ConsultationQuery` for `session.matchedLevel1QuestionId`.
        - Find branch matching the user's answers in `answerBranches`.
        - Retrieve resolved `Answer`.
        - Generate final personalized answer reflecting branch template and user's original query.
        - Update `ChatbotSession` with `consultationAnswers` and `finalAnswerId`.
        - Increment `QueryClickStats`.
        - Return personalized answer.

3. **Vendor-Agnostic AI Adapter Design**:
   - Under `src/services/ai/`:
     - `types.ts`:
       - `ILLMService`: `translateToEnglish(text: string): Promise<{ translatedText: string, detectedLanguage: string }>`, `personalizeAnswer(params: { originalQuery: string, answerText: string, dosage?: string, homeRemedy?: string }): Promise<string>`
       - `IEmbeddingsService`: `generateEmbedding(text: string): Promise<number[]>` (produces 1536-dim or test vector)
       - `ISTTService`: `transcribeAudio(audioData: string | Buffer): Promise<{ text: string, detectedLanguage?: string }>`
       - `ITTSService`: `synthesizeSpeech(text: string, language?: string): Promise<{ audioContent: string, format: string }>`
     - `mock/`:
       - Deterministic mock implementations: `MockLLMService`, `MockEmbeddingsService`, `MockSTTService`, `MockTTSService`.
       - Allows running all tests in Jest without external network calls or paid API keys.
     - `index.ts`:
       - Service factory / registry: returns active instances (defaults to mock providers; extensible to OpenAI/Gemini providers).

4. **Vector Similarity Utility**:
   - `src/utils/vectorUtils.ts`:
     - Cosine similarity: `cosineSimilarity(vecA: number[], vecB: number[]): number` using dot product and Euclidean magnitudes.
     - Handles zero vectors or mismatched dimensions gracefully.
     - In-memory similarity ranking function: ranks `Level1Question` items against query vector, returns top N candidates with scores.

5. **Configuration**:
   - `src/config/chatbotConfig.ts`:
     - Reads `process.env.MATCH_CONFIDENCE_THRESHOLD`, default `0.75`.
     - Reads `process.env.AI_PROVIDER`, default `'mock'`.
     - Exposes fallback message: e.g. `"I'm sorry, I could not find a confident match for your health query. Our medical team has been notified to review your question."`.

6. **Authentication Integration**:
   - In `ChatbotSession` and `QueryClickStats`, `userId` and `userEmail` are optional.
   - An `optionalAuthenticateToken` middleware in `src/middlewares/authMiddleware.ts` (or `chatbotRoutes.ts`) should check if `Authorization: Bearer <token>` is provided. If valid, attach `req.user`; if missing or invalid, continue as unauthenticated/guest without throwing a 401 error.

---

## 3. Caveats

1. **No External AI SDKs Installed**: `package.json` currently has no real LLM or embedding provider libraries installed (e.g. `@google/genai`, `openai`). The prompt and specifications explicitly require vendor-agnostic adapter interfaces and mock/stub implementations for Milestone 2.
2. **MongoDB In-Memory vs Atlas Vector Search**: In `mongodb-memory-server` (used for unit/integration tests), native MongoDB Atlas `$vectorSearch` aggregation stage is not supported. Therefore, vector similarity ranking must be performed via in-memory cosine similarity over the retrieved candidates or embeddings. This is fully deterministic, highly performant for test suites, and works identically across test, dev, and production.
3. **Collection Naming**: Existing Mongoose models in `src/models/` (`Level1Question.ts`, `ConsultationQuery.ts`, `NeedsReviewQuery.ts`, `ChatbotSession.ts`, `QueryClickStats.ts`, `Answer.ts`) do not define explicit collection names in their `Schema` options, defaulting to Mongoose's pluralization (`level1questions`, `consultationqueries`, etc.). If a pre-existing MongoDB database has snake_case collection names (`level1_questions`, `consultation_queries`, etc.), the schemas can specify `{ collection: 'level1_questions' }` or pass the third parameter to `mongoose.model()`. In test environments with `mongodb-memory-server`, default collection names work out of the box.
4. **Voice Audio Format**: Voice input in REST APIs is typically sent as Base64-encoded audio strings in the request body (e.g. `{ inputMode: "voice", audio: "base64...", intent: "direct_answer" }`). The mock STT adapter should decode this or return deterministic test transcripts.

---

## 4. Conclusion & Proposed Architecture Blueprint

### Recommended Directory Layout for Chatbot Engine
```
backend/
├── src/
│   ├── config/
│   │   ├── db.ts                      # (existing) MongoDB connection
│   │   └── chatbotConfig.ts          # [NEW] MATCH_CONFIDENCE_THRESHOLD (0.75), fallbacks
│   ├── controllers/
│   │   ├── authController.ts          # (existing)
│   │   └── chatbotController.ts       # [NEW] query & consultation-answer handlers
│   ├── middlewares/
│   │   ├── authMiddleware.ts          # (existing + optionalAuth helper)
│   ├── models/                        # (existing models, already match requirements)
│   │   ├── Level1Question.ts
│   │   ├── ConsultationQuery.ts
│   │   ├── NeedsReviewQuery.ts
│   │   ├── ChatbotSession.ts
│   │   ├── QueryClickStats.ts
│   │   ├── Answer.ts
│   │   ├── User.ts
│   │   └── Otp.ts
│   ├── routes/
│   │   ├── authRoutes.ts              # (existing)
│   │   └── chatbotRoutes.ts           # [NEW] /query and /consultation-answer
│   ├── services/
│   │   ├── ai/                        # [NEW] Vendor-agnostic AI adapters
│   │   │   ├── types.ts               # ILLMService, IEmbeddingsService, ISTTService, ITTSService
│   │   │   ├── index.ts               # AI service factory / registry
│   │   │   └── mock/                  # Deterministic mock implementations
│   │   │       ├── MockLLMService.ts
│   │   │       ├── MockEmbeddingsService.ts
│   │   │       ├── MockSTTService.ts
│   │   │       └── MockTTSService.ts
│   │   ├── chatbotService.ts          # [NEW] resolveChatbotQuery pipeline
│   │   └── consultationService.ts     # [NEW] resolveConsultationAnswer logic
│   ├── utils/
│   │   ├── jwt.ts                     # (existing)
│   │   └── vectorUtils.ts             # [NEW] cosineSimilarity & ranking functions
│   ├── app.ts                         # (register chatbotRoutes at /chatbot & /api/chatbot)
│   └── index.ts                       # (existing entrypoint)
└── tests/
    ├── auth.test.ts                   # (existing)
    ├── auth.adversarial.test.ts       # (existing)
    └── chatbot.test.ts                # [NEW] Comprehensive R1-R4 test suite
```

### Proposed Endpoint Specifications
1. **`POST /chatbot/query` (also `/api/chatbot/query`)**:
   - **Headers**: Optional `Authorization: Bearer <token>`
   - **Request Body**:
     ```json
     {
       "queryText": "Mujhe bahut sar dard ho raha hai",
       "inputMode": "text",
       "intent": "direct_answer"
     }
     ```
     Or for voice:
     ```json
     {
       "audio": "UklGRiQAAABXQVZFZm10IBAAAAABAAEA...",
       "inputMode": "voice",
       "intent": "consultation"
     }
     ```
   - **Response (Direct Answer Path, Match >= 0.75)**:
     ```json
     {
       "success": true,
       "matched": true,
       "confidence": 0.89,
       "sessionId": "60d0fe4f5311236168a109ca",
       "intent": "direct_answer",
       "translatedQuery": "I have a severe headache",
       "matchedQuestion": "What is the best remedy for migraine headache?",
       "answer": {
         "answerText": "Belladonna 30C or Natrum Muriaticum are recommended for throbbing headache.",
         "dosageInstructions": "Take 4 pellets 3 times a day",
         "homeRemedyText": "Stay in a dark quiet room, drink warm water",
         "safetyDisclaimerText": "Consult a doctor if symptoms persist."
       },
       "candidates": [
         { "level1QuestionId": "...", "score": 0.89 }
       ]
     }
     ```
   - **Response (Consultation Path, Match >= 0.75)**:
     ```json
     {
       "success": true,
       "matched": true,
       "confidence": 0.85,
       "sessionId": "60d0fe4f5311236168a109ca",
       "intent": "consultation",
       "translatedQuery": "I have severe headaches every afternoon",
       "matchedQuestion": "What is the best remedy for migraine headache?",
       "diagnosticQuestions": [
         { "id": "q1", "questionText": "Does the headache worsen with direct sunlight exposure?" },
         { "id": "q2", "questionText": "Is there nausea or vomiting associated?" }
       ],
       "candidates": [
         { "level1QuestionId": "...", "score": 0.85 }
       ]
     }
     ```
   - **Response (Fallback Path, Match < 0.75)**:
     ```json
     {
       "success": true,
       "matched": false,
       "confidence": 0.52,
       "sessionId": "60d0fe4f5311236168a109cb",
       "intent": "direct_answer",
       "message": "I'm sorry, I could not find a confident match for your health query. Our medical team has been notified to review your question.",
       "candidates": [
         { "level1QuestionId": "...", "score": 0.52 }
       ]
     }
     ```

2. **`POST /chatbot/consultation-answer` (also `/api/chatbot/consultation-answer`)**:
   - **Headers**: Optional `Authorization: Bearer <token>`
   - **Request Body**:
     ```json
     {
       "sessionId": "60d0fe4f5311236168a109ca",
       "answers": {
         "q1": "yes",
         "q2": "no"
       }
     }
     ```
   - **Response**:
     ```json
     {
       "success": true,
       "sessionId": "60d0fe4f5311236168a109ca",
       "finalAnswer": {
         "answerText": "Based on worsening with sun exposure and absence of nausea, Glonoinum 30C is specifically indicated for your headache.",
         "dosageInstructions": "Take 3 pellets twice daily",
         "homeRemedyText": "Wear sunglasses and avoid midday heat",
         "safetyDisclaimerText": "Seek emergency care if neck stiffness occurs."
       }
     }
     ```

---

## 5. Verification Method

### 5.1 Independent Verification Commands
1. **Verify Backend Build**:
   ```bash
   cd /Users/aditya/workspace/hh4u/backend && npm run build
   ```
   *Expected result*: Exits with code 0; `dist/` directory generated with no TypeScript compilation errors.
2. **Verify Existing Tests**:
   ```bash
   cd /Users/aditya/workspace/hh4u/backend && npm test
   ```
   *Expected result*: 2 test suites pass (29/29 tests pass).
3. **Verify Models Exist**:
   ```bash
   ls -l /Users/aditya/workspace/hh4u/backend/src/models/
   ```
   *Expected result*: `Level1Question.ts`, `ConsultationQuery.ts`, `NeedsReviewQuery.ts`, `ChatbotSession.ts`, `QueryClickStats.ts`, `Answer.ts`, `User.ts`, `Otp.ts`, `Admin.ts`, `AppDatabaseVersion.ts`.

### 5.2 Invalidation Conditions
- If any existing model schema in `backend/src/models/` is altered in a backward-incompatible way.
- If `src/app.ts` does not export `app` without calling `app.listen()`.
- If `MATCH_CONFIDENCE_THRESHOLD` cannot be overridden via environment variables or test options.
