# Comprehensive Architecture & Investigation Report: Backend AI Services & Atlas Vector Integration

**Date**: 2026-09-20T17:28:00Z  
**Agent**: `explorer_survey_1` (teamwork_preview_explorer)  
**Target Repository**: `/Users/aditya/workspace/hh4u`  
**Integrity Mode**: read-only exploration  

---

## Executive Summary

This investigation analyzed the Node.js backend AI service architecture, environment variable lifecycle, Google Gemini SDK integrations, MongoDB Atlas Vector Search indexing, and query pipeline execution in Healing Hands4U. 

We uncovered four critical structural issues preventing live Gemini services and Atlas Vector Search from operating:
1. **Import-Time Environment Variable Race Condition**: `dotenv.config()` is executed at line 9 of `backend/src/app.ts`, *after* `routes/chatbotRoutes` is imported. Because `aiContainer.ts` evaluates `process.env.GEMINI_API_KEY` eagerly at module evaluation time, `activeServices` permanently defaults to `MockLLMService` and `MockEmbeddingService`.
2. **Model Deprecations & 404 ApiErrors in `@google/genai`**: 
   - `GeminiLLMService.ts` hardcodes `gemini-2.5-flash`, which is discontinued for new users and returns HTTP 404 (`models/gemini-2.5-flash is no longer available to new users. Please update your code to use models/gemini-3.6-flash`).
   - `GeminiEmbeddingService.ts` hardcodes `text-embedding-004`, which is not available in the API version and returns HTTP 404 (`models/text-embedding-004 is not found for API version v1beta`).
   - Tested live on the user's API key: `gemini-3.6-flash` (or `gemini-flash-latest`) and `gemini-embedding-2` are live and responsive.
3. **Vector Search Dimensionality Mismatch (1536 vs 768)**:
   - The live MongoDB Atlas cluster `hh4u.level1questions` has an active, queryable vector index named `vector_index` with `numDimensions: 1536` indexing 184 documents that each contain 1536-dimensional vectors.
   - However, `vectorSearchService.ts` has `export const EMBEDDING_DIMENSION = 768;` and `GeminiEmbeddingService.ts` declared `dimensions = 768`.
   - When a 768-dimensional vector is queried against Atlas `$vectorSearch`, MongoDB throws: `PlanExecutor error during aggregation :: caused by :: vector field is indexed with 1536 dimensions but queried with 768`, forcing an uncalibrated in-memory fallback.
   - Live testing proved that `gemini-embedding-2` supports `config: { outputDimensionality: 1536 }`, perfectly matching the 1536-dim Atlas index and documents without requiring DB re-indexing.
4. **Bypass of Real LLM in Direct Answers & Frontend Contract Mismatch**:
   - In `chatbotService.ts`, when a confident match is found in Level 1 questions and `answerDoc` exists, the service returns static DB text `answerDoc.answerText` directly without calling `ai.llm.generateAnswer`. Real LLM completion was only invoked if `answerDoc` was missing.
   - In the Android app (`ChatbotAnswerScreen.kt`), a hardcoded string `"Here is your personalized homeopathic healing regimen curated by Dr. Anjali Jariwala:"` is embedded in the `ChatBubble`, and the Retrofit `ChatbotQueryResponse.answer` is typed as a flat `String?`, causing Gson deserialization crashes against the backend's structured `answer` object.

---

## 1. AI Service Architecture & Container Examination

### 1.1 `backend/src/services/ai/aiContainer.ts`
- **Location**: `backend/src/services/ai/aiContainer.ts`
- **Structure**:
  ```typescript
  export interface AIServices {
    llm: ILLMService;
    embedding: IEmbeddingService;
    stt: ISTTService;
    tts: ITTSService;
  }

  export function createDefaultAIServices(): AIServices {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      console.log("Using Google Gemini AI services");
      return {
        llm: new GeminiLLMService(apiKey),
        embedding: new GeminiEmbeddingService(apiKey),
        stt: new MockSTTService(),
        tts: new MockTTSService(),
      };
    }
    console.log("Using Mock AI services (No GEMINI_API_KEY found)");
    return {
      llm: new MockLLMService(),
      embedding: new MockEmbeddingService(),
      stt: new MockSTTService(),
      tts: new MockTTSService(),
    };
  }

  let activeServices: AIServices = createDefaultAIServices();
  ```
