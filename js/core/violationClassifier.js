/**
 * violationClassifier.js — Module 8: Violation Intelligence Engine
 * Converts raw engine results (from ruleEngine.js + declarationRules.js)
 * into the Critical/High/Medium/Low taxonomy from the PRD, with a
 * recommended corrective action per violation.
 */

const ACTION_LIBRARY = {
  'Mandatory Declaration': 'Reprint/relabel the package to include the missing declaration before further sale or distribution.',
  'System of Units': 'Replace the non-metric unit with its correct SI/metric equivalent on all pending stock and future print runs.',
  'Base Unit': 'Correct the unit to the mandated SI base unit or its permitted sub/multiple.',
  'Permitted Unit': 'Use only the permitted unit for this commodity class; update label artwork.',
  'Restricted Unit': 'Confirm commodity classification; if it does not qualify, replace the restricted unit with the standard metric unit.',
  'Prohibited Unit': 'Remove the prohibited unit entirely and replace with a compliant declaration.',
  'Formatting': 'Correct the numeric/unit formatting (case, decimal separator, prefix, digit grouping) per the Third Schedule.',
  'Coefficient': 'Re-declare the coefficient using the notation specified in the Tenth Schedule.',
  'Physical Constant': 'Cite the physical constant using the Ninth Schedule value and unit.',
  'General': 'Review against the cited rule reference and correct the declaration accordingly.',
};

export function classifyResults(rawResults) {
  return rawResults
    .filter((r) => r.status === 'fail' || r.status === 'warning')
    .map((r) => ({
      ...r,
      severity: r.status === 'warning' && r.severity !== 'Critical'
        ? downgradeForWarning(r.severity)
        : r.severity,
      recommendedAction: ACTION_LIBRARY[r.category] || 'Review the declaration against the cited legal reference.',
    }))
    .sort((a, b) => rank(b.severity) - rank(a.severity));
}

function downgradeForWarning(sev) {
  // A "warning" (e.g. ambiguous category match) is treated one notch
  // softer than a confirmed "fail" of the same underlying rule.
  const order = ['Low', 'Medium', 'High', 'Critical'];
  const idx = order.indexOf(sev);
  return idx > 0 ? order[idx - 1] : sev;
}

function rank(sev) {
  return { Critical: 4, High: 3, Medium: 2, Low: 1 }[sev] || 0;
}

export function summarizeBySeverity(violations) {
  const summary = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  violations.forEach((v) => { summary[v.severity] = (summary[v.severity] || 0) + 1; });
  return summary;
}
