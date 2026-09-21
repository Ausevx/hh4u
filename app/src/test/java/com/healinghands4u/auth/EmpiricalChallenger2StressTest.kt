package com.healinghands4u.auth

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performTextInput
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.healinghands4u.HealingHandsApp
import com.healinghands4u.presentation.auth.AuthViewModel
import com.healinghands4u.presentation.auth.LoginScreen
import com.healinghands4u.presentation.common.TestTags
import com.healinghands4u.presentation.components.ProfileMenu
import com.healinghands4u.presentation.theme.HealingHandsTheme
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config
import java.util.concurrent.ConcurrentLinkedQueue
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger

/**
 * Empirical Challenger 2 Stress Test Suite for Milestone 1:
 * - App launch crash prevention and graceful fallback to Guest Mode
 * - Thread-safety and exception containment across FirebaseAuthManager
 * - Concurrent and repeated auth invocations
 * - Absence of unhandled exceptions leaking to the UI thread
 */
@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(AndroidJUnit4::class)
@Config(sdk = [34], qualifiers = "w411dp-h891dp-xxhdpi")
class EmpiricalChallenger2StressTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    private val testDispatcher = StandardTestDispatcher()
    private lateinit var authManager: FirebaseAuthManager
    private lateinit var viewModel: AuthViewModel

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
        authManager = FirebaseAuthManager()
        viewModel = AuthViewModel(authManager)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    // =========================================================================
    // 1. Thread Safety & Concurrent Invocation of FirebaseAuthManager
    // =========================================================================

    @Test
    fun uninitializedFirebase_concurrentGetCurrentUser_stressTest() {
        val threadCount = 30
        val iterationsPerThread = 50
        val latch = CountDownLatch(threadCount)
        val caughtExceptions = ConcurrentLinkedQueue<Throwable>()
        val nonNullReturns = AtomicInteger(0)

        for (i in 0 until threadCount) {
            Thread {
                try {
                    for (j in 0 until iterationsPerThread) {
                        val user = authManager.getCurrentUser()
                        if (user != null) {
                            nonNullReturns.incrementAndGet()
                        }
                    }
                } catch (t: Throwable) {
                    caughtExceptions.add(t)
                } finally {
                    latch.countDown()
                }
            }.start()
        }

        val completed = latch.await(10, TimeUnit.SECONDS)
        assertTrue("Concurrent getCurrentUser threads timed out", completed)
        assertTrue(
            "Exceptions escaped getCurrentUser: ${caughtExceptions.map { it.message }}",
            caughtExceptions.isEmpty()
        )
        assertEquals("Expected all 1500 calls to return null user", 0, nonNullReturns.get())
        assertFalse("isAvailable() must be false without Firebase", authManager.isAvailable())
    }

    @Test
    fun uninitializedFirebase_concurrentSignOut_stressTest() {
        val threadCount = 20
        val latch = CountDownLatch(threadCount)
        val caughtExceptions = ConcurrentLinkedQueue<Throwable>()

        for (i in 0 until threadCount) {
            Thread {
                try {
                    authManager.signOut()
                } catch (t: Throwable) {
                    caughtExceptions.add(t)
                } finally {
                    latch.countDown()
                }
            }.start()
        }

        val completed = latch.await(5, TimeUnit.SECONDS)
        assertTrue("Concurrent signOut threads timed out", completed)
        assertTrue(
            "Exceptions escaped signOut: ${caughtExceptions.map { it.message }}",
            caughtExceptions.isEmpty()
        )
    }

    @Test
    fun uninitializedFirebase_repeatedSignInAnonymously_returnsFalseDeterministically() = runTest {
        for (i in 1..20) {
            val result = authManager.signInAnonymously()
            assertFalse("Call $i: signInAnonymously must return false without Firebase", result)
        }
    }

    @Test
    fun uninitializedFirebase_signInWithEmailLink_adversarialInputs() = runTest {
        val adversarialInputs = listOf(
            "" to "",
            "   " to "   ",
            "not-an-email" to "not-a-link",
            "patient@example.com" to "",
            "" to "https://healinghands4u.firebaseapp.com/__/auth/action",
            "patient@example.com" to "https://malicious.example.com/login?token=fake",
            "x".repeat(5000) to "https://example.com/".padEnd(5000, 'a'),
            "<script>alert(1)</script>" to "javascript:void(0)",
            "admin' OR '1'='1" to "https://example.com"
        )

        for ((email, link) in adversarialInputs) {
            val result = authManager.signInWithEmailLink(email, link)
            assertFalse(
                "signInWithEmailLink must return false gracefully for email='$email'",
                result
            )
        }
    }

    // =========================================================================
    // 2. AuthViewModel State Transitions & Stress Invocations
    // =========================================================================

    @Test
    fun authViewModel_repeatedLoginAnonymously_maintainsCleanGuestState() = runTest(testDispatcher) {
        // Repeated calls must be idempotent and never leak exceptions
        for (i in 1..25) {
            viewModel.loginAnonymously()
        }
        advanceUntilIdle()

        assertTrue("loginState must be true after repeated guest logins", viewModel.loginState.value)
        assertTrue("isGuestMode must be true after repeated guest logins", viewModel.isGuestMode.value)
        assertNull("errorMessage must remain null for guest login fallback", viewModel.errorMessage.value)
    }

    @Test
    fun authViewModel_concurrentLoginAnonymously_threadSafeStateTransitions() = runTest(testDispatcher) {
        // Launch 30 concurrent coroutines invoking loginAnonymously
        val jobs = (1..30).map {
            launch {
                viewModel.loginAnonymously()
            }
        }
        advanceUntilIdle()

        jobs.forEach { assertTrue(it.isCompleted) }
        assertTrue("loginState must be true after concurrent guest logins", viewModel.loginState.value)
        assertTrue("isGuestMode must be true after concurrent guest logins", viewModel.isGuestMode.value)
        assertNull("No error should be emitted", viewModel.errorMessage.value)
    }

    @Test
    fun authViewModel_guestTransition_subsequentOtpCallPreservesLoginState() = runTest(testDispatcher) {
        // 1. Enter as guest
        viewModel.loginAnonymously()
        advanceUntilIdle()
        assertTrue(viewModel.loginState.value)
        assertTrue(viewModel.isGuestMode.value)

        // 2. Clear error if any
        viewModel.clearError()
        assertNull(viewModel.errorMessage.value)

        // 3. User later verifies OTP
        viewModel.verifyOtp("patient@example.com", "654321")
        advanceUntilIdle()
        assertTrue("loginState must remain true after OTP verification", viewModel.loginState.value)
    }

    // =========================================================================
    // 3. UI Thread Exception Containment (Compose Semantics)
    // =========================================================================

    @Test
    fun loginScreen_stressClickGuestButton_doesNotCrashUIThread() {
        var guestClickCount = 0

        composeTestRule.setContent {
            HealingHandsTheme {
                LoginScreen(
                    onGuestClick = { guestClickCount++ },
                    viewModel = viewModel
                )
            }
        }

        // Stress click the "Continue as Guest" button 10 times in rapid succession
        val guestButton = composeTestRule.onNodeWithTag(TestTags.LOGIN_GUEST_BUTTON)
        for (i in 1..10) {
            guestButton.performScrollTo().performClick()
            composeTestRule.waitForIdle()
        }

        assertEquals("onGuestClick callback should have been triggered 10 times", 10, guestClickCount)
    }

    @Test
    fun loginScreen_adversarialOtpInteractions_noExceptionLeakage() {
        var otpRequestedEmail = ""
        var verifiedOtpPair: Pair<String, String>? = null

        composeTestRule.setContent {
            HealingHandsTheme {
                LoginScreen(
                    onOtpRequested = { otpRequestedEmail = it },
                    onOtpVerified = { email, otp -> verifiedOtpPair = email to otp },
                    viewModel = viewModel
                )
            }
        }

        // Step 1: Input email
        val emailInput = composeTestRule.onNodeWithTag(TestTags.LOGIN_EMAIL_INPUT)
        emailInput.performTextInput("user@test.org")

        // Step 2: Request OTP
        val sendOtpButton = composeTestRule.onNodeWithTag(TestTags.LOGIN_SEND_OTP_BUTTON)
        sendOtpButton.performClick()
        composeTestRule.waitForIdle()

        assertEquals("user@test.org", otpRequestedEmail)

        // Step 3: Enter adversarial OTP
        val otpInput = composeTestRule.onNodeWithTag(TestTags.LOGIN_OTP_INPUT)
        otpInput.performScrollTo().performTextInput("999999")

        // Step 4: Click Verify
        val verifyButton = composeTestRule.onNodeWithTag(TestTags.LOGIN_VERIFY_OTP_BUTTON)
        verifyButton.performScrollTo().performClick()
        composeTestRule.waitForIdle()

        assertEquals("user@test.org" to "999999", verifiedOtpPair)
    }

    @Test
    fun profileMenu_multipleExpandDismissCycles_robustWithoutFirebase() {
        composeTestRule.setContent {
            HealingHandsTheme {
                ProfileMenu()
            }
        }

        val profileButton = composeTestRule.onNodeWithContentDescription("Profile")

        // Repeat 3 expand/dismiss cycles
        for (i in 1..3) {
            profileButton.performClick()
            composeTestRule.waitForIdle()

            // Verify "Logged in as Guest" is rendered cleanly
            composeTestRule.onNodeWithText("Logged in as Guest").assertIsDisplayed()

            // Dismiss by clicking the mode toggle or icon
            profileButton.performClick()
            composeTestRule.waitForIdle()
        }
    }

    // =========================================================================
    // 4. Application Lifecycle Resilience
    // =========================================================================

    @Test
    fun healingHandsApp_onCreate_handlesUninitializedFirebaseGracefully() {
        val app = ApplicationProvider.getApplicationContext<HealingHandsApp>()
        // app.onCreate() has already executed in Robolectric, verify it didn't throw
        assertNotNull("HealingHandsApp instance should not be null", app)
    }
}
