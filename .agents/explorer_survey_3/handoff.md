# Test Harness & Database Investigation Report

## Executive Summary
This report provides an in-depth investigation of the testing framework, test runner execution, database isolation, mock AI provider pluggability, and test suite requirements for R1–R4 of the Chatbot Engine backend in `/Users/aditya/workspace/hh4u`. 

A critical finding of this investigation is that **`mongodb-memory-server` (local standalone binary) does NOT support the MongoDB Atlas `$vectorSearch` aggregation stage**. As a result, the chatbot vector matching service must incorporate an in-memory cosine similarity computation strategy (or fallback) so that the automated test suite and local test environments can run 100% offline, deterministically, and without external Atlas dependencies.

---

## 1. Observation

### 1.1 Configured Test Framework & Dependencies
Inspected `backend/package.json` (lines 6–11, 16–38):
- **Test Runner**: Jest `v30.5.1` (`"jest": "^30.5.1"`)
- **TypeScript Transformer**: `ts-jest` `v29.4.12` (`"ts-jest": "^29.4.12"`) with `"typescript": "^5.9.3"`
- **HTTP Assertions**: `supertest` `v7.2.2` (`"supertest": "^7.2.2"`) and `@types/supertest` `v7.2.1`
- **Database Engine**: `mongodb-memory-server` `v11.2.0` (`"mongodb-memory-server": "^11.2.0"`) with `mongoose` `v9.10.1`
- **Runtime**: Node.js with CommonJS modules (`"type": "commonjs"`)
- **Test Script** (`package.json:7`):
  ```json
  "scripts": {
    "test": "NODE_OPTIONS=--experimental-vm-modules jest --runInBand --detectOpenHandles"
  }
  ```

### 1.2 Jest Configuration
Inspected `backend/jest.config.js` (lines 1–17):
```js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts', '**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { rootDir: '.' } }],
  },
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  detectOpenHandles: true,
  testTimeout: 30000,
};
```
Key observations:
- Tests match any `.test.ts` file located in `backend/tests/` or `backend/**/__tests__/`.
- Default timeout is 30,000 ms (sufficient for in-memory MongoDB startup).
- Clean mock behavior is enforced (`clearMocks: true`, `resetMocks: true`, `restoreMocks: true`).
- `forceExit` and `detectOpenHandles` are enabled to prevent hanging handles.

### 1.3 Execution of Existing Tests
Executed command `npm test` in `/Users/aditya/workspace/hh4u/backend`:
- Output:
  ```
  PASS tests/auth.test.ts
  PASS tests/auth.adversarial.test.ts
  Test Suites: 2 passed, 2 total
  Tests:       29 passed, 29 total
  Snapshots:   0 total
  Time:        2.643 s, estimated 3 s
  ```
- All 29 existing authentication and adversarial test cases passed in under 3 seconds.
- `--runInBand` ensures tests execute serially within a single worker process, preventing port conflicts, CPU throttling, or concurrent database interference.

### 1.4 Database Isolation Mechanism in Existing Tests
Inspected `backend/tests/auth.test.ts` (lines 9–25) and `backend/tests/auth.adversarial.test.ts` (lines 10–26):
- **Setup** (`beforeAll`):
  ```ts
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  ```
  Configured with a 60,000 ms timeout to ensure the binary is ready.
- **Teardown** (`afterAll`):
  ```ts
  await mongoose.disconnect();
  await mongoServer.stop();
  ```
- **Per-test Isolation** (`afterEach`):
  Currently cleans specific collections:
  ```ts
  await User.deleteMany({});
  await Otp.deleteMany({});
  ```
