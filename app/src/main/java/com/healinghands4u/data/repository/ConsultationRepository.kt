package com.healinghands4u.data.repository

import com.healinghands4u.data.local.KnowledgeBaseEntity
import com.healinghands4u.data.remote.*
import java.io.IOException
import javax.inject.Inject
import retrofit2.HttpException

data class ConsultationStart(
    val sessionId: String? = null,
    val matchedQuestionId: String? = null,
    val questions: List<DiagnosticQuestionDto> = emptyList(),
    val candidates: List<KnowledgeBaseEntity> = emptyList(),
    val message: String? = null
)

data class ConsultationResult(val answer: AnswerDto, val offline: Boolean, val notice: String? = null)

interface ConsultationDataSource {
    suspend fun start(query: String): ConsultationStart
    suspend fun resolve(sessionId: String?, matchedQuestionId: String?,
        questions: List<DiagnosticQuestionDto>, answers: Map<String, String>,
        offlineEntry: KnowledgeBaseEntity?): ConsultationResult
}

class ConsultationRepository @Inject constructor(
    private val api: ChatbotApi,
    private val offline: OfflineSearchRepository
) : ConsultationDataSource {
    override suspend fun start(query: String): ConsultationStart {
        try {
            if (!offline.isOnline()) throw IOException("No connection")
            val response = api.queryChatbot(ChatbotQueryRequest(query, "consultation"))
            if (!response.success) throw IllegalStateException(response.message ?: "Unable to start consultation.")
            if (response.matchConfident != true || response.fallback == true) {
                return ConsultationStart(message = response.message ?: "No confident match was found. Please describe your symptoms more specifically.")
            }
            val questions = response.consultation?.diagnosticQuestions ?: response.diagnosticQuestions.orEmpty()
            if (questions.isEmpty()) return ConsultationStart(message = "No guided questions are available for this topic. Please try Direct Answer or contact the clinic.")
            val session = response.sessionId?.takeIf { it.isNotBlank() }
                ?: throw IllegalStateException("The consultation session could not be created. Please retry.")
            return ConsultationStart(session, response.matchedLevel1Question?.id, questions)
        } catch (e: IOException) {
            return offlineStart(query)
        } catch (e: HttpException) {
            throwIfTranslationUnavailable(e)
            if (e.code() < 500 && e.code() != 429) throw e
            return offlineStart(query)
        }
    }

    private suspend fun offlineStart(query: String): ConsultationStart {
        val candidates = offline.searchOffline(query).filter { it.consultationData().questions.isNotEmpty() }
        return ConsultationStart(candidates = candidates, message = if (candidates.isEmpty())
            "No saved consultation matches this question. Connect to the internet to download the latest knowledge base, or contact the clinic." else null)
    }

    override suspend fun resolve(sessionId: String?, matchedQuestionId: String?,
        questions: List<DiagnosticQuestionDto>, answers: Map<String, String>,
        offlineEntry: KnowledgeBaseEntity?): ConsultationResult {
        if (questions.isEmpty() || questions.any { answers[it.id] !in listOf("yes", "no") })
            throw IllegalArgumentException("Please answer every question.")
        if (offlineEntry != null) return resolveOffline(offlineEntry, questions, answers)
        try {
            if (!offline.isOnline()) throw IOException("No connection")
            val response = api.resolveConsultationAnswer(ConsultationAnswerRequest(
                sessionId ?: throw IllegalStateException("Missing consultation session. Please start again."), answers
            ))
            if (!response.success || response.answer == null) throw IllegalStateException("Unable to resolve your answers. Please retry.")
            return ConsultationResult(response.answer, false)
        } catch (e: IOException) {
            return resolveCached(matchedQuestionId, questions, answers)
        } catch (e: HttpException) {
            throwIfTranslationUnavailable(e)
            if (e.code() < 500 && e.code() != 429) throw e
            return resolveCached(matchedQuestionId, questions, answers)
        }
    }

    private suspend fun resolveCached(id: String?, questions: List<DiagnosticQuestionDto>, answers: Map<String, String>): ConsultationResult {
        val entry = id?.let { offline.getById(it) }
            ?: throw IllegalStateException("Connection lost and this consultation is not saved offline. Your answers are kept; reconnect and retry.")
        return resolveOffline(entry, questions, answers)
    }

    private fun throwIfTranslationUnavailable(error: HttpException) {
        val body = error.response()?.errorBody()?.string().orEmpty()
        if (body.contains("TRANSLATION_UNAVAILABLE")) {
            throw IllegalStateException("Translation is temporarily unavailable. Please retry; your answers are kept.")
        }
    }

    private fun resolveOffline(entry: KnowledgeBaseEntity, questions: List<DiagnosticQuestionDto>, answers: Map<String, String>): ConsultationResult {
        if (entry.consultationData().questions != questions)
            throw IllegalStateException("The saved questions differ from this consultation. Reconnect and retry; your answers are kept.")
        if (entry.consultationData().branches.isEmpty() && !entry.answerText.isNullOrBlank()) {
            return ConsultationResult(entry.directAnswer(), true,
                "Offline: saved general guidance for this topic. This answer is not tailored to your yes/no responses.")
        }
        val answer = OfflineKnowledgeMatcher.resolve(entry, answers)
            ?: throw IllegalStateException("No saved answer matches your responses. Please reconnect or consult the clinic.")
        return ConsultationResult(answer, true)
    }
}
