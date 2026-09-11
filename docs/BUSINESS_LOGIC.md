# BUSINESS LOGIC SPECIFICATION

This document captures the actual business logic present in the code, without adding speculative rules.

## 1. Core objective

The app determines whether a packaged commodity declaration complies with legal-metrology rules and assigns a score and violation summary.

## 2. Mandatory declaration logic

Source:
- js/core/declarationRules.js

The mandatory declaration checklist is based on Rule 6 declarations and includes:

1. Manufacturer / Packer / Importer name and address
2. Common / Generic Name of the Commodity
3. Net Quantity
4. Month & Year of Manufacture / Pack / Import
5. Maximum Retail Price
6. Consumer Care Details
7. Country of Origin when imported

Logic:
- for each declaration, if value is present then status = pass
- if missing then status = fail
- some declarations are conditional, such as country of origin only when imported

Severity mapping:
- Critical: manufacturer, net quantity, MRP
- High: common name, mfg date, consumer care
- Medium: country of origin when imported

## 3. Compliance score calculation

Source:
- js/core/scoring.js

Deduction weights:

- Critical: 25
- High: 12
- Medium: 6
- Low: 2

The score is calculated as:

score = 100 - sum(deduction for each violation)

Minimum is 0.

Banding:
- 96+: Fully Compliant
- 70-95: Minor Violations
- 40-69: Moderate Violations
- <40: Critical Violations

## 4. Violation classification and recommendation

Source:
- js/core/violationClassifier.js

The app converts raw rule results into a canonical violation structure, including:

- ruleId
- field
- category
- reference
- severity
- status
- message
- evidence
- condition
- recommendedAction

Recommended actions are mapped by category, including:

- Mandatory Declaration -> reprint/relabel package
- System of Units -> replace non-metric units
- Base Unit -> correct SI base unit
- Permitted Unit -> use only permitted unit
- Restricted Unit -> confirm commodity category
- Prohibited Unit -> remove prohibited unit
- Formatting -> correct numeric/unit formatting
- Coefficient -> re-declare coefficient using accepted notation
- Physical Constant -> review against cited rule
- General -> review against cited legal reference

Warnings are downgraded by one severity level for classification, but not for raw rule facts.

## 5. Unit and quantity validation

Source:
- js/core/ruleEngine.js

The engine validates quantities by parsing a free-form string such as:

- 500 g
- 1.1 lb
- 12,5 kg

Utility function parseQuantityString reads:
- raw
- numberText
- numberValue
- unit

The engine checks these rule categories:

- System of Units
- Base Unit
- Permitted Unit
- Prohibited Unit
- Restricted Unit

The logic uses each rule’s JSON arrays:
- valid_values
- invalid_values

A unit is considered invalid when:
- it appears in invalid_values

A unit is considered valid when:
- it appears in valid_values

## 6. Restricted unit logic

Restricted units are checked against product category keywords.

Examples:
- carat is only valid for diamond / pearl / precious stone categories
- certain categories trigger warnings or failures based on keyword search

The code uses a CATEGORY_KEYWORDS map in ruleEngine.js to match category text against rule IDs.

If a restricted unit is valid for the category, status is pass.
If it is used in a category that does not match, status is fail.
If the category is not clear, status is warning.

## 7. Formatting validation logic

The following formatting rules are actually implemented by regex checks:

### Uppercase unit symbols are forbidden

Rule:
- LM-NS-022

Check:
- finds values like KG, ML, GM, LTR, MG, CM

### Stacked SI prefixes are forbidden

Rules:
- LM-NS-023
- LM-NS-024

Checks for strings such as:
- mµm
- µkg
- kmµ
- mµm

### "kmph" is prohibited

Rule:
- LM-NS-025

Check:
- regex for \bkmph\b

### Ambiguous multi-solidus expressions are prohibited

Rule:
- LM-NS-026

Check:
- patterns such as a/b/c where more than one slash exists within a word

### Decimal separator must be a dot

Rule:
- LM-NS-028

Check:
- values like 12,5 kg are treated as comma-decimal misuse

### Numeric value range check

Rule:
- LM-NS-027

Check:
- values outside 0.1 to 1000 or beyond a practical range generate warning status

## 8. Coefficient validation

The engine validates the following declared coefficients:

- Alcoholic Strength
- Sugar Content
- pH Value
- Material Hardness

This is implemented through checkCoefficient(), which checks whether the value matches the accepted notation listed in the JSON rule object.

## 9. OCR and AI extraction logic

### OCR

The app uses Tesseract.js in the browser to recognize text from uploaded label images.

Logic:
- each uploaded image is processed in order
- raw text is concatenated
- result is written to the raw-label-text textarea
- if text is found, the app attempts to populate form fields from the OCR result

### Product URL extraction

The app uses a server-side proxy to fetch a product page and then calls Gemini to extract declarations from the text.

This logic is not a backend persistence or secure API layer; it is just a data extraction helper.

## 10. Product category and keyword heuristics

The app uses category keyword matching for restricted units. The category text is compared against a static map of category keywords.

This means:
- if product category text is absent or unclear, restricted-unit checks may become warnings instead of failing checks

## 11. User-visible decision logic

The product gives the user:

- score
- compliance band label
- per-severity counts
- violation cards with legal reference and recommended action
- empty state when there are no violations

No hidden or administrative business logic is implemented beyond this UI flow.

## 12. Data transformations and calculations

The app transforms raw label text into:

- structured product fields
- quantity entries
- raw rule results
- classified violations
- score
- report rows

These transformations are entirely client-side and are not backed by server-side rules.

## 13. Rules that are not implemented

There are no current rules for:

## 14. Corrected status from code audit

The following items were corrected from previous drafts:

- the app now includes a login flow in login.html and API auth routes in server.js
- role enforcement exists for admin-only destructive actions and JWT-backed user recognition
- the product URL and Gemini extraction logic still operate as helper workflows, not as a production backend service layer
- authentication is real, but not yet production-grade and not tied to a persistent user database

## 15. Verified Against Code

Verified against js/core/ruleEngine.js, js/core/declarationRules.js, js/core/scoring.js, js/core/violationClassifier.js, server.js, and auth.js:

- Business logic is real and runs in the browser with data-driven rule evaluation
- Mandatory declaration logic, scoring, coefficient checks, and restricted-unit logic are implemented in code
- OCR and product extraction are implemented as actual browser/server workflows, not mocked placeholders
- The app does include authentication scaffolding, but the current identity model and permission system are still minimal and local to the server process
- No production database-backed business rules or permission model are present yet

- user login or authentication
- role-based approval workflows
- escalation workflows
- multi-user inspection ownership
- backend persistence and versioning
- invoice or payment logic
- audit approval chains
- tenant isolation

## 14. Business logic summary

The actual business logic represented in code is a single-inspector compliance scoring workflow for label declarations. It is a document-validation engine, not a full operational compliance system.