- **Defect in `dist/`**: The pre-built `backend/dist/services/ai/aiContainer.js` in the repository does not even contain the `if (apiKey)` check—it was built from an older revision that unconditionally initialized `MockLLMService` and `MockEmbeddingService`.
- **Module Evaluation Timing**: `activeServices` is initialized as a top-level module statement (`let activeServices: AIServices = createDefaultAIServices()`) without prior `dotenv` initialization.

### 1.2 `backend/src/services/ai/gemini/geminiLLMService.ts`
- **Location**: `backend/src/services/ai/gemini/geminiLLMService.ts`
- **Model**: `private model = 'gemini-2.5-flash'` (Line 6).
- **Methods**:
  - `translateToEnglish(text: string, sourceLanguage?: string): Promise<TranslateResult>`: Uses `this.ai.models.generateContent` with `responseMimeType: 'application/json'`.
  - `generateAnswer(prompt: string, context?: Record<string, any>): Promise<string>`: Appends JSON stringified context to prompt.
  - `generatePersonalizedAnswer(params: PersonalizeAnswerParams): Promise<string>`: Formats prompt with homeopathic clinic persona and calls `generateContent`.
- **Runtime Error**: When invoked with the active `GEMINI_API_KEY`, calls fail with:
  ```json
  {"error":{"code":404,"message":"This model models/gemini-2.5-flash is no longer available to new users. Please update your code to use models/gemini-3.6-flash for the latest features and improvements. We recommend you to use the Interactions API.","status":"NOT_FOUND"}}
  ```
- **Verification via Live API**: Calling `gemini-3.6-flash` or `gemini-flash-latest` via `@google/genai` succeeds immediately with valid LLM completions.

### 1.3 `backend/src/services/ai/gemini/geminiEmbeddingService.ts`
- **Location**: `backend/src/services/ai/gemini/geminiEmbeddingService.ts`
- **Model**: `private model = 'text-embedding-004'` (Line 6).
- **Dimensions**: `public readonly dimensions: number = 768;` (Line 11).
- **Methods**:
  - `generateEmbedding(text: string): Promise<number[]>`: Calls `this.ai.models.embedContent`.
  - `generateBatchEmbeddings(texts: string[]): Promise<number[][]>`.
- **Runtime Error**: When invoked, calls fail with:
  ```json
  {"error":{"code":404,"message":"models/text-embedding-004 is not found for API version v1beta, or is not supported for embedContent. Call ModelService.ListModels to see the list of available models and their supported methods.","status":"NOT_FOUND"}}
  ```
- **Verification via Live API**: Calling `gemini-embedding-2` succeeds. Furthermore, passing `config: { outputDimensionality: 1536 }` produces an exact 1536-dimensional float vector.

### 1.4 `backend/src/services/ai/mock/`
- `MockLLMService.ts`: Returns deterministic translations for pre-registered Hindi phrases (`मुझे सिरदर्द है` -> `I have a headache`), and fixed template strings:
  - `generateAnswer`: `Guidance for query: "${prompt}". Please consult Dr. Anjali Jariwala for detailed homeopathic follow-up.`
  - `generatePersonalizedAnswer`: `Personalized Homeopathic Plan for "${originalQuery}"...`
- `MockEmbeddingService.ts`: Generates pseudo-random 1536-dimensional unit vectors using Mulberry32 PRNG and word hashing.
- `MockSTTService.ts` / `MockTTSService.ts`: Deterministic stubs for voice (R1 states voice may be ignored/hidden).

---

## 2. Environment Variable Loading & Module Evaluation Lifecycle

