// Barrierefreiheit F3B2 (Feinstruktur-Arbeitsplatz im echten Bau): axe-core WCAG 2.2 AA in fünf Zuständen
// (Lesarten prüfen, Füllwort-Angebot, Zwischenreflexion, Übersicht, Zwischenfazit) + 320 px Breite + Tastatur-Probe Sprungknopf.
// Aufruf aus app/:  PORT=4294 node e2e/probe/bf-feinstruktur-f3b2-axe.mjs   (Vorschau von dist-f3b1 auf 127.0.0.1)
// Schreibt docs/feinstruktur/bf-f3b2/axe.json
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { APP, BASIS, bereit, legeAn, anlegenKlick, grenzenWoerter, axeLauf, ueberbreite } from './feinstruktur-f3b1-lib.mjs';

const OUT_DIR = path.resolve(APP, '../docs/feinstruktur/bf-f3b2');
const erg = { zeitpunkt: new Date().toISOString(), url: BASIS, browser: 'chromium headless', hauptdatei: null, grenzen: null, zustaende: [], breite320: [], tastatur: {}, fehler: [] };

async function axe(page, name) {
  const r = await axeLauf(page);
  const k = r.verstoesse.reduce((s, v) => s + v.knoten.length, 0);
  erg.zustaende.push({ name, verstoesseRegeln: r.verstoesse.length, verstoesseKnoten: k, unklarRegeln: r.unklar.length, bestanden: r.bestanden, ...r });
  console.log(`[${name}] Regeln mit Verstoß: ${r.verstoesse.length} (Stellen ${k}), unklar ${r.unklar.length}, bestanden ${r.bestanden}`);
  for (const v of r.verstoesse) console.log(`   ${v.id} (${v.impact}): ${v.knoten.map((x) => x.ziel).join(' ; ').slice(0, 250)}`);
}
const probiere = async (n, f) => { try { await f(); } catch (e) { erg.fehler.push({ wo: n, fehler: String(e.message || e).slice(0, 400) }); console.log('FEHLER', n, String(e.message || e).slice(0, 300)); } };
const kern = (w) => w.toLocaleLowerCase('de').replace(/[\p{P}\p{S}\s]+/gu, '');
const titel = (page, re) => page.getByRole('heading', { level: 2, name: re }).waitFor();
const weiter = (page) => page.getByRole('button', { name: 'Einheit fertig, weiter', exact: true }).click();

/** Grenzen so, dass zwei Einheiten aus genau einem gleichen Wort bestehen (Füllwort-Angebot); sonst gleichmäßig. */
function waehleGrenzen(ws) {
  for (let i = 1; i < ws.length - 3; i++) for (let j = i + 2; j < ws.length - 1; j++) {
    if (kern(ws[i]) && kern(ws[i]) === kern(ws[j]) && j - i >= 2) return { grenzen: [i, i + 1, j, j + 1], fuell: true };
  }
  return { grenzen: [2, 4, 6, 8], fuell: false };
}
async function eintraege(page, k, lesart = true) {
  await page.locator(`#fe-k${k}-paraphrase-neu`).fill(`Paraphrase ${k + 1}.`);
  await page.getByRole('button', { name: 'Paraphrase hinzufügen' }).click();
  if (lesart) {
    await page.locator(`#fe-k${k}-latent-neu`).fill(`Lesart zu Einheit ${k + 1}.`);
    await page.locator(`#fe-k${k}-latent-neu-pruef`).fill('Es müsste später etwas kommen.');
    await page.getByRole('button', { name: 'Lesart hinzufügen' }).click();
  }
}

