# Comprehensive Survey & Analysis: Chatbot Routes, Query Pipeline, AI Services & Jest Tests

**Date:** 2026-09-20  
**Author:** explorer_survey_2 (Teamwork Explorer)  
**Target:** Backend Chatbot Query Pipeline, AI Integrations, and Jest Test Suites

---

## 1. Executive Summary

An exhaustive investigation of the Healing Hands4U codebase was conducted to evaluate the chatbot query pipeline, identify hardcoded stub strings, analyze how Jest tests interact with AI services, and determine the exact path forward for migrating from mock implementations to Google Gemini and Atlas Vector Search.

### Key Discoveries:
1. **Chatbot Route Architecture:** Endpoints are dual-mounted under `/chatbot` and `/api/chatbot` in Express (`app.ts:37-38`). The primary endpoints are `POST /api/chatbot/query` and `POST /api/chatbot/consultation-answer`.
2. **Hardcoded Stub String Locations:**
   - **`backend/src/services/ai/mock/mockLLMService.ts:88`:** Returns `Personalized Homeopathic Plan for "${originalQuery}"${symptomsSummary}: ${templateText}${languageNote}`.
   - **`backend/src/services/ai/mock/mockLLMService.ts:67`:** Returns `Guidance for query: "${prompt}". Please consult Dr. Anjali Jariwala for detailed homeopathic follow-up.`.
   - **`backend/src/services/consultationService.ts:172`:** Fallback template is `'Personalized homeopathic remedy guidance based on diagnostic evaluation.'`.
   - **`backend/src/services/chatbotService.ts:233-236`:** Fallback diagnostic questions array `[{ id: 'q1', questionText: 'Is the symptom acute and throbbing?' }, ...]`.
   - **`app/src/main/java/com/healinghands4u/presentation/chatbot/answer/ChatbotAnswerScreen.kt:103`:** The Android UI hardcodes `message = "Here is your personalized homeopathic healing regimen curated by Dr. Anjali Jariwala:"` inside the `ChatBubble` rather than dynamically displaying the LLM answer.
3. **Critical Gemini SDK / Model Version Mismatch:**
   - `geminiLLMService.ts:6` targets `model = 'gemini-2.5-flash'`.
   - `geminiEmbeddingService.ts:6` targets `model = 'text-embedding-004'`.
   - In the installed Google GenAI SDK (`@google/genai@2.23.0`), both models return **404 NOT_FOUND** (`"models/text-embedding-004 is not found for API version v1beta"`, `"models/gemini-2.5-flash is no longer available to new users"`).
   - Live testing against Google's API confirmed that **`gemini-flash-latest`** works reliably for LLM generation/translation, and **`gemini-embedding-001`** (with `config: { outputDimensionality: 768 }`) works for vector embeddings.
4. **Current Test Suite Behavior:**
   - All **508 existing backend tests pass (26 test suites)** when `GEMINI_API_KEY=""`.
   - When `GEMINI_API_KEY` is present in `backend/.env`, tests crash because `aiContainer.ts` creates the Gemini services, which immediately fail with 404 on the deprecated model names.
   - Furthermore, `tests/chatbot.test.ts` asserts `dimensions === 1536` and string inclusion of `'Personalized Homeopathic Plan'`, which are tightly coupled to `MockEmbeddingService` and `MockLLMService`.
5. **Direct Answer Pipeline Gap:**
   - In `chatbotService.ts:194-206`, when a query matches an `Answer` document in MongoDB, the service returns the static `answerDoc.answerText` from the database directly; it only invokes `ai.llm.generateAnswer` if no document is found. To fulfill the prompt's requirement of returning dynamically generated LLM completions from `/api/chatbot/query`, the pipeline must synthesize or augment the remedy using Gemini.

---

## 2. Architecture & Pipeline Breakdown

### 2.1 Route Registration & Dual Mounting
- **File:** `backend/src/app.ts` (Lines 37-38)
  ```typescript
  app.use('/chatbot', chatbotRoutes);
  app.use('/api/chatbot', chatbotRoutes);
  ```
  Both paths route to `backend/src/routes/chatbotRoutes.ts`, ensuring compatibility with legacy clients and the Android Retrofit client (`@POST("api/chatbot/query")`).

- **File:** `backend/src/routes/chatbotRoutes.ts`
  - `POST /query` -> `chatbotController.handleQuery(req, res)`
  - `POST /consultation-answer` -> `chatbotController.handleConsultationAnswer(req, res)`
  - Middleware: `optionalAuthenticateToken` extracts optional JWT Bearer token and sets `req.user`.

