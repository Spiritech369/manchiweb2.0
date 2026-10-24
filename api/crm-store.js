'use strict';

function configured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function baseUrl() {
  return String(process.env.SUPABASE_URL || '').replace(/\/+$/, '');
}

function rpcEndpoint(name) {
  return baseUrl() + '/rest/v1/rpc/' + name;
}

function endpoint() {
  return rpcEndpoint('kdl_create_quote');
}

function serviceHeaders(extra = {}) {
  return Object.assign({
    apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
  }, extra);
}

async function persistQuote(lead) {
  if (!configured()) {
    return {
      skipped: true,
      durable: false,
      reason: 'persistence_not_configured'
    };
  }

  const response = await fetch(endpoint(), {
    method: 'POST',
    headers: serviceHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ p: lead })
  });

  let body = null;
  try {
    body = await response.json();
  } catch (error) {
    body = null;
  }

  if (!response.ok) {
    return {
      ok: false,
      durable: false,
      status: response.status,
      error: 'persistence_failed'
    };
  }

  const result = Array.isArray(body) ? body[0] : body;
  if (!result || !result.quote_id || !result.public_folio) {
    return {
      ok: false,
      durable: false,
      status: response.status,
      error: 'invalid_persistence_response'
    };
  }

  return {
    ok: true,
    durable: true,
    duplicate: Boolean(result.duplicate),
    quote_id: result.quote_id,
    contact_id: result.contact_id,
    public_folio: result.public_folio,
    quote_status: result.quote_status || 'requested',
    created_at: result.created_at || lead.created_at
  };
}

// PostgREST answers a SQL null as `null`; tolerate an empty body as well.
async function readJsonBody(response) {
  if (typeof response.text === 'function') {
    const text = await response.text();
    return String(text || '').trim() ? JSON.parse(text) : null;
  }
  return response.json();
}

async function lookupQuote(folio, last4) {
  if (!configured()) {
    return { ok: false, skipped: true, error: 'lookup_not_configured' };
  }

  const response = await fetch(rpcEndpoint('kdl_lookup_quote'), {
    method: 'POST',
    headers: serviceHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ p_folio: folio, p_phone_last4: last4 })
  });

  if (!response.ok) {
    return { ok: false, status: response.status, error: 'lookup_failed' };
  }

  let body;
  try {
    body = await readJsonBody(response);
  } catch (error) {
    return { ok: false, status: response.status, error: 'lookup_failed' };
  }

  const result = Array.isArray(body) ? (body.length ? body[0] : null) : body;
  if (result == null) return { ok: true, found: false };
  if (typeof result !== 'object' || !result.public_folio) {
    return { ok: false, status: response.status, error: 'lookup_failed' };
  }
  return { ok: true, found: true, quote: result };
}

module.exports = {
  configured,
  baseUrl,
  serviceHeaders,
  persistQuote,
  lookupQuote
};
