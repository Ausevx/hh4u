package com.healinghands4u.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "knowledge_base")
data class KnowledgeBaseEntity(
    @PrimaryKey val id: String,
    val questionText: String,
    val answerText: String?,
    val reasonText: String?,
    val remedyText: String?,
    val homeRemedyText: String?,
    val dosageInstructions: String?,
    val safetyDisclaimerText: String?,
    val videoUrl: String?,
    val diagnosticQ1: String?,
    val diagnosticQ2: String?,
    val diagnosticQ3: String?,
    val tags: String?,
    val updatedAt: Long,
    val consultationJson: String? = null
)
