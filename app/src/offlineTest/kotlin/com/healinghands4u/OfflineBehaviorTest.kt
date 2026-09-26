package com.healinghands4u

import android.app.Application
import android.content.Context
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import com.healinghands4u.data.local.AppDatabase
import com.healinghands4u.data.remote.*
import com.healinghands4u.data.repository.*
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.setMain
import kotlinx.coroutines.test.resetMain
import com.healinghands4u.presentation.chatbot.ChatbotViewModel
import com.healinghands4u.presentation.chatbot.ChatbotUiState
import org.junit.*
import org.junit.Assert.*
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(application = Application::class, sdk = [28])
class OfflineBehaviorTest {
    private lateinit var db: AppDatabase
    private lateinit var context: Context
    private lateinit var repository: OfflineSearchRepository
    private val api = FakeSync()

    @Before fun setup() {
        context = ApplicationProvider.getApplicationContext()
        context.getSharedPreferences("kb_sync_prefs", 0).edit().clear().commit()
        db = Room.inMemoryDatabaseBuilder(context, AppDatabase::class.java).build()
        repository = OfflineSearchRepository(context, db.knowledgeBaseDao(), db.searchEventDao(), api)
    }
    @After fun close() { db.close() }

    @Test fun freshInstallSearchLoadsBundledAnswersWithoutNetwork() = runBlocking {
        assertEquals(0, db.knowledgeBaseDao().getCount())
        val matches = repository.searchOffline("I have a headache")
        assertTrue(matches.isNotEmpty())
        assertTrue(matches.first().questionText.contains("headache", ignoreCase = true))
        assertFalse(matches.first().answerText.isNullOrBlank())
        assertEquals(184, repository.getLocalKbCount())
        assertEquals(0, api.calls)
    }
    @Test fun emptyDatabaseRecoversDespiteSavedSyncFlags() = runBlocking {
        context.getSharedPreferences("kb_sync_prefs", 0).edit()
            .putString("snapshot_v2", "old-server-version").putBoolean("bundle_v3_loaded", true).commit()
        assertTrue(repository.searchOffline("stomach pain").isNotEmpty())
        assertNull(context.getSharedPreferences("kb_sync_prefs", 0).getString("snapshot_v2", null))
    }
    @OptIn(ExperimentalCoroutinesApi::class)
    @Test fun offlineScreenReturnsAnswerWithoutCallingBackend() = runBlocking {
        assertFalse(repository.isOnline())
        Dispatchers.setMain(UnconfinedTestDispatcher())
        try {
            val forbiddenApi = object : ChatbotApi {
                override suspend fun queryChatbot(request: ChatbotQueryRequest): ChatbotQueryResponse =
                    throw AssertionError("Offline search must not call the backend")
                override suspend fun resolveConsultationAnswer(request: ConsultationAnswerRequest): ConsultationResolutionResponse =
                    throw AssertionError("Offline search must not call the backend")
            }
            val vm = ChatbotViewModel(forbiddenApi, repository)
            vm.querySymptoms("headache")
            val result = withTimeout(5000) { vm.state.first { it is ChatbotUiState.Success || it is ChatbotUiState.Error } }
            assertTrue(result is ChatbotUiState.Success)
            assertTrue((result as ChatbotUiState.Success).answerText.contains("Offline:"))
        } finally { Dispatchers.resetMain() }
    }
    @Test fun naturalEnglishSymptomsFindSavedTopics() = runBlocking {
        listOf("I have severe fever and body pain", "my tummy hurts", "burning while urinating",
            "I have been coughing since yesterday", "HEADACHE!!!").forEach {
            assertTrue("No match for $it", repository.searchOffline(it).isNotEmpty())
        }
    }
    @Test fun unknownAndNonEnglishInputsDoNotInventAnswers() = runBlocking {
        listOf("quantum spaceship engine", "मुझे बुखार है", "please help", "").forEach {
            assertTrue(repository.searchOffline(it).isEmpty())
        }
    }
    @Test fun emptyServerSnapshotDoesNotEraseBundle() = runBlocking {
        assertFalse(repository.syncKnowledgeBase())
        assertEquals(184, repository.getLocalKbCount())
    }
    @Test fun localSearchDoesNotWaitForStalledDownload() = runBlocking {
        repository.getLocalKbCount()
        api.gate = CompletableDeferred()
        val sync = async { repository.syncKnowledgeBase() }
        api.started.await()
        val matches = withTimeout(3000) { repository.searchOffline("headache") }
        assertTrue(matches.isNotEmpty())
        api.gate!!.complete(Unit)
        sync.await()
        Unit
    }
    @Test fun guidanceWithoutBranchesReturnsClearlyLabeledGeneralAnswer() = runBlocking {
        val entry = repository.searchOffline("headache").first()
        val questions = entry.consultationData().questions
        val chat = object : ChatbotApi {
            override suspend fun queryChatbot(request: ChatbotQueryRequest): ChatbotQueryResponse = error("Network forbidden")
            override suspend fun resolveConsultationAnswer(request: ConsultationAnswerRequest): ConsultationResolutionResponse = error("Network forbidden")
        }
        val result = ConsultationRepository(chat, repository).resolve(null, entry.id, questions,
            questions.associate { it.id to "yes" }, entry)
        assertTrue(result.offline)
        assertTrue(result.notice!!.contains("not tailored"))
        assertEquals(entry.answerText, result.answer.answerText)
    }
    private class FakeSync : KnowledgeBaseSyncApi {
        var calls = 0
        var gate: CompletableDeferred<Unit>? = null
        val started = CompletableDeferred<Unit>()
        override suspend fun getKnowledgeBase(since: String?): KnowledgeBaseSyncResponse {
            calls++
            started.complete(Unit)
            gate?.await()
            return KnowledgeBaseSyncResponse(true, false, "empty", 0, emptyList(), 2)
        }
        override suspend fun syncAnalytics(body: Map<String, List<SearchEventDto>>) = SyncAnalyticsResponse(true, 0, 0, 0)
    }
}
