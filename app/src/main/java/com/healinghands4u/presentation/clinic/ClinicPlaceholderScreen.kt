package com.healinghands4u.presentation.clinic

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.healinghands4u.presentation.theme.trustedTealColors

@Composable
fun ClinicPlaceholderScreen() {
    val tokens = MaterialTheme.trustedTealColors
    Scaffold(containerColor = tokens.bg) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = "Clinic Screen (To be added)",
                style = MaterialTheme.typography.headlineMedium,
                color = tokens.accent
            )
        }
    }
}
