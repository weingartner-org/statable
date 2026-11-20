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

const PHASEN = {};

// B1: Tabellenname
PHASEN.b1 = async () => {
  await ttestAufbau(false);
  await page.evaluate(() => { const t = [...document.querySelectorAll('main table.apa')].find((x) => /Deskriptive|Descriptives/.test(x.querySelector('caption')?.textContent ?? '')); t?.scrollIntoView(); (document.activeElement)?.blur?.(); window.scrollTo(0, 0); });
  await nachVorn();
  note('b1-dom', 'DOM-Tabellennamen: ' + JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('main table.apa')].map((t) => t.querySelector('caption')?.textContent.trim()))));
  // Tabelle für Tabelle mit T
  for (let i = 1; i <= 8; i++) {
    const g = await K('b1-T' + i, 'KeyT', { wait: 1200 });
    if (g && /Deskriptive|Descriptives/.test(g.join(' '))) { await K('b1-runter', 'ArrowDown', { wait: 900 }); break; }
  }
};

// B2: Überschrift mit Fachwort
PHASEN.b2 = async () => {
  await hash('hilfe/adjustierter-mittelwert'); await sleep(800);
  note('b2-dom', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('h1,h2,h3')].map((h) => h.tagName + ': ' + h.textContent.trim().slice(0, 80) + ' | Schalter innen: ' + h.querySelectorAll('button').length))));
  // erste Überschrift nach der Kopfzeile: vom Fokus (h2) aus eine Überschrift vor und zurück, damit die Zeile der Überschrift selbst gesprochen wird
  await K('b2-H nächste Überschrift', 'KeyH', { wait: 900 });
  await K('b2-Shift+H zurück zur h2', 'Shift+KeyH', { wait: 900 });
  // Fachwort im Text darunter: nächste Schalter
  for (let i = 0; i < 3; i++) await K('b2-B' + i, 'KeyB', { wait: 800 });
  await C('b2-Fokus', 'reportCurrentFocus', { wait: 800 }).catch(() => {});
};

// B3: Esc im Textfeld
async function escDialog(name, oeffnen, ohneNvda) {
  // 1) Standard (NVDA schaltet beim Fokus ins Textfeld selbst in den Fokusmodus)
  await hash('start'); await sleep(500);
  await K(`${name}-1 öffnen`, ...oeffnen);
  await sleep(500);
  await K(`${name}-1 Esc (erstes)`, 'Escape', { wait: 1200 });
  const z = await zustand(); note(`${name}-1`, 'Dialog offen nach erstem Esc: ' + z.dialog);
  if (z.dialog) await K(`${name}-1 Esc (zweites)`, 'Escape', { wait: 1200 });
  // 2) Fokusmodus erzwungen: erst auf Lesemodus, dann auf Fokusmodus umschalten (NVDA+Leertaste), dann Esc
  await K(`${name}-2 öffnen`, ...oeffnen);
  await sleep(500);
  await C(`${name}-2 NVDA+Leertaste (1)`, 'toggleBetweenBrowseAndFocusMode', { wait: 900 });
  await C(`${name}-2 NVDA+Leertaste (2)`, 'toggleBetweenBrowseAndFocusMode', { wait: 900 });
  await K(`${name}-2 Esc (erstes, erzwungener Fokusmodus)`, 'Escape', { wait: 1200 });
  const z2 = await zustand(); note(`${name}-2`, 'Dialog offen nach erstem Esc: ' + z2.dialog);
  if (z2.dialog) await K(`${name}-2 Esc (zweites)`, 'Escape', { wait: 1200 });
}
PHASEN.b3 = async () => {
  await beispielAufbau();
  await hash('start'); await sleep(800);
  await escDialog('palette', ['Control+KeyK', { wait: 1200 }]);
  await escDialog('kuerzel', ['Alt+KeyT', { wait: 1200 }]);
  await escDialog('melden', ['Alt+Shift+KeyP', { wait: 1500 }]);
};

// B3 ohne NVDA (nur Playwright, Tasten per Playwright-Tastatur)
PHASEN.b3ohne = async () => {
  await beispielAufbau();
  for (const [name, taste] of [['palette', 'Control+KeyK'], ['kuerzel', 'Alt+KeyT'], ['melden', 'Alt+Shift+KeyP']]) {
    await hash('start'); await sleep(500);
    await page.evaluate(() => { window.__esc = []; });
    await page.keyboard.press(taste); await sleep(900);
    const vor = await zustand();
    const feld = await page.evaluate(() => { const a = document.activeElement; return a ? a.tagName + (a.type ? ':' + a.type : '') : null; });
    await page.keyboard.press('Escape'); await sleep(800);
    const nach1 = await zustand();
    if (nach1.dialog) { await page.keyboard.press('Escape'); await sleep(800); }
    const nach2 = await zustand();
    rec({ schritt: 'b3ohne-' + name, offen: vor.dialog, fokusElement: feld, nachErstemEsc: nach1.dialog ? 'offen' : 'geschlossen', nachZweitemEsc: nach2.dialog ? 'offen' : 'geschlossen', escEreignisse: nach2.esc });
  }
};

