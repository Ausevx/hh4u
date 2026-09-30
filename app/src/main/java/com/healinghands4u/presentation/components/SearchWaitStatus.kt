package com.healinghands4u.presentation.components

import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.*
import kotlinx.coroutines.delay

@Composable
fun SearchWaitStatus(onCancel: () -> Unit) {
    var slow by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { delay(10_000); slow = true }
    if (slow) Text("Taking longer than usual. You can keep waiting or cancel.")
    TextButton(onClick = onCancel) { Text("Cancel search") }
}
