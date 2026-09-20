# Dispatch: Worker M3 (Admin Auth & Knowledge Base REST APIs)

## Identity & Role
- Archetype: teamwork_preview_worker
- Working Directory: /Users/aditya/workspace/hh4u/.agents/worker_m3_api/
- Parent Conversation ID: 1619920f-8f49-4539-86cd-0e9ddbe0814c

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Inputs & Context
- ORIGINAL_REQUEST.md: /Users/aditya/workspace/hh4u/ORIGINAL_REQUEST.md (MUST read first)
- PROJECT.md: /Users/aditya/workspace/hh4u/PROJECT.md (Features 10, 11, 12, 13; Interface Contracts)
- Explorer 1 Handoff (Auth & Security): /Users/aditya/workspace/hh4u/.agents/explorer_m3_auth/handoff.md
- Explorer 2 Handoff (CRUD REST APIs): /Users/aditya/workspace/hh4u/.agents/explorer_m3_crud/handoff.md
- Explorer 3 Handoff (Excel Multipart Import): /Users/aditya/workspace/hh4u/.agents/explorer_m3_import/handoff.md
- E2E Readiness: /Users/aditya/workspace/hh4u/TEST_READY.md

## Exclusive File Ownership
You own and may edit or create the following files:
1. `/Users/aditya/workspace/hh4u/backend/src/utils/jwt.ts`
2. `/Users/aditya/workspace/hh4u/backend/src/middlewares/adminAuthMiddleware.ts`
3. `/Users/aditya/workspace/hh4u/backend/src/middlewares/uploadMiddleware.ts`
4. `/Users/aditya/workspace/hh4u/backend/src/controllers/adminAuthController.ts`
5. `/Users/aditya/workspace/hh4u/backend/src/controllers/adminKnowledgeBaseController.ts`
6. `/Users/aditya/workspace/hh4u/backend/src/services/adminKnowledgeBaseService.ts`
7. `/Users/aditya/workspace/hh4u/backend/src/routes/adminRoutes.ts`
8. `/Users/aditya/workspace/hh4u/backend/src/app.ts`
9. `/Users/aditya/workspace/hh4u/backend/tests/adminAuth.test.ts`
10. `/Users/aditya/workspace/hh4u/backend/tests/adminKnowledgeBase.test.ts`
11. `/Users/aditya/workspace/hh4u/backend/tests/adminImport.test.ts`

## Tasks & Acceptance Criteria
1. **Admin Auth & JWT**:
   - In `jwt.ts`: implement `AdminAuthPayload`, `generateAdminToken`, and `verifyAdminToken`.
   - In `adminAuthController.ts`: implement `login` (`POST /api/admin/auth/login`). Verify credentials against `Admin` model (`email` and `passwordHash`). Return `{ success: true, token, admin: { email, role: 'admin' } }`. Return HTTP 401 `{ success: false, message: "Invalid credentials" }` on invalid password or missing admin.
2. **Admin Auth Middleware (`adminAuthMiddleware.ts`)**:
   - Guard `/api/admin/*`.
   - Missing or malformed header (`Authorization: Bearer <token>`), invalid token, expired token, or token without `role: 'admin'` MUST return HTTP 401 with exact message:
     `{ success: false, message: "Authentication token missing or invalid" }`.
   - Attaches `req.admin = payload`.
3. **Admin Knowledge Base REST APIs**:
   - `GET /api/admin/stats`: returns `{ success: true, stats: { totalQuestions, activeQuestions, inactiveQuestions, totalConsultations, totalAnswers, vectorIndexActive } }`.
   - `GET /api/admin/knowledge-base?search=&page=1&limit=20`: returns paginated items with total and totalPages.
   - `GET /api/admin/knowledge-base/:id`: returns single item details. Returns HTTP 404 on not found, HTTP 400 on invalid ObjectId.
   - `POST /api/admin/knowledge-base`: creates question with 1536-dim embedding, consultation queries, answer. Returns HTTP 201 `{ success: true, item }`.
   - `PUT /api/admin/knowledge-base/:id`: updates item, regenerates embedding if question changed.
   - `DELETE /api/admin/knowledge-base/:id`: cascade deletes question, consultation queries, answers. Returns HTTP 200 `{ success: true, message: "Knowledge base item deleted successfully" }`.
4. **Multipart Excel Upload API (`POST /api/admin/knowledge-base/import`)**:
   - `uploadMiddleware.ts`: uses `multer.memoryStorage()`, field `file`, `.xlsx` validation, 20MB limit. Converts `MulterError` and missing file to HTTP 400.
   - Controller calls `parseExcelBuffer(req.file.buffer)`.
   - Ingests parsed data (generates embeddings for questions, upserts questions, consultations, answers).
   - Returns HTTP 200 `{ success: true, counts: { questions, consultations, answers } }`.
   - Catches `ExcelValidationError` and returns HTTP 400 with details.
5. **Mount Routes in `backend/src/app.ts`**:
   - Mount `adminRoutes` at `/api/admin`.
   - Ensure `/api/admin/auth/login` is public, while all `/api/admin/knowledge-base/*` and `/api/admin/stats` endpoints are protected by `adminAuthMiddleware`.
6. **Testing & Verification**:
   - Author thorough unit and integration test suites in `tests/adminAuth.test.ts`, `tests/adminKnowledgeBase.test.ts`, and `tests/adminImport.test.ts`.
   - Run `npx tsc --noEmit` in `backend/` -> must pass with 0 errors.
   - Run new tests and full backend test suite (`npm test`) -> 100% pass.
   - Run E2E test suite (`npm test -- tests/e2e`) -> all 56 tests across Tiers 1-4 pass.
7. Write your handoff report to `/Users/aditya/workspace/hh4u/.agents/worker_m3_api/handoff.md`.
8. Send a message to parent with summary when finished.

## 2026-09-19T13:04:15Z
You are the Worker for Milestone M3 (Admin Auth & Knowledge Base REST APIs). Working directory: /Users/aditya/workspace/hh4u/.agents/worker_m3_api/. Read /Users/aditya/workspace/hh4u/.agents/worker_m3_api/DISPATCH.md, /Users/aditya/workspace/hh4u/ORIGINAL_REQUEST.md, and /Users/aditya/workspace/hh4u/PROJECT.md. Read the Explorer handoffs at .agents/explorer_m3_auth/handoff.md, .agents/explorer_m3_crud/handoff.md, and .agents/explorer_m3_import/handoff.md. Implement the Admin Auth endpoints, 401 guard middleware, Knowledge Base CRUD endpoints, and Excel import endpoint. Author test suites in backend/tests/adminAuth.test.ts, adminKnowledgeBase.test.ts, and adminImport.test.ts. Verify tsc, unit tests, full regression tests, and E2E tests. Write your completion report to /Users/aditya/workspace/hh4u/.agents/worker_m3_api/handoff.md and send_message to parent (1619920f-8f49-4539-86cd-0e9ddbe0814c).
