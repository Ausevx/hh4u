package com.healinghands4u.presentation.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.healinghands4u.presentation.theme.trustedTealColors

@Composable
fun ChatBubble(
    message: String,
    isUser: Boolean,
    timestamp: String? = null,
    modifier: Modifier = Modifier
) {
    val tokens = MaterialTheme.trustedTealColors

    val bubbleShape = if (isUser) {
        RoundedCornerShape(topStart = 14.dp, topEnd = 14.dp, bottomStart = 14.dp, bottomEnd = 2.dp)
    } else {
        RoundedCornerShape(topStart = 14.dp, topEnd = 14.dp, bottomStart = 2.dp, bottomEnd = 14.dp)
    }

    val bubbleColor = if (isUser) tokens.accent else tokens.surface
    val textColor = if (isUser) tokens.accentInk else tokens.ink

    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = if (isUser) Arrangement.End else Arrangement.Start
    ) {
        Column(
            horizontalAlignment = if (isUser) Alignment.End else Alignment.Start,
            modifier = Modifier.widthIn(max = 300.dp)
        ) {
            Surface(
                shape = bubbleShape,
                color = bubbleColor,
                shadowElevation = 1.dp
            ) {
                Box(modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp)) {
                    Text(
                        text = message.replace(Regex("\\*\\*|\\*"), "").replace(Regex("^#+\\s*", RegexOption.MULTILINE), ""),
                        style = MaterialTheme.typography.bodyLarge.copy(fontSize = 15.sp),
                        color = textColor
                    )
                }
            }

            if (!timestamp.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = timestamp,
                    style = MaterialTheme.typography.bodySmall.copy(fontSize = 10.sp),
                    color = tokens.inkDim,
                    modifier = Modifier.padding(horizontal = 4.dp)
                )
            }
        }
    }
}
