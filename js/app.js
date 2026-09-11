/**
 * app.js
 * Boots the shared shell chrome on every page: mobile nav toggle and
 * active-link highlighting. Feature-specific logic lives in
 * js/features/**, this file only wires up structure common to all pages.
 */

export function ensureSession() {
  if (location.pathname.endsWith('/login.html') || location.pathname.endsWith('login.html')) {
    return;
  }

  const token = localStorage.getItem('parakh-auth-token');
  if (!token) {
    window.location.href = 'login.html';
  }
}

export function initShell() {
  const toggle = document.querySelector('[data-nav-toggle]');
  const nav = document.querySelector('.sidenav');
  const overlay = document.querySelector('.nav-overlay');

  const closeNav = () => { nav?.classList.remove('open'); overlay?.classList.remove('open'); };
  const openNav = () => { nav?.classList.add('open'); overlay?.classList.add('open'); };

  toggle?.addEventListener('click', () => {
    nav?.classList.contains('open') ? closeNav() : openNav();
  });
  overlay?.addEventListener('click', closeNav);

  const current = document.body.dataset.page;
  document.querySelectorAll('.nav-link').forEach((link) => {
    if (link.dataset.page === current) link.classList.add('active');
    link.addEventListener('click', closeNav);
  });
}

export function showToast(message, tone = 'pass') {
  const el = document.createElement('div');
  el.className = 'toast';
  el.style.borderLeftColor = tone === 'critical' ? 'var(--critical)' : 'var(--pass)';
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

document.addEventListener('DOMContentLoaded', () => {
  ensureSession();
  initShell();
});