### 2.2 Controller Execution Flow
- **File:** `backend/src/controllers/chatbotController.ts`
  - `handleQuery`:
    1. Extracts `text, query, queryText, audio, voiceData, mimeType, language, inputMode, intent`.
    2. Validates `intent` (`direct_answer` or `consultation`).
    3. Validates presence of text or audio data.
    4. Calls `chatbotService.processQuery(...)`.
    5. Returns HTTP 200 with result, or HTTP 400/500 on validation/pipeline errors.
  - `handleConsultationAnswer`:
    1. Validates `sessionId` (valid MongoDB ObjectId).
    2. Validates `answers` map / object.
    3. Calls `consultationService.resolveConsultationAnswer(...)`.

### 2.3 Query Resolution Pipeline
- **File:** `backend/src/services/chatbotService.ts` (`processQuery`)
  1. `const ai = getAIServices();`
  2. If `inputMode === 'voice'`, transcribes audio via `ai.stt.transcribeAudio(...)`.
  3. Translates query to canonical English: `ai.llm.translateToEnglish(originalQueryText, detectedLang)`.
  4. Generates dense vector embedding: `ai.embedding.generateEmbedding(translatedQueryText)`.
  5. Performs vector similarity search: `searchLevel1Questions(queryEmbedding, config.topCandidatesCount)`.
  6. Compares top candidate score with threshold (`DEFAULT_MATCH_CONFIDENCE_THRESHOLD = 0.75`).
  7. **If Confident Match (`score >= 0.75`):**
     - Atomically increments `QueryClickStats`.
     - **Direct Answer Branch (`intent === 'direct_answer'`):**
       - Queries `Answer.findOne({ level1QuestionId: topCandidate.level1QuestionId })`.
       - Logs session to `ChatbotSession`.
       - Returns `answer` object. Note: If `answerDoc` is found, static text is used:
         ```typescript
         answer: answerDoc ? {
           id: answerDoc._id.toString(),
           answerText: answerDoc.answerText,
           dosageInstructions: answerDoc.dosageInstructions,
           homeRemedyText: answerDoc.homeRemedyText,
           safetyDisclaimerText: answerDoc.safetyDisclaimerText,
           videoUrl: answerDoc.videoUrl,
         } : {
           id: new mongoose.Types.ObjectId().toString(),
           answerText: await ai.llm.generateAnswer(translatedQueryText),
         }
         ```
     - **Consultation Branch (`intent === 'consultation'`):**
       - Queries `ConsultationQuery.findOne({ level1QuestionId: topCandidate.level1QuestionId })`.
       - Logs session to `ChatbotSession`.
       - Returns diagnostic questions array.
  8. **If Low Confidence (`score < 0.75`):**
     - Logs session with `matchConfident: false`.
     - Creates `NeedsReviewQuery` record with status `pending`.
     - Returns `fallback: true` with `config.fallbackMessage`.

### 2.4 Consultation Resolution Pipeline
- **File:** `backend/src/services/consultationService.ts` (`resolveConsultationAnswer`)
  1. Loads `ChatbotSession` by `sessionId`.
  2. Evaluates diagnostic answers (`yes`/`no`) against `answerBranches` in `ConsultationQuery`.
  3. Identifies winning branch and resolved `Answer` document.
  4. Calls `ai.llm.generatePersonalizedAnswer(...)`:
     ```typescript
     const personalizedAnswer = await ai.llm.generatePersonalizedAnswer({
       originalQuery: session.originalQueryText,
       templateText,
       userLanguage: session.originalLanguage,
       additionalContext: { answers: normalizedAnswers },
     });
     ```
  5. Updates `ChatbotSession` and returns resolution response.

---

## 3. Catalog of Hardcoded Stub Strings & Canned Responses

| Location | String / Code Snippet | Purpose / Mechanism | Elimination Action |
|---|---|---|---|
| `backend/src/services/ai/mock/mockLLMService.ts:88` | `Personalized Homeopathic Plan for "${originalQuery}"${symptomsSummary}: ${templateText}${languageNote}` | Deterministic mock for consultation personalized answer | Replace mock with `GeminiLLMService` returning dynamic LLM completion |
| `backend/src/services/ai/mock/mockLLMService.ts:67` | `Guidance for query: "${prompt}". Please consult Dr. Anjali Jariwala for detailed homeopathic follow-up.` | Canned mock answer for direct query | Replace mock with `GeminiLLMService` generating real contextual advice |
| `backend/src/services/consultationService.ts:172` | `'Personalized homeopathic remedy guidance based on diagnostic evaluation.'` | Hardcoded fallback template if `answerDoc` is missing | Use LLM synthesis directly or clinical knowledge fallback |
| `backend/src/services/chatbotService.ts:233-236` | `[{ id: 'q1', questionText: 'Is the symptom acute and throbbing?' }, { id: 'q2', questionText: 'Is there accompanying nausea or light sensitivity?' }]` | Hardcoded fallback diagnostic questions if `consultDoc` is missing | Require valid knowledge base or generate diagnostic questions via Gemini |
| `backend/src/config/chatbotConfig.ts:9` | `'We could not find a confident match for your query. Our medical team has been notified to review this question. You may also consult Dr. Anjali Jariwala directly at Healing Hands4U clinic.'` | Canned fallback message for unmatched queries | Dynamic guidance message or configurable fallback |
| `app/src/main/java/.../ChatbotAnswerScreen.kt:103` | `message = "Here is your personalized homeopathic healing regimen curated by Dr. Anjali Jariwala:"` | Hardcoded string in Jetpack Compose UI `ChatBubble` | Replace with dynamic message from network response (`state.answerText` or `state.message`) |
| `app/src/main/java/.../ChatbotAnswerScreen.kt:113` | `dosage = state.dosage ?: "4 pills, 2 times daily after meals"` | Hardcoded fallback dosage in UI | Pull strictly from network response |
| `app/src/main/java/.../ChatbotAnswerScreen.kt:115` | `safetyDisclaimer = "If disease does not cure within 2 days then consult doctor right now"` | Hardcoded safety disclaimer in UI | Pull strictly from backend `safetyDisclaimerText` |

