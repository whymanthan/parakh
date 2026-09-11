/**
 * rulesBrowser.js
 * Searchable/filterable browser over the actual JSON rules database —
 * lets inspectors look up a rule's legal reference, valid/invalid values
 * and worked examples without leaving the app.
 */

import { loadRules, allCategories } from '../../data/rulesLoader.js';
import { escapeHtml } from '../../utils/helpers.js';

let RULES = [];
let state = { query: '', category: 'All', severity: 'All' };

function matches(rule) {
  const q = state.query.toLowerCase();
  const inText = !q ||
    rule.field.toLowerCase().includes(q) ||
    rule.condition.toLowerCase().includes(q) ||
    rule.rule_id.toLowerCase().includes(q) ||
    (rule.reference || '').toLowerCase().includes(q);
  const inCategory = state.category === 'All' || rule.category === state.category;
  const inSeverity = state.severity === 'All' || rule.severity === state.severity;
  return inText && inCategory && inSeverity;
}

function severityBadgeClass(sev) {
  return { High: 'sev-high', Medium: 'sev-medium', Low: 'sev-low' }[sev] || 'sev-low';
}

function render() {
  const filtered = RULES.filter(matches);
  document.getElementById('rule-count').textContent = `${filtered.length} of ${RULES.length} rules`;

  const el = document.getElementById('rule-list');
  if (!filtered.length) {
    el.innerHTML = `<div class="empty-state">No rules match this filter.</div>`;
    return;
  }

  el.innerHTML = filtered.map((r) => `
    <div class="rule-card">
      <div class="rhead">
        <div>
          <div class="rid">${escapeHtml(r.rule_id)} · ${escapeHtml(r.category)}</div>
          <h3>${escapeHtml(r.field)}</h3>
        </div>
        <span class="badge ${severityBadgeClass(r.severity)}">${escapeHtml(r.severity)}</span>
      </div>
      <div class="rcond">${escapeHtml(r.condition)}</div>
      <div class="rmeta-grid">
        <div><div class="k">Reference</div><div class="v">${escapeHtml(r.reference || '—')}</div></div>
        <div><div class="k">Valid Values</div><div class="v">${(r.valid_values || []).map(escapeHtml).join(', ') || '—'}</div></div>
        <div><div class="k">Invalid Values</div><div class="v">${(r.invalid_values || []).map(escapeHtml).join(', ') || '—'}</div></div>
      </div>
      ${(r.example_valid || r.example_invalid) ? `
      <div class="examples">
        ${r.example_valid ? `<div class="ex ok">✓ ${escapeHtml(r.example_valid)}</div>` : ''}
        ${r.example_invalid ? `<div class="ex bad">✕ ${escapeHtml(r.example_invalid)}</div>` : ''}
      </div>` : ''}
      ${r.notes ? `<p style="margin-top:10px; font-size:12.5px;">${escapeHtml(r.notes)}</p>` : ''}
    </div>
  `).join('');
}

function bindToolbar() {
  document.getElementById('search-input').addEventListener('input', (e) => {
    state.query = e.target.value; render();
  });
  document.getElementById('category-filter').addEventListener('change', (e) => {
    state.category = e.target.value; render();
  });
  document.querySelectorAll('.pill-tab[data-severity]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pill-tab[data-severity]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.severity = btn.dataset.severity;
      render();
    });
  });
}

export async function initRulesBrowser() {
  RULES = await loadRules();
  const catSelect = document.getElementById('category-filter');
  allCategories(RULES).forEach((c) => {
    const opt = document.createElement('option');
    opt.value = c; opt.textContent = c;
    catSelect.appendChild(opt);
  });
  bindToolbar();
  render();
}

initRulesBrowser();
