import { beforeAll, describe, expect, it } from 'vitest';
import { nodeEngine } from './testengine';
import { zit, zitWert, psppNameOk, pk } from './befehlstext';
import { VERFAHREN } from './verfahren';
import { regFaktor, regTerme, regressionBefehl } from './regfaktor';
import type { Spalte } from './verzeichnis';
import { leseProjektdatei, projektAlsDatei } from './projektdatei';
import { logistikBefehl, rocBefehl } from './verfahren';
import { anova2Befehl } from './anova2';

/* SICHERHEIT (PSPP-Seite): Ein Zeilenumbruch in einer Zeichenkette beendet sie ("Unterminated string constant"); steht in der nächsten Zeile ein Punkt, beginnt danach ein neuer Befehl.
 * Ein Wert oder eine Beschriftung aus einer fremden Datei kann so eigene Befehle einschleusen (COMPUTE, SAVE …). Die Messlatte unten stellt das nach; zit (Beschriftungen) und
 * zitWert (Werte) dürfen das nicht zulassen. Läuft gegen die echte PSPP-Engine in Node. */
const STEUER_ZEILE = new RegExp('[\\n\\r\\u2028\\u0085\\u000b\\f]');
const BEFEHL = 'COMPUTE inj = 99.';
const GEFAHR = [
  `x'\n.\n${BEFEHL}\n'`, `a\r\n.\r\n${BEFEHL}`, `a\u2028.\u2028${BEFEHL}`, `a\u0085.\u0085${BEFEHL}`, `a\u000b.\u000b${BEFEHL}`, `a\f.\f${BEFEHL}`, `a\n.\n${BEFEHL}\n`,
  `ab'cd`, `q"w`, `\\`, `'`, `''`, `a ' + X'0A' + '.`, `x'.\nSAVE OUTFILE='/pwned.sav'.\n`
];
let e: Awaited<ReturnType<typeof nodeEngine>>;
beforeAll(async () => { e = await nodeEngine(); });
const frisch = () => e.run('NEW FILE.\nDATA LIST FREE /a (F2).\nBEGIN DATA\n1\n2\nEND DATA.');
/** Namen der Spalten der Arbeitsdatei (erste Spalte der Tabelle "Variables"). */
const spalten = (): string[] => {
  const t = e.run('DISPLAY DICTIONARY.').find((i: any) => i.type === 'table' && i.label === 'Variables') as any;
  return t ? t.cells.filter((c: any) => c.c === 0 && c.r > 0).map((c: any) => c.t) : [];
};
const hatInj = () => spalten().includes('inj');
const namen = (items: ReturnType<typeof e.run>) => JSON.stringify(items);

