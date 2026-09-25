package com.healinghands4u.di

import com.healinghands4u.data.repository.ConsultationDataSource
import com.healinghands4u.data.repository.ConsultationRepository
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent

@Module
@InstallIn(SingletonComponent::class)
abstract class ConsultationModule {
    @Binds abstract fun bindConsultationRepository(repository: ConsultationRepository): ConsultationDataSource
}