- **Existing Collections & Models**:
  Inspected existing Mongoose models in `backend/src/models/`:
  - `Level1Question.ts`: `canonicalQuestionText` (string), `embedding` (number[]), `tags` (string[]), `isActive` (boolean), `version` (number).
  - `ConsultationQuery.ts`: `level1QuestionId` (ObjectId ref Level1Question), `diagnosticQuestions` (`[{ id, questionText }]`), `answerBranches` (`[{ conditions: Map<string, 'yes'|'no'>, resolvedAnswerId: ObjectId ref Answer }]`).
  - `ChatbotSession.ts`: `userId` (ObjectId ref User), `originalQueryText`, `originalLanguage`, `translatedQueryText`, `inputMode` ('text' | 'voice'), `intent` ('direct_answer' | 'consultation'), `matchCandidates` (`[{ level1QuestionId, score }]`), `matchedLevel1QuestionId`, `matchConfident` (boolean), `consultationAnswers` (Map), `finalAnswerId` (ObjectId ref Answer), `createdAt`.
  - `NeedsReviewQuery.ts`: `originalQueryText`, `originalLanguage`, `translatedQueryText`, `userId`, `sessionId`, `status` ('pending' | 'resolved' | 'ignored'), `resolvedLevel1QuestionId`, `createdAt`.
  - `QueryClickStats.ts`: `userEmail`, `userId`, `level1QuestionId`, `firstAskedAt`, `clickCount` (number).
  - `Answer.ts`: `level1QuestionId`, `answerText`, `dosageInstructions`, `homeRemedyText`, `safetyDisclaimerText`, `videoUrl`.
  - `User.ts`, `Otp.ts`, `Admin.ts`, `AppDatabaseVersion.ts`.

### 1.5 Reproduction & Verification of Vector Search in MongoMemoryServer
Executed a test aggregation stage against `mongodb-memory-server` v11.2.0:
```ts
Model.aggregate([
  {
    $vectorSearch: {
      index: "vector_index",
      path: "embedding",
      queryVector: [0.1, 0.2],
      numCandidates: 10,
      limit: 1
    }
  }
])
```
Result:
```
MongoServerError: Using $search and $vectorSearch aggregation stages requires additional configuration. 
Please connect to Atlas or an AtlasCLI local deployment to enable.
```
This directly proves that any vector matching code relying strictly on MongoDB Atlas `$vectorSearch` aggregation syntax will fail in automated unit/integration tests running under `mongodb-memory-server`.

### 1.6 Existing Test Fixtures and Application Structure
- `backend/src/app.ts` exports `app` instance without calling `app.listen()`.
- Supertest binds directly to `app`: `request(app).post('/...').send(...)`.
- There are currently NO fixtures directories or seed files in `backend/tests`. Existing tests generate documents inline via `Model.create(...)`.
- `backend/src/services` is currently empty.

---

## 2. Logic Chain

### 2.1 Test Framework Evaluation
1. Jest 30 + `ts-jest` + Supertest 7 is already established, configured, and operating smoothly in `backend/`.
2. Existing tests execute in ~2.6 seconds with zero failures.
3. Therefore, Jest + Supertest should remain the standard testing stack for the Chatbot Engine backend. No additional test runner (such as Mocha or Vitest) should be introduced.

### 2.2 Database Isolation Strategy for Chatbot Tests
1. Multiple chatbot collections interact during each query: `Level1Question`, `ConsultationQuery`, `Answer`, `ChatbotSession`, `NeedsReviewQuery`, `QueryClickStats`, and `User`.
2. Hardcoding individual model `deleteMany` calls in `afterEach` across every test file is error-prone when new collections are introduced.
3. Therefore, chatbot test suites should employ a dynamic collection cleanup in `afterEach`:
   ```ts
   afterEach(async () => {
     const collections = mongoose.connection.collections;
     for (const key in collections) {
       await collections[key].deleteMany({});
     }
   });
   ```
   Or explicitly invoke `Promise.all` across all registered chatbot models.

### 2.3 Resolving the Vector Search In-Memory Incompatibility
1. Observation 1.5 confirmed that `mongodb-memory-server` cannot execute `$vectorSearch`.
2. In production with MongoDB Atlas, `$vectorSearch` can run if an Atlas search index exists, but in tests and offline development, tests will immediately fail if the code depends on `$vectorSearch`.
3. The canonical dataset of `level1_questions` in this domain is curated (tens to low thousands of entries). Computing cosine similarity in Node.js takes less than 1–2 milliseconds for this scale.
4. Cosine similarity formula:
   $$\text{similarity}(\vec{A}, \vec{B}) = \frac{\vec{A} \cdot \vec{B}}{\|\vec{A}\|_2 \|\vec{B}\|_2}$$
   When vectors are unit-normalized ($L_2 = 1.0$), similarity simplifies to dot product: $\sum_{i=1}^n A_i B_i$.
