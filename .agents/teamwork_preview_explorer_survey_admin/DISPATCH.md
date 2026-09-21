# Dispatch: Explorer Survey Admin (Upload Overwrite/Append Toggle & APK Note)

You are the Explorer investigating Requirements R3 and R4.

## Working Directory
`/Users/aditya/workspace/hh4u/.agents/teamwork_preview_explorer_survey_admin/`

## Context & Objectives
- Authoritative Source: Read `/Users/aditya/workspace/hh4u/.agents/ORIGINAL_REQUEST.md` (specifically `2026-09-21T09:06:15Z`).
- R3: Admin Panel Upload Overwrite vs Append Toggle
  - In `admin-panel/src/components/BulkUploadModal.tsx`, add a toggle (switch or radio buttons) for:
    - Append (default): Add new entries alongside existing ones
    - Overwrite: Delete all existing entries first, then insert the new ones
  - When "Overwrite" is selected, show a confirmation dialog warning that all existing data will be replaced.
  - Send the `mode` to the backend bulk upload endpoint.
- R4: Clarify APK Rebuild Behavior
  - The APK is a static file served from `admin-panel/public/healing-hands-4u.apk`. It does NOT auto-rebuild when someone uploads data.
  - Add a small info banner or tooltip near the APK download button on the dashboard explaining: "This APK connects to the live backend. Database changes via upload take effect immediately — no APK rebuild needed."

## Your Tasks
1. Search and inspect `BulkUploadModal.tsx`, upload API client services, and any related modal/dialog components.
2. Search and inspect where the APK download button is located in `admin-panel` (e.g. `Dashboard.tsx`, header, etc.).
3. Inspect `admin-panel/public/healing-hands-4u.apk` presence and references.
4. Plan the exact UI components for the toggle, confirmation dialog, and APK banner/tooltip following existing styling (Tailwind/CSS/MUI/etc.).
5. Check build command (`npm run build`) in `admin-panel`.
6. Save your detailed findings in `report.md` and write a soft `handoff.md` in your working directory.

## 2026-09-21T09:08:34Z
Investigate Requirement R3 and R4: Admin Panel Bulk Upload Modal (Overwrite vs Append Toggle & Confirmation) and APK Info Note.
Working directory: /Users/aditya/workspace/hh4u/.agents/teamwork_preview_explorer_survey_admin/
Inspect BulkUploadModal.tsx, upload API services, Dashboard APK download button, admin-panel build command. Write findings and recommendations to report.md, update progress.md, and create handoff.md.

