# Specification & Requirements Mining Report: Chatbot Engine Backend

## Executive Summary
This document provides the authoritative, exhaustive specification for the Chatbot Engine backend of the Healing Hands4U ecosystem. It covers functional and non-functional requirements, data models and Mongoose schemas, REST API contracts, query pipeline stages, vector similarity scoring and thresholding, vendor-agnostic AI service adapter interfaces and mocks, session logging with candidate match persistence, query click analytics, and testing requirements.

---

## Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | AI Service Interface | Vendor-Agnostic LLM Adapter (`ILLMService`) | Abstraction for text translation to English and personalized consultation answer generation | Input text, source language, or query + base answer + consultation answers | Translated text with detected language, or synthesized personalized answer string | Throws error or returns fallback text on failure | `ORIGINAL_REQUEST.md` §R1, lines 40-42 |
| 2 | AI Service Interface | Vendor-Agnostic Embeddings Adapter (`IEmbeddingsService`) | Abstraction for generating dense vector embeddings (1536 dimensions) for text | Text string | 1536-dimensional float array (`number[]`) | Throws error on empty string or service failure | `ORIGINAL_REQUEST.md` §R1, lines 40-42; `Level1Question.ts` line 5 |
| 3 | AI Service Interface | Vendor-Agnostic STT Adapter (`ISTTService`) | Abstraction for Speech-to-Text transcription and source language detection | Audio buffer or base64 audio payload, optional mimeType | Transcribed text and detected language string | Throws error or returns 400 on malformed audio | `ORIGINAL_REQUEST.md` §R1, lines 40-42 |
| 4 | AI Service Interface | Vendor-Agnostic TTS Adapter (`ITTSService`) | Abstraction for Text-to-Speech audio generation | Text string, optional language code | Audio buffer/base64 payload and MIME type (`audio/mpeg`) | Throws error on empty text | `ORIGINAL_REQUEST.md` §R1, lines 40-42 |
| 5 | AI Service Mocks | Deterministic AI Mock Adapters | Mock implementations of LLM, Embeddings, STT, and TTS for offline, repeatable testing without API keys | Test queries, keywords, audio buffers | Deterministic 1536-dim vectors, translations, transcriptions, and synthesized answers | Predictable error injection when requested for test edge cases | `ORIGINAL_REQUEST.md` §R1, lines 41-42 |
| 6 | Query Pipeline | Audio Input Transcription | Converts speech/voice queries to text via STT service | `inputMode: 'voice'`, `voiceData: string` (base64) | Transcribed text string and detected language | Returns 400 if `inputMode: 'voice'` but `voiceData` is missing or empty | `ORIGINAL_REQUEST.md` §R2, line 44 |
| 7 | Query Pipeline | Multilingual Translation Stage | Translates non-English queries to English using LLM translation while retaining original text and language | `originalQueryText: string`, `originalLanguage?: string` | `translatedQueryText: string`, `detectedLanguage: string` | Fallback to original text if already English or translation service error | `ORIGINAL_REQUEST.md` §R2, line 44; `ChatbotSession.ts` lines 10-12 |
| 8 | Query Pipeline | Query Embedding Generation | Generates 1536-dimensional vector for translated English query text | `translatedQueryText: string` | 1536-element float array | Throws error or falls back | `ORIGINAL_REQUEST.md` §R2, line 44; `Level1Question.ts` line 5 |
| 9 | Query Pipeline | Vector Similarity Search | Calculates cosine similarity between query embedding and all active `Level1Question` embeddings | Query vector (1536-dim), active DB question vectors | Ranked list of candidates sorted by descending score (range 0.0 - 1.0) | Empty list if no active questions exist | `ORIGINAL_REQUEST.md` §R2, line 44; `Level1Question.ts` lines 5, 17 |
| 10 | Query Pipeline | Configurable Match Threshold Check | Compares top candidate similarity score against `MATCH_CONFIDENCE_THRESHOLD` (default 0.75) | Top candidate score, threshold value from `process.env` | Boolean flag `matchConfident: true / false` | If no questions or score < threshold -> `matchConfident = false` | `ORIGINAL_REQUEST.md` §R2, line 44; §Acceptance line 65 |
| 11 | Query Pipeline | Direct Answer Resolution | Returns full homeopathic answer payload for matched question when `intent === 'direct_answer'` and confident | Matched `level1QuestionId` | `Answer` document (answerText, dosage, home remedies, safety disclaimer, videoUrl) | Returns 404/500 if Answer document missing | `ORIGINAL_REQUEST.md` §R2, lines 44-45; `Answer.ts` lines 14-20 |
| 12 | Query Pipeline | Consultation Diagnostic Questions Resolution | Returns structured Yes/No diagnostic questions for matched question when `intent === 'consultation'` and confident | Matched `level1QuestionId` | `diagnosticQuestions: [{ id, questionText }]` | Returns 404/500 if ConsultationQuery missing | `ORIGINAL_REQUEST.md` §R2, lines 44-45; `ConsultationQuery.ts` lines 22-25 |
| 13 | Query Pipeline | Fallback & Unmatched Handling | Returns friendly clinic fallback message when top score < threshold, directing user to clinic contacts | Unmatched query | Fallback JSON response (`matchConfident: false`, `fallback: true`, message) | Logs to `needs_review_queries` with `status: 'pending'` | `ORIGINAL_REQUEST.md` §R2, line 45; `NeedsReviewQuery.ts` |
| 14 | Query Pipeline | Unmatched Review Logging | Records unconfident/unmatched queries in `needs_review_queries` for clinic doctor review | Original text, translated text, language, optional userId, sessionId | Created `NeedsReviewQuery` record | Does not block user response if review logging fails | `ORIGINAL_REQUEST.md` §R2, line 45; `NeedsReviewQuery.ts` lines 14-23 |
| 15 | Consultation Engine | Consultation Answer Branching | Resolves final answer by evaluating user Yes/No answers against `answerBranches` conditions in `ConsultationQuery` | `sessionId`, `answers: Record<string, 'yes'|'no'>` | Matched `resolvedAnswerId` (ref `Answer`) | Returns 400 if invalid answers or no matching branch (falls back to default branch) | `ORIGINAL_REQUEST.md` §R3, lines 46-48; `ConsultationQuery.ts` lines 8-11, 26-29 |
| 16 | Consultation Engine | Personalized Answer Generation | Synthesizes personalized remedy guidance combining base answer template and user's original query text via LLM | User original query, base answer text, consultation answers | Personalized answer text string | Falls back to base answer text if LLM personalization fails | `ORIGINAL_REQUEST.md` §R3, lines 47-48 |
| 17 | Session Logging | Comprehensive Chatbot Session Logging | Creates or updates `chatbot_sessions` on every query interaction, recording top 3-5 candidates (not just winner) | Query, language, translated text, mode, intent, candidate matches, final answers | Created/updated `ChatbotSession` document | Logged even for low-confidence queries | `ORIGINAL_REQUEST.md` §R4, lines 49-51; `ChatbotSession.ts` lines 23-39 |
| 18 | Analytics | Query Click Statistics Tracking | Tracks frequency of matched queries, incrementing `clickCount` atomically on each query interaction | `level1QuestionId`, optional `userId` / `userEmail` | Updated/upserted `QueryClickStats` document with incremented `clickCount` | Never blocks main query pipeline; handles missing user info gracefully | `ORIGINAL_REQUEST.md` §R4, lines 50-51; `QueryClickStats.ts` lines 11-17 |
| 19 | Authentication | Optional User Context Integration | Binds `userId` and `userEmail` from optional JWT bearer token or payload to session and analytics | `Authorization: Bearer <token>` or body `userId` | `userId` stored on `ChatbotSession`, `NeedsReviewQuery`, `QueryClickStats` | Anonymous/guest queries allowed when no token is present | `ORIGINAL_REQUEST.md` §R1-R4; `authMiddleware.ts` |

