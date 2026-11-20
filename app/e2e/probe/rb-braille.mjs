// Rest-B B15: Braille (40 Zellen) mit der Prüfstand-NVDA-Welt (eigene Einstellungen unter %APPDATA%\nvda-pruefstand, Treiber schreibt in eine Datei).
// Ablauf: laufendes NVDA beenden -> Prüfstand-NVDA starten -> Edge (Playwright, normales Fenster) baut die Seite auf -> Tasten per SendKeys -> NVDA beenden -> normales NVDA wieder starten.
// Aufruf: node e2e/probe/rb-braille.mjs   (Vite-Vorschau Port 4194).  Ausgabe: %LOCALAPPDATA%\pruefstand\rb-braille\braille.txt (Punkte) und braille-klartext.txt (decodiert mit de-de-comp8).
import { chromium } from '@playwright/test';
import { spawn, spawnSync } from 'node:child_process';
import { writeFileSync, mkdtempSync, readFileSync, appendFileSync, existsSync, mkdirSync, copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = 'http://127.0.0.1:4194/';
const NVDA = existsSync('C:\\Program Files (x86)\\NVDA\\nvda.exe') ? 'C:\\Program Files (x86)\\NVDA\\nvda.exe' : 'C:\\Program Files\\NVDA\\nvda.exe';
const APPDATA = process.env.APPDATA, LOCAL = process.env.LOCALAPPDATA;
const KONFIG = join(APPDATA, 'nvda-pruefstand');
const BRAILLE_QUELLE = join(APPDATA, 'nvda-pruefstand-braille.txt');
const ARBEIT = join(LOCAL, 'pruefstand', 'rb-braille'); mkdirSync(ARBEIT, { recursive: true });
const LOG = join(ARBEIT, 'nvda.log');
const psRun = (cmd) => spawnSync('powershell', ['-NoProfile', '-Command', cmd], { encoding: 'utf8' });
const nvdaBeenden = () => psRun(`Start-Process -FilePath '${NVDA}' -ArgumentList '-q' -Wait`);
const nvdaStarten = (args = []) => psRun(`Start-Process -FilePath '${NVDA}'${args.length ? ' -ArgumentList @(' + args.map((a) => `'${a.replace(/'/g, "''")}'`).join(',') + ')' : ''}`);
const marke = (t) => { try { appendFileSync(BRAILLE_QUELLE, `--- ${t} ---\n`); } catch {} console.log('MARKE', t); };

// de-de-comp8: eine Zelle je Zeichen (sign \xHHHH dots)
function ladeTabelle() {
  const txt = readFileSync(join(NVDA.replace(/nvda\.exe$/i, ''), 'louis', 'tables', 'de-de-comp8.ctb'), 'utf8');
  const m = new Map();
  for (const l of txt.split(/\r?\n/)) { const x = /^sign\s+\\x([0-9a-f]{4})\s+(\d+)\s*$/i.exec(l); if (!x) continue; let bits = 0; for (const d of x[2]) bits |= 1 << (Number(d) - 1); if (x[2] === '0') bits = 0; if (!m.has(bits)) m.set(bits, String.fromCharCode(parseInt(x[1], 16))); }
  return m;
}
const dekodiere = (zeile, tab) => [...zeile].map((c) => { const k = c.codePointAt(0); if (k < 0x2800 || k > 0x28ff) return c; return tab.get(k - 0x2800) ?? `[${(k - 0x2800).toString(16)}]`; }).join('');

