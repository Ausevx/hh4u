package com.healinghands4u.presentation.components

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Box
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material3.Divider
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import com.google.firebase.auth.FirebaseAuth
import com.healinghands4u.presentation.theme.ThemeState
import com.healinghands4u.presentation.theme.trustedTealColors

@Composable
fun ProfileMenu() {
    var expanded by remember { mutableStateOf(false) }
    val currentUser = FirebaseAuth.getInstance().currentUser
    val isAnonymous = currentUser?.isAnonymous == true
    val isLoggedIn = currentUser != null

    val tokens = MaterialTheme.trustedTealColors

    Box {
        IconButton(onClick = { expanded = true }) {
            Icon(imageVector = Icons.Default.AccountCircle, contentDescription = "Profile", tint = tokens.ink)
        }
        DropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false }
        ) {
            DropdownMenuItem(
                text = {
                    Text(
                        text = if (isLoggedIn) {
                            if (isAnonymous) "Logged in as Guest" else "Logged in via Firebase"
                        } else {
                            "Not Logged In"
                        }
                    )
                },
                onClick = { }
            )
            Divider()
            val systemDark = isSystemInDarkTheme()
            val currentDark = ThemeState.isDarkTheme.value ?: systemDark
            DropdownMenuItem(
                text = { Text(if (currentDark) "Switch to Light Mode" else "Switch to Dark Mode") },
                onClick = {
                    ThemeState.isDarkTheme.value = !currentDark
                    expanded = false
                }
            )
        }
    }
}
