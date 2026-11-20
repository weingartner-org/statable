// D9 (07.11.): 3.2.3 Konsistente Navigation (Kopf, Reiterleiste, Fußleiste, Landmarken in gleicher Reihenfolge), 3.2.4 Konsistente Erkennung (gleiche Funktion = gleicher Name), 3.3.7 Redundante Eingabe (Umformen, 3 Schritte).
// Aufruf: PORT=4200 node e2e/probe/d9-konsistenz.mjs
import { chromium } from '@playwright/test';
const U = `http://127.0.0.1:${process.env.PORT || 4200}/`;
const b = await chromium.launch();
const page = await (await b.newContext({ locale: 'de-DE', viewport: { width: 1280, height: 800 } })).newPage();
await page.goto(U + '#beispiele'); await page.waitForTimeout(1500);
await page.getByRole('button', { name: /Öffnen und üben/ }).first().click(); await page.waitForTimeout(2500); await page.keyboard.press('Escape');
const routen = ['daten', 'blatt/neu', 'bericht', 'protokoll', 'befehle', 'karte', 'planen', 'verstehen', 'lernen', 'hilfe', 'einstellungen', 'tabelle', 'amtlich', 'bearbeiten', 'spalten', 'umformen'];
const sammle = () => page.evaluate(() => {
  const namen = (sel) => [...document.querySelectorAll(sel)].filter(e => e.offsetParent !== null || getComputedStyle(e).position === 'fixed').map(e => (e.getAttribute('aria-label') || e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40));
  const lm = [...document.querySelectorAll('header, nav, main, aside, footer, [role=banner], [role=navigation], [role=main], [role=complementary], [role=contentinfo]')].map(e => `${e.tagName.toLowerCase()}:${e.getAttribute('aria-label') || ''}`);
  const k = document.querySelector('header, [role=banner]');
  return { kopf: k ? [...k.querySelectorAll('a, button')].map(e => (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 30)) : [], reiter: namen('.reiter a'), unten: namen('.unten-leiste a'), landmarken: lm };
});
const erg = {};
for (const r of routen) { await page.goto(U + '#' + r); await page.waitForTimeout(1000); erg[r] = await sammle(); }
const ref = erg['daten'];
for (const teil of ['kopf', 'unten', 'landmarken']) {
  const abw = routen.filter(r => JSON.stringify(erg[r][teil]) !== JSON.stringify(ref[teil]));
  console.log('3.2.3', teil, 'gleich wie #daten auf', routen.length - abw.length, 'von', routen.length, abw.length ? 'ABWEICHUNG: ' + abw.join(', ') : '');
  for (const r of abw.slice(0, 3)) console.log('   ', r, JSON.stringify(erg[r][teil]).slice(0, 300), '\n   Referenz', JSON.stringify(ref[teil]).slice(0, 300));
}
// Reiter: alle Routen, auf denen die Reiterleiste steht, haben dieselbe Reihenfolge
const mitReiter = routen.filter(r => erg[r].reiter.length);
const reiterAbw = mitReiter.filter(r => JSON.stringify(erg[r].reiter) !== JSON.stringify(erg[mitReiter[0]].reiter));
console.log('3.2.3 Reiterleiste auf', mitReiter.length, 'Routen vorhanden, Abweichung:', reiterAbw.join(', ') || 'keine', JSON.stringify(erg[mitReiter[0]]?.reiter));
// 3.2.4: Namen gleicher Funktionen: Schließen/Zurück/Export/Hilfe über alle Routen sammeln
const funk = {};
for (const r of routen) {
  const ls = await page.goto(U + '#' + r).then(() => page.waitForTimeout(700)).then(() => page.evaluate(() => [...document.querySelectorAll('button, a')].map(e => (e.getAttribute('aria-label') || e.textContent || '').trim().replace(/\s+/g, ' '))));
  for (const n of ls) { if (/^(Schließen|Abbrechen|Zurück|Weiter|Fertig|Export|Hilfe|Melden|Übernehmen|Speichern|Löschen|Rückgängig|Wiederholen|Close|Cancel|Back|Next|Done|Save|Delete|Undo|Redo)\b/i.test(n)) funk[n.slice(0, 40)] = (funk[n.slice(0, 40)] || new Set()).add(r); }
}
console.log('3.2.4 Namen gleicher Funktionen (Auswahl):', Object.entries(funk).map(([n, s]) => `${n} (${s.size})`).sort().join('; '));
// 3.3.7: Umformen, Schritt 1 -> 2 -> zurück: die Wahl bleibt, nichts wird noch einmal verlangt
await page.goto(U + '#umformen'); await page.waitForTimeout(1200);
await page.locator('label:has(input[name=um-ziel][value=intervalle])').click();
await page.getByRole('button', { name: 'Weiter', exact: true }).click(); await page.waitForTimeout(700);
await page.getByRole('button', { name: /^Vorherig/ }).click(); await page.waitForTimeout(500);
console.log('3.3.7 Umformen: Wahl aus Schritt 1 nach „Vorheriger Schritt“ erhalten:', await page.locator('input[name=um-ziel][value=intervalle]').isChecked());
await b.close();
