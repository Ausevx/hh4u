package com.healinghands4u.presentation.assistant.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowUpward
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.VerifiedUser
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.dp
import com.healinghands4u.presentation.theme.trustedTealColors
import kotlinx.coroutines.delay

@Composable
fun ChatComposer(
    modifier: Modifier = Modifier,
    initialQuery: String = "",
    onSend: (String) -> Unit
) {
    var queryText by remember(initialQuery) { mutableStateOf(initialQuery) }
    var isListening by remember { mutableStateOf(false) }
    val tokens = MaterialTheme.trustedTealColors

    // Simulate speech-to-text typing effect
    LaunchedEffect(isListening) {
        if (isListening) {
            delay(1500)
            queryText = "Mera pet dard ho raha hai, koi gharelu upay?"
            delay(500)
            isListening = false
        }
    }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 8.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(24.dp),
            color = tokens.surface.copy(alpha = 0.95f),
            shadowElevation = 8.dp
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Add button
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(tokens.surfaceTint.copy(alpha = 0.4f))
                        .clickable { },
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Add,
                        contentDescription = "Add attachment",
                        tint = tokens.accent,
                        modifier = Modifier.size(20.dp)
                    )
                }

                Spacer(modifier = Modifier.width(8.dp))

                // Input Field
                BasicTextField(
                    value = queryText,
                    onValueChange = { queryText = it },
                    textStyle = MaterialTheme.typography.bodyMedium.copy(color = tokens.ink),
                    modifier = Modifier
                        .weight(1f)
                        .padding(vertical = 12.dp),
                    cursorBrush = SolidColor(tokens.accent),
                    decorationBox = { innerTextField ->
                        if (queryText.isEmpty()) {
                            Text(
                                text = if (isListening) "Listening in English, Hindi, Hinglish..." else "Ask a wellness question…",
                                style = MaterialTheme.typography.bodyMedium,
                                color = tokens.inkDim
                            )
                        }
                        innerTextField()
                    }
                )

                Spacer(modifier = Modifier.width(8.dp))

                // Mic Button
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(if (isListening) tokens.surfaceTint.copy(alpha = 0.6f) else Color.Transparent)
                        .clickable { isListening = !isListening },
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Mic,
                        contentDescription = "Microphone",
                        tint = com.healinghands4u.presentation.theme.ClinicalTertiary,
                        modifier = Modifier.size(20.dp)
                    )
                }

                Spacer(modifier = Modifier.width(4.dp))

                // Send Button
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(tokens.accent)
                        .clickable(enabled = queryText.isNotBlank()) {
                            onSend(queryText)
                            queryText = ""
                        },
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.ArrowUpward,
                        contentDescription = "Send",
                        tint = tokens.accentInk,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Privacy Footnote
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center
        ) {
            Icon(
                imageVector = Icons.Default.VerifiedUser,
                contentDescription = null,
                tint = tokens.inkDim,
                modifier = Modifier.size(14.dp)
            )
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                text = "Holistic guidance only. Not an emergency substitute.",
                style = MaterialTheme.typography.labelSmall,
                color = tokens.inkDim
            )
        }
        
        Spacer(modifier = Modifier.height(4.dp))
        
        // Navigation Pill
        Box(
            modifier = Modifier
                .width(112.dp)
                .height(4.dp)
                .clip(CircleShape)
                .background(tokens.line.copy(alpha = 0.6f))
        )
    }
}
