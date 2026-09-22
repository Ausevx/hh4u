package com.healinghands4u.data.repository

import android.content.Context
import android.util.Log
import androidx.hilt.work.HiltWorker
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject

private const val TAG = "AnalyticsSyncWorker"

@HiltWorker
class AnalyticsSyncWorker @AssistedInject constructor(
    @Assisted appContext: Context,
    @Assisted workerParams: WorkerParameters,
    private val offlineSearchRepository: OfflineSearchRepository
) : CoroutineWorker(appContext, workerParams) {

    override suspend fun doWork(): Result {
        return try {
            // 1. Flush pending analytics events to the backend
            val analyticsSuccess = offlineSearchRepository.flushAnalytics()
            if (!analyticsSuccess) {
                Log.w(TAG, "Analytics flush returned false, will retry")
            }

            // 2. Re-sync the knowledge base if stale (older than 24 hours)
            if (offlineSearchRepository.isKnowledgeBaseStale()) {
                Log.i(TAG, "Knowledge base is stale, triggering sync")
                offlineSearchRepository.syncKnowledgeBase()
            }

            Result.success()
        } catch (e: Exception) {
            Log.e(TAG, "Worker failed: ${e.message}", e)
            Result.retry()
        }
    }
}
