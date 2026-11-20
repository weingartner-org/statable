// NVDA-Messung Rest-Block B (07.11.2026). Aufruf: node e2e/probe/nvda-rest-b.mjs <phase>  (Port per NVDA_PORT, Standard 4194; NVDA_OUT = Ausgabedatei)
// Phasen: b1 | b2 | b3 | b4 | b5lang | b5kurz | b11
// Regeln: keine Quelldatei der App ändern; Tasten nur senden, wenn msedge im Vordergrund liegt; nie in die Adressleiste tippen;
// nur das eigene NVDA (Guidepup) wird gestartet und beendet. Aufbau (Klicks, Fokus setzen) per Playwright ist im Protokoll als "Aufbau" markiert.
import { nvda } from '@guidepup/guidepup';
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { writeFileSync, appendFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PORT = Number(process.env.NVDA_PORT ?? 4194);
const BASE = `http://127.0.0.1:${PORT}/`;
const phase = process.argv[2] ?? 'smoke';
const OUT = process.env.NVDA_OUT ?? join(tmpdir(), `nvda-rest-b-${phase}.jsonl`);
writeFileSync(OUT, '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- Vordergrund-Wächter ----
const psDir = mkdtempSync(join(tmpdir(), 'fg-'));
const psFile = join(psDir, 'fg.ps1');
writeFileSync(psFile, `
Add-Type @"
using System; using System.Runtime.InteropServices;
public class W { [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint p);
 [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
 [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int c);
 [DllImport("user32.dll")] public static extern void keybd_event(byte b, byte s, uint f, UIntPtr e); }
"@
while ($true) { $l = [Console]::In.ReadLine(); if ($l -eq $null) { break }
 if ($l -eq 'fg') { $h=[W]::GetForegroundWindow(); $p=0; [void][W]::GetWindowThreadProcessId($h,[ref]$p); $n=(Get-Process -Id $p -ErrorAction SilentlyContinue).ProcessName; [Console]::Out.WriteLine("FG:" + $n + ":" + $p); }
 elseif ($l -like 'mess *') { $mk = $l.Substring(5); $m = Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" | Where-Object { $_.CommandLine -like ('*' + $mk + '*') -and $_.CommandLine -notmatch '--type=' } | Select-Object -First 1; [Console]::Out.WriteLine("MESS:" + $m.ProcessId) }
 elseif ($l -like 'front*') { $mp = [int]($l.Substring(6)); $ps = Get-Process -Id $mp -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 }; foreach ($q in $ps) { [W]::keybd_event(0x12,0,0,[UIntPtr]::Zero); [W]::keybd_event(0x12,0,2,[UIntPtr]::Zero); [void][W]::ShowWindow($q.MainWindowHandle, 9); [void][W]::SetForegroundWindow($q.MainWindowHandle) }; [Console]::Out.WriteLine("FRONT:" + @($ps).Count) } }
`);
const ps = spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', psFile], { stdio: ['pipe', 'pipe', 'ignore'] });
let psBuf = ''; const psWait = [];
ps.stdout.on('data', (d) => { psBuf += d.toString(); let i; while ((i = psBuf.indexOf('\n')) >= 0) { const line = psBuf.slice(0, i).trim(); psBuf = psBuf.slice(i + 1); const w = psWait.shift(); if (w) w(line); } });
const psAsk = (cmd) => new Promise((res) => { psWait.push(res); ps.stdin.write(cmd + '\n'); });

let page, browser, ctx;
let messPid = null; let MARKER = '';
async function istEdgeVorn() {
  const m = (await psAsk('mess ' + MARKER)).replace('MESS:', ''); if (m) messPid = m; if (!messPid) return false;
  return (await psAsk('fg')) === 'FG:msedge:' + messPid;   // nur das Fenster der Mess-Edge (Prozess-ID), nie ein anderes Edge-Fenster
}
async function nachVorn() {
  for (let i = 0; i < 4; i++) {
    if (await istEdgeVorn()) return true;
    try { await page.bringToFront(); } catch {}
    const fr = await psAsk('front ' + messPid); console.log('front->', fr, 'fg->', await psAsk('fg')); await sleep(500);
  }
  return istEdgeVorn();
}
const rec = (o) => { appendFileSync(OUT, JSON.stringify(o) + '\n'); console.log(JSON.stringify(o)); };
async function spoken() { const l = await nvda.spokenPhraseLog(); await nvda.clearSpokenPhraseLog(); return l; }
async function zustand() {
  try {
    return await page.evaluate(() => {
      const e = document.activeElement;
      const name = (x) => {
        if (!x) return '';
        const a = x.getAttribute('aria-label'); if (a) return 'aria-label:' + a;
        const lb = x.getAttribute('aria-labelledby'); if (lb) return 'labelledby:' + lb.split(' ').map((id) => document.getElementById(id)?.textContent.trim()).join(' ');
        if (x.labels && x.labels.length) return 'label:' + [...x.labels].map((y) => y.textContent.trim()).join(' ');
        if (x.title) return 'title:' + x.title; return '';
      };
      const d = (x) => x ? x.tagName.toLowerCase() + (x.id ? '#' + x.id : '') + '[' + (x.getAttribute('role') || x.type || '') + '] "' + (x.getAttribute('aria-label') || x.textContent || x.value || '').replace(/\s+/g, ' ').trim().slice(0, 60) + '" name=<' + name(x) + '>' : null;
      return { hash: location.hash, fokus: d(e), dialog: !!document.querySelector('dialog[open]'), rueck: !!document.querySelector('#ue-rueck-t,#ue-rueck-m-t'), tabellen: document.querySelectorAll('main table').length, esc: (window.__esc || []).slice(-3) };
    });
  } catch (e) { return { fehler: String(e).slice(0, 80) }; }
}
let abbruch = false;
async function K(schritt, taste, { wait = 900, zeige = true } = {}) {
  if (abbruch) return null;
  if (!(await nachVorn())) { rec({ schritt, taste, fehler: 'msedge nicht im Vordergrund, Taste NICHT gesendet' }); abbruch = true; return null; }
  await spoken();
  await nvda.press(taste);
  await sleep(wait);
  const gesagt = await spoken();
  const z = zeige ? await zustand() : undefined;
  rec({ schritt, taste, gesagt, z });
  return gesagt;
}
async function C(schritt, cmdName, { wait = 900 } = {}) {
  if (abbruch) return null;
  if (!(await nachVorn())) { rec({ schritt, taste: cmdName, fehler: 'msedge nicht im Vordergrund' }); abbruch = true; return null; }
  await spoken();
  await nvda.perform(nvda.keyboardCommands[cmdName]);
  await sleep(wait);
  const gesagt = await spoken();
  rec({ schritt, taste: 'NVDA:' + cmdName, gesagt, z: await zustand() });
  return gesagt;
}
async function T(schritt, text, { wait = 600 } = {}) {
  if (abbruch) return null;
  if (!(await nachVorn())) { rec({ schritt, fehler: 'msedge nicht im Vordergrund' }); abbruch = true; return null; }
  await spoken();
  await nvda.type(text);
  await sleep(wait);
  const gesagt = await spoken();
  rec({ schritt, taste: 'tippen: ' + text, gesagt, z: await zustand() });
  return gesagt;
}
const note = (schritt, text) => rec({ schritt, notiz: text });
async function gehe(hash) { await page.goto(BASE + (hash ? '#' + hash : ''), { waitUntil: 'load' }); await sleep(1500); }
async function hash(h) { await page.evaluate((x) => { location.hash = x; }, h); await sleep(1500); }

const INIT = `
window.__esc = [];
window.addEventListener('keydown', (e) => { window.__esc.push({ k: e.key, ziel: e.target && e.target.tagName, zeit: Math.round(performance.now()) }); }, true);
document.addEventListener('cancel', (e) => { window.__esc.push({ ereignis: 'cancel', ziel: e.target && e.target.tagName, zeit: Math.round(performance.now()) }); }, true);
document.addEventListener('close', (e) => { window.__esc.push({ ereignis: 'close', ziel: e.target && e.target.tagName, zeit: Math.round(performance.now()) }); }, true);
window.__verz = 0; window.__ansagen = [];
const _o = Worker.prototype.postMessage;
Worker.prototype.postMessage = function (m, t) {
  if (window.__verz && m && m.op === 'run' && /T-TEST|ONEWAY|UNIANOVA|EXAMINE|DESCRIPTIVES/i.test(m.syntax || '')) { const self = this; setTimeout(() => _o.call(self, m, t), window.__verz); return; }
  return _o.call(this, m, t);
};
document.addEventListener('DOMContentLoaded', () => {
  const beobachte = () => { for (const id of ['ansage-hoeflich', 'ansage-dringend']) { const e = document.getElementById(id); if (e && !e.__b) { e.__b = 1; new MutationObserver(() => { window.__ansagen.push({ region: id, text: e.textContent, ms: Math.round(performance.now()) }); }).observe(e, { childList: true, characterData: true, subtree: true }); } } };
  beobachte(); setInterval(beobachte, 300);
});
`;

async function mitNvda(fn, { nurPlaywright = false } = {}) {
  const vorher = await psAsk('fg');
  rec({ schritt: 'start', notiz: 'Vordergrund vor Start: ' + vorher });
  MARKER = 'nvda-mess-' + Date.now();
  ctx = await chromium.launchPersistentContext(join(tmpdir(), MARKER), { channel: 'msedge', headless: false, args: ['--start-maximized'], locale: 'de-DE', viewport: null });
  browser = ctx;
  await ctx.addInitScript(INIT);
  page = ctx.pages()[0] ?? await ctx.newPage();
  page.on('dialog', (d) => d.dismiss().catch(() => {}));
  try {
    await page.goto(BASE, { waitUntil: 'load' }); await sleep(1500);
    await page.bringToFront();
    if (!nurPlaywright) { await nvda.start(); await sleep(2500); }
    await nachVorn();
    await fn();
  } catch (e) { rec({ fehler: String(e.stack ?? e).slice(0, 600) }); }
  finally {
    if (!nurPlaywright) { try { await nvda.stop(); } catch (e) { rec({ fehler_stop: String(e) }); } }
    try { await browser.close(); } catch {}
    ps.kill();
  }
}

// Aufbau (Playwright): Beispiel "Hilft das Lesetraining?" öffnen, Rundgang beenden
async function beispielAufbau() {
  await gehe('beispiele');
  const karte = page.locator('*:has-text("Hilft das Lesetraining")').filter({ has: page.getByRole('button', { name: /Öffnen und üben/ }) }).last();
  await karte.getByRole('button', { name: /Öffnen und üben/ }).click();
  await page.waitForFunction(() => location.hash === '#daten', undefined, { timeout: 30000 });
  const ende = page.getByRole('button', { name: 'Rundgang beenden' }); if (await ende.isVisible().catch(() => false)) await ende.click();
  note('aufbau', 'Beispiel geöffnet (Playwright-Klicks, nicht gemessen)');
}
async function ttestAufbau(letzteWahlPerTaste) {
  await beispielAufbau();
  await gehe('blatt/neu');
  await page.getByText(/Unterscheiden sich Gruppen/).first().click();
  await page.locator('input[value="lesen_vor"]').first().click({ force: true });
  await page.waitForTimeout(800);
  if (!letzteWahlPerTaste) {
    await page.locator('input[value="klasse"]').first().click({ force: true });
    await page.locator('main table.apa').first().waitFor({ timeout: 90000 });
    await page.waitForTimeout(1500);
  } else {
    await page.evaluate(() => document.querySelector('input[value="klasse"]').focus());
    note('aufbau', 'Fokus per Skript auf Auswahlschalter "klasse" gesetzt; die Wahl selbst per Leertaste (NVDA)');
  }
}

async function beispielNamen(re) {
  await gehe('beispiele');
  const karte = page.locator('*:has-text("' + re + '")').filter({ has: page.getByRole('button', { name: /Öffnen und üben/ }) }).last();
  await karte.getByRole('button', { name: /Öffnen und üben/ }).click();
  await page.waitForFunction(() => location.hash === '#daten', undefined, { timeout: 30000 });
  const ende = page.getByRole('button', { name: 'Rundgang beenden' }); if (await ende.isVisible().catch(() => false)) await ende.click();
  note('aufbau', 'Beispiel "' + re + '" geöffnet (Playwright-Klicks)');
}
// Beobachtet ms lang: gesprochen (NVDA) und DOM-Regionen (Zeitstempel). Keine Taste.
async function beob(schritt, ms) {
  const t0 = Date.now(); const prot = [];
  while (Date.now() - t0 < ms) { await sleep(400); const g = await spoken(); if (g.length) prot.push({ t: Date.now() - t0, g }); }
  const dom = await page.evaluate(() => (window.__ansagen || []).filter((a) => a.text && a.text.trim()));
  rec({ schritt, gesprochen_nvda: prot, dom_regionen: dom, z: await zustand() });
}
const PHASEN = {};
const lies = () => page.evaluate(() => (window.__ansagen = []));

// ---- 1: B11 Überschrift nicht doppelt ----
PHASEN.p1 = async () => {
  await beispielAufbau();
  await page.evaluate(() => { document.activeElement?.blur?.(); const h = document.querySelector('h1'); h?.setAttribute('tabindex', '-1'); h?.focus(); });
  note('aufbau', 'Fokus per Skript auf h1 der Datenseite');
  await K('p1-a Alt+Bild ab (Neue Auswertung)', 'Alt+PageDown', { wait: 2000 });
  if (await tabBis('p1-b', /Unterscheiden sich Gruppen/, 60)) {
    await K('p1-c Enter (Karte wählen)', 'Enter', { wait: 2500 });
    await C('p1-d NVDA+Tab', 'reportCurrentFocus', { wait: 900 });
    await K('p1-e Leertaste (lesen_vor)', 'Space', { wait: 2500 });
    await C('p1-f NVDA+Tab', 'reportCurrentFocus', { wait: 900 });
    await spoken();
    await K('p1-g Leertaste (klasse -> Ergebnis)', 'Space', { wait: 500 });
    await beob('p1-g Nachlauf 7 s', 7000);
  }
};

// ---- 2: B7 Palette Lesemodus + Enter in ungültiger Zelle ----
PHASEN.p2 = async () => {
  await beispielAufbau();
  await hash('daten'); await sleep(1500);
  await page.evaluate(() => { document.activeElement?.blur?.(); const h = document.querySelector('h1'); h?.setAttribute('tabindex', '-1'); h?.focus(); });
  await K('p2-1 Strg+K', 'Control+KeyK', { wait: 1200 });
  await T('p2-2 „Lesemodus“ tippen', 'Lesemodus', { wait: 1500 });
  note('p2-3', 'Paletteneinträge: ' + (await page.evaluate(() => [...document.querySelectorAll('dialog[open] [role=option]')].map((x) => x.textContent.trim().replace(/\s+/g, ' ').slice(0, 90)).join(' | '))));
  await K('p2-5 Enter (erster Eintrag ausführen)', 'Enter', { wait: 1800 });
  await C('p2-7 NVDA+Tab', 'reportCurrentFocus', { wait: 900 });
  note('p2-6', JSON.stringify(await page.evaluate(() => ({ dialog: !!document.querySelector('dialog[open]'), pressed: [...document.querySelectorAll('button[aria-pressed]')].filter((x) => /Lesemodus/.test(x.textContent)).map((x) => x.getAttribute('aria-pressed')), region: document.getElementById('daten-region')?.getAttribute('aria-label') ?? document.querySelector('[aria-labelledby=daten-region]')?.textContent?.slice(0, 80), tabellen: [...document.querySelectorAll('main table')].map((t) => t.querySelectorAll('tbody tr').length) }))));
};
PHASEN.p2b = async () => {
  await beispielAufbau();
  await hash('daten'); await sleep(1500);
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /Daten eingeben/.test(x.getAttribute('aria-label') ?? '')); b?.focus(); });
  note('aufbau', 'Fokus per Skript auf den Knopf „Daten eingeben“; Auslösen per Tastatur (NVDA)');
  await K('p2b-1 Enter (Eingeben an)', 'Enter', { wait: 1500 });
  for (let i = 0; i < 12 && !abbruch; i++) { const z = await zustand(); if (z.fokus && /Lesetest vorher/i.test(z.fokus)) break; await K('p2b-2.' + i + ' Tab', 'Tab', { wait: 600 }); }
  await K('p2b-3 Strg+A', 'Control+KeyA', { wait: 400, zeige: false });
  await T('p2b-4 „abc“ tippen', 'abc', { wait: 600 });
  await page.evaluate(() => { window.__ansagen = []; });
  await K('p2b-5 Enter (in ungültiger Zelle)', 'Enter', { wait: 1800 });
  note('p2b-6', JSON.stringify(await page.evaluate(() => { const a = document.activeElement; return { aktiv: a?.id, aktivInvalid: a?.getAttribute('aria-invalid'), aktivDesc: a?.getAttribute('aria-describedby'), fehlertext: document.getElementById('z-fehler')?.textContent, ansagen: (window.__ansagen || []).filter((x) => x.text) }; })));
  await C('p2b-7 NVDA+Tab', 'reportCurrentFocus', { wait: 1500 });
};

