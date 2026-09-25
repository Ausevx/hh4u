package com.healinghands4u.presentation.chatbot.consultation

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.healinghands4u.presentation.common.DoctorContactFooter
import com.healinghands4u.presentation.components.ChatBubble
import com.healinghands4u.presentation.components.ChatHeader
import com.healinghands4u.presentation.components.RxCard
import com.healinghands4u.presentation.components.YesNoCard
import com.healinghands4u.presentation.theme.SoraFontFamily
import com.healinghands4u.presentation.theme.trustedTealColors

@Composable
fun ConsultationScreen(
    queryText: String,
    onBackClick: () -> Unit = {},
    viewModel: ConsultationViewModel = hiltViewModel()
) {
    val tokens = MaterialTheme.trustedTealColors
    val scrollState = rememberScrollState()
    val uiState by viewModel.state.collectAsState()
    val answers = remember { mutableStateMapOf<String, String>() }

    LaunchedEffect(queryText) {
        viewModel.startConsultation(queryText)
    }

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        containerColor = tokens.bg,
        topBar = {
            ChatHeader(
                title = "Consultation",
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
            // User query recap bubble
            ChatBubble(
                message = queryText,
                isUser = true,
                timestamp = "Just now"
            )

            Spacer(modifier = Modifier.height(14.dp))

            when (val state = uiState) {
                is ConsultationUiState.Idle, is ConsultationUiState.Loading -> {
                    CircularProgressIndicator(color = tokens.accent, modifier = Modifier.padding(32.dp))
                }
                is ConsultationUiState.Error -> {
                    Text(
                        text = state.message,
                        color = MaterialTheme.colorScheme.error,
                        modifier = Modifier.padding(16.dp)
                    )
                }
                is ConsultationUiState.AnswerReady -> {
                    val ans = state.answer
                    val displayText = ans.answerText?.takeIf { it.isNotBlank() } ?: "Here is your personalized remedy."
                    
                    ChatBubble(
                        message = displayText,
                        isUser = false,
                        timestamp = "Just now"
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    if (!ans.remedyName.isNullOrBlank() || !ans.dosageInstructions.isNullOrBlank() || !ans.homeRemedyText.isNullOrBlank()) {
                        RxCard(
                            remedyName = ans.remedyName ?: "See instructions",
                            dosage = ans.dosageInstructions ?: "Follow general guidance",
                            homeRemedy = ans.homeRemedyText,
                            safetyDisclaimer = ans.safetyDisclaimerText ?: "",
                        )
                    }
                }
                is ConsultationUiState.Success -> {
                    Column(horizontalAlignment = Alignment.Start) {
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

                        // Diagnostic Yes/No cards
                        Column(
                            modifier = Modifier.fillMaxWidth(),
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            state.questions.forEach { question ->
                                val selected = answers[question.id]
                                YesNoCard(
                                    questionId = question.id,
                                    questionText = question.questionText,
                                    selectedAnswer = selected,
                                    onAnswerSelected = { ans ->
                                        answers[question.id] = ans
                                    }
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(24.dp))

                        val allAnswered = state.questions.all { answers.containsKey(it.id) }

                        // Submit Button
                        Button(
                            onClick = {
                                viewModel.submitAnswers(state.sessionId, answers)
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(50.dp),
                            enabled = allAnswered,
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
            }

            Spacer(modifier = Modifier.height(28.dp))

            // Embedded Doctor Contact Footer
            DoctorContactFooter()

            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}
