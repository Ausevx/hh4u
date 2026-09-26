package com.healinghands4u.presentation.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.key
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
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

data class AdviceSections(val reason: String?, val remedy: String?, val unstructuredAnswer: String?)

/** Prefer saved fields; older servers may put the reason under an explicit answer heading. */
fun adviceSections(answerText: String, reasonText: String?, homeRemedyText: String?): AdviceSections {
    val lines = answerText.lines()
    fun heading(line: String) = line.trim().trim('#', '*', ' ').trimEnd(':').trim()
    val reasonHeadings = setOf("Pathology & Clinical Reason", "Understanding Your Symptoms")
    val start = lines.indexOfFirst { line -> reasonHeadings.any { it.equals(heading(line), ignoreCase = true) } }
    val legacyReason = if (start >= 0) {
        lines.drop(start + 1).takeWhile { line ->
            val title = heading(line)
            !line.trimStart().startsWith("#") &&
                !(line.trim().startsWith("**") && line.trim().endsWith("**")) &&
                !title.contains("remed", ignoreCase = true) &&
                !title.equals("Prescription", ignoreCase = true) &&
                !line.trim().matches(Regex("-{3,}"))
        }.joinToString("\n").trim().takeIf { it.isNotBlank() }
    } else null
    val reason = reasonText?.takeIf { it.isNotBlank() } ?: legacyReason
    val remedy = homeRemedyText?.takeIf { it.isNotBlank() }
    return AdviceSections(reason, remedy, answerText.takeIf {
        it.isNotBlank() && (reason == null || remedy == null) && it != reason && it != remedy
    })
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
    val videos = remember(answerText, videoUrl, reasonText, homeRemedyText) { answerVideoLinks(listOfNotNull(answerText, reasonText, homeRemedyText).joinToString("\n"), videoUrl) }

    val sections = adviceSections(answerText, reasonText, homeRemedyText)
    val pathologyText = sections.reason?.let { cleanText(it) }
    val remedyDisplayText = sections.remedy?.let { cleanText(it) }
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

        // Keep unstructured advice before the separate remedy section.
        if (sections.unstructuredAnswer != null) {
            SelectionContainer {
                Text(
                    text = cleanText(sections.unstructuredAnswer),
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
