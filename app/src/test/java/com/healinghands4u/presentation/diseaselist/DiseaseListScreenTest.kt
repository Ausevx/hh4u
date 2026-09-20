package com.healinghands4u.presentation.diseaselist

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performTextInput
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
class DiseaseListScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun diseaseListScreen_rendersTitleAndBackNavigation() {
        var backClicked = false

        composeTestRule.setContent {
            HealingHandsTheme {
                DiseaseListScreen(onBackClick = { backClicked = true })
            }
        }

        composeTestRule.onNodeWithTag(TestTags.DISEASE_LIST_TITLE).assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.DISEASE_LIST_BACK_BUTTON).assertIsDisplayed()

        composeTestRule.onNodeWithTag(TestTags.DISEASE_LIST_BACK_BUTTON).performClick()
        assertTrue("Back button click should invoke callback", backClicked)
    }

    @Test
    fun diseaseListScreen_rendersSearchAndCategoryChips() {
        composeTestRule.setContent {
            HealingHandsTheme {
                DiseaseListScreen()
            }
        }

        composeTestRule.onNodeWithTag(TestTags.DISEASE_SEARCH_INPUT).assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.DISEASE_CATEGORY_CHIPS).assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.DISEASE_LIST_ITEMS).assertIsDisplayed()

        // Check common conditions rendered
        composeTestRule.onNodeWithText("Allergic Rhinitis (Hay Fever)").assertIsDisplayed()
        composeTestRule.onNodeWithText("Acid Reflux & GERD").performScrollTo().assertIsDisplayed()
    }

    @Test
    fun diseaseListScreen_searchFiltersResults() {
        composeTestRule.setContent {
            HealingHandsTheme {
                DiseaseListScreen()
            }
        }

        // Search for Eczema
        composeTestRule.onNodeWithTag(TestTags.DISEASE_SEARCH_INPUT).performTextInput("Eczema")
        composeTestRule.onNodeWithText("Eczema & Atopic Dermatitis").assertIsDisplayed()
    }

    @Test
    fun diseaseListScreen_rendersEmbeddedDoctorContactFooter() {
        composeTestRule.setContent {
            HealingHandsTheme {
                DiseaseListScreen()
            }
        }

        // Verify DoctorContactFooter is embedded and rendered in the disease directory
        composeTestRule.onNodeWithTag(TestTags.FOOTER_CARD).performScrollTo().assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.FOOTER_DOCTOR_NAME).assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.FOOTER_WHATSAPP_BUTTON).assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.FOOTER_CALL_BUTTON).assertIsDisplayed()
    }
}