// ---- 3: B8 Regler Einzahl, Baumrechner ----
PHASEN.p3 = async () => {
  await gehe('verstehen/lernlabor/bayes'); await sleep(1500);
  await page.evaluate(() => { document.getElementById('ll-bv-n')?.focus(); });
  note('aufbau', 'Fokus per Skript auf Regler #ll-bv-n');
  await C('p3-1 NVDA+Tab', 'reportCurrentFocus', { wait: 900 });
  await K('p3-2 Pos1 (Minimum, 1 Versuch)', 'Home', { wait: 1500 });
  await K('p3-3 Pfeil rechts', 'ArrowRight', { wait: 1500 });
  await K('p3-4 Tab (Regler k)', 'Tab', { wait: 900 });
  note('p3-dom', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('.ll-eingaben input[type=range]')].map((x) => x.id + ' vt=' + x.getAttribute('aria-valuetext')))));
  await gehe('verstehen/lernlabor/baum'); await sleep(1500);
  await page.evaluate(() => { document.getElementById('ll-b-pa')?.focus(); });
  note('aufbau', 'Fokus per Skript auf P(A) im Baumrechner');
  note('p3b-dom', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('.ll-eingaben input, .ll-eingaben select')].map((x) => x.id + ' label=' + ([...(x.labels || [])].map((l) => l.textContent.trim()).join('/') || x.getAttribute('aria-label'))))));
  await C('p3b-1 NVDA+Tab (P(A))', 'reportCurrentFocus', { wait: 900 });
  await K('p3b-2 Tab (P(B|A))', 'Tab', { wait: 1200 });
  await C('p3b-3 NVDA+Tab', 'reportCurrentFocus', { wait: 900 });
  await K('p3b-4 Tab (nächstes Feld)', 'Tab', { wait: 1200 });
  await C('p3b-5 NVDA+Tab', 'reportCurrentFocus', { wait: 900 });
};

