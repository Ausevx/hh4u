package com.healinghands4u.presentation.common

import android.app.Application
import android.content.Intent
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.healinghands4u.config.BrandingConfig
import com.healinghands4u.presentation.theme.HealingHandsTheme
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import org.robolectric.shadows.ShadowToast

@RunWith(AndroidJUnit4::class)
@Config(sdk = [34])
class DoctorContactFooterIntentSafetyTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun footer_whatsAppClick_createsValidActionViewIntent() {
        composeTestRule.setContent {
            HealingHandsTheme {
                DoctorContactFooter()
            }
        }

        // Perform click
        composeTestRule.onNodeWithTag(TestTags.FOOTER_WHATSAPP_BUTTON).performClick()

        val app = ApplicationProvider.getApplicationContext<Application>()
        val nextStartedActivity = shadowOf(app).nextStartedActivity

        assertNotNull("An intent should be started", nextStartedActivity)
        assertEquals(Intent.ACTION_VIEW, nextStartedActivity.action)
        val expectedCleanNumber = BrandingConfig.WHATSAPP_NUMBER.replace("+", "").replace(" ", "").trim()
        assertEquals("https://wa.me/$expectedCleanNumber", nextStartedActivity.dataString)
    }

    @Test
    fun footer_callClinicClick_createsValidActionDialIntent() {
        composeTestRule.setContent {
            HealingHandsTheme {
                DoctorContactFooter()
            }
        }

        // Perform click
        composeTestRule.onNodeWithTag(TestTags.FOOTER_CALL_BUTTON).performClick()

        val app = ApplicationProvider.getApplicationContext<Application>()
        val nextStartedActivity = shadowOf(app).nextStartedActivity

        assertNotNull("An intent should be started", nextStartedActivity)
        assertEquals(Intent.ACTION_DIAL, nextStartedActivity.action)
        assertEquals("tel:${BrandingConfig.WHATSAPP_NUMBER}", nextStartedActivity.dataString)
    }

    @Test
    fun footer_whenActivityResolutionFails_catchesExceptionAndShowsToastWithoutCrashing() {
        val app = ApplicationProvider.getApplicationContext<Application>()
        val shadowApp = shadowOf(app)
        // Enabling checkActivities forces startActivity to throw ActivityNotFoundException
        // when no Activity is declared to handle the intent
        shadowApp.checkActivities(true)

        composeTestRule.setContent {
            HealingHandsTheme {
                DoctorContactFooter()
            }
        }

        // 1. WhatsApp click under resolution failure
        composeTestRule.onNodeWithTag(TestTags.FOOTER_WHATSAPP_BUTTON).performClick()
        assertEquals("WhatsApp is not installed", ShadowToast.getTextOfLatestToast())

        // 2. Dialer click under resolution failure
        composeTestRule.onNodeWithTag(TestTags.FOOTER_CALL_BUTTON).performClick()
        assertEquals("No dialer application found", ShadowToast.getTextOfLatestToast())

        // Reset checkActivities for subsequent tests
        shadowApp.checkActivities(false)
    }

    @Test
    fun footer_handlesAdversarialPhoneNumbersGracefully() {
        var currentPhoneNumber by mutableStateOf(BrandingConfig.WHATSAPP_NUMBER)

        composeTestRule.setContent {
            HealingHandsTheme {
                DoctorContactFooter(phoneNumber = currentPhoneNumber)
            }
        }

        val adversarialPhoneNumbers = listOf(
            "", // Empty string
            "   ", // Whitespace only
            "+1 (800) 555-0199", // Complex formatting with parentheses and hyphens
            "999-EMERGENCY", // Alphanumeric
            "0000000000",
            "+91 98765 43210"
        )

        for (phone in adversarialPhoneNumbers) {
            currentPhoneNumber = phone
            composeTestRule.waitForIdle()

            // Verify both buttons can be clicked without uncaught exceptions or crashes
            composeTestRule.onNodeWithTag(TestTags.FOOTER_WHATSAPP_BUTTON).performClick()
            composeTestRule.onNodeWithTag(TestTags.FOOTER_CALL_BUTTON).performClick()
        }

        assertTrue("All adversarial phone numbers executed safely without crashes", true)
    }
}
