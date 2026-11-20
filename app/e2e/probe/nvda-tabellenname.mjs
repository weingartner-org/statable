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

const PORT = Number(process.env.NVDA_PORT ?? 4195);
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
 [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int c); }
"@
while ($true) { $l = [Console]::In.ReadLine(); if ($l -eq $null) { break }
 if ($l -eq 'fg') { $h=[W]::GetForegroundWindow(); $p=0; [void][W]::GetWindowThreadProcessId($h,[ref]$p); $n=(Get-Process -Id $p -ErrorAction SilentlyContinue).ProcessName; [Console]::Out.WriteLine("FG:$n"); }
 elseif ($l -eq 'front') { $ps = Get-Process msedge -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 }; foreach ($q in $ps) { [void][W]::ShowWindow($q.MainWindowHandle, 9); [void][W]::SetForegroundWindow($q.MainWindowHandle) }; [Console]::Out.WriteLine("FRONT:" + @($ps).Count) } }
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

const PHASEN = {};
PHASEN.smoke = async () => {
  await gehe('beispiele');
  await K('s1', 'Tab'); await K('s2', 'Tab');
  await C('s3', 'reportTitle');
};
PHASEN.tabellenname = async () => {
  // Aufbau per Playwright (Mausklicks, nicht gemessen), danach nur Tasten mit NVDA.
  await gehe('beispiele');
  const karte = page.locator('*:has-text("Hilft das Lesetraining")').filter({ has: page.getByRole('button', { name: /Öffnen und üben/ }) }).last();
  await karte.getByRole('button', { name: /Öffnen und üben/ }).click();
  await page.waitForFunction(() => location.hash === '#daten', undefined, { timeout: 30000 });
  const ende = page.getByRole('button', { name: 'Rundgang beenden' }); if (await ende.isVisible().catch(() => false)) await ende.click();
  await gehe('blatt/neu');
  await page.getByText(/Unterscheiden sich Gruppen/).first().click();
  await page.locator('input[value="lesen_vor"]').first().click({ force: true });
  await page.waitForTimeout(800);
  await page.locator('input[value="klasse"]').first().click({ force: true });
  await page.locator('main table.apa').first().waitFor({ timeout: 90000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { const t = [...document.querySelectorAll('main table.apa')].find(x => /Deskriptive/.test(x.querySelector('caption')?.textContent ?? '')); t?.scrollIntoView(); document.body.focus(); window.scrollTo(0, 0); });
  await nachVorn();
  // Browse-Modus: Tabelle für Tabelle mit T springen
  note('t0', 'DOM-Namen: ' + JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('main table.apa')].map(t => t.querySelector('caption')?.textContent.trim()))));
  for (let i = 1; i <= 8; i++) { const g = await K('T' + i, 't', { wait: 1200 }); if (g && /Deskriptive|Descriptives/.test(g.join(' '))) { await C('beschreibung', 'sayAll', { wait: 800 }).catch(() => {}); break; } }
};
//__PHASEN__
await mitNvda(PHASEN[phase]);
