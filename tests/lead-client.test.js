'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'kdl-leads.js'), 'utf8');

function storage(initial = {}) {
  const values = Object.assign({}, initial);
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null;
    },
    setItem(key, value) {
      values[key] = String(value);
    },
    removeItem(key) {
      delete values[key];
    }
  };
}

function runtime(fetchImpl = fetch) {
  const localStorage = storage({
    kdl_leads: JSON.stringify([{ name: 'Dato anterior', whatsapp: '8111111111' }])
  });
  const sessionStorage = storage();
  const events = [];
  const context = {
    window: {},
    localStorage,
    sessionStorage,
    location: { href: 'https://kdl.com.mx/' },
    navigator: {},
    Blob,
    fetch: fetchImpl,
    Date,
    Math,
    JSON,
    String,
    Object,
    Array,
    encodeURIComponent,
    setTimeout,
    clearTimeout
  };
  context.window = context;
  context.dataLayer = events;
  vm.createContext(context);
  new vm.Script(source, { filename: 'kdl-leads.js' }).runInContext(context);
  return { context, localStorage, sessionStorage, events };
}

test('un retry idéntico conserva folio y quote_id', () => {
  const { context } = runtime();
  const input = {
    form: 'quick_quote',
    name: 'Ana',
    whatsapp: '8112345678',
    category: 'Sensores',
    part: 'KQ5105'
  };

  const first = context.kdlLead.submit(input);
  const retry = context.kdlLead.submit(input);

  assert.equal(retry.duplicate, true);
  assert.equal(retry.folio, first.folio);
  assert.equal(retry.quoteId, first.quoteId);
  assert.equal(retry.idempotencyKey, first.idempotencyKey);
});

test('solicitudes diferentes conservan contact_id y crean quote_id distinto', () => {
  const { context, localStorage } = runtime();
  const first = context.kdlLead.submit({
    name: 'Ana',
    whatsapp: '8112345678',
    category: 'Sensores',
    part: 'KQ5105'
  });
  const second = context.kdlLead.submit({
    name: 'Ana',
    whatsapp: '8112345678',
    category: 'Neumática',
    part: 'SC63'
  });
  const idempotencyRows = JSON.parse(context.sessionStorage.getItem('kdl_lead_idempotency'));

  assert.notEqual(second.quoteId, first.quoteId);
  assert.equal(idempotencyRows[0].contactId, idempotencyRows[1].contactId);
  assert.equal(idempotencyRows[0].contactId, localStorage.getItem('kdl_contact_id'));
});

test('los recibos locales no almacenan datos personales', () => {
  const { context, localStorage } = runtime();
  context.kdlLead.submit({
    name: 'Ana',
    company: 'Planta privada',
    whatsapp: '8112345678',
    message: 'Información sensible de la máquina',
    category: 'Sensores',
    part: 'KQ5105'
  });

  const receipts = localStorage.getItem('kdl_lead_receipts');

  assert.equal(localStorage.getItem('kdl_leads'), null);
  assert.doesNotMatch(receipts, /Ana|Planta privada|8112345678|Información sensible/);
  assert.match(receipts, /KDL-\d{8}-[A-Z0-9]{4}/);
});

test('actualiza el recibo cuando el backend confirma persistencia durable', async () => {
  const { context, localStorage } = runtime(async () => ({
    ok: true,
    status: 202,
    text: async () => JSON.stringify({ ok: true, durable: true })
  }));
  context.KDL_LEAD_ENDPOINT = '/api/lead';

  const result = context.kdlLead.submit({
    name: 'Ana',
    whatsapp: '8112345678',
    category: 'Sensores',
    part: 'KQ5105'
  });
  const delivery = await result.deliveryPromise;
  const receipts = JSON.parse(localStorage.getItem('kdl_lead_receipts'));

  assert.equal(delivery.ok, true);
  assert.equal(receipts[0].status, 'persisted');
  assert.equal(receipts[0].apiStatus, 202);
});
