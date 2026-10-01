package com.healinghands4u.data.repository

import com.google.gson.Gson
import com.healinghands4u.data.local.KnowledgeBaseEntity
import com.healinghands4u.data.remote.*
import java.util.Locale

data class OfflineConsultationData(
    val questions: List<DiagnosticQuestionDto> = emptyList(),
    val branches: List<OfflineAnswerBranch> = emptyList()
)

fun KnowledgeBaseEntity.consultationData(): OfflineConsultationData = try {
    consultationJson?.let { Gson().fromJson(it, OfflineConsultationData::class.java) }
        ?: OfflineConsultationData(listOfNotNull(diagnosticQ1, diagnosticQ2, diagnosticQ3)
            .mapIndexed { index, text -> DiagnosticQuestionDto("q${index + 1}", text) })
} catch (_: Exception) { OfflineConsultationData() }

fun KnowledgeBaseEntity.directAnswer() = AnswerDto(
    id = id, answerText = answerText ?: reasonText, remedyName = remedyText, reasonText = reasonText,
    dosageInstructions = dosageInstructions, homeRemedyText = homeRemedyText,
    safetyDisclaimerText = safetyDisclaimerText, videoUrl = videoUrl
)

object OfflineKnowledgeMatcher {
    private val stopWords = ("i am is are was were have has had a an the my me we you your " +
        "and or of for to in on with from it this that do does did please help suffering " +
        "what how can should could would remedy remedies treatment homeopathic ayurvedic " +
        "experiencing feel feeling relief recommended need some very currently recently " +
        "severe mild since yesterday today days day weeks week months month really " +
        "why getting get having been any also about there then than when while " +
        "problem problems symptoms symptom often frequently frequent repeatedly persistent").split(" ").toSet()
    private val synonyms = mapOf("aches" to "pain", "ache" to "pain", "aching" to "pain",
        "hurts" to "pain", "hurt" to "pain", "painful" to "pain", "tummy" to "stomach",
        "belly" to "stomach", "abdomen" to "stomach", "abdominal" to "stomach",
        "urinating" to "urine", "urination" to "urine", "pee" to "urine",
        "headaches" to "headache", "coughing" to "cough", "fevers" to "fever")
    private fun tokens(text: String): Set<String> = Regex("[\\p{L}\\p{M}\\p{N}]+")
        .findAll(text.lowercase(Locale.ROOT)).map { it.value }
        .filter { it.length > 1 && it !in stopWords }
        .map { synonyms[it] ?: it }.toSet()

    /** Rank all cached questions, tags and diagnostic questions; never interpolate FTS syntax. */
    fun search(query: String, entries: List<KnowledgeBaseEntity>): List<KnowledgeBaseEntity> {
        val queryTokens = tokens(query)
        if (queryTokens.isEmpty()) return emptyList()
        return entries.mapNotNull { entry ->
            val primary = tokens(entry.questionText + " " + (entry.tags ?: ""))
            val diagnostic = tokens(entry.consultationData().questions.joinToString(" ") { it.questionText })
            fun matches(token: String, words: Set<String>) = words.any {
                it == token || (token.length >= 4 && it.length >= 4 && (it.startsWith(token) || token.startsWith(it)))
            }
            val primaryHits = queryTokens.count { matches(it, primary) }
            val hits = queryTokens.count { matches(it, primary) || matches(it, diagnostic) }
            val coverage = hits.toDouble() / queryTokens.size
            val enough = if (queryTokens.size <= 2) hits == queryTokens.size else hits >= 2 && coverage >= 0.4
            if (!enough || primaryHits == 0) null
            else entry to (primaryHits * 10 + coverage * 4 + hits * 0.5)
        }.sortedWith(compareByDescending<Pair<KnowledgeBaseEntity, Double>> { it.second }.thenBy { it.first.id })
            .map { it.first }.take(10)
    }

    /** Additive resolution: root answer + each diagnostic question answered "yes". */
    fun resolve(entry: KnowledgeBaseEntity, answers: Map<String, String>): AnswerDto? {
        val data = entry.consultationData()
        if (data.questions.isEmpty() || data.questions.any { answers[it.id] !in listOf("yes", "no") }) return null

        val root = entry.directAnswer()
        val reasonParts = mutableListOf<String>()
        val remedyParts = mutableListOf<String>()
        val videoUrls = mutableListOf<String>()

        root.reasonText?.takeIf { it.isNotBlank() }?.let { reasonParts.add(it) }
        (root.homeRemedyText ?: root.remedyName)?.takeIf { it.isNotBlank() }?.let { remedyParts.add(it) }
        root.videoUrl?.takeIf { it.isNotBlank() }?.let { videoUrls.add(it) }

        for (branch in data.branches) {
            val matchesYes = branch.conditions.entries.any { (id, value) ->
                value.equals("yes", ignoreCase = true) && answers[id] == "yes"
            }
            if (matchesYes && branch.answer != null) {
                branch.answer.reasonText?.takeIf { it.isNotBlank() }?.let { reasonParts.add(it) }
                (branch.answer.homeRemedyText ?: branch.answer.remedyName)?.takeIf { it.isNotBlank() }?.let { remedyParts.add(it) }
                branch.answer.videoUrl?.takeIf { it.isNotBlank() && it !in videoUrls }?.let { videoUrls.add(it) }
            }
        }

        val combinedReason = reasonParts.joinToString("\n\n")
        val combinedRemedy = remedyParts.joinToString("\n\n")

        return AnswerDto(
            id = root.id,
            answerText = listOf(combinedReason, combinedRemedy).filter { it.isNotBlank() }.joinToString("\n\n"),
            reasonText = combinedReason.ifBlank { null },
            remedyName = combinedRemedy.ifBlank { null },
            homeRemedyText = combinedRemedy.ifBlank { null },
            dosageInstructions = root.dosageInstructions,
            safetyDisclaimerText = root.safetyDisclaimerText,
            videoUrl = videoUrls.firstOrNull()
        )
    }
}
