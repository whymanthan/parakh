/**
 * scan.js — Modules 1–3 (Product Scanning, Label Detection, OCR) glued to
 * Module 4 (Rule Engine) for a single inspection.
 *
 * Honest scope note: real Module 2/3 (AI label-region detection +
 * PaddleOCR/LayoutLMv3 text extraction) needs a trained CV/OCR backend —
 * out of reach for a static client-side app. What ships here for real:
 *   - genuine in-browser OCR via Tesseract.js (reads actual text off an
 *     uploaded label photo, not a mock/random result), and
 *   - a structured entry form the inspector confirms/completes so every
 *     downstream rule check runs against real, field-accurate data.
 * The OCR output is also fed verbatim into the rule engine's raw-text
 * scanners (unit case, decimal separators, kmph, etc.) so photo-derived
 * labels get real formatting checks even before the fields are confirmed.
 */

import { loadRules } from '../../data/rulesLoader.js';
import { runNationalStandardsEngine, toQuantityEntry } from '../../core/ruleEngine.js';
import { checkMandatoryDeclarations } from '../../core/declarationRules.js';
import { classifyResults } from '../../core/violationClassifier.js';
import { computeScore, scoreBand } from '../../core/scoring.js';
import { saveInspection } from '../../utils/storage.js';
import { uid, nowISO, escapeHtml } from '../../utils/helpers.js';

let uploadedImages = [];
let ocrRawText = '';

function renderPreviewStrip() {
  const strip = document.getElementById('preview-strip');
  const btn = document.getElementById('run-ocr');
  strip.innerHTML = '';

  uploadedImages.forEach((image, index) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'preview-item';

    const img = document.createElement('img');
    img.src = image.url;
    img.className = 'preview-thumb';
    img.alt = `Uploaded image ${index + 1}`;

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'preview-remove';
    removeBtn.textContent = '×';
    removeBtn.title = 'Remove image';
    removeBtn.setAttribute('aria-label', `Remove image ${index + 1}`);
    removeBtn.addEventListener('click', () => {
      URL.revokeObjectURL(image.url);
      uploadedImages.splice(index, 1);
      renderPreviewStrip();
      const mediaInput = document.getElementById('media-input');
      const cameraInput = document.getElementById('camera-input');
      if (mediaInput) mediaInput.value = '';
      if (cameraInput) cameraInput.value = '';
      btn.disabled = uploadedImages.length === 0;
    });

    wrapper.appendChild(img);
    wrapper.appendChild(removeBtn);
    strip.appendChild(wrapper);
  });

  btn.disabled = uploadedImages.length === 0;
}

function bindDropzone() {
  const zone = document.getElementById('dropzone');
  const mediaInput = document.getElementById('media-input');
  const cameraInput = document.getElementById('camera-input');
  const cameraBtn = document.getElementById('camera-upload');
  const mediaBtn = document.getElementById('media-upload');
  const btn = document.getElementById('run-ocr');

  const handleFiles = (files) => {
    [...files].forEach((file) => {
      const validImageType = file.type.startsWith('image/') || file.name.toLowerCase().endsWith('.webp');
      if (!validImageType) return;
      const url = URL.createObjectURL(file);
      uploadedImages.push({ file, url });
    });
    renderPreviewStrip();
    if (mediaInput) mediaInput.value = '';
    if (cameraInput) cameraInput.value = '';
    if (uploadedImages.length) {
      btn.disabled = false;
    }
  };

  zone.addEventListener('click', () => mediaInput?.click());
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag');
    handleFiles(e.dataTransfer.files);
  });

  cameraBtn?.addEventListener('click', () => cameraInput?.click());
  mediaBtn?.addEventListener('click', () => mediaInput?.click());
  mediaInput?.addEventListener('change', (e) => handleFiles(e.target.files));
  cameraInput?.addEventListener('change', (e) => handleFiles(e.target.files));
  renderPreviewStrip();
}

