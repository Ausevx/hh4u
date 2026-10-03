package com.healinghands4u.presentation.auth

import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Security
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.healinghands4u.auth.AuthUser
import com.healinghands4u.config.BrandingConfig
import com.healinghands4u.presentation.common.TestTags
import com.healinghands4u.presentation.theme.AppIcons
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

@Composable
fun LoginScreen(
    modifier: Modifier = Modifier,
    onLoginSuccess: (AuthUser?) -> Unit = {},
    onGuestClick: () -> Unit = { onLoginSuccess(null) },
    onGoogleClick: () -> Unit = {},
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
    val busy by actualViewModel?.busy?.collectAsState() ?: remember { mutableStateOf(false) }
    val session by actualViewModel?.session?.collectAsState() ?: remember { mutableStateOf<com.healinghands4u.auth.AuthSession?>(null) }
    val loginSuccess by actualViewModel?.loginState?.collectAsState() ?: remember { mutableStateOf(false) }
    val errorMessage by actualViewModel?.errorMessage?.collectAsState() ?: remember { mutableStateOf<String?>(null) }

    LaunchedEffect(loginSuccess) {
        if (loginSuccess) {
            onLoginSuccess(session?.user)
        }
    }

    LaunchedEffect(errorMessage) {
        errorMessage?.let {
            Toast.makeText(context, it, Toast.LENGTH_LONG).show()
            actualViewModel?.clearError()
        }
    }

    val scrollState = rememberScrollState()

    // If already logged in, show account summary
    if (session != null && session?.user?.authProvider != "guest") {
        Surface(
            modifier = modifier.fillMaxSize(),
            color = tokens.bg
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(28.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Box(
                    modifier = Modifier
                        .size(72.dp)
                        .clip(CircleShape)
                        .background(tokens.accent.copy(alpha = 0.15f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.AccountCircle,
                        contentDescription = "User",
                        tint = tokens.accent,
                        modifier = Modifier.size(48.dp)
                    )
                }

                Spacer(modifier = Modifier.height(18.dp))

                Text(
                    text = "Welcome Back",
                    style = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.Bold),
                    color = tokens.ink
                )

                Spacer(modifier = Modifier.height(6.dp))

                Text(
                    text = session?.user?.fullName ?: session?.user?.displayName.orEmpty(),
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
                    color = tokens.ink
                )

                Text(
                    text = session?.user?.email.orEmpty(),
                    style = MaterialTheme.typography.bodyMedium,
                    color = tokens.inkDim
                )

                Spacer(modifier = Modifier.height(28.dp))

                Button(
                    onClick = { onLoginSuccess(session?.user) },
                    enabled = !busy,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = tokens.accent)
                ) {
                    Text(
                        text = if (session?.user?.isProfileComplete == true) "Continue to Assistant" else "Complete Profile",
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold)
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedButton(
                    onClick = { actualViewModel?.signOut(context) },
                    enabled = !busy,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp),
                    shape = RoundedCornerShape(12.dp),
                    border = BorderStroke(1.dp, tokens.line)
                ) {
                    Text("Sign out", color = tokens.inkDim)
                }

                if (busy) {
                    Spacer(modifier = Modifier.height(16.dp))
                    LinearProgressIndicator(modifier = Modifier.fillMaxWidth(), color = tokens.accent)
                }
            }
        }
        return
    }

    // Google Sign-In Screen
    Surface(
        modifier = modifier.fillMaxSize(),
        color = tokens.bg
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(scrollState)
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Spacer(modifier = Modifier.height(32.dp))

            // Brand Logo
            Box(
                modifier = Modifier
                    .size(80.dp)
                    .clip(CircleShape)
                    .background(tokens.accent.copy(alpha = 0.12f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = AppIcons.Leaf,
                    contentDescription = "Healing Hands4U",
                    tint = tokens.accent,
                    modifier = Modifier.size(44.dp)
                )
            }

            Spacer(modifier = Modifier.height(20.dp))

            Text(
                text = BrandingConfig.APP_NAME,
                style = MaterialTheme.typography.headlineLarge.copy(
                    fontWeight = FontWeight.Bold,
                    fontSize = 30.sp
                ),
                color = tokens.ink,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = "Holistic Healthcare & Homeopathic Guidance",
                style = MaterialTheme.typography.bodyLarge,
                color = tokens.inkDim,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(48.dp))

            // Primary Google Sign-In Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = tokens.surface),
                border = BorderStroke(1.dp, tokens.line),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "Sign In / Register",
                        style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold),
                        color = tokens.ink
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = "Use your Google account for instant, secure authentication. No password needed.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = tokens.inkDim,
                        textAlign = TextAlign.Center
                    )

                    Spacer(modifier = Modifier.height(24.dp))

                    Button(
                        onClick = {
                            actualViewModel?.googleSignIn(context)
                            onGoogleClick()
                        },
                        enabled = !busy,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp)
                            .testTag(TestTags.LOGIN_GOOGLE_BUTTON),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = tokens.accent,
                            contentColor = tokens.accentInk
                        ),
                        elevation = ButtonDefaults.buttonElevation(defaultElevation = 2.dp)
                    ) {
                        if (busy) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(24.dp),
                                color = tokens.accentInk,
                                strokeWidth = 2.dp
                            )
                        } else {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = Icons.Default.Security,
                                    contentDescription = "Google Sign In",
                                    modifier = Modifier.size(20.dp),
                                    tint = tokens.accentInk
                                )
                                Spacer(modifier = Modifier.width(10.dp))
                                Text(
                                    text = "Continue with Google",
                                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold)
                                )
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(32.dp))

            // Privacy / Disclaimer Note
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Lock,
                    contentDescription = null,
                    tint = tokens.inkDim,
                    modifier = Modifier.size(16.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = "Your data is encrypted & strictly confidential",
                    style = MaterialTheme.typography.labelSmall,
                    color = tokens.inkDim
                )
            }

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}
