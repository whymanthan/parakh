/**
 * rulesLoader.js
 * Loads data/legal_metrology_national_standards_rules.json — the actual
 * rules database supplied for PARAKH — and exposes small lookup helpers
 * over it. This is the single source of truth the rule engine runs
 * against; nothing about unit/format validity is hardcoded elsewhere.
 */

const RULES_PATH = 'data/legal_metrology_national_standards_rules.json';

let _cache = null;

export async function loadRules() {
  if (_cache) return _cache;
  const res = await fetch(RULES_PATH);
  if (!res.ok) {
    throw new Error(`Failed to load rules database: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  _cache = data;
  return data;
}

export function rulesByCategory(rules, category) {
  return rules.filter((r) => r.category === category);
}

export function ruleById(rules, ruleId) {
  return rules.find((r) => r.rule_id === ruleId) || null;
}

export function allCategories(rules) {
  return [...new Set(rules.map((r) => r.category))];
}

/**
 * Builds a flat unit -> [rules] index so the engine can answer
 * "which rules mention this unit token, and in what capacity"
 * in O(1) instead of scanning the whole array per lookup.
 */
export function buildUnitIndex(rules) {
  const index = { valid: {}, invalid: {} };
  rules.forEach((rule) => {
    (rule.valid_values || []).forEach((u) => {
      const key = u.toLowerCase();
      index.valid[key] = index.valid[key] || [];
      index.valid[key].push(rule.rule_id);
    });
    (rule.invalid_values || []).forEach((u) => {
      const key = u.toLowerCase();
      index.invalid[key] = index.invalid[key] || [];
      index.invalid[key].push(rule.rule_id);
    });
  });
  return index;
}
