package com.healinghands4u.presentation.planner

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.SelfImprovement
import androidx.compose.material.icons.filled.Spa
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.healinghands4u.presentation.common.DoctorContactFooter
import com.healinghands4u.presentation.common.TestTags
import com.healinghands4u.presentation.components.BrandRow
import com.healinghands4u.presentation.components.MiniCard
import com.healinghands4u.presentation.components.PlanStep
import com.healinghands4u.presentation.theme.AppIcons
import com.healinghands4u.presentation.theme.SoraFontFamily
import com.healinghands4u.presentation.theme.trustedTealColors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PlannerScreen(
    modifier: Modifier = Modifier,
    onBackClick: () -> Unit = {}
) {
    var morningChecked by remember { mutableStateOf(false) }
    var afternoonChecked by remember { mutableStateOf(false) }
    var eveningChecked by remember { mutableStateOf(false) }

    val completedCount = (if (morningChecked) 1 else 0) + (if (afternoonChecked) 1 else 0) + (if (eveningChecked) 1 else 0)

    val scrollState = rememberScrollState()
    val tokens = MaterialTheme.trustedTealColors

    Scaffold(
        modifier = modifier.fillMaxSize(),
        containerColor = tokens.bg,
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "Personalized Planner",
                        style = MaterialTheme.typography.titleLarge.copy(
                            fontFamily = SoraFontFamily,
                            fontWeight = FontWeight.Bold
                        ),
                        color = tokens.ink,
                        modifier = Modifier.testTag(TestTags.PLANNER_TITLE)
                    )
                },
                navigationIcon = {
                    IconButton(
                        onClick = onBackClick,
                        modifier = Modifier.testTag(TestTags.PLANNER_BACK_BUTTON)
                    ) {
                        Icon(
                            imageVector = Icons.Default.ArrowBack,
                            contentDescription = "Back",
                            tint = tokens.ink
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = tokens.surface
                )
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .verticalScroll(scrollState)
                .padding(16.dp),
            verticalArrangement = Arrangement.Top
        ) {
            // Brand Wordmark
            BrandRow(
                title = "Personalized Health Plan",
                subtitle = "Sequenced homeopathic remedies, breathing & lifestyle guidance"
            )

            Spacer(modifier = Modifier.height(12.dp))

            // 2-up MiniCard Metrics Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                MiniCard(
                    label = "Doses Completed",
                    value = "$completedCount of 3",
                    meta = "${(completedCount * 100) / 3}% adhered today",
                    icon = AppIcons.Pills,
                    modifier = Modifier.weight(1f)
                )
                MiniCard(
                    label = "Active Regimen",
                    value = "3 Remedies",
                    meta = "Scheduled daily",
                    icon = AppIcons.Calendar,
                    modifier = Modifier.weight(1f)
                )
            }

            Spacer(modifier = Modifier.height(20.dp))

            Text(
                text = "Today's Remedy Schedule",
                style = MaterialTheme.typography.titleMedium.copy(
                    fontFamily = SoraFontFamily,
                    fontWeight = FontWeight.Bold
                ),
                color = tokens.ink
            )
            Text(
                text = "Track your prescribed natural remedies and dosages",
                style = MaterialTheme.typography.bodySmall,
                color = tokens.inkDim
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Sequenced Schedule Section
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag(TestTags.PLANNER_SCHEDULE_SECTION),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Step 1: Morning
                PlanStep(
                    stepNumber = 1,
                    timeSlot = "Morning (Before Breakfast)",
                    title = "Arnica Montana 30C",
                    dosage = "4 pills, dissolve under tongue",
                    description = "Take on clean palate, 30 mins before breakfast",
                    isCompleted = morningChecked,
                    onCompletedChange = { morningChecked = it }
                )

                // Step 2: Afternoon
                PlanStep(
                    stepNumber = 2,
                    timeSlot = "Afternoon (Post Lunch)",
                    title = "Nux Vomica 200C",
                    dosage = "4 pills",
                    description = "Take 30 mins after meal with sips of water",
                    isCompleted = afternoonChecked,
                    onCompletedChange = { afternoonChecked = it }
                )

                // Step 3: Bedtime
                PlanStep(
                    stepNumber = 3,
                    timeSlot = "Night (Bedtime)",
                    title = "Passiflora Incarnata Mother Tincture (Q)",
                    dosage = "10 drops in 1/4 cup warm water",
                    description = "Take right before sleeping for restorative rest",
                    isCompleted = eveningChecked,
                    onCompletedChange = { eveningChecked = it }
                )
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Holistic Modules: Breathing & Yoga
            Text(
                text = "Holistic Wellness Practices",
                style = MaterialTheme.typography.titleMedium.copy(
                    fontFamily = SoraFontFamily,
                    fontWeight = FontWeight.Bold
                ),
                color = tokens.ink
            )

            Spacer(modifier = Modifier.height(10.dp))

            // Breathing Techniques Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp),
                border = BorderStroke(1.dp, tokens.line),
                colors = CardDefaults.cardColors(containerColor = tokens.surface)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = tokens.surfaceTint,
                        modifier = Modifier.size(42.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Spa,
                            contentDescription = null,
                            tint = tokens.accent,
                            modifier = Modifier.padding(10.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Breathing Technique (Pranayama)",
                            style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
                            color = tokens.ink
                        )
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = "Anulom Vilom Pranayama (10 mins morning & evening) to regulate autonomic nervous system.",
                            style = MaterialTheme.typography.bodySmall,
                            color = tokens.inkDim
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Yoga Exercise Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp),
                border = BorderStroke(1.dp, tokens.line),
                colors = CardDefaults.cardColors(containerColor = tokens.surface)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = tokens.surfaceTint,
                        modifier = Modifier.size(42.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.SelfImprovement,
                            contentDescription = null,
                            tint = tokens.accent,
                            modifier = Modifier.padding(10.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Restorative Yoga Postures",
                            style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
                            color = tokens.ink
                        )
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = "Balasana (Child's Pose) & Sukhasana (15 mins) for spinal relaxation and diaphragmatic ease.",
                            style = MaterialTheme.typography.bodySmall,
                            color = tokens.inkDim
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Homeopathic Dietary Precautions Card
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag(TestTags.PLANNER_DIETARY_CARD),
                shape = RoundedCornerShape(16.dp),
                border = BorderStroke(1.dp, tokens.line),
                colors = CardDefaults.cardColors(
                    containerColor = tokens.surfaceTint
                )
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Info,
                            contentDescription = "Dietary Guidelines",
                            tint = tokens.accent,
                            modifier = Modifier.size(22.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Homeopathic Dietary Precautions",
                            style = MaterialTheme.typography.titleSmall.copy(
                                fontFamily = SoraFontFamily,
                                fontWeight = FontWeight.Bold
                            ),
                            color = tokens.ink
                        )
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    Text(
                        text = "• Avoid raw onion, garlic, and menthol 30 mins before and after remedy doses.\n" +
                                "• Refrain from strong coffee or camphor-infused ointments during treatment.\n" +
                                "• Keep remedies stored away from direct sunlight, heat, and strong odors.\n" +
                                "• Dissolve pills sublingually without handling directly with fingers.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = tokens.inkDim
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Daily Affirmation
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = tokens.surface),
                border = BorderStroke(1.dp, tokens.line)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(14.dp)
                ) {
                    Text(
                        text = "DAILY AFFIRMATION",
                        style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                        color = tokens.accent
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "\"My body possesses innate healing energy. Each day brings vitality and balance.\"",
                        style = MaterialTheme.typography.bodyMedium.copy(
                            fontStyle = androidx.compose.ui.text.font.FontStyle.Italic,
                            fontSize = 14.sp
                        ),
                        color = tokens.ink
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Embedded Doctor Contact Footer
            DoctorContactFooter()

            Spacer(modifier = Modifier.height(20.dp))
        }
    }
}
