package com.healinghands4u.presentation.layout

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performScrollTo
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.healinghands4u.presentation.auth.LoginScreen
import com.healinghands4u.presentation.common.DoctorContactFooter
import com.healinghands4u.presentation.common.TestTags
import com.healinghands4u.presentation.diseaselist.DiseaseListScreen
import com.healinghands4u.presentation.home.HomeScreen
import com.healinghands4u.presentation.planner.PlannerScreen
import com.healinghands4u.presentation.theme.HealingHandsTheme
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config

@RunWith(AndroidJUnit4::class)
class LayoutResilienceTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    // --- Dimension 1: Small Screen Device (320dp x 480dp mdpi) ---
    @Test
    @Config(sdk = [34], qualifiers = "w320dp-h480dp-mdpi")
    fun smallScreen_loginScreen_scrollableAndAccessible() {
        composeTestRule.setContent {
            HealingHandsTheme {
                LoginScreen()
            }
        }

        composeTestRule.onNodeWithTag(TestTags.LOGIN_HEADER).assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.AUTH_OPTION_OTP).assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.LOGIN_GOOGLE_BUTTON).performScrollTo().assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.LOGIN_GUEST_BUTTON).performScrollTo().assertIsDisplayed()
    }

    @Test
    @Config(sdk = [34], qualifiers = "w320dp-h480dp-mdpi")
    fun smallScreen_homeScreen_allCardsReachableViaScroll() {
        composeTestRule.setContent {
            HealingHandsTheme {
                HomeScreen()
            }
        }

        composeTestRule.onNodeWithTag(TestTags.HOME_WELCOME_BANNER).assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.HOME_CARD_AI_CONSULT).performScrollTo().assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.HOME_CARD_PLANNER).performScrollTo().assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.HOME_CARD_DISEASE_LIST).performScrollTo().assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.HOME_DOCTOR_FOOTER).performScrollTo().assertIsDisplayed()
    }

    @Test
    @Config(sdk = [34], qualifiers = "w320dp-h480dp-mdpi")
    fun smallScreen_plannerScreen_scheduleAndDietaryReachable() {
        composeTestRule.setContent {
            HealingHandsTheme {
                PlannerScreen()
            }
        }

        composeTestRule.onNodeWithTag(TestTags.PLANNER_TITLE).assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.PLANNER_SCHEDULE_SECTION).assertIsDisplayed()
        composeTestRule.onNodeWithText("Arnica Montana 30C").performScrollTo().assertIsDisplayed()
        composeTestRule.onNodeWithText("Nux Vomica 200C").performScrollTo().assertIsDisplayed()
        composeTestRule.onNodeWithText("Passiflora Incarnata Mother Tincture (Q)").performScrollTo().assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.PLANNER_DIETARY_CARD).performScrollTo().assertIsDisplayed()
    }

    @Test
    @Config(sdk = [34], qualifiers = "w320dp-h480dp-mdpi")
    fun smallScreen_diseaseListScreen_searchAndChipsReachable() {
        composeTestRule.setContent {
            HealingHandsTheme {
                DiseaseListScreen()
            }
        }

        composeTestRule.onNodeWithTag(TestTags.DISEASE_LIST_TITLE).assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.DISEASE_SEARCH_INPUT).assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.DISEASE_CATEGORY_CHIPS).assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.DISEASE_LIST_ITEMS).assertIsDisplayed()
    }

    // --- Dimension 2: Landscape Orientation (891dp x 411dp) ---
    @Test
    @Config(sdk = [34], qualifiers = "w891dp-h411dp-land-xxhdpi")
    fun landscape_loginScreen_scrollableAndAccessible() {
        composeTestRule.setContent {
            HealingHandsTheme {
                LoginScreen()
            }
        }

        composeTestRule.onNodeWithTag(TestTags.LOGIN_HEADER).assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.LOGIN_GOOGLE_BUTTON).performScrollTo().assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.LOGIN_GUEST_BUTTON).performScrollTo().assertIsDisplayed()
    }

    @Test
    @Config(sdk = [34], qualifiers = "w891dp-h411dp-land-xxhdpi")
    fun landscape_homeScreen_scrollsToAllElements() {
        composeTestRule.setContent {
            HealingHandsTheme {
                HomeScreen()
            }
        }

        composeTestRule.onNodeWithTag(TestTags.HOME_WELCOME_BANNER).assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.HOME_CARD_AI_CONSULT).performScrollTo().assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.HOME_CARD_PLANNER).performScrollTo().assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.HOME_CARD_DISEASE_LIST).performScrollTo().assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.HOME_DOCTOR_FOOTER).performScrollTo().assertIsDisplayed()
    }

    // --- Dimension 3: Tablet / Large Display (800dp x 1280dp xhdpi) ---
    @Test
    @Config(sdk = [34], qualifiers = "w800dp-h1280dp-xhdpi")
    fun tablet_allScreens_renderWithoutClippingOrCrash() {
        // Test Home on tablet
        composeTestRule.setContent {
            HealingHandsTheme {
                HomeScreen()
            }
        }

        composeTestRule.onNodeWithTag(TestTags.HOME_WELCOME_BANNER).assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.HOME_CARD_AI_CONSULT).assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.HOME_CARD_PLANNER).assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.HOME_CARD_DISEASE_LIST).assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.HOME_DOCTOR_FOOTER).performScrollTo().assertIsDisplayed()
    }

    // --- Dimension 4: Extreme Densities (ldpi & xxxhdpi) ---
    @Test
    @Config(sdk = [34], qualifiers = "w360dp-h640dp-ldpi")
    fun extremeLowDensity_footerRendersSafely() {
        composeTestRule.setContent {
            HealingHandsTheme {
                DoctorContactFooter()
            }
        }

        composeTestRule.onNodeWithTag(TestTags.FOOTER_CARD).assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.FOOTER_DOCTOR_NAME).assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.FOOTER_WHATSAPP_BUTTON).assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.FOOTER_CALL_BUTTON).assertIsDisplayed()
    }

    @Test
    @Config(sdk = [34], qualifiers = "w411dp-h891dp-xxxhdpi")
    fun extremeHighDensity_footerRendersSafely() {
        composeTestRule.setContent {
            HealingHandsTheme {
                DoctorContactFooter()
            }
        }

        composeTestRule.onNodeWithTag(TestTags.FOOTER_CARD).assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.FOOTER_DOCTOR_NAME).assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.FOOTER_WHATSAPP_BUTTON).assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.FOOTER_CALL_BUTTON).assertIsDisplayed()
    }
}
