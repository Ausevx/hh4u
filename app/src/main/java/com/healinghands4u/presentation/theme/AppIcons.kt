package com.healinghands4u.presentation.theme

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Search
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathFillType
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.path
import androidx.compose.ui.unit.dp

/**
 * Line-art SVG vector icons for Healing Hands4U.
 * Strict rule: Line-art only (stroke 1.4-1.8 dp). ZERO emojis.
 */
object AppIcons {

    val Leaf: ImageVector by lazy {
        ImageVector.Builder(
            name = "Leaf",
            defaultWidth = 24.dp,
            defaultHeight = 24.dp,
            viewportWidth = 24f,
            viewportHeight = 24f
        ).path(
            stroke = SolidColor(Color.Black),
            strokeLineWidth = 1.6f,
            strokeLineCap = StrokeCap.Round,
            strokeLineJoin = StrokeJoin.Round
        ) {
            moveTo(20.24f, 12.24f)
            arcToRelative(6f, 6f, 0f, false, false, -8.49f, -8.49f)
            lineTo(5f, 10.5f)
            verticalLineTo(19f)
            horizontalLineToRelative(8.5f)
            close()
            moveTo(16f, 8f)
            lineTo(2f, 22f)
            moveTo(17.5f, 15f)
            horizontalLineTo(9f)
        }.build()
    }

    val Pills: ImageVector by lazy {
        ImageVector.Builder(
            name = "Pills",
            defaultWidth = 24.dp,
            defaultHeight = 24.dp,
            viewportWidth = 24f,
            viewportHeight = 24f
        ).path(
            stroke = SolidColor(Color.Black),
            strokeLineWidth = 1.6f,
            strokeLineCap = StrokeCap.Round,
            strokeLineJoin = StrokeJoin.Round
        ) {
            moveTo(10.5f, 6.5f)
            lineToRelative(-4f, 4f)
            arcToRelative(4.24f, 4.24f, 0f, false, false, 6f, 6f)
            lineToRelative(4f, -4f)
            arcToRelative(4.24f, 4.24f, 0f, false, false, -6f, -6f)
            close()
            moveTo(8.5f, 8.5f)
            lineToRelative(6f, 6f)
            moveTo(16.5f, 3.5f)
            arcToRelative(3f, 3f, 0f, true, true, -3f, 3f)
        }.build()
    }

    val Pulse: ImageVector by lazy {
        ImageVector.Builder(
            name = "Pulse",
            defaultWidth = 24.dp,
            defaultHeight = 24.dp,
            viewportWidth = 24f,
            viewportHeight = 24f
        ).path(
            stroke = SolidColor(Color.Black),
            strokeLineWidth = 1.6f,
            strokeLineCap = StrokeCap.Round,
            strokeLineJoin = StrokeJoin.Round
        ) {
            moveTo(2f, 12f)
            horizontalLineToRelative(4f)
            lineToRelative(3f, -9f)
            lineToRelative(4f, 18f)
            lineToRelative(3f, -9f)
            horizontalLineToRelative(6f)
        }.build()
    }

    val Play: ImageVector by lazy {
        ImageVector.Builder(
            name = "Play",
            defaultWidth = 24.dp,
            defaultHeight = 24.dp,
            viewportWidth = 24f,
            viewportHeight = 24f
        ).path(
            stroke = SolidColor(Color.Black),
            strokeLineWidth = 1.6f,
            strokeLineCap = StrokeCap.Round,
            strokeLineJoin = StrokeJoin.Round
        ) {
            moveTo(7f, 5.5f)
            verticalLineToRelative(13f)
            arcToRelative(1f, 1f, 0f, false, false, 1.5f, 0.86f)
            lineToRelative(11f, -6.5f)
            arcToRelative(1f, 1f, 0f, false, false, 0f, -1.72f)
            lineToRelative(-11f, -6.5f)
            arcToRelative(1f, 1f, 0f, false, false, -1.5f, 0.86f)
            close()
        }.build()
    }

    val Mic: ImageVector by lazy {
        ImageVector.Builder(
            name = "Mic",
            defaultWidth = 24.dp,
            defaultHeight = 24.dp,
            viewportWidth = 24f,
            viewportHeight = 24f
        ).path(
            stroke = SolidColor(Color.Black),
            strokeLineWidth = 1.6f,
            strokeLineCap = StrokeCap.Round,
            strokeLineJoin = StrokeJoin.Round
        ) {
            moveTo(12f, 2f)
            arcToRelative(3f, 3f, 0f, false, false, -3f, 3f)
            verticalLineToRelative(6f)
            arcToRelative(3f, 3f, 0f, false, false, 6f, 0f)
            verticalLineTo(5f)
            arcToRelative(3f, 3f, 0f, false, false, -3f, -3f)
            close()
            moveTo(19f, 10f)
            verticalLineToRelative(1f)
            arcToRelative(7f, 7f, 0f, false, true, -14f, 0f)
            verticalLineToRelative(-1f)
            moveTo(12f, 18f)
            verticalLineToRelative(4f)
            moveTo(8f, 22f)
            horizontalLineToRelative(8f)
        }.build()
    }

