package com.healinghands4u.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "diseases")
data class DiseaseEntity(
    @PrimaryKey val id: String,
    val name: String,
    val category: String,
    val primaryRemedies: String,
    val symptoms: String,
    val dosageGuideline: String,
    val videoUrl: String? = null,
    val embedding: String? = null // Stored as comma-separated string for local cosine similarity
)