// B4: Zifferntasten in Üben
PHASEN.b4 = async () => {
  await hash('verstehen/ueben/faktor'); await sleep(3500);
  note('b4-start', JSON.stringify(await zustand()));
  // Lesemodus (Standard): Taste 2
  await K('b4-1 Ziffer 2 im Lesemodus', 'Digit2', { wait: 1200 });
  await K('b4-2 Ziffer 1 im Lesemodus', 'Digit1', { wait: 1200 });
  note('b4-3', 'Antwort gewählt (Rückmeldung-Überschrift da)? ' + (await zustand()).rueck);
  // Fokusmodus erzwingen (NVDA+Leertaste), dann Ziffer
  await C('b4-4 NVDA+Leertaste (Fokusmodus)', 'toggleBetweenBrowseAndFocusMode', { wait: 900 });
  await K('b4-5 Ziffer 2 im Fokusmodus', 'Digit2', { wait: 1500 });
  note('b4-6', 'Antwort gewählt (Rückmeldung-Überschrift da)? ' + (await zustand()).rueck);
  note('b4-7', 'Tipptext: ' + (await page.evaluate(() => document.querySelector('.ue-tipp')?.textContent ?? '(keiner)')));
  // Nach der Antwort: Tab, was liest NVDA
  await K('b4-8 Tab', 'Tab', { wait: 900 });
};

PHASEN.b4fokus = async () => {
  await hash('verstehen/ueben/faktor'); await sleep(3500);
  note('b4f-start', JSON.stringify(await zustand()));
  await C('b4f-1 NVDA+Leertaste (Fokusmodus, Lesezeiger noch auf der Frage)', 'toggleBetweenBrowseAndFocusMode', { wait: 900 });
  await K('b4f-2 Ziffer 2 im Fokusmodus', 'Digit2', { wait: 1800 });
  note('b4f-3', 'Antwort gewählt (Rückmeldung-Überschrift da)? ' + (await zustand()).rueck);
  await K('b4f-4 Tab', 'Tab', { wait: 900 });
  await C('b4f-5 NVDA+Leertaste (zurück in Lesemodus)', 'toggleBetweenBrowseAndFocusMode', { wait: 900 });
};

