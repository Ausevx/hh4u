package com.healinghands4u.presentation.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.healinghands4u.presentation.theme.AppIcons
import com.healinghands4u.presentation.theme.trustedTealColors

@Composable
fun VideoLink(
    url: String,
    label: String = "Watch Remedy Guide",
    onClick: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val tokens = MaterialTheme.trustedTealColors

    Surface(
        shape = RoundedCornerShape(50),
        color = tokens.surfaceTint.copy(alpha = 0.5f),
        border = BorderStroke(1.5.dp, tokens.accent),
        modifier = modifier
            .fillMaxWidth()
            .clickable { onClick(url) }
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 18.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center
        ) {
            Icon(
                imageVector = AppIcons.Play,
                contentDescription = null,
                tint = tokens.accent,
                modifier = Modifier.size(18.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = label,
                style = MaterialTheme.typography.labelMedium.copy(
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp
                ),
                color = tokens.accent
            )
        }
    }
}
