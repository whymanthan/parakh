# MOBILE FEATURE SPECIFICATION

This document describes what can be derived from the current codebase for an Android app, and what the current system does not yet provide.

## 1. Directly reusable mobile features

The following modules are reusable in principle for Android because they are implemented as logic modules and data contracts:

- rule validation engine
- mandatory declaration checks
- violation classification
- compliance score calculation
- rule library data model
- inspection record schema
- report formatting logic

## 2. Features that are web-specific today

The following are browser-only and need replacement or backend equivalents for Android:

- localStorage persistence
- HTML/CSS navigation pages
- browser print-to-PDF export
- DOM rendering
- Tesseract.js in-browser OCR
- direct file selection from browser input elements
- page-style route navigation

## 3. Mobile app feature mapping

### 3.1 Dashboard

Candidate Android screen:
- Overview/Home

Required data:
- inspection totals
- violation totals
- compliance percentage
- critical violation count
- brand/category charts
- recent inspections

Current source:
- js/features/dashboard/dashboard.js
- js/utils/storage.js

Mobile note:
- can be rebuilt as a native Android screen using a backend API instead of localStorage

### 3.2 Scan / Inspection workflow

Candidate Android screen:
- New Inspection

Required features:
- upload image(s)
- OCR label text
- manual text entry fallback
- product URL fetch
- field confirmation form
- compliance run action
- results preview

Current source:
- scan.html
- js/features/scan/scan.js

Mobile note:
- this is the biggest reusable workflow for Android
- it requires a backend endpoint for extraction and persistence

### 3.3 Rule library

Candidate Android screen:
- Rule Reference Search

Required features:
- text search
- filter by category and severity
- display rule metadata
- legal references and examples

Current source:
- rules.html
- js/features/rules/rulesBrowser.js

Mobile note:
- portable as a searchable list detail screen

### 3.4 Report screen

Candidate Android screen:
- Inspection Report Details

Required features:
- summary header
- declared fields
- violation list
- PDF or share export
- CSV export can be implemented later

Current source:
- report.html
- js/features/reports/reportGenerator.js

Mobile note:
- the logic can be translated to Android UI and API responses

## 4. Required data models for Android

### Rule model

```json
{
  "rule_id": "",
  "field": "",
  "condition": "",
  "severity": "High",
  "category": "",
  "reference": "",
  "valid_values": [],
  "invalid_values": [],
  "example_valid": "",
  "example_invalid": "",
  "notes": ""
}
```

### Inspection model

```json
{
  "id": "",
  "createdAt": "",
  "product": {
    "name": "",
    "brand": "",
    "category": ""
  },
  "inputs": {
    "productCategory": "",
    "fields": {
      "productName": "",
      "brand": "",
      "manufacturerOrPacker": "",
      "commonName": "",
      "netQuantity": "",
      "mrp": "",
      "mfgDate": "",
      "consumerCare": "",
      "countryOfOrigin": "",
      "isImported": false
    },
    "rawLabelText": ""
  },
  "violations": [],
  "score": 0,
  "ocrUsed": false
}
```

### Violation model

```json
{
  "ruleId": "",
  "field": "",
  "category": "",
  "reference": "",
  "severity": "High",
  "status": "fail",
  "message": "",
  "evidence": "",
  "condition": "",
  "recommendedAction": ""
}
```

## 5. Android-specific concerns

### OCR

The current OCR is browser-based and uses Tesseract.js via CDN. For Android, this should be replaced or wrapped by:

- ML Kit OCR
- a backend OCR service
- or a dedicated OCR SDK

### Backend extraction

The current backend has a Gemini-based extraction service. An Android app can integrate with it, but only after securing API access and defining proper authentication.

### Persistence

The current app saves to localStorage. Android needs a real backend or local database such as Room for device-local storage, or a network API for shared data.

## 6. Important limitations for Android

The current system is not ready for a standalone Android client because it lacks:

- user accounts
- permissions
- a real server-side dataset
- inspection ownership model
- shared state across devices
- standard API authentication
- offline sync policy

## 7. Recommended Android architecture based only on current code

Recommended stack:

- Kotlin / Jetpack Compose
- Retrofit for API calls
- Room for local cache/offline draft storage
- ML Kit OCR for local camera capture
- Android view model + repository pattern
- backend should be a REST API with PostgreSQL and a proper auth layer

This recommendation is based on the app behavior, not on an invented backend design.

## 8. Summary for mobile feature planning

What can be directly reused:
- rules engine logic
- scoring logic
- violation taxonomy
- inspection workflow concept
- rule library structure
- report model

What must be newly built:
- Android UI screens
- image capture/OCR pipeline
- API client layer
- secure auth and authorization system
- real backend persistence
- sync and offline behavior

What must change:
- localStorage -> server API and local persistence models
- browser-only fetch calls -> Android networking and secure config
- DOM-based rendering -> compose UI

## 9. Final mobile verdict

An independent Android application is feasible only after the current app’s frontend-only behavior is replaced by a real shared backend and proper client-server contracts. The rule engine and inspection flow are reusable, but the current backend and persistence model are not sufficient for a production Android client as-is.

## 10. Corrected status from code audit

The following items were corrected from earlier drafts:

- the codebase now contains a real auth layer, so Android integration must account for JWT-based login and role checks
- a real file-based server persistence layer exists for inspections, but it is not a production relational database
- product extraction is real and calls a backend endpoint, but it is not a secure production-ready API design yet
- browser-only localStorage remains a fallback and cannot be treated as the Android persistence model

## 11. Verified Against Code

Verified against server.js, auth.js, js/features/scan/scan.js, js/utils/storage.js, and the current web frontend:

- Reusable logic: rule engine, scoring, violation classification, mandatory declaration checks, workflow sequencing, product report rendering
- Reusable APIs: /api/fetch-product-page, /api/extract-product, /api/inspections, /api/auth/login, /api/auth/register
- Not reusable as-is for Android: localStorage, browser print export, Tesseract.js in-browser OCR, DOM/CSS page navigation
- Real backend status: there is a working Express server with file storage for inspections and JWT auth scaffolding, but no robust database or production security layer yet
- Mobile conclusion: the app is a viable candidate for Android reuse only after backend modernization and a dedicated API contract are defined
