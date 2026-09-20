package com.healinghands4u.presentation.common

import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Chat
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.healinghands4u.config.BrandingConfig
import com.healinghands4u.presentation.theme.AppIcons
import com.healinghands4u.presentation.theme.SoraFontFamily
import com.healinghands4u.presentation.theme.WhatsAppGreen
import com.healinghands4u.presentation.theme.trustedTealColors

@Composable
fun DoctorContactFooter(
    modifier: Modifier = Modifier,
    doctorName: String = BrandingConfig.DOCTOR_NAME,
    qualifications: String = BrandingConfig.DOCTOR_QUALIFICATIONS,
    clinicAddress: String = BrandingConfig.CLINIC_ADDRESS,
    phoneNumber: String = BrandingConfig.WHATSAPP_NUMBER
) {
    val context = LocalContext.current
    val tokens = MaterialTheme.trustedTealColors

    Card(
        modifier = modifier
            .fillMaxWidth()
            .testTag(TestTags.FOOTER_CARD),
        shape = RoundedCornerShape(16.dp),
        border = BorderStroke(1.dp, tokens.line),
        colors = CardDefaults.cardColors(
            containerColor = tokens.surface
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            // Header with avatar & doctor info
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                Surface(
                    shape = CircleShape,
                    color = tokens.surfaceTint,
                    modifier = Modifier.size(52.dp)
                ) {
                    Icon(
                        imageVector = AppIcons.Doctor,
                        contentDescription = "Doctor Icon",
                        tint = tokens.accent,
                        modifier = Modifier
                            .padding(12.dp)
                            .size(28.dp)
                    )
                }

                Spacer(modifier = Modifier.width(14.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = doctorName,
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontFamily = SoraFontFamily,
                            fontWeight = FontWeight.Bold
                        ),
                        color = tokens.ink,
                        modifier = Modifier.testTag(TestTags.FOOTER_DOCTOR_NAME)
                    )
                    Text(
                        text = qualifications,
                        style = MaterialTheme.typography.bodyMedium,
                        color = tokens.inkDim,
                        modifier = Modifier.testTag(TestTags.FOOTER_QUALIFICATIONS)
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Clinic Address Row
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(
                    imageVector = Icons.Default.LocationOn,
                    contentDescription = "Clinic Address",
                    tint = tokens.accent,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = clinicAddress,
                    style = MaterialTheme.typography.bodySmall,
                    color = tokens.inkDim,
                    modifier = Modifier.testTag(TestTags.FOOTER_CLINIC_ADDRESS)
                )
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Action Buttons Row (WhatsApp & Call)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                FilledTonalButton(
                    onClick = {
                        try {
                            val cleanNumber = phoneNumber.replace("+", "").replace(" ", "").trim()
                            val intent = Intent(
                                Intent.ACTION_VIEW,
                                Uri.parse("https://wa.me/$cleanNumber")
                            )
                            context.startActivity(intent)
                        } catch (e: ActivityNotFoundException) {
                            Toast.makeText(context, "WhatsApp is not installed", Toast.LENGTH_SHORT).show()
                        } catch (e: Exception) {
                            Toast.makeText(context, "Unable to open WhatsApp", Toast.LENGTH_SHORT).show()
                        }
                    },
                    modifier = Modifier
                        .weight(1f)
                        .testTag(TestTags.FOOTER_WHATSAPP_BUTTON),
                    colors = ButtonDefaults.filledTonalButtonColors(
                        containerColor = WhatsAppGreen.copy(alpha = 0.15f),
                        contentColor = WhatsAppGreen
                    ),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Chat,
                        contentDescription = "WhatsApp",
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "WhatsApp",
                        style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.SemiBold)
                    )
                }

                OutlinedButton(
                    onClick = {
                        try {
                            val intent = Intent(
                                Intent.ACTION_DIAL,
                                Uri.parse("tel:$phoneNumber")
                            )
                            context.startActivity(intent)
                        } catch (e: ActivityNotFoundException) {
                            Toast.makeText(context, "No dialer application found", Toast.LENGTH_SHORT).show()
                        } catch (e: Exception) {
                            Toast.makeText(context, "Unable to dial phone number", Toast.LENGTH_SHORT).show()
                        }
                    },
                    modifier = Modifier
                        .weight(1f)
                        .testTag(TestTags.FOOTER_CALL_BUTTON),
                    border = BorderStroke(1.dp, tokens.accent),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Phone,
                        contentDescription = "Call Clinic",
                        tint = tokens.accent,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "Call Clinic",
                        style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.SemiBold),
                        color = tokens.accent
                    )
                }
            }
        }
    }
}
