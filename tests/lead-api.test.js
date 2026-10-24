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

test('normaliza los campos nuevos y descarta valores inválidos', () => {
  const normalized = handler.normalize(lead({
    email: '  Ana.Perez@Example.COM ',
    rfc: 'abc123456xy9',
    required_date: '2026-08-15',
    photo_url: 'https://project.supabase.co/storage/v1/object/sign/kdl-uploads/2026/07/a.jpg?token=t',
    channel: 'WhatsApp'
  }));
  assert.equal(normalized.email, 'ana.perez@example.com');
  assert.equal(normalized.rfc, 'ABC123456XY9');
  assert.equal(normalized.required_date, '2026-08-15');
  assert.match(normalized.photo_url, /^https:\/\/project\.supabase\.co\//);
  assert.equal(normalized.channel, 'whatsapp');

  const invalid = handler.normalize(lead({
    email: 'no-es-correo',
    rfc: 'ABC-<script>',
    required_date: '2026-02-30',
    photo_url: 'http://inseguro.example/foto.jpg',
    channel: 'sms'
  }));
  assert.equal(invalid.email, '');
  assert.equal(invalid.rfc, '');
  assert.equal(invalid.required_date, '');
  assert.equal(invalid.photo_url, '');
  assert.equal(invalid.channel, '');

  assert.equal(handler.normalize(lead({ email: `${'a'.repeat(160)}@example.com` })).email, '');
  assert.equal(handler.normalize(lead({ rfc: 'ABCD123456XY90' })).rfc, '');
  assert.equal(handler.normalize(lead({ photo_url: `https://example.com/${'a'.repeat(600)}` })).photo_url, '');
  assert.equal(handler.normalize(lead({ required_date: '15/08/2026' })).required_date, '');
  assert.equal(handler.normalize(lead({ channel: 'email' })).channel, 'email');
});

test('normaliza partidas: limita, limpia y descarta campos desconocidos', () => {
  const normalized = handler.normalize(lead({
    items: [
      { sku: ' SKU-1 ', model: 'MHZ2-16D', title: 'Pinza neumática', brand: 'SMC', quantity: 3, unit_price: 1250.5, manual_reference: '', secret: 'x' },
      { model: 'Sin cantidad', quantity: -2, unit_price: -1 },
      { manual_reference: 'Referencia libre', quantity: '4', unit_price: '99.9' },
      { quantity: 5 },
      'texto',
      null,
      { model: 'x'.repeat(500), title: 'y'.repeat(500) }
    ]
  }));

  assert.equal(normalized.items.length, 4);
  assert.deepEqual(normalized.items[0], {
    sku: 'SKU-1', model: 'MHZ2-16D', title: 'Pinza neumática', brand: 'SMC',
    quantity: 3, unit_price: 1250.5, manual_reference: ''
  });
  assert.equal(normalized.items[1].quantity, 1);
  assert.equal(normalized.items[1].unit_price, null);
  assert.equal(normalized.items[2].quantity, 4);
  assert.equal(normalized.items[2].unit_price, 99.9);
  assert.equal(normalized.items[3].model.length, 160);
  assert.equal(normalized.items[3].title.length, 240);
  assert.equal('secret' in normalized.items[0], false);

  const many = handler.normalize(lead({ items: Array.from({ length: 150 }, (_, i) => ({ model: `M${i}` })) }));
  assert.equal(many.items.length, 100);
  assert.deepEqual(handler.normalize(lead({ items: 'no-array' })).items, []);
  assert.deepEqual(handler.normalize(lead()).items, []);
});

test('el texto del lead lista partidas y datos opcionales', () => {
  const text = handler.leadText(handler.normalize(lead({
    email: 'ana@example.com',
    rfc: 'ABC123456XY9',
    required_date: '2026-08-15',
    photo_url: 'https://project.supabase.co/storage/v1/object/sign/kdl-uploads/a.jpg?token=t',
    items: [
      { sku: 'SKU-1', model: 'MHZ2-16D', quantity: 2 },
      { manual_reference: 'Sensor sin clave', quantity: 1 }
    ]
  })));
  assert.match(text, /^1\) MHZ2-16D — Cant: 2 · Clave: SKU-1$/m);
  assert.match(text, /^2\) Sensor sin clave — Cant: 1$/m);
  assert.match(text, /^Email: ana@example\.com$/m);
  assert.match(text, /^RFC: ABC123456XY9$/m);
  assert.match(text, /^Fecha requerida: 2026-08-15$/m);
  assert.match(text, /^Foto: https:\/\/project\.supabase\.co\/storage\/v1\/object\/sign\/kdl-uploads\/a\.jpg\?token=t$/m);

  const plain = handler.leadText(handler.normalize(lead()));
  assert.doesNotMatch(plain, /^(Email|RFC|Fecha requerida|Foto):/m);
  assert.doesNotMatch(plain, /Cant:/);
});

test('envía partidas y campos nuevos a persistencia, webhook y correo', async () => {
  process.env.SUPABASE_URL = 'https://project.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test';
  process.env.KDL_CRM_WEBHOOK_URL = 'https://crm.example.test/lead';
  process.env.RESEND_API_KEY = 'resend-test';
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url: String(url), body: JSON.parse(options.body) });
    if (String(url).includes('/rpc/kdl_create_quote')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ duplicate: false, quote_id: 'quote_test_0001', contact_id: 'contact_test_0001', public_folio: 'KDL-20260728-T001' })
      };
    }
    return { ok: true, status: 202, json: async () => ({ ok: true }) };
  };

  const result = await invoke(lead({
    email: 'ANA@EXAMPLE.COM',
    channel: 'email',
    items: [{ sku: 'SKU-1', model: 'MHZ2-16D', quantity: 2, unit_price: 10 }]
  }));

  assert.equal(result.status, 202);
  const rpc = calls.find((call) => call.url === 'https://project.supabase.co/rest/v1/rpc/kdl_create_quote');
  assert.equal(rpc.body.p.email, 'ana@example.com');
  assert.equal(rpc.body.p.channel, 'email');
  assert.deepEqual(rpc.body.p.items, [{ sku: 'SKU-1', model: 'MHZ2-16D', title: '', brand: '', quantity: 2, unit_price: 10, manual_reference: '' }]);
  const webhook = calls.find((call) => call.url === 'https://crm.example.test/lead');
  assert.equal(webhook.body.lead.items.length, 1);
  const email = calls.find((call) => call.url === 'https://api.resend.com/emails');
  assert.match(email.body.text, /1\) MHZ2-16D — Cant: 2 · Clave: SKU-1/);
  assert.match(email.body.text, /Email: ana@example\.com/);
});
