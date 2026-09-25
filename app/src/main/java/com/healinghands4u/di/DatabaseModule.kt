package com.healinghands4u.di

import android.content.Context
import androidx.room.Room
import com.healinghands4u.data.local.AppDatabase
import com.healinghands4u.data.local.DiseaseDao
import com.healinghands4u.data.local.KnowledgeBaseDao
import com.healinghands4u.data.local.SearchEventDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideAppDatabase(@ApplicationContext context: Context): AppDatabase {
        return Room.databaseBuilder(
            context,
            AppDatabase::class.java,
            "healing_hands_db"
        ).addMigrations(object : androidx.room.migration.Migration(2, 3) {
            override fun migrate(db: androidx.sqlite.db.SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE knowledge_base ADD COLUMN consultationJson TEXT")
            }
        }).fallbackToDestructiveMigration().build()
    }

    @Provides
    fun provideDiseaseDao(database: AppDatabase): DiseaseDao {
        return database.diseaseDao()
    }

    @Provides
    fun provideKnowledgeBaseDao(database: AppDatabase): KnowledgeBaseDao {
        return database.knowledgeBaseDao()
    }

    @Provides
    fun provideSearchEventDao(database: AppDatabase): SearchEventDao {
        return database.searchEventDao()
    }
}
