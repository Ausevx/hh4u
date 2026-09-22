package com.healinghands4u.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query

@Dao
interface SearchEventDao {

    @Insert
    suspend fun insert(event: SearchEventEntity)

    @Query("SELECT * FROM search_events WHERE synced = 0")
    suspend fun getUnsynced(): List<SearchEventEntity>

    @Query("UPDATE search_events SET synced = 1 WHERE id IN (:ids)")
    suspend fun markSynced(ids: List<Long>)

    @Query("DELETE FROM search_events WHERE synced = 1 AND timestamp < :beforeTimestamp")
    suspend fun deleteOldSynced(beforeTimestamp: Long)
}
