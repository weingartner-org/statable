// Usability Stufe 0 (10.11.): Bedienelemente je Seite zählen (Messlatte vor dem Umbau).
// Zweck: je Seite und Breite (1366x850, 375x812) zählen: Bedienelemente (ohne Fachwort-Links), Fachwort-Links getrennt,
//   Bedienelemente ohne sichtbaren Text, "?"-Hilfeknöpfe, Seitenhöhe (auch internes Scrollen), doppelte Beschriftungen.
// Aufruf (Vorschau auf Port 4300): PORT=4300 [MARKE=stufe1-nachher] node e2e/probe/usability-zaehlen.mjs
// Ergebnis: e2e/ergebnisse/usability-<Datum>.json und .md
// Schreibt nichts in die App. Erster Start: Rundgang wird per localStorage "statable-einst" {rundgang:false} abgeschaltet (nur Messkontext).
// Zählregeln: nur sichtbare Elemente (Größe > 0, nicht visibility:hidden); Eingabefelder, die nur als 1-2 px großes Hilfselement
//   vorliegen (Datei-Eingabe, versteckte Schalter), zählen über ihr umgebendes <label> einmal; Elemente in [inert] oder [aria-hidden] zählen nicht.
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const U = `http://localhost:${process.env.PORT || 4300}/`;
const DATUM = new Date().toISOString().slice(0, 10) + (process.env.MARKE ? '-' + process.env.MARKE : ''); // MARKE=stufe1-vorher hängt einen Namen an
const AUS = new URL('../ergebnisse/', import.meta.url);
mkdirSync(AUS, { recursive: true });
// Stufe 10: TABLET=1 misst zusätzlich 768 x 1024.
const BREITEN = [{ name: '1366x850', width: 1366, height: 850 }, ...(process.env.TABLET === '1' ? [{ name: '768x1024', width: 768, height: 1024 }] : []), { name: '375x812', width: 375, height: 812 }];

