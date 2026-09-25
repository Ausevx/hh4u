package com.healinghands4u.auth

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

data class AuthUser(val id: String, val email: String?, val displayName: String, val authProvider: String)
data class AuthResponse(
    val success: Boolean = false, val message: String? = null,
    val token: String? = null, val expiresAt: Long? = null, val user: AuthUser? = null
)
interface AuthApi {
    @POST("api/auth/otp/request") suspend fun requestOtp(@Body body: Map<String, String>): AuthResponse
    @POST("api/auth/otp/verify") suspend fun verifyOtp(@Body body: Map<String, String>): AuthResponse
    @POST("api/auth/google") suspend fun google(@Body body: Map<String, String>): AuthResponse
    @POST("api/auth/guest") suspend fun guest(): AuthResponse
    @GET("api/auth/me") suspend fun me(): AuthResponse
    @POST("api/auth/logout") suspend fun logout(): AuthResponse
}
