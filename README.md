# PARAKH — Legal Metrology Compliance Intelligence Platform

A working, feature-structured build of PARAKH: a rule engine that validates
product label declarations against a real Legal Metrology rules database,
plus a full inspector UI (scan → OCR → structured entry → violations →
scored report → dashboard). Everything runs client-side — open `index.html`
and it works, no server or build step required.

## What's real vs. what's scoped down

**Real and fully working:**
- **Rule engine** (`js/core/ruleEngine.js`) — reads
  `data/legal_metrology_national_standards_rules.json` (the 38-rule database
  you supplied) at runtime and validates declared units, restricted-unit
  commodity cross-checks, and formatting rules (unit case, decimal
  separators, stacked SI prefixes, `kmph`, numeric range, etc.) generically
  off that data. Nothing about "kg is valid" is hardcoded — it's derived
  from the JSON's `valid_values`/`invalid_values`/`condition` fields.
- **Mandatory declaration checklist** (`js/core/declarationRules.js`) —
  checks for the Rule 6 declarations (manufacturer, net quantity, MRP,
  mfg date, consumer care, country of origin). This part is **not** sourced
  from your JSON (that file only covers unit/format standards) — it's the
  standard PC Rules 2011 checklist, kept in its own file so the provenance
  is explicit.
- **Scoring & violation classification** (`js/core/scoring.js`,
  `js/core/violationClassifier.js`) — severity-weighted deductions mapped
  to the PRD's four compliance bands, with a recommended action per
  violation.
- **In-browser OCR** — label photos are run through Tesseract.js (loaded
  from CDN) for genuine text extraction, fed straight into the raw-text
  formatting checks.
- **Dashboard, rule library, PDF/CSV export** — all real, backed by
  `localStorage` (see below).

**Intentionally scoped down (documented, not hidden):**
- The PRD's Module 2/3 (AI label-region detection with LayoutLMv3/Donut,
  PaddleOCR-grade extraction) needs a trained computer-vision/OCR backend.
  That can't run inside a static front-end. What's here — Tesseract.js OCR
  plus an inspector-confirmed structured form — is a genuine, working
  stand-in, not a mock.
- No backend/database yet: inspection history is persisted in the
  browser's `localStorage` via `js/utils/storage.js`. Every function in
  that file is already `async` and shaped like an API response, so
  swapping it for real `fetch()` calls against a FastAPI + PostgreSQL
  backend (as specified in the PRD's tech stack) is a drop-in change —
  no other file needs to know the difference.

## Running it

The app is now served by the Express backend, which hosts the static pages and
exposes the inspection and extraction APIs.

```bash
cd parakh
npm install
npm start
# visit http://localhost:3001
```

Default admin login:

```text
Email: admin@parakh.local
Password: admin123
```

The browser can also still be opened directly to `index.html`, but the full
feature set is expected to run through the local server on port 3001.

## Project structure

```
parakh/
├── index.html              # Dashboard (Module 10)
├── scan.html                # New inspection: capture → OCR → fields → check (Modules 1-4)
├── rules.html                # Searchable rule library (reads the JSON database directly)
├── report.html                # Single inspection report + PDF/CSV export (Modules 6, 9)
├── data/
│   └── legal_metrology_national_standards_rules.json   # your uploaded rules database
├── css/
│   ├── variables.css        # design tokens
│   ├── base.css              # shell, layout, mobile nav
│   ├── components.css        # buttons, cards, badges, forms, tables
│   ├── dashboard.css / scan.css / rules.css / report.css
├── js/
│   ├── app.js                 # shared shell behaviour (mobile nav, toasts)
│   ├── data/
│   │   └── rulesLoader.js     # loads + indexes the JSON rules database
│   ├── core/
│   │   ├── ruleEngine.js       # Module 4 — the real, data-driven validator
│   │   ├── declarationRules.js # Mandatory declaration checklist (PC Rules 2011)
│   │   ├── scoring.js           # Module 7 — compliance scoring
│   │   └── violationClassifier.js  # Module 8 — severity + recommended actions
│   ├── utils/
│   │   ├── storage.js          # localStorage persistence (swap for a real API later)
│   │   └── helpers.js           # parsing/formatting helpers
│   └── features/
│       ├── scan/scan.js          # capture, OCR orchestration, form → engine
│       ├── dashboard/dashboard.js  # Module 10 analytics
│       ├── rules/rulesBrowser.js    # rule library search/filter
│       └── reports/reportGenerator.js  # report rendering + PDF/CSV export
```

## Extending toward the full PRD

1. **Backend**: stand up the FastAPI service from the PRD's tech stack,
   move `data/legal_metrology_national_standards_rules.json` into
   PostgreSQL, and re-point `js/data/rulesLoader.js` and
   `js/utils/storage.js` at real endpoints — the rest of the app is
   already written against that async shape.
2. **Real AI label detection / OCR**: add PaddleOCR + LayoutLMv3 behind an
   API endpoint; replace the Tesseract.js call in `scan.js` with a
   `fetch()` to that endpoint. The downstream engine/scoring code doesn't
   change — it already just consumes structured fields + raw text.
3. **More rule categories**: the JSON only covers National Standards
   (units/formatting, 38 rules). Font-size (Module 5) and readability
   (Module 6) checks need actual pixel/image analysis and are natural
   next additions once a CV backend exists.
4. **Auth & roles**: Keycloak/JWT + the Inspector/Senior Officer/Admin/
   Manufacturer roles from the PRD sit cleanly in front of this UI once a
   backend exists to authenticate against.

## Design direction note

The brief included a visual-style document written for an unrelated
eco-water-brand product ("Drink better. Live naturally.", bamboo/springs
photography). Since that palette doesn't fit a government regulatory
compliance tool, PARAKH instead uses a distinct "Regulatory Indigo"
system — deep indigo/near-black panels, amber/gold accent for
alerts and primary actions, IBM Plex Mono for rule IDs and data, Space
Grotesk for headlines — built specifically for this product. Say the
word if you'd actually like the eco-tech palette applied instead.
