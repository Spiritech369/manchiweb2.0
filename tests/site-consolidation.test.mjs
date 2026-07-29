import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const htmlFiles = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', 'artifacts'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.toLowerCase().endsWith('.html')) htmlFiles.push(full);
  }
}
walk(root);

test('no hay destinos locales rotos', () => {
  const missing = [];
  const attr = /\b(?:href|src)=["']([^"']+)["']/gi;
  for (const file of htmlFiles) {
    const text = fs.readFileSync(file, 'utf8');
    for (const match of text.matchAll(attr)) {
      const value = match[1].trim();
      if (!value || value.startsWith('#') || value.includes('{{') || /^[a-z]+:/i.test(value) || value.startsWith('//')) continue;
      const clean = decodeURIComponent(value.split(/[?#]/)[0]);
      if (!clean) continue;
      const target = path.resolve(path.dirname(file), clean);
      if (!fs.existsSync(target)) missing.push(`${path.relative(root, file)} -> ${value}`);
    }
  }
  assert.deepEqual(missing, []);
});

test('todos los JSON-LD son válidos', () => {
  const invalid = [];
  const jsonLd = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const file of htmlFiles) {
    const text = fs.readFileSync(file, 'utf8');
    for (const match of text.matchAll(jsonLd)) {
      try {
        JSON.parse(match[1]);
      } catch (error) {
        invalid.push(`${path.relative(root, file)}: ${error.message}`);
      }
    }
  }
  assert.deepEqual(invalid, []);
});

test('la consolidación elimina CTA redundantes y conserva los destinos reales', () => {
  const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const product = fs.readFileSync(path.join(root, 'Producto.dc.html'), 'utf8');
  const documents = fs.readFileSync(path.join(root, 'Catalogos.dc.html'), 'utf8');
  assert.match(home, /Cotizar o enviar referencia/);
  assert.doesNotMatch(home, /Cotizar refacción urgente/);
  assert.doesNotMatch(home, /Productos\.dc\.html#cat-/);
  assert.doesNotMatch(product, /A&ntilde;adir y revisar cotizaci&oacute;n/);
  assert.match(documents, /PDF · descarga/);
  assert.match(documents, /Requiere marca y modelo/);
  assert.match(documents, /Pedir a un asesor/);
});