5. Therefore, the vector matching service (`vectorSearchService.ts` / `similarityMatcher.ts`) should implement:
   - Primary or fallback matching via in-memory cosine similarity calculation across active `Level1Question` embeddings.
   - If an Atlas Search environment is detected and configured, it can optionally delegate to `$vectorSearch`; otherwise, it executes in-memory cosine matching.
   - This design allows tests using `mongodb-memory-server` to run 100% deterministically and offline without Atlas CLI.

### 2.4 Mock AI Providers Architecture & Clean Test Pluggability
1. Requirement R1 demands vendor-agnostic adapter interfaces for LLM, Embeddings, STT, and TTS, with mock implementations returning deterministic test data.
2. If controllers import vendor SDKs (e.g. OpenAI) directly, unit tests would require monkey-patching or complex module mocks (`jest.mock(...)`), which are brittle across TypeScript/ESM VM modules.
3. Clean architectural pattern:
   - Interfaces in `backend/src/services/ai/interfaces.ts`:
     - `ILLMService`: `translateToEnglish(text: string): Promise<{ translatedText: string, sourceLanguage: string }>`, `generatePersonalizedAnswer(params): Promise<string>`
     - `IEmbeddingService`: `generateEmbedding(text: string): Promise<number[]>`
     - `ISTTService`: `transcribe(audioData: Buffer | string, mimeType?: string): Promise<{ text: string, detectedLanguage?: string }>`
     - `ITTSService`: `synthesize(text: string, language?: string): Promise<{ audioContent: string, mimeType: string }>`
   - Concrete mocks in `backend/src/services/ai/mocks/`:
     - `MockLLMService`: Returns identity for English, translated English for non-English (e.g. Hindi "सिरदर्द" -> "headache"), and template-personalized answers.
     - `MockEmbeddingService`: Generates deterministic normalized vectors (e.g., matching keyword vectors with pre-calculated cosine similarities).
     - `MockSTTService`: Transcribes base64/audio payloads into deterministic text.
     - `MockTTSService`: Returns mock base64 audio and MIME type.
   - Centralized Service Container in `backend/src/services/ai/aiContainer.ts`:
     ```ts
     let currentServices: AIServices = createDefaultAIServices(); // Mocks by default or env-driven
     export const getAIServices = (): AIServices => currentServices;
     export const setAIServices = (custom: Partial<AIServices>): void => {
       currentServices = { ...currentServices, ...custom };
     };
     export const resetAIServices = (): void => {
       currentServices = createDefaultAIServices();
     };
     ```
4. Benefits for tests:
   - Any test suite can call `setAIServices({ embeddings: customMock })` to test low-confidence thresholds, API timeouts, or unparseable inputs.
   - `afterEach(() => resetAIServices())` ensures test isolation with zero residual state.

---

## 3. Detailed Testing Requirements for R1–R4

### 3.1 R1: Vendor-Agnostic AI Service Interfaces & Mocks
| Target Component | Test Case | Purpose & Assertion |
|---|---|---|
| `MockLLMService` | Translation Identity | Passing English string returns same string, `sourceLanguage: 'en'`. |
| `MockLLMService` | Translation Multilingual | Passing Hindi/other string returns mapped English, `sourceLanguage: 'hi'`. |
| `MockLLMService` | Answer Personalization | Merges template answer, user query, and diagnostic responses deterministically. |
| `MockEmbeddingService` | Deterministic Vectors | Same input string returns identical floating-point array of fixed dimension (e.g. 1536). |
| `MockEmbeddingService` | Configurable Sim Score | Ability to generate embeddings that yield exact (>0.90), borderline (0.75), and low (<0.50) cosine similarity. |
| `MockSTTService` | Audio Transcription | Transcribes mock audio payload to expected text string and detected language. |
| `MockTTSService` | Audio Synthesis | Synthesizes text to base64 audio string with `audio/mp3` MIME type. |
| Swappability | Interface Contract | Swapping mock service instance via `setAIServices` executes custom logic without code changes in controllers. |

