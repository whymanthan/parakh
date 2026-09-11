require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { createAuthStore, registerUser, loginUser, authMiddleware, authMiddlewareOptional, requireRole } = require('./auth');

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_DIR = path.join(__dirname, 'data');
const INSPECTIONS_FILE = path.join(DATA_DIR, 'inspections.json');
const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
const AUTH_STORE = createAuthStore([
  {
    id: 'admin-seed',
    name: 'System Admin',
    email: 'admin@parakh.local',
    passwordHash: bcrypt.hashSync(DEFAULT_ADMIN_PASSWORD, 10),
    role: 'admin',
  },
]);

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(INSPECTIONS_FILE)) {
    fs.writeFileSync(INSPECTIONS_FILE, JSON.stringify([], null, 2));
  }
}

function readInspections() {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(INSPECTIONS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : [];
    return list.filter((item) => {
      const sourceText = JSON.stringify(item || {}).toLowerCase();
      return !/(demo|sample|test|dummy|artificial|placeholder)/.test(sourceText);
    });
  } catch (err) {
    console.error('Unable to read inspections store:', err);
    return [];
  }
}

function writeInspections(list) {
  ensureDataFile();
  const cleaned = Array.isArray(list) ? list.filter((item) => {
    const sourceText = JSON.stringify(item || {}).toLowerCase();
    return !/(demo|sample|test|dummy|artificial|placeholder)/.test(sourceText);
  }) : [];
  fs.writeFileSync(INSPECTIONS_FILE, JSON.stringify(cleaned, null, 2));
  return cleaned;
}

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

app.get('/', (req, res) => {
  res.redirect('/login.html');
});

app.get('/login', (req, res) => {
  res.redirect('/login.html');
});

app.use(express.static(__dirname));

function normalizeSourceUrl(sourceUrl) {
  if (!sourceUrl) return '';
  try {
    return new URL(sourceUrl).toString();
  } catch {
    return sourceUrl;
  }
}

function detectRetailer(sourceUrl = '') {
  const url = normalizeSourceUrl(sourceUrl);
  if (!url) return 'generic';
  const host = new URL(url).hostname.toLowerCase();
  if (host.includes('amazon.')) return 'amazon';
  if (host.includes('flipkart.com')) return 'flipkart';
  if (host.includes('zepto.')) return 'zepto';
  if (host.includes('blinkit.com')) return 'blinkit';
  return 'generic';
}

function getRetailerPromptHints(sourceUrl) {
  const retailer = detectRetailer(sourceUrl);
  const hintMap = {
    amazon: `
Retailer-specific guidance for Amazon:
- Prefer values from labels like: Brand, Manufacturer, Item Weight, Item Dimensions, Country of Origin, MRP, Customer care, Sold by.
- Amazon detail pages often mix shipping metadata with product metadata. Ignore non-product metadata and marketing copy.
- If 'Sold by' is available and is the seller, use it as manufacturer only if no explicit manufacturer is listed.
- For net quantity, look for 'Item Weight', 'Net Quantity', 'Unit Count', 'Quantity' near the product metadata section.
- For MRP, prefer the exact price near 'M.R.P.' or 'Price' and ignore cart/promo prices.
`,
    flipkart: `
Retailer-specific guidance for Flipkart:
- Prefer values from labels like: Brand, Seller, Highlights, Country of Origin, M.R.P., Net Quantity, Quantity, Marketed by, Manufactured by.
- Flipkart often splits information across 'Highlights', specs, and seller metadata. Prefer product-spec values over marketing paragraphs.
- If 'Seller' appears, use it as manufacturer only if no dedicated manufacturer is present.
- Net quantity may appear as 'Net Quantity', 'Item Weight', 'Qty', or 'Package Content'.
`,
    zepto: `
Retailer-specific guidance for Zepto:
- Look for values near labels like: Brand, Net Qty, MRP, Pack Size, Seller, Marketed by, Packed by, Country of origin, Customer care.
- Grocery pages often use short compact descriptions. Keep the most specific legal/metrology declaration, not the ad copy.
- Prefer package declaration content over product description copy.
`,
    blinkit: `
Retailer-specific guidance for Blinkit:
- Look for values near labels like: Brand, MRP, Quantity, Net Qty, Pack Size, Sold by, Marketed by, Manufacturer, Consumer care, Country of Origin.
- Blinkit pages frequently show short product summaries. Use the exact packaged declaration text nearest the spec section.
- Do not use generic claim text like 'fresh', 'healthy', or 'popular'.
`,
    generic: `
Generic retailer guidance:
- Prefer exact declaration labels over marketing prose.
- Use product metadata and packaging text over recommendation text or reviews.
- Extract the clearest seller/manufacturer, net quantity, MRP, and origin details available.
`
  };

  return hintMap[retailer] || hintMap.generic;
}

