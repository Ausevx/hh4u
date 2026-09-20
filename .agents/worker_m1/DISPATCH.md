## 2026-09-20T17:30:00Z

You are the Implementation Worker for Milestone 1: Live Gemini & Atlas Integration, Stub Eradication & Verification.

Working Directory: /Users/aditya/workspace/hh4u/.agents/worker_m1
Project Root: /Users/aditya/workspace/hh4u
Scope Document: /Users/aditya/workspace/hh4u/.agents/PROJECT.md
Original Request: /Users/aditya/workspace/hh4u/.agents/ORIGINAL_REQUEST.md (READ THIS FIRST, especially '## Follow-up — 2026-09-20T17:21:25Z')

SURVEY REPORTS TO STUDY:
- /Users/aditya/workspace/hh4u/.agents/explorer_survey_1/handoff.md & analysis.md (Backend AI container, race condition, model 404s, 1536 dims)
- /Users/aditya/workspace/hh4u/.agents/explorer_survey_2/handoff.md & analysis.md (Backend routes, stubs, tests, dynamic direct answers)
- /Users/aditya/workspace/hh4u/.agents/explorer_survey_3/handoff.md & analysis.md (Android DTOs, fallbacks, compilation fixes)

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

EXCLUSIVE WRITE OWNERSHIP:
You have exclusive write access to:
- `backend/src/app.ts`
- `backend/src/services/ai/aiContainer.ts`
- `backend/src/services/ai/gemini/geminiLLMService.ts`
- `backend/src/services/ai/gemini/geminiEmbeddingService.ts`
- `backend/src/services/chatbotService.ts`
- `backend/src/services/consultationService.ts`
- `backend/src/services/vectorSearchService.ts`
- `backend/tests/chatbot.gemini.test.ts`
- `app/src/main/java/com/healinghands4u/data/remote/ChatbotApi.kt`
- `app/src/main/java/com/healinghands4u/presentation/chatbot/ChatbotViewModel.kt`
- `app/src/main/java/com/healinghands4u/presentation/chatbot/answer/ChatbotAnswerScreen.kt`
- `app/src/test/java/com/healinghands4u/presentation/` (if needed to restore test compilation)

TASKS:
1. Fix Backend Env Loading & AI Container:
   - In `backend/src/app.ts`: Move `dotenv.config();` to the top before internal route imports.
   - In `backend/src/services/ai/aiContainer.ts`: Ensure `getAIServices()` and `createDefaultAIServices()` dynamically evaluate `process.env.GEMINI_API_KEY` and default to `GeminiLLMService` and `GeminiEmbeddingService` whenever `GEMINI_API_KEY` is present.
2. Upgrade Gemini Models & Align Dimensions:
   - In `backend/src/services/ai/gemini/geminiLLMService.ts`: Upgrade model from `gemini-2.5-flash` to `'gemini-3.6-flash'`. Ensure `generateAnswer` and `generatePersonalizedAnswer` work properly with Google GenAI SDK (`@google/genai`).
   - In `backend/src/services/ai/gemini/geminiEmbeddingService.ts`: Upgrade model from `text-embedding-004` to `'gemini-embedding-2'`. Configure `{ outputDimensionality: 1536 }` and set `public readonly dimensions: number = 1536`.
   - In `backend/src/services/vectorSearchService.ts`: Ensure vector search passes 1536 dimensions matching Atlas index `vector_index`.
3. Dynamic LLM Completion for Direct Answers & Stub Elimination:
   - In `backend/src/services/chatbotService.ts`: When `answerDoc` is matched for `direct_answer`, synthesize a personalized answer via `ai.llm.generateAnswer` combining the user's query and remedy knowledge rather than bypassing the LLM.
   - Eradicate any hardcoded stub strings in backend (`consultationService.ts:172`, etc.).
4. Android DTO Alignment & Fallback Eradication:
   - In `app/src/main/java/com/healinghands4u/data/remote/ChatbotApi.kt`: Update `ChatbotQueryResponse` DTO to accept `val answer: AnswerDto?` where `AnswerDto` has `id`, `answerText`, `dosageInstructions`, `homeRemedyText`, `safetyDisclaimerText`, `videoUrl`. Add consultation DTOs.
   - In `app/src/main/java/com/healinghands4u/presentation/chatbot/ChatbotViewModel.kt`: Map `AnswerDto` fields directly to `ChatbotUiState.Success` without dummy fallback `"Found remedy"`.
   - In `app/src/main/java/com/healinghands4u/presentation/chatbot/answer/ChatbotAnswerScreen.kt`: Display live response `state.answerText`, remove hardcoded fallback `"4 pills..."`, remove hardcoded `"Here is your personalized homeopathic..."` header. Ensure overloaded composable maintains backward compatibility with unit tests.
5. Verification & Tests:
   - Create `backend/tests/chatbot.gemini.test.ts` verifying that `/api/chatbot/query` defaults to Gemini when key is present, hits Gemini/GenAI SDK, and returns a dynamic answer rather than the hardcoded stub.
   - Run backend build (`npm run build`) and test suite (`npm test`).
   - Run Android test compilation (`./gradlew compileDebugUnitTestKotlin` and `./gradlew testDebugUnitTest`).

OUTPUT:
Write your full report in `/Users/aditya/workspace/hh4u/.agents/worker_m1/handoff.md` with sections:
- 1. Observation (exact diffs, files touched, commands run)
- 2. Logic Chain
- 3. Caveats
- 4. Conclusion
- 5. Verification Method (exact test commands and pass outputs)
When complete, send a message to parent with summary and path to handoff.md.
