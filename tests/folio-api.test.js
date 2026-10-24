'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const handler = require('../api/folio');

const ENV_KEYS = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];

const originalFetch = global.fetch;
const originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

function resetEnvironment() {
  for (const key of ENV_KEYS) {
    if (originalEnv[key] == null) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
  global.fetch = originalFetch;
}

function configure() {
  process.env.SUPABASE_URL = 'https://project.supabase.co/';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test';
}

async function invoke({ method = 'GET', url, query } = {}) {
  const output = { status: 0, headers: {}, body: null };
  const req = { method, url: url || '/api/folio', headers: {} };
  if (query) req.query = query;
  const res = {
    set statusCode(value) { output.status = value; },
    get statusCode() { return output.status; },
    setHeader(name, value) { output.headers[name] = value; },
    end(value) { output.body = JSON.parse(String(value)); }
  };
  await handler(req, res);
  return output;
}

function rpcResponse(body, { ok = true, status = 200 } = {}) {
  return { ok, status, json: async () => body };
}

const FOUND = {
  public_folio: 'KDL-20260728-AB12',
  quote_status: 'in_review',
  created_at: '2026-07-28T12:00:00+00:00',
  updated_at: '2026-07-29T09:30:00+00:00',
  items: [{ name: 'MHZ2-16D', quantity: 2 }, { name: 'Sensor', quantity: 1.5 }]
};

test.afterEach(resetEnvironment);
test.after(resetEnvironment);

test('OPTIONS responde 204 con CORS y otros métodos 405', async () => {
  const options = await invoke({ method: 'OPTIONS' });
  assert.equal(options.status, 204);
  assert.equal(options.headers['Access-Control-Allow-Methods'], 'GET, OPTIONS');
  assert.ok(options.headers['Access-Control-Allow-Origin']);

  const post = await invoke({ method: 'POST', query: { folio: 'KDL-20260728-AB12', tel: '5678' } });
  assert.equal(post.status, 405);
  assert.deepEqual(post.body, { ok: false, error: 'method_not_allowed' });
});

test('valida folio y últimos 4 dígitos antes de consultar', async () => {
  configure();
  let calls = 0;
  global.fetch = async () => { calls += 1; return rpcResponse(FOUND); };

  for (const query of [
    {},
    { folio: 'KDL-20260728-AB12' },
    { folio: 'KDL-20260728-AB12', tel: '567' },
    { folio: 'KDL-20260728-AB12', tel: '56789' },
    { folio: 'KDL-20260728-AB12', tel: '56a8' },
    { folio: 'KDL-2026072-AB12', tel: '5678' },
    { folio: 'KDL-20260728-AB1!', tel: '5678' },
    { folio: "KDL-20260728-AB12' or 1=1", tel: '5678' }
  ]) {
    const result = await invoke({ query });
    assert.equal(result.status, 400, JSON.stringify(query));
    assert.deepEqual(result.body, { ok: false, error: 'invalid_request' });
  }
  assert.equal(calls, 0);
});

test('503 cuando Supabase no está configurado', async () => {
  let calls = 0;
  global.fetch = async () => { calls += 1; return rpcResponse(FOUND); };
  const result = await invoke({ query: { folio: 'KDL-20260728-AB12', tel: '5678' } });
  assert.equal(result.status, 503);
  assert.deepEqual(result.body, { ok: false, error: 'lookup_not_configured' });
  assert.equal(result.headers['Cache-Control'], 'no-store');
  assert.equal(calls, 0);
});

test('consulta el RPC con service role y responde sólo datos públicos', async () => {
  configure();
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    return rpcResponse(Object.assign({ name: 'No debe salir', whatsapp: '8112345678' }, FOUND));
  };

  const result = await invoke({ url: '/api/folio?folio=kdl-20260728-ab12&tel=5678' });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://project.supabase.co/rest/v1/rpc/kdl_lookup_quote');
  assert.equal(calls[0].options.method, 'POST');
  assert.deepEqual(calls[0].options.headers, {
    apikey: 'service-role-test',
    Authorization: 'Bearer service-role-test',
    'Content-Type': 'application/json'
  });
  assert.deepEqual(JSON.parse(calls[0].options.body), { p_folio: 'KDL-20260728-AB12', p_phone_last4: '5678' });

  assert.equal(result.status, 200);
  assert.equal(result.headers['Cache-Control'], 'no-store');
  assert.deepEqual(result.body, {
    ok: true,
    folio: 'KDL-20260728-AB12',
    status: 'in_review',
    status_label: 'En revisión',
    created_at: '2026-07-28T12:00:00+00:00',
    updated_at: '2026-07-29T09:30:00+00:00',
    items: [{ name: 'MHZ2-16D', quantity: 2 }, { name: 'Sensor', quantity: 1.5 }]
  });
});

test('acepta req.query de Vercel', async () => {
  configure();
  global.fetch = async () => rpcResponse(FOUND);
  const result = await invoke({ query: { folio: 'KDL-20260728-AB12', tel: '5678' } });
  assert.equal(result.status, 200);
  assert.equal(result.body.folio, 'KDL-20260728-AB12');
});

test('folio inexistente y teléfono incorrecto devuelven el mismo 404', async () => {
  configure();
  global.fetch = async () => rpcResponse(null);
  const unknown = await invoke({ query: { folio: 'KDL-20260728-ZZZZ', tel: '5678' } });
  const wrongPhone = await invoke({ query: { folio: 'KDL-20260728-AB12', tel: '0000' } });
  assert.equal(unknown.status, 404);
  assert.deepEqual(unknown.body, { ok: false, error: 'not_found' });
  assert.deepEqual(wrongPhone, unknown);

  global.fetch = async () => ({ ok: true, status: 200, text: async () => '' });
  const empty = await invoke({ query: { folio: 'KDL-20260728-AB12', tel: '0000' } });
  assert.equal(empty.status, 404);
});

test('502 ante error del upstream o respuesta inválida', async () => {
  configure();
  global.fetch = async () => rpcResponse({ message: 'boom' }, { ok: false, status: 500 });
  const failed = await invoke({ query: { folio: 'KDL-20260728-AB12', tel: '5678' } });
  assert.equal(failed.status, 502);
  assert.deepEqual(failed.body, { ok: false, error: 'lookup_failed' });

  global.fetch = async () => { throw new Error('network'); };
  const thrown = await invoke({ query: { folio: 'KDL-20260728-AB12', tel: '5678' } });
  assert.equal(thrown.status, 502);

  global.fetch = async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('bad'); } });
  const invalid = await invoke({ query: { folio: 'KDL-20260728-AB12', tel: '5678' } });
  assert.equal(invalid.status, 502);
});

test('traduce estados a etiquetas públicas', () => {
  assert.equal(handler.statusLabel('requested'), 'Recibida');
  assert.equal(handler.statusLabel('in_review'), 'En revisión');
  assert.equal(handler.statusLabel('quoted'), 'Cotizada');
  assert.equal(handler.statusLabel('won'), 'Pedido confirmado');
  assert.equal(handler.statusLabel('lost'), 'Cerrada');
  assert.equal(handler.statusLabel('negotiation'), 'En proceso');
  assert.equal(handler.statusLabel('toString'), 'En proceso');
});
