## 2026-09-17T03:09:01Z

You are the Implementation Worker for the Chatbot Engine backend project.
Your working directory is: /Users/aditya/workspace/hh4u/.agents/worker_m1_1

READ THESE DOCUMENTS FIRST:
- /Users/aditya/workspace/hh4u/.agents/ORIGINAL_REQUEST.md
- /Users/aditya/workspace/hh4u/.agents/orchestrator_chatbot/PROJECT.md
- /Users/aditya/workspace/hh4u/.agents/spec_miner_survey_1/handoff.md
- /Users/aditya/workspace/hh4u/.agents/explorer_survey_2/handoff.md
- /Users/aditya/workspace/hh4u/.agents/explorer_survey_3/handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

EXCLUSIVE FILE OWNERSHIP:
- backend/src/services/ai/**
- backend/src/utils/vectorSimilarity.ts
- backend/src/config/chatbotConfig.ts
- backend/src/services/chatbotService.ts
- backend/src/services/consultationService.ts
- backend/src/controllers/chatbotController.ts
- backend/src/routes/chatbotRoutes.ts
- backend/src/app.ts (route mounting)
- backend/tests/helpers/chatbotFixtures.ts
- backend/tests/chatbot.test.ts
- backend/tests/chatbot.adversarial.test.ts

IMPLEMENTATION REQUIREMENTS:
1. R1: Vendor-Agnostic AI Service Interfaces & Mocks:
   - In `backend/src/services/ai/types.ts`: Define `ILLMService`, `IEmbeddingService`, `ISTTService`, `ITTSService`.
   - In `backend/src/services/ai/mock/`: Implement `MockLLMService`, `MockEmbeddingService`, `MockSTTService`, `MockTTSService`. Must be deterministic for offline testing without API keys.
   - In `backend/src/services/ai/aiContainer.ts`: Implement `getAIServices()`, `setAIServices()`, `resetAIServices()` for swappable dependency injection.
2. Vector Similarity Engine:
   - In `backend/src/utils/vectorSimilarity.ts`: Implement cosine similarity calculation and top-K candidate extraction over active `Level1Question` documents. This solves the `mongodb-memory-server` Atlas `$vectorSearch` limitation while enabling fast (<1ms) in-memory ranking.
3. Configuration:
   - In `backend/src/config/chatbotConfig.ts`: Provide `MATCH_CONFIDENCE_THRESHOLD = parseFloat(process.env.MATCH_CONFIDENCE_THRESHOLD || '0.75')`, `TOP_CANDIDATES_COUNT = 5`, and standard fallback messages.
4. R2: Query Pipeline (`POST /chatbot/query` and `POST /api/chatbot/query`):
   - In `backend/src/services/chatbotService.ts`:
     - Input handling: support `text` or `audio` (base64 audio transcribed via STT).
     - Multilingual translation to English via `LLMService.translateToEnglish`.
     - 1536-dim embedding generation via `EmbeddingService.generateEmbedding`.
     - Vector similarity search against active `Level1Question` records.
     - Extract top 3-5 match candidates with similarity scores.
     - Threshold check: if top score >= `MATCH_CONFIDENCE_THRESHOLD`:
       - If `intent === 'direct_answer'`: fetch matching `Answer` for `matchedLevel1QuestionId`, generate answer response.
       - If `intent === 'consultation'`: fetch matching `ConsultationQuery` for `matchedLevel1QuestionId`, return diagnostic Yes/No questions.
     - If top score < `MATCH_CONFIDENCE_THRESHOLD`:
       - Create entry in `NeedsReviewQuery` (with `originalQueryText`, `originalLanguage`, `translatedQueryText`, `userId`, `sessionId`, `status: 'pending'`).
       - Return fallback response message.
     - Session logging: create `ChatbotSession` capturing `userId`, `inputMode`, `originalQueryText`, `originalLanguage`, `translatedQueryText`, `intent`, `matchCandidates` (top 3-5 with `level1QuestionId` and `score`), `matchedLevel1QuestionId`, `matchConfident`.
     - Click statistics: atomically increment `clickCount` in `QueryClickStats` using `$inc: { clickCount: 1 }` (upserting with `firstAskedAt: new Date()` if new).
5. R3: Consultation Answer Resolution (`POST /chatbot/consultation-answer` and `POST /api/chatbot/consultation-answer`):
   - In `backend/src/services/consultationService.ts`:
     - Takes `sessionId` and diagnostic answers (support Map or Object of `{ [questionId]: 'yes' | 'no' }`).
     - Loads `ChatbotSession` and `ConsultationQuery`.
     - Evaluates `answerBranches` conditions against user answers to resolve `resolvedAnswerId`.
     - Fetches resolved `Answer`.
     - Synthesizes personalized final answer via `LLMService.generatePersonalizedAnswer` reflecting template and user's original query.
     - Updates `ChatbotSession` with `consultationAnswers` and `finalAnswerId`.
6. Controllers & Routes:
   - In `backend/src/controllers/chatbotController.ts` & `backend/src/routes/chatbotRoutes.ts`:
     - Validate inputs (required fields, valid ObjectIds, valid intent enum).
     - Mount routes in `backend/src/app.ts` under BOTH `/chatbot` and `/api/chatbot`.
7. R5: Comprehensive Test Suite:
   - In `backend/tests/helpers/chatbotFixtures.ts`: helper to seed sample `Level1Question`, `Answer`, `ConsultationQuery`, `User`.
   - In `backend/tests/chatbot.test.ts`: test all standard flows (direct answer, consultation path & resolution, fallback/needs_review, session logging, candidate scores, click stats increment, voice input, threshold configuration).
   - In `backend/tests/chatbot.adversarial.test.ts`: test edge cases (empty text/audio, invalid intent, unknown session ID, mismatched diagnostic answers, threshold boundary at 0.6 vs 0.9, custom mock AI service swapping).
   - Run `npm test` and `npm run build` in `backend/`. Ensure 100% tests pass (both auth and chatbot tests).
