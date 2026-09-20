# Project: Healing Hands4U Web Admin Portal and Backend API

## Architecture
The system consists of three primary subsystems:
1. **MongoDB Atlas Data Layer with Vector Search**:
   - Production database on MongoDB Atlas v8.0.32 (`cluster0.iifejq3.mongodb.net`, database `hh4u`).
   - Mongoose collections: `level1questions`, `consultationqueries`, `answers`, `admins`.
   - Atlas Vector Search index `vector_index` on `level1questions.embedding` (1536 dimensions, cosine similarity).
   - Dual-mode search: Native `$vectorSearch` pipeline on live Atlas cluster, falling back to in-memory cosine similarity for offline unit tests.
2. **Backend API & Excel Ingestion**:
   - Express v5 / TypeScript backend running on port 5000.
   - Modular Excel parser (`excelParserService`) using `xlsx` or `exceljs` supporting both buffer (file upload) and file path (CLI seed script).
   - Admin authentication (`POST /api/admin/auth/login`) issuing JWTs with `role: 'admin'`.
   - Security middleware (`adminAuthMiddleware`) enforcing HTTP 401 on unauthenticated access to `/api/admin/*`.
   - Knowledge Base CRUD endpoints and multipart Excel import endpoint (`POST /api/admin/knowledge-base/import`).
3. **Web Admin Portal (Frontend)**:
   - React 18/19 + Vite + TypeScript SPA located in `admin-panel/`.
   - Tailwind CSS design system with "Trusted Teal" color palette.
   - Client-side routing with `ProtectedRoute` redirecting unauthenticated users to `/login`.
   - Dashboard with KPI stats, searchable & paginated knowledge base table with expandable diagnostic query & remedy details.
   - Add/Edit/Delete modals with full validation.
   - Drag-and-drop `.xlsx` file uploader with upload status, progress feedback, and error reporting.

## Feature Inventory
Every feature from the survey and requirements is assigned to a milestone:

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | MongoDB Atlas Connection & Config | Robust connection to MongoDB Atlas with database isolation (`DB_NAME=hh4u`) | M1 | R1, Survey |
| 2 | Knowledge Base Schema Evolution | Updated `Answer.ts` with optional `level1QuestionId`, `questionText`, `answerType`, and media fields | M1 | R1, Survey |
| 3 | Atlas Vector Search Index Management | DDL helper/script to create and verify `vector_index` on `level1questions` | M1 | R1, Acceptance 1 |
| 4 | Dual-Mode Vector Search Query | Vector search with native `$vectorSearch` and local cosine fallback | M1 | R1, Acceptance 1 |
| 5 | Knowledge Base CRUD Data Operations | Programmatic CRUD operations and repository methods on knowledge base | M1 | Acceptance 1 |
| 6 | Excel Workbook Parser | Multi-sheet parser for `level1`, `ConsultationQueries`, and `Answers` from buffer or path | M2 | R2, Survey |
| 7 | Excel Header & Sheet Validation | Rejection of non-xlsx files, missing sheets, or missing columns with descriptive 400 errors | M2 | R2, Acceptance 2 |
| 8 | Media & YouTube URL Extraction | Regex extraction of YouTube video IDs from Reason and Remedy cells into `videoUrl` | M2 | Survey |
| 9 | Knowledge Base CLI Seed Script | Executable script seeding 184 questions, 184 consultation queries, and 220 answers into MongoDB Atlas | M2 | R2, Acceptance 1 |
| 10 | Admin User Authentication & JWT | Admin login API endpoint issuing JWT with `role: 'admin'` and password/credential verification | M3 | R3, Acceptance 3 |
| 11 | Admin Authorization Middleware | Middleware guarding `/api/admin/*`, rejecting unauthenticated requests with HTTP 401 | M3 | R3, Acceptance 3 |
| 12 | Admin Knowledge Base REST APIs | REST endpoints for listing (search/pagination), detail, create, update, delete knowledge base entries | M3 | R4, Acceptance 1 |
| 13 | Multipart Excel Upload API | `POST /api/admin/knowledge-base/import` handling file upload via `multer` | M3 | R2, R4, Acceptance 4 |
| 14 | Admin Portal Vite/React Toolchain | Scaffolding Vite, React, TypeScript, Tailwind CSS, Lucide icons in `admin-panel/` | M4 | R4, Survey |
| 15 | Admin Portal Authentication & Guard | `AuthContext`, `localStorage` token storage, `LoginPage`, and `ProtectedRoute` redirect | M4 | R3, R4, Acceptance 3, 4 |
| 16 | Admin Portal Knowledge Dashboard | KPI stat cards and responsive Knowledge Base table with search and pagination | M4 | R4, Acceptance 4 |
| 17 | Knowledge Base CRUD Modals | UI modals/forms to add, edit, and delete questions, diagnostic queries, and remedies | M4 | R4, Acceptance 4 |
| 18 | Drag-and-Drop Bulk Excel Importer | UI component for `.xlsx` drag-and-drop upload, status bar, and error display | M4 | R2, R4, Acceptance 4 |
| 19 | E2E Opaque-Box Test Suite (Tiers 1-4) | Comprehensive independent test suite covering all features and acceptance criteria | E2E-Track | Dual Track |
| 20 | Adversarial Coverage Hardening (Tier 5) | White-box stress testing, gap analysis, and bug hardening | M5 | Dual Track |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| E2E | E2E Testing Suite Track | Design test runner, test harness, and Tiers 1-4 tests; publish TEST_READY.md | none | DONE |
| M1 | MongoDB Atlas Data Layer & Vector Search | Features 1, 2, 3, 4, 5 (Atlas connection, schema evolution, vector index, CRUD) | none | DONE |
| M2 | Excel Parser & Seed Script | Features 6, 7, 8, 9 (Excel parser, validation, media extraction, CLI seed script) | M1 | DONE |
| M3 | Admin Auth & Knowledge Base REST APIs | Features 10, 11, 12, 13 (Auth endpoints, 401 middleware, CRUD REST APIs, upload endpoint) | M1, M2 | DONE |
| M4 | Web Admin Portal UI & Bulk Import | Features 14, 15, 16, 17, 18 (React Vite portal, login, dashboard, CRUD modals, bulk upload) | M3 | DONE |
| M5 | Final E2E Test Suite Pass & Adversarial Hardening | Features 19, 20 (100% pass on Tiers 1-4 E2E tests, Tier 5 adversarial coverage) | M4, E2E | DONE |

