// Barrierefreiheit F3c (Feinstruktur: Gruppe, Word) im echten Bau: axe-core WCAG 2.2 AA in sechs Zuständen
// (Gruppenmodus, Word-Bereich beim Deuten, Weitergeben mit Passwort, Einlesen mit Passwort, zusammengeführt mit Herkunft, Zusammenlegen)
// + 320 px Breite + Ablauf Weitergeben -> zwei Gruppen -> Einlesen -> Zusammenführen -> Word (geprüft mit scripts/docx-pruefen.mjs).
// Aufruf aus app/:  PORT=4294 node e2e/probe/bf-feinstruktur-f3c-axe.mjs   (Vorschau von dist-f3b1 auf 127.0.0.1)
// Schreibt docs/feinstruktur/bf-f3c/axe.json
import { chromium } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { APP, BASIS, bereit, legeAn, anlegenKlick, grenzenWoerter, axeLauf, ueberbreite } from './feinstruktur-f3b1-lib.mjs';
import { pruefeDocx } from '../../../scripts/docx-pruefen.mjs';

const OUT_DIR = path.resolve(APP, '../docs/feinstruktur/bf-f3c');
const erg = { zeitpunkt: new Date().toISOString(), url: BASIS, browser: 'chromium headless', hauptdatei: null, zustaende: [], breite320: [], ablauf: {}, fehler: [] };

async function axe(page, name) {
  const r = await axeLauf(page);
  const k = r.verstoesse.reduce((s, v) => s + v.knoten.length, 0);
  erg.zustaende.push({ name, verstoesseRegeln: r.verstoesse.length, verstoesseKnoten: k, unklarRegeln: r.unklar.length, bestanden: r.bestanden, ...r });
  console.log(`[${name}] Regeln mit Verstoß: ${r.verstoesse.length} (Stellen ${k}), unklar ${r.unklar.length}, bestanden ${r.bestanden}`);
  for (const v of r.verstoesse) console.log(`   ${v.id} (${v.impact}): ${v.knoten.map((x) => x.ziel).join(' ; ').slice(0, 250)}`);
}
const probiere = async (n, f) => { try { await f(); } catch (e) { erg.fehler.push({ wo: n, fehler: String(e.message || e).slice(0, 400) }); console.log('FEHLER', n, String(e.message || e).slice(0, 300)); } };
const titel = (page, re) => page.getByRole('heading', { level: 2, name: re }).waitFor();
const weiter = (page) => page.getByRole('button', { name: 'Einheit fertig, weiter', exact: true }).click();
async function eintraege(page, k, g) {
  await page.locator(`#fe-k${k}-paraphrase-neu`).fill(`Paraphrase ${k + 1} ${g}.`);
  await page.getByRole('button', { name: 'Paraphrase hinzufügen' }).click();
  await page.locator(`#fe-k${k}-latent-neu`).fill(`Lesart ${k + 1} ${g}.`);
  await page.locator(`#fe-k${k}-latent-neu-pruef`).fill('Es müsste später etwas kommen.');
  await page.getByRole('button', { name: 'Lesart hinzufügen' }).click();
}
const schliessen = async (page) => { await page.getByRole('button', { name: 'Arbeitsplatz schließen' }).click(); await page.getByRole('heading', { level: 3, name: 'Gruppenarbeit' }).waitFor(); };
async function speichern(page, knopf, datei) {
  const [d] = await Promise.all([page.waitForEvent('download', { timeout: 60_000 }), page.getByRole('button', { name: knopf }).click()]);
  const ziel = path.join(OUT_DIR, datei); await d.saveAs(ziel); return ziel;
}

