# Android Live Text Query Pipeline: Comprehensive Audit & Analysis

**Date:** 2026-09-20  
**Target:** Android App (`/Users/aditya/workspace/hh4u/app`)  
**Backend:** Railway Live Deployment (`https://hh4u-production.up.railway.app/`)  
**Status:** Read-only Survey Completed  

---

## 1. Executive Summary

An audit of the Android frontend codebase (`/Users/aditya/workspace/hh4u/app`) was conducted to evaluate whether the live text query pipeline strictly renders responses from the backend Retrofit network calls or whether hardcoded fallback data, offline mocks, or dummy responses are being injected.

### Key Verdict:
**The Android UI does NOT strictly pull from the Retrofit network response.**
Instead, the pipeline is compromised by:
1. **Critical Retrofit DTO Serialization Mismatch (`ChatbotApi.kt`):** The backend returns `answer` as a nested JSON object (`{ id, answerText, dosageInstructions, homeRemedyText, safetyDisclaimerText, videoUrl }`), but Android's `ChatbotQueryResponse` declares `val answer: String?`. In runtime, Gson crashes with `JsonSyntaxException: Expected a string but was BEGIN_OBJECT`.
2. **Hardcoded Fallbacks in Direct Answer Flow (`ChatbotViewModel.kt` & `ChatbotAnswerScreen.kt`):**
   - Dummy remedy fallback string `"Found remedy"` on null/unmatched responses.
   - Missing `dosage` field passing in `ChatbotViewModel`, causing the UI to always display the hardcoded dosage string `"4 pills, 2 times daily after meals"`.
   - Hardcoded safety disclaimer string `"If disease does not cure within 2 days then consult doctor right now"`.
   - The backend's `fallback: true` (unconfident query) response is improperly treated as a success, falling back to dummy values instead of rendering the doctor's review message.
3. **Completely Offline Consultation Pipeline (`AppNavHost.kt`, `ConsultationScreen.kt`, `ConsultationViewModel.kt`):**
   - In `AppNavHost.kt`, navigation to `Screen.Consultation` does not pass the user query.
   - `ConsultationScreen` is invoked with a hardcoded diagnostic question: `"Are you experiencing a burning sensation?"`.
   - The user query recap bubble is hardcoded to: `"Query: I am experiencing acute symptoms and need a personalized assessment."`.
   - `ConsultationViewModel` has hardcoded mock questions (`"Did you eat outside food recently?"`, `"Do you have stress currently?"`, etc.) and does not inject `ChatbotApi`.
   - On submitting diagnostic answers, `AppNavHost.kt` navigates to a hardcoded query string: `query=burning%20sensation`, completely bypassing the backend consultation-answer endpoint (`POST /api/chatbot/consultation-answer`).
4. **Broken Test Suite Compilation:** A recent commit modified the signature of `ChatbotAnswerScreen` to take `(query, viewModel, onBackClick)` without preserving an overload for the component-level unit tests (`ChatbotScreenTest`, `ChallengerLayoutResilienceStressTest`, `EmpiricalChallenger1Test`, `ThemeModeRenderTest`), preventing `./gradlew compileDebugUnitTestKotlin` from passing.

---

## 2. Networking Architecture Inspection

### 2.1 Network Module Configuration
**File:** `/Users/aditya/workspace/hh4u/app/src/main/java/com/healinghands4u/di/NetworkModule.kt`

```kotlin
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Singleton
    fun provideRetrofit(): Retrofit {
        return Retrofit.Builder()
            .baseUrl("https://hh4u-production.up.railway.app/") // Live Railway backend
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    @Provides
    @Singleton
    fun provideSyncService(retrofit: Retrofit): SyncService {
        return retrofit.create(SyncService::class.java)
    }

    @Provides
    @Singleton
    fun provideChatbotApi(retrofit: Retrofit): com.healinghands4u.data.remote.ChatbotApi {
        return retrofit.create(com.healinghands4u.data.remote.ChatbotApi::class.java)
    }
}
```

