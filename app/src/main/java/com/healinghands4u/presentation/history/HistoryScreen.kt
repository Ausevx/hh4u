package com.healinghands4u.presentation.history

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.healinghands4u.data.remote.ChatHistoryItemDto
import com.healinghands4u.presentation.theme.ClinicalTertiary
import com.healinghands4u.presentation.theme.trustedTealColors
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

private fun isHiltAvailable(context: android.content.Context): Boolean {
    var ctx: android.content.Context? = context
    while (ctx != null) {
        if (ctx is dagger.hilt.internal.GeneratedComponentManager<*> ||
            ctx is dagger.hilt.internal.GeneratedComponentManagerHolder ||
            ctx is dagger.hilt.internal.GeneratedComponent
        ) {
            return true
        }
        ctx = if (ctx is android.content.ContextWrapper) ctx.baseContext else null
    }
    return false
}

private fun formatHistoryDate(rawDate: String?): String {
    if (rawDate.isNullOrBlank()) return ""
    return try {
        val instant = Instant.parse(rawDate)
        val zdt = instant.atZone(ZoneId.systemDefault())
        val formatter = DateTimeFormatter.ofPattern("MMM dd, yyyy · hh:mm a")
        zdt.format(formatter)
    } catch (_: Exception) {
        rawDate.take(10)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HistoryScreen(
    onBackClick: () -> Unit,
    onNavigateToLogin: () -> Unit,
    onSelectQuery: (String, Boolean) -> Unit = { _, _ -> },
    viewModel: HistoryViewModel? = null
) {
    val context = LocalContext.current
    val hasHilt = remember(context) { isHiltAvailable(context) }
    val actualViewModel: HistoryViewModel? = viewModel ?: if (hasHilt) {
        hiltViewModel<HistoryViewModel>()
    } else {
        null
    }

    val tokens = MaterialTheme.trustedTealColors
    val uiState by actualViewModel?.uiState?.collectAsState() ?: remember { mutableStateOf(HistoryUiState.NotLoggedIn) }

    LaunchedEffect(Unit) {
        actualViewModel?.loadHistory()
    }

    Scaffold(
        containerColor = tokens.bg,
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "Conversation History",
                        style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold),
                        color = tokens.accent
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(
                            imageVector = Icons.Default.ArrowBack,
                            contentDescription = "Back",
                            tint = tokens.accent
                        )
                    }
                },
                actions = {
                    if (uiState is HistoryUiState.Success || uiState is HistoryUiState.Empty) {
                        IconButton(onClick = { actualViewModel?.loadHistory() }) {
                            Icon(
                                imageVector = Icons.Default.Refresh,
                                contentDescription = "Refresh",
                                tint = tokens.inkDim
                            )
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = tokens.bg)
            )
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            when (val state = uiState) {
                is HistoryUiState.Loading -> {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        CircularProgressIndicator(color = tokens.accent)
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = "Loading your history...",
                            style = MaterialTheme.typography.bodyMedium,
                            color = tokens.inkDim
                        )
                    }
                }

                is HistoryUiState.NotLoggedIn -> {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(32.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Box(
                            modifier = Modifier
                                .size(88.dp)
                                .clip(CircleShape)
                                .background(tokens.accent.copy(alpha = 0.12f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.Lock,
                                contentDescription = null,
                                tint = tokens.accent,
                                modifier = Modifier.size(44.dp)
                            )
                        }

                        Spacer(modifier = Modifier.height(24.dp))

                        Text(
                            text = "Log In to See History",
                            style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold),
                            color = tokens.ink,
                            textAlign = TextAlign.Center
                        )

                        Spacer(modifier = Modifier.height(10.dp))

                        Text(
                            text = "Sign in to keep track of your previous symptoms, consultations, and personalized remedy advice from Dr. Anjali Jariwala.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = tokens.inkDim,
                            textAlign = TextAlign.Center,
                            lineHeight = 22.sp
                        )

                        Spacer(modifier = Modifier.height(32.dp))

                        Button(
                            onClick = onNavigateToLogin,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(50.dp),
                            shape = RoundedCornerShape(14.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = tokens.accent)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Login,
                                contentDescription = null,
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "Sign In with Google",
                                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold)
                            )
                        }
                    }
                }

                is HistoryUiState.Empty -> {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(32.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Box(
                            modifier = Modifier
                                .size(80.dp)
                                .clip(CircleShape)
                                .background(tokens.accent.copy(alpha = 0.1f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.ChatBubbleOutline,
                                contentDescription = null,
                                tint = tokens.accent,
                                modifier = Modifier.size(40.dp)
                            )
                        }

                        Spacer(modifier = Modifier.height(20.dp))

                        Text(
                            text = "No Previous Chats",
                            style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold),
                            color = tokens.ink
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        Text(
                            text = "You haven't asked any questions yet. Start a wellness conversation to see your history saved here.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = tokens.inkDim,
                            textAlign = TextAlign.Center
                        )

                        Spacer(modifier = Modifier.height(28.dp))

                        OutlinedButton(
                            onClick = onBackClick,
                            shape = RoundedCornerShape(12.dp),
                            border = BorderStroke(1.dp, tokens.accent)
                        ) {
                            Text(text = "Ask a Question", color = tokens.accent)
                        }
                    }
                }

                is HistoryUiState.Error -> {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(32.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.ErrorOutline,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.error,
                            modifier = Modifier.size(48.dp)
                        )

                        Spacer(modifier = Modifier.height(16.dp))

                        Text(
                            text = "Could not load history",
                            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                            color = tokens.ink
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        Text(
                            text = state.message,
                            style = MaterialTheme.typography.bodyMedium,
                            color = tokens.inkDim,
                            textAlign = TextAlign.Center
                        )

                        Spacer(modifier = Modifier.height(24.dp))

                        Button(
                            onClick = { actualViewModel?.loadHistory() },
                            colors = ButtonDefaults.buttonColors(containerColor = tokens.accent),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text("Try Again")
                        }
                    }
                }

                is HistoryUiState.Success -> {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 16.dp),
                        verticalArrangement = Arrangement.spacedBy(14.dp)
                    ) {
                        items(state.items, key = { it.id }) { item ->
                            HistoryItemCard(
                                item = item,
                                onClick = {
                                    val isConsultation = item.intent == "consultation"
                                    onSelectQuery(item.queryText, isConsultation)
                                }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun HistoryItemCard(
    item: ChatHistoryItemDto,
    onClick: () -> Unit
) {
    val tokens = MaterialTheme.trustedTealColors
    val isConsultation = item.intent == "consultation"

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, tokens.line),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            // Header Row: Badge & Timestamp
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Badge
                Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = if (isConsultation) ClinicalTertiary.copy(alpha = 0.15f) else tokens.accent.copy(alpha = 0.12f)
                ) {
                    Text(
                        text = if (isConsultation) "Consultation" else "Direct Answer",
                        style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                        color = if (isConsultation) ClinicalTertiary else tokens.accent,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                    )
                }

                // Date
                Text(
                    text = formatHistoryDate(item.createdAt),
                    style = MaterialTheme.typography.labelSmall,
                    color = tokens.inkDim
                )
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Query Text
            Text(
                text = item.queryText,
                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
                color = tokens.ink,
                maxLines = 3,
                overflow = TextOverflow.Ellipsis
            )

            // Remedy or Matched Question info
            val remedy = item.remedyName
            val matchedQ = item.matchedQuestion

            if (!remedy.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(tokens.accent.copy(alpha = 0.07f), RoundedCornerShape(8.dp))
                        .padding(horizontal = 10.dp, vertical = 6.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.MedicalServices,
                        contentDescription = null,
                        tint = tokens.accent,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "Remedy: $remedy",
                        style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.Medium),
                        color = tokens.ink,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            } else if (!matchedQ.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Matched: $matchedQ",
                    style = MaterialTheme.typography.bodySmall,
                    color = tokens.inkDim,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Tap hint
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Tap to re-ask",
                    style = MaterialTheme.typography.labelSmall,
                    color = ClinicalTertiary
                )
                Icon(
                    imageVector = Icons.Default.ChevronRight,
                    contentDescription = null,
                    tint = ClinicalTertiary,
                    modifier = Modifier.size(14.dp)
                )
            }
        }
    }
}
