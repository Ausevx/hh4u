# Dispatch: Explorer Survey Android (Launch Crash Fix & Firebase Fallback)

You are the Explorer investigating Requirement R1: Android App Launch Crash Fix.

## Working Directory
`/Users/aditya/workspace/hh4u/.agents/teamwork_preview_explorer_survey_android/`

## Context & Objectives
- Authoritative Source: Read `/Users/aditya/workspace/hh4u/.agents/ORIGINAL_REQUEST.md` (specifically `2026-09-21T09:06:15Z`).
- The Android app (Jetpack Compose, Hilt DI) crashes immediately on open.
- Suspected causes: `AuthViewModel.init` calling `firebaseAuthManager.getCurrentUser()`, `ProfileMenu.kt` calling `FirebaseAuth.getInstance().currentUser` directly at composition time, or uninitialized Firebase/Hilt graph.
- The app must survive even if Firebase is misconfigured or unavailable — defaulting gracefully to guest mode.

## Your Tasks
1. Search and inspect all usages of `FirebaseAuth.getInstance()`, Firebase Auth calls, `AuthViewModel`, `ProfileMenu`, `MainActivity`, and Hilt modules in the Android codebase.
2. Trace the initialization sequence and identify all crash vectors.
3. Check how Guest Mode is handled and how to ensure the user flow: Login screen -> "Continue as Guest" -> Chatbot screen works cleanly.
4. Verify the build command (`./gradlew assembleDebug`) and inspect Android project configuration.
5. Provide concrete code-level fix recommendations (exact files, line locations, error handling, try-catch wrapping, fallback defaults).
6. Save your detailed findings in `report.md` and write a soft `handoff.md` in your working directory.

## 2026-09-21T09:08:34Z
You are Explorer 1 investigating Requirement R1: Android App Launch Crash Fix & Graceful Fallback.
Your working directory is /Users/aditya/workspace/hh4u/.agents/teamwork_preview_explorer_survey_android/
First, read /Users/aditya/workspace/hh4u/.agents/teamwork_preview_explorer_survey_android/DISPATCH.md and /Users/aditya/workspace/hh4u/.agents/ORIGINAL_REQUEST.md (specifically section 2026-09-21T09:06:15Z).
Investigate the Android codebase (in /Users/aditya/workspace/hh4u/android or wherever the Android project is located).
Inspect AuthViewModel.kt, FirebaseAuthManager.kt, ProfileMenu.kt, Application class, Hilt modules, and all usages of FirebaseAuth.getInstance().
Trace why the app crashes immediately on launch. Check how to wrap FirebaseAuth calls in try-catch and gracefully fallback to guest mode if Firebase is not initialized or unavailable.
Check the build configuration and verify the build command `./gradlew assembleDebug`.
Write your full findings and recommendations to /Users/aditya/workspace/hh4u/.agents/teamwork_preview_explorer_survey_android/report.md, update progress.md, and create handoff.md. Send a completion message when done.