PHASEN.verzug = async () => {
  await hash('start'); await sleep(1500);
  await K('v-0 Tab (Fokus in die Seite)', 'Tab', { wait: 900 });
  await page.evaluate(() => { const b = document.createElement('button'); b.id = 'probe-knopf'; b.textContent = 'Probeknopf'; b.style.cssText = 'position:fixed;top:60px;left:0;z-index:99999';
    b.onclick = () => { for (const ms of [0, 700, 1500, 3000, 6000]) setTimeout(() => { const st = document.getElementById('ansage-hoeflich'); st.textContent = ''; setTimeout(() => { st.textContent = 'Meldung nach ' + ms + ' Millisekunden'; }, 0); }, ms); };
    document.body.appendChild(b); b.focus(); });
  if (!(await nachVorn())) return;
  await spoken(); const t0 = Date.now(); await nvda.press('Enter'); const prot = [];
  for (let i = 0; i < 24; i++) { await sleep(400); const g = await spoken(); if (g.length) prot.push({ t: Date.now() - t0, g }); }
  rec({ schritt: 'verzug Enter, Meldungen nach 0/0,7/1,5/3/6 s', zeitlich: prot });
};
PHASEN.verzug2 = async () => { // Test-Seite ohne App-Code, ohne Playwright-Skript im Seitenkontext: nur Tasten
  await page.goto(BASE + 'live-test.html', { waitUntil: 'load' }); await sleep(1500);
  await K('v2-0 Tab', 'Tab', { wait: 900 });
  if (!(await nachVorn())) return;
  await spoken(); const t0 = Date.now(); await nvda.press('Enter'); const prot = [];
  for (let i = 0; i < 24; i++) { await sleep(400); const g = await spoken(); if (g.length) prot.push({ t: Date.now() - t0, g }); }
  rec({ schritt: 'verzug2 Enter, Meldungen nach 0/0,3/0,7/1,5/3/6 s (einfache Testseite)', zeitlich: prot });
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
PHASEN.b11b = async () => {
  // (a) Beispiel per Tasten öffnen: Überschrift nach dem Öffnen einmal oder doppelt?
  await gehe('beispiele');
  if (await tabBis('b11b-a', /Öffnen und üben/i, 40)) {
    await K('b11b-a1 Enter (Beispiel öffnen)', 'Enter', { wait: 4500 });
    for (let i = 0; i < 8 && !abbruch; i++) { const z = await zustand(); if (!/Weiter|Los geht/.test(z.fokus ?? '')) break; await K('b11b-a2.' + i + ' Enter (Rundgang weiter)', 'Enter', { wait: 1800 }); }
  }
  // (b) Auswertung per Tasten: Alt+Bild ab öffnet Neue Auswertung
  await K('b11b-b Alt+Bild ab (Neue Auswertung)', 'Alt+PageDown', { wait: 1800 });
  // (c) Karte wählen, erste Gruppe, zweite Gruppe
  if (await tabBis('b11b-c', /Unterscheiden sich Gruppen/, 60)) {
    await K('b11b-c1 Enter (Karte)', 'Enter', { wait: 2500 });
    await C('b11b-c2 NVDA+Tab (Fokus melden: erster Auswahlschalter)', 'reportCurrentFocus', { wait: 900 });
    await K('b11b-c3 Leertaste (lesen_vor wählen)', 'Space', { wait: 2500 });
    await C('b11b-c4 NVDA+Tab', 'reportCurrentFocus', { wait: 900 });
    for (let i = 0; i < 3 && !abbruch; i++) await K('b11b-c5.' + i + ' Tab', 'Tab', { wait: 800 });
  }
};
PHASEN.live = async () => {
  await hash('start'); await sleep(1500);
  await K('live-0 Tab (Fokus in die Seite)', 'Tab', { wait: 900 });
  const schreibe = async (schritt, js) => { if (!(await nachVorn())) return; await spoken(); await page.evaluate(js); await sleep(2500); rec({ schritt, gesagt: await spoken(), z: await zustand() }); };
  await schreibe('live-1 App-Region polite: "Probe eins" (leeren, im nächsten Takt füllen)', "(()=>{const e=document.getElementById('ansage-hoeflich'); e.textContent=''; setTimeout(()=>{e.textContent='Probe eins'},0);})()");
  await schreibe('live-2 App-Region dringend: "Probe zwei"', "(()=>{const e=document.getElementById('ansage-dringend'); e.textContent=''; setTimeout(()=>{e.textContent='Probe zwei'},0);})()");
  await schreibe('live-3 neue sichtbare Region role=status: "Probe drei"', "(()=>{const e=document.createElement('div'); e.id='probe-status'; e.setAttribute('role','status'); e.style.cssText='position:fixed;top:0;left:0;background:#fff;color:#000;z-index:99999'; document.body.appendChild(e); setTimeout(()=>{e.textContent='Probe drei'},300);})()");
  await schreibe('live-4 role=alert neu eingefügt mit Text: "Probe vier"', "(()=>{const e=document.createElement('div'); e.setAttribute('role','alert'); e.style.cssText='position:fixed;top:30px;left:0;background:#fff;color:#000;z-index:99999'; e.textContent='Probe vier'; document.body.appendChild(e);})()");
  await schreibe('live-5 Alert in der App-Region dringend (role=alert vorhanden): Kind-Element einfügen', "(()=>{const e=document.getElementById('ansage-dringend'); const p=document.createElement('p'); p.textContent='Probe fünf'; e.appendChild(p);})()");
  await schreibe('live-6 Aufbau: Probeknopf einfügen und fokussieren (Skript)', "(()=>{const b=document.createElement('button'); b.id='probe-knopf'; b.textContent='Probeknopf'; b.style.cssText='position:fixed;top:60px;left:0;z-index:99999'; b.onclick=()=>{ const st=document.getElementById('ansage-hoeflich'); st.textContent=''; setTimeout(()=>{st.textContent='Probe sechs per Tastendruck'},0); const a=document.createElement('div'); a.setAttribute('role','alert'); a.textContent='Probe sieben Alarm per Tastendruck'; document.body.appendChild(a); }; document.body.appendChild(b); b.focus();})()");
  await K('live-6b Enter auf Probeknopf', 'Enter', { wait: 2500 });
  note('live-dom', await page.evaluate(() => { const e = document.getElementById('ansage-hoeflich'); const cs = getComputedStyle(e); return JSON.stringify({ cls: e.className, role: e.getAttribute('role'), live: e.getAttribute('aria-live'), pos: cs.position, clip: cs.clip, w: cs.width, vis: cs.visibility, disp: cs.display, parent: e.parentElement.tagName + '#' + e.parentElement.id, ariaHiddenAncestor: !!e.closest('[aria-hidden=true]'), inert: !!e.closest('[inert]') }); }));
};

// B5: Rechnungs-Ansagen
async function b5(verz) {
  await ttestAufbau(true);
  await page.evaluate((v) => { window.__verz = v; window.__ansagen = []; }, verz);
  await nachVorn();
  note('b5', 'Verzögerung der Engine-Rechnung künstlich: ' + verz + ' ms');
  if (abbruch || !(await nachVorn())) return;
  await spoken();
  const t0 = Date.now();
  await nvda.press('Space');
  const prot = [];
  for (let i = 0; i < 40; i++) { await sleep(500); const g = await spoken(); if (g.length) prot.push({ t: Date.now() - t0, g }); if (i > 8 && (await page.evaluate(() => document.querySelectorAll('main table.apa').length)) > 0 && i > (verz / 500) + 6) break; }
  rec({ schritt: 'b5-Space (klasse wählen)', zeitlich: prot, z: await zustand() });
  rec({ schritt: 'b5-Ansage-Regionen (DOM, Zeitstempel in ms seit Seitenstart)', ansagen: await page.evaluate(() => window.__ansagen) });
}
PHASEN.b5lang = () => b5(4000);
PHASEN.b5kurz = () => b5(0);

// B11: Assistent t-Test: doppelte Überschriften, Eingabefeld ohne Namen
PHASEN.b11 = async () => {
  await beispielAufbau();
  await hash('daten'); await sleep(800);
  await hash('blatt/neu'); await sleep(1500);
  note('b11-dom', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('h1,h2,h3')].map((h) => h.tagName + ': ' + h.textContent.trim().slice(0, 70)))));
  // Karte "Unterscheiden sich Gruppen" erreichen: Tab, bis Fokus auf dem Knopf liegt (Fokus je Schritt geprüft)
  let gefunden = false;
  for (let i = 0; i < 60 && !abbruch; i++) {
    await K('b11-tab' + i, 'Tab', { wait: 300, zeige: true });
    const z = await zustand();
    if (z.fokus && /Unterscheiden sich Gruppen/.test(z.fokus)) { gefunden = true; break; }
    if (z.fokus && z.fokus.startsWith('body')) { note('b11', 'Fokus in der Edge-Oberfläche, Abbruch der Suche'); break; }
  }
  if (!gefunden) return;
  await K('b11-1 Enter (Karte öffnen)', 'Enter', { wait: 2500 });
  note('b11-dom2', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('h1,h2,h3')].map((h) => h.tagName + ': ' + h.textContent.trim().slice(0, 70)))));
  note('b11-eingaben', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('main input, main select, main textarea')].filter((x) => x.type !== 'radio' && x.type !== 'checkbox').map((x) => ({ tag: x.tagName, type: x.type, id: x.id, aria: x.getAttribute('aria-label'), labels: [...(x.labels || [])].map((l) => l.textContent.trim()), lb: x.getAttribute('aria-labelledby'), title: x.title, ph: x.placeholder, sichtbar: x.offsetParent !== null })))));
  note('b11-radios', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('main input[type=radio]')].slice(0, 12).map((x) => ({ aria: x.getAttribute('aria-label'), labels: [...(x.labels || [])].map((l) => l.textContent.trim().slice(0, 50)), name: x.name })))));
  for (let i = 0; i < 6; i++) await K('b11-2.' + i, 'Tab', { wait: 700 });
  for (let i = 0; i < 6; i++) await K('b11-3.' + i, 'ArrowDown', { wait: 700 });
};

