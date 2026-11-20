// Usability Stufe 7 (10.11.): Fotos der Seiten Daten, Spalten, Protokoll, Bericht (Messlatte vor dem Umbau).
// Zweck: je Seite ein Foto der sichtbaren Fläche (<seite>-falz.png, fullPage:false) und der ganzen Seite (<seite>-ganz.png, fullPage:true).
//   Dazu messwerte.json im Fotoordner und Terminalausgabe: Seitenhöhe je Seite; auf #spalten y-Position des ersten .spalte
//   und ob es unter der Fensterhöhe liegt; auf #spalten und den übrigen Seiten die Elemente, die als "ohne Text" zählen (Tag, Klasse, Beschriftung).
//   Vor dem Bericht wird wie in usability-blatt-fotos.mjs der t-Test "Handy im Bett x Konzentration" gerechnet.
// Aufruf (Vorschau): PORT=4301 MARKE=stufe7-vorher [BREITE=375] [KONTRAST=1] [AUS=<Ordner>] node e2e/probe/usability-seiten-fotos.mjs
// Standard: BREITE 1366 (unter 600 Höhe 812, sonst 850), Fotos nach docs/usability/messung-7/fotos/<MARKE>/<hell|kontrast|375>/ (relativ zu app/).
// Stufe 8 (10.11.): STUFE=8 setzt den Messordner auf docs/usability/messung-8/ und fotografiert zusätzlich
//   beispiele, verstehen, einstellungen und blatt/neu (Dateiname blatt-neu). Ohne STUFE bleibt alles wie bei Stufe 7.
// Stufe 2 (10.11.): STUFE=2 → messung-2, nur die Startseite: start-leer (ohne Projekt), start-projekt („Willkommen zurück“ nach dem Beispiel),
//   start-profi (frischer Kontext mit profi:true), je -falz.png und -ganz.png; in messwerte.json je Lauf: Unterkante der drei Wege
//   (Abschnitte um #bsp-t, #eigen-t, #neu-t), ob sie über der Falz liegen, Reihenfolge der Überschriften h1-h3, waagrechtes Scrollen.
// Stufe 10 (10.11.): STUFE=10 → messung-ende, die Hauptseiten Start, Daten, Spalten, Blatt t-Test, Bericht, Lernen, Hilfe, Beispiele,
//   Einstellungen; Unterordner 768 bei BREITE=768 (Höhe 1024); je Seite dazu „waagrecht scrollbar?“ und längere Wartezeit bei schmaler Breite.
// Schreibt nichts in die App. Einstellungen nur im Testkontext (localStorage "statable-einst", Rundgang aus).
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const U = `http://localhost:${process.env.PORT || 4300}/`;
const MARKE = process.env.MARKE || 'lauf';
const BREITE = Number(process.env.BREITE || 1366);
const STUFE0 = process.env.STUFE || '7';
// Stufe 2 (10.11.): Falz wie im Plan bei 1366 x 768 (sonst 850).
const HOEHE = BREITE < 600 ? 812 : BREITE < 1000 ? 1024 : (STUFE0 === '2' ? 768 : 850);
const KONTRAST = process.env.KONTRAST === '1';
const UNTERORDNER = BREITE < 600 ? '375' : BREITE < 1000 ? '768' : (KONTRAST ? 'kontrast' : 'hell');
const STUFE = STUFE0;
const AUS = path.resolve(process.env.AUS || path.join('..', 'docs', 'usability', STUFE === '10' ? 'messung-ende' : `messung-${STUFE}`, 'fotos', MARKE, UNTERORDNER));
mkdirSync(AUS, { recursive: true });
const warte = (page, ms = 1200) => page.waitForTimeout(BREITE < 1000 ? ms * 2 : ms);
const SEITEN = ['daten', 'spalten', 'protokoll', 'bericht'];
// Stufe 9 (10.11.): STUFE=9 → messung-9, dazu die Seiten mit Bereichssuche (Hilfe, Lernen, Rechner und Regler, Beispiele, Blatt neu),
//   ein Foto der Kopfzeile (kopf.png), der geöffneten Befehlspalette (palette-leer.png, palette-sprache.png) und die Messung „waagrecht scrollbar?“.
const ZUSATZ = STUFE === '10' ? ['lernen', 'hilfe', 'beispiele', 'einstellungen'] : STUFE === '8' ? ['beispiele', 'verstehen', 'einstellungen'] : STUFE === '9' ? ['hilfe', 'lernen', 'verstehen', 'beispiele'] : [];

