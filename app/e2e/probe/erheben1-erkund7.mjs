// Erkundung: Wie öffnet man das Blatt „Zahlen und Zitate nebeneinander“ im Beispiel praktikum? PORT (Standard 4211).
import { chromium } from '@playwright/test';
import { U, seite } from './erheben1-lib.mjs';

const b = await chromium.launch();
const page = await seite(b);
await page.goto(U + '#beispiele'); await page.waitForTimeout(1500);
await page.locator('#t-praktikum').locator('xpath=ancestor::*[.//button[contains(., "Öffnen und üben")]][1]').getByRole('button', { name: /Öffnen und üben/ }).first().click();
await page.waitForTimeout(2500);
await page.getByRole('button', { name: 'Rundgang beenden' }).click({ timeout: 3000 }).catch(() => {});
await page.waitForTimeout(500);
console.log('URL', page.url());
console.log('HREF-BLATT', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('a[href*="blatt"],a[href*="#"]')].map(a => a.getAttribute('href') + ' ' + a.innerText.trim().slice(0, 40)).slice(0, 30))));
console.log('ZITATE', await page.getByText('Zahlen und Zitate nebeneinander').count());
const z = page.getByText('Zahlen und Zitate nebeneinander').first();
console.log('ZITATE-TAG', await z.evaluate(e => e.tagName + ' ' + e.className + ' parent=' + e.parentElement.tagName + ' ' + e.parentElement.className));
console.log('AUSSEN', JSON.stringify(await page.evaluate(() => { const e = [...document.querySelectorAll('*')].find(x => x.children.length === 0 && x.textContent.trim() === 'Zahlen und Zitate nebeneinander'); let p = e; const r = []; for (let i = 0; i < 6 && p; i++) { r.push(p.tagName + '.' + String(p.className).slice(0, 40) + (p.getAttribute('href') ? ' href=' + p.getAttribute('href') : '') + (p.getAttribute('data-id') ? ' data-id=' + p.getAttribute('data-id') : '')); p = p.parentElement; } return r; })));
await z.click().catch(e => console.log('KLICK-FEHLER', e.message.slice(0, 100)));
await page.waitForTimeout(1500);
console.log('NACH-URL', page.url(), 'section.faelle', await page.locator('section.faelle').count());
await b.close();
