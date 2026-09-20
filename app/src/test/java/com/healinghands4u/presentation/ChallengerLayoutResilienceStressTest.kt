package com.healinghands4u.presentation

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.healinghands4u.config.BrandingConfig
import com.healinghands4u.data.mock.MockHomeopathyData
import com.healinghands4u.presentation.chatbot.answer.ChatbotAnswerScreen
import com.healinghands4u.presentation.chatbot.consultation.ConsultationScreen
import com.healinghands4u.presentation.chatbot.query.ChatbotQueryScreen
import com.healinghands4u.presentation.common.DoctorContactFooter
import com.healinghands4u.presentation.common.TestTags
import com.healinghands4u.presentation.components.*
import com.healinghands4u.presentation.diseaselist.DiseaseListScreen
import com.healinghands4u.presentation.home.HomeScreen
import com.healinghands4u.presentation.planner.PlannerScreen
import com.healinghands4u.presentation.theme.*
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config
import java.lang.Character

/**
 * Challenger 2 Empirical Stress & Invariant Test Suite.
 * Adversarial verification covering:
 * 1. Screen layout resilience across small, landscape, tablet, and extreme density configurations.
 * 2. Strict token fidelity: exact matching of all 10 PRD v3 tokens and mathematical proof of non-inversion.
 * 3. Component state transitions: Planner adherence metrics, Consultation Yes/No selections, Query consultation toggle.
 * 4. Zero-emoji assertion across all app data models, branding configurations, and UI copy.
 */
