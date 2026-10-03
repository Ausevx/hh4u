package com.healinghands4u.presentation.assistant

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.healinghands4u.presentation.assistant.components.ChatComposer
import com.healinghands4u.presentation.assistant.components.ConsultationModeSheet
import com.healinghands4u.presentation.theme.trustedTealColors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WellnessAssistantScreen(
    initialQuery: String = "",
    onNavigateToClinic: () -> Unit,
    onNavigateToHistory: () -> Unit,
    onNavigateToProfile: () -> Unit,
    onSendQuery: (String, Boolean) -> Unit
) {
    val tokens = MaterialTheme.trustedTealColors
    val scrollState = rememberScrollState()

    var showModeSheet by remember { mutableStateOf(false) }
    var pendingQuery by remember { mutableStateOf("") }

    // If initialQuery is not blank (e.g. deep linked), trigger sheet immediately
    LaunchedEffect(initialQuery) {
        if (initialQuery.isNotBlank()) {
            pendingQuery = initialQuery
            showModeSheet = true
        }
    }

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
                        .padding(horizontal = 20.dp, vertical = 16.dp)
                        .statusBarsPadding(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = "Healing Hub 4U",
                        style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold),
                        color = tokens.accent
                    )

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        TextButton(
                            onClick = onNavigateToClinic,
                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp),
                            modifier = Modifier.height(36.dp)
                        ) {
                            Text(
                                text = "Clinic",
                                style = MaterialTheme.typography.labelLarge,
                                color = com.healinghands4u.presentation.theme.ClinicalTertiary
                            )
                        }

                        IconButton(
                            onClick = onNavigateToHistory,
                            modifier = Modifier.size(36.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.History,
                                contentDescription = "History",
                                tint = tokens.accent,
                                modifier = Modifier.size(22.dp)
                            )
                        }
                        
                        Spacer(modifier = Modifier.width(4.dp))

                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .clip(CircleShape)
                                .background(tokens.accent.copy(alpha = 0.1f))
                                .clickable(onClick = onNavigateToProfile),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.PersonOutline,
                                contentDescription = "Profile",
                                tint = tokens.accent,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                    }
                }
            }
        },
        bottomBar = {
            Box(
                modifier = Modifier
                    .background(tokens.bg)
                    .padding(bottom = 8.dp)
            ) {
                ChatComposer(
                    initialQuery = "",
                    onSend = { text ->
                        pendingQuery = text
                        showModeSheet = true
                    }
                )
            }
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .verticalScroll(scrollState)
                .padding(horizontal = 24.dp, vertical = 32.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Minimal Greeting Header
            Icon(
                imageVector = Icons.Default.Spa,
                contentDescription = null,
                tint = tokens.accent.copy(alpha = 0.8f),
                modifier = Modifier.size(48.dp)
            )
            
            Spacer(modifier = Modifier.height(24.dp))
            
            Text(
                text = "How can we support your wellness today?",
                style = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.Medium),
                color = tokens.ink,
                textAlign = TextAlign.Center
            )
            
            Spacer(modifier = Modifier.height(40.dp))

            // Suggestions Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Suggested inquiries",
                    style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.Bold),
                    color = tokens.accent
                )
                Spacer(modifier = Modifier.weight(1f))
                Icon(
                    imageVector = Icons.Default.AutoAwesome,
                    contentDescription = null,
                    tint = tokens.accent.copy(alpha = 0.5f),
                    modifier = Modifier.size(16.dp)
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Suggestions Grid (2x2)
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    SuggestionChip(
                        modifier = Modifier.weight(1f),
                        icon = Icons.Default.LocalDining,
                        title = "Acidity & Gas",
                        onClick = {
                            pendingQuery = "Why do I have acidity and gas almost every day?"
                            showModeSheet = true
                        }
                    )
                    SuggestionChip(
                        modifier = Modifier.weight(1f),
                        icon = Icons.Default.Bedtime,
                        title = "Better Sleep",
                        onClick = {
                            pendingQuery = "Why am I having trouble sleeping?"
                            showModeSheet = true
                        }
                    )
                }
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    SuggestionChip(
                        modifier = Modifier.weight(1f),
                        icon = Icons.Default.FavoriteBorder,
                        title = "Blood Pressure",
                        onClick = {
                            pendingQuery = "Can I control my BP naturally?"
                            showModeSheet = true
                        }
                    )
                    SuggestionChip(
                        modifier = Modifier.weight(1f),
                        icon = Icons.Default.ChildCare,
                        title = "Child Immunity",
                        onClick = {
                            pendingQuery = "What foods should I give my child for healthy growth?"
                            showModeSheet = true
                        }
                    )
                }
            }
        }
    }

    if (showModeSheet) {
        ConsultationModeSheet(
            queryText = pendingQuery,
            onDismissRequest = { showModeSheet = false },
            onProceed = { isGuided ->
                showModeSheet = false
                onSendQuery(pendingQuery, isGuided)
                pendingQuery = ""
            }
        )
    }
}

@Composable
fun SuggestionChip(
    modifier: Modifier = Modifier,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    onClick: () -> Unit
) {
    val tokens = MaterialTheme.trustedTealColors
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = tokens.surface,
        border = androidx.compose.foundation.BorderStroke(1.dp, tokens.line.copy(alpha = 0.5f)),
        modifier = modifier.clickable(onClick = onClick)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = tokens.accent,
                modifier = Modifier.size(20.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Text(
                text = title,
                style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold),
                color = tokens.ink,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}