// ====================== Teil 2 (B6-B10) ======================
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

// B6 Kreuztabelle, mehrstufiger Kopf
PHASEN.b6 = async () => {
  await kreuzAufbau();
  note('b6-dom', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('main table.apa')].map((t) => ({ cap: t.querySelector('caption')?.textContent.trim(), kopfzeilen: t.querySelectorAll('thead tr').length, zeilen: t.querySelectorAll('tr').length, headersAttr: t.querySelectorAll('td[headers]').length })))));
  note('b6-dom1', await page.evaluate(() => document.querySelector('main table.apa').outerHTML.replace(/ style="[^"]*"/g, '').replace(/ class="[^"]*"/g, '').replace(/<!---->/g, '').slice(0, 2600)));
  await obenAnfang(); await nachVorn();
  await K('b6-Strg+Home', 'Control+Home', { wait: 800 });
  if (await tabelleMitT('b6-t1', /Tabelle/, 2)) {
    await insZelle('b6-t1', 'Kreuz Gruppe');
    await zellen('b6-t1', [...Rn(3, 'ArrowRight'), ['d1', 'ArrowDown'], ['d2', 'ArrowDown'], ['d3', 'ArrowDown'], ['l1', 'ArrowLeft'], ['l2', 'ArrowLeft'], ['u1', 'ArrowUp'], ['u2', 'ArrowUp']]);
  }
  if (await tabelleMitT('b6-z', /Zusammenfassung/, 8)) {
    await insZelle('b6-z', 'Zusammenfassung');
    await zellen('b6-z', [['d1', 'ArrowDown'], ['d2', 'ArrowDown'], ['d3', 'ArrowDown'], ...Rn(5, 'ArrowRight'), ['l1', 'ArrowLeft'], ['u1', 'ArrowUp'], ['u2', 'ArrowUp']]);
  }
};

