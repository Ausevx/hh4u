# Dispatch: Worker M1 — Android App Launch Crash Fix & Graceful Fallback

## Working Directory
`/Users/aditya/workspace/hh4u/.agents/teamwork_preview_worker_m1_android/`

## Context & Objectives
- Authoritative Request: Read `/Users/aditya/workspace/hh4u/.agents/ORIGINAL_REQUEST.md` (specifically section `2026-09-21T09:06:15Z`).
- Scope & Contracts: Read `/Users/aditya/workspace/hh4u/PROJECT.md` (Milestone 1).
- Explorer Findings: Read `/Users/aditya/workspace/hh4u/.agents/teamwork_preview_explorer_survey_android/report.md` and `handoff.md`.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Write Ownership
You own exclusively:
- `android/app/src/main/java/com/healinghands4u/auth/FirebaseAuthManager.kt`
- `android/app/src/main/java/com/healinghands4u/auth/AuthViewModel.kt`
- `android/app/src/main/java/com/healinghands4u/ui/components/ProfileMenu.kt`
- `android/app/src/main/java/com/healinghands4u/ui/screens/auth/LoginScreen.kt`
- `android/app/src/main/java/com/healinghands4u/HealingHandsApp.kt`
- Any unit tests under `android/app/src/test/` if necessary.

## Requirements to Implement
1. **Fix `FirebaseAuthManager.kt`**:
   - Wrap `FirebaseAuth.getInstance()` access in try-catch so it never throws uncaught exceptions when `FirebaseApp` is not initialized or unavailable.
   - Return safe fallback/null for `getCurrentUser()` and handle auth methods gracefully when Firebase is unavailable.
2. **Fix `AuthViewModel.kt`**:
   - Ensure the `init` block and all methods do not throw if Firebase is unavailable.
   - Default to guest user mode cleanly (`AuthState.Guest` or unauthenticated/guest state as designed).
3. **Fix `ProfileMenu.kt`**:
   - Wrap `FirebaseAuth.getInstance().currentUser` call in try-catch / remembered state so composing `ProfileMenu` (embedded in `ChatHeader`) never crashes the app.
   - Gracefully display guest profile or placeholder when Firebase user is null or unavailable.
4. **Fix `HealingHandsApp.kt`**:
   - In `onCreate()`, wrap `FirebaseApp.initializeApp(this)` in try-catch so failure to initialize Firebase does not terminate the process.
5. **Ensure Guest Flow**:
   - Verify that clicking "Continue as Guest" on `LoginScreen.kt` transitions smoothly to the dashboard / chatbot query screen without crashing.
6. **Verification**:
   - Run `./gradlew assembleDebug` in `/Users/aditya/workspace/hh4u/android`.
   - Ensure the build passes with exit code 0.
   - Document verification commands and output in `handoff.md`.

## 2026-09-21T09:19:43Z
You are Worker M1 tasked with fixing the Android App Launch Crash and implementing Graceful Fallback to Guest Mode (Requirement R1).
Your working directory is /Users/aditya/workspace/hh4u/.agents/teamwork_preview_worker_m1_android/
First, read /Users/aditya/workspace/hh4u/.agents/teamwork_preview_worker_m1_android/DISPATCH.md, /Users/aditya/workspace/hh4u/.agents/ORIGINAL_REQUEST.md (specifically section 2026-09-21T09:06:15Z), and /Users/aditya/workspace/hh4u/.agents/teamwork_preview_explorer_survey_android/handoff.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Implement the crash fixes and guest fallback across:
- `android/app/src/main/java/com/healinghands4u/auth/FirebaseAuthManager.kt`
- `android/app/src/main/java/com/healinghands4u/auth/AuthViewModel.kt`
- `android/app/src/main/java/com/healinghands4u/ui/components/ProfileMenu.kt`
- `android/app/src/main/java/com/healinghands4u/ui/screens/auth/LoginScreen.kt`
- `android/app/src/main/java/com/healinghands4u/HealingHandsApp.kt`

Run `./gradlew assembleDebug` in `/Users/aditya/workspace/hh4u/android` to verify that compilation succeeds cleanly.
Write your changes and verification logs to `handoff.md` and send a completion message.
