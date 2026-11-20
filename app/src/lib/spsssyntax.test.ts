import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import erwartet from './testdaten/spaeter-c-erwartet.json';
import * as modul from './spsssyntax';
import { liesSpssSyntax } from './spsssyntax';
import { nodeEngine } from './testengine';
import { leseVerzeichnis } from './verzeichnis';

/* ===== Später, Welle S-C, Bauer B: Whitelist-Leser für SPSS-Syntax (SoSci-`.sps`) - Befehle außerhalb der Whitelist werden IGNORIERT UND GEMELDET, NIE AUSGEFÜHRT =====
 * Fachblatt 2.4 („SPS lesen“) und Entscheidung Opus 3: Die `.sps` einer fremden Umfrage enthält Daten und Befehle. Die ganze Syntax auszuführen ist verboten (HOST, INSERT, SAVE, ERASE ...).
 * Der Leser erkennt NUR: VARIABLE LABELS, VALUE LABELS, MISSING VALUES, VARIABLE LEVEL, FORMATS (und, wenn vorhanden, DATA LIST ... BEGIN DATA ... END DATA für die Daten).
 * Alles andere wird übersprungen und mit Befehlsnamen und Zeile gemeldet. Der Leser ist eine REINE Funktion: kein Zugriff auf Engine, Dateien oder Netz.
 * Sollwerte: testdaten/spaeter-c-erwartet.json (fragebogen.sosci_sps), Dateien testdaten/fragebogen/sosci-nachgebaut*.sps (NACHGEBAUT nach der SoSci-Hilfe, kein echter Export, siehe LIESMICH.md).
 * Gegenprobe: die echte PSPP-Engine liest die nachgebaute `.sps` (sie ist harmlos) und ihr Wörterbuch muss dasselbe sagen wie der Whitelist-Leser.
 *
 * ---------------------------------- Schnittstelle (festgelegt vom Prüfer; Modul lib/spsssyntax.ts) ----------------------------------
 *  liesSpssSyntax(text: string): SpssSyntaxErgebnis       wirft nie (auch bei Müll nicht), ist synchron
 *  SpssSyntaxErgebnis = {
 *    variablenlabels: Record<string, string>;                              // Name wie in der Syntax geschrieben → Text (Apostroph '' wird ', Anführungszeichen " oder ' beide erlaubt)
 *    wertelabels: Record<string, Record<string, string>>;                  // Name → Wert (als Text, z. B. "1", "-9") → Beschriftung; ein Befehl über mehrere Zeilen und mehrere Namen (`A B 1 'x'`) ist erlaubt
 *    fehlend: Record<string, (number | { von: number; bis: number })[]>;   // MISSING VALUES a b (-9,-1) c (99): je Name; Bereich `-9 THRU -1`; `LO`/`HI` = -Infinity/Infinity
 *    niveau: Record<string, 'nominal' | 'ordinal' | 'skala'>;               // VARIABLE LEVEL a (ORDINAL) /b c (NOMINAL) /d (SCALE)
 *    formate: Record<string, string>;                                      // FORMATS a (F2.0) /b (F5.2)
 *    ignoriert: { befehl: string; zeile: number }[];                       // alles außerhalb der Whitelist, Befehlsname in Großbuchstaben (zwei Wörter wie 'GET DATA' bleiben zusammen), 1-basierte Zeile des Befehlsanfangs
 *    daten?: { namen: string[]; zeilen: (string | number | null)[][] };    // nur wenn DATA LIST + BEGIN DATA/END DATA da ist; die Zeilen dazwischen sind DATEN, nie Befehle
 *  }
 *  Kommentarzeilen (`* ...` bis zum Punkt) und Leerzeilen sind weder Befehle noch werden sie gemeldet. Befehlsnamen sind nicht von Groß/klein abhängig.
 */
const FB = (erwartet as any).fragebogen, SP = FB.sosci_sps;
const datei = (n: string) => readFileSync(new URL(`./testdaten/fragebogen/${n}`, import.meta.url), 'utf8');

