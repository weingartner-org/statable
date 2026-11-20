// NVDA-Messung Stufe 2, Prüfplan B: exportierte Word-Dateien in Word öffnen (Kodebuch, Großdruck-Papierbogen).
// Aufruf: NVDA_OUT=<datei.jsonl> node e2e/probe/nvda-erheben2-word.mjs <kodebuch|gross> <pfad-zur-docx>
// Regeln wie in nvda-erheben1-lib.mjs: nur das eigene NVDA (Guidepup), vor jeder Taste prüfen, dass WINWORD vorne liegt; keine Quelldatei der App geändert.
import { nvda } from '@guidepup/guidepup';
import { spawn, execSync } from 'node:child_process';
import { writeFileSync, appendFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const was = process.argv[2] ?? 'kodebuch';
const datei = process.argv[3];
const OUT = process.env.NVDA_OUT ?? join(tmpdir(), `nvda-erheben2-word-${was}.jsonl`);
writeFileSync(OUT, '');
const rec = (o) => { appendFileSync(OUT, JSON.stringify(o) + '\n'); console.log(JSON.stringify(o)); };
let abbruch = false;

const psDir = mkdtempSync(join(tmpdir(), 'fgw-'));
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
 elseif ($l -eq 'front') { $ps = Get-Process WINWORD -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 }; foreach ($q in $ps) { [W]::keybd_event(0x12,0,0,[UIntPtr]::Zero); [W]::keybd_event(0x7C,0,0,[UIntPtr]::Zero); [W]::keybd_event(0x7C,0,2,[UIntPtr]::Zero); [W]::keybd_event(0x12,0,2,[UIntPtr]::Zero); [void][W]::ShowWindow($q.MainWindowHandle, 9); [void][W]::SetForegroundWindow($q.MainWindowHandle) }; [Console]::Out.WriteLine("FRONT:" + @($ps).Count) }
 elseif ($l -eq 'titel') { $ps = Get-Process WINWORD -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 }; [Console]::Out.WriteLine("TITEL:" + (@($ps | ForEach-Object { $_.MainWindowTitle }) -join ' | ')) } }
