package com.healinghands4u.data.remote

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Query

data class KnowledgeBaseSyncItem(
    val id: String,
    val questionText: String,
    val tags: List<String>?,
    val answerText: String?,
    val reasonText: String?,
    val remedyText: String?,
    val homeRemedyText: String?,
    val dosageInstructions: String?,
    val safetyDisclaimerText: String?,
    val videoUrl: String?,
    val diagnosticQ1: String?,
    val diagnosticQ2: String?,
    val diagnosticQ3: String?,
    val updatedAt: Long?,
    val diagnosticQuestions: List<DiagnosticQuestionDto>? = null,
    val answerBranches: List<OfflineAnswerBranch>? = null
)

data class KnowledgeBaseSyncResponse(
    val success: Boolean,
    val upToDate: Boolean?,
    val dataVersion: String?,
    val totalItems: Int?,
    val items: List<KnowledgeBaseSyncItem>?,
    val schemaVersion: Int? = null
)

data class SearchEventDto(
    val queryText: String,
    val timestamp: Long,
    val userId: String?,
    val matchedQuestionId: String?
)

data class SyncAnalyticsResponse(
    val success: Boolean,
    val processed: Int?,
    val skipped: Int?,
    val total: Int?
)

interface KnowledgeBaseSyncApi {
    @GET("api/sync/knowledge-base")
    suspend fun getKnowledgeBase(@Query("since") since: String? = null): KnowledgeBaseSyncResponse

    @POST("api/sync/analytics")
    suspend fun syncAnalytics(@Body body: Map<String, List<SearchEventDto>>): SyncAnalyticsResponse
}