// B7 Datentabelle (a, b): Tab-Weg zum Lesemodus-Knopf, Zellen im Lesemodus
PHASEN.b7 = async () => {
  await beispielAufbau();
  await hash('daten'); await sleep(1500);
  note('b7-dom', JSON.stringify(await page.evaluate(() => ({ tabelle: !!document.querySelector('main table.raster'), rolle: document.querySelector('main table.raster')?.getAttribute('role'), region: document.getElementById('daten-region')?.getAttribute('aria-label'), kopf: [...document.querySelectorAll('table.raster thead th')].slice(0, 4).map((x) => x.textContent.trim().replace(/\s+/g, ' ').slice(0, 60)) }))));
  await page.evaluate(() => { document.activeElement?.blur?.(); window.scrollTo(0, 0); const h = document.querySelector('h1'); h?.setAttribute('tabindex', '-1'); h?.focus(); });
  note('aufbau', 'Fokus per Skript auf die Seitenüberschrift h1 (Ausgangspunkt der Tab-Zählung)');
  let tabs = 0, gefunden = false;
  for (let i = 0; i < 25 && !abbruch; i++) {
    await K('b7a-Tab' + i, 'Tab', { wait: 350 }); tabs++;
    const z = await zustand();
    if (z.fokus && /Lesemodus/.test(z.fokus)) { gefunden = true; break; }
    if (z.fokus && z.fokus.startsWith('body')) { note('b7a', 'Fokus in der Edge-Oberfläche'); break; }
  }
  note('b7a-ergebnis', `Lesemodus-Knopf per Tab nach ${tabs} Tab-Stopps ab der Überschrift gefunden: ${gefunden}`);
  if (gefunden) {
    await C('b7a-NVDA+Tab', 'reportCurrentFocus', { wait: 700 });
    await K('b7a-Leertaste (Lesemodus an)', 'Space', { wait: 1500 });
    note('b7a-dom-nach', JSON.stringify(await page.evaluate(() => ({ tabellen: [...document.querySelectorAll('main table')].map((t) => (t.getAttribute('aria-label') || t.querySelector('caption')?.textContent || t.getAttribute('aria-labelledby') || '') + ' zeilen=' + t.querySelectorAll('tbody tr').length), pressed: [...document.querySelectorAll('button[aria-pressed]')].filter((x) => /Lesemodus/.test(x.textContent)).map((x) => x.getAttribute('aria-pressed')) }))));
  }
  await K('b7b-Strg+Home', 'Control+Home', { wait: 700 });
  if (await tabelleMitT('b7b', /Tabelle/, 4)) {
    await insZelle('b7b', null);
    await zellen('b7b', [...Rn(2, 'ArrowRight'), ['d1', 'ArrowDown'], ['d2', 'ArrowDown'], ['d3', 'ArrowDown'], ['l1', 'ArrowLeft'], ['u1', 'ArrowUp']]);
  }
};
PHASEN.b7n = async () => { // normale Datentabelle (nicht Lesemodus): Zellnavigation
  await beispielAufbau();
  await hash('daten'); await sleep(1500);
  await page.evaluate(() => { document.activeElement?.blur?.(); window.scrollTo(0, 0); });
  await nachVorn();
  await K('b7n-Strg+Home', 'Control+Home', { wait: 700 });
  if (await tabelleMitT('b7n', /Tabelle/, 4)) {
    await insZelle('b7n', null);
    await zellen('b7n', [...Rn(3, 'ArrowRight'), ['d1', 'ArrowDown'], ['d2', 'ArrowDown'], ['d3', 'ArrowDown'], ['l1', 'ArrowLeft'], ['u1', 'ArrowUp']]);
  }
};
// B7 (c): findet die Palette / die Kürzel-Liste den Lesemodus?
PHASEN.b7c = async () => {
  await beispielAufbau();
  await hash('daten'); await sleep(1500);
  await page.evaluate(() => { document.activeElement?.blur?.(); const h = document.querySelector('h1'); h?.setAttribute('tabindex', '-1'); h?.focus(); });
  await K('b7c-1 Strg+K', 'Control+KeyK', { wait: 1200 });
  await T('b7c-2 „Lesemodus“ tippen', 'Lesemodus', { wait: 1500 });
  note('b7c-3', 'Paletteneinträge: ' + (await page.evaluate(() => [...document.querySelectorAll('dialog[open] [role=option]')].map((x) => x.textContent.trim().replace(/\s+/g, ' ').slice(0, 80)).join(' | '))));
  await K('b7c-4 Pfeil runter', 'ArrowDown', { wait: 900 });
  await K('b7c-5 Esc', 'Escape', { wait: 900 });
  await K('b7c-5b Esc (zweites)', 'Escape', { wait: 900 });
  await K('b7c-6 Alt+T (Kürzel-Liste)', 'Alt+KeyT', { wait: 1200 });
  note('b7c-9', 'Kürzel-Liste enthält „Lesemodus“: ' + (await page.evaluate(() => document.querySelector('dialog[open]')?.textContent.includes('Lesemodus'))));
};
// B7 (d): Bearbeiten, Ansage „Zellname, Zeile N“, aria-invalid mit Grund
PHASEN.b7d = async () => {
  await beispielAufbau();
  await hash('daten'); await sleep(1500);
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /Daten eingeben/.test(x.getAttribute('aria-label') ?? '')); b?.focus(); });
  note('aufbau', 'Fokus per Skript auf den Knopf „Daten eingeben“; Auslösen per Tastatur (NVDA)');
  await C('b7d-0 NVDA+Tab', 'reportCurrentFocus', { wait: 700 });
  await K('b7d-1 Enter (Eingeben an)', 'Enter', { wait: 1500 });
  await K('b7d-2 Tab', 'Tab', { wait: 900 });
  await K('b7d-3 Tab', 'Tab', { wait: 900 });
  await K('b7d-4 Pfeil unten (nächste Zeile)', 'ArrowDown', { wait: 900 });
  for (let i = 0; i < 6 && !abbruch; i++) { const z = await zustand(); if (z.fokus && /lesen vor|lesen_vor|Lesetest vorher/i.test(z.fokus)) break; await K('b7d-5.' + i + ' Tab', 'Tab', { wait: 800 }); }
  await K('b7d-7 Strg+A', 'Control+KeyA', { wait: 400, zeige: false });
  await T('b7d-8 „abc“ tippen (ungültig für eine Zahl)', 'abc', { wait: 600 });
  await K('b7d-9 Enter', 'Enter', { wait: 1500 });
  note('b7d-10', JSON.stringify(await page.evaluate(() => { const a = document.activeElement; return { id: a?.id, invalid: a?.getAttribute('aria-invalid'), desc: a?.getAttribute('aria-describedby'), fehlertext: document.getElementById('z-fehler')?.textContent, ansage: window.__ansagen?.slice(-3) }; })));
  await C('b7d-11 NVDA+Tab (Fokus erneut melden)', 'reportCurrentFocus', { wait: 900 });
  await K('b7d-12 Tab', 'Tab', { wait: 900 });
};