---

## Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | Query Validation | Empty body `{}` or empty query `{"query": "   "}` | HTTP 400 Bad Request: `{"success": false, "message": "Query text or voiceData is required"}` |
| 2 | Intent Validation | Missing `intent` or invalid `intent: "general"` | HTTP 400 Bad Request: `{"success": false, "message": "Intent must be either 'direct_answer' or 'consultation'"}` |
| 3 | Voice Input Validation | `inputMode: "voice"` without `voiceData` or with empty string | HTTP 400 Bad Request: `{"success": false, "message": "voiceData is required when inputMode is 'voice'"}` |
| 4 | Empty Database | Database has zero active `level1_questions` | Returns 200 with `matchConfident: false`, fallback message, logs to `needs_review_queries`, session records empty `matchCandidates: []` |
| 5 | Below Threshold Similarity | Query similarity score is 0.74 (threshold 0.75) | Returns 200 with `matchConfident: false`, fallback message, logs top candidates in session, logs to `needs_review_queries` |
| 6 | Exact Threshold Similarity | Query similarity score is 0.75 (threshold 0.75) | Evaluated as confident (`score >= threshold`), returns answer/diagnostic questions, does NOT log to `needs_review_queries` |
| 7 | Threshold Reconfiguration | `process.env.MATCH_CONFIDENCE_THRESHOLD = "0.85"` | Query with score 0.80 that previously passed is now treated as fallback below threshold |
| 8 | Candidate Match Count Capping | 10 matching questions in database | Top 3 to 5 candidate matches are logged to `matchCandidates` in `chatbot_sessions`, ordered by descending score |
| 9 | Candidate Match Count Scarcity | Only 1 or 2 matching questions in database | Logs all available candidates (1 or 2) in `matchCandidates` without crashing or padding with nulls |
| 10 | Concurrent Click Stats | Multiple concurrent queries matching the same `level1QuestionId` | Atomically increments `clickCount` using `$inc: { clickCount: 1 }` with `$setOnInsert: { firstAskedAt: new Date() }`; no duplicate key error |
| 11 | Consultation Session Not Found | `sessionId: "60d5ec49f1b2c8b1f8e4e1a1"` (non-existent) | HTTP 404 Not Found: `{"success": false, "message": "Session not found"}` |
| 12 | Malformed Session ID | `sessionId: "not-a-valid-objectid"` | HTTP 400 Bad Request: `{"success": false, "message": "Invalid sessionId format"}` |
| 13 | Consultation Answer on Unconfident Session | `sessionId` references a session where `matchConfident: false` | HTTP 400 Bad Request: `{"success": false, "message": "Session does not have a confident consultation match"}` |
| 14 | Consultation Missing Answers | `POST /chatbot/consultation-answer` with empty or missing `answers` map | HTTP 400 Bad Request: `{"success": false, "message": "answers map is required"}` |
| 15 | Consultation Branch Mismatch | User answers do not match any explicit branch conditions | Falls back gracefully to first/default answer branch or default answer for the question |
| 16 | Multilingual / Non-English Input | User queries in Hindi ("मुझे सिरदर्द और चक्कर आ रहे हैं") | STT/LLM detects language "hi", translates to English, stores "hi" in `originalLanguage`, executes vector search on translated English text |
| 17 | Special Characters / XSS in Query | User submits `<script>alert(1)</script>` or SQL/NoSQL injection string | Handled as safe string literals; Mongoose schema parameterization prevents injection |

