package com.healinghands4u.data.remote

import retrofit2.http.Body
import retrofit2.http.POST

data class ChatbotQueryRequest(
    val queryText: String,
    val intent: String
)

data class ChatbotQueryResponse(
    val success: Boolean,
    val message: String?,
    val answer: String?,
    val remedyText: String?,
    val homeRemedyText: String?,
    val videoUrl: String?,
    val diagnosticQuestions: List<DiagnosticQuestionDto>?
)

data class DiagnosticQuestionDto(
    val id: String,
    val questionText: String
)

interface ChatbotApi {
    @POST("api/chatbot/query")
    suspend fun queryChatbot(@Body request: ChatbotQueryRequest): ChatbotQueryResponse
}
