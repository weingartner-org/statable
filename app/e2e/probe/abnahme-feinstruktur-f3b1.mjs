// Abnahme F3B1 mit der Muster-Analyse (docs/feinstruktur/beispiele/muster-feinstruktur.json, Quelle interview-b-fl.txt):
// Transkript über die Datei-Eingabe einlesen, Ausschnitt = Muster, 9 Grenzen einmal in Ansicht Wörter, einmal in Ansicht Text, alle Karten füllen,
// dann Seite neu laden, Projekt wieder öffnen und Feld für Feld gegen das Muster vergleichen.
// Aufruf aus app/:  PORT=4294 node e2e/probe/abnahme-feinstruktur-f3b1.mjs ; Schreibt docs/feinstruktur/bf-f3b1/abnahme.json
import { chromium } from 'playwright';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { APP, BASIS, neuerKontext, projektOeffnen } from './feinstruktur-f3b1-lib.mjs';

const DOCS = path.resolve(APP, '../docs/feinstruktur');
const MUSTER = JSON.parse(readFileSync(path.join(DOCS, 'beispiele/muster-feinstruktur.json'), 'utf8'));
const DATEI = path.join(DOCS, 'beispiele/interview-b-fl.txt');
const OUT = path.join(DOCS, 'bf-f3b1/abnahme.json');
const norm = (s) => s.replace(/\s+/g, ' ').trim();
const erg = { zeitpunkt: new Date().toISOString(), analysen: [], notizen: [], fehler: [] };
const notiz = (t) => { erg.notizen.push(t); console.log('NOTIZ', t); };

const einheitenMuster = MUSTER.sinneinheiten;
/** Erwartete Einträge je Einheit und Spalte (Anschluss: das Prüfkriterium der ersten Lesart, weil das JSON kein eigenes Feld „anschluss“ hat) */
const erwartet = einheitenMuster.map((e) => ({
  text: norm(e.text),
  Paraphrase: [e.paraphrase],
  'Intentionen (subjektiver Sinn)': e.intentionen,
  'Latente Bedeutungen (objektiver Sinn)': e.lesarten.map((l) => l.text + ' | Prüfkriterium: ' + l.pruefung),
  Rollenverteilung: [e.rollen],
  'Anschlussoptionen und Prüfung': [e.lesarten[0].pruefung],
}));

/** Alle Einheiten der Übersicht „Alle Sinneinheiten gedeutet“ als Struktur */
const lies = (page) => page.evaluate(() => [...document.querySelectorAll('ol.einheiten > li')].map((li) => {
  const n = (s) => s.replace(/\s+/g, ' ').trim();
  const sp = {};
  li.querySelectorAll('section.spalte').forEach((s) => {
    sp[n(s.querySelector('h3').textContent)] = [...s.querySelectorAll('ol.eintraege > li')].map((e) => {
      const t = n(e.querySelector('span')?.textContent ?? '');
      const p = e.querySelector('.para');
      return p ? t + ' | ' + n(p.textContent).replace(/^Prüfkriterium: /, 'Prüfkriterium: ') : t;
    });
  });
  return { text: n(li.querySelector('p.text')?.textContent ?? ''), spalten: sp };
}));
let PRAEFIX = '';   // Zeitmarke und Sprecherkennung am Anfang des Beitrags, die die App in den Ausschnitt nimmt
function vergleiche(ist) {
  const abw = [];
  if (ist.length !== erwartet.length) abw.push(`Anzahl Einheiten ${ist.length} statt ${erwartet.length}`);
  erwartet.forEach((e, k) => {
    const i = ist[k]; if (!i) return;
    if (i.text !== (k === 0 && PRAEFIX ? PRAEFIX + ' ' + e.text : e.text)) abw.push(`Einheit ${k + 1} Text: „${i.text}“ statt „${e.text}“`);
    for (const sp of Object.keys(e).filter((x) => x !== 'text')) {
      const a = JSON.stringify(i.spalten[sp] ?? null), b = JSON.stringify(e[sp]);
      if (a !== b) abw.push(`Einheit ${k + 1} Spalte ${sp}: ${a.slice(0, 160)} statt ${b.slice(0, 160)}`);
    }
  });
  return abw;
}

async function fuelleKarte(page, k, e) {
  const feld = async (kennung, text, pruef) => {
    if (pruef !== undefined) await page.locator(`#fe-k${k}-${kennung}-neu-pruef`).fill(pruef);
    await page.locator(`#fe-k${k}-${kennung}-neu`).fill(text);
    await page.locator(`#fe-k${k}-${kennung}-neu`).press('Enter');
  };
  await feld('paraphrase', e.paraphrase);
  for (const t of e.intentionen) await feld('intentionen', t);
  for (const l of e.lesarten) await feld('latent', l.text, l.pruefung);
  await feld('rollen', e.rollen);
  await feld('anschluss', e.lesarten[0].pruefung);
}

