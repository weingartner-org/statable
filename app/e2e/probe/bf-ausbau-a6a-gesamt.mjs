// Stufe A6a Teil 2: axe (WCAG 2.2 AA), 320-px-Überlauf und Sprachreste (en) durch ALLE neuen Abläufe von Feinstruktur F0-F4 und Ausbau A0-A5 in einem Lauf.
// Drei Läufe: de 1280 (axe), de 320 (Überlauf), en 1280 (axe + deutscher Text sichtbar). Jeder Zustand einzeln abgesichert (ein Fehler stoppt den Rest nicht).
// Aufruf aus app/:  PORT=5391 node e2e/probe/bf-ausbau-a6a-gesamt.mjs     Ergebnis: docs/ausbau/bf-a6a/gesamt.json
import { chromium } from 'playwright';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const APP = fileURLToPath(new URL('../..', import.meta.url));
const AXE = readFileSync(path.join(APP, 'node_modules/axe-core/axe.min.js'), 'utf8');
const BASIS = `http://127.0.0.1:${process.env.PORT || 5391}/`;
const OUT = path.resolve(APP, '../docs/ausbau/bf-a6a');
mkdirSync(OUT, { recursive: true });
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const LAEUFE = [
  { id: 'de-1280', sprache: 'de', w: 1280, axe: true },
  { id: 'de-320', sprache: 'de', w: 320, axe: false },
  { id: 'en-1280', sprache: 'en', w: 1280, axe: true, rest: true },
];
// U1 (13.11.): FOTO=<Ordner relativ zu app/> macht statt axe Fotos der sichtbaren Fläche je Zustand in 375, 1280 und 2560 px (deutsch) und misst die Seitenhöhe.
const FOTO = process.env.FOTO ? path.resolve(APP, process.env.FOTO) : null;
if (FOTO) LAEUFE.splice(0, LAEUFE.length, { id: 'de-375', sprache: 'de', w: 375 }, { id: 'de-1280', sprache: 'de', w: 1280 }, { id: 'de-2560', sprache: 'de', w: 2560 });
const NUR = process.env.NUR ? process.env.NUR.split(',') : null;
const erg = { zeitpunkt: new Date().toISOString(), url: BASIS, laeufe: {}, fehler: [] };

// alt = in den Protokollen A1-A5/F4 schon als vorhanden gemeldet (Kopfzeile Mac, Code-Leiste, Code-Landkarte, #begriff-hinweis)
const istAlt = (v, k) => v.id === 'label-content-name-mismatch' || (v.id === 'region' && /begriff-hinweis/.test(k.ziel));

const WORTE_DE = [' Fall ', 'Einheit', 'Lesart', 'Speichern', 'Interview', 'Kodier', 'Einwilligung', 'Protokoll', 'Auswert'];
const REST_REGEX = /(^|[\s„"(])(Fall|Fälle|Einheit|Sinneinheit|Lesart|Lesarten|Speichern|Einwilligung|Protokoll|Protokolle|Auswerten|Abbrechen|Schließen|Beispiel|Anlegen|Löschen|Zurück|Weiter|Ansicht|Verwerfen|Offen|Erfüllt)([\s.,:;“")]|$)/;

