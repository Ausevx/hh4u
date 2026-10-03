package com.healinghands4u.presentation.auth

import androidx.compose.foundation.BorderStroke
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.healinghands4u.presentation.theme.ClinicalTertiary
import com.healinghands4u.presentation.theme.trustedTealColors

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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    onBackClick: () -> Unit,
    onNavigateToLogin: () -> Unit,
    onNavigateToOnboarding: () -> Unit,
    onNavigateToHistory: () -> Unit,
    viewModel: AuthViewModel? = null
) {
    val context = LocalContext.current
    val hasHilt = remember(context) { isHiltAvailable(context) }
    val actualViewModel: AuthViewModel? = viewModel ?: if (hasHilt) {
        hiltViewModel<AuthViewModel>()
    } else {
        null
    }

    val tokens = MaterialTheme.trustedTealColors
    val session by actualViewModel?.session?.collectAsState() ?: remember { mutableStateOf(null) }
    val busy by actualViewModel?.busy?.collectAsState() ?: remember { mutableStateOf(false) }

    val user = session?.user
    val isLoggedIn = user != null && user.authProvider != "guest"

    Scaffold(
        containerColor = tokens.bg,
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "My Profile",
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
                colors = TopAppBarDefaults.topAppBarColors(containerColor = tokens.bg)
            )
        }
    ) { paddingValues ->
        if (!isLoggedIn) {
            // Logged-out / Guest State
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
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
                        imageVector = Icons.Default.AccountCircle,
                        contentDescription = null,
                        tint = tokens.accent,
                        modifier = Modifier.size(52.dp)
                    )
                }

                Spacer(modifier = Modifier.height(24.dp))

                Text(
                    text = "Sign in to Healing Hub 4U",
                    style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold),
                    color = tokens.ink,
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(10.dp))

                Text(
                    text = "Log in with Google to view your profile details, manage contact info, and view all saved conversation history.",
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
        } else {
            // Logged-in State: Detailed Profile
            val scrollState = rememberScrollState()

            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .verticalScroll(scrollState)
                    .padding(horizontal = 20.dp, vertical = 16.dp),
                verticalArrangement = Arrangement.spacedBy(20.dp)
            ) {
                // Header User Card
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    border = BorderStroke(1.dp, tokens.line),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(20.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Box(
                            modifier = Modifier
                                .size(76.dp)
                                .clip(CircleShape)
                                .background(tokens.accent.copy(alpha = 0.15f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.Person,
                                contentDescription = null,
                                tint = tokens.accent,
                                modifier = Modifier.size(44.dp)
                            )
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        val displayName = user?.fullName?.takeIf { it.isNotBlank() }
                            ?: user?.displayName?.takeIf { it.isNotBlank() }
                            ?: "Valued Patient"

                        Text(
                            text = displayName,
                            style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold),
                            color = tokens.ink
                        )

                        if (!user?.email.isNullOrBlank()) {
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = user?.email.orEmpty(),
                                style = MaterialTheme.typography.bodyMedium,
                                color = tokens.inkDim
                            )
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        // Profile status badge
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = if (user?.isProfileComplete == true) tokens.accent.copy(alpha = 0.12f) else MaterialTheme.colorScheme.errorContainer
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    imageVector = if (user?.isProfileComplete == true) Icons.Default.CheckCircle else Icons.Default.Warning,
                                    contentDescription = null,
                                    tint = if (user?.isProfileComplete == true) tokens.accent else MaterialTheme.colorScheme.error,
                                    modifier = Modifier.size(14.dp)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = if (user?.isProfileComplete == true) "Verified Profile" else "Profile Incomplete",
                                    style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.SemiBold),
                                    color = if (user?.isProfileComplete == true) tokens.accent else MaterialTheme.colorScheme.error
                                )
                            }
                        }
                    }
                }

                // Onboarding Information Card
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    border = BorderStroke(1.dp, tokens.line),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(20.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Personal & Contact Details",
                                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                                color = tokens.ink
                            )

                            TextButton(
                                onClick = onNavigateToOnboarding,
                                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Edit,
                                    contentDescription = "Edit",
                                    tint = ClinicalTertiary,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = "Edit",
                                    style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.SemiBold),
                                    color = ClinicalTertiary
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        ProfileDetailRow(
                            icon = Icons.Default.Badge,
                            label = "Full Name",
                            value = user?.fullName?.ifBlank { "Not provided" } ?: "Not provided"
                        )

                        Divider(modifier = Modifier.padding(vertical = 10.dp), color = tokens.line.copy(alpha = 0.5f))

                        ProfileDetailRow(
                            icon = Icons.Default.Email,
                            label = "Email",
                            value = user?.email?.ifBlank { "Not provided" } ?: "Not provided"
                        )

                        Divider(modifier = Modifier.padding(vertical = 10.dp), color = tokens.line.copy(alpha = 0.5f))

                        val fullPhone = user?.phone?.takeIf { it.isNotBlank() }
                            ?: if (!user?.phoneNumber.isNullOrBlank()) "${user?.countryCode ?: "+91"} ${user?.phoneNumber}" else "Not provided"

                        ProfileDetailRow(
                            icon = Icons.Default.Phone,
                            label = "Phone Number",
                            value = fullPhone
                        )

                        Divider(modifier = Modifier.padding(vertical = 10.dp), color = tokens.line.copy(alpha = 0.5f))

                        ProfileDetailRow(
                            icon = Icons.Default.LocationCity,
                            label = "City",
                            value = user?.city?.ifBlank { "Not provided" } ?: "Not provided"
                        )

                        Divider(modifier = Modifier.padding(vertical = 10.dp), color = tokens.line.copy(alpha = 0.5f))

                        ProfileDetailRow(
                            icon = Icons.Default.Public,
                            label = "Country",
                            value = user?.country?.ifBlank { "India" } ?: "India"
                        )

                        Divider(modifier = Modifier.padding(vertical = 10.dp), color = tokens.line.copy(alpha = 0.5f))

                        ProfileDetailRow(
                            icon = Icons.Default.PinDrop,
                            label = "Pin Code",
                            value = user?.pinCode?.ifBlank { "Not provided" } ?: "Not provided"
                        )
                    }
                }

                // History Section Card
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable(onClick = onNavigateToHistory),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    border = BorderStroke(1.dp, tokens.line),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(20.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.weight(1f)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(46.dp)
                                    .clip(CircleShape)
                                    .background(tokens.accent.copy(alpha = 0.12f)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Default.History,
                                    contentDescription = null,
                                    tint = tokens.accent,
                                    modifier = Modifier.size(24.dp)
                                )
                            }

                            Spacer(modifier = Modifier.width(14.dp))

                            Column {
                                Text(
                                    text = "Conversation History",
                                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                                    color = tokens.ink
                                )
                                Text(
                                    text = "View past symptoms, advice & remedies",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = tokens.inkDim
                                )
                            }
                        }

                        Icon(
                            imageVector = Icons.Default.ChevronRight,
                            contentDescription = "View History",
                            tint = ClinicalTertiary,
                            modifier = Modifier.size(24.dp)
                        )
                    }
                }

                // Sign Out Button
                OutlinedButton(
                    onClick = { actualViewModel?.signOut(context) },
                    enabled = !busy,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp),
                    shape = RoundedCornerShape(14.dp),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.error.copy(alpha = 0.6f)),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error)
                ) {
                    Icon(
                        imageVector = Icons.Default.Logout,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Sign Out",
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold)
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))
            }
        }
    }
}

@Composable
private fun ProfileDetailRow(
    icon: ImageVector,
    label: String,
    value: String
) {
    val tokens = MaterialTheme.trustedTealColors

    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = tokens.inkDim,
            modifier = Modifier.size(20.dp)
        )

        Spacer(modifier = Modifier.width(12.dp))

        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = label,
                style = MaterialTheme.typography.labelSmall,
                color = tokens.inkDim
            )
            Text(
                text = value,
                style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Medium),
                color = tokens.ink
            )
        }
    }
}
