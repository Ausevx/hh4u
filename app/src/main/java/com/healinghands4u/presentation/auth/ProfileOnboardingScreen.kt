package com.healinghands4u.presentation.auth

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.healinghands4u.presentation.theme.AppIcons
import com.healinghands4u.presentation.theme.trustedTealColors

data class CountryDialCode(val country: String, val code: String, val flag: String)

val CommonCountries = listOf(
    CountryDialCode("India", "+91", "🇮🇳"),
    CountryDialCode("United States", "+1", "🇺🇸"),
    CountryDialCode("United Kingdom", "+44", "🇬🇧"),
    CountryDialCode("United Arab Emirates", "+971", "🇦🇪"),
    CountryDialCode("Canada", "+1", "🇨🇦"),
    CountryDialCode("Australia", "+61", "🇦🇺"),
    CountryDialCode("Singapore", "+65", "🇸🇬"),
    CountryDialCode("Saudi Arabia", "+966", "🇸🇦"),
    CountryDialCode("Germany", "+49", "🇩🇪"),
    CountryDialCode("New Zealand", "+64", "🇳🇿"),
    CountryDialCode("Qatar", "+974", "🇶🇦"),
    CountryDialCode("Kuwait", "+965", "🇰🇼"),
    CountryDialCode("Oman", "+968", "🇴🇲"),
    CountryDialCode("Bahrain", "+973", "🇧🇭")
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileOnboardingScreen(
    onCompleted: () -> Unit,
    viewModel: AuthViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    val tokens = MaterialTheme.trustedTealColors
    val scrollState = rememberScrollState()

    val session by viewModel.session.collectAsState()
    val busy by viewModel.busy.collectAsState()
    val errorMessage by viewModel.errorMessage.collectAsState()

    var fullName by remember { mutableStateOf(session?.user?.fullName ?: session?.user?.displayName ?: "") }
    var selectedCountry by remember { mutableStateOf(CommonCountries[0]) } // Default India (+91)
    var isCountryDropdownExpanded by remember { mutableStateOf(false) }
    var phoneNumber by remember { mutableStateOf(session?.user?.phoneNumber ?: "") }
    var city by remember { mutableStateOf(session?.user?.city ?: "") }
    var country by remember { mutableStateOf(session?.user?.country ?: "India") }
    var pinCode by remember { mutableStateOf(session?.user?.pinCode ?: "") }

    LaunchedEffect(errorMessage) {
        errorMessage?.let {
            Toast.makeText(context, it, Toast.LENGTH_LONG).show()
            viewModel.clearError()
        }
    }

    Scaffold(
        containerColor = tokens.bg
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .verticalScroll(scrollState)
                .padding(horizontal = 24.dp, vertical = 20.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(16.dp))

            // Brand Badge
            Box(
                modifier = Modifier
                    .size(56.dp)
                    .clip(CircleShape)
                    .background(tokens.accent.copy(alpha = 0.12f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = AppIcons.Leaf,
                    contentDescription = "Logo",
                    tint = tokens.accent,
                    modifier = Modifier.size(32.dp)
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = "Complete Your Profile",
                style = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.Bold),
                color = tokens.ink,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(6.dp))

            Text(
                text = "Please enter your details to personalize your holistic care and consultation records.",
                style = MaterialTheme.typography.bodyMedium,
                color = tokens.inkDim,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(28.dp))

            // Form Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = tokens.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    // Full Name
                    OutlinedTextField(
                        value = fullName,
                        onValueChange = { fullName = it },
                        label = { Text("Full Name *") },
                        leadingIcon = { Icon(Icons.Default.Person, contentDescription = null, tint = tokens.accent) },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp)
                    )

                    // Email (Read-only, acquired from Google)
                    OutlinedTextField(
                        value = session?.user?.email ?: "Google Account",
                        onValueChange = {},
                        label = { Text("Email (from Google)") },
                        leadingIcon = { Icon(Icons.Default.Email, contentDescription = null, tint = tokens.inkDim) },
                        trailingIcon = {
                            Icon(Icons.Default.CheckCircle, contentDescription = "Verified", tint = Color(0xFF2E7D32))
                        },
                        enabled = false,
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp)
                    )

                    // Phone Number with Country Code Dropdown
                    Column {
                        Text(
                            text = "Phone Number *",
                            style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.SemiBold),
                            color = tokens.inkDim
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            // Country Code Picker Box
                            Box {
                                Surface(
                                    modifier = Modifier
                                        .height(56.dp)
                                        .clip(RoundedCornerShape(12.dp))
                                        .border(1.dp, tokens.line, RoundedCornerShape(12.dp))
                                        .clickable { isCountryDropdownExpanded = true },
                                    color = tokens.surface
                                ) {
                                    Row(
                                        modifier = Modifier.padding(horizontal = 12.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(text = "${selectedCountry.flag} ${selectedCountry.code}", fontSize = 14.sp)
                                        Icon(Icons.Default.ArrowDropDown, contentDescription = "Select Country", tint = tokens.inkDim)
                                    }
                                }

                                DropdownMenu(
                                    expanded = isCountryDropdownExpanded,
                                    onDismissRequest = { isCountryDropdownExpanded = false }
                                ) {
                                    CommonCountries.forEach { countryItem ->
                                        DropdownMenuItem(
                                            text = {
                                                Text("${countryItem.flag} ${countryItem.country} (${countryItem.code})")
                                            },
                                            onClick = {
                                                selectedCountry = countryItem
                                                country = countryItem.country
                                                isCountryDropdownExpanded = false
                                            }
                                        )
                                    }
                                }
                            }

                            Spacer(modifier = Modifier.width(8.dp))

                            // Phone input field
                            OutlinedTextField(
                                value = phoneNumber,
                                onValueChange = { input ->
                                    if (input.all { it.isDigit() || it == ' ' }) phoneNumber = input
                                },
                                placeholder = { Text("Mobile number") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                                modifier = Modifier.weight(1f),
                                singleLine = true,
                                shape = RoundedCornerShape(12.dp)
                            )
                        }
                    }

                    // City
                    OutlinedTextField(
                        value = city,
                        onValueChange = { city = it },
                        label = { Text("City *") },
                        placeholder = { Text("e.g. Pune, Mumbai, Delhi") },
                        leadingIcon = { Icon(Icons.Default.LocationCity, contentDescription = null, tint = tokens.accent) },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp)
                    )

                    // Country
                    OutlinedTextField(
                        value = country,
                        onValueChange = { country = it },
                        label = { Text("Country *") },
                        leadingIcon = { Icon(Icons.Default.Public, contentDescription = null, tint = tokens.accent) },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp)
                    )

                    // Pin Code
                    OutlinedTextField(
                        value = pinCode,
                        onValueChange = { input ->
                            if (input.all { it.isLetterOrDigit() || it == ' ' }) pinCode = input
                        },
                        label = { Text("Pin Code *") },
                        placeholder = { Text("e.g. 411014") },
                        leadingIcon = { Icon(Icons.Default.PinDrop, contentDescription = null, tint = tokens.accent) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(28.dp))

            // Save & Continue Button
            Button(
                onClick = {
                    val cleanName = fullName.trim()
                    val cleanPhone = phoneNumber.trim()
                    val cleanCity = city.trim()
                    val cleanCountry = country.trim()
                    val cleanPin = pinCode.trim()

                    if (cleanName.length < 2) {
                        Toast.makeText(context, "Please enter your full name", Toast.LENGTH_SHORT).show()
                        return@Button
                    }
                    if (cleanPhone.length < 6) {
                        Toast.makeText(context, "Please enter a valid phone number", Toast.LENGTH_SHORT).show()
                        return@Button
                    }
                    if (cleanCity.isBlank()) {
                        Toast.makeText(context, "Please enter your city", Toast.LENGTH_SHORT).show()
                        return@Button
                    }
                    if (cleanPin.length < 3) {
                        Toast.makeText(context, "Please enter a valid PIN code", Toast.LENGTH_SHORT).show()
                        return@Button
                    }

                    viewModel.updateProfile(
                        fullName = cleanName,
                        countryCode = selectedCountry.code,
                        phoneNumber = cleanPhone,
                        city = cleanCity,
                        country = cleanCountry,
                        pinCode = cleanPin,
                        onSuccess = onCompleted
                    )
                },
                enabled = !busy,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = tokens.accent,
                    contentColor = tokens.accentInk
                )
            ) {
                if (busy) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(24.dp),
                        color = tokens.accentInk,
                        strokeWidth = 2.dp
                    )
                } else {
                    Text(
                        text = "Complete Registration & Continue",
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}
