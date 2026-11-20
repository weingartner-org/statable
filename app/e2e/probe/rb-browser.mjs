// Rest-B B12/B13 ohne NVDA: Kürzel und Fokus-Rückgabe in normalen Browserfenstern (Edge, Chrome). Firefox: kein Playwright-Firefox installiert (nicht gemessen).
// Aufruf: node e2e/probe/rb-browser.mjs <b12|b13> <msedge|chrome>   (Vite-Vorschau Port 4194)
// B12 sendet ECHTE Tasten über das Betriebssystem (SendKeys), nur wenn der Browser im Vordergrund liegt; so greifen auch Tastenkürzel des Browsers.
// B13 nutzt Playwright-Tasten (Verhalten der Seite, nicht des Browsers).
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const was = process.argv[2] ?? 'b12';
const kanal = process.argv[3] ?? 'msedge';
const prozess = kanal === 'chrome' ? 'chrome' : 'msedge';
const BASE = 'http://127.0.0.1:4194/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rec = (o) => console.log(JSON.stringify(o));

const psDir = mkdtempSync(join(tmpdir(), 'rbb-'));
const psFile = join(psDir, 'tasten.ps1');
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
 elseif ($l.StartsWith('front:')) { $nm=$l.Substring(6); $ps = Get-Process $nm -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -notmatch 'Sensorik' }; foreach ($q in $ps) { [W]::keybd_event(0x12,0,0,[UIntPtr]::Zero); [W]::keybd_event(0x12,0,2,[UIntPtr]::Zero); [void][W]::ShowWindow($q.MainWindowHandle, 9); [void][W]::SetForegroundWindow($q.MainWindowHandle) }; [Console]::Out.WriteLine("FRONT:" + @($ps).Count) }
 elseif ($l.StartsWith('send:')) { [System.Windows.Forms.SendKeys]::SendWait($l.Substring(5)); [Console]::Out.WriteLine("SENT") } }
