// NVDA-Messung F3B1 (Feinstruktur-Arbeitsplatz, echte Seite „Interviews“): Fragen F-Q9 bis F-Q12 aus
// docs/feinstruktur/PRUEFPLAN-BARRIEREFREIHEIT-FEINSTRUKTUR.md und docs/feinstruktur/FACHBLATT-PROTOTYP-F3A.md, jetzt im echten Arbeitsplatz statt auf der (gelöschten) Probe-Seite.
// Aufruf aus app/ (Vorschau von dist-f3b1 läuft: npx vite preview --outDir dist-f3b1 --port 4294 --host 127.0.0.1 --strictPort):
//   NVDA_PORT=4294 NVDA_OUT=<datei> node e2e/probe/nvda-feinstruktur-f3b1.mjs <q9|q10|q11|q12>
//   q9   Ansicht Text: Tab ins Feld, Pfeil rechts bis hinter „Naja,“, Enter, dann vor „irgendwann“, Enter, Enter (löschen)
//   q10  Ansicht Wörter: dasselbe in der Liste: erstes Wort (Enter, keine Grenze), „ich“ (Enter), „irgendwann“ (Enter, Enter)
//   q11  Muster-Grenzen: Deuten beginnen, Sinneinheit 2 erreichen, Strg+Pos1 (Seitenanfang), dann Pfeil runter bis Seitenende, alles mitschreiben
//   q12  Muster-Grenzen: Phase Deuten Einheit 2, NVDA+Strg+F (Suchen) nach „funktioniert“
// Regeln wie nvda-feinstruktur-f3a.mjs: Tasten nur über K/C/T (echt von NVDA); Playwright nur für den Aufbau (als "aufbau" vermerkt).
// Aufbau: Beispiel-Projekt öffnen, docs/feinstruktur/beispiele/interview-b-fl.txt einlesen, Ausschnitt = Beitrag 3 (Muster-Ausschnitt; er beginnt in der App mit „[00:00:10] B1:“), Analyse anlegen.
// Hinweis: „NVDA+Strg+Pos1“ gibt es im Lesemodus nicht als eigenen Befehl (Strg+Pos1 springt dort an den Seitenanfang); das Skript nutzt Control+Home.
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

process.env.NVDA_PORT ??= '4294';
const { sleep, K, C, T, note, aufbau, rec, spoken, mitNvda, nachVorn, BASE } = await import('./nvda-erheben1-lib.mjs');

