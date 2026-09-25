package com.healinghands4u.data.repository

import android.content.Context
import android.content.SharedPreferences
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.util.Log
import com.healinghands4u.data.local.KnowledgeBaseDao
import com.healinghands4u.data.local.KnowledgeBaseEntity
import com.healinghands4u.data.local.SearchEventDao
import com.healinghands4u.data.local.SearchEventEntity
import com.healinghands4u.data.remote.KnowledgeBaseSyncApi
import com.healinghands4u.data.remote.SearchEventDto
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.CancellationException

private const val TAG = "OfflineSearchRepo"
private const val PREFS_NAME = "kb_sync_prefs"
private const val KEY_LAST_SYNC = "last_sync_version"
private const val KEY_LAST_SYNC_TIME = "last_sync_time"
private const val STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000L // 24 hours

@Singleton
class OfflineSearchRepository @Inject constructor(
    @ApplicationContext private val context: Context,
    private val knowledgeBaseDao: KnowledgeBaseDao,
    private val searchEventDao: SearchEventDao,
    private val syncApi: KnowledgeBaseSyncApi
) {
    private val cacheMutex = kotlinx.coroutines.sync.Mutex()
    private val gson = com.google.gson.Gson()
    private val prefs: SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    /**
     * Returns true if the device has an active network connection.
     */
    fun isOnline(): Boolean {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
            ?: return false
        val network = cm.activeNetwork ?: return false
        val caps = cm.getNetworkCapabilities(network) ?: return false
        return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }

    /**
     * Searches the local knowledge base using ranked keyword matching.
     * Returns an empty list if no matches are found.
     */
    suspend fun searchOffline(query: String): List<KnowledgeBaseEntity> {
        getLocalKbCount()
        return OfflineKnowledgeMatcher.search(query, knowledgeBaseDao.getAll())
    }

    suspend fun getById(id: String): KnowledgeBaseEntity? = knowledgeBaseDao.getById(id)

    /**
     * Downloads the knowledge base from the backend and replaces the local cache.
     * Uses version checking to skip re-downloading if data hasn't changed.
     */
    suspend fun syncKnowledgeBase(): Boolean = cacheMutex.withLock {
        return@withLock try {
            val lastVersion = prefs.getString("snapshot_v2", null)
            val response = syncApi.getKnowledgeBase(since = lastVersion)

            if (!response.success || response.schemaVersion != 2) {
                Log.w(TAG, "Sync API returned failure")
                return@withLock false
            }

            if (response.upToDate == true) {
                Log.d(TAG, "Knowledge base is up to date")
                prefs.edit().putLong(KEY_LAST_SYNC_TIME, System.currentTimeMillis()).apply()
                return@withLock true
            }

            val items = response.items ?: return@withLock false
            if (response.totalItems != null && response.totalItems != items.size) return@withLock false

            val entities = items.map { item ->
                KnowledgeBaseEntity(
                    id = item.id,
                    questionText = item.questionText,
                    answerText = item.answerText,
                    reasonText = item.reasonText,
                    remedyText = item.remedyText,
                    homeRemedyText = item.homeRemedyText,
                    dosageInstructions = item.dosageInstructions,
                    safetyDisclaimerText = item.safetyDisclaimerText,
                    videoUrl = item.videoUrl,
                    diagnosticQ1 = item.diagnosticQ1,
                    diagnosticQ2 = item.diagnosticQ2,
                    diagnosticQ3 = item.diagnosticQ3,
                    tags = item.tags?.joinToString(","),
                    updatedAt = item.updatedAt ?: System.currentTimeMillis(),
                    consultationJson = gson.toJson(OfflineConsultationData(
                        item.diagnosticQuestions ?: emptyList(), item.answerBranches ?: emptyList()
                    ))
                )
            }

            // Replace local cache
            knowledgeBaseDao.replaceAll(entities)

            // Save the version for next sync
            prefs.edit()
                .putString("snapshot_v2", response.dataVersion)
                .putLong(KEY_LAST_SYNC_TIME, System.currentTimeMillis())
                .apply()

            Log.i(TAG, "Synced ${entities.size} knowledge base entries")
            true
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            Log.e(TAG, "Knowledge base sync failed: ${e.message}", e)
            false
        }
    }

    /**
     * Returns true if the local knowledge base is stale (older than 24 hours).
     */
    fun isKnowledgeBaseStale(): Boolean {
        val lastSync = prefs.getLong(KEY_LAST_SYNC_TIME, 0)
        return System.currentTimeMillis() - lastSync > STALE_THRESHOLD_MS
    }

    /**
     * Returns the number of locally cached knowledge base entries.
     */
    suspend fun getLocalKbCount(): Int = cacheMutex.withLock {
        val count = knowledgeBaseDao.getCount()
        if (!prefs.contains("snapshot_v2") && !prefs.getBoolean("bundle_v3_loaded", false)) {
            seedOfflineDbIfEmpty()
            return@withLock knowledgeBaseDao.getCount()
        }
        count
    }

    /**
     * Seeds the local SQLite database from the bundled knowledge_base.json on first launch.
     */
    private suspend fun seedOfflineDbIfEmpty() {
        try {
            val jsonString = context.assets.open("knowledge_base.json").bufferedReader().use { it.readText() }
            val type = object : com.google.gson.reflect.TypeToken<List<KnowledgeBaseEntity>>() {}.type
            val entries: List<KnowledgeBaseEntity> = com.google.gson.Gson().fromJson(jsonString, type)
            
            if (entries.isNotEmpty()) {
                knowledgeBaseDao.replaceAll(entries)
                prefs.edit().putBoolean("bundle_v3_loaded", true).apply()
                Log.i(TAG, "Successfully seeded offline DB with ${entries.size} entries")
                
                // Bundled content is a fallback, not confirmation of a server sync.
            }
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            Log.e(TAG, "Failed to seed offline DB from assets: ${e.message}", e)
        }
    }

    /**
     * Records a search event locally for later sync.
     */
    suspend fun recordSearchEvent(queryText: String, userId: String?, matchedQuestionId: String?) {
        try {
            searchEventDao.insert(
                SearchEventEntity(
                    queryText = queryText,
                    timestamp = System.currentTimeMillis(),
                    userId = userId,
                    matchedQuestionId = matchedQuestionId,
                    synced = false
                )
            )
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            Log.e(TAG, "Failed to record search event: ${e.message}", e)
        }
    }

    /**
     * Sends all unsynced search events to the backend and marks them as synced.
     */
    suspend fun flushAnalytics(): Boolean {
        return try {
            val unsyncedEvents = searchEventDao.getUnsynced()
            if (unsyncedEvents.isEmpty()) return true

            val dtos = unsyncedEvents.map { event ->
                SearchEventDto(
                    queryText = event.queryText,
                    timestamp = event.timestamp,
                    userId = event.userId,
                    matchedQuestionId = event.matchedQuestionId
                )
            }

            val response = syncApi.syncAnalytics(mapOf("events" to dtos))
            if (response.success) {
                searchEventDao.markSynced(unsyncedEvents.map { it.id })
                // Clean up old synced events (older than 7 days)
                val sevenDaysAgo = System.currentTimeMillis() - 7 * 24 * 60 * 60 * 1000L
                searchEventDao.deleteOldSynced(sevenDaysAgo)
                Log.i(TAG, "Flushed ${unsyncedEvents.size} analytics events")
                true
            } else {
                Log.w(TAG, "Analytics sync API returned failure")
                false
            }
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            Log.e(TAG, "Analytics flush failed: ${e.message}", e)
            false
        }
    }
}
