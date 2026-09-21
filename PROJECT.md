# Project: Healing Hands4U Ecosystem Crash Fix, Vector Search Repair & Admin Upload Mode

## Architecture
The system consists of three interconnected subsystems in the Healing Hands4U ecosystem:
1. **Android Mobile Application (`android/`)**:
   - Jetpack Compose, Material 3, Hilt Dependency Injection.
   - Authentication flow: Email OTP, Google Sign-In, and Guest Mode.
   - Resilient fallback architecture: The app must open and run even when `FirebaseApp` is not initialized or `google-services.json` is missing/misconfigured, defaulting smoothly to Guest Mode.
   - Safe navigation from Login Screen -> "Continue as Guest" -> Home Dashboard -> Chatbot Query Screen.
2. **Express & MongoDB Atlas Backend (`backend/`)**:
   - Express v5 / TypeScript on port 5000.
   - MongoDB Atlas (`cluster0.iifejq3.mongodb.net`, database `hh4u`) with Atlas Vector Search index `vector_index` on `level1questions.embedding` (1536 dims, cosine).
   - Live Gemini Embeddings (`gemini-embedding-2`, 1536 dimensions) and Gemini LLM (`gemini-2.5-flash`).
   - Vector Search Service & Startup Backfill: Replaces outdated synthetic mock embeddings with live Gemini embeddings to enable query matching for remedies (e.g. "vomiting", "headache").
   - Diagnostic Endpoint (`GET /api/admin/vector-status`): Real-time health check on Level1Question embeddings, Atlas index status, and Gemini API key status.
   - Bulk Upload Pipeline (`POST /api/admin/knowledge-base/import`): Supports `mode: 'append' | 'overwrite'` to either append new records or wipe existing records before inserting.
3. **React Web Admin Portal (`admin-panel/`)**:
   - React 18/19 + Vite + TypeScript + Tailwind CSS.
   - Bulk Upload Modal (`BulkUploadModal.tsx`): Overwrite vs Append toggle (Append default) with explicit confirmation modal on Overwrite selection.
   - Dashboard (`DashboardPage.tsx`): Informational banner and hover tooltip on APK download button explaining live backend connection behavior.

## Feature Inventory
Every feature from the survey and requirements is assigned to a milestone:

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Android Launch Crash Fix | Wrap `FirebaseAuth.getInstance()` calls in `AuthViewModel` & `FirebaseAuthManager` with try-catch; default to guest on failure | M1 | R1, Survey |
| 2 | Android Composition Crash Fix | Guard `ProfileMenu.kt` composition-level Firebase call with try-catch / remembered state so navigation to Chatbot doesn't crash | M1 | R1, Survey |
| 3 | Android Guest Flow & Build Validation | Ensure Login -> Continue as Guest -> Chatbot flow works; verify `./gradlew assembleDebug` compiles cleanly | M1 | R1, Acceptance |
| 4 | Vector Search Mock-to-Live Backfill | Startup check & backfill utility detecting missing/mock embeddings and regenerating live Gemini 1536-dim embeddings in rate-limited batches | M2 | R2, Survey |
| 5 | Vector Search Pipeline Remedy Resolution | Verify Atlas vector index and ensure queries like "vomiting" and "headache" return matching remedies with confidence > 0.75 | M2 | R2, Acceptance |
| 6 | Vector Search Diagnostic API | `GET /api/admin/vector-status` returning total questions, embeddings count, Atlas vector index status, and Gemini key status | M2 | R2, Acceptance |
| 7 | Admin Bulk Upload Append vs Overwrite Toggle | Add mode selection in `BulkUploadModal.tsx` (Append default, Overwrite option) | M3 | R3, Survey |
| 8 | Admin Bulk Upload Overwrite Confirmation Modal | Show high-visibility confirmation warning dialog when Overwrite is selected before enabling mode | M3 | R3, Acceptance |
| 9 | Backend Bulk Upload Mode Handling | Update `POST /api/admin/knowledge-base/import` controller and service to handle `mode: 'append' | 'overwrite'` | M3 | R3, Acceptance |
| 10 | Admin Dashboard APK Rebuild Note | Add info banner and tooltip near APK download button clarifying live backend connection | M4 | R4, Acceptance |
| 11 | Ecosystem Verification & Hardening | Full verification of all builds (`./gradlew assembleDebug`, backend `npm run build` & `npm test`, admin `npm run build`), review, and audit | M5 | Acceptance |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Android App Launch Crash Fix & Guest Mode | Features 1, 2, 3 (FirebaseAuth safe wrappers, ProfileMenu guard, assembleDebug) | none | DONE |
| M2 | Backend Vector Search Repair & Diagnostic | Features 4, 5, 6 (Backfill utility, startup check, remedy search fix, GET /api/admin/vector-status) | none | DONE |
| M3 | Admin Panel Upload Toggle & Backend Mode | Features 7, 8, 9 (BulkUploadModal toggle, confirmation modal, backend mode support) | M2 | DONE |
| M4 | Admin Dashboard APK Rebuild Clarification | Feature 10 (Dashboard info banner and APK download button tooltip) | none | DONE |
| M5 | Full Ecosystem Integration & Verification | Feature 11 (End-to-end build validation, reviewer verification, challenger testing, forensic audit) | M1, M2, M3, M4 | DONE |