async function analyse(page, ansicht, name) {
  const R = { name, ansicht, einheiten10: false, abweichungenVorNeuladen: [], abweichungenNachNeuladen: [], listeEinheiten: null };
  erg.analysen.push(R);
  // Ausschnitt
  await page.getByRole('button', { name: /^Feinstrukturanalyse beginnen: / }).first().click();
  await page.getByRole('heading', { level: 2, name: 'Ausschnitt für die Feinstrukturanalyse wählen' }).waitFor();
  await page.locator('#fe-aus-name').fill(name);
  const von = Number(await page.locator('#fe-aus-von').inputValue());
  await page.locator('#fe-aus-bis').selectOption({ index: von });
  R.ausschnittBeitrag = await page.locator('#fe-aus-von option:checked').innerText();
  R.zaehler = (await page.locator('ul.zaehler').innerText()).replace(/\s+/g, ' ');
  R.hinweise = await page.locator('p.hinweis').allInnerTexts();
  await page.locator('#fe-aus-frage').fill(MUSTER.forschungsfrage);
  await page.getByRole('button', { name: 'Feinstrukturanalyse anlegen' }).click();
  await page.getByRole('heading', { level: 2, name: /^Einteilen: Sinneinheiten setzen/ }).waitFor();
  // Wortlaut des Ausschnitts gegen das Muster
  await page.getByRole('radio', { name: 'Text' }).check(); await page.getByRole('radio', { name: 'Wörter' }).check();
  const ws = await page.locator('[role=option]').allInnerTexts();
  const ausschnitt = ws.join(' ');
  const ip = norm(ausschnitt).indexOf(norm(MUSTER.ausschnitt.text));
  R.ausschnittGleichMuster = norm(ausschnitt) === norm(MUSTER.ausschnitt.text);
  R.ausschnittEnthaeltMuster = ip >= 0;
  PRAEFIX = ip > 0 ? norm(ausschnitt).slice(0, ip).trim() : '';
  R.praefix = PRAEFIX;
  const praefixWoerter = PRAEFIX ? PRAEFIX.split(/\s+/).length : 0;
  if (!R.ausschnittGleichMuster) notiz(`${name}: Ausschnitt weicht vom Muster ab: „${ausschnitt.slice(0, 120)}…“ (${ws.length} Wörter, Muster ${MUSTER.ausschnitt.woerter})`);
  R.woerterImAusschnitt = ws.length;
  // Wortindex der Einheitenanfänge
  const starts = []; let pos = praefixWoerter;
  for (const e of einheitenMuster) { starts.push(pos); pos += e.text.split(/\s+/).filter(Boolean).length; }
  R.woerterMusterEinheiten = pos - praefixWoerter;
  if (pos !== ws.length) notiz(`${name}: Muster-Einheiten haben zusammen ${pos} Wörter, der Ausschnitt ${ws.length}`);
  const grenzen = starts.slice(1);   // 9 Grenzen
  // Grenzen setzen
  if (ansicht === 'woerter') {
    await page.getByRole('radio', { name: 'Wörter' }).check();
    await page.locator('[role=option]').first().focus();
    let p = 0;
    for (const g of grenzen) { while (p < g) { await page.keyboard.press('ArrowRight'); p++; } await page.keyboard.press('Enter'); }
  } else {
    await page.getByRole('radio', { name: 'Text' }).check();
    const text = await page.locator('#fe-feld').inputValue();
    let off = 0; const offs = [];
    for (const e of einheitenMuster) { const i = text.indexOf(e.text, off); offs.push(i); off = i + e.text.length; }
    R.textOffsets = offs;
    for (const o of offs.slice(1)) {
      await page.locator('#fe-feld').focus();
      await page.evaluate((x) => { const f = document.getElementById('fe-feld'); f.setSelectionRange(x, x); }, o);
      await page.keyboard.press('Enter'); await page.waitForTimeout(120);
    }
  }
  await page.getByRole('heading', { level: 3, name: /^Eingeteilte Sinneinheiten \(\d+\)$/ }).waitFor();
  R.ueberschriftListe = await page.getByRole('heading', { level: 3, name: /^Eingeteilte Sinneinheiten/ }).innerText();
  const liste = (await page.locator('ol.einheiten > li').allInnerTexts()).map(norm);
  R.listeEinheiten = liste;
  R.einheiten10 = liste.length === 10 && liste.every((t, k) => t === norm((k === 0 && PRAEFIX ? PRAEFIX + ' ' : '') + einheitenMuster[k].text));
  if (!R.einheiten10) notiz(`${name}: Liste der Einheiten weicht ab: ${JSON.stringify(liste).slice(0, 400)}`);
  // deuten
  await page.getByRole('button', { name: 'Einteilung fertig, mit dem Deuten beginnen' }).click();
  for (let k = 0; k < 10; k++) {
    await page.getByRole('heading', { level: 2, name: new RegExp(`^Deuten: Sinneinheit ${k + 1} von 10$`) }).waitFor({ timeout: 15000 });
    await fuelleKarte(page, k, einheitenMuster[k]);
    await page.getByRole('button', { name: 'Einheit fertig, weiter' }).click();
  }
  await page.getByRole('heading', { level: 2, name: 'Alle Sinneinheiten gedeutet' }).waitFor({ timeout: 15000 });
  R.abweichungenVorNeuladen = vergleiche(await lies(page));
  return R;
}

