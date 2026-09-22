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
    @Singleton
    fun provideOkHttpClient(): OkHttpClient {
        return OkHttpClient.Builder()
            .connectTimeout(60, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .writeTimeout(60, TimeUnit.SECONDS)
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
    fun provideChatbotApi(retrofit: Retrofit): com.healinghands4u.data.remote.ChatbotApi {
        return retrofit.create(com.healinghands4u.data.remote.ChatbotApi::class.java)
    }

    @Provides
    @Singleton
    fun provideKnowledgeBaseSyncApi(retrofit: Retrofit): KnowledgeBaseSyncApi {
        return retrofit.create(KnowledgeBaseSyncApi::class.java)
    }
}