/** Läuft im Browser: Elemente, die als "ohne Text" zählen (gleiche Regeln wie zaehleImSeite in usability-zaehlen.mjs). */
function ohneTextListe() {
  const BEDIEN = 'button, a[href], input:not([type=hidden]), select, textarea, summary, [role=button], [role=tab], [role=link], [role=menuitem], [role=switch], [role=checkbox], [role=radio]';
  const sichtbar = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return false;
    const st = getComputedStyle(el);
    if (st.visibility === 'hidden' || st.display === 'none') return false;
    if (el.closest('[inert], [aria-hidden="true"]')) return false;
    return true;
  };
  const norm = (t) => (t || '').replace(/\s+/g, ' ').trim();
  const istFach = (el) => el.matches('.begriff-link, .begriff') || !!el.closest('.begriff-link');
  const hatBuchstabe = (t) => /[\p{L}\p{N}]/u.test(t);
  const textVon = (el) => {
    if (el.tagName === 'LABEL') return norm(el.innerText) || (el.querySelector('input')?.getAttribute('aria-label') ?? '');
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)) {
      const lt = [...(el.labels ?? [])].map(l => norm(l.innerText)).join(' ');
      if (el.type === 'submit' || el.type === 'button') return norm(el.value);
      return lt;
    }
    return norm(el.innerText) || norm(el.textContent);
  };
  const gesehen = new Set(), bedien = [];
  for (let el of document.querySelectorAll(BEDIEN)) {
    const r = el.getBoundingClientRect();
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName) && (r.width <= 2 || r.height <= 2 || el.classList.contains('nur-vorleser'))) {
      const lab = el.closest('label');
      if (!lab || gesehen.has(lab)) continue;
      gesehen.add(lab); el = lab;
    }
    if (!sichtbar(el) || gesehen.has(el) && el.tagName !== 'LABEL') continue;
    gesehen.add(el);
    if (istFach(el)) continue;
    bedien.push(el);
  }
  const liste = [];
  for (const el of bedien) {
    const t = textVon(el);
    if (!hatBuchstabe(t) || t.length === 1 && !/[\p{L}\p{N}]/u.test(t)) {
      liste.push({
        tag: el.tagName.toLowerCase(),
        typ: el.getAttribute('type') || '',
        klasse: String(el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className).slice(0, 60),
        aria: norm(el.getAttribute('aria-label') || ''),
        titel: norm(el.getAttribute('title') || ''),
        inhalt: norm(el.innerHTML).slice(0, 80),
        bereich: el.closest('#inhalt') ? 'inhalt' : el.closest('header, .kopf, [role=banner]') ? 'kopf' : 'rest',
      });
    }
  }
  return liste;
}

/** Läuft im Browser: y-Position des ersten .spalte und Seitenhöhe. */
function messeSpalte() {
  const el = document.querySelector('.spalte');
  const top = el ? Math.round(el.getBoundingClientRect().top) : null;
  return { ersteSpalteTop: top, ersteSpalteKlasse: el ? String(el.className).slice(0, 60) : null, unterFenster: top === null ? null : top > innerHeight, fensterHoehe: innerHeight };
}

/** t-Test-Blatt "Handy im Bett x Konzentration": wie in usability-blatt-fotos.mjs. */
async function ttestBlatt(page) {
  await page.goto(U + '#blatt/neu'); await warte(page, 1500);
  await page.locator('[data-karte="gruppen"]').first().click(); await warte(page, 800);
  await page.locator('label.option', { hasText: 'Konzentration' }).first().click(); await warte(page, 600);
  await page.locator('label.option', { hasText: 'Handy im Bett' }).first().click();
  await page.getByRole('heading', { name: 'Ergebnis' }).first().waitFor({ timeout: 30000 });
  await page.waitForTimeout(3000);
}

const b = await chromium.launch();
console.log(`Lauf ${MARKE}: Breite ${BREITE}x${HOEHE}, Kontrast ${KONTRAST ? 'Schwarz auf Weiß' : 'hell'}, Fotos nach ${AUS}`);
const ctx = await b.newContext({ locale: 'de-DE', viewport: { width: BREITE, height: HOEHE } });
await ctx.addInitScript((kontrast) => {
  try {
    let alt = {};
    try { alt = JSON.parse(localStorage.getItem('statable-einst') || '{}') || {}; } catch { alt = {}; }
    const neu = { ...alt, rundgang: false };
    if (kontrast) { neu.thema = 'sw'; localStorage.setItem('statable-thema-gewaehlt', '1'); }
    localStorage.setItem('statable-einst', JSON.stringify(neu));
  } catch { /* egal */ }
}, KONTRAST);
const page = await ctx.newPage();
page.setDefaultTimeout(20000);
const messwerte = { marke: MARKE, breite: BREITE, hoehe: HOEHE, kontrast: KONTRAST, seiten: {} };