#### Observations:
- **Base URL:** Correctly points to the production Railway instance (`https://hh4u-production.up.railway.app/`).
- **Missing OkHttpClient:** Retrofit is initialized without an `OkHttpClient` instance.
  - **No Timeouts Configured:** Defaults to standard 10s timeout. Dense vector searches and LLM text generation via Gemini can occasionally exceed 10s under heavy load, causing silent timeouts.
  - **No Logging:** `HttpLoggingInterceptor` is omitted, making it impossible to inspect HTTP request/response traffic in logcat during debugging.
  - **No Auth Interceptor:** Optional JWT bearer tokens stored in the app are not attached to outbound requests.

---

### 2.2 Retrofit Interface and DTO Contract Mismatch
**File:** `/Users/aditya/workspace/hh4u/app/src/main/java/com/healinghands4u/data/remote/ChatbotApi.kt`

```kotlin
data class ChatbotQueryRequest(
    val queryText: String,
    val intent: String
)

data class ChatbotQueryResponse(
    val success: Boolean,
    val message: String?,
    val answer: String?,
    val remedyText: String?,
    val homeRemedyText: String?,
    val videoUrl: String?,
    val diagnosticQuestions: List<DiagnosticQuestionDto>?
)

data class DiagnosticQuestionDto(
    val id: String,
    val questionText: String
)

interface ChatbotApi {
    @POST("api/chatbot/query")
    suspend fun queryChatbot(@Body request: ChatbotQueryRequest): ChatbotQueryResponse
}
```

#### Verification against Live Backend Contract:
A live request to `https://hh4u-production.up.railway.app/api/chatbot/query` with `{"queryText": "Is my frequent heartburn because of acidity or something serious?", "intent": "direct_answer"}` returned:

```json
{
  "success": true,
  "sessionId": "6ab0172ef78ae7ae4050ec95",
  "matchConfident": true,
  "confidenceScore": 1,
  "intent": "direct_answer",
  "matchedLevel1Question": {
    "id": "6aadf941e8f4af9b7886425b",
    "canonicalQuestionText": "Is my frequent heartburn because of acidity or something serious?"
  },
  "answer": {
    "id": "6aadf954e8f4af9b788643cb",
    "answerText": "Heartburn is typically attributed to elevated Pitta (digestive heat)...",
    "homeRemedyText": "To alleviate immediate discomfort, avoid sour and spicy foods...",
    "videoUrl": "https://youtu.be/a5MQWTSoa6A?si=sx0sgzweS34WwcNM"
  },
  "matchCandidates": [...]
}
```

#### Contract Violations:
1. **`answer` Object vs String:** The backend responds with `answer: { id, answerText, dosageInstructions?, homeRemedyText?, safetyDisclaimerText?, videoUrl? }`. In `ChatbotQueryResponse`, `val answer: String?` forces Gson to parse a JSON Object as a String, throwing `com.google.gson.JsonSyntaxException: Expected a string but was BEGIN_OBJECT`.
2. **Field Placement:** `homeRemedyText` and `videoUrl` reside **inside** the `answer` object, not at the root level. Thus, `response.homeRemedyText` and `response.videoUrl` in Kotlin are always `null`.
3. **Missing `sessionId` and Status Flags:** `sessionId`, `fallback`, and `matchConfident` are omitted from `ChatbotQueryResponse`.
4. **Missing Consultation Endpoint:** The backend exposes `POST /api/chatbot/consultation-answer` (handled by `consultationService.resolveConsultationAnswer`). `ChatbotApi` defines no endpoint or DTO for consultation answer resolution.

---

## 3. ViewModels & Repository Inspection

### 3.1 ChatbotViewModel
**File:** `/Users/aditya/workspace/hh4u/app/src/main/java/com/healinghands4u/presentation/chatbot/ChatbotViewModel.kt`

```kotlin
fun querySymptoms(symptoms: String) {
    _state.value = ChatbotUiState.Loading
    viewModelScope.launch {
        try {
            val response = chatbotApi.queryChatbot(
                ChatbotQueryRequest(
                    queryText = symptoms,
                    intent = "direct_answer"
                )
            )
            if (response.success) {
                _state.value = ChatbotUiState.Success(
                    answerText = response.answer ?: response.remedyText ?: "Found remedy",
                    homeRemedy = response.homeRemedyText,
                    videoUrl = response.videoUrl
                )
            } else {
                _state.value = ChatbotUiState.Error("Failed: ${response.message}")
            }
        } catch (e: Exception) {
            _state.value = ChatbotUiState.Error("Error: ${e.message}")
        }
    }
}
```