/** Läuft im Browser. */
function zaehleImSeite() {
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
  const bereich = (el) => (el.closest('#inhalt') ? 'inhalt' : el.closest('header, .kopf, [role=banner]') ? 'kopf' : 'rest');

  const roh = [...document.querySelectorAll(BEDIEN)];
  const fach = [], bedien = [], gesehen = new Set();
  for (let el of roh) {
    const r = el.getBoundingClientRect();
    // Hilfselemente (winzig): das umgebende Label zählen
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName) && (r.width <= 2 || r.height <= 2 || el.classList.contains('nur-vorleser'))) {
      const lab = el.closest('label');
      if (!lab || gesehen.has(lab)) continue;
      gesehen.add(lab); el = lab;
    }
    if (!sichtbar(el) || gesehen.has(el) && el.tagName !== 'LABEL') continue;
    gesehen.add(el);
    if (istFach(el)) { fach.push(el); continue; }
    bedien.push(el);
  }
  // Fachwort-Links, die nicht zu BEDIEN passten (ohne href): extra suchen
  for (const el of document.querySelectorAll('.begriff-link, .begriff')) if (!gesehen.has(el) && sichtbar(el)) { gesehen.add(el); fach.push(el); }

  const textVon = (el) => {
    if (el.tagName === 'LABEL') return norm(el.innerText) || (el.querySelector('input')?.getAttribute('aria-label') ?? '');
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)) {
      const lt = [...(el.labels ?? [])].map(l => norm(l.innerText)).join(' ');
      if (el.type === 'submit' || el.type === 'button') return norm(el.value);
      return lt;
    }
    return norm(el.innerText) || norm(el.textContent);   // textContent als Rückfall: content-visibility lässt innerText unterhalb des Sichtbereichs leer
  };
  const nameVon = (el) => norm(el.getAttribute('aria-label') || el.getAttribute('title') || '');
  const ohne = [], fragezeichen = [];
  const beschr = new Map();
  for (const el of bedien) {
    const t = textVon(el);
    const hilfe = el.classList.contains('hilfe-link') || t === '?';
    if (hilfe) fragezeichen.push(el);
    if (!hatBuchstabe(t) || t.length === 1 && !/[\p{L}\p{N}]/u.test(t)) ohne.push({ el, hilfe, label: nameVon(el) });
    const b = (t && hatBuchstabe(t) ? t : nameVon(el)).toLowerCase();
    if (b) beschr.set(b, (beschr.get(b) || 0) + 1);
  }
  // Seitenhöhe: Dokument und ggf. intern scrollender Hauptbereich
  const doc = document.documentElement.scrollHeight;
  let intern = null;
  for (const el of document.querySelectorAll('body *')) {
    if (el.clientHeight < innerHeight * 0.4 || el.scrollHeight <= el.clientHeight + 2) continue;
    const ov = getComputedStyle(el).overflowY;
    if (ov !== 'auto' && ov !== 'scroll') continue;
    if (!intern || el.scrollHeight > intern.hoehe) intern = { tag: el.tagName.toLowerCase(), id: el.id, klasse: String(el.className).slice(0, 40), hoehe: el.scrollHeight, sichtbarHoehe: el.clientHeight };
  }
  const ohneKurz = ohne.filter(o => !o.hilfe);
  const cnt = (liste, b) => liste.filter(e => bereich(e) === b).length;
  return {
    bedien: bedien.length,
    bedienInhalt: cnt(bedien, 'inhalt'), bedienKopf: cnt(bedien, 'kopf'), bedienRest: cnt(bedien, 'rest'),
    fachwortLinks: fach.length,
    ohneText: ohne.length, ohneTextOhneHilfeLinks: ohneKurz.length,
    ohneTextLabels: ohne.slice(0, 30).map(o => o.label || '(ohne Name)'),
    fragezeichen: fragezeichen.length,
    seitenhoehe: Math.max(doc, intern?.hoehe ?? 0), dokumentHoehe: doc, internesScrollen: intern,
    doppelt: [...beschr.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 20).map(([t, n]) => ({ text: t.slice(0, 50), n })),
  };
}

async function neuerKontext(b, br) {
  const ctx = await b.newContext({ locale: 'de-DE', viewport: { width: br.width, height: br.height }, acceptDownloads: true });
  await ctx.addInitScript(() => { try { if (!localStorage.getItem('statable-einst')) localStorage.setItem('statable-einst', JSON.stringify({ rundgang: false })); } catch { /* egal */ } });
  return ctx;
}
const warte = (page, ms = 1200) => page.waitForTimeout(ms);

/** t-Test-Blatt "Handy im Bett x Konzentration": Neue Auswertung > Karte "Unterscheiden sich Gruppen?" > Zahl wählen > Gruppe wählen (rechnet sofort). */
async function ttestBlatt(page) {
  await page.goto(U + '#blatt/neu'); await warte(page, 1500);
  await page.locator('[data-karte="gruppen"]').first().click(); await warte(page, 800);
  await page.locator('label.option', { hasText: 'Konzentration' }).first().click(); await warte(page, 600);
  await page.locator('label.option', { hasText: 'Handy im Bett' }).first().click();
  await page.getByRole('heading', { name: 'Ergebnis' }).first().waitFor({ timeout: 30000 });
  await page.waitForTimeout(3000);
  return 'Karte gruppen, Konzentration, Handy im Bett (rechnet sofort)';
}

