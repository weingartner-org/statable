// NVDA-Messung Wellen 1 bis 6 (06.11.2026). Aufruf: node e2e/probe/nvda-welle-2-6.mjs <phase>
// Phasen: smoke | t-test | kuerzel | tabellen | diagramm | lernen
// Regeln: keine Quelldatei ändern; Tasten nur senden, wenn msedge im Vordergrund liegt; kein Fokus per Skript (nur Tasten);
// nie in die Adressleiste tippen (Seite per Navigation des Playwright-Tabs geöffnet); nur das eigene NVDA (Guidepup) wird gestartet und beendet.
import { nvda } from '@guidepup/guidepup';
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { writeFileSync, appendFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PORT = 4194;
const BASE = `http://127.0.0.1:${PORT}/`;
const phase = process.argv[2] ?? 'smoke';
const OUT = process.env.NVDA_OUT ?? join(tmpdir(), `nvda-${phase}.jsonl`);
writeFileSync(OUT, '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- Vordergrund-Wächter (PowerShell als Dauerprozess) ----
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
 if ($l -eq 'fg') { $h=[W]::GetForegroundWindow(); $p=0; [void][W]::GetWindowThreadProcessId($h,[ref]$p); $n=(Get-Process -Id $p -ErrorAction SilentlyContinue).ProcessName; [Console]::Out.WriteLine("FG:$n"); }
 elseif ($l -eq 'front') { $ps = Get-Process msedge -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -notmatch 'Sensorik' }; foreach ($q in $ps) { [W]::keybd_event(0x12,0,0,[UIntPtr]::Zero); [W]::keybd_event(0x12,0,2,[UIntPtr]::Zero); [void][W]::ShowWindow($q.MainWindowHandle, 9); [void][W]::SetForegroundWindow($q.MainWindowHandle) }; [Console]::Out.WriteLine("FRONT:" + @($ps).Count) } }
