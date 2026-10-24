'use strict';

const crmStore = require('./crm-store');

const FOLIO_PATTERN = /^KDL-\d{8}-[A-Z0-9]{4}$/;
const LAST4_PATTERN = /^\d{4}$/;

const STATUS_LABELS = {
  requested: 'Recibida',
  in_review: 'En revisión',
  quoted: 'Cotizada',
  won: 'Pedido confirmado',
  lost: 'Cerrada'
};

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', process.env.LEAD_ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.end(JSON.stringify(body));
}

function first(value) {
  return Array.isArray(value) ? value[0] : value;
}

function readQuery(req) {
  if (req.query && typeof req.query === 'object') {
    return { folio: first(req.query.folio), tel: first(req.query.tel) };
  }
  try {
    const params = new URL(req.url || '/', 'http://localhost').searchParams;
    return { folio: params.get('folio'), tel: params.get('tel') };
  } catch (error) {
    return {};
  }
}

function statusLabel(status) {
  return Object.prototype.hasOwnProperty.call(STATUS_LABELS, status) ? STATUS_LABELS[status] : 'En proceso';
}

function publicItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const quantity = item.quantity == null || item.quantity === '' ? null : Number(item.quantity);
      return {
        name: item.name == null ? '' : String(item.name),
        quantity: Number.isFinite(quantity) ? quantity : null
      };
    });
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  if (req.method !== 'GET') return json(res, 405, { ok: false, error: 'method_not_allowed' });

  const query = readQuery(req);
  const folio = String(query.folio == null ? '' : query.folio).trim().toUpperCase();
  const last4 = String(query.tel == null ? '' : query.tel).trim();
  if (!FOLIO_PATTERN.test(folio) || !LAST4_PATTERN.test(last4)) {
    return json(res, 400, { ok: false, error: 'invalid_request' });
  }

  if (!crmStore.configured()) {
    return json(res, 503, { ok: false, error: 'lookup_not_configured' });
  }

  let result;
  try {
    result = await crmStore.lookupQuote(folio, last4);
  } catch (error) {
    result = { ok: false, error: 'lookup_failed' };
  }

  if (!result || result.ok === false) {
    if (result && result.skipped) return json(res, 503, { ok: false, error: 'lookup_not_configured' });
    return json(res, 502, { ok: false, error: 'lookup_failed' });
  }

  // Unknown folio and wrong phone digits are indistinguishable on purpose.
  if (!result.found || result.quote.public_folio !== folio) {
    return json(res, 404, { ok: false, error: 'not_found' });
  }

  const quote = result.quote;
  const status = quote.quote_status == null ? '' : String(quote.quote_status);
  return json(res, 200, {
    ok: true,
    folio: quote.public_folio,
    status,
    status_label: statusLabel(status),
    created_at: quote.created_at || null,
    updated_at: quote.updated_at || null,
    items: publicItems(quote.items)
  });
};

module.exports.statusLabel = statusLabel;
