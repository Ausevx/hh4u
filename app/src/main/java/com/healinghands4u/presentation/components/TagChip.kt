package com.healinghands4u.presentation.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.healinghands4u.presentation.theme.trustedTealColors

@Composable
fun TagChip(
    text: String,
    isAccentTint: Boolean = false,
    selected: Boolean = false,
    onClick: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    val tokens = MaterialTheme.trustedTealColors
    val isHighlighted = selected || isAccentTint

    val containerColor = if (selected) {
        tokens.primaryContainerColor()
    } else if (isAccentTint) {
        tokens.surfaceTint
    } else {
        tokens.surface
    }

    val contentColor = if (isHighlighted) tokens.accent else tokens.inkDim
    val borderColor = if (selected) tokens.accent else if (isAccentTint) tokens.accent.copy(alpha = 0.35f) else tokens.line

    val chipModifier = if (onClick != null) {
        modifier.clickable(onClick = onClick)
    } else {
        modifier
    }

    Surface(
        shape = RoundedCornerShape(50),
        color = containerColor,
        border = BorderStroke(1.dp, borderColor),
        modifier = chipModifier
    ) {
        Box(modifier = Modifier.padding(horizontal = 14.dp, vertical = 7.dp)) {
            Text(
                text = text,
                style = MaterialTheme.typography.labelMedium.copy(
                    fontWeight = if (isHighlighted) FontWeight.Bold else FontWeight.Medium,
                    fontSize = 12.sp
                ),
                color = contentColor
            )
        }
    }
}

private fun com.healinghands4u.presentation.theme.TrustedTealColors.primaryContainerColor(): androidx.compose.ui.graphics.Color {
    return surfaceTint
}
