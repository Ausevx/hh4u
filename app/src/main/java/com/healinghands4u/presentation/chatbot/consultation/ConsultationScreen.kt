package com.healinghands4u.presentation.chatbot.consultation

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.healinghands4u.data.local.KnowledgeBaseEntity
import com.healinghands4u.data.remote.DiagnosticQuestionDto
import com.healinghands4u.presentation.common.DoctorContactFooter
import com.healinghands4u.presentation.components.ChatBubble
import com.healinghands4u.presentation.components.ChatHeader
import com.healinghands4u.presentation.components.RxCard
import com.healinghands4u.presentation.components.YesNoCard
import com.healinghands4u.presentation.components.YouTubePlayer
import com.healinghands4u.presentation.theme.SoraFontFamily
import com.healinghands4u.presentation.theme.trustedTealColors

@Composable
fun ConsultationRoute(
    query: String,
    onBackClick: () -> Unit,
    viewModel: ConsultationViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()
    LaunchedEffect(query) { viewModel.start(query) }
    ConsultationScreen(
        state = state,
        onBackClick = onBackClick,
        onSelectCandidate = viewModel::selectCandidate,
        onAnswer = viewModel::answer,
        onSubmit = viewModel::submit,
        onRetry = { viewModel.start(query, retry = true) }
    )
}

@Composable
fun ConsultationScreen(
    state: ConsultationUiState,
    onBackClick: () -> Unit,
    onSelectCandidate: (KnowledgeBaseEntity) -> Unit,
    onAnswer: (String, String) -> Unit,
    onSubmit: () -> Unit,
    onRetry: () -> Unit
) {
    val tokens = MaterialTheme.trustedTealColors
    val scrollState = rememberScrollState()
    val questions = state.questions
    val answers = state.answers

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        containerColor = tokens.bg,
        topBar = {
            ChatHeader(
                title = if (state.result != null) "Your Healing Plan" else "Consultation",
                subtitle = "Dr. Anjali Jariwala (DHMS)",
                onBackClick = onBackClick
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .verticalScroll(scrollState)
                .padding(16.dp),
            verticalArrangement = Arrangement.Top,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            if (state.query.isNotBlank()) {
                ChatBubble(
                    message = state.query,
                    isUser = true,
                    timestamp = "Just now"
                )
                Spacer(modifier = Modifier.height(14.dp))
            }

            val result = state.result
            if (result != null) {
                if (result.offline) {
                    Text(
                        text = result.notice ?: "Offline result from saved consultation guidance.",
                        color = tokens.inkDim,
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.padding(bottom = 8.dp)
                    )
                }
                
                val displayText = result.answer.personalizedAnswer?.takeIf { it.isNotBlank() }
                    ?: result.answer.answerText ?: "Here is your personalized remedy."
                
                ChatBubble(
                    message = displayText,
                    isUser = false,
                    timestamp = "Just now"
                )
                Spacer(modifier = Modifier.height(16.dp))
                
                if (!result.answer.remedyName.isNullOrBlank() || !result.answer.dosageInstructions.isNullOrBlank() || !result.answer.homeRemedyText.isNullOrBlank()) {
                    RxCard(
                        remedyName = result.answer.remedyName ?: "See instructions",
                        dosage = result.answer.dosageInstructions ?: "Follow general guidance",
                        homeRemedy = result.answer.homeRemedyText,
                        safetyDisclaimer = result.answer.safetyDisclaimerText ?: ""
                    )
                }

                // Inline YouTube video if available
                if (!result.answer.videoUrl.isNullOrBlank()) {
                    Spacer(modifier = Modifier.height(16.dp))
                    YouTubePlayer(videoUrl = result.answer.videoUrl!!)
                }
            } else {
                if (state.offlineEntry != null) {
                    Text(
                        text = "Offline consultation: using saved questions and answers.",
                        color = tokens.inkDim,
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.padding(bottom = 8.dp)
                    )
                    ChatBubble(
                        message = state.offlineEntry.questionText,
                        isUser = false,
                        timestamp = "Offline"
                    )
                    Spacer(modifier = Modifier.height(14.dp))
                }

                if (state.candidates.isNotEmpty()) {
                    Text(
                        text = "You are using saved guidance. Choose the topic that best matches your symptoms.",
                        color = tokens.inkDim,
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.padding(bottom = 8.dp)
                    )
                    state.candidates.forEach { entry ->
                        OutlinedButton(
                            onClick = { onSelectCandidate(entry) },
                            modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = tokens.accentInk)
                        ) {
                            Text(entry.questionText)
                        }
                    }
                }

                state.message?.let {
                    ChatBubble(
                        message = it,
                        isUser = false,
                        timestamp = "Just now"
                    )
                    Spacer(modifier = Modifier.height(14.dp))
                }

                if (questions.isNotEmpty()) {
                    Column(horizontalAlignment = Alignment.Start, modifier = Modifier.fillMaxWidth()) {
                        Text(
                            text = "Please answer following to help you better",
                            style = MaterialTheme.typography.headlineSmall.copy(
                                fontFamily = SoraFontFamily,
                                fontWeight = FontWeight.Bold,
                                fontSize = 18.sp
                            ),
                            color = tokens.ink
                        )

                        Spacer(modifier = Modifier.height(4.dp))

                        Text(
                            text = "Personalized homeopathic recommendations require modality and symptom clarity.",
                            style = MaterialTheme.typography.bodySmall,
                            color = tokens.inkDim
                        )

                        Spacer(modifier = Modifier.height(16.dp))

                        Column(
                            modifier = Modifier.fillMaxWidth(),
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            questions.forEach { question ->
                                val selected = answers[question.id]
                                YesNoCard(
                                    questionId = question.id,
                                    questionText = question.questionText,
                                    selectedAnswer = selected,
                                    onAnswerSelected = { ans ->
                                        if (!state.loading) onAnswer(question.id, ans)
                                    }
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(24.dp))

                        val allAnswered = questions.all { answers.containsKey(it.id) }

                        Button(
                            onClick = onSubmit,
                            modifier = Modifier.fillMaxWidth().height(50.dp),
                            enabled = !state.loading && allAnswered,
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = tokens.accent,
                                contentColor = tokens.accentInk,
                                disabledContainerColor = tokens.line,
                                disabledContentColor = tokens.inkDim
                            )
                        ) {
                            Text(
                                text = "Submit Answers & Get Remedy",
                                style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.Bold)
                            )
                        }
                    }
                }

                if (state.loading) {
                    CircularProgressIndicator(color = tokens.accent, modifier = Modifier.padding(32.dp))
                    Text(
                        text = if (questions.isEmpty()) "Loading consultation questions..." else "Preparing your guidance...",
                        color = tokens.inkDim
                    )
                }

                state.error?.let {
                    Text(
                        text = it,
                        color = MaterialTheme.colorScheme.error,
                        modifier = Modifier.padding(16.dp)
                    )
                }

                if (!state.loading && questions.isEmpty() && state.candidates.isEmpty() && state.result == null) {
                    Button(
                        onClick = onRetry,
                        colors = ButtonDefaults.buttonColors(containerColor = tokens.accent)
                    ) {
                        Text("Retry")
                    }
                }
            }

            Spacer(modifier = Modifier.height(28.dp))
            DoctorContactFooter()
            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}
