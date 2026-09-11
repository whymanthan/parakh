package com.parakh.mobile.data

import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.*

interface ParakhApiService {
    @POST("api/auth/login")
    suspend fun login(@Body request: AuthRequest): Response<ApiResponse<User>>

    @GET("api/me")
    suspend fun me(@Header("Authorization") token: String): Response<ApiResponse<User>>

    @GET("api/inspections")
    suspend fun getInspections(@Header("Authorization") token: String): Response<List<Inspection>>

    @GET("api/inspections/{id}")
    suspend fun getInspection(@Header("Authorization") token: String, @Path("id") id: String): Response<Inspection>

    @POST("api/inspections")
    suspend fun saveInspection(@Header("Authorization") token: String, @Body inspection: Inspection): Response<Inspection>

    @GET("api/fetch-product-page")
    suspend fun fetchProductPage(@Query("url") url: String): Response<ApiResponse<String>>

    @POST("api/extract-product")
    suspend fun extractProduct(@Body body: Map<String, String>): Response<ApiResponse<ProductFieldData>>

    companion object {
        fun create(): ParakhApiService {
            return Retrofit.Builder()
                .baseUrl(AppConfig.baseUrl())
                .addConverterFactory(GsonConverterFactory.create())
                .build()
                .create(ParakhApiService::class.java)
        }
    }
}
