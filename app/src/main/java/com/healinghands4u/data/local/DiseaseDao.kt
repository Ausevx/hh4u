package com.healinghands4u.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlin.math.sqrt

@Dao
interface DiseaseDao {
    @Query("SELECT * FROM diseases")
    suspend fun getAllDiseases(): List<DiseaseEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(diseases: List<DiseaseEntity>)

    @Query("DELETE FROM diseases")
    suspend fun clearAll()
}

// Extension function for cosine similarity
fun List<DiseaseEntity>.findSimilar(queryEmbedding: FloatArray, topK: Int = 5): List<DiseaseEntity> {
    return this.mapNotNull { entity ->
        val entityEmbedding = entity.embedding?.split(",")?.mapNotNull { it.toFloatOrNull() }?.toFloatArray()
        if (entityEmbedding != null && entityEmbedding.size == queryEmbedding.size) {
            val similarity = cosineSimilarity(queryEmbedding, entityEmbedding)
            Pair(entity, similarity)
        } else {
            null
        }
    }.sortedByDescending { it.second }.take(topK).map { it.first }
}

fun cosineSimilarity(v1: FloatArray, v2: FloatArray): Float {
    var dotProduct = 0f
    var norm1 = 0f
    var norm2 = 0f
    for (i in v1.indices) {
        dotProduct += v1[i] * v2[i]
        norm1 += v1[i] * v1[i]
        norm2 += v2[i] * v2[i]
    }
    return if (norm1 == 0f || norm2 == 0f) 0f else dotProduct / (sqrt(norm1) * sqrt(norm2))
}