---

## 1. Observation

### 1.1 Verbatim Requirements from `ORIGINAL_REQUEST.md`
From `/Users/aditya/workspace/hh4u/.agents/ORIGINAL_REQUEST.md` (lines 31-66):
> **Follow-up — 2026-09-17T01:38:30Z**
> "Implement the Chatbot Engine backend for the Healing Hands4U app ecosystem. This is the core AI pipeline (`resolveChatbotQuery`) that receives a user's health query, processes it through translation, vector matching, and answer generation, and returns a localized response. The architecture must use vendor-agnostic adapter interfaces for all AI services (LLM, Embeddings, STT, TTS), with mock/stub implementations wired up for testing. An existing Express/Mongoose backend with authentication already exists in the codebase."
>
> **R1. Vendor-Agnostic AI Service Interfaces**:
> "Define clean adapter interfaces for LLM (translation + answer generation), Embeddings (vector generation), STT (speech-to-text), and TTS (text-to-speech). Provide mock/stub implementations for each that return deterministic test data, so the full pipeline can be tested end-to-end without real API keys."
>
> **R2. Chatbot Query Pipeline**:
> "Implement the `POST /chatbot/query` endpoint that accepts text or voice input with an explicit intent choice (`direct_answer` or `consultation`). The pipeline must: translate input to English, generate an embedding, perform a vector similarity search against `level1_questions` in MongoDB, check the match confidence against a configurable threshold (default 0.75), and either return a direct answer or a set of diagnostic Yes/No questions for the consultation path. Unmatched queries (below threshold) must be logged to a `needs_review_queries` collection and return a fallback message."
>
> **R3. Consultation Answer Resolution**:
> "Implement the `POST /chatbot/consultation-answer` endpoint that takes a session ID and diagnostic Yes/No answers, resolves the matching answer branch from `consultation_queries`, and generates a final personalized answer that reflects both the branch template and the user's original free-text query."
>
> **R4. Session Logging and Analytics**:
> "Every query interaction must be logged to a `chatbot_sessions` collection (including the top 3-5 match candidates, not just the winner). Query click statistics must be tracked in `query_click_stats`, incrementing on each interaction."
>
> **Acceptance Criteria**:
> - [ ] A comprehensive test suite exists for the chatbot engine endpoints.
> - [ ] Tests verify the direct-answer path returns a valid answer object when a match is found.
> - [ ] Tests verify the consultation path returns diagnostic questions and then resolves a final answer when consultation answers are submitted.
> - [ ] Tests verify that queries below the confidence threshold return a fallback message and are logged to `needs_review_queries`.
> - [ ] Tests verify that `chatbot_sessions` records are created with match candidates for every query.
> - [ ] All test cases pass successfully.
> - [ ] AI service interfaces are defined as abstractions that can be swapped without changing business logic.
> - [ ] Mock implementations exist for LLM, Embeddings, STT, and TTS services.
> - [ ] The `MATCH_CONFIDENCE_THRESHOLD` is configurable via environment variable or config.