### 3.2 R2: Chatbot Query Pipeline (`POST /chatbot/query`)
| Test Case | Scenario | Input Payload | Expected Output & Side Effects |
|---|---|---|---|
| **R2.1: Direct Answer Path** | Query matches Level 1 question with confidence >= threshold (default 0.75) | `{ queryText: "headache relief", intent: "direct_answer", inputMode: "text" }` | HTTP 200: `matchConfident: true`, `answer: { answerText, dosageInstructions, homeRemedyText }`, `sessionId` returned, `matchedLevel1QuestionId` matches seeded ID. |
| **R2.2: Consultation Path** | Query matches Level 1 question with confidence >= threshold | `{ queryText: "migraine consultation", intent: "consultation", inputMode: "text" }` | HTTP 200: `matchConfident: true`, `diagnosticQuestions: [{ id, questionText }]`, `sessionId` returned. No final answer returned yet. |
| **R2.3: Fallback / Below Threshold** | Similarity < 0.75 (unmatched query) | `{ queryText: "unrelated financial advice", intent: "direct_answer", inputMode: "text" }` | HTTP 200: `matchConfident: false`, `fallbackMessage` returned, `sessionId` returned. Verifies entry created in `needs_review_queries` with `status: 'pending'` and linked `sessionId`. |
| **R2.4: Voice Input Handling** | User sends audio payload | `{ audioData: "base64...", intent: "direct_answer", inputMode: "voice" }` | HTTP 200: Invokes `STTService.transcribe`, populates `originalQueryText` with transcription, resolves pipeline identically. |
| **R2.5: Non-English Query** | User sends Hindi query | `{ queryText: "मुझे सिरदर्द की दवा चाहिए", intent: "direct_answer", inputMode: "text" }` | HTTP 200: Invokes `LLMService.translateToEnglish`, stores `originalLanguage: 'hi'`, `originalQueryText`, `translatedQueryText`, matches against English canonical questions. |
| **R2.6: Configurable Threshold** | `MATCH_CONFIDENCE_THRESHOLD` set to 0.90 | Query with 0.82 match score | Returns fallback message and logs to `needs_review_queries` (whereas at 0.75 it would have matched). |
| **R2.7: Payload Validation** | Missing `intent` or invalid intent | `{ queryText: "hello", intent: "invalid" }` | HTTP 400: `success: false`, validation error message. |
| **R2.8: Empty Query Validation** | Empty text when `inputMode: 'text'` | `{ queryText: "   ", intent: "direct_answer", inputMode: "text" }` | HTTP 400: `success: false`, error message. |

### 3.3 R3: Consultation Answer Resolution (`POST /chatbot/consultation-answer`)
| Test Case | Scenario | Input Payload | Expected Output & Side Effects |
|---|---|---|---|
| **R3.1: Successful Branch Resolution** | Valid session, answers match branch condition | `{ sessionId: "<VALID_ID>", consultationAnswers: { q1: "yes", q2: "no" } }` | HTTP 200: `success: true`, `personalizedAnswer` returned, `finalAnswer` populated. `ChatbotSession` in DB updated with `consultationAnswers` and `finalAnswerId`. |
| **R3.2: Alternative Branch Resolution** | Answers match secondary branch condition | `{ sessionId: "<VALID_ID>", consultationAnswers: { q1: "yes", q2: "yes" } }` | HTTP 200: Resolves distinct `resolvedAnswerId` matching branch 2. |
| **R3.3: Invalid / Expired Session** | Non-existent or invalid session ID | `{ sessionId: "<NON_EXISTENT_ID>", consultationAnswers: { q1: "yes" } }` | HTTP 404: `success: false`, `message: 'Session not found'`. |
| **R3.4: Missing Session ID** | Request body missing sessionId | `{ consultationAnswers: { q1: "yes" } }` | HTTP 400: `success: false`, validation error. |
| **R3.5: Invalid Answer Values** | Answers not 'yes' or 'no' (e.g. 'maybe') | `{ sessionId: "<VALID_ID>", consultationAnswers: { q1: "maybe" } }` | HTTP 400: `success: false`, validation error. |
| **R3.6: Fallback Default Branch** | Answers do not match any exact branch condition | `{ sessionId: "<VALID_ID>", consultationAnswers: { q1: "no", q2: "no" } }` | HTTP 200: Resolves fallback/default consultation answer branch. |

