const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const SITE_URL = 'https://kdl.com.mx';
const PHONE = '+52 81 1227 3382';
const EMAIL = 'ventas@kdl.com.mx';

function loadData() {
  const code = fs.readFileSync(path.join(ROOT, 'kdl-data.js'), 'utf8');
  const sandbox = { window: {}, console };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: 'kdl-data.js' });
  return sandbox.window.KDL;
}

function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function text(value) {
  return esc(value).replace(/\s+/g, ' ').trim();
}

function absPath(p) {
  return SITE_URL + '/' + String(p || '').replace(/^\/+/, '');
}

function cleanProductUrl(cat, product) {
  return absPath(`productos/${cat.key}/${product.slug}/`);
}

function cleanCategoryUrl(cat) {
  return absPath(`productos/${cat.key}/`);
}

function description(cat, product) {
  return `${product.n} - ${product.s}. Producto de ${cat.name}. KDL ayuda a validar compatibilidad, disponibilidad y alternativas para mantenimiento industrial.`;
}

function wa(message) {
  return 'https://wa.me/528112273382?text=' + encodeURIComponent(message);
}

function layout({ title, description: desc, canonical, image, rootRel, body, schema, type = 'website' }) {
  const ogImage = image ? absPath(image) : absPath('assets/hero-tools.png');
  return `<!doctype html>
<html lang="es-MX">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:site_name" content="KDL">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="${esc(type)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(ogImage)}">
<meta property="og:locale" content="es_MX">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(ogImage)}">
<script type="application/ld+json">${JSON.stringify(schema)}</script>
<style>
*{box-sizing:border-box}body{margin:0;background:#f2f5f9;color:#0e2236;font-family:Arial,system-ui,sans-serif;line-height:1.5}a{color:inherit;text-decoration:none}.top{background:#071b33;color:#fff;border-bottom:1px solid rgba(255,255,255,.08)}.shell{max-width:1120px;margin:auto;padding:0 22px}.nav{min-height:66px;display:flex;align-items:center;justify-content:space-between;gap:24px}.logo{font-weight:900;font-style:italic;font-size:34px;letter-spacing:-2px;white-space:nowrap}.logo span{color:#1fc8e3}.nav-links{display:flex;align-items:center;gap:28px;margin-left:auto}.nav-links a{font-weight:700;color:#d9e7f7;padding:22px 0 16px;border-bottom:3px solid transparent}.nav-links a:hover{color:#fff}.nav-links .active{color:#fff;border-bottom-color:#1fc8e3}.hero{background:linear-gradient(135deg,#071b33,#12375f);color:#fff;padding:42px 0}.hero-grid{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(260px,.8fr);gap:30px;align-items:center}.eyebrow{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#8ddcff;font-weight:800}.h1{font-size:clamp(30px,5vw,52px);line-height:1.03;margin:10px 0 12px;font-weight:900;letter-spacing:-1px}.lead{color:#d9e7f7;font-size:17px;max-width:720px}.media{background:#fff;border-radius:14px;min-height:250px;display:flex;align-items:center;justify-content:center;padding:28px}.media img{max-width:100%;max-height:280px;object-fit:contain}.btns{display:flex;flex-wrap:wrap;gap:12px;margin-top:24px}.btn{display:inline-flex;align-items:center;justify-content:center;border-radius:8px;padding:13px 18px;font-weight:800}.btn-primary{background:#148bff;color:#fff}.btn-whatsapp{background:#25d366;color:#05330f}.section{padding:34px 0}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(235px,1fr));gap:14px}.card{background:#fff;border:1px solid #dfe8f3;border-radius:10px;padding:18px;box-shadow:0 8px 18px rgba(13,35,58,.06)}.card:hover{border-color:#148bff}.card-media{height:118px;display:flex;align-items:center;justify-content:center;margin-bottom:12px}.card-media img{max-width:100%;max-height:110px;object-fit:contain}.muted{color:#5a6b80}.mono{font-size:12px;color:#7e93ac}.list{display:grid;gap:8px;margin:0;padding:0;list-style:none}.list li{background:#fff;border:1px solid #dfe8f3;border-radius:8px;padding:12px 14px}.footer{background:#06121f;color:#9fb1c6;padding:30px 0;margin-top:28px}.footer a{color:#fff}@media(max-width:900px){.nav{align-items:flex-start;flex-direction:column;padding:14px 0}.nav-links{flex-wrap:wrap;gap:16px 22px;margin-left:0}.nav-links a{padding:4px 0 8px}.hero-grid{grid-template-columns:1fr}.media{min-height:190px}.grid{grid-template-columns:1fr}}
</style>
</head>
<body>
<header class="top"><div class="shell nav"><a class="logo" href="${rootRel}index.html">KDL<span>.</span></a><nav class="nav-links"><a href="${rootRel}index.html">Inicio</a><a class="active" href="${rootRel}Productos.dc.html">Productos</a><a href="${rootRel}Soluciones.dc.html">Soluciones</a><a href="${rootRel}Industrias.dc.html">Industrias</a><a href="${rootRel}Servicios.dc.html">Servicios</a><a href="${rootRel}Catalogos.dc.html">Catálogos</a><a href="${rootRel}Contacto.dc.html">Contacto</a></nav></div></header>
${body}
<footer class="footer"><div class="shell"><strong>KDL</strong><br>${PHONE} · <a href="mailto:${EMAIL}">${EMAIL}</a> · Monterrey, N.L.</div></footer>
</body>
</html>`;
}

