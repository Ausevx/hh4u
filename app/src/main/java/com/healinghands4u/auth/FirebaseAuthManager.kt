package com.healinghands4u.auth

import com.google.firebase.auth.FirebaseAuth
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.tasks.await

@Singleton
class FirebaseAuthManager @Inject constructor() {
    private val auth: FirebaseAuth by lazy { FirebaseAuth.getInstance() }

    fun getCurrentUser() = auth.currentUser

    suspend fun signInWithEmailLink(email: String, emailLink: String): Boolean {
        return try {
            auth.signInWithEmailLink(email, emailLink).await()
            true
        } catch (e: Exception) {
            false
        }
    }

    suspend fun signInAnonymously(): Boolean {
        return try {
            auth.signInAnonymously().await()
            true
        } catch (e: Exception) {
            false
        }
    }

    fun signOut() {
        auth.signOut()
    }
}
