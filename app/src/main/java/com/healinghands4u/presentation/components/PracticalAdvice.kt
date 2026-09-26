package com.healinghands4u.presentation.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.key
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

/** Keep the database text intact and display each distinct linked video once. */
fun answerVideoLinks(answer: String, videoField: String?): List<String> {
    val urls = Regex("https?://[^\\s<>\\\"]+", RegexOption.IGNORE_CASE)
        .findAll(answer + "\n" + videoField.orEmpty())
        .map { it.value.trimEnd('.', ',', ';', ')', ']', '}') }
    return urls.filter { extractYouTubeVideoId(it) != null || videoField.orEmpty().contains(it) }
        .distinctBy { extractYouTubeVideoId(it) ?: it }.toList()
}

@Composable
fun PracticalAdvice(answerText: String, videoUrl: String?, modifier: Modifier = Modifier) {
    val videos = remember(answerText, videoUrl) { answerVideoLinks(answerText, videoUrl) }
    Column(modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text("Dr. Anjali Jariwala's\nPractical Advice",
            style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold)
        SelectionContainer {
            Text(answerText, style = MaterialTheme.typography.bodyLarge)
        }
        videos.forEach { url -> key(url) { YouTubePlayer(videoUrl = url) } }
    }
}
