package com.healinghands4u.presentation.components

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.key
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.healinghands4u.presentation.theme.trustedTealColors

/** Extract all YouTube URLs from the answer text and videoUrl field. */
fun answerVideoLinks(answer: String, videoField: String?): List<String> {
    val urls = Regex("https?://[^\\s<>\\\"]+", RegexOption.IGNORE_CASE)
        .findAll(answer + "\n" + videoField.orEmpty())
        .map { it.value.trimEnd('.', ',', ';', ')', ']', '}') }
    return urls.filter { extractYouTubeVideoId(it) != null || videoField.orEmpty().contains(it) }
        .distinctBy { extractYouTubeVideoId(it) ?: it }.toList()
}

/** Strip all URLs from text so we only show the actual written content. */
private fun stripUrls(text: String): String {
    return text.replace(Regex("https?://[^\\s<>\\\"]+"), "")
        .replace(Regex("\\n{3,}"), "\n\n")
        .trim()
}

/** Strip markdown formatting characters. */
private fun stripMarkdown(text: String): String {
    return text.replace(Regex("\\*\\*|\\*"), "")
        .replace(Regex("^#+\\s*", RegexOption.MULTILINE), "")
        .replace(Regex("^---+$", RegexOption.MULTILINE), "")
        .trim()
}

private fun cleanText(text: String): String = stripMarkdown(stripUrls(text))

/**
 * Try to split answerText into reason + remedy parts.
 * The database stores answerText as: "reasonText\n\nremedyText"
 */
private fun splitAnswerText(answerText: String): Pair<String?, String?> {
    val parts = answerText.split(Regex("\\n\\n+"))
    return when {
        parts.size >= 3 -> {
            // Assume format is [Greeting] \n\n [Reason] \n\n [Remedy] (and optionally more)
            // Skip the greeting and take the next two parts
            Pair(parts[1].trim(), parts.drop(2).joinToString("\n\n").trim())
        }
        parts.size == 2 -> {
            // Assume format is [Reason] \n\n [Remedy]
            if (parts[0].isNotBlank() && parts[1].isNotBlank()) {
                Pair(parts[0].trim(), parts[1].trim())
            } else {
                Pair(null, null)
            }
        }
        else -> Pair(null, null)
    }
}

@Composable
fun PracticalAdvice(
    answerText: String,
    videoUrl: String?,
    reasonText: String? = null,
    homeRemedyText: String? = null,
    modifier: Modifier = Modifier
) {
    val tokens = MaterialTheme.trustedTealColors
    val context = LocalContext.current
    val videos = remember(answerText, videoUrl) { answerVideoLinks(answerText, videoUrl) }

    // Use structured fields if available, otherwise try to parse from answerText
    val (parsedReason, parsedRemedy) = remember(answerText) { splitAnswerText(answerText) }
    val pathologyText = (reasonText?.takeIf { it.isNotBlank() } ?: parsedReason)?.let { cleanText(it) }
    val remedyDisplayText = (homeRemedyText?.takeIf { it.isNotBlank() } ?: parsedRemedy)?.let { cleanText(it) }

    Column(modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(16.dp)) {

        // Header
        Text(
            "Dr. Anjali Jariwala's\nPractical Advice",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.SemiBold,
            color = tokens.ink
        )

        // Section 1: Pathology & Clinical Reason
        if (!pathologyText.isNullOrBlank()) {
            Text(
                text = "Pathology & Clinical Reason:",
                style = MaterialTheme.typography.titleSmall.copy(
                    fontWeight = FontWeight.Bold,
                    fontStyle = FontStyle.Italic
                ),
                color = tokens.accent
            )
            SelectionContainer {
                Text(
                    text = pathologyText,
                    style = MaterialTheme.typography.bodyLarge,
                    color = tokens.ink
                )
            }
        }

        // Section 2: Home Remedy & Prescription
        if (!remedyDisplayText.isNullOrBlank()) {
            Text(
                text = "Home Remedy & Prescription:",
                style = MaterialTheme.typography.titleSmall.copy(
                    fontWeight = FontWeight.Bold,
                    fontStyle = FontStyle.Italic
                ),
                color = tokens.accent
            )
            SelectionContainer {
                Text(
                    text = remedyDisplayText,
                    style = MaterialTheme.typography.bodyLarge,
                    color = tokens.ink
                )
            }
        }

        // Fallback: if neither structured fields nor parsing worked, show full answerText
        if (pathologyText.isNullOrBlank() && remedyDisplayText.isNullOrBlank()) {
            SelectionContainer {
                Text(
                    text = cleanText(answerText),
                    style = MaterialTheme.typography.bodyLarge,
                    color = tokens.ink
                )
            }
        }

        // YouTube video thumbnails — clicking opens YouTube app
        if (videos.isNotEmpty()) {
            Spacer(modifier = Modifier.height(4.dp))
            videos.forEach { url ->
                key(url) {
                    YouTubePlayer(videoUrl = url)
                }
            }
        }
    }
}
