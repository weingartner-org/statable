// Stufe 1, Prüfungen 5 und 6: Lernen (Pfade „Daten erheben“ und „Mixed Methods“, je eine Einheit, eine Frage) und Hilfe-Artikel.
// Aufruf: PORT=4211 node e2e/probe/erheben1-lernen-hilfe.mjs
import { chromium } from '@playwright/test';
import { U, axe, tabDurchlauf, seite, rec, LOG } from './erheben1-lib.mjs';

const b = await chromium.launch();
const page = await seite(b);

// ---------- Prüfung 5: Lernen ----------
await page.goto(U + '#lernen'); await page.waitForTimeout(1500);
rec({ typ: 'schritt', ort: 'Lernen', ok: true, text: 'URL ' + page.url() + '; Überschriften: ' + JSON.stringify((await page.locator('h1,h2,h3').allInnerTexts()).slice(0, 14)) });
await axe(page, 'Lernen', 'Startseite Lernen');

for (const [pfadId, pfadName] of [['erheben', 'Daten erheben'], ['mixed-methods', 'Mixed Methods']]) {
  const ort = 'Lernen: ' + pfadName;
  await page.goto(U + '#lernen/pfad/' + pfadId); await page.waitForTimeout(1500);
  rec({ typ: 'schritt', ort, ok: true, text: 'Pfad geöffnet; URL ' + page.url() + '; Überschriften: ' + JSON.stringify((await page.locator('h1,h2,h3').allInnerTexts()).slice(0, 10)) });
  await axe(page, ort, 'Pfadseite');
  const links = await page.locator('a[href*="#lernen/"]').evaluateAll(xs => xs.map(x => x.getAttribute('href') + ' ' + x.innerText.trim().slice(0, 50)));
  rec({ typ: 'schritt', ort, ok: links.length > 0, text: 'Links zu Einheiten: ' + JSON.stringify(links.slice(0, 8)) });
  // erste Einheit des Pfades über ihren Link
  const einheitId = pfadId === 'erheben' ? 'erheben-methode-waehlen' : 'faelle-fuer-interviews';
  await page.goto(U + '#lernen/' + einheitId + '/1'); await page.waitForTimeout(1800);
  rec({ typ: 'schritt', ort, ok: true, text: 'Einheit ' + einheitId + ' geöffnet; URL ' + page.url() + '; Überschriften: ' + JSON.stringify((await page.locator('h1,h2,h3').allInnerTexts()).slice(0, 6)) });
  rec({ typ: 'schritt', ort, ok: true, text: 'Einheit geöffnet; URL ' + page.url() });
  await axe(page, ort, 'Einheit');
  // eine Frage beantworten: erste Auswahl (Radio oder Kästchen)
  const wahl = page.locator('fieldset input[type=radio], fieldset input[type=checkbox], main input[type=radio]').first();
  if (await wahl.count()) {
    await wahl.check().catch(async () => { await wahl.click().catch(() => {}); }); await page.waitForTimeout(400);
    rec({ typ: 'schritt', ort, ok: true, text: 'erste Antwortmöglichkeit gewählt' });
    const pruef = page.getByRole('button', { name: /Prüfen|Antworten|Auflösen|Überprüfen|Bestätigen|Lösung/ }).first();
    if (await pruef.count()) { await pruef.click().catch(() => {}); await page.waitForTimeout(800); rec({ typ: 'schritt', ort, ok: true, text: 'Antwort geprüft über „' + (await pruef.innerText()).trim() + '“' }); }
    else rec({ typ: 'schritt', ort, ok: false, text: 'kein Prüfen-Knopf nach der Antwort; Knöpfe: ' + JSON.stringify((await page.getByRole('button').allInnerTexts()).filter(x => x.trim()).slice(0, 14)) });
    await axe(page, ort, 'nach Antwort');
    await tabDurchlauf(page, 'main', ort + ' Tab');
  } else rec({ typ: 'schritt', ort, ok: false, text: 'keine Frage mit Auswahl in der Einheit gefunden; Knöpfe: ' + JSON.stringify((await page.getByRole('button').allInnerTexts()).filter(x => x.trim()).slice(0, 12)) });
}

// ---------- Prüfung 6: Hilfe-Artikel ----------
for (const id of ['eh-methode', 'eh-daten-einlesen', 'eh-faelle-interviews', 'eh-meta-inferenz', 'daten-oeffnen', 'frage-faelle']) {
  await page.goto(U + '#hilfe/' + id); await page.waitForTimeout(1300);
  const ort = 'Hilfe #hilfe/' + id;
  const h = await page.locator('h1,h2').first().innerText().catch(() => '(keine Überschrift)');
  rec({ typ: 'schritt', ort, ok: true, text: 'Überschrift: ' + h.replace(/\s+/g, ' ').slice(0, 90) + '; URL ' + page.url() });
  await axe(page, ort, 'Artikel');
  await tabDurchlauf(page, 'main', ort + ' Tab');
}

await b.close();
console.log('FERTIG', LOG.length);