// Tastenhelfer wie in rb-browser.mjs
const psDir = mkdtempSync(join(tmpdir(), 'rbr-')); const psFile = join(psDir, 'tasten.ps1');
writeFileSync(psFile, `
Add-Type -AssemblyName System.Windows.Forms
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
 elseif ($l -eq 'front') { $ps = Get-Process msedge -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -notmatch 'Sensorik' }; foreach ($q in $ps) { [W]::keybd_event(0x12,0,0,[UIntPtr]::Zero); [W]::keybd_event(0x12,0,2,[UIntPtr]::Zero); [void][W]::ShowWindow($q.MainWindowHandle, 9); [void][W]::SetForegroundWindow($q.MainWindowHandle) }; [Console]::Out.WriteLine("FRONT:" + @($ps).Count) }
 elseif ($l.StartsWith('send:')) { [System.Windows.Forms.SendKeys]::SendWait($l.Substring(5)); [Console]::Out.WriteLine("SENT") } }
`);
const ps = spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', psFile], { stdio: ['pipe', 'pipe', 'ignore'] });
let buf = ''; const wait = [];
ps.stdout.on('data', (d) => { buf += d.toString(); let i; while ((i = buf.indexOf('\n')) >= 0) { const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1); const w = wait.shift(); if (w) w(line); } });
const psAsk = (cmd) => new Promise((res) => { wait.push(res); ps.stdin.write(cmd + '\n'); });
let page, browser, abbruch = false;
async function vorn() { for (let i = 0; i < 4; i++) { if ((await psAsk('fg')) === 'FG:msedge') return true; try { await page.bringToFront(); } catch {} await psAsk('front'); await sleep(500); } return (await psAsk('fg')) === 'FG:msedge'; }
const protokoll = []; let gesehen = 0; let tabGlobal = null;
const braille = () => { try { return readFileSync(BRAILLE_QUELLE, 'utf8').split(String.fromCharCode(10)).map((z) => z.split(String.fromCharCode(13)).join('')).filter((z) => z && !z.startsWith('---')); } catch { return []; } };
async function K(label, keys, wartezeit = 900) {
  if (abbruch) return; if (!(await vorn())) { console.log('Edge nicht vorn, Taste NICHT gesendet:', label); abbruch = true; return; }
  tabGlobal ??= ladeTabelle();
  const vorher = braille(); gesehen = vorher.length;
  await psAsk('send:' + keys); await sleep(wartezeit);
  let nachher = braille(); const neu = nachher.length >= gesehen ? nachher.slice(gesehen) : nachher; // Datei abgeschnitten: alles zählt als neu
  const e = { schritt: label, zeilen: neu.map((z) => `[${[...z].length} Zellen] ${dekodiere(z, tabGlobal)}`), dateiAbgeschnitten: nachher.length < gesehen };
  protokoll.push(e); console.log(JSON.stringify(e));
}

