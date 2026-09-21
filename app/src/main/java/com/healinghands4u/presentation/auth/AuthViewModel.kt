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

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage

    fun clearError() {
        _errorMessage.value = null
    }

    init {
        // Auto-login if already authenticated
        if (firebaseAuthManager.getCurrentUser() != null) {
            _loginState.value = true
        }
    }

    fun loginAnonymously() {
        viewModelScope.launch {
            val success = firebaseAuthManager.signInAnonymously()
            if (!success) {
                _errorMessage.value = "Firebase Anonymous Auth failed. Bypassing locally for testing."
            }
            _loginState.value = true // Always let them in as guest, even if Firebase isn't configured
        }
    }

    fun verifyOtp(email: String, otp: String) {
        // Mock verification
        viewModelScope.launch {
            _loginState.value = true
        }
    }
}