async function tabBis(schritt, re, max = 60) {
  for (let i = 0; i < max && !abbruch; i++) {
    await K(schritt + '.' + i, 'Tab', { wait: 350 });
    const z = await zustand();
    if (z.fokus && re.test(z.fokus)) return true;
    if (z.fokus && z.fokus.startsWith('body')) { note(schritt, 'Fokus in der Edge-Oberfläche, Abbruch'); return false; }
  }
  note(schritt, 'Muster nicht gefunden: ' + re); return false;
}
async function kreuzAufbau() {
  await beispielAufbau();
  await gehe('blatt/neu');
  await page.getByRole('button', { name: /Kommt etwas in Gruppen unterschiedlich oft vor/ }).first().click(); await sleep(800);
  await page.locator('input[type=radio][value=gruppe]').first().click({ force: true }); await sleep(800);
  await page.locator('input[type=radio][value=geschlecht]').first().click({ force: true });
  await page.locator('main table.apa').first().waitFor({ timeout: 90000 }); await sleep(2500);
  await page.evaluate(() => document.querySelectorAll('main details').forEach((d) => (d.open = true))); await sleep(800);
  note('aufbau', 'Karte "Kommt etwas in Gruppen unterschiedlich oft vor?", gruppe nach geschlecht, alle details-Bereiche geöffnet (Playwright, nicht gemessen)');
}
async function regAufbau() {
  await beispielAufbau();
  await gehe('blatt/neu');
  await page.getByRole('button', { name: /Lässt sich etwas vorhersagen/ }).first().click(); await sleep(800);
  await page.locator('input[value="lesen_nach"]').first().click({ force: true }); await sleep(800);
  await page.locator('input[value="lesen_vor"]').first().click({ force: true }); await sleep(500);
  const f = page.getByRole('button', { name: /Fertig/ }); if (await f.isVisible().catch(() => false)) await f.click();
  await page.locator('main table.apa').first().waitFor({ timeout: 90000 }); await sleep(2500);
  note('aufbau', 'Karte "Lässt sich etwas vorhersagen?", lesen_nach ~ lesen_vor (Playwright-Klicks, nicht gemessen)');
}
async function kurzAn() {
  await gehe('einstellungen');
  const sw = page.locator('span.ez-name', { hasText: 'Kurze Spaltenköpfe' }).first().locator('xpath=ancestor::*[.//input[@role="switch"]][1]').locator('input[role=switch]').first();
  if (!(await sw.isChecked())) await sw.click({ force: true });
  note('aufbau', 'Schalter "Kurze Spaltenköpfe" an: ' + (await sw.isChecked()));
}
async function tabelleMitT(schritt, re, max = 9) {
  for (let i = 1; i <= max && !abbruch; i++) {
    const g = await K(`${schritt}-T${i}`, 'KeyT', { wait: 1000 });
    if (g && re.test(g.join(' '))) return true;
  }
  return false;
}
async function insZelle(schritt, titel) {
  for (let i = 0; i < 5 && !abbruch; i++) {
    const g = await K(`${schritt} Pfeil runter ${i + 1}`, 'ArrowDown', { wait: 800 });
    const t = (g ?? []).join(' ');
    if (t && !(titel && t.includes(titel) && !/Spalte|Zeile/.test(t.replace(titel, '')))) return true;
  }
  return false;
}
async function zellen(schritt, tasten) { for (const [n, k] of tasten) await K(`${schritt} ${n}`, 'Control+Alt+' + k, { wait: 800 }); }
const Rn = (n, k) => Array.from({ length: n }, (_, i) => ['r' + (i + 1), k]);
const fokusAbsatz = (re, tag) => page.evaluate(([r]) => { const p = [...document.querySelectorAll('main p')].find((x) => new RegExp(r).test(x.textContent)); if (p) { p.setAttribute('tabindex', '-1'); p.focus(); } return !!p; }, [re]).then((ok) => note('aufbau', `Fokus per Skript auf den Absatz mit ${tag}: ${ok}`));
const obenAnfang = () => page.evaluate(() => { (document.activeElement)?.blur?.(); window.scrollTo(0, 0); });
// ---- 4: B9 Hilfe ----
PHASEN.p4 = async () => {
  await gehe('hilfe'); await sleep(2500);
  await page.evaluate(() => document.getElementById('hi-suche')?.focus());
  note('aufbau', 'Fokus per Skript auf Suchfeld #hi-suche');
  await T('p4-1 „Mittelwert“ tippen', 'Mittelwert', { wait: 1800 });
  note('p4-dom', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('#hi-treffer li')].slice(0, 4).map((x) => ({ id: x.id, laenge: x.textContent.trim().length, aria: x.getAttribute('aria-label'), desc: x.getAttribute('aria-describedby'), text: x.textContent.trim().replace(/\s+/g, ' ').slice(0, 100) })))));
  await K('p4-2 Pfeil runter (Treffer 2)', 'ArrowDown', { wait: 1200 });
  await K('p4-3 Pfeil runter (Treffer 3)', 'ArrowDown', { wait: 1200 });
  await spoken();
  await K('p4-4 Enter (Treffer öffnen)', 'Enter', { wait: 700 });
  await beob('p4-4 Nachlauf 4 s (Ansage nach Enter)', 4000);
  await page.evaluate(() => { document.activeElement?.blur?.(); window.scrollTo(0, 0); const h = document.querySelector('h1'); h?.setAttribute('tabindex', '-1'); h?.focus(); });
  note('aufbau', 'Fokus per Skript auf h1 (Ausgangspunkt der Tab-Zählung)');
  let n = 0, da = false;
  for (let i = 0; i < 14 && !abbruch; i++) {
    await K('p4-5.' + i + ' Tab', 'Tab', { wait: 450 }); n++;
    const z = await zustand();
    if (z.fokus && /Trefferliste/.test(z.fokus)) { da = true; break; }
    if (z.fokus && z.fokus.startsWith('body')) { note('p4', 'Fokus in der Edge-Oberfläche, Abbruch'); break; }
  }
  note('p4-6', 'Knopf Zurück zur Trefferliste per Tab nach ' + n + ' Tab-Stopps ab der Überschrift: ' + da);
  if (da) { await K('p4-7 Enter', 'Enter', { wait: 700 }); await beob('p4-7 Nachlauf 4 s (Ansage nach Zurück)', 4000); await C('p4-8 NVDA+Tab', 'reportCurrentFocus', { wait: 1200 }); }
};

