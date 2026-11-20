// Barrierefreiheit Ausbau A4 (Spaltensätze, „Folgetext verdecken“) im echten Browser: axe-core WCAG 2.2 AA in jedem Zustand,
// 320 px ohne waagrechtes Scrollen, Ablauf nur mit Tastatur (Prüfplan Ausbau A-B13, A-B14, Ablauf A4):
//  1. Ausschnitt wählen: Spaltensatz-Gruppe und Schalter sichtbar; IPA wählen; anlegen (Knopf heißt „Sequenzanalyse anlegen“)
//  2. Einteilen, Deuten: Karte zeigt Beschreibend/Sprachlich/Begrifflich; eine Notiz je Schicht; nichts Späteres im DOM (B1)
//  3. Eigenen Spaltensatz mit zwei Spalten anlegen (eine mit Lesarten), Spalte verschieben, speichern, wählen; Analyse anlegen, deuten
//  4. Folgetext verdecken aus: ganzer Ausschnitt beim Deuten sichtbar
// Aufruf aus app/:  PORT=5194 node e2e/probe/bf-ausbau-a4-sequenz.mjs   (Dev-Server auf 127.0.0.1). Rohdaten: docs/ausbau/bf-a4/axe-sequenz.json
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { APP, BASIS, bereit, grenzenWoerter, axeLauf, ueberbreite } from './feinstruktur-f3b1-lib.mjs';

const OUT_DIR = path.resolve(APP, '../docs/ausbau/bf-a4');
const erg = { zeitpunkt: new Date().toISOString(), url: BASIS, browser: 'chromium headless', zustaende: [], breite320: [], schritte: [], fehler: [] };

