# Handoff Report: Backend AI Service Architecture & Gemini / Atlas Vector Integration

**Agent**: `explorer_survey_1`  
**Handoff Type**: Hard (Investigation complete)  
**Date**: 2026-09-20T17:29:30Z  
**Target Directory**: `/Users/aditya/workspace/hh4u`  

---

## 1. Observation

1. **Import-order race condition in `backend/src/app.ts`**:
   - `backend/src/app.ts:6`: `import chatbotRoutes from './routes/chatbotRoutes';`
   - `backend/src/app.ts:9`: `dotenv.config();`
   - Execution of command:
     `npx ts-node -e 'const { app } = require("./src/app"); const { getAIServices } = require("./src/services/ai/aiContainer"); console.log("Importing app:", getAIServices().llm.constructor.name);'`
     yields:
     ```
     Using Mock AI services (No GEMINI_API_KEY found)
     ◇ injected env (6) from .env
     Importing app: MockLLMService
     ```
   - `backend/src/services/ai/aiContainer.ts:38` sets `let activeServices: AIServices = createDefaultAIServices();` at import time when `process.env.GEMINI_API_KEY` is still undefined.

2. **Outdated build artifact in `backend/dist/`**:
   - `backend/dist/services/ai/aiContainer.js:11-18` unconditionally returns `MockLLMService`, `MockEmbeddingService`, `MockSTTService`, and `MockTTSService`, omitting the `if (apiKey)` logic present in `src/services/ai/aiContainer.ts`.

3. **Discontinued Gemini LLM Model in `backend/src/services/ai/gemini/geminiLLMService.ts`**:
   - `backend/src/services/ai/gemini/geminiLLMService.ts:6`: `private model = 'gemini-2.5-flash';`
   - Execution of test call via `@google/genai` using the `GEMINI_API_KEY` in `.env` resulted in verbatim error:
     ```
     LLM err: {"error":{"code":404,"message":"This model models/gemini-2.5-flash is no longer available to new users. Please update your code to use models/gemini-3.6-flash for the latest features and improvements. We recommend you to use the Interactions API.","status":"NOT_FOUND"}}
     ```
   - Execution with `gemini-3.6-flash` and `gemini-flash-latest` returned valid completions (e.g. `Hello! How can I help you today?`).

4. **Missing Gemini Embedding Model & Vector Dimension Discrepancy**:
   - `backend/src/services/ai/gemini/geminiEmbeddingService.ts:6`: `private model = 'text-embedding-004';`
   - `backend/src/services/ai/gemini/geminiEmbeddingService.ts:11`: `public readonly dimensions: number = 768;`
   - Execution of test call via `@google/genai` with `text-embedding-004` resulted in verbatim error:
     ```
     Embedding err: {"error":{"code":404,"message":"models/text-embedding-004 is not found for API version v1beta, or is not supported for embedContent. Call ModelService.ListModels to see the list of available models and their supported methods.","status":"NOT_FOUND"}}
     ```
   - Querying the live MongoDB Atlas cluster `hh4u` (`level1questions`) revealed:
     - 184 documents in `level1questions`, each having `embedding` with length 1536.
     - Active Atlas search index `vector_index` definition:
       `{ "type": "vector", "path": "embedding", "numDimensions": 1536, "similarity": "cosine" }`.
   - Executing a 768-dim query on the live Atlas index returned verbatim error:
     ```
     768 query error: PlanExecutor error during aggregation :: caused by :: vector field is indexed with 1536 dimensions but queried with 768
     ```
   - Testing `gemini-embedding-2` with `config: { outputDimensionality: 1536 }` returned an exact 1536-dimensional float vector, and executing a 1536-dim query against Atlas `$vectorSearch` returned 2 results immediately.

5. **Static Answer Pass-Through Bypassing Live LLM in `backend/src/services/chatbotService.ts`**:
   - `backend/src/services/chatbotService.ts:194-207`:
     ```typescript
     answer: answerDoc
       ? {
           id: answerDoc._id.toString(),
           answerText: answerDoc.answerText,
           dosageInstructions: answerDoc.dosageInstructions,
           homeRemedyText: answerDoc.homeRemedyText,
           safetyDisclaimerText: answerDoc.safetyDisclaimerText,
           videoUrl: answerDoc.videoUrl,
         }
       : {
           id: new mongoose.Types.ObjectId().toString(),
           answerText: await ai.llm.generateAnswer(translatedQueryText),
         }
     ```
   - When a match is found (confidence >= 0.75), `answerDoc` exists, so `ai.llm.generateAnswer` is never called.

6. **Hardcoded Stubs & Response Mismatch in Android Frontend**:
   - `app/src/main/java/com/healinghands4u/presentation/chatbot/answer/ChatbotAnswerScreen.kt:103`:
     `message = "Here is your personalized homeopathic healing regimen curated by Dr. Anjali Jariwala:",`
   - `app/src/main/java/com/healinghands4u/presentation/chatbot/answer/ChatbotAnswerScreen.kt:113-115`:
     `dosage = state.dosage ?: "4 pills, 2 times daily after meals"`, `safetyDisclaimer = "If disease does not cure within 2 days then consult doctor right now"`
   - `app/src/main/java/com/healinghands4u/data/remote/ChatbotApi.kt:14`:
     `val answer: String?` in `ChatbotQueryResponse` clashes with backend's object `{ id, answerText, dosageInstructions, ... }`, triggering Gson parse failure.

---

## 2. Logic Chain