---

## 4. Deep Dive into AI Services Container & Google GenAI SDK

### 4.1 Dependency Injection in `aiContainer.ts`
`backend/src/services/ai/aiContainer.ts` implements the provider factory:
```typescript
export function createDefaultAIServices(): AIServices {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    return {
      llm: new GeminiLLMService(apiKey),
      embedding: new GeminiEmbeddingService(apiKey),
      stt: new MockSTTService(),
      tts: new MockTTSService(),
    };
  }
  return {
    llm: new MockLLMService(),
    embedding: new MockEmbeddingService(),
    stt: new MockSTTService(),
    tts: new MockTTSService(),
  };
}
```

### 4.2 Critical Bug Identified: Deprecated Model Identifiers
When running against the `@google/genai@2.23.0` SDK with the key in `backend/.env`:
1. **Embedding Failure:**
   - In `geminiEmbeddingService.ts:6`: `private model = 'text-embedding-004';`
   - Runtime Error:
     `ApiError: {"error":{"code":404,"message":"models/text-embedding-004 is not found for API version v1beta, or is not supported for embedContent."}}`
   - **Resolution:** Tested live with `@google/genai`. Available models are `gemini-embedding-001` and `gemini-embedding-2`.
   - Running `gemini-embedding-001` with `config: { outputDimensionality: 768 }` succeeded and returned 768-dimensional embeddings matching `vectorSearchService.ts`.
2. **LLM Generation Failure:**
   - In `geminiLLMService.ts:6`: `private model = 'gemini-2.5-flash';`
   - Runtime Error:
     `ApiError: {"error":{"code":404,"message":"This model models/gemini-2.5-flash is no longer available to new users."}}`
   - **Resolution:** Tested live with `@google/genai`. Model `gemini-flash-latest` succeeded immediately and produced valid text completions and translation JSON.

### 4.3 Environment Loading Timing
`aiContainer.ts` initializes `let activeServices = createDefaultAIServices();` at file evaluation time. If `aiContainer.ts` is imported before `app.ts` executes `dotenv.config()`, `process.env.GEMINI_API_KEY` is undefined during initial assignment. Adding `import dotenv from 'dotenv'; dotenv.config();` at the top of `aiContainer.ts` guarantees `GEMINI_API_KEY` is read immediately upon module load.

---

## 5. Audit of Existing Jest Test Suites

### 5.1 Test Inventory & Execution Results
There are 26 test suites in `backend/tests/` comprising 508 tests.
Running `npm test` with `GEMINI_API_KEY=""`:
```
Test Suites: 26 passed, 26 total
Tests:       508 passed, 508 total
Snapshots:   0 total
Time:        89.839 s
```
All existing tests currently pass with Mock AI implementations.

### 5.2 Why Existing Tests Fail When `GEMINI_API_KEY` is Active:
1. **Model 404 Errors:** Fixtures seed questions during `beforeEach` by calling `ai.embedding.generateEmbedding(...)`. When `GEMINI_API_KEY` is set, `GeminiEmbeddingService` is used, which calls `text-embedding-004` and throws 404.
2. **Mock-Coupled Assertions:**
   - `tests/chatbot.test.ts:47`: `expect(ai.embedding.dimensions).toBe(1536)` (Gemini is 768).
   - `tests/chatbot.test.ts:65`: `expect(resHindi.translatedText).toBe('I have a headache')` (Gemini may return case or wording variations).
   - `tests/chatbot.test.ts:260`: `expect(answerRes.body.answer.personalizedAnswer).toContain('Personalized Homeopathic Plan')` (Gemini returns a natural language response, not this canned prefix).

---

## 6. Testing Strategy: Verifying Gemini Dynamic Responses