#### Flaws:
1. **Dummy Fallback String:** `response.answer ?: response.remedyText ?: "Found remedy"`: `"Found remedy"` is a hardcoded placeholder.
2. **Missing `dosage` & `safetyDisclaimer`:** In `ChatbotUiState.Success`, `dosage` defaults to `null` because it is never passed from the network response.
3. **Unchecked `fallback` Responses:** When a query fails vector match confidence, the backend returns:
   `{"success": true, "fallback": true, "message": "We could not find a confident match for your query..."}`.
   Because `response.success` is `true`, `ChatbotViewModel` treats it as a success, finds `response.answer` null, and shows `"Found remedy"` instead of the actual doctor referral message in `response.message`.

---

### 3.2 ConsultationViewModel
**File:** `/Users/aditya/workspace/hh4u/app/src/main/java/com/healinghands4u/presentation/chatbot/consultation/ConsultationViewModel.kt`

```kotlin
@HiltViewModel
class ConsultationViewModel @Inject constructor() : ViewModel() {
    val diagnosticQuestions = listOf(
        DiagnosticQuestionUI("q1", "Did you eat outside food recently?"),
        DiagnosticQuestionUI("q2", "Do you have stress currently?"),
        DiagnosticQuestionUI("q3", "Is this acidity from long time?")
    )
}
```

#### Flaws:
- **100% Mock / Hardcoded:** `ConsultationViewModel` has no dependency on `ChatbotApi` or `KnowledgeRepository`. It statically hardcodes three diagnostic questions taken from `MockHomeopathyData.kt`.
- **No Dynamic Session or State Handling:** It does not hold or request a `sessionId` or call `api/chatbot/query` with `intent = "consultation"`.

---

### 3.3 ChatbotQueryViewModel
**File:** `/Users/aditya/workspace/hh4u/app/src/main/java/com/healinghands4u/presentation/chatbot/query/ChatbotQueryViewModel.kt`

Contains static quick replies for acidity, headache, sneezing, and sleep restlessness. This is valid UI metadata, but it has no networking capability.

---

### 3.4 KnowledgeRepository
**File:** `/Users/aditya/workspace/hh4u/app/src/main/java/com/healinghands4u/data/repository/KnowledgeRepository.kt`

Manages local Room persistence (`DiseaseEntity`, `DiseaseDao`) and syncing via `SyncService.getDiseases()`. It is not involved in the live text query pipeline.

---

## 4. UI Screens & Navigation Inspection

### 4.1 ChatbotAnswerScreen
**File:** `/Users/aditya/workspace/hh4u/app/src/main/java/com/healinghands4u/presentation/chatbot/answer/ChatbotAnswerScreen.kt`

```kotlin
// Lines 102-117
ChatBubble(
    message = "Here is your personalized homeopathic healing regimen curated by Dr. Anjali Jariwala:",
    isUser = false,
    timestamp = "Just now"
)

Spacer(modifier = Modifier.height(16.dp))

// RxCard: Visual Centerpiece
RxCard(
    remedyName = state.answerText,
    dosage = state.dosage ?: "4 pills, 2 times daily after meals",
    homeRemedy = state.homeRemedy,
    safetyDisclaimer = "If disease does not cure within 2 days then consult doctor right now"
)
```

#### Hardcoded Fallbacks:
- `state.dosage ?: "4 pills, 2 times daily after meals"`: Because `ChatbotViewModel` leaves `state.dosage` null, this hardcoded fallback dosage string is **always** displayed to the user.
- `safetyDisclaimer`: Statically set to `"If disease does not cure within 2 days then consult doctor right now"`.
- `ChatBubble`: Static greeting text.

---

### 4.2 ConsultationScreen
**File:** `/Users/aditya/workspace/hh4u/app/src/main/java/com/healinghands4u/presentation/chatbot/consultation/ConsultationScreen.kt`

