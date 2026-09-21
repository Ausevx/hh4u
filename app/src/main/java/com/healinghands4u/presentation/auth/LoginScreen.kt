package com.healinghands4u.presentation.auth

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
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.HealthAndSafety
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.Button
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Divider
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.healinghands4u.config.BrandingConfig
import com.healinghands4u.presentation.common.TestTags

import androidx.hilt.navigation.compose.hiltViewModel
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.LaunchedEffect
import android.widget.Toast
import androidx.compose.ui.platform.LocalContext

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
    onLoginSuccess: () -> Unit = {},
    onGuestClick: () -> Unit = onLoginSuccess,
    onGoogleClick: () -> Unit = {},
    onOtpRequested: (String) -> Unit = {},
    onOtpVerified: (String, String) -> Unit = { _, _ -> onLoginSuccess() },
    viewModel: AuthViewModel? = null
) {
    val context = LocalContext.current
    val hasHilt = remember(context) { isHiltAvailable(context) }
    val actualViewModel: AuthViewModel? = viewModel ?: if (hasHilt) {
        hiltViewModel<AuthViewModel>()
    } else {
        null
    }

    var email by remember { mutableStateOf("") }
    var otp by remember { mutableStateOf("") }
    var otpSent by remember { mutableStateOf(false) }
    
    val loginSuccess by actualViewModel?.loginState?.collectAsState() ?: remember { mutableStateOf(false) }
    val errorMessage by actualViewModel?.errorMessage?.collectAsState() ?: remember { mutableStateOf<String?>(null) }

    
    LaunchedEffect(loginSuccess) {
        if (loginSuccess) {
            onLoginSuccess()
        }
    }

    LaunchedEffect(errorMessage) {
        errorMessage?.let {
            Toast.makeText(context, it, Toast.LENGTH_LONG).show()
            actualViewModel?.clearError()
        }
    }


    val scrollState = rememberScrollState()

    Surface(
        modifier = modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(scrollState)
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Top
        ) {
            Spacer(modifier = Modifier.height(32.dp))

            // Branding Header
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag(TestTags.LOGIN_HEADER),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Surface(
                    shape = CircleShape,
                    color = MaterialTheme.colorScheme.primaryContainer,
                    modifier = Modifier.size(72.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = Icons.Default.HealthAndSafety,
                            contentDescription = "App Logo",
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(40.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = BrandingConfig.APP_NAME,
                    style = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.Bold),
                    color = MaterialTheme.colorScheme.primary,
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(6.dp))

                Text(
                    text = "Holistic Homeopathic Healing & Care",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center
                )
            }

            Spacer(modifier = Modifier.height(32.dp))

            // Option 1: Email OTP Authentication
            ElevatedCard(
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag(TestTags.AUTH_OPTION_OTP),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.elevatedCardColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp)
                ) {
                    Text(
                        text = "Sign in with Email OTP",
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
                        color = MaterialTheme.colorScheme.onSurface
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    OutlinedTextField(
                        value = email,
                        onValueChange = { email = it },
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag(TestTags.LOGIN_EMAIL_INPUT),
                        label = { Text("Email Address") },
                        leadingIcon = {
                            Icon(imageVector = Icons.Default.Email, contentDescription = "Email")
                        },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                        shape = RoundedCornerShape(10.dp)
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    Button(
                        onClick = {
                            if (email.isNotBlank()) {
                                otpSent = true
                                onOtpRequested(email)
                            }
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag(TestTags.LOGIN_SEND_OTP_BUTTON),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Icon(imageVector = Icons.Default.Send, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(if (otpSent) "Resend OTP" else "Send OTP")
                    }

                    if (otpSent || otp.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(12.dp))

                        OutlinedTextField(
                            value = otp,
                            onValueChange = { otp = it },
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag(TestTags.LOGIN_OTP_INPUT),
                            label = { Text("6-Digit OTP") },
                            leadingIcon = {
                                Icon(imageVector = Icons.Default.Lock, contentDescription = "OTP")
                            },
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            shape = RoundedCornerShape(10.dp)
                        )

                        Spacer(modifier = Modifier.height(10.dp))

                        Button(
                            onClick = {
                                if (otp.isNotBlank()) {
                                    actualViewModel?.verifyOtp(email, otp)
                                    onOtpVerified(email, otp)
                                }
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag(TestTags.LOGIN_VERIFY_OTP_BUTTON),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Text("Verify & Sign In")
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Divider with "OR"
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Divider(modifier = Modifier.weight(1f), color = MaterialTheme.colorScheme.outlineVariant)
                Text(
                    text = "OR",
                    modifier = Modifier.padding(horizontal = 12.dp),
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.outline
                )
                Divider(modifier = Modifier.weight(1f), color = MaterialTheme.colorScheme.outlineVariant)
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Option 2: Google Sign-In
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag(TestTags.AUTH_OPTION_GOOGLE)
            ) {
                OutlinedButton(
                    onClick = onGoogleClick,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp)
                        .testTag(TestTags.LOGIN_GOOGLE_BUTTON),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text(
                        text = "Sign in with Google",
                        style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.SemiBold)
                    )
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Option 3: Guest Access
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag(TestTags.AUTH_OPTION_GUEST)
            ) {
                OutlinedButton(
                    onClick = {
                        onGuestClick()
                        try {
                            actualViewModel?.loginAnonymously()
                        } catch (e: Throwable) {
                            // Handled safely
                        }
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp)
                        .testTag(TestTags.LOGIN_GUEST_BUTTON),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.AccountCircle,
                        contentDescription = "Guest",
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Continue as Guest",
                        style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.SemiBold),
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}
