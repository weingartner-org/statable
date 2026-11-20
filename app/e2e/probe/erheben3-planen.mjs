// Stufe 3, Prüfung 1 und 2 (Teil „Fragebogen planen“): Zustände der Seite #fragebogen, 1280 und 320 px (axe, Überlauf, Zielgröße 24 px),
// Kontrastmodus (forced-colors) mit Namen- und Tab-Prüfung, dazu die Word-Dateien (Codeliste, Teilnahme-Information, Sammelimport-Protokoll) im Temp-Ordner.
// Ein Sammelimport-Ergebnis entsteht echt: Antworten werden mit dem öffentlichen Schlüssel des Plans per `age` verschlüsselt (age.exe).
// Aufruf in app/:  BASIS=http://localhost:4231 node e2e/probe/erheben3-planen.mjs
import { chromium } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join, delimiter } from 'node:path';
import { BASIS, axeSeite, zielgroesse, kontrastmodus, keinUeberlauf, tabWalk, neueSeite, rec, LOG } from './erheben3-lib.mjs';

const OUT = join(tmpdir(), 'erheben3'); mkdirSync(OUT, { recursive: true });
const AGE_DIR = process.env.AGE_DIR ?? join(homedir(), 'AppData', 'Local', 'Microsoft', 'WinGet', 'Packages', 'FiloSottile.age_Microsoft.Winget.Source_8wekyb3d8bbwe', 'age');
const age = (args, input) => spawnSync(join(AGE_DIR, 'age.exe'), args, { input, env: { ...process.env, PATH: `${AGE_DIR}${delimiter}${process.env.PATH}` }, maxBuffer: 1 << 26 });
const U = BASIS + '/#fragebogen';
const b = await chromium.launch();
const ergebnisse = [];

