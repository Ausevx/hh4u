package com.healinghands4u.presentation.auth

import com.healinghands4u.auth.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.*
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import java.io.IOException

@OptIn(ExperimentalCoroutinesApi::class)
class AuthViewModelTest {
    private val dispatcher = StandardTestDispatcher()
    private val store = FakeStore()
    private val api = FakeApi()
    private lateinit var vm: AuthViewModel
    @Before fun before() { Dispatchers.setMain(dispatcher); vm = AuthViewModel(api, store) }
    @After fun after() { Dispatchers.resetMain() }

    @Test fun enteringDigitsWithoutRequestCannotSignIn() = runTest(dispatcher) {
        vm.verifyOtp("person@example.com", "123456")
        advanceUntilIdle()
        assertFalse(vm.loginState.value)
        assertEquals(0, api.verifications)
        assertNull(store.session.value)
    }
    @Test fun failedDeliveryDoesNotShowOtpAsSent() = runTest(dispatcher) {
        api.deliveryFailure = true
        vm.requestOtp("person@example.com")
        advanceUntilIdle()
        assertNull(vm.otpEmail.value)
        assertFalse(vm.loginState.value)
        assertNotNull(vm.errorMessage.value)
    }
    @Test fun rejectedOtpNeverCreatesSessionOrNavigates() = runTest(dispatcher) {
        vm.requestOtp("person@example.com")
        advanceUntilIdle()
        api.response = AuthResponse(success = false, message = "Invalid OTP")
        vm.verifyOtp("person@example.com", "123456")
        advanceUntilIdle()
        assertEquals(1, api.verifications)
        assertFalse(vm.loginState.value)
        assertNull(store.session.value)
    }
    @Test fun changedEmailRequiresNewCode() = runTest(dispatcher) {
        vm.requestOtp("person@example.com")
        advanceUntilIdle()
        vm.verifyOtp("different@example.com", "123456")
        advanceUntilIdle()
        assertEquals(0, api.verifications)
        assertFalse(vm.loginState.value)
    }
    @Test fun incompleteServerSessionIsRejected() = runTest(dispatcher) {
        vm.requestOtp("person@example.com")
        advanceUntilIdle()
        api.response = AuthResponse(success = true, token = "token")
        vm.verifyOtp("person@example.com", "123456")
        advanceUntilIdle()
        assertNull(store.session.value)
        assertFalse(vm.loginState.value)
    }
    @Test fun repeatedTapDoesNotSendTwoRequests() = runTest(dispatcher) {
        vm.requestOtp("person@example.com")
        vm.requestOtp("person@example.com")
        advanceUntilIdle()
        assertEquals(1, api.requests)
    }
    @Test fun successfulOtpPersistsBackendIdentityBeforeNavigation() = runTest(dispatcher) {
        vm.requestOtp("person@example.com")
        advanceUntilIdle()
        vm.verifyOtp("person@example.com", "123456")
        // IO persistence runs outside the test scheduler; wait for completion through the state.
        while (vm.busy.value) { testScheduler.runCurrent(); kotlinx.coroutines.yield() }
        assertTrue(vm.loginState.value)
        assertEquals("backend-token", store.session.value?.token)
        assertEquals("user-1", store.session.value?.user?.id)
    }
    private class FakeStore : AuthSessionStorage {
        override val session = MutableStateFlow<AuthSession?>(null)
        override fun token() = session.value?.token
        override fun clear() { session.value = null }
        override fun save(response: AuthResponse) {
            session.value = AuthSession(response.token!!, response.expiresAt!!, response.user!!)
        }
    }
    private class FakeApi : AuthApi {
        var requests = 0
        var verifications = 0
        var deliveryFailure = false
        var response = AuthResponse(true, token = "backend-token", expiresAt = Long.MAX_VALUE,
            user = AuthUser("user-1", "person@example.com", "Person", "email_otp"))
        override suspend fun requestOtp(body: Map<String, String>): AuthResponse {
            requests++
            if (deliveryFailure) throw IOException("Offline")
            return AuthResponse(true)
        }
        override suspend fun verifyOtp(body: Map<String, String>): AuthResponse { verifications++; return response }
        override suspend fun google(body: Map<String, String>) = response
        override suspend fun guest() = response
        override suspend fun me() = response
        override suspend fun logout() = AuthResponse(true)
    }
}
