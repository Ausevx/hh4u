package com.healinghands4u.presentation.auth

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.healinghands4u.auth.FirebaseAuthManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

private const val TAG = "AuthViewModel"

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val firebaseAuthManager: FirebaseAuthManager
) : ViewModel() {
    
    private val _loginState = MutableStateFlow<Boolean>(false)
    val loginState: StateFlow<Boolean> = _loginState

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage

    private val _isGuestMode = MutableStateFlow<Boolean>(false)
    val isGuestMode: StateFlow<Boolean> = _isGuestMode

    fun clearError() {
        _errorMessage.value = null
    }

    init {
        // Auto-login safely if already authenticated via Firebase
        try {
            if (firebaseAuthManager.getCurrentUser() != null) {
                _loginState.value = true
            }
        } catch (e: Throwable) {
            Log.w(TAG, "Unable to inspect current Firebase user on launch: ${e.message}")
        }
    }

    fun loginAnonymously() {
        viewModelScope.launch {
            _isGuestMode.value = true
            try {
                val success = firebaseAuthManager.signInAnonymously()
                if (!success) {
                    Log.i(TAG, "Firebase unavailable; proceeding in local Guest Mode.")
                }
            } catch (e: Throwable) {
                Log.w(TAG, "Guest login error bypassed: ${e.message}")
            } finally {
                // Graceful fallback: Always permit entry into the app as guest
                _loginState.value = true
            }
        }
    }

    fun verifyOtp(email: String, otp: String) {
        // Mock verification
        viewModelScope.launch {
            _loginState.value = true
        }
    }
}

