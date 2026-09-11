package com.parakh.mobile.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.first

private val Context.dataStore by preferencesDataStore(name = "parakh_prefs")

class TokenStore(private val context: Context) {
    private val tokenKey = stringPreferencesKey(AppConfig.AUTH_TOKEN_KEY)
    private val emailKey = stringPreferencesKey(AppConfig.USER_EMAIL_KEY)
    private val nameKey = stringPreferencesKey(AppConfig.USER_NAME_KEY)

    suspend fun saveSession(token: String, email: String, name: String) {
        context.dataStore.edit { prefs ->
            prefs[tokenKey] = token
            prefs[emailKey] = email
            prefs[nameKey] = name
        }
    }

    suspend fun clearSession() {
        context.dataStore.edit { prefs ->
            prefs.remove(tokenKey)
            prefs.remove(emailKey)
            prefs.remove(nameKey)
        }
    }

    suspend fun token(): String? = context.dataStore.data.first()[tokenKey]
    suspend fun email(): String? = context.dataStore.data.first()[emailKey]
    suspend fun name(): String? = context.dataStore.data.first()[nameKey]
}
