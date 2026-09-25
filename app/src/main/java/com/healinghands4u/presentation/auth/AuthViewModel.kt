package com.healinghands4u.presentation.auth

import android.content.Context
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import androidx.credentials.ClearCredentialStateRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.healinghands4u.R
import com.healinghands4u.auth.AuthApi
import com.healinghands4u.auth.AuthResponse
import com.healinghands4u.auth.AuthSessionStorage
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import retrofit2.HttpException
import java.io.IOException
import javax.inject.Inject

@HiltViewModel
class AuthViewModel @Inject constructor(private val api: AuthApi, private val store: AuthSessionStorage) : ViewModel() {
    private val _loginState = MutableStateFlow(false)
    val loginState = _loginState.asStateFlow()
    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage = _errorMessage.asStateFlow()
    private val _busy = MutableStateFlow(false)
    val busy = _busy.asStateFlow()
    private val _otpEmail = MutableStateFlow<String?>(null)
    val otpEmail = _otpEmail.asStateFlow()
    private val _resendSeconds = MutableStateFlow(0)
    val resendSeconds = _resendSeconds.asStateFlow()
    val session = store.session

    init {
        if (store.token() != null) runOperation {
            val response = api.me()
            check(response.success) { response.message ?: "Please sign in again." }
        }
    }
    fun clearError() { _errorMessage.value = null }
    private fun runOperation(block: suspend () -> Unit) {
        if (_busy.value) return
        _busy.value = true
        viewModelScope.launch {
            try { block() }
            catch (e: CancellationException) { throw e }
            catch (_: GetCredentialCancellationException) { /* User dismissed account selection. */ }
            catch (e: HttpException) {
                _errorMessage.value = try { JSONObject(e.response()?.errorBody()?.string().orEmpty()).optString("message").ifBlank { "Sign-in failed. Please try again." } }
                    catch (_: Exception) { "Sign-in failed. Please try again." }
            }
            catch (_: IOException) { _errorMessage.value = "Cannot connect. Check your connection or continue as guest." }
            catch (e: Exception) { _errorMessage.value = e.message ?: "Sign-in failed. Please try again." }
            finally { _busy.value = false }
        }
    }
    private suspend fun accept(response: AuthResponse) {
        check(response.success && response.token != null && response.user != null && response.expiresAt != null) {
            response.message ?: "The server did not return a valid session."
        }
        withContext(Dispatchers.IO) { store.save(response) }
        _loginState.value = true
    }
    fun requestOtp(email: String) = runOperation {
        val normalized = email.trim().lowercase()
        require(normalized.length <= 254 && normalized.matches(Regex("[^\\s@]+@[^\\s@]+\\.[^\\s@]+"))) { "Enter a valid email address." }
        val response = api.requestOtp(mapOf("email" to normalized))
        check(response.success) { response.message ?: "Unable to send code." }
        _otpEmail.value = normalized
        _resendSeconds.value = 60
        viewModelScope.launch { while (_resendSeconds.value > 0) { delay(1000); _resendSeconds.value -= 1 } }
    }
    fun verifyOtp(email: String, otp: String) = runOperation {
        require(email.trim().lowercase() == _otpEmail.value) { "Request a code for this email first." }
        require(otp.matches(Regex("[0-9]{6}"))) { "Enter the six-digit code from your email." }
        accept(api.verifyOtp(mapOf("email" to email.trim().lowercase(), "otp" to otp)))
    }
    fun googleSignIn(context: Context) = runOperation {
        val clientId = context.getString(R.string.google_web_client_id)
        check(clientId.isNotBlank()) { "Google sign-in needs the app's Google client ID configured." }
        val option = GetSignInWithGoogleOption.Builder(clientId).build()
        val result = CredentialManager.create(context).getCredential(context,
            GetCredentialRequest.Builder().addCredentialOption(option).build())
        val credential = result.credential
        check(credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) { "Unsupported Google credential." }
        val token = GoogleIdTokenCredential.createFrom(credential.data).idToken
        accept(api.google(mapOf("idToken" to token)))
    }
    fun loginAnonymously() = runOperation {
        try { accept(api.guest()) }
        catch (_: IOException) {
            // Offline access has no authenticated identity and grants no account permissions.
            withContext(Dispatchers.IO) { store.clear() }
            _loginState.value = true
        }
    }
    fun signOut(context: Context) = runOperation {
        var revoked = false
        try { api.logout(); revoked = true }
        catch (e: CancellationException) { throw e }
        catch (_: Exception) { /* Always allow local sign-out. */ }
        finally { withContext(Dispatchers.IO) { store.clear() } }
        try { CredentialManager.create(context).clearCredentialState(ClearCredentialStateRequest()) }
        catch (e: CancellationException) { throw e }
        catch (_: Exception) { /* Local session is already cleared. */ }
        _loginState.value = false
        if (!revoked) _errorMessage.value = "Signed out on this device. The server could not be reached to revoke the session."
    }
}
