// NVDA-Messung Prototyp F3a (Feinstruktur: Sinneinheiten setzen und deuten): Fragen F-Q9 bis F-Q12 aus
// docs/feinstruktur/PRUEFPLAN-BARRIEREFREIHEIT-FEINSTRUKTUR.md und docs/feinstruktur/FACHBLATT-PROTOTYP-F3A.md.
// Aufruf aus app/ (Vorschau von dist-f3a laeuft, z. B. vite preview --outDir dist-f3a --port 4293):
//   NVDA_PORT=4293 NVDA_OUT=<datei> node e2e/probe/nvda-feinstruktur-f3a.mjs <q9|q10|q11|q12>
//   q9   Konzept 1: Tab ins Feld, Pfeil rechts bis hinter „Naja,“, Enter, dann vor „irgendwann“, Enter, Enter (loeschen)
//   q10  Konzept 2 (Wortliste): dasselbe in der Liste: „ich“ (Enter), „irgendwann“ (Enter, Enter)
//   q11  #muster: Deuten beginnen, Sinneinheit 2 erreichen, Strg+Pos1 (Anfang der Seite), dann Pfeil runter bis Seitenende, alles mitschreiben
//   q12  #muster: Phase Deuten Einheit 2, NVDA+Strg+F (Suchen) nach „funktioniert“
// Regeln wie nvda-feinstruktur-f2.mjs: Tasten nur ueber K/C/T (echt von NVDA); Playwright nur fuer den Aufbau (als "aufbau" vermerkt).
// Hinweis: „NVDA+Strg+Pos1“ gibt es im Lesemodus nicht als eigenen Befehl (Strg+Pos1 springt dort an den Seitenanfang); das Skript nutzt Control+Home.
import { execSync } from 'node:child_process';
import { sleep, K, C, T, note, aufbau, rec, spoken, mitNvda, nachVorn } from './nvda-erheben1-lib.mjs';

const phase = process.argv[2] ?? 'q9';
const BASE = `http://127.0.0.1:${process.env.NVDA_PORT ?? 4293}/feinstruktur-probe/`;

