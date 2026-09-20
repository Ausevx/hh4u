# Forensic Audit Report: Chatbot Engine Backend

**Work Product**: Chatbot Engine Backend (`backend/src/` & `backend/tests/`)  
**Profile**: General Project  
**Integrity Mode**: Demo (as specified in `ORIGINAL_REQUEST.md` line 36)  
**Auditor**: Forensic Integrity Auditor (`auditor_1`)  
**Date**: 2026-09-17  
**Verdict**: **CLEAN**

---

## 1. Observation

### 1.1 Pre-Populated Artifact Inspection
- Executed: `find /Users/aditya/workspace/hh4u/backend -maxdepth 3 -name '*.log' -o -name '*result*' -o -name '*output*'`
- Result: Only `node_modules/@jest/test-result` was discovered. No pre-populated test result caches, fake logs, or pre-computed assertion artifacts existed in the workspace.

### 1.2 Genuine Logic vs Hardcoding Analysis
1. **`backend/src/utils/vectorSimilarity.ts`**:
   - Lines 14-48: Genuine mathematical cosine similarity implementation:
     ```typescript
     for (let i = 0; i < minLen; i++) {
       dotProduct += vecA[i] * vecB[i];
       normASq += vecA[i] * vecA[i];
       normBSq += vecB[i] * vecB[i];
     }
     const similarity = dotProduct / (Math.sqrt(normASq) * Math.sqrt(normBSq));
     ```
   - Handles dimension mismatches, guards against division by zero (`normASq === 0 || normBSq === 0`), and clamps floating precision to `[-1, 1]`.
   - Lines 55-81: `searchLevel1Questions` issues genuine Mongoose queries `Level1Question.find({ isActive: true })`, computes cosine similarity over embeddings, sorts descending, and returns top-K candidates.
2. **`backend/src/services/chatbotService.ts`**:
   - Zero hardcoded query string branches. An exact grep search for string comparisons `=== '...'` in `backend/src/services/` showed only enum checks (`intent === 'direct_answer'`, `inputMode === 'voice'`, `typeof ... === 'string'`).
   - Line 116: Queries candidates via vector similarity.
   - Lines 128-129: Dynamic threshold evaluation: `topCandidate.score >= config.matchConfidenceThreshold`.
   - Lines 148-159: Atomic analytics increment using `$inc: { clickCount: 1 }` and upsert in `QueryClickStats`.
   - Lines 169-185: Genuine `ChatbotSession` document persistence with `matchCandidates`, `matchedLevel1QuestionId`, and `finalAnswerId`.
   - Lines 276-285: Genuine `NeedsReviewQuery` persistence for low-confidence queries.
3. **`backend/src/services/consultationService.ts`**:
   - Lines 123-156: Genuine dynamic branch evaluation. Iterates through `answerBranches` in `ConsultationQuery`, checking condition key-value pairs against normalized user answers (`answers[key] === expectedVal`).
   - Lines 175-180: LLM personalized answer synthesis combining `session.originalQueryText`, `templateText`, and affirmative symptoms summary.
   - Lines 182-187: Real Mongoose session updates (`session.consultationAnswers = normalizedAnswers; session.finalAnswerId = answerDoc._id; await session.save()`).

### 1.3 Mock Service Authenticity & Generalization
1. **`MockEmbeddingService` (`backend/src/services/ai/mock/mockEmbeddingService.ts`)**:
   - Output dimension: exactly 1536 floats (`dimensions: 1536`).
   - Embeddings are generated deterministically using Mulberry32 PRNG seeded from word token hashes and clinical topic clusters (`headache_remedies`, `allergy_respiratory`, `digestive_health`).
   - Normalization: unit-normalized Euclidean L2 norm = 1.0 (`normalize(vector)`).
2. **`MockLLMService` (`backend/src/services/ai/mock/mockLLMService.ts`)**:
   - General Devanagari detection regex `[\u0900-\u097F]` to identify Hindi text even for novel phrases not in the preset dictionary.
   - Genuine synthesis in `generatePersonalizedAnswer`: aggregates affirmed symptoms dynamically.
3. **`MockSTTService` (`backend/src/services/ai/mock/mockSTTService.ts`)**:
   - Decodes arbitrary base64 audio strings into text, handles raw Buffer inputs, and supports key registration.
4. **`MockTTSService` (`backend/src/services/ai/mock/mockTTSService.ts`)**:
   - Synthesizes realistic audio buffer payloads with `audio/mpeg` MIME type.

### 1.4 Test Suite Authenticity & Assertions
- Searched for skipped tests (`it.skip`, `test.skip`, `describe.skip`, `test.todo`, `xit`): **0 found**.
- Searched for trivial assertions (`expect(true).toBe(true)`): **0 found**.
- All tests in `tests/chatbot.test.ts` and `tests/chatbot.adversarial.test.ts` perform real assertions against HTTP status codes, JSON payload fields, and Mongoose database state (`ChatbotSession.findById`, `QueryClickStats.findOne`, `NeedsReviewQuery.findById`).

### 1.5 Empirical Build & Test Execution
- Command: `npm run build` (in `/Users/aditya/workspace/hh4u/backend`)
  - Output: Clean exit with code 0. Zero TypeScript errors.
