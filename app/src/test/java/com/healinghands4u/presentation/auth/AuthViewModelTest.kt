package com.healinghands4u.presentation.auth

import androidx.test.ext.junit.runners.AndroidJUnit4
import com.healinghands4u.auth.FirebaseAuthManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config

@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(AndroidJUnit4::class)
@Config(sdk = [34])
class AuthViewModelTest {

    private val testDispatcher = StandardTestDispatcher()
    private lateinit var authManager: FirebaseAuthManager
    private lateinit var viewModel: AuthViewModel

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
        authManager = FirebaseAuthManager()
        // ViewModel instantiation must not throw even if Firebase is uninitialized
        viewModel = AuthViewModel(authManager)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun init_withUninitializedFirebase_doesNotCrashAndRemainsUnauthenticated() {
        assertFalse("Initial loginState should be false", viewModel.loginState.value)
        assertFalse("Initial isGuestMode should be false", viewModel.isGuestMode.value)
        assertNull("Initial errorMessage should be null", viewModel.errorMessage.value)
    }

    @Test
    fun loginAnonymously_gracefulFallbackToGuestMode() = runTest(testDispatcher) {
        viewModel.loginAnonymously()
        advanceUntilIdle()

        assertTrue("isGuestMode should be true after anonymous login", viewModel.isGuestMode.value)
        assertTrue("loginState should be true after anonymous login fallback", viewModel.loginState.value)
        assertNull("No error message should be displayed to guest user", viewModel.errorMessage.value)
    }

    @Test
    fun verifyOtp_setsLoginStateTrue() = runTest(testDispatcher) {
        viewModel.verifyOtp("test@example.com", "123456")
        advanceUntilIdle()

        assertTrue("loginState should be true after OTP verify", viewModel.loginState.value)
    }

    @Test
    fun clearError_resetsErrorMessage() {
        viewModel.clearError()
        assertNull(viewModel.errorMessage.value)
    }
}
