# Dispatch: Explorer Survey Backend (Vector Search Pipeline, Diagnostic & Bulk Upload)

You are the Explorer investigating Requirement R2 and R3 backend requirements.

## Working Directory
`/Users/aditya/workspace/hh4u/.agents/teamwork_preview_explorer_survey_backend/`

## Context & Objectives
- Authoritative Source: Read `/Users/aditya/workspace/hh4u/.agents/ORIGINAL_REQUEST.md` (specifically `2026-09-21T09:06:15Z`).
- R2: Vector Search Pipeline (remedies not found for "vomiting" or "headache"). Diagnose why queries don't match (missing embeddings in Level1Question, missing Atlas vector search index, broken embedding on seed/upload, or fallback issue).
- R2 Requirements:
  1. Startup check or utility to verify vector search index exists (or create it), verify Level1Question documents have embeddings, and re-generate embeddings for any documents missing them.
  2. Diagnostic endpoint: `GET /api/admin/vector-status` returning total Level1Questions, count with embeddings, whether Atlas vector index exists, and Gemini API key status.
  3. Ensure querying "vomiting" or "headache" via `POST /api/chatbot/query` returns relevant results.
- R3 Backend:
  1. Inspect how bulk upload currently works (e.g. `uploadController.ts` or routes).
  2. Support `mode: 'append' | 'overwrite'` (overwrite deletes existing entries first, then inserts new ones).

## Your Tasks
1. Search and inspect `backend/src/services/vectorSearchService.ts`, `backend/src/services/ai/`, `backend/src/models/`, `backend/src/controllers/`, and backend routes.
2. Check how embeddings are generated (Gemini embedding service vs fallback) and stored in MongoDB `Level1Question`.
3. Check Atlas Vector Search index logic and in-memory cosine fallback.
4. Check startup routines (`server.ts`, `app.ts`, or `db.ts`) and plan the embedding check/backfill mechanism.
5. Plan the implementation of `GET /api/admin/vector-status`.
6. Inspect the bulk upload endpoint and plan support for `mode` ('append' vs 'overwrite').
7. Check build and test commands (`npm run build`, `npm test`) in `backend/`.
8. Save your detailed findings in `report.md` and write a soft `handoff.md` in your working directory.

## 2026-09-21T09:08:34Z
<USER_REQUEST>
You are Explorer 2 investigating Requirement R2 and R3: Backend Vector Search Pipeline, Diagnostics, and Bulk Upload Mode.
Your working directory is /Users/aditya/workspace/hh4u/.agents/teamwork_preview_explorer_survey_backend/
First, read /Users/aditya/workspace/hh4u/.agents/teamwork_preview_explorer_survey_backend/DISPATCH.md and /Users/aditya/workspace/hh4u/.agents/ORIGINAL_REQUEST.md (specifically section 2026-09-21T09:06:15Z).
Investigate the backend codebase in /Users/aditya/workspace/hh4u/backend.
Diagnose why queries like "vomiting" or "headache" return no results:
- Check Level1Question documents and whether embeddings are generated/stored.
- Check vectorSearchService.ts, the Atlas vector search index definition, and the in-memory cosine similarity fallback.
- Check how to implement a startup check / backfill to verify index and generate missing embeddings.
- Plan the GET /api/admin/vector-status diagnostic endpoint (Level1Question count, embeddings count, Atlas index status, Gemini API key status).
- Inspect the bulk upload endpoint and plan support for `mode: 'append' | 'overwrite'` (deleting existing data before inserting on overwrite).
- Check build and test commands (`npm run build`, `npm test`).
Write your full findings and recommendations to /Users/aditya/workspace/hh4u/.agents/teamwork_preview_explorer_survey_backend/report.md, update progress.md, and create handoff.md. Send a completion message when done.
</USER_REQUEST>
