'use strict';

const crypto = require('node:crypto');
const crmStore = require('./crm-store');

// Vercel limits request bodies to ~4.5 MB; 3 MB decoded is ~4 MB of base64
// plus JSON overhead. The front end compresses photos before uploading.
const MAX_BYTES = 3 * 1024 * 1024;
const MAX_BASE64_LENGTH = Math.ceil(MAX_BYTES / 3) * 4;
const SIGNED_URL_SECONDS = 30 * 24 * 60 * 60;

const TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif'
};

// The browser re-encodes photos (e.g. a .heic or .png becomes image/jpeg) but
// keeps the original name, so the name only has to look like an image.
const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'jpe', 'jfif', 'png', 'webp', 'heic', 'heif']);

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', process.env.LEAD_ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.end(JSON.stringify(body));
}

function parseBody(input) {
  if (input == null || input === '') return {};
  if (Buffer.isBuffer(input)) return JSON.parse(input.toString('utf8') || '{}');
  if (typeof input === 'string') return JSON.parse(input);
  if (typeof input === 'object' && !Array.isArray(input)) return input;
  throw new Error('invalid_body');
}

function extensionOf(fileName) {
  const name = String(fileName == null ? '' : fileName).trim().split(/[\\/]/).pop();
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
}

function stripDataPrefix(data) {
  return String(data == null ? '' : data).replace(/^data:[^,]*,/i, '').replace(/\s+/g, '');
}

function matchesSignature(buffer, contentType) {
  const ascii = (start, end) => buffer.subarray(start, end).toString('latin1');
  switch (contentType) {
    case 'image/jpeg':
      return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    case 'image/png':
      return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case 'image/webp':
      return buffer.length >= 12 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP';
    case 'image/heic':
    case 'image/heif':
      return buffer.length >= 12 && ascii(4, 8) === 'ftyp';
    default:
      return false;
  }
}

function storagePath(contentType, now = new Date()) {
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${year}/${month}/${crypto.randomUUID()}.${TYPES[contentType]}`;
}

async function readJson(response) {
  try {
    return await response.json();
  } catch (error) {
    return null;
  }
}

async function storeFile(buffer, contentType) {
  const base = crmStore.baseUrl();
  const bucket = encodeURIComponent(process.env.KDL_UPLOAD_BUCKET || 'kdl-uploads');
  const path = storagePath(contentType);

  const upload = await fetch(`${base}/storage/v1/object/${bucket}/${path}`, {
    method: 'POST',
    headers: crmStore.serviceHeaders({ 'Content-Type': contentType, 'x-upsert': 'false' }),
    body: buffer
  });
  if (!upload.ok) return { ok: false };

  const expiresAt = new Date(Date.now() + SIGNED_URL_SECONDS * 1000).toISOString();
  const sign = await fetch(`${base}/storage/v1/object/sign/${bucket}/${path}`, {
    method: 'POST',
    headers: crmStore.serviceHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ expiresIn: SIGNED_URL_SECONDS })
  });
  if (!sign.ok) return { ok: false };

  const signed = await readJson(sign);
  const signedURL = signed && (signed.signedURL || signed.signedUrl);
  if (typeof signedURL !== 'string' || !signedURL.startsWith('/')) return { ok: false };

  return { ok: true, url: `${base}/storage/v1${signedURL}`, path, expires_at: expiresAt };
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method_not_allowed' });

  let body;
  try {
    body = parseBody(req.body);
  } catch (error) {
    return json(res, 400, { ok: false, error: 'invalid_json' });
  }

  const contentType = String(body.contentType == null ? '' : body.contentType).trim().toLowerCase();
  if (!Object.prototype.hasOwnProperty.call(TYPES, contentType)) {
    return json(res, 415, { ok: false, error: 'unsupported_type' });
  }
  const extension = extensionOf(body.fileName);
  if (extension && !IMAGE_EXTENSIONS.has(extension)) {
    return json(res, 415, { ok: false, error: 'unsupported_type' });
  }

  const data = stripDataPrefix(body.data);
  if (!data) return json(res, 400, { ok: false, error: 'empty_file' });
  if (data.length > MAX_BASE64_LENGTH + 4) return json(res, 413, { ok: false, error: 'file_too_large' });
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(data)) return json(res, 400, { ok: false, error: 'invalid_data' });

  const buffer = Buffer.from(data, 'base64');
  if (!buffer.length) return json(res, 400, { ok: false, error: 'empty_file' });
  if (buffer.length > MAX_BYTES) return json(res, 413, { ok: false, error: 'file_too_large' });
  if (!matchesSignature(buffer, contentType)) {
    return json(res, 415, { ok: false, error: 'unsupported_type' });
  }

  if (!crmStore.configured()) {
    return json(res, 503, { ok: false, error: 'upload_not_configured' });
  }

  let result;
  try {
    result = await storeFile(buffer, contentType);
  } catch (error) {
    result = { ok: false };
  }
  if (!result.ok) return json(res, 502, { ok: false, error: 'upload_failed' });

  return json(res, 200, { ok: true, url: result.url, path: result.path, expires_at: result.expires_at });
};

module.exports.MAX_BYTES = MAX_BYTES;