/** Läuft im Browser: die drei Wege der Startseite und die Gliederung. */
function messeStart() {
  const wege = ['bsp-t', 'eigen-t', 'neu-t'].map((id) => {
    const h = document.getElementById(id), sec = h?.closest('section') ?? h?.parentElement;
    const r = sec?.getBoundingClientRect();
    return { id, titel: (h?.textContent || '').replace(/\s+/g, ' ').trim(), oben: r ? Math.round(r.top + scrollY) : null, unten: r ? Math.round(r.bottom + scrollY) : null };
  });
  const falz = innerHeight;
  return { falz, wege, alleUeberFalz: wege.every((w) => w.unten !== null && w.unten <= falz), reihenfolge: wege.slice().sort((a, b) => (a.oben ?? 0) - (b.oben ?? 0)).map((w) => w.id),
    gliederung: [...document.querySelectorAll('#inhalt h1, #inhalt h2, #inhalt h3, main h1, main h2, main h3')].filter((h, i, a) => a.indexOf(h) === i).map((h) => h.tagName + ' ' + (h.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60)),
    hoehe: document.documentElement.scrollHeight, waagrechtScroll: document.documentElement.scrollWidth > innerWidth + 1 };
}
const startFoto = async (pg, datei) => {
  await pg.goto(U + '#start'); await warte(pg, 2000);
  const m = await pg.evaluate(messeStart);
  m.ohneText = await pg.evaluate(ohneTextListe);
  await pg.screenshot({ path: path.join(AUS, `${datei}-falz.png`), fullPage: false });
  await pg.screenshot({ path: path.join(AUS, `${datei}-ganz.png`), fullPage: true });
  console.log(datei.padEnd(14), `Höhe ${m.hoehe}`, `Falz ${m.falz}`, 'Wege', m.wege.map((w) => `${w.id}:${w.unten}`).join(' '), 'über Falz:', m.alleUeberFalz, 'waagrecht:', m.waagrechtScroll);
  messwerte.seiten[datei] = m;
};
if (STUFE === '2' || STUFE === '10') {
  try { await startFoto(page, 'start-leer'); } catch (e) { messwerte.seiten['start-leer'] = { fehler: String(e).slice(0, 200) }; console.log('start-leer FEHLER', String(e).slice(0, 200)); }
}

try {
  await page.goto(U + '#start'); await warte(page, 1500);
  await page.getByRole('button', { name: 'Beispiel öffnen' }).first().click();
  await page.waitForFunction(() => location.hash.startsWith('#daten'), null, { timeout: 120000 });
  await warte(page, 2500);
  messwerte.beispielGefunden = await page.evaluate(() => document.body.innerText.includes('Schlaf und Konzentration'));
  console.log('Beispiel "Schlaf und Konzentration" im Text gefunden:', messwerte.beispielGefunden);
} catch (e) {
  console.log('Beispiel öffnen FEHLER', String(e).slice(0, 200));
  messwerte.beispielFehler = String(e).slice(0, 200);
}

const fotografiere = async (name, datei = name) => {
  const seite = { hash: '#' + name };
  try {
    await page.goto(U + '#' + name); await warte(page, 2000);
    seite.hoehe = await page.evaluate(() => document.documentElement.scrollHeight);
    seite.waagrecht = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    if (name === 'spalten') Object.assign(seite, await page.evaluate(messeSpalte));
    seite.ohneText = await page.evaluate(ohneTextListe);
    await page.screenshot({ path: path.join(AUS, `${datei}-falz.png`), fullPage: false });
    await page.screenshot({ path: path.join(AUS, `${datei}-ganz.png`), fullPage: true });
    console.log(name.padEnd(10), `Höhe ${seite.hoehe}`, name === 'spalten' ? `erste Spalte top ${seite.ersteSpalteTop} unter Fenster: ${seite.unterFenster}` : '', `ohne Text: ${seite.ohneText.length}`);
  } catch (e) {
    seite.fehler = String(e).slice(0, 200);
    console.log(name, 'FEHLER', seite.fehler);
  }
  messwerte.seiten[name] = seite;
};

