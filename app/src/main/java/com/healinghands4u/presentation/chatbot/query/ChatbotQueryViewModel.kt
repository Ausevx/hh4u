package com.healinghands4u.presentation.chatbot.query

import androidx.lifecycle.ViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import com.healinghands4u.presentation.theme.AppIcons
import androidx.compose.ui.graphics.vector.ImageVector

data class QuickReplyItemUI(val label: String, val query: String, val icon: ImageVector)

@HiltViewModel
class ChatbotQueryViewModel @Inject constructor() : ViewModel() {
    val quickReplies = listOf(
        QuickReplyItemUI("Acidity & Heartburn", "I am suffering acidity and heartburn", AppIcons.Pills),
        QuickReplyItemUI("Throbbing Headache", "I have severe throbbing headache and migraine", AppIcons.Pulse),
        QuickReplyItemUI("Sneezing & Allergy", "I am having continuous sneezing and allergic cold", AppIcons.Leaf),
        QuickReplyItemUI("Sleep Restlessness", "I cannot sleep well and feel restless at night", AppIcons.Calendar)
    )
}
