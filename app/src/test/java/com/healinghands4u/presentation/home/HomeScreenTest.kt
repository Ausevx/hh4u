package com.healinghands4u.presentation.home

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
class HomeScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun homeScreen_rendersWelcomeBanner() {
        composeTestRule.setContent {
            HealingHandsTheme {
                HomeScreen(viewModel = HomeViewModel())
            }
        }

        composeTestRule.onNodeWithTag(TestTags.HOME_WELCOME_BANNER).assertIsDisplayed()
        composeTestRule.onNodeWithText("Welcome to Healing Hands4U").assertIsDisplayed()
    }

    @Test
    fun homeScreen_rendersThreeMainNavigationCards() {
        composeTestRule.setContent {
            HealingHandsTheme {
                HomeScreen(viewModel = HomeViewModel())
            }
        }

        // Card 1: AI Homeopathic Consultation
        composeTestRule.onNodeWithTag(TestTags.HOME_CARD_AI_CONSULT).assertIsDisplayed()
        composeTestRule.onNodeWithText("AI Homeopathic Consultation").assertIsDisplayed()

        // Card 2: Personalized Health Planner
        composeTestRule.onNodeWithTag(TestTags.HOME_CARD_PLANNER).performScrollTo().assertIsDisplayed()
        composeTestRule.onNodeWithText("Personalized Health Planner").assertIsDisplayed()

        // Card 3: Disease Directory & Remedy Guide
        composeTestRule.onNodeWithTag(TestTags.HOME_CARD_DISEASE_LIST).performScrollTo().assertIsDisplayed()
        composeTestRule.onNodeWithText("Disease Directory & Remedy Guide").assertIsDisplayed()
    }

    @Test
    fun homeScreen_rendersEmbeddedDoctorContactFooter() {
        composeTestRule.setContent {
            HealingHandsTheme {
                HomeScreen(viewModel = HomeViewModel())
            }
        }

        composeTestRule.onNodeWithTag(TestTags.HOME_DOCTOR_FOOTER).performScrollTo().assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.FOOTER_DOCTOR_NAME).assertIsDisplayed()
    }

    @Test
    fun homeScreen_cardClicks_invokeCorrectCallbacks() {
        var consultClicked = false
        var plannerClicked = false
        var diseaseListClicked = false

        composeTestRule.setContent {
            HealingHandsTheme {
                HomeScreen(
                    viewModel = HomeViewModel(),
                    onConsultationClick = { consultClicked = true },
                    onPlannerClick = { plannerClicked = true },
                    onDiseaseListClick = { diseaseListClicked = true }
                )
            }
        }

        composeTestRule.onNodeWithTag(TestTags.HOME_CARD_AI_CONSULT).performClick()
        assertTrue("Consultation card click should fire callback", consultClicked)

        composeTestRule.onNodeWithTag(TestTags.HOME_CARD_PLANNER).performScrollTo().performClick()
        assertTrue("Planner card click should fire callback", plannerClicked)

        composeTestRule.onNodeWithTag(TestTags.HOME_CARD_DISEASE_LIST).performScrollTo().performClick()
        assertTrue("Disease list card click should fire callback", diseaseListClicked)
    }
}
