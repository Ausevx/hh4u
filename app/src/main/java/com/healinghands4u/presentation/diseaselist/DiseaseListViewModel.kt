package com.healinghands4u.presentation.diseaselist

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.healinghands4u.data.repository.KnowledgeRepository
import com.healinghands4u.data.local.DiseaseEntity
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class DiseaseListViewModel @Inject constructor(
    private val repository: KnowledgeRepository
) : ViewModel() {
    private val _diseases = MutableStateFlow<List<DiseaseEntity>>(emptyList())
    val diseases: StateFlow<List<DiseaseEntity>> = _diseases

    val categories = listOf("All", "Respiratory", "Digestive", "Skin", "Joints", "Stress & Sleep", "Women's Health")

    init {
        viewModelScope.launch {
            repository.getAllDiseases().collect { list ->
                _diseases.value = list
            }
        }
    }
}