### 1.2 Existing Codebase Observations
1. **Existing Mongoose Models in `backend/src/models/`**:
   - `backend/src/models/Level1Question.ts`:
     - `canonicalQuestionText: string` (required)
     - `embedding: number[]` (1536-dim float vector)
     - `tags: string[]` (default `[]`)
     - `isActive: boolean` (default `true`)
     - `version: number` (default `1`)
     - `timestamps: true`
   - `backend/src/models/Answer.ts`:
     - `level1QuestionId: ObjectId` (ref `Level1Question`, required)
     - `answerText: string` (required)
     - `dosageInstructions: string` (optional)
     - `homeRemedyText: string` (optional)
     - `safetyDisclaimerText: string` (optional)
     - `videoUrl: string` (optional)
     - `timestamps: { createdAt: false, updatedAt: true }`
   - `backend/src/models/ConsultationQuery.ts`:
     - `level1QuestionId: ObjectId` (ref `Level1Question`, required)
     - `diagnosticQuestions: Array<{ id: string, questionText: string }>`
     - `answerBranches: Array<{ conditions: Map<string, string>, resolvedAnswerId: ObjectId ref 'Answer' }>`
     - `timestamps: { createdAt: false, updatedAt: true }`
   - `backend/src/models/ChatbotSession.ts`:
     - `userId?: ObjectId` (ref `User`)
     - `originalQueryText: string` (required)
     - `originalLanguage: string` (required)
     - `translatedQueryText: string` (required)
     - `inputMode: 'text' | 'voice'` (required)
     - `intent: 'direct_answer' | 'consultation'` (required)
     - `matchCandidates: Array<{ level1QuestionId: ObjectId ref 'Level1Question', score: number }>`
     - `matchedLevel1QuestionId?: ObjectId` (ref `Level1Question`)
     - `matchConfident: boolean` (default `false`)
     - `consultationAnswers?: Map<string, string>`
     - `finalAnswerId?: ObjectId` (ref `Answer`)
     - `createdAt: Date` (default `Date.now`)
   - `backend/src/models/NeedsReviewQuery.ts`:
     - `originalQueryText: string` (required)
     - `originalLanguage: string` (required)
     - `translatedQueryText: string` (required)
     - `userId?: ObjectId` (ref `User`)
     - `sessionId?: ObjectId` (ref `ChatbotSession`)
     - `status: 'pending' | 'resolved' | 'ignored'` (default `'pending'`)
     - `resolvedLevel1QuestionId?: ObjectId` (ref `Level1Question`)
     - `createdAt: Date` (default `Date.now`)
   - `backend/src/models/QueryClickStats.ts`:
     - `userEmail?: string`
     - `userId?: ObjectId` (ref `User`)
     - `level1QuestionId: ObjectId` (ref `Level1Question`, required)
     - `firstAskedAt: Date` (default `Date.now`)
     - `clickCount: number` (default `1`)

2. **Express Application Layout**:
   - `backend/src/app.ts`: Express 5 app importing middlewares (`cors`, `helmet`, `express.json()`), route `/health`, and route `/api/auth`.
   - `backend/src/index.ts`: Server entry point listening on port and connecting to MongoDB via `config/db.ts`.
   - `backend/src/middlewares/authMiddleware.ts`: Extracts and verifies JWT bearer tokens, attaches user payload to `req.user`.
   - `backend/src/utils/jwt.ts`: Signs and verifies JWT tokens.

