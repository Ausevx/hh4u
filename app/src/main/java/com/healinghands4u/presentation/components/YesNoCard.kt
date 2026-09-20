package com.healinghands4u.presentation.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.healinghands4u.presentation.theme.trustedTealColors

@Composable
fun YesNoCard(
    questionId: String,
    questionText: String,
    selectedAnswer: String?,
    onAnswerSelected: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val tokens = MaterialTheme.trustedTealColors
    val isYes = selectedAnswer?.equals("yes", ignoreCase = true) == true
    val isNo = selectedAnswer?.equals("no", ignoreCase = true) == true

    Card(
        modifier = modifier
            .fillMaxWidth()
            .testTag("yes_no_card_$questionId"),
        shape = RoundedCornerShape(14.dp),
        border = BorderStroke(1.dp, tokens.line),
        colors = CardDefaults.cardColors(
            containerColor = tokens.surface
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Text(
                text = questionText,
                style = MaterialTheme.typography.bodyLarge.copy(
                    fontWeight = FontWeight.Medium,
                    fontSize = 15.sp
                ),
                color = tokens.ink
            )

            Spacer(modifier = Modifier.height(14.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // "Yes" button
                if (isYes) {
                    Button(
                        onClick = { onAnswerSelected("yes") },
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = tokens.accent,
                            contentColor = tokens.accentInk
                        ),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Text(text = "Yes", fontWeight = FontWeight.Bold)
                    }
                } else {
                    OutlinedButton(
                        onClick = { onAnswerSelected("yes") },
                        modifier = Modifier.weight(1f),
                        border = BorderStroke(1.dp, tokens.accent),
                        colors = ButtonDefaults.outlinedButtonColors(
                            contentColor = tokens.accent
                        ),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Text(text = "Yes", fontWeight = FontWeight.SemiBold)
                    }
                }

                // "No" button
                if (isNo) {
                    Button(
                        onClick = { onAnswerSelected("no") },
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = tokens.accent,
                            contentColor = tokens.accentInk
                        ),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Text(text = "No", fontWeight = FontWeight.Bold)
                    }
                } else {
                    OutlinedButton(
                        onClick = { onAnswerSelected("no") },
                        modifier = Modifier.weight(1f),
                        border = BorderStroke(1.dp, tokens.line),
                        colors = ButtonDefaults.outlinedButtonColors(
                            contentColor = tokens.inkDim
                        ),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Text(text = "No", fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }
    }
}
