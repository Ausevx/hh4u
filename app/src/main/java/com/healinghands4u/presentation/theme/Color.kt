package com.healinghands4u.presentation.theme

import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

// =========================================================================
// Minimalist Monochrome Design Tokens
// Pure black & white. No accents. No teal.
// =========================================================================

// --- Light Mode: White background, black text ---
val LightBg = Color(0xFFFFFFFF)
val LightSurface = Color(0xFFF5F5F5)
val LightSurfaceTint = Color(0xFFEEEEEE)
val LightInk = Color(0xFF000000)
val LightInkDim = Color(0xFF666666)
val LightAccent = Color(0xFF000000)
val LightAccentInk = Color(0xFFFFFFFF)
val LightLine = Color(0x1A000000)       // 10% black
val LightWarnBg = Color(0xFFF5F5F5)
val LightWarnInk = Color(0xFF333333)

// --- Dark Mode: Black background, white text ---
val DarkBg = Color(0xFF000000)
val DarkSurface = Color(0xFF111111)
val DarkSurfaceTint = Color(0xFF1A1A1A)
val DarkInk = Color(0xFFFFFFFF)
val DarkInkDim = Color(0xFF999999)
val DarkAccent = Color(0xFFFFFFFF)
val DarkAccentInk = Color(0xFF000000)
val DarkLine = Color(0x1AFFFFFF)         // 10% white
val DarkWarnBg = Color(0xFF1A1A1A)
val DarkWarnInk = Color(0xFFCCCCCC)

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

val ClinicalTertiary = Color(0xFF555555)
val ClinicalOnTertiary = Color(0xFFFFFFFF)
val ClinicalTertiaryContainer = Color(0xFFEEEEEE)
val ClinicalOnTertiaryContainer = Color(0xFF000000)

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

val ClinicalTertiaryDark = Color(0xFFAAAAAA)
val ClinicalOnTertiaryDark = Color(0xFF111111)
val ClinicalTertiaryContainerDark = Color(0xFF333333)
val ClinicalOnTertiaryContainerDark = Color(0xFFEEEEEE)

val ClinicalBackgroundDark = DarkBg
val ClinicalOnBackgroundDark = DarkInk
val ClinicalSurfaceDark = DarkSurface
val ClinicalOnSurfaceDark = DarkInk
val ClinicalSurfaceVariantDark = DarkSurfaceTint
val ClinicalOnSurfaceVariantDark = DarkInkDim
val ClinicalOutlineDark = DarkLine
