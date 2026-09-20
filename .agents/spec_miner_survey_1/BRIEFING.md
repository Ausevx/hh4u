# BRIEFING — 2026-09-17T01:45:00Z

## Mission
Discover and document all functional, non-functional, data model, schema, endpoint, query pipeline, fallback, AI service, mock, session logging, click stats, threshold, and testing specifications for the Chatbot Engine backend project.

## 🔒 My Identity
- Archetype: spec_miner
- Roles: Specification Miner, Teamwork specialist
- Working directory: /Users/aditya/workspace/hh4u/.agents/spec_miner_survey_1
- Original parent: 160312eb-90e3-4f3d-b4c2-b1a9d8edb379
- Milestone: survey

## 🔒 Key Constraints
- Read-only on implementation; do NOT implement anything.
- Probe all features discovered, even if beyond initial assignment.
- Deliver comprehensive handoff report at /Users/aditya/workspace/hh4u/.agents/spec_miner_survey_1/handoff.md.
- Send results back to parent agent via send_message.

## Current Parent
- Conversation ID: 160312eb-90e3-4f3d-b4c2-b1a9d8edb379
- Updated: 2026-09-17T01:40:10Z

## Task Summary
- **What to build**: Specification discovery and extraction for Chatbot Engine backend.
- **Success criteria**: Exhaustive specification documentation covering functional & non-functional reqs, models, schemas, endpoints, pipeline stages, fallback, AI service interfaces, mocks, logs, click stats, thresholds, and tests.
- **Interface contracts**: /Users/aditya/workspace/hh4u/.agents/ORIGINAL_REQUEST.md, PROJECT.md
- **Code layout**: .agents/ holds agent metadata only.

## Key Decisions Made
- Confirmed existing Mongoose models in `backend/src/models/`: `Level1Question`, `Answer`, `ConsultationQuery`, `ChatbotSession`, `NeedsReviewQuery`, `QueryClickStats`, `User`, `Otp`.
- Confirmed existing test harness uses `mongodb-memory-server` + `supertest` + `jest` (29/29 tests pass).
- Detailed 4 AI service adapter interfaces (`ILLMService`, `IEmbeddingsService`, `ISTTService`, `ITTSService`) and mock requirements.
- Extracted 2 core REST endpoints: `POST /chatbot/query` (with alias `/api/chatbot/query`) and `POST /chatbot/consultation-answer` (with alias `/api/chatbot/consultation-answer`).
- Defined pipeline flow: STT -> translation -> embedding -> vector cosine similarity -> threshold check (0.75) -> branching (fallback / direct answer / consultation questions).
- Defined analytics requirements: top 3-5 candidates in `chatbot_sessions`, atomic `$inc` in `query_click_stats`, insertion into `needs_review_queries`.

## Artifact Index
- /Users/aditya/workspace/hh4u/.agents/spec_miner_survey_1/handoff.md — Final specification report