### 3.4 R4: Session Logging and Analytics
| Test Case | Target Metric / Entity | Assertion |
|---|---|---|
| **R4.1: Match Candidates Logging** | `ChatbotSession.matchCandidates` | Top 3–5 candidates logged with `{ level1QuestionId, score }`, sorted descending by similarity score. |
| **R4.2: Low Confidence Session Logging** | `ChatbotSession` on fallback | Session record created even when confidence is below threshold (`matchConfident: false`), preserving candidates. |
| **R4.3: User ID Association** | Authenticated session | If JWT provided (`Bearer <token>`), `ChatbotSession.userId` and `QueryClickStats.userId` correctly populated; works gracefully for guest users. |
| **R4.4: Click Stats Initialization** | `QueryClickStats` first query | First time question X is matched, `QueryClickStats` record created with `clickCount: 1`, `firstAskedAt` timestamp recorded. |
| **R4.5: Click Stats Increment** | `QueryClickStats` repeated queries | Subsequent queries matching question X increment `clickCount` to 2, 3, etc. |

---

## 4. Test Fixtures & Helpers Recommendation

To make chatbot test suites maintainable and expressive, create:
`backend/tests/helpers/chatbotFixtures.ts`:

```ts
import Level1Question from '../../src/models/Level1Question';
import ConsultationQuery from '../../src/models/ConsultationQuery';
import Answer from '../../src/models/Answer';
import mongoose from 'mongoose';

// Unit vectors for predictable cosine similarity testing:
// dot(HIGH_MATCH_VEC, QUERY_VEC) = 1.0 (Exact)
// dot(NEAR_MATCH_VEC, QUERY_VEC) = 0.85 (Confident Match)
// dot(LOW_MATCH_VEC, QUERY_VEC)  = 0.40 (Fallback < 0.75)

export async function seedChatbotTestFixtures() {
  // 1. Seed Level 1 Question
  const l1Question = await Level1Question.create({
    canonicalQuestionText: 'What is the recommended homeopathic treatment for tension headaches?',
    embedding: [1, 0, 0, 0], // simplified mock unit vector
    tags: ['headache', 'tension'],
    isActive: true,
    version: 1,
  });

  // 2. Seed Direct Answer
  const directAnswer = await Answer.create({
    level1QuestionId: l1Question._id,
    answerText: 'Belladonna 30C or Spigelia can assist with acute tension headaches.',
    dosageInstructions: 'Take 4 pellets under the tongue every 4 hours.',
    homeRemedyText: 'Rest in a quiet, dark room and stay hydrated.',
    safetyDisclaimerText: 'Consult a physician if accompanied by sudden neck stiffness.',
  });

  // 3. Seed Consultation Query & Branches
  const severeAnswer = await Answer.create({
    level1QuestionId: l1Question._id,
    answerText: 'Severe throbbing headache with nausea requires urgent assessment; Belladonna 200C may be indicated.',
    dosageInstructions: 'Take 4 pellets once, seek medical attention if symptoms persist.',
  });

  const mildAnswer = await Answer.create({
    level1QuestionId: l1Question._id,
    answerText: 'Mild tension headache responds well to Gelsemium and relaxation.',
    dosageInstructions: 'Take 4 pellets twice daily.',
  });

  const consultQuery = await ConsultationQuery.create({
    level1QuestionId: l1Question._id,
    diagnosticQuestions: [
      { id: 'q1', questionText: 'Is the headache throbbing or pulsing?' },
      { id: 'q2', questionText: 'Is there sensitivity to light or nausea?' }
    ],
    answerBranches: [
      {
        conditions: { q1: 'yes', q2: 'yes' },
        resolvedAnswerId: severeAnswer._id,
      },
      {
        conditions: { q1: 'no', q2: 'no' },
        resolvedAnswerId: mildAnswer._id,
      }
    ]
  });

  return { l1Question, directAnswer, severeAnswer, mildAnswer, consultQuery };
}
```