const b = await chromium.launch();
const ergebnis = { erstellt: new Date().toISOString(), url: U, breiten: {} };
for (const br of BREITEN) {
  const seiten = {};
  const messen = async (page, name, hash, vorher) => {
    try {
      if (hash) { await page.goto(U + hash); }
      if (vorher) await vorher();
      await page.locator('#inhalt').first().waitFor({ state: 'attached', timeout: 8000 }).catch(() => {});
      await warte(page, 1500);
      seiten[name] = { hash: hash ?? '(aktuell)', ...(await page.evaluate(zaehleImSeite)) };
    } catch (e) { seiten[name] = { fehler: String(e).slice(0, 200) }; }
    const x = seiten[name];
    console.log(br.name, name.padEnd(10), x.fehler ? 'FEHLER ' + x.fehler : `bedien ${x.bedien} ohneText ${x.ohneText} ? ${x.fragezeichen} fach ${x.fachwortLinks} höhe ${x.seitenhoehe}`);
  };
  // Start: frischer Kontext ohne Projekt
  const c0 = await neuerKontext(b, br); const p0 = await c0.newPage();
  await p0.goto(U + '#start'); await warte(p0, 2500);
  await messen(p0, 'start', null);
  await c0.close();
  // Projektseiten: frischer Kontext, Beispiel über die Startseite öffnen
  const ctx = await neuerKontext(b, br); const page = await ctx.newPage();
  try {
    await page.goto(U + '#start'); await warte(page, 1500);
    await page.getByRole('button', { name: 'Beispiel öffnen' }).first().click();
    await page.waitForFunction(() => location.hash.startsWith('#daten'), null, { timeout: 120000 });
    await warte(page, 2500);
  } catch (e) { console.log(br.name, 'Beispiel öffnen FEHLER', String(e).slice(0, 150)); seiten._beispielFehler = String(e).slice(0, 200); }
  await messen(page, 'daten', '#daten');
  await messen(page, 'spalten', '#spalten');
  await messen(page, 'blatt-neu', '#blatt/neu');
  await messen(page, 'blatt-ttest', null, async () => { seiten._ttestWeg = await ttestBlatt(page).catch(e => 'FEHLER ' + e); });
  await messen(page, 'bericht', '#bericht');
  await messen(page, 'befehle', '#befehle');
  await messen(page, 'protokoll', '#protokoll');
  await messen(page, 'lernen', '#lernen');
  await messen(page, 'hilfe', '#hilfe');
  await messen(page, 'beispiele', '#beispiele');
  await messen(page, 'einstellungen', '#einstellungen');
  await messen(page, 'verstehen', '#verstehen');
  await messen(page, 'planen', '#planen');
  await ctx.close();
  ergebnis.breiten[br.name] = seiten;
}
await b.close();

writeFileSync(new URL(`usability-${DATUM}.json`, AUS), JSON.stringify(ergebnis, null, 2));
let md = `# Usability Zählung ${DATUM}\n\nErzeugt von e2e/probe/usability-zaehlen.mjs gegen ${U}\n`;
for (const [bn, seiten] of Object.entries(ergebnis.breiten)) {
  md += `\n## ${bn}\n\n| Seite | Bedienelemente | ohne Text | "?" | Fachwort-Links | Seitenhöhe | häufigste Doppelte |\n|---|---|---|---|---|---|---|\n`;
  for (const [n, x] of Object.entries(seiten)) {
    if (n.startsWith('_')) continue;
    if (x.fehler) { md += `| ${n} | FEHLER: ${x.fehler} | | | | | |\n`; continue; }
    const dp = x.doppelt.slice(0, 3).map(d => `${d.text} ×${d.n}`).join('; ');
    md += `| ${n} | ${x.bedien} (Inhalt ${x.bedienInhalt}, Kopf ${x.bedienKopf}, Rest ${x.bedienRest}) | ${x.ohneText} (ohne "?": ${x.ohneTextOhneHilfeLinks}) | ${x.fragezeichen} | ${x.fachwortLinks} | ${x.seitenhoehe}${x.internesScrollen ? ' (intern)' : ''} | ${dp} |\n`;
  }
}
writeFileSync(new URL(`usability-${DATUM}.md`, AUS), md);
console.log('Fertig: e2e/ergebnisse/usability-' + DATUM + '.json/.md');
