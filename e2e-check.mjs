import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

const consoleMessages = [];
const networkErrors = [];
const failedRequests = [];

page.on('console', msg => {
  consoleMessages.push({ type: msg.type(), text: msg.text() });
});

page.on('pageerror', err => {
  networkErrors.push({ type: 'pageerror', message: err.message });
});

page.on('response', response => {
  if (!response.ok() && response.status() !== 304) {
    failedRequests.push({ url: response.url(), status: response.status() });
  }
});

try {
  await page.goto('http://localhost/', { waitUntil: 'networkidle', timeout: 15000 });
} catch (e) {
  console.log('Navigation error:', e.message);
}

const title = await page.title();
const bodyText = await page.evaluate(() => document.body?.innerText?.slice(0, 500) || '');
const bodyHTML = await page.evaluate(() => document.body?.innerHTML?.slice(0, 1000) || '');

await page.screenshot({ path: 'e2e-screenshot.png', fullPage: true });

console.log('\n=== PAGE TITLE ===');
console.log(title);

console.log('\n=== BODY TEXT (first 500 chars) ===');
console.log(bodyText || '(empty)');

console.log('\n=== BODY HTML (first 1000 chars) ===');
console.log(bodyHTML || '(empty)');

console.log('\n=== CONSOLE MESSAGES ===');
consoleMessages.forEach(m => console.log(`[${m.type}] ${m.text}`));

console.log('\n=== PAGE ERRORS ===');
networkErrors.forEach(e => console.log(e.message));

console.log('\n=== FAILED NETWORK REQUESTS ===');
failedRequests.forEach(r => console.log(`${r.status} ${r.url}`));

await browser.close();