1. **From Observation 1**: Because ES module import statements hoist and evaluate dependencies (`routes/chatbotRoutes` -> `controllers/chatbotController` -> `services/chatbotService` -> `services/ai/aiContainer`) prior to line 9 (`dotenv.config()`), `process.env.GEMINI_API_KEY` is undefined when `createDefaultAIServices()` executes. Therefore, `aiContainer` defaults to `MockLLMService` and `MockEmbeddingService` at runtime even though a valid `GEMINI_API_KEY` is present in `backend/.env`.
2. **From Observations 3 and 4**: Even if the environment loading order is fixed, switching to `GeminiLLMService` and `GeminiEmbeddingService` crashes with 404 ApiErrors because `gemini-2.5-flash` and `text-embedding-004` are invalid/deprecated on the current `@google/genai` API version.
3. **From Observation 4**: Because MongoDB Atlas's search index `vector_index` expects 1536 dimensions and all 184 database documents contain 1536-dimensional embeddings, using a 768-dimensional embedding causes Atlas `$vectorSearch` to fail at the database level and fallback to inaccurate in-memory cosine matching. Using `gemini-embedding-2` with `outputDimensionality: 1536` resolves this natively without modifying database indexes or documents.
4. **From Observation 5**: Even with working Gemini services and Atlas vector search, `chatbotService.processQuery` simply forwards the database string `answerDoc.answerText` rather than invoking Gemini LLM completions. To fulfill the prompt requirement for real LLM answers, `chatbotService` must pass `answerDoc` clinical context into `ai.llm.generateAnswer`.
5. **From Observation 6**: To eradicate stubs end-to-end, the Android `ChatbotApi.kt` schema must deserialize `answer` as an object, and `ChatbotAnswerScreen.kt` must render the live backend response rather than the hardcoded Dr. Anjali Jariwala string.

---

## 3. Caveats

- Voice transcription (STT) and speech synthesis (TTS) were not migrated to Gemini Live/Audio APIs because the prompt explicitly permitted ignoring or hiding STT/TTS features (`You may ignore or hide STT/TTS voice features`).
- Unit tests in `backend/tests/` rely on deterministic fixtures and in-memory databases (`MongoMemoryServer`). When running live Gemini integrations in test environments, network calls will hit Google APIs; tests that assert deterministic Hindi translations or offline execution may need mock adapters or test isolation flags (`USE_MOCK_AI=true`).

---

## 4. Conclusion

The system fails to use real Gemini services and Atlas Vector Search due to:
1. An import-time race condition leaving `activeServices` permanently mocked.
2. Deprecated model IDs (`gemini-2.5-flash` and `text-embedding-004`).
3. A vector dimension mismatch (768 vs 1536) on Atlas Vector Search.
4. Static database pass-through bypassing `ai.llm.generateAnswer` in the direct answer route.
5. Incompatible Android Retrofit DTOs and hardcoded UI chat bubbles.

Resolving these requires updating `aiContainer.ts` and `app.ts` initialization, migrating model strings to `gemini-3.6-flash` and `gemini-embedding-2` (with `outputDimensionality: 1536`), wiring `chatbotService.ts` to generate LLM completions with clinical context, and aligning Android DTOs. Detailed implementation specifications are cataloged in `analysis.md`.

---

## 5. Verification Method

To independently verify these findings:

1. **Verify Environment Loading Race**:
   ```bash
   cd /Users/aditya/workspace/hh4u/backend
   npx ts-node -e 'const { app } = require("./src/app"); const { getAIServices } = require("./src/services/ai/aiContainer"); console.log("Current service:", getAIServices().llm.constructor.name);'
   ```
   *Expected output*: Logs `Using Mock AI services (No GEMINI_API_KEY found)` and outputs `Current service: MockLLMService`.

2. **Verify Model 404 Errors**:
   ```bash
   cd /Users/aditya/workspace/hh4u/backend
   npx ts-node --transpile-only -e 'require("dotenv").config({ path: "./.env" }); const { GoogleGenAI } = require("@google/genai"); const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }); ai.models.generateContent({ model: "gemini-2.5-flash", contents: "hi" }).catch(e => console.log("LLM Error:", e.message)); ai.models.embedContent({ model: "text-embedding-004", contents: "hi" }).catch(e => console.log("Embedding Error:", e.message));'
   ```
   *Expected output*: Prints 404 ApiErrors for both models.

3. **Verify Working Gemini Models & 1536 Dimensions**:
   ```bash
   cd /Users/aditya/workspace/hh4u/backend
   npx ts-node --transpile-only -e 'require("dotenv").config({ path: "./.env" }); const { GoogleGenAI } = require("@google/genai"); const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }); (async () => { const l = await ai.models.generateContent({ model: "gemini-3.6-flash", contents: "Say hello" }); console.log("LLM:", l.text); const e = await ai.models.embedContent({ model: "gemini-embedding-2", contents: "headache", config: { outputDimensionality: 1536 } }); console.log("Embed dims:", e.embeddings[0].values.length); })();'
   ```
   *Expected output*: Prints `LLM: Hello...` and `Embed dims: 1536`.

4. **Verify Atlas Vector Search Dimension Constraint**:
   ```bash
   cd /Users/aditya/workspace/hh4u/backend
   npx ts-node --transpile-only -e 'require("dotenv").config({ path: "./.env" }); const mongoose = require("mongoose"); (async () => { await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DB_NAME || "hh4u" }); const c = mongoose.connection.db.collection("level1questions"); try { await c.aggregate([{ $vectorSearch: { index: "vector_index", path: "embedding", queryVector: new Array(768).fill(0.01), numCandidates: 5, limit: 1 } }]).toArray(); } catch (e) { console.log("768 Error:", e.message); } await mongoose.disconnect(); })();'
   ```
   *Expected output*: Prints `768 Error: PlanExecutor error during aggregation :: caused by :: vector field is indexed with 1536 dimensions but queried with 768`.