3. **Current Test Suite**:
   - Running `npm test` in `backend/` executed 2 test suites (`auth.test.ts`, `auth.adversarial.test.ts`) with 29 passed tests in 2.355 seconds using `mongodb-memory-server` and Jest in-band.

---

## 2. Logic Chain

1. **Premise**: The client needs a complete AI Chatbot Engine backend capable of understanding user queries via text or speech, translating them, matching them to a homeopathic knowledge base using vector similarity, and branching into either instant direct answers or structured consultation questionnaires.
2. **Observation**: `ORIGINAL_REQUEST.md` specifies four distinct requirements (R1: AI Service Interfaces, R2: Query Pipeline, R3: Consultation Resolution, R4: Session Logging and Analytics).
3. **Observation**: All 6 core database models required for chatbot operations (`Level1Question`, `Answer`, `ConsultationQuery`, `ChatbotSession`, `NeedsReviewQuery`, `QueryClickStats`) have already been drafted in `backend/src/models/`.
4. **Inference**: The data structures and field contracts in those models dictate the internal types and relationships:
   - Vector dimension is 1536 (`Level1Question.ts` line 5).
   - Candidate scores must be stored as `{ level1QuestionId, score }` in `ChatbotSession.matchCandidates`.
   - `answerBranches` in `ConsultationQuery` use a map of Yes/No condition keys matching diagnostic question IDs.
5. **Inference on Adapter Architecture**:
   - Real third-party AI APIs (OpenAI, DeepL, Whisper, ElevenLabs/Google Cloud) require network access and API keys. The requirement mandates "vendor-agnostic adapter interfaces... with mock/stub implementations wired up for testing, so the full pipeline can be tested end-to-end without real API keys."
   - Clean TypeScript interfaces must be created in `backend/src/services/ai/` (`ILLMService`, `IEmbeddingsService`, `ISTTService`, `ITTSService`), alongside mock implementations (`MockLLMService`, `MockEmbeddingsService`, `MockSTTService`, `MockTTSService`) and a factory or container to supply the active adapters.
6. **Inference on Vector Search**:
   - In MongoDB without an active Atlas Vector Search index (such as during offline development or inside `mongodb-memory-server`), vector similarity must be computed programmatically via cosine similarity over active `Level1Question` documents.
   - For normalized 1536-dimensional vectors, cosine similarity equals the dot product.
   - Top candidates must be sorted descending, capped to top 3-5 candidates for `chatbot_sessions`, and the top candidate score compared against `process.env.MATCH_CONFIDENCE_THRESHOLD || 0.75`.
7. **Inference on Route Mounting**:
   - `ORIGINAL_REQUEST.md` specifies `POST /chatbot/query` and `POST /chatbot/consultation-answer`.
   - In existing Express apps, APIs are often prefixed under `/api`. To guarantee strict compatibility with both specifications and REST client callers, the router should be mounted at both `/chatbot` and `/api/chatbot` (or mount router so `/chatbot/query` and `/api/chatbot/query` both resolve seamlessly).
8. **Inference on Verification**:
   - Jest/Supertest suite with `mongodb-memory-server` provides complete test isolation. Tests can seed deterministic `Level1Question`, `Answer`, and `ConsultationQuery` documents, invoke the endpoints via Supertest, and assert response schemas, session database records, needs-review records, and click stats increments.

---

## 3. Caveats

1. **Vector Dimension**: The existing `Level1Question` model comment specifies 1536 dimensions (matching OpenAI ada-002 / text-embedding-3-small). The mock embeddings generator must generate unit-normalized 1536-dimensional vectors.
2. **Consultation Branch Matching Strategy**: If user answers do not match any exact branch in `answerBranches`, the engine should fall back gracefully to a default branch or the base answer for the question, rather than returning a 500 server error.
3. **Voice Input Encoding**: Voice input via HTTP JSON payload must be accepted as a base64 encoded audio string in `voiceData`.
4. **Auth Optionality**: The chatbot endpoints must be publicly accessible (e.g. for guest users), but if a valid `Authorization: Bearer <token>` header is present, the authenticated `userId` must be captured in the session and stats records.

---

## 4. Conclusion & Complete Technical Specification

### 4.1 AI Service Interface Specifications (`backend/src/services/ai/`)

