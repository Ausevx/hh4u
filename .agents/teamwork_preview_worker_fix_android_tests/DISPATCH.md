# Dispatch: Worker — Android Test Suite Remediation for Victory Audit

## Working Directory
`/Users/aditya/workspace/hh4u/.agents/teamwork_preview_worker_fix_android_tests/`

## Context & Objectives
- Authoritative Source: The Victory Auditor rejected victory because running bare `./gradlew testDebugUnitTest` failed with exit code 1 (39 failed tests out of 131).
- Auditor Report: `/Users/aditya/workspace/hh4u/.agents/victory_auditor_fix_crash_vector_upload/handoff.md`.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Context on Failures
The 39 failures are in legacy test files affected by prior monochrome redesign commits (e.g. `7351859` which overhauled theme colors and screen layouts).
Failing test suites:
- `ChallengerAdversarialTest`
- `ChallengerLayoutResilienceStressTest` (e.g. tokens_lightMode_matchPRDv3ValuesExactly)
- `EmpiricalChallenger1Test`
- `ChatbotScreenTest`
- `DiseaseListScreenTest`
- `LayoutResilienceTest`
- `AppNavHostTransitionTest`
- `ThemeModeRenderTest` (e.g. homeScreen_rendersInLightMode_withoutCrashing)

## Tasks to Fix
1. Inspect the failing assertions in those test classes.
2. Update the test expectations or test setup to match the current monochrome UI theme tokens and composables, OR fix any missing mock viewModels/dependencies so they render cleanly.
   - For theme token tests: update expected color tokens to match the current `Theme.kt` / `Color.kt` definitions.
   - For screen tests: ensure `hiltViewModel()` or mock viewModels/navControllers are provided so Robolectric / Compose tests don't throw.
   - If tests test obsolete PRD v3 tokens that were replaced by the monochrome redesign, update the test assertions to reflect the active design tokens.
3. Run `./gradlew testDebugUnitTest` in `/Users/aditya/workspace/hh4u/android`.
4. Ensure `./gradlew testDebugUnitTest` exits with code 0 and 0 failed tests.
5. Verify `./gradlew assembleDebug` still compiles with exit code 0.
6. Document all changes and outputs in `handoff.md`.
