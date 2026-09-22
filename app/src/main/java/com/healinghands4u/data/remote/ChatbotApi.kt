package com.healinghands4u.data.remote

import retrofit2.http.Body
import retrofit2.http.POST

data class ChatbotQueryRequest(
    val queryText: String,
    val intent: String,
    val language: String? = null,
    val inputMode: String? = null
)

data class AnswerDto(
    val id: String? = null,
    val answerText: String? = null,
    val remedyName: String? = null,
    val personalizedAnswer: String? = null,
    val dosageInstructions: String? = null,
    val homeRemedyText: String? = null,
    val safetyDisclaimerText: String? = null,
    val videoUrl: String? = null
)

data class MatchedQuestionDto(
    val id: String,
    val canonicalQuestionText: String
)

data class DiagnosticQuestionDto(
    val id: String,
    val questionText: String
)

data class ChatbotQueryResponse(
    val success: Boolean,
    val sessionId: String? = null,
    val message: String? = null,
    val answer: AnswerDto? = null,
    val matchConfident: Boolean? = null,
    val confidenceScore: Float? = null,
    val intent: String? = null,
    val matchedLevel1Question: MatchedQuestionDto? = null,
    val diagnosticQuestions: List<DiagnosticQuestionDto>? = null,
    val fallback: Boolean? = null
)

data class ConsultationAnswerRequest(
    val sessionId: String,
    val answers: Map<String, String>
)

data class ConsultationResolutionResponse(
    val success: Boolean,
    val sessionId: String? = null,
    val answer: AnswerDto? = null,
    val personalized: Boolean? = null
)

interface ChatbotApi {
    @POST("api/chatbot/query")
    suspend fun queryChatbot(@Body request: ChatbotQueryRequest): ChatbotQueryResponse

    @POST("api/chatbot/consultation-answer")
    suspend fun resolveConsultationAnswer(@Body request: ConsultationAnswerRequest): ConsultationResolutionResponse
}
