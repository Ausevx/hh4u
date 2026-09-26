package com.healinghands4u.presentation.chatbot.answer

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.background
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.Row

import com.healinghands4u.presentation.common.DoctorContactFooter
import com.healinghands4u.presentation.components.ChatBubble
import com.healinghands4u.presentation.components.ChatHeader
import com.healinghands4u.presentation.components.RxCard
import com.healinghands4u.presentation.components.YouTubePlayer
import com.healinghands4u.presentation.theme.trustedTealColors

import androidx.compose.material3.Text
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.hilt.navigation.compose.hiltViewModel
import com.healinghands4u.presentation.chatbot.ChatbotViewModel
import com.healinghands4u.presentation.chatbot.ChatbotUiState

@Composable
fun ChatbotAnswerScreen(
    query: String,
    viewModel: ChatbotViewModel = hiltViewModel(),
    onBackClick: () -> Unit = {}
) {
    val tokens = MaterialTheme.trustedTealColors
    val uiState by viewModel.state.collectAsState()

    LaunchedEffect(query) {
        if (query.isNotBlank()) {
            viewModel.querySymptoms(query)
        }
    }

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        containerColor = tokens.bg,
        topBar = {
            ChatHeader(
                title = "Your Healing Plan",
                subtitle = "Dr. Anjali Jariwala (DHMS)",
                onBackClick = onBackClick
            )
        },
        bottomBar = {
            var inputText by remember { mutableStateOf("") }
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                OutlinedTextField(
                    value = inputText,
                    onValueChange = { inputText = it },
                    placeholder = { Text("Ask a follow up question...", color = tokens.inkDim) },
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(14.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = tokens.accent,
                        unfocusedBorderColor = tokens.line,
                        focusedTextColor = tokens.ink,
                        unfocusedTextColor = tokens.ink
                    ),
                    maxLines = 3
                )
                
                Spacer(modifier = Modifier.width(8.dp))
                
                IconButton(
                    onClick = { 
                        if (inputText.isNotBlank()) {
                            viewModel.querySymptoms(inputText)
                            inputText = ""
                        }
                    },
                    enabled = inputText.isNotBlank(),
                    modifier = Modifier
                        .background(
                            if (inputText.isNotBlank()) tokens.accent else tokens.line,
                            RoundedCornerShape(12.dp)
                        )
                        .size(50.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Send,
                        contentDescription = "Send",
                        tint = if (inputText.isNotBlank()) tokens.accentInk else tokens.inkDim
                    )
                }
            }
        }
    ) { paddingValues ->
        when (val state = uiState) {
            is ChatbotUiState.Loading -> {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues)
                        .padding(16.dp),
                    verticalArrangement = Arrangement.Top,
                    horizontalAlignment = Alignment.Start
                ) {
                    Text("Consulting Dr. AI...", color = tokens.inkDim, style = MaterialTheme.typography.bodySmall)
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    // Skeleton Chat Bubble
                    androidx.compose.foundation.layout.Box(
                        modifier = Modifier
                            .fillMaxWidth(0.85f)
                            .height(120.dp)
                            .background(
                                color = tokens.surfaceTint,
                                shape = RoundedCornerShape(16.dp, 16.dp, 16.dp, 0.dp)
                            )
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    // Skeleton Remedy Card
                    androidx.compose.foundation.layout.Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(160.dp)
                            .background(
                                color = tokens.surfaceTint,
                                shape = RoundedCornerShape(12.dp)
                            )
                    )
                }
            }
            is ChatbotUiState.Error -> {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues)
                        .padding(16.dp),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(state.message, color = MaterialTheme.colorScheme.error)
                }
            }
            is ChatbotUiState.Success -> {
                ChatbotAnswerContent(
                    queryText = query,
                    headerMessage = state.answerText,
                    answerText = state.answerText,
                    remedyName = state.remedyName,
                    dosage = state.dosage,
                    homeRemedy = state.homeRemedy,
                    safetyDisclaimer = state.safetyDisclaimer,
                    videoUrl = state.videoUrl,
                    modifier = Modifier.padding(paddingValues)
                )
            }
            is ChatbotUiState.Idle -> {
                // Empty state or nothing if blank query
            }
        }
    }
}

@Composable
fun ChatbotAnswerScreen(
    answerText: String,
    remedyName: String? = null,
    dosage: String? = null,
    homeRemedy: String? = null,
    safetyDisclaimer: String? = null,
    videoUrl: String? = null,
    onBackClick: () -> Unit = {}
) {
    val tokens = MaterialTheme.trustedTealColors
    Scaffold(
        modifier = Modifier.fillMaxSize(),
        containerColor = tokens.bg,
        topBar = {
            ChatHeader(
                title = "Your Healing Plan",
                subtitle = "Dr. Anjali Jariwala (DHMS)",
                onBackClick = onBackClick
            )
        }
    ) { paddingValues ->
        ChatbotAnswerContent(
            headerMessage = null,
            answerText = answerText,
            remedyName = remedyName,
            dosage = dosage,
            homeRemedy = homeRemedy,
            safetyDisclaimer = safetyDisclaimer,
            videoUrl = videoUrl,
            modifier = Modifier.padding(paddingValues)
        )
    }
}

@Composable
fun ChatbotAnswerContent(
    queryText: String? = null,
    headerMessage: String? = null,
    answerText: String,
    remedyName: String? = null,
    dosage: String?,
    homeRemedy: String?,
    safetyDisclaimer: String?,
    videoUrl: String?,
    modifier: Modifier = Modifier
) {
    val scrollState = rememberScrollState()

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(scrollState)
            .padding(16.dp),
        verticalArrangement = Arrangement.Top
    ) {
        // User's original question
        if (!queryText.isNullOrBlank()) {
            ChatBubble(
                message = queryText,
                isUser = true,
                timestamp = "Just now"
            )
            Spacer(modifier = Modifier.height(12.dp))
        }

        // AI answer explanation
        if (!headerMessage.isNullOrBlank()) {
            ChatBubble(
                message = headerMessage,
                isUser = false,
                timestamp = "Just now"
            )
            Spacer(modifier = Modifier.height(16.dp))
        }

        // Prescription card
        val hasPrescription = dosage != null || homeRemedy != null || (answerText.length < 50 && headerMessage != answerText)
        if (hasPrescription) {
            RxCard(
                remedyName = remedyName ?: "Personalized Remedy",
                dosage = dosage ?: "As advised by your homeopathic physician",
                homeRemedy = homeRemedy,
                safetyDisclaimer = safetyDisclaimer ?: "If disease does not cure within 2 days then consult doctor right now"
            )
        }

        // Inline YouTube video player
        if (!videoUrl.isNullOrBlank()) {
            Spacer(modifier = Modifier.height(16.dp))
            YouTubePlayer(videoUrl = videoUrl)
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Doctor contact footer
        DoctorContactFooter()

        Spacer(modifier = Modifier.height(16.dp))
    }
}