`);
const ps = spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', psFile], { stdio: ['pipe', 'pipe', 'ignore'] });
let psBuf = ''; const psWait = [];
ps.stdout.on('data', (d) => { psBuf += d.toString(); let i; while ((i = psBuf.indexOf('\n')) >= 0) { const line = psBuf.slice(0, i).trim(); psBuf = psBuf.slice(i + 1); const w = psWait.shift(); if (w) w(line); } });
const psAsk = (cmd) => new Promise((res) => { psWait.push(res); ps.stdin.write(cmd + '\n'); });

async function nachVorn() {
  for (let i = 0; i < 4; i++) {
    const v = await psAsk('fg');
    if (v === 'FG:WINWORD') return true;
    const fr = await psAsk('front'); console.log('front-> (vorher', v, ')', fr, 'fg->', await psAsk('fg')); await sleep(600);
  }
  return (await psAsk('fg')) === 'FG:WINWORD';
}
async function spoken() { const l = await nvda.spokenPhraseLog(); await nvda.clearSpokenPhraseLog(); return l; }
async function K(schritt, taste, wait = 1100) {
  if (abbruch) return null;
  if (!(await nachVorn())) { rec({ schritt, taste, fehler: 'WINWORD nicht im Vordergrund, Taste NICHT gesendet' }); abbruch = true; return null; }
  await spoken(); await nvda.press(taste); await sleep(wait);
  const gesagt = await spoken(); rec({ schritt, taste, gesagt }); return gesagt;
}
async function C(schritt, cmd, wait = 1100) {
  if (abbruch) return null;
  if (!(await nachVorn())) { rec({ schritt, taste: 'NVDA:' + cmd, fehler: 'WINWORD nicht im Vordergrund' }); abbruch = true; return null; }
  await spoken(); await nvda.perform(nvda.keyboardCommands[cmd]); await sleep(wait);
  const gesagt = await spoken(); rec({ schritt, taste: 'NVDA:' + cmd, gesagt }); return gesagt;
}

if (/WINWORD/i.test(execSync('tasklist', { encoding: 'utf8' }))) { console.log('Word läuft schon (eigene Dokumente des Nutzers?): Abbruch, nichts angefasst.'); ps.kill(); process.exit(2); }
const vorher = await psAsk('fg');
rec({ schritt: 'start', notiz: `Vordergrund vor Start: ${vorher}; Datei ${datei}; Messung ${was}` });
let word;
try {
  await nvda.start(); await sleep(2500);
  word = spawn('C:\\Program Files\\Microsoft Office\\root\\Office16\\WINWORD.EXE', [datei], { stdio: 'ignore', detached: false });
  let t = '';
  for (let i = 0; i < 40; i++) { await sleep(1000); t = await psAsk('titel'); if (/\.docx|Word/.test(t) && t !== 'TITEL:') break; }
  rec({ schritt: 'Word gestartet', notiz: t });
  await sleep(3000);
  rec({ schritt: 'Nach dem Start', gesagt: await spoken() });
  await nachVorn();
  await C('Titel (NVDA+T)', 'reportTitle');
  await K('Strg+Pos1', 'Control+Home');
  await C('Aktuelle Zeile lesen (NVDA+Pfeil oben)', 'readLine');
  await C('Formatierung am Anfang (NVDA+F), auch Sprache', 'reportTextFormatting');
  await C('NVDA+Leertaste (Lesemodus in Word)', 'toggleBetweenBrowseAndFocusMode');
  await K('H: nächste Überschrift', 'KeyH');
  await K('H: nächste Überschrift', 'KeyH');
  await K('Umschalt+H: vorige Überschrift', 'Shift+KeyH');
  await K('Strg+Pos1', 'Control+Home');
  await C('Elementliste (NVDA+F7)', 'browseModeElementsList', 3500);
  await C('Fensterinhalt lesen (Elementliste?)', 'readActiveWindow', 2500);
  await K('Tab in der Elementliste', 'Tab');
  await K('Pfeil unten', 'ArrowDown');
  await K('Esc: Elementliste schließen', 'Escape', 1500);
  await C('NVDA+Leertaste (zurück)', 'toggleBetweenBrowseAndFocusMode');
  await K('Strg+Pos1', 'Control+Home');
  if (was === 'kodebuch') {
    for (let i = 0; i < 3; i++) await K('Pfeil unten (zur Tabelle)', 'ArrowDown');
    for (let i = 0; i < 6; i++) await K('Strg+Alt+Pfeil rechts (Kopfzeile, nächste Zelle)', 'Control+Alt+ArrowRight');
    await K('Strg+Alt+Pfeil unten (Zeile 2)', 'Control+Alt+ArrowDown');
    await K('Strg+Alt+Pfeil links', 'Control+Alt+ArrowLeft');
    await K('Strg+Alt+Pfeil links', 'Control+Alt+ArrowLeft');
    await K('Strg+Alt+Pfeil links', 'Control+Alt+ArrowLeft');
    await K('Strg+Alt+Pfeil links', 'Control+Alt+ArrowLeft');
    await K('Strg+Alt+Pfeil links', 'Control+Alt+ArrowLeft');
    await K('Strg+Alt+Pfeil links (erste Spalte)', 'Control+Alt+ArrowLeft');
    await K('Strg+Alt+Pfeil unten (Zeile 3)', 'Control+Alt+ArrowDown');
    await K('Strg+Alt+Pfeil rechts', 'Control+Alt+ArrowRight');
    await K('Strg+Alt+Pfeil rechts (Spalte Werte)', 'Control+Alt+ArrowRight');
    await K('Strg+Alt+Pfeil rechts', 'Control+Alt+ArrowRight');
    await C('Aktueller Fokus (NVDA+Tab)', 'reportCurrentFocus');
    await C('Formatierung in der Zelle (NVDA+F)', 'reportTextFormatting');
  } else {
    for (let i = 0; i < 16; i++) await K('Pfeil unten (Absatz für Absatz lesen)', 'ArrowDown');
    await C('Formatierung (NVDA+F)', 'reportTextFormatting');
  }
  await C('Alles lesen (NVDA+Pfeil unten), erste Sekunden', 'sayAll', 4000);
  await K('Pause/Stopp', 'Control');
} catch (e) { rec({ fehler: String(e.stack ?? e).slice(0, 600) }); }
finally {
  try { await nvda.stop(); } catch (e) { rec({ fehler_stop: String(e) }); }
  try { if (word?.pid) execSync(`taskkill /PID ${word.pid} /T /F`, { stdio: 'ignore' }); } catch {}
  ps.kill();
}
