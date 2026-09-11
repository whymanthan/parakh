# DATABASE SPECIFICATION

This repository does not contain a production database implementation. The current app stores data in the browser and in a static JSON file.

## 1. Actual persistence layers in use

### 1.1 Browser localStorage

Primary storage implementation:
- js/utils/storage.js

Storage key:
- parakh::inspections

This is not a database server. It is browser-local state only.

### 1.2 Static rules JSON

Rules source:
- data/legal_metrology_national_standards_rules.json

This is a static data file, not a database table.

## 2. localStorage inspection record schema

The app persists a saved inspection object with the following structure:

```json
{
  "id": "insp_xxx",
  "createdAt": "2026-09-10T12:34:56.789Z",
  "product": {
    "name": "Example product",
    "brand": "ABC",
    "category": "Food"
  },
  "inputs": {
    "productCategory": "Food",
    "fields": {
      "productName": "Example product",
      "brand": "ABC",
      "manufacturerOrPacker": "ABC Foods Pvt. Ltd.",
      "commonName": "Tea",
      "netQuantity": "500 g",
      "mrp": "120",
      "mfgDate": "2025-12",
      "consumerCare": "care@abc.com",
      "countryOfOrigin": "India",
      "isImported": false
    },
    "netQtyValue": "500",
    "netQtyUnit": "g",
    "grossWeightRaw": "",
    "coefficients": {
      "alcohol": "",
      "sugar": "",
      "ph": "",
      "hardness": ""
    },
    "rawLabelText": "Net Quantity: 500 g"
  },
  "allResults": [],
  "violations": [],
  "score": 96,
  "ocrUsed": true
}
```

### Notes

- all records are stored as a JSON array in localStorage
- newest records are inserted at the front of the array
- no database indexes, foreign keys, or relations are implemented

## 3. Dashboard aggregation model

The dashboard reads the list of inspection records and computes:

- totalInspections
- totalViolations
- compliancePct
- byBrand
- byCategory
- bySeverity
- trend by date

These are not persisted as separate tables; they are derived on read.

## 4. Rules database schema

The JSON file is a list of rule objects. Example shape:

```json
{
  "rule_id": "LM-NS-001",
  "field": "Unit of Weight or Measure",
  "condition": "Every declared unit of weight or measure must be based on the metric system (SI or units recognised under these rules); non-metric/imperial units are not legally valid.",
  "severity": "High",
  "category": "System of Units",
  "reference": "Rule 3",
  "valid_values": ["kg", "g", "mg", "t", "l", "ml", "m", "cm", "mm", "km"],
  "invalid_values": ["lb", "oz", "gallon", "inch"],
  "example_valid": "Net Quantity: 500 g",
  "example_invalid": "Net Quantity: 1.1 lb",
  "notes": "Imperial/non-metric units are outside the metric system mandated by Rule 3 and therefore non-compliant for any legal declaration of weight or measure."
}
```

## 5. Data lifecycle currently implemented

### Create
- saveInspection(record) writes the full array back to localStorage

### Read
- getInspections(), getInspectionById(), getDashboardStats()

### Update
- no explicit update endpoint or write path for a single inspection exists in the code

### Delete
- clearInspections() removes the entire key

## 6. No real relational schema exists

The project presently does not define:

- users table
- roles table
- inspections table
- violations table
- rule categories table
- audit logs table
- file metadata table
- product catalog

All of those are absent from the actual implementation.

## 7. Database constraints and integrity rules

There are no real integrity constraints in the current implementation. The app relies on:

- JavaScript object shapes
- validation logic in the browser
- front-end assumptions

No server-side uniqueness, foreign key, or permission enforcement is present.

## 8. Android/backend compatibility implications

An Android client cannot directly reuse the existing persistence model because:

- localStorage is browser-only
- there is no server database
- inspection data is not shared across devices
- there is no user or tenant ownership model

## 9. Security and data storage observations

The repository currently contains:

- a real .env file with a Gemini API key
- no encryption for stored data
- no secure secret management
- no data retention policy
- no audit log

## 10. Corrected status from code audit

The following items were corrected from earlier drafts:

- inspections are also stored server-side in data/inspections.json
- auth user records are created in memory at runtime in AUTH_STORE in server.js
- there is no production relational database, but there is a real filesystem-backed persistence layer for inspections
- this is not a multi-user database; it is a local server JSON store with in-memory auth state

## 11. Implementation conclusion

The current project uses static JSON, browser localStorage fallback, and a filesystem JSON store, not a real backend database. Any Android app that wants to integrate with the same system will need a proper backend persistence layer and a clear shared data contract.

## 12. Verified Against Code

Verified against server.js, auth.js, js/utils/storage.js, and the app data files:

- Browser storage: localStorage key parakh::inspections is still used as a fallback path
- Server storage: data/inspections.json is used as the primary JSON store for saved inspections
- Auth state: AUTH_STORE in server.js stores users in memory and does not persist across process restarts
- No relational entities: no users table, roles table, violations table, or audit table exists in code
- No mock database: the current persistence model is real file-based storage for inspections, but it is not a production database and should not be mistaken for one
