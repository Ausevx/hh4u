# Orchestration Plan: Healing Hands4U Ecosystem Fixes

## Objective
Fix critical runtime crash in the Android app (R1), repair broken vector search pipeline & add diagnostic endpoint in backend (R2), add Overwrite vs Append toggle with confirmation in Admin Panel & backend (R3), and clarify APK rebuild behavior in Admin Dashboard (R4).

## Step-by-Step Execution Plan

### Step 0: Survey & Codebase Exploration (3 Parallel Explorers)
- **Explorer 1 (Android App Focus)**:
  - Investigate `AuthViewModel.kt`, `FirebaseAuthManager.kt`, `ProfileMenu.kt`, Hilt DI setup, and any other places calling `FirebaseAuth.getInstance()`.
  - Check how guest mode works and how fallback can be implemented cleanly to ensure `./gradlew assembleDebug` compiles and the app launches smoothly without crashing even if Firebase is missing/uninitialized.
  - Check existing Android test setups or build scripts.
- **Explorer 2 (Backend Vector Search Focus)**:
  - Investigate `backend/src/services/vectorSearchService.ts`, `backend/src/models/`, seed scripts, upload routes, and chatbot query pipeline (`POST /api/chatbot/query`).
  - Diagnose why "vomiting" or "headache" queries return no results. Check `Level1Question` schema, embedding generation logic, Gemini embedding service configuration, Atlas index verification/creation, and missing embedding backfill/startup check.
  - Plan `GET /api/admin/vector-status` implementation and verify `npm run build` / `npm test`.
- **Explorer 3 (Admin Panel & Bulk Upload Focus)**:
  - Investigate `admin-panel/src/components/BulkUploadModal.tsx`, upload API client, backend upload routes (`/api/admin/upload` or similar), and dashboard component (`admin-panel/src/pages/Dashboard.tsx` or similar) where the APK download button lives.
  - Plan Overwrite vs Append toggle, confirmation dialog for overwrite, backend bulk upload endpoint handling of `mode`, and APK rebuild informational banner/tooltip.

### Step 1: Synthesis & Scope Finalization
- Synthesize all 3 explorer reports into `PROJECT.md` with complete Feature Inventory, code layouts, and interface contracts.

### Step 2: Milestone 1 — Android App Launch Crash Fix
- Dispatch Worker:
  - Wrap all `FirebaseAuth.getInstance()` and Firebase calls with safe fallback logic.
  - Handle uninitialized Firebase app gracefully, defaulting to guest user.
  - Ensure `AuthViewModel` and `ProfileMenu` survive missing Firebase.
  - Run `./gradlew assembleDebug`.
- Dispatch Reviewers (2x), Challengers (2x), and Forensic Auditor.
- Pass gate checks.

### Step 3: Milestone 2 — Backend Vector Search Pipeline & Status Diagnostic
- Dispatch Worker:
  - Implement startup check or utility to detect documents missing embeddings and backfill them.
  - Ensure vector index check/creation is handled.
  - Implement `GET /api/admin/vector-status`.
  - Fix query matching so queries like "vomiting" and "headache" return matching remedies.
  - Run `npm run build` and `npm test` in `backend/`.
- Dispatch Reviewers, Challengers, and Forensic Auditor.
- Pass gate checks.

### Step 4: Milestone 3 & 4 — Admin Panel Upload Toggle & APK Info
- Dispatch Worker:
  - Add Overwrite / Append toggle in `BulkUploadModal.tsx` (Append default).
  - Add confirmation warning modal when Overwrite is selected.
  - Update backend bulk upload endpoint to respect `mode` ('append' vs 'overwrite', deleting existing entries before inserting if overwrite).
  - Add informational banner or tooltip near APK download button in admin dashboard.
  - Run `npm run build` in `admin-panel/` and verify backend builds and tests pass.
- Dispatch Reviewers, Challengers, and Forensic Auditor.
- Pass gate checks.

### Step 5: Final End-to-End Integration & Verification
- Verify all ecosystem components compile and run:
  - Android: `./gradlew assembleDebug`
  - Backend: `npm run build`, `npm test`
  - Admin Panel: `npm run build`
- Perform adversarial tests and forensic audit.

### Step 6: Final Reporting & Handoff
- Deliver structured `handoff.md` and report completion to caller parent.