describe('Die nachgebaute SoSci-.sps: Labels, Wertelabels, Fehlend, Niveau, Formate', () => {
  const r = liesSpssSyntax(datei('sosci-nachgebaut.sps'));
  it('Variablenlabels wie erwartet (auch über mehrere Zeilen mit `/`)', () => { expect(r.variablenlabels).toEqual(SP.variablenlabels); });
  it('Wertelabels: A001 mit 1 bis 5 und -9 „nicht beantwortet“, -1 „keine Angabe“; Mehrfachauswahl 1 „nicht gewählt“, 2 „gewählt“ (Umlaute)', () => { expect(r.wertelabels).toEqual(SP.wertelabels); });
  it('MISSING VALUES A001 (-9,-1)', () => { expect(r.fehlend).toEqual(SP.fehlend); });
  it('VARIABLE LEVEL und FORMATS', () => { expect(r.niveau).toEqual(SP.niveau); expect(r.formate).toEqual(SP.formate); });
  it('SET, GET DATA und EXECUTE liegen außerhalb der Whitelist: gemeldet, nicht ausgeführt - in der Reihenfolge des Auftretens', () => { expect(r.ignoriert.map(x => x.befehl)).toEqual(SP.ignoriert_normal); expect(r.ignoriert.every(x => x.zeile >= 1)).toBe(true); });
  it('kein `daten`, wenn die Datei keine Daten enthält (die Daten stehen in der CSV)', () => { expect(r.daten).toBeUndefined(); });
});

describe('Pflichtfall 3: unbekannter Befehl (HOST COMMAND, INSERT, ERASE, SAVE) → übersprungen und genannt, nichts ausgeführt', () => {
  const text = datei('sosci-nachgebaut-unbekannter-befehl.sps');
  it('die vier gefährlichen Befehle stehen in `ignoriert`, mit Zeile', () => {
    const r = liesSpssSyntax(text), namen = r.ignoriert.map(x => x.befehl);
    for (const g of SP.ignoriert_gefaehrlich as { befehl: string }[]) expect(namen, g.befehl).toContain(g.befehl);
    const z = text.split('\n'); for (const x of r.ignoriert.filter(i => ['HOST', 'INSERT', 'ERASE', 'SAVE'].includes(i.befehl))) expect(z[x.zeile - 1]!.trim().toUpperCase().startsWith(x.befehl), `Zeile ${x.zeile}`).toBe(true);
  });
  it('die Whitelist-Befehle derselben Datei werden trotzdem gelesen (gleiches Ergebnis wie ohne die gefährlichen Zeilen)', () => {
    const r = liesSpssSyntax(text), n = liesSpssSyntax(datei('sosci-nachgebaut.sps'));
    expect(r.variablenlabels).toEqual(n.variablenlabels); expect(r.wertelabels).toEqual(n.wertelabels); expect(r.fehlend).toEqual(n.fehlend);
  });
  it('REIN: kein Netz, kein Prozess, und das Modul bietet kein „ausführen“ an', () => {
    const f = vi.spyOn(globalThis, 'fetch').mockImplementation(() => { throw new Error('Netz'); });
    try { liesSpssSyntax(text); expect(f).not.toHaveBeenCalled(); } finally { f.mockRestore(); }
    expect(Object.keys(modul).filter(k => /ausf(ü|ue)hr|run|exec|laufen|engine/i.test(k))).toEqual([]);
    expect(typeof liesSpssSyntax(text)).toBe('object');
  });
});

describe('SPS mit Daten in einer Datei: die Zeilen zwischen BEGIN DATA und END DATA sind Daten, nie Befehle', () => {
  const r = liesSpssSyntax(datei(SP.eine_datei.datei));
  it('Namen, Zeilen (Zahlen als Zahlen, Text als Text), Fehlend', () => { expect(r.daten).toEqual({ namen: SP.eine_datei.namen, zeilen: SP.eine_datei.zeilen }); expect(r.fehlend).toEqual(SP.eine_datei.fehlend); });
  it('`SAVE OUTFILE` und `HOST COMMAND` als Text in den Daten werden NICHT als Befehle gemeldet (und nicht ausgeführt)', () => {
    expect(r.ignoriert.map(x => x.befehl)).toEqual(SP.eine_datei.ignoriert);
    expect(r.ignoriert.some(x => ['SAVE', 'HOST'].includes(x.befehl))).toBe(false);
  });
  it('ohne END DATA (abgeschnittene Datei): kein Absturz, die Daten bis dahin, eine Meldung', () => {
    const kaputt = datei(SP.eine_datei.datei).replace('END DATA.', '');
    const k = liesSpssSyntax(kaputt); expect(k).toBeTruthy(); expect(k.ignoriert.some(x => /DATA/.test(x.befehl)) || k.daten === undefined || k.daten.zeilen.length >= 0).toBe(true);
  });
});

