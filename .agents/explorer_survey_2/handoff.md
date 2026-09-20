# Handoff Report: Chatbot Query Pipeline, Stub Eradication & Jest Test Architecture

## 1. Observation

1. **Route Mounts & Controller:**
   - `backend/src/app.ts:37-38`:
     `app.use('/chatbot', chatbotRoutes);`
     `app.use('/api/chatbot', chatbotRoutes);`
   - `backend/src/routes/chatbotRoutes.ts:33-39`:
     `router.post('/query', optionalAuthenticateToken, (req, res) => chatbotController.handleQuery(req, res));`
     `router.post('/consultation-answer', optionalAuthenticateToken, (req, res) => chatbotController.handleConsultationAnswer(req, res));`
   - `backend/src/controllers/chatbotController.ts:10-99`: `handleQuery` delegates to `chatbotService.processQuery(input)`.

2. **Hardcoded Stubs & Canned Text:**
   - `backend/src/services/ai/mock/mockLLMService.ts:88`:
     `return \`Personalized Homeopathic Plan for "${originalQuery}"\${symptomsSummary}: \${templateText}\${languageNote}\`;`
   - `backend/src/services/ai/mock/mockLLMService.ts:67`:
     `return \`Guidance for query: "${prompt}". Please consult Dr. Anjali Jariwala for detailed homeopathic follow-up.\`;`
   - `backend/src/services/consultationService.ts:172`:
     `'Personalized homeopathic remedy guidance based on diagnostic evaluation.';`
   - `backend/src/services/chatbotService.ts:233-236`:
     `const diagnosticQuestions = consultDoc?.diagnosticQuestions || [{ id: 'q1', questionText: 'Is the symptom acute and throbbing?' }, { id: 'q2', questionText: 'Is there accompanying nausea or light sensitivity?' }];`
   - `app/src/main/java/com/healinghands4u/presentation/chatbot/answer/ChatbotAnswerScreen.kt:103`:
     `message = "Here is your personalized homeopathic healing regimen curated by Dr. Anjali Jariwala:",`

3. **Gemini SDK Model Errors in `@google/genai@2.23.0`:**
   - `backend/src/services/ai/gemini/geminiLLMService.ts:6`: `private model = 'gemini-2.5-flash';`
     Running `generateContent` via Node produced verbatim:
     `ApiError: {"error":{"code":404,"message":"This model models/gemini-2.5-flash is no longer available to new users. Please update your code to use models/gemini-3.6-flash for the latest features and improvements.","status":"NOT_FOUND"}}`
   - `backend/src/services/ai/gemini/geminiEmbeddingService.ts:6`: `private model = 'text-embedding-004';`
     Running `embedContent` via Node produced verbatim:
     `ApiError: {"error":{"code":404,"message":"models/text-embedding-004 is not found for API version v1beta, or is not supported for embedContent.","status":"NOT_FOUND"}}`
   - Running live tests against Google GenAI API with the key from `backend/.env`:
     - Model `'gemini-flash-latest'` succeeded with 200 OK: `gemini-flash-latest SUCCESS: Hello, beautiful world!`
     - Model `'gemini-embedding-001'` with `{ outputDimensionality: 768 }` succeeded with 200 OK returning 768 dimensions.

4. **Existing Jest Test Suite Status:**
   - Running `GEMINI_API_KEY="" npm test` in `backend/`:
     `Test Suites: 26 passed, 26 total`
     `Tests: 508 passed, 508 total`
   - `backend/tests/chatbot.test.ts` line 47 asserts: `expect(ai.embedding.dimensions).toBe(1536);`
   - `backend/tests/chatbot.test.ts` line 260 asserts: `expect(answerRes.body.answer.personalizedAnswer).toContain('Personalized Homeopathic Plan');`

5. **Direct Answer Dynamic Generation Gap:**
   - `backend/src/services/chatbotService.ts:194-206`:
     When `answerDoc` exists in MongoDB, static database text `answerDoc.answerText` is returned without calling `ai.llm.generateAnswer`.

---

## 2. Logic Chain

1. **From Observation 1 & 2:**
   The backend routes `/chatbot/query` and `/api/chatbot/query` process user queries through `chatbotService.processQuery`. While consultation answers invoke `ai.llm.generatePersonalizedAnswer`, direct answers returning from database matches bypass the LLM. Furthermore, `mockLLMService.ts` and `ChatbotAnswerScreen.kt` inject canned strings (`"Personalized Homeopathic Plan..."` and `"Here is your personalized homeopathic healing regimen curated by Dr. Anjali Jariwala:"`).

