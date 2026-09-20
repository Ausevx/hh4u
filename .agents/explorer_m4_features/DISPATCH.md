# Dispatch: Explorer 2 (Components & Feature Architecture) for Milestone M4

## Identity & Role
- Archetype: teamwork_preview_explorer
- Working Directory: /Users/aditya/workspace/hh4u/.agents/explorer_m4_features/
- Parent Conversation ID: 1619920f-8f49-4539-86cd-0e9ddbe0814c

## Inputs & Context
- ORIGINAL_REQUEST.md: /Users/aditya/workspace/hh4u/ORIGINAL_REQUEST.md (Features 14-18, Acceptance Criteria 3 & 4)
- PROJECT.md: /Users/aditya/workspace/hh4u/PROJECT.md (Backend API ↔ Frontend Admin Portal contracts)
- Backend routes: /Users/aditya/workspace/hh4u/backend/src/routes/adminRoutes.ts

## Objectives
1. Read ORIGINAL_REQUEST.md and PROJECT.md.
2. Design frontend components in `admin-panel/src/`:
   - `services/api.ts`: Axios or Fetch wrapper with base URL, Authorization Bearer token injection from `localStorage`, and response 401 interception redirecting to `/login`.
   - `contexts/AuthContext.tsx`: `AuthProvider`, `useAuth` hook, managing `token`, `admin` user state, `login(email, password)`, `logout()`.
   - `components/ProtectedRoute.tsx`: Guards routes, redirects unauthenticated state to `/login`.
   - `pages/LoginPage.tsx`: Clean medical theme login form with email/password validation, error message alerts, and loading spinner.
   - `pages/DashboardPage.tsx`:
     - Top navigation bar with admin email display and Logout button.
     - KPI Stat Cards (`totalQuestions`, `totalConsultations`, `totalAnswers`, `vectorIndexActive`).
     - Search input (debounced) and pagination controls (Previous, Next, page count).
     - Responsive Knowledge Base Table: canonical question, tags, diagnostic query count, actions (View/Edit/Delete).
     - Expandable row details: diagnostic questions (1-3), answer reason, remedy, video link preview.
   - `components/KnowledgeModal.tsx`: Modal dialog for Create and Edit with fields for Canonical Question, Tags, 3 Diagnostic Questions, Answer / Remedy text, YouTube Video URL with validation.
   - `components/DeleteConfirmModal.tsx`: Confirmation dialog warning about cascade deletion.
   - `components/BulkUploadModal.tsx`: Drag-and-drop zone for `.xlsx` file upload, upload progress indicator, success/failure notification modal showing imported counts.
3. Document detailed component architecture, prop interfaces, and state flow in `/Users/aditya/workspace/hh4u/.agents/explorer_m4_features/handoff.md`.
4. Send a message to parent when finished.

## 2026-09-19T07:54:29Z
You are Explorer 2 for Milestone M4 (Components & Feature Architecture). Working directory: /Users/aditya/workspace/hh4u/.agents/explorer_m4_features/. Read /Users/aditya/workspace/hh4u/.agents/explorer_m4_features/DISPATCH.md, /Users/aditya/workspace/hh4u/ORIGINAL_REQUEST.md, and /Users/aditya/workspace/hh4u/PROJECT.md. Design the component architecture for admin-panel/src/: api service, AuthContext, ProtectedRoute, LoginPage, DashboardPage (stats cards, table, expandable rows), Create/Edit KnowledgeModal, DeleteConfirmModal, and Drag-and-Drop BulkUploadModal. Write your complete design to /Users/aditya/workspace/hh4u/.agents/explorer_m4_features/handoff.md and send_message to parent (1619920f-8f49-4539-86cd-0e9ddbe0814c).