PHASEN.b7e = async () => { // ungültige Eingabe, Zelle mit Tab verlassen
  await beispielAufbau();
  await hash('daten'); await sleep(1500);
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /Daten eingeben/.test(x.getAttribute('aria-label') ?? '')); b?.focus(); });
  note('aufbau', 'Fokus per Skript auf den Knopf „Daten eingeben“; Auslösen per Tastatur (NVDA)');
  await K('b7e-1 Enter (Eingeben an)', 'Enter', { wait: 1500 });
  for (let i = 0; i < 12 && !abbruch; i++) { const z = await zustand(); if (z.fokus && /Lesetest vorher/i.test(z.fokus)) break; await K('b7e-2.' + i + ' Tab', 'Tab', { wait: 600 }); }
  await K('b7e-3 Strg+A', 'Control+KeyA', { wait: 400, zeige: false });
  await T('b7e-4 „abc“ tippen', 'abc', { wait: 600 });
  await K('b7e-5 Tab (Zelle verlassen)', 'Tab', { wait: 1800 });
  note('b7e-6', JSON.stringify(await page.evaluate(() => { const a = document.activeElement; const f = document.getElementById('z-0-4'); return { aktiv: a?.id, aktivInvalid: a?.getAttribute('aria-invalid'), aktivDesc: a?.getAttribute('aria-describedby'), z04invalid: f?.getAttribute('aria-invalid'), z04value: f?.value, fehlertext: document.getElementById('z-fehler')?.textContent }; })));
  await C('b7e-7 NVDA+Tab', 'reportCurrentFocus', { wait: 1500 });
  await K('b7e-8 NVDA+Pfeil runter? nein: Tab weiter', 'Tab', { wait: 900 });
  await K('b7e-9 Umschalt+Tab zurück', 'Shift+Tab', { wait: 900 });
};
// B8 Lernlabor-Regler und Baumrechner
PHASEN.b8 = async () => {
  await gehe('verstehen/lernlabor/bayes'); await sleep(1500);
  await page.evaluate(() => { document.getElementById('ll-bv-n')?.focus(); });
  note('aufbau', 'Fokus per Skript auf Regler #ll-bv-n (n, Zahl der Versuche) im Lernlabor-Reiter „Bayes mit Vorwissen“');
  note('b8-dom', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('.ll-eingaben input[type=range]')].map((x) => x.id + ' vt=' + x.getAttribute('aria-valuetext') + ' value=' + x.value))));
  await C('b8-1 NVDA+Tab', 'reportCurrentFocus', { wait: 900 });
  await page.evaluate(() => { window.__ansagen = []; });
  await K('b8-2 Pfeil rechts', 'ArrowRight', { wait: 2500 });
  await K('b8-3 Pfeil rechts', 'ArrowRight', { wait: 2500 });
  await K('b8-4 Bild auf', 'PageUp', { wait: 2500 });
  await K('b8-5 Ende', 'End', { wait: 2500 });
  await K('b8-6 Pos1', 'Home', { wait: 2500 });
  note('b8-ansagen-DOM', JSON.stringify(await page.evaluate(() => window.__ansagen)));
  await K('b8-7 Tab (nächster Regler k)', 'Tab', { wait: 900 });
};
PHASEN.b8baum = async () => {
  await gehe('verstehen/lernlabor/baum'); await sleep(1500);
  await page.evaluate(() => { document.getElementById('ll-b-pa')?.focus(); });
  note('aufbau', 'Fokus per Skript auf Eingabefeld P(A) im Baumrechner');
  note('b8b-dom', JSON.stringify(await page.evaluate(() => ({ live: [...document.querySelectorAll('[aria-live]')].map((x) => x.className + ':' + x.getAttribute('aria-live')), vorher: document.querySelector('.ll-ergebnis')?.textContent.trim().slice(0, 200) }))));
  await C('b8b-1 NVDA+Tab', 'reportCurrentFocus', { wait: 900 });
  await K('b8b-2 Strg+A', 'Control+KeyA', { wait: 300, zeige: false });
  await T('b8b-3 „30“ tippen', '30', { wait: 2500 });
  await K('b8b-4 Tab (nächstes Feld)', 'Tab', { wait: 2000 });
  note('b8b-5', 'Ergebnis-Region jetzt: ' + (await page.evaluate(() => document.querySelector('.ll-ergebnis')?.textContent.trim().replace(/\s+/g, ' ').slice(0, 300))));
};