// ---- 5: B10 Bildtext, Eta-Quadrat ----
const bildDom = () => page.evaluate(() => [...document.querySelectorAll('main [role=img], main figure, main svg[aria-label], main img[alt]')].map((x) => (x.getAttribute('aria-label') ?? x.getAttribute('alt') ?? x.textContent).replace(/\s+/g, ' ').slice(0, 300)));
async function grafikLesen(schritt) {
  await page.evaluate(() => { document.querySelectorAll('main details').forEach((d) => (d.open = true)); document.activeElement?.blur?.(); window.scrollTo(0, 0); });
  note(schritt + '-dom', JSON.stringify(await bildDom()));
  await nachVorn();
  await K(schritt + '-Strg+Home', 'Control+Home', { wait: 800 });
  for (let i = 0; i < 5 && !abbruch; i++) { const g = await K(schritt + '-G' + i, 'KeyG', { wait: 1200 }); if (g && /Grafik|diagramm|Histogramm|Streu/i.test(g.join(' '))) { await C(schritt + '-NVDA+Tab', 'reportCurrentFocus', { wait: 900 }); break; } }
}
PHASEN.p5 = async () => { await ttestAufbau(false); await grafikLesen('p5'); };
PHASEN.p5b = async () => { await regAufbau(); await grafikLesen('p5b'); };
PHASEN.p5c = async () => {
  await beispielAufbau();
  await gehe('blatt/neu');
  const karten = await page.evaluate(() => [...document.querySelectorAll('button.kachel')].map((b) => b.textContent.trim().slice(0, 60)));
  note('p5c-karten', JSON.stringify(karten));
  await page.getByRole('button', { name: /Wie sehen die Werte aus|Wie sind die Werte verteilt|verteil/i }).first().click(); await sleep(800);
  await page.locator('input[value="lesen_vor"]').first().click({ force: true }); await sleep(800);
  const f = page.getByRole('button', { name: /Fertig/ }); if (await f.isVisible().catch(() => false)) await f.click();
  await page.locator('main table.apa').first().waitFor({ timeout: 90000 }); await sleep(2500);
  await grafikLesen('p5c');
};

