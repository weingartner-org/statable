// Barrierefreiheit F3B1 (Feinstruktur-Arbeitsplatz im echten Bau): axe-core WCAG 2.2 AA in sechs Zuständen + 320 px Breite.
// Aufruf aus app/:  PORT=4294 node e2e/probe/bf-feinstruktur-f3b1-axe.mjs   (Vorschau von dist-f3b1 auf 127.0.0.1)
// Schreibt docs/feinstruktur/bf-f3b1/axe.json
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { APP, BASIS, bereit, legeAn, anlegenKlick, grenzenWoerter, axeLauf, ueberbreite } from './feinstruktur-f3b1-lib.mjs';

const OUT_DIR = path.resolve(APP, '../docs/feinstruktur/bf-f3b1');
const erg = { zeitpunkt: new Date().toISOString(), url: BASIS, browser: 'chromium headless', hauptdatei: null, zustaende: [], breite320: [], fehler: [] };

async function axe(page, name, notiz = '') {
  const r = await axeLauf(page);
  const k = r.verstoesse.reduce((s, v) => s + v.knoten.length, 0);
  erg.zustaende.push({ name, notiz, verstoesseRegeln: r.verstoesse.length, verstoesseKnoten: k, unklarRegeln: r.unklar.length, bestanden: r.bestanden, ...r });
  console.log(`[${name}] Regeln mit Verstoß: ${r.verstoesse.length} (Stellen ${k}), unklar ${r.unklar.length}, bestanden ${r.bestanden}`);
  for (const v of r.verstoesse) console.log(`   ${v.id} (${v.impact}): ${v.knoten.map((x) => x.ziel).join(' ; ').slice(0, 250)}`);
}
const probiere = async (n, f) => { try { await f(); } catch (e) { erg.fehler.push({ wo: n, fehler: String(e.message || e).slice(0, 400) }); console.log('FEHLER', n, String(e.message || e).slice(0, 300)); } };

/** Aufbau bis Deuten Einheit 2 (3 Einheiten): Frage, Grenzen, Einheit 1 mit Eintrag, weiter */
async function biszuDeuten2(page, name) {
  await legeAn(page, name); await anlegenKlick(page);
  await grenzenWoerter(page, [4, 9]);
  await page.locator('#fe-frage').fill('Wie erzählt die Person über ihren Weg?');
  await page.getByRole('button', { name: 'Einteilung fertig, mit dem Deuten beginnen' }).click();
  await page.getByRole('heading', { level: 2, name: /^Deuten: Sinneinheit 1 von 3$/ }).waitFor();
  await page.locator('#fe-k0-paraphrase-neu').fill('Erste Paraphrase.');
  await page.getByRole('button', { name: 'Paraphrase hinzufügen' }).click();
  await page.getByRole('button', { name: 'Einheit fertig, weiter' }).click();
  await page.getByRole('heading', { level: 2, name: /^Deuten: Sinneinheit 2 von 3$/ }).waitFor();
}
async function eintraege(page, k) {
  await page.locator(`#fe-k${k}-paraphrase-neu`).fill('Paraphrase zur Einheit.');
  await page.getByRole('button', { name: 'Paraphrase hinzufügen' }).click();
  await page.locator(`#fe-k${k}-intentionen-neu`).fill('Die Person möchte etwas zeigen.');
  await page.getByRole('button', { name: 'Intention hinzufügen' }).click();
  await page.locator(`#fe-k${k}-latent-neu`).fill('Eine Lesart.');
  await page.locator(`#fe-k${k}-latent-neu-pruef`).fill('Es müsste später etwas kommen.');
  await page.getByRole('button', { name: 'Lesart hinzufügen' }).click();
}
const leitOffen = (page) => page.locator('details.leit').evaluateAll((els) => els.forEach((d) => { d.open = true; }));

