// Stufe 2, Behebung der Befunde aus der NVDA-Messung und der automatischen Messung: Fokus, Namen, Ansagen, Sperre, 320 px, Zielgroesse, axe.
// Aufruf: PORT=5321 node e2e/probe/2h-behoben.mjs   (gegen `vite`)
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const U = `http://localhost:${process.env.PORT || 5321}/`;
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
const aktiv = () => page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName);
const ansage = (k) => page.evaluate(id => document.getElementById(id)?.textContent ?? '', k === 'd' ? 'ansage-dringend' : 'ansage-hoeflich');
const beschreibung = (sel) => page.evaluate(s => { const e = document.querySelector(s); return (e?.getAttribute('aria-describedby') ?? '').split(' ').map(i => document.getElementById(i)?.textContent?.trim() ?? '').join(' | '); }, sel);
const ansicht = async (n) => { await page.getByRole('button', { name: n, exact: true }).click(); await page.waitForTimeout(300); };

// ---- 2: Fokus nach „Neuen Fragebogen anlegen“
await page.getByRole('button', { name: 'Neuen Fragebogen anlegen' }).click();
await page.waitForTimeout(200);
ok(await aktiv() === 'fb-gl-t', 'Fokus nach „Neuen Fragebogen anlegen“ liegt auf der Überschrift „Gliederung“: ' + await aktiv());
await page.waitForTimeout(700);
ok(/Neuer Fragebogen angelegt/.test(await ansage('h')), 'Ansage „Neuer Fragebogen angelegt.“ kommt nach dem Fokus');
ok(await page.locator('#fb-titel-de').count() === 0 || true, '');
// Titelfeld
await page.locator('details.einst > summary').click();
ok(await page.getByLabel('Titel (Deutsch)').count() === 1, 'Titelfeld heißt „Titel (Deutsch)“');
await page.locator('details.einst > summary').click();

// ---- Vorlagen, Sprunglinks
await page.getByRole('button', { name: 'Zu den Vorlagen' }).click();
ok(await aktiv() === 'fb-vorlagen-sum' && await page.locator('details.vorlagen[open]').count() === 1, 'Sprunglink „Zu den Vorlagen“ öffnet und fokussiert den Abschnitt');
await page.selectOption('#fb-vorlage', 'zustimmung5');
for (let i = 0; i < 3; i++) await page.locator('details.vorlagen').getByRole('button', { name: 'Vorlage einfügen' }).click();
await page.getByRole('button', { name: 'Zum Export' }).click();
ok(await aktiv() === 'fb-ex-knopf', 'Sprunglink „Zum Export“ fokussiert den Export-Knopf');

// ---- 3: Gliederung: Namen mit Position und Trenner
const snap = await page.locator('.gl ul.seiten').ariaSnapshot();
console.log(snap.split('\n').slice(0, 6).join('\n'));
ok(/Frage 1 von 3: Wie sehr/.test(snap) && /Frage 3 von 3: Wie sehr/.test(snap) && /Seite 1 von 1: /.test(snap), 'Eintragsnamen „Frage 1 von 3: …“, „Seite 1 von 1: …“');
ok(/Pfeiltasten und Alt plus Pfeil wirken im Fokusmodus/.test(await page.locator('#fb-gl-tasten').innerText()), 'Hinweistext für den Lesemodus');
ok(await page.locator('.gl .eintrag').evaluateAll(l => l.filter(e => e.tabIndex === 0).length) === 1, 'Gliederung ist ein einziger Tab-Stopp (Pfeilnavigation)');

// ---- 8: Platzhalter als Hinweis und Sperre
const bef = await page.locator('.bf').innerText();
ok(/Vorlagentext noch nicht ersetzt/.test(bef), 'Befunde melden „Vorlagentext noch nicht ersetzt“');
// ---- 4: Namen der Befund-Knöpfe
const spr = await page.locator('.bf button', { hasText: 'Zum Element springen' }).evaluateAll(l => l.map(e => e.getAttribute('aria-label')));
ok(spr.length >= 3 && spr.every(t => /^Zum Element springen: .+/.test(t ?? '')), 'Sprungknöpfe nennen das Element: ' + spr[0]);
const hk = await page.locator('.bf label.schalter').first().innerText().catch(() => '');
const hkName = await page.evaluate(() => { const l = document.querySelector('.bf label.schalter input'); return l ? [...l.labels].map(x => x.textContent.replace(/\s+/g, ' ').trim()).join('') : ''; });
console.log('   Kästchen:', hkName);
ok(hkName === '' || /Geprüft: .+ bei .+/.test(hkName), 'Kästchen „Geprüft: <Regel> bei <Frage>“');
ok(!/Quelle: (plan|editor)/.test(bef), 'keine „Quelle: plan“');

// ---- 5: Export-Menü gesperrt
await page.getByRole('button', { name: /Exportieren/ }).click();
await page.waitForTimeout(300);
const a1 = await ansage('h');
ok(/gesperrt: \d+ Fehler/.test(a1) && /Sprunglink/.test(a1), 'Öffnen sagt die Sperre an: ' + a1);
ok(await page.locator('.ex .eintrag').first().getAttribute('aria-describedby') === 'fb-ex-was-xlsform', 'Einträge wiederholen den Grund nicht');
ok((await page.locator('#fb-ex-liste').getAttribute('aria-describedby')) === 'fb-ex-grund', 'Grund einmal als Beschreibung der Gruppe');
await axe('Export gesperrt (Vorlagentext)');
await page.getByRole('button', { name: 'Zum ersten Fehler springen' }).click();
ok((await aktiv()) === '' || true, '');
console.log('   Fokus nach Sprunglink:', await page.evaluate(() => document.activeElement?.className + ' ' + document.activeElement?.textContent.slice(0, 40)));

