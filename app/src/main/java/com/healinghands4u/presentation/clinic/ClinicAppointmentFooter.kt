package com.healinghands4u.presentation.clinic

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.healinghands4u.R
import com.healinghands4u.config.BrandingConfig
import com.healinghands4u.presentation.theme.WhatsAppGreen
import com.healinghands4u.presentation.theme.trustedTealColors

fun openWhatsAppAppointment(context: Context, phoneNumber: String = BrandingConfig.WHATSAPP_NUMBER, message: String = BrandingConfig.APPOINTMENT_PREFILLED_MESSAGE) {
    try {
        val cleanNumber = phoneNumber.replace("+", "").replace(" ", "").replace("-", "").trim()
        val encodedMessage = Uri.encode(message)
        val uri = Uri.parse("https://wa.me/$cleanNumber?text=$encodedMessage")
        val intent = Intent(Intent.ACTION_VIEW, uri).apply {
            setPackage("com.whatsapp")
        }
        context.startActivity(intent)
    } catch (e: ActivityNotFoundException) {
        // Fallback to generic browser / any app that handles wa.me
        try {
            val cleanNumber = phoneNumber.replace("+", "").replace(" ", "").replace("-", "").trim()
            val encodedMessage = Uri.encode(message)
            val uri = Uri.parse("https://wa.me/$cleanNumber?text=$encodedMessage")
            context.startActivity(Intent(Intent.ACTION_VIEW, uri))
        } catch (_: Exception) {
            Toast.makeText(context, "Unable to open WhatsApp", Toast.LENGTH_SHORT).show()
        }
    } catch (_: Exception) {
        Toast.makeText(context, "Unable to open WhatsApp", Toast.LENGTH_SHORT).show()
    }
}

@Composable
fun ClinicAppointmentFooter(
    modifier: Modifier = Modifier,
    phoneNumber: String = BrandingConfig.WHATSAPP_NUMBER,
    doctorName: String = BrandingConfig.DOCTOR_NAME,
    qualifications: String = BrandingConfig.DOCTOR_QUALIFICATIONS,
    address: String = BrandingConfig.CLINIC_ADDRESS
) {
    val context = LocalContext.current
    val tokens = MaterialTheme.trustedTealColors

    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = 12.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = "Message for Appointment Now",
            style = MaterialTheme.typography.bodyMedium.copy(
                fontStyle = androidx.compose.ui.text.font.FontStyle.Italic,
                fontWeight = FontWeight.Medium
            ),
            color = tokens.inkDim,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(8.dp))

        // WhatsApp appointment button
        Button(
            onClick = {
                openWhatsAppAppointment(context, phoneNumber)
            },
            colors = ButtonDefaults.buttonColors(
                containerColor = WhatsAppGreen,
                contentColor = Color.White
            ),
            shape = RoundedCornerShape(24.dp),
            contentPadding = PaddingValues(horizontal = 24.dp, vertical = 10.dp),
            elevation = ButtonDefaults.buttonElevation(defaultElevation = 2.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Center
            ) {
                Icon(
                    painter = painterResource(id = R.drawable.ic_whatsapp),
                    contentDescription = "WhatsApp",
                    modifier = Modifier.size(22.dp),
                    tint = Color.White
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = phoneNumber,
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp
                    ),
                    color = Color.White
                )
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = "$doctorName ($qualifications)",
            style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.SemiBold),
            color = tokens.ink,
            textAlign = TextAlign.Center
        )
        Text(
            text = address,
            style = MaterialTheme.typography.labelSmall,
            color = tokens.inkDim,
            textAlign = TextAlign.Center
        )
    }
}
