package com.healinghands4u.presentation.theme

import android.app.Activity
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

val LightColorScheme = lightColorScheme(
    primary = LightAccent,
    onPrimary = LightAccentInk,
    primaryContainer = LightSurfaceTint,
    onPrimaryContainer = LightAccent,
    secondary = LightAccent,
    onSecondary = LightAccentInk,
    secondaryContainer = LightSurfaceTint,
    onSecondaryContainer = LightInk,
    tertiary = ClinicalTertiary,
    onTertiary = ClinicalOnTertiary,
    tertiaryContainer = ClinicalTertiaryContainer,
    onTertiaryContainer = ClinicalOnTertiaryContainer,
    background = LightBg,
    onBackground = LightInk,
    surface = LightSurface,
    onSurface = LightInk,
    surfaceVariant = LightSurfaceTint,
    onSurfaceVariant = LightInkDim,
    outline = LightLine,
    error = LightWarnInk,
    errorContainer = LightWarnBg,
    onError = Color.White,
    onErrorContainer = LightWarnInk
)

val DarkColorScheme = darkColorScheme(
    primary = DarkAccent,
    onPrimary = DarkAccentInk,
    primaryContainer = DarkSurfaceTint,
    onPrimaryContainer = DarkAccent,
    secondary = DarkAccent,
    onSecondary = DarkAccentInk,
    secondaryContainer = DarkSurfaceTint,
    onSecondaryContainer = DarkInk,
    tertiary = ClinicalTertiaryDark,
    onTertiary = ClinicalOnTertiaryDark,
    tertiaryContainer = ClinicalTertiaryContainerDark,
    onTertiaryContainer = ClinicalOnTertiaryContainerDark,
    background = DarkBg,
    onBackground = DarkInk,
    surface = DarkSurface,
    onSurface = DarkInk,
    surfaceVariant = DarkSurfaceTint,
    onSurfaceVariant = DarkInkDim,
    outline = DarkLine,
    error = DarkWarnInk,
    errorContainer = DarkWarnBg,
    onError = DarkAccentInk,
    onErrorContainer = DarkWarnInk
)

object TrustedTealTheme {
    val colors: TrustedTealColors
        @Composable
        @ReadOnlyComposable
        get() = LocalTrustedTealColors.current
}

val MaterialTheme.trustedTealColors: TrustedTealColors
    @Composable
    @ReadOnlyComposable
    get() = LocalTrustedTealColors.current

@Composable
fun HealingHandsTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = false,
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }

    val trustedTealColors = if (darkTheme) DarkTrustedTealColors else LightTrustedTealColors

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as? Activity)?.window
            if (window != null) {
                window.statusBarColor = colorScheme.surface.toArgb()
                WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !darkTheme
            }
        }
    }

    CompositionLocalProvider(
        LocalTrustedTealColors provides trustedTealColors
    ) {
        MaterialTheme(
            colorScheme = colorScheme,
            typography = Typography,
            content = content
        )
    }
}
