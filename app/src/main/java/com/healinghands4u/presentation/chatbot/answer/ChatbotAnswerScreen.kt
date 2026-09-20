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
import com.healinghands4u.presentation.common.DoctorContactFooter
import com.healinghands4u.presentation.components.ChatBubble
import com.healinghands4u.presentation.components.ChatHeader
import com.healinghands4u.presentation.components.RxCard
import com.healinghands4u.presentation.components.VideoLink
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
    val context = LocalContext.current
    val scrollState = rememberScrollState()
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
        }
    ) { paddingValues ->
        when (val state = uiState) {
            is ChatbotUiState.Loading -> {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    CircularProgressIndicator(color = tokens.accent)
                    Spacer(modifier = Modifier.height(16.dp))
                    Text("Consulting Dr. AI...", color = tokens.inkDim)
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
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues)
                        .verticalScroll(scrollState)
                        .padding(16.dp),
                    verticalArrangement = Arrangement.Top
                ) {
                    // Assistant Diagnosis Recap
                    ChatBubble(
                        message = "Here is your personalized homeopathic healing regimen curated by Dr. Anjali Jariwala:",
                        isUser = false,
                        timestamp = "Just now"
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    // RxCard: Visual Centerpiece
                    RxCard(
                        remedyName = state.answerText,
                        dosage = state.dosage ?: "4 pills, 2 times daily after meals",
                        homeRemedy = state.homeRemedy,
                        safetyDisclaimer = "If disease does not cure within 2 days then consult doctor right now"
                    )

                    // VideoLink: External video guide if available
                    if (!state.videoUrl.isNullOrBlank()) {
                        Spacer(modifier = Modifier.height(16.dp))
                        VideoLink(
                            url = state.videoUrl,
                            label = "Watch Remedy Guide Video",
                            onClick = { url ->
                                try {
                                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                                    context.startActivity(intent)
                                } catch (e: Exception) {
                                    // Safely handle missing browser
                                }
                            }
                        )
                    }

                    Spacer(modifier = Modifier.height(24.dp))

                    // Embedded Doctor Contact Footer
                    DoctorContactFooter()

                    Spacer(modifier = Modifier.height(16.dp))
                }
            }
            is ChatbotUiState.Idle -> {
                // Empty state or nothing if blank query
            }
        }
    }
}
