// Paket 2F: Eingabemaske und Abgleich im echten Chromium. Tastatur-Ablauf (Code tippen, Enter, Strg+Enter), Blindheit von Durchgang B, Abgleich, axe.
// Aufruf: PORT=5299 node e2e/probe/2f-eingabe.mjs   (gegen `vite` oder `vite preview`)
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const U = `http://localhost:${process.env.PORT || 5299}/`;
let fehler = 0;
const ok = (b, was) => { console.log((b ? 'ok    ' : 'FEHLER') + ' ' + was); if (!b) fehler++; };
const b = await chromium.launch();
const ctx = await b.newContext({ locale: 'de-DE', viewport: { width: 1400, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
page.on('pageerror', e => { console.log('pageerror', e.message); fehler++; });
await page.goto(U + '#fragebogen'); await page.waitForSelector('h1');
const axe = async (name) => {
  await page.waitForTimeout(600);
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  ok(r.violations.length === 0, `axe ${name}: ${r.violations.map(v => v.id + ' ' + v.nodes.map(n => n.target.join(' ')).join('|')).join('; ') || '0 Verstöße'}`);
};

// ---- Plan: drei Likert-Fragen aus der Vorlage
await page.getByRole('button', { name: 'Neuen Fragebogen anlegen' }).click();
await page.getByText('Vorlage einfügen').first().click();
await page.selectOption('#fb-vorlage', 'zustimmung5');
for (let i = 0; i < 3; i++) await page.locator('details.vorlagen').getByRole('button', { name: 'Vorlage einfügen' }).click();

// ---- Eingabemaske
await page.getByRole('button', { name: 'Daten eingeben (Eingabemaske)' }).click();
await page.waitForSelector('.em .af');
await axe('Eingabemaske leer');
ok(await page.locator('.em .af [data-frage]').count() === 3, 'drei Fragen in der Maske');
ok(/1 = /.test(await page.locator('.em .af label.opt').first().innerText()), 'Optionen zeigen den Code („1 = …“)');
await page.getByLabel('Doppeleingabe, Durchgang A').check();
await page.fill('#fb-em-nr', '1');
await page.keyboard.press('Enter');
ok(await page.evaluate(() => !!document.activeElement?.closest('[data-frage]')), 'Enter in der Bogen-Nummer springt in die erste Frage');
await page.keyboard.press('3');
ok(await page.locator('.em .af [data-frage]').nth(0).locator('input:checked').getAttribute('value') === '3', 'Code 3 getippt wählt die Option 3');
await page.waitForTimeout(100);
const wl = await page.locator('.em .af .wertelabel').first().innerText();
ok(/Gewählt: 3 = /.test(wl), 'Wertelabel neben dem Feld: ' + wl);
ok(await page.evaluate(() => { const fs = document.querySelector('.em .af [data-frage] fieldset'); const p = fs?.querySelector('.wertelabel'); return !!p && (fs.getAttribute('aria-describedby') ?? '').split(' ').includes(p.id); }), 'Wertelabel hängt per aria-describedby an der Frage');
await page.keyboard.press('Enter');
await page.keyboard.press('7');
await page.waitForTimeout(100);
ok(/Code „7“/.test(await page.locator('.em .af .fehlertext').first().innerText()), 'unbekannter Code 7 ist ein Fehler an der Frage');
await axe('Eingabemaske mit Fehler');
await page.keyboard.press('2');
ok(await page.locator('.em .af .fehlertext').count() === 0, 'Fehler verschwindet, sobald ein gültiger Code gewählt ist');
await page.keyboard.press('Enter'); await page.keyboard.press('4');
await page.keyboard.press('Control+Enter');
await page.waitForTimeout(300);
ok(await page.locator('table.bt tbody tr').count() === 1, 'Strg+Enter speichert den Bogen (Liste: 1 Bogen)');
ok(await page.inputValue('#fb-em-nr') === '2' && await page.evaluate(() => document.activeElement?.id === 'fb-em-nr'), 'Fokus auf der Bogen-Nummer des nächsten Bogens (Vorschlag 2)');
ok(await page.locator('.em .af [data-frage] input:checked').count() === 0, 'die Maske ist leer für den nächsten Bogen');
// Bogen 2 und 3
for (const [nr, w] of [['2', ['1', '1', '1']], ['3', ['5', '5', '5']]]) {
  await page.fill('#fb-em-nr', nr); await page.keyboard.press('Enter');
  for (const c of w) { await page.keyboard.press(c); await page.keyboard.press('Enter'); }
  await page.keyboard.press('Control+Enter'); await page.waitForTimeout(250);
}
ok(await page.locator('table.bt tbody tr').count() === 3, 'drei Bögen in Durchgang A');
// doppelte Nummer
await page.fill('#fb-em-nr', '2'); await page.keyboard.press('Enter'); await page.keyboard.press('Control+Enter'); await page.waitForTimeout(200);
ok(/gibt es in diesem Durchgang schon/.test(await page.locator('#fb-em-nr-f').innerText()), 'doppelte Bogen-Nummer wird abgewiesen');
await axe('Eingabemaske mit Liste und Nummernfehler');

// ---- Durchgang B ist blind
await page.getByLabel('Doppeleingabe, Durchgang B').check();
ok(await page.locator('table.bt').count() === 0, 'Durchgang B zeigt keine Bögen aus A');
for (const [nr, w] of [['1', ['3', '2', '3']], ['2', ['1', '1', '1']]]) {   // Bogen 1: dritte Antwort 3 statt 4; Bogen 3 fehlt in B
  await page.fill('#fb-em-nr', nr); await page.keyboard.press('Enter');
  for (const c of w) { await page.keyboard.press(c); await page.keyboard.press('Enter'); }
  await page.keyboard.press('Control+Enter'); await page.waitForTimeout(250);
}
ok(await page.locator('table.bt tbody tr').count() === 2, 'zwei Bögen in Durchgang B');

// ---- Abgleich
await page.getByRole('button', { name: 'Abgleich und Protokoll' }).click();
await page.waitForSelector('table.abw');
ok(await page.locator('table.abw').first().locator('tbody tr').count() === 1, 'eine Abweichung in der Tabelle');
ok(await page.locator('table.abw th[scope=col]').count() >= 5, 'Tabellen mit th scope=col');
await axe('Abgleich (offen)');
ok(await page.getByRole('button', { name: 'Datensatz erzeugen' }).getAttribute('aria-disabled') === 'true', 'Datensatz erzeugen ist gesperrt, solange eine Abweichung offen ist');
await page.getByRole('group', { name: /Entscheidung für Bogen 1/ }).getByLabel('Neuer Wert').check();
await page.getByRole('group', { name: /Entscheidung für Bogen 1/ }).locator('input[type=text]').fill('9');
ok(await page.locator('.fehlertext').count() === 1, 'neuer Wert 9 ist kein gültiger Code (Fehler)');
await page.getByRole('group', { name: /Entscheidung für Bogen 1/ }).locator('input[type=text]').fill('4');
await axe('Abgleich (mit neuem Wert)');
// Bogen 3 nur in A: ausdrücklich übernehmen
await page.getByLabel('Nur einfach erfasst übernehmen').check();
ok(/1 Bogen wurde nur in einem Durchgang/.test(await page.locator('blockquote.satz').innerText()) && /ausdrücklich als einfach erfasst/.test(await page.locator('blockquote.satz').innerText()), 'Protokolltext nennt Bogen nur in einem Durchgang und die einfache Übernahme');
ok(/2 Bögen/.test(await page.locator('blockquote.satz').innerText()) && /1 mit neuem Wert/.test(await page.locator('blockquote.satz').innerText()), 'Protokolltext: 2 Bögen, 1 mit neuem Wert');
await axe('Abgleich (fertig mit Protokoll)');
const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Protokoll als Word-Datei' }).click()]);
ok(/\.docx$/.test(dl.suggestedFilename()), 'Word-Protokoll heruntergeladen');
await page.getByRole('button', { name: 'Datensatz erzeugen' }).click();
await page.waitForFunction(() => /Datensatz erzeugt/.test(document.body.innerText), null, { timeout: 30000 }).catch(() => {});
ok(/Datensatz erzeugt/.test(await page.evaluate(() => document.body.innerText)), 'Datensatz wurde erzeugt (Meldung)');
console.log(fehler ? `${fehler} FEHLER` : 'alles ok');
await b.close();
process.exit(fehler ? 1 : 0);
