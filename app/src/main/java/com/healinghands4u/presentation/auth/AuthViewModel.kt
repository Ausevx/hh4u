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
