/**
 * dashboard.js — Module 10: Compliance Dashboard
 * Reads persisted inspection records (utils/storage.js) and renders the
 * national overview, violation analytics and recent inspection feed.
 */

import { getDashboardStats, getInspections, clearInspections } from '../../utils/storage.js';
import { formatDateTime, escapeHtml } from '../../utils/helpers.js';
import { scoreBand } from '../../core/scoring.js';

function renderStatCards(stats) {
  const el = document.getElementById('stat-cards');
  el.innerHTML = `
    <div class="stat-card">
      <div class="figure">${stats.totalInspections}</div>
      <div class="label">Total Inspections</div>
    </div>
    <div class="stat-card">
      <div class="figure">${stats.totalViolations}</div>
      <div class="label">Violations Logged</div>
    </div>
    <div class="stat-card">
      <div class="figure">${stats.compliancePct}%</div>
      <div class="label">Fully Compliant Rate</div>
    </div>
    <div class="stat-card">
      <div class="figure">${stats.bySeverity.Critical}</div>
      <div class="label">Critical Violations</div>
    </div>
  `;
}

function renderBarChart(elId, dataObj, emptyMsg) {
  const el = document.getElementById(elId);
  const entries = Object.entries(dataObj).sort((a, b) => b[1] - a[1]).slice(0, 6);
  if (!entries.length) {
    el.innerHTML = `<div class="empty-state">${emptyMsg}</div>`;
    return;
  }
  const max = Math.max(...entries.map((e) => e[1]));
  el.innerHTML = entries.map(([name, val]) => `
    <div class="bar-row">
      <div class="name" title="${escapeHtml(name)}">${escapeHtml(name)}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${(val / max) * 100}%"></div></div>
      <div class="val">${val}</div>
    </div>
  `).join('');
}

function renderSeverityLegend(bySeverity) {
  const el = document.getElementById('severity-legend');
  const colors = { Critical: 'var(--critical)', High: 'var(--high)', Medium: 'var(--medium)', Low: 'var(--low)' };
  el.innerHTML = Object.entries(bySeverity).map(([sev, count]) => `
    <div class="item"><span class="status-dot" style="background:${colors[sev]}"></span>${sev}: <strong style="color:var(--paper-100)">${count}</strong></div>
  `).join('');
}

async function renderRecent() {
  const el = document.getElementById('recent-list');
  const inspections = await getInspections();
  if (!inspections.length) {
    el.innerHTML = `<div class="empty-state">No inspections yet. Run your first scan to populate this dashboard.</div>`;
    return;
  }
  el.innerHTML = inspections.slice(0, 8).map((r) => {
    const band = scoreBand(r.score);
    return `
      <a class="recent-row" href="/report?id=${encodeURIComponent(r.id)}" style="text-decoration:none;color:inherit">
        <span class="mono" style="color:var(--paper-muted)">${formatDateTime(r.createdAt)}</span>
        <span><strong>${escapeHtml(r.product.name || 'Unnamed product')}</strong></span>
        <span style="color:var(--paper-muted)">${escapeHtml(r.product.brand || '—')}</span>
        <span class="score" style="color:${scoreColor(r.score)}">${r.score}</span>
        <span class="badge sev-${band.tone === 'pass' ? 'pass' : band.tone === 'critical' ? 'critical' : band.tone === 'moderate' ? 'high' : 'medium'}">${band.label}</span>
      </a>
    `;
  }).join('');
}

function scoreColor(score) {
  if (score >= 96) return 'var(--pass)';
  if (score >= 70) return 'var(--medium)';
  if (score >= 40) return 'var(--high)';
  return 'var(--critical)';
}

export async function initDashboard() {
  const stats = await getDashboardStats();
  renderStatCards(stats);
  renderBarChart('brand-chart', stats.byBrand, 'No brand-level violations recorded yet.');
  renderBarChart('category-chart', stats.byCategory, 'No category-level violations recorded yet.');
  renderSeverityLegend(stats.bySeverity);
  await renderRecent();

  document.getElementById('reset-data')?.addEventListener('click', async () => {
    if (confirm('Clear all locally stored inspection history? This cannot be undone.')) {
      await clearInspections();
      location.reload();
    }
  });
}

initDashboard();