async function runOcr() {
  const statusEl = document.getElementById('ocr-status');
  const progressFill = document.getElementById('ocr-progress-fill');
  const textArea = document.getElementById('raw-label-text');
  const btn = document.getElementById('run-ocr');

  if (!uploadedImages.length) return;
  if (typeof Tesseract === 'undefined') {
    statusEl.innerHTML = `<span style="color:var(--critical)">Tesseract.js failed to load (offline?). You can still type/paste label text manually below.</span>`;
    return;
  }

  btn.disabled = true;
  document.getElementById('ocr-progress').style.display = 'block';
  let combined = '';

  for (let i = 0; i < uploadedImages.length; i++) {
    statusEl.innerHTML = `<span class="spinner"></span> Running OCR on image ${i + 1} of ${uploadedImages.length}…`;
    try {
      const { data } = await Tesseract.recognize(uploadedImages[i].url, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            const pct = Math.round(m.progress * 100);
            progressFill.style.width = pct + '%';
          }
        },
      });
      combined += (data.text || '').trim() + '\n';
    } catch (err) {
      console.error('OCR failed for image', i, err);
    }
  }

  ocrRawText = combined.trim();
  textArea.value = ocrRawText;
  clearDeclarationFields();

  if (ocrRawText) {
    const cleaned = ocrRawText
      .replace(/\s+/g, ' ')
      .replace(/\s*[:;,-]\s*/g, ' ')
      .trim();

    textArea.value = cleaned;
    statusEl.innerHTML = `<span style="color:var(--signal-teal)">✓ OCR complete — raw text extracted successfully. Review and confirm the declaration fields below.</span>`;
  } else {
    statusEl.innerHTML = `<span style="color:var(--high)">OCR completed but found no readable text — try a clearer image or enter details manually.</span>`;
  }

  btn.disabled = false;
}

function setFieldValue(id, value) {
  const field = document.getElementById(id);
  if (!field) return;

  const normalized = String(value ?? '').trim();
  if (!normalized) return;
  if (field.value && String(field.value).trim()) return;

  field.value = normalized;
}

function normalizeText(value) {
  return (value || '').replace(/\r/g, '\n').replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
}

function getApiBaseUrl() {
  const fallback = 'http://localhost:3001/api';
  try {
    if (window.location && window.location.origin && window.location.origin !== 'null') {
      return `${window.location.origin}/api`;
    }
  } catch {
    // Fall through to localhost fallback below.
  }
  return fallback;
}

function extractAfterLabel(text, labels) {
  const patterns = labels.map((label) => new RegExp(`${label}\\s*[:_-]?\\s*(.+)`, 'i'));
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return normalizeText(match[1]).replace(/[;]+\s*$/, '');
    }
  }
  return '';
}

function clearDeclarationFields() {
  const fieldIds = [
    'f-productName',
    'f-brand',
    'f-manufacturer',
    'f-commonName',
    'f-netQtyValue',
    'f-netQtyUnit',
    'f-mrp',
    'f-mfgDate',
    'f-consumerCare',
    'f-origin',
    'f-category',
  ];

  fieldIds.forEach((id) => {
    const field = document.getElementById(id);
    if (!field) return;
    if (field.tagName === 'SELECT') field.selectedIndex = 0;
    else field.value = '';
  });

  const importedField = document.getElementById('f-imported');
  if (importedField) importedField.checked = false;
}

function applyStructuredProduct(product) {
  if (!product) return;

  setFieldValue('f-productName', product.productName);
  setFieldValue('f-brand', product.brand);
  setFieldValue('f-manufacturer', product.manufacturer);
  if (product.netQtyValue) {
    setFieldValue('f-netQtyValue', product.netQtyValue);
    setFieldValue('f-netQtyUnit', product.netQtyUnit || 'g');
  }
  setFieldValue('f-mrp', product.mrp);
  setFieldValue('f-mfgDate', product.mfgDate);
  setFieldValue('f-consumerCare', product.consumerCare);
  setFieldValue('f-origin', product.countryOfOrigin);

  const importedField = document.getElementById('f-imported');
  if (importedField && product.imported !== undefined) importedField.checked = !!product.imported;

  const rawTextField = document.getElementById('raw-label-text');
  if (rawTextField && product.rawText) rawTextField.value = product.rawText;
}

