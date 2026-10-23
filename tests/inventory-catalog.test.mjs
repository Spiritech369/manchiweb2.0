import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'kdl-data.js'), 'utf8'), context);
vm.runInNewContext(fs.readFileSync(path.join(root, 'kdl-inventory-data.js'), 'utf8'), context);
const inventory = context.window.KDLInventory;

test('el inventario publicado conserva las 74 filas normalizadas del Excel', () => {
  assert.equal(inventory.products.length, 74);
  assert.equal(inventory.categories.length, 11);
  assert.deepEqual(
    JSON.parse(JSON.stringify(inventory.stats)),
    { total: 74, verified: 51, inStock: 67, priced: 51, sourced: 73, exactPhotos: 31, brands: 21 },
  );
  assert.equal(new Set(inventory.products.map((product) => product.sku)).size, 74);
  assert.equal(new Set(inventory.products.map((product) => product.slug)).size, 74);
});

test('cada producto tiene imagen local y enlaces técnicos seguros cuando están disponibles', () => {
  for (const product of inventory.products) {
    assert.ok(product.model, product.sku);
    assert.ok(product.title, product.sku);
    assert.ok(product.image, product.sku);
    const imagePath = path.resolve(root, product.image);
    assert.ok(fs.existsSync(imagePath), `${product.sku}: ${product.image}`);
    assert.ok(fs.statSync(imagePath).size > 0, `${product.sku}: imagen vacía`);
    if (product.sourceUrl) assert.match(product.sourceUrl, /^https:\/\//, `${product.sku}: fuente insegura`);
    if (product.technicalUrl) assert.match(product.technicalUrl, /^https:\/\//, `${product.sku}: ficha insegura`);
    assert.ok(['exact', 'family', 'reference'].includes(product.imageKind), product.sku);
  }
});

test('el catálogo no expone notas internas del inventario', () => {
  const prohibited = ['Notas', 'Valor conocido', 'Costo unitario MXN', 'Ubicación'];
  for (const product of inventory.products) {
    for (const field of prohibited) assert.equal(Object.hasOwn(product, field), false, `${product.sku}: ${field}`);
  }
});

test('los enlaces de cotización resuelven los modelos nuevos en la cesta existente', () => {
  const product = inventory.find('IND-0002');
  assert.equal(product.model, 'DPSN1B-10020');
  const hit = context.window.KDL.find(product.categoryKey, product.slug);
  assert.equal(hit.product.n, product.model);
  assert.equal(hit.product.sku, product.sku);
  assert.equal(hit.cat.name, product.categoryName);
});

test('las imágenes de HGH30HA y PRDWT12 usan fotografías de producto, no recursos genéricos', () => {
  assert.equal(inventory.find('IND-0024').image, 'assets/inventory/ind-0024-hgh30ha.jpg');
  assert.equal(inventory.find('IND-0036').image, 'assets/inventory/ind-0036-prdwt12.webp');
});

test('las páginas usan el nuevo inventario y su lógica embebida compila', () => {
  for (const name of ['Productos.dc.html', 'Producto.dc.html']) {
    const html = fs.readFileSync(path.join(root, name), 'utf8');
    assert.match(html, /kdl-inventory-data\.js\?v=1/);
    const match = html.match(/<script type="text\/x-dc" data-dc-script>([\s\S]*?)<\/script>/);
    assert.ok(match, `${name}: falta la lógica de la página`);
    assert.doesNotThrow(() => new Function(match[1]), `${name}: sintaxis inválida`);
  }
  const cart = fs.readFileSync(path.join(root, 'Cesta.dc.html'), 'utf8');
  assert.match(cart, /kdl-inventory-data\.js\?v=1/);
});
