#!/bin/bash
set -e

# Data Layer
mkdir -p app/src/main/java/com/healinghands4u/data/local
mkdir -p app/src/main/java/com/healinghands4u/data/remote
mkdir -p app/src/main/java/com/healinghands4u/data/repository
mkdir -p app/src/main/java/com/healinghands4u/auth
mkdir -p app/src/main/java/com/healinghands4u/presentation/auth

cat << 'INNER_EOF' > app/src/main/java/com/healinghands4u/data/local/DiseaseEntity.kt
package com.healinghands4u.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "diseases")
data class DiseaseEntity(
    @PrimaryKey val id: String,
    val name: String,
    val category: String,
    val primaryRemedies: String,
    val symptoms: String,
    val dosageGuideline: String,
    val videoUrl: String? = null,
    val embedding: String? = null // Stored as comma-separated string for local cosine similarity
)
INNER_EOF

cat << 'INNER_EOF' > app/src/main/java/com/healinghands4u/data/local/DiseaseDao.kt
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
INNER_EOF

cat << 'INNER_EOF' > app/src/main/java/com/healinghands4u/data/local/AppDatabase.kt
package com.healinghands4u.data.local

import androidx.room.Database
import androidx.room.RoomDatabase

@Database(entities = [DiseaseEntity::class], version = 1, exportSchema = false)
abstract class AppDatabase : RoomDatabase() {
    abstract fun diseaseDao(): DiseaseDao
}
INNER_EOF

cat << 'INNER_EOF' > app/src/main/java/com/healinghands4u/data/remote/SyncService.kt
package com.healinghands4u.data.remote

import com.healinghands4u.data.local.DiseaseEntity
import retrofit2.http.GET

interface SyncService {
    @GET("sync/diseases")
    suspend fun getDiseases(): List<DiseaseEntity>
}
INNER_EOF

cat << 'INNER_EOF' > app/src/main/java/com/healinghands4u/data/repository/KnowledgeRepository.kt
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
INNER_EOF

cat << 'INNER_EOF' > app/src/main/java/com/healinghands4u/auth/FirebaseAuthManager.kt
package com.healinghands4u.auth

import com.google.firebase.auth.FirebaseAuth
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.tasks.await

@Singleton
class FirebaseAuthManager @Inject constructor() {
    private val auth: FirebaseAuth by lazy { FirebaseAuth.getInstance() }

    fun getCurrentUser() = auth.currentUser

    suspend fun signInWithEmailLink(email: String, emailLink: String): Boolean {
        return try {
            auth.signInWithEmailLink(email, emailLink).await()
            true
        } catch (e: Exception) {
            false
        }
    }

    suspend fun signInAnonymously(): Boolean {
        return try {
            auth.signInAnonymously().await()
            true
        } catch (e: Exception) {
            false
        }
    }

    fun signOut() {
        auth.signOut()
    }
}
INNER_EOF

cat << 'INNER_EOF' > app/src/main/java/com/healinghands4u/presentation/auth/AuthViewModel.kt
package com.healinghands4u.presentation.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.healinghands4u.auth.FirebaseAuthManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val firebaseAuthManager: FirebaseAuthManager
) : ViewModel() {
    
    private val _loginState = MutableStateFlow<Boolean>(false)
    val loginState: StateFlow<Boolean> = _loginState

    fun loginAnonymously() {
        viewModelScope.launch {
            val success = firebaseAuthManager.signInAnonymously()
            _loginState.value = success
        }
    }

    fun verifyOtp(email: String, otp: String) {
        // Mock verification
        viewModelScope.launch {
            _loginState.value = true
        }
    }
}
INNER_EOF

cat << 'INNER_EOF' > app/src/main/java/com/healinghands4u/presentation/chatbot/ChatbotViewModel.kt
package com.healinghands4u.presentation.chatbot

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.healinghands4u.data.repository.KnowledgeRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

@HiltViewModel
class ChatbotViewModel @Inject constructor(
    private val repository: KnowledgeRepository
) : ViewModel() {
    
    private val _state = MutableStateFlow<String>("Idle")
    val state: StateFlow<String> = _state

    fun querySymptoms(symptoms: String) {
        viewModelScope.launch {
            // Mock embedding and similarity call
            val embedding = FloatArray(10) { 0.1f }
            val results = repository.findSimilarDiseases(embedding)
            _state.value = "Found ${results.size} matches"
        }
    }
}
INNER_EOF

# Node.js Serverless AI Proxy
mkdir -p firebase-functions/src
cat << 'INNER_EOF' > firebase-functions/package.json
{
  "name": "firebase-functions",
  "version": "1.0.0",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "serve": "npm run build && firebase emulators:start --only functions"
  },
  "dependencies": {
    "firebase-admin": "^11.10.1",
    "firebase-functions": "^4.4.1",
    "@google/genai": "^0.1.2"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
INNER_EOF

cat << 'INNER_EOF' > firebase-functions/tsconfig.json
{
  "compilerOptions": {
    "module": "commonjs",
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "outDir": "dist",
    "sourceMap": true,
    "strict": true,
    "target": "es2017"
  },
  "compileOnSave": true,
  "include": [
    "src"
  ]
}
INNER_EOF

cat << 'INNER_EOF' > firebase-functions/src/index.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { GoogleGenAI } from '@google/genai';

admin.initializeApp();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const diagnoseSymptoms = functions.https.onRequest(async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).send('Unauthorized');
            return;
        }

        const idToken = authHeader.split('Bearer ')[1];
        await admin.auth().verifyIdToken(idToken);

        const symptoms = req.body.symptoms;
        if (!symptoms) {
            res.status(400).send('Symptoms are required');
            return;
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `The user has the following symptoms: ${symptoms}. Suggest a homeopathic remedy.`
        });

        res.status(200).json({ recommendation: response.text });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});
INNER_EOF

