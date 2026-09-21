# Dispatch: Worker M3/M4 — Admin Panel Upload Toggle, Confirmation Modal & APK Info Note

## Working Directory
`/Users/aditya/workspace/hh4u/.agents/teamwork_preview_worker_m3_m4_admin/`

## Context & Objectives
- Authoritative Request: Read `/Users/aditya/workspace/hh4u/.agents/ORIGINAL_REQUEST.md` (specifically `2026-09-21T09:06:15Z`).
- Scope & Contracts: Read `/Users/aditya/workspace/hh4u/PROJECT.md` (Milestones M3 & M4).
- Explorer Findings: Read `/Users/aditya/workspace/hh4u/.agents/teamwork_preview_explorer_survey_admin/report.md` and `handoff.md`.
- Backend Status: Worker M2 has already implemented backend support for `mode: 'append' | 'overwrite'` in `POST /api/admin/knowledge-base/import`.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Write Ownership
You own exclusively:
- `admin-panel/src/types/index.ts`
- `admin-panel/src/services/api.ts`
- `admin-panel/src/components/BulkUploadModal.tsx`
- `admin-panel/src/pages/DashboardPage.tsx`
- Any tests or assets in `admin-panel/` if needed.

## Requirements to Implement

### R3: Bulk Upload Mode Toggle & Confirmation (Admin Panel)
1. In `admin-panel/src/types/index.ts`:
   - Add `UploadMode = 'append' | 'overwrite'`.
   - Update `ImportResponse` to include `mode?: UploadMode`.
2. In `admin-panel/src/services/api.ts`:
   - Update `importExcel(file: File, mode: UploadMode = 'append', onProgress?: (percent: number) => void)` to pass `mode` in both `FormData` and as query parameter (`?mode=...`).
3. In `admin-panel/src/components/BulkUploadModal.tsx`:
   - Add `uploadMode` state defaulting to `'append'`.
   - Add UI toggle/segmented radio buttons for **Append** (Default) and **Overwrite**.
   - When the user selects "Overwrite", show a high-contrast confirmation modal dialog warning:
     *"Warning: Overwrite mode will permanently delete all existing questions, diagnostic consultation trees, and remedy answers from MongoDB Atlas before inserting new data."*
   - Provide "Keep Append" (cancels and leaves mode as append) and "Confirm Overwrite" (sets mode to overwrite).
   - When `uploadMode === 'overwrite'`, render an active warning banner in the modal.
   - When uploading, call `api.knowledgeBase.importExcel(file, uploadMode, onProgress)`.
   - On modal reset or close, reset mode back to `'append'`.

### R4: Clarify APK Rebuild Behavior (Admin Panel)
1. In `admin-panel/src/pages/DashboardPage.tsx`:
   - Near the APK download button in the header, add a tooltip (and title attribute) containing the exact text:
     *"This APK connects to the live backend. Database changes via upload take effect immediately — no APK rebuild needed."*
   - At the top of the dashboard main content (above KPI stats), add an informational banner with an Info icon, title `"Android Mobile App (Live Backend Sync)"`, the exact note text above, and a secondary download button.

### Verification
1. Run `npm run build` in `admin-panel/`. Ensure Vite build succeeds cleanly with exit code 0.
2. Run `npm run lint` (`tsc --noEmit`) in `admin-panel/`. Ensure 0 TypeScript errors.
3. Document your changes and verification logs in `handoff.md`.

## 2026-09-21T13:58:22Z
Received worker invocation prompt:
Implement Admin Panel Bulk Upload Mode Toggle & Confirmation (Requirement R3) and Clarifying APK Rebuild Behavior (Requirement R4).
Work directory: /Users/aditya/workspace/hh4u/.agents/teamwork_preview_worker_m3_m4_admin/