const b = await chromium.launch({ headless: true });
mkdirSync(OUT_DIR, { recursive: true });
try {
  await probiere('(a)', async () => {
    const { ctx, page } = await bereit(b, { ansicht: 'woerter' });
    erg.hauptdatei = await page.evaluate(() => [...document.scripts].map((s) => s.src).filter((x) => /main-/.test(x)).join(' '));
    await legeAn(page, 'Axe A'); await axe(page, '(a) Ausschnitt wählen'); await ctx.close();
  });
  await probiere('(b)', async () => {
    const { ctx, page } = await bereit(b, { ansicht: 'woerter' });
    await legeAn(page, 'Axe B'); await anlegenKlick(page); await grenzenWoerter(page, [4, 9]);
    await page.getByRole('heading', { level: 3, name: 'Eingeteilte Sinneinheiten (3)' }).waitFor();
    await axe(page, '(b) Einteilen, Ansicht Wörter, 2 Grenzen'); await ctx.close();
  });
  await probiere('(c)', async () => {
    const { ctx, page } = await bereit(b, { ansicht: 'text' });
    await legeAn(page, 'Axe C'); await anlegenKlick(page);
    await page.locator('#fe-feld').focus(); await page.keyboard.press('Control+Home');
    for (let i = 0; i < 4; i++) await page.keyboard.press('Control+ArrowRight');
    await page.keyboard.press('Enter');
    await axe(page, '(c) Einteilen, Ansicht Text (1 Grenze)'); await ctx.close();
  });
  await probiere('(d)(e)(f)', async () => {
    const { ctx, page } = await bereit(b, { ansicht: 'woerter' });
    await biszuDeuten2(page, 'Axe D');
    await leitOffen(page);
    await eintraege(page, 1);
    await page.locator('details.frueher > summary').first().click();
    await axe(page, '(d) Deuten Einheit 2, Leitfragen offen, Einträge in 3 Spalten');
    // (e) Rückfrage: zurück zum Einteilen (Frage + Bestätigung), dann Grenze vor Einheit 2 löschen (Einheit 1 gedeutet)
    await page.getByRole('button', { name: 'Zurück zum Einteilen' }).click();
    await page.locator('#fe-zurueck-t').waitFor();
    await page.getByRole('button', { name: 'Zurück zum Einteilen' }).last().click();
    await page.getByRole('heading', { level: 2, name: /^Einteilen: Sinneinheiten setzen/ }).waitFor();
    await page.locator('[role=option].grenze').first().focus(); await page.keyboard.press('Enter');
    await page.locator('#fe-rueck-t').waitFor();
    await axe(page, '(e) Rückfrage zur Grenze sichtbar');
    await page.getByRole('button', { name: 'Grenze ändern' }).click();
    await page.getByRole('heading', { level: 3, name: /^Eingeteilte Sinneinheiten \(2\)$/ }).waitFor();
    // (f) alle gedeutet: 2 Einheiten
    await page.getByRole('button', { name: 'Einteilung fertig, mit dem Deuten beginnen' }).click();
    for (let k = 0; k < 4 && (await page.getByRole('heading', { level: 2, name: 'Alle Sinneinheiten gedeutet' }).count()) === 0; k++) {
      erg.beginnDeutenHeading = erg.beginnDeutenHeading ?? await page.locator('h2').first().innerText();
      await page.getByRole('button', { name: 'Einheit fertig, weiter' }).click(); await page.waitForTimeout(300);
    }
    await page.getByRole('heading', { level: 2, name: 'Alle Sinneinheiten gedeutet' }).waitFor();
    await axe(page, '(f) alle gedeutet (Übersicht)'); await ctx.close();
  });
  await probiere('320', async () => {
    const { ctx, page } = await bereit(b, { ansicht: 'woerter', vp: { width: 320, height: 700 } });
    await legeAn(page, 'Breite'); erg.breite320.push({ zustand: '(a) Ausschnitt wählen', ...(await ueberbreite(page)) });
    await anlegenKlick(page); await grenzenWoerter(page, [4, 9]);
    erg.breite320.push({ zustand: '(b) Einteilen Wörter, 2 Grenzen', ...(await ueberbreite(page)) });
    await page.getByRole('radio', { name: 'Text' }).check();
    erg.breite320.push({ zustand: '(c) Einteilen Text', ...(await ueberbreite(page)) });
    await page.getByRole('radio', { name: 'Wörter' }).check();
    await page.locator('#fe-frage').fill('Frage?');
    await page.getByRole('button', { name: 'Einteilung fertig, mit dem Deuten beginnen' }).click();
    await page.getByRole('heading', { level: 2, name: /^Deuten: Sinneinheit 1 von 3$/ }).waitFor();
    await leitOffen(page); await eintraege(page, 0);
    await page.getByRole('button', { name: 'Einheit fertig, weiter' }).click();
    await page.getByRole('heading', { level: 2, name: /^Deuten: Sinneinheit 2 von 3$/ }).waitFor();
    await leitOffen(page); await eintraege(page, 1);
    erg.breite320.push({ zustand: '(d) Deuten Einheit 2, Leitfragen offen, Einträge', ...(await ueberbreite(page)) });
    for (const z of erg.breite320) { z.ok = z.scrollWidth <= z.clientWidth; console.log('[320]', z.zustand, z.scrollWidth, z.clientWidth, z.ok ? 'ok' : 'ÜBERBREIT'); }
    await ctx.close();
  });
} finally {
  await b.close();
  writeFileSync(path.join(OUT_DIR, 'axe.json'), JSON.stringify(erg, null, 2), 'utf8');
  console.log('Geschrieben', path.join(OUT_DIR, 'axe.json'));
}
