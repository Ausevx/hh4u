package com.healinghands4u

import com.healinghands4u.presentation.components.answerVideoLinks
import org.junit.Assert.*
import org.junit.Test

class AnswerPresentationTest {
    @Test fun clinicalReasonUsesDedicatedSavedField() {
        val saved = "Saved clinical reason.\n\nSecond clinical paragraph."
        val sections = com.healinghands4u.presentation.components.adviceSections("Hello!\n\nI am Dr.\n\nAdvice", saved, "Saved remedy")
        assertEquals(saved, sections.reason)
        assertNull(sections.unstructuredAnswer)
    }
    @Test fun missingReasonNeverUsesGreetingAsClinicalReason() {
        val answer = "Hello!\n\nI am Dr.\n\nAdvice"
        val sections = com.healinghands4u.presentation.components.adviceSections(answer, null, "Saved remedy")
        assertNull(sections.reason)
        assertEquals(answer, sections.unstructuredAnswer)
    }
    @Test fun findsBothVideosInSavedAnswer() {
        val first = "https://youtu.be/abcdefghijk"
        val second = "https://www.youtube.com/watch?v=lmnopqrstuv"
        assertEquals(listOf(first, second), answerVideoLinks("Advice\n$first\n$second", null))
    }
    @Test fun repeatedVideoFieldDoesNotCreateDuplicatePlayer() {
        assertEquals(1, answerVideoLinks("https://youtu.be/abcdefghijk", "https://youtube.com/watch?v=abcdefghijk").size)
    }
    @Test fun noLinkMeansNoPlayer() {
        assertTrue(answerVideoLinks("Saved advice without a video.", null).isEmpty())
    }
}
