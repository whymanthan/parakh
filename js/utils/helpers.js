/**
 * helpers.js
 * Small generic utilities shared across PARAKH features.
 */

export function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function nowISO() {
  return new Date().toISOString();
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Parses a free-form quantity string like "500 g", "1.1 lb", "12,5 kg"
 * into { raw, numberText, numberValue, unit }.
 * Deliberately permissive: legal-metrology violations often live inside
 * malformed numbers/units, so we must not silently reject them.
 */
export function parseQuantityString(input) {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();

  // Matches: number (with . or , as separator, optional thousands spacing) + unit token
  const match = trimmed.match(
    /(-?\d[\d,.\s]*)\s*([a-zA-Zµ°%\/\.\-]+)?/
  );
  if (!match) return null;

  const numberText = (match[1] || '').trim();
  const unit = (match[2] || '').trim();

  // Normalize a candidate numeric value for range/format checks only.
  const normalizedForParse = numberText.replace(/\s/g, '').replace(',', '.');
  const numberValue = parseFloat(normalizedForParse);

  return {
    raw: trimmed,
    numberText,
    numberValue: Number.isNaN(numberValue) ? null : numberValue,
    unit,
  };
}

export function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function severityWeight(severity) {
  switch ((severity || '').toLowerCase()) {
    case 'critical': return 4;
    case 'high': return 3;
    case 'medium': return 2;
    case 'low': return 1;
    default: return 0;
  }
}

export function severityRank(severity) {
  // Higher number = worse, used for sorting violation lists.
  return severityWeight(severity);
}

export function formatDateTime(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
