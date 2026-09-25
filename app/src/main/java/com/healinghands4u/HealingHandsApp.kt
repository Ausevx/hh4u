package com.healinghands4u

import android.app.Application
import android.util.Log
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.healinghands4u.data.repository.AnalyticsSyncWorker
import dagger.hilt.android.HiltAndroidApp
import java.util.concurrent.TimeUnit

private const val TAG = "HealingHandsApp"
private const val SYNC_WORK_NAME = "hh4u_analytics_sync"

@HiltAndroidApp
class HealingHandsApp : Application(), androidx.work.Configuration.Provider {
    @javax.inject.Inject lateinit var workerFactory: androidx.hilt.work.HiltWorkerFactory
    override val workManagerConfiguration: androidx.work.Configuration
        get() = androidx.work.Configuration.Builder().setWorkerFactory(workerFactory).build()
    override fun onCreate() {
        super.onCreate()
        // Schedule periodic background sync (analytics flush + KB re-sync)
        schedulePeriodicSync()
    }

    private fun schedulePeriodicSync() {
        try {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val syncRequest = PeriodicWorkRequestBuilder<AnalyticsSyncWorker>(
                15, TimeUnit.MINUTES
            ).setConstraints(constraints)
                .build()

            WorkManager.getInstance(this).enqueueUniquePeriodicWork(
                SYNC_WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                syncRequest
            )

            WorkManager.getInstance(this).enqueueUniqueWork(
                "hh4u_initial_sync", androidx.work.ExistingWorkPolicy.KEEP,
                androidx.work.OneTimeWorkRequestBuilder<AnalyticsSyncWorker>()
                    .setConstraints(constraints).build()
            )
            Log.i(TAG, "Periodic analytics sync worker scheduled")
        } catch (e: Throwable) {
            Log.w(TAG, "Failed to schedule sync worker: ${e.message}")
        }
    }
}
