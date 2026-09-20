package com.healinghands4u.presentation.chatbot

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.healinghands4u.data.repository.KnowledgeRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

import com.healinghands4u.data.remote.ChatbotApi
import com.healinghands4u.data.remote.ChatbotQueryRequest

sealed interface ChatbotUiState {
    object Idle : ChatbotUiState
    object Loading : ChatbotUiState
    data class Success(
        val answerText: String,
        val dosage: String? = null,
        val homeRemedy: String? = null,
        val safetyDisclaimer: String? = null,
        val videoUrl: String? = null
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
                    val ans = response.answer
                    val displayText = ans?.answerText ?: response.message ?: "No remedy found"
                    _state.value = ChatbotUiState.Success(
                        answerText = displayText,
                        dosage = ans?.dosageInstructions,
                        homeRemedy = ans?.homeRemedyText,
                        safetyDisclaimer = ans?.safetyDisclaimerText,
                        videoUrl = ans?.videoUrl
                    )
                } else {
                    _state.value = ChatbotUiState.Error("Failed: ${response.message ?: "Unknown error"}")
                }
            } catch (e: Exception) {
                _state.value = ChatbotUiState.Error("Error: ${e.message}")
            }
        }
    }
}
