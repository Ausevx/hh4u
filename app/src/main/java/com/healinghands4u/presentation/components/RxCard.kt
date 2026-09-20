package com.healinghands4u.presentation.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
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
import com.healinghands4u.presentation.theme.SoraFontFamily
import com.healinghands4u.presentation.theme.trustedTealColors

@Composable
fun RxCard(
    remedyName: String,
    dosage: String,
    homeRemedy: String?,
    safetyDisclaimer: String,
    modifier: Modifier = Modifier
) {
    val tokens = MaterialTheme.trustedTealColors

    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        border = BorderStroke(1.dp, tokens.line),
        colors = CardDefaults.cardColors(
            containerColor = tokens.surface
        )
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            // Header in --surface-tint
            Surface(
                color = tokens.surfaceTint,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = tokens.accent.copy(alpha = 0.15f),
                        modifier = Modifier.size(44.dp)
                    ) {
                        Icon(
                            imageVector = AppIcons.Pills,
                            contentDescription = null,
                            tint = tokens.accent,
                            modifier = Modifier
                                .padding(10.dp)
                                .size(24.dp)
                        )
                    }

                    Spacer(modifier = Modifier.width(12.dp))

                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Prescribed Homeopathic Remedy",
                            style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                            color = tokens.accent
                        )
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = remedyName,
                            style = MaterialTheme.typography.titleLarge.copy(
                                fontFamily = SoraFontFamily,
                                fontWeight = FontWeight.Bold,
                                fontSize = 18.sp
                            ),
                            color = tokens.ink
                        )
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = "Recommended Dosage",
                            style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.SemiBold),
                            color = tokens.inkDim
                        )
                        Text(
                            text = dosage,
                            style = MaterialTheme.typography.bodyMedium.copy(
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 14.sp
                            ),
                            color = tokens.inkDim
                        )
                    }
                }
            }

            // Body in --surface
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
            ) {
                if (!homeRemedy.isNullOrBlank()) {
                    Text(
                        text = "Home Remedy",
                        style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold),
                        color = tokens.ink
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = homeRemedy,
                        style = MaterialTheme.typography.bodyMedium,
                        color = tokens.inkDim
                    )
                    Spacer(modifier = Modifier.height(14.dp))
                }

                // Safety Warning Box in --warn-bg and --warn-ink
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = tokens.warnBg,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Warning,
                            contentDescription = "Safety Alert",
                            tint = tokens.warnInk,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Text(
                            text = safetyDisclaimer,
                            style = MaterialTheme.typography.bodySmall.copy(
                                fontWeight = FontWeight.Medium,
                                fontSize = 12.sp
                            ),
                            color = tokens.warnInk
                        )
                    }
                }
            }
        }
    }
}
