package com.healinghands4u.di

import com.healinghands4u.data.remote.KnowledgeBaseSyncApi
import com.healinghands4u.data.remote.SyncService
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {
    @Provides
    fun provideSessionStorage(store: com.healinghands4u.auth.SessionStore): com.healinghands4u.auth.AuthSessionStorage = store

    @Provides
    @Singleton
    fun provideOkHttpClient(sessionStore: com.healinghands4u.auth.SessionStore): OkHttpClient {
        return OkHttpClient.Builder()
            .addInterceptor { chain ->
                val original = chain.request()
                val path = original.url.encodedPath
                val publicAuth = path.startsWith("/api/auth/") && path !in listOf("/api/auth/me", "/api/auth/logout")
                val token = if (publicAuth) null else sessionStore.token()
                val request = original.newBuilder().apply {
                    if (token != null) header("Authorization", "Bearer $token")
                }.build()
                chain.proceed(request).also {
                    if (it.code == 401 && token != null) sessionStore.clearIfToken(token)
                }
            }
            // Fail over to the downloaded knowledge base instead of leaving the
            // consultation spinner waiting for a full minute on a stalled request.
            .connectTimeout(40, TimeUnit.SECONDS)
            .readTimeout(40, TimeUnit.SECONDS)
            .writeTimeout(40, TimeUnit.SECONDS)
            .callTimeout(40, TimeUnit.SECONDS)
            .build()
    }

    @Provides
    @Singleton
    fun provideRetrofit(okHttpClient: OkHttpClient): Retrofit {
        return Retrofit.Builder()
            .baseUrl("https://hh4u-production.up.railway.app/") // Live Railway backend
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    @Provides
    @Singleton
    fun provideSyncService(retrofit: Retrofit): SyncService {
        return retrofit.create(SyncService::class.java)
    }

    @Provides
    @Singleton
    fun provideAuthApi(retrofit: Retrofit): com.healinghands4u.auth.AuthApi =
        retrofit.create(com.healinghands4u.auth.AuthApi::class.java)

    @Provides
    @Singleton
    fun provideChatbotApi(retrofit: Retrofit): com.healinghands4u.data.remote.ChatbotApi {
        return retrofit.create(com.healinghands4u.data.remote.ChatbotApi::class.java)
    }

    @Provides
    @Singleton
    fun provideKnowledgeBaseSyncApi(retrofit: Retrofit): KnowledgeBaseSyncApi {
        return retrofit.create(KnowledgeBaseSyncApi::class.java)
    }
}
