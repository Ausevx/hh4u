package com.healinghands4u.data.local

import androidx.room.Database
import androidx.room.RoomDatabase

@Database(entities = [DiseaseEntity::class], version = 1, exportSchema = false)
abstract class AppDatabase : RoomDatabase() {
    abstract fun diseaseDao(): DiseaseDao
}
