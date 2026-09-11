/**
 * scoring.js — Module 7: Compliance Scoring System
 * Deducts points per violation, weighted by severity, and maps the
 * final score onto the PRD's four compliance bands.
 */

const DEDUCTIONS = { Critical: 25, High: 12, Medium: 6, Low: 2 };

export function computeScore(violations) {
  let score = 100;
  violations.forEach((v) => {
    score -= DEDUCTIONS[v.severity] ?? 2;
  });
  return Math.max(0, Math.round(score));
}

export function scoreBand(score) {
  if (score >= 96) return { label: 'Fully Compliant', tone: 'pass' };
  if (score >= 70) return { label: 'Minor Violations', tone: 'minor' };
  if (score >= 40) return { label: 'Moderate Violations', tone: 'moderate' };
  return { label: 'Critical Violations', tone: 'critical' };
}