## Interface Contracts

### Backend Data Layer ↔ Excel Ingestion
- `parseExcelBuffer(buffer: Buffer): Promise<ParsedExcelData>`
- `parseExcelFile(filePath: string): Promise<ParsedExcelData>`
- `ParsedExcelData`:
  ```ts
  interface ParsedExcelData {
    level1Questions: Array<{ canonicalQuestionText: string; rawRow: number }>;
    consultationQueries: Array<{ questionText: string; diagnosticQuestions: string[]; rawRow: number }>;
    answers: Array<{ questionText: string; reasonText: string; remedyText: string; videoUrl?: string; answerType: 'level1' | 'diagnostic'; rawRow: number }>;
    stats: { totalRows: { level1: number; consultation: number; answers: number }; dataRows: { level1: number; consultation: number; answers: number } };
  }
  ```
- Error format: Throws `ExcelValidationError` with `statusCode: 400`, `message: string`, `details?: string[]`.

### Backend API ↔ Frontend Admin Portal
- Base URL: `/api/admin`
- Headers: `Authorization: Bearer <token>`
- Authentication:
  - `POST /api/admin/auth/login` -> Request: `{ email, password }` -> Response: `{ success: true, token: string, admin: { email: string, role: string } }`
  - Unauthenticated requests return HTTP 401: `{ success: false, message: "Authentication token missing or invalid" }`
- Knowledge Base:
  - `GET /api/admin/stats` -> Response: `{ success: true, stats: { totalQuestions: number, totalConsultations: number, totalAnswers: number, vectorIndexActive: boolean } }`
  - `GET /api/admin/knowledge-base?search=&page=1&limit=20` -> Response: `{ success: true, total: number, page: number, totalPages: number, items: KnowledgeBaseItem[] }`
  - `POST /api/admin/knowledge-base` -> Request: `{ canonicalQuestionText, tags, diagnosticQuestions: string[], answerText, homeRemedyText, videoUrl }`
  - `PUT /api/admin/knowledge-base/:id` -> Request: Partial<KnowledgeBaseItem>
  - `DELETE /api/admin/knowledge-base/:id` -> Cascades to consultation query and answer.
  - `POST /api/admin/knowledge-base/import` -> `multipart/form-data`, file field `file` -> Response: `{ success: true, counts: { questions: number, consultations: number, answers: number } }`

## Code Layout
```
/Users/aditya/workspace/hh4u/
├── backend/
│   ├── src/
│   │   ├── config/             # db.ts (Atlas connection & dbName config)
│   │   ├── controllers/        # adminAuthController.ts, adminKnowledgeBaseController.ts
│   │   ├── middlewares/        # adminAuthMiddleware.ts (401 enforcement)
│   │   ├── models/             # Level1Question.ts, ConsultationQuery.ts, Answer.ts, Admin.ts
│   │   ├── routes/             # adminRoutes.ts (mounted at /api/admin)
│   │   ├── scripts/            # seedKnowledgeBase.ts, createVectorIndex.ts
│   │   ├── services/           # excelParserService.ts, vectorSearchService.ts, adminKnowledgeBaseService.ts
│   │   └── utils/              # vectorSimilarity.ts
│   └── tests/                  # e2e and unit test suites
├── admin-panel/                # React + Vite + TypeScript Admin Portal
│   ├── src/
│   │   ├── components/         # Navbar, StatCard, KnowledgeTable, EntryModal, BulkUploadZone
│   │   ├── contexts/           # AuthContext.tsx
│   │   ├── pages/              # LoginPage.tsx, DashboardPage.tsx
│   │   └── services/           # api.ts
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── tests/                      # Project-level E2E opaque-box test suites
│   ├── e2e_runner.sh
│   ├── tier1_feature_coverage.test.ts
│   ├── tier2_boundary_corner.test.ts
│   ├── tier3_pairwise_combinations.test.ts
│   └── tier4_real_world_scenarios.test.ts
└── database-dummy.xlsx
```
