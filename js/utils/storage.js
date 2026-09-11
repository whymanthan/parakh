/**
 * storage.js
 * Persistent inspection storage for the web app.
 *
 * The app now prefers a real backend API at http://localhost:3001/api/*.
 * If the backend is unavailable, it falls back to browser localStorage so
 * the current static flow still works in a local development environment.
 */

const KEY_INSPECTIONS = 'parakh::inspections';
const API_URL = (() => {
  try {
    if (window.location && window.location.origin && window.location.origin !== 'null') {
      return `${window.location.origin}/api`;
    }
  } catch {
    // Fall through to localhost fallback below.
  }
  return 'http://localhost:3001/api';
})();

function readAll() {
  try {
    const raw = localStorage.getItem(KEY_INSPECTIONS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('PARAKH storage read failed', e);
    return [];
  }
}

function writeAll(list) {
  localStorage.setItem(KEY_INSPECTIONS, JSON.stringify(list));
}

function getAuthHeader() {
  const token = localStorage.getItem('parakh-auth-token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchJson(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export async function saveInspection(record) {
  try {
    const saved = await fetchJson('/inspections', {
      method: 'POST',
      body: JSON.stringify(record),
    });
    return saved;
  } catch (err) {
    console.warn('Backend inspection save failed; falling back to localStorage.', err);
    const all = readAll();
    all.unshift(record);
    writeAll(all);
    return record;
  }
}

export async function getInspections() {
  try {
    return await fetchJson('/inspections');
  } catch (err) {
    console.warn('Backend inspection list failed; falling back to localStorage.', err);
    return readAll();
  }
}

export async function getInspectionById(id) {
  try {
    return await fetchJson(`/inspections/${encodeURIComponent(id)}`);
  } catch (err) {
    console.warn('Backend inspection lookup failed; falling back to localStorage.', err);
    return readAll().find((r) => r.id === id) || null;
  }
}

export async function clearInspections() {
  try {
    await fetchJson('/inspections', { method: 'DELETE' });
  } catch (err) {
    console.warn('Backend clear failed; falling back to localStorage.', err);
    localStorage.removeItem(KEY_INSPECTIONS);
  }
}

export async function getDashboardStats() {
  const all = await getInspections();
  const totalInspections = all.length;
  const totalViolations = all.reduce((sum, r) => sum + (r.violations || []).length, 0);
  const compliantCount = all.filter((r) => (r.score ?? 0) >= 96).length;
  const compliancePct = totalInspections
    ? Math.round((compliantCount / totalInspections) * 100)
    : 0;

  const byBrand = {};
  const byCategory = {};
  const bySeverity = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  const trend = {};

  all.forEach((r) => {
    const brand = r.product?.brand || 'Unknown';
    byBrand[brand] = (byBrand[brand] || 0) + (r.violations || []).length;

    const cat = r.product?.category || 'Uncategorised';
    byCategory[cat] = (byCategory[cat] || 0) + (r.violations || []).length;

    (r.violations || []).forEach((v) => {
      bySeverity[v.severity] = (bySeverity[v.severity] || 0) + 1;
    });

    const day = (r.createdAt || '').slice(0, 10);
    if (day) trend[day] = (trend[day] || 0) + 1;
  });

  return {
    totalInspections,
    totalViolations,
    compliancePct,
    byBrand,
    byCategory,
    bySeverity,
    trend,
  };
}