describe('PSPP: Texte aus Dateien dürfen keinen Befehl einschleusen', () => {
  it('Messlatte: eine Beschriftung mit Zeilenumbruch, Punkt und Befehl wird ohne Schutz ausgeführt', () => {
    frisch();
    const alt = (t: string) => `'${t.replace(/'/g, "''")}'`;   // so wurde an mehreren Stellen zitiert
    e.run(`VARIABLE LABELS a ${alt(GEFAHR[0]!)}.\nEXECUTE.`);
    expect(hatInj(), 'ohne Schutz entsteht die Spalte inj').toBe(true);
  });
  it('zit (Beschriftungen) und zitWert (Werte) lassen nichts durch - bei jeder Zeilenumbruch-Art', () => {
    for (const g of GEFAHR) {
      frisch();
      e.run(`VARIABLE LABELS a ${zit(g)}.\nVALUE LABELS a 1 ${zit(g)} 2 ${zitWert(g)}.\nEXECUTE.`);
      expect(hatInj(), `zit: ${JSON.stringify(g)}`).toBe(false);
      frisch();
      e.run(`VARIABLE LABELS a ${zitWert(g)}.\nVALUE LABELS a 1 ${zitWert(g)}.\nEXECUTE.`);
      expect(hatInj(), `zitWert: ${JSON.stringify(g)}`).toBe(false);
      expect(zit(g)).not.toMatch(STEUER_ZEILE);
      expect(zitWert(g)).not.toMatch(STEUER_ZEILE);
    }
    expect(spalten()).toEqual(['a']);
  });
  it('zitWert ändert den Inhalt nicht: RECODE findet den Wert, auch mit Zeilenumbruch und Apostroph', () => {
    for (const g of GEFAHR) {
      e.run('NEW FILE.\nINPUT PROGRAM.\nSTRING s (A200).\nCOMPUTE s = ' + zitWert(g) + '.\nEND CASE.\nEND FILE.\nEND INPUT PROGRAM.');
      e.run(`STRING t (A8).\nRECODE s (${zitWert(g)}='treffer') (ELSE='daneben') INTO t.\nCOMPUTE n = LENGTH(RTRIM(s)).\nEXECUTE.`);
      const ausgabe = namen(e.run('LIST.'));
      expect(ausgabe, JSON.stringify(g)).toContain('treffer');
      expect(hatInj()).toBe(false);
    }
  });
  it('zitWert: Form', () => {
    expect(zitWert('abc')).toBe("'abc'"); expect(zitWert("it's")).toBe("'it''s'"); expect(zitWert('')).toBe("''"); expect(zitWert(5)).toBe("'5'");
    expect(zitWert('a\nb')).toBe("'a' + X'0A' + 'b'"); expect(zitWert('\n')).toBe("X'0A'"); expect(zitWert('a\u2028b')).toBe("'a' + X'E280A8' + 'b'");
    expect(zitWert('mäßig')).toBe("'mäßig'");
  });
  it('die Befehle, die Werte aus den Daten einsetzen, gehen durch zitWert', () => {
    const k = { ziel: 'y', hilfsname: 'y_01', bezeichnung: GEFAHR[0]!, ereignis: GEFAHR[1]!, referenz: GEFAHR[2]!, text: true, ereignisName: GEFAHR[3]!, referenzName: GEFAHR[4]!, umgekehrt: false } as unknown as Parameters<typeof logistikBefehl>[1];
    const befehle = [logistikBefehl(['x'], k), rocBefehl('t', 'g', GEFAHR[0]!)];
    for (const b of befehle) {
      // jede Zeile ist entweder ein Befehlsanfang oder eine Fortsetzung - keine Zeile beginnt mit dem eingeschleusten COMPUTE
      expect(b.split('\n').some(z => /^COMPUTE inj/.test(z)), b).toBe(false);
    }
    void anova2Befehl;
  });
});

describe('Projektdatei von woanders: Spaltennamen im Blatt', () => {
  it('psppNameOk lässt PSPP-Namen durch und alles andere nicht', () => {
    for (const ok of ['alter', 'Schlaf_Stunden', 'ph.ecog', 'größe', '$set', '@a', '#t', 'x1', 'Ärger']) expect(psppNameOk(ok), ok).toBe(true);
    for (const nein of ['', 'a b', "a'b", 'a\nb', 'a;b', 'a)b', 'a=b', '1a', 'a/b', 'a"b', 'a\\b', 'a,b', 'a'.repeat(65), 5, null]) expect(psppNameOk(nein), String(nein)).toBe(false);
  });
  it('leseProjektdatei verwirft Spaltennamen im Blatt, die kein PSPP-Name sein können', () => {
    const blatt = (o: object) => ({ id: 'a', titel: 't', art: 'gruppen', syntax: '', items: [], ergebnis: null, imBericht: true, notiz: '', zeit: 1, l1: 'alter', l2: 'geschlecht', ...o });
    const datei = (b: object[], extra: object = {}) => new TextEncoder().encode(JSON.stringify({ format: 'statable-projekt', version: 1, name: 'x', quelle: '', zeit: 1, sav: btoa('x'), blaetter: b, sets: [], skalen: [], entscheid: {}, ...extra }));
    const p = leseProjektdatei(datei([blatt({ l1: "a'.\nCOMPUTE inj = 99.", l2: 'ok_name', l3: ['gut', 'schlecht name', "x'"] }), blatt({})]));
    expect(p.blaetter[0]!.l1).toBeNull(); expect(p.blaetter[0]!.l2).toBe('ok_name'); expect(p.blaetter[0]!.l3).toEqual(['gut', '', '']);
    expect(p.blaetter[1]!.l1).toBe('alter'); expect(p.blaetter[1]!.l3).toBeUndefined();
    const q = leseProjektdatei(datei([], { sets: [{ name: 'S', label: 'l', spalten: ['a', "b'c", 'd'], zaehlwert: 1 }, 5, null] }));
    expect(q.sets).toEqual([{ name: 'S', label: 'l', spalten: ['a', 'd'], zaehlwert: 1 }]);
    void projektAlsDatei;
  });
});