To satisfy acceptance criteria without causing flakiness, rate limits, or breaking the existing 508 unit tests:

### 6.1 Two-Tiered Testing Approach
1. **Unit / Regression Tier (Mock AI):**
   - Keep existing unit/adversarial/stress tests (`chatbot.stress.test.ts`, `chatbot.adversarial.test.ts`, etc.) using deterministic mock AI (`MockLLMService`, `MockEmbeddingService`) so they run fast (in-memory) without external network dependency or rate limit failures.
2. **Gemini Integration & Dynamic LLM Verification Tier:**
   - Create a dedicated test suite: `backend/tests/chatbot.gemini.test.ts`.
   - This test suite explicitly verifies:
     - **AC1:** `aiContainer.ts` instantiates `GeminiLLMService` and `GeminiEmbeddingService` when `GEMINI_API_KEY` is set.
     - **AC2:** Querying `/api/chatbot/query` with a health prompt hits the Gemini API (or an HTTP-level mock via `nock`/SDK mock) and returns a dynamic, generated LLM answer.
     - **AC3:** The response does NOT contain any canned stub strings (`"Here is your personalized homeopathic..."`, `"Personalized Homeopathic Plan for..."`, or `"Please consult Dr. Anjali Jariwala"`).

### 6.2 HTTP-Level / SDK Interception Design
In `chatbot.gemini.test.ts`:
- Mock the HTTP layer using `nock` or spy on `@google/genai` `Models.prototype.generateContent` and `Models.prototype.embedContent`.
- When `/api/chatbot/query` is called:
  - Verify that `generateContent` or `embedContent` is invoked with the user's prompt.
  - Return dynamic completion: e.g. `"Dynamic Homeopathic Recommendation: Based on your reported symptoms of headache, Bryonia 30C is recommended..."`.
  - Assert that `res.body.answer.answerText` contains this dynamic text.
  - Assert that `res.body.answer.answerText` does NOT contain `"Here is your personalized homeopathic..."`.

---

## 7. Concrete Actionable Recommendations for Implementation

### Recommendation 1: Fix Gemini Model Identifiers in Backend
1. **`backend/src/services/ai/gemini/geminiLLMService.ts`**:
   - Change `private model = 'gemini-2.5-flash'` to:
     ```typescript
     private model = process.env.GEMINI_MODEL || 'gemini-flash-latest';
     ```
2. **`backend/src/services/ai/gemini/geminiEmbeddingService.ts`**:
   - Change `private model = 'text-embedding-004'` to:
     ```typescript
     private model = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';
     ```
   - In `embedContent`:
     ```typescript
     const response = await this.ai.models.embedContent({
       model: this.model,
       contents: text,
       config: { outputDimensionality: this.dimensions },
     });
     ```

### Recommendation 2: Ensure `aiContainer.ts` Defaults to Gemini When Key Present
1. Add `dotenv.config()` at the top of `backend/src/services/ai/aiContainer.ts` so `process.env.GEMINI_API_KEY` is never missed during initial module import.
2. In `createDefaultAIServices()`, check `const apiKey = process.env.GEMINI_API_KEY?.trim()`. If non-empty, instantiate `GeminiLLMService` and `GeminiEmbeddingService`.

### Recommendation 3: Synthesize Live LLM Answers in `direct_answer` Pipeline
In `backend/src/services/chatbotService.ts`:
- When handling `intent === 'direct_answer'`:
  Even when an `answerDoc` is matched from MongoDB, pass the template remedy and user query through `ai.llm.generateAnswer(...)` or `ai.llm.generatePersonalizedAnswer(...)` to produce a dynamic, personalized clinical explanation.
- Set `answer.answerText = dynamicLLMAnswer` so the endpoint always delivers genuine Gemini LLM output rather than static database text.
- Provide both nested `answer: { answerText, ... }` and top-level `answerText`, `remedyText` to guarantee 100% contract compatibility with the Android Retrofit DTO.

### Recommendation 4: Remove Hardcoded Stub in Android UI
In `app/src/main/java/com/healinghands4u/presentation/chatbot/answer/ChatbotAnswerScreen.kt`:
- Replace line 103:
  ```kotlin
  // Before:
  message = "Here is your personalized homeopathic healing regimen curated by Dr. Anjali Jariwala:"

  // After:
  message = state.answerText
  ```
- Remove hardcoded fallbacks on `state.dosage` and `safetyDisclaimer` to ensure the screen strictly reflects backend network responses.

### Recommendation 5: Implement `backend/tests/chatbot.gemini.test.ts`
- Implement a comprehensive Jest test file verifying:
  1. Default selection of Gemini services in `aiContainer.ts` when `GEMINI_API_KEY` is present.
  2. Execution of `/api/chatbot/query` with HTTP-layer mock / live Gemini.
  3. Dynamic response verification and strict absence of hardcoded stub phrases.
