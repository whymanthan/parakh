# SYSTEM SPECIFICATION

This document is derived only from the current code in this repository. It describes the actual app as implemented today, not a future product design.

## 1. Product overview

PARAKH is a static web application for legal-metrology label compliance review. The current app is a browser-based workflow used by an inspector to:

- upload label images
- run OCR on the uploaded label
- optionally fetch a product page from an e-commerce URL
- confirm or correct label fields
- validate declaration fields and unit/format rules
- view a scored compliance result
- open a report page for a single inspection
- browse the rule library
- review dashboard analytics from stored inspection history

The app does not include a user login, registration, or role-based access control. No authenticated backend exists in the current code.

## 2. Pages and screens

### 2.1 Dashboard: index.html

Implemented by:
- index.html
- js/features/dashboard/dashboard.js
- js/utils/storage.js

Purpose:
- show overview statistics of stored inspections
- show recent inspection records
- show violation counts by brand, category, and severity

Navigation:
- Dashboard
- Scan Product
- Rule Library

Primary actions:
- Clear history
- New Inspection
- Click recent inspection row to open report page

### 2.2 Scan Product: scan.html

Implemented by:
- scan.html
- js/features/scan/scan.js

Purpose:
- capture label images
- run OCR
- autofill structured fields via Gemini extraction
- fetch product details from a URL through the backend proxy
- enter/confirm declaration data
- run the compliance engine
- view the result summary

Primary actions:
- upload one or more image files
- remove uploaded image
- run OCR
- edit raw label text manually
- auto-fill declared fields
- fetch product details from product URL
- run compliance check
- reset form
- open report page after validation

### 2.3 Rule Library: rules.html

Implemented by:
- rules.html
- js/features/rules/rulesBrowser.js
- js/data/rulesLoader.js

Purpose:
- search and browse the National Standards rules database
- filter by category and severity
- view valid/invalid values and legal references

Primary actions:
- search by rule ID, field, condition, or reference
- filter by category
- filter by severity

### 2.4 Report: report.html

Implemented by:
- report.html
- js/features/reports/reportGenerator.js

Purpose:
- show one saved inspection in detail
- display declared fields
- display all violations with legal references and recommendations
- export CSV
- print to PDF using browser print

Primary actions:
- Export CSV
- Export PDF

## 3. Features implemented by the current code

### Feature: Upload label images and run OCR

Where implemented:
- scan.html
- js/features/scan/scan.js

Data used:
- uploaded files from browser
- OCR result text

Backend/API operation:
- no OCR backend; this is in-browser Tesseract.js
- Tesseract is loaded from CDN in scan.html

Database data modified:
- none during OCR itself

User sees:
- image preview strip
- progress bar during OCR
- extracted raw text in textarea

