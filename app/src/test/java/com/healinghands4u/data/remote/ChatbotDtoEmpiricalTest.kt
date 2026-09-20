package com.healinghands4u.data.remote

import com.google.gson.Gson
import com.google.gson.JsonSyntaxException
import org.junit.Assert.*
import org.junit.Test

/**
 * Empirical test suite to verify ChatbotApi DTO deserialization with live and stress payloads.
 */
class ChatbotDtoEmpiricalTest {

    private val gson = Gson()

    @Test
    fun testLiveDirectAnswerPayload_fullFields_deserializesSuccessfully() {
        val json = """
        {
            "success": true,
            "sessionId": "66ed8cf8b5df891c9441fa10",
            "matchConfident": true,
            "confidenceScore": 0.892,
            "intent": "direct_answer",
            "matchedLevel1Question": {
                "id": "66ed8cf8b5df891c9441fa09",
                "canonicalQuestionText": "What is the recommended remedy for acute tension headache?"
            },
            "answer": {
                "id": "66ed8cf8b5df891c9441fa08",
                "answerText": "Belladonna 30C is recommended for throbbing acute headaches.",
                "dosageInstructions": "4 pellets every 2 hours under tongue",
                "homeRemedyText": "Rest in a quiet dark room and stay hydrated",
                "safetyDisclaimerText": "If symptoms persist beyond 48 hours, seek emergency medical attention.",
                "videoUrl": "https://healinghands4u.com/video/headache-remedy"
            },
            "matchCandidates": [
                { "level1QuestionId": "66ed8cf8b5df891c9441fa09", "score": 0.892 }
            ]
        }
        """.trimIndent()

        val response = gson.fromJson(json, ChatbotQueryResponse::class.java)

        assertTrue(response.success)
        assertEquals("66ed8cf8b5df891c9441fa10", response.sessionId)
        assertEquals(true, response.matchConfident)
        assertEquals(0.892f, response.confidenceScore ?: 0f, 0.001f)
        assertEquals("direct_answer", response.intent)
        assertNotNull(response.matchedLevel1Question)
        assertEquals("66ed8cf8b5df891c9441fa09", response.matchedLevel1Question?.id)
        assertEquals("What is the recommended remedy for acute tension headache?", response.matchedLevel1Question?.canonicalQuestionText)

        assertNotNull(response.answer)
        val answer = response.answer!!
        assertEquals("66ed8cf8b5df891c9441fa08", answer.id)
        assertEquals("Belladonna 30C is recommended for throbbing acute headaches.", answer.answerText)
        assertEquals("4 pellets every 2 hours under tongue", answer.dosageInstructions)
        assertEquals("Rest in a quiet dark room and stay hydrated", answer.homeRemedyText)
        assertEquals("If symptoms persist beyond 48 hours, seek emergency medical attention.", answer.safetyDisclaimerText)
        assertEquals("https://healinghands4u.com/video/headache-remedy", answer.videoUrl)
    }

    @Test
    fun testLiveConsultationQueryPayload_deserializesSuccessfully() {
        val json = """
        {
            "success": true,
            "sessionId": "66ed8cf8b5df891c9441fa20",
            "matchConfident": true,
            "confidenceScore": 0.82,
            "intent": "consultation",
            "matchedLevel1Question": {
                "id": "66ed8cf8b5df891c9441fa15",
                "canonicalQuestionText": "What remedies help chronic acidity and heartburn?"
            },
            "consultation": {
                "consultationQueryId": "66ed8cf8b5df891c9441fa19",
                "diagnosticQuestions": [
                    { "id": "q1", "questionText": "Did symptoms start after eating rich or fatty food?" },
                    { "id": "q2", "questionText": "Is there severe burning in the chest relieved by cold water?" }
                ]
            },
            "diagnosticQuestions": [
                { "id": "q1", "questionText": "Did symptoms start after eating rich or fatty food?" },
                { "id": "q2", "questionText": "Is there severe burning in the chest relieved by cold water?" }
            ],
            "matchCandidates": []
        }
        """.trimIndent()

        val response = gson.fromJson(json, ChatbotQueryResponse::class.java)

        assertTrue(response.success)
        assertEquals("66ed8cf8b5df891c9441fa20", response.sessionId)
        assertEquals("consultation", response.intent)
        assertNotNull(response.diagnosticQuestions)
        assertEquals(2, response.diagnosticQuestions!!.size)
        assertEquals("q1", response.diagnosticQuestions!![0].id)
        assertEquals("Did symptoms start after eating rich or fatty food?", response.diagnosticQuestions!![0].questionText)
        assertNull(response.answer)
    }

