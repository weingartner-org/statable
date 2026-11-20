// Usability Stufe 3 (10.11.): Rundgang beim ersten Start - beide Wege durchspielen und messen.
// Zweck: Frischer Browser-Kontext OHNE abgeschalteten Rundgang (nichts in localStorage). Beispiel öffnen bis zur Daten-Seite, dann
//   Weg A "Schritt für Schritt" (nur „Weiter“) und Weg B "Ich kenne mich aus" (Wahl mit der Pfeiltaste, dann „Weiter“ bis zum Ende).
//   Je Weg gezählt: Stationen (aus dem Zähler „1 von N“), Klicks, Tasten. Danach geprüft:
//   - profi in localStorage (A: false, B: true)
//   - Seitenleiste eingeklappt (B: ja / A: nein; Klasse rand-eng)
//   - Strg+K-Hinweis sichtbar (B: ja / A: nein); „Verstanden“ drücken, neu laden: kein zweiter Hinweis
//   - B zusätzlich: Alt+4 setzt den Fokus ins Befehlsfeld (Befund 2 aus Messung 0)
//   - B: der eingeklappte Rand zeigt „Daten-Check · N“ als Text (Leitregel R4), sofern der Daten-Check Hinweise hat
// Aufruf: PORT=4301 node e2e/probe/usability-rundgang.mjs   (Vorschau hört auf localhost)
// Optionen: FOTOS=<ordner> (Bildschirmfoto je Station), BREITE=375 (Handy-Breite), KONTRAST=1 (Farbwahl „Schwarz auf Weiß“), MARKE=<name>
// Ergebnis: e2e/ergebnisse/usability-<Datum>-<MARKE>-rundgang.json und .md
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const U = `http://localhost:${process.env.PORT || 4300}/`;
const DATUM = new Date().toISOString().slice(0, 10) + '-' + (process.env.MARKE || 'lauf');
const AUS = new URL('../ergebnisse/', import.meta.url);
mkdirSync(AUS, { recursive: true });
const FOTOS = process.env.FOTOS ? path.resolve(process.env.FOTOS) : '';
if (FOTOS) mkdirSync(FOTOS, { recursive: true });
const BREITE = Number(process.env.BREITE || 1366), HOEHE = BREITE < 600 ? 812 : 850;
const KONTRAST = process.env.KONTRAST === '1';
const warte = (p, ms = 600) => p.waitForTimeout(ms);

async function neuerKontext(b) {
  const ctx = await b.newContext({ locale: 'de-DE', viewport: { width: BREITE, height: HOEHE } });
  await ctx.addInitScript((kontrast) => {
    try {
      if (kontrast && !localStorage.getItem('statable-einst')) {
        localStorage.setItem('statable-einst', JSON.stringify({ thema: 'sw', rundgang: true, profi: false }));
        localStorage.setItem('statable-thema-gewaehlt', '1');
      }
    } catch { /* egal */ }
  }, KONTRAST);
  const page = await ctx.newPage(); page.setDefaultTimeout(20000);
  return { ctx, page };
}

class Zaehler {
  constructor(page) { this.page = page; this.klicks = 0; this.tasten = 0; this.weg = []; }
  async klick(loc, text) { await loc.click(); this.klicks++; this.weg.push(text); await warte(this.page, 500); }
  async taste(key, text) { await this.page.keyboard.press(key); this.tasten++; this.weg.push(text); await warte(this.page, 500); }
}

async function zurDatenSeite(page) {
  await page.goto(U + '#start'); await warte(page, 1800);
  await page.getByRole('button', { name: 'Beispiel öffnen' }).first().click();
  await page.waitForFunction(() => location.hash.startsWith('#daten'), null, { timeout: 120000 });
  await page.getByRole('dialog').first().waitFor({ timeout: 30000 });
  await warte(page, 800);
}
const zaehlerText = (p) => p.locator('.rundgang-blase .zaehler').innerText();
const titel = (p) => p.locator('.rundgang-blase h2').innerText();

