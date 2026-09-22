package com.healinghands4u.presentation.assistant.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.EnergySavingsLeaf
import androidx.compose.material.icons.filled.Explore
import androidx.compose.material.icons.filled.LocalPharmacy
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.healinghands4u.presentation.theme.trustedTealColors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ConsultationModeSheet(
    queryText: String,
    onDismissRequest: () -> Unit,
    onProceed: (Boolean) -> Unit
) {
    var isGuidedSelected by remember { mutableStateOf(true) }
    val tokens = MaterialTheme.trustedTealColors

    ModalBottomSheet(
        onDismissRequest = onDismissRequest,
        containerColor = tokens.surface,
        dragHandle = { BottomSheetDefaults.DragHandle() },
        shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp)
                .padding(bottom = 48.dp)
        ) {
            // Header
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.EnergySavingsLeaf,
                    contentDescription = null,
                    tint = tokens.accent,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = "AYURVEDIC TRIAGE",
                    style = MaterialTheme.typography.labelSmall,
                    color = tokens.accent,
                    letterSpacing = androidx.compose.ui.unit.TextUnit(0.05f, androidx.compose.ui.unit.TextUnitType.Em)
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = "How would you like to continue?",
                style = MaterialTheme.typography.headlineMedium,
                color = tokens.accent
            )

            Spacer(modifier = Modifier.height(4.dp))

            Text(
                text = "Choose the type of guidance you prefer for your query.",
                style = MaterialTheme.typography.bodyMedium,
                color = tokens.inkDim
            )

            Spacer(modifier = Modifier.height(24.dp))

            // Guided Option
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(if (isGuidedSelected) tokens.surfaceTint.copy(alpha = 0.4f) else tokens.surfaceTint.copy(alpha = 0.1f))
                    .clickable { isGuidedSelected = true }
                    .padding(16.dp)
            ) {
                Column {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.Top
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(48.dp)
                                    .clip(CircleShape)
                                    .background(tokens.surfaceTint)
                                    .padding(12.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Explore,
                                    contentDescription = null,
                                    tint = tokens.accent
                                )
                            }

                            Spacer(modifier = Modifier.width(12.dp))

                            Column {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Surface(
                                        shape = CircleShape,
                                        color = tokens.accent,
                                        contentColor = tokens.accentInk
                                    ) {
                                        Row(
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Icon(
                                                imageVector = Icons.Default.AutoAwesome,
                                                contentDescription = null,
                                                modifier = Modifier.size(12.dp)
                                            )
                                            Spacer(modifier = Modifier.width(4.dp))
                                            Text("Recommended", style = MaterialTheme.typography.labelSmall)
                                        }
                                    }
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("~2 mins", style = MaterialTheme.typography.labelSmall, color = tokens.inkDim)
                                }
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "Start guided consultation",
                                    style = MaterialTheme.typography.titleMedium,
                                    color = tokens.accent
                                )
                            }
                        }

                        // Radio
                        Box(
                            modifier = Modifier
                                .size(24.dp)
                                .clip(CircleShape)
                                .background(if (isGuidedSelected) tokens.accent else Color.Transparent)
                                .border(1.dp, if (isGuidedSelected) Color.Transparent else tokens.line, CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            if (isGuidedSelected) {
                                Icon(
                                    imageVector = Icons.Default.Check,
                                    contentDescription = null,
                                    tint = tokens.accentInk,
                                    modifier = Modifier.size(16.dp)
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = "Answer 3 short questions to balance your doshas for targeted relief.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = tokens.ink,
                        modifier = Modifier.padding(start = 60.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Direct Answer Option
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(if (!isGuidedSelected) tokens.surfaceTint.copy(alpha = 0.4f) else tokens.surfaceTint.copy(alpha = 0.1f))
                    .clickable { isGuidedSelected = false }
                    .padding(16.dp)
            ) {
                Column {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.Top
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(48.dp)
                                    .clip(CircleShape)
                                    .background(com.healinghands4u.presentation.theme.ClinicalTertiaryDark)
                                    .padding(12.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Bolt,
                                    contentDescription = null,
                                    tint = com.healinghands4u.presentation.theme.ClinicalOnTertiaryDark
                                )
                            }

                            Spacer(modifier = Modifier.width(12.dp))

                            Column {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Surface(
                                        shape = CircleShape,
                                        color = com.healinghands4u.presentation.theme.ClinicalTertiaryContainer,
                                        contentColor = com.healinghands4u.presentation.theme.ClinicalOnTertiaryContainer
                                    ) {
                                        Row(
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Icon(
                                                imageVector = Icons.Default.Bolt,
                                                contentDescription = null,
                                                modifier = Modifier.size(12.dp)
                                            )
                                            Spacer(modifier = Modifier.width(4.dp))
                                            Text("Quick", style = MaterialTheme.typography.labelSmall)
                                        }
                                    }
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("Instant", style = MaterialTheme.typography.labelSmall, color = tokens.inkDim)
                                }
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "Get a direct answer",
                                    style = MaterialTheme.typography.titleMedium,
                                    color = tokens.ink
                                )
                            }
                        }

                        // Radio
                        Box(
                            modifier = Modifier
                                .size(24.dp)
                                .clip(CircleShape)
                                .background(if (!isGuidedSelected) tokens.accent else Color.Transparent)
                                .border(1.dp, if (!isGuidedSelected) Color.Transparent else tokens.line, CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            if (!isGuidedSelected) {
                                Icon(
                                    imageVector = Icons.Default.Check,
                                    contentDescription = null,
                                    tint = tokens.accentInk,
                                    modifier = Modifier.size(16.dp)
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = "View quick, curated wellness guidance without personalizing questions.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = tokens.inkDim,
                        modifier = Modifier.padding(start = 60.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(32.dp))

            Button(
                onClick = { onProceed(isGuidedSelected) },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp),
                shape = CircleShape,
                colors = ButtonDefaults.buttonColors(containerColor = tokens.accent, contentColor = tokens.accentInk)
            ) {
                Text(
                    text = if (isGuidedSelected) "Proceed with Guided Consultation" else "Show Direct Answer",
                    style = MaterialTheme.typography.labelLarge
                )
            }
        }
    }
}
