package com.healinghands4u.auth

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.AtomicFile
import com.google.gson.Gson
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.StateFlow
import java.io.File
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import javax.inject.Inject
import javax.inject.Singleton

data class AuthSession(val token: String, val expiresAt: Long, val user: AuthUser)

interface AuthSessionStorage {
    val session: StateFlow<AuthSession?>
    fun token(): String?
    fun save(response: AuthResponse)
    fun clear()
}

@Singleton
class SessionStore @Inject constructor(@ApplicationContext context: Context) : AuthSessionStorage {
    private val file = AtomicFile(File(context.noBackupFilesDir, "auth-session"))
    private val gson = Gson()
    private val state = MutableStateFlow<AuthSession?>(read())
    override val session = state.asStateFlow()

    private fun key(): SecretKey {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (store.getKey("hh4u-session", null) as? SecretKey)?.let { return it }
        return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").apply {
            init(KeyGenParameterSpec.Builder("hh4u-session", KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build())
        }.generateKey()
    }
    private fun read(): AuthSession? = try {
        val bytes = file.readFully()
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, bytes.copyOfRange(0, 12)))
        gson.fromJson(String(cipher.doFinal(bytes.copyOfRange(12, bytes.size)), Charsets.UTF_8), AuthSession::class.java)
            .takeIf { it.expiresAt > System.currentTimeMillis() }
    } catch (_: Exception) { file.delete(); null }

    @Synchronized override fun token(): String? {
        val current = state.value ?: return null
        if (current.expiresAt <= System.currentTimeMillis()) { clear(); return null }
        return current.token
    }
    @Synchronized override fun save(response: AuthResponse) {
        val current = AuthSession(requireNotNull(response.token), requireNotNull(response.expiresAt), requireNotNull(response.user))
        require(current.token.isNotBlank() && current.expiresAt > System.currentTimeMillis())
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, key())
        val bytes = cipher.iv + cipher.doFinal(gson.toJson(current).toByteArray(Charsets.UTF_8))
        val stream = file.startWrite()
        try { stream.write(bytes); file.finishWrite(stream) }
        catch (e: Exception) { file.failWrite(stream); throw e }
        state.value = current
    }
    @Synchronized fun clearIfToken(token: String) { if (state.value?.token == token) clear() }
    @Synchronized override fun clear() { file.delete(); state.value = null }
}