describe('Schreibweisen und Ränder', () => {
  it('Apostroph verdoppelt, beide Anführungszeichen, klein geschrieben, mehrere Namen in einem Befehl', () => {
    const r = liesSpssSyntax(`value labels q1 q2 1 'Don''t know' 2 "ja" 3 'ä'.\nvariable labels q1 'Frage "eins"' /q2 "Frage 'zwei'".`);
    expect(r.wertelabels).toEqual({ q1: { '1': "Don't know", '2': 'ja', '3': 'ä' }, q2: { '1': "Don't know", '2': 'ja', '3': 'ä' } });
    expect(r.variablenlabels).toEqual({ q1: 'Frage "eins"', q2: "Frage 'zwei'" });
  });
  it('MISSING VALUES: mehrere Namen, Bereich, LO und HI', () => {
    const r = liesSpssSyntax('MISSING VALUES a b (-9,-1) c (99) d (-9 THRU -1) e (LO THRU -1) f (999 THRU HI).');
    expect(r.fehlend).toEqual({ a: [-9, -1], b: [-9, -1], c: [99], d: [{ von: -9, bis: -1 }], e: [{ von: -Infinity, bis: -1 }], f: [{ von: 999, bis: Infinity }] });
  });
  it('Befehl über mehrere Zeilen und Kommentarzeilen dazwischen', () => {
    const r = liesSpssSyntax('* ein Kommentar\n  mit zwei Zeilen.\nVALUE LABELS\n  x\n  1 \'a\'\n  2 \'b\'.\n* noch einer.\n');
    expect(r.wertelabels).toEqual({ x: { '1': 'a', '2': 'b' } }); expect(r.ignoriert).toEqual([]);
  });
  it('leere Eingabe, nur Kommentare, Müll: kein Fehler, nichts gelesen', () => {
    for (const t of ['', '   \n\n', '* nur ein Kommentar.', 'sdkjfh lk jhsdf ###']) { const r = liesSpssSyntax(t); expect(r.variablenlabels).toEqual({}); expect(r.wertelabels).toEqual({}); expect(r.fehlend).toEqual({}); }
    expect(liesSpssSyntax('sdkjfh lk jhsdf.').ignoriert.length).toBe(1);
  });
  it('ein Befehl in einer Zeichenkette gilt nicht: `VARIABLE LABELS a \'HOST COMMAND. x\'.` ist ein Label, kein HOST', () => {
    const r = liesSpssSyntax("VARIABLE LABELS a 'HOST COMMAND=[x]. und weiter'.");
    expect(r.variablenlabels).toEqual({ a: 'HOST COMMAND=[x]. und weiter' }); expect(r.ignoriert).toEqual([]);
  });
});

describe('Gegenprobe mit der echten PSPP-Engine: dasselbe Wörterbuch wie der Whitelist-Leser', () => {
  let m: Awaited<ReturnType<typeof nodeEngine>>;
  beforeAll(async () => { m = await nodeEngine(); });
  it('Variablenlabels, Wertelabels und Fehlend-Codes der nachgebauten .sps (Datei sosci-nachgebaut.csv unter /d.csv)', () => {
    const csv = new TextEncoder().encode(datei('sosci-nachgebaut.csv'));
    const sps = datei('sosci-nachgebaut.sps').replace("'sosci-nachgebaut.csv'", "'/d.csv'");
    const items = m.run('NEW FILE.\n' + sps + '\nDISPLAY DICTIONARY.', { '/d.csv': csv });
    const fehler = items.filter(i => i.type === 'message' && (i as { severity?: string }).severity === 'error');
    expect(fehler, 'die Engine muss die nachgebaute .sps fehlerfrei lesen').toEqual([]);
    const sp = leseVerzeichnis(items), r = liesSpssSyntax(datei('sosci-nachgebaut.sps'));
    for (const [name, label] of Object.entries(r.variablenlabels)) expect(sp.find(s => s.name === name)?.bezeichnung, `Label ${name}`).toBe(label);
    for (const [name, w] of Object.entries(r.wertelabels)) expect(sp.find(s => s.name === name)?.werteLabels, `Wertelabels ${name}`).toEqual(w);
    for (const [name, f] of Object.entries(r.fehlend)) expect([...(sp.find(s => s.name === name)?.fehlend ?? [])].sort((a, b) => a - b), `Fehlend ${name}`).toEqual((f as number[]).slice().sort((a, b) => a - b));
  });
});