Rules / conditions:
- only image files are accepted
- valid image types: image/* or .webp
- OCR runs sequentially across uploaded images
- if Tesseract does not load, user is told they can still type/paste text manually

### Feature: Auto-fill declared fields from raw OCR text

Where implemented:
- js/features/scan/scan.js

Data used:
- OCR/raw text
- backend response from /api/extract-product

Backend/API operation:
- POST /api/extract-product to Gemini with rawText, sourceType, sourceUrl

Database data modified:
- none

User sees:
- structured fields populate from AI extraction

Rules / conditions:
- extraction is attempted only when raw text is available
- if extraction fails, the app logs the error and leaves form values as entered

### Feature: Fetch product details from an e-commerce URL

Where implemented:
- scan.html
- js/features/scan/scan.js
- server.js

Data used:
- user-entered product URL
- fetched HTML page content
- product extraction result from Gemini

Backend/API operation:
- GET /api/fetch-product-page?url=... to fetch product page content via a proxy fallback sequence
- POST /api/extract-product to extract declaration details

Database data modified:
- none

User sees:
- product URL input field
- status message about fetch success or missing mandatory details

Rules / conditions:
- URL is normalized to include https:// if omitted
- content must be longer than 80 characters to be considered usable
- missing mandatory details are flagged
- remote fetch can fail for blocked/private/unavailable pages

### Feature: Compliance validation engine

Where implemented:
- js/core/ruleEngine.js
- js/core/declarationRules.js
- js/core/violationClassifier.js
- js/core/scoring.js

Data used:
- product category
- gross weight / net quantity / coefficient fields
- raw label text
- rules database

Backend/API operation:
- no backend call for rule engine; all logic runs in browser

Database data modified:
- none during run

User sees:
- violation cards with severity and recommendation
- score ring and summary counts

Rules / conditions:
- rules are read from data/legal_metrology_national_standards_rules.json
- unit/token validations are derived from valid_values and invalid_values arrays
- restricted units are cross-checked against category keywords
- formatting rules check lower-case units, decimal separator, kmph, stacked prefixes, etc.
- mandatory declaration rules require manufacturer, common name, net quantity, mfg date, MRP, consumer care, country of origin when imported

### Feature: Dashboard analytics

Where implemented:
- js/features/dashboard/dashboard.js
- js/utils/storage.js

Data used:
- saved inspection records in localStorage

Backend/API operation:
- none

Database data modified:
- localStorage is the current persistence layer; not a database

User sees:
- total inspections
- total violations
- compliance percentage
- critical violations count
- brand chart
- severity chart
- category chart
- recent inspection list

Rules / conditions:
- data is read from localStorage only
- records are ordered newest-first in saveInspection

### Feature: Report generation and CSV/PDF export

Where implemented:
- js/features/reports/reportGenerator.js

Data used:
- one inspection record from localStorage by ID

Backend/API operation:
- none

Database data modified:
- none

User sees:
- detailed report including declared fields and violations
- CSV export
- print-to-PDF via browser print dialog

Rules / conditions:
- exported CSV contains Rule ID, Field, Category, Severity, Reference, Message, Recommended Action
- report is opened with ?id= URL parameter

### Feature: Rule library browsing

Where implemented:
- js/features/rules/rulesBrowser.js

Data used:
- data/legal_metrology_national_standards_rules.json

Backend/API operation:
- fetch() loads the JSON file directly from the browser

Database data modified:
- none

User sees:
- searchable rule cards
- valid and invalid values
- legal reference and notes

Rules / conditions:
- search can match field, condition, rule ID, category, or reference
- filters by category and severity are available

## 4. All buttons and user actions

This is the actual set visible in the current UI:

### Dashboard
- Clear history
- New Inspection
- Click recent inspection row

### Scan Product
- upload image dropzone
- remove image preview
- Run OCR on uploaded images
- Auto-fill declared fields
- Fetch product details
- Run Compliance Check
- Reset
- Open Full Report

### Rule Library
- search input
- category dropdown
- severity filter tabs

### Report
- Export CSV
- Export PDF

## 5. Forms and fields

### Product URL form
- E-commerce product link
- input type: URL

### Scan form fields
- Product Name
- Brand
- Product Category
- Common / Generic Name
- Manufacturer / Packer / Importer (name & address)
- Net Quantity — value
- Unit
- MRP (₹)
- Mfg / Pack / Import Date
- Consumer Care Details
- This is an imported product (checkbox)
- Country of Origin
- Gross Weight (free text — parsed automatically)
- Alcoholic Strength
- Sugar Content
- pH Value
- Material Hardness
- Raw label text (textarea)

## 6. Workflows

### Workflow A: Manual inspection
1. Upload label image(s)
2. Run OCR or paste text manually
3. Confirm fields
4. Run compliance check
5. Review score and violation list
6. Open report
7. Save inspection in localStorage

### Workflow B: Product URL extraction
1. Paste product URL
2. Fetch page content via server proxy
3. Extract declaration data via Gemini
4. Review missing mandatory details
5. Confirm fields and run compliance check

### Workflow C: Rule browsing
1. Open Rule Library
2. Search or filter rules
3. Read references and valid/invalid values

### Workflow D: Dashboard review
1. Open dashboard
2. Review graph and counts
3. Click a recent inspection to open report

## 7. Navigation relationships

The app has a simple static navigation structure:

- Dashboard -> index.html
- Scan Product -> scan.html
- Rule Library -> rules.html
- Report page is opened from a record detail link and uses ?id= parameter

There is no routing framework or SPA navigation. All pages are standalone HTML files.

## 8. Authentication and login system

Not implemented in this codebase.

Evidence:
- no login page
- no token or session storage usage
- no JWT or user model
- no role-based middleware
- all access is direct and local in the browser

## 9. User roles and permissions

None implemented.

The code comments reference a future design that mentions roles in README, but no current code enforces those roles. The implemented app is effectively single-user and local-device based.

## 10. Database technology and schema

The current app does not use a real database.

Observed technologies:
- browser localStorage for persisted inspection records
- static JSON file for rules database

Current persisted record shape from js/features/scan/scan.js and js/utils/storage.js:

{
  id: 'insp_xxx',
  createdAt: 'ISO timestamp',
  product: {
    name: 'string',
    brand: 'string',
    category: 'string'
  },
  inputs: {
    productCategory: 'string',
    fields: {
      productName: 'string',
      brand: 'string',
      manufacturerOrPacker: 'string',
      commonName: 'string',
      netQuantity: 'string',
      mrp: 'string',
      mfgDate: 'string',
      consumerCare: 'string',
      countryOfOrigin: 'string',
      isImported: 'boolean'
    },
    netQtyValue: 'string',
    netQtyUnit: 'string',
    grossWeightRaw: 'string',
    coefficients: {
      alcohol: 'string',
      sugar: 'string',
      ph: 'string',
      hardness: 'string'
    },
    rawLabelText: 'string'
  },
  allResults: [],
  violations: [],
  score: 0,
  ocrUsed: true/false
}

The rules JSON schema is a list of objects with fields like:
- rule_id
- field
- condition
- severity
- category
- reference
- valid_values
- invalid_values
- example_valid
- example_invalid
- notes

## 11. API endpoints and backend functions

### Express server: server.js

The server is a Node.js Express app running on PORT (default 3001).

#### GET /health

Purpose:
- health check

Response:
- { ok: true, status: 'ready' }

#### GET /api/fetch-product-page

Purpose:
- fetch the product page text from a supplied URL

Request:
- query parameter: url

Behavior:
- normalizes the URL
- tries multiple candidate fetch paths using jina.ai fallback and direct URL
- strips HTML tags and scripts/styles
- returns cleaned text

Response:
- { ok: true, text, sourceUrl }
- or error JSON on failure

#### POST /api/extract-product

Purpose:
- send raw text to Gemini and extract structured declaration data

Request body:
- rawText
- sourceUrl
- sourceType

Behavior:
- reads GEMINI_API_KEY and GEMINI_MODEL
- builds a strict JSON schema prompt
- calls Google Generative Language API
- decodes the JSON candidate
- returns extracted product object

Response:
- { ok: true, product: { ... } }

## 12. CRUD model in the current implementation

This app is effectively a local, browser-only CRUD-like workflow for inspection records.

Create:
- saveInspection(record) in js/utils/storage.js adds a record to localStorage

Read:
- getInspections()
- getInspectionById(id)
- getDashboardStats()

Update:
- no current update endpoint or mutation method for prior records
- records are simply replaced by rewriting the whole list in localStorage

Delete:
- clearInspections() deletes the full localStorage key

## 13. Business logic and calculations

### Score logic

Implemented in js/core/scoring.js.

Deduction table:
- Critical = 25
- High = 12
- Medium = 6
- Low = 2

Final score is:
- 100 - sum(deductions for each violation)
- minimum score = 0

Banding:
- 96+ = Fully Compliant
- 70-95 = Minor Violations
- 40-69 = Moderate Violations
- below 40 = Critical Violations

### Violation classification

Implemented in js/core/violationClassifier.js.

Warnings are downgraded by one severity level, except Critical.

Recommended action is taken from ACTION_LIBRARY by category.

### Mandatory declaration validation

Implemented in js/core/declarationRules.js.

Required rules:
- manufacturer or packer or importer name & address
- common/generic name
- net quantity
- month & year of manufacture/pack/import
- MRP
- consumer care
- country of origin when imported

### Rule engine behaviors

Implemented in js/core/ruleEngine.js.

The engine checks:
- system-of-units validity from valid_values and invalid_values arrays
- base unit validity
- permitted and prohibited units
- restricted unit conditions based on product category keywords
- formatting violations such as:
  - uppercase unit symbols (KG, ML)
  - stacked SI prefixes like mµm, µkg
  - kmph
  - ambiguous multi-solidus expressions
  - comma decimal separators
  - numeric values outside 0.1–1000 convention used as warning
- coefficient validations for alcohol, sugar, pH, hardness

## 14. Validation rules

### Field validation

The current UI has limited browser-side validation only; there is no full form validation library.

Examples:
- URL input field expects URL format
- file upload accepts only images
- product import checkbox controls whether origin is required

### Rule-based validation

The engine does data-driven checks based on the rule JSON. No static hardcoded list of allowed units is used beyond the JSON itself.

## 15. Search/filter/sort functionality

### Rule search
- by rule ID
- by field name
- by condition
- by reference

### Rule filters
- category dropdown from all rule categories
- severity tabs: All, High, Medium, Low

### Dashboard sorting
- recent inspections are shown newest-first

### No other global sort features exist in the code

## 16. File uploads/downloads

### Uploads
- image uploads for label scanning
- one or more images accepted
- file preview shown in browser

### Downloads
- CSV export from report page
- PDF export using browser print function
- no server-side file storage or attachment management

## 17. Notifications

Current notification mechanism:
- in-app toast messages from js/app.js showToast()
- used mainly for message feedback though not heavily used across the app

Other status displays:
- OCR status banners
- product fetch status banners
- alert() dialogs on engine failure
- empty-state messages on all screens

## 18. External APIs/services

### Google Gemini API

Used for product extraction from raw text.

Environment variables:
- GEMINI_API_KEY
- GEMINI_MODEL

### Jina AI fallback fetches

Used in server.js to try fetching public product pages through r.jina.ai endpoints before direct fetch.

### Tesseract.js

Used in browser for OCR from uploaded label images.

No other major external services are used in this codebase.

## 19. Environment variables and configuration

From .env.example and .env:

- PORT=3001
- GEMINI_API_KEY=...
- GEMINI_MODEL=gemini-2.5-flash
- CORS_ORIGIN=http://localhost:8080

The .env file contains a live-looking Gemini API key checked into the repo. This is a security issue.

## 20. Loading, error and empty states

### Loading states
- OCR progress bar
- status text during OCR
- status text during product fetch
- report page shows “Loading…” before item loads

### Error states
- missing API key on extract-product endpoint
- fetch page failure messages
- invalid URL / sparse page content message
- Tesseract missing warning
- alert if compliance check unexpectedly fails
- report not found message when ID is invalid

### Empty states
- no inspections yet on dashboard
- no rules match filter
- no violations detected
- no brand/category data yet

## 21. Mock, hardcoded or temporary data

The app contains a real rules database in JSON and real OCR via Tesseract.js. It is not just a mock.

However, some behavior is intentionally a working stand-in:
- no backend database exists yet; localStorage is used as a stand-in
- there is no real authentication
- there is no production API service for inspections
- the app uses the browser and Express server in a dev/proxy pattern rather than a full system backend

In README, the app explicitly says Module 2/3 AI detection and OCR backend are scoped-down and a stand-in is used.

## 22. Functionality currently only in frontend

The following are frontend-only today:

- all inspection persistence
- all dashboard analytics
- all rule browsing
- all scoring and violation logic
- all report rendering and export
- all localStorage state
- all navigation between pages
- all rules validation logic in the browser

These are not backed by a production database, API layer, or auth system.

## 23. Security issues identified in the code

The current code has several security concerns:

- live API key appears in .env in the repo
- CORS is wide open via app.use(cors({ origin: true, credentials: true }))
- source page fetch endpoint accepts arbitrary URLs and can fetch external pages from server-side code
- no rate limiting
- no auth or authorization
- no input validation beyond basic checks
- no database-level protection or RBAC
- no CSRF protection because this is not a session-based app
- .env values are hardcoded and may be committed

## 24. What would prevent an independent Android client from using the existing backend

These things currently prevent a clean independent Android client from consuming the existing backend as-is:

- no real authentication flow
- no backend database and no actual user/session model
- no REST API for inspection CRUD beyond the limited endpoints
- localStorage persistence is browser-only and not part of a backend store
- many features are implemented entirely in the frontend and not persisted server-side
- the current backend is limited to product-page fetching and Gemini extraction only
- the Android app would not be able to rely on the current localStorage data or browser-only navigation
- there is no shared contract for user accounts, inspection ownership, or role permissions

## 25. Summary of actual implementation status

The product is a browser application with a thin Express backend used for public page-fetching and Gemini-based declaration extraction. The real compliance engine, rule library, analytics, and report generation are all client-side JavaScript using local browser state.

The current backend can support a simple web + Android architecture only after a proper API and persistence layer is added. It is not yet a true shared backend for multiple clients.

## 26. Corrected documentation issues

The following documentation issues were corrected during the audit:

- the app is no longer described as having no authentication; login and JWT-based auth were added to the codebase
- the app is no longer described as having no backend persistence at all; file-backed inspection storage exists server-side
- the app is no longer described as using only localStorage in all cases; localStorage remains a fallback layer
- the documentation now distinguishes between real backend behavior and compatibility fallback behavior
- the auth and permission model is documented as minimal and not production-grade, rather than being mistaken for a full enterprise system

## 27. Verified Against Code

Verified against the actual implementation in server.js, auth.js, login.html, js/app.js, js/utils/storage.js, and the browser modules:

- Pages implemented: index.html, scan.html, rules.html, report.html, login.html
- Routes implemented: /, /login, /api/auth/login, /api/auth/register, /api/me, /api/inspections, /api/inspections/:id, /api/fetch-product-page, /api/extract-product, /health
- Auth status: real JWT login and role enforcement exist, but the user store is in-memory and not a persistent production database
- Persistence status: inspections are persisted to a file-backed JSON store and browser localStorage remains fallback-only
- Business logic status: compliance engine, scoring, rule library, OCR, and report generation are all real and code-backed
- Important caveat: this remains a hybrid local/server app; it is not yet a shared multi-user backend or a production Android-ready platform
- No mock or fabricated backend feature was treated as real during this audit; all conclusions are derived from code and server behavior
