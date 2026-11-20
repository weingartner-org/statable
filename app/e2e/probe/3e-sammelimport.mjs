// Paket 3E/3G: axe auf „Antworten einlesen (Sammelimport, Rücklaufquote)“ und „Teilnahme-Information und Einwilligung (Datenschutz-Vorlage)“ in „Fragebogen planen“,
// in allen Zuständen (leer ohne Schlüssel, Fehler, Ergebnis mit Tabelle und Rücklauf, ohne Codes, Vorlage-Formular, nach dem Einsetzen), 1280 und 320 Pixel.
// Startet selbst einen Vite-Server (Antworten werden im Browser mit den lib-Funktionen erzeugt). Aufruf in app/:  node e2e/probe/3e-sammelimport.mjs
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';

const APP = fileURLToPath(new URL('../..', import.meta.url));
const server = await createServer({ root: APP, logLevel: 'error', server: { port: Number(process.env.PORT || 4371), host: '127.0.0.1', strictPort: false, watch: null } });   // kein Dateiwächter: im Hauptordner liegen public/webr und dist-* mit sehr vielen Dateien
await server.listen();
const U = `http://127.0.0.1:${server.httpServer.address().port}/#fragebogen`;
const b = await chromium.launch();
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
let verstoesse = 0, fehler = 0;
const ok = (c, was) => { console.log((c ? 'ok    ' : 'FEHLER') + ' ' + was); if (!c) fehler++; };
try {
  const page = await (await b.newContext({ locale: 'de-DE', viewport: { width: 1280, height: 1000 }, acceptDownloads: true })).newPage();
  page.on('pageerror', e => { console.log('Seitenfehler:', e.message); fehler++; });
  await page.goto(U, { timeout: 300000 });   // erster Aufruf übersetzt die ganze App
  await page.getByRole('button', { name: /Neuen Fragebogen anlegen/ }).click();
  await page.waitForSelector('section.sam');

  const pruefe = async (breite, zustand) => {
    await page.setViewportSize({ width: breite, height: 1000 });
    await page.waitForTimeout(300);
    const res = await new AxeBuilder({ page }).include('section.sam').include('section.ds').withTags(TAGS).analyze();
    verstoesse += res.violations.length;
    console.log(`${breite} px, ${zustand}: ${res.violations.length} Verstöße, ${res.incomplete.length} unklar`);
    for (const v of res.violations) console.log('   ', v.id, v.nodes.map(n => n.target.join(' ') + ' | ' + (n.any[0]?.message || n.all[0]?.message || '').slice(0, 120)));
    for (const v of res.incomplete) console.log('    unklar:', v.id, v.nodes.map(n => n.target.join(' ')).join(' ; ').slice(0, 200));
  };
  const alle = async zustand => { for (const w of [1280, 320]) await pruefe(w, zustand); await page.setViewportSize({ width: 1280, height: 1000 }); };

  // ---- Zustand 1: leer, ohne Schlüssel
  await alle('leer, ohne Schlüssel');

  // ---- Fehler: nichts gewählt
  await page.getByRole('button', { name: 'Einlesen', exact: true }).click();
  await page.waitForSelector('#fb-sam-schl-f, #fb-sam-datei-f');
  ok(/Schlüsseldatei|Antwortdateien/.test(await page.locator('.sam .fehl').first().innerText()), 'Fehlermeldung ohne Schlüssel und ohne Dateien');
  ok(await page.evaluate(() => document.activeElement?.id) !== '', 'Fokus auf dem Feld mit Fehler');
  await alle('mit Fehlermeldung');

  // ---- Schlüssel anlegen (bleibt in der Sitzung geöffnet)
  await page.getByRole('button', { name: 'Neues Schlüsselpaar anlegen' }).click();
  await page.fill('#fb-schl-name', 'Probe'); await page.fill('#fb-schl-pw1', 'ein langes passwort 3e'); await page.fill('#fb-schl-pw2', 'ein langes passwort 3e');
  await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Schlüsselpaar erzeugen und Datei speichern' }).click()]);
  await page.check('#fb-schl-gesichert');
  await page.getByRole('button', { name: 'Öffentlichen Schlüssel in den Fragebogen übernehmen' }).click();
  await page.waitForSelector('#fb-schl-pub');

  // ---- Einmal-Codes erzeugen
  await page.locator('#fb-codes-anzahl').fill('5');
  await page.getByRole('button', { name: 'Codes erzeugen' }).click();
  await page.waitForSelector('section.codes table.ct tbody tr');
  await page.getByTestId('fb-sam-schl-status').waitFor();
  ok(true, 'Schlüssel steht in der Sitzung; Sammelimport nimmt ihn (kein Dateifeld mehr: ' + (await page.locator('#fb-sam-schl').count() === 0) + ')');

  // ---- Antworten im Browser erzeugen (mit den lib-Funktionen des Servers)
  const material = await page.evaluate(async () => {
    const { verschluesseleAntwort } = await import('/src/lib/antwortsatz.ts');
    const { aktuellerPlan } = await import('/src/lib/fragebogen-editor.svelte.ts');
    const plan = aktuellerPlan();
    const codes = plan.codes.map(c => c.code);
    const satz = (code, id) => ({ format: 'statable-antwort', version: 1, plan: { id: plan.id, revision: plan.revision }, antwortId: id ?? crypto.randomUUID(), ...(code ? { code } : {}), werte: {} });
    const gleich = satz(codes[0]);
    const bin = async s => Array.from(await verschluesseleAntwort(s, plan.empfaenger.schluessel, 'binaer'));
    const txt = s => verschluesseleAntwort(s, plan.empfaenger.schluessel, 'text');
    return {
      a1: await bin(gleich), a1nochmal: await bin(gleich),
      block1: await txt(satz(codes[1])), block2: await txt(satz(codes[1])), block3: await txt(satz(null)), block4: await txt(satz('ZZZZ-ZZZZ')),
      block5: await txt(satz(codes[2], '00000000-0000-4000-8000-000000000001')), plan: { id: plan.id }, codes,
    };
  });
  const datei = (name, text) => ({ name, mimeType: 'text/plain', buffer: Buffer.from(text, 'utf8') });
  await page.setInputFiles('#fb-sam-datei', [
    { name: 'a1.age', mimeType: 'application/octet-stream', buffer: Buffer.from(material.a1) },
    { name: 'a1-nochmal.age', mimeType: 'application/octet-stream', buffer: Buffer.from(material.a1nochmal) },
    datei('sicherung.txt', `Hallo\n${material.block1}\n\n${material.block2}\n\n${material.block3}\n`),
    datei('brief.txt', 'Das ist keine Antwort.'),
  ]);
  await page.fill('#fb-sam-text', `${material.block4}\n\n${material.block5}`);
  await page.fill('#fb-sam-grenze', '80');
  await alle('mit Auswahl, vor dem Einlesen');

  // ---- Einlesen
  await page.getByRole('button', { name: 'Einlesen', exact: true }).click();
  await page.waitForSelector('#fb-sam-ergebnis-t');
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => document.activeElement?.id) === 'fb-sam-ergebnis-t', 'Fokus liegt nach „Einlesen“ auf der Ergebnis-Überschrift');
  const tab = await page.locator('.sam table.ct').innerText();
  console.log(tab.split('\n').map(z => '   | ' + z).join('\n'));
  const zahl = async z => (await page.locator('.sam table.ct tbody tr', { hasText: z }).count());
  ok(await page.locator('.sam table.ct caption').count() === 1 && await page.locator('.sam table.ct thead th[scope="col"]').count() === 4, 'Tabelle mit caption und vier Spaltenköpfen (scope=col)');
  ok(await zahl('doppelt (nicht übernommen)') === 1, 'eine Zeile „doppelt“');
  ok(await zahl('Code mehrfach benutzt') === 1, 'eine Zeile „Code mehrfach benutzt“');
  ok(await zahl('ohne Code') === 1, 'eine Zeile „ohne Code“');
  ok(await zahl('unbekannter Code') === 1, 'eine Zeile „unbekannter Code“');
  ok(await zahl('keine verschlüsselte Antwort') === 1, 'eine Zeile „keine verschlüsselte Antwort“ (brief.txt)');
  ok(/Einmal-Codes: 5/.test(await page.locator('#fb-sam-rl-t').locator('xpath=following-sibling::p[1]').innerText()), 'Rücklauf mit Codes zeigt Zahlen');
  ok(/RR1 = I/.test(await page.getByTestId('fb-sam-rr1').innerText()) && /RR2 = \(I \+ P\)/.test(await page.getByTestId('fb-sam-rr2').innerText()), 'RR1 und RR2 mit Formel als Text');
  console.log('   RR1:', (await page.getByTestId('fb-sam-rr1').innerText()), '| RR2:', (await page.getByTestId('fb-sam-rr2').innerText()));
  await alle('Ergebnis mit Codes');

  // ---- Haken abwählen ändert die Zahl der übernommenen
  const vorher = await page.getByTestId('fb-sam-summe').innerText();
  await page.locator('.sam table.ct tbody tr', { hasText: 'ohne Code' }).locator('input[type=checkbox]').uncheck();
  const nachher = await page.getByTestId('fb-sam-summe').innerText();
  ok(vorher !== nachher, `Abwählen ändert die Summe („${vorher}“ → „${nachher}“)`);
  await alle('nach Abwählen');

  // ---- Protokoll: Text und Word laden
  const [dt] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Protokoll als Text' }).click()]);
  ok(dt.suggestedFilename().endsWith('.txt'), 'Protokoll als Text: ' + dt.suggestedFilename());
  const [dw] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Protokoll als Word-Datei' }).click()]);
  ok(dw.suggestedFilename().endsWith('.docx'), 'Protokoll als Word: ' + dw.suggestedFilename());

  // ---- ohne Codes: Codeliste löschen (neuer Plan) - keine Quote
  await page.getByRole('button', { name: 'Liste löschen' }).click();
  await page.getByRole('button', { name: 'Liste löschen' }).last().click().catch(() => {});
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Einlesen', exact: true }).click();
  await page.waitForSelector('#fb-sam-rl-t');
  await page.waitForTimeout(500);
  const rl = await page.locator('section.sam .ergebnis').innerText();
  ok(/Zahl der eingegangenen Antworten/.test(rl) && /keine Rücklaufquote/.test(rl) && /selbstgewählte Stichprobe/.test(rl) && !/RR1 =/.test(rl), 'ohne Codes: nur Zahl der Antworten, Satz „keine Rücklaufquote“, selbstgewählte Stichprobe, kein RR1');
  await alle('Ergebnis ohne Codes');

  // ---- Datenschutz-Vorlage
  await page.getByRole('button', { name: 'Vorlage Teilnahme-Information einsetzen' }).click();
  await page.waitForSelector('#fb-ds-form');
  await alle('Vorlage-Formular offen');
  await page.fill('#fb-ds-dauer', 'abc');
  await page.getByRole('button', { name: 'Texte in den Fragebogen einsetzen' }).click();
  await page.waitForSelector('#fb-ds-fehler');
  ok(await page.locator('#fb-ds-dauer').getAttribute('aria-describedby') === 'fb-ds-fehler', 'Dauer-Fehler hängt per aria-describedby am Feld');
  await alle('Vorlage-Formular mit Fehler');
  await page.fill('#fb-ds-dauer', '10');
  await page.fill('#fb-ds-zweck', 'Wie zufrieden sind Studierende mit dem Seminar?');
  await page.getByRole('button', { name: 'Texte in den Fragebogen einsetzen' }).click();
  await page.waitForSelector('[data-testid="fb-ds-offen"]');
  const offen = await page.getByTestId('fb-ds-offen').innerText();
  ok(/eckigen Klammern/.test(offen), 'Hinweis auf offene Platzhalter: ' + offen.split('\n')[0]);
  ok(await page.getByTestId('fb-ds-keine-rechtsberatung').count() === 1, 'Satz „keine Rechtsberatung“ steht da');
  await alle('nach dem Einsetzen');
  const [dd] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Als Word speichern' }).click()]);
  ok(dd.suggestedFilename().endsWith('.docx'), 'Teilnahme-Information als Word: ' + dd.suggestedFilename());
  // zweites Einsetzen fragt zurück
  await page.getByRole('button', { name: 'Texte in den Fragebogen einsetzen' }).click();
  await page.waitForTimeout(300);
  ok(await page.getByText('Vorhandene Texte ersetzen?').count() > 0, 'zweites Einsetzen: Rückfrage');
} finally {
  await b.close();
  await server.close();
}
console.log(verstoesse || fehler ? `${verstoesse} Verstöße, ${fehler} Fehler` : 'alles ok: 0 Verstöße');
process.exit(verstoesse || fehler ? 1 : 0);
