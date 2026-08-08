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

test('las subpáginas muestran únicamente el encabezado compartido', () => {
  const headerScript = fs.readFileSync(path.join(root, 'kdl-site-header.js'), 'utf8');
  const headerStyles = fs.readFileSync(path.join(root, 'kdl-site-header.css'), 'utf8');
  assert.match(headerScript, /kdl-site-header\.css\?v=3/);
  assert.match(headerStyles, /header:not\(\.kdl-shared-header\)\{display:none!important\}/);

  const duplicatedLoader = [];
  const staleHeaderAssets = [];
  for (const file of htmlFiles) {
    const text = fs.readFileSync(file, 'utf8');
    const loaders = text.match(/kdl-site-header\.js/g) || [];
    if (loaders.length > 1) duplicatedLoader.push(path.relative(root, file));
    if (loaders.length && !text.includes('kdl-site-header.js?v=13')) staleHeaderAssets.push(path.relative(root, file));
    if (text.includes('data-kdl-shared-header') && !text.includes('kdl-site-header.css?v=3')) staleHeaderAssets.push(path.relative(root, file));
  }
  assert.deepEqual(duplicatedLoader, []);
  assert.deepEqual(staleHeaderAssets, []);
});
test('el verde se reserva para controles explicitos de WhatsApp', () => {
  const styles = fs.readFileSync(path.join(root, 'kdl-corporate.css'), 'utf8');
  assert.doesNotMatch(styles, /^a\[href\*="wa\.me"\],?$/m);
  assert.match(styles, /\.kdl-commercial-card \{/);

  for (const file of ['Soluciones.dc.html', 'Catalogos.dc.html', 'Marcas.dc.html', 'Contacto.dc.html']) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    assert.match(html, /class="kdl-commercial-card"/);
  }
});
test('la documentacion publicada excluye manuales, CAD, diagramas y certificados', () => {
  const prohibited = /\bManuales\b|manual de instalación|ficha técnica o (?:el )?manual|ficha técnica \/ manual|\bCAD\b|diagramas?|certificados?/i;
  for (const file of htmlFiles) {
    assert.doesNotMatch(fs.readFileSync(file, 'utf8'), prohibited, path.relative(root, file));
  }
  assert.doesNotMatch(fs.readFileSync(path.join(root, 'tools', 'generate-seo-pages.js'), 'utf8'), prohibited);
});

test('Soluciones concentra industrias y servicios sin eliminar sus URLs SEO', () => {
  const central = fs.readFileSync(path.join(root, 'Soluciones.dc.html'), 'utf8');
  const industries = fs.readFileSync(path.join(root, 'Industrias.dc.html'), 'utf8');
  const services = fs.readFileSync(path.join(root, 'Servicios.dc.html'), 'utf8');
  const header = fs.readFileSync(path.join(root, 'kdl-site-header.js'), 'utf8');
  assert.match(central, /id="soluciones"/);
  assert.match(central, /id="industrias"/);
  assert.match(central, /id="servicios"/);
  assert.match(industries, /Soluciones\.dc\.html#industrias/);
  assert.match(services, /Soluciones\.dc\.html#servicios/);
  assert.doesNotMatch(header, /\['Industrias', 'Industrias\.dc\.html'/);
  assert.doesNotMatch(header, /\['Servicios', 'Servicios\.dc\.html'/);
});