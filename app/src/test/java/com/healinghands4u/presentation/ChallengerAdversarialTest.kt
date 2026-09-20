package com.healinghands4u.presentation

import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsOff
import androidx.compose.ui.test.assertIsOn
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performTextInput
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.healinghands4u.config.BrandingConfig
import com.healinghands4u.presentation.auth.LoginScreen
import com.healinghands4u.presentation.common.DoctorContactFooter
import com.healinghands4u.presentation.common.TestTags
import com.healinghands4u.presentation.diseaselist.DiseaseListScreen
import com.healinghands4u.presentation.planner.PlannerScreen
import com.healinghands4u.presentation.theme.HealingHandsTheme
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config

@RunWith(AndroidJUnit4::class)
@Config(sdk = [34], qualifiers = "w411dp-h891dp-xxhdpi")
class ChallengerAdversarialTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    // =========================================================================
    // SECTION 1: Login Screen Inputs & Button States (Edge Cases & Transitions)
    // =========================================================================

    @Test
    fun login_blankEmail_sendOtpDoesNotTriggerCallbackOrRevealOtpInput() {
        var otpRequestedCalled = false

        composeTestRule.setContent {
            HealingHandsTheme {
                LoginScreen(
                    onOtpRequested = { otpRequestedCalled = true }
                )
            }
        }

        // Leave email completely empty and click Send OTP
        composeTestRule.onNodeWithTag(TestTags.LOGIN_SEND_OTP_BUTTON).performClick()

        assertFalse("Send OTP with empty email must NOT invoke onOtpRequested", otpRequestedCalled)
        composeTestRule.onNodeWithTag(TestTags.LOGIN_OTP_INPUT).assertDoesNotExist()
        composeTestRule.onNodeWithTag(TestTags.LOGIN_VERIFY_OTP_BUTTON).assertDoesNotExist()

        // Enter only whitespace into email and click Send OTP
        composeTestRule.onNodeWithTag(TestTags.LOGIN_EMAIL_INPUT).performTextInput("   ")
        composeTestRule.onNodeWithTag(TestTags.LOGIN_SEND_OTP_BUTTON).performClick()

        assertFalse("Send OTP with whitespace email must NOT invoke onOtpRequested", otpRequestedCalled)
        composeTestRule.onNodeWithTag(TestTags.LOGIN_OTP_INPUT).assertDoesNotExist()
    }

    @Test
    fun login_resendOtp_stateTransitionAndMultipleRequests() {
        var requestedEmailHistory = mutableListOf<String>()

        composeTestRule.setContent {
            HealingHandsTheme {
                LoginScreen(
                    onOtpRequested = { requestedEmailHistory.add(it) }
                )
            }
        }

        // Initially button displays "Send OTP"
        composeTestRule.onNodeWithText("Send OTP").assertIsDisplayed()

        // Enter email and send OTP
        composeTestRule.onNodeWithTag(TestTags.LOGIN_EMAIL_INPUT).performTextInput("user@clinic.com")
        composeTestRule.onNodeWithTag(TestTags.LOGIN_SEND_OTP_BUTTON).performClick()

        assertEquals(1, requestedEmailHistory.size)
        assertEquals("user@clinic.com", requestedEmailHistory[0])

        // Button label transitions to "Resend OTP"
        composeTestRule.onNodeWithText("Resend OTP").assertIsDisplayed()

        // Clicking "Resend OTP" should invoke request again
        composeTestRule.onNodeWithTag(TestTags.LOGIN_SEND_OTP_BUTTON).performClick()
        assertEquals(2, requestedEmailHistory.size)
        assertEquals("user@clinic.com", requestedEmailHistory[1])
    }

    @Test
    fun login_blankOtp_verifyButtonClickDoesNotTriggerLogin() {
        var loginVerifiedCalled = false

        composeTestRule.setContent {
            HealingHandsTheme {
                LoginScreen(
                    onOtpVerified = { _, _ -> loginVerifiedCalled = true }
                )
            }
        }

        // Send OTP first to show OTP input
        composeTestRule.onNodeWithTag(TestTags.LOGIN_EMAIL_INPUT).performTextInput("patient@example.com")
        composeTestRule.onNodeWithTag(TestTags.LOGIN_SEND_OTP_BUTTON).performClick()

        // Click Verify button while OTP is blank
        composeTestRule.onNodeWithTag(TestTags.LOGIN_VERIFY_OTP_BUTTON).performScrollTo().performClick()
        assertFalse("Verify with empty OTP must NOT invoke onOtpVerified", loginVerifiedCalled)

        // Enter whitespace OTP
        composeTestRule.onNodeWithTag(TestTags.LOGIN_OTP_INPUT).performScrollTo().performTextInput("   ")
        composeTestRule.onNodeWithTag(TestTags.LOGIN_VERIFY_OTP_BUTTON).performScrollTo().performClick()
        assertFalse("Verify with whitespace OTP must NOT invoke onOtpVerified", loginVerifiedCalled)
    }

    @Test
    fun login_validOtp_verifyButtonTriggersCallbackWithExactArguments() {
        var verifiedEmail = ""
        var verifiedOtp = ""

        composeTestRule.setContent {
            HealingHandsTheme {
                LoginScreen(
                    onOtpVerified = { email, otp ->
                        verifiedEmail = email
                        verifiedOtp = otp
                    }
                )
            }
        }

        composeTestRule.onNodeWithTag(TestTags.LOGIN_EMAIL_INPUT).performTextInput("patient+test@example.org")
        composeTestRule.onNodeWithTag(TestTags.LOGIN_SEND_OTP_BUTTON).performClick()

        composeTestRule.onNodeWithTag(TestTags.LOGIN_OTP_INPUT).performScrollTo().performTextInput("987654")
        composeTestRule.onNodeWithTag(TestTags.LOGIN_VERIFY_OTP_BUTTON).performScrollTo().performClick()

        assertEquals("patient+test@example.org", verifiedEmail)
        assertEquals("987654", verifiedOtp)
    }

    @Test
    fun login_googleAndGuestButtons_triggerRespectiveCallbacks() {
        var googleClicked = false
        var guestClicked = false

        composeTestRule.setContent {
            HealingHandsTheme {
                LoginScreen(
                    onGoogleClick = { googleClicked = true },
                    onGuestClick = { guestClicked = true }
                )
            }
        }

        composeTestRule.onNodeWithTag(TestTags.LOGIN_GOOGLE_BUTTON).performScrollTo().performClick()
        assertTrue("Google button click should trigger callback", googleClicked)

        composeTestRule.onNodeWithTag(TestTags.LOGIN_GUEST_BUTTON).performScrollTo().performClick()
        assertTrue("Guest button click should trigger callback", guestClicked)
    }

    // =========================================================================
    // SECTION 2: Disease List Search Filtering & Category Chip Selection
    // =========================================================================

    @Test
    fun diseaseList_caseInsensitiveSearchMatching() {
        composeTestRule.setContent {
            HealingHandsTheme {
                DiseaseListScreen()
            }
        }

        // Search with uppercase query
        composeTestRule.onNodeWithTag(TestTags.DISEASE_SEARCH_INPUT).performTextInput("RHINITIS")
        composeTestRule.onNodeWithText("Allergic Rhinitis (Hay Fever)").assertIsDisplayed()
        composeTestRule.onNodeWithText("Acid Reflux & GERD").assertDoesNotExist()
    }

    @Test
    fun diseaseList_searchMatchesRemedyNameAndSymptoms() {
        composeTestRule.setContent {
            HealingHandsTheme {
                DiseaseListScreen()
            }
        }

        // Search by remedy: "Nux Vomica"
        composeTestRule.onNodeWithTag(TestTags.DISEASE_SEARCH_INPUT).performTextInput("Nux Vomica")
        composeTestRule.onNodeWithText("Acid Reflux & GERD").assertIsDisplayed()
        composeTestRule.onNodeWithText("Joint Pain & Osteoarthritis").assertDoesNotExist()

        // Clear and search by symptom: "stiffness"
        composeTestRule.onNodeWithContentDescription("Clear search").performClick()
        composeTestRule.onNodeWithTag(TestTags.DISEASE_SEARCH_INPUT).performTextInput("stiffness")
        composeTestRule.onNodeWithText("Joint Pain & Osteoarthritis").assertIsDisplayed()
        composeTestRule.onNodeWithText("Allergic Rhinitis (Hay Fever)").assertDoesNotExist()
    }

    @Test
    fun diseaseList_nonExistentQuery_displaysEmptyStateMessage() {
        composeTestRule.setContent {
            HealingHandsTheme {
                DiseaseListScreen()
            }
        }

        composeTestRule.onNodeWithTag(TestTags.DISEASE_SEARCH_INPUT).performTextInput("UnknownDiseaseTerm999")
        composeTestRule.onNodeWithText("No matching conditions found. Consult our AI Doctor or Dr. Anjali Jariwala directly.").assertIsDisplayed()

        // All common conditions should not exist in the filtered list
        composeTestRule.onNodeWithText("Allergic Rhinitis (Hay Fever)").assertDoesNotExist()
        composeTestRule.onNodeWithText("Acid Reflux & GERD").assertDoesNotExist()
        composeTestRule.onNodeWithText("Migraine & Tension Headache").assertDoesNotExist()
    }

    @Test
    fun diseaseList_categoryChipSelection_filtersAppropriateItems() {
        composeTestRule.setContent {
            HealingHandsTheme {
                DiseaseListScreen()
            }
        }

        // Click "Respiratory" chip using hasClickAction to disambiguate from card text
        composeTestRule.onNode(androidx.compose.ui.test.hasText("Respiratory") and androidx.compose.ui.test.hasClickAction()).performClick()
        composeTestRule.onNodeWithText("Allergic Rhinitis (Hay Fever)").assertIsDisplayed()
        composeTestRule.onNodeWithText("Acid Reflux & GERD").assertDoesNotExist()
        composeTestRule.onNodeWithText("Joint Pain & Osteoarthritis").assertDoesNotExist()

        // Click "Skin" chip
        composeTestRule.onNode(androidx.compose.ui.test.hasText("Skin") and androidx.compose.ui.test.hasClickAction()).performClick()
        composeTestRule.onNodeWithText("Eczema & Atopic Dermatitis").assertIsDisplayed()
        composeTestRule.onNodeWithText("Allergic Rhinitis (Hay Fever)").assertDoesNotExist()

        // Click "Joints" chip
        composeTestRule.onNode(androidx.compose.ui.test.hasText("Joints") and androidx.compose.ui.test.hasClickAction()).performClick()
        composeTestRule.onNodeWithText("Joint Pain & Osteoarthritis").assertIsDisplayed()

        // Click "All" chip to restore
        composeTestRule.onNode(androidx.compose.ui.test.hasText("All") and androidx.compose.ui.test.hasClickAction()).performClick()
        composeTestRule.onNodeWithText("Allergic Rhinitis (Hay Fever)").assertIsDisplayed()
        composeTestRule.onNodeWithText("Acid Reflux & GERD").performScrollTo().assertIsDisplayed()
    }

    @Test
    fun diseaseList_categoryAndSearchQuery_combinedConstraint() {
        composeTestRule.setContent {
            HealingHandsTheme {
                DiseaseListScreen()
            }
        }

        // Select "Stress & Sleep" chip
        composeTestRule.onNode(androidx.compose.ui.test.hasText("Stress & Sleep") and androidx.compose.ui.test.hasClickAction()).performClick()
        composeTestRule.onNodeWithText("Migraine & Tension Headache").assertIsDisplayed()
        composeTestRule.onNodeWithText("Insomnia & Restlessness").performScrollTo().assertIsDisplayed()

        // Add search query "Restlessness"
        composeTestRule.onNodeWithTag(TestTags.DISEASE_SEARCH_INPUT).performTextInput("Restlessness")
        composeTestRule.onNodeWithText("Insomnia & Restlessness").assertIsDisplayed()
        composeTestRule.onNodeWithText("Migraine & Tension Headache").assertDoesNotExist()

        // Add mismatching search query "Heartburn" while in "Stress & Sleep"
        composeTestRule.onNodeWithContentDescription("Clear search").performClick()
        composeTestRule.onNodeWithTag(TestTags.DISEASE_SEARCH_INPUT).performTextInput("Heartburn")
        composeTestRule.onNodeWithText("No matching conditions found. Consult our AI Doctor or Dr. Anjali Jariwala directly.").assertIsDisplayed()
    }

    // =========================================================================
    // SECTION 3: Planner Dosage Cards & Checkbox State Toggles
    // =========================================================================

    @Test
    fun planner_checkboxStates_toggleIndependently() {
        composeTestRule.setContent {
            HealingHandsTheme {
                PlannerScreen()
            }
        }

        // Verify schedule card remedy details
        composeTestRule.onNodeWithText("Arnica Montana 30C").assertIsDisplayed()
        composeTestRule.onNodeWithText("4 pills, dissolve under tongue").assertIsDisplayed()

        composeTestRule.onNodeWithText("Nux Vomica 200C").performScrollTo().assertIsDisplayed()
        composeTestRule.onNodeWithText("Take 30 mins after meal with sips of water").assertIsDisplayed()

        composeTestRule.onNodeWithText("Passiflora Incarnata Mother Tincture (Q)").performScrollTo().assertIsDisplayed()
        composeTestRule.onNodeWithText("10 drops in 1/4 cup warm water").assertIsDisplayed()

        // Initial state: all checkboxes are OFF
        composeTestRule.onNodeWithText("Arnica Montana 30C").performScrollTo()
        composeTestRule.onAllNodes(androidx.compose.ui.test.isToggleable()).assertCountEquals(3)

        val toggleables = composeTestRule.onAllNodes(androidx.compose.ui.test.isToggleable())
        toggleables[0].assertIsOff()
        toggleables[1].assertIsOff()
        toggleables[2].assertIsOff()

        // Toggle 1st (Morning) -> ON
        toggleables[0].performClick()
        toggleables[0].assertIsOn()
        toggleables[1].assertIsOff()
        toggleables[2].assertIsOff()

        // Toggle 2nd (Afternoon) -> ON
        toggleables[1].performClick()
        toggleables[0].assertIsOn()
        toggleables[1].assertIsOn()
        toggleables[2].assertIsOff()

        // Toggle 1st (Morning) -> OFF
        toggleables[0].performClick()
        toggleables[0].assertIsOff()
        toggleables[1].assertIsOn()
        toggleables[2].assertIsOff()

        // Toggle 3rd (Night) -> ON
        toggleables[2].performClick()
        toggleables[0].assertIsOff()
        toggleables[1].assertIsOn()
        toggleables[2].assertIsOn()
    }

    @Test
    fun planner_dietaryPrecautions_cardRendersAllKeyRestrictions() {
        composeTestRule.setContent {
            HealingHandsTheme {
                PlannerScreen()
            }
        }

        composeTestRule.onNodeWithTag(TestTags.PLANNER_DIETARY_CARD).performScrollTo().assertIsDisplayed()
        composeTestRule.onNodeWithText("Homeopathic Dietary Precautions").assertIsDisplayed()
        // Confirm specific clinical guidance items are present
        composeTestRule.onNodeWithText(
            "• Avoid raw onion, garlic, and menthol 30 mins before and after remedy doses.\n" +
            "• Refrain from strong coffee or camphor-infused ointments during treatment.\n" +
            "• Keep remedies stored away from direct sunlight, heat, and strong odors.\n" +
            "• Dissolve pills sublingually without handling directly with fingers."
        ).assertIsDisplayed()
    }

    // =========================================================================
    // SECTION 4: Doctor Contact Footer Resilience & Action Triggers
    // =========================================================================

    @Test
    fun doctorContactFooter_actionButtonsClickWithoutCrashing() {
        composeTestRule.setContent {
            HealingHandsTheme {
                DoctorContactFooter()
            }
        }

        // WhatsApp and Call clinic buttons should be interactive and handle intents gracefully
        composeTestRule.onNodeWithTag(TestTags.FOOTER_WHATSAPP_BUTTON).performClick()
        composeTestRule.onNodeWithTag(TestTags.FOOTER_CALL_BUTTON).performClick()

        // Doctor details from BrandingConfig verified
        composeTestRule.onNodeWithText(BrandingConfig.DOCTOR_NAME).assertIsDisplayed()
        composeTestRule.onNodeWithText(BrandingConfig.DOCTOR_QUALIFICATIONS).assertIsDisplayed()
        composeTestRule.onNodeWithText(BrandingConfig.CLINIC_ADDRESS).assertIsDisplayed()
    }
}
