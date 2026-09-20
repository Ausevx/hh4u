package com.healinghands4u.presentation.chatbot

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.healinghands4u.data.repository.KnowledgeRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

@HiltViewModel
class ChatbotViewModel @Inject constructor(
    private val repository: KnowledgeRepository
) : ViewModel() {
    
    private val _state = MutableStateFlow<String>("Idle")
    val state: StateFlow<String> = _state

    fun querySymptoms(symptoms: String) {
        viewModelScope.launch {
            // Mock embedding and similarity call
            val embedding = FloatArray(10) { 0.1f }
            val results = repository.findSimilarDiseases(embedding)
            _state.value = "Found ${results.size} matches"
        }
    }
}
