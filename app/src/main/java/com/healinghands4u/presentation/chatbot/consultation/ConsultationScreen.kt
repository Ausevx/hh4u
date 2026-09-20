package com.healinghands4u.presentation.chatbot.consultation

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.healinghands4u.presentation.common.DoctorContactFooter
import com.healinghands4u.presentation.components.ChatBubble
import com.healinghands4u.presentation.components.ChatHeader
import com.healinghands4u.presentation.components.YesNoCard
import com.healinghands4u.presentation.theme.SoraFontFamily
import com.healinghands4u.presentation.theme.trustedTealColors

import androidx.hilt.navigation.compose.hiltViewModel

@Composable
fun ConsultationScreen(
    questionText: String? = null,
    onBackClick: () -> Unit = {},
    onAnswerSelected: (String) -> Unit = {},
    viewModel: ConsultationViewModel = hiltViewModel()
) {
    val tokens = MaterialTheme.trustedTealColors
    val scrollState = rememberScrollState()

    // If a single question is provided (e.g. from unit tests), display it directly
    // Otherwise load the full diagnostic questions from mock data
    val isSingleQuestionMode = questionText != null

    val questions = remember(questionText) {
        if (questionText != null) {
            listOf(DiagnosticQuestionUI("single_q", questionText))
        } else {
            viewModel.diagnosticQuestions
        }
    }

    val answers = remember { mutableStateMapOf<String, String>() }
    var lastSelectedAnswer by remember { mutableStateOf<String?>(null) }

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
            verticalArrangement = Arrangement.Top
        ) {
            // User query recap bubble
            ChatBubble(
                message = "Query: I am experiencing acute symptoms and need a personalized assessment.",
                isUser = true,
                timestamp = "Just now"
            )

            Spacer(modifier = Modifier.height(14.dp))

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
                questions.forEach { question ->
                    val selected = answers[question.id] ?: if (isSingleQuestionMode) lastSelectedAnswer else null
                    YesNoCard(
                        questionId = question.id,
                        questionText = question.questionText,
                        selectedAnswer = selected,
                        onAnswerSelected = { ans ->
                            answers[question.id] = ans
                            lastSelectedAnswer = ans
                            onAnswerSelected(ans)
                        }
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            val allAnswered = questions.all { answers.containsKey(it.id) || (isSingleQuestionMode && lastSelectedAnswer != null) }

            // Submit Button
            Button(
                onClick = {
                    val finalAnswer = lastSelectedAnswer ?: answers.values.firstOrNull() ?: "yes"
                    onAnswerSelected(finalAnswer)
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

            Spacer(modifier = Modifier.height(28.dp))

            // Embedded Doctor Contact Footer
            DoctorContactFooter()

            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}
