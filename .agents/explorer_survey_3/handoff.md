# Handoff Report: Android Live Text Query Pipeline Survey

**Working Directory:** `/Users/aditya/workspace/hh4u/.agents/explorer_survey_3`  
**Handoff Type:** Hard (Task complete)  
**Date:** 2026-09-20  

---

## 1. Observation

1. **Android Networking Configuration:**
   - File: `/Users/aditya/workspace/hh4u/app/src/main/java/com/healinghands4u/di/NetworkModule.kt` (lines 18-23):
     `baseUrl("https://hh4u-production.up.railway.app/")`. No `OkHttpClient`, no logging, no timeout configurations.
   - File: `/Users/aditya/workspace/hh4u/app/src/main/java/com/healinghands4u/data/remote/ChatbotApi.kt` (lines 11-19):
     ```kotlin
     data class ChatbotQueryResponse(
         val success: Boolean,
         val message: String?,
         val answer: String?,
         val remedyText: String?,
         val homeRemedyText: String?,
         val videoUrl: String?,
         val diagnosticQuestions: List<DiagnosticQuestionDto>?
     )
     ```
     `ChatbotApi` defines only `@POST("api/chatbot/query")`. It does not define `@POST("api/chatbot/consultation-answer")`.

2. **Live Backend Response Structure:**
   - Tool Command: `curl -s -X POST https://hh4u-production.up.railway.app/api/chatbot/query -H "Content-Type: application/json" -d '{"queryText": "Is my frequent heartburn because of acidity or something serious?", "intent": "direct_answer"}'`
   - Verbatim Output Snippet:
     ```json
     {
       "success": true,
       "sessionId": "6ab0172ef78ae7ae4050ec95",
       "matchConfident": true,
       "confidenceScore": 1,
       "intent": "direct_answer",
       "matchedLevel1Question": { ... },
       "answer": {
         "id": "6aadf954e8f4af9b788643cb",
         "answerText": "Heartburn is typically attributed to elevated Pitta...",
         "homeRemedyText": "To alleviate immediate discomfort...",
         "videoUrl": "https://youtu.be/a5MQWTSoa6A?si=sx0sgzweS34WwcNM"
       },
       "matchCandidates": [ ... ]
     }
     ```
     `answer` is a JSON Object with fields `id`, `answerText`, `homeRemedyText`, and `videoUrl`. There are no root-level `remedyText`, `homeRemedyText`, or `videoUrl` fields.

3. **Fallback Strings in ViewModels and UI Screens:**
   - File: `/Users/aditya/workspace/hh4u/app/src/main/java/com/healinghands4u/presentation/chatbot/ChatbotViewModel.kt` (lines 46-50):
     ```kotlin
     _state.value = ChatbotUiState.Success(
         answerText = response.answer ?: response.remedyText ?: "Found remedy",
         homeRemedy = response.homeRemedyText,
         videoUrl = response.videoUrl
     )
     ```
     Contains dummy fallback `"Found remedy"`. `dosage` is omitted from `Success` constructor.
   - File: `/Users/aditya/workspace/hh4u/app/src/main/java/com/healinghands4u/presentation/chatbot/answer/ChatbotAnswerScreen.kt` (lines 112-116):
     ```kotlin
     RxCard(
         remedyName = state.answerText,
         dosage = state.dosage ?: "4 pills, 2 times daily after meals",
         homeRemedy = state.homeRemedy,
         safetyDisclaimer = "If disease does not cure within 2 days then consult doctor right now"
     )
     ```
     Contains hardcoded fallback dosage `"4 pills, 2 times daily after meals"` and static safety disclaimer.

4. **Hardcoded Consultation Pipeline:**
   - File: `/Users/aditya/workspace/hh4u/app/src/main/java/com/healinghands4u/presentation/navigation/AppNavHost.kt` (lines 103-114):
     ```kotlin
     composable(Screen.Consultation.route) {
         ConsultationScreen(
             questionText = "Are you experiencing a burning sensation?",
             onBackClick = { navController.popBackStack() },
             onAnswerSelected = { _ ->
                 navController.navigate("${Screen.ChatbotAnswer.route}?query=burning%20sensation") {
                     popUpTo(Screen.ChatbotQuery.route) { inclusive = false }
                 }
             }
         )
     }
     ```
   - File: `/Users/aditya/workspace/hh4u/app/src/main/java/com/healinghands4u/presentation/chatbot/consultation/ConsultationScreen.kt` (line 83):
     `message = "Query: I am experiencing acute symptoms and need a personalized assessment."`
   - File: `/Users/aditya/workspace/hh4u/app/src/main/java/com/healinghands4u/presentation/chatbot/consultation/ConsultationViewModel.kt` (lines 11-15):
     `val diagnosticQuestions = listOf(DiagnosticQuestionUI("q1", "Did you eat outside food recently?")...)`

