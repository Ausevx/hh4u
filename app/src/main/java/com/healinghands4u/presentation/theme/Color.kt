package com.healinghands4u.presentation.theme

import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

// =========================================================================
// PRD v3 "Trusted Teal" Design Tokens
// =========================================================================

// --- Light Mode Palette ---
val LightBg = Color(0xFFFFFFFF)
val LightSurface = Color(0xFFF7F9FB)
val LightSurfaceTint = Color(0xFFEAF5F6)
val LightInk = Color(0xFF0F2027)
val LightInkDim = Color(0xFF5C7480)
val LightAccent = Color(0xFF0E7C86)
val LightAccentInk = Color(0xFFFFFFFF)
val LightLine = Color(0x140F2027)       // rgba(15, 32, 39, 0.08)
val LightWarnBg = Color(0xFFFFF0EC)
val LightWarnInk = Color(0xFFA14A2A)

// --- Dark Mode Palette ---
val DarkBg = Color(0xFF0A1418)
val DarkSurface = Color(0xFF101E22)
val DarkSurfaceTint = Color(0x1A2DD4C8)  // rgba(45, 212, 200, 0.10)
val DarkInk = Color(0xFFE7F1F3)
val DarkInkDim = Color(0xFF7E97A0)
val DarkAccent = Color(0xFF2DD4C8)
val DarkAccentInk = Color(0xFF04211E)
val DarkLine = Color(0x1AE7F1F3)         // rgba(231, 241, 243, 0.10)
val DarkWarnBg = Color(0x24E67E22)       // rgba(230, 126, 34, 0.14)
val DarkWarnInk = Color(0xFFF0B074)

// --- Universal Action Colors ---
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
// Backward Compatibility Aliases for Milestone 2 references
// =========================================================================
val TealPrimary = LightAccent
val TealOnPrimary = LightAccentInk
val TealPrimaryContainer = LightSurfaceTint
val TealOnPrimaryContainer = LightAccent

val TealSecondary = LightAccent
val TealOnSecondary = LightAccentInk
val TealSecondaryContainer = LightSurfaceTint
val TealOnSecondaryContainer = LightInk

val ClinicalTertiary = Color(0xFF456179)
val ClinicalOnTertiary = Color(0xFFFFFFFF)
val ClinicalTertiaryContainer = Color(0xFFCCE5FF)
val ClinicalOnTertiaryContainer = Color(0xFF001D32)

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

val ClinicalTertiaryDark = Color(0xFFACC9E6)
val ClinicalOnTertiaryDark = Color(0xFF143349)
val ClinicalTertiaryContainerDark = Color(0xFF2D4960)
val ClinicalOnTertiaryContainerDark = Color(0xFFCCE5FF)

val ClinicalBackgroundDark = DarkBg
val ClinicalOnBackgroundDark = DarkInk
val ClinicalSurfaceDark = DarkSurface
val ClinicalOnSurfaceDark = DarkInk
val ClinicalSurfaceVariantDark = DarkSurfaceTint
val ClinicalOnSurfaceVariantDark = DarkInkDim
val ClinicalOutlineDark = DarkLine
