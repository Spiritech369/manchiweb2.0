import { chromium } from 'file:///C:/Users/spiri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'artifacts', 'consolidation');
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
});
const results = {};

async function openPage(page, file, query = '') {
  await page.goto(pathToFileURL(path.join(root, file)).href + query, { waitUntil: 'load' });
  await page.waitForTimeout(1800);
}

const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await openPage(desktop, 'index.html');
results.heroPrimary = await desktop.getByText('Cotizar o enviar referencia', { exact: true }).count();
results.oldHeroUrgent = await desktop.getByText('Cotizar refacción urgente', { exact: true }).count();
results.oldHeroPhoto = await desktop.getByText('Enviar foto o número de parte', { exact: true }).count();
await desktop.screenshot({ path: path.join(out, 'index-desktop.png') });

await desktop.locator('.kdl-category-card').first().click();
await desktop.waitForTimeout(350);
results.modalOpen = await desktop.getByText('Filtrar productos de esta categoría', { exact: true }).count();
const filterButton = desktop.getByRole('button', { name: 'Cilindros', exact: true });
if (await filterButton.count()) await filterButton.click();
await desktop.waitForTimeout(250);
results.modalProductLinks = await desktop.locator('a[href*="Producto.dc.html?cat="]').count();
results.categoryHref = await desktop.getByText('Ver categoría completa', { exact: true }).getAttribute('href');
await desktop.screenshot({ path: path.join(out, 'category-modal-desktop.png') });

await openPage(desktop, 'Catalogos.dc.html');
await desktop.getByRole('button', { name: 'Fichas técnicas', exact: true }).click();
await desktop.waitForTimeout(250);
results.catalogFilteredCount = await desktop.locator('article').count();
results.catalogRequestLabel = await desktop.getByText('Pedir a un asesor', { exact: true }).count();
results.catalogExplainer = await desktop.locator('.kdl-document-explainer').count();
results.footerLogo = await desktop.locator('footer .kdl-footer-lockup').count();
results.footerNavigation = await desktop.locator('footer [data-kdl-footer-nav]').count();
results.whatsAppBackground = await desktop.locator('a[href*="wa.me"]').last().evaluate((el) => getComputedStyle(el).backgroundColor);
await desktop.screenshot({ path: path.join(out, 'catalog-desktop.png') });

await openPage(desktop, 'Producto.dc.html', '?cat=neumatica&p=cilindros-iso-15552');
results.productAddButtons = await desktop.getByText('Añadir a cesta', { exact: true }).count();
results.redundantProductButton = await desktop.getByText('Añadir y revisar cotización', { exact: true }).count();
await desktop.getByText('Añadir a cesta', { exact: true }).click();
await desktop.waitForTimeout(250);
results.cartFeedback = await desktop.getByText('Producto añadido.', { exact: false }).count();

const mobile = await browser.newPage({ viewport: { width: 360, height: 800 } });
await openPage(mobile, 'index.html');
await mobile.locator('#identificador').scrollIntoViewIfNeeded();
await mobile.waitForTimeout(300);
results.mobileOverflow = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
results.identifierButton = await mobile.getByText('Abrir WhatsApp para identificar', { exact: true }).count();
await mobile.screenshot({ path: path.join(out, 'identifier-mobile.png') });
await mobile.locator('footer').scrollIntoViewIfNeeded();
await mobile.waitForTimeout(250);
results.mobileFooterLogo = await mobile.locator('footer .kdl-footer-lockup').count();
await mobile.screenshot({ path: path.join(out, 'footer-mobile.png') });

await browser.close();
console.log(JSON.stringify(results, null, 2));
