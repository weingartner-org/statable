// Erkundung: Lückenknopf der Karte „Fälle vergleichen“ – Mausklick, Enter, Leertaste, mit Wartezeit und Wiederholung. PORT (Standard 4211).
import { chromium } from '@playwright/test';
import { U, seite } from './erheben1-lib.mjs';
const b = await chromium.launch();
for (const weise of ['maus', 'enter', 'space']) {
  const page = await seite(b);
  await page.goto(U + '#beispiele'); await page.waitForTimeout(1500);
  await page.locator('#t-praktikum').locator('xpath=ancestor::*[.//button[contains(., "Öffnen und üben")]][1]').getByRole('button', { name: /Öffnen und üben/ }).first().click();
  await page.waitForTimeout(2500);
  await page.goto(U + '#blatt/neu'); await page.waitForTimeout(1500);
  await page.getByRole('button', { name: /Fälle vergleichen/ }).first().click(); await page.waitForTimeout(3000);
  const knopf = page.getByRole('button', { name: /Welche Zahlen oder Gruppen/ }).first();
  let ok = 'nein';
  for (let v = 0; v < 3; v++) {
    if (weise === 'maus') await knopf.click(); else { await knopf.focus(); await page.keyboard.press(weise === 'space' ? 'Space' : 'Enter'); }
    await page.waitForTimeout(800);
    if (await knopf.getAttribute('aria-expanded') === 'true') { ok = 'ja, Versuch ' + (v + 1); break; }
  }
  console.log(weise, 'offen:', ok, 'wahl', await page.locator('#wahl').count());
  await page.context().close();
}
await b.close();