function decodeGeminiJson(candidate) {
  if (!candidate) return {};
  const cleaned = String(candidate)
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const partial = cleaned.slice(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(partial);
      } catch {
        return {};
      }
    }
    return {};
  }
}

async function fetchPageTextWithFallback(sourceUrl) {
  const normalizedUrl = /^https?:\/\//i.test(sourceUrl) ? sourceUrl : `https://${sourceUrl}`;
  const host = (() => {
    try {
      return new URL(normalizedUrl).hostname.toLowerCase();
    } catch {
      return '';
    }
  })();

  const candidates = [
    `https://r.jina.ai/http://${normalizedUrl.replace(/^https?:\/\//i, '')}`,
    `https://r.jina.ai/http://https://${host}/` + normalizedUrl.replace(/^https?:\/\/[^/]+/i, '').replace(/^\//, ''),
    normalizedUrl,
  ].filter(Boolean);

  let lastError = null;

  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });

      if (!response.ok) {
        lastError = new Error(`HTTP ${response.status} for ${candidate}`);
        continue;
      }

      const rawText = await response.text();
      const cleaned = String(rawText || '').replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (cleaned.length > 80) {
        return cleaned;
      }
    } catch (err) {
      lastError = err;
    }
  }

  if (lastError) {
    throw lastError;
  }
  throw new Error('No readable product page content was returned.');
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/health', (req, res) => {
  res.json({ ok: true, status: 'ready' });
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const user = await registerUser(AUTH_STORE, req.body || {});
    res.status(201).json({ ok: true, user });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || 'Registration failed.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const user = await loginUser(AUTH_STORE, email, password);
    res.json({ ok: true, user });
  } catch (err) {
    res.status(401).json({ ok: false, error: err.message || 'Authentication failed.' });
  }
});

app.get('/api/me', authMiddleware, (req, res) => {
  const user = AUTH_STORE.users.find((entry) => entry.id === req.user.sub);
  res.json({ ok: true, user: user ? { id: user.id, name: user.name, email: user.email, role: user.role } : null });
});

app.get('/api/inspections', authMiddlewareOptional, (req, res) => {
  res.json(readInspections());
});

app.get('/api/inspections/:id', authMiddlewareOptional, (req, res) => {
  const item = readInspections().find((record) => record.id === req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'Inspection not found.' });
  }
  res.json(item);
});

app.post('/api/inspections', authMiddlewareOptional, (req, res) => {
  try {
    const record = req.body;
    if (!record || !record.id) {
      return res.status(400).json({ error: 'Inspection payload must include an id.' });
    }
    const list = readInspections();
    const next = [record, ...list.filter((item) => item.id !== record.id)];
    writeInspections(next);
    res.status(201).json(record);
  } catch (err) {
    console.error('POST /api/inspections error:', err);
    res.status(500).json({ error: 'Unable to save inspection.' });
  }
});

app.delete('/api/inspections', authMiddlewareOptional, requireRole('admin'), (req, res) => {
  writeInspections([]);
  res.json({ ok: true, deleted: true });
});