if (STUFE === '2') {
  if (!messwerte.beispielFehler) { try { await startFoto(page, 'start-projekt'); } catch (e) { console.log('start-projekt FEHLER', String(e).slice(0, 200)); } }
  const ctxP = await b.newContext({ locale: 'de-DE', viewport: { width: BREITE, height: HOEHE } });
  await ctxP.addInitScript((kontrast) => {
    try { const neu = { rundgang: false, profi: true }; if (kontrast) { neu.thema = 'sw'; localStorage.setItem('statable-thema-gewaehlt', '1'); } localStorage.setItem('statable-einst', JSON.stringify(neu)); } catch { /* egal */ }
  }, KONTRAST);
  const pp = await ctxP.newPage(); pp.setDefaultTimeout(20000);
  try { await startFoto(pp, 'start-profi'); } catch (e) { console.log('start-profi FEHLER', String(e).slice(0, 200)); }
  await ctxP.close();
} else if (!messwerte.beispielFehler) {
  await fotografiere('daten');
  await fotografiere('spalten');
  await fotografiere('protokoll');
  // Stufe 8: leeres Blatt, bevor der t-Test-Lauf es füllt
  if (ZUSATZ.length && STUFE !== '10') await fotografiere('blatt/neu', 'blatt-neu');
  try {
    await ttestBlatt(page); console.log('Blatt t-Test gerechnet (vor dem Bericht).');
    if (STUFE === '10') {
      const seite = { hash: '(Blatt t-Test)' };
      seite.hoehe = await page.evaluate(() => document.documentElement.scrollHeight);
      seite.waagrecht = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
      seite.ohneText = await page.evaluate(ohneTextListe);
      await page.screenshot({ path: path.join(AUS, 'blatt-ttest-falz.png'), fullPage: false });
      await page.screenshot({ path: path.join(AUS, 'blatt-ttest-ganz.png'), fullPage: true });
      messwerte.seiten['blatt-ttest'] = seite;
      console.log('blatt-ttest', `Höhe ${seite.hoehe}`, `waagrecht ${seite.waagrecht}`);
    }
  }
  catch (e) { console.log('Blatt FEHLER', String(e).slice(0, 200)); messwerte.blattFehler = String(e).slice(0, 200); }
  await fotografiere('bericht');
  for (const z of ZUSATZ) await fotografiere(z);
  if (STUFE === '9') {
    try {
      await page.goto(U + '#daten'); await warte(page, 2000);
      const kopf = await page.evaluate(() => {
        const k = document.querySelector('header.kopf'), r = k?.getBoundingClientRect();
        const such = document.querySelector('.kopf-suche'), sr = such?.getBoundingClientRect();
        return { hoehe: r ? Math.round(r.height) : null, seiteBreit: document.documentElement.scrollWidth, fenster: innerWidth,
          waagrechtScroll: document.documentElement.scrollWidth > innerWidth + 1,
          suche: such ? { text: (such.textContent || '').replace(/\s+/g, ' ').trim(), aria: such.getAttribute('aria-label'), haspopup: such.getAttribute('aria-haspopup'), kuerzel: such.getAttribute('aria-keyshortcuts'), breite: Math.round(sr.width), rechts: Math.round(sr.right) } : null };
      });
      messwerte.kopf = kopf;
      const hk = kopf.hoehe || 120;
      await page.screenshot({ path: path.join(AUS, 'kopf.png'), clip: { x: 0, y: 0, width: BREITE, height: Math.min(hk + 8, HOEHE) } });
      console.log('Kopf', JSON.stringify(kopf));
      await page.keyboard.press('Control+k'); await warte(page, 1200);
      await page.screenshot({ path: path.join(AUS, 'palette-leer.png'), fullPage: false });
      await page.keyboard.type('Sprache', { delay: 5 }); await warte(page, 1200);
      messwerte.paletteSprache = await page.evaluate(() => [...document.querySelectorAll('#pal-liste [role=option]')].slice(0, 8).map(o => (o.textContent || '').replace(/\s+/g, ' ').trim()));
      await page.screenshot({ path: path.join(AUS, 'palette-sprache.png'), fullPage: false });
      console.log('Palette „Sprache“:', messwerte.paletteSprache.join(' | '));
      await page.keyboard.press('Escape'); await warte(page, 600);
    } catch (e) { messwerte.kopfFehler = String(e).slice(0, 200); console.log('Kopf/Palette FEHLER', messwerte.kopfFehler); }
  }
}

writeFileSync(path.join(AUS, 'messwerte.json'), JSON.stringify(messwerte, null, 2));
await b.close();
console.log('\nFertig. Fotos und messwerte.json in', AUS);