- Command: `npm test` (in `/Users/aditya/workspace/hh4u/backend`)
  - Output: 4 test suites passed, 62/62 tests passed.
  - `tests/chatbot.adversarial.test.ts`: 18 passed
  - `tests/chatbot.test.ts`: 15 passed
  - `tests/auth.adversarial.test.ts`: 15 passed
  - `tests/auth.test.ts`: 14 passed
  - Execution time: 4.739 s.

### 1.6 Independent Empirical Adversarial Probing
To ensure zero test-specific tailoring, the auditor ran an independent probe using novel, unseen domain data (Eczema and skin itching, with diagnostic questions `s1` and `s2`):
- Vector Cosine Math Probe:
  - Identical vectors: `cosineSimilarity([3, 4], [3, 4])` = `1.0` (PASS)
  - Orthogonal vectors: `cosineSimilarity([1, 0], [0, 1])` = `0.0` (PASS)
  - Opposing vectors: `cosineSimilarity([1, 0], [-1, 0])` = `-1.0` (PASS)
  - Zero vectors: `cosineSimilarity([0, 0], [1, 1])` = `0.0` (PASS)
- Embedding Normalization Probe:
  - Novel arbitrary string: dimensions = 1536, L2 norm squared = `0.9999999999999993` (PASS)
- Novel Domain Pipeline Execution:
  - Seeded novel question "Dry itchy skin eczema homeopathy" with answer "Graphites 30C" and "Sulphur 30C".
  - Executed `chatbotService.processQuery({ text: 'Dry itchy skin eczema homeopathy', intent: 'consultation' })`.
  - Result: Matched question, returned `diagnosticQuestions` `['s1', 's2']`, created session `6aab5c57be05d71c6d692872`.
  - Executed `consultationService.resolveConsultationAnswer` with branch `{ s1: 'no', s2: 'yes' }`.
  - Result: Successfully resolved `ansMild` ("Sulphur 30C"), persisted `finalAnswerId` to `ChatbotSession`, and atomically incremented `QueryClickStats.clickCount` to 1.

---

## 2. Logic Chain

1. **Evidence of Genuine Algorithms**:
   - `vectorSimilarity.ts` implements genuine Euclidean dot product and L2 norm computation.
   - `MockEmbeddingService` yields true 1536-dimensional float arrays with unit norm.
   - `chatbotService.ts` and `consultationService.ts` contain no string shortcuts, hardcoded branch bypasses, or fake constant returns.
2. **Evidence of Mongoose Integration**:
   - Database operations execute against real Mongoose models (`Level1Question`, `Answer`, `ConsultationQuery`, `ChatbotSession`, `NeedsReviewQuery`, `QueryClickStats`) backed by `mongodb-memory-server`.
   - DB state assertions in tests directly verify that records are written, updated, and counted in the database.
3. **Evidence of Generalizability**:
   - The auditor's independent probe executed a completely novel domain with unseen questions and branch conditions, successfully matching, resolving, and persisting data without modifying any backend code.
4. **Compliance with Demo Mode Requirements**:
   - Under Demo Mode, prohibited items are hardcoded test results, facade implementations, fabricated outputs, copied external core code, and delegating core logic to third parties.
   - The implementation provides authentic TypeScript code meeting all requirements of R1 through R6 in `ORIGINAL_REQUEST.md`.

---

## 3. Caveats

- **No Caveats**: All 4 forensic checks (Genuine Logic, Mock Authenticity, No Cheating/Bypass, Execution Validation) were verified empirically through independent probe scripts and automated test runs. No shortcuts or integrity violations were detected.

---

## 4. Conclusion

**Verdict: CLEAN**

The Chatbot Engine backend implementation adheres strictly to engineering integrity standards:
1. Genuine, vendor-agnostic adapter architecture with swappable AI services.
2. Realistic, deterministic mock implementations (1536-dim unit embeddings, Devanagari Hindi detection, speech transcription/synthesis).
3. Real in-memory vector cosine similarity ranking and threshold filtering.
4. Full Mongoose persistence for sessions, review queues, and atomic click analytics.
5. All 62 test cases execute genuinely and pass cleanly.

The work product is approved without reservations.

---

## 5. Verification Method

To independently verify the auditor's findings:

1. **TypeScript Build Verification**:
   ```bash
   cd /Users/aditya/workspace/hh4u/backend
   npm run build
   ```
   *Expected*: Code 0, zero warnings.

2. **Automated Test Suite Execution**:
   ```bash
   cd /Users/aditya/workspace/hh4u/backend
   npm test
   ```
   *Expected*: 4 test suites pass, 62/62 tests pass.

3. **Inspect Implementation and Tests**:
   - `backend/src/utils/vectorSimilarity.ts`
   - `backend/src/services/ai/mock/mockEmbeddingService.ts`
   - `backend/src/services/chatbotService.ts`
   - `backend/src/services/consultationService.ts`
   - `backend/tests/chatbot.test.ts`
   - `backend/tests/chatbot.adversarial.test.ts`

4. **Invalidation Conditions**:
   - Any modification introducing hardcoded query checks (`if (query === '...')`).
   - Mock embeddings falling below or above 1536 dimensions or failing unit normalization.
   - Tests failing to verify real DB records.