let nvdaGestartet = false;
try {
  // 1. Prüfstand-Welt vorbereiten (Treiber kopieren; die Einstellungen der Prüfstand-Welt existieren bereits)
  mkdirSync(join(KONFIG, 'scratchpad', 'brailleDisplayDrivers'), { recursive: true });
  copyFileSync(join(process.cwd(), '..', 'werkzeuge', 'nvda', 'brailleDisplayDrivers', 'pruefstand.py'), join(KONFIG, 'scratchpad', 'brailleDisplayDrivers', 'pruefstand.py'));
  if (!/display = pruefstand/.test(readFileSync(join(KONFIG, 'nvda.ini'), 'utf8'))) throw new Error('nvda.ini der Prüfstand-Welt ohne display = pruefstand');
  if (existsSync(BRAILLE_QUELLE)) rmSync(BRAILLE_QUELLE, { force: true });
  // 2a. NVDA wechseln (zuerst, damit NVDA den Browser von Anfang an sieht)
  console.log('Laufendes NVDA beenden'); nvdaBeenden(); await sleep(4000);
  console.log('Prüfstand-NVDA starten'); nvdaStarten(['-c', `"${KONFIG}"`, '-f', `"${LOG}"`, '-l', '12', '-m']); nvdaGestartet = true; await sleep(14000);
  // 2. Aufbau mit Playwright (Edge normales Fenster), noch ohne NVDA, danach NVDA wechseln
  browser = await chromium.launch({ channel: 'msedge', headless: false, args: ['--start-maximized'] });
  const ctx = await browser.newContext({ locale: 'de-DE', viewport: null }); page = await ctx.newPage();
  await page.goto(BASE + '#beispiele', { waitUntil: 'load' }); await sleep(1500);
  await page.getByRole('button', { name: 'Öffnen und üben' }).first().click(); await sleep(3000);
  const ende = page.getByRole('button', { name: 'Rundgang beenden' }); if (await ende.isVisible().catch(() => false)) await ende.click();
  await page.evaluate(() => { location.hash = 'einstellungen'; }); await sleep(1500);
  const sw = page.locator('span.ez-name', { hasText: 'Kurze Spaltenköpfe' }).first().locator('xpath=ancestor::*[.//input[@role="switch"]][1]').locator('input[role=switch]').first();
  if (!(await sw.isChecked())) await sw.click({ force: true });
  console.log('Kurze Spaltenköpfe an:', await sw.isChecked());
  await page.evaluate(() => { location.hash = 'blatt/neu'; }); await sleep(1200);
  await page.getByText(/Unterscheiden sich Gruppen/).first().click();
  await page.locator('input[value="lesen_vor"]').first().click({ force: true }); await sleep(800);
  await page.locator('input[value="klasse"]').first().click({ force: true });
  await page.locator('main table.apa').first().waitFor({ timeout: 90000 }); await sleep(3000);
  await page.evaluate(() => { (document.activeElement)?.blur?.(); window.scrollTo(0, 0); });
  await page.bringToFront(); await vorn(); await sleep(1500);
  // 4. Messung: Tabellenkopf (Kurzköpfe an), Diagrammkurztext, Kürzel-Hilfe
  await K('Strg+Pos1', '^{HOME}', 700);
  await K('T (Tabelle Deskriptive Statistiken)', 't', 1200);
  await K('Pfeil runter 1', '{DOWN}', 700);
  await K('Pfeil runter 2 (erste Kopfzelle)', '{DOWN}', 700);
  for (let i = 2; i <= 6; i++) await K(`Strg+Alt+Rechts (Kopf ${i})`, '^%{RIGHT}', 800);
  await K('Strg+Alt+Unten (Datenzelle)', '^%{DOWN}', 800);
  await K('Strg+Alt+Links (Datenzelle)', '^%{LEFT}', 800);
  await K('Strg+Pos1', '^{HOME}', 700);
  await K('G (Diagramm, Bildtext)', 'g', 1500);
  await K('Pfeil runter (Diagramm weiterlesen)', '{DOWN}', 900);
  await K('Alt+T (Kürzel-Liste öffnen)', '%t', 1500);
  for (let i = 1; i <= 4; i++) await K(`Tab ${i} in der Kürzel-Liste`, '{TAB}', 900);
  await K('Esc', '{ESC}', 700); await K('Esc (zweites)', '{ESC}', 700);
  marke('ENDE');
} catch (e) { console.log('FEHLER', String(e.stack ?? e).slice(0, 500)); }
finally {
  try { await browser?.close(); } catch {}
  ps.kill();
  if (nvdaGestartet) { nvdaBeenden(); await sleep(4000); }
  // normales NVDA wieder starten (Zustand wie vorher: ein NVDA mit den persönlichen Einstellungen)
  nvdaStarten(); await sleep(6000);
  writeFileSync(join(ARBEIT, 'protokoll.json'), JSON.stringify(protokoll, null, 1));
  if (existsSync(BRAILLE_QUELLE)) {
    const roh = readFileSync(BRAILLE_QUELLE, 'utf8'); writeFileSync(join(ARBEIT, 'braille.txt'), roh);
    const tab = ladeTabelle();
    const klar = roh.split(/\r?\n/).filter(Boolean).map((z) => (z.startsWith('---') ? z : `[${[...z].length} Zellen] ${dekodiere(z, tab)}`)).join('\n');
    writeFileSync(join(ARBEIT, 'braille-klartext.txt'), klar); console.log(klar);
  } else console.log('keine Braille-Datei entstanden');
}