---

## 5. Route Mounting Recommendation

In `backend/src/app.ts`:
Mount the chatbot routes to support both `/chatbot` (as specified in ORIGINAL_REQUEST §R2 & §R3: `POST /chatbot/query`, `POST /chatbot/consultation-answer`) and `/api/chatbot` (consistent with `/api/auth` standard):
```ts
app.use('/chatbot', chatbotRoutes);
app.use('/api/chatbot', chatbotRoutes);
```
This guarantees that clients or test suites hitting either prefix will resolve without routing friction.

---

## 6. Caveats
1. **Network Sandbox**: In this test environment, network access to live cloud AI providers (OpenAI, Google Cloud, AWS) is unavailable. All pipeline testing must rely strictly on mock adapters.
2. **MongoDB Atlas Search Dependency**: The production backend may eventually target MongoDB Atlas `$vectorSearch`. If that occurs, the pipeline code must detect environment/capabilities or employ a graceful fallback to in-memory cosine matching when running under `mongodb-memory-server` in CI.
3. **Audio File Binary Formats**: For voice input (`inputMode: 'voice'`), test payloads should use base64-encoded strings or simple test buffers rather than large raw multi-megabyte audio files to keep test suite execution fast (< 3 seconds).

---

## 7. Conclusion
- **Test Framework**: Jest 30 + `ts-jest` + Supertest 7 is fully operational, well-tuned, and passing all existing suites in 2.6s.
- **Database Testing**: `mongodb-memory-server` is in place. Crucially, in-memory cosine similarity matching must be used in `vectorSearchService` to bypass the Atlas-only `$vectorSearch` limitation in local memory servers.
- **Mock AI Providers**: Defined interfaces with a service container (`aiContainer.ts`) provide an elegant, dependency-injected mechanism allowing tests to swap, spy, or configure mock behaviors with zero monkey-patching.
- **Test Specifications**: All testing requirements for R1 through R4 have been fully mapped out with positive paths, negative paths, threshold boundary checks, branch evaluations, and database side-effect verifications.

---

## 8. Verification Method

To independently verify these findings:

1. **Verify Existing Test Execution**:
   ```bash
   cd /Users/aditya/workspace/hh4u/backend
   npm test
   ```
   *Expected result*: Both test suites pass, 29 tests passing, exit code 0.

2. **Verify MongoMemoryServer Vector Search Incompatibility**:
   ```bash
   cd /Users/aditya/workspace/hh4u/backend
   node -e '
   const { MongoMemoryServer } = require("mongodb-memory-server");
   const mongoose = require("mongoose");
   async function run() {
     const server = await MongoMemoryServer.create();
     await mongoose.connect(server.getUri());
     const Model = mongoose.model("TestVec", new mongoose.Schema({ v: [Number] }));
     try {
       await Model.aggregate([{ $vectorSearch: { index: "idx", path: "v", queryVector: [1, 2], numCandidates: 10, limit: 1 } }]);
     } catch (err) {
       console.log("Verified $vectorSearch failure:", err.message);
     }
     await mongoose.disconnect();
     await server.stop();
   }
   run();
   '
   ```
   *Expected result*: Throws error indicating `$vectorSearch` requires Atlas or AtlasCLI.

3. **Verify Models and Schemas**:
   Inspect the existing models at `/Users/aditya/workspace/hh4u/backend/src/models/`:
   - `Level1Question.ts`
   - `ConsultationQuery.ts`
   - `ChatbotSession.ts`
   - `NeedsReviewQuery.ts`
   - `QueryClickStats.ts`
   - `Answer.ts`
