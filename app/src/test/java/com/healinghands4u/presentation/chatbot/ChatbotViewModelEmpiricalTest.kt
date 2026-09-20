package com.healinghands4u.presentation.chatbot

import androidx.test.ext.junit.runners.AndroidJUnit4
import com.healinghands4u.data.remote.*
import kotlinx.coroutines.runBlocking
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config
import org.robolectric.shadows.ShadowLooper

@RunWith(AndroidJUnit4::class)
@Config(sdk = [34])
class ChatbotViewModelEmpiricalTest {

    private class FakeChatbotApi(
        var responseToReturn: ChatbotQueryResponse? = null,
        var exceptionToThrow: Exception? = null
    ) : ChatbotApi {
        override suspend fun queryChatbot(request: ChatbotQueryRequest): ChatbotQueryResponse {
            exceptionToThrow?.let { throw it }
            return responseToReturn ?: throw IllegalStateException("No response configured")
        }

        override suspend fun resolveConsultationAnswer(request: ConsultationAnswerRequest): ConsultationResolutionResponse {
            throw NotImplementedError()
        }
    }

    @Test
    fun testViewModel_handlesLiveResponse_withCompleteAnswerDto() {
        val fakeApi = FakeChatbotApi(
            responseToReturn = ChatbotQueryResponse(
                success = true,
                sessionId = "sess-123",
                answer = AnswerDto(
                    id = "ans-456",
                    answerText = "Live Gemini Answer: Pulsatilla 30C",
                    dosageInstructions = "Live Dosage: 4 pills twice daily",
                    homeRemedyText = "Live Home Remedy: Drink chamomile tea",
                    safetyDisclaimerText = "Live Safety: Consult doctor if acute",
                    videoUrl = "https://example.com/video"
                )
            )
        )

        val viewModel = ChatbotViewModel(fakeApi)
        assertEquals(ChatbotUiState.Idle, viewModel.state.value)

        viewModel.querySymptoms("stomach pain")
        ShadowLooper.idleMainLooper()

        val state = viewModel.state.value
        assertTrue("State must be Success, but was $state", state is ChatbotUiState.Success)
        val success = state as ChatbotUiState.Success

        // Verify live values are preserved and no hardcoded strings replace them
        assertEquals("Live Gemini Answer: Pulsatilla 30C", success.answerText)
        assertEquals("Live Dosage: 4 pills twice daily", success.dosage)
        assertEquals("Live Home Remedy: Drink chamomile tea", success.homeRemedy)
        assertEquals("Live Safety: Consult doctor if acute", success.safetyDisclaimer)
        assertEquals("https://example.com/video", success.videoUrl)
    }

    @Test
    fun testViewModel_handlesPartialResponse_nullDosageAndRemedy() {
        val fakeApi = FakeChatbotApi(
            responseToReturn = ChatbotQueryResponse(
                success = true,
                sessionId = "sess-123",
                answer = AnswerDto(
                    id = "ans-456",
                    answerText = "Live Gemini Answer: Nux Vomica 30C",
                    dosageInstructions = null,
                    homeRemedyText = null,
                    safetyDisclaimerText = null,
                    videoUrl = null
                )
            )
        )

        val viewModel = ChatbotViewModel(fakeApi)
        viewModel.querySymptoms("bloating")
        ShadowLooper.idleMainLooper()

        val state = viewModel.state.value
        assertTrue("State must be Success, but was $state", state is ChatbotUiState.Success)
        val success = state as ChatbotUiState.Success

        assertEquals("Live Gemini Answer: Nux Vomica 30C", success.answerText)
        assertNull(success.dosage)
        assertNull(success.homeRemedy)
        assertNull(success.safetyDisclaimer)
        assertNull(success.videoUrl)
    }

    @Test
    fun testViewModel_handlesFallbackResponse_nullAnswerDoc() {
        val fakeApi = FakeChatbotApi(
            responseToReturn = ChatbotQueryResponse(
                success = true,
                sessionId = "sess-789",
                matchConfident = false,
                fallback = true,
                message = "Live fallback message: No exact match found for your query.",
                answer = null
            )
        )

        val viewModel = ChatbotViewModel(fakeApi)
        viewModel.querySymptoms("unknown exotic symptom")
        ShadowLooper.idleMainLooper()

        val state = viewModel.state.value
        assertTrue("State must be Success, but was $state", state is ChatbotUiState.Success)
        val success = state as ChatbotUiState.Success

        // Must display the live backend fallback message, NOT hardcoded "Found remedy"
        assertEquals("Live fallback message: No exact match found for your query.", success.answerText)
        assertNull(success.dosage)
        assertNull(success.homeRemedy)
        assertNull(success.safetyDisclaimer)
        assertNull(success.videoUrl)
    }

    @Test
    fun testViewModel_handlesNetworkError() {
        val fakeApi = FakeChatbotApi(
            exceptionToThrow = RuntimeException("Network timeout connecting to backend")
        )

        val viewModel = ChatbotViewModel(fakeApi)
        viewModel.querySymptoms("headache")
        ShadowLooper.idleMainLooper()

        val state = viewModel.state.value
        assertTrue("State must be Error, but was $state", state is ChatbotUiState.Error)
        val error = state as ChatbotUiState.Error
        assertEquals("Error: Network timeout connecting to backend", error.message)
    }
}
