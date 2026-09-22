package com.healinghands4u.data.local

import androidx.room.Database
import androidx.room.RoomDatabase

@Database(
    entities = [
        DiseaseEntity::class,
        KnowledgeBaseEntity::class,
        KnowledgeBaseFts::class,
        SearchEventEntity::class
    ],
    version = 2,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun diseaseDao(): DiseaseDao
    abstract fun knowledgeBaseDao(): KnowledgeBaseDao
    abstract fun searchEventDao(): SearchEventDao
}