## Interface Contracts

### Backend Diagnostic Endpoint
- `GET /api/admin/vector-status`
- Response:
  ```json
  {
    "success": true,
    "totalLevel1Questions": 184,
    "questionsWithEmbeddings": 184,
    "vectorIndexExists": true,
    "vectorIndexQueryable": true,
    "geminiApiKeyConfigured": true,
    "geminiApiKeyStatus": "CONFIGURED",
    "timestamp": "2026-09-21T09:20:00.000Z"
  }
  ```

### Backend Bulk Upload Contract
- `POST /api/admin/knowledge-base/import?mode=append` or `?mode=overwrite`
- Body: `multipart/form-data` with `file: <.xlsx buffer>`, `mode: "append" | "overwrite"`
- Response:
  ```json
  {
    "success": true,
    "mode": "append",
    "counts": {
      "questions": 184,
      "consultations": 184,
      "answers": 220
    }
  }
  ```

### Frontend Upload Modal Contract
- `UploadMode = 'append' | 'overwrite'`
- Default: `'append'`
- When `'overwrite'` clicked: Open confirmation dialog warning of permanent database deletion. If confirmed, set `uploadMode = 'overwrite'` and display warning banner. If canceled, keep `'append'`.

### APK Rebuild Note String
- Verbatim: `"This APK connects to the live backend. Database changes via upload take effect immediately — no APK rebuild needed."`

## Code Layout
```
/Users/aditya/workspace/hh4u/
├── android/
│   ├── app/src/main/java/com/healinghands4u/
│   │   ├── HealingHandsApp.kt
│   │   ├── MainActivity.kt
│   │   ├── auth/
│   │   │   ├── FirebaseAuthManager.kt
│   │   │   └── AuthViewModel.kt
│   │   └── ui/
│   │       ├── components/ProfileMenu.kt
│   │       └── screens/auth/LoginScreen.kt
│   └── gradlew
├── backend/
│   ├── src/
│   │   ├── index.ts
│   │   ├── controllers/
│   │   │   ├── adminKnowledgeBaseController.ts
│   │   │   └── adminVectorController.ts
│   │   ├── routes/
│   │   │   └── adminRoutes.ts
│   │   └── services/
│   │       ├── vectorSearchService.ts
│   │       ├── vectorBackfillService.ts
│   │       └── adminKnowledgeBaseService.ts
│   └── tests/
└── admin-panel/
    ├── src/
    │   ├── components/BulkUploadModal.tsx
    │   ├── pages/DashboardPage.tsx
    │   ├── services/api.ts
    │   └── types/index.ts
    └── public/healing-hands-4u.apk
```
