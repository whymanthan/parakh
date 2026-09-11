package com.parakh.mobile.data

object AppConfig {
    const val DEFAULT_BASE_URL = "http://10.0.2.2:3001/"
    const val PROD_BASE_URL = "http://localhost:3001/"
    const val PREFER_LOCALHOST = false
    const val AUTH_TOKEN_KEY = "parakh_auth_token"
    const val USER_EMAIL_KEY = "parakh_user_email"
    const val USER_NAME_KEY = "parakh_user_name"

    fun baseUrl(): String = if (PREFER_LOCALHOST) PROD_BASE_URL else DEFAULT_BASE_URL
}
