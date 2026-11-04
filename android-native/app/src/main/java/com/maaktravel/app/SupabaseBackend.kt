package com.maaktravel.app

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID

/** Guest inquiry access to the existing MAAK Supabase project. Never put a service-role key here. */
object SupabaseBackend {
    private const val CONNECT_TIMEOUT_MS = 10_000
    private const val READ_TIMEOUT_MS = 15_000

    val isConfigured: Boolean
        get() = BuildConfig.SUPABASE_URL.isNotBlank() && BuildConfig.SUPABASE_ANON_KEY.isNotBlank()

    suspend fun createGuestOrder(
        customerName: String,
        customerPhone: String,
        service: String,
        requestData: JSONObject,
        referralCode: String? = null,
        idempotencyKey: UUID = UUID.randomUUID(),
    ): String = withContext(Dispatchers.IO) {
        check(isConfigured) { "خدمة حفظ الطلبات غير مهيأة بعد." }
        require(customerName.trim().length in 2..120) { "أدخل الاسم (من حرفين إلى 120 حرفًا)." }
        require(customerPhone.trim().length in 7..18) { "أدخل رقم هاتف صحيحًا." }

        val baseUrl = BuildConfig.SUPABASE_URL.trimEnd('/')
        val connection = (URL("$baseUrl/rest/v1/rpc/create_order").openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = CONNECT_TIMEOUT_MS
            readTimeout = READ_TIMEOUT_MS
            doOutput = true
            setRequestProperty("apikey", BuildConfig.SUPABASE_ANON_KEY)
            setRequestProperty("Authorization", "Bearer ${BuildConfig.SUPABASE_ANON_KEY}")
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("Accept", "application/json")
        }

        try {
            val payload = JSONObject()
                .put("p_idempotency_key", idempotencyKey.toString())
                .put("p_customer_name", customerName.trim())
                .put("p_customer_phone", customerPhone.trim())
                .put("p_service", service)
                .put("p_request_data", requestData)
                .put("p_referral_code", referralCode)
            connection.outputStream.use { it.write(payload.toString().toByteArray(Charsets.UTF_8)) }
            val status = connection.responseCode
            val stream = if (status in 200..299) connection.inputStream else connection.errorStream
            val body = stream?.bufferedReader()?.use { it.readText() }.orEmpty()
            if (status !in 200..299) {
                throw IOException("تعذر حفظ الطلب (HTTP $status). ${extractError(body)}")
            }
            body
        } finally {
            connection.disconnect()
        }
    }

    private fun extractError(body: String): String = try {
        val json = JSONObject(body)
        json.optString("message").ifBlank { json.optString("error") }.take(240)
    } catch (_: Exception) {
        ""
    }
}
