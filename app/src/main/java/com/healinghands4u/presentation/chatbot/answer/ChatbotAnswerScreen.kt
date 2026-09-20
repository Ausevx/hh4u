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

@Composable
fun ChatbotAnswerScreen(
    answerText: String,
    dosage: String?,
    homeRemedy: String?,
    safetyDisclaimer: String = "If disease does not cure within 2 days then consult doctor right now",
    videoUrl: String? = "https://healinghands4u.com/guides/homeopathic-protocol",
    onBackClick: () -> Unit = {}
) {
    val context = LocalContext.current
    val scrollState = rememberScrollState()
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
                remedyName = answerText,
                dosage = dosage ?: "4 pills, 2 times daily after meals",
                homeRemedy = homeRemedy,
                safetyDisclaimer = safetyDisclaimer
            )

            // VideoLink: External video guide if available
            if (!videoUrl.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(16.dp))
                VideoLink(
                    url = videoUrl,
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
}
