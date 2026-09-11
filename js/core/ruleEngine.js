/**
 * ruleEngine.js — Module 4: Legal Rule Engine
 * =============================================================
 * This is the real, data-driven validator. It never hardcodes "kg is
 * valid" anywhere — every pass/fail decision is derived at runtime from
 * data/legal_metrology_national_standards_rules.json (38 rules covering
 * System of Units, Base/Permitted/Restricted/Prohibited units, Formatting,
 * Coefficients and Physical Constants).
 *
 * A small number of rules (restricted-unit category cross-checks, and the
 * structural/formatting rules) need a bit of parsing logic because the
 * database expresses them as legal conditions in prose rather than a
 * flat valid/invalid list — e.g. "carat is valid ONLY for diamonds,
 * pearls and precious stones" can't be checked by list membership alone,
 * it needs the declared commodity category too. That parsing logic lives
 * here, but the *facts* (which rule, its severity, its legal reference,
 * its example text) are always read from the JSON, never duplicated.
 */

import { parseQuantityString } from '../utils/helpers.js';

// ---- category keyword hints -------------------------------------------
// Used only to match a free-text productCategory against the commodity
// classes referenced in restricted-unit rule conditions/notes.
const CATEGORY_KEYWORDS = {
  'LM-NS-009': ['diamond', 'pearl', 'precious stone', 'gem', 'jewel'],
  'LM-NS-010': ['food grain', 'farm produce', 'grain', 'agricultur', 'cereal', 'pulses'],
  'LM-NS-012': ['land'],
  'LM-NS-011': ['navigation', 'marine', 'aerial', 'aviation'],
};

function textMentionsCategory(ruleId, productCategory) {
  const keywords = CATEGORY_KEYWORDS[ruleId];
  if (!keywords || !productCategory) return null; // unknown / not applicable
  const hay = productCategory.toLowerCase();
  return keywords.some((k) => hay.includes(k));
}

function makeResult({ rule, field, status, message, evidence }) {
  return {
    ruleId: rule.rule_id,
    field,
    category: rule.category,
    reference: rule.reference,
    severity: rule.severity,
    status, // 'pass' | 'fail' | 'warning' | 'info'
    message,
    evidence: evidence || null,
    condition: rule.condition,
  };
}

// ---- 1. Unit-token checks (System of Units / Base / Permitted rules) --
function checkUnitToken(unit, fieldLabel, rules) {
  if (!unit) return [];
  const results = [];
  const normalized = unit.trim();
  const lower = normalized.toLowerCase();

  const scopeCategories = ['System of Units', 'Base Unit', 'Permitted Unit', 'Prohibited Unit'];

  rules
    .filter((r) => scopeCategories.includes(r.category))
    .forEach((rule) => {
      const validSet = (rule.valid_values || []).map((v) => v.toLowerCase());
      const invalidSet = (rule.invalid_values || []).map((v) => v.toLowerCase());

      if (invalidSet.includes(lower)) {
        results.push(makeResult({
          rule,
          field: fieldLabel,
          status: 'fail',
          message: `"${normalized}" is a non-metric / disallowed unit under ${rule.field}.`,
          evidence: normalized,
        }));
      } else if (validSet.includes(lower)) {
        results.push(makeResult({
          rule,
          field: fieldLabel,
          status: 'pass',
          message: `"${normalized}" is a legally valid unit under ${rule.field}.`,
          evidence: normalized,
        }));
      }
    });

  return results;
}

