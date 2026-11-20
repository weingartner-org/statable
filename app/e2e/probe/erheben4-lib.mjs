// Gemeinsame Hilfen für die automatische Barrierefreiheits-Prüfung Stufe 4 (Seite „Interviews“).
// Nur Prüfung: verändert keinen App-Code. Aufruf aus app/ über die Skripte erheben4-*.mjs.
// Ablauf (runFlow) geht die Zustände in einer festen Reihenfolge durch; jeder Zustand wird gemessen.
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const BASE = process.env.BASE || 'http://127.0.0.1:4243';
export const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
export const ERG = 'C:\\Users\\johan\\AppData\\Local\\Temp\\claude\\1fbd2017ed8c4e45\\eedbf031-a53a-42f6-976f-56abceca0e01\\scratchpad';
export const TRANS = fileURLToPath(new URL('../../src/lib/testdaten/transkripte/', import.meta.url));
mkdirSync(ERG, { recursive: true });
export const sichern = (datei, daten) => writeFileSync(`${ERG}\\${datei}`, JSON.stringify(daten, null, 2), 'utf8');

// Bezeichnungen der Oberfläche (aus den Quelltexten der Seite und der Bausteine gelesen)
export const T = {
  de: {
    neu: 'Neuer Leitfaden', leitEntf: 'Leitfaden entfernen', fragenHinzu: 'Fragen hinzufügen',
    schritt: ['Sammeln', 'Prüfen', 'Sortieren', 'Subsumieren'], behalten: 'Behalten', blockNeu: 'Block anlegen',
    erzaehl: /Erzählaufforderung/, word: 'Leitfaden als Word', mitnehmen: 'Leitfaden zum Mitnehmen (große Schrift)',
    beispiel: 'Beispielinterview laden (erfunden)', hinweise: /Hinweise zum Text/, export: /^Export/,
    kodHaupt: 'Hauptkategorie anlegen', speichern: 'Speichern', abbrechen: 'Abbrechen', uebernehmen: /^(Übernehmen|Add)$/,
    schliessen: 'Transkript schließen', abspielen: 'Abspielen', anhalten: 'Anhalten',
    unterkat: (n) => `Unterkategorie anlegen: ${n}`, bearb: (n) => `Bearbeiten: ${n}`, entfAria: (n) => `Entfernen: ${n}`,
    fragen: ['Wie haben Sie Ihre Woche geplant?', 'Was hat Ihnen geholfen, dranzubleiben?', 'Wann fiel es Ihnen schwer?', 'Was würden Sie anders machen?'],
    block: 'Zeitplanung', codes: ['Zeitplanung', 'Lernerfahrung', 'Motivation'], unter: 'Prioritäten',
    erzaehlText: 'Erzählen Sie mir, wie Sie Ihre Woche geplant haben.',
  },
  en: {
    neu: 'New guide', leitEntf: 'Remove guide', fragenHinzu: 'Add questions',
    schritt: ['Collect', 'Check', 'Sort', 'Subsume'], behalten: 'Keep', blockNeu: 'Create block',
    erzaehl: /Narrative prompt/, word: 'Guide as Word', mitnehmen: 'Guide to take along (large print)',
    beispiel: 'Load example interview (invented)', hinweise: /Notes on the text/, export: /^Export/,
    kodHaupt: 'Add a main category', speichern: 'Save', abbrechen: 'Cancel', uebernehmen: /^(Übernehmen|Add)$/,
    schliessen: 'Close transcript', abspielen: 'Play', anhalten: 'Pause',
    unterkat: (n) => `Add subcategory: ${n}`, bearb: (n) => `Edit: ${n}`, entfAria: (n) => `Remove: ${n}`,
    fragen: ['How did you plan your week?', 'What helped you keep going?', 'When did it feel hard?', 'What would you do differently?'],
    block: 'Time planning', codes: ['Time planning', 'Learning experience', 'Motivation'], unter: 'Priorities',
    erzaehlText: 'Tell me how you planned your week.',
  },
};

