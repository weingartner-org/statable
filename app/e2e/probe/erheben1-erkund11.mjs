// Erkundung: Lückenknopf per Tastatur (Fokus + Leertaste) und ohne Rundgang. PORT (Standard 4211).
import { chromium } from '@playwright/test';
import { U, seite } from './erheben1-lib.mjs';
const b = await chromium.launch();
const page = await seite(b);
await page.goto(U + '#beispiele'); await page.waitForTimeout(1500); await page.locator('#t-praktikum').locator('xpath=ancestor::*[.//button[contains(., "Öffnen und üben")]][1]').getByRole('button', { name: /Öffnen und üben/ }).first().click(); await page.waitForTimeout(2500); await page.goto(U + '#blatt/neu'); await page.waitForTimeout(1500);
await page.getByRole('button', { name: /Fälle vergleichen/ }).first().click(); await page.waitForTimeout(1500);
const knopf = page.getByRole('button', { name: /Welche Zahlen oder Gruppen/ }).first();
await knopf.focus(); await page.keyboard.press('Space'); await page.waitForTimeout(1200);
console.log('TASTE-SPACE expanded', await knopf.getAttribute('aria-expanded'), 'wahl', await page.locator('#wahl').count());
await knopf.focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(1200);
console.log('TASTE-ENTER expanded', await knopf.getAttribute('aria-expanded'), 'wahl', await page.locator('#wahl').count());
const info = await page.evaluate(() => { const b = [...document.querySelectorAll('button.luecke')]; return b.map(x => x.getAttribute('aria-expanded') + ' ' + x.isConnected); });
console.log('LUECKEN', JSON.stringify(info));
await b.close();
