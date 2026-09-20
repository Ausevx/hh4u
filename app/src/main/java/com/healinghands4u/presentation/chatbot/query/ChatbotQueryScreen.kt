package com.healinghands4u.presentation.chatbot.query

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Send
import androidx.compose.material.icons.rounded.AutoAwesome
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.healinghands4u.presentation.components.ChatHeader
import com.healinghands4u.presentation.components.QuickReplyChip
import com.healinghands4u.presentation.theme.AppIcons
import com.healinghands4u.presentation.theme.SoraFontFamily
import com.healinghands4u.presentation.theme.trustedTealColors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatbotQueryScreen(
    initialQuery: String = "",
    onBackClick: () -> Unit = {},
    onSendQuery: (String, Boolean) -> Unit,
    viewModel: ChatbotQueryViewModel = hiltViewModel()
) {
    val decodedInitial = remember(initialQuery) {
        try {
            java.net.URLDecoder.decode(initialQuery, "UTF-8")
        } catch (e: Exception) {
            initialQuery
        }
    }
    var queryText by remember(decodedInitial) { mutableStateOf(decodedInitial) }
    var isConsultation by remember { mutableStateOf(false) }

    val quickRepliesScroll = rememberScrollState()
    val tokens = MaterialTheme.trustedTealColors

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        containerColor = tokens.bg,
        topBar = {
            ChatHeader(
                title = "Dr. AI Assistant",
                subtitle = "Powered by Gemini",
                onBackClick = onBackClick
            )
        },
        bottomBar = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(tokens.bg)
                    .padding(horizontal = 16.dp, vertical = 12.dp)
            ) {
                // Quick Replies just above the input
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(quickRepliesScroll)
                        .padding(bottom = 12.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    viewModel.quickReplies.forEach { item ->
                        QuickReplyChip(
                            label = item.label,
                            icon = item.icon,
                            onClick = { queryText = item.query }
                        )
                    }
                }

                // Sleek Input Bar
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(tokens.surface, RoundedCornerShape(24.dp))
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    IconButton(onClick = { /* Start Audio Capture */ }) {
                        Icon(
                            imageVector = AppIcons.Mic,
                            contentDescription = "Speak",
                            tint = tokens.inkDim,
                            modifier = Modifier.size(24.dp)
                        )
                    }

                    TextField(
                        value = queryText,
                        onValueChange = { queryText = it },
                        placeholder = { 
                            Text(
                                "Describe symptoms or ask anything...", 
                                color = tokens.inkDim,
                                maxLines = 1
                            ) 
                        },
                        modifier = Modifier
                            .weight(1f)
                            .padding(vertical = 4.dp),
                        colors = TextFieldDefaults.colors(
                            focusedContainerColor = Color.Transparent,
                            unfocusedContainerColor = Color.Transparent,
                            focusedIndicatorColor = Color.Transparent,
                            unfocusedIndicatorColor = Color.Transparent,
                            focusedTextColor = tokens.ink,
                            unfocusedTextColor = tokens.ink
                        ),
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send),
                        keyboardActions = KeyboardActions(
                            onSend = {
                                if (queryText.isNotBlank()) {
                                    onSendQuery(queryText, isConsultation)
                                }
                            }
                        ),
                        maxLines = 4
                    )

                    IconButton(
                        onClick = { onSendQuery(queryText, isConsultation) },
                        enabled = queryText.isNotBlank(),
                        modifier = Modifier
                            .size(40.dp)
                            .clip(CircleShape)
                            .background(if (queryText.isNotBlank()) tokens.accent else tokens.line)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Send,
                            contentDescription = "Send",
                            tint = if (queryText.isNotBlank()) tokens.accentInk else tokens.inkDim,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
                
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 8.dp, start = 8.dp)
                ) {
                    Checkbox(
                        checked = isConsultation,
                        onCheckedChange = { isConsultation = it },
                        modifier = Modifier.size(24.dp),
                        colors = CheckboxDefaults.colors(
                            checkedColor = tokens.accent,
                            checkmarkColor = tokens.accentInk
                        )
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Enable Guided Consultation",
                        style = MaterialTheme.typography.bodySmall,
                        color = tokens.inkDim
                    )
                }
            }
        }
    ) { paddingValues ->
        // Empty State / Welcome Screen
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(24.dp),
            contentAlignment = Alignment.Center
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Box(
                    modifier = Modifier
                        .size(72.dp)
                        .background(tokens.accent.copy(alpha = 0.1f), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Rounded.AutoAwesome,
                        contentDescription = "AI Assistant",
                        tint = tokens.accent,
                        modifier = Modifier.size(36.dp)
                    )
                }
                
                Spacer(modifier = Modifier.height(24.dp))
                
                Text(
                    text = "Hello, I'm Dr. AI",
                    style = MaterialTheme.typography.headlineMedium.copy(
                        fontFamily = SoraFontFamily,
                        fontWeight = FontWeight.Bold,
                        fontSize = 28.sp
                    ),
                    color = tokens.ink,
                    textAlign = TextAlign.Center
                )
                
                Spacer(modifier = Modifier.height(8.dp))
                
                Text(
                    text = "How can I help you today? You can type your symptoms or speak in any language.",
                    style = MaterialTheme.typography.bodyLarge,
                    color = tokens.inkDim,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(horizontal = 16.dp)
                )
            }
        }
    }
}