// B9 Hilfe: Zurück zur Trefferliste
PHASEN.b9 = async () => {
  await gehe('hilfe'); await sleep(2500);
  await page.evaluate(() => document.getElementById('hi-suche')?.focus());
  note('aufbau', 'Fokus per Skript auf das Suchfeld #hi-suche');
  await C('b9-0 NVDA+Tab', 'reportCurrentFocus', { wait: 900 });
  await T('b9-1 „Mittelwert“ tippen', 'Mittelwert', { wait: 1800 });
  note('b9-dom', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('#hi-treffer li')].slice(0, 5).map((x) => ({ id: x.id, laenge: x.textContent.trim().length, text: x.textContent.trim().replace(/\s+/g, ' ').slice(0, 160), describedby: x.getAttribute('aria-describedby'), hidden: !!x.querySelector('[aria-hidden]') })))));
  await K('b9-2 Pfeil runter (Treffer 2)', 'ArrowDown', { wait: 1200 });
  await K('b9-3 Pfeil runter (Treffer 3)', 'ArrowDown', { wait: 1200 });
  note('b9-gewaehlt', 'Aktiver Treffer: ' + await page.evaluate(() => document.querySelector('#hi-treffer li.aktiv .t-titel')?.textContent.trim()) + ' / activedescendant=' + await page.evaluate(() => document.getElementById('hi-suche').getAttribute('aria-activedescendant')));
  await K('b9-4 Enter (Artikel öffnen)', 'Enter', { wait: 2500 });
  // Weg A: vom Seitenanfang mit B (nur gezählt, begrenzt auf 8 Schritte); Weg B: erst mit H zur Artikelüberschrift, dann B
  let da = false;
  await K('b9-5 Strg+Home', 'Control+Home', { wait: 700 });
  for (let i = 0; i < 12 && !abbruch; i++) { const g = await K('b9-5h.' + i + ' H', 'KeyH', { wait: 800 }); if (g && /ICC-Modelle/.test(g.join(' '))) break; }
  for (let i = 0; i < 4 && !abbruch; i++) { const g = await K('b9-6.' + i + ' Umschalt+B (rückwärts ab der Artikelüberschrift)', 'Shift+KeyB', { wait: 800 }); if (g && /Trefferliste/.test(g.join(' '))) { da = true; break; } }
  note('b9-7', 'Knopf „Zurück zur Trefferliste“ per B gefunden: ' + da);
  if (da) {
    await K('b9-8 Enter', 'Enter', { wait: 2500 });
    note('b9-9', JSON.stringify(await page.evaluate(() => { const a = document.activeElement; const id = a?.getAttribute('aria-activedescendant'); return { hash: location.hash, fokus: a?.id, wert: a?.value, activedescendant: id, aktiverTrefferText: document.getElementById(id ?? '')?.querySelector('.t-titel')?.textContent.trim(), aktivIst: document.querySelector('#hi-treffer li.aktiv .t-titel')?.textContent.trim() }; })));
    await C('b9-10 NVDA+Tab', 'reportCurrentFocus', { wait: 1200 });
    await K('b9-11 Pfeil runter', 'ArrowDown', { wait: 1200 });
  }
};

