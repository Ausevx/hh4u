package com.healinghands4u.presentation.chatbot

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.healinghands4u.data.repository.KnowledgeRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.async
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

    init {
        // Ensure local KB is seeded if empty
        viewModelScope.launch {
            offlineSearchRepository.getLocalKbCount()
        }
    }

    fun querySymptoms(symptoms: String) {
        _state.value = ChatbotUiState.Loading
        viewModelScope.launch {
            // Fix 4: Race local offline search against the remote backend.
            // Show whichever result arrives first, then upgrade with the LLM-enhanced
            // remote result if it arrives later.

            // 1. Fire local offline search immediately (instant, ~1ms)
            val localDeferred = async {
                try {
                    offlineSearchRepository.searchOffline(symptoms)
                } catch (e: Exception) {
                    emptyList()
                }
            }

            // 2. Fire remote backend call in parallel
            val remoteDeferred = async {
                try {
                    if (!offlineSearchRepository.isOnline()) {
                        throw java.net.UnknownHostException("No internet connection")
                    }
                    chatbotApi.queryChatbot(
                        ChatbotQueryRequest(
                            queryText = symptoms,
                            intent = "direct_answer"
                        )
                    )
                } catch (e: Exception) {
                    null // Return null on failure so we can use local result
                }
            }

            // 3. Show local result immediately if available (fast-path)
            val localMatches = localDeferred.await()
            var showedLocal = false
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
                showedLocal = true
            }

            // 4. Wait for remote result and upgrade if it's better (LLM-enhanced)
            val remoteResponse = remoteDeferred.await()
            if (remoteResponse != null && remoteResponse.success) {
                val ans = remoteResponse.answer
                val displayText = ans?.answerText?.takeIf { it.isNotBlank() }
                    ?: remoteResponse.message?.takeIf { it.isNotBlank() }
                    ?: "No remedy found"
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
            } else if (!showedLocal) {
                // Neither remote nor local worked
                if (localMatches.isEmpty()) {
                    _state.value = ChatbotUiState.Error(
                        "Unable to find a remedy. Please check your connection and try again."
                    )
                }
                offlineSearchRepository.recordSearchEvent(symptoms, null, null)
            }
        }
    }
}
