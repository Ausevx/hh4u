package com.healinghands4u.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "search_events")
data class SearchEventEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val queryText: String,
    val timestamp: Long,
    val userId: String?,
    val matchedQuestionId: String?,
    val synced: Boolean = false
)