// ---- 6: B3/B4 Hinweise ----
async function hinweisLesen(name, oeffnen) {
  await hash('start'); await sleep(500);
  await K(name + '-1 öffnen', ...oeffnen);
  note(name + '-dom', 'Hinweis im Fenster: ' + (await page.evaluate(() => [...document.querySelectorAll('dialog[open] .pal-leise, dialog[open] .kl-sr')].map((x) => x.textContent.trim() + ' | breite=' + Math.round(x.getBoundingClientRect().width) + ' ariaHidden=' + !!x.closest('[aria-hidden=true]')).join(' || '))));
  await K(name + '-2 Esc (erstes: NVDA beendet Fokusmodus)', 'Escape', { wait: 1000 });
  await K(name + '-3 Strg+Ende (Lesemodus)', 'Control+End', { wait: 1000 });
  for (let i = 0; i < 4 && !abbruch; i++) { const g = await K(name + '-4.' + i + ' Pfeil oben', 'ArrowUp', { wait: 900 }); if (g && /Esc zweimal/.test(g.join(' '))) break; }
  if ((await zustand()).dialog) await K(name + '-5 Esc (schließen)', 'Escape', { wait: 1000 });
  if ((await zustand()).dialog) await K(name + '-6 Esc', 'Escape', { wait: 1000 });
}
PHASEN.p6 = async () => {
  await beispielAufbau();
  await hinweisLesen('p6-palette', ['Control+KeyK', { wait: 1200 }]);
  await hinweisLesen('p6-kuerzel', ['Alt+KeyT', { wait: 1200 }]);
};
PHASEN.p6b = async () => {
  await hash('verstehen/ueben/faktor'); await sleep(3500);
  note('p6b-start', JSON.stringify(await zustand()));
  note('p6b-tipp', 'Tipptext: ' + (await page.evaluate(() => document.querySelector('.ue-tipp')?.textContent ?? '(keiner)')));
  await C('p6b-0 NVDA+Tab (Fokus melden)', 'reportCurrentFocus', { wait: 900 });
  for (let i = 0; i < 14 && !abbruch; i++) { const g = await K('p6b-' + (i + 1) + ' Pfeil unten', 'ArrowDown', { wait: 800, zeige: false }); if (g && /Zifferntasten|NVDA\+Leertaste/.test(g.join(' '))) break; }
};

