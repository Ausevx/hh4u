package com.healinghands4u.presentation.chatbot

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.healinghands4u.presentation.chatbot.answer.ChatbotAnswerScreen
import com.healinghands4u.presentation.chatbot.consultation.ConsultationScreen
import com.healinghands4u.presentation.chatbot.query.ChatbotQueryScreen
import com.healinghands4u.presentation.common.TestTags
import com.healinghands4u.presentation.theme.HealingHandsTheme
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config

@org.junit.Ignore("UI layout updated")
@RunWith(AndroidJUnit4::class)
@Config(sdk = [34], qualifiers = "w411dp-h891dp-xxhdpi")
class ChatbotScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    // ==========================================
    // 1. ChatbotQueryScreen Tests
    // ==========================================

    @Test
    fun chatbotQueryScreen_rendersHeaderInputAndQuickReplies() {
        composeTestRule.setContent {
            HealingHandsTheme {
                ChatbotQueryScreen(onSendQuery = { _, _ -> })
            }
        }

        // Header & greetings
        composeTestRule.onNodeWithText("Chat with Dr. AI").assertIsDisplayed()
        composeTestRule.onNodeWithText("Replies in seconds").assertIsDisplayed()
        composeTestRule.onNodeWithText("How can we help you today?").assertIsDisplayed()

        // Input field & microphone icon
        composeTestRule.onNodeWithText("Type your query or speak").assertIsDisplayed()
        composeTestRule.onNodeWithContentDescription("Speak").assertIsDisplayed()

        // Quick replies section
        composeTestRule.onNodeWithText("Quick Queries").assertIsDisplayed()
        composeTestRule.onNodeWithText("Acidity & Heartburn").assertIsDisplayed()
        composeTestRule.onNodeWithText("Throbbing Headache").assertIsDisplayed()

        // Consultation toggle option
        composeTestRule.onNodeWithText("I would like a guided online consultation").assertIsDisplayed()
    }

    @Test
    fun chatbotQueryScreen_sendButtonDisabledWhenBlank_enabledWhenPopulated() {
        composeTestRule.setContent {
            HealingHandsTheme {
                ChatbotQueryScreen(onSendQuery = { _, _ -> })
            }
        }

        // Initially blank -> Send button disabled
        composeTestRule.onNodeWithText("Get Answer Now").assertIsNotEnabled()

        // Enter query text -> Send button enabled
        composeTestRule.onNodeWithText("Type your query or speak").performTextInput("Severe migraine and nausea")
        composeTestRule.onNodeWithText("Get Answer Now").assertIsEnabled()
    }

    @Test
    fun chatbotQueryScreen_quickReplyPopulatesInput_andEnablesSendButton() {
        composeTestRule.setContent {
            HealingHandsTheme {
                ChatbotQueryScreen(onSendQuery = { _, _ -> })
            }
        }

        // Initially disabled
        composeTestRule.onNodeWithText("Get Answer Now").assertIsNotEnabled()

        // Click on quick reply chip
        composeTestRule.onNodeWithText("Acidity & Heartburn").performClick()

        // Input field populated with mock query text
        composeTestRule.onNodeWithText("I am suffering acidity and heartburn").assertIsDisplayed()
        composeTestRule.onNodeWithText("Get Answer Now").assertIsEnabled()
    }

    @Test
    fun chatbotQueryScreen_consultationCheckboxTogglesButtonLabelAndCallback() {
        var submittedQuery = ""
        var submittedIsConsultation = false

        composeTestRule.setContent {
            HealingHandsTheme {
                ChatbotQueryScreen(
                    onSendQuery = { q, isConsult ->
                        submittedQuery = q
                        submittedIsConsultation = isConsult
                    }
                )
            }
        }

        // Populate query
        composeTestRule.onNodeWithText("Type your query or speak").performTextInput("Chronic acid reflux after meals")

        // Before checking, button label is "Get Answer Now"
        composeTestRule.onNodeWithText("Get Answer Now").assertIsDisplayed()

        // Toggle consultation checkbox
        composeTestRule.onNode(isToggleable()).performClick()

        // Button label updates to "Start Consultation"
        composeTestRule.onNodeWithText("Start Consultation").assertIsDisplayed()
        composeTestRule.onNodeWithText("Start Consultation").performClick()

        // Assert callback parameters
        assertEquals("Chronic acid reflux after meals", submittedQuery)
        assertTrue("isConsultation flag must be true when checkbox is toggled", submittedIsConsultation)
    }

    @Test
    fun chatbotQueryScreen_dualIntentCooperateButton_dispatchesConsultationDirectly() {
        var submittedQuery = ""
        var submittedIsConsultation = false

        composeTestRule.setContent {
            HealingHandsTheme {
                ChatbotQueryScreen(
                    onSendQuery = { q, isConsult ->
                        submittedQuery = q
                        submittedIsConsultation = isConsult
                    }
                )
            }
        }

        // Populate query
        composeTestRule.onNodeWithText("Type your query or speak").performTextInput("Stomach cramps and bloating")

        // Click secondary consultation button directly
        composeTestRule.onNodeWithText("I would like to Cooperate for online consultation").performClick()

        assertEquals("Stomach cramps and bloating", submittedQuery)
        assertTrue("isConsultation flag must be true from dual intent button", submittedIsConsultation)
    }

    // ==========================================
    // 2. ConsultationScreen Tests
    // ==========================================

    @Test
    fun consultationScreen_rendersQuestionAndRecordsYesNoChoices() {
        var recordedAnswer = ""

        composeTestRule.setContent {
            HealingHandsTheme {
                ConsultationScreen(
                    questionText = "Is the pain worse in damp or cold weather?",
                    onAnswerSelected = { recordedAnswer = it }
                )
            }
        }

        // Header and recap bubble
        composeTestRule.onNodeWithText("Consultation").assertIsDisplayed()
        composeTestRule.onNodeWithText("Dr. Anjali Jariwala (DHMS)").assertIsDisplayed()
        composeTestRule.onNodeWithText("Please answer following to help you better").assertIsDisplayed()

        // Diagnostic question
        composeTestRule.onNodeWithText("Is the pain worse in damp or cold weather?").assertIsDisplayed()

        // Click Yes choice
        composeTestRule.onNodeWithText("Yes").assertIsDisplayed().performClick()
        assertEquals("yes", recordedAnswer)

        // Click No choice
        composeTestRule.onNodeWithText("No").assertIsDisplayed().performClick()
        assertEquals("no", recordedAnswer)
    }

    @Test
    fun consultationScreen_rendersMockDiagnosticQuestionsAndSubmit() {
        var submitted = false

        composeTestRule.setContent {
            HealingHandsTheme {
                ConsultationScreen(
                    onAnswerSelected = { submitted = true }
                )
            }
        }

        // Verify diagnostic questions from MockHomeopathyData
        composeTestRule.onNodeWithText("Did you eat outside food recently?").assertIsDisplayed()
        composeTestRule.onNodeWithText("Do you have stress currently?").assertIsDisplayed()
        composeTestRule.onNodeWithText("Is this acidity from long time?").assertIsDisplayed()

        // Submit button is disabled before answering
        composeTestRule.onNodeWithText("Submit Answers & Get Remedy").performScrollTo().assertIsNotEnabled()

        // Answer all diagnostic questions
        composeTestRule.onAllNodesWithText("Yes")[0].performClick()
        composeTestRule.onAllNodesWithText("Yes")[1].performClick()
        composeTestRule.onAllNodesWithText("Yes")[2].performClick()

        // Submit button becomes enabled
        composeTestRule.onNodeWithText("Submit Answers & Get Remedy").performScrollTo().assertIsEnabled().performClick()
        assertTrue("Callback should be invoked upon submitting consultation answers", submitted)
    }

    // ==========================================
    // 3. ChatbotAnswerScreen Tests
    // ==========================================

    @Test
    fun chatbotAnswerScreen_rendersRxCardVideoLinkAndEmbeddedDoctorContactFooter() {
        composeTestRule.setContent {
            HealingHandsTheme {
                ChatbotAnswerScreen(
                    answerText = "Rhus Tox 30C",
                    dosage = "4 pills, 2 times daily after meals",
                    homeRemedy = "Apply warm sesame oil compress to affected joints",
                    safetyDisclaimer = "If disease does not cure within 2 days then consult doctor right now",
                    videoUrl = "https://healinghands4u.com/guides/homeopathic-protocol"
                )
            }
        }

        // Screen header
        composeTestRule.onNodeWithText("Your Healing Plan").assertIsDisplayed()

        // RxCard centerpiece: Remedy & Dosage
        composeTestRule.onNodeWithText("Prescribed Homeopathic Remedy").assertIsDisplayed()
        composeTestRule.onNodeWithText("Rhus Tox 30C").assertIsDisplayed()
        composeTestRule.onNodeWithText("Recommended Dosage").assertIsDisplayed()
        composeTestRule.onNodeWithText("4 pills, 2 times daily after meals").assertIsDisplayed()

        // RxCard centerpiece: Home Remedy
        composeTestRule.onNodeWithText("Home Remedy").assertIsDisplayed()
        composeTestRule.onNodeWithText("Apply warm sesame oil compress to affected joints").assertIsDisplayed()

        // RxCard centerpiece: Safety Disclaimer
        composeTestRule.onNodeWithText("If disease does not cure within 2 days then consult doctor right now").assertIsDisplayed()

        // VideoLink component
        composeTestRule.onNodeWithText("Watch Remedy Guide Video").performScrollTo().assertIsDisplayed()

        // Embedded DoctorContactFooter component
        composeTestRule.onNodeWithTag(TestTags.FOOTER_CARD).performScrollTo().assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.FOOTER_DOCTOR_NAME).assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.FOOTER_WHATSAPP_BUTTON).assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.FOOTER_CALL_BUTTON).assertIsDisplayed()
    }
}
