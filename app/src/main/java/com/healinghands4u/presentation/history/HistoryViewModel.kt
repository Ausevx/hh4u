package com.healinghands4u.presentation.history

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.healinghands4u.auth.AuthSessionStorage
import com.healinghands4u.data.remote.ChatHistoryItemDto
import com.healinghands4u.data.remote.ChatbotApi
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed interface HistoryUiState {
    object Loading : HistoryUiState
    object NotLoggedIn : HistoryUiState
    object Empty : HistoryUiState
    data class Success(val items: List<ChatHistoryItemDto>) : HistoryUiState
    data class Error(val message: String) : HistoryUiState
}

@HiltViewModel
class HistoryViewModel @Inject constructor(
    private val chatbotApi: ChatbotApi,
    private val sessionStore: AuthSessionStorage
) : ViewModel() {

    private val _uiState = MutableStateFlow<HistoryUiState>(HistoryUiState.Loading)
    val uiState = _uiState.asStateFlow()

    val session = sessionStore.session

    init {
        loadHistory()
    }

    fun loadHistory() {
        val currentSession = sessionStore.session.value
        val isGuestOrNull = currentSession == null || currentSession.user.authProvider == "guest"
        if (isGuestOrNull || sessionStore.token() == null) {
            _uiState.value = HistoryUiState.NotLoggedIn
            return
        }

        viewModelScope.launch {
            _uiState.value = HistoryUiState.Loading
            try {
                val response = chatbotApi.getChatHistory()
                if (response.success) {
                    if (response.history.isEmpty()) {
                        _uiState.value = HistoryUiState.Empty
                    } else {
                        _uiState.value = HistoryUiState.Success(response.history)
                    }
                } else {
                    _uiState.value = HistoryUiState.Error(response.message ?: "Failed to load conversation history")
                }
            } catch (e: Exception) {
                _uiState.value = HistoryUiState.Error(e.localizedMessage ?: "Failed to connect to server")
            }
        }
    }
}
