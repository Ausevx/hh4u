# Dispatch — worker_android_ui_m2

## Objective
Implement Milestone 2: Programmatic Compose UI Test Suite & Verification for the Healing Hands4U Android UI.

## Scope & Acceptance Criteria:
1. **Chatbot Screen Tests** (`app/src/test/java/com/healinghands4u/presentation/chatbot/ChatbotScreenTest.kt`):
   - Programmatic Compose UI tests for `ChatbotQueryScreen`:
     - renders header, prompt, query input field, mic button, and quick reply chips.
     - send button disabled when input blank, enabled when text entered.
     - consultation checkbox toggles button label ("Start Consultation") and callback with `isConsultation = true`.
   - Programmatic Compose UI tests for `ConsultationScreen`:
     - renders question, user query recap, and dispatches Yes/No callbacks.
   - Programmatic Compose UI tests for `ChatbotAnswerScreen`:
     - renders `RxCard` centerpiece (remedy name, dosage, home remedy, and safety disclaimer).
     - verifies `DoctorContactFooter` is embedded and rendered (`FOOTER_CARD`, `FOOTER_DOCTOR_NAME`, `FOOTER_WHATSAPP_BUTTON`, `FOOTER_CALL_BUTTON`).
     - verifies `VideoLink` renders when URL is present.

2. **Theme Mode Render Tests (Light & Dark Mode)** (`app/src/test/java/com/healinghands4u/presentation/theme/ThemeModeRenderTest.kt`):
   - Verify `HomeScreen` renders in Light Mode without crashing (`HealingHandsTheme(darkTheme = false)`).
   - Verify `HomeScreen` renders in Dark Mode without crashing (`HealingHandsTheme(darkTheme = true)`).
   - Verify `DiseaseListScreen` renders in Light Mode without crashing.
   - Verify `DiseaseListScreen` renders in Dark Mode without crashing.
   - Verify Chatbot screens (`ChatbotQueryScreen`, `ChatbotAnswerScreen`) render in Light and Dark mode without crashing.
   - Verify `DoctorContactFooter` renders in both themes safely without crashing.

3. **Content Screen Footer Verification**:
   - Update `app/src/test/java/com/healinghands4u/presentation/diseaselist/DiseaseListScreenTest.kt` to verify that `DoctorContactFooter` (`FOOTER_CARD`, `FOOTER_DOCTOR_NAME`, `FOOTER_WHATSAPP_BUTTON`, `FOOTER_CALL_BUTTON`) is embedded and renders on the Disease Directory screen.

4. **Adversarial & Regression Verification**:
   - Run `./gradlew testDebugUnitTest` and verify that ALL test suites pass with 0 failures (including all existing tests in `HomeScreenTest`, `DiseaseListScreenTest`, `PlannerScreenTest`, `LoginScreenTest`, `AppNavHostTransitionTest`, `LayoutResilienceTest`, `DoctorContactFooterTest`, and `ChallengerAdversarialTest`).

Write your handoff report to `/Users/aditya/workspace/hh4u/.agents/worker_android_ui_m2/handoff.md`.

## 2026-09-17T22:57:38Z
You are the Test Implementation Worker for Milestone 2 of the Healing Hands4U project.
Your working directory is: /Users/aditya/workspace/hh4u/.agents/worker_android_ui_m2/
Original parent conversation ID: 44b12c5c-1fb4-4491-a8c3-ef335cbdd2b4

MANDATORY: Read /Users/aditya/workspace/hh4u/ORIGINAL_REQUEST.md and /Users/aditya/workspace/hh4u/.agents/orchestrator_android_ui/SCOPE.md before starting work.
Also study the survey and implementation handoffs:
- /Users/aditya/workspace/hh4u/.agents/explorer_compose_testing/handoff.md (detailed blueprints for ChatbotScreenTest, ThemeModeRenderTest, and footer checks)
- /Users/aditya/workspace/hh4u/.agents/worker_android_ui_m1/handoff.md (Milestone 1 implementation details)

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your exclusive write ownership:
- `app/src/test/java/com/healinghands4u/`
- `app/src/main/java/com/healinghands4u/presentation/common/TestTags.kt` (if additional test tags needed)

Your tasks:
1. Implement `app/src/test/java/com/healinghands4u/presentation/chatbot/ChatbotScreenTest.kt` verifying:
   - ChatbotQueryScreen renders header, input, and quick replies.
   - Send button disabled when blank, enabled when populated.
   - Consultation checkbox toggles button label and passes `isConsultation = true`.
   - ConsultationScreen renders question and records Yes/No choices.
   - ChatbotAnswerScreen renders RxCard (remedy, dosage, home remedy, safety disclaimer), VideoLink, and embedded DoctorContactFooter.
2. Implement `app/src/test/java/com/healinghands4u/presentation/theme/ThemeModeRenderTest.kt` verifying:
   - HomeScreen renders in Light and Dark mode without crashing.
   - DiseaseListScreen renders in Light and Dark mode without crashing.
   - Chatbot screens (Query & Answer) render in Light and Dark mode without crashing.
   - DoctorContactFooter renders in both Light and Dark themes without crashing.
3. Update `app/src/test/java/com/healinghands4u/presentation/diseaselist/DiseaseListScreenTest.kt` adding explicit test verifying `DoctorContactFooter` is embedded and displayed on the Disease Directory screen.
4. Run `./gradlew testDebugUnitTest` and verify that 100% of all tests pass with 0 failures across all test suites. Document exact test counts and execution times.

Write your full handoff report to /Users/aditya/workspace/hh4u/.agents/worker_android_ui_m2/handoff.md.
Keep /Users/aditya/workspace/hh4u/.agents/worker_android_ui_m2/progress.md updated.
Send a completion message back to me when done.