// ---- 2. Restricted-unit cross-checks (carat, quintal, hectare, knot) --
function checkRestrictedUnits(unit, productCategory, fieldLabel, rules) {
  if (!unit) return [];
  const results = [];
  const lower = unit.toLowerCase();

  rules
    .filter((r) => r.category === 'Restricted Unit')
    .forEach((rule) => {
      const validSet = (rule.valid_values || []).map((v) => v.toLowerCase());
      const invalidSet = (rule.invalid_values || []).map((v) => v.toLowerCase());

      if (validSet.includes(lower)) {
        const categoryOk = textMentionsCategory(rule.rule_id, productCategory);
        if (categoryOk === false) {
          results.push(makeResult({
            rule,
            field: fieldLabel,
            status: 'fail',
            message: `"${unit}" is only permitted for a restricted commodity class (${rule.field}); the declared product category "${productCategory}" does not match. ${rule.notes || ''}`.trim(),
            evidence: unit,
          }));
        } else if (categoryOk === true) {
          results.push(makeResult({
            rule,
            field: fieldLabel,
            status: 'pass',
            message: `"${unit}" is correctly used within its restricted commodity class (${rule.field}).`,
            evidence: unit,
          }));
        } else {
          results.push(makeResult({
            rule,
            field: fieldLabel,
            status: 'warning',
            message: `"${unit}" is a restricted unit (${rule.field}); confirm the commodity category qualifies. ${rule.notes || ''}`.trim(),
            evidence: unit,
          }));
        }
      }
      if (invalidSet.some((v) => lower.includes(v.split(' ')[0]))) {
        results.push(makeResult({
          rule,
          field: fieldLabel,
          status: 'fail',
          message: `"${unit}" misuses a restricted unit — ${rule.condition}`,
          evidence: unit,
        }));
      }
    });

  return results;
}

// ---- 3. Formatting rules (regex-driven, tied to specific rule_ids) ----
function checkFormatting(rawText, structuredValues, rules) {
  const results = [];
  const byId = (id) => rules.find((r) => r.rule_id === id);
  const haystack = rawText || structuredValues.map((v) => v.raw).join('  ');

  // LM-NS-022: unit symbols must be lower case (kg, l, ml, m, cm)
  const r022 = byId('LM-NS-022');
  if (r022) {
    const badCase = haystack.match(/\b(KG|Kg|ML|Ml|GM|Gm|LTR|Ltr|MG|CM)\b/g);
    if (badCase && badCase.length) {
      results.push(makeResult({
        rule: r022, field: 'Label text', status: 'fail',
        message: `Unit symbol(s) not in required lower case: ${[...new Set(badCase)].join(', ')}.`,
        evidence: badCase.join(', '),
      }));
    }
  }

  // LM-NS-023 / 024: stacked / compound SI prefixes (e.g. mµm, µkg)
  const r023 = byId('LM-NS-023');
  const r024 = byId('LM-NS-024');
  const stackedPrefix = haystack.match(/\b(mµ|µk|km?µ|µkg|mµm)\w*/gi);
  if (stackedPrefix && stackedPrefix.length) {
    if (r024 && /µkg/i.test(haystack)) {
      results.push(makeResult({
        rule: r024, field: 'Label text', status: 'fail',
        message: `Mass sub-multiple must be formed on "gram", not "kilogram" — found "${stackedPrefix.join(', ')}".`,
        evidence: stackedPrefix.join(', '),
      }));
    } else if (r023) {
      results.push(makeResult({
        rule: r023, field: 'Label text', status: 'fail',
        message: `Compound/stacked SI prefix detected: "${stackedPrefix.join(', ')}".`,
        evidence: stackedPrefix.join(', '),
      }));
    }
  }

  // LM-NS-025: "kmph" style use of 'p' for per/division
  const r025 = byId('LM-NS-025');
  if (r025 && /\bkmph\b/i.test(haystack)) {
    results.push(makeResult({
      rule: r025, field: 'Label text', status: 'fail',
      message: `"kmph" uses "p" to denote division — use "km/h" instead.`,
      evidence: 'kmph',
    }));
  }

  // LM-NS-026: more than one solidus on one line without parentheses
  const r026 = byId('LM-NS-026');
  if (r026) {
    const doubleSolidus = haystack.match(/[a-zA-Z]+\/[a-zA-Z]+\/[a-zA-Z]+/g);
    if (doubleSolidus && doubleSolidus.length) {
      results.push(makeResult({
        rule: r026, field: 'Label text', status: 'fail',
        message: `Ambiguous multi-solidus unit expression: "${doubleSolidus.join(', ')}".`,
        evidence: doubleSolidus.join(', '),
      }));
    }
  }

  // LM-NS-028: decimal separator must be a dot, not a comma
  const r028 = byId('LM-NS-028');
  if (r028) {
    const commaDecimal = haystack.match(/\b\d+,\d+\s?(kg|g|mg|l|ml|m|cm|mm|km|t)\b/gi);
    if (commaDecimal && commaDecimal.length) {
      results.push(makeResult({
        rule: r028, field: 'Label text', status: 'fail',
        message: `Comma used as decimal separator instead of a dot: "${commaDecimal.join(', ')}".`,
        evidence: commaDecimal.join(', '),
      }));
    }
  }

  // LM-NS-027: numeric value should fall between 0.1 and 1000 (with SI prefix)
  const r027 = byId('LM-NS-027');
  if (r027) {
    structuredValues.forEach((v) => {
      if (v.numberValue != null && (v.numberValue >= 100000 || (v.numberValue !== 0 && v.numberValue < 0.001))) {
        results.push(makeResult({
          rule: r027, field: v.fieldLabel || 'Numeric value', status: 'warning',
          message: `${v.numberValue} ${v.unit || ''} falls well outside the 0.1–1000 convention — consider a different SI prefix.`,
          evidence: `${v.numberValue} ${v.unit || ''}`,
        }));
      }
    });
  }

  return results;
}

