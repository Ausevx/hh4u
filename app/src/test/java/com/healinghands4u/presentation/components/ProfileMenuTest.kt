package com.healinghands4u.presentation.components

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.healinghands4u.presentation.theme.HealingHandsTheme
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config

@RunWith(AndroidJUnit4::class)
@Config(sdk = [34], qualifiers = "w411dp-h891dp-xxhdpi")
class ProfileMenuTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun profileMenu_withUninitializedFirebase_rendersAndDisplaysGuestMode() {
        composeTestRule.setContent {
            HealingHandsTheme {
                ProfileMenu()
            }
        }

        // Click the Profile icon
        composeTestRule.onNodeWithContentDescription("Profile").assertIsDisplayed().performClick()

        // Verify dropdown displays "Logged in as Guest"
        composeTestRule.onNodeWithText("Logged in as Guest").assertIsDisplayed()
    }
}
