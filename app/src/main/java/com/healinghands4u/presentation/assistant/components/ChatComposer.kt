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
import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Intent
import android.speech.RecognizerIntent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.TextButton
import java.util.Locale

private val speechLanguages = listOf(
    "" to "Device language", "en-IN" to "English (India)", "hi-IN" to "Hindi",
    "gu-IN" to "Gujarati", "mr-IN" to "Marathi", "bn-IN" to "Bengali",
    "ta-IN" to "Tamil", "te-IN" to "Telugu", "kn-IN" to "Kannada",
    "ml-IN" to "Malayalam", "pa-IN" to "Punjabi", "ur-IN" to "Urdu",
    "or-IN" to "Odia", "as-IN" to "Assamese"
)

@Composable
fun ChatComposer(
    modifier: Modifier = Modifier,
    initialQuery: String = "",
    onSend: (String) -> Unit
) {
    var queryText by rememberSaveable(initialQuery) { mutableStateOf(initialQuery) }
    var isListening by rememberSaveable { mutableStateOf(false) }
    var languageTag by rememberSaveable { mutableStateOf("") }
    var showLanguages by remember { mutableStateOf(false) }
    var speechMessage by rememberSaveable { mutableStateOf<String?>(null) }
    val tokens = MaterialTheme.trustedTealColors
    // The system recognition activity owns the microphone and its permission UI.
    // No audio is recorded or uploaded by this app; only the final text is returned.
    val speechLauncher = rememberLauncherForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        isListening = false
        if (result.resultCode == Activity.RESULT_OK) {
            val spoken = result.data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)
                ?.firstOrNull { it.isNotBlank() }?.trim()
            if (spoken != null) {
                queryText = listOf(queryText.trim(), spoken).filter { it.isNotEmpty() }.joinToString(" ")
                speechMessage = "Review your question, then tap Send."
            } else {
                speechMessage = "No speech was recognized. Try again or type your question."
            }
        } else if (result.resultCode == Activity.RESULT_CANCELED) {
            // Keep the existing draft when the dialog is dismissed or recognition fails.
            speechMessage = "Voice input closed. You can try again or type your question."
        } else {
            speechMessage = when (result.resultCode) {
                RecognizerIntent.RESULT_NETWORK_ERROR -> "Voice input needs a connection or an installed offline language. Try again or type your question."
                RecognizerIntent.RESULT_NO_MATCH -> "Speech was not recognized. Speak clearly and try again."
                RecognizerIntent.RESULT_AUDIO_ERROR -> "Microphone unavailable. Check microphone access in your phone's settings."
                else -> "Voice input could not finish. Try again or type your question."
            }
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
                    enabled = !isListening,
                    textStyle = MaterialTheme.typography.bodyMedium.copy(color = tokens.ink),
                    modifier = Modifier
                        .weight(1f)
                        .padding(vertical = 12.dp),
                    cursorBrush = SolidColor(tokens.accent),
                    decorationBox = { innerTextField ->
                        if (queryText.isEmpty()) {
                            Text(
                                text = if (isListening) "Voice input is open…" else "Ask a wellness question…",
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
                        .clickable(enabled = !isListening) {
                            speechMessage = null
                            val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                                putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                                putExtra(RecognizerIntent.EXTRA_LANGUAGE, languageTag.ifBlank { Locale.getDefault().toLanguageTag() })
                                putExtra(RecognizerIntent.EXTRA_PROMPT, "Speak your wellness question")
                                putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
                            }
                            try {
                                isListening = true
                                speechLauncher.launch(intent)
                            } catch (_: ActivityNotFoundException) {
                                isListening = false
                                speechMessage = "Voice input is unavailable on this phone. Enable a speech recognition app or type your question."
                            } catch (_: SecurityException) {
                                isListening = false
                                speechMessage = "Microphone access is blocked. Check the speech app's microphone permission in Settings, or type your question."
                            } catch (_: IllegalStateException) {
                                isListening = false
                                speechMessage = "Voice input could not start. Please try again."
                            }
                        },
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Mic,
                        contentDescription = "Speak your question",
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
                        .clickable(enabled = !isListening && queryText.isNotBlank()) {
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

        Box {
            TextButton(onClick = { showLanguages = true }, enabled = !isListening) {
                Text("Speech: ${speechLanguages.first { it.first == languageTag }.second}",
                    style = MaterialTheme.typography.labelMedium)
            }
            DropdownMenu(expanded = showLanguages, onDismissRequest = { showLanguages = false },
                modifier = Modifier.heightIn(max = 300.dp)) {
                speechLanguages.forEach { (tag, name) ->
                    DropdownMenuItem(text = { Text(name) }, onClick = {
                        languageTag = tag
                        showLanguages = false
                        speechMessage = "Language availability depends on your phone's speech service."
                    })
                }
            }
        }
        speechMessage?.let { message ->
            Text(message, style = MaterialTheme.typography.bodySmall, color = tokens.inkDim)
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