### 2.1 The Initialization Trap
In `backend/src/app.ts`:
```typescript
1: import express, { Request, Response, NextFunction } from 'express';
2: import cors from 'cors';
3: import helmet from 'helmet';
4: import dotenv from 'dotenv';
5: import authRoutes from './routes/authRoutes';
6: import chatbotRoutes from './routes/chatbotRoutes';  // <-- Imports chatbotController -> chatbotService -> aiContainer
7: import adminRoutes from './routes/adminRoutes';
8: 
9: dotenv.config(); // <-- TOO LATE! aiContainer has already run createDefaultAIServices()!
```

### 2.2 Proof of Failure
We verified this behavior via Node.js invocation:
```bash
npx ts-node -e '
  const { app } = require("./src/app"); 
  const { getAIServices } = require("./src/services/ai/aiContainer"); 
  console.log("Importing app:", getAIServices().llm.constructor.name);
'
```
**Output**:
```
Using Mock AI services (No GEMINI_API_KEY found)
◇ injected env (6) from .env
Importing app: MockLLMService
```
The console trace proves that `aiContainer.ts` executed before `dotenv.config()`, finding `process.env.GEMINI_API_KEY === undefined` and permanently cementing `MockLLMService`.

---

## 3. MongoDB Atlas Vector Search Integration & Dimensionality Analysis

### 3.1 Live Atlas State Inspection
Direct inspection of the MongoDB Atlas cluster (`test1magnitude_db_user` @ `cluster0.iifejq3.mongodb.net`, database `hh4u`) confirmed:
1. Collection: `level1questions` (184 documents).
2. Existing Index:
   ```json
   {
     "name": "vector_index",
     "type": "vectorSearch",
     "status": "READY",
     "queryable": true,
     "latestDefinition": {
       "fields": [
         {
           "type": "vector",
           "path": "embedding",
           "numDimensions": 1536,
           "similarity": "cosine"
         },
         {
           "type": "filter",
           "path": "isActive"
         }
       ]
     }
   }
   ```
3. Existing Documents: Every seeded `Level1Question` has an `embedding` array of exactly **1536** numbers.

### 3.2 The 768-Dim vs 1536-Dim Conflict
In `backend/src/services/vectorSearchService.ts`:
- Line 7: `export const EMBEDDING_DIMENSION = 768; // Gemini text-embedding-004`
- Line 125: `numDimensions: EMBEDDING_DIMENSION`
- Line 227:
  ```typescript
  $vectorSearch: {
    index: VECTOR_INDEX_NAME, // 'vector_index'
    path: 'embedding',
    queryVector: queryEmbedding,
    numCandidates,
    limit: topK,
    filter: { isActive: { $eq: true } },
  }
  ```

When `queryEmbedding` has 768 dimensions and is passed to `$vectorSearch`:
```
PlanExecutor error during aggregation :: caused by :: vector field is indexed with 1536 dimensions but queried with 768
```
This error triggers the `catch` block in `searchLevel1QuestionsDualMode`, forcing execution down to `searchLevel1QuestionsInMemory`. In-memory cosine similarity computes the dot product across mismatched vector lengths (`Math.min(768, 1536)`), severely corrupting similarity scores.

### 3.3 The Solution: Native 1536-Dim Gemini Embeddings
Using `@google/genai`:
```typescript
const response = await this.ai.models.embedContent({
  model: 'gemini-embedding-2',
  contents: text,
  config: { outputDimensionality: 1536 },
});
```
We tested this live on the Atlas cluster. An aggregation query with a 1536-dimensional query vector generated by `gemini-embedding-2` against `vector_index` executed with zero errors and returned top-ranked matches directly from Atlas hardware.

---

## 4. Identification of Stubbed Responses & Mock Fallbacks

