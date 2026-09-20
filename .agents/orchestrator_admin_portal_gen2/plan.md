# Project Orchestrator Gen 2 Execution Plan

## Objective
Drive the Healing Hands4U Web Admin Portal and Backend API project from Milestone M2 Gate through Milestones M3, M4, M5, and deliver the final verified project to Sentinel parent.

## Execution Sequence

### Phase 1: Milestone M2 Gate Verification
1. Dispatch 2 Reviewers, 2 Challengers, and 1 Forensic Auditor in parallel.
   - Reviewer 1 & Reviewer 2 (`teamwork_preview_reviewer`): Inspect code correctness, boundary cases, dynamic header detection, media URL regex, idempotency, and run full test suites.
   - Challenger 1 & Challenger 2 (`teamwork_preview_challenger`): Stress test corrupted files, truncated buffers, ghost rows, duplicate seed executions, and benchmark performance.
   - Forensic Auditor (`teamwork_preview_auditor`): Static and runtime integrity checks to ensure no hardcoded results, mock facades, or bypassed logic.
2. Evaluate results in `GATE_STATUS.md`. On PASS, update `PROJECT.md` M2 status to DONE.

### Phase 2: Milestone M3 Execution (Admin Auth & Knowledge Base REST APIs)
1. Features 10-13 per `PROJECT.md` & `ORIGINAL_REQUEST.md`:
   - Admin login endpoint `POST /api/admin/auth/login` (JWT token issuance, default admin credentials verification).
   - 401 guard middleware `adminAuthMiddleware.ts` (Bearer token extraction, signature & expiry verification, 401 Unauthorized responses).
   - Knowledge Base CRUD REST APIs `/api/admin/knowledge-base/*` (List with pagination/search/filters, Get by ID, Create, Update, Delete with embedding regeneration).
   - Excel import endpoint `POST /api/admin/knowledge-base/import` (multipart upload, buffer parser invocation, upsert & embedding generation, transaction/idempotent status reporting).
2. Dispatch M3 Explorers to design contracts and implementation specifics.
3. Dispatch M3 Worker to implement code and test suites.
4. Run M3 Gate (Reviewers, Challengers, Auditor).

### Phase 3: Milestone M4 Execution (Web Admin Portal UI in admin-panel/)
1. Features 14-18 per `PROJECT.md` & `ORIGINAL_REQUEST.md`:
   - Scaffold React + Vite + TypeScript + Tailwind CSS application in `admin-panel/`.
   - Setup `AuthContext` and `ProtectedRoute` for stateful JWT management.
   - Implement `LoginPage.tsx` with validation and error toast/messages.
   - Implement `DashboardPage.tsx` with KPI stat cards, searchable/paginated knowledge base table, expandable diagnostic questions & remedy details.
   - Implement CRUD Modals (Create/Edit Question, Consultation Queries, Answers with YouTube link previews).
   - Implement drag-and-drop Excel file uploader (`.xlsx`) with upload progress, parsing summary modal, and data refresh.
2. Verify production build (`npm run build` in `admin-panel/`).
3. Run M4 Gate (Reviewers, Challengers, Auditor).

### Phase 4: Milestone M5 (Final E2E Pass & Adversarial Hardening)
1. Run full E2E test suite (all 56 tests across Tiers 1-4) against running backend and frontend components.
2. Phase 2 Adversarial Coverage Hardening: Dispatch Tier 5 Challenger to identify edge cases, generate adversarial tests, and fix any discovered defects.
3. Final Forensic Integrity Audit across entire project codebase.
4. Synthesize final results and deliver comprehensive completion report to Sentinel parent.
