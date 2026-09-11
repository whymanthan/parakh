# USER FLOWS

This file describes the actual user journeys implemented in the codebase.

## 1. Dashboard flow

### Entry point
- index.html

### Steps
1. User opens dashboard.
2. Dashboard reads saved inspection records from localStorage.
3. Stats are calculated from the local array.
4. User sees total counts, brand/category charts, and recent inspections.
5. User can click a recent inspection to open its report page.
6. User can clear all stored inspection history.
7. User can navigate to Scan Product or Rule Library.

### Result
- summary metrics and inspection history are visible

## 2. New inspection flow

### Entry point
- scan.html

### Steps
1. User clicks the upload zone or drag-and-drops image files.
2. Uploaded images are shown as preview cards.
3. User clicks Run OCR.
4. Tesseract.js processes images and generates raw text.
5. OCR output is placed in the Raw label text textarea.
6. User may manually edit text or click Auto-fill declared fields.
7. User can also paste an e-commerce product URL and click Fetch product details.
8. The server fetches text and Gemini extracts likely declaration fields.
9. User confirms or edits fields.
10. User clicks Run Compliance Check.
11. The rule engine validates the inputs and mandatory declarations.
12. The app displays a score, violation list, and result summary.
13. The user clicks Open Full Report to view detailed results.

### Result
- one inspection record is saved locally and a report is generated.

## 3. Product link extraction flow

### Entry point
- scan.html / product URL field

### Steps
1. User enters a URL.
2. User clicks Fetch product details.
3. Browser calls: /api/fetch-product-page?url=...
4. Server fetches page content and strips HTML.
5. Browser sends the content to /api/extract-product.
6. Gemini tries to recover fields such as manufacturer, net quantity, MRP, origin, etc.
7. App automatically fills the form.
8. User reviews missing required fields and completes the form.

### Result
- product declaration fields are filled from a remote product page or a manual fallback

## 4. Rule library flow

### Entry point
- rules.html

### Steps
1. User opens Rule Library.
2. Rules are loaded from the JSON file.
3. User searches by text.
4. User filters by category.
5. User clicks severity tabs.
6. Relevant rules are displayed with legal reference, valid and invalid values, and examples.

### Result
- user can inspect rule source material and legal references

## 5. Report review flow

### Entry point
- report.html?id=inspectionId

### Steps
1. User opens report from dashboard or generated result link.
2. Application reads inspection record by ID from localStorage.
3. Report renders declared values and violations.
4. User can export CSV.
5. User can print the page to PDF.

### Result
- a single inspection is reviewed as a formal compliance report

## 6. Reset/clear flow

### Entry point
- Dashboard reset-data button
- Scan page reset-form button

### Behavior
- reset-form reloads the page
- clear history deletes all saved inspection records in localStorage

## 7. Authenticated flow now exists

The codebase now includes:

- login.html for the sign-in screen
- /api/auth/login for token issuance
- /api/auth/register for account creation
- /api/me for current-user lookup
- JWT-based session enforcement via authMiddleware

This is a real implementation in the current code, but it is still not a full enterprise identity system and is not backed by a persistent user database.

## 8. Actual high-level user journey

The current app is best described as:

- Inspector uploads label image
- OCR extracts raw text
- Product URL may be fetched and structured
- Product declaration is entered and reviewed
- Rule engine evaluates legal-metrology compliance
- Score and violation summary are generated
- Dashboard and report pages archive the result locally

This is the full implemented workflow.

## 9. Corrected status from code audit

The following items were corrected from earlier drafts:

- login and registration flows were added and should be documented as actual features
- root route behavior has been corrected to redirect to /login.html
- auth-aware storage and session checks were introduced, but they are not yet a production-grade permission model
- the app still contains fallback behavior for localStorage and optional auth compatibility, which must not be mistaken for a full backend system

## 10. Verified Against Code

Verified against server.js, auth.js, login.html, js/app.js, and js/utils/storage.js:

- Browser flow: landing route redirects to login page
- Auth flow: user enters credentials; server validates and returns JWT; frontend stores token in localStorage
- Protected pages: app checks localStorage token before allowing access beyond login
- Inspection flow: scan, OCR, extraction, engine validation, and report generation remain real features
- Important caveat: the app is still a hybrid local/server app and not yet a fully multi-user platform
