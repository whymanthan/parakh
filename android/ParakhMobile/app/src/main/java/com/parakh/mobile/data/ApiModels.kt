package com.parakh.mobile.data

data class ApiResponse<T>(
    val ok: Boolean? = null,
    val error: String? = null,
    val message: String? = null,
    val status: String? = null,
    val user: T? = null,
    val product: ProductFieldData? = null,
    val text: String? = null,
    val sourceUrl: String? = null
)

data class AuthRequest(
    val email: String,
    val password: String
)

data class User(
    val id: String = "",
    val name: String = "",
    val email: String = "",
    val role: String = "inspector",
    val token: String? = null
)

data class ProductFieldData(
    val productName: String = "",
    val brand: String = "",
    val manufacturer: String = "",
    val netQtyValue: String = "",
    val netQtyUnit: String = "",
    val mrp: String = "",
    val mfgDate: String = "",
    val consumerCare: String = "",
    val countryOfOrigin: String = "",
    val imported: Boolean = false,
    val rawText: String = ""
)

data class Inspection(
    val id: String = "",
    val createdAt: String = "",
    val product: InspectionProduct = InspectionProduct(),
    val inputs: InspectionInputs = InspectionInputs(),
    val allResults: List<ViolationResult> = emptyList(),
    val violations: List<Violation> = emptyList(),
    val score: Int = 0,
    val ocrUsed: Boolean = false
)

data class InspectionProduct(
    val name: String = "",
    val brand: String = "",
    val category: String = ""
)

data class InspectionInputs(
    val productCategory: String = "",
    val fields: DeclarationFields = DeclarationFields(),
    val netQtyValue: String = "",
    val netQtyUnit: String = "",
    val grossWeightRaw: String = "",
    val rawLabelText: String = ""
)

data class DeclarationFields(
    val productName: String = "",
    val brand: String = "",
    val manufacturerOrPacker: String = "",
    val commonName: String = "",
    val netQuantity: String = "",
    val mrp: String = "",
    val mfgDate: String = "",
    val consumerCare: String = "",
    val countryOfOrigin: String = "",
    val isImported: Boolean = false
)

data class ViolationResult(
    val ruleId: String = "",
    val field: String = "",
    val condition: String = "",
    val severity: String = "Medium",
    val category: String = "",
    val reference: String = "",
    val recommendedAction: String = "",
    val status: String = "fail",
    val message: String = ""
)

data class Violation(
    val ruleId: String = "",
    val field: String = "",
    val condition: String = "",
    val severity: String = "Medium",
    val category: String = "",
    val reference: String = "",
    val recommendedAction: String = "",
    val status: String = "fail",
    val message: String = ""
)

data class RuleItem(
    val rule_id: String = "",
    val field: String = "",
    val condition: String = "",
    val category: String = "",
    val severity: String = "Medium",
    val reference: String = "",
    val valid_values: List<String> = emptyList(),
    val invalid_values: List<String> = emptyList(),
    val example_valid: String = "",
    val example_invalid: String = "",
    val notes: String = ""
)
