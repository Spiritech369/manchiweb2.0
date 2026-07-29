'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const sql = fs.readFileSync(path.join(__dirname, '..', 'database', 'kdl-crm.sql'), 'utf8');

test('incluye las entidades CRM y de trazabilidad requeridas', () => {
  for (const table of [
    'contacts',
    'quotes',
    'quote_items',
    'activity_events',
    'quote_events',
    'audit_logs',
    'assignment_history',
    'status_history'
  ]) {
    assert.match(sql, new RegExp(`create table if not exists public\\.${table}\\b`, 'i'));
  }
});

test('la cotización impone idempotencia y folio únicos', () => {
  assert.match(sql, /public_folio text not null unique/i);
  assert.match(sql, /idempotency_key text not null unique/i);
  assert.match(sql, /where idempotency_key = nullif\(trim\(p->>'idempotency_key'\)/i);
});

test('la función crea historial sin sobrescribir eventos', () => {
  assert.match(sql, /insert into public\.activity_events/i);
  assert.match(sql, /insert into public\.quote_events/i);
  assert.match(sql, /insert into public\.status_history/i);
  assert.match(sql, /insert into public\.audit_logs/i);
  assert.doesNotMatch(sql, /update public\.(activity_events|quote_events|status_history|audit_logs)/i);
});

test('las tablas quedan protegidas y el RPC sólo se concede a service_role', () => {
  assert.match(sql, /alter table public\.contacts enable row level security/i);
  assert.match(sql, /alter table public\.quotes enable row level security/i);
  assert.match(sql, /revoke all on function public\.kdl_create_quote\(jsonb\) from public/i);
  assert.match(sql, /grant execute on function public\.kdl_create_quote\(jsonb\) to service_role/i);
});
