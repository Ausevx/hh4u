package com.healinghands4u.auth

import android.util.Log
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.tasks.await

private const val TAG = "FirebaseAuthManager"

@Singleton
class FirebaseAuthManager @Inject constructor() {
    private val auth: FirebaseAuth?
        get() = try {
            FirebaseAuth.getInstance()
        } catch (e: Throwable) {
            Log.w(TAG, "FirebaseAuth is unavailable or uninitialized: ${e.message}")
            null
        }

    fun isAvailable(): Boolean = auth != null

    fun getCurrentUser(): FirebaseUser? {
        return try {
            auth?.currentUser
        } catch (e: Throwable) {
            Log.w(TAG, "Failed to get current user: ${e.message}")
            null
        }
    }

    suspend fun signInWithEmailLink(email: String, emailLink: String): Boolean {
        return try {
            val authInstance = auth ?: return false
            authInstance.signInWithEmailLink(email, emailLink).await()
            true
        } catch (e: Throwable) {
            Log.e(TAG, "signInWithEmailLink failed: ${e.message}", e)
            false
        }
    }

    suspend fun signInAnonymously(): Boolean {
        return try {
            val authInstance = auth ?: return false
            authInstance.signInAnonymously().await()
            true
        } catch (e: Throwable) {
            Log.w(TAG, "signInAnonymously failed (falling back to local guest mode): ${e.message}")
            false
        }
    }

    fun signOut() {
        try {
            auth?.signOut()
        } catch (e: Throwable) {
            Log.e(TAG, "signOut failed: ${e.message}", e)
        }
    }
}

