'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const handler = require('../api/lead');

const ENV_KEYS = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'KDL_REQUIRE_DURABLE_PERSISTENCE',
  'KDL_CRM_WEBHOOK_URL',
  'MAKE_WEBHOOK_URL',
  'ZAPIER_WEBHOOK_URL',
  'FORMSPREE_ENDPOINT',
  'HUBSPOT_PORTAL_ID',
  'HUBSPOT_FORM_ID',
  'RESEND_API_KEY'
];

const originalFetch = global.fetch;
const originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

function resetEnvironment() {
  for (const key of ENV_KEYS) {
    if (originalEnv[key] == null) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
  global.fetch = originalFetch;
}

function lead(overrides = {}) {
  return Object.assign({
    id: 'quote_test_0001',
    quote_id: 'quote_test_0001',
    contact_id: 'contact_test_0001',
    folio: 'KDL-20260728-T001',
    public_folio: 'KDL-20260728-T001',
    idempotency_key: 'idem_test_0001',
    createdAt: '2026-07-28T12:00:00.000Z',
    created_at: '2026-07-28T12:00:00.000Z',
    name: 'Prueba KDL',
    whatsapp: '8112345678',
    category: 'Sensores'
  }, overrides);
}

async function invoke(body, headers = {}) {
  const output = { status: 0, headers: {}, body: null };
  const req = { method: 'POST', body, headers };
  const res = {
    set statusCode(value) { output.status = value; },
    get statusCode() { return output.status; },
    setHeader(name, value) { output.headers[name] = value; },
    end(value) { output.body = JSON.parse(String(value)); }
  };
  await handler(req, res);
  return output;
}

test.afterEach(resetEnvironment);
test.after(resetEnvironment);

test('rechaza claves de idempotencia inconsistentes', async () => {
  const result = await invoke(lead(), { 'idempotency-key': 'idem_distinta_0001' });
  assert.equal(result.status, 409);
  assert.equal(result.body.error, 'idempotency_key_mismatch');
});

test('mantiene fallback de entrega sin afirmar persistencia durable', async () => {
  process.env.KDL_CRM_WEBHOOK_URL = 'https://crm.example.test/lead';
  global.fetch = async () => ({ ok: true, status: 202, json: async () => ({ ok: true }) });

  const result = await invoke(lead());

  assert.equal(result.status, 202);
  assert.equal(result.body.ok, true);
  assert.equal(result.body.delivered, true);
  assert.equal(result.body.durable, false);
  assert.equal(result.body.persistence.skipped, true);
});

test('bloquea la entrega cuando se exige persistencia y no está configurada', async () => {
  process.env.KDL_REQUIRE_DURABLE_PERSISTENCE = 'true';
  process.env.KDL_CRM_WEBHOOK_URL = 'https://crm.example.test/lead';
  let fetchCalls = 0;
  global.fetch = async () => {
    fetchCalls += 1;
    return { ok: true, status: 202, json: async () => ({ ok: true }) };
  };

  const result = await invoke(lead());

  assert.equal(result.status, 503);
  assert.equal(result.body.error, 'persistence_not_configured');
  assert.equal(fetchCalls, 0);
});

test('una cotización duplicada durable no vuelve a notificar canales', async () => {
  process.env.SUPABASE_URL = 'https://project.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test';
  process.env.KDL_CRM_WEBHOOK_URL = 'https://crm.example.test/lead';
  let webhookCalls = 0;
  global.fetch = async (url) => {
    if (String(url).includes('/rpc/kdl_create_quote')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          duplicate: true,
          quote_id: 'quote_test_0001',
          contact_id: 'contact_test_0001',
          public_folio: 'KDL-20260728-T001',
          quote_status: 'requested',
          created_at: '2026-07-28T12:00:00.000Z'
        })
      };
    }
    webhookCalls += 1;
    return { ok: true, status: 202, json: async () => ({ ok: true }) };
  };

  const result = await invoke(lead());

  assert.equal(result.status, 200);
  assert.equal(result.body.duplicate, true);
  assert.equal(result.body.durable, true);
  assert.equal(result.body.delivered, false);
  assert.equal(webhookCalls, 0);
});

test('persiste antes de entregar una solicitud nueva', async () => {
  process.env.SUPABASE_URL = 'https://project.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test';
  process.env.KDL_CRM_WEBHOOK_URL = 'https://crm.example.test/lead';
  const calls = [];
  global.fetch = async (url) => {
    calls.push(String(url));
    if (String(url).includes('/rpc/kdl_create_quote')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          duplicate: false,
          quote_id: 'quote_test_0001',
          contact_id: 'contact_test_0001',
          public_folio: 'KDL-20260728-T001',
          quote_status: 'requested',
          created_at: '2026-07-28T12:00:00.000Z'
        })
      };
    }
    return { ok: true, status: 202, json: async () => ({ ok: true }) };
  };

  const result = await invoke(lead());

  assert.equal(result.status, 202);
  assert.equal(result.body.durable, true);
  assert.equal(result.body.delivered, true);
  assert.match(calls[0], /kdl_create_quote/);
  assert.equal(calls[1], 'https://crm.example.test/lead');
});

test('un fallo de persistencia evita notificaciones potencialmente duplicadas', async () => {
  process.env.SUPABASE_URL = 'https://project.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test';
  process.env.KDL_CRM_WEBHOOK_URL = 'https://crm.example.test/lead';
  let webhookCalls = 0;
  global.fetch = async (url) => {
    if (String(url).includes('/rpc/kdl_create_quote')) {
      return { ok: false, status: 500, json: async () => ({ message: 'database error' }) };
    }
    webhookCalls += 1;
    return { ok: true, status: 202, json: async () => ({ ok: true }) };
  };

  const result = await invoke(lead());

  assert.equal(result.status, 503);
  assert.equal(result.body.error, 'persistence_failed');
  assert.equal(result.body.delivered, false);
  assert.equal(webhookCalls, 0);
});
