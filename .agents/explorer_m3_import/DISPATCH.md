# Dispatch: Explorer 3 (Multipart Excel Upload API) for Milestone M3

## Identity & Role
- Archetype: teamwork_preview_explorer
- Working Directory: /Users/aditya/workspace/hh4u/.agents/explorer_m3_import/
- Parent Conversation ID: 1619920f-8f49-4539-86cd-0e9ddbe0814c

## Inputs & Context
- ORIGINAL_REQUEST.md: /Users/aditya/workspace/hh4u/ORIGINAL_REQUEST.md (MUST read first)
- PROJECT.md: /Users/aditya/workspace/hh4u/PROJECT.md (Feature 13, Interface Contracts)
- Codebase paths:
  - /Users/aditya/workspace/hh4u/backend/src/services/excelParserService.ts
  - /Users/aditya/workspace/hh4u/backend/src/scripts/seedKnowledgeBase.ts
  - /Users/aditya/workspace/hh4u/backend/package.json (check if `multer` is installed or needed)
  - /Users/aditya/workspace/hh4u/backend/src/routes/
  - /Users/aditya/workspace/hh4u/backend/src/app.ts

## Objectives
1. Read ORIGINAL_REQUEST.md and PROJECT.md.
2. Investigate how multipart file upload can be handled in Express:
   - Check if `multer` and `@types/multer` are already installed in `backend/package.json`. If not, specify required dependency.
   - Configure memory storage upload middleware for field `file` with `.xlsx` mimetype / extension checking and file size limits.
3. Design endpoint `POST /api/admin/knowledge-base/import`:
   - Enforce authentication via `adminAuthMiddleware`.
   - Validate file presence. If missing, return HTTP 400.
   - Call `parseExcelBuffer(req.file.buffer)`. Catch `ExcelValidationError` and return HTTP 400 with details.
   - Seed parsed data into database (using ingestion logic similar to `seedKnowledgeBase.ts`, generating embeddings, upserting questions, consultations, answers).
   - Return `{ success: true, counts: { questions, consultations, answers } }`.
4. Document design, route mounting, error handling, and test plan in `/Users/aditya/workspace/hh4u/.agents/explorer_m3_import/handoff.md`.
5. Send message to parent when done.

## 2026-09-19T07:29:50Z
You are Explorer 3 for Milestone M3 (Multipart Excel Upload API). Working directory: /Users/aditya/workspace/hh4u/.agents/explorer_m3_import/. Read /Users/aditya/workspace/hh4u/.agents/explorer_m3_import/DISPATCH.md, /Users/aditya/workspace/hh4u/ORIGINAL_REQUEST.md, and /Users/aditya/workspace/hh4u/PROJECT.md. Investigate multer support in backend/package.json, excelParserService integration, and batch ingestion into MongoDB. Design POST /api/admin/knowledge-base/import. Write your analysis and concrete implementation proposal to /Users/aditya/workspace/hh4u/.agents/explorer_m3_import/handoff.md and send_message to parent (1619920f-8f49-4539-86cd-0e9ddbe0814c).
