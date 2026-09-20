package com.healinghands4u.presentation.home

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.healinghands4u.config.BrandingConfig
import com.healinghands4u.presentation.common.DoctorContactFooter
import com.healinghands4u.presentation.common.TestTags
import com.healinghands4u.presentation.components.BrandRow
import com.healinghands4u.presentation.components.MiniCard
import com.healinghands4u.presentation.components.TabBar
import com.healinghands4u.presentation.components.TipCard
import com.healinghands4u.presentation.navigation.Screen
import com.healinghands4u.presentation.theme.AppIcons
import com.healinghands4u.presentation.theme.SoraFontFamily
import com.healinghands4u.presentation.theme.trustedTealColors

import androidx.hilt.navigation.compose.hiltViewModel

@Composable
fun HomeScreen(
    modifier: Modifier = Modifier,
    onConsultationClick: () -> Unit = {},
    onPlannerClick: () -> Unit = {},
    onDiseaseListClick: () -> Unit = {},
    viewModel: HomeViewModel = hiltViewModel()
) {
    val scrollState = rememberScrollState()
    val tokens = MaterialTheme.trustedTealColors

    Scaffold(
        modifier = modifier.fillMaxSize(),
        containerColor = tokens.bg,
        bottomBar = {
            TabBar(
                currentRoute = Screen.Home.route,
                onTabSelected = { route ->
                    when (route) {
                        Screen.DiseaseList.route -> onDiseaseListClick()
                        Screen.Planner.route -> onPlannerClick()
                    }
                },
                onFabClick = onConsultationClick
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .verticalScroll(scrollState)
                .padding(horizontal = 18.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.Top
        ) {
            // BrandRow Header
            BrandRow(
                title = BrandingConfig.APP_NAME,
                subtitle = "Combining Homeopathy, Naturopathy and Breathing"
            )

            Spacer(modifier = Modifier.height(10.dp))

            // Welcome Banner
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag(TestTags.HOME_WELCOME_BANNER),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(
                    containerColor = tokens.surfaceTint
                )
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(18.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Welcome to ${BrandingConfig.APP_NAME}",
                            style = MaterialTheme.typography.titleLarge.copy(
                                fontFamily = SoraFontFamily,
                                fontWeight = FontWeight.Bold
                            ),
                            color = tokens.ink
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = "Dr. Anjali Jariwala's Holistic Healing Combining Homeopathy, Naturopathy and Breathing",
                            style = MaterialTheme.typography.bodyMedium,
                            color = tokens.inkDim
                        )
                    }

                    Spacer(modifier = Modifier.width(12.dp))

                    Surface(
                        shape = CircleShape,
                        color = tokens.accent.copy(alpha = 0.15f),
                        modifier = Modifier.size(52.dp)
                    ) {
                        Icon(
                            imageVector = AppIcons.Leaf,
                            contentDescription = "Healing Leaf",
                            tint = tokens.accent,
                            modifier = Modifier
                                .padding(12.dp)
                                .size(28.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Holistic Daily Tip
            TipCard(
                category = viewModel.tipCategory,
                body = viewModel.tipBody,
                onReadMoreClick = onPlannerClick
            )

            Spacer(modifier = Modifier.height(16.dp))

            // 2-up MiniCard Metrics Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                MiniCard(
                    label = "Today's Remedies",
                    value = "3 Active",
                    meta = "Next at 2:00 PM",
                    icon = AppIcons.Pills,
                    onClick = onPlannerClick,
                    modifier = Modifier.weight(1f)
                )
                MiniCard(
                    label = "Adherence Streak",
                    value = "5 Days",
                    meta = "80% completed",
                    icon = AppIcons.Calendar,
                    onClick = onPlannerClick,
                    modifier = Modifier.weight(1f)
                )
            }

            Spacer(modifier = Modifier.height(20.dp))

            Text(
                text = "Core Health Services",
                style = MaterialTheme.typography.titleMedium.copy(
                    fontFamily = SoraFontFamily,
                    fontWeight = FontWeight.Bold
                ),
                color = tokens.ink
            )

            Spacer(modifier = Modifier.height(12.dp))

            // 3 Main Navigation Cards
            // 1. AI Homeopathic Consultation
            HomeNavigationCard(
                title = "AI Homeopathic Consultation",
                subtitle = "Chat with Dr. Anjali Now to get quick resolution of your queries",
                icon = AppIcons.Chat,
                testTag = TestTags.HOME_CARD_AI_CONSULT,
                onClick = onConsultationClick
            )

            Spacer(modifier = Modifier.height(12.dp))

            // 2. Personalized Health Planner
            HomeNavigationCard(
                title = "Personalized Health Planner",
                subtitle = "Your customized daily remedy schedule & dosage reminders",
                icon = AppIcons.Calendar,
                testTag = TestTags.HOME_CARD_PLANNER,
                onClick = onPlannerClick
            )

            Spacer(modifier = Modifier.height(12.dp))

            // 3. Disease Directory & Remedy Guide
            HomeNavigationCard(
                title = "Disease Directory & Remedy Guide",
                subtitle = "Cure Lifestyle Disease, Chronic Illness, Kids Behavior",
                icon = AppIcons.Leaf,
                testTag = TestTags.HOME_CARD_DISEASE_LIST,
                onClick = onDiseaseListClick
            )

            Spacer(modifier = Modifier.height(24.dp))

            // Embedded Doctor Contact Footer
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag(TestTags.HOME_DOCTOR_FOOTER)
            ) {
                DoctorContactFooter()
            }

            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

@Composable
private fun HomeNavigationCard(
    title: String,
    subtitle: String,
    icon: ImageVector,
    testTag: String,
    onClick: () -> Unit
) {
    val tokens = MaterialTheme.trustedTealColors

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .testTag(testTag)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, tokens.line),
        colors = CardDefaults.cardColors(
            containerColor = tokens.surface
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = tokens.surfaceTint,
                modifier = Modifier.size(48.dp)
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = title,
                    tint = tokens.accent,
                    modifier = Modifier
                        .padding(12.dp)
                        .size(24.dp)
                )
            }

            Spacer(modifier = Modifier.width(14.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontFamily = SoraFontFamily,
                        fontWeight = FontWeight.SemiBold
                    ),
                    color = tokens.ink
                )
                Spacer(modifier = Modifier.height(3.dp))
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.bodySmall,
                    color = tokens.inkDim
                )
            }

            Icon(
                imageVector = Icons.Default.ChevronRight,
                contentDescription = "Navigate to $title",
                tint = tokens.inkDim,
                modifier = Modifier.size(22.dp)
            )
        }
    }
}