`);
const ps = spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', psFile], { stdio: ['pipe', 'pipe', 'ignore'] });
let psBuf = ''; const psWait = [];
ps.stdout.on('data', (d) => { psBuf += d.toString(); let i; while ((i = psBuf.indexOf('\n')) >= 0) { const line = psBuf.slice(0, i).trim(); psBuf = psBuf.slice(i + 1); const w = psWait.shift(); if (w) w(line); } });
const psAsk = (cmd) => new Promise((res) => { psWait.push(res); ps.stdin.write(cmd + '\n'); });

let page, browser, ctx;
async function istEdgeVorn() { return (await psAsk('fg')) === 'FG:msedge'; }
async function nachVorn() {
  for (let i = 0; i < 4; i++) {
    if (await istEdgeVorn()) return true;
    try { await page.bringToFront(); } catch {}
    const fr = await psAsk('front'); console.log('front->', fr, 'fg->', await psAsk('fg')); await sleep(500);
  }
  return istEdgeVorn();
}
const rec = (o) => { appendFileSync(OUT, JSON.stringify(o) + '\n'); console.log(JSON.stringify(o)); };
async function spoken() { const l = await nvda.spokenPhraseLog(); await nvda.clearSpokenPhraseLog(); return l; }
async function zustand() {
  try { return await page.evaluate(() => { const e = document.activeElement; const d = (x) => x ? `${x.tagName.toLowerCase()}${x.id ? '#' + x.id : ''}[${(x.getAttribute('role') || '')}] "${(x.getAttribute('aria-label') || x.textContent || x.value || '').replace(/\s+/g, ' ').trim().slice(0, 60)}"` : null; return { hash: location.hash, fokus: d(e), dialog: !!document.querySelector('dialog[open]') }; }); } catch (e) { return { fehler: String(e).slice(0, 80) }; }
}
// Taste senden (Guidepup-Schreibweise, z. B. "Alt+KeyY", "Control+Alt+ArrowRight")
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
async function C(schritt, cmdName, { wait = 900 } = {}) { // NVDA-Befehl
  if (abbruch) return null;
  if (!(await nachVorn())) { rec({ schritt, taste: cmdName, fehler: 'msedge nicht im Vordergrund' }); abbruch = true; return null; }
  await spoken();
  await nvda.perform(nvda.keyboardCommands[cmdName]);
  await sleep(wait);
  const gesagt = await spoken();
  rec({ schritt, taste: 'NVDA:' + cmdName, gesagt, z: await zustand() });
  return gesagt;
}
async function T(schritt, text, { wait = 600 } = {}) { // Text tippen (nur im Textfeld der Seite)
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
async function gehe(hash) { // Navigation des Playwright-Tabs (nicht die Adressleiste)
  await page.goto(BASE + (hash ? '#' + hash : ''), { waitUntil: 'load' });
  await sleep(1500);
}


async function mitNvda(fn) {
  const vorher = await psAsk('fg');
  rec({ schritt: 'start', notiz: 'Vordergrund vor Start: ' + vorher });
  browser = await chromium.launch({ channel: 'msedge', headless: false, args: ['--start-maximized'] });
  ctx = await browser.newContext({ locale: 'de-DE', viewport: null });
  page = await ctx.newPage();
  page.on('dialog', (d) => d.dismiss().catch(() => {}));
  try {
    await page.goto(BASE, { waitUntil: 'load' }); await sleep(1500);
    await page.bringToFront();
    await nvda.start();
    await sleep(2500);
    await nachVorn();
    await fn();
  } catch (e) { rec({ fehler: String(e.stack ?? e).slice(0, 600) }); }
  finally {
    try { await nvda.stop(); } catch (e) { rec({ fehler_stop: String(e) }); }
    try { await browser.close(); } catch {}
    ps.kill();
  }
}


async function tabBis(schritt, re, max = 80) { // Tab, bis der Fokus (Name) zum Muster passt
  for (let i = 0; i < max; i++) {
    const g = await K(`${schritt}.${i}`, 'Tab', { wait: 350 });
    if (g === null) return false;
    const z = await zustand();
    if (z.fokus && re.test(z.fokus)) return true;
    if (z.fokus && z.fokus.startsWith('body')) { note(schritt, 'Seite verlassen (Fokus in Edge-Oberfläche), Abbruch der Suche nach ' + re); return false; }
  }
  note(schritt, 'Muster nicht gefunden: ' + re); return false;
}
async function beispielOeffnen() { // Beispiel "Hilft das Lesetraining?" per Tasten öffnen
  await gehe('beispiele');
  if (!(await tabBis('bo', /Öffnen und üben/i, 40))) return false;
  await K('bo.enter', 'Enter', { wait: 3500 });
  // Rundgang beenden, falls offen
  for (let i = 0; i < 3; i++) { const z = await zustand(); if (/Weiter|Los geht|Überspringen/i.test(JSON.stringify(z))) await K('bo.esc' + i, 'Escape', { wait: 700 }); }
  return true;
}

async function hash(h) { await page.evaluate((x) => { location.hash = x; }, h); await sleep(1200); }
const PHASEN = {};
PHASEN.smoke = async () => {
  await gehe('beispiele');
  await K('s1', 'Tab'); await K('s2', 'Tab');
  await C('s3', 'reportTitle');
};
PHASEN.oeffnen = async () => { await beispielOeffnen(); note('ende', JSON.stringify(await zustand())); };
PHASEN.kuerzel = async () => {
  await beispielOeffnen();
  await hash('start'); await sleep(500);
  await K('k1 Strg+K', 'Control+KeyK', { wait: 1200 });
  await T('k1b tippen', 'Bericht');
  await K('k1c Enter', 'Enter', { wait: 1500 });
  await K('k2 Alt+T', 'Alt+KeyT', { wait: 1200 });
  await K('k2b Esc (erstes)', 'Escape', { wait: 900 });
  await K('k2c Esc (zweites)', 'Escape', { wait: 900 });
  await K('k3 Alt+1', 'Alt+Digit1', { wait: 1200 });
  await K('k4 Alt+Bild ab', 'Alt+PageDown', { wait: 1200 });
  await K('k5 Alt+W', 'Alt+KeyW', { wait: 1500 });
  await K('k5b Esc', 'Escape', { wait: 900 });
  await K('k5c Esc', 'Escape', { wait: 900 });
  await K('k6 Alt+H', 'Alt+KeyH', { wait: 1500 });
  await K('k7 Alt+J', 'Alt+KeyJ', { wait: 1200 });
  await K('k7b Alt+N', 'Alt+KeyN', { wait: 1200 });
  await K('k8 Strg+K', 'Control+KeyK', { wait: 1200 });
  await K('k8b Esc (erstes)', 'Escape', { wait: 1000 });
  note('k8c', 'Dialog offen nach erstem Esc: ' + JSON.stringify(await zustand()));
  await K('k8d Esc (zweites)', 'Escape', { wait: 1000 });
  // Alt+Z mit Fachwort (Welle 1 nachholen)
  await hash('hilfe/adjustierter-mittelwert'); await sleep(800);
  await K('z0 Tab (in die Seite)', 'Tab', { wait: 500 });
  for (let i = 0; i < 6; i++) { const g = await K('z1.' + i + ' B', 'KeyB', { wait: 600 }); if (g && g.join(' ').includes('Fachbegriff')) break; }
  await K('z2 Enter (Erklärung öffnen)', 'Enter', { wait: 1200 });
  await K('z3 Alt+Z (KeyZ)', 'Alt+KeyZ', { wait: 1200 });
  await K('z4 Alt+Z (KeyY)', 'Alt+KeyY', { wait: 1200 });
};
PHASEN.ttest = async () => {
  await beispielOeffnen();
  await hash('blatt/neu'); await sleep(800);
  await tabBis('t1', /Unterscheiden sich Gruppen/i, 80);
  await K('t2 Enter', 'Enter', { wait: 2000 });
  for (let i = 0; i < 4; i++) await K('t3.' + i, 'Shift+Tab', { wait: 600 });
  await K('t4 Enter', 'Enter', { wait: 1200 });
  await K('t5 Leertaste (klasse wählen)', 'Space', { wait: 6000 });
  note('t5z', 'Ergebnis sichtbar? ' + await page.evaluate(() => document.querySelectorAll('table').length + ' Tabellen; Live: ' + [...document.querySelectorAll('[aria-live]')].map(e => e.textContent.trim().slice(0, 80)).join(' | ')));
  await K('t5b Leertaste (Messwert wählen, rechnet)', 'Space', { wait: 9000 });
  note('t5c', 'Tabellen: ' + await page.evaluate(() => document.querySelectorAll('table').length) + ' Live-Regionen: ' + await page.evaluate(() => [...document.querySelectorAll('[aria-live],[role=status],[role=alert]')].map(e => e.textContent.trim().slice(0, 100)).join(' | ')));
  for (let i = 0; i < 8; i++) { await K('t6.' + i, 'Tab', { wait: 600 }); }
  await K('t7 T', 'KeyT', { wait: 900 });
  await K('t7b Runter (in die Tabelle)', 'ArrowDown', { wait: 900 });
  await K('t7c Runter', 'ArrowDown', { wait: 900 });
  for (const [n, k] of [['r1', 'ArrowRight'], ['r2', 'ArrowRight'], ['r3', 'ArrowRight'], ['d1', 'ArrowDown'], ['d2', 'ArrowDown'], ['d3', 'ArrowDown'], ['l1', 'ArrowLeft']]) await K('t8 ' + n + ' Strg+Alt+' + k, 'Control+Alt+' + k, { wait: 800 });
  // zweite Tabelle (Ergebnis): nächste Tabelle, Zellen
  await K('t9 T (nächste Tabelle)', 'KeyT', { wait: 900 });
  await K('t9b Runter', 'ArrowDown', { wait: 900 });
  await K('t9c Runter', 'ArrowDown', { wait: 900 });
  for (const [n, k] of [['r1', 'ArrowRight'], ['r2', 'ArrowRight'], ['d1', 'ArrowDown'], ['d2', 'ArrowDown']]) await K('t10 ' + n + ' Strg+Alt+' + k, 'Control+Alt+' + k, { wait: 800 });
};
async function karteOeffnen(re) { await beispielOeffnen(); await hash('blatt/neu'); await sleep(800); if (!(await tabBis('kk', re, 90))) return false; await K('kk Enter', 'Enter', { wait: 2000 }); return true; }
PHASEN.verteilung = async () => {
  if (!(await karteOeffnen(/Wie verteilt sich etwas/i))) return;
  if (await tabBis('v2', /lesen_vor/, 30)) await K('v2b Leertaste (lesen_vor)', 'Space', { wait: 700 });
  if (await tabBis('v2c', /Fertig/, 20)) await K('v2d Enter (Fertig)', 'Enter', { wait: 9000 });
  note('v2z', JSON.stringify(await zustand()) + ' Diagramme: ' + await page.evaluate(() => document.querySelectorAll('svg, canvas, img[alt]').length));
  await K('v3 Tab', 'Tab', { wait: 600 });
  for (let i = 0; i < 4; i++) await K('v4.' + i + ' G (Grafik)', 'KeyG', { wait: 900 });
  if (await tabBis('v5', /Beschreibung und Daten/i, 40)) {
    await K('v6 Enter (aufklappen)', 'Enter', { wait: 1200 });
    for (let i = 0; i < 12; i++) await K('v7.' + i + ' Runter', 'ArrowDown', { wait: 700 });
    await K('v8 T (Tabelle)', 'KeyT', { wait: 900 });
    await K('v8b Runter', 'ArrowDown', { wait: 800 }); await K('v8c Runter', 'ArrowDown', { wait: 800 });
    for (const k of ['ArrowRight', 'ArrowDown', 'ArrowDown', 'ArrowDown']) await K('v9 Strg+Alt+' + k, 'Control+Alt+' + k, { wait: 800 });
  }
};
PHASEN.kreuz = async () => {
  if (!(await karteOeffnen(/Kommt etwas in Gruppen unterschiedlich oft vor/i))) return;
  if (await tabBis('c2', /^input\[\] "geschlecht"/, 30)) await K('c2b Leertaste (Zeilenvariable)', 'Space', { wait: 1200 });
  for (let i = 0; i < 3; i++) { const g = await K('c3.' + i, 'Tab', { wait: 600 }); }
  note('c3z', JSON.stringify(await zustand()));
  if (await tabBis('c4', /^input\[\] "klasse"|^input\[\] "gruppe"/, 15)) await K('c4b Leertaste (Spaltenvariable)', 'Space', { wait: 9000 });
  note('c4z', JSON.stringify(await zustand()));
  await K('c5 Tab', 'Tab', { wait: 600 });
  for (let i = 0; i < 12; i++) { const g = await K('c6.' + i + ' T', 'KeyT', { wait: 900 }); if (g && g.join(' ').includes('Kreuztabelle')) break; if (g && g.join(' ').includes('Keine weitere')) break; }
  await K('c7 Runter', 'ArrowDown', { wait: 800 }); await K('c7b Runter', 'ArrowDown', { wait: 800 });
  for (const k of ['ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowRight']) await K('c8 Strg+Alt+' + k, 'Control+Alt+' + k, { wait: 800 });
};
//__PHASEN__









await mitNvda(PHASEN[phase]);