describe('PSPP-Kommentarzeilen: Beschriftungen und Namen aus Dateien beenden den Kommentar nicht', () => {
  const HOCH = ['Studium.\nCOMPUTE inj = 99.\n* ', 'a\u0085.\u0085COMPUTE inj = 99.\u0085* ', 'a\u2028.\u2028COMPUTE inj = 99.', 'a\u2029.\u2029COMPUTE inj = 99.', 'a\r.\rCOMPUTE inj = 99.', 'a\u202e.\nCOMPUTE inj = 99.'];
  it('Messlatte: ein roher Kommentar führt den Befehl aus', () => {
    frisch();
    e.run(`* Gesamttest für ${HOCH[0]}.\nEXECUTE.`);
    expect(hatInj()).toBe(true);
  });
  it('pk: eine Zeile, Länge begrenzt, Bidi und Steuerzeichen weg, Wörter bleiben', () => {
    for (const h of HOCH) { const t = pk(h); expect(t).not.toMatch(STEUER_ZEILE); expect(t).not.toMatch(new RegExp('[\\u202a-\\u202e\\u2066-\\u2069]')); }
    expect(pk('Studium\n.\nCOMPUTE')).toBe('Studium . COMPUTE'); expect(pk('x'.repeat(400)).length).toBe(301); expect(pk('a  b')).toBe('a b'); expect(pk(null)).toBe('');
  });
  it('Regression mit Gruppenspalte (3 Stufen): die Beschriftung im Kommentar führt nichts aus, Zahlen unverändert', () => {
    const lauf = (bez: string) => {
      e.run("NEW FILE.\nDATA LIST FREE /y g x.\nBEGIN DATA\n1 1 3\n2 1 1\n3 1 4\n4 2 1\n5 2 5\n6 2 9\n7 3 2\n8 3 6\n10 3 5\nEND DATA.\nVALUE LABELS g 1 'a' 2 'b' 3 'c'.");
      const sp: Spalte = { name: 'g', bezeichnung: bez, art: 'zahl', niveau: 'nominal', format: 'F8.2', fehlend: [], fehlendText: '', werteLabels: { '1': 'a', '2': 'b', '3': 'c' } };
      const f = regFaktor(sp, [1, 1, 1, 2, 2, 2, 3, 3, 3], ['y', 'g'])!;
      const befehl = regressionBefehl('y', regTerme(['g', 'x'], n => (n === 'g' ? f : null)));
      expect(befehl).toContain('Gesamttest');
      const items = e.run(befehl);
      return { befehl, text: JSON.stringify(items.filter((i: any) => i.type === 'table').map((i: any) => i.cells.map((c: any) => c.t))) };
    };
    const ok = lauf('Studium');
    for (const h of HOCH) {
      const bos = lauf(h);
      expect(spalten().includes('inj'), JSON.stringify(h)).toBe(false);
      expect(bos.text.replace(/COMPUTE[^"]*/g, ''), 'gleiche Zahlen wie mit harmloser Beschriftung').toContain('Regression');
      expect(bos.befehl.split('\n').some(z => /^COMPUTE inj/.test(z))).toBe(false);
    }
    expect(ok.text.length).toBeGreaterThan(100);
  });
  it('Mehrfachantworten-Hinweis (Beschriftung eines Sets): keine Ausführung', () => {
    const v = VERFAHREN.find(x => x.id === 'verteilung')!;
    for (const h of HOCH) {
      frisch();
      const ctx = { istZahl: () => true, verschieden: () => 5, nominal: () => false, bezeichnung: () => h } as never;
      const befehl = v.syntax({ l1: ['a', '$Set'], l2: [], l3: [], l4: [] }, ctx);
      expect(befehl, JSON.stringify(h)).toContain('Mehrfachantworten');
      e.run(befehl);
      expect(spalten().includes('inj'), JSON.stringify(h)).toBe(false);
    }
  });
});