function writeHtml(file, html) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html, 'utf8');
}

function productSchema(cat, product) {
  const url = cleanProductUrl(cat, product);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Product',
        '@id': `${url}#product`,
        name: product.n,
        description: description(cat, product),
        category: cat.name,
        brand: { '@type': 'Brand', name: cat.brand || 'KDL' },
        image: absPath(product.img || cat.img || 'assets/hero-tools.png'),
        url,
        seller: { '@type': 'LocalBusiness', name: 'KDL', telephone: PHONE, email: EMAIL }
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: absPath('') },
          { '@type': 'ListItem', position: 2, name: 'Productos', item: absPath('productos/') },
          { '@type': 'ListItem', position: 3, name: cat.name, item: cleanCategoryUrl(cat) },
          { '@type': 'ListItem', position: 4, name: product.n, item: url }
        ]
      }
    ]
  };
}

function categorySchema(cat) {
  const url = cleanCategoryUrl(cat);
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${cat.name} | Catalogo KDL`,
    description: cat.intro || '',
    url,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: cat.products.map((product, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: product.n,
        url: cleanProductUrl(cat, product)
      }))
    }
  };
}

function renderProduct(cat, product) {
  const rootRel = '../../../';
  const img = product.img || cat.img || 'assets/hero-tools.png';
  const rel = cat.products.filter((p) => p.slug !== product.slug).slice(0, 6);
  const body = `<main>
<section class="hero"><div class="shell hero-grid"><div><div class="eyebrow">${text(cat.name)}${cat.brand ? ' · ' + text(cat.brand) : ''}</div><h1 class="h1">${text(product.n)}</h1><p class="lead">${text(description(cat, product))}</p><div class="btns"><a class="btn btn-whatsapp" href="${wa(`Hola KDL, quiero cotizar: ${product.n} (${cat.name}). Cantidad / No. de parte / aplicacion: ___`)}">Cotizar por WhatsApp</a><a class="btn btn-primary" href="${rootRel}Producto.dc.html?cat=${encodeURIComponent(cat.key)}&p=${encodeURIComponent(product.slug)}">Ver ficha interactiva</a></div></div><div class="media"><img src="${rootRel}${esc(img)}" alt="${esc(product.n)}" loading="eager" decoding="async"></div></div></section>
<section class="section"><div class="shell"><h2>Datos para cotizar</h2><ul class="list">${(cat.datos || []).map((d) => `<li>${text(d)}</li>`).join('')}</ul></div></section>
<section class="section"><div class="shell"><h2>Productos relacionados</h2><div class="grid">${rel.map((p) => `<a class="card" href="../${p.slug}/"><div class="card-media"><img src="${rootRel}${esc(p.img || cat.img)}" alt="${esc(p.n)}" loading="lazy" decoding="async"></div><strong>${text(p.n)}</strong><div class="mono">${text(p.s)}</div></a>`).join('')}</div></div></section>
</main>`;
  return layout({
    title: `${product.n} | ${cat.name} | KDL`,
    description: description(cat, product),
    canonical: cleanProductUrl(cat, product),
    image: img,
    rootRel,
    body,
    schema: productSchema(cat, product),
    type: 'product'
  });
}

function renderCategory(cat) {
  const rootRel = '../../';
  const body = `<main>
<section class="hero"><div class="shell hero-grid"><div><div class="eyebrow">Catalogo KDL</div><h1 class="h1">${text(cat.name)}</h1><p class="lead">${text(cat.intro || '')}</p><div class="btns"><a class="btn btn-whatsapp" href="${wa(`Hola KDL, quiero cotizar productos de: ${cat.name}.`)}">Cotizar esta categoria</a><a class="btn btn-primary" href="${rootRel}Productos.dc.html?cat=${encodeURIComponent(cat.key)}">Ver catalogo interactivo</a></div></div><div class="media"><img src="${rootRel}${esc(cat.img || 'assets/hero-tools.png')}" alt="${esc(cat.name)}" loading="eager" decoding="async"></div></div></section>
<section class="section"><div class="shell"><h2>Productos de ${text(cat.name)}</h2><div class="grid">${cat.products.map((p) => `<a class="card" href="${p.slug}/"><div class="card-media"><img src="${rootRel}${esc(p.img || cat.img)}" alt="${esc(p.n)}" loading="lazy" decoding="async"></div><strong>${text(p.n)}</strong><div class="mono">${text(p.s)}</div></a>`).join('')}</div></div></section>
</main>`;
  return layout({
    title: `${cat.name} | Catalogo KDL`,
    description: `${cat.intro || ''} Explora productos, datos para cotizar y alternativas compatibles con asesoria KDL.`,
    canonical: cleanCategoryUrl(cat),
    image: cat.img,
    rootRel,
    body,
    schema: categorySchema(cat)
  });
}

function renderIndex(cats) {
  const rootRel = '../';
  const body = `<main>
<section class="hero"><div class="shell"><div class="eyebrow">Catalogo KDL</div><h1 class="h1">Productos y refacciones industriales</h1><p class="lead">Categorias KDL para neumática, hidráulica, sensores, automatización, movimiento lineal, herramientas de corte, refrigeración IQF y suministros.</p><div class="btns"><a class="btn btn-primary" href="${rootRel}Productos.dc.html">Abrir catalogo interactivo</a><a class="btn btn-whatsapp" href="${wa('Hola KDL, quiero cotizar productos del catalogo. ¿Me ayudan a identificar la pieza?')}">Cotizar por WhatsApp</a></div></div></section>
<section class="section"><div class="shell"><div class="grid">${cats.map((cat) => `<a class="card" href="${cat.key}/"><div class="card-media"><img src="${rootRel}${esc(cat.img || 'assets/hero-tools.png')}" alt="${esc(cat.name)}" loading="lazy" decoding="async"></div><strong>${text(cat.name)}</strong><p class="muted">${text(cat.intro || '')}</p><div class="mono">${cat.products.length} productos</div></a>`).join('')}</div></div></section>
</main>`;
  return layout({
    title: 'Productos y refacciones industriales | Catalogo KDL',
    description: 'Catalogo KDL de refacciones industriales por categoria: neumatica, hidraulica, sensores, automatizacion, movimiento lineal, herramientas de corte, IQF y suministros.',
    canonical: absPath('productos/'),
    image: cats[0] && cats[0].img,
    rootRel,
    body,
    schema: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Catalogo KDL',
      url: absPath('productos/'),
      mainEntity: {
        '@type': 'ItemList',
        itemListElement: cats.map((cat, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: cat.name,
          url: cleanCategoryUrl(cat)
        }))
      }
    }
  });
}

function main() {
  const KDL = loadData();
  if (!KDL || !Array.isArray(KDL.cats)) throw new Error('No se pudo cargar KDL.cats');
  const outRoot = path.join(ROOT, 'productos');
  writeHtml(path.join(outRoot, 'index.html'), renderIndex(KDL.cats));
  KDL.cats.forEach((cat) => {
    writeHtml(path.join(outRoot, cat.key, 'index.html'), renderCategory(cat));
    cat.products.forEach((product) => {
      writeHtml(path.join(outRoot, cat.key, product.slug, 'index.html'), renderProduct(cat, product));
    });
  });
  const totalProducts = KDL.cats.reduce((sum, cat) => sum + cat.products.length, 0);
  console.log(`Generated ${KDL.cats.length} category pages and ${totalProducts} product pages.`);
}

main();