// Hilfen, die in jede Seite eingesetzt werden (laufen im Browser)
function helfer() {
  const SEL = 'a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=radio],[role=checkbox],[role=menuitem],[role=menuitemradio],[tabindex]:not([tabindex="-1"])';
  const sichtbar = (el) => {
    if (el.closest('[inert]')) return false;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') return false;
    const d = el.closest('details:not([open])');
    if (d && !(el.tagName === 'SUMMARY' && el.parentElement === d)) return false;
    const dlg = document.querySelector('dialog[open]');
    if (dlg && !dlg.contains(el)) return false;
    return true;
  };
  const name = (el) => (el.getAttribute('aria-label') || (el.labels && el.labels[0] ? el.labels[0].innerText : '') || el.innerText || el.value || el.getAttribute('title') || el.placeholder || el.tagName).trim().replace(/\s+/g, ' ');
  window.bfName = name;
  window.bfKandidaten = () => [...document.querySelectorAll(SEL)].filter((el) => !el.disabled && sichtbar(el));
  window.bfZiele = () => {
    const out = [];
    for (const el of document.querySelectorAll(SEL)) {
      if (!sichtbar(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.width <= 2 || r.height <= 2) continue; // nur für Vorleser (unsichtbar): kein Ziel
      if (r.width >= 24 && r.height >= 24) continue;
      let ausnahme = null;
      if (el.tagName === 'A' && el.closest('p, li')) ausnahme = 'Link im Fließtext';
      const lab = el.closest('label');
      if ((el.type === 'radio' || el.type === 'checkbox') && lab) { const lr = lab.getBoundingClientRect(); if (lr.width >= 24 && lr.height >= 24) ausnahme = 'Beschriftung ist das Ziel'; }
      out.push({ name: name(el).slice(0, 70), tag: el.tagName, typ: el.type || '', w: Math.round(r.width), h: Math.round(r.height), gesperrt: el.disabled, ausnahme });
    }
    return out;
  };
  // Kontrastmodus: jedes Bedienelement braucht einen Rand oder sichtbaren Text. Native Kästchen zeichnet das System selbst.
  window.bfKontrast = () => {
    const ohne = []; let system = 0;
    for (const el of window.bfKandidaten()) {
      if (el.type === 'radio' || el.type === 'checkbox') { system++; continue; }
      const cs = getComputedStyle(el);
      const rand = ['Top', 'Right', 'Bottom', 'Left'].some((s) => cs['border' + s + 'Style'] !== 'none' && parseFloat(cs['border' + s + 'Width']) > 0);
      const text = (el.innerText || '').trim().length > 0 || (el.tagName === 'INPUT' && ['button', 'submit', 'reset'].includes(el.type) && (el.value || '').trim().length > 0);
      if (!rand && !text) ohne.push({ name: name(el).slice(0, 70), tag: el.tagName, typ: el.type || '' });
    }
    return { ohne, systemKaestchen: system };
  };
  window.bfLaeuft = () => [...document.querySelectorAll('body *')].filter((e) => e.childElementCount === 0 && /^(läuft|playing)$/.test((e.textContent || '').trim())).length;
}

export async function oeffne(b, { sprache = 'de', breite = 1280, hoehe = 900, forced = false } = {}) {
  const ctx = await b.newContext({
    locale: sprache === 'en' ? 'en-US' : 'de-DE', viewport: { width: breite, height: hoehe }, serviceWorkers: 'block',
    acceptDownloads: true, forcedColors: forced ? 'active' : 'none', colorScheme: 'light',
  });
  await ctx.addInitScript(helfer);
  const page = await ctx.newPage();
  const fehler = [];
  page.on('pageerror', (e) => fehler.push('Seitenfehler: ' + e.message.slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error') fehler.push('Konsole: ' + m.text().slice(0, 200)); });
  await page.goto(`${BASE}/${sprache === 'en' ? '?sprache=en' : ''}#interviews`, { timeout: 240000 });
  await page.waitForSelector('#iv-t', { timeout: 240000 });
  await page.waitForTimeout(2500);   // Lade-Animation ausklingen lassen (sonst meldet axe Kontrast mitten im Einblenden)
  await leerKlick(page);
  return { ctx, page, fehler };
}

// Fokus an den Anfang der Seite setzen, damit die nächste Tab-Taste vorne beginnt
export async function leerKlick(page) {
  await page.evaluate(() => { const b = document.body; b.setAttribute('tabindex', '-1'); b.focus({ preventScroll: true }); b.removeAttribute('tabindex'); });
}

// Tab-Durchlauf: geht einmal durch alle Bedienelemente, bis der Fokus zum ersten zurückkehrt
export async function tabWalk(page) {
  const start = await page.evaluate(() => window.bfKandidaten().map((el) => { if (!el.dataset.bfk) el.dataset.bfk = String(Math.random()).slice(2, 10); return { k: el.dataset.bfk, name: window.bfName(el).slice(0, 60), tag: el.tagName }; }));
  await leerKlick(page);
  const folge = []; let erstes = null; let letzter = null; let gleich = 0; let falle = null;
  for (let i = 0; i < 400; i++) {
    await page.keyboard.press('Tab');
    const s = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body || el === document.documentElement) return null;
      if (!el.dataset.bfk) el.dataset.bfk = String(Math.random()).slice(2, 10);
      const cs = getComputedStyle(el);
      return { k: el.dataset.bfk, name: window.bfName(el).slice(0, 60), tag: el.tagName, fokus: (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== 'none' };
    });
    if (!s) continue;
    folge.push(s);
    if (erstes === null) erstes = s.k;
    else if (s.k === erstes) break;
    if (letzter && s.k === letzter.k) { gleich++; if (gleich >= 3) { falle = s; break; } } else gleich = 0;
    letzter = s;
  }
  const besucht = new Set(folge.map((s) => s.k));
  const nichtErreicht = start.filter((s) => !besucht.has(s.k)).map((s) => `${s.name} (${s.tag})`);
  const ohneFokus = [...new Set(folge.filter((s) => !s.fokus).map((s) => s.name))];
  return { schritte: folge.length, bedienelemente: start.length, erreicht: start.filter((s) => besucht.has(s.k)).length, nichtErreicht, ohneSichtbarenFokus: ohneFokus.slice(0, 30), falle: falle ? falle.name : null, ersterFokus: folge[0]?.name ?? null };
}

// Messung eines Zustands: axe, Überlauf, Zielgrößen, Kontrastmodus, Tab-Durchlauf
export async function messe(page, name, { walk = false, forced = false } = {}) {
  const ax = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const z = {
    name,
    verstoesse: ax.violations.map((v) => ({ id: v.id, impact: v.impact, hilfe: v.help, knoten: v.nodes.map((n) => ({ ziel: n.target.join(' '), meldung: (n.failureSummary || '').replace(/\s+/g, ' ').slice(0, 260) })) })),
    unklar: ax.incomplete.reduce((s, v) => s + v.nodes.length, 0),
    unklarIds: [...new Set(ax.incomplete.map((v) => v.id))],
  };
  z.seite = await page.evaluate(() => {
    const e = document.documentElement;
    const ab = [...document.querySelectorAll('body *')].filter((x) => { const r = x.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.right > window.innerWidth + 1 && getComputedStyle(x).visibility !== 'hidden' && !x.closest('[aria-hidden="true"]'); });
    return { breite: e.clientWidth, scroll: e.scrollWidth, abgeschnitten: ab.length, beispiele: ab.slice(0, 5).map((x) => (x.innerText || x.tagName).trim().replace(/\s+/g, ' ').slice(0, 50)) };
  });
  z.ziele = await page.evaluate(() => window.bfZiele());
  if (forced) z.kontrast = await page.evaluate(() => ({ ...window.bfKontrast(), laeuft: window.bfLaeuft() }));
  if (walk) z.tab = await tabWalk(page);
  return z;
}

// Dialog-Probe: Fokus hinein, Tab bleibt im Dialog, Esc schließt, Fokus kehrt zurück
// Tab, der hinter dem letzten Element des Dialogs auf den Browser (= kein Element, „body“) geht, zählt nicht als Verlassen:
// im Headless-Browser gibt es keine Adressleiste; nur ein echtes Element außerhalb des Dialogs wird als Verlassen gewertet.
export async function dialogTest(page, name, fvVorher) {
  const innerhalb = await page.evaluate(() => !!document.activeElement?.closest('dialog[open]'));
  let verlaesst = null; let browserWechsel = 0;
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab');
    const s = await page.evaluate(() => { const a = document.activeElement; return { body: !a || a === document.body, drin: !!a?.closest('dialog[open]'), name: a ? window.bfName(a).slice(0, 60) : '' }; });
    if (s.body) { browserWechsel++; continue; }
    if (!s.drin) { verlaesst = s.name; break; }
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  const zu = await page.evaluate(() => !document.querySelector('dialog[open]'));
  const nach = await page.evaluate(() => (document.activeElement ? window.bfName(document.activeElement).slice(0, 60) : '(nichts)'));
  return { name, fokusHinein: innerhalb, fokusBleibtImDialog: verlaesst === null, verlaesstZu: verlaesst, tabWechselZumBrowser: browserWechsel, escSchliesst: zu, fokusVorher: fvVorher, fokusNachher: nach, fokusZurueck: nach === fvVorher };
}

const FOKUS = (page) => page.evaluate(() => (document.activeElement ? window.bfName(document.activeElement).slice(0, 60) : '(nichts)'));

// Der Ablauf durch alle Zustände, in fester Reihenfolge
export async function runFlow(b, { sprache = 'de', breite = 1280, forced = false, walk = false, dialogTests = false, hoehe = 900 } = {}) {
  const t = T[sprache];
  const { ctx, page, fehler } = await oeffne(b, { sprache, breite, hoehe, forced });
  const zustaende = [];
  const w = (ms = 400) => page.waitForTimeout(ms);
  const m = async (name) => { zustaende.push(await messe(page, name, { walk, forced })); };
  const schrittDialog = async (name, fv) => {
    await m(name);
    if (dialogTests) zustaende.push({ name: `${name} · Tastenprobe`, dialog: await dialogTest(page, name, fv) });
    else { await page.keyboard.press('Escape'); await w(300); }
  };
  const sprecherDialog = async (datei, name) => {
    const ausloeser = page.locator('#iv-einlesen');
    await ausloeser.focus();
    const fv = await FOKUS(page);
    await page.locator('input[type=file][accept*=".vtt"]').first().setInputFiles(TRANS + datei);
    const offen = await page.waitForSelector('dialog[open] #iv-zu-t', { timeout: 20000 }).then(() => true).catch(() => false);
    if (!offen) { fehler.push(`Kein Dialog „Sprecher zuordnen“ bei ${datei}`); return; }
    await w(300);
    await m(name);
    if (dialogTests) {
      zustaende.push({ name: `${name} · Tastenprobe`, dialog: await dialogTest(page, name, fv) });
      await page.locator('input[type=file][accept*=".vtt"]').first().setInputFiles(TRANS + datei);
      await page.waitForSelector('dialog[open] #iv-zu-t', { timeout: 20000 });
    }
    await page.locator('dialog[open]').getByRole('button', { name: t.uebernehmen }).click();
    await w(500);
  };
  try {
    await m('01 Seite leer');
    await page.getByRole('button', { name: t.neu, exact: true }).click(); await w();
    await m('02 Leitfaden angelegt, ohne Fragen');
    await page.locator('#lf-sam-text').fill(t.fragen.join('\n'));
    await page.getByRole('button', { name: t.fragenHinzu, exact: true }).click(); await w();
    await m('03 Schritt 1 Sammeln mit Fragen');
    await page.getByRole('button', { name: `2. ${t.schritt[1]}`, exact: true }).click(); await w();
    const radios = page.getByRole('radio', { name: t.behalten, exact: true });
    for (let i = 0; i < await radios.count(); i++) await radios.nth(i).check();
    await m('04 Schritt 2 Prüfen, alle behalten');
    await page.getByRole('button', { name: `3. ${t.schritt[2]}`, exact: true }).click(); await w();
    await page.locator('#lf-so-neu').fill(t.block);
    await page.getByRole('button', { name: t.blockNeu, exact: true }).click(); await w();
    const sel = page.locator('section.schritt select');
    for (let i = 0; i < await sel.count(); i++) await sel.nth(i).selectOption({ index: 1 });
    await m('05 Schritt 3 Sortieren, Block angelegt, Fragen zugeordnet');
    await page.getByRole('button', { name: `4. ${t.schritt[3]}`, exact: true }).click(); await w();
    await page.getByRole('textbox', { name: t.erzaehl }).first().fill(t.erzaehlText);
    await m('06 Schritt 4 Subsumieren');
    const entfLoc = page.getByRole('button', { name: t.leitEntf, exact: true }).first();
    await entfLoc.focus();
    const fvEnt = await FOKUS(page);
    await entfLoc.click(); await w(300);
    await schrittDialog('07 Rückfrage Leitfaden entfernen', fvEnt);

    await page.locator('#iv-beispiel').click();
    await page.waitForSelector('#iv-offen-t', { timeout: 60000 }); await w(800);
    await m('08 Transkript geöffnet (Beispielinterview)');
    await page.getByRole('button', { name: t.hinweise }).first().click(); await w(300);
    await m('09 Hinweise aufgeklappt');
    const abspieler = page.locator('.abspieler');
    await abspieler.getByRole('button', { name: t.abspielen, exact: true }).click().catch((e) => fehler.push('Abspielen-Knopf: ' + e.message.slice(0, 120)));
    await w(2500);
    await m('10 Abspielen läuft');
    zustaende.push({ name: '10a Abspieler-Text (Ausschnitt)', text: (await abspieler.innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 220) });
    await abspieler.getByRole('button', { name: t.anhalten, exact: true }).click().catch(() => {});
    await page.locator('#iv-b-ed-0').click(); await page.waitForSelector('#iv-b-text'); await w(200);
    await m('11 Beitrag bearbeiten offen');
    await page.locator('#iv-b-text').press('Escape'); await w(300);
    await page.locator('section.offen').getByRole('button', { name: t.export }).first().click(); await w(400);
    await m('12 Export-Menü offen');
    await page.keyboard.press('Escape'); await w(300);
    await page.getByRole('button', { name: t.schliessen, exact: true }).click(); await w(300);
    await m('13 Liste mit Beispielinterview');

    await sprecherDialog('atrain-transcription.txt', '14 Dialog Sprecher zuordnen (aTrain)');
    await sprecherDialog('teams-nachgebaut.vtt', '15 Dialog Sprecher zuordnen (Teams)');
    await m('16 Liste mit drei Transkripten');

    const formOffen = async () => (await page.locator('#kodl-name').count()) > 0;
    for (const c of t.codes) {
      if (!(await formOffen())) await page.locator('#kodl-neu-haupt').click();
      await page.locator('#kodl-name').fill(c);
      await page.locator('section.kodl').locator('button[type=submit]').click(); await w(400);
    }
    await page.locator(`button[aria-label="${t.unterkat(t.codes[0])}"]`).click(); await w(200);
    await page.locator('#kodl-name').fill(t.unter);
    await page.locator('section.kodl').locator('button[type=submit]').click(); await w(400);
    await m('17 Kodierleitfaden mit drei Codes und einer Unterkategorie');
    await page.locator(`button[aria-label="${t.bearb(t.codes[2])}"]`).click(); await w(300);
    await m('18 Bearbeiten-Formular offen');
    await page.locator('section.kodl').getByRole('button', { name: t.abbrechen, exact: true }).first().click(); await w(300);
    const entfK = page.locator(`button[aria-label="${t.entfAria(t.codes[1])}"]`);
    await entfK.focus();
    const fvK = await FOKUS(page);
    await entfK.click(); await w(300);
    await schrittDialog('19 Rückfrage Entfernen im Kodierleitfaden', fvK);
  } catch (e) {
    fehler.push('Ablauf abgebrochen: ' + e.message.split('\n')[0].slice(0, 300));
  } finally {
    await ctx.close();
  }
  return { sprache, breite, forced, walk, dialogTests, zustaende, fehler };
}

export async function starteBrowser() { return chromium.launch(); }
