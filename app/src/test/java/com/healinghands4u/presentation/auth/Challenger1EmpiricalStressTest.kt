package com.healinghands4u.presentation.auth

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.healinghands4u.HealingHandsApp
import com.healinghands4u.auth.FirebaseAuthManager
import com.healinghands4u.presentation.common.TestTags
import com.healinghands4u.presentation.components.ProfileMenu
import com.healinghands4u.presentation.navigation.AppNavHost
import com.healinghands4u.presentation.theme.HealingHandsTheme
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config

@RunWith(AndroidJUnit4::class)
@Config(sdk = [34], qualifiers = "w411dp-h891dp-xxhdpi")
class Challenger1EmpiricalStressTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    // -------------------------------------------------------------------------
    // 1. Stress: Application Startup & FirebaseApp Initialization
    // -------------------------------------------------------------------------
    @Test
    fun application_onCreate_doesNotCrashWithoutFirebaseConfig() {
        val app = ApplicationProvider.getApplicationContext<HealingHandsApp>()
        assertNotNull("Application context should be non-null", app)
        // Invoking onCreate explicitly must not throw even if google-services.json is absent
        app.onCreate()
    }

    // -------------------------------------------------------------------------
    // 2. Stress: FirebaseAuthManager Concurrent Invocations
    // -------------------------------------------------------------------------
    @Test
    fun stress_firebaseAuthManager_concurrentInvocations_neverThrows() = runBlocking {
        val authManager = FirebaseAuthManager()
        assertFalse("Auth should be unavailable", authManager.isAvailable())
        assertNull("Current user must be null", authManager.getCurrentUser())

        // Launch 50 concurrent operations across dispatchers
        val deferreds = (1..50).map { i ->
            async(Dispatchers.Default) {
                when (i % 5) {
                    0 -> authManager.getCurrentUser()
                    1 -> authManager.isAvailable()
                    2 -> authManager.signInAnonymously()
                    3 -> authManager.signInWithEmailLink("patient$i@example.com", "https://example.com/link")
                    else -> authManager.signOut()
                }
            }
        }
        val results = deferreds.awaitAll()
        assertEquals("All 50 operations should complete", 50, results.size)
    }

    // -------------------------------------------------------------------------
    // 3. Stress: AuthViewModel Multiple Guest Logins
    // -------------------------------------------------------------------------
    @Test
    fun stress_authViewModel_rapidGuestLogins_maintainsStableGuestState() = runBlocking {
        val authManager = FirebaseAuthManager()
        val viewModel = AuthViewModel(authManager)

        assertFalse("Initial loginState should be false", viewModel.loginState.value)
        assertFalse("Initial isGuestMode should be false", viewModel.isGuestMode.value)

        // Multiple rapid loginAnonymously calls
        repeat(10) {
            viewModel.loginAnonymously()
        }

        assertTrue("loginState should be true", viewModel.loginState.value)
        assertTrue("isGuestMode should be true", viewModel.isGuestMode.value)
        assertNull("errorMessage must be null in guest mode", viewModel.errorMessage.value)
    }

    // -------------------------------------------------------------------------
    // 4. Stress: ProfileMenu Repeated Composition & Interaction
    // -------------------------------------------------------------------------
    @Test
    fun stress_profileMenu_multipleToggles_displaysGuestLabelCleanly() {
        composeTestRule.setContent {
            HealingHandsTheme {
                ProfileMenu()
            }
        }

        // Click to open dropdown
        composeTestRule.onNodeWithContentDescription("Profile").assertIsDisplayed().performClick()
        composeTestRule.onNodeWithText("Logged in as Guest").assertIsDisplayed()

        // Dismiss dropdown
        composeTestRule.onNodeWithText("Logged in as Guest").performClick()
    }

    // -------------------------------------------------------------------------
    // 5. End-to-End: Login Screen -> "Continue as Guest" -> Chatbot Screen Flow
    // -------------------------------------------------------------------------
    @Test
    fun e2e_loginToChatbotQueryScreen_viaGuestMode_functionsWithoutCrash() {
        composeTestRule.setContent {
            HealingHandsTheme {
                AppNavHost()
            }
        }

        // 1. Assert we start on the Login screen
        composeTestRule.onNodeWithTag(TestTags.LOGIN_HEADER).assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.LOGIN_GUEST_BUTTON).assertExists()

        // 2. Click "Continue as Guest"
        composeTestRule.onNodeWithTag(TestTags.LOGIN_GUEST_BUTTON).performScrollTo().performClick()

        // 3. Verify Login screen is removed from composition
        composeTestRule.onNodeWithTag(TestTags.LOGIN_HEADER).assertDoesNotExist()

        // 4. Verify ChatbotQueryScreen is now displayed
        composeTestRule.onNodeWithText("Chat with Dr. AI").assertIsDisplayed()
        composeTestRule.onNodeWithText("How can we help you today?").assertIsDisplayed()

        // 5. Verify Profile Menu inside ChatHeader displays "Logged in as Guest"
        composeTestRule.onNodeWithContentDescription("Profile").assertIsDisplayed().performClick()
        composeTestRule.onNodeWithText("Logged in as Guest").assertIsDisplayed()
    }
}
