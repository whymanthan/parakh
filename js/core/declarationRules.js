/**
 * declarationRules.js
 * =============================================================
 * NOTE ON PROVENANCE: unlike ruleEngine.js, this checklist is NOT sourced
 * from the uploaded JSON database (that file only covers National
 * Standards / unit rules). This module encodes the well-known mandatory
 * label declarations under the Legal Metrology (Packaged Commodities)
 * Rules, 2011, Rule 6 — the "does the label even have the required
 * fields" layer that Module 4 of the PRD calls "Mandatory Declaration
 * Rules". Keeping it in its own file makes the provenance explicit and
 * makes it trivial to swap for a real backend-managed rule set later.
 */

export const MANDATORY_DECLARATIONS = [
  {
    id: 'PC-MD-001',
    field: 'manufacturerOrPacker',
    label: 'Name & Address of Manufacturer/Packer/Importer',
    severity: 'Critical',
    reference: 'PC Rules 2011, Rule 6(1)(a)',
  },
  {
    id: 'PC-MD-002',
    field: 'commonName',
    label: 'Common / Generic Name of the Commodity',
    severity: 'High',
    reference: 'PC Rules 2011, Rule 6(1)(b)',
  },
  {
    id: 'PC-MD-003',
    field: 'netQuantity',
    label: 'Net Quantity (standard unit)',
    severity: 'Critical',
    reference: 'PC Rules 2011, Rule 6(1)(c)',
  },
  {
    id: 'PC-MD-004',
    field: 'mfgDate',
    label: 'Month & Year of Manufacture/Pack/Import',
    severity: 'High',
    reference: 'PC Rules 2011, Rule 6(1)(d)',
  },
  {
    id: 'PC-MD-005',
    field: 'mrp',
    label: 'Maximum Retail Price (inclusive of all taxes)',
    severity: 'Critical',
    reference: 'PC Rules 2011, Rule 6(1)(e)',
  },
  {
    id: 'PC-MD-006',
    field: 'consumerCare',
    label: 'Consumer Care / Customer Support Details',
    severity: 'High',
    reference: 'PC Rules 2011, Rule 6(1)(f)',
  },
  {
    id: 'PC-MD-007',
    field: 'countryOfOrigin',
    label: 'Country of Origin (imported goods only)',
    severity: 'Medium',
    reference: 'PC Rules 2011, Rule 6(1)(g) / Consumer Protection (E-Commerce) Rules 2020',
    conditional: (fields) => fields.isImported === true,
  },
];

/**
 * Checks a structured `fields` object (from the scan form) against the
 * mandatory declaration checklist. Returns one result per declaration.
 */
export function checkMandatoryDeclarations(fields) {
  return MANDATORY_DECLARATIONS
    .filter((d) => !d.conditional || d.conditional(fields))
    .map((d) => {
      const value = (fields[d.field] || '').toString().trim();
      const present = value.length > 0;
      return {
        ruleId: d.id,
        field: d.label,
        category: 'Mandatory Declaration',
        reference: d.reference,
        severity: d.severity,
        status: present ? 'pass' : 'fail',
        message: present
          ? `${d.label} is declared.`
          : `${d.label} is missing from the label.`,
        evidence: present ? value : null,
        condition: `Every applicable package must declare: ${d.label}.`,
      };
    });
}
