// Gemeinsame Hilfen für die NVDA-Messung Stufe 1 (Erheben). Gleiche Regeln wie nvda-rest-b.mjs:
// keine Quelldatei der App ändern; Tasten nur senden, wenn msedge im Vordergrund liegt; nie in die Adressleiste tippen;
// nur das eigene NVDA (Guidepup) wird gestartet und beendet. Aufbau (Klicks, Dateien, Fokus setzen) per Playwright wird als "aufbau" gekennzeichnet.
import { nvda } from '@guidepup/guidepup';
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { writeFileSync, appendFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export { nvda };
export const PORT = Number(process.env.NVDA_PORT ?? 4212);
export const BASE = `http://localhost:${PORT}/`;
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const S = { page: null, browser: null, ctx: null, abbruch: false, OUT: null };

const psDir = mkdtempSync(join(tmpdir(), 'fg-'));
const psFile = join(psDir, 'fg.ps1');
writeFileSync(psFile, `
Add-Type @"
using System; using System.Runtime.InteropServices;
public class W { [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint p);
 [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
 [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int c);
 [DllImport("user32.dll")] public static extern void keybd_event(byte b, byte s, uint f, UIntPtr e);
 [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint a, uint b, bool f);
 [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId(); }
"@
while ($true) { $l = [Console]::In.ReadLine(); if ($l -eq $null) { break }
 if ($l -eq 'fg') { $h=[W]::GetForegroundWindow(); $p=0; [void][W]::GetWindowThreadProcessId($h,[ref]$p); $n=(Get-Process -Id $p -ErrorAction SilentlyContinue).ProcessName; [Console]::Out.WriteLine("FG:$n"); }
 elseif ($l -eq 'front') { $ps = Get-Process msedge -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -notmatch 'Sensorik' }; foreach ($q in $ps) { [W]::keybd_event(0x12,0,0,[UIntPtr]::Zero); [W]::keybd_event(0x7C,0,0,[UIntPtr]::Zero); [W]::keybd_event(0x7C,0,2,[UIntPtr]::Zero); [W]::keybd_event(0x12,0,2,[UIntPtr]::Zero); [void][W]::ShowWindow($q.MainWindowHandle, 9); [void][W]::SetForegroundWindow($q.MainWindowHandle) }; [Console]::Out.WriteLine("FRONT:" + @($ps).Count) } }
`);
const ps = spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', psFile], { stdio: ['pipe', 'pipe', 'ignore'] });
let psBuf = ''; const psWait = [];
ps.stdout.on('data', (d) => { psBuf += d.toString(); let i; while ((i = psBuf.indexOf('\n')) >= 0) { const line = psBuf.slice(0, i).trim(); psBuf = psBuf.slice(i + 1); const w = psWait.shift(); if (w) w(line); } });
export const psAsk = (cmd) => new Promise((res) => { psWait.push(res); ps.stdin.write(cmd + '\n'); });

async function istEdgeVorn() { return (await psAsk('fg')) === 'FG:msedge'; }
export async function nachVorn() {
  for (let i = 0; i < 4; i++) {
    const vorher = await psAsk('fg');
    if (vorher === 'FG:msedge') return true;
    try { await S.page.bringToFront(); } catch {}
    const fr = await psAsk('front'); console.log('front-> (vorher', vorher, ')', fr, 'fg->', await psAsk('fg')); await sleep(500);
  }
  return istEdgeVorn();
}
export const rec = (o) => { appendFileSync(S.OUT, JSON.stringify(o) + '\n'); console.log(JSON.stringify(o)); };
export async function spoken() { const l = await nvda.spokenPhraseLog(); await nvda.clearSpokenPhraseLog(); return l; }

export async function zustand() {
  try {
    return await S.page.evaluate(() => {
      const e = document.activeElement;
      const name = (x) => {
        if (!x) return '';
        const a = x.getAttribute('aria-label'); if (a) return 'aria-label:' + a;
        const lb = x.getAttribute('aria-labelledby'); if (lb) return 'labelledby:' + lb.split(' ').map((id) => document.getElementById(id)?.textContent.trim()).join(' ');
        if (x.labels && x.labels.length) return 'label:' + [...x.labels].map((y) => y.textContent.replace(/\s+/g, ' ').trim()).join(' ');
        if (x.title) return 'title:' + x.title; return '';
      };
      const desc = (x) => { const d = x?.getAttribute('aria-describedby'); return d ? d.split(' ').map((id) => (document.getElementById(id)?.textContent ?? '').replace(/\s+/g, ' ').trim()).join(' | ').slice(0, 160) : ''; };
      const d = (x) => x ? x.tagName.toLowerCase() + (x.id ? '#' + x.id : '') + '[' + (x.getAttribute('role') || x.type || '') + '] "' + (x.getAttribute('aria-label') || x.textContent || x.value || '').replace(/\s+/g, ' ').trim().slice(0, 60) + '" name=<' + name(x).slice(0, 110) + '>' + (desc(x) ? ' desc=<' + desc(x) + '>' : '') + (x.checked ? ' checked' : '') : null;
      return { hash: location.hash, fokus: d(e), ansagen: (window.__ansagen || []).slice(-3).map((a) => a.text), h1: document.querySelector('h1')?.textContent.trim().slice(0, 60) };
    });
  } catch (e) { return { fehler: String(e).slice(0, 80) }; }
}
export async function K(schritt, taste, { wait = 900, zeige = true } = {}) {
  if (S.abbruch) return null;
  if (!(await nachVorn())) { rec({ schritt, taste, fehler: 'msedge nicht im Vordergrund, Taste NICHT gesendet' }); S.abbruch = true; return null; }
  await spoken();
  await nvda.press(taste);
  await sleep(wait);
  const gesagt = await spoken();
  const z = zeige ? await zustand() : undefined;
  rec({ schritt, taste, gesagt, z });
  return { gesagt, z };
}
export async function C(schritt, cmdName, { wait = 900 } = {}) {
  if (S.abbruch) return null;
  if (!(await nachVorn())) { rec({ schritt, taste: cmdName, fehler: 'msedge nicht im Vordergrund' }); S.abbruch = true; return null; }
  await spoken();
  await nvda.perform(nvda.keyboardCommands[cmdName]);
  await sleep(wait);
  const gesagt = await spoken();
  const z = await zustand();
  rec({ schritt, taste: 'NVDA:' + cmdName, gesagt, z });
  return { gesagt, z };
}
export async function T(schritt, text, { wait = 800 } = {}) {
  if (S.abbruch) return null;
  if (!(await nachVorn())) { rec({ schritt, fehler: 'msedge nicht im Vordergrund' }); S.abbruch = true; return null; }
  await spoken();
  await nvda.type(text);
  await sleep(wait);
  const gesagt = await spoken();
  const z = await zustand();
  rec({ schritt, taste: 'tippen: ' + text, gesagt, z });
  return { gesagt, z };
}
export const note = (schritt, text) => rec({ schritt, notiz: text });
export const aufbau = (text) => rec({ schritt: 'aufbau', notiz: text });
/** Tab (oder andere Taste), bis der Fokus-Text zum Muster passt, höchstens max Mal; liefert den letzten Schritt */
export async function bis(schritt, re, { taste = 'Tab', max = 40, wait = 900 } = {}) {
  let r = null;
  for (let i = 1; i <= max; i++) {
    r = await K(`${schritt} (${i})`, taste, { wait });
    if (!r) return null;
    if (re.test(r.z?.fokus ?? '')) return r;
  }
  note(schritt, `Muster ${re} nach ${max} Tasten nicht erreicht`);
  return r;
}

export const INIT = `
window.__ansagen = [];
document.addEventListener('DOMContentLoaded', () => {
  const beobachte = () => { for (const id of ['ansage-hoeflich', 'ansage-dringend']) { const e = document.getElementById(id); if (e && !e.__b) { e.__b = 1; new MutationObserver(() => { window.__ansagen.push({ region: id, text: e.textContent, ms: Math.round(performance.now()) }); }).observe(e, { childList: true, characterData: true, subtree: true }); } } };
  beobachte(); setInterval(beobachte, 300);
});
`;

export async function mitNvda(phase, fn) {
  S.OUT = process.env.NVDA_OUT ?? join(tmpdir(), `nvda-erheben1-${phase}.jsonl`);
  writeFileSync(S.OUT, '');
  const vorher = await psAsk('fg');
  rec({ schritt: 'start', notiz: 'Vordergrund vor Start: ' + vorher + '; Phase ' + phase });
  S.browser = await chromium.launch({ channel: 'msedge', headless: false, args: ['--start-maximized'] });
  S.ctx = await S.browser.newContext({ locale: 'de-DE', viewport: null });
  await S.ctx.addInitScript(INIT);
  S.page = await S.ctx.newPage();
  S.page.on('dialog', (d) => d.dismiss().catch(() => {}));
  try {
    await S.page.goto(BASE, { waitUntil: 'load' }); await sleep(1500);
    await S.page.bringToFront();
    await nvda.start(); await sleep(2500);
    await nachVorn();
    await fn(S.page);
  } catch (e) { rec({ fehler: String(e.stack ?? e).slice(0, 600) }); }
  finally {
    try { await nvda.stop(); } catch (e) { rec({ fehler_stop: String(e) }); }
    try { await S.browser.close(); } catch {}
    ps.kill();
  }
}

// ---- Aufbau-Bausteine (Playwright) ----
export async function beispielOeffnen(page, titelTeil) {
  await page.goto(BASE + '#beispiele', { waitUntil: 'load' }); await sleep(1500);
  const karte = page.locator(`*:has-text("${titelTeil}")`).filter({ has: page.getByRole('button', { name: /Öffnen und üben/ }) }).last();
  await karte.getByRole('button', { name: /Öffnen und üben/ }).click();
  await page.waitForFunction(() => location.hash === '#daten', undefined, { timeout: 60000 });
  const ende = page.getByRole('button', { name: 'Rundgang beenden' }); if (await ende.isVisible().catch(() => false)) await ende.click();
  aufbau(`Beispiel "${titelTeil}" geöffnet (Playwright-Klicks, nicht gemessen)`);
}
