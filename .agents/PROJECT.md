# Project: Healing Hands4U Live Gemini & Atlas Finalization

## Architecture
Healing Hands4U consists of:
1. **Node.js Express / TypeScript Backend**:
   - `backend/src/app.ts`: Express application setup, route mounting (`/chatbot`, `/api/chatbot`, `/api/auth`, `/api/admin`).
   - `backend/src/services/ai/aiContainer.ts`: Factory and registry for AI services (`llm`, `embedding`, `stt`, `tts`).
   - `backend/src/services/ai/gemini/`: `GeminiLLMService` (using `@google/genai` with model `gemini-3.6-flash` / `gemini-flash-latest`) and `GeminiEmbeddingService` (using `gemini-embedding-2` with 1536 dims).
   - `backend/src/services/chatbotService.ts` & `consultationService.ts`: Core AI query resolution and consultation diagnostic flows.
   - `backend/src/services/vectorSearchService.ts`: Atlas Vector Search (`$vectorSearch` aggregation stage with 1536 dims against `level1questions`).
2. **Android Frontend (Kotlin / Jetpack Compose / Retrofit)**:
   - `app/src/main/java/com/healinghands4u/data/remote/ChatbotApi.kt`: Retrofit service interface and DTOs.
   - `app/src/main/java/com/healinghands4u/presentation/chatbot/ChatbotViewModel.kt`: Chatbot state management and network binding.
   - `app/src/main/java/com/healinghands4u/presentation/chatbot/answer/ChatbotAnswerScreen.kt`: Compose UI displaying remedy, dosage, home remedy, and disclaimer.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Fix Env Loading & AI Container Defaulting | Ensure `dotenv.config()` loads before AI services are instantiated, and `aiContainer.ts` defaults to real Gemini services whenever `GEMINI_API_KEY` is present. | M1 | Survey (Explorer 1 & 2) |
| 2 | Live Gemini Models & 1536-dim Atlas Vector Search | Upgrade LLM to `gemini-3.6-flash`/`gemini-flash-latest` and embeddings to `gemini-embedding-2` with 1536 output dimensions, matching MongoDB Atlas search index `vector_index`. | M1 | Survey (Explorer 1 & 2) |
| 3 | Dynamic LLM Completion on `/api/chatbot/query` | Wire `chatbotService.ts` direct answer pipeline to generate dynamic LLM answers using Gemini rather than passing raw static text, and remove canned stubs from `consultationService.ts`. | M1 | Survey (Explorer 1 & 2) |
| 4 | Android DTO Alignment & Fallback Eradication | Update `ChatbotApi.kt` to parse `AnswerDto` object, eliminate `"Found remedy"`, `"4 pills, 2 times daily..."`, and hardcoded Dr. Jariwala headers, strictly rendering Retrofit network responses. | M2 | Survey (Explorer 3) |
| 5 | Programmatic Backend Tests (Jest) for Gemini | Add `backend/tests/chatbot.gemini.test.ts` verifying `/api/chatbot/query` hits Gemini / GenAI SDK and returns dynamic answers without hardcoded stubs. Ensure all existing backend tests pass. | M3 | Survey (Explorer 2) & Acceptance Criteria |
| 6 | Android Unit Test Suite Verification | Fix test constructor signature discrepancies on `ChatbotAnswerScreen` and verify all Android unit tests pass. | M3 | Survey (Explorer 3) & Acceptance Criteria |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Live Gemini & Atlas Integration, Stub Eradication & Verification | Features 1-6: Backend env race fix & AI container defaulting, model upgrades (gemini-3.6-flash, gemini-embedding-2 1536-dim), dynamic LLM answer generation in `chatbotService.ts`, eradication of all backend stubs, Android DTO alignment and fallback eradication in `ChatbotApi.kt`, `ChatbotViewModel.kt`, `ChatbotAnswerScreen.kt`, and programmatic Jest & Android tests. | none | DONE |

---

## Interface Contracts

### Backend AI Container ↔ Services
- `getAIServices()` returns `AIServices`:
  - `llm`: `ILLMService` (`generateAnswer(prompt: string): Promise<string>`, `generatePersonalizedAnswer(...)`, `translate(...)`)
  - `embedding`: `IEmbeddingService` (`embed(text: string): Promise<number[]>`, `embedBatch(...)`, `dimensions: 1536`)
- When `process.env.GEMINI_API_KEY` is present and non-empty, `llm` is `GeminiLLMService` and `embedding` is `GeminiEmbeddingService`.

### Backend API ↔ Android Client
- `POST /api/chatbot/query`:
  - Request: `{ queryText: string, intent: 'direct_answer' | 'consultation', language?: string, inputMode?: 'text' | 'voice' }`
  - Response:
    ```json
    {
      "success": true,
      "sessionId": string,
      "matchConfident": boolean,
      "confidenceScore": number,
      "intent": "direct_answer",
      "matchedLevel1Question": { "id": string, "canonicalQuestionText": string },
      "answer": {
        "id": string,
        "answerText": string,
        "dosageInstructions"?: string,
        "homeRemedyText"?: string,
        "safetyDisclaimerText"?: string,
        "videoUrl"?: string
      },
      "matchCandidates": [ ... ]
    }
    ```
- `POST /api/chatbot/consultation-answer`:
  - Request: `{ sessionId: string, answers: Record<string, string> }`
  - Response:
    ```json
    {
      "success": true,
      "sessionId": string,
      "answer": {
        "id": string,
        "answerText": string,
        "personalizedAnswer": string,
        "dosageInstructions"?: string,
        "homeRemedyText"?: string,
        "safetyDisclaimerText"?: string,
        "videoUrl"?: string
      }
    }
    ```

---

## Code Layout
- Backend Source:
  - `backend/src/app.ts` (App init, env config)
  - `backend/src/services/ai/aiContainer.ts` (Service container)
  - `backend/src/services/ai/gemini/geminiLLMService.ts` (Gemini LLM)
  - `backend/src/services/ai/gemini/geminiEmbeddingService.ts` (Gemini Embeddings)
  - `backend/src/services/chatbotService.ts` (Query pipeline)
  - `backend/src/services/consultationService.ts` (Consultation pipeline)
  - `backend/src/services/vectorSearchService.ts` (Atlas vector search)
  - `backend/tests/chatbot.gemini.test.ts` (Gemini verification test)
- Android Source:
  - `app/src/main/java/com/healinghands4u/data/remote/ChatbotApi.kt` (DTOs & API interface)
  - `app/src/main/java/com/healinghands4u/presentation/chatbot/ChatbotViewModel.kt` (ViewModel)
  - `app/src/main/java/com/healinghands4u/presentation/chatbot/answer/ChatbotAnswerScreen.kt` (Compose UI)
  - `app/src/test/java/com/healinghands4u/presentation/` (Compose unit tests)
