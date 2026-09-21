package com.healinghands4u

import android.app.Application
import android.util.Log
import com.google.firebase.FirebaseApp
import dagger.hilt.android.HiltAndroidApp

private const val TAG = "HealingHandsApp"

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
    }
}

