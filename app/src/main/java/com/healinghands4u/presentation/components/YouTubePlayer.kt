package com.healinghands4u.presentation.components

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.VideocamOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImagePainter
import coil.compose.rememberAsyncImagePainter
import coil.request.ImageRequest
import com.healinghands4u.presentation.theme.SoraFontFamily
import com.healinghands4u.presentation.theme.trustedTealColors

/**
 * Extracts the YouTube video ID from common URL formats:
 *  - https://www.youtube.com/watch?v=VIDEO_ID
 *  - https://youtu.be/VIDEO_ID
 *  - https://youtube.com/shorts/VIDEO_ID
 *  - https://www.youtube.com/embed/VIDEO_ID
 */
fun extractYouTubeVideoId(url: String): String? {
    val patterns = listOf(
        Regex("""youtube\.com/watch\?.*v=([a-zA-Z0-9_-]{11})"""),
        Regex("""youtu\.be/([a-zA-Z0-9_-]{11})"""),
        Regex("""youtube\.com/shorts/([a-zA-Z0-9_-]{11})"""),
        Regex("""youtube\.com/embed/([a-zA-Z0-9_-]{11})"""),
    )
    for (pattern in patterns) {
        val match = pattern.find(url)
        if (match != null) return match.groupValues[1]
    }
    return null
}

/**
 * YouTube video card. Shows a thumbnail with a play overlay.
 * Tapping opens the YouTube app (or browser) instead of an inline iframe.
 */
@Composable
fun YouTubePlayer(
    videoUrl: String,
    modifier: Modifier = Modifier
) {
    val tokens = MaterialTheme.trustedTealColors
    val context = LocalContext.current
    val videoId = remember(videoUrl) { extractYouTubeVideoId(videoUrl) }

    if (videoId == null) {
        // Not a YouTube URL — show a minimal fallback card
        NonYouTubeVideoFallback(videoUrl, modifier)
        return
    }

    val thumbnailUrl = "https://img.youtube.com/vi/$videoId/hqdefault.jpg"

    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable {
                // Open in YouTube app or browser
                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(videoUrl))
                context.startActivity(intent)
            },
        shape = RoundedCornerShape(14.dp),
        border = BorderStroke(1.dp, tokens.line),
        colors = CardDefaults.cardColors(containerColor = tokens.surface)
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            // Label
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(tokens.surfaceTint)
                    .padding(horizontal = 14.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Default.PlayArrow,
                    contentDescription = null,
                    tint = tokens.accent,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = "Watch on YouTube",
                    style = MaterialTheme.typography.labelMedium.copy(
                        fontFamily = SoraFontFamily,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 13.sp
                    ),
                    color = tokens.ink
                )
            }

            // Thumbnail area — 16:9 aspect ratio
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(16f / 9f)
                    .clip(RoundedCornerShape(bottomStart = 14.dp, bottomEnd = 14.dp)),
                contentAlignment = Alignment.Center
            ) {
                ThumbnailWithPlayOverlay(
                    thumbnailUrl = thumbnailUrl,
                    accentColor = tokens.accent
                )
            }
        }
    }
}

@Composable
private fun ThumbnailWithPlayOverlay(
    thumbnailUrl: String,
    accentColor: Color
) {
    val painter = rememberAsyncImagePainter(
        model = ImageRequest.Builder(LocalContext.current)
            .data(thumbnailUrl)
            .crossfade(true)
            .build()
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF1A1A1A)),
        contentAlignment = Alignment.Center
    ) {
        // Thumbnail image
        when (painter.state) {
            is AsyncImagePainter.State.Error -> {
                // Offline or failed — show placeholder
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        imageVector = Icons.Default.VideocamOff,
                        contentDescription = null,
                        tint = Color.White.copy(alpha = 0.5f),
                        modifier = Modifier.size(40.dp)
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Video available when online",
                        color = Color.White.copy(alpha = 0.6f),
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }
            else -> {
                Image(
                    painter = painter,
                    contentDescription = "Video thumbnail",
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop
                )
            }
        }

        // Play button overlay (always visible on top of thumbnail)
        if (painter.state !is AsyncImagePainter.State.Error) {
            Surface(
                shape = CircleShape,
                color = Color.Red.copy(alpha = 0.9f),
                shadowElevation = 4.dp,
                modifier = Modifier.size(56.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.PlayArrow,
                    contentDescription = "Play on YouTube",
                    tint = Color.White,
                    modifier = Modifier
                        .padding(12.dp)
                        .size(32.dp)
                )
            }
        }
    }
}

@Composable
private fun NonYouTubeVideoFallback(
    videoUrl: String,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val tokens = MaterialTheme.trustedTealColors
    VideoLink(
        url = videoUrl,
        label = "Watch Remedy Guide Video",
        onClick = { url ->
            try {
                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                context.startActivity(intent)
            } catch (_: Exception) { }
        },
        modifier = modifier
    )
}