@RunWith(AndroidJUnit4::class)
class ChallengerLayoutResilienceStressTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    // =========================================================================
    // SECTION 1: Layout Resilience Across Extreme Screen Configurations
    // =========================================================================

    @Test
    @Config(sdk = [34], qualifiers = "w320dp-h480dp-mdpi")
    fun smallScreen_chatbotQueryScreen_allElementsAccessible() {
        composeTestRule.setContent {
            HealingHandsTheme {
                ChatbotQueryScreen(onSendQuery = { _, _ -> })
            }
        }

        // Header, quick replies, text field, toggle, buttons, and footer must be reachable
        composeTestRule.onNodeWithText("Chat with Dr. AI").assertIsDisplayed()
        composeTestRule.onNodeWithText("Quick Queries").performScrollTo().assertIsDisplayed()
        composeTestRule.onNodeWithText("Acidity & Heartburn").assertIsDisplayed()
        composeTestRule.onNodeWithText("Type your query or speak").performScrollTo().assertIsDisplayed()
        composeTestRule.onNodeWithText("I would like a guided online consultation").performScrollTo().assertIsDisplayed()
        composeTestRule.onNodeWithText("Get Answer Now").performScrollTo().assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.FOOTER_CARD).performScrollTo().assertIsDisplayed()
    }

    @Test
    @Config(sdk = [34], qualifiers = "w320dp-h480dp-mdpi")
    fun smallScreen_consultationScreen_allQuestionsScrollableAndSubmittable() {
        var submittedAnswer = ""
        composeTestRule.setContent {
            HealingHandsTheme {
                ConsultationScreen(onAnswerSelected = { submittedAnswer = it })
            }
        }

        // Diagnostic questions must be visible or scrollable
        composeTestRule.onNodeWithText("Did you eat outside food recently?").assertIsDisplayed()
        composeTestRule.onNodeWithText("Do you have stress currently?").performScrollTo().assertIsDisplayed()
        composeTestRule.onNodeWithText("Is this acidity from long time?").performScrollTo().assertIsDisplayed()

        // Answer all questions sequentially on small screen
        composeTestRule.onAllNodesWithText("Yes")[0].performScrollTo().performClick()
        composeTestRule.onAllNodesWithText("No")[1].performScrollTo().performClick()
        composeTestRule.onAllNodesWithText("Yes")[2].performScrollTo().performClick()

        // Submit button must be reachable and clickable
        composeTestRule.onNodeWithText("Submit Answers & Get Remedy").performScrollTo().assertIsEnabled().performClick()
        assertNotNull(submittedAnswer)
        assertTrue(submittedAnswer.isNotEmpty())
    }

    @Test
    @Config(sdk = [34], qualifiers = "w320dp-h480dp-mdpi")
    fun smallScreen_chatbotAnswerScreen_rxCardAndVideoLinkAccessible() {
        composeTestRule.setContent {
            HealingHandsTheme {
                ChatbotAnswerScreen(
                    answerText = "Belladonna 200C",
                    dosage = "3 pellets twice daily",
                    homeRemedy = "Cold compress on forehead",
                    safetyDisclaimer = "If disease does not cure within 2 days then consult doctor right now",
                    videoUrl = "https://example.com/video"
                )
            }
        }

        composeTestRule.onNodeWithText("Your Healing Plan").assertIsDisplayed()
        composeTestRule.onNodeWithText("Belladonna 200C").performScrollTo().assertIsDisplayed()
        composeTestRule.onNodeWithText("Cold compress on forehead").performScrollTo().assertIsDisplayed()
        composeTestRule.onNodeWithText("If disease does not cure within 2 days then consult doctor right now").performScrollTo().assertIsDisplayed()
        composeTestRule.onNodeWithText("Watch Remedy Guide Video").performScrollTo().assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.FOOTER_CARD).performScrollTo().assertIsDisplayed()
    }

    @Test
    @Config(sdk = [34], qualifiers = "w891dp-h411dp-land-xxhdpi")
    fun landscape_consultationScreen_scrollsProperly() {
        composeTestRule.setContent {
            HealingHandsTheme {
                ConsultationScreen()
            }
        }

        composeTestRule.onNodeWithText("Consultation").assertIsDisplayed()
        composeTestRule.onNodeWithText("Did you eat outside food recently?").assertIsDisplayed()
        composeTestRule.onNodeWithText("Submit Answers & Get Remedy").performScrollTo().assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.FOOTER_CARD).performScrollTo().assertIsDisplayed()
    }

    @Test
    @Config(sdk = [34], qualifiers = "w891dp-h411dp-land-xxhdpi")
    fun landscape_plannerScreen_scrollsProperly() {
        composeTestRule.setContent {
            HealingHandsTheme {
                PlannerScreen()
            }
        }

        composeTestRule.onNodeWithTag(TestTags.PLANNER_TITLE).assertIsDisplayed()
        composeTestRule.onNodeWithText("Arnica Montana 30C").performScrollTo().assertIsDisplayed()
        composeTestRule.onNodeWithText("Passiflora Incarnata Mother Tincture (Q)").performScrollTo().assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.PLANNER_DIETARY_CARD).performScrollTo().assertIsDisplayed()
        composeTestRule.onNodeWithTag(TestTags.FOOTER_CARD).performScrollTo().assertIsDisplayed()
    }

    @Test
    @Config(sdk = [34], qualifiers = "w280dp-h653dp-mdpi")
    fun ultraNarrow_components_renderWithoutCrash() {
        composeTestRule.setContent {
            HealingHandsTheme {
                androidx.compose.foundation.layout.Column {
                    BrandRow(title = "Healing Hands4U", subtitle = "Holistic Clinic")
                    TipCard(category = "Digestion", body = "Drink warm water with raw honey.", onReadMoreClick = {})
                    RxCard(
                        remedyName = "SBL Nixocid 2 pills a day",
                        dosage = "2 pills twice daily",
                        homeRemedy = "Jeera and Dhania soaked water",
                        safetyDisclaimer = "If disease does not cure within 2 days then consult doctor right now"
                    )
                }
            }
        }

        composeTestRule.onNodeWithText("Healing Hands4U").assertIsDisplayed()
        composeTestRule.onNodeWithText("DIGESTION").assertIsDisplayed()
        composeTestRule.onNodeWithText("SBL Nixocid 2 pills a day").assertIsDisplayed()
    }

    @Test
    @Config(sdk = [34], qualifiers = "w411dp-h891dp-xxxhdpi")
    fun extremeDensity_components_renderSafely() {
        composeTestRule.setContent {
            HealingHandsTheme {
                androidx.compose.foundation.layout.Column {
                    DoctorContactFooter()
                    MiniCard(label = "Streak", value = "7 Days", meta = "100% adherence")
                }
            }
        }

        composeTestRule.onNodeWithTag(TestTags.FOOTER_CARD).assertIsDisplayed()
        composeTestRule.onNodeWithText("7 Days").assertIsDisplayed()
    }

    // =========================================================================
    // SECTION 2: Token Fidelity & Mathematical Non-Inversion Proof
    // =========================================================================

    @Test
    fun tokens_lightMode_matchPRDv3ValuesExactly() {
        assertEquals("LightBg must be #FFFFFF", Color(0xFFFFFFFF), LightBg)
        assertEquals("LightSurface must be #F7F9FB", Color(0xFFF7F9FB), LightSurface)
        assertEquals("LightSurfaceTint must be #EAF5F6", Color(0xFFEAF5F6), LightSurfaceTint)
        assertEquals("LightInk must be #0F2027", Color(0xFF0F2027), LightInk)
        assertEquals("LightInkDim must be #5C7480", Color(0xFF5C7480), LightInkDim)
        assertEquals("LightAccent must be #0E7C86", Color(0xFF0E7C86), LightAccent)
        assertEquals("LightAccentInk must be #FFFFFF", Color(0xFFFFFFFF), LightAccentInk)
        assertEquals("LightLine must be 0x140F2027", Color(0x140F2027), LightLine)
        assertEquals("LightWarnBg must be #FFF0EC", Color(0xFFFFF0EC), LightWarnBg)
        assertEquals("LightWarnInk must be #A14A2A", Color(0xFFA14A2A), LightWarnInk)
    }

    @Test
    fun tokens_darkMode_matchPRDv3ValuesExactly() {
        assertEquals("DarkBg must be #0A1418", Color(0xFF0A1418), DarkBg)
        assertEquals("DarkSurface must be #101E22", Color(0xFF101E22), DarkSurface)
        assertEquals("DarkSurfaceTint must be 0x1A2DD4C8", Color(0x1A2DD4C8), DarkSurfaceTint)
        assertEquals("DarkInk must be #E7F1F3", Color(0xFFE7F1F3), DarkInk)
        assertEquals("DarkInkDim must be #7E97A0", Color(0xFF7E97A0), DarkInkDim)
        assertEquals("DarkAccent must be #2DD4C8", Color(0xFF2DD4C8), DarkAccent)
        assertEquals("DarkAccentInk must be #04211E", Color(0xFF04211E), DarkAccentInk)
        assertEquals("DarkLine must be 0x1AE7F1F3", Color(0x1AE7F1F3), DarkLine)
        assertEquals("DarkWarnBg must be 0x24E67E22", Color(0x24E67E22), DarkWarnBg)
        assertEquals("DarkWarnInk must be #F0B074", Color(0xFFF0B074), DarkWarnInk)
    }

    @Test
    fun tokens_darkMode_isNotNaiveInversion() {
        // A naive inversion of LightAccent (0x0E, 0x7C, 0x86) would be (0xF1, 0x83, 0x79) = #F18379 (coral/red)
        val naiveInverseAccentRed = 1f - LightAccent.red
        val naiveInverseAccentGreen = 1f - LightAccent.green
        val naiveInverseAccentBlue = 1f - LightAccent.blue

        // Real DarkAccent is vibrant cyan-teal #2DD4C8 (R: 45/255=0.176, G: 212/255=0.831, B: 200/255=0.784)
        assertFalse(
            "DarkAccent must NOT equal naive inverse of LightAccent",
            Math.abs(DarkAccent.red - naiveInverseAccentRed) < 0.05f &&
            Math.abs(DarkAccent.green - naiveInverseAccentGreen) < 0.05f &&
            Math.abs(DarkAccent.blue - naiveInverseAccentBlue) < 0.05f
        )

        // A naive inversion of LightBg #FFFFFF would be #000000. Real DarkBg is slate #0A1418
        assertNotEquals("DarkBg must not be pure black (#000000)", Color(0xFF000000), DarkBg)

        // A naive inversion of LightWarnInk #A14A2A would be light sky blue #5EB5D5. Real is warm amber #F0B074
        assertFalse(
            "DarkWarnInk must NOT equal naive inverse of LightWarnInk",
            Math.abs(DarkWarnInk.red - (1f - LightWarnInk.red)) < 0.05f
        )
    }

    // =========================================================================
    // SECTION 3: Component State Transitions (Planner, Consultation, Query)
    // =========================================================================

    @Test
    fun stateTransition_plannerAdherenceCounter_updatesDynamically() {
        composeTestRule.setContent {
            HealingHandsTheme {
                PlannerScreen()
            }
        }

        // Initially: "0 of 3"
        composeTestRule.onNodeWithText("0 of 3").assertIsDisplayed()
        composeTestRule.onNodeWithText("0% adhered today").assertIsDisplayed()

        // Scroll to the first step so the checkbox is in view
        composeTestRule.onNodeWithText("Arnica Montana 30C").performScrollTo()
        val checkboxes = composeTestRule.onAllNodes(isToggleable())
        assertEquals(3, checkboxes.fetchSemanticsNodes().size)

        // Toggle 1st dose -> ON
        checkboxes[0].performClick()
        checkboxes[0].assertIsOn()

        // Scroll back to top to verify MiniCard update
        composeTestRule.onNodeWithText("Personalized Health Plan").performScrollTo()
        composeTestRule.onNodeWithText("1 of 3").assertIsDisplayed()
        composeTestRule.onNodeWithText("33% adhered today").assertIsDisplayed()

        // Toggle 2nd dose -> ON
        composeTestRule.onNodeWithText("Nux Vomica 200C").performScrollTo()
        checkboxes[1].performClick()
        checkboxes[1].assertIsOn()

        composeTestRule.onNodeWithText("Personalized Health Plan").performScrollTo()
        composeTestRule.onNodeWithText("2 of 3").assertIsDisplayed()
        composeTestRule.onNodeWithText("66% adhered today").assertIsDisplayed()

        // Toggle 3rd dose -> ON
        composeTestRule.onNodeWithText("Passiflora Incarnata Mother Tincture (Q)").performScrollTo()
        checkboxes[2].performClick()
        checkboxes[2].assertIsOn()

        composeTestRule.onNodeWithText("Personalized Health Plan").performScrollTo()
        composeTestRule.onNodeWithText("3 of 3").assertIsDisplayed()
        composeTestRule.onNodeWithText("100% adhered today").assertIsDisplayed()

        // Untoggle 1st dose -> OFF
        composeTestRule.onNodeWithText("Arnica Montana 30C").performScrollTo()
        checkboxes[0].performClick()
        checkboxes[0].assertIsOff()

        composeTestRule.onNodeWithText("Personalized Health Plan").performScrollTo()
        composeTestRule.onNodeWithText("2 of 3").assertIsDisplayed()
    }

    @Test
    fun stateTransition_consultationToggleBetweenYesAndNo() {
        var latestAnswer = ""
        composeTestRule.setContent {
            HealingHandsTheme {
                YesNoCard(
                    questionId = "stress_q",
                    questionText = "Do you have stress currently?",
                    selectedAnswer = if (latestAnswer.isEmpty()) null else latestAnswer,
                    onAnswerSelected = { latestAnswer = it }
                )
            }
        }

        // Initially neither button has filled container
        composeTestRule.onNodeWithText("Do you have stress currently?").assertIsDisplayed()

        // Select "Yes"
        composeTestRule.onNodeWithText("Yes").performClick()
        assertEquals("yes", latestAnswer)

        // Select "No" -> switches to "no"
        composeTestRule.onNodeWithText("No").performClick()
        assertEquals("no", latestAnswer)
    }

    @Test
    fun stateTransition_chatbotQuery_blankAndWhitespaceDoNotEnableSubmit() {
        composeTestRule.setContent {
            HealingHandsTheme {
                ChatbotQueryScreen(onSendQuery = { _, _ -> })
            }
        }

        // Blank -> disabled
        composeTestRule.onNodeWithText("Get Answer Now").assertIsNotEnabled()

        // Enter whitespace -> still disabled
        composeTestRule.onNodeWithText("Type your query or speak").performTextInput("    \n\t  ")
        composeTestRule.onNodeWithText("Get Answer Now").assertIsNotEnabled()

        // Enter non-blank -> enabled
        composeTestRule.onNodeWithText("Type your query or speak").performTextInput("Cough")
        composeTestRule.onNodeWithText("Get Answer Now").assertIsEnabled()
    }

    // =========================================================================
    // SECTION 4: Zero Emoji Automated Assertion
    // =========================================================================

    @Test
    fun zeroEmoji_assertion_acrossMockDataAndBranding() {
        // Collect all strings from MockHomeopathyData and BrandingConfig
        val testStrings = mutableListOf<String>()

        testStrings.add(BrandingConfig.DOCTOR_NAME)
        testStrings.add(BrandingConfig.DOCTOR_QUALIFICATIONS)
        testStrings.add(BrandingConfig.WHATSAPP_NUMBER)
        testStrings.add(BrandingConfig.CLINIC_ADDRESS)

        MockHomeopathyData.diseases.forEach {
            testStrings.add(it.name)
            testStrings.add(it.category)
            testStrings.add(it.primaryRemedies)
            testStrings.add(it.symptoms)
            testStrings.add(it.dosageGuideline)
        }

        MockHomeopathyData.quickReplies.forEach {
            testStrings.add(it.label)
            testStrings.add(it.query)
        }

        MockHomeopathyData.defaultPlannerSteps.forEach {
            testStrings.add(it.timeSlot)
            testStrings.add(it.remedyName)
            testStrings.add(it.dosage)
            testStrings.add(it.instructions)
        }

        MockHomeopathyData.acidityConsultation.diagnosticQuestions.forEach {
            testStrings.add(it.questionText)
        }

        MockHomeopathyData.acidityConsultation.branches.values.forEach {
            testStrings.add(it.remedyName)
            testStrings.add(it.dosage)
            it.homeRemedy?.let { hr -> testStrings.add(hr) }
            testStrings.add(it.safetyDisclaimer)
        }

        for (str in testStrings) {
            for (ch in str) {
                val codePoint = ch.code
                val isEmoji = (codePoint in 0x1F300..0x1F9FF) ||
                              (codePoint in 0x2600..0x27BF) ||
                              (codePoint in 0x1F600..0x1F64F) ||
                              (codePoint in 0x1F680..0x1F6FF) ||
                              (codePoint in 0x1FA70..0x1FAFF)
                assertFalse("String '$str' must not contain emoji character: $ch (codepoint: $codePoint)", isEmoji)
            }
        }
    }
}
