# TEST_INFRA.md: Opaque-Box E2E Testing Infrastructure

**Project**: Healing Hands4U Web Admin Portal and Backend API  
**Status**: Active  
**Author**: E2E Test Suite Designer & Writer (`test_writer_e2e`)  
**Date**: 2026-09-19  

---

## 1. Test Philosophy

The Healing Hands4U E2E test suite adheres to the **Opaque-Box Testing Methodology**:
- **Requirement-Driven**: Every test case is derived strictly from user requirements and acceptance criteria documented in `ORIGINAL_REQUEST.md` and `PROJECT.md`.
- **Public Entry Points Only**: Tests interact exclusively with the system's observable boundaries:
  - **REST API Endpoints**: HTTP requests via Supertest (`/api/admin/*`, `/api/auth/*`, `/chatbot/*`).
  - **Database State**: Observable document state in MongoDB Atlas / MongoDB Memory Server (`level1questions`, `consultationqueries`, `answers`, `admins`).
  - **File Ingestion**: Excel workbook inputs (`database-dummy.xlsx`, synthetic valid/invalid `.xlsx` buffers).
  - **CLI / Script Entry Points**: Programmatic invocation of seed and vector index scripts.
- **No Implementation Coupling**: Tests do not inspect or rely on internal implementation details, private methods, or unexposed helpers. If internal implementation details change while respecting the interface contract, tests remain green.
- **Authoritative Expected Output**: Expected values are derived from `ORIGINAL_REQUEST.md`, `database-dummy.xlsx` physical inspection, and documented interface contracts.

---

## 2. Feature Inventory

The test suite systematically validates every feature identified in `ORIGINAL_REQUEST.md` and `PROJECT.md`:

| # | Feature ID | Name | Description | Target Tier |
|---|------------|------|-------------|-------------|
| 1 | `FEAT-ATLAS-CONN` | MongoDB Atlas Connection & Isolation | Robust connection handling, authentication, and database isolation | Tier 1 |
| 2 | `FEAT-SCHEMA-EVOL` | Knowledge Base Schema Validation | Validation of Question, ConsultationQuery, Answer, and Admin models | Tier 1 |
| 3 | `FEAT-VEC-INDEX` | Atlas Vector Search Index | Creation and queryability of 1536-dim cosine vector index on Level1Question | Tier 1, Tier 3 |
| 4 | `FEAT-VEC-QUERY` | Dual-Mode Vector Search | Semantic search supporting native Atlas `$vectorSearch` and local fallback | Tier 1, Tier 4 |
| 5 | `FEAT-KB-CRUD` | Knowledge Base Data Operations | Programmatic CRUD operations and repository integrity | Tier 1, Tier 3 |
| 6 | `FEAT-EXCEL-PARSE` | Excel Workbook Parser | Multi-sheet parser extracting 184 questions, 184 consultation sets, 220 answers | Tier 1, Tier 4 |
| 7 | `FEAT-EXCEL-VAL` | Excel Header & Sheet Validation | Rejection of non-xlsx files, missing sheets, missing columns with clear 400 errors | Tier 2, Tier 4 |
| 8 | `FEAT-MEDIA-EXTR` | Media & YouTube URL Extraction | Regex extraction and isolation of YouTube video links from Reason/Remedy | Tier 1, Tier 4 |
| 9 | `FEAT-SEED-SCRIPT` | Knowledge Base Seed Automation | Idempotent bulk seeding of knowledge base collections from `.xlsx` | Tier 1, Tier 4 |
| 10 | `FEAT-ADMIN-AUTH` | Admin Authentication & JWT | Admin login issuing JWT token with `role: 'admin'`, credential verification | Tier 1, Tier 2 |
| 11 | `FEAT-ADMIN-GUARD` | Admin Authorization Middleware | Route guarding on `/api/admin/*`, rejecting unauthenticated requests with 401 | Tier 1, Tier 2 |
| 12 | `FEAT-ADMIN-REST` | Admin Knowledge Base REST APIs | Endpoints for listing, search, pagination, detail, create, update, delete | Tier 1, Tier 3 |
| 13 | `FEAT-EXCEL-UPLOAD`| Multipart Excel Upload API | `POST /api/admin/knowledge-base/import` handling file upload via `multer` | Tier 1, Tier 3 |
| 14 | `FEAT-CASCADE-DEL` | Cascade Deletion Integrity | Deletion of a Question automatically purges associated Consultation & Answers | Tier 1, Tier 3, Tier 4 |
| 15 | `FEAT-SEARCH-PAG` | Search & Pagination Bounds | Query string filtering, page clamping, limit handling, empty/large bounds | Tier 2 |

---

## 3. Test Architecture & Directory Layout

### 3.1 Directory Layout
```
backend/
├── tests/
│   ├── e2e/
│   │   ├── helpers/
│   │   │   ├── e2eHarness.ts       # Test environment, DB setup, contract router fallback
│   │   │   ├── excelTestHelper.ts  # Dynamic .xlsx buffer generation for boundary testing
│   │   │   └── seedVerification.ts# Assertions against database-dummy.xlsx data
│   │   ├── tier1_feature_coverage.test.ts
│   │   ├── tier2_boundary_corner.test.ts
│   │   ├── tier3_pairwise_combinations.test.ts
│   │   └── tier4_real_world_scenarios.test.ts
│   ├── helpers/                    # Unit/Chatbot test helpers
│   ├── auth.test.ts                # Existing Milestone 2 auth unit tests
│   └── chatbot.test.ts             # Existing Milestone 2 chatbot unit tests
```