```kotlin
// Lines 51-57
val questions = remember(questionText) {
    if (questionText != null) {
        listOf(DiagnosticQuestionUI("single_q", questionText))
    } else {
        viewModel.diagnosticQuestions
    }
}
...
// Lines 82-86
ChatBubble(
    message = "Query: I am experiencing acute symptoms and need a personalized assessment.",
    isUser = true,
    timestamp = "Just now"
)
...
// Lines 136-139
Button(
    onClick = {
        val finalAnswer = lastSelectedAnswer ?: answers.values.firstOrNull() ?: "yes"
        onAnswerSelected(finalAnswer)
    },
    ...
)
```

#### Hardcoded Fallbacks:
- The user query bubble is completely fabricated: `"Query: I am experiencing acute symptoms and need a personalized assessment."` instead of showing the user's actual typed query.
- The diagnostic questions are loaded from `questionText` or the hardcoded `viewModel.diagnosticQuestions`.
- The submit button only passes a single string (`"yes"` or last selected answer) instead of the full diagnostic answer map required by the backend.

---

### 4.3 AppNavHost Navigation Wiring
**File:** `/Users/aditya/workspace/hh4u/app/src/main/java/com/healinghands4u/presentation/navigation/AppNavHost.kt`

```kotlin
// Lines 92-114
onSendQuery = { query, isConsultation ->
    val encoded = java.net.URLEncoder.encode(query, "UTF-8")
    if (isConsultation) {
        navController.navigate(Screen.Consultation.route)
    } else {
        navController.navigate("${Screen.ChatbotAnswer.route}?query=$encoded")
    }
}
...
composable(Screen.Consultation.route) {
    ConsultationScreen(
        questionText = "Are you experiencing a burning sensation?",
        onBackClick = {
            navController.popBackStack()
        },
        onAnswerSelected = { _ ->
            navController.navigate("${Screen.ChatbotAnswer.route}?query=burning%20sensation") {
                popUpTo(Screen.ChatbotQuery.route) { inclusive = false }
            }
        }
    )
}
```

#### Hardcoded Pipeline Bypasses:
1. When `isConsultation` is selected, `query` is discarded and `Screen.Consultation.route` is navigated to with no arguments.
2. `Screen.Consultation.route` hardcodes `questionText = "Are you experiencing a burning sensation?"`.
3. When the user completes the consultation, `onAnswerSelected` ignores the diagnostic answers entirely and navigates to `${Screen.ChatbotAnswer.route}?query=burning%20sensation`!
4. This results in the consultation pipeline being a pure offline mock that simply restarts a text query for `"burning sensation"`.

---

## 5. Catalog of All Hardcoded Fallbacks & Offline Mocks

| # | File Path | Lines | Hardcoded Entity | Description / Impact |
|---|-----------|-------|------------------|----------------------|
| 1 | `data/remote/ChatbotApi.kt` | 14 | `val answer: String?` | DTO type mismatch. Backend returns object `{ id, answerText, ... }`. Causes `JsonSyntaxException`. |
| 2 | `data/remote/ChatbotApi.kt` | 15-17 | `val remedyText`, `homeRemedyText`, `videoUrl` | Placed at root level instead of nested in `answer`. Always null in runtime. |
| 3 | `presentation/chatbot/ChatbotViewModel.kt` | 47 | `"Found remedy"` | Fallback string when `answer` is null or fails deserialization. |
| 4 | `presentation/chatbot/ChatbotViewModel.kt` | 46-50 | `dosage = null` | Dosage is omitted from `Success` state constructor, triggering UI fallback. |
| 5 | `presentation/chatbot/answer/ChatbotAnswerScreen.kt` | 113 | `"4 pills, 2 times daily after meals"` | Hardcoded dosage fallback string always displayed. |
| 6 | `presentation/chatbot/answer/ChatbotAnswerScreen.kt` | 115 | `"If disease does not cure within 2 days then consult doctor right now"` | Hardcoded safety disclaimer string instead of using backend field. |
| 7 | `presentation/navigation/AppNavHost.kt` | 105 | `"Are you experiencing a burning sensation?"` | Hardcoded single diagnostic question in consultation route. |
| 8 | `presentation/navigation/AppNavHost.kt` | 110 | `"query=burning%20sensation"` | Hardcoded consultation completion query redirecting to direct answer. |
| 9 | `presentation/chatbot/consultation/ConsultationScreen.kt` | 83 | `"Query: I am experiencing acute symptoms and need a personalized assessment."` | Hardcoded user query text bubble. |
| 10 | `presentation/chatbot/consultation/ConsultationViewModel.kt` | 11-15 | `listOf(DiagnosticQuestionUI("q1", "Did you eat outside food recently?")...)` | Hardcoded offline diagnostic question list. |
| 11 | `data/mock/MockHomeopathyData.kt` | 57-203 | `object MockHomeopathyData` | Static dataset containing mock diseases, diagnostic questions, and branches. |

