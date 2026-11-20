// Erkundung: Lückenknopf der Karte „Fälle vergleichen“ – öffnet er die Auswahl (#wahl)? PORT (Standard 4211).
import { chromium } from '@playwright/test';
import { U, seite } from './erheben1-lib.mjs';

const b = await chromium.launch();
const page = await seite(b);
await page.goto(U + '#beispiele'); await page.waitForTimeout(1500);
await page.locator('#t-praktikum').locator('xpath=ancestor::*[.//button[contains(., "Öffnen und üben")]][1]').getByRole('button', { name: /Öffnen und üben/ }).first().click();
await page.waitForTimeout(2500);
await page.getByRole('button', { name: 'Rundgang beenden' }).click({ timeout: 3000 }).catch(() => {});
await page.waitForTimeout(500);
await page.goto(U + '#blatt/neu'); await page.waitForTimeout(1200);
await page.getByRole('button', { name: /Fälle vergleichen/ }).first().click(); await page.waitForTimeout(1500);
console.log('URL-A', page.url());
const knopf = page.getByRole('button', { name: /Welche Zahlen oder Gruppen/ }).first();
await knopf.evaluate(e => e.click()); await page.waitForTimeout(1500); console.log("NACH-JS-KLICK", await knopf.getAttribute("aria-expanded"));
console.log('WAHL', await page.locator('#wahl').count(), 'inputs', await page.locator('input[type=checkbox],input[type=radio]').count());
console.log('ARIA-EXP', await knopf.getAttribute('aria-expanded'), await knopf.getAttribute('aria-pressed'));
console.log('HTML', (await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /Welche Zahlen/.test(x.innerText)); return b ? b.parentElement.outerHTML.slice(0, 500) : 'nichts'; })));
const sichtbar = await page.evaluate(() => [...document.querySelectorAll('fieldset legend, .optionen, [role=group]')].map(e => e.tagName + ':' + (e.innerText || '').slice(0, 60)).slice(0, 12));
console.log('GRUPPEN', JSON.stringify(sichtbar));
await b.close();
