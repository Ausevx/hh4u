package com.healinghands4u.presentation.common

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.healinghands4u.config.BrandingConfig
import com.healinghands4u.presentation.theme.HealingHandsTheme
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config

@RunWith(AndroidJUnit4::class)
@Config(sdk = [34])
class DoctorContactFooterTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun doctorContactFooter_rendersDoctorBrandingAndContactActions() {
        composeTestRule.setContent {
            HealingHandsTheme {
                DoctorContactFooter()
            }
        }

        // Verify Doctor Name & Qualifications
        composeTestRule.onNodeWithTag(TestTags.FOOTER_DOCTOR_NAME).assertIsDisplayed()
        composeTestRule.onNodeWithText(BrandingConfig.DOCTOR_NAME).assertIsDisplayed()

        composeTestRule.onNodeWithTag(TestTags.FOOTER_QUALIFICATIONS).assertIsDisplayed()
        composeTestRule.onNodeWithText(BrandingConfig.DOCTOR_QUALIFICATIONS).assertIsDisplayed()

        // Verify Clinic Address
        composeTestRule.onNodeWithTag(TestTags.FOOTER_CLINIC_ADDRESS).assertIsDisplayed()
        composeTestRule.onNodeWithText(BrandingConfig.CLINIC_ADDRESS).assertIsDisplayed()

        // Verify Action Buttons
        composeTestRule.onNodeWithTag(TestTags.FOOTER_WHATSAPP_BUTTON).assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.FOOTER_CALL_BUTTON).assertIsDisplayed()
    }
}
