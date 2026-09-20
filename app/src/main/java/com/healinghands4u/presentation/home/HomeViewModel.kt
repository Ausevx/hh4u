package com.healinghands4u.presentation.home

import androidx.lifecycle.ViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

@HiltViewModel
class HomeViewModel @Inject constructor() : ViewModel() {
    // For TipCard
    val tipCategory = "Morning Holistic Routine"
    val tipBody = "Morning Digestion: Drink warm water with lemon & raw honey to stimulate digestive enzymes and balance gastric pH naturally."
}
