import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('el selector ofrece cinco idiomas locales sin mensajes pendientes', () => {
  const switcher = read('kdl-language.js');
  const engine = read('kdl-i18n.js');
  assert.match(switcher, /code: 'es'/);
  assert.match(switcher, /code: 'en'/);
  assert.match(switcher, /code: 'zh-CN'/);
  assert.match(switcher, /code: 'hi'/);
  assert.match(switcher, /code: 'ar'/);
  assert.doesNotMatch(switcher, /pendiente|se integrar[aá]n|translate\.google/i);
  assert.doesNotMatch(engine, /translate\.google/i);
});

test('la portada carga primero el motor local y conserva el idioma', () => {
  const home = read('index.html');
  const engine = read('kdl-i18n.js');
  assert.ok(home.indexOf('kdl-i18n.js?v=2') < home.indexOf('kdl-language.js?v=10'));
  assert.match(engine, /localStorage\.setItem\(STORAGE_KEY, code\)/);
  assert.match(engine, /document\.documentElement\.lang = code/);
  assert.match(engine, /MutationObserver/);
});

test('las subpáginas cargan el mismo traductor mediante el encabezado compartido', () => {
  const header = read('kdl-site-header.js');
  assert.match(header, /kdl-i18n\.js\?v=2/);
  assert.match(header, /kdl-language\.js\?v=10/);
  assert.match(header, /loadLanguageSwitcher/);
});