---

## 6. Verification of Acceptance Criteria

**Criterion:** *"An agent-as-judge confirms the Android UI strictly pulls from the Retrofit network response without inserting hardcoded fallback data."*

### Finding:
**FAIL (Current State).**
1. The Retrofit network response cannot be properly parsed due to `BEGIN_OBJECT` JSON deserialization failure on `answer`.
2. The UI falls back to hardcoded dummy strings (`"Found remedy"`, `"4 pills, 2 times daily after meals"`, `"If disease does not cure within 2 days then consult doctor right now"`).
3. The consultation flow does not use Retrofit at all, relying on hardcoded questions and routing to a hardcoded `"burning sensation"` query string.

---

## 7. Concrete Remediation Plan

To enable the Android UI to strictly pull from the Retrofit backend and eliminate all hardcoded fallback data, the following changes are required:

### Step 1: Update DTOs in `data/remote/ChatbotApi.kt`
Align DTOs with the backend response format:

```kotlin
package com.healinghands4u.data.remote

import retrofit2.http.Body
import retrofit2.http.POST

data class ChatbotQueryRequest(
    val queryText: String,
    val intent: String,
    val inputMode: String = "text"
)

data class AnswerDto(
    val id: String?,
    val answerText: String,
    val personalizedAnswer: String? = null,
    val dosageInstructions: String? = null,
    val homeRemedyText: String? = null,
    val safetyDisclaimerText: String? = null,
    val videoUrl: String? = null
)

data class DiagnosticQuestionDto(
    val id: String,
    val questionText: String
)

data class ConsultationQueryDto(
    val consultationQueryId: String?,
    val diagnosticQuestions: List<DiagnosticQuestionDto>?
)

data class ChatbotQueryResponse(
    val success: Boolean,
    val sessionId: String?,
    val matchConfident: Boolean? = true,
    val fallback: Boolean? = false,
    val message: String? = null,
    val intent: String?,
    val answer: AnswerDto?,
    val consultation: ConsultationQueryDto?,
    val diagnosticQuestions: List<DiagnosticQuestionDto>?
)

data class ConsultationAnswerRequest(
    val sessionId: String,
    val answers: Map<String, String>
)

data class ConsultationResolutionResponse(
    val success: Boolean,
    val sessionId: String,
    val answer: AnswerDto,
    val personalized: Boolean
)

interface ChatbotApi {
    @POST("api/chatbot/query")
    suspend fun queryChatbot(@Body request: ChatbotQueryRequest): ChatbotQueryResponse

    @POST("api/chatbot/consultation-answer")
    suspend fun resolveConsultation(@Body request: ConsultationAnswerRequest): ConsultationResolutionResponse
}
```

### Step 2: Configure OkHttpClient in `di/NetworkModule.kt`
Add proper timeouts and logging:

```kotlin
@Provides
@Singleton
fun provideOkHttpClient(): OkHttpClient {
    return OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()
}

@Provides
@Singleton
fun provideRetrofit(okHttpClient: OkHttpClient): Retrofit {
    return Retrofit.Builder()
        .baseUrl("https://hh4u-production.up.railway.app/")
        .client(okHttpClient)
        .addConverterFactory(GsonConverterFactory.create())
        .build()
}
```

### Step 3: Upgrade `ChatbotViewModel.kt`
Strictly map backend fields without fallback strings:

```kotlin
sealed interface ChatbotUiState {
    object Idle : ChatbotUiState
    object Loading : ChatbotUiState
    data class Success(
        val answerText: String,
        val dosage: String? = null,
        val homeRemedy: String? = null,
        val safetyDisclaimer: String? = null,
        val videoUrl: String? = null,
        val isFallback: Boolean = false
    ) : ChatbotUiState
    data class Error(val message: String) : ChatbotUiState
}

@HiltViewModel
class ChatbotViewModel @Inject constructor(
    private val chatbotApi: ChatbotApi
) : ViewModel() {
    
    private val _state = MutableStateFlow<ChatbotUiState>(ChatbotUiState.Idle)
    val state: StateFlow<ChatbotUiState> = _state

    fun querySymptoms(symptoms: String) {
        _state.value = ChatbotUiState.Loading
        viewModelScope.launch {
            try {
                val response = chatbotApi.queryChatbot(
                    ChatbotQueryRequest(
                        queryText = symptoms,
                        intent = "direct_answer"
                    )
                )
                if (response.success) {
                    if (response.fallback == true && response.answer == null) {
                        _state.value = ChatbotUiState.Success(
                            answerText = response.message ?: "No specific remedy found. Please consult our physician.",
                            isFallback = true
                        )
                    } else if (response.answer != null) {
                        val ans = response.answer
                        _state.value = ChatbotUiState.Success(
                            answerText = ans.answerText,
                            dosage = ans.dosageInstructions,
                            homeRemedy = ans.homeRemedyText,
                            safetyDisclaimer = ans.safetyDisclaimerText,
                            videoUrl = ans.videoUrl
                        )
                    } else {
                        _state.value = ChatbotUiState.Error(response.message ?: "No answer available")
                    }
                } else {
                    _state.value = ChatbotUiState.Error(response.message ?: "Query failed")
                }
            } catch (e: Exception) {
                _state.value = ChatbotUiState.Error(e.message ?: "Network error occurred")
            }
        }
    }
}
```

### Step 4: Fix `ChatbotAnswerScreen.kt` & Restore Test Overload
Ensure `ChatbotAnswerScreen` renders live data while preserving test compatibility:

```kotlin
@Composable
fun ChatbotAnswerScreen(
    query: String,
    viewModel: ChatbotViewModel = hiltViewModel(),
    onBackClick: () -> Unit = {}
) {
    val uiState by viewModel.state.collectAsState()

    LaunchedEffect(query) {
        if (query.isNotBlank()) {
            viewModel.querySymptoms(query)
        }
    }

    when (val state = uiState) {
        is ChatbotUiState.Loading -> { /* Loading UI */ }
        is ChatbotUiState.Error -> { /* Error UI */ }
        is ChatbotUiState.Success -> {
            ChatbotAnswerContent(
                answerText = state.answerText,
                dosage = state.dosage,
                homeRemedy = state.homeRemedy,
                safetyDisclaimer = state.safetyDisclaimer ?: "If symptoms persist, please consult Dr. Anjali Jariwala directly.",
                videoUrl = state.videoUrl,
                onBackClick = onBackClick
            )
        }
        is ChatbotUiState.Idle -> {}
    }
}

// Overload for Unit Tests and Direct Rendering
@Composable
fun ChatbotAnswerScreen(
    answerText: String,
    dosage: String? = null,
    homeRemedy: String? = null,
    safetyDisclaimer: String = "If disease does not cure within 2 days then consult doctor right now",
    videoUrl: String? = null,
    onBackClick: () -> Unit = {}
) {
    ChatbotAnswerContent(
        answerText = answerText,
        dosage = dosage,
        homeRemedy = homeRemedy,
        safetyDisclaimer = safetyDisclaimer,
        videoUrl = videoUrl,
        onBackClick = onBackClick
    )
}
```

### Step 5: Wire Live Consultation Pipeline in `ConsultationViewModel.kt` & `AppNavHost.kt`
1. Pass the user's `initialQuery` into `Screen.Consultation.route?query={query}`.
2. In `ConsultationViewModel`, inject `ChatbotApi`. On init with query, call `chatbotApi.queryChatbot(ChatbotQueryRequest(query, intent = "consultation"))` to receive live `sessionId` and live `diagnosticQuestions`.
3. Display the user's actual query in `ConsultationScreen`'s recap bubble.
4. When answers are selected, call `chatbotApi.resolveConsultation(ConsultationAnswerRequest(sessionId, answersMap))` and navigate to `ChatbotAnswerScreen` with the resolved personalized answer.