const b = await chromium.launch({ headless: true });
try {
  const { ctx, page } = await neuerKontext(b, { ansicht: 'woerter' });
  await projektOeffnen(page);
  await page.locator('input[type=file]').first().setInputFiles(DATEI);
  await page.getByRole('heading', { name: /^Sprecher zuordnen/ }).waitFor({ timeout: 60000 });
  erg.sprecherDialog = (await page.locator('text=Erkannt als').first().innerText()).replace(/\s+/g, ' ');
  await page.getByRole('button', { name: 'Übernehmen', exact: true }).first().click();
  await page.getByRole('button', { name: /^Feinstrukturanalyse beginnen: / }).first().waitFor({ timeout: 60000 });
  erg.hauptdatei = await page.evaluate(() => [...document.scripts].map((s) => s.src).filter((x) => /main-/.test(x)).join(' '));
  erg.beitraegeImTranskript = await (async () => {
    await page.getByRole('button', { name: /^Feinstrukturanalyse beginnen: / }).first().click();
    await page.getByRole('heading', { level: 2, name: 'Ausschnitt für die Feinstrukturanalyse wählen' }).waitFor();
    const o = await page.locator('#fe-aus-von option').allInnerTexts();
    await page.getByRole('button', { name: 'Abbrechen' }).click();
    await page.getByRole('button', { name: /^Feinstrukturanalyse beginnen: / }).first().waitFor();
    return o;
  })();
  const sch = async () => { await page.getByRole('button', { name: 'Arbeitsplatz schließen' }).click(); await page.getByRole('button', { name: /^Feinstrukturanalyse beginnen: / }).first().waitFor(); };

  await analyse(page, 'woerter', 'Muster Wörter'); await sch();
  await analyse(page, 'text', 'Muster Text'); await sch();
  erg.listeVorNeuladen = await page.locator('ul.liste li').allInnerTexts().then((a) => a.map(norm));

  // Neuladen und Projekt wieder öffnen
  await page.waitForTimeout(1800);
  await page.goto(BASIS, { timeout: 180000 });
  await page.getByRole('button', { name: /^Weiterarbeiten an/ }).click({ timeout: 120000 });
  await page.waitForTimeout(3000);
  await page.evaluate(() => { location.hash = 'interviews'; });
  await page.getByRole('button', { name: /^Öffnen: Muster Wörter$/ }).waitFor({ timeout: 120000 });
  erg.listeNachNeuladen = await page.locator('ul.liste li').allInnerTexts().then((a) => a.map(norm));
  for (const R of erg.analysen) {
    await page.getByRole('button', { name: new RegExp(`^Öffnen: ${R.name}$`) }).click();
    await page.getByRole('heading', { level: 2, name: 'Alle Sinneinheiten gedeutet' }).waitFor({ timeout: 60000 });
    R.abweichungenNachNeuladen = vergleiche(await lies(page));
    R.frageNachNeuladen = norm(await page.locator('.fe > p').nth(0).innerText().catch(() => ''));
    R.eintraegeNachNeuladen = R.abweichungenNachNeuladen.length === 0;
    await sch();
  }
  await ctx.close();
} catch (e) { erg.fehler.push(String(e.stack || e).slice(0, 800)); console.log('FEHLER', e.message); }
finally {
  await b.close();
  mkdirSync(path.dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(erg, null, 2), 'utf8');
  for (const R of erg.analysen) console.log(R.name, '10 Einheiten:', R.einheiten10, '| vor Neuladen Abw.:', R.abweichungenVorNeuladen.length, '| nach Neuladen Abw.:', R.abweichungenNachNeuladen.length);
  console.log('->', OUT);
}
