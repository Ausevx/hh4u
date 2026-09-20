package com.healinghands4u.presentation.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.FloatingActionButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.healinghands4u.presentation.navigation.Screen
import com.healinghands4u.presentation.theme.AppIcons
import com.healinghands4u.presentation.theme.trustedTealColors

@Composable
fun TabBar(
    currentRoute: String,
    onTabSelected: (String) -> Unit,
    onFabClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val tokens = MaterialTheme.trustedTealColors

    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(72.dp),
        contentAlignment = Alignment.BottomCenter
    ) {
        // Bar background
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .height(60.dp)
                .drawBehind {
                    drawLine(
                        color = tokens.line,
                        start = Offset(0f, 0f),
                        end = Offset(size.width, 0f),
                        strokeWidth = 1.dp.toPx()
                    )
                },
            color = tokens.surface
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceAround,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Item 1: Directory
                val isDirectorySelected = currentRoute == Screen.DiseaseList.route
                Column(
                    modifier = Modifier
                        .clickable { onTabSelected(Screen.DiseaseList.route) }
                        .padding(horizontal = 24.dp, vertical = 6.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Icon(
                        imageVector = AppIcons.Leaf,
                        contentDescription = "Directory",
                        tint = if (isDirectorySelected) tokens.accent else tokens.inkDim,
                        modifier = Modifier.size(22.dp)
                    )
                    Text(
                        text = "Directory",
                        style = MaterialTheme.typography.labelSmall.copy(
                            fontSize = 11.sp,
                            fontWeight = if (isDirectorySelected) FontWeight.Bold else FontWeight.Medium
                        ),
                        color = if (isDirectorySelected) tokens.accent else tokens.inkDim
                    )
                }

                // Spacer for Center FAB
                Box(modifier = Modifier.size(56.dp))

                // Item 3: Planner
                val isPlannerSelected = currentRoute == Screen.Planner.route
                Column(
                    modifier = Modifier
                        .clickable { onTabSelected(Screen.Planner.route) }
                        .padding(horizontal = 24.dp, vertical = 6.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Icon(
                        imageVector = AppIcons.Calendar,
                        contentDescription = "Planner",
                        tint = if (isPlannerSelected) tokens.accent else tokens.inkDim,
                        modifier = Modifier.size(22.dp)
                    )
                    Text(
                        text = "Planner",
                        style = MaterialTheme.typography.labelSmall.copy(
                            fontSize = 11.sp,
                            fontWeight = if (isPlannerSelected) FontWeight.Bold else FontWeight.Medium
                        ),
                        color = if (isPlannerSelected) tokens.accent else tokens.inkDim
                    )
                }
            }
        }

        // Center Floating Action Button (FAB)
        FloatingActionButton(
            onClick = onFabClick,
            shape = CircleShape,
            containerColor = tokens.accent,
            contentColor = tokens.accentInk,
            elevation = FloatingActionButtonDefaults.elevation(defaultElevation = 6.dp),
            modifier = Modifier
                .offset(y = (-14).dp)
                .size(56.dp)
        ) {
            Icon(
                imageVector = AppIcons.Chat,
                contentDescription = "Start AI Chat",
                tint = tokens.accentInk,
                modifier = Modifier.size(26.dp)
            )
        }
    }
}