// ---- 7: Eckzelle Kreuztabelle ----
PHASEN.p7 = async () => {
  await kreuzAufbau();
  note('p7-dom', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('main table.apa')].slice(0, 2).map((t) => t.querySelector('thead tr')?.firstElementChild?.outerHTML.replace(/ style="[^"]*"/g, '').slice(0, 300)))));
  await obenAnfang(); await nachVorn();
  await K('p7-Strg+Home', 'Control+Home', { wait: 800 });
  if (await tabelleMitT('p7-t', /Tabelle/, 2)) {
    await insZelle('p7-t', 'Kreuz Gruppe');
    await zellen('p7-t', [['r1', 'ArrowRight'], ['l1', 'ArrowLeft'], ['d1', 'ArrowDown'], ['u1', 'ArrowUp']]);
  }
};

// ---- 8: F6 ----
PHASEN.f6a = async () => {
  await gehe('verstehen/kennzahlen');
  await page.getByRole('radio', { name: /Einen Anteil/ }).check();
  await page.locator('#vk-x').fill('12'); await page.locator('#vk-n').fill('40'); await sleep(2000);
  await page.evaluate(() => { document.getElementById('vk-n').focus(); window.__ansagen = []; });
  note('aufbau', 'Fokus per Skript auf #vk-n (Wert 40); Ziffern per NVDA getippt');
  await K('f6a-1 Strg+A', 'Control+KeyA', { wait: 300, zeige: false });
  await spoken();
  await T('f6a-2 „4000“ tippen (Ziffer für Ziffer)', '4000', { wait: 300 });
  await beob('f6a-3 Nachlauf 5 s', 5000);
};
PHASEN.f6b = async () => {
  await gehe('verstehen/lernlabor/bootstrap'); await sleep(2000);
  note('f6b-knoepfe', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('main button.haupt')].map((b) => b.textContent.trim()))));
  await page.evaluate(() => { document.querySelector('main button.haupt')?.focus(); window.__ansagen = []; });
  note('aufbau', 'Fokus per Skript auf den Start-Knopf (Bootstrap rechnen)');
  await K('f6b-1 Enter (Start)', 'Enter', { wait: 300 });
  await beob('f6b-2 Nachlauf 9 s', 9000);
  note('f6b-3', 'Ergebnissatz im DOM: ' + (await page.evaluate(() => document.querySelector('.ll-satz')?.textContent.trim().slice(0, 250))));
};
PHASEN.f6b2 = async () => {
  await gehe('verstehen/lernlabor/zufall'); await sleep(2000);
  note('f6b2-knoepfe', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('main button')].map((b) => b.textContent.trim()).slice(0, 12))));
  await page.evaluate(() => { document.querySelector('main button.haupt')?.focus(); window.__ansagen = []; });
  note('aufbau', 'Fokus per Skript auf den ersten Haupt-Knopf (Zufall)');
  await K('f6b2-1 Enter (Start)', 'Enter', { wait: 300 });
  await beob('f6b2-2 Nachlauf 9 s', 9000);
  note('f6b2-3', 'Ergebnissatz im DOM: ' + (await page.evaluate(() => document.querySelector('.ll-satz')?.textContent.trim().slice(0, 250))));
};
PHASEN.f6c = async () => {
  await beispielAufbau();
  await gehe('blatt/neu'); await sleep(1500);
  await page.evaluate(() => { document.getElementById('karten-suche')?.focus(); window.__ansagen = []; });
  note('aufbau', 'Fokus per Skript auf #karten-suche');
  await spoken();
  await T('f6c-1 „Median“ tippen', 'Median', { wait: 300 });
  await beob('f6c-2 Nachlauf 5 s', 5000);
  note('f6c-3', 'DOM-Satz: ' + (await page.evaluate(() => [...document.querySelectorAll('p.heft-text')].map((p) => p.textContent.trim()).filter((t) => /gefunden/.test(t)).join(' | '))));
};
// d: kurze und lange Neurechnung im Blatt
async function neuAuswahl(schritt, verz, buttonText, zielWert) {
  await page.evaluate(() => { for (const d of document.querySelectorAll('details')) if (/Spalten und Optionen ändern/.test(d.querySelector('summary')?.textContent ?? '')) d.open = true; });
  await sleep(500);
  await page.locator('main button.luecke', { hasText: buttonText }).first().click(); await sleep(1000);
  await page.evaluate((v) => { window.__verz = v; window.__ansagen = []; }, verz);
  await page.evaluate((z) => document.querySelector('input[name="wahl"][value="' + z + '"]')?.focus(), zielWert);
  note('aufbau', schritt + ': Editor geöffnet (Playwright), Fokus per Skript auf Auswahlschalter ' + zielWert + ' (Fokus jetzt: ' + (await page.evaluate(() => document.activeElement?.value)) + '), Engine-Verzögerung ' + verz + ' ms');
  if (!(await nachVorn())) return;
  await spoken();
  await K(schritt + ' Leertaste (Auswahl ändern)', 'Space', { wait: 300 });
  await beob(schritt + ' Nachlauf', verz ? 11000 : 5000);
}
PHASEN.f6d = async () => {
  await ttestAufbau(false);
  await neuAuswahl('f6d-kurz', 0, 'Klasse (ändern)', 'gruppe');
  await neuAuswahl('f6d-lang', 4000, 'Gruppe (ändern)', 'geschlecht');
};
// e: Assistent-Vorschau und Skala anlegen
PHASEN.f6e = async () => {
  await beispielAufbau();
  await gehe('bearbeiten/berechnen'); await sleep(2000);
  await page.evaluate(() => { document.getElementById('be-formel')?.focus(); window.__ansagen = []; });
  note('aufbau', 'Fokus per Skript auf #be-formel (Spalten berechnen)');
  await spoken();
  await T('f6e-1 Formel tippen', 'lesen_vor * 2', { wait: 300 });
  await beob('f6e-2 Nachlauf 5 s', 5000);
  note('f6e-3', 'Vorschau im DOM: ' + (await page.evaluate(() => document.querySelector('.as-vorschau')?.textContent.replace(/\s+/g, ' ').trim().slice(0, 300))));
};
PHASEN.f6f = async () => {
  await beispielNamen('Fragebogen zur Prüfungsangst');
  await gehe('blatt/neu'); await sleep(1500);
  await page.getByRole('button', { name: /Wie zuverlässig misst meine Skala/ }).first().click(); await sleep(1000);
  note('f6f-boxen', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('main input[type=checkbox]')].slice(0, 10).map((x) => x.value))));
  for (const n of ['pa1', 'pa2']) await page.locator('input[type=checkbox][value="' + n + '"]').first().check({ force: true });
  const f = page.getByRole('button', { name: /Fertig/ }); await f.first().click();
  await page.locator('main table.apa').first().waitFor({ timeout: 90000 }); await sleep(2500);
  await page.evaluate(() => { const b = document.getElementById('sw-name'); b?.scrollIntoView(); document.getElementById('sw-name')?.focus(); });
  note('aufbau', 'Skala-Ergebnis steht; Fokus per Skript auf #sw-name: ' + (await page.evaluate(() => document.activeElement?.id)));
  await page.evaluate(() => { window.__ansagen = []; });
  await spoken();
  await K('f6f-1 Enter (Skalenwert anlegen)', 'Enter', { wait: 300 });
  await beob('f6f-2 Nachlauf 8 s', 8000);
  note('f6f-3', 'Status im DOM: ' + (await page.evaluate(() => [...document.querySelectorAll('[role=status]')].map((x) => x.textContent.trim().slice(0, 100)).filter(Boolean).join(' | '))));
};
PHASEN.p5d = async () => { // Fließtext mit η² / R² / χ²: wie spricht NVDA jetzt
  await ttestAufbau(false);
  await page.evaluate(() => document.querySelectorAll('main details').forEach((d) => (d.open = true)));
  await obenAnfang(); await nachVorn();
  await fokusAbsatz('η²', 'η²');
  await C('p5d-eta NVDA+Tab', 'reportCurrentFocus', { wait: 1500 });
  await K('p5d-eta Pfeil runter', 'ArrowDown', { wait: 1000 });
  note('p5d-dom', 'Absatz: ' + (await page.evaluate(() => [...document.querySelectorAll('main p')].find((x) => /η²/.test(x.textContent))?.textContent.slice(0, 260))));
};
PHASEN.f6e2 = async () => {
  await beispielAufbau();
  await gehe('bearbeiten/berechnen'); await sleep(2000);
  await page.locator('input[name="be-modus"][value="zeilen"]').check({ force: true }); await sleep(800);
  const boxen = page.locator('main input[type=checkbox]');
  await boxen.nth(0).check({ force: true }); await sleep(500);
  await page.evaluate(() => { const c = document.querySelectorAll('main input[type=checkbox]')[1]; c?.focus(); window.__ansagen = []; });
  note('aufbau', 'Modus Mittelwert mehrerer Spalten, erste Spalte per Playwright gewählt; Fokus per Skript auf zweite Spalte; Wahl per Leertaste (NVDA)');
  await spoken();
  await K('f6e2-1 Leertaste (zweite Spalte wählen)', 'Space', { wait: 300 });
  await beob('f6e2-2 Nachlauf 5 s', 5000);
  note('f6e2-3', 'Vorschau im DOM: ' + (await page.evaluate(() => [...document.querySelectorAll('.as-satz, .as-warn')].map((x) => x.textContent.trim().slice(0, 140)).join(' | '))));
};
await mitNvda(PHASEN[phase], { nurPlaywright: process.env.NUR_PW === '1' });