5. **Unit Test Compilation Failure:**
   - Tool Command: `./gradlew compileDebugUnitTestKotlin`
   - Verbatim Output Snippet:
     ```
     e: file:///Users/aditya/workspace/hh4u/app/src/test/java/com/healinghands4u/presentation/ChallengerLayoutResilienceStressTest.kt:95:21 Cannot find a parameter with this name: answerText
     e: file:///Users/aditya/workspace/hh4u/app/src/test/java/com/healinghands4u/presentation/chatbot/ChatbotScreenTest.kt:223:21 Cannot find a parameter with this name: answerText
     ```

---

## 2. Logic Chain

1. **DTO Deserialization Failure:**
   From Observation 1 and Observation 2, `ChatbotApi.kt` expects `answer: String?`, but the live backend returns `answer` as a JSON Object `{ id, answerText, homeRemedyText, videoUrl }`. When Retrofit processes the network response, Gson encounters `BEGIN_OBJECT` where `STRING` was expected and throws `com.google.gson.JsonSyntaxException`.
2. **Fallback Execution:**
   Because of step 1, the network call fails. Even if deserialization did not throw an error (e.g. if `answer` were null), Observation 3 shows `ChatbotViewModel.kt` falls back to the dummy string `"Found remedy"`. Additionally, because `ChatbotViewModel` does not set `dosage`, `ChatbotAnswerScreen` defaults to `"4 pills, 2 times daily after meals"` (Observation 3).
3. **Bypassing the Consultation Backend:**
   From Observation 4, `AppNavHost.kt` hardcodes `questionText = "Are you experiencing a burning sensation?"` and navigates on completion to `${Screen.ChatbotAnswer.route}?query=burning%20sensation`. `ConsultationViewModel` maintains offline mock questions and never invokes `ChatbotApi`. Thus, the consultation flow is entirely disconnected from the live backend.
4. **Test Suite Regressions:**
   From Observation 5, altering `ChatbotAnswerScreen`'s parameter signature to take `query: String` rather than maintaining an overloaded constructor broke the existing Robolectric unit test suite.

---

## 3. Caveats

- Voice transcription (STT/TTS): Not investigated in depth, as per user prompt instruction ("You may ignore or hide STT/TTS voice features").
- Admin Portal and CLI seed scripts were inspected for context but are not part of the Android client text query pipeline.
- Production Railway backend relies on live MongoDB Atlas cluster and Gemini API key configured in Railway environment.

---

## 4. Conclusion

The Android UI does **NOT** strictly render from the Retrofit network response:
1. The direct answer pipeline is broken by a JSON schema mismatch (`answer: String?` vs JSON Object) and relies on hardcoded fallback strings (`"Found remedy"`, `"4 pills, 2 times daily after meals"`, `"If disease does not cure within 2 days..."`).
2. The consultation pipeline is an entirely offline mock with hardcoded diagnostic questions and a hardcoded `"burning sensation"` redirect.
3. The unit test suite is failing compilation due to signature mismatch on `ChatbotAnswerScreen`.

Full remediation requires:
- Updating `ChatbotApi.kt` DTOs (`AnswerDto`, `ConsultationAnswerRequest`, `ConsultationResolutionResponse`).
- Updating `ChatbotViewModel` to map `AnswerDto` fields without dummy fallbacks and handle `fallback: true` messages.
- Wiring `ConsultationViewModel` and `AppNavHost` to fetch live diagnostic questions and submit answers to `api/chatbot/consultation-answer`.
- Adding an overloaded `ChatbotAnswerScreen` Composable to support both live query ViewModel binding and parameter-based unit tests.

---

## 5. Verification Method

1. **Inspect DTOs and Fallback Strings:**
   - Review `/Users/aditya/workspace/hh4u/app/src/main/java/com/healinghands4u/data/remote/ChatbotApi.kt`
   - Review `/Users/aditya/workspace/hh4u/app/src/main/java/com/healinghands4u/presentation/chatbot/ChatbotViewModel.kt`
   - Review `/Users/aditya/workspace/hh4u/app/src/main/java/com/healinghands4u/presentation/navigation/AppNavHost.kt`
2. **Reproduce Compilation Failure:**
   - Execute: `./gradlew compileDebugUnitTestKotlin`
3. **Test Live Backend Response:**
   - Execute: `curl -s -X POST https://hh4u-production.up.railway.app/api/chatbot/query -H "Content-Type: application/json" -d '{"queryText": "acidity", "intent": "direct_answer"}'`
4. **Invalidation Condition:**
   - If `ChatbotApi.kt` is updated with `AnswerDto`, `ChatbotViewModel` binds live fields without `"Found remedy"`, `AppNavHost` executes dynamic consultation flows, and `./gradlew test` passes without compilation errors, this survey finding is satisfied.
