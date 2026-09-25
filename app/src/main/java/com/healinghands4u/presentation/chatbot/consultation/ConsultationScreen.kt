package com.healinghands4u.presentation.chatbot.consultation

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.healinghands4u.data.local.KnowledgeBaseEntity
import com.healinghands4u.data.remote.DiagnosticQuestionDto
import com.healinghands4u.presentation.chatbot.answer.ChatbotAnswerContent
import com.healinghands4u.presentation.common.DoctorContactFooter
import com.healinghands4u.presentation.components.ChatHeader
import com.healinghands4u.presentation.components.YesNoCard

@Composable
fun ConsultationRoute(query: String, onBackClick: () -> Unit, viewModel: ConsultationViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    LaunchedEffect(query) { viewModel.start(query) }
    ConsultationScreen(state = state, onBackClick = onBackClick,
        onSelectCandidate = viewModel::selectCandidate, onAnswer = viewModel::answer,
        onSubmit = viewModel::submit, onRetry = { viewModel.start(query, retry = true) })
}

@Composable
fun ConsultationScreen(
    questionText: String? = null,
    onBackClick: () -> Unit = {},
    onAnswerSelected: (String) -> Unit = {},
    state: ConsultationUiState = ConsultationUiState(),
    onSelectCandidate: (KnowledgeBaseEntity) -> Unit = {},
    onAnswer: (String, String) -> Unit = { _, _ -> },
    onSubmit: () -> Unit = {},
    onRetry: () -> Unit = {}
) {
    // Optional standalone question for previews; production state comes from the route.
    var previewAnswer by remember(questionText) { mutableStateOf<String?>(null) }
    val questions = questionText?.let { listOf(DiagnosticQuestionDto("single_q", it)) } ?: state.questions
    val answers = if (questionText != null) previewAnswer?.let { mapOf("single_q" to it) }.orEmpty() else state.answers
    Scaffold(topBar = {
        ChatHeader(title = if (state.result != null) "Your Healing Plan" else "Consultation",
            subtitle = "Dr. Anjali Jariwala (DHMS)", onBackClick = onBackClick)
    }) { padding ->
        val result = state.result
        if (result != null) {
            Column(Modifier.fillMaxSize().padding(padding)) {
                Text("Your question: ${state.query}", Modifier.padding(16.dp))
                if (result.offline) Text("Offline result from saved consultation guidance.", Modifier.padding(horizontal = 16.dp))
                ChatbotAnswerContent(
                    answerText = result.answer.personalizedAnswer?.takeIf { it.isNotBlank() }
                        ?: result.answer.answerText.orEmpty(),
                    remedyName = result.answer.remedyName, dosage = result.answer.dosageInstructions,
                    homeRemedy = result.answer.homeRemedyText, safetyDisclaimer = result.answer.safetyDisclaimerText,
                    videoUrl = result.answer.videoUrl, modifier = Modifier.weight(1f))
            }
        } else {
            Column(Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState()).padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)) {
                if (state.query.isNotBlank()) Text("Your question: ${state.query}")
                if (state.offlineEntry != null) {
                    Text("Offline consultation: using saved questions and answers.")
                    Text(state.offlineEntry.questionText, style = MaterialTheme.typography.titleMedium)
                }
                if (state.candidates.isNotEmpty()) {
                    Text("You are using saved guidance. Choose the topic that best matches your symptoms.")
                    state.candidates.forEach { entry ->
                        OutlinedButton(onClick = { onSelectCandidate(entry) }, modifier = Modifier.fillMaxWidth()) {
                            Text(entry.questionText)
                        }
                    }
                }
                state.message?.let { Text(it) }
                if (questions.isNotEmpty()) {
                    Text("Please answer following to help you better", style = MaterialTheme.typography.titleLarge)
                    questions.forEach { question ->
                        // Prevent edits while submitting so the displayed result matches the submitted answers.
                        if (state.loading) Text("${question.questionText} — ${answers[question.id].orEmpty()}")
                        else YesNoCard(questionId = question.id, questionText = question.questionText,
                            selectedAnswer = answers[question.id], onAnswerSelected = { value ->
                                if (questionText != null) { previewAnswer = value; onAnswerSelected(value) }
                                else onAnswer(question.id, value)
                            })
                    }
                    Button(onClick = {
                        if (questionText != null) previewAnswer?.let(onAnswerSelected) else onSubmit()
                    }, enabled = !state.loading && questions.all { answers[it.id] in listOf("yes", "no") },
                        modifier = Modifier.fillMaxWidth()) { Text("Submit Answers & Get Remedy") }
                }
                if (state.loading) {
                    CircularProgressIndicator()
                    Text(if (questions.isEmpty()) "Loading consultation questions…" else "Preparing your guidance…")
                }
                state.error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                if (!state.loading && questions.isEmpty() && state.candidates.isEmpty()) {
                    Button(onClick = onRetry) { Text("Retry") }
                }
                DoctorContactFooter()
            }
        }
    }
}
