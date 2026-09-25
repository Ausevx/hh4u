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
import androidx.compose.runtime.collectAsState
import androidx.compose.ui.platform.LocalContext
import androidx.hilt.navigation.compose.hiltViewModel
import com.healinghands4u.presentation.auth.AuthViewModel
import com.healinghands4u.presentation.theme.ThemeState
import com.healinghands4u.presentation.theme.trustedTealColors

@Composable
fun ProfileMenu(viewModel: AuthViewModel = hiltViewModel()) {
    var expanded by remember { mutableStateOf(false) }
    val session by viewModel.session.collectAsState()
    val currentUser = session?.user
    val context = LocalContext.current
    val isAnonymous = currentUser?.authProvider == "guest"
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
                        text = if (isLoggedIn && !isAnonymous) {
                            currentUser?.email ?: currentUser?.displayName.orEmpty()
                        } else {
                            "Logged in as Guest"
                        }
                    )
                },
                onClick = { }
            )

            Divider()
            if (isLoggedIn) {
                DropdownMenuItem(text = { Text("Sign out") }, onClick = {
                    viewModel.signOut(context)
                    expanded = false
                })
            }
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
