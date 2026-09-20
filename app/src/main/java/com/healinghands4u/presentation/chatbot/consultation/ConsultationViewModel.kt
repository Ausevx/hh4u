package com.healinghands4u.presentation.chatbot.consultation

import androidx.lifecycle.ViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject

data class DiagnosticQuestionUI(val id: String, val questionText: String)

@HiltViewModel
class ConsultationViewModel @Inject constructor() : ViewModel() {
    val diagnosticQuestions = listOf(
        DiagnosticQuestionUI("q1", "Did you eat outside food recently?"),
        DiagnosticQuestionUI("q2", "Do you have stress currently?"),
        DiagnosticQuestionUI("q3", "Is this acidity from long time?")
    )
}