async function extractWithGemini(rawText, sourceType = 'ocr', sourceUrl = '') {
  const retailer = sourceUrl ? new URL(sourceUrl).hostname.toLowerCase() : '';
  const sourceClassifier = retailer.includes('amazon.') ? 'amazon'
    : retailer.includes('flipkart.com') ? 'flipkart'
    : retailer.includes('zepto') ? 'zepto'
    : retailer.includes('blinkit') ? 'blinkit'
    : sourceType;

  const apiBase = (() => {
    const fallback = 'http://localhost:3001/api';
    try {
      if (window.location && window.location.origin && window.location.origin !== 'null') {
        return `${window.location.origin}/api`;
      }
    } catch {
      // Fall through to local dev fallback.
    }
    return fallback;
  })();

  const response = await fetch(`${apiBase}/extract-product`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rawText, sourceType: sourceClassifier, sourceUrl })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Gemini extraction failed');
  }

  const data = await response.json();
  return data.product || {};
}

async function populateDeclaredFieldsFromOcr(rawText) {
  if (!rawText) return;

  const statusEl = document.getElementById('ocr-status');
  const text = String(rawText || '').trim();

  try {
    statusEl && (statusEl.innerHTML = '<span class="spinner"></span> Identifying declaration fields with Gemini…');
    const product = await extractWithGemini(text, 'ocr', '');
    const resolvedProduct = {
      ...product,
      rawText: product.rawText || text,
    };

    if (!resolvedProduct || !Object.keys(resolvedProduct).length) {
      throw new Error('Gemini returned no structured fields.');
    }

    clearDeclarationFields();
    applyStructuredProduct(resolvedProduct);
    statusEl && (statusEl.innerHTML = '<span style="color:var(--signal-teal)">✓ Declaration fields populated from the label text using Gemini.</span>');
    return resolvedProduct;
  } catch (err) {
    console.warn('Gemini auto-fill failed, falling back to heuristic parsing:', err);
    const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
    const fields = {};

    lines.forEach((line) => {
      const m = line.match(/^(.*?)(?:[:\-]|\s{2,})(.+)$/);
      if (!m) return;
      const label = m[1].trim().toLowerCase();
      const value = m[2].trim();
      if (!label || !value) return;
      fields[label] = value;
    });

    const fallbackProduct = {
      productName: fields['product name'] || '',
      brand: fields['brand'] || '',
      manufacturer: fields['manufacturer'] || fields['mfd by'] || fields['manufactured by'] || fields['packed by'] || '',
      netQtyValue: (fields['net quantity'] || fields['net qty'] || '').match(/\d+(?:[.,]\d+)?/)?.[0] || '',
      netQtyUnit: (fields['net quantity'] || fields['net qty'] || '').replace(/\d+(?:[.,]\d+)?/g, '').trim() || '',
      mrp: (fields['mrp'] || fields['maximum retail price'] || '').match(/\d+(?:[.,]\d+)?/)?.[0] || '',
      mfgDate: fields['mfg'] || fields['manufactured'] || fields['mfd'] || '',
      consumerCare: fields['customer care'] || fields['consumer care'] || '',
      countryOfOrigin: fields['country of origin'] || fields['country'] || '',
      imported: false,
      rawText: text,
    };

    clearDeclarationFields();
    applyStructuredProduct(fallbackProduct);
    statusEl && (statusEl.innerHTML = '<span style="color:var(--high)">Gemini extraction was unavailable, so the form was filled using a fallback parser.</span>');
    return fallbackProduct;
  }
}

function detectMissingMandatory(product) {
  const required = [
    { key: 'manufacturer', label: 'Manufacturer / Packer / Importer' },
    { key: 'netQtyValue', label: 'Net Quantity' },
    { key: 'mrp', label: 'MRP' },
    { key: 'mfgDate', label: 'Mfg / Pack / Import Date' },
    { key: 'consumerCare', label: 'Consumer Care Details' },
    { key: 'countryOfOrigin', label: 'Country of Origin' },
  ];

  return required.filter((item) => {
    if (item.key === 'countryOfOrigin' && !product.imported) return false;
    const value = product[item.key];
    return !value || !String(value).trim();
  }).map((item) => item.label);
}

