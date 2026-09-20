package com.healinghands4u.data.remote

import com.healinghands4u.data.local.DiseaseEntity
import retrofit2.http.GET

interface SyncService {
    @GET("sync/diseases")
    suspend fun getDiseases(): List<DiseaseEntity>
}
