package com.healinghands4u.presentation.theme

import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

// =========================================================================
// Minimalist Monochrome Design Tokens
// Pure black & white. No accents. No teal.
// =========================================================================

// --- Light Mode: Warm background, Deep Green accents ---
val LightBg = Color(0xFFFFF9F0)
val LightSurface = Color(0xFFFFF9F0)
val LightSurfaceTint = Color(0xFF2F5D50) // primary-container
val LightInk = Color(0xFF1D1B16)
val LightInkDim = Color(0xFF404945)
val LightAccent = Color(0xFF154539) // primary
val LightAccentInk = Color(0xFFFFFFFF)
val LightLine = Color(0xFFC0C8C4) // outline-variant
val LightWarnBg = Color(0xFFFFDAD6)
val LightWarnInk = Color(0xFFBA1A1A)

// --- Dark Mode: Inverse surface, lighter green accents ---
val DarkBg = Color(0xFF32302A)
val DarkSurface = Color(0xFF32302A)
val DarkSurfaceTint = Color(0xFF204F42)
val DarkInk = Color(0xFFF6F0E7)
val DarkInkDim = Color(0xFFC0C8C4)
val DarkAccent = Color(0xFFA0D1C0)
val DarkAccentInk = Color(0xFF002019)
val DarkLine = Color(0xFF717975)
val DarkWarnBg = Color(0xFF93000A)
val DarkWarnInk = Color(0xFFFFDAD6)

// --- Contact action colors (kept for WhatsApp/Phone buttons) ---
val WhatsAppGreen = Color(0xFF25D366)
val PhoneBlue = Color(0xFF1976D2)

// =========================================================================
// Extended Color Palette Model & Accessors
// =========================================================================

@Immutable
data class TrustedTealColors(
    val bg: Color,
    val surface: Color,
    val surfaceTint: Color,
    val ink: Color,
    val inkDim: Color,
    val accent: Color,
    val accentInk: Color,
    val line: Color,
    val warnBg: Color,
    val warnInk: Color
)

val LightTrustedTealColors = TrustedTealColors(
    bg = LightBg,
    surface = LightSurface,
    surfaceTint = LightSurfaceTint,
    ink = LightInk,
    inkDim = LightInkDim,
    accent = LightAccent,
    accentInk = LightAccentInk,
    line = LightLine,
    warnBg = LightWarnBg,
    warnInk = LightWarnInk
)

val DarkTrustedTealColors = TrustedTealColors(
    bg = DarkBg,
    surface = DarkSurface,
    surfaceTint = DarkSurfaceTint,
    ink = DarkInk,
    inkDim = DarkInkDim,
    accent = DarkAccent,
    accentInk = DarkAccentInk,
    line = DarkLine,
    warnBg = DarkWarnBg,
    warnInk = DarkWarnInk
)

val LocalTrustedTealColors = staticCompositionLocalOf { LightTrustedTealColors }

// =========================================================================
// Backward Compatibility Aliases
// =========================================================================
val TealPrimary = LightAccent
val TealOnPrimary = LightAccentInk
val TealPrimaryContainer = LightSurfaceTint
val TealOnPrimaryContainer = LightAccent

val TealSecondary = LightAccent
val TealOnSecondary = LightAccentInk
val TealSecondaryContainer = LightSurfaceTint
val TealOnSecondaryContainer = LightInk

val ClinicalTertiary = Color(0xFF682C17)
val ClinicalOnTertiary = Color(0xFFFFFFFF)
val ClinicalTertiaryContainer = Color(0xFF85422B)
val ClinicalOnTertiaryContainer = Color(0xFFFFBAA3)

val ClinicalBackground = LightBg
val ClinicalOnBackground = LightInk
val ClinicalSurface = LightSurface
val ClinicalOnSurface = LightInk
val ClinicalSurfaceVariant = LightSurfaceTint
val ClinicalOnSurfaceVariant = LightInkDim
val ClinicalOutline = LightLine

val TealPrimaryDark = DarkAccent
val TealOnPrimaryDark = DarkAccentInk
val TealPrimaryContainerDark = DarkSurfaceTint
val TealOnPrimaryContainerDark = DarkAccent

val TealSecondaryDark = DarkAccent
val TealOnSecondaryDark = DarkAccentInk
val TealSecondaryContainerDark = DarkSurfaceTint
val TealOnSecondaryContainerDark = DarkInk

val ClinicalTertiaryDark = Color(0xFFFFB59D)
val ClinicalOnTertiaryDark = Color(0xFF390C00)
val ClinicalTertiaryContainerDark = Color(0xFF73341E)
val ClinicalOnTertiaryContainerDark = Color(0xFFFFBAA3)

val ClinicalBackgroundDark = DarkBg
val ClinicalOnBackgroundDark = DarkInk
val ClinicalSurfaceDark = DarkSurface
val ClinicalOnSurfaceDark = DarkInk
val ClinicalSurfaceVariantDark = DarkSurfaceTint
val ClinicalOnSurfaceVariantDark = DarkInkDim
val ClinicalOutlineDark = DarkLine
