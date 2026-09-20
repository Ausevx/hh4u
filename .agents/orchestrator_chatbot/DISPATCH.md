## 2026-09-17T01:39:27Z

<USER_REQUEST>
You are the Project Orchestrator for the Healing Hands4U app ecosystem.

Your working directory is: `/Users/aditya/workspace/hh4u/.agents/orchestrator_chatbot/`. Create your `BRIEFING.md`, `plan.md`, and `progress.md` there.
The workspace directory is: `/Users/aditya/workspace/hh4u`.
The original user request is at: `/Users/aditya/workspace/hh4u/.agents/ORIGINAL_REQUEST.md` (see latest follow-up).
Your sentinel/parent conversation ID is: `2bc9a6d7-b379-4f3b-9cae-becda8149d30`.

## Mission
Implement the Chatbot Engine backend for the Healing Hands4U app ecosystem per the user request in ORIGINAL_REQUEST.md.
Integrity mode: demo

## Scope of Work & Requirements:
1. R1: Vendor-Agnostic AI Service Interfaces
   - Define clean adapter interfaces for LLM (translation + answer generation), Embeddings (vector generation), STT (speech-to-text), and TTS (text-to-speech).
   - Provide mock/stub implementations for each returning deterministic test data, allowing end-to-end testing without real API keys.
2. R2: Chatbot Query Pipeline (`POST /chatbot/query`)
   - Accept text or voice input with explicit intent choice (`direct_answer` or `consultation`).
   - Pipeline: translate input to English, generate embedding, perform vector similarity search against `level1_questions` in MongoDB, check match confidence against configurable threshold (default 0.75).
   - Return direct answer OR diagnostic Yes/No questions for consultation path.
   - Unmatched queries (below threshold) logged to `needs_review_queries` collection and return fallback message.
3. R3: Consultation Answer Resolution (`POST /chatbot/consultation-answer`)
   - Accepts session ID and diagnostic Yes/No answers.
   - Resolves matching answer branch from `consultation_queries`.
   - Generates final personalized answer reflecting branch template and user's original query.
4. R4: Session Logging and Analytics
   - Log query interactions to `chatbot_sessions` collection (including top 3-5 match candidates).
   - Track query click statistics in `query_click_stats` incrementing on interaction.
5. Verification (Jest/Supertest):
   - Comprehensive test suite for chatbot engine endpoints.
   - Verify direct-answer, consultation path, fallback/needs_review, and session logging with candidate matches.
   - All tests must pass.
6. Architecture Verification:
   - Configurable MATCH_CONFIDENCE_THRESHOLD via env or config.
   - Swappable AI service abstractions.

When you claim victory and all requirements and acceptance criteria are met, send a message to your Sentinel (`2bc9a6d7-b379-4f3b-9cae-becda8149d30`) reporting completion and summarizing all work done and test results.
</USER_REQUEST>
