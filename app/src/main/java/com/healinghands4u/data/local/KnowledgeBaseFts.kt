package com.healinghands4u.data.local

import androidx.room.Entity
import androidx.room.Fts4

@Fts4(contentEntity = KnowledgeBaseEntity::class)
@Entity(tableName = "knowledge_base_fts")
data class KnowledgeBaseFts(
    val questionText: String,
    val answerText: String?,
    val remedyText: String?,
    val tags: String?
)
