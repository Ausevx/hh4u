# Dispatch: Worker M2 — Backend Vector Search Pipeline, Diagnostics & Bulk Upload Mode

## Working Directory
`/Users/aditya/workspace/hh4u/.agents/teamwork_preview_worker_m2_backend/`

## Context & Objectives
- Authoritative Request: Read `/Users/aditya/workspace/hh4u/.agents/ORIGINAL_REQUEST.md` (specifically `2026-09-21T09:06:15Z`).
- Scope & Contracts: Read `/Users/aditya/workspace/hh4u/PROJECT.md` (Milestone 2 & Milestone 3 Backend).
- Explorer Findings: Read `/Users/aditya/workspace/hh4u/.agents/teamwork_preview_explorer_survey_backend/report.md` and `handoff.md`.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Write Ownership
You own exclusively:
- `backend/src/services/vectorSearchService.ts`
- `backend/src/services/vectorBackfillService.ts` (new)
- `backend/src/controllers/adminVectorController.ts` (new)
- `backend/src/controllers/adminKnowledgeBaseController.ts`
- `backend/src/services/adminKnowledgeBaseService.ts`
- `backend/src/routes/adminRoutes.ts`
- `backend/src/index.ts`
- `backend/tests/` unit/integration tests.

## Requirements to Implement
1. **Root-Cause Fix for Vector Search ("vomiting" / "headache" remedies not found)**:
   - In MongoDB Atlas, existing `Level1Question` documents have synthetic Mulberry32 mock embeddings which yield ~0.04 cosine similarity against live Gemini 1536-dim embeddings generated at query time.
   - Implement `vectorBackfillService.ts`:
     - Function to inspect documents: checks total count, count of docs with embeddings, and detects if embeddings are mock or missing.
     - Function to backfill/re-generate embeddings using live Gemini Embedding Service (`aiContainer.getEmbeddingService()`) in batches of 10 with 300ms delays to avoid rate limits.
     - Function to verify that Atlas `vector_index` exists (and triggers creation if missing).
   - Hook the startup check into `backend/src/index.ts` after database connection so it runs on startup.
   - Also add an admin endpoint `POST /api/admin/vector-sync` to manually trigger backfill if needed.
2. **Diagnostic Endpoint (`GET /api/admin/vector-status`)**:
   - Return JSON report:
     - `success: true`
     - `totalLevel1Questions`: count
     - `questionsWithEmbeddings`: count
     - `vectorIndexExists`: boolean
     - `vectorIndexQueryable`: boolean
     - `geminiApiKeyConfigured`: boolean
     - `geminiApiKeyStatus`: string ('CONFIGURED' | 'MISSING')
   - Mount in `backend/src/routes/adminRoutes.ts` accessible for status monitoring.
3. **Bulk Upload Backend Support (`mode: 'append' | 'overwrite'`)**:
   - In `adminKnowledgeBaseController.ts`, parse `mode` from `req.body.mode` (Multer form-data) or `req.query.mode`, defaulting to `'append'`.
   - In `adminKnowledgeBaseService.ts`, when `mode === 'overwrite'`, delete existing records in `Level1Question`, `ConsultationQuery`, and `Answer` within the database transaction before inserting the new records.
   - Ensure embeddings generated during upload are generated in batches of 10.
4. **Verification**:
   - Run `npm run build` in `backend/` (must pass `tsc` with 0 errors).
   - Run `npm test` in `backend/` (all tests pass).
   - Test `POST /api/chatbot/query` with queries "vomiting" and "headache" to prove they return matching remedies with confidence > 0.75.
   - Document all verification commands and outputs in `handoff.md`.

## 2026-09-21T09:37:34Z
<USER_REQUEST>
You are Worker M2 tasked with fixing the Backend Vector Search Pipeline, adding the Diagnostics Endpoint, and supporting Bulk Upload Overwrite vs Append mode (Requirements R2 and R3 Backend).
Your working directory is /Users/aditya/workspace/hh4u/.agents/teamwork_preview_worker_m2_backend/
First, read /Users/aditya/workspace/hh4u/.agents/teamwork_preview_worker_m2_backend/DISPATCH.md, /Users/aditya/workspace/hh4u/.agents/ORIGINAL_REQUEST.md (specifically section 2026-09-21T09:06:15Z), and /Users/aditya/workspace/hh4u/.agents/teamwork_preview_explorer_survey_backend/handoff.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Implement:
1. `vectorBackfillService.ts` and startup check in `backend/src/index.ts` to inspect Level1Question embeddings, verify Atlas vector search index, and backfill/re-generate embeddings with live Gemini Embedding Service in rate-limited batches.
2. `GET /api/admin/vector-status` endpoint returning the required health metrics and Gemini API key status.
3. Bulk upload mode support (`mode: 'append' | 'overwrite'`) in `adminKnowledgeBaseController.ts` and `adminKnowledgeBaseService.ts`.
4. Verify `npm run build` and `npm test` in `backend/`.
5. Verify `POST /api/chatbot/query` with "vomiting" and "headache" returns matching remedies.

Write your changes and verification logs to `handoff.md` and send a completion message.
</USER_REQUEST>
