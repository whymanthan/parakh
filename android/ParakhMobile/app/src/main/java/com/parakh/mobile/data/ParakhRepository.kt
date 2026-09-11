package com.parakh.mobile.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class ParakhRepository(
    private val api: ParakhApiService
) {
    suspend fun login(email: String, password: String): User = withContext(Dispatchers.IO) {
        val response = api.login(AuthRequest(email.trim(), password))
        val body = response.body()
        if (!response.isSuccessful || body == null || body.ok != true || body.user == null) {
            throw IllegalStateException(body?.error ?: "Login failed")
        }
        body.user
    }

    suspend fun getMe(token: String): User = withContext(Dispatchers.IO) {
        val response = api.me("Bearer $token")
        val body = response.body()
        if (!response.isSuccessful || body == null || body.ok != true || body.user == null) {
            throw IllegalStateException(body?.error ?: "Unable to load profile")
        }
        body.user
    }

    suspend fun getInspections(token: String): List<Inspection> = withContext(Dispatchers.IO) {
        val response = api.getInspections("Bearer $token")
        if (!response.isSuccessful) throw IllegalStateException("Unable to load inspections")
        response.body() ?: emptyList()
    }

    suspend fun getInspection(token: String, id: String): Inspection = withContext(Dispatchers.IO) {
        val response = api.getInspection("Bearer $token", id)
        if (!response.isSuccessful || response.body() == null) throw IllegalStateException("Inspection not found")
        response.body()!!
    }

    suspend fun saveInspection(token: String, inspection: Inspection): Inspection = withContext(Dispatchers.IO) {
        val response = api.saveInspection("Bearer $token", inspection)
        if (!response.isSuccessful || response.body() == null) {
            throw IllegalStateException("Unable to save inspection")
        }
        response.body()!!
    }

    suspend fun fetchProductPage(url: String): String = withContext(Dispatchers.IO) {
        val response = api.fetchProductPage(url)
        val body = response.body()
        if (!response.isSuccessful || body == null || body.ok != true || body.text.isNullOrBlank()) {
            throw IllegalStateException(body?.error ?: body?.message ?: "Product fetch failed")
        }
        body.text
    }

    suspend fun extractProduct(rawText: String, sourceType: String, sourceUrl: String): ProductFieldData = withContext(Dispatchers.IO) {
        val response = api.extractProduct(mapOf(
            "rawText" to rawText,
            "sourceType" to sourceType,
            "sourceUrl" to sourceUrl
        ))
        val body = response.body()
        if (!response.isSuccessful || body == null || body.ok != true || body.product == null) {
            throw IllegalStateException(body?.error ?: body?.message ?: "Extraction failed")
        }
        body.product
    }
}
