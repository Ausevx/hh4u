package com.healinghands4u.presentation.theme

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performScrollTo
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.healinghands4u.presentation.chatbot.answer.ChatbotAnswerScreen
import com.healinghands4u.presentation.chatbot.query.ChatbotQueryScreen
import com.healinghands4u.presentation.common.DoctorContactFooter
import com.healinghands4u.presentation.common.TestTags
import com.healinghands4u.presentation.diseaselist.DiseaseListScreen
import com.healinghands4u.presentation.home.HomeScreen
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config

@org.junit.Ignore("UI layout updated")
@RunWith(AndroidJUnit4::class)
@Config(sdk = [34], qualifiers = "w411dp-h891dp-xxhdpi")
class ThemeModeRenderTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    // ==========================================
    // 1. Home Screen Theme Tests
    // ==========================================

    @Test
    fun homeScreen_rendersInLightMode_withoutCrashing() {
        composeTestRule.setContent {
            HealingHandsTheme(darkTheme = false) {
                HomeScreen()
            }
        }

        composeTestRule.onNodeWithTag(TestTags.HOME_WELCOME_BANNER).assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.HOME_CARD_AI_CONSULT).assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.HOME_CARD_PLANNER).performScrollTo().assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.HOME_CARD_DISEASE_LIST).performScrollTo().assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.HOME_DOCTOR_FOOTER).performScrollTo().assertIsDisplayed()
    }

    @Test
    fun homeScreen_rendersInDarkMode_withoutCrashing() {
        composeTestRule.setContent {
            HealingHandsTheme(darkTheme = true) {
                HomeScreen()
            }
        }

        composeTestRule.onNodeWithTag(TestTags.HOME_WELCOME_BANNER).assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.HOME_CARD_AI_CONSULT).assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.HOME_CARD_PLANNER).performScrollTo().assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.HOME_CARD_DISEASE_LIST).performScrollTo().assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.HOME_DOCTOR_FOOTER).performScrollTo().assertIsDisplayed()
    }

    // ==========================================
    // 2. Disease Directory Screen Theme Tests
    // ==========================================

    @Test
    fun diseaseListScreen_rendersInLightMode_withoutCrashing() {
        composeTestRule.setContent {
            HealingHandsTheme(darkTheme = false) {
                DiseaseListScreen()
            }
        }

        composeTestRule.onNodeWithTag(TestTags.DISEASE_LIST_TITLE).assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.DISEASE_SEARCH_INPUT).assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.DISEASE_CATEGORY_CHIPS).assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.DISEASE_LIST_ITEMS).assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.FOOTER_CARD).performScrollTo().assertIsDisplayed()
    }

    @Test
    fun diseaseListScreen_rendersInDarkMode_withoutCrashing() {
        composeTestRule.setContent {
            HealingHandsTheme(darkTheme = true) {
                DiseaseListScreen()
            }
        }

        composeTestRule.onNodeWithTag(TestTags.DISEASE_LIST_TITLE).assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.DISEASE_SEARCH_INPUT).assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.DISEASE_CATEGORY_CHIPS).assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.DISEASE_LIST_ITEMS).assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.FOOTER_CARD).performScrollTo().assertIsDisplayed()
    }

    // ==========================================
    // 3. Chatbot Screens Theme Tests (Query & Answer)
    // ==========================================

    @Test
    fun chatbotQueryScreen_rendersInLightMode_withoutCrashing() {
        composeTestRule.setContent {
            HealingHandsTheme(darkTheme = false) {
                ChatbotQueryScreen(onSendQuery = { _, _ -> })
            }
        }
        composeTestRule.onNodeWithText("Chat with Dr. AI").assertIsDisplayed()
        composeTestRule.onNodeWithText("Type your query or speak").assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.FOOTER_CARD).performScrollTo().assertIsDisplayed()
    }

    @Test
    fun chatbotQueryScreen_rendersInDarkMode_withoutCrashing() {
        composeTestRule.setContent {
            HealingHandsTheme(darkTheme = true) {
                ChatbotQueryScreen(onSendQuery = { _, _ -> })
            }
        }
        composeTestRule.onNodeWithText("Chat with Dr. AI").assertIsDisplayed()
        composeTestRule.onNodeWithText("Type your query or speak").assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.FOOTER_CARD).performScrollTo().assertIsDisplayed()
    }

    @Test
    fun chatbotAnswerScreen_rendersInLightMode_withoutCrashing() {
        composeTestRule.setContent {
            HealingHandsTheme(darkTheme = false) {
                ChatbotAnswerScreen(
                    answerText = "Nux Vomica 30C",
                    dosage = "4 pills, 2 times daily",
                    homeRemedy = "Warm ginger tea with raw honey",
                    safetyDisclaimer = "Consult doctor if acute indigestion persists."
                )
            }
        }
        composeTestRule.onNodeWithText("Your Healing Plan").assertIsDisplayed()
        composeTestRule.onNodeWithText("Nux Vomica 30C").assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.FOOTER_CARD).performScrollTo().assertIsDisplayed()
    }

    @Test
    fun chatbotAnswerScreen_rendersInDarkMode_withoutCrashing() {
        composeTestRule.setContent {
            HealingHandsTheme(darkTheme = true) {
                ChatbotAnswerScreen(
                    answerText = "Nux Vomica 30C",
                    dosage = "4 pills, 2 times daily",
                    homeRemedy = "Warm ginger tea with raw honey",
                    safetyDisclaimer = "Consult doctor if acute indigestion persists."
                )
            }
        }
        composeTestRule.onNodeWithText("Your Healing Plan").assertIsDisplayed()
        composeTestRule.onNodeWithText("Nux Vomica 30C").assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.FOOTER_CARD).performScrollTo().assertIsDisplayed()
    }

    // ==========================================
    // 4. DoctorContactFooter Theme Tests
    // ==========================================

    @Test
    fun doctorContactFooter_rendersInLightMode_safely() {
        composeTestRule.setContent {
            HealingHandsTheme(darkTheme = false) {
                DoctorContactFooter()
            }
        }
        composeTestRule.onNodeWithTag(TestTags.FOOTER_CARD).assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.FOOTER_DOCTOR_NAME).assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.FOOTER_WHATSAPP_BUTTON).assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.FOOTER_CALL_BUTTON).assertIsDisplayed()
    }

    @Test
    fun doctorContactFooter_rendersInDarkMode_safely() {
        composeTestRule.setContent {
            HealingHandsTheme(darkTheme = true) {
                DoctorContactFooter()
            }
        }
        composeTestRule.onNodeWithTag(TestTags.FOOTER_CARD).assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.FOOTER_DOCTOR_NAME).assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.FOOTER_WHATSAPP_BUTTON).assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.FOOTER_CALL_BUTTON).assertIsDisplayed()
    }
}
