# Dispatch — explorer_compose_testing

## 2026-09-17T22:44:05Z

**Objective**: Investigate the testing infrastructure for Compose UI in `/Users/aditya/workspace/hh4u/app`.

**Scope boundaries**:
- Check testing dependencies in `app/build.gradle.kts`: `androidx.compose.ui:ui-test-junit4`, `androidx.compose.ui:ui-test-manifest`, Robolectric, espresso, mockk, etc.
- Can Compose UI tests run as local JVM unit tests (e.g. using Robolectric + ComposeTestRule) or do they require an Android device/emulator? Check what runner is configured and whether Robolectric is supported/set up so `./gradlew testDebugUnitTest` can run Compose UI tests directly on macOS CLI.
- Check existing tests in `app/src/test/` and `app/src/androidTest/`.
- Test running existing unit tests (e.g. `./gradlew test` or `./gradlew testDebugUnitTest`) to verify the test pipeline works in this environment.
- Determine the exact pattern and requirements for writing programmatic Compose UI tests for Home Dashboard, Disease Directory, and Chatbot screens in both Light Mode and Dark Mode, and verifying `DoctorContactFooter`.

**Output**: Write a detailed test strategy report to `/Users/aditya/workspace/hh4u/.agents/explorer_compose_testing/handoff.md`.