// Bedingung: johan nicht aktiv ueber rdp-tcp verbunden
function bedingung() {
  let q = ''; try { q = execSync('query session', { encoding: 'latin1' }); } catch (e) { q = String(e.stdout ?? ''); }
  const aktivRdp = q.split('\n').some((z) => /rdp-tcp#/i.test(z) && /johan/i.test(z) && /Aktiv/i.test(z));
  return { ok: !aktivRdp, q: q.trim().replace(/\s+/g, ' ').slice(0, 300) };
}
{ const b = bedingung(); if (!b.ok) { console.log('NICHT GEMESSEN: Sitzung per RDP aktiv', b.q); process.exit(3); } }

const dom = (page) => page.evaluate(() => {
  const e = document.activeElement;
  return { hash: location.hash, fokus: e ? e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + ' "' + (e.getAttribute('aria-label') || e.textContent || e.value || '').replace(/\s+/g, ' ').trim().slice(0, 70) + '"' : null,
    ansagen: (window.__ansagen || []).slice(-4).map((a) => a.text), einheiten: document.querySelectorAll('ol.einheiten li').length };
});
const frisch = (page) => page.evaluate(() => { window.__ansagen = []; });
async function m(page, tag, taste, opt = {}) { await frisch(page); const r = await K(tag, taste, { wait: 1200, ...opt }); await sleep(300); rec({ schritt: tag + ' (DOM)', dom: await dom(page) }); return r; }
async function warte(page, tag, n = 2) { for (let i = 1; i <= n; i++) { await sleep(1500); rec({ schritt: `${tag} Warten ${(i * 1.5).toFixed(1)} s`, gesagt: await spoken() }); } rec({ schritt: tag + ' nach Warten (DOM)', dom: await dom(page) }); }
async function fokusSetzen(page, sel, text) {
  await page.locator(sel).first().focus(); aufbau(`Fokus per Skript auf ${text ?? sel}`);
  await page.bringToFront(); await nachVorn(); await frisch(page); await spoken();
}
/** n Mal dieselbe Taste, knapp getaktet, ohne Zustandsabfrage (nur das Gesprochene wird je Taste mitgeschrieben) */
async function viele(tag, taste, n, wait = 160) { for (let i = 1; i <= n; i++) await K(`${tag} ${i}/${n}`, taste, { wait, zeige: false }); }

async function oeffne(page, hash) {
  await page.goto(BASE + hash); await page.getByRole('heading', { level: 1 }).waitFor({ timeout: 30000 }); await sleep(1500);
  await page.bringToFront(); await nachVorn();
  note('hauptskript', await page.evaluate(() => [...document.scripts].map((s) => s.src).join(' ')));
}
/** Ab „#muster“: Deuten beginnen und bis Sinneinheit 2 weitergehen; Tasten echt (Enter), Fokus per Skript auf die Knoepfe */
async function zuEinheit2(page) {
  await fokusSetzen(page, 'button:has-text("mit dem Deuten beginnen")', 'Knopf „mit dem Deuten beginnen“');
  await C('NVDA+Tab (Knopf)', 'reportCurrentFocus');
  await m(page, 'Enter (Deuten beginnen)', 'Enter', { wait: 1800 }); await warte(page, 'Phase Deuten', 2);
  await fokusSetzen(page, 'button:has-text("Weiter zur nächsten")', 'Knopf „Weiter zur nächsten Sinneinheit“');
  await m(page, 'Enter (Weiter zu Sinneinheit 2)', 'Enter', { wait: 1800 }); await warte(page, 'Sinneinheit 2', 2);
}

await mitNvda('f3a-' + phase, async (page) => {
  if (phase === 'q9') {
    await oeffne(page, '#konzept=1');
    await fokusSetzen(page, '#fe-feld', 'Textfeld „Ausschnitt, Grenzen mit Enter setzen“ (Konzept 1)');
    await C('Q9 NVDA+Tab (Feld)', 'reportCurrentFocus');
    await viele('Q9 Pfeil rechts bis hinter „Naja,“', 'ArrowRight', 5);
    await m(page, 'Q9 Enter (Grenze 1 setzen)', 'Enter'); await warte(page, 'Q9 Grenze 1', 2);
    const noetig = await page.evaluate(() => { const t = document.getElementById('fe-feld').value; return t.indexOf('irgendwann') - document.getElementById('fe-feld').selectionStart; });
    note('Q9', `Zeichen bis vor „irgendwann“: ${noetig}`);
    await viele('Q9 Pfeil rechts bis vor „irgendwann“', 'ArrowRight', noetig);
    await m(page, 'Q9 Enter (Grenze 2 setzen)', 'Enter'); await warte(page, 'Q9 Grenze 2', 2);
    await m(page, 'Q9 Enter (dieselbe Grenze loeschen)', 'Enter'); await warte(page, 'Q9 Grenze geloescht', 2);
    rec({ schritt: 'Q9 Liste (DOM)', liste: await page.evaluate(() => [...document.querySelectorAll('ol.einheiten li')].map((l) => l.textContent.slice(0, 40))) });
  }

  if (phase === 'q10') {
    await oeffne(page, '#konzept=2');
    await fokusSetzen(page, '[role=option] >> nth=0', 'erstes Wort der Wortliste (Konzept 2)');
    await C('Q10 NVDA+Tab (erstes Wort)', 'reportCurrentFocus');
    await m(page, 'Q10 Enter am ersten Wort (keine Grenze moeglich)', 'Enter'); await warte(page, 'Q10 erstes Wort', 1);
    await m(page, 'Q10 Pfeil rechts (ich)', 'ArrowRight');
    await m(page, 'Q10 Enter (Grenze vor „ich“)', 'Enter'); await warte(page, 'Q10 Grenze 1', 2);
    const noetig = await page.evaluate(() => { const w = [...document.querySelectorAll('[role=option]')]; const i = w.findIndex((x) => x.textContent === 'irgendwann'); const a = w.findIndex((x) => x === document.activeElement); return i - a; });
    note('Q10', `Woerter bis „irgendwann“: ${noetig}`);
    await viele('Q10 Pfeil rechts bis „irgendwann“', 'ArrowRight', noetig, 400);
    rec({ schritt: 'Q10 Beschreibung des Eintrags (DOM)', desc: await page.evaluate(() => document.activeElement?.getAttribute('aria-description')) });
    await m(page, 'Q10 Enter (Grenze 2 setzen)', 'Enter'); await warte(page, 'Q10 Grenze 2', 2);
    await m(page, 'Q10 Enter (loeschen)', 'Enter'); await warte(page, 'Q10 Grenze geloescht', 2);
    await m(page, 'Q10 Pfeil links (Wort davor)', 'ArrowLeft');
    rec({ schritt: 'Q10 Liste (DOM)', liste: await page.evaluate(() => [...document.querySelectorAll('ol.einheiten li')].map((l) => l.textContent.slice(0, 40))) });
  }

  if (phase === 'q11') {
    await oeffne(page, '#konzept=1&muster');
    rec({ schritt: 'Q11 Stand Einteilen (DOM)', dom: await dom(page) });
    await zuEinheit2(page);
    // Lesemodus von oben bis zum Seitenende: kommt etwas hinter Sinneinheit 2?
    await m(page, 'Q11 Strg+Pos1 (Seitenanfang, Lesemodus)', 'Control+Home', { wait: 1500 });
    const alles = [];
    for (let i = 1; i <= 45; i++) {
      const r = await K(`Q11 Pfeil runter ${i}`, 'ArrowDown', { wait: 450, zeige: false });
      alles.push(...(r?.gesagt ?? []));
      if (i > 5 && r && r.gesagt.length === 0) { note('Q11', `Seitenende bei Pfeil ${i} (nichts mehr gesagt)`); break; }
    }
    rec({ schritt: 'Q11 alles Gesagte', text: alles.join(' | ') });
    const spaeter = ['Eltern', 'Gefühl', 'funktioniert', 'Handwerk', 'verstehen'];
    rec({ schritt: 'Q11 spaetere Woerter im Gesagten', gefunden: spaeter.filter((w) => alles.join(' ').includes(w)) });
    rec({ schritt: 'Q11 spaetere Woerter im DOM', gefunden: await page.evaluate((ws) => ws.filter((w) => document.body.innerText.includes(w) || document.documentElement.outerHTML.includes(w)), spaeter) });
  }

  if (phase === 'q12') {
    await oeffne(page, '#konzept=1&muster');
    await zuEinheit2(page);
    await C('Q12 NVDA+Strg+F (Suchen)', 'find', { wait: 1500 });
    await T('Q12 Suchtext tippen', 'funktioniert', { wait: 800 });
    await m(page, 'Q12 Enter (suchen)', 'Enter', { wait: 2000 });
    await warte(page, 'Q12 Ergebnis', 2);
    await C('Q12 NVDA+Umschalt+F3? Naechstes finden (findNext)', 'findNext', { wait: 1500 });
    await C('Q12 NVDA+Tab', 'reportCurrentFocus');
    rec({ schritt: 'Q12 Wort im DOM', vorhanden: await page.evaluate(() => document.documentElement.outerHTML.includes('funktioniert')) });
  }
});
