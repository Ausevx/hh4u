package com.healinghands4u

import android.app.Application
import android.util.Log
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.google.firebase.FirebaseApp
import com.healinghands4u.data.repository.AnalyticsSyncWorker
import dagger.hilt.android.HiltAndroidApp
import java.util.concurrent.TimeUnit

private const val TAG = "HealingHandsApp"
private const val SYNC_WORK_NAME = "hh4u_analytics_sync"

@HiltAndroidApp
class HealingHandsApp : Application() {
    override fun onCreate() {
        super.onCreate()
        try {
            FirebaseApp.initializeApp(this)
            Log.i(TAG, "FirebaseApp initialized successfully.")
        } catch (e: Throwable) {
            Log.w(TAG, "FirebaseApp initialization skipped or failed: ${e.message}")
        }

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

            Log.i(TAG, "Periodic analytics sync worker scheduled")
        } catch (e: Throwable) {
            Log.w(TAG, "Failed to schedule sync worker: ${e.message}")
        }
    }
}
