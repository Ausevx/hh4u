# Project: Chatbot Engine Backend

## Architecture
The Chatbot Engine backend provides intelligent Q&A and guided consultation for Healing Hands4U.
It follows an App/Server separation architecture using Express 5, TypeScript, Mongoose, and Jest/Supertest:
- **AI Abstraction Layer (`backend/src/services/ai/`)**:
  Vendor-agnostic interfaces (`ILLMService`, `IEmbeddingService`, `ISTTService`, `ITTSService`) with a swappable dependency container (`aiContainer.ts`) and deterministic mock implementations (`mock/`) for offline zero-API-key execution.
- **Vector Utilities (`backend/src/utils/vectorSimilarity.ts`)**:
  In-memory cosine similarity search and candidate ranking over curated `level1_questions`, ensuring 100% offline testability with `mongodb-memory-server` while supporting production Atlas vector search fallback.
- **Config (`backend/src/config/chatbotConfig.ts`)**:
  Centralized settings, including configurable `MATCH_CONFIDENCE_THRESHOLD` (env or default `0.75`).
- **Core Chatbot Engine (`backend/src/services/chatbotService.ts` & `consultationService.ts`)**:
  - `processQuery`: STT transcription (voice), translation to English (LLM), 1536-dim vector embedding, top 3-5 similarity matching against active `level1_questions`, threshold comparison, direct answer vs consultation questions, fallback to `needs_review_queries`, session creation in `chatbot_sessions`, and atomic increment of `query_click_stats`.
  - `resolveConsultationAnswer`: Branch condition evaluation against `consultation_queries`, personalized answer generation with original query context, and session finalization.
- **HTTP Routing & Controllers (`backend/src/controllers/chatbotController.ts`, `backend/src/routes/chatbotRoutes.ts`)**:
  Dual-mounted at `/chatbot` and `/api/chatbot` in `backend/src/app.ts`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | AI Service Interfaces | Clean adapter interfaces for LLM, Embeddings, STT, TTS | M1 | ORIGINAL_REQUEST §R1 |
| 2 | Deterministic Mock Providers | Zero-API-key mock implementations of LLM, Embeddings, STT, TTS | M1 | ORIGINAL_REQUEST §R1 |
| 3 | Swappable AI Container | Service registry enabling runtime injection and test overrides | M1 | ORIGINAL_REQUEST §R6 |
| 4 | Vector Similarity Search | Cosine similarity ranking compatible with in-memory Mongo test runner | M1 | Survey §1.5 |
| 5 | Configurable Threshold | MATCH_CONFIDENCE_THRESHOLD via env/config (default 0.75) | M1 | ORIGINAL_REQUEST §R2, §R6 |
| 6 | Voice & Text Input Handling | Process text or base64/audio input via STT | M2 | ORIGINAL_REQUEST §R2 |
| 7 | Translation Pipeline | Translate non-English user queries to canonical English | M2 | ORIGINAL_REQUEST §R2 |
| 8 | Vector Matching & Ranking | Rank level1_questions and extract top 3-5 candidates with scores | M2 | ORIGINAL_REQUEST §R2, §R4 |
| 9 | Direct Answer Path | Return answer when confidence >= threshold and intent == direct_answer | M2 | ORIGINAL_REQUEST §R2 |
| 10 | Consultation Question Path | Return diagnostic questions when confidence >= threshold and intent == consultation | M2 | ORIGINAL_REQUEST §R2 |
| 11 | Fallback & Needs Review | Log queries below threshold to needs_review_queries with fallback message | M2 | ORIGINAL_REQUEST §R2 |
| 12 | Session Candidate Logging | Store query, language, inputMode, and top 3-5 candidates in chatbot_sessions | M2 | ORIGINAL_REQUEST §R4 |
| 13 | Click Stats Tracking | Atomically increment clickCount in query_click_stats on question match | M2 | ORIGINAL_REQUEST §R4 |
| 14 | Dual Route Mounting | Mount endpoints at `/chatbot` and `/api/chatbot` | M2 | Survey §1.3 |
| 15 | Consultation Answer Resolution | Match Yes/No answers to branch conditions in consultation_queries | M3 | ORIGINAL_REQUEST §R3 |
| 16 | Personalized Answer Synthesis | Generate personalized answer combining branch template and user query | M3 | ORIGINAL_REQUEST §R3 |
| 17 | Consultation Session Update | Update chatbot_sessions with answers, matched branch, and final answer | M3 | ORIGINAL_REQUEST §R3 |
| 18 | Comprehensive E2E Tests | Supertest suites verifying all endpoints, paths, DB mutations, and edge cases | M4 | ORIGINAL_REQUEST §5 |
| 19 | Threshold Boundary & AI Swap Tests | Verify behavior at 0.6, 0.75, 0.9 thresholds and custom mock injections | M4 | ORIGINAL_REQUEST §6 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | AI Service Abstractions & Vector Utilities (R1, R6) | AI interfaces, mocks, AI container, vector cosine search, chatbotConfig | Survey completed | DONE (`backend/src/services/ai/`, `vectorSimilarity.ts`) |
| 2 | Query Pipeline & Session Analytics (R2, R4) | Query pipeline service, controller, routes, session/needs_review/click_stats logging | M1 | DONE (`chatbotService.ts`, `chatbotController.ts`, `chatbotRoutes.ts`) |
| 3 | Consultation Answer Resolution (R3, R4) | Consultation answer branching, personalization, session completion | M1, M2 | DONE (`consultationService.ts`, `/chatbot/consultation-answer`) |
| 4 | Comprehensive E2E Tests & Adversarial Verification (R5, R6) | Test fixtures, E2E tests, boundary & adversarial tests, passing npm test | M1, M2, M3 | DONE (6 test suites, 99/99 tests pass, clean build) |