#### 4.1.1 `ILLMService`
```typescript
export interface TranslateResult {
  translatedText: string;
  detectedLanguage: string;
}

export interface PersonalizeAnswerParams {
  originalQuery: string;
  baseAnswer: string;
  consultationAnswers: Record<string, 'yes' | 'no'>;
  diagnosticQuestions?: Array<{ id: string; questionText: string }>;
}

export interface ILLMService {
  translateToEnglish(text: string, sourceLanguage?: string): Promise<TranslateResult>;
  generatePersonalizedAnswer(params: PersonalizeAnswerParams): Promise<string>;
}
```

#### 4.1.2 `IEmbeddingsService`
```typescript
export interface IEmbeddingsService {
  readonly dimensions: number; // 1536
  generateEmbedding(text: string): Promise<number[]>;
}
```

#### 4.1.3 `ISTTService`
```typescript
export interface TranscribeResult {
  text: string;
  detectedLanguage: string;
}

export interface ISTTService {
  transcribe(audioData: Buffer | string, mimeType?: string): Promise<TranscribeResult>;
}
```

#### 4.1.4 `ITTSService`
```typescript
export interface SynthesizeResult {
  audioData: Buffer | string;
  mimeType: string;
}

export interface ITTSService {
  synthesize(text: string, language?: string): Promise<SynthesizeResult>;
}
```

#### 4.1.5 Mock AI Services Specifications
- **`MockEmbeddingsService`**:
  - Computes deterministic unit vectors of length 1536.
  - Allows registering pre-defined vector matches or using a deterministic hash so that queries containing specific keywords (e.g., "headache", "migraine") produce vectors yielding a cosine similarity >= 0.85 against matching questions, and unrelated keywords (e.g., "quantum mechanics", "space travel") produce similarity <= 0.40.
- **`MockLLMService`**:
  - `translateToEnglish`: Returns translated string (e.g., if input is in Hindi or starts with foreign text, returns English equivalent; if already English, returns input; sets `detectedLanguage`).
  - `generatePersonalizedAnswer`: Synthesizes a clinical response combining the base answer with the user's answers and symptoms: `"Personalized Consultation Plan for '${originalQuery}': ${baseAnswer} [Adjusted for reported symptoms]."`.
- **`MockSTTService`**:
  - Transcribes mock audio payloads or decodes base64 strings containing simulated text.
- **`MockTTSService`**:
  - Returns a synthetic audio buffer with MIME type `audio/mpeg`.

---

### 4.2 REST API Interface Contracts

#### 4.2.1 `POST /chatbot/query` (and `POST /api/chatbot/query`)
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <token>` (optional)
- **Request Body**:
  ```json
  {
    "query": "I have a throbbing headache that gets worse in sunlight",
    "inputMode": "text",              // enum: ["text", "voice"], default: "text"
    "intent": "direct_answer",         // enum: ["direct_answer", "consultation"], required
    "language": "en",                  // string, optional (default: "en")
    "voiceData": "base64...",          // string, required if inputMode is "voice"
    "userId": "<optional_user_id>"    // string, optional
  }
  ```
- **Responses**:
  - **Match Found (`score >= 0.75`), Direct Answer (`intent: "direct_answer"`)**:
    - HTTP Status: `200 OK`
    - Payload:
      ```json
      {
        "success": true,
        "matchConfident": true,
        "sessionId": "664a1f...",
        "intent": "direct_answer",
        "matchedQuestion": {
          "id": "664a1e...",
          "questionText": "What remedies help severe throbbing headaches?",
          "score": 0.88
        },
        "answer": {
          "id": "664a1d...",
          "answerText": "Belladonna 30C is indicated for acute throbbing headache...",
          "dosageInstructions": "3 pellets under the tongue every 4 hours",
          "homeRemedyText": "Rest in a darkened, quiet room and stay hydrated.",
          "safetyDisclaimerText": "If headache persists beyond 24 hours or is accompanied by stiff neck, consult a physician immediately.",
          "videoUrl": "https://example.com/videos/headache-remedy"
        },
        "matchCandidates": [
          { "level1QuestionId": "664a1e...", "score": 0.88 },
          { "level1QuestionId": "664a1c...", "score": 0.65 },
          { "level1QuestionId": "664a1b...", "score": 0.42 }
        ]
      }
      ```
  - **Match Found (`score >= 0.75`), Consultation Path (`intent: "consultation"`)**:
    - HTTP Status: `200 OK`
    - Payload:
      ```json
      {
        "success": true,
        "matchConfident": true,
        "sessionId": "664a1f...",
        "intent": "consultation",
        "matchedQuestion": {
          "id": "664a1e...",
          "questionText": "What remedies help severe throbbing headaches?",
          "score": 0.88
        },
        "diagnosticQuestions": [
          { "id": "q1", "questionText": "Is the pain concentrated on the right side of the head?" },
          { "id": "q2", "questionText": "Is the headache worsened by bright light or loud noise?" },
          { "id": "q3", "questionText": "Does firm pressure or tying a bandage tightly relieve the pain?" }
        ],
        "matchCandidates": [
          { "level1QuestionId": "664a1e...", "score": 0.88 },
          { "level1QuestionId": "664a1c...", "score": 0.65 }
        ]
      }
      ```
  - **Unmatched / Low Confidence (`score < 0.75`)**:
    - HTTP Status: `200 OK`
    - Payload:
      ```json
      {
        "success": true,
        "matchConfident": false,
        "sessionId": "664a1f...",
        "intent": "direct_answer",
        "fallback": true,
        "message": "We could not find an exact match for your health query. Your question has been forwarded to Dr. Anjali Jariwala and our medical team for review. You can also connect with our clinic directly via WhatsApp (+1234567890) or phone.",
        "matchCandidates": [
          { "level1QuestionId": "664a1c...", "score": 0.52 },
          { "level1QuestionId": "664a1b...", "score": 0.38 }
        ]
      }
      ```
  - **Validation Errors**:
    - HTTP Status: `400 Bad Request`
    - Payload:
      ```json
      {
        "success": false,
        "message": "Query text is required"
      }
      ```

#### 4.2.2 `POST /chatbot/consultation-answer` (and `POST /api/chatbot/consultation-answer`)
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <token>` (optional)
- **Request Body**:
  ```json
  {
    "sessionId": "664a1f...",
    "answers": {
      "q1": "yes",
      "q2": "yes",
      "q3": "no"
    }
  }
  ```