async function foto(p, weg, nr, t) {
  if (!FOTOS) return;
  await p.screenshot({ path: path.join(FOTOS, `${weg}-${String(nr).padStart(2, '0')}-${t.replace(/[^\wäöüÄÖÜ]+/g, '_').slice(0, 30)}.png`) });
}

/** Läuft den Rundgang bis zum Ende; gibt die Stationstitel zurück. `nachWahl` darf in Station 1 etwas tun (z. B. wählen). */
async function laufe(m, wegName, nachWahl) {
  const p = m.page; const titelListe = []; let nr = 0;
  for (let guard = 0; guard < 12; guard++) {
    nr++;
    const t = await titel(p);
    if (nr === 1) {
      const aktiv = await p.evaluate(() => { const a = document.activeElement; return a ? `${a.tagName}${a.type ? ':' + a.type : ''}${a.checked ? ':checked' : ''}` : ''; });
      m.weg.push('Fokus in Station 1: ' + aktiv);
      await foto(p, wegName, nr, t + '-vor');
      if (nachWahl) await nachWahl(m);
    }
    const z = await zaehlerText(p);
    titelListe.push(`${t} (${z})`);
    await warte(p, 400); await foto(p, wegName, nr, t);
    const weiter = p.locator('.rundgang-blase button.haupt');
    const letzte = /Los geht/.test(await weiter.innerText());
    await m.klick(weiter, letzte ? '„Los geht’s“' : `„Weiter“ (${z})`);
    if (letzte) break;
  }
  await warte(p, 800);
  return titelListe;
}

const b = await chromium.launch();
const ergebnis = { erstellt: new Date().toISOString(), url: U, breite: BREITE, kontrast: KONTRAST, wege: [] };

for (const weg of ['A', 'B']) {
  const { ctx, page } = await neuerKontext(b);
  const m = new Zaehler(page);
  const e = { weg, name: weg === 'A' ? 'Schritt für Schritt' : 'Ich kenne mich aus', fehler: null, pruefungen: {} };
  try {
    await zurDatenSeite(page);
    const stationen = await laufe(m, weg, weg === 'B' ? async (mm) => { await mm.taste('ArrowDown', 'Pfeil runter: „Ich kenne mich aus“ wählen'); } : null);
    e.stationen = stationen; e.stationenZahl = stationen.length;
    e.klicks = m.klicks; e.tasten = m.tasten;
    const pr = e.pruefungen;
    const einst = (k) => page.evaluate((k2) => { try { return JSON.parse(localStorage.getItem('statable-einst') || '{}')[k2]; } catch { return null; } }, k);
    pr.profiImSpeicher = await einst('profi');
    pr.rundgangBeendet = (await einst('rundgang')) === false;
    pr.dialogWeg = (await page.getByRole('dialog').count()) === 0;
    pr.seitenleisteEingeklappt = await page.evaluate(() => document.documentElement.classList.contains('rand-eng'));
    const verstanden = page.getByRole('group', { name: 'Tipp' }).getByRole('button', { name: 'Verstanden' });
    pr.strgKHinweisSichtbar = await verstanden.isVisible().catch(() => false);
    if (weg === 'B') {
      pr.randTextBeiEingeklappt = await page.evaluate(() => document.querySelector('.rand-schalter .rand-text')?.textContent ?? null);
      await foto(page, weg, 99, 'nach-dem-Rundgang');
      // Alt+4 (Befehle): der Fokus gehört ins Befehlsfeld
      await page.keyboard.press('Alt+4'); await warte(page, 900);
      pr.alt4FokusImBefehlsfeld = await page.evaluate(() => document.activeElement?.id === 'syntax');
      await page.goto(U + '#daten'); await warte(page, 2500);
      if (await verstanden.isVisible().catch(() => false)) { await verstanden.click(); await warte(page, 500); }
      pr.strgKGespeichert = await einst('strgKGesehen');
      await page.reload(); await warte(page, 3000);
      pr.strgKHinweisNachNeuladen = await verstanden.isVisible().catch(() => false);
      pr.rundgangNachNeuladen = (await page.getByRole('dialog').count()) > 0;
      pr.seitenleisteNachNeuladen = await page.evaluate(() => document.documentElement.classList.contains('rand-eng'));
    } else {
      await page.reload(); await warte(page, 3000);
      pr.strgKHinweisNachNeuladen = await verstanden.isVisible().catch(() => false);
      pr.rundgangNachNeuladen = (await page.getByRole('dialog').count()) > 0;
    }
  } catch (err) {
    e.fehler = String(err.message || err).split('\n')[0].slice(0, 300);
    e.klicks = m.klicks; e.tasten = m.tasten;
  }
  e.weg_schritte = m.weg.join(' → ');
  ergebnis.wege.push(e);
  console.log(`Weg ${weg} (${e.name}): Stationen ${e.stationenZahl ?? '?'}, Klicks ${e.klicks}, Tasten ${e.tasten}${e.fehler ? ' FEHLER: ' + e.fehler : ''}`);
  console.log('  ', JSON.stringify(e.pruefungen));
  await ctx.close();
}
await b.close();