const b = await chromium.launch({ headless: true });
mkdirSync(OUT_DIR, { recursive: true });
try {
  for (const breite of [1280, 320]) await probiere(`Lauf ${breite}`, async () => {
    const { ctx, page } = await bereit(b, { ansicht: 'woerter', vp: { width: breite, height: 900 } });
    const merke = async (z) => { if (breite === 320) { const u = await ueberbreite(page); erg.breite320.push({ zustand: z, ...u, ok: u.scrollWidth <= u.clientWidth }); } else await axe(page, z); };
    erg.hauptdatei ??= await page.evaluate(() => [...document.scripts].map((s) => s.src).filter((x) => /main-/.test(x)).join(' '));
    await legeAn(page, `Axe F3B2 ${breite}`); await anlegenKlick(page);
    const ws = await page.locator('[role=option]').allInnerTexts();
    const g = waehleGrenzen(ws); erg.grenzen = g;
    await grenzenWoerter(page, g.grenzen);
    await page.locator('#fe-frage').fill('Wie erzählt die Person über ihren Weg?');
    await page.getByRole('button', { name: 'Einteilung fertig, mit dem Deuten beginnen' }).click();
    await titel(page, /^Deuten: Sinneinheit 1 von 5$/);
    await eintraege(page, 0); await weiter(page);
    await titel(page, /^Deuten: Sinneinheit 2 von 5$/);
    await page.getByRole('heading', { level: 3, name: 'Lesarten prüfen' }).waitFor();
    await merke('(g) Lesarten prüfen an Einheit 2');
    await page.getByRole('group', { name: 'Stand von Lesart 1.1 an Sinneinheit 2' }).getByRole('radio', { name: 'verworfen' }).check();
    await page.getByLabel('Begründung').first().fill('Passt nicht zur Fortsetzung.');
    await page.getByRole('button', { name: 'Stand von Lesart 1.1 festhalten' }).click();
    await eintraege(page, 1); await weiter(page);
    await titel(page, /^Deuten: Sinneinheit 3 von 5$/);
    await eintraege(page, 2, false); await weiter(page);
    await titel(page, /^Deuten: Sinneinheit 4 von 5$/);
    if (g.fuell) {
      await page.getByRole('button', { name: 'Deutung von Sinneinheit 2 übernehmen' }).waitFor();
      await merke('(h) Füllwort-Angebot an Einheit 4, verworfene Lesart sichtbar');
      await page.getByRole('button', { name: 'Deutung von Sinneinheit 2 übernehmen' }).click();
    } else erg.fehler.push({ wo: '(h)', fehler: 'kein gleiches Einzelwort im Ausschnitt gefunden - Füllwort-Zustand nicht geprüft' });
    // Tastatur: Sprungknopf bringt den Fokus auf „Einheit fertig, weiter“
    if (breite === 1280) {
      await page.getByRole('button', { name: 'Ans Ende der Karte springen' }).focus();
      await page.keyboard.press('Enter');
      erg.tastatur.sprung = await page.evaluate(() => document.activeElement?.textContent?.trim());
    }
    await weiter(page);
    await titel(page, /^Deuten: Sinneinheit 5 von 5$/);
    await page.getByRole('heading', { level: 3, name: 'Zwischenreflexion nach Sinneinheit 4 (freiwillig)' }).waitFor();
    await page.locator('details.frueher > summary', { hasText: 'Übersicht bis Sinneinheit 5' }).click();
    await merke('(i) Zwischenreflexion nach Einheit 4, Übersicht bis Einheit 5 offen');
    await page.getByLabel('Was haben Sie bisher herausgefunden?').fill('Eine Spur.');
    await page.getByRole('button', { name: 'Zwischenreflexion speichern' }).click();
    await weiter(page);
    await titel(page, /^Alle Sinneinheiten gedeutet$/);
    await merke('(j) Übersicht aller Einheiten mit Formhinweisen');
    await page.getByRole('button', { name: /^Satzanfang einsetzen/ }).click();
    await page.keyboard.type('sich eine Figur zeigt.');
    await page.getByRole('button', { name: 'Deutungsmuster hinzufügen' }).click();
    await page.getByLabel('Sinneinheit für Deutungsmuster 1').selectOption({ index: 2 });
    await page.getByRole('button', { name: 'Textstelle einfügen' }).click();
    await merke('(k) Zwischenfazit mit Muster und Textstelle');
    await ctx.close();
  });
  for (const z of erg.breite320) console.log('[320]', z.zustand, z.scrollWidth, z.clientWidth, z.ok ? 'ok' : 'ÜBERBREIT');
  console.log('Tastatur Sprung:', erg.tastatur.sprung);
} finally {
  await b.close();
  writeFileSync(path.join(OUT_DIR, 'axe.json'), JSON.stringify(erg, null, 2), 'utf8');
  console.log('Geschrieben', path.join(OUT_DIR, 'axe.json'), 'Fehler:', erg.fehler.length);
}
