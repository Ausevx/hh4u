package com.healinghands4u.presentation.planner

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.healinghands4u.presentation.common.TestTags
import com.healinghands4u.presentation.theme.HealingHandsTheme
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config

@RunWith(AndroidJUnit4::class)
@Config(sdk = [34], qualifiers = "w411dp-h891dp-xxhdpi")
class PlannerScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun plannerScreen_rendersTitleAndBackNavigation() {
        var backClicked = false

        composeTestRule.setContent {
            HealingHandsTheme {
                PlannerScreen(onBackClick = { backClicked = true })
            }
        }

        composeTestRule.onNodeWithTag(TestTags.PLANNER_TITLE).assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.PLANNER_BACK_BUTTON).assertIsDisplayed()

        composeTestRule.onNodeWithTag(TestTags.PLANNER_BACK_BUTTON).performClick()
        assertTrue("Back button click should invoke callback", backClicked)
    }

    @Test
    fun plannerScreen_rendersScheduleAndDietaryGuidelines() {
        composeTestRule.setContent {
            HealingHandsTheme {
                PlannerScreen()
            }
        }

        composeTestRule.onNodeWithTag(TestTags.PLANNER_SCHEDULE_SECTION).assertIsDisplayed()
        composeTestRule.onNodeWithText("Arnica Montana 30C").assertIsDisplayed()
        composeTestRule.onNodeWithText("Nux Vomica 200C").performScrollTo().assertIsDisplayed()
        composeTestRule.onNodeWithText("Passiflora Incarnata Mother Tincture (Q)").performScrollTo().assertIsDisplayed()

        composeTestRule.onNodeWithTag(TestTags.PLANNER_DIETARY_CARD).performScrollTo().assertIsDisplayed()
        composeTestRule.onNodeWithText("Homeopathic Dietary Precautions").assertIsDisplayed()
    }
}
