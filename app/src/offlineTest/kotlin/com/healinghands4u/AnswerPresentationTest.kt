package com.healinghands4u

import com.healinghands4u.presentation.components.answerVideoLinks
import org.junit.Assert.*
import org.junit.Test

class AnswerPresentationTest {
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