## Interface Contracts

### AI Service Interfaces (`backend/src/services/ai/types.ts`)
```typescript
export interface ILLMService {
  translateToEnglish(text: string, sourceLanguage?: string): Promise<{ translatedText: string; detectedLanguage: string }>;
  generateAnswer(prompt: string, context?: Record<string, any>): Promise<string>;
  generatePersonalizedAnswer(params: { originalQuery: string; templateText: string; userLanguage?: string; additionalContext?: Record<string, any> }): Promise<string>;
}

export interface IEmbeddingService {
  generateEmbedding(text: string): Promise<number[]>;
  generateBatchEmbeddings(texts: string[]): Promise<number[][]>;
}

export interface ISTTService {
  transcribeAudio(audioData: Buffer | string, mimeType?: string): Promise<{ text: string; language?: string }>;
}

export interface ITTSService {
  synthesizeSpeech(text: string, voiceOptions?: Record<string, any>): Promise<{ audioBuffer: Buffer; mimeType: string }>;
}
```

### Config (`backend/src/config/chatbotConfig.ts`)
```typescript
export interface IChatbotConfig {
  matchConfidenceThreshold: number; // default 0.75
  topCandidatesCount: number; // default 5 (min 3, max 5)
  fallbackMessage: string;
}
```

### Query Endpoint Contract (`POST /chatbot/query` & `POST /api/chatbot/query`)
- **Request Body**:
  ```json
  {
    "text": "How do I treat a mild headache?",
    "audio": "base64...", // optional if text not provided
    "mimeType": "audio/webm", // optional
    "language": "hi", // optional
    "intent": "direct_answer" | "consultation", // required
    "userId": "optional_user_object_id",
    "userEmail": "optional@example.com"
  }
  ```
- **Response (Confident Direct Answer)**:
  ```json
  {
    "success": true,
    "sessionId": "65f0...",
    "matchConfident": true,
    "confidenceScore": 0.88,
    "matchedLevel1Question": {
      "id": "65f1...",
      "canonicalQuestionText": "Headache remedies"
    },
    "answer": {
      "id": "65f2...",
      "answerText": "...",
      "dosageInstructions": "...",
      "homeRemedyText": "...",
      "safetyDisclaimerText": "..."
    },
    "matchCandidates": [
      { "level1QuestionId": "65f1...", "canonicalQuestionText": "...", "score": 0.88 }
    ]
  }
  ```
- **Response (Confident Consultation)**:
  ```json
  {
    "success": true,
    "sessionId": "65f0...",
    "matchConfident": true,
    "confidenceScore": 0.85,
    "matchedLevel1Question": { "id": "65f1...", "canonicalQuestionText": "..." },
    "consultation": {
      "consultationQueryId": "65f3...",
      "diagnosticQuestions": [
        { "id": "q1", "questionText": "Is the pain throbbing?" },
        { "id": "q2", "questionText": "Is there nausea?" }
      ]
    },
    "matchCandidates": [...]
  }
  ```
- **Response (Fallback / Low Confidence < 0.75)**:
  ```json
  {
    "success": true,
    "sessionId": "65f0...",
    "matchConfident": false,
    "confidenceScore": 0.42,
    "message": "We could not find a confident match for your query. Our medical team has been notified to review this question.",
    "needsReviewId": "65f4...",
    "matchCandidates": [...]
  }
  ```

### Consultation Resolution Endpoint (`POST /chatbot/consultation-answer` & `POST /api/chatbot/consultation-answer`)
- **Request Body**:
  ```json
  {
    "sessionId": "65f0...",
    "answers": {
      "q1": "yes",
      "q2": "no"
    } // or array of { questionId, answer }
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "sessionId": "65f0...",
    "matchedBranch": {
      "conditions": { "q1": "yes", "q2": "no" },
      "resolvedAnswerId": "65f5..."
    },
    "answer": {
      "id": "65f5...",
      "answerText": "...",
      "personalizedAnswer": "...",
      "dosageInstructions": "...",
      "homeRemedyText": "...",
      "safetyDisclaimerText": "..."
    }
  }
  ```

## Code Layout
- `backend/src/services/ai/types.ts` (interfaces)
- `backend/src/services/ai/mock/mockLLMService.ts`
- `backend/src/services/ai/mock/mockEmbeddingService.ts`
- `backend/src/services/ai/mock/mockSTTService.ts`
- `backend/src/services/ai/mock/mockTTSService.ts`
- `backend/src/services/ai/aiContainer.ts`
- `backend/src/utils/vectorSimilarity.ts`
- `backend/src/config/chatbotConfig.ts`
- `backend/src/services/chatbotService.ts`
- `backend/src/services/consultationService.ts`
- `backend/src/controllers/chatbotController.ts`
- `backend/src/routes/chatbotRoutes.ts`
- `backend/src/app.ts` (route mounting)
- `backend/tests/helpers/chatbotFixtures.ts`
- `backend/tests/chatbot.test.ts`
- `backend/tests/chatbot.adversarial.test.ts`