/** Ein Lauf durch alle Zustände. `modus` = 'normal' oder 'kontrast'. */
async function lauf(modus) {
  const extra = modus === 'kontrast' ? { forcedColors: 'active' } : {};
  const { ctx, page } = await neueSeite(b, { breitePx: 1280, hoehePx: 900, extra });
  await page.goto(U); await page.waitForSelector('h1');
  const zustand = async (name, { tab = false, nurSeite = false } = {}) => {
    await page.waitForTimeout(400);
    if (modus === 'kontrast') {
      await axeSeite(page, name, 'Kontrastmodus 1280');
      await kontrastmodus(page, name);
      if (tab) await tabWalk(page, 'body', name);
      return;
    }
    await axeSeite(page, name, '1280 px');
    await keinUeberlauf(page, name + ' 1280');
    await zielgroesse(page, name + ' 1280', 24);
    if (tab) await tabWalk(page, 'body', name + ' 1280');
    await page.setViewportSize({ width: 320, height: 800 }); await page.waitForTimeout(400);
    await axeSeite(page, name, '320 px');
    await keinUeberlauf(page, name + ' 320');
    await zielgroesse(page, name + ' 320', 24);
    await page.setViewportSize({ width: 1280, height: 900 }); await page.waitForTimeout(300);
  };
  const schliesseMenue = async () => { await page.keyboard.press('Escape'); await page.waitForTimeout(200); };

  // ---- Phase A: ohne Schlüssel
  await zustand('leer (vor dem Anlegen)');
  await page.getByRole('button', { name: /Neuen Fragebogen anlegen/ }).click();
  await page.waitForSelector('#fb-schl-t');
  await page.getByRole('button', { name: 'Neues Schlüsselpaar anlegen' }).click();
  await page.waitForSelector('#fb-schl-name');
  await zustand('Schlüssel: anlegen (offen)', { tab: modus === 'kontrast' });

  await page.getByRole('button', { name: /Exportieren \(Dateiformate\)/ }).click();
  await zustand('Export-Menü gesperrt (ohne Schlüssel)', { tab: modus === 'kontrast' });
  if (modus === 'normal') {
    const gesperrt = await page.getByTestId('fb-versand-datei').getAttribute('aria-disabled');
    rec({ typ: 'befund', ort: 'Export gesperrt', was: 'Knopf „Zum Verschicken“ aria-disabled', wert: gesperrt });
  }
  await schliesseMenue();

  await page.locator('section.codes').scrollIntoViewIfNeeded();
  await zustand('Einmal-Codes leer', { tab: false });
  await page.locator('section.rt').scrollIntoViewIfNeeded();
  await zustand('Rahmentexte (Einleitung, Einwilligung, Abschluss)');
  await page.locator('section.ds').scrollIntoViewIfNeeded();
  await zustand('Datenschutz-Vorlage (Teilnahme-Information)');
  if (modus === 'normal') {
    try {
      // Der Knopf „Als Word speichern“ steht im Formular, das erst aufklappt (Probenfehler in der ersten Messung: Das Formular war zu).
      const auf = page.locator('section.ds').getByRole('button', { name: /Vorlage Teilnahme-Information einsetzen|Insert participant information template/ }).first();
      if ((await auf.getAttribute('aria-expanded')) !== 'true') await auf.click();
      const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), page.locator('section.ds').getByRole('button', { name: /Als Word speichern|Save as Word/ }).click()]);
      const pfad = join(OUT, 'teilnahme-de.docx'); await dl.saveAs(pfad); rec({ typ: 'datei', was: 'Teilnahme-Information (de)', pfad, name: dl.suggestedFilename() });
    } catch (e) { rec({ typ: 'befund', was: 'Fehlertext Teilnahme', meldung: String(e.message).slice(0, 160) }); rec({ typ: 'befund', was: 'Teilnahme-Word (de) kein Download', meldung: await page.evaluate(() => [...document.querySelectorAll('[role=status], [role=alert], .nur-vorleser, .fehl')].map(z => z.textContent.trim()).filter(Boolean).slice(0, 4)) }); }
  }
  await page.locator('section.sam').scrollIntoViewIfNeeded();
  await zustand('Sammelimport: leer', { tab: true });
  await page.getByRole('button', { name: 'Einlesen', exact: true }).click();
  await page.waitForSelector('#fb-sam-datei-f, #fb-sam-schl-f, .sam .fehl', { timeout: 5000 }).catch(() => {});
  await zustand('Sammelimport: Fehlermeldung');

  // ---- Phase B: Schlüssel erzeugen und übernehmen
  await page.fill('#fb-schl-name', 'Probe Erheben 3'); await page.fill('#fb-schl-pw1', 'ein langes passwort 3 probe'); await page.fill('#fb-schl-pw2', 'ein langes passwort 3 probe');
  const [dlk] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Schlüsselpaar erzeugen und Datei speichern' }).click()]);
  await dlk.saveAs(join(OUT, 'probe.statable-schluessel'));
  await page.check('#fb-schl-gesichert');
  await page.getByRole('button', { name: 'Öffentlichen Schlüssel in den Fragebogen übernehmen' }).click();
  await page.waitForSelector('#fb-schl-pub');
  const pub = await page.inputValue('#fb-schl-pub');
  rec({ typ: 'befund', was: 'öffentlicher Schlüssel übernommen', wert: pub.slice(0, 12) + '…' });

  await page.getByRole('button', { name: /Exportieren \(Dateiformate\)/ }).click();
  await page.waitForTimeout(300);
  await zustand('Export-Menü frei (mit Schlüssel)', { tab: modus === 'kontrast' });
  if (modus === 'normal') {
    await page.getByTestId('fb-versand-link').click();
    await page.getByTestId('fb-link-feld').waitFor();
    await zustand('Export-Menü mit erzeugtem Link');
  }
  await schliesseMenue();
  if (modus === 'normal') {
    // Fragebogen-Datei für die Ausfüllseite und den Sammelimport (Plan-Kennung, Revision)
    await page.getByRole('button', { name: /Exportieren \(Dateiformate\)/ }).click();
    const [dlf] = await Promise.all([page.waitForEvent('download'), page.getByTestId('fb-versand-datei').click()]);
    const fbPfad = join(OUT, 'fragebogen-datei.html'); await dlf.saveAs(fbPfad);
    await schliesseMenue();
    const html = readFileSync(fbPfad, 'utf8');
    const m = /<script type="application\/json" id="statable-plan">([\s\S]*?)<\/script>/.exec(html);
    const plan = m ? JSON.parse(m[1]) : null;
    rec({ typ: 'datei', was: 'Fragebogen-Datei (HTML)', pfad: fbPfad, plan_gelesen: !!plan });
    globalThis.PLAN = plan;
    const planId = plan?.id, rev = plan?.revision ?? 1;
  }
  await page.locator('#fb-codes-anzahl').fill('5');
  await page.locator('section.codes').getByRole('button', { name: 'Codes erzeugen' }).click();
  await page.waitForSelector('section.codes table.ct tbody tr');
  await page.locator('section.codes').scrollIntoViewIfNeeded();
  await zustand('Einmal-Codes mit Codes');
  const codesText = await page.locator('section.codes').innerText();
  const codes = [...codesText.matchAll(/[A-Z0-9]{4}-[A-Z0-9]{4}/g)].map(x => x[0]);
  if (modus === 'normal') {
    const [dlc] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), page.locator('section.codes').getByRole('button', { name: /Liste als Word/ }).click()]);
    const pf = join(OUT, 'codeliste.docx'); await dlc.saveAs(pf); rec({ typ: 'datei', was: 'Codeliste (Word)', pfad: pf, name: dlc.suggestedFilename() });
  }

  // ---- Sammelimport mit Ergebnis (mit und ohne Code)
  if (modus === 'normal' && globalThis.PLAN) {
    const planId = globalThis.PLAN.id, rev = globalThis.PLAN.revision ?? 1;
    const satz = (code) => JSON.stringify({ format: 'statable-antwort', version: 1, plan: { id: planId, revision: rev }, antwortId: crypto.randomUUID(), ...(code ? { code } : {}), werte: {} });
    const verschl = s => age(['-a', '-r', pub], s + '\n').stdout.toString('utf8');
    const text = [verschl(satz(codes[0])), verschl(satz(null)), verschl(satz('ZZZZ-ZZZZ'))].join('\n');
    await page.locator('#fb-sam-text').fill(text);
    await page.getByRole('button', { name: 'Einlesen', exact: true }).click();
    await page.waitForSelector('#fb-sam-ergebnis-t', { timeout: 15000 }).catch(() => {});
    await page.locator('#fb-sam-ergebnis-t').scrollIntoViewIfNeeded().catch(() => {});
    await zustand('Sammelimport: Ergebnis (mit und ohne Code)', { tab: true });
    const [dls] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Protokoll als Word/ }).click()]);
    const pfs = join(OUT, 'sammelimport-protokoll.docx'); await dls.saveAs(pfs); rec({ typ: 'datei', was: 'Sammelimport-Protokoll (Word)', pfad: pfs, name: dls.suggestedFilename() });
  }
  await ctx.close();
}

// Lauf 1: normaler Kontrast (axe, Überlauf, Zielgröße, Dateien); Lauf 2: Kontrastmodus
await lauf('normal');
await lauf('kontrast');
await b.close();
const fehler = LOG.filter(z => z.typ === 'seitenfehler').length;
console.log('ENDE planen; Seitenfehler:', fehler);