app.get('/api/fetch-product-page', authMiddlewareOptional, async (req, res) => {
  try {
    const sourceUrl = req.query.url;
    if (!sourceUrl) {
      return res.status(400).json({ error: 'Missing url query parameter.' });
    }

    const normalizedUrl = /^https?:\/\//i.test(sourceUrl) ? sourceUrl : `https://${sourceUrl}`;
    const text = await fetchPageTextWithFallback(normalizedUrl);

    res.json({ ok: true, text, sourceUrl: normalizedUrl });
  } catch (err) {
    console.error('fetch-product-page error:', err);
    res.status(500).json({
      ok: false,
      error: 'Unable to fetch product page content.',
      message: err.message,
      sourceUrl: req.query.url || ''
    });
  }
});

app.post('/api/extract-product', authMiddlewareOptional, async (req, res) => {
  try {
    const { rawText, sourceUrl, sourceType } = req.body || {};
    const apiKey = process.env.GEMINI_API_KEY;
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const isOcrMode = String(sourceType || '').toLowerCase() === 'ocr';

    if (!apiKey) {
      return res.status(500).json({ error: 'Missing GEMINI_API_KEY in environment.' });
    }

    const retailer = detectRetailer(sourceUrl || '');
    const retailerHint = getRetailerPromptHints(sourceUrl || '');
    const payload = {
      contents: [{
        parts: [{
          text: `You are extracting structured declaration data from unstructured product text for legal metrology compliance review.

Return valid JSON only with this exact schema:
{
  "productName": "",
  "brand": "",
  "manufacturer": "",
  "netQtyValue": "",
  "netQtyUnit": "",
  "mrp": "",
  "mfgDate": "",
  "consumerCare": "",
  "countryOfOrigin": "",
  "imported": false,
  "rawText": ""
}

Critical rules:
- ${isOcrMode ? 'OCR MODE: Correct only OCR transcription errors. Use only the text visibly present in the raw OCR input. Do not use any website, ecommerce product page, or prior product knowledge. Do not infer or fill missing values from outside information.' : 'LINK MODE: Extract product declaration data from the provided product page text, using retailer hints only when relevant.'}
- If a field is not explicitly present in the source text, set it to an empty string "".
- Never guess, infer, or fabricate values.
- Never return commentary, markdown, or explanation outside the JSON object.
- Keep values concise, exact, and human-readable.
- For net quantity, return the numeric magnitude and unit separately, e.g. "500" and "g".
- For MRP, return only the numeric value if possible, e.g. "120" or "499".
- Ignore review snippets, ratings, social proof, and recommendation copy.
- The source host is: ${retailer}.
- Retailer-specific extraction cues: ${retailerHint}

Source type: ${sourceType || 'unknown'}
Source URL: ${sourceUrl || 'N/A'}

RAW TEXT:
${rawText || ''}`
        }]
      }],
      generationConfig: {
        responseMimeType: 'application/json'
      }
    };

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (!response.ok) {
      return res.status(500).json({ error: 'Gemini API request failed', details: result });
    }

    const candidate = result?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const parsed = decodeGeminiJson(candidate);

    const normalizeMissing = (value) => {
      const text = String(value ?? '').trim();
      if (!text || text.toLowerCase() === 'not provided' || text.toLowerCase() === 'n/a' || text.toLowerCase() === 'na') {
        return isOcrMode ? '' : 'Not provided';
      }
      return text;
    };

    res.json({
      ok: true,
      product: {
        productName: normalizeMissing(parsed.productName),
        brand: normalizeMissing(parsed.brand),
        manufacturer: normalizeMissing(parsed.manufacturer),
        netQtyValue: normalizeMissing(parsed.netQtyValue),
        netQtyUnit: normalizeMissing(parsed.netQtyUnit),
        mrp: normalizeMissing(parsed.mrp),
        mfgDate: normalizeMissing(parsed.mfgDate),
        consumerCare: normalizeMissing(parsed.consumerCare),
        countryOfOrigin: normalizeMissing(parsed.countryOfOrigin),
        imported: !!parsed.imported,
        rawText: rawText || '',
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during extraction', message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`PARAKH extraction API listening on http://localhost:${PORT}`);
});