`);
const ps = spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', psFile], { stdio: ['pipe', 'pipe', 'ignore'] });
let buf = ''; const wait = [];
ps.stdout.on('data', (d) => { buf += d.toString(); let i; while ((i = buf.indexOf('\n')) >= 0) { const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1); const w = wait.shift(); if (w) w(line); } });
const psAsk = (cmd) => new Promise((res) => { wait.push(res); ps.stdin.write(cmd + '\n'); });

let browser, ctx, page;
async function vorn() {
  for (let i = 0; i < 4; i++) {
    if ((await psAsk('fg')) === 'FG:' + prozess) return true;
    try { await page.bringToFront(); } catch {}
    await psAsk('front:' + prozess); await sleep(500);
  }
  return (await psAsk('fg')) === 'FG:' + prozess;
}
const INIT = `window.__k = []; window.addEventListener('keydown', (e) => { window.__k.push({ key: e.key, code: e.code, alt: e.altKey, ctrl: e.ctrlKey, shift: e.shiftKey, ziel: e.target && (e.target.tagName + (e.target.id ? '#' + e.target.id : '')) }); }, true);`;

async function start() {
  browser = await chromium.launch({ channel: kanal, headless: false, args: ['--start-maximized'] });
  ctx = await browser.newContext({ locale: 'de-DE', viewport: null });
  await ctx.addInitScript(INIT);
  page = await ctx.newPage();
  await page.goto(BASE + '#beispiele', { waitUntil: 'load' }); await sleep(1500);
  await page.getByRole('button', { name: 'Öffnen und üben' }).first().click(); await sleep(3000);
  const ende = page.getByRole('button', { name: 'Rundgang beenden' }); if (await ende.isVisible().catch(() => false)) await ende.click();
  await page.evaluate(() => { location.hash = 'start'; }); await sleep(1200);
}
const zustand = () => page.evaluate(() => {
  const a = document.activeElement;
  return { hash: location.hash, fokus: a ? a.tagName.toLowerCase() + (a.id ? '#' + a.id : '') + ':' + (a.getAttribute('aria-label') || a.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30) : null, dialog: document.querySelector('dialog[open]')?.id || (document.querySelector('dialog[open]') ? 'dialog' : null), hatFokus: document.hasFocus(), ansage: (document.getElementById('ansage-hoeflich')?.textContent || '') + '|' + (document.getElementById('ansage-dringend')?.textContent || '') };
}).catch((e) => ({ fehler: String(e).slice(0, 60) }));

async function taste(name, keys, vorbereiten, { esc = true } = {}) {
  if (vorbereiten) await vorbereiten();
  await sleep(400);
  const vorher = await zustand(); const seiten = ctx.pages().length;
  await page.evaluate(() => { window.__k = []; });
  if (!(await vorn())) { rec({ taste: name, fehler: 'Browser nicht im Vordergrund, Taste NICHT gesendet' }); return; }
  await psAsk('send:' + keys); await sleep(1200);
  const nachher = await zustand();
  const k = await page.evaluate(() => window.__k).catch(() => []);
  rec({ taste: name, angekommen: k.length ? k.map((x) => `${x.alt ? 'Alt+' : ''}${x.ctrl ? 'Strg+' : ''}${x.shift ? 'Umschalt+' : ''}${x.key}@${x.ziel}`) : 'NICHT angekommen', vorher: { hash: vorher.hash, fokus: vorher.fokus }, nachher, neueFensterOderReiter: ctx.pages().length - seiten });
  if (esc && nachher.dialog) { await page.keyboard.press('Escape'); await sleep(600); }
}
const aufStart = async () => { await page.evaluate(() => { location.hash = 'start'; (document.activeElement)?.blur?.(); const h = document.querySelector('h1'); h?.setAttribute('tabindex', '-1'); h?.focus(); }); await sleep(900); };

async function b12() {
  await start();
  await taste('Strg+K', '^k', aufStart);
  await taste('Alt+T', '%t', aufStart);
  await taste('Alt+W', '%w', aufStart);
  await taste('Alt+M', '%m', aufStart);
  await taste('Alt+1', '%1', aufStart);
  await taste('Alt+Bild ab', '%{PGDN}', aufStart);
  await taste('Alt+J', '%j', aufStart);
  await taste('Alt+N', '%n', aufStart);
  const imRand = async () => { await page.evaluate(() => { location.hash = 'hilfe/adjustierter-mittelwert'; }); await sleep(2500); const k = page.locator('button.begriff-link').first(); await k.focus(); await page.keyboard.press('Enter'); await sleep(1200); };
  await taste('Alt+Z (Erklärung offen, Z-Taste des deutschen Layouts per Betriebssystem)', '%z', imRand, { esc: false });
  // im Eingabefeld (Hilfe-Suche)
  const imFeld = async () => { await page.evaluate(() => { location.hash = 'hilfe'; }); await sleep(2500); await page.evaluate(() => document.getElementById('hi-suche')?.focus()); await sleep(400); };
  await taste('Alt+J im Eingabefeld (Hilfe-Suche)', '%j', imFeld);
  await taste('Alt+N im Eingabefeld (Hilfe-Suche)', '%n', imFeld);
  await taste('Strg+K im Eingabefeld', '^k', imFeld);
  await taste('Alt+W im Eingabefeld', '%w', imFeld);
}

async function b12b() { // Reiterkürzel von der Datenseite aus
  await start();
  const aufDaten = async () => { await page.evaluate(() => { location.hash = 'daten'; }); await sleep(1500); await page.evaluate(() => { (document.activeElement)?.blur?.(); const h = document.querySelector('h1'); h?.setAttribute('tabindex', '-1'); h?.focus(); }); await sleep(600); };
  await taste('Alt+1 (von Daten)', '%1', aufDaten);
  await taste('Alt+2 (von Daten)', '%2', aufDaten);
  await taste('Alt+Bild ab (von Daten)', '%{PGDN}', aufDaten);
  await taste('Alt+Bild auf (von Daten)', '%{PGUP}', aufDaten);
  await taste('Alt+N (von Daten)', '%n', aufDaten);
}
// B13: Fokus-Rückgabe
async function b13() {
  await start();
  const fokus = () => page.evaluate(() => { const a = document.activeElement; return a ? a.tagName.toLowerCase() + (a.id ? '#' + a.id : '') + ':' + (a.getAttribute('aria-label') || a.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40) : null; });
  // Dialoge
  for (const [name, taste, ziel] of [['Befehlspalette', 'Control+KeyK', 'h1'], ['Kürzel-Liste', 'Alt+KeyT', 'h1'], ['Melden', 'Alt+Shift+KeyP', 'h1'], ['Meldungsverlauf', 'Alt+KeyM', 'h1']]) {
    await page.evaluate(() => { location.hash = 'start'; (document.activeElement)?.blur?.(); const h = document.querySelector('h1'); h?.setAttribute('tabindex', '-1'); h?.focus(); }); await sleep(900);
    const vor = await fokus();
    await page.keyboard.press(taste); await sleep(900);
    const offen = await page.evaluate(() => !!document.querySelector('dialog[open]'));
    const imDialog = await fokus();
    await page.keyboard.press('Escape'); await sleep(800);
    const zu = await page.evaluate(() => !document.querySelector('dialog[open]'));
    rec({ b13: name, fokusVorher: vor, offen, fokusImDialog: imDialog, nachEsc: { geschlossen: zu, fokus: await fokus() }, rueckAufAlt: vor === (await fokus()) });
  }
  // Fachwort und Alt+Z
  await page.evaluate(() => { location.hash = 'hilfe/adjustierter-mittelwert'; }); await sleep(2500);
  const knopf = page.locator('button.begriff-link').first();
  await knopf.focus(); const vorF = await fokus();
  await page.keyboard.press('Enter'); await sleep(1200);
  const imRand = await fokus();
  await page.keyboard.press('Escape'); await sleep(900);
  const nachEsc = await fokus();
  rec({ b13: 'Fachwort Enter, dann Esc', fokusVorher: vorF, nachEnter: imRand, nachEsc, rueckAufFachwort: vorF === nachEsc });
  await knopf.focus(); await page.keyboard.press('Enter'); await sleep(1200);
  const imRand2 = await fokus();
  await page.keyboard.press('Alt+KeyZ'); await sleep(900);
  const nachAltZ = await fokus();
  rec({ b13: 'Fachwort Enter, dann Alt+Z', nachEnter: imRand2, nachAltZ, rueckAufFachwort: vorF === nachAltZ });
  // Alt+Z von einer anderen Stelle aus (nach Wechsel mit Tab in den Rand)
  await page.keyboard.press('Tab'); await sleep(300); await page.keyboard.press('Alt+KeyZ'); await sleep(900);
  rec({ b13: 'Alt+Z nochmals (nach Tab)', fokus: await fokus() });
}

try { await (was === 'b12' ? b12() : was === 'b12b' ? b12b() : b13()); }
catch (e) { rec({ fehler: String(e.stack ?? e).slice(0, 500) }); }
finally { try { await browser.close(); } catch {} ps.kill(); }
