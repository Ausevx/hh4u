package com.healinghands4u.presentation.navigation

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performTextInput
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.healinghands4u.presentation.common.TestTags
import com.healinghands4u.presentation.theme.HealingHandsTheme
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config

@RunWith(AndroidJUnit4::class)
@Config(sdk = [34], qualifiers = "w411dp-h891dp-xxhdpi")
class AppNavHostTransitionTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun appNavHost_startsAtLoginScreen() {
        composeTestRule.setContent {
            HealingHandsTheme {
                AppNavHost()
            }
        }

        // Login screen elements should be displayed
        composeTestRule.onNodeWithTag(TestTags.LOGIN_HEADER).assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.AUTH_OPTION_OTP).assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.AUTH_OPTION_GOOGLE).assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.AUTH_OPTION_GUEST).assertIsDisplayed()

        // Home screen should not be present initially
        composeTestRule.onNodeWithTag(TestTags.HOME_WELCOME_BANNER).assertDoesNotExist()
    }

    @Test
    fun appNavHost_guestLogin_navigatesToHomeAndPopsLogin() {
        composeTestRule.setContent {
            HealingHandsTheme {
                AppNavHost()
            }
        }

        // Click guest button
        composeTestRule.onNodeWithTag(TestTags.LOGIN_GUEST_BUTTON).performScrollTo().performClick()

        // Home dashboard should now be displayed
        composeTestRule.onNodeWithTag(TestTags.HOME_WELCOME_BANNER).assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.HOME_CARD_AI_CONSULT).assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.HOME_CARD_PLANNER).performScrollTo().assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.HOME_CARD_DISEASE_LIST).performScrollTo().assertIsDisplayed()

        // Login screen should have been popped from backstack
        composeTestRule.onNodeWithTag(TestTags.LOGIN_HEADER).assertDoesNotExist()
    }

    @Test
    fun appNavHost_emailOtpLogin_navigatesToHomeAndPopsLogin() {
        composeTestRule.setContent {
            HealingHandsTheme {
                AppNavHost()
            }
        }

        // Enter email and request OTP
        composeTestRule.onNodeWithTag(TestTags.LOGIN_EMAIL_INPUT).performTextInput("patient@example.com")
        composeTestRule.onNodeWithTag(TestTags.LOGIN_SEND_OTP_BUTTON).performClick()

        // Enter OTP and click Verify & Sign In
        composeTestRule.onNodeWithTag(TestTags.LOGIN_OTP_INPUT).performScrollTo().performTextInput("123456")
        composeTestRule.onNodeWithTag(TestTags.LOGIN_VERIFY_OTP_BUTTON).performScrollTo().performClick()

        // Home screen should now be displayed
        composeTestRule.onNodeWithTag(TestTags.HOME_WELCOME_BANNER).assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.LOGIN_HEADER).assertDoesNotExist()
    }

    @Test
    fun appNavHost_homeToPlanner_andBackToHome() {
        composeTestRule.setContent {
            HealingHandsTheme {
                AppNavHost(startDestination = Screen.Home.route)
            }
        }

        // Verify starting on Home
        composeTestRule.onNodeWithTag(TestTags.HOME_WELCOME_BANNER).assertIsDisplayed()

        // Navigate to Planner
        composeTestRule.onNodeWithTag(TestTags.HOME_CARD_PLANNER).performScrollTo().performClick()

        // Verify on Planner screen
        composeTestRule.onNodeWithTag(TestTags.PLANNER_TITLE).assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.PLANNER_SCHEDULE_SECTION).assertIsDisplayed()

        // Click Back button
        composeTestRule.onNodeWithTag(TestTags.PLANNER_BACK_BUTTON).performClick()

        // Verify back on Home screen
        composeTestRule.onNodeWithTag(TestTags.HOME_WELCOME_BANNER).assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.PLANNER_TITLE).assertDoesNotExist()
    }

    @Test
    fun appNavHost_homeToDiseaseList_andBackToHome() {
        composeTestRule.setContent {
            HealingHandsTheme {
                AppNavHost(startDestination = Screen.Home.route)
            }
        }

        // Verify starting on Home
        composeTestRule.onNodeWithTag(TestTags.HOME_WELCOME_BANNER).assertIsDisplayed()

        // Navigate to Disease List
        composeTestRule.onNodeWithTag(TestTags.HOME_CARD_DISEASE_LIST).performScrollTo().performClick()

        // Verify on Disease List screen
        composeTestRule.onNodeWithTag(TestTags.DISEASE_LIST_TITLE).assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.DISEASE_SEARCH_INPUT).assertIsDisplayed()

        // Click Back button
        composeTestRule.onNodeWithTag(TestTags.DISEASE_LIST_BACK_BUTTON).performClick()

        // Verify back on Home screen
        composeTestRule.onNodeWithTag(TestTags.HOME_WELCOME_BANNER).assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.DISEASE_LIST_TITLE).assertDoesNotExist()
    }
}
