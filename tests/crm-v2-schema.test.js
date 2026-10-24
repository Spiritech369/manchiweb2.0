'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const sql = fs.readFileSync(path.join(__dirname, '..', 'database', 'kdl-crm-v2.sql'), 'utf8');

function functionBody(name) {
  const start = sql.search(new RegExp(`create or replace function public\\.${name}\\(`, 'i'));
  assert.ok(start >= 0, `${name} not found`);
  const open = sql.indexOf('$$', start);
  const close = sql.indexOf('$$', open + 2);
  return sql.slice(open + 2, close);
}

test('la migración v2 es transaccional e idempotente', () => {
  assert.match(sql, /^\s*(--[^\n]*\n\s*)*begin;/i);
  assert.match(sql, /commit;\s*$/i);
  assert.doesNotMatch(sql, /drop (table|column)/i);
  assert.doesNotMatch(sql, /add column (?!if not exists)/i);
});

test('agrega email y RFC a contactos y fecha, foto y canal a cotizaciones', () => {
  assert.match(sql, /alter table public\.contacts\s+add column if not exists email text,\s+add column if not exists rfc text;/i);
  assert.match(sql, /alter table public\.quotes\s+add column if not exists required_date date,\s+add column if not exists photo_url text,\s+add column if not exists channel text;/i);
});

test('kdl_create_quote conserva idempotencia e historial y guarda los campos nuevos', () => {
  const body = functionBody('kdl_create_quote');
  assert.match(sql, /create or replace function public\.kdl_create_quote\(p jsonb\)\s+returns jsonb\s+language plpgsql\s+security definer\s+set search_path = public/i);
  assert.match(body, /where idempotency_key = nullif\(trim\(p->>'idempotency_key'\)/i);
  for (const table of ['activity_events', 'quote_events', 'status_history', 'audit_logs']) {
    assert.match(body, new RegExp(`insert into public\\.${table}`, 'i'));
  }
  assert.match(body, /first_name, company, whatsapp, city, email, rfc/i);
  assert.match(body, /email = coalesce\(excluded\.email, contacts\.email\)/i);
  assert.match(body, /rfc = coalesce\(excluded\.rfc, contacts\.rfc\)/i);
  assert.match(body, /required_date, photo_url, channel/i);
  assert.match(body, /nullif\(p->>'required_date', ''\)::date/i);
});

test('kdl_create_quote inserta una partida por elemento de items con fallback', () => {
  const body = functionBody('kdl_create_quote');
  assert.match(body, /jsonb_typeof\(p->'items'\) = 'array' and jsonb_array_length\(p->'items'\) > 0/i);
  assert.match(body, /jsonb_array_elements\(p->'items'\) with ordinality/i);
  assert.match(body, /\(p->>'quote_id'\) \|\| '_item_' \|\| t\.ordinality/i);
  assert.match(body, /nullif\(t\.item->>'sku', ''\)/i);
  assert.match(body, /coalesce\(nullif\(t\.item->>'model', ''\), nullif\(t\.item->>'title', ''\)\)/i);
  assert.match(body, /elsif nullif\(p->>'part', ''\) is not null or v_quantity is not null then/i);
  assert.match(body, /\(p->>'quote_id'\) \|\| '_item_1'/i);
});

test('kdl_lookup_quote exige folio y últimos 4 dígitos y no expone datos personales', () => {
  assert.match(sql, /create or replace function public\.kdl_lookup_quote\(p_folio text, p_phone_last4 text\)\s+returns jsonb[\s\S]*?security definer\s+set search_path = public/i);
  const body = functionBody('kdl_lookup_quote');
  assert.match(body, /where public_folio = upper\(trim\(p_folio\)\)/i);
  assert.match(body, /regexp_replace\(coalesce\(c\.whatsapp, ''\), '\[\^0-9\]', '', 'g'\)/i);
  assert.match(body, /right\(v_phone, 4\) <> p_phone_last4/i);

  const output = body.slice(body.search(/return jsonb_build_object\(/i));
  const keys = Array.from(output.matchAll(/'([a-z_]+)',/g), (match) => match[1]);
  assert.deepEqual(keys, ['public_folio', 'quote_status', 'created_at', 'updated_at', 'items']);
  const itemKeys = Array.from(body.matchAll(/'(name|quantity)',/g), (match) => match[1]);
  assert.deepEqual(itemKeys, ['name', 'quantity']);
  assert.match(body, /'name', coalesce\(i\.product_name, i\.manual_reference\)/i);

  const builtObjects = Array.from(body.matchAll(/jsonb_build_object\(([\s\S]*?)\)\s*(order by|\)|;)/gi), (match) => match[1]).join('\n');
  for (const field of ['first_name', 'company', 'whatsapp', 'email', 'rfc']) {
    assert.doesNotMatch(builtObjects, new RegExp(`\\b${field}\\b`, 'i'), field);
  }
});

test('ambas funciones sólo se conceden a service_role', () => {
  for (const signature of ['kdl_create_quote\\(jsonb\\)', 'kdl_lookup_quote\\(text, text\\)']) {
    assert.match(sql, new RegExp(`revoke all on function public\\.${signature} from public;`, 'i'));
    assert.match(sql, new RegExp(`revoke all on function public\\.${signature} from anon, authenticated;`, 'i'));
    assert.match(sql, new RegExp(`grant execute on function public\\.${signature} to service_role;`, 'i'));
    assert.doesNotMatch(sql, new RegExp(`grant [^;]* on function public\\.${signature} to [^;]*(anon|authenticated|public)`, 'i'));
  }
});