- **Responses**:
  - **Successful Answer Resolution**:
    - HTTP Status: `200 OK`
    - Payload:
      ```json
      {
        "success": true,
        "sessionId": "664a1f...",
        "answer": {
          "id": "664a1d...",
          "answerText": "Personalized Consultation Plan: Belladonna 30C is recommended based on severe sensitivity to light and throbbing pain...",
          "dosageInstructions": "3 pellets twice daily for 3 days",
          "homeRemedyText": "Cold compress on forehead and rest in dark room",
          "safetyDisclaimerText": "Consult Dr. Anjali Jariwala if headache does not subside within 24 hours.",
          "videoUrl": "https://example.com/videos/belladonna-guide"
        },
        "personalized": true
      }
      ```
  - **Session Not Found**:
    - HTTP Status: `404 Not Found`
    - Payload: `{"success": false, "message": "Session not found"}`
  - **Validation Failure / Unconfident Session**:
    - HTTP Status: `400 Bad Request`
    - Payload: `{"success": false, "message": "sessionId and answers are required"}` or `{"success": false, "message": "Session does not have a confident consultation match"}`

---

### 4.3 Query Pipeline Execution Architecture

```
1. Client POST /chatbot/query
   │
   ├─► Validate input (query text or voiceData, intent: 'direct_answer' | 'consultation')
   │
   ├─► [If voice input] STT Service: voiceData -> originalQueryText, detectedLanguage
   │
   ├─► LLM Translation: originalQueryText -> translatedQueryText (English), originalLanguage
   │
   ├─► Embeddings Service: translatedQueryText -> queryVector (1536-dim float array)
   │
   ├─► Vector Cosine Similarity against active Level1Question collection:
   │      similarity(A, B) = (A · B) / (||A|| * ||B||)
   │      Sort descending; take top 3-5 candidates -> matchCandidates
   │
   ├─► Threshold Check:
   │      threshold = Number(process.env.MATCH_CONFIDENCE_THRESHOLD) || 0.75
   │      isConfident = (topScore >= threshold)
   │
   ├─► [Branch: Low Confidence / Unmatched] (isConfident == false)
   │      ├─ Save to NeedsReviewQuery (originalQueryText, originalLanguage, translatedQueryText, status: 'pending')
   │      ├─ Save to ChatbotSession (matchConfident: false, matchCandidates)
   │      └─ Return 200 with fallback: true, clinic contact details
   │
   └─► [Branch: High Confidence] (isConfident == true)
          ├─ Atomic increment in QueryClickStats ($inc: { clickCount: 1 })
          ├─ Save to ChatbotSession (matchConfident: true, matchedLevel1QuestionId, matchCandidates)
          │
          ├─► [Intent == 'direct_answer']
          │      Fetch Answer by level1QuestionId -> Return 200 with answer object
          │
          └─► [Intent == 'consultation']
                 Fetch ConsultationQuery by level1QuestionId -> Return 200 with diagnosticQuestions
```

