const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const SITE_URL = 'https://kdl.com.mx';

function loadData() {
  const code = fs.readFileSync(path.join(ROOT, 'kdl-data.js'), 'utf8');
  const sandbox = { window: {}, console };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: 'kdl-data.js' });
  return sandbox.window.KDL;
}

function xml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function url(pathname) {
  return SITE_URL + '/' + String(pathname || '').replace(/^\/+/, '');
}

function item(loc, changefreq, priority) {
  return [
    '  <url>',
    `    <loc>${xml(loc)}</loc>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    '  </url>'
  ].join('\n');
}

function main() {
  const KDL = loadData();
  if (!KDL || !Array.isArray(KDL.cats)) throw new Error('No se pudo cargar KDL.cats');

  const urls = [
    item(url(''), 'weekly', '1.0'),
    item(url('productos/'), 'weekly', '0.95'),
    item(url('Servicios.dc.html'), 'monthly', '0.70'),
    item(url('Catalogos.dc.html'), 'monthly', '0.70'),
    item(url('Contacto.dc.html'), 'monthly', '0.75')
  ];

  KDL.cats.forEach((cat) => {
    urls.push(item(url(`productos/${cat.key}/`), 'weekly', '0.85'));
    cat.products.forEach((product) => {
      urls.push(item(url(`productos/${cat.key}/${product.slug}/`), 'monthly', '0.72'));
    });
  });

  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls.join('\n'),
    '</urlset>',
    ''
  ].join('\n');

  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap, 'utf8');
  fs.writeFileSync(path.join(ROOT, 'robots.txt'), [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    ''
  ].join('\n'), 'utf8');

  console.log(`Generated sitemap.xml with ${urls.length} URLs and robots.txt.`);
}

main();
