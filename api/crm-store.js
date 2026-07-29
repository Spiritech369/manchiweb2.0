'use strict';

function configured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function endpoint() {
  return String(process.env.SUPABASE_URL || '').replace(/\/+$/, '') + '/rest/v1/rpc/kdl_create_quote';
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
    headers: {
      'Content-Type': 'application/json',
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
    },
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

module.exports = {
  configured,
  persistQuote
};
