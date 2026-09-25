package com.healinghands4u.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query

@Dao
interface KnowledgeBaseDao {

    @androidx.room.Transaction
    suspend fun replaceAll(entries: List<KnowledgeBaseEntity>) {
        clearAll()
        insertAll(entries)
    }

    @Query("SELECT * FROM knowledge_base WHERE id = :id")
    suspend fun getById(id: String): KnowledgeBaseEntity?

    @Query("""
        SELECT kb.* FROM knowledge_base kb
        INNER JOIN knowledge_base_fts fts ON kb.rowid = fts.rowid
        WHERE knowledge_base_fts MATCH :query
        LIMIT :limit
    """)
    suspend fun searchByKeyword(query: String, limit: Int = 10): List<KnowledgeBaseEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(entries: List<KnowledgeBaseEntity>)

    @Query("DELETE FROM knowledge_base")
    suspend fun clearAll()

    @Query("SELECT COUNT(*) FROM knowledge_base")
    suspend fun getCount(): Int

    @Query("SELECT * FROM knowledge_base")
    suspend fun getAll(): List<KnowledgeBaseEntity>
}