const phase = process.argv[2] ?? 'q9';
const DATEI = path.resolve(fileURLToPath(new URL('../../..', import.meta.url)), 'docs/feinstruktur/beispiele/interview-b-fl.txt');
const FRAGE = 'Wie stellt die befragte Person den Entschluss zum Studium nach einer abgeschlossenen Lehre dar?';
// Bedingung: johan nicht aktiv über rdp-tcp verbunden (unverändert aus F3a)
function bedingung() {
  let q = ''; try { q = execSync('query session', { encoding: 'latin1' }); } catch (e) { q = String(e.stdout ?? ''); }
  const aktivRdp = q.split('\n').some((z) => /rdp-tcp#/i.test(z) && /johan/i.test(z) && /Aktiv/i.test(z));
  // Plan autonom 5.4: aktive, unberührte Sitzung (Leerlauf ≥ 15 min, vom Dirigenten geprüft) ist erlaubt
  return { ok: !aktivRdp || process.env.NVDA_RDP_LEERLAUF === '1', q: q.trim().replace(/\s+/g, ' ').slice(0, 300) };
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

/** Aufbau per Playwright (nicht gemessen): Beispiel-Projekt, Transkript einlesen, Ausschnitt = Beitrag 3, Analyse anlegen; optional Muster-Grenzen und Forschungsfrage */
async function aufbauAnalyse(page, { ansicht, muster }) {
  await page.goto(BASE + '#beispiele', { waitUntil: 'load' }); await sleep(1500);
  await page.evaluate((a) => { try { localStorage.setItem('statable-feinstruktur-ansicht', a); } catch { /* egal */ } }, ansicht);
  await page.getByRole('button', { name: 'Öffnen', exact: true }).first().click({ timeout: 120000 });
  await page.waitForFunction(() => !location.hash.startsWith('#beispiele'), undefined, { timeout: 240000 }); await sleep(3000);
  await page.evaluate(() => { location.hash = 'interviews'; });
  await page.locator('input[type=file]').first().setInputFiles(DATEI);
  await page.getByRole('heading', { name: /^Sprecher zuordnen/ }).waitFor({ timeout: 60000 });
  await page.getByRole('button', { name: 'Übernehmen', exact: true }).first().click();
  await page.getByRole('button', { name: /^Feinstrukturanalyse beginnen: / }).first().click({ timeout: 60000 });
  await page.getByRole('heading', { level: 2, name: 'Ausschnitt für die Feinstrukturanalyse wählen' }).waitFor();
  const von = Number(await page.locator('#fe-aus-von').inputValue());
  await page.locator('#fe-aus-bis').selectOption({ index: von });
  await page.locator('#fe-aus-name').fill('NVDA F3B1');
  await page.locator('#fe-aus-frage').fill(FRAGE);
  await page.getByRole('button', { name: 'Feinstrukturanalyse anlegen' }).click();
  await page.getByRole('heading', { level: 2, name: /^Einteilen: Sinneinheiten setzen/ }).waitFor();
  if (muster) {
    // Grenzen der Musterlösung in Ansicht Wörter setzen: Einheit 2 beginnt am Wort „ich“ usw.
    await page.getByRole('radio', { name: 'Wörter' }).check();
    const ws = await page.locator('[role=option]').allInnerTexts();
    const starts = []; let pos = ws.indexOf('Naja,'); const einheiten = [1, 8, 7, 1, 8, 8, 7, 8, 5, 8];   // Wörter je Muster-Einheit (aus muster-feinstruktur.json)
    for (const n of einheiten) { starts.push(pos); pos += n; }
    await page.locator('[role=option]').first().focus();
    let p = 0; for (const g of starts.slice(1)) { while (p < g) { await page.keyboard.press('ArrowRight'); p++; } await page.keyboard.press('Enter'); }
    aufbau(`Muster-Grenzen gesetzt (Playwright): ${await page.locator('ol.einheiten li').count()} Einheiten`);
  }
  aufbau(`Analyse angelegt (Ansicht ${ansicht}, Muster-Grenzen: ${muster ? 'ja' : 'nein'})`);
  await page.bringToFront(); await nachVorn();
}
/** Ab Muster-Grenzen: Deuten beginnen und bis Sinneinheit 2 weitergehen; Tasten echt (Enter), Fokus per Skript auf die Knöpfe */
async function zuEinheit2(page) {
  await fokusSetzen(page, 'button:has-text("mit dem Deuten beginnen")', 'Knopf „Einteilung fertig, mit dem Deuten beginnen“');
  await C('NVDA+Tab (Knopf)', 'reportCurrentFocus');
  await m(page, 'Enter (Deuten beginnen)', 'Enter', { wait: 1800 }); await warte(page, 'Phase Deuten', 2);
  await fokusSetzen(page, 'button:has-text("Einheit fertig, weiter")', 'Knopf „Einheit fertig, weiter“');
  await m(page, 'Enter (weiter zu Sinneinheit 2)', 'Enter', { wait: 1800 }); await warte(page, 'Sinneinheit 2', 2);
}

await mitNvda('f3b1-' + phase, async (page) => {
  note('hauptskript', await page.evaluate(() => location.href));
  if (phase === 'q9') {
    await aufbauAnalyse(page, { ansicht: 'text', muster: false });
    note('hauptskript', await page.evaluate(() => [...document.scripts].map((s) => s.src).join(' ')));
    await fokusSetzen(page, '#fe-feld', 'Textfeld „Ausschnitt, Grenzen mit Enter setzen“ (Ansicht Text)');
    await C('Q9 NVDA+Tab (Feld)', 'reportCurrentFocus');
    const bisNaja = await page.evaluate(() => { const f = document.getElementById('fe-feld'); return Array.from(f.value.slice(0, f.value.indexOf('Naja,') + 'Naja,'.length)).length - f.selectionStart; });
    note('Q9', `Zeichen bis hinter „Naja,“: ${bisNaja}`);
    await viele('Q9 Pfeil rechts bis hinter „Naja,“', 'ArrowRight', bisNaja);
    await m(page, 'Q9 Enter (Grenze 1 setzen)', 'Enter'); await warte(page, 'Q9 Grenze 1', 2);
    const noetig = await page.evaluate(() => { const f = document.getElementById('fe-feld'); return f.value.indexOf('irgendwann') - f.selectionStart; });
    note('Q9', `Zeichen bis vor „irgendwann“: ${noetig}`);
    await viele('Q9 Pfeil rechts bis vor „irgendwann“', 'ArrowRight', noetig);
    await m(page, 'Q9 Enter (Grenze 2 setzen)', 'Enter'); await warte(page, 'Q9 Grenze 2', 2);
    await m(page, 'Q9 Enter (dieselbe Grenze löschen)', 'Enter'); await warte(page, 'Q9 Grenze gelöscht', 2);
    rec({ schritt: 'Q9 Liste (DOM)', liste: await page.evaluate(() => [...document.querySelectorAll('ol.einheiten li')].map((l) => l.textContent.slice(0, 40))) });
  }

  if (phase === 'q10') {
    await aufbauAnalyse(page, { ansicht: 'woerter', muster: false });
    await fokusSetzen(page, '[role=option] >> nth=0', 'erstes Wort der Wortliste (Ansicht Wörter)');
    await C('Q10 NVDA+Tab (erstes Wort)', 'reportCurrentFocus');
    await m(page, 'Q10 Enter am ersten Wort (keine Grenze möglich)', 'Enter'); await warte(page, 'Q10 erstes Wort', 1);
    const bisIch = await page.evaluate(() => { const w = [...document.querySelectorAll('[role=option]')]; return w.findIndex((x) => x.textContent === 'ich') - w.findIndex((x) => x === document.activeElement); });
    note('Q10', `Wörter bis „ich“: ${bisIch}`);
    await viele('Q10 Pfeil rechts bis „ich“', 'ArrowRight', bisIch, 400);
    await m(page, 'Q10 Enter (Grenze vor „ich“)', 'Enter'); await warte(page, 'Q10 Grenze 1', 2);
    const noetig = await page.evaluate(() => { const w = [...document.querySelectorAll('[role=option]')]; const i = w.findIndex((x) => x.textContent === 'irgendwann'); const a = w.findIndex((x) => x === document.activeElement); return i - a; });
    note('Q10', `Wörter bis „irgendwann“: ${noetig}`);
    await viele('Q10 Pfeil rechts bis „irgendwann“', 'ArrowRight', noetig, 400);
    rec({ schritt: 'Q10 Beschreibung des Eintrags (DOM)', desc: await page.evaluate(() => document.activeElement?.getAttribute('aria-description')) });
    await m(page, 'Q10 Enter (Grenze 2 setzen)', 'Enter'); await warte(page, 'Q10 Grenze 2', 2);
    await m(page, 'Q10 Enter (löschen)', 'Enter'); await warte(page, 'Q10 Grenze gelöscht', 2);
    await m(page, 'Q10 Pfeil links (Wort davor)', 'ArrowLeft');
    rec({ schritt: 'Q10 Liste (DOM)', liste: await page.evaluate(() => [...document.querySelectorAll('ol.einheiten li')].map((l) => l.textContent.slice(0, 40))) });
  }

  if (phase === 'q11') {
    await aufbauAnalyse(page, { ansicht: 'woerter', muster: true });
    rec({ schritt: 'Q11 Stand Einteilen (DOM)', dom: await dom(page) });
    await zuEinheit2(page);
    // Lesemodus von oben bis zum Seitenende: kommt etwas hinter Sinneinheit 2?
    await m(page, 'Q11 Strg+Pos1 (Seitenanfang, Lesemodus)', 'Control+Home', { wait: 1500 });
    const alles = [];
    for (let i = 1; i <= 80; i++) {
      const r = await K(`Q11 Pfeil runter ${i}`, 'ArrowDown', { wait: 450, zeige: false });
      alles.push(...(r?.gesagt ?? []));
      if (i > 5 && r && r.gesagt.length === 0) { note('Q11', `Seitenende bei Pfeil ${i} (nichts mehr gesagt)`); break; }
    }
    rec({ schritt: 'Q11 alles Gesagte', text: alles.join(' | ') });
    const spaeter = ['Eltern', 'Gefühl', 'funktioniert', 'Handwerk', 'verstehen'];
    rec({ schritt: 'Q11 spätere Wörter im Gesagten', gefunden: spaeter.filter((w) => alles.join(' ').includes(w)) });
    rec({ schritt: 'Q11 spätere Wörter im DOM', gefunden: await page.evaluate((ws) => ws.filter((w) => document.body.innerText.includes(w) || document.documentElement.outerHTML.includes(w)), spaeter) });
  }

  if (phase === 'q12') {
    await aufbauAnalyse(page, { ansicht: 'woerter', muster: true });
    await zuEinheit2(page);
    await C('Q12 NVDA+Strg+F (Suchen)', 'find', { wait: 1500 });
    await T('Q12 Suchtext tippen', 'funktioniert', { wait: 800 });
    await m(page, 'Q12 Enter (suchen)', 'Enter', { wait: 2000 });
    await warte(page, 'Q12 Ergebnis', 2);
    await C('Q12 NVDA+Umschalt+F3? Nächstes finden (findNext)', 'findNext', { wait: 1500 });
    await C('Q12 NVDA+Tab', 'reportCurrentFocus');
    rec({ schritt: 'Q12 Wort im DOM', vorhanden: await page.evaluate(() => document.documentElement.outerHTML.includes('funktioniert')) });
  }
});
