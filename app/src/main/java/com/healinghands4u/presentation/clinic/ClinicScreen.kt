package com.healinghands4u.presentation.clinic

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.healinghands4u.R
import com.healinghands4u.presentation.auth.AuthViewModel
import com.healinghands4u.presentation.theme.AppIcons
import com.healinghands4u.presentation.theme.trustedTealColors

private val CardBorderCoral = Color(0xFFF28B82)
private val CardBgWarm = Color(0xFFFFFDF9)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ClinicScreen(
    onBackClick: () -> Unit,
    onNavigateToPlanner: () -> Unit,
    onNavigateToConditions: () -> Unit,
    authViewModel: AuthViewModel = hiltViewModel()
) {
    val tokens = MaterialTheme.trustedTealColors
    val scrollState = rememberScrollState()
    val session by authViewModel.session.collectAsState()
    val displayName = session?.user?.displayName?.takeIf { it.isNotBlank() } ?: "User"

    Scaffold(
        containerColor = tokens.bg,
        topBar = {
            Surface(
                color = tokens.bg,
                shadowElevation = 0.dp
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .statusBarsPadding()
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        IconButton(
                            onClick = onBackClick,
                            modifier = Modifier.size(36.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.ArrowBack,
                                contentDescription = "Back",
                                tint = tokens.ink
                            )
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Welcome : $displayName",
                            style = MaterialTheme.typography.titleMedium.copy(
                                fontWeight = FontWeight.SemiBold,
                                color = CardBorderCoral
                            )
                        )
                    }

                    // Logo Icon in circular badge
                    Box(
                        modifier = Modifier
                            .size(40.dp)
                            .clip(CircleShape)
                            .background(tokens.surface)
                            .border(1.dp, tokens.line, CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = AppIcons.Leaf,
                            contentDescription = "Healing Hands4U Logo",
                            tint = tokens.accent,
                            modifier = Modifier.size(24.dp)
                        )
                    }
                }
            }
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .verticalScroll(scrollState)
                .padding(horizontal = 20.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(8.dp))

            // Main Branding Title
            Text(
                text = "Healing Hands4U",
                style = MaterialTheme.typography.headlineLarge.copy(
                    fontWeight = FontWeight.Bold,
                    fontSize = 28.sp
                ),
                color = tokens.ink,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(18.dp))

            // Card 1: Holistic Healing (navigates to Personalized Planner)
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(20.dp))
                    .clickable(onClick = onNavigateToPlanner),
                shape = RoundedCornerShape(20.dp),
                border = BorderStroke(1.5.dp, CardBorderCoral),
                colors = CardDefaults.cardColors(containerColor = CardBgWarm),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(18.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = "Dr. Anjali Jariwala's\nHolistic Healing Combining\nHomeopath, Naturopathy\nand Breathing",
                        style = MaterialTheme.typography.bodyLarge.copy(
                            fontWeight = FontWeight.Medium,
                            lineHeight = 22.sp
                        ),
                        color = tokens.ink,
                        modifier = Modifier.weight(1f)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .border(1.5.dp, CardBorderCoral, RoundedCornerShape(8.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.ChevronRight,
                            contentDescription = "Open Planner",
                            tint = CardBorderCoral,
                            modifier = Modifier.size(24.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Card 2: Chronic & Lifestyle Diseases (navigates to Disease Solutions)
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(20.dp))
                    .clickable(onClick = onNavigateToConditions),
                shape = RoundedCornerShape(20.dp),
                border = BorderStroke(1.5.dp, CardBorderCoral),
                colors = CardDefaults.cardColors(containerColor = CardBgWarm),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(18.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = "One Stop Solution for\nLife Style Disease\nChronic Illness\nKids Behavior Issues",
                        style = MaterialTheme.typography.bodyLarge.copy(
                            fontWeight = FontWeight.Medium,
                            lineHeight = 22.sp
                        ),
                        color = tokens.ink,
                        modifier = Modifier.weight(1f)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .border(1.5.dp, CardBorderCoral, RoundedCornerShape(8.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.ChevronRight,
                            contentDescription = "Open Disease Solutions",
                            tint = CardBorderCoral,
                            modifier = Modifier.size(24.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Center Hero Illustration: Meditating Woman with 4 Badges
            Card(
                modifier = Modifier
                    .fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                border = BorderStroke(1.dp, tokens.line),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
            ) {
                Image(
                    painter = painterResource(id = R.drawable.img_clinic_meditation),
                    contentDescription = "Holistic Meditation & Lifestyle Healing",
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 280.dp),
                    contentScale = ContentScale.FillWidth
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Footer Appointment Section
            ClinicAppointmentFooter()

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}
