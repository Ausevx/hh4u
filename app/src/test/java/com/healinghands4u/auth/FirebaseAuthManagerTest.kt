package com.healinghands4u.auth

import androidx.test.ext.junit.runners.AndroidJUnit4
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config

@RunWith(AndroidJUnit4::class)
@Config(sdk = [34])
class FirebaseAuthManagerTest {

    private val authManager = FirebaseAuthManager()

    @Test
    fun uninitializedFirebase_getCurrentUser_returnsNullWithoutCrashing() {
        // Without FirebaseApp initialized, getCurrentUser should safely return null
        val user = authManager.getCurrentUser()
        assertNull("Expected null user when Firebase is uninitialized", user)
    }

    @Test
    fun uninitializedFirebase_isAvailable_returnsFalse() {
        val available = authManager.isAvailable()
        assertFalse("Expected isAvailable to be false when Firebase is uninitialized", available)
    }

    @Test
    fun uninitializedFirebase_signInAnonymously_returnsFalseWithoutCrashing() = runTest {
        val result = authManager.signInAnonymously()
        assertFalse("Expected signInAnonymously to return false gracefully", result)
    }

    @Test
    fun uninitializedFirebase_signInWithEmailLink_returnsFalseWithoutCrashing() = runTest {
        val result = authManager.signInWithEmailLink("test@example.com", "https://example.com")
        assertFalse("Expected signInWithEmailLink to return false gracefully", result)
    }

    @Test
    fun uninitializedFirebase_signOut_doesNotThrow() {
        // Should execute safely without uncaught exception
        authManager.signOut()
    }
}