### 3.2 Test Runner Invocation
Tests are executed via Jest using the Node.js test runner configured in `backend/jest.config.js`:
- **Run Full E2E Suite**:
  ```bash
  npm test -- tests/e2e
  ```
- **Run Specific Tier**:
  ```bash
  npm test -- tests/e2e/tier1_feature_coverage.test.ts
  npm test -- tests/e2e/tier2_boundary_corner.test.ts
  npm test -- tests/e2e/tier3_pairwise_combinations.test.ts
  npm test -- tests/e2e/tier4_real_world_scenarios.test.ts
  ```
- **Run Dedicated E2E Runner**:
  ```bash
  npx jest tests/e2e --runInBand --detectOpenHandles --forceExit
  ```

### 3.3 Pass / Fail Semantics
- **Zero-Tolerance Failure**: 100% of test cases in all 4 tiers must pass (`exitCode === 0`).
- **Assertion Strictness**:
  - Status codes must match expected HTTP semantics (200, 201, 400, 401, 403, 404).
  - Exact counts are verified: exactly 184 Level 1 questions, 184 consultation query sets, and 220 answers from `database-dummy.xlsx`.
  - Cascade deletes must verify that foreign-key linked documents in dependent collections are deleted.
  - Boundary errors must return structured error bodies containing meaningful error messages, not unhandled 500 crashes.

---

## 4. Test Tiers & Coverage Thresholds

| Tier | Focus | Description | Required Count | Implemented Count |
|------|-------|-------------|----------------|-------------------|
| **Tier 1** | Feature Coverage | Positive path verification of every major feature: Data layer schemas, Excel parser row counts, Admin Auth, Knowledge Base REST APIs, and Excel import. | >= 20 | 21 |
| **Tier 2** | Boundary & Corner Cases | Boundary inputs, malformed Excel files, missing sheets, missing columns, token tampering, expired auth, non-admin roles, search escaping, pagination clamping. | >= 20 | 24 |
| **Tier 3** | Pairwise Combinations | Cross-feature interactions: Excel upload to vector search retrieval, Admin CRUD lifecycle with cascade, malformed upload transaction integrity, unauthenticated upload rejection. | >= 4 | 5 |
| **Tier 4** | Real-World Scenarios | End-to-end multi-step realistic workflows: Clinic onboarding, patient clinical question search, remedy update with video link, diagnostic tree expansion, upload error recovery. | >= 5 | 5 |
| **Total** | | | **>= 49** | **55** |

---

## 5. Tier 4 Real-World Application Scenarios

### Scenario 1: Clinic Onboarding & Initial Seeding
1. Administrator logs into Admin Portal with valid credentials (`POST /api/admin/auth/login`).
2. Administrator uploads `database-dummy.xlsx` via `POST /api/admin/knowledge-base/import`.
3. System parses all three sheets:
   - Verifies 184 Level 1 questions inserted.
   - Verifies 184 Consultation query sets linked to questions.
   - Verifies 220 Answers inserted and correctly categorized.
4. Administrator queries `GET /api/admin/stats` and verifies all KPI metrics reflect the seeded dataset.

### Scenario 2: Patient Clinical Query Vector Search
1. Knowledge base is seeded with clinical questions and homeopathic remedies.
2. Patient submits a free-text health query: *"My child has had a persistent dry cough for weeks"*.
3. Vector search pipeline generates embedding and searches `level1questions`.
4. System returns the highest similarity match: *"Why is my child's cough not going away?"* with confidence score > 0.75.
5. System retrieves the primary remedy and associated diagnostic questions.

### Scenario 3: Admin Updates Remedy with YouTube Multimedia Link
1. Admin staff searches the knowledge base for a specific condition (e.g. *"headache"*).
2. Admin fetches the detail record.
3. Admin edits the remedy text to include a specific instructional video URL (`https://youtu.be/IUy9hg8iT3Q`).
4. Admin submits `PUT /api/admin/knowledge-base/:id`.
5. System parses the video ID, updates the `videoUrl` field, and persists changes.
6. Admin verifies changes are reflected in subsequent queries.

### Scenario 4: Admin Diagnostic Tree Expansion & Cascade Deletion
1. Admin adds a new clinical entry via `POST /api/admin/knowledge-base` with canonical question, tags, diagnostic question triplet, and remedy.
2. System creates the Question document, links the ConsultationQuery document, and links the Answer document.
3. Admin verifies the entry is queryable via the admin search table.
4. Admin deletes the question via `DELETE /api/admin/knowledge-base/:id`.
5. System removes the question AND automatically purges the associated ConsultationQuery and Answer documents (cascade deletion).

### Scenario 5: Upload Error Recovery & State Preservation
1. Staff mistakenly uploads a corrupted spreadsheet missing the `Answers` sheet.
2. System intercepts the missing sheet, halts import, returns HTTP 400 with message *"Missing required sheet: Answers"*.
3. System verifies no partial/orphan records were inserted into the database.
4. Staff immediately uploads the valid `database-dummy.xlsx`.
5. System completes full ingestion successfully.