// ---- 4. Coefficient rules (alcohol %, sugar Brix, pH, hardness) -------
function checkCoefficient(field) {
  return function checker(value, rules) {
    if (!value) return [];
    const rule = rules.find((r) => r.field === field);
    if (!rule || !rule.valid_values || !rule.valid_values.length) return [];
    const ok = rule.valid_values.some((v) => value.toLowerCase().includes(v.toLowerCase()));
    return [makeResult({
      rule,
      field,
      status: ok ? 'pass' : 'fail',
      message: ok
        ? `${field} declared using a recognised notation.`
        : `${field} value "${value}" does not use an accepted notation (${rule.valid_values.join(', ')}).`,
      evidence: value,
    })];
  };
}

/**
 * Main entry point. `input` shape:
 * {
 *   productCategory: string,
 *   quantities: [{ fieldLabel, raw, numberValue, unit }],
 *   rawLabelText: string,
 *   coefficients: { alcohol, sugar, ph, hardness }
 * }
 */
export function runNationalStandardsEngine(input, rules) {
  const results = [];

  (input.quantities || []).forEach((q) => {
    results.push(...checkUnitToken(q.unit, q.fieldLabel, rules));
    results.push(...checkRestrictedUnits(q.unit, input.productCategory, q.fieldLabel, rules));
  });

  results.push(...checkFormatting(input.rawLabelText, input.quantities || [], rules));

  const coeff = input.coefficients || {};
  if (coeff.alcohol) results.push(...checkCoefficient('Alcoholic Strength')(coeff.alcohol, rules));
  if (coeff.sugar) results.push(...checkCoefficient('Sugar Content')(coeff.sugar, rules));
  if (coeff.ph) results.push(...checkCoefficient('pH Value')(coeff.ph, rules));
  if (coeff.hardness) results.push(...checkCoefficient('Material Hardness')(coeff.hardness, rules));

  return results;
}

/** Convenience: turn a raw string like "500 g" into an engine-ready quantity entry. */
export function toQuantityEntry(fieldLabel, str) {
  const parsed = parseQuantityString(str);
  if (!parsed) return null;
  return { fieldLabel, raw: parsed.raw, numberValue: parsed.numberValue, unit: parsed.unit };
}
