package com.healinghands4u.data.repository

import com.healinghands4u.data.local.DiseaseDao
import com.healinghands4u.data.local.DiseaseEntity
import com.healinghands4u.data.local.findSimilar
import com.healinghands4u.data.remote.SyncService
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow

@Singleton
class KnowledgeRepository @Inject constructor(
    private val diseaseDao: DiseaseDao,
    private val syncService: SyncService
) {
    fun getAllDiseases(): Flow<List<DiseaseEntity>> = flow {
        emit(diseaseDao.getAllDiseases())
    }

    suspend fun syncKnowledge() {
        try {
            val remoteData = syncService.getDiseases()
            diseaseDao.insertAll(remoteData)
        } catch (e: Exception) {
            // Handle error appropriately
        }
    }

    suspend fun findSimilarDiseases(queryEmbedding: FloatArray): List<DiseaseEntity> {
        val all = diseaseDao.getAllDiseases()
        return all.findSimilar(queryEmbedding)
    }
}