### 4.1 Backend Direct Answer Bypass (`chatbotService.ts`)
Lines 164–209 of `chatbotService.ts`:
```typescript
if (input.intent === 'direct_answer') {
  const answerDoc = await Answer.findOne({ level1QuestionId: topCandidate.level1QuestionId });
  ...
  return {
    ...
    answer: answerDoc
      ? {
          id: answerDoc._id.toString(),
          answerText: answerDoc.answerText, // <-- Static DB content! Gemini LLM is never called!
          dosageInstructions: answerDoc.dosageInstructions,
          homeRemedyText: answerDoc.homeRemedyText,
          safetyDisclaimerText: answerDoc.safetyDisclaimerText,
          videoUrl: answerDoc.videoUrl,
        }
      : {
          id: new mongoose.Types.ObjectId().toString(),
          answerText: await ai.llm.generateAnswer(translatedQueryText), // <-- Only called if DB has no answer!
        },
    matchCandidates,
  };
}
```
**Impact**: Because all 184 Level 1 questions have corresponding `Answer` documents in the database, `ai.llm.generateAnswer` is **never** invoked for direct answers. The client receives static Excel text, completely bypassing the LLM.

### 4.2 Hardcoded Android Stubs
1. **`ChatbotAnswerScreen.kt` (Lines 102–106)**:
   ```kotlin
   ChatBubble(
       message = "Here is your personalized homeopathic healing regimen curated by Dr. Anjali Jariwala:",
       isUser = false,
       timestamp = "Just now"
   )
   ```
   Directly violates AC: `returns a dynamically generated answer, rather than the hardcoded "Here is your personalized homeopathic..." stub`.
2. **`ChatbotAnswerScreen.kt` (Lines 113–115)**:
   ```kotlin
   dosage = state.dosage ?: "4 pills, 2 times daily after meals",
   safetyDisclaimer = "If disease does not cure within 2 days then consult doctor right now"
   ```
3. **`ChatbotApi.kt` vs Backend JSON**:
   ```kotlin
   data class ChatbotQueryResponse(
       val success: Boolean,
       val message: String?,
       val answer: String?, // <-- Expects string! Backend returns object { id, answerText, dosageInstructions... }
       ...
   )
   ```
   Because backend returns an object for `answer`, Gson throws `Expected a string but was BEGIN_OBJECT`.

---

## 5. Concrete Recommendations & Wiring Specification

### Recommendation 1: Fix Initialization & Defaulting in `aiContainer.ts`
- Call `dotenv.config()` at the top of `backend/src/services/ai/aiContainer.ts`.
- Implement dynamic / lazy initialization in `getAIServices()`: if `activeServices.llm` is currently a `MockLLMService` but `process.env.GEMINI_API_KEY` is present, dynamically instantiate and swap in `GeminiLLMService` and `GeminiEmbeddingService`.
- In `backend/src/app.ts` and `backend/src/index.ts`, place `import dotenv from 'dotenv'; dotenv.config();` at line 1 before any other local imports.

### Recommendation 2: Update Gemini Service Implementations
1. **`backend/src/services/ai/gemini/geminiLLMService.ts`**:
   - Change model to `gemini-3.6-flash` (or read from `process.env.GEMINI_LLM_MODEL || 'gemini-3.6-flash'`).
   - Enhance `generateAnswer` to accept medical context and generate a complete, empathetic response:
     ```typescript
     async generateAnswer(prompt: string, context?: Record<string, any>): Promise<string> {
       let fullPrompt = `You are an expert, compassionate homeopathic medical assistant representing Dr. Anjali Jariwala at Healing Hands4U.\nUser Query: "${prompt}"\n`;
       if (context && Object.keys(context).length > 0) {
         fullPrompt += `\nClinical Knowledge Base Guidance:\n${JSON.stringify(context, null, 2)}\n`;
       }
       fullPrompt += `\nProvide a clear, reassuring, and structured homeopathic recommendation incorporating the above clinical guidance. Include safety instructions.`;

       const response = await this.ai.models.generateContent({
         model: this.model,
         contents: fullPrompt,
       });
       return response.text || 'Homeopathic guidance is currently unavailable.';
     }
     ```
2. **`backend/src/services/ai/gemini/geminiEmbeddingService.ts`**:
   - Change model to `process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-2'`.
   - Set `public readonly dimensions: number = 1536;`.
   - Pass `config: { outputDimensionality: this.dimensions }` in `embedContent` for both single and batch generation:
     ```typescript
     async generateEmbedding(text: string): Promise<number[]> {
       const response = await this.ai.models.embedContent({
         model: this.model,
         contents: text,
         config: { outputDimensionality: this.dimensions },
       });
       return response.embeddings?.[0]?.values || [];
     }
     ```