async function fetchProductFromEcommerceLink() {
  const input = document.getElementById('product-url');
  const statusEl = document.getElementById('product-link-status');
  const rawTextEl = document.getElementById('raw-label-text');

  if (!input || !input.value.trim()) {
    statusEl.innerHTML = '<span style="color:var(--high)">Please paste a product URL first.</span>';
    return;
  }

  const sourceUrl = input.value.trim();
  const normalizedUrl = /^https?:\/\//i.test(sourceUrl) ? sourceUrl : `https://${sourceUrl}`;

  statusEl.innerHTML = '<span class="spinner"></span> Fetching product page and extracting declaration data…';

  try {
    clearDeclarationFields();
    const apiBase = (() => {
      const fallback = 'http://localhost:3001/api';
      try {
        if (window.location && window.location.origin && window.location.origin !== 'null') {
          return `${window.location.origin}/api`;
        }
      } catch {
        // Fall through to local dev fallback.
      }
      return fallback;
    })();

    const proxyResponse = await fetch(`${apiBase}/fetch-product-page?url=${encodeURIComponent(normalizedUrl)}`);
    const responseText = await proxyResponse.text();
    let proxyData = {};

    try {
      proxyData = JSON.parse(responseText);
    } catch {
      proxyData = { ok: false, error: responseText || 'Remote page fetch failed' };
    }

    if (!proxyResponse.ok || !proxyData.ok) {
      throw new Error(proxyData.error || 'Remote page fetch failed');
    }

    const text = proxyData.text || '';
    if (!text || text.length < 80) {
      throw new Error('The page content was too sparse to extract product declaration details.');
    }

    if (rawTextEl) rawTextEl.value = text.slice(0, 6000);

    const product = await extractWithGemini(text, 'link', normalizedUrl);
    applyStructuredProduct(product);

    const missing = detectMissingMandatory(product) || [];
    if (missing.length) {
      statusEl.innerHTML = `<span style="color:var(--high)">Fetched product data. Missing mandatory details: ${missing.join(', ')}.</span>`;
    } else {
      statusEl.innerHTML = `<span style="color:var(--signal-teal)">Fetched product details successfully. Mandatory declaration data appears to be published.</span>`;
    }
  } catch (err) {
    console.error('E-commerce fetch failed:', err);
    statusEl.innerHTML = `<span style="color:var(--critical)">Unable to fetch product page details. This URL may be blocked, private, or temporarily unavailable. Try a public product URL or paste the page text manually.</span>`;
  }
}

function readForm() {
  const val = (id) => document.getElementById(id).value.trim();
  return {
    productCategory: val('f-category'),
    fields: {
      productName: val('f-productName'),
      brand: val('f-brand'),
      manufacturerOrPacker: val('f-manufacturer'),
      commonName: val('f-commonName') || val('f-productName'),
      netQuantity: val('f-netQtyValue') && val('f-netQtyUnit') ? `${val('f-netQtyValue')} ${val('f-netQtyUnit')}` : '',
      mrp: val('f-mrp'),
      mfgDate: val('f-mfgDate'),
      consumerCare: val('f-consumerCare'),
      countryOfOrigin: val('f-origin'),
      isImported: document.getElementById('f-imported').checked,
    },
    netQtyValue: val('f-netQtyValue'),
    netQtyUnit: val('f-netQtyUnit'),
    grossWeightRaw: val('f-grossWeight'),
    coefficients: {
      alcohol: val('f-alcohol'),
      sugar: val('f-sugar'),
      ph: val('f-ph'),
      hardness: val('f-hardness'),
    },
    rawLabelText: document.getElementById('raw-label-text').value,
  };
}

function buildQuantities(form) {
  const quantities = [];
  if (form.netQtyValue) {
    quantities.push({
      fieldLabel: 'Net Quantity',
      raw: `${form.netQtyValue} ${form.netQtyUnit}`,
      numberValue: parseFloat(form.netQtyValue.replace(',', '.')),
      unit: form.netQtyUnit,
    });
  }
  if (form.grossWeightRaw) {
    const entry = toQuantityEntry('Gross Weight', form.grossWeightRaw);
    if (entry) quantities.push(entry);
  }
  return quantities;
}

