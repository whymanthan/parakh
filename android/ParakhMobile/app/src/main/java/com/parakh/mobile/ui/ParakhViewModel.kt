package com.parakh.mobile.ui

import android.app.Application
import androidx.compose.runtime.mutableStateOf
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.parakh.mobile.data.Inspection
import com.parakh.mobile.data.ParakhApiService
import com.parakh.mobile.data.ParakhRepository
import com.parakh.mobile.data.TokenStore
import com.parakh.mobile.data.User
import kotlinx.coroutines.launch

class ParakhViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = ParakhRepository(ParakhApiService.create())
    private val tokenStore = TokenStore(application.applicationContext)

    var isLoading = mutableStateOf(false)
    var errorMessage = mutableStateOf<String?>(null)
    var currentUser = mutableStateOf<User?>(null)
    var inspections = mutableStateOf<List<Inspection>>(emptyList())
    var selectedInspection = mutableStateOf<Inspection?>(null)

    fun login(email: String, password: String, onResult: (Boolean) -> Unit) {
        viewModelScope.launch {
            try {
                isLoading.value = true
                errorMessage.value = null
                val user = repository.login(email, password)
                val token = user.token ?: throw IllegalStateException("Login response missing token")
                tokenStore.saveSession(token, user.email, user.name)
                currentUser.value = user
                onResult(true)
            } catch (e: Exception) {
                errorMessage.value = e.message ?: "Login failed"
                onResult(false)
            } finally {
                isLoading.value = false
            }
        }
    }

    fun restoreSession(onDone: (Boolean) -> Unit) {
        viewModelScope.launch {
            try {
                val token = tokenStore.token() ?: throw IllegalStateException("No token")
                val user = repository.getMe(token)
                currentUser.value = user
                onDone(true)
            } catch (_: Exception) {
                tokenStore.clearSession()
                onDone(false)
            }
        }
    }

    fun logout(onDone: () -> Unit) {
        viewModelScope.launch {
            tokenStore.clearSession()
            currentUser.value = null
            onDone()
        }
    }

    fun loadInspections() {
        viewModelScope.launch {
            try {
                isLoading.value = true
                errorMessage.value = null
                val token = tokenStore.token() ?: throw IllegalStateException("No session token")
                inspections.value = repository.getInspections(token)
            } catch (e: Exception) {
                errorMessage.value = e.message ?: "Unable to load inspections"
            } finally {
                isLoading.value = false
            }
        }
    }

    fun loadInspection(id: String) {
        viewModelScope.launch {
            try {
                isLoading.value = true
                errorMessage.value = null
                val token = tokenStore.token() ?: throw IllegalStateException("No session token")
                selectedInspection.value = repository.getInspection(token, id)
            } catch (e: Exception) {
                errorMessage.value = e.message ?: "Inspection not found"
            } finally {
                isLoading.value = false
            }
        }
    }
}