    val Chat: ImageVector by lazy {
        ImageVector.Builder(
            name = "Chat",
            defaultWidth = 24.dp,
            defaultHeight = 24.dp,
            viewportWidth = 24f,
            viewportHeight = 24f
        ).path(
            stroke = SolidColor(Color.Black),
            strokeLineWidth = 1.6f,
            strokeLineCap = StrokeCap.Round,
            strokeLineJoin = StrokeJoin.Round
        ) {
            moveTo(21f, 11.5f)
            arcToRelative(8.38f, 8.38f, 0f, false, true, -0.9f, 3.8f)
            arcToRelative(8.5f, 8.5f, 0f, false, true, -7.6f, 4.7f)
            arcToRelative(8.38f, 8.38f, 0f, false, true, -3.8f, -0.9f)
            lineTo(3f, 21f)
            lineToRelative(1.9f, -5.7f)
            arcToRelative(8.38f, 8.38f, 0f, false, true, -0.9f, -3.8f)
            arcToRelative(8.5f, 8.5f, 0f, false, true, 4.7f, -7.6f)
            arcToRelative(8.38f, 8.38f, 0f, false, true, 3.8f, -0.9f)
            horizontalLineToRelative(0.5f)
            arcToRelative(8.5f, 8.5f, 0f, false, true, 8f, 8f)
            verticalLineToRelative(0.5f)
            close()
        }.build()
    }

    val Doctor: ImageVector by lazy {
        ImageVector.Builder(
            name = "Doctor",
            defaultWidth = 24.dp,
            defaultHeight = 24.dp,
            viewportWidth = 24f,
            viewportHeight = 24f
        ).path(
            stroke = SolidColor(Color.Black),
            strokeLineWidth = 1.6f,
            strokeLineCap = StrokeCap.Round,
            strokeLineJoin = StrokeJoin.Round
        ) {
            moveTo(4f, 4f)
            verticalLineToRelative(6f)
            arcToRelative(6f, 6f, 0f, false, false, 12f, 0f)
            verticalLineTo(4f)
            moveTo(10f, 16f)
            verticalLineToRelative(2f)
            arcToRelative(4f, 4f, 0f, false, false, 8f, 0f)
            verticalLineToRelative(-2f)
            moveTo(18f, 14f)
            arcToRelative(2f, 2f, 0f, true, false, 0f, -4f)
            arcToRelative(2f, 2f, 0f, false, false, 0f, 4f)
            close()
            moveTo(3f, 4f)
            horizontalLineToRelative(2f)
            moveTo(15f, 4f)
            horizontalLineToRelative(2f)
        }.build()
    }

    val Calendar: ImageVector by lazy {
        ImageVector.Builder(
            name = "Calendar",
            defaultWidth = 24.dp,
            defaultHeight = 24.dp,
            viewportWidth = 24f,
            viewportHeight = 24f
        ).path(
            stroke = SolidColor(Color.Black),
            strokeLineWidth = 1.6f,
            strokeLineCap = StrokeCap.Round,
            strokeLineJoin = StrokeJoin.Round
        ) {
            moveTo(19f, 4f)
            horizontalLineTo(5f)
            arcToRelative(2f, 2f, 0f, false, false, -2f, 2f)
            verticalLineToRelative(14f)
            arcToRelative(2f, 2f, 0f, false, false, 2f, 2f)
            horizontalLineToRelative(14f)
            arcToRelative(2f, 2f, 0f, false, false, 2f, -2f)
            verticalLineTo(6f)
            arcToRelative(2f, 2f, 0f, false, false, -2f, -2f)
            close()
            moveTo(16f, 2f)
            verticalLineToRelative(4f)
            moveTo(8f, 2f)
            verticalLineToRelative(4f)
            moveTo(3f, 10f)
            horizontalLineToRelative(18f)
        }.build()
    }

    val Search: ImageVector = Icons.Default.Search
    val Clear: ImageVector = Icons.Default.Clear
    val ArrowBack: ImageVector = Icons.Default.ArrowBack
}