const erwartet = {
  A: { profiImSpeicher: false, rundgangBeendet: true, dialogWeg: true, seitenleisteEingeklappt: false, strgKHinweisSichtbar: false, strgKHinweisNachNeuladen: false, rundgangNachNeuladen: false },
  // Stufe 9: der einmalige Strg+K-Hinweis erscheint nicht mehr von selbst (das Suchfeld im Kopf trägt das Kürzel) - darum nicht sichtbar und nicht gespeichert.
  B: { profiImSpeicher: true, rundgangBeendet: true, dialogWeg: true, seitenleisteEingeklappt: true, strgKHinweisSichtbar: false, strgKHinweisNachNeuladen: false, rundgangNachNeuladen: false, alt4FokusImBefehlsfeld: true, strgKGespeichert: false }
};
const erw = { A: 6, B: 3 };
let alleGut = true;
for (const e of ergebnis.wege) {
  e.abweichungen = [];
  if (e.stationenZahl !== erw[e.weg]) e.abweichungen.push(`Stationen ${e.stationenZahl} statt ${erw[e.weg]}`);
  for (const [k, v] of Object.entries(erwartet[e.weg])) if (e.pruefungen[k] !== v) e.abweichungen.push(`${k} = ${e.pruefungen[k]} (erwartet ${v})`);
  if (e.fehler) e.abweichungen.push('Fehler: ' + e.fehler);
  if (e.abweichungen.length) alleGut = false;
}
ergebnis.alleGut = alleGut;

const name = `usability-${DATUM}-rundgang`;
writeFileSync(new URL(name + '.json', AUS), JSON.stringify(ergebnis, null, 2));
let md = `# Usability Rundgang ${DATUM}\n\nErzeugt von e2e/probe/usability-rundgang.mjs gegen ${U} (Breite ${BREITE}${KONTRAST ? ', Kontrast Schwarz auf Weiß' : ''}).\n\n| Weg | Stationen | Klicks | Tasten | Abweichungen |\n|---|---|---|---|---|\n`;
for (const e of ergebnis.wege) md += `| ${e.weg} ${e.name} | ${e.stationenZahl ?? '?'} | ${e.klicks ?? '?'} | ${e.tasten ?? '?'} | ${e.abweichungen.length ? e.abweichungen.join('; ') : 'keine'} |\n`;
for (const e of ergebnis.wege) md += `\n## Weg ${e.weg}: ${e.name}\n\nStationen: ${(e.stationen || []).join(' → ')}\n\nPrüfungen: \`${JSON.stringify(e.pruefungen)}\`\n\nWeg: ${e.weg_schritte}\n`;
writeFileSync(new URL(name + '.md', AUS), md);
console.log((alleGut ? 'ALLES ERFÜLLT' : 'ABWEICHUNGEN') + ' - e2e/ergebnisse/' + name + '.json/.md');
process.exit(alleGut ? 0 : 1);
