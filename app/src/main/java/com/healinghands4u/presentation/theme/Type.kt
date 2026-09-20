package com.healinghands4u.presentation.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.googlefonts.Font
import androidx.compose.ui.text.googlefonts.GoogleFont
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import com.healinghands4u.R

private val isRobolectric = try {
    Class.forName("org.robolectric.Robolectric")
    true
} catch (e: Throwable) {
    false
}

val fontProvider = GoogleFont.Provider(
    providerAuthority = "com.google.android.gms.fonts",
    providerPackage = "com.google.android.gms",
    certificates = R.array.com_google_android_gms_fonts_certs
)

val SoraFont = GoogleFont("Sora")
val IBMPlexSansFont = GoogleFont("IBM Plex Sans")

val SoraFontFamily: FontFamily = if (isRobolectric) {
    FontFamily.SansSerif
} else {
    try {
        FontFamily(
            Font(googleFont = SoraFont, fontProvider = fontProvider, weight = FontWeight.Bold),
            Font(googleFont = SoraFont, fontProvider = fontProvider, weight = FontWeight.SemiBold),
            Font(googleFont = SoraFont, fontProvider = fontProvider, weight = FontWeight.Medium),
            Font(googleFont = SoraFont, fontProvider = fontProvider, weight = FontWeight.Normal)
        )
    } catch (e: Throwable) {
        FontFamily.SansSerif
    }
}

val IBMPlexSansFontFamily: FontFamily = if (isRobolectric) {
    FontFamily.SansSerif
} else {
    try {
        FontFamily(
            Font(googleFont = IBMPlexSansFont, fontProvider = fontProvider, weight = FontWeight.Bold),
            Font(googleFont = IBMPlexSansFont, fontProvider = fontProvider, weight = FontWeight.SemiBold),
            Font(googleFont = IBMPlexSansFont, fontProvider = fontProvider, weight = FontWeight.Medium),
            Font(googleFont = IBMPlexSansFont, fontProvider = fontProvider, weight = FontWeight.Normal)
        )
    } catch (e: Throwable) {
        FontFamily.SansSerif
    }
}

val Typography = Typography(
    headlineLarge = TextStyle(
        fontFamily = SoraFontFamily,
        fontWeight = FontWeight.Bold,
        fontSize = 32.sp,
        lineHeight = 40.sp,
        letterSpacing = (-0.01).em
    ),
    headlineMedium = TextStyle(
        fontFamily = SoraFontFamily,
        fontWeight = FontWeight.Bold,
        fontSize = 24.sp,
        lineHeight = 32.sp,
        letterSpacing = (-0.01).em
    ),
    headlineSmall = TextStyle(
        fontFamily = SoraFontFamily,
        fontWeight = FontWeight.SemiBold,
        fontSize = 20.sp,
        lineHeight = 28.sp,
        letterSpacing = (-0.01).em
    ),
    titleLarge = TextStyle(
        fontFamily = SoraFontFamily,
        fontWeight = FontWeight.Bold,
        fontSize = 20.sp,
        lineHeight = 26.sp,
        letterSpacing = (-0.01).em
    ),
    titleMedium = TextStyle(
        fontFamily = IBMPlexSansFontFamily,
        fontWeight = FontWeight.SemiBold,
        fontSize = 16.sp,
        lineHeight = 24.sp,
        letterSpacing = 0.15.sp
    ),
    titleSmall = TextStyle(
        fontFamily = IBMPlexSansFontFamily,
        fontWeight = FontWeight.SemiBold,
        fontSize = 14.sp,
        lineHeight = 20.sp,
        letterSpacing = 0.1.sp
    ),
    bodyLarge = TextStyle(
        fontFamily = IBMPlexSansFontFamily,
        fontWeight = FontWeight.Normal,
        fontSize = 16.sp,
        lineHeight = 24.sp,
        letterSpacing = 0.5.sp
    ),
    bodyMedium = TextStyle(
        fontFamily = IBMPlexSansFontFamily,
        fontWeight = FontWeight.Normal,
        fontSize = 14.sp,
        lineHeight = 20.sp,
        letterSpacing = 0.25.sp
    ),
    bodySmall = TextStyle(
        fontFamily = IBMPlexSansFontFamily,
        fontWeight = FontWeight.Normal,
        fontSize = 12.sp,
        lineHeight = 16.sp,
        letterSpacing = 0.4.sp
    ),
    labelLarge = TextStyle(
        fontFamily = IBMPlexSansFontFamily,
        fontWeight = FontWeight.SemiBold,
        fontSize = 14.sp,
        lineHeight = 20.sp,
        letterSpacing = 0.1.sp
    ),
    labelMedium = TextStyle(
        fontFamily = IBMPlexSansFontFamily,
        fontWeight = FontWeight.Medium,
        fontSize = 12.sp,
        lineHeight = 16.sp,
        letterSpacing = 0.5.sp
    ),
    labelSmall = TextStyle(
        fontFamily = IBMPlexSansFontFamily,
        fontWeight = FontWeight.Medium,
        fontSize = 11.sp,
        lineHeight = 14.sp,
        letterSpacing = 0.5.sp
    )
)
