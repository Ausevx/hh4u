package com.healinghands4u.presentation.chatbot

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.healinghands4u.data.repository.KnowledgeRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.async
import kotlinx.coroutines.launch
import kotlinx.coroutines.CancellationException
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
        val remedyName: String? = null,
        val dosage: String? = null,
        val homeRemedy: String? = null,
        val safetyDisclaimer: String? = null,
        val videoUrl: String? = null
    ) : ChatbotUiState
    data class Error(val message: String) : ChatbotUiState
}

@HiltViewModel
class ChatbotViewModel @Inject constructor(
    private val chatbotApi: ChatbotApi,
    private val offlineSearchRepository: com.healinghands4u.data.repository.OfflineSearchRepository
) : ViewModel() {
    
    private val _state = MutableStateFlow<ChatbotUiState>(ChatbotUiState.Idle)
    val state: StateFlow<ChatbotUiState> = _state

    fun querySymptoms(symptoms: String) {
        viewModelScope.launch {
            _state.value = ChatbotUiState.Loading
            val online = offlineSearchRepository.isOnline()
            // 1. Instant offline check
            var hasLocalMatch = false
            try {
                val localMatches = offlineSearchRepository.searchOffline(symptoms)
                if (localMatches.isNotEmpty()) {
                    hasLocalMatch = true
                    val match = localMatches.first()
                    _state.value = ChatbotUiState.Success(
                        answerText = (match.answerText ?: match.reasonText ?: "No detail provided") +
                            if (online) "\n\n(Loading online result...)" else "\n\nOffline: saved English guidance for: ${match.questionText}",
                        remedyName = match.remedyText,
                        dosage = match.dosageInstructions,
                        homeRemedy = match.homeRemedyText,
                        safetyDisclaimer = match.safetyDisclaimerText,
                        videoUrl = match.videoUrl
                    )
                    if (!online) {
                        offlineSearchRepository.recordSearchEvent(symptoms, null, match.id)
                        return@launch
                    }
                } else {
                    if (!online) {
                        _state.value = ChatbotUiState.Error("No saved English answer matches this question. Try a short phrase such as 'headache' or 'stomach pain'.")
                        return@launch
                    }
                    _state.value = ChatbotUiState.Loading
                }
            } catch (e: Exception) {
                if (e is CancellationException) throw e
                _state.value = ChatbotUiState.Loading
            }

            try {
                // Determine if we should even try network
                if (!offlineSearchRepository.isOnline()) {
                    throw java.net.UnknownHostException("No internet connection")
                }
                
                val response = chatbotApi.queryChatbot(
                    ChatbotQueryRequest(
                        queryText = symptoms,
                        intent = "direct_answer"
                    )
                )
                if (response.success) {
                    val ans = response.answer
                    val displayText = ans?.answerText?.takeIf { it.isNotBlank() } ?: response.message?.takeIf { it.isNotBlank() } ?: "No remedy found"
                    _state.value = ChatbotUiState.Success(
                        answerText = displayText,
                        remedyName = ans?.remedyName,
                        dosage = ans?.dosageInstructions,
                        homeRemedy = ans?.homeRemedyText,
                        safetyDisclaimer = ans?.safetyDisclaimerText,
                        videoUrl = ans?.videoUrl
                    )
                    // Record click
                    offlineSearchRepository.recordSearchEvent(symptoms, null, ans?.id)
                } else {
                    if (!hasLocalMatch) {
                        _state.value = ChatbotUiState.Error("Failed: ${response.message ?: "Unknown error"}")
                    } else {
                        // Re-emit local match to remove "(Loading online result...)" text
                        val match = offlineSearchRepository.searchOffline(symptoms).first()
                        _state.value = ChatbotUiState.Success(
                            answerText = match.answerText ?: match.reasonText ?: "No detail provided",
                            remedyName = match.remedyText,
                            dosage = match.dosageInstructions,
                            homeRemedy = match.homeRemedyText,
                            safetyDisclaimer = match.safetyDisclaimerText,
                            videoUrl = match.videoUrl
                        )
                    }
                }
            } catch (e: Exception) {
                if (e is CancellationException) throw e
                
                if (hasLocalMatch) {
                    // Re-emit local match to remove loading text
                    try {
                        val match = offlineSearchRepository.searchOffline(symptoms).first()
                        _state.value = ChatbotUiState.Success(
                            answerText = match.answerText ?: match.reasonText ?: "No detail provided",
                            remedyName = match.remedyText,
                            dosage = match.dosageInstructions,
                            homeRemedy = match.homeRemedyText,
                            safetyDisclaimer = match.safetyDisclaimerText,
                            videoUrl = match.videoUrl
                        )
                    } catch (e2: Exception) {}
                    return@launch
                }

                if (e is retrofit2.HttpException &&
                    e.response()?.errorBody()?.string()?.contains("TRANSLATION_UNAVAILABLE") == true) {
                    _state.value = ChatbotUiState.Error("Translation is temporarily unavailable. Please retry.")
                    return@launch
                }
                
                // Fallback to offline FTS search
                try {
                    val localMatches = offlineSearchRepository.searchOffline(symptoms)
                    if (localMatches.isNotEmpty()) {
                        val match = localMatches.first()
                        _state.value = ChatbotUiState.Success(
                            answerText = match.answerText ?: match.reasonText ?: "No detail provided",
                            remedyName = match.remedyText,
                            dosage = match.dosageInstructions,
                            homeRemedy = match.homeRemedyText,
                            safetyDisclaimer = match.safetyDisclaimerText,
                            videoUrl = match.videoUrl
                        )
                        offlineSearchRepository.recordSearchEvent(symptoms, null, match.id)
                    } else {
                        _state.value = ChatbotUiState.Error("You are offline and no local remedies were found for your query.")
                        offlineSearchRepository.recordSearchEvent(symptoms, null, null)
                    }
                } catch (offlineErr: Exception) {
                    _state.value = ChatbotUiState.Error("Error: ${e.message} (Offline fallback also failed)")
                }
                offlineSearchRepository.recordSearchEvent(symptoms, null, null)
            }
        }
    }
}
