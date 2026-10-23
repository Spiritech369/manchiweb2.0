import { chromium } from 'file:///C:/Users/spiri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const files = [
  'index.html', 'Productos.dc.html', 'Producto.dc.html?cat=neumatica&p=cilindros-iso-15552',
  'Catalogos.dc.html', 'Compatibilidad.dc.html', 'Cesta.dc.html', 'Soluciones.dc.html',
  'Industrias.dc.html', 'Servicios.dc.html', 'Contacto.dc.html', 'Aviso-Privacidad.html',
];
const viewports = [{ width: 1440, height: 900 }, { width: 768, height: 900 }, { width: 360, height: 800 }];
const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
});
const findings = [];

for (const viewport of viewports) {
  const page = await browser.newPage({ viewport });
  for (const entry of files) {
    const [file, query = ''] = entry.split('?');
    await page.goto(pathToFileURL(path.join(root, file)).href + (query ? `?${query}` : ''), { waitUntil: 'load' });
    await page.waitForTimeout(900);
    const result = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      brokenImages: [...document.images].filter((image) => image.complete && image.naturalWidth === 0).map((image) => image.getAttribute('src')),
      footerLogo: Boolean(document.querySelector('footer .kdl-footer-lockup')),
      whatsappGreen: [...document.querySelectorAll('a[href*="wa.me"]')].every((link) => getComputedStyle(link).backgroundColor === 'rgb(37, 211, 102)'),
    }));
    if (result.overflow || result.brokenImages.length || !result.footerLogo || !result.whatsappGreen) {
      findings.push({ page: entry, width: viewport.width, ...result });
    }
  }
  await page.close();
}
await browser.close();
console.log(JSON.stringify({ checked: files.length * viewports.length, findings }, null, 2));
if (findings.length) process.exitCode = 1;
