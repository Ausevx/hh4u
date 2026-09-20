package com.healinghands4u.presentation.components

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.healinghands4u.config.BrandingConfig
import com.healinghands4u.presentation.common.DoctorContactFooter as CommonDoctorContactFooter

@Composable
fun DoctorContactFooter(
    modifier: Modifier = Modifier,
    doctorName: String = BrandingConfig.DOCTOR_NAME,
    qualifications: String = BrandingConfig.DOCTOR_QUALIFICATIONS,
    clinicAddress: String = BrandingConfig.CLINIC_ADDRESS,
    phoneNumber: String = BrandingConfig.WHATSAPP_NUMBER
) {
    CommonDoctorContactFooter(
        modifier = modifier,
        doctorName = doctorName,
        qualifications = qualifications,
        clinicAddress = clinicAddress,
        phoneNumber = phoneNumber
    )
}
