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
  browser = await chromium.launch({ channel: 'msedge', headless: false, args: ['--start-maximized'] });
  ctx = await browser.newContext({ locale: 'de-DE', viewport: null });
  await ctx.addInitScript(INIT);
  page = await ctx.newPage();
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

// ---- Kontrollversuch: verzögerte Ansagen (nicht App-Code) ----
const HTML = `<!doctype html><html lang="de"><meta charset="utf-8"><title>Kontrolle</title><body>
<h1>Kontrollseite</h1>
<button id="b1" type="button">Ansage nach 300 ms</button>
<button id="b2" type="button">Ansage nach 1500 ms</button>
<button id="b3" type="button">Ansage nach 4000 ms</button>
<button id="b4" type="button">Ansage sofort</button>
<div id="h" aria-live="polite" role="status" style="position:absolute;left:-9999px"></div>
<script>
let n = 0;
for (const [id, ms] of [['b1',300],['b2',1500],['b3',4000],['b4',0]]) document.getElementById(id).addEventListener('click', () => setTimeout(() => { n++; document.getElementById('h').textContent = 'Kontrollansage ' + id + ' Nummer ' + n; }, ms));
</script></body></html>`;
await mitNvda(async () => {
  await ctx.route('**/kontroll.html', (r) => r.fulfill({ contentType: 'text/html', body: HTML }));
  await page.goto(BASE + 'kontroll.html', { waitUntil: 'load' }); await sleep(1500);
  await page.bringToFront(); await nachVorn();
  note('aufbau', 'Kontrollseite geladen (Playwright)');
  await page.focus('#b4'); await sleep(500);
  for (const [id, warte] of [['b4', 4000], ['b1', 5000], ['b2', 7000], ['b3', 9000]]) {
    await page.focus('#' + id); await sleep(800); await spoken();
    await K('Enter auf ' + id, 'Enter', { wait: warte });
  }
});