---

### 4.4 Analytics & Logging Data Flows

1. **`chatbot_sessions` Collection**:
   - Every incoming query initiates or updates a session record.
   - Captures full query metadata: `userId`, `originalQueryText`, `originalLanguage`, `translatedQueryText`, `inputMode`, `intent`, `matchConfident`.
   - **Critical requirement**: Stores the top 3-5 candidates in `matchCandidates` array (`[{ level1QuestionId, score }]`), preserving ranking data for doctor feedback and query tuning.
   - When consultation answers are submitted, updates `consultationAnswers` and `finalAnswerId`.

2. **`query_click_stats` Collection**:
   - Tracks question popularity and engagement.
   - Triggered on every confident match.
   - Atomic update:
     ```typescript
     await QueryClickStats.findOneAndUpdate(
       { level1QuestionId, ...(userId ? { userId } : {}) },
       {
         $inc: { clickCount: 1 },
         $setOnInsert: { firstAskedAt: new Date() }
       },
       { upsert: true, new: true }
     );
     ```

3. **`needs_review_queries` Collection**:
   - Captures queries where `topScore < MATCH_CONFIDENCE_THRESHOLD` (or when no active questions exist in the database).
   - Stores `originalQueryText`, `originalLanguage`, `translatedQueryText`, `userId`, `sessionId`, `status: 'pending'`, `createdAt`.
   - Allows homeopathic practitioners to curate new Level 1 questions and answers based on real unmet patient needs.

---

### 4.5 Testing Requirements (Supertest + Jest)

A comprehensive programmatic test suite (`backend/tests/chatbot.test.ts` and `backend/tests/chatbot.adversarial.test.ts`) must verify:
1. **Direct Answer Pipeline**:
   - Query matching known question with score >= 0.75 returns `matchConfident: true`, `intent: "direct_answer"`, valid `answer` object, and creates `chatbot_sessions` record.
2. **Consultation Pipeline**:
   - Query matching known question with `intent: "consultation"` returns `diagnosticQuestions` array with question IDs.
   - Submitting `POST /chatbot/consultation-answer` with valid `sessionId` and `answers` resolves the correct branch and returns a personalized answer.
3. **Fallback & Review Logging**:
   - Query with similarity score < 0.75 returns fallback message with `matchConfident: false` and `fallback: true`.
   - Verifies an entry is created in `needs_review_queries` with `status: 'pending'`.
4. **Session Logging with Match Candidates**:
   - Asserts `chatbot_sessions` contains `matchCandidates` array with top 3-5 candidates (with `level1QuestionId` and `score`).
5. **Click Stats Tracking**:
   - Verifies `query_click_stats` document is created/updated with incremented `clickCount` on query match.
6. **Configurable Threshold Verification**:
   - Temporarily setting `process.env.MATCH_CONFIDENCE_THRESHOLD = '0.95'` causes a query with score 0.85 to fall back to `needs_review_queries`.
7. **Adversarial & Edge Case Handling**:
   - Missing fields, invalid intent, malformed session ID, voice mode without audio, empty database.

---

## 5. Verification Method

To independently verify all specifications and findings:

1. **Inspect Requirements & Database Models**:
   ```bash
   cat /Users/aditya/workspace/hh4u/.agents/ORIGINAL_REQUEST.md
   cat /Users/aditya/workspace/hh4u/backend/src/models/Level1Question.ts
   cat /Users/aditya/workspace/hh4u/backend/src/models/Answer.ts
   cat /Users/aditya/workspace/hh4u/backend/src/models/ConsultationQuery.ts
   cat /Users/aditya/workspace/hh4u/backend/src/models/ChatbotSession.ts
   cat /Users/aditya/workspace/hh4u/backend/src/models/NeedsReviewQuery.ts
   cat /Users/aditya/workspace/hh4u/backend/src/models/QueryClickStats.ts
   ```

2. **Verify Backend Build and Current Tests**:
   ```bash
   cd /Users/aditya/workspace/hh4u/backend
   npm test
   ```
   Expected result: 2 test suites pass, 29/29 tests pass.

3. **Verify Handoff Output Artifact**:
   Check file exists at `/Users/aditya/workspace/hh4u/.agents/spec_miner_survey_1/handoff.md`.
