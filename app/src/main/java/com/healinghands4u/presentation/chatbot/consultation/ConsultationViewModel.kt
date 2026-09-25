package com.healinghands4u.presentation.chatbot.consultation

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.healinghands4u.data.remote.AnswerDto
import com.healinghands4u.data.remote.ChatbotApi
import com.healinghands4u.data.remote.ChatbotQueryRequest
import com.healinghands4u.data.remote.ConsultationAnswerRequest
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class DiagnosticQuestionUI(val id: String, val questionText: String)

sealed interface ConsultationUiState {
    object Idle : ConsultationUiState
    object Loading : ConsultationUiState
    data class Success(val questions: List<DiagnosticQuestionUI>, val sessionId: String) : ConsultationUiState
    data class AnswerReady(val answer: AnswerDto) : ConsultationUiState
    data class Error(val message: String) : ConsultationUiState
}

@HiltViewModel
class ConsultationViewModel @Inject constructor(
    private val chatbotApi: ChatbotApi
) : ViewModel() {
    
    private val _state = MutableStateFlow<ConsultationUiState>(ConsultationUiState.Idle)
    val state: StateFlow<ConsultationUiState> = _state

    fun startConsultation(query: String) {
        _state.value = ConsultationUiState.Loading
        viewModelScope.launch {
            try {
                val response = chatbotApi.queryChatbot(
                    ChatbotQueryRequest(
                        queryText = query,
                        intent = "consultation"
                    )
                )
                if (response.success && response.diagnosticQuestions != null && response.diagnosticQuestions.isNotEmpty()) {
                    val qList = response.diagnosticQuestions.map {
                        DiagnosticQuestionUI(it.id, it.questionText)
                    }
                    _state.value = ConsultationUiState.Success(
                        questions = qList,
                        sessionId = response.sessionId ?: ""
                    )
                } else if (response.fallback == true || response.message != null) {
                    // Fallback to direct answer format if it couldn't match a consultation
                    _state.value = ConsultationUiState.Error(response.message ?: "Could not match a consultation.")
                } else {
                    _state.value = ConsultationUiState.Error("Failed to load consultation questions.")
                }
            } catch (e: Exception) {
                _state.value = ConsultationUiState.Error("Error: ${e.message}")
            }
        }
    }

    fun submitAnswers(sessionId: String, answers: Map<String, String>) {
        _state.value = ConsultationUiState.Loading
        viewModelScope.launch {
            try {
                val response = chatbotApi.resolveConsultationAnswer(
                    ConsultationAnswerRequest(
                        sessionId = sessionId,
                        answers = answers
                    )
                )
                if (response.success && response.answer != null) {
                    _state.value = ConsultationUiState.AnswerReady(response.answer)
                } else {
                    _state.value = ConsultationUiState.Error("Failed to generate personalized answer.")
                }
            } catch (e: Exception) {
                _state.value = ConsultationUiState.Error("Error: ${e.message}")
            }
        }
    }
}