2. **From Observation 3:**
   The reason backend tests crash when `GEMINI_API_KEY` is present in `backend/.env` is that `aiContainer.ts` selects `GeminiLLMService` and `GeminiEmbeddingService`, which call models that are obsolete/unsupported in the Google GenAI SDK v1beta API (`gemini-2.5-flash` and `text-embedding-004`). Switching to supported models (`gemini-flash-latest` and `gemini-embedding-001` with `outputDimensionality: 768`) restores live API functionality.

3. **From Observation 4:**
   Existing tests (508 tests across 26 files) pass when mock services are active because they assert Mock-specific dimensions (1536) and canned strings. Updating or replacing mock implementations globally without providing mock-isolation would break existing regression test suites.

4. **From Observation 5 & Acceptance Criteria:**
   To satisfy the acceptance criteria that querying `/api/chatbot/query` returns dynamic LLM answers instead of hardcoded stubs:
   - `chatbotService.ts` must invoke `ai.llm.generateAnswer` (synthesizing user query + matched remedy knowledge) for direct answers.
   - A dedicated Jest test (`backend/tests/chatbot.gemini.test.ts`) must be introduced to verify that querying `/api/chatbot/query` hits Gemini (or an HTTP-level mock of the Gemini API) and returns dynamically generated LLM content without stubs.
   - `ChatbotAnswerScreen.kt` must display `state.answerText` rather than the hardcoded Dr. Anjali Jariwala string.

---

## 3. Caveats

1. **Live Gemini Rate Limits & Quotas:**
   Google Gemini API has RPM/TPM rate limits. Running all 508 tests against live external Google endpoints on every test run is infeasible and would trigger HTTP 429 / 503 errors. The regression suite should continue using isolated mock AI or mock injection, while the dedicated Gemini verification test validates live or HTTP-mocked Gemini integration.
2. **TTS / STT Scope:**
   Per user instructions ("You may ignore or hide STT/TTS voice features"), STT and TTS mock implementations (`mockSTTService.ts`, `mockTTSService.ts`) can remain or be ignored for this milestone.
3. **No Source Code Modified:**
   As a read-only explorer agent, no production or test source files were modified during this investigation.

---

## 4. Conclusion

1. The backend route and controller structure (`/api/chatbot/query`, `chatbotController.ts`) is cleanly designed and ready for Gemini migration.
2. Hardcoded stubs originate from three specific sources: `mockLLMService.ts` (`"Personalized Homeopathic Plan..."`), `consultationService.ts:172` fallback, and Android's `ChatbotAnswerScreen.kt:103` (`"Here is your personalized homeopathic healing regimen..."`).
3. The immediate obstacle preventing Gemini execution is outdated model names (`gemini-2.5-flash` -> `gemini-flash-latest`, `text-embedding-004` -> `gemini-embedding-001` with 768 dims).
4. `chatbotService.ts` must be updated to ensure `direct_answer` queries dynamically invoke Gemini LLM completion.
5. A dedicated Jest test suite (`tests/chatbot.gemini.test.ts`) must be created to verify Gemini instantiation, HTTP-layer interaction, and dynamic answer generation free of canned stubs.

---

## 5. Verification Method

To independently verify all observations and conclusions:

1. **Verify Existing Tests Pass with Mock Services:**
   ```bash
   cd /Users/aditya/workspace/hh4u/backend
   GEMINI_API_KEY="" npm test
   ```
   *Expected:* 26 test suites passed, 508 tests passed.

2. **Verify Gemini Model Identifiers Against Google GenAI API:**
   ```bash
   cd /Users/aditya/workspace/hh4u/backend
   node -e '
   require("dotenv").config();
   const { GoogleGenAI } = require("@google/genai");
   const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
   (async () => {
     const res = await ai.models.generateContent({ model: "gemini-flash-latest", contents: "test" });
     console.log("LLM status: OK, text:", res.text.trim());
     const emb = await ai.models.embedContent({ model: "gemini-embedding-001", contents: "test", config: { outputDimensionality: 768 } });
     console.log("Embedding status: OK, dims:", emb.embeddings[0].values.length);
   })();'
   ```
   *Expected:* Both print `status: OK` (dims = 768).

3. **Inspect Canned Strings:**
   Inspect lines identified in Section 1:
   - `backend/src/services/ai/mock/mockLLMService.ts:67,88`
   - `backend/src/services/consultationService.ts:172`
   - `app/src/main/java/com/healinghands4u/presentation/chatbot/answer/ChatbotAnswerScreen.kt:103`

4. **Invalidation Conditions:**
   - If Google GenAI API restores `gemini-2.5-flash` and `text-embedding-004` under v1beta, model identifier updates would not be strictly required (though `gemini-flash-latest` remains recommended).
   - If `/api/chatbot/query` is not intended to invoke Gemini for known database answers, the direct-answer LLM synthesis requirement would be scoped to unmatched or consultation queries only.