### Recommendation 3: Align `vectorSearchService.ts`
- In `backend/src/services/vectorSearchService.ts`:
  - Change `export const EMBEDDING_DIMENSION = 1536;` (from 768).
  - This ensures 100% parity across `GeminiEmbeddingService` (1536), `MockEmbeddingService` (1536), the Atlas index `vector_index` (1536), and all 184 database documents.

### Recommendation 4: Ground Live Gemini Answers in `chatbotService.ts`
- In `backend/src/services/chatbotService.ts`:
  - When `input.intent === 'direct_answer'`:
    Generate a real Gemini completion by synthesizing the user query with the matched `answerDoc`:
    ```typescript
    let finalAnswerText = '';
    if (answerDoc) {
      finalAnswerText = await ai.llm.generateAnswer(translatedQueryText, {
        canonicalQuestion: topCandidate.canonicalQuestionText,
        baseAnswer: answerDoc.answerText,
        remedy: answerDoc.remedyText,
        reason: answerDoc.reasonText,
        dosage: answerDoc.dosageInstructions,
      });
    } else {
      finalAnswerText = await ai.llm.generateAnswer(translatedQueryText);
    }
    ```
  - This guarantees that every direct answer query returns a live, dynamically generated LLM completion from Gemini, while faithfully honoring the clinic's vetted remedy data.

### Recommendation 5: Synchronize Android App DTOs and Remove Stubs
1. In `app/src/main/java/com/healinghands4u/data/remote/ChatbotApi.kt`:
   Define `ChatbotAnswerDto` matching the backend JSON schema:
   ```kotlin
   data class ChatbotAnswerDto(
       val id: String?,
       val answerText: String?,
       val dosageInstructions: String?,
       val homeRemedyText: String?,
       val safetyDisclaimerText: String?,
       val videoUrl: String?
   )

   data class ChatbotQueryResponse(
       val success: Boolean,
       val message: String?,
       val answer: ChatbotAnswerDto?,
       val matchConfident: Boolean?,
       val confidenceScore: Float?,
       val diagnosticQuestions: List<DiagnosticQuestionDto>?
   )
   ```
2. In `ChatbotViewModel.kt`:
   Update state mapping:
   ```kotlin
   val ans = response.answer
   _state.value = ChatbotUiState.Success(
       answerText = ans?.answerText ?: response.message ?: "No remedy found",
       dosage = ans?.dosageInstructions,
       homeRemedy = ans?.homeRemedyText,
       videoUrl = ans?.videoUrl
   )
   ```
3. In `ChatbotAnswerScreen.kt`:
   Replace the hardcoded `message = "Here is your personalized homeopathic..."` in `ChatBubble` with the dynamic message from the backend / LLM response.

---

## 6. Verification Plan & Test Strategy

1. **aiContainer Key Detection Test**:
   Test that when `process.env.GEMINI_API_KEY` is present, `getAIServices().llm instanceof GeminiLLMService` and `getAIServices().embedding instanceof GeminiEmbeddingService`.
2. **Atlas Vector Search Live Integration Test**:
   Query `/api/chatbot/query` with a clinical symptom (e.g. `"throbbing tension headache"`).
   Verify that:
   - Live embedding of 1536 dims is generated via `gemini-embedding-2`.
   - Native Atlas `$vectorSearch` runs without dimension mismatch errors.
   - Top candidate matched is `"What is the recommended homeopathic treatment for tension headaches?"` with score >= 0.75.
3. **Dynamic LLM Completion Test**:
   Verify that `res.body.answer.answerText` contains a unique, generated response rather than the exact raw string from `database-dummy.xlsx` or the mock stub.
4. **Unit / Offline Regression Protection**:
   Ensure `npm test` continues to pass by providing a mechanism to test with mock HTTP or dedicated test keys, avoiding unmocked external API rate limits during local CI.