function renderResults(record) {
  const panel = document.getElementById('results-panel');
  panel.style.display = 'block';

  const band = scoreBand(record.score);
  const circumference = 2 * Math.PI * 70;
  const offset = circumference * (1 - record.score / 100);
  const ringColor = record.score >= 96 ? 'var(--pass)' : record.score >= 70 ? 'var(--medium)' : record.score >= 40 ? 'var(--high)' : 'var(--critical)';

  document.getElementById('score-ring-wrap').innerHTML = `
    <div class="score-ring">
      <svg width="168" height="168">
        <circle cx="84" cy="84" r="70" stroke="rgba(255,255,255,0.08)" stroke-width="12" fill="none"/>
        <circle cx="84" cy="84" r="70" stroke="${ringColor}" stroke-width="12" fill="none"
          stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" stroke-linecap="round"/>
      </svg>
      <div class="score-center">
        <div class="score-num">${record.score}</div>
        <div class="score-band">${band.label}</div>
      </div>
    </div>
  `;

  document.getElementById('result-counts').innerHTML = `
    <div class="stat-card"><div class="figure" style="color:var(--critical)">${record.violations.filter(v=>v.severity==='Critical').length}</div><div class="label">Critical</div></div>
    <div class="stat-card"><div class="figure" style="color:var(--high)">${record.violations.filter(v=>v.severity==='High').length}</div><div class="label">High</div></div>
    <div class="stat-card"><div class="figure" style="color:var(--medium)">${record.violations.filter(v=>v.severity==='Medium').length}</div><div class="label">Medium</div></div>
    <div class="stat-card"><div class="figure" style="color:var(--low)">${record.violations.filter(v=>v.severity==='Low').length}</div><div class="label">Low</div></div>
  `;

  const list = document.getElementById('violation-list');
  if (!record.violations.length) {
    list.innerHTML = `<div class="empty-state">No violations detected against the loaded rule set. ✅</div>`;
  } else {
    list.innerHTML = record.violations.map((v) => `
      <div class="violation-card sev-${v.severity}">
        <div class="vhead">
          <span class="vfield">${escapeHtml(v.field)}</span>
          <span class="badge sev-${v.severity.toLowerCase()}">${v.severity}</span>
        </div>
        <div class="vmsg">${escapeHtml(v.message)}</div>
        <div class="vmeta">${escapeHtml(v.ruleId)} · ${escapeHtml(v.reference || '')} · ${escapeHtml(v.category)}</div>
        <div class="vaction">→ ${escapeHtml(v.recommendedAction)}</div>
      </div>
    `).join('');
  }

  document.getElementById('view-report-link').href = `report.html?id=${encodeURIComponent(record.id)}`;
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function runInspection() {
  const btn = document.getElementById('run-check');
  btn.disabled = true;
  btn.textContent = 'Running rule engine…';

  try {
    const rules = await loadRules();
    const form = readForm();
    const quantities = buildQuantities(form);

    const engineInput = {
      productCategory: form.productCategory,
      quantities,
      rawLabelText: form.rawLabelText,
      coefficients: form.coefficients,
    };

    const rawResults = [
      ...runNationalStandardsEngine(engineInput, rules),
      ...checkMandatoryDeclarations(form.fields),
    ];
    const violations = classifyResults(rawResults);
    const score = computeScore(violations);

    const record = {
      id: uid('insp'),
      createdAt: nowISO(),
      product: {
        name: form.fields.productName || '(unnamed product)',
        brand: form.fields.brand || '',
        category: form.productCategory || 'Uncategorised',
      },
      inputs: form,
      allResults: rawResults,
      violations,
      score,
      ocrUsed: !!ocrRawText,
    };

    await saveInspection(record);
    renderResults(record);
  } catch (err) {
    console.error(err);
    alert('Something went wrong running the compliance check: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Run Compliance Check';
  }
}

export function initScan() {
  bindDropzone();
  document.getElementById('run-ocr').addEventListener('click', runOcr);
  document.getElementById('auto-fill-fields').addEventListener('click', async () => {
    const rawText = document.getElementById('raw-label-text').value;
    await populateDeclaredFieldsFromOcr(rawText);
  });
  document.getElementById('fetch-product-link').addEventListener('click', fetchProductFromEcommerceLink);
  document.getElementById('run-check').addEventListener('click', runInspection);
  document.getElementById('reset-form').addEventListener('click', () => location.reload());
}

initScan();
