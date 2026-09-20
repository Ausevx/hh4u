package com.healinghands4u.di

import com.healinghands4u.data.remote.SyncService
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Singleton
    fun provideRetrofit(): Retrofit {
        return Retrofit.Builder()
            .baseUrl("http://10.0.2.2:5001/") // Android emulator localhost alias
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
}
