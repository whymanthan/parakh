/**
 * reportGenerator.js — Modules 6 & 9 (Reporting / Digital Evidence Repository)
 * Renders a single saved inspection as a full legally-referenced report.
 * "Export PDF" uses the browser's native print-to-PDF (see css/report.css
 * @media print) rather than a fake download — it produces a real PDF.
 * "Export CSV" produces a genuine CSV of the violation list.
 */

import { getInspectionById } from '../../utils/storage.js';
import { formatDateTime, escapeHtml } from '../../utils/helpers.js';
import { scoreBand } from '../../core/scoring.js';

function getIdFromUrl() {
  return new URLSearchParams(location.search).get('id');
}

function toCsv(record) {
  const header = ['Rule ID', 'Field', 'Category', 'Severity', 'Reference', 'Message', 'Recommended Action'];
  const rows = record.violations.map((v) => [
    v.ruleId, v.field, v.category, v.severity, v.reference || '', v.message, v.recommendedAction,
  ]);
  const escape = (s) => `"${String(s).replace(/"/g, '""')}"`;
  return [header, ...rows].map((r) => r.map(escape).join(',')).join('\n');
}

function downloadCsv(record) {
  const csv = toCsv(record);
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `PARAKH-report-${record.id}.csv`;
  a.click();
}

function render(record) {
  const band = scoreBand(record.score);
  document.title = `PARAKH — Report: ${record.product.name}`;

  document.getElementById('report-title').textContent = record.product.name || 'Unnamed product';
  document.getElementById('report-sub').textContent =
    `${record.product.brand || 'Unknown brand'} · ${record.product.category || 'Uncategorised'}`;

  document.getElementById('report-meta').innerHTML = `
    <div><div class="k">Report ID</div><div class="v mono">${escapeHtml(record.id)}</div></div>
    <div><div class="k">Inspected On</div><div class="v">${formatDateTime(record.createdAt)}</div></div>
    <div><div class="k">Compliance Score</div><div class="v" style="color:${scoreColor(record.score)}">${record.score} / 100</div></div>
    <div><div class="k">Status</div><div class="v">${band.label}</div></div>
  `;

  const declared = document.getElementById('declared-fields');
  const f = record.inputs.fields;
  const rows = [
    ['Product Name', f.productName], ['Brand', f.brand], ['Common Name', f.commonName],
    ['Manufacturer/Packer/Importer', f.manufacturerOrPacker], ['Net Quantity', f.netQuantity],
    ['MRP', f.mrp ? `₹${f.mrp}` : ''], ['Mfg/Pack Date', f.mfgDate], ['Consumer Care', f.consumerCare],
    ['Country of Origin', f.isImported ? f.countryOfOrigin : 'N/A (not imported)'],
  ];
  declared.innerHTML = rows.map(([k, v]) => `
    <tr><td style="color:var(--paper-muted)">${escapeHtml(k)}</td><td>${v ? escapeHtml(v) : '<span style="color:var(--critical)">Not declared</span>'}</td></tr>
  `).join('');

  const list = document.getElementById('violation-list');
  if (!record.violations.length) {
    list.innerHTML = `<div class="empty-state">No violations detected. This package passed every loaded rule. ✅</div>`;
  } else {
    list.innerHTML = record.violations.map((v) => `
      <div class="violation-card sev-${v.severity}">
        <div class="vhead">
          <span class="vfield">${escapeHtml(v.field)}</span>
          <span class="badge sev-${v.severity.toLowerCase()}">${v.severity}</span>
        </div>
        <div class="vmsg">${escapeHtml(v.message)}</div>
        <div class="vmeta">${escapeHtml(v.ruleId)} · ${escapeHtml(v.reference || '')} · ${escapeHtml(v.category)}</div>
        <div class="vaction">Recommended action → ${escapeHtml(v.recommendedAction)}</div>
      </div>
    `).join('');
  }

  document.getElementById('export-pdf').addEventListener('click', () => window.print());
  document.getElementById('export-csv').addEventListener('click', () => downloadCsv(record));
}

function scoreColor(score) {
  if (score >= 96) return 'var(--pass)';
  if (score >= 70) return 'var(--medium)';
  if (score >= 40) return 'var(--high)';
  return 'var(--critical)';
}

export async function initReport() {
  const id = getIdFromUrl();
  const record = id ? await getInspectionById(id) : null;
  if (!record) {
    document.getElementById('report-body').innerHTML = `<div class="empty-state">Report not found. It may have been cleared from local history. <a href="index.html">← Back to dashboard</a></div>`;
    return;
  }
  render(record);
}

initReport();
