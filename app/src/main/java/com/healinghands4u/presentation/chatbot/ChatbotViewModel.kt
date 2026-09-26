package com.healinghands4u.presentation.chatbot

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.healinghands4u.data.remote.ChatbotApi
import com.healinghands4u.data.remote.ChatbotQueryRequest
import com.healinghands4u.data.repository.OfflineSearchRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import javax.inject.Inject

sealed interface ChatbotUiState {
    object Idle : ChatbotUiState
    object Loading : ChatbotUiState
    data class Success(
        val answerText: String,
        val reasonText: String? = null,
        val remedyName: String? = null,
        val dosage: String? = null,
        val homeRemedy: String? = null,
        val safetyDisclaimer: String? = null,
        val videoUrl: String? = null,
        val notice: String? = null,
        val queryText: String? = null
    ) : ChatbotUiState
    data class Error(val message: String) : ChatbotUiState
}

@HiltViewModel
class ChatbotViewModel @Inject constructor(
    private val chatbotApi: ChatbotApi,
    private val offlineSearchRepository: OfflineSearchRepository
) : ViewModel() {
    private val _state = MutableStateFlow<ChatbotUiState>(ChatbotUiState.Idle)
    val state: StateFlow<ChatbotUiState> = _state
    private var queryJob: Job? = null

    fun querySymptoms(symptoms: String) {
        queryJob?.cancel()
        queryJob = viewModelScope.launch {
            _state.value = ChatbotUiState.Loading
            if (offlineSearchRepository.isOnline()) {
                try {
                    val response = chatbotApi.queryChatbot(ChatbotQueryRequest(queryText = symptoms, intent = "direct_answer"))
                    if (response.success) {
                        val answer = response.answer
                        _state.value = ChatbotUiState.Success(
                            answerText = answer?.answerText?.takeIf { it.isNotBlank() }
                                ?: response.message ?: "No saved answer found.",
                            reasonText = answer?.reasonText,
                            remedyName = answer?.remedyName,
                            dosage = answer?.dosageInstructions,
                            homeRemedy = answer?.homeRemedyText,
                            safetyDisclaimer = answer?.safetyDisclaimerText,
                            videoUrl = answer?.videoUrl,
                            queryText = symptoms
                        )
                        return@launch
                    }
                    _state.value = ChatbotUiState.Error(response.message ?: "No saved answer found.")
                    return@launch
                } catch (error: Exception) {
                    if (error is CancellationException) throw error
                    if (error is retrofit2.HttpException &&
                        error.response()?.errorBody()?.string()?.contains("TRANSLATION_UNAVAILABLE") == true) {
                        _state.value = ChatbotUiState.Error("Translation is temporarily unavailable. Please retry.")
                        return@launch
                    }
                }
            }
            // Offline answers are English and must never be passed off as a translation.
            try {
                val match = offlineSearchRepository.searchOffline(symptoms).firstOrNull()
                _state.value = if (match == null) {
                    ChatbotUiState.Error("No saved English answer matches this question. Translation requires internet. Try a short English phrase such as 'headache' or 'stomach pain'.")
                } else {
                    ChatbotUiState.Success(
                        answerText = match.answerText ?: match.reasonText.orEmpty(),
                        reasonText = match.reasonText,
                        remedyName = match.remedyText,
                        dosage = match.dosageInstructions,
                        homeRemedy = match.homeRemedyText,
                        safetyDisclaimer = match.safetyDisclaimerText,
                        videoUrl = match.videoUrl,
                        notice = "Offline: saved English guidance for: ${match.questionText}",
                        queryText = symptoms
                    )
                }
                offlineSearchRepository.recordSearchEvent(symptoms, null, match?.id)
            } catch (error: Exception) {
                if (error is CancellationException) throw error
                _state.value = ChatbotUiState.Error("Unable to load saved advice. Please retry.")
            }
        }
    }
}
