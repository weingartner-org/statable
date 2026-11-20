// Erkundung: Baukasten der Karte „Fälle vergleichen“ (Spalten wählen, Fertig). PORT (Standard 4211).
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
const knopf = page.getByRole('button', { name: /Welche Zahlen oder Gruppen/ }).first();
console.log('KNOPF-1', await knopf.count());
await knopf.click(); await page.waitForTimeout(800);
console.log('NACH-KLICK-1 Optionen', JSON.stringify(await page.locator('[role=listbox],[role=dialog],[role=menu],[role=group]').allInnerTexts()).slice(0, 600));
console.log('BTN-A', JSON.stringify((await page.getByRole('button').allInnerTexts()).filter(x => x.trim()).slice(0, 40)));
console.log('CHECK-A', JSON.stringify(await page.getByRole('checkbox').allInnerTexts()), JSON.stringify(await page.getByRole('option').allInnerTexts()).slice(0, 300));
await b.close();