const b = await chromium.launch({ headless: true });
mkdirSync(OUT_DIR, { recursive: true });
try {
  for (const breite of (process.env.NUR ? [Number(process.env.NUR)] : [1280, 320])) await probiere(`Lauf ${breite}`, async () => {
    const { ctx, page } = await bereit(b, { ansicht: 'woerter', vp: { width: breite, height: 900 } });
    const merke = async (z) => { if (breite === 320) { const u = await ueberbreite(page); erg.breite320.push({ zustand: z, ...u, ok: u.scrollWidth <= u.clientWidth }); } else await axe(page, z); };
    erg.hauptdatei ??= await page.evaluate(() => [...document.scripts].map((s) => s.src).filter((x) => /main-/.test(x)).join(' '));
    await legeAn(page, `Basis ${breite}`); await anlegenKlick(page);
    await grenzenWoerter(page, [2, 4, 6, 8]);
    await page.locator('#fe-frage').fill('Wie erzählt die Person über ihren Weg?');
    await page.getByRole('button', { name: 'Einteilung fertig, mit dem Deuten beginnen' }).click();
    await titel(page, /^Deuten: Sinneinheit 1 von 5$/);
    // (l) Gruppenmodus
    await page.getByRole('button', { name: 'Gruppenmodus (für den Beamer)' }).click();
    await page.getByLabel('Wer trägt gerade ein? (freiwillig)').fill('Ana');
    await merke('(l) Gruppenmodus an Einheit 1');
    await page.getByRole('button', { name: 'Gruppenmodus (für den Beamer)' }).click();
    // (m) Word-Bereich beim Deuten
    await page.locator('details.frueher > summary', { hasText: 'Ergebnis aufbereiten und Word' }).click();
    await merke('(m) Ergebnis aufbereiten und Word beim Deuten');
    await schliessen(page);
    // (n) Weitergeben mit Passwort an Gruppe A, ohne an Gruppe B
    await page.locator('#fe-wg-wahl').selectOption({ label: `Basis ${breite}` });
    await page.locator('#fe-wg-gruppe').fill('Gruppe A');
    await page.getByLabel('Mit Passwort schützen').check();
    await page.locator('#fe-wg-pw1').fill('geheim-12345'); await page.locator('#fe-wg-pw2').fill('geheim-12345');
    await merke('(n) Weitergeben mit Passwort');
    const dA = await speichern(page, 'Datei zum Weitergeben speichern', `gruppe-a-${breite}.statable-feinstruktur`);
    await page.locator('#fe-wg-gruppe').fill('Gruppe B');
    await page.getByLabel('Mit Passwort schützen').uncheck();
    const dB = await speichern(page, 'Datei zum Weitergeben speichern', `gruppe-b-${breite}.statable-feinstruktur`);
    // (o) Einlesen mit Passwort
    await page.locator('#fe-ein-datei').setInputFiles(dA);
    await page.locator('#fe-ein-pw').waitFor();
    await merke('(o) Einlesen mit Passwort-Feld');
    await page.locator('#fe-ein-pw').fill('falsch-123456');
    await page.getByRole('button', { name: 'Entschlüsseln und einlesen' }).click();
    await page.getByText('Das Passwort stimmt nicht.').waitFor();
    await page.locator('#fe-ein-pw').fill('geheim-12345');
    await page.getByRole('button', { name: 'Entschlüsseln und einlesen' }).click();
    await page.getByText(/eingelesen \(Gruppe „Gruppe A“\)/).waitFor();
    await page.locator('#fe-ein-datei').setInputFiles(dB);
    await page.getByText(/eingelesen \(Gruppe „Gruppe B“\)/).waitFor();
    // Beide Gruppen deuten Einheit 1 (die eingelesenen Analysen sind die 2. und 3. in der Liste)
    for (const g of ['A', 'B']) {
      await page.locator('li', { hasText: `Gruppe „Gruppe ${g}“` }).getByRole('button', { name: /^Öffnen: / }).click();
      await titel(page, /^Deuten: Sinneinheit 1 von 5$/);
      await eintraege(page, 0, g); await weiter(page);
      await titel(page, /^Deuten: Sinneinheit 2 von 5$/);
      await schliessen(page);
    }
    // Zusammenführen
    const namen = await page.locator('#fe-z-a option').allInnerTexts();
    await page.locator('#fe-z-a').selectOption({ index: 2 });
    await page.locator('#fe-z-b').selectOption({ index: 3 });
    erg.ablauf.namen = namen;
    await page.getByRole('button', { name: 'Zusammenführen', exact: true }).click();
    await page.waitForTimeout(1500); erg.ablauf.nachZusammen = (await page.locator('h2, .warn').allInnerTexts()).join(' | ');
    await titel(page, /^Deuten: Sinneinheit 2 von 5$/);
    await page.locator('details.frueher > summary', { hasText: 'Einträge zu Sinneinheit 1 ansehen und ändern' }).click();
    erg.ablauf.herkunftSichtbar = await page.getByText('(Gruppe A)').count() + await page.getByText('(Gruppe B)').count();
    await page.locator('summary', { hasText: 'Gleiche Einträge zusammenlegen (Paraphrase)' }).first().click();
    await merke('(p) zusammengeführt, Herkunft sichtbar, Zusammenlegen offen');
    const wahl = page.getByRole('group', { name: 'Welche Einträge sagen dasselbe?' }).first().getByRole('checkbox');
    await wahl.nth(0).check(); await wahl.nth(1).check();
    await page.getByRole('button', { name: 'Gewählte zusammenlegen' }).first().click();
    await page.getByLabel('Gemeinsamer Text').fill('Paraphrase 1 gemeinsam.');
    await merke('(q) Zusammenlegen: gemeinsamer Text');
    await page.getByRole('button', { name: 'Zusammenlegen', exact: true }).click();
    erg.ablauf.zusammengelegt = await page.getByRole('textbox', { name: 'Paraphrase 1 (Gruppe A + Gruppe B)' }).count();
    // Word aus der zusammengeführten Analyse (beim Deuten: Einheiten 1 bis 2)
    if (breite === 1280) {
      await page.locator('details.frueher > summary', { hasText: 'Ergebnis aufbereiten und Word' }).click();
      const w = await speichern(page, 'Word-Datei speichern', 'zusammengefuehrt.docx');
      erg.ablauf.wordBefunde = pruefeDocx(readFileSync(w));
    }
    await ctx.close();
  });
  for (const z of erg.breite320) console.log('[320]', z.zustand, z.scrollWidth, z.clientWidth, z.ok ? 'ok' : 'ÜBERBREIT');
  console.log('Ablauf:', JSON.stringify(erg.ablauf));
} finally {
  await b.close();
  writeFileSync(path.join(OUT_DIR, 'axe.json'), JSON.stringify(erg, null, 2), 'utf8');
  console.log('Geschrieben', path.join(OUT_DIR, 'axe.json'), 'Fehler:', erg.fehler.length);
}
