// Ausbau A5 (aus A4 übernommen): Zählen gegen Überladung, vorher/nachher und je Arbeitsweise (Prüfplan Abschnitt 2). Zählregel und Funktion `zaehleImSeite` stammen aus usability-zaehlen.mjs (wird zur Laufzeit herausgelesen, nicht kopiert).
// Misst: Startseite, #interviews (Erstbesuch), #kodieren (Erstbesuch), dazu A5: #kodieren mit dem Mixed-Methods-Beispiel (Klappe Berichtshilfe zu), bei 1366x850 und 375x812.
// Aufruf aus app/:  PORT=4291 MARKE=a2-nachher node e2e/probe/bf-ausbau-a5-zaehlen.mjs   (MARKE=a5-vorher am Startcommit)
import { chromium } from 'playwright';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const APP = fileURLToPath(new URL('../..', import.meta.url));
const U = process.env.URL_ZIEL || `http://127.0.0.1:${process.env.PORT || 5391}/`;
const MARKE = process.env.MARKE || 'a6a-nachher';
const OUT = path.resolve(APP, '../docs/ausbau/bf-a6a');
mkdirSync(OUT, { recursive: true });

const quelle = readFileSync(path.join(APP, 'e2e/probe/usability-zaehlen.mjs'), 'utf8');
const i = quelle.indexOf('function zaehleImSeite()');
const j = quelle.indexOf('async function neuerKontext');
const ZAEHLE = quelle.slice(i, j);

const BREITEN = [{ name: '1366x850', width: 1366, height: 850 }];
const ergebnis = { erstellt: new Date().toISOString(), url: U, marke: MARKE, breiten: {} };
const b = await chromium.launch();
for (const br of BREITEN) {
  const seiten = {};
  const neu = async () => {
    const ctx = await b.newContext({ locale: 'de-DE', viewport: { width: br.width, height: br.height } });
    await ctx.addInitScript(() => { try { if (!localStorage.getItem('statable-einst')) localStorage.setItem('statable-einst', JSON.stringify({ rundgang: false })); } catch { /* egal */ } });
    return ctx;
  };
  const messe = async (name, hash, vorher) => {
    const ctx = await neu(); const page = await ctx.newPage();
    try {
      await page.goto(U + hash); await page.waitForTimeout(2500);
      if (vorher) await vorher(page);
      await page.waitForTimeout(1500);
      seiten[name] = { hash, ...(await page.evaluate(`(${ZAEHLE})()`)) };
      // Chromium liefert für den Inhalt zugeklappter <details> trotzdem Größen; die Zählregel zählt ihn mit. Hier getrennt gezählt (ohne die Zusammenfassung selbst).
      seiten[name].inZugeklappten = await page.evaluate(() => {
        const sel = 'button, a[href], input:not([type=hidden]), select, textarea, summary, [role=button], [role=tab], [role=link], [role=menuitem], [role=switch], [role=checkbox], [role=radio]';
        const menge = new Set();
        for (let el of document.querySelectorAll(sel)) {
          const d = el.closest('details:not([open])');
          if (!d || el.closest('summary')) continue;
          const r = el.getBoundingClientRect();
          if (['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName) && (r.width <= 2 || r.height <= 2 || el.classList.contains('nur-vorleser'))) { const l = el.closest('label'); if (!l) continue; el = l; }
          const rr = el.getBoundingClientRect();
          if (rr.width <= 0 || rr.height <= 0 || el.closest('[inert], [aria-hidden="true"]')) continue;
          if (el.matches('.begriff-link, .begriff') || el.closest('.begriff-link')) continue;
          menge.add(el);
        }
        return menge.size;
      });
      seiten[name].bedienSichtbar = seiten[name].bedien - seiten[name].inZugeklappten;
    } catch (e) { seiten[name] = { fehler: String(e).slice(0, 200) }; }
    const x = seiten[name];
    console.log(br.name, name.padEnd(22), x.fehler ? 'FEHLER ' + x.fehler : `bedien ${x.bedien} (davon in zugeklappten ${x.inZugeklappten}, sichtbar ${x.bedienSichtbar}; Inhalt ${x.bedienInhalt}, Kopf ${x.bedienKopf}, Rest ${x.bedienRest}) ohneText ${x.ohneText} ? ${x.fragezeichen} fach ${x.fachwortLinks} höhe ${x.seitenhoehe}`);
    await ctx.close();
  };
  await messe('start', '#start');
  await messe('interviews', '#interviews');
  await messe('kodieren-erstbesuch', '#kodieren', async (p) => { await p.waitForSelector('#ko-t'); });
  // A5: Mixed-Methods-Beispiel öffnen (neues Projekt mit fünf Interviews); der Bereich Nachvollziehbarkeit hat jetzt eine zweite Klappe
  await messe('kodieren-beispiel', '#kodieren', async (p) => {
    await p.waitForSelector('#ko-t');
    await p.evaluate(() => { location.hash = 'kodieren/beispiel-mm'; });
    await p.waitForSelector('#ko-mm-t', { timeout: 120000 }); await p.waitForTimeout(2000);
  });
  await messe('kodieren-beispielprojekt', '#kodieren', async (p) => { await p.waitForSelector('#ko-laden'); await p.locator('#ko-laden').click(); await p.waitForSelector('#ko-text', { timeout: 30000 }); });
  ergebnis.breiten[br.name] = seiten;
}
await b.close();
writeFileSync(path.join(OUT, `zaehlen-${MARKE}.json`), JSON.stringify(ergebnis, null, 2), 'utf8');
console.log('Geschrieben: zaehlen-' + MARKE + '.json');