async function axe(page, name) {
  const r = await axeLauf(page);
  const eigene = await page.evaluate((v) => v.flatMap((x) => x.knoten.filter((k) => { try { return !!document.querySelector(k.ziel)?.closest('.fe-satz, .karte, .fe, .ganz'); } catch { return false; } }).map((k) => `${x.id} ${k.ziel}`)), r.verstoesse);
  erg.zustaende.push({ name, regeln: r.verstoesse.length, eigene, verstoesse: r.verstoesse });
  console.log(`[${name}] Verstoß-Regeln: ${r.verstoesse.length}, davon im Arbeitsplatz: ${eigene.length}`);
  for (const v of r.verstoesse) console.log(`    ${v.id} (${v.impact}): ${v.knoten.map((k) => k.ziel).join(' ; ').slice(0, 200)}`);
}
async function schritt(name, fn) {
  try { await fn(); erg.schritte.push({ name, ok: true }); console.log(`OK    ${name}`); }
  catch (e) { erg.schritte.push({ name, ok: false, fehler: String(e.message || e).slice(0, 400) }); erg.fehler.push(name); console.log(`FEHLER ${name}: ${String(e.message || e).slice(0, 300)}`); }
}
const pruefe = (b, t) => { if (!b) throw new Error(t); };
const titel = (page, re) => page.getByRole('heading', { level: 2, name: re }).waitFor({ timeout: 30000 });
/** Ausschnitt-Seite öffnen (Beitrag der befragten Person bis +2) */
async function ausschnitt(page, name) {
  await page.getByRole('button', { name: /^Feinstrukturanalyse beginnen: / }).first().click({ timeout: 60000 });
  await titel(page, 'Ausschnitt für die Feinstrukturanalyse wählen');
  await page.locator('#fe-aus-name').fill(name);
  const v = Number(await page.locator('#fe-aus-von').inputValue());
  const n = await page.locator('#fe-aus-bis option').count();
  await page.locator('#fe-aus-bis').selectOption({ index: Math.min(n - 1, v + 2) });
}
/** Ganzes HTML ohne style/script */
const alles = (page) => page.evaluate(() => { const k = document.documentElement.cloneNode(true); k.querySelectorAll('style,script').forEach((e) => e.remove()); return k.outerHTML; });
/** Wörter (ab 6 Buchstaben), die nur in späteren Einheiten vorkommen und doch im DOM stehen */
async function vorausgelesen(page, einheiten, k, bekannt) {
  const w = (x) => x.replace(/[^\p{L}\p{N}'-]+/gu, '');
  const bisher = new Set([...einheiten.slice(0, k + 1).flat().map(w), ...bekannt]);
  const spaeter = [...new Set(einheiten.slice(k + 1).flat().map(w))].filter((x) => x.length >= 6 && !bisher.has(x));
  const html = await alles(page);
  return spaeter.filter((x) => new RegExp(String.raw`(?<![\p{L}\p{N}])${x}(?![\p{L}\p{N}])`, 'u').test(html));
}

const b = await chromium.launch({ headless: true });
mkdirSync(OUT_DIR, { recursive: true });
try {
  for (const breite of (process.env.NUR ? [Number(process.env.NUR)] : [1280, 320])) {
    const { ctx, page } = await bereit(b, { ansicht: 'woerter', vp: { width: breite, height: 900 } });
    page.on('pageerror', (e) => { erg.fehler.push(`pageerror: ${e.message}`); console.log('pageerror', e.message); });
    const merke = async (z) => { if (breite === 320) { const u = await ueberbreite(page); erg.breite320.push({ zustand: z, ...u, ok: u.scrollWidth <= u.clientWidth }); } else await axe(page, z); };
    const bekannt = (await alles(page)).match(/[\p{L}\p{N}'-]+/gu) ?? [];

    await schritt(`${breite}: Ausschnitt wählen zeigt Spaltensatz und Schalter; IPA wählen (Tastatur)`, async () => {
      await ausschnitt(page, `IPA ${breite}`);
      await page.getByRole('group', { name: /Spalten der Deutung/ }).waitFor();
      const kaestchen = page.getByRole('checkbox', { name: /Folgetext verdecken/ });
      pruefe(await kaestchen.isChecked(), 'Folgetext verdecken ist nicht vorgewählt');
      pruefe(await page.getByRole('radio', { name: /^Feinstrukturanalyse/ }).isChecked(), 'Feinstruktur ist nicht Vorgabe');
      await merke('(a) Ausschnitt wählen mit Spaltensatz');
      await page.getByRole('radio', { name: /^Feinstrukturanalyse/ }).focus();
      await page.keyboard.press('ArrowDown');
      pruefe(await page.getByRole('radio', { name: /^IPA/ }).isChecked(), 'Pfeil nach unten wählt nicht IPA');
      await page.getByRole('button', { name: 'Sequenzanalyse anlegen' }).focus();
      await page.keyboard.press('Enter');
      await titel(page, /^Einteilen: Sinneinheiten setzen/);
    });
    let einheiten = [];
    await schritt(`${breite}: Einteilen, dann Deuten mit IPA-Karte; nichts Späteres im DOM`, async () => {
      const ws = await page.locator('[role=option]').allInnerTexts();
      const grenzen = [3, 6, 9].filter((g) => g < ws.length - 1);
      await grenzenWoerter(page, grenzen);
      const st = [0, ...grenzen, ws.length];
      einheiten = st.slice(0, -1).map((v, i) => ws.slice(v, st[i + 1]));
      await page.locator('summary', { hasText: 'Spalten der Deutung und Folgetext verdecken' }).click();
      await merke('(b) Einteilen mit offenem Spaltensatz-Bereich');
      await page.locator('#fe-frage').fill('Wie spricht die Person über Hilfe?');
      await page.getByRole('button', { name: 'Einteilung fertig, mit dem Deuten beginnen' }).click();
      await titel(page, /^Deuten: Sinneinheit 1 von/);
      for (const h of ['Beschreibend', 'Sprachlich', 'Begrifflich']) pruefe(await page.getByRole('heading', { level: 3, name: h, exact: true }).count() === 1, `Spalte ${h} fehlt`);
      pruefe(await page.getByRole('heading', { level: 3, name: 'Paraphrase', exact: true }).count() === 0, 'Paraphrase-Spalte da');
      const v = await vorausgelesen(page, einheiten, 0, bekannt);
      pruefe(!v.length, `vorausgelesen: ${v.join(', ')}`);
      await page.locator('#fe-k0-ipa-sprachlich-neu').fill('Wiederholung von ich');
      await page.locator('#fe-k0-ipa-sprachlich-neu').press('Enter');
      pruefe(await page.getByRole('textbox', { name: 'Sprachliche Notiz 1' }).count() === 1, 'Notiz nicht angelegt');
      await merke('(c) Deuten mit IPA-Karte');
      await page.getByRole('button', { name: 'Einheit fertig, weiter', exact: true }).click();
      await titel(page, /^Deuten: Sinneinheit 2 von/);
      const v2 = await vorausgelesen(page, einheiten, 1, bekannt);
      pruefe(!v2.length, `vorausgelesen bei 2: ${v2.join(', ')}`);
      await page.getByRole('button', { name: 'Arbeitsplatz schließen' }).click();
    });
    await schritt(`${breite}: eigenen Spaltensatz mit zwei Spalten anlegen, verschieben, speichern (Tastatur)`, async () => {
      await ausschnitt(page, `Eigen ${breite}`);
      await page.locator('summary', { hasText: 'Eigenen Spaltensatz anlegen oder bearbeiten' }).click();
      await page.getByLabel('Name des Spaltensatzes').fill('Meine Sequenzanalyse');
      await page.getByLabel(/Name des Verfahrens im Bericht/).fill('Objektive Hermeneutik');
      const sp1 = page.getByRole('group', { name: 'Spalte 1', exact: true });
      await sp1.getByLabel('Name der Spalte').fill('Lesarten');
      await sp1.getByLabel(/Lesarten mit Prüfkriterium/).check();
      await page.getByRole('button', { name: 'Spalte hinzufügen' }).click();
      const neu = await page.evaluate(() => document.activeElement?.getAttribute('id') || '');
      pruefe(/sn/.test(neu), `Fokus nach „Spalte hinzufügen“: ${neu}`);
      await page.keyboard.type('Kontext');
      await page.getByRole('group', { name: 'Spalte 2', exact: true }).getByLabel(/Leitfragen/).fill('Wer spricht?\nIn welcher Lage?');
      await merke('(d) eigener Satz im Editor, zwei Spalten');
      await page.getByRole('button', { name: 'Spalte 2 nach oben' }).click();
      const n1 = await page.getByRole('group', { name: 'Spalte 1', exact: true }).getByLabel('Name der Spalte').inputValue();
      pruefe(n1 === 'Kontext', `nach dem Verschieben steht ${n1} an Stelle 1`);
      await page.getByRole('button', { name: 'Spaltensatz speichern' }).click();
      await page.getByRole('radio', { name: /Meine Sequenzanalyse/ }).waitFor();
      pruefe(await page.getByRole('radio', { name: /Meine Sequenzanalyse/ }).isChecked(), 'eigener Satz nicht gewählt');
      await page.getByRole('checkbox', { name: /Folgetext verdecken/ }).uncheck();
      await merke('(e) eigener Satz gespeichert und gewählt, Folgetext aus');
      await page.getByRole('button', { name: 'Sequenzanalyse anlegen' }).click();
      await titel(page, /^Einteilen: Sinneinheiten setzen/);
      await grenzenWoerter(page, [3, 6]);
      await page.locator('#fe-frage').fill('Wie?');
      await page.getByRole('button', { name: 'Einteilung fertig, mit dem Deuten beginnen' }).click();
      await titel(page, /^Deuten: Sinneinheit 1 von/);
      for (const h of ['Kontext', 'Lesarten']) pruefe(await page.getByRole('heading', { level: 3, name: h, exact: true }).count() === 1, `Spalte ${h} fehlt`);
      pruefe(await page.locator('.ganz').count() === 1, 'ganzer Ausschnitt fehlt bei Folgetext aus');
      await merke('(f) Deuten mit eigenem Satz, Folgetext nicht verdeckt');
    });
    await ctx.close();
  }
  for (const z of erg.breite320) console.log('[320]', z.zustand, z.scrollWidth, z.clientWidth, z.ok ? 'ok' : 'ÜBERBREIT');
} finally {
  await b.close();
  writeFileSync(path.join(OUT_DIR, 'axe-sequenz.json'), JSON.stringify(erg, null, 2), 'utf8');
  console.log('Geschrieben', path.join(OUT_DIR, 'axe-sequenz.json'), 'Fehler:', erg.fehler.length);
}