    @Test
    fun testLiveConsultationAnswerResolutionPayload_deserializesSuccessfully() {
        val json = """
        {
            "success": true,
            "sessionId": "66ed8cf8b5df891c9441fa20",
            "matchedBranch": {
                "conditions": { "q1": "yes", "q2": "no" },
                "resolvedAnswerId": "66ed8cf8b5df891c9441fa33"
            },
            "answer": {
                "id": "66ed8cf8b5df891c9441fa33",
                "answerText": "Pulsatilla 30C is suggested for heartburn worse after fatty meals.",
                "personalizedAnswer": "Personalized Homeopathic Plan for your indigestion symptoms...",
                "dosageInstructions": "Take 4 pills twice daily after meals.",
                "homeRemedyText": "Sip lukewarm water and avoid heavy dinner.",
                "safetyDisclaimerText": "Consult clinic if symptoms do not improve within 48 hours.",
                "videoUrl": null
            },
            "personalized": true
        }
        """.trimIndent()

        val response = gson.fromJson(json, ConsultationResolutionResponse::class.java)

        assertTrue(response.success)
        assertEquals("66ed8cf8b5df891c9441fa20", response.sessionId)
        assertEquals(true, response.personalized)
        assertNotNull(response.answer)
        assertEquals("66ed8cf8b5df891c9441fa33", response.answer?.id)
        assertEquals("Pulsatilla 30C is suggested for heartburn worse after fatty meals.", response.answer?.answerText)
        assertEquals("Personalized Homeopathic Plan for your indigestion symptoms...", response.answer?.personalizedAnswer)
        assertEquals("Take 4 pills twice daily after meals.", response.answer?.dosageInstructions)
        assertNull(response.answer?.videoUrl)
    }

    @Test
    fun testFallbackPayload_lowConfidence_deserializesWithoutException() {
        val json = """
        {
            "success": true,
            "sessionId": "66ed8cf8b5df891c9441fa44",
            "matchConfident": false,
            "confidenceScore": 0.42,
            "intent": "direct_answer",
            "fallback": true,
            "message": "I could not find an exact match for your symptoms in our knowledge base.",
            "needsReviewId": "66ed8cf8b5df891c9441fa55",
            "matchCandidates": []
        }
        """.trimIndent()

        val response = gson.fromJson(json, ChatbotQueryResponse::class.java)

        assertTrue(response.success)
        assertEquals(false, response.matchConfident)
        assertEquals(true, response.fallback)
        assertEquals("I could not find an exact match for your symptoms in our knowledge base.", response.message)
        assertNull(response.answer)
    }

    @Test
    fun testPartialAndNullFields_deserializesGracefully() {
        val json = """
        {
            "success": true,
            "answer": {
                "answerText": "Only answerText present"
            }
        }
        """.trimIndent()

        val response = gson.fromJson(json, ChatbotQueryResponse::class.java)

        assertTrue(response.success)
        assertNotNull(response.answer)
        assertEquals("Only answerText present", response.answer?.answerText)
        assertNull(response.answer?.dosageInstructions)
        assertNull(response.answer?.homeRemedyText)
        assertNull(response.answer?.safetyDisclaimerText)
        assertNull(response.answer?.videoUrl)
        assertNull(response.sessionId)
        assertNull(response.confidenceScore)
    }

    @Test
    fun testBackendErrorPayload_deserializesGracefully() {
        val json = """
        {
            "success": false,
            "message": "Query text or voiceData is required"
        }
        """.trimIndent()

        val response = gson.fromJson(json, ChatbotQueryResponse::class.java)

        assertFalse(response.success)
        assertEquals("Query text or voiceData is required", response.message)
        assertNull(response.answer)
    }

    @Test
    fun testAdversarialPayload_extraUnexpectedFields_doesNotCrash() {
        val json = """
        {
            "success": true,
            "extraField1": 12345,
            "extraNested": { "foo": "bar", "arr": [1, 2, 3] },
            "answer": {
                "id": "some-id",
                "answerText": "Test remedy",
                "unexpectedProperty": "ignore me"
            }
        }
        """.trimIndent()

        val response = gson.fromJson(json, ChatbotQueryResponse::class.java)

        assertTrue(response.success)
        assertNotNull(response.answer)
        assertEquals("Test remedy", response.answer?.answerText)
    }

    @Test
    fun testMalformedAnswerField_stringInsteadOfObject_throwsJsonSyntaxException() {
        // If the backend returns "answer": "String remedy" (legacy format),
        // Gson MUST fail fast with JsonSyntaxException rather than corrupting state silently
        val legacyJson = """
        {
            "success": true,
            "answer": "Legacy string remedy name"
        }
        """.trimIndent()

        try {
            gson.fromJson(legacyJson, ChatbotQueryResponse::class.java)
            fail("Expected JsonSyntaxException when answer is a string instead of AnswerDto object")
        } catch (e: JsonSyntaxException) {
            // Expected: confirms that AnswerDto requires an object structure
            assertTrue(e.message?.contains("Expected BEGIN_OBJECT but was STRING") == true)
        }
    }
}
