package com.healinghands4u.presentation.chatbot.query

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.healinghands4u.presentation.common.DoctorContactFooter
import com.healinghands4u.presentation.components.ChatHeader
import com.healinghands4u.presentation.components.QuickReplyChip
import com.healinghands4u.presentation.theme.AppIcons
import com.healinghands4u.presentation.theme.SoraFontFamily
import com.healinghands4u.presentation.theme.trustedTealColors

import androidx.hilt.navigation.compose.hiltViewModel

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

    val scrollState = rememberScrollState()
    val quickRepliesScroll = rememberScrollState()
    val tokens = MaterialTheme.trustedTealColors

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        containerColor = tokens.bg,
        topBar = {
            ChatHeader(
                title = "Chat with Dr. AI",
                subtitle = "Replies in seconds",
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
            Text(
                text = "How can we help you today?",
                style = MaterialTheme.typography.headlineMedium.copy(
                    fontFamily = SoraFontFamily,
                    fontWeight = FontWeight.Bold,
                    fontSize = 24.sp
                ),
                color = tokens.ink
            )

            Spacer(modifier = Modifier.height(4.dp))

            Text(
                text = "Type your query or speak in any language to receive personalized natural guidance.",
                style = MaterialTheme.typography.bodyMedium,
                color = tokens.inkDim
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Quick Reply Chips
            Text(
                text = "Quick Queries",
                style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                color = tokens.accent
            )

            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(quickRepliesScroll),
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

            Spacer(modifier = Modifier.height(20.dp))

            // Text Input Field
            OutlinedTextField(
                value = queryText,
                onValueChange = { queryText = it },
                label = { Text("Type your query or speak") },
                placeholder = { Text("Describe symptoms, pain, duration...", color = tokens.inkDim) },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp),
                trailingIcon = {
                    IconButton(onClick = { /* Start Audio Capture */ }) {
                        Icon(
                            imageVector = AppIcons.Mic,
                            contentDescription = "Speak",
                            tint = tokens.accent,
                            modifier = Modifier.size(24.dp)
                        )
                    }
                },
                colors = androidx.compose.material3.OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = tokens.accent,
                    unfocusedBorderColor = tokens.line,
                    focusedTextColor = tokens.ink,
                    unfocusedTextColor = tokens.ink
                ),
                minLines = 3,
                maxLines = 5
            )

            Spacer(modifier = Modifier.height(14.dp))

            // Consultation Mode Toggle
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                Checkbox(
                    checked = isConsultation,
                    onCheckedChange = { isConsultation = it },
                    colors = CheckboxDefaults.colors(
                        checkedColor = tokens.accent,
                        checkmarkColor = tokens.accentInk
                    )
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = "I would like a guided online consultation",
                    style = MaterialTheme.typography.bodyMedium,
                    color = tokens.ink
                )
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Primary Submit Action
            Button(
                onClick = { onSendQuery(queryText, isConsultation) },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp),
                enabled = queryText.isNotBlank(),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = tokens.accent,
                    contentColor = tokens.accentInk,
                    disabledContainerColor = tokens.line,
                    disabledContentColor = tokens.inkDim
                )
            ) {
                Icon(
                    imageVector = Icons.Default.Send,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = if (isConsultation) "Start Consultation" else "Get Answer Now",
                    style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.Bold)
                )
            }

            // Dual Intent Wireframe Button (when not currently in consultation mode)
            if (!isConsultation) {
                Spacer(modifier = Modifier.height(10.dp))
                OutlinedButton(
                    onClick = { onSendQuery(queryText, true) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp),
                    enabled = queryText.isNotBlank(),
                    shape = RoundedCornerShape(12.dp),
                    border = BorderStroke(1.dp, if (queryText.isNotBlank()) tokens.accent else tokens.line),
                    colors = ButtonDefaults.outlinedButtonColors(
                        contentColor = tokens.accent,
                        disabledContentColor = tokens.inkDim
                    )
                ) {
                    Text(
                        text = "I would like to Cooperate for online consultation",
                        style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.SemiBold)
                    )
                }
            }

            Spacer(modifier = Modifier.height(28.dp))

            // Embedded Doctor Contact Footer
            DoctorContactFooter()

            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}