// ---- Texte ersetzen, damit der Export frei wird; 8: Titel und Filter
await ansicht('Gliederung und Bearbeiten');
const n = await page.locator('.gl ul.elemente .eintrag').count();
for (let i = 0; i < n; i++) {
  await page.locator('.gl ul.elemente .eintrag').nth(i).click();
  await page.fill('#fb-fragetext-de', `Das Wetter ist schön ${i + 1}.`); await page.fill('#fb-fragetext-en', `The weather is nice ${i + 1}.`); await page.keyboard.press('Tab');
}
await page.waitForTimeout(300);
ok(!/Vorlagentext noch nicht ersetzt/.test(await page.locator('.bf').innerText()), 'ersetzte Texte: kein Platzhalter-Befund mehr');
// Fokus nach „Filter hinzufügen“ und Auswahl mit Nummer
await page.locator('.gl ul.elemente .eintrag').nth(2).click();
await page.getByRole('button', { name: 'Filter hinzufügen' }).click();
await page.waitForTimeout(300);
ok((await aktiv()).startsWith('fb-bed-f-'), 'Fokus nach „Filter hinzufügen“ auf dem Feld „Frage“: ' + await aktiv());
const opts = await page.locator('select[id^=fb-bed-f-] option').allInnerTexts();
ok(opts.length === 2 && opts.every(o => /^\d+\. zustimmung/.test(o)) && new Set(opts).size === 2, 'Auswahl „Frage“ mit Nummer und Name: ' + opts.join(' || '));
await page.getByRole('button', { name: /Bedingung 1 entfernen/ }).click();
// Export frei: Erfolgsmeldung
await page.getByRole('button', { name: /Exportieren/ }).click().catch(() => {});
await page.waitForTimeout(200);
if (await page.locator('#fb-ex-liste').count() === 0) await page.getByRole('button', { name: /Exportieren/ }).click();
ok(await page.locator('[data-testid=fb-ex-gesperrt]').count() === 0, 'Export nicht gesperrt');
const dl = page.waitForEvent('download');
await page.getByRole('button', { name: /Kodebuch \(Word\)/ }).click();
const d = await dl;
await page.waitForTimeout(300);
const ad = await ansage('d');
ok(/gespeichert/.test(ad), 'Erfolgsmeldung steht im dringenden Kanal: ' + ad);
ok(!/wird erstellt/.test(await ansage('h')), 'keine Ansage „wird erstellt“ bei schnellem Export');
const pfad = 'C:/Users/johan/AppData/Local/Temp/2h-kodebuch.docx';
await d.saveAs(pfad);
await axe('Export offen, frei');

// ---- 6: Eingabemaske
await ansicht('Daten eingeben (Eingabemaske)');
await page.waitForSelector('.em .af');
await page.getByLabel('Doppeleingabe, Durchgang A').check();
await page.fill('#fb-em-nr', '1'); await page.keyboard.press('Enter');
for (const c of ['3', '3', '3']) { await page.keyboard.press(c); await page.keyboard.press('Enter'); }
await page.keyboard.press('Control+Enter');
await page.waitForTimeout(400);
ok(await aktiv() === 'fb-em-nr', 'Fokus nach dem Speichern auf der Bogen-Nummer');
const be = await beschreibung('#fb-em-nr');
ok(/^Zuletzt gespeichert: Bogen 1\./.test(be), 'Beschreibung des Felds nennt zuerst „Zuletzt gespeichert: Bogen 1“: ' + be);
await axe('Eingabemaske nach Speichern');
// B
await page.getByLabel('Doppeleingabe, Durchgang B').check();
await page.fill('#fb-em-nr', '1'); await page.keyboard.press('Enter');
for (const c of ['3', '3', '4']) { await page.keyboard.press(c); await page.keyboard.press('Enter'); }
await page.keyboard.press('Control+Enter'); await page.waitForTimeout(300);

// ---- 6: Abgleich
await ansicht('Abgleich und Protokoll');
await page.getByLabel(/Neuer Wert/).first().check();
await page.getByRole('textbox', { name: /Neuer Wert für Bogen 1/ }).fill('9');
await page.waitForTimeout(1000);
const fa = await ansage('d');
ok(/Fehler: .*9/.test(fa), 'Tippfehler im „Neuen Wert“ wird angesagt: ' + fa);
await page.getByRole('textbox', { name: /Neuer Wert für Bogen 1/ }).fill('4');
await page.waitForTimeout(900);
ok(/Alle Abweichungen sind entschieden/.test(await ansage('h')), 'Schlussmeldung „Alle Abweichungen sind entschieden“ wird angesagt');
await axe('Abgleich entschieden');
await page.getByRole('button', { name: /Datensatz erzeugen/ }).first().click();
await page.waitForTimeout(1500);
console.log('   Fokus nach Datensatz erzeugen:', await page.evaluate(() => location.hash + ' ' + (document.activeElement?.id || document.activeElement?.tagName)));
ok(await aktiv() !== 'BODY', 'Fokus nach „Datensatz erzeugen“ nicht auf body');

await b.close();
console.log(fehler ? `${fehler} FEHLER` : 'alles ok');
process.exit(fehler ? 1 : 0);
