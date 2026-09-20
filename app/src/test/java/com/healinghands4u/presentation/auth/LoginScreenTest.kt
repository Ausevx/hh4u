package com.healinghands4u.presentation.auth

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performTextInput
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.healinghands4u.config.BrandingConfig
import com.healinghands4u.presentation.common.TestTags
import com.healinghands4u.presentation.theme.HealingHandsTheme
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config

@RunWith(AndroidJUnit4::class)
@Config(sdk = [34], qualifiers = "w411dp-h891dp-xxhdpi")
class LoginScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun loginScreen_rendersHeaderAndBranding() {
        composeTestRule.setContent {
            HealingHandsTheme {
                LoginScreen()
            }
        }

        composeTestRule.onNodeWithTag(TestTags.LOGIN_HEADER).assertIsDisplayed()
        composeTestRule.onNodeWithText(BrandingConfig.APP_NAME).assertIsDisplayed()
        composeTestRule.onNodeWithText("Holistic Homeopathic Healing & Care").assertIsDisplayed()
    }

    @Test
    fun loginScreen_rendersAllThreeAuthOptions() {
        composeTestRule.setContent {
            HealingHandsTheme {
                LoginScreen()
            }
        }

        // 1. Email OTP Option
        composeTestRule.onNodeWithTag(TestTags.AUTH_OPTION_OTP).assertExists()
        composeTestRule.onNodeWithTag(TestTags.LOGIN_EMAIL_INPUT).assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.LOGIN_SEND_OTP_BUTTON).assertIsDisplayed()

        // 2. Google Sign-In Option
        composeTestRule.onNodeWithTag(TestTags.AUTH_OPTION_GOOGLE).assertExists()
        composeTestRule.onNodeWithTag(TestTags.LOGIN_GOOGLE_BUTTON).performScrollTo().assertIsDisplayed()

        // 3. Guest Option
        composeTestRule.onNodeWithTag(TestTags.AUTH_OPTION_GUEST).assertExists()
        composeTestRule.onNodeWithTag(TestTags.LOGIN_GUEST_BUTTON).performScrollTo().assertIsDisplayed()
    }

    @Test
    fun loginScreen_guestButtonClick_invokesCallback() {
        var guestClicked = false

        composeTestRule.setContent {
            HealingHandsTheme {
                LoginScreen(
                    onGuestClick = { guestClicked = true }
                )
            }
        }

        composeTestRule.onNodeWithTag(TestTags.LOGIN_GUEST_BUTTON).performScrollTo().performClick()
        assertTrue("Guest button should trigger callback", guestClicked)
    }

    @Test
    fun loginScreen_sendOtp_revealsOtpInputAndVerifyButton() {
        var requestedEmail = ""

        composeTestRule.setContent {
            HealingHandsTheme {
                LoginScreen(
                    onOtpRequested = { requestedEmail = it }
                )
            }
        }

        composeTestRule.onNodeWithTag(TestTags.LOGIN_EMAIL_INPUT).performTextInput("patient@example.com")
        composeTestRule.onNodeWithTag(TestTags.LOGIN_SEND_OTP_BUTTON).performClick()

        assertTrue("Requested email should match input", requestedEmail == "patient@example.com")
        composeTestRule.onNodeWithTag(TestTags.LOGIN_OTP_INPUT).performScrollTo().assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.LOGIN_VERIFY_OTP_BUTTON).performScrollTo().assertIsDisplayed()
    }
}
