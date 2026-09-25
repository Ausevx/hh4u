package com.healinghands4u.presentation.chatbot.consultation

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.gson.Gson
import com.healinghands4u.data.local.KnowledgeBaseEntity
import com.healinghands4u.data.remote.*
import com.healinghands4u.data.repository.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ConsultationUiState(
    val query: String = "",
    val loading: Boolean = false,
    val sessionId: String? = null,
    val matchedQuestionId: String? = null,
    val questions: List<DiagnosticQuestionDto> = emptyList(),
    val answers: Map<String, String> = emptyMap(),
    val candidates: List<KnowledgeBaseEntity> = emptyList(),
    val offlineEntry: KnowledgeBaseEntity? = null,
    val result: ConsultationResult? = null,
    val message: String? = null,
    val error: String? = null
)

@HiltViewModel
class ConsultationViewModel @Inject constructor(
    private val repository: ConsultationDataSource,
    private val savedState: SavedStateHandle
) : ViewModel() {
    private val gson = Gson()
    private val restored = savedState.get<String>("consultation_draft")?.let {
        runCatching { gson.fromJson(it, ConsultationUiState::class.java).copy(loading = false) }.getOrNull()
    }
    private val _state = MutableStateFlow(restored ?: ConsultationUiState())
    val state: StateFlow<ConsultationUiState> = _state

    private fun update(state: ConsultationUiState) {
        _state.value = state
        // The candidate list can be large; reload it after process recreation.
        savedState["consultation_draft"] = gson.toJson(state.copy(candidates = emptyList(), loading = false))
    }

    fun start(query: String, retry: Boolean = false) {
        if (_state.value.loading) return
        if (!retry && _state.value.query == query &&
            (_state.value.questions.isNotEmpty() || _state.value.result != null ||
             _state.value.candidates.isNotEmpty() || _state.value.message != null)) return
        if (query.isBlank()) { update(ConsultationUiState(error = "Please enter your symptoms first.")); return }
        update(ConsultationUiState(query = query, loading = true))
        viewModelScope.launch {
            try {
                val response = repository.start(query)
                update(_state.value.copy(loading = false, sessionId = response.sessionId,
                    matchedQuestionId = response.matchedQuestionId, questions = response.questions,
                    candidates = response.candidates, message = response.message))
            } catch (e: CancellationException) { throw e
            } catch (e: Exception) {
                update(_state.value.copy(loading = false, error = e.message ?: "Unable to load questions. Please retry."))
            }
        }
    }

    fun selectCandidate(entry: KnowledgeBaseEntity) {
        if (_state.value.loading) return
        update(_state.value.copy(offlineEntry = entry, matchedQuestionId = entry.id,
            questions = entry.consultationData().questions, candidates = emptyList(), answers = emptyMap(), error = null))
    }

    fun answer(id: String, answer: String) {
        if (_state.value.loading || _state.value.questions.none { it.id == id } || answer !in listOf("yes", "no")) return
        update(_state.value.copy(answers = _state.value.answers + (id to answer), error = null))
    }

    fun submit() {
        val draft = _state.value
        if (draft.loading || draft.questions.isEmpty() || draft.questions.any { draft.answers[it.id] !in listOf("yes", "no") }) return
        update(draft.copy(loading = true, error = null))
        viewModelScope.launch {
            try {
                val result = repository.resolve(draft.sessionId, draft.matchedQuestionId,
                    draft.questions, draft.answers, draft.offlineEntry)
                update(draft.copy(result = result))
            } catch (e: CancellationException) { throw e
            } catch (e: Exception) {
                update(draft.copy(error = e.message ?: "Unable to submit. Your answers are saved; please retry."))
            }
        }
    }
}