// B10 Statistische Zeichen
PHASEN.b10 = async () => {
  await beispielAufbau();
  await kurzAn();
  await gehe('blatt/neu');
  await page.getByText(/Unterscheiden sich Gruppen/).first().click();
  await page.locator('input[value="lesen_vor"]').first().click({ force: true }); await sleep(800);
  await page.locator('input[value="klasse"]').first().click({ force: true });
  await page.locator('main table.apa').first().waitFor({ timeout: 90000 }); await sleep(3000);
  await page.evaluate(() => document.querySelectorAll('main details').forEach((d) => (d.open = true))); note('aufbau', 'alle details-Bereiche geöffnet (Playwright)');
  note('b10-dom', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('main table.apa')].map((t) => t.querySelector('caption')?.textContent.trim() + ': ' + [...t.querySelectorAll('thead th')].map((x) => x.textContent.trim()).join(' | ')))));
  await obenAnfang();
  await K('b10-Strg+Home', 'Control+Home', { wait: 800 });
  if (await tabelleMitT('b10-desk', /Deskriptive/, 3)) { await insZelle('b10-desk', 'Deskriptive'); await zellen('b10-desk', Rn(9, 'ArrowRight')); }
  if (await tabelleMitT('b10-welch', /Welch/, 3)) { await insZelle('b10-welch', 'Welch'); await zellen('b10-welch', [...Rn(3, 'ArrowRight'), ['d1', 'ArrowDown'], ['d2', 'ArrowDown']]); }
  if (await tabelleMitT('b10-anova', /ANOVA/, 3)) { await insZelle('b10-anova', 'ANOVA'); await zellen('b10-anova', Rn(5, 'ArrowRight')); }
  if (await tabelleMitT('b10-trend', /Trend/, 6)) { await insZelle('b10-trend', 'Trend'); await zellen('b10-trend', Rn(4, 'ArrowRight')); }
  await K('b10-Strg+Home 2', 'Control+Home', { wait: 800 });
  for (let i = 0; i < 4 && !abbruch; i++) { const g = await K('b10-G' + i, 'KeyG', { wait: 1000 }); if (g && /diagramm|Grafik/i.test(g.join(' '))) break; }
  await fokusAbsatz('η²', 'η²');
  await C('b10-eta NVDA+Tab', 'reportCurrentFocus', { wait: 1500 });
  await K('b10-eta Pfeil runter', 'ArrowDown', { wait: 1000 });
};
PHASEN.b10b = async () => {
  await beispielAufbau();
  await kurzAn();
  await regAufbau();
  note('b10b-dom', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('main table.apa')].map((t) => t.querySelector('caption')?.textContent.trim() + ': ' + [...t.querySelectorAll('thead th')].map((x) => x.textContent.trim()).join(' | ')).slice(0, 4))));
  await obenAnfang();
  await K('b10b-Strg+Home', 'Control+Home', { wait: 800 });
  if (await tabelleMitT('b10b-mod', /Modellzusammenfassung/, 3)) { await insZelle('b10b-mod', 'Modellzusammenfassung'); await zellen('b10b-mod', Rn(5, 'ArrowRight')); }
  if (await tabelleMitT('b10b-koef', /Koeffizienten/, 3)) { await insZelle('b10b-koef', 'Koeffizienten'); await zellen('b10b-koef', Rn(6, 'ArrowRight')); }
  await fokusAbsatz('R² =', 'R²');
  await C('b10b-R2 NVDA+Tab', 'reportCurrentFocus', { wait: 1500 });
  await K('b10b-R2 Pfeil runter', 'ArrowDown', { wait: 1000 });
};
PHASEN.b10c = async () => {
  await kreuzAufbau();
  note('b10c-dom', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('main table.apa')].map((t) => t.querySelector('caption')?.textContent.trim() + ': ' + [...t.querySelectorAll('th')].map((x) => x.textContent.trim()).join(' | ')).slice(0, 7))));
  await obenAnfang();
  await K('b10c-Strg+Home', 'Control+Home', { wait: 800 });
  if (await tabelleMitT('b10c', /Chi/, 5)) { await insZelle('b10c', 'Chi-Quadrat'); await zellen('b10c', [...Rn(2, 'ArrowRight'), ['d1', 'ArrowDown'], ['r3', 'ArrowRight'], ['r4', 'ArrowRight']]); }
  await fokusAbsatz('χ²|Cramér|V =', 'χ²/Cramér V');
  await C('b10c-Satz NVDA+Tab', 'reportCurrentFocus', { wait: 1500 });
};

PHASEN.b10d = async () => { // χ², G², p in der Tabelle „Chi-Quadrat und Verwandte“
  await kreuzAufbau();
  await obenAnfang();
  await K('b10d-Strg+Home', 'Control+Home', { wait: 800 });
  if (await tabelleMitT('b10d', /Chi-Quadrat und Verwandte/, 7)) { await insZelle('b10d', 'Verwandte'); await zellen('b10d', [...Rn(3, 'ArrowRight'), ['d1', 'ArrowDown'], ['l1', 'ArrowLeft'], ['d2', 'ArrowDown'], ['r4', 'ArrowRight'], ['r5', 'ArrowRight'], ['r6', 'ArrowRight']]); }
};
await mitNvda(PHASEN[phase], { nurPlaywright: phase === 'b3ohne' });
