# E2E Testing Track: Opaque-Box Test Suite Creation

## Working Directory
/Users/aditya/workspace/hh4u/.agents/test_writer_e2e/

## Inputs
- Reference request: /Users/aditya/workspace/hh4u/ORIGINAL_REQUEST.md
- Project scope & architecture: /Users/aditya/workspace/hh4u/PROJECT.md
- Database seed file: /Users/aditya/workspace/hh4u/database-dummy.xlsx
- Backend root: /Users/aditya/workspace/hh4u/backend

## Instructions
You are the E2E Test Suite Designer & Writer for Healing Hands4U.
Your responsibility is to design and implement an independent, opaque-box E2E test suite derived strictly from user requirements in ORIGINAL_REQUEST.md and PROJECT.md.

1. **Create TEST_INFRA.md** at `/Users/aditya/workspace/hh4u/TEST_INFRA.md` following the template:
   - Test Philosophy: Opaque-box, requirement-driven, testing via public entry points (CLI, REST API, DB state).
   - Feature Inventory: All features from ORIGINAL_REQUEST.md and PROJECT.md.
   - Test Architecture: Runner invocation, pass/fail semantics, directory layout.
   - Real-World Application Scenarios (Tier 4).
   - Coverage Thresholds (Tier 1: >=20, Tier 2: >=20, Tier 3: >=4, Tier 4: >=5).

2. **Implement E2E Test Files**:
   Create the test files under `/Users/aditya/workspace/hh4u/backend/tests/e2e/` (or appropriate test directory):
   - `tier1_feature_coverage.test.ts`:
     - Test 1-5: MongoDB Atlas connection, schema validation for Question, ConsultationQuery, Answer models.
     - Test 6-10: Excel parser extracts 184 (or 185 with header) questions, 184 consultation queries, 220 answers.
     - Test 11-15: Admin auth (login returns JWT with role admin, valid token permits access).
     - Test 16-20: Admin API endpoints (CRUD on knowledge base, stats endpoint, import endpoint).
   - `tier2_boundary_corner.test.ts`:
     - Boundary inputs: Empty questions, max length texts, non-xlsx files, corrupted xlsx, missing sheets, missing columns.
     - Auth boundaries: Missing Authorization header (401), invalid token (401), expired token (401), non-admin token (401/403).
     - Data boundaries: Empty knowledge base queries, pagination at bounds (page 0, negative page, page > total), special characters in search.
   - `tier3_pairwise_combinations.test.ts`:
     - Cross-feature interactions:
       - Excel upload -> database storage -> vector search retrieval.
       - Admin login -> create entry via API -> fetch via API -> update -> delete -> verify cascade.
       - Malformed Excel upload -> rejected with 400 without corrupting existing database state.
       - Unauthenticated access to import -> rejected with 401 without parsing file.
   - `tier4_real_world_scenarios.test.ts`:
     - Scenario 1: Clinic staff uploads `database-dummy.xlsx`, seeds knowledge base, verifies all 184 questions and 220 remedies are queryable.
     - Scenario 2: Patient asks clinical question, vector search matches closest Level 1 question.
     - Scenario 3: Admin staff logs into portal, updates remedy text with YouTube video link, changes persist.
     - Scenario 4: Admin staff adds new diagnostic query to tree, checks cascade.
     - Scenario 5: Staff uploads malformed spreadsheet, receives clear error indicating missing column.

3. **Verify Test Runner**:
   Ensure `npm test` or a dedicated test command runs these tests cleanly (using mock/in-memory or Atlas appropriately).

4. **Publish TEST_READY.md** at `/Users/aditya/workspace/hh4u/TEST_READY.md` containing:
   - Test Runner command.
   - Coverage Summary table (Tiers 1-4 with exact counts).
   - Feature checklist.

5. Write detailed handoff report to `/Users/aditya/workspace/hh4u/.agents/test_writer_e2e/handoff.md` and message orchestrator.

## 2026-09-19T02:18:06Z
You are the E2E Test Suite Designer & Writer for the Healing Hands4U Web Admin Portal and Backend API project.
Your working directory is: /Users/aditya/workspace/hh4u/.agents/test_writer_e2e/
Task assignment: /Users/aditya/workspace/hh4u/.agents/test_writer_e2e/DISPATCH.md
Reference request: /Users/aditya/workspace/hh4u/ORIGINAL_REQUEST.md
Project architecture: /Users/aditya/workspace/hh4u/PROJECT.md
Project root: /Users/aditya/workspace/hh4u

Instructions:
1. Read /Users/aditya/workspace/hh4u/ORIGINAL_REQUEST.md and /Users/aditya/workspace/hh4u/PROJECT.md.
2. Create /Users/aditya/workspace/hh4u/TEST_INFRA.md following the dual-track opaque-box methodology.
3. Implement comprehensive opaque-box E2E test suites in /Users/aditya/workspace/hh4u/backend/tests/e2e/ covering:
   - Tier 1: Feature Coverage (Data Layer, Excel Parser, Admin Auth, Knowledge Base APIs) -> at least 20 test cases
   - Tier 2: Boundary & Corner Cases (malformed excel, empty files, missing columns, invalid JWT, non-admin role, pagination bounds) -> at least 20 test cases
   - Tier 3: Cross-Feature Interactions -> at least 4 test cases
   - Tier 4: Real-World Scenarios -> at least 5 realistic application workflows
4. Ensure tests run and pass cleanly via a test runner (e.g. `npm test -- tests/e2e` or similar).
5. When the test suite is complete, create /Users/aditya/workspace/hh4u/TEST_READY.md.
6. Write your handoff report to /Users/aditya/workspace/hh4u/.agents/test_writer_e2e/handoff.md and send a message back to the orchestrator.