async function lauf(browser, cfg) {
  const r = { zustaende: [], schritte: [] };
  erg.laeufe[cfg.id] = r;
  const ctx = await browser.newContext({ locale: cfg.sprache === 'en' ? 'en-GB' : 'de-DE', viewport: { width: cfg.w, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    try { if (!sessionStorage.getItem('__init')) { localStorage.setItem('statable-feinstruktur-ansicht', 'woerter'); localStorage.setItem('statable-einst', JSON.stringify({ rundgang: false })); sessionStorage.setItem('__init', '1'); } } catch { /* egal */ }
  });
  page.on('pageerror', (e) => erg.fehler.push(`${cfg.id} pageerror: ${String(e.message).slice(0, 160)}`));
  const q = cfg.sprache === 'en' ? '?sprache=en' : '';
  const nav = async (hash) => { await page.evaluate((h) => { location.hash = h; }, hash); await page.waitForTimeout(900); };

  async function zustand(name, erwartet) {
    const z = { name };
    try {
      await page.waitForTimeout(500);
      z.erreicht = erwartet ? (await page.locator(erwartet).count()) > 0 : true;
      const m = await page.evaluate(() => ({ s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }));
      z.ueberlauf = m.s - m.c; z.ueberlaufOk = m.s <= m.c;
      if (FOTO) {
        if (erwartet) await page.locator(erwartet).first().scrollIntoViewIfNeeded().catch(() => {});
        z.hoehe = await page.evaluate(() => document.documentElement.scrollHeight);
        const datei = name.split(' ')[0] + '.png';
        mkdirSync(path.join(FOTO, cfg.id), { recursive: true });
        await page.screenshot({ path: path.join(FOTO, cfg.id, datei) });
        z.foto = `${cfg.id}/${datei}`;
      }
      if (cfg.axe) {
        if (!(await page.evaluate(() => !!window.axe))) await page.addScriptTag({ content: AXE });
        const v = await page.evaluate(async (tags) => {
          const x = await window.axe.run(document, { runOnly: { type: 'tag', values: tags } });
          return x.violations.map((a) => ({ id: a.id, impact: a.impact, knoten: a.nodes.map((n) => ({ ziel: n.target.join(' ').slice(0, 140), html: n.html.slice(0, 120), meldung: ((n.any[0] || n.all[0] || n.none[0] || {}).message || '').slice(0, 220) })) }));
        }, TAGS);
        // target-size „teilweise verdeckt“: Gegenprobe mit dem Element in der Mitte des Fensters (sonst verdeckt der feste Seitenkopf)
        for (const a of v) if (a.id === 'target-size') for (const k of a.knoten) {
          k.nachScroll = await page.evaluate(async (sel) => {
            try { const el = document.querySelector(sel); if (!el) return 'nicht gefunden'; el.scrollIntoView({ block: 'center' }); await new Promise((r) => setTimeout(r, 150));
              const x = await window.axe.run(el, { runOnly: { type: 'rule', values: ['target-size'] } }); return x.violations.length ? 'weiter Verstoß' : 'ok (nur verdeckt vom festen Kopf)'; } catch (e) { return 'Fehler ' + e.message; }
          }, k.ziel);
        }
        z.verstoesse = v.map((a) => ({ id: a.id, impact: a.impact, stellen: a.knoten.map((k) => ({ ...k, alt: istAlt(a, k), artefakt: a.id === 'target-size' && /^ok/.test(k.nachScroll || '') })) }));
        z.axeAlt = z.verstoesse.reduce((s, a) => s + a.stellen.filter((k) => k.alt).length, 0);
        z.axeArtefakt = z.verstoesse.reduce((s, a) => s + a.stellen.filter((k) => !k.alt && k.artefakt).length, 0);
        z.axeNeu = z.verstoesse.reduce((s, a) => s + a.stellen.filter((k) => !k.alt && !k.artefakt).length, 0);
      }
      if (cfg.rest) {
        // sichtbarer Text der Hauptfläche (ohne Eingaben der Person: Textfelder, Auswahl-Werte, eigene Namen laufen nicht als Text hinein)
        const t = await page.evaluate(() => {
          const m = document.querySelector('main') || document.body;
          const c = m.cloneNode(true);
          c.querySelectorAll('textarea, input, select, script, style, [aria-hidden="true"]').forEach((e) => e.remove());
          return (c.innerText || c.textContent || '').replace(/\s+/g, ' ');
        });
        const hits = new Set();
        for (const w of WORTE_DE) if (t.includes(w)) hits.add(w.trim());
        const sätze = t.split(/(?<=[.!?])\s+/).filter((s) => REST_REGEX.test(s)).slice(0, 4).map((s) => s.slice(0, 140));
        z.restWorte = [...hits]; z.restSaetze = sätze;
      }
    } catch (e) { z.fehler = String(e.message || e).slice(0, 200); }
    r.zustaende.push(z);
    console.log(`[${cfg.id}] ${name}: ${z.fehler ? 'FEHLER ' + z.fehler : `erreicht=${z.erreicht} überlauf=${z.ueberlauf}px` + (cfg.axe ? ` axe neu=${z.axeNeu} alt=${z.axeAlt} artefakt=${z.axeArtefakt}` : '') + (cfg.rest ? ` rest=[${z.restWorte}]` : '')}`);
    for (const a of z.verstoesse || []) for (const k of a.stellen) if (!k.alt && !k.artefakt) console.log(`     NEU ${a.id} (${a.impact}) ${k.ziel} :: ${k.meldung}${k.nachScroll ? ' => ' + k.nachScroll : ''}`);
    for (const s of z.restSaetze || []) console.log(`     REST? ${s}`);
  }
  async function schritt(name, fn) {
    try { await fn(); r.schritte.push({ name, ok: true }); }
    catch (e) { r.schritte.push({ name, ok: false, fehler: String(e.message || e).slice(0, 200) }); console.log(`[${cfg.id}] SCHRITT FEHLT ${name}: ${String(e.message || e).slice(0, 160)}`); }
  }

  // ---- Projekt öffnen (erstes Beispiel), dann Interviews
  await page.goto(BASIS + q + '#beispiele', { timeout: 180000 });
  await page.getByRole('button', { name: /^(Öffnen|Open)$/ }).first().click({ timeout: 120000 });
  await page.waitForFunction(() => !location.hash.startsWith('#beispiele'), undefined, { timeout: 240000 });
  await page.waitForTimeout(3000);
  await nav('interviews');
  await page.waitForSelector('#iv-beispiel', { timeout: 60000 });
  await zustand('I1 Interviews Erstbesuch', '#iv-leit-t');
  await page.locator('#iv-beispiel').click();
  await page.getByRole('button', { name: /^(Feinstrukturanalyse beginnen|Start fine structure analysis): / }).first().waitFor({ timeout: 120000 });
  await zustand('I2 Beispielinterview geladen', '#iv-offen-t');
  await schritt('I3 Transkript-Prüfer Froschauer/Lueger', async () => {
    await page.locator('input[name="iv-regeln"]').nth(2).check();
    await page.waitForTimeout(600);
    await zustand('I3 Transkript-Prüfer F&L aktiv', '#iv-offen-t');
  });
  await schritt('I4 Protokoll anlegen', async () => {
    await page.locator('#pr-neu-iv').click();
    await page.waitForSelector('#pr-editor-t', { timeout: 10000 });
    await zustand('I4 Interviewprotokoll im Editor', '#pr-editor-t');
  });
  await schritt('I5 Einwilligung anlegen', async () => {
    const d = page.locator('xpath=//*[@id="iv-einw-t"]/following::details[contains(@class,"unter")][1]');
    await d.scrollIntoViewIfNeeded();
    if (!(await d.evaluate((e) => e.open))) await d.locator('summary').first().click();
    await zustand('I5 Einwilligung anlegen geöffnet', '#iv-einw-t');
  });

  // ---- Feinstruktur: beginnen -> einteilen -> deuten -> prüfen -> Übersicht/Fazit -> Gruppe
  await schritt('F Feinstruktur', async () => {
    await page.getByRole('button', { name: /^(Feinstrukturanalyse beginnen|Start fine structure analysis): / }).first().click();
    await page.waitForSelector('#fe-aus-name', { timeout: 30000 });
    await page.locator('#fe-aus-name').fill('A6a Probe');
    const v = Number(await page.locator('#fe-aus-von').inputValue());
    await page.locator('#fe-aus-von').selectOption({ index: v });
    const n = await page.locator('#fe-aus-bis option').count();
    await page.locator('#fe-aus-bis').selectOption({ index: Math.min(n - 1, v + 2) });
    await zustand('F1 Ausschnitt wählen', '#fe-aus-name');
    await page.getByRole('button', { name: /Feinstrukturanalyse anlegen|Create fine structure analysis/ }).click();
    await page.waitForSelector('[role=option]', { timeout: 30000 });
    await zustand('F2 Einteilen (Wörter)', '[role=option]');
    await page.locator('[role=option]').first().focus();
    let pos = 0;
    for (const g of [2, 4, 6, 8]) { while (pos < g) { await page.keyboard.press('ArrowRight'); pos++; } await page.keyboard.press('Enter'); }
    await page.locator('#fe-frage').fill('Wie erzählt die Person über ihren Weg?');
    await page.getByRole('button', { name: /Einteilung fertig|Division done/ }).click();
    await page.waitForSelector('#fe-k0-paraphrase-neu', { timeout: 30000 });
    await zustand('F3 Deuten Einheit 1', '#fe-k0-paraphrase-neu');
    await page.getByRole('button', { name: /Gruppenmodus|Group mode/ }).click();
    await zustand('F4 Gruppenmodus an', '#fe-k0-paraphrase-neu');
    await page.getByRole('button', { name: /Gruppenmodus|Group mode/ }).click();
    const fuelle = async (k) => {
      await page.locator(`#fe-k${k}-paraphrase-neu`).fill(`Paraphrase ${k + 1}.`);
      await page.locator(`#fe-k${k}-paraphrase-neu`).locator('xpath=following::button[1]').click();
      await page.locator(`#fe-k${k}-latent-neu`).fill(`Lesart ${k + 1}.`);
      await page.locator(`#fe-k${k}-latent-neu-pruef`).fill('Es müsste später etwas kommen.');
      await page.locator(`#fe-k${k}-latent-neu-pruef`).locator('xpath=following::button[1]').click();
    };
    const weiter = () => page.getByRole('button', { name: /Einheit fertig, weiter|Unit done, next/ }).click();
    await fuelle(0); await weiter();
    await page.waitForSelector('#fe-k1-paraphrase-neu', { timeout: 20000 });
    await fuelle(1); await weiter();
    await page.waitForSelector('#fe-k2-paraphrase-neu', { timeout: 20000 });
    await zustand('F5 Deuten Einheit 3 (Lesarten prüfen, Zwischenreflexion, Übersicht bis hier)', '#fe-k2-paraphrase-neu');
    await fuelle(2); await weiter();
    await page.waitForSelector('#fe-k3-paraphrase-neu', { timeout: 20000 });
    await fuelle(3); await weiter();
    await page.waitForSelector('#fe-k4-paraphrase-neu', { timeout: 20000 });
    await fuelle(4); await weiter();
    await page.waitForSelector('#fe-deu-h', { timeout: 20000 });
    await page.waitForTimeout(800);
    await zustand('F6 Alle Einheiten gedeutet: Übersicht, Zwischenfazit, Word', '#fe-deu-h');
    await page.getByRole('button', { name: /Arbeitsplatz schlie|Close (the )?work/i }).click();
    await page.waitForTimeout(900);
    await zustand('F7 Liste mit Gruppenarbeit (Weitergeben, Einlesen)', '#iv-fein-t');
  });

  // ---- Kodier-Arbeitsplatz (Beispiel Mixed Methods, neues Projekt)
  await nav('kodieren');
  await page.waitForSelector('#ko-t', { timeout: 60000 });
  await zustand('K1 Kodier-Arbeitsplatz Erstbesuch', '#ko-t');
  await nav('kodieren/beispiel-mm');
  await page.waitForSelector('#ko-mm-t', { timeout: 120000 });
  await page.waitForTimeout(1500);
  await zustand('K2 Mixed Methods: Verknüpfen', '#ko-mm-t');
  await schritt('K3 verknüpfen', async () => { await page.locator('#ko-mm-vk-knopf').click(); await page.waitForTimeout(700); await zustand('K3 verknüpft', '#ko-mm-t'); });
  await schritt('K4 Joint Display', async () => {
    await nav('kodieren/joint-display'); await page.waitForSelector('#ko-mm-jd-t', { timeout: 8000 });
    await page.locator('#ko-mm-jd-neu-name').fill('Themen nach Gruppe'); await page.locator('#ko-mm-jd-neu-btn').click(); await page.waitForTimeout(800);
    await zustand('K4 Joint Display angelegt', '#ko-mm-jd-t');
  });
  await schritt('K5 Design', async () => { await nav('kodieren/design-steckbrief'); await page.waitForSelector('#ko-mm-de-t', { timeout: 8000 }); await zustand('K5 Design-Steckbrief', '#ko-mm-de-t'); });
  await schritt('K6 Instrument', async () => { await nav('kodieren/instrument'); await page.waitForSelector('#ko-mm-in-t', { timeout: 8000 }); await zustand('K6 Instrumentenentwicklung', '#ko-mm-in-t'); });
  await schritt('K7 Selbstprüfung', async () => { await nav('kodieren/selbstpruefung'); await page.waitForSelector('#ko-mm-sp-t', { timeout: 8000 }); await zustand('K7 Selbstprüfung MMAT/GRAMMS', '#ko-mm-sp-t'); });
  await schritt('K8 Code-Landkarte', async () => {
    await page.locator('input[name="ko-auswerten"][value="landkarte"]').check({ force: true });
    await page.waitForSelector('#ko-lk-t', { timeout: 8000 }); await page.waitForTimeout(800);
    await zustand('K8 Code-Landkarte', '#ko-lk-t');
  });
  await schritt('K9 Arbeitsweise', async () => { await nav('kodieren/arbeitsweise'); await page.waitForSelector('#ko-arbeitsweise', { timeout: 8000 }); await zustand('K9 Arbeitsweise-Schalter', '#ko-arbeitsweise'); });
  await schritt('K10 Themen', async () => {
    await page.locator('#ko-arbeitsweise').selectOption('ta-reflexiv'); await page.waitForTimeout(600);
    await nav('kodieren/themen'); await page.waitForSelector('#th-neu-name', { timeout: 8000 });
    await page.locator('#th-neu-name').fill('Hilfe suchen'); await page.keyboard.press('Enter'); await page.waitForTimeout(600);
    await zustand('K10 Themen mit einem Thema', '#ko-themen-t');
  });
  await schritt('K11 GT-Memos', async () => { await page.locator('#ko-arbeitsweise').selectOption('grounded-theory').catch(() => page.locator('#ko-arbeitsweise').selectOption({ index: 3 })); await nav('kodieren/gt-memos'); await zustand('K11 Grounded Theory (Memos, Kodierphase)', null); });
  await schritt('K12 Einzelfall', async () => {
    await page.locator('#ko-arbeitsweise').selectOption('ipa').catch(() => page.locator('#ko-arbeitsweise').selectOption({ index: 5 }));
    await nav('kodieren/einzelfall'); await page.waitForTimeout(700);
    await zustand('K12 IPA Einzelfall-Modus', '#ko-ez-frage-t, .ez');
    await nav('kodieren/einzelfall-verlassen');
  });
  await schritt('K13 Nachvollziehbarkeit', async () => { await nav('kodieren/nachvollziehbarkeit'); await page.waitForSelector('#nv-prot-t', { timeout: 8000 }); await zustand('K13 Nachvollziehbarkeit: Änderungsprotokoll', '#nv-prot-t'); });
  await schritt('K14 KI-Nutzung und Methodenanhang', async () => { await page.locator('#nv-ki-t').scrollIntoViewIfNeeded(); await zustand('K14 KI-Nutzung und Methodenanhang sichtbar', '#nv-ki-t'); });
  await schritt('K15 Berichtshilfe', async () => { await nav('kodieren/berichtshilfe'); await page.waitForSelector('#ko-bh-t', { timeout: 8000 }); await zustand('K15 Berichtshilfe COREQ', '#ko-bh-t'); });

  // ---- Lernpfade
  await schritt('L Lernpfade', async () => {
    await page.goto(BASIS + q + '#lernen/pfad/feinstruktur'); await page.waitForTimeout(2500); await zustand('L1 Lernpfad Feinstruktur', 'main');
    await page.goto(BASIS + q + '#lernen/pfad/interviews'); await page.waitForTimeout(2500); await zustand('L2 Lernpfad Interviews', 'main');
  });
  await ctx.close();
}

const b = await chromium.launch();
for (const cfg of LAEUFE) {
  if (NUR && !NUR.includes(cfg.id)) continue;
  try { await lauf(b, cfg); } catch (e) { erg.fehler.push(`${cfg.id}: ${String(e.message || e).slice(0, 300)}`); console.log('LAUF FEHLER', cfg.id, String(e.message || e).slice(0, 300)); }
  writeFileSync(FOTO ? path.join(FOTO, 'fotos.json') : path.join(OUT, 'gesamt.json'), JSON.stringify(erg, null, 2), 'utf8');
}
await b.close();
console.log('Fehler:', erg.fehler);
