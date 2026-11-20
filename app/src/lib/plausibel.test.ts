import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { s } from './sitzung.svelte';
import { pruefeRegeln, leseRegeln, regelnAlsText, regelnAusText, zahlLesen, regelSatz, ergebnisSatz, keineKorrekturSatz, erfuelltSatz, nichtPruefbarSatz, listeKuerzungSatz, PLAUSI_MAX_REGELN, PLAUSI_MAX_ZEILEN_LISTE, zelleFehlt, type PlausiSpalte, type Regel, type PlausiZelle } from './plausibel';

s.einst.sprache = 'de'; s.einst.anrede = 'du';
const sp = (name: string, art: PlausiSpalte['art'] = 'zahl', mehr: Partial<PlausiSpalte> = {}): PlausiSpalte => ({ name, art, fehlend: [], ...mehr });
const spalten: PlausiSpalte[] = [sp('id'), sp('alter'), sp('geschlecht', 'text'), sp('a'), sp('b'), sp('summe', 'zahl', { fehlend: [-9] }), sp('datum', 'datum')];
//                                  id  alter geschlecht a   b   summe datum
const zeilen: PlausiZelle[][] = [
  [1, 30, 'w', 1, 2, 3, '01.01.2020'],
  [2, 150, 'm', 2, 2, 5, '02.01.2020'],        // Alter zu hoch, a+b=4 statt 5
  [3, null, 'x', 1, 1, 2, '03.01.2020'],        // Alter fehlt, Geschlecht nicht erlaubt
  [3, 20, 'w', 5, null, 7, '04.01.2020'],       // Schlüssel doppelt (id 3), b fehlt
  [null, -1, '', 1, 1, -9, ''],                 // id fehlt, Alter negativ, Text leer, Summe "keine Angabe"
];
const r = (x: unknown) => leseRegeln([x])[0] as Regel;

describe('Regeln lesen (fremde Eingabe)', () => {
  it('Eingabe von Zahlen: Punkt oder Komma, sonst nichts', () => {
    expect(zahlLesen('1,5')).toBe(1.5); expect(zahlLesen(' -2.25 ')).toBe(-2.25); expect(zahlLesen('.5')).toBe(0.5);
    for (const nein of ['', 'abc', '1e5', '1,2,3', '0x10', 'Infinity', '1 2', '--1']) expect(zahlLesen(nein), nein).toBeNull();
  });
  it('gültige Regeln aller fünf Arten bleiben', () => {
    const roh = [
      { id: 'a', art: 'bereich', spalte: 'alter', min: 0, max: 120 }, { id: 'b', art: 'werte', spalte: 'geschlecht', erlaubt: ['w', 'm'] },
      { id: 'c', art: 'wenn', wenn: { spalte: 'alter', op: '<', wert: 18 }, dann: { spalte: 'a', op: '=', wert: 1 } },
      { id: 'd', art: 'summe', teile: ['a', 'b'], ziel: 'summe', toleranz: 0 }, { id: 'e', art: 'schluessel', spalten: ['id'] }
    ];
    expect(leseRegeln(roh)).toEqual(roh);
  });
  it('Kaputtes fällt weg: falsche Arten, Typen, leere Mengen, min größer max, Steuerzeichen, mehr als 50 Regeln', () => {
    const schlecht: unknown[] = [null, 5, 'x', [], { art: 'eval', code: '1+1' }, { art: 'bereich', spalte: 'a', min: null, max: null }, { art: 'bereich', spalte: 'a', min: 5, max: 1 }, { art: 'bereich', spalte: 'a', min: 'x' },
      { art: 'bereich', spalte: 'a\u0000', min: 1 }, { art: 'bereich', spalte: '', min: 1 }, { art: 'bereich', spalte: 'a', min: Infinity }, { art: 'werte', spalte: 'a', erlaubt: [] }, { art: 'werte', spalte: 'a', erlaubt: [{}] },
      { art: 'wenn', wenn: { spalte: 'a', op: 'LIKE', wert: 1 }, dann: { spalte: 'b', op: '=', wert: 1 } }, { art: 'wenn', wenn: { spalte: 'a', op: '=', wert: 1 } },
      { art: 'summe', teile: ['a'], ziel: 'b', toleranz: 0 }, { art: 'summe', teile: ['a', 'b'], ziel: 'c', toleranz: -1 }, { art: 'schluessel', spalten: [] }];
    expect(leseRegeln(schlecht)).toEqual([]);
    expect(leseRegeln('kein Feld')).toEqual([]);
    const viele = Array.from({ length: 80 }, (_, i) => ({ art: 'bereich', spalte: 'a', min: i, max: null }));
    expect(leseRegeln(viele)).toHaveLength(PLAUSI_MAX_REGELN);
    expect(leseRegeln(Array.from({ length: 5 }, () => ({ id: 'gleich', art: 'bereich', spalte: 'a', min: 0, max: null })).map(x => x)).map(x => x.id)).toEqual(['gleich', 'gleichx', 'gleichxx', 'gleichxxx', 'gleichxxxx']);
  });
  it('__proto__ als Schlüssel und als Spaltenname ist nur Text; es gibt keinen eval in der Datei', () => {
    const o = JSON.parse('{"art":"bereich","spalte":"__proto__","min":1,"max":null,"__proto__":{"art":"werte"}}');
    expect(leseRegeln([o])).toEqual([{ id: 'r1', art: 'bereich', spalte: '__proto__', min: 1, max: null }].map(x => x));
    expect(readFileSync(new URL('./plausibel.ts', import.meta.url), 'utf8')).not.toMatch(/\beval\s*\(|new Function|Function\s*\(/);
  });
  it('Regeldatei: Format wird erkannt; Fremdes, Kaputtes und Zu-Großes werden abgelehnt', () => {
    const regeln = leseRegeln([{ art: 'bereich', spalte: 'alter', min: 0, max: 120 }]);
    const t = regelnAlsText(regeln);
    expect(regelnAusText(t)).toEqual({ ok: true, regeln, verworfen: 0 });
    expect(regelnAusText(JSON.stringify({ format: 'statable-regeln', version: 1, regeln: [...regeln, { art: 'x' }] }))).toEqual({ ok: true, regeln, verworfen: 1 });
    expect(regelnAusText('{')).toEqual({ ok: false, grund: 'unlesbar' });
    expect(regelnAusText('[]')).toEqual({ ok: false, grund: 'unlesbar' });
    expect(regelnAusText('{"format":"anderes"}')).toEqual({ ok: false, grund: 'fremd' });
    expect(regelnAusText(' '.repeat(3 * 1024 * 1024))).toEqual({ ok: false, grund: 'zu-gross' });
  });
});

describe('Prüfen: fünf Arten, fehlende Werte, nichts wird geändert', () => {
  const lauf = (regeln: unknown[]) => pruefeRegeln(spalten, zeilen, leseRegeln(regeln), { mitAnzahl: true });
  it('Wertebereich: fehlend ist nicht prüfbar, nicht verletzt; die Grenzen gehören dazu', async () => {
    const e = await lauf([{ art: 'bereich', spalte: 'alter', min: 0, max: 120 }, { art: 'bereich', spalte: 'alter', min: 20, max: 30 }]);
    expect(e.regeln[0]).toMatchObject({ geprueft: 4, verletzt: 2, nichtPruefbar: 1 });           // 150 und -1 verletzt, null nicht prüfbar
    expect(e.regeln[1]).toMatchObject({ geprueft: 4, verletzt: 2, nichtPruefbar: 1 });           // 20 und 30 liegen drin
    expect(e.liste.map(z => z.zeile)).toEqual([1, 4]);
  });
  it('Erlaubte Werte: Text exakt, leerer Text ist fehlend', async () => {
    const e = await lauf([{ art: 'werte', spalte: 'geschlecht', erlaubt: ['w', 'm'] }]);
    expect(e.regeln[0]).toMatchObject({ geprueft: 4, verletzt: 1, nichtPruefbar: 1 });
    const z = await lauf([{ art: 'werte', spalte: 'id', erlaubt: [1, 2] }]);
    expect(z.regeln[0]).toMatchObject({ geprueft: 4, verletzt: 2, nichtPruefbar: 1 });
  });
  it('Wenn A, dann B: trifft A nicht zu, ist die Regel erfüllt; fehlt A oder (bei zutreffendem A) B, ist sie nicht prüfbar', async () => {
    const e = await lauf([{ art: 'wenn', wenn: { spalte: 'alter', op: '>=', wert: 100 }, dann: { spalte: 'geschlecht', op: '=', wert: 'w' } }]);
    expect(e.regeln[0]).toMatchObject({ geprueft: 4, verletzt: 1, nichtPruefbar: 1, bedingungZutraf: 1 });
    const f = await lauf([{ art: 'wenn', wenn: { spalte: 'a', op: '>', wert: 2 }, dann: { spalte: 'b', op: '>', wert: 0 } }]);
    expect(f.regeln[0]).toMatchObject({ geprueft: 4, verletzt: 0, nichtPruefbar: 1, bedingungZutraf: 0 });   // Zeile 4: a=5, b fehlt -> nicht prüfbar
  });
  it('Summe gleich Spalte: Toleranz; ein Teil oder das Ziel fehlt (auch „keine Angabe“) -> nicht prüfbar', async () => {
    const streng = await lauf([{ art: 'summe', teile: ['a', 'b'], ziel: 'summe', toleranz: 0 }]);
    expect(streng.regeln[0]).toMatchObject({ geprueft: 3, verletzt: 1, nichtPruefbar: 2 });      // Zeile 2 verletzt; Zeile 4 (b fehlt) und 5 (Ziel -9 = keine Angabe) nicht prüfbar
    const locker = await lauf([{ art: 'summe', teile: ['a', 'b'], ziel: 'summe', toleranz: 1 }]);
    expect(locker.regeln[0]).toMatchObject({ geprueft: 3, verletzt: 0, nichtPruefbar: 2 });
  });
  it('Eindeutiger Schlüssel: alle Zeilen mit gleichem Schlüssel sind betroffen; fehlender Teil -> nicht prüfbar, kein Duplikat', async () => {
    const e = await lauf([{ art: 'schluessel', spalten: ['id'] }, { art: 'schluessel', spalten: ['id', 'geschlecht'] }]);
    expect(e.regeln[0]).toMatchObject({ geprueft: 4, verletzt: 2, nichtPruefbar: 1 });
    expect(e.regeln[1]).toMatchObject({ geprueft: 4, verletzt: 0, nichtPruefbar: 1 });
    const t = await pruefeRegeln([sp('k', 'text')], [['1'], ['01'], [1 as never]], leseRegeln([{ art: 'schluessel', spalten: ['k'] }]));
    expect(t.regeln[0]!.verletzt).toBe(0);   // '1', '01' und die Zahl 1 sind verschiedene Schlüssel: nicht geraten
  });
  it('Anzahl verletzter Regeln je Zeile, Zahl der betroffenen Zeilen, Liste mit den Regelnummern', async () => {
    const e = await lauf([{ art: 'bereich', spalte: 'alter', min: 0, max: 120 }, { art: 'werte', spalte: 'geschlecht', erlaubt: ['w', 'm'] }, { art: 'schluessel', spalten: ['id'] }]);
    expect([...e.anzahl!]).toEqual([0, 1, 2, 1, 1]);
    expect(e.zeilenVerletzt).toBe(4);
    expect(e.liste).toEqual([{ zeile: 1, regeln: [0] }, { zeile: 2, regeln: [1, 2] }, { zeile: 3, regeln: [2] }, { zeile: 4, regeln: [0] }]);
  });
  it('Spalte fehlt oder passt nicht zur Art: die Regel wird nicht geprüft, mit Satz; nichts wird still als erfüllt gezählt', async () => {
    const e = await lauf([{ art: 'bereich', spalte: 'gibtsnicht', min: 0 }, { art: 'bereich', spalte: 'geschlecht', min: 0 }, { art: 'werte', spalte: 'datum', erlaubt: ['x'] }, { art: 'werte', spalte: 'alter', erlaubt: ['x'] }, { art: 'summe', teile: ['a', 'geschlecht'], ziel: 'b', toleranz: 0 }]);
    for (const x of e.regeln) expect(x).toMatchObject({ geprueft: 0, verletzt: 0, nichtPruefbar: 0 });
    expect(e.regeln[0]!.spaltenFehlen).toEqual(['gibtsnicht']);
    expect(e.regeln.slice(1).every(x => x.artPasstNicht.length > 0)).toBe(true);
    expect(ergebnisSatz(e.regeln[0]!)).toContain('gibt es in den Daten nicht');
    expect(ergebnisSatz(e.regeln[1]!)).toContain('passt nicht zur Art der Spalte');
  });
  it('Namen der Spalten werden ohne Rücksicht auf Groß- und Kleinschreibung gefunden', async () => {
    const e = await lauf([{ art: 'bereich', spalte: 'ALTER', min: 0, max: 120 }]);
    expect(e.regeln[0]!.geprueft).toBe(4);
  });
  it('die Prüfung ändert die Daten nicht', async () => {
    const vorher = JSON.stringify(zeilen);
    await lauf([{ art: 'bereich', spalte: 'alter', min: 0, max: 120 }, { art: 'schluessel', spalten: ['id'] }]);
    expect(JSON.stringify(zeilen)).toBe(vorher);
  });
  it('fehlend: null, Fehlendcode, leerer Text (außer bei leerGueltig), NaN', () => {
    expect(zelleFehlt(sp('x', 'zahl', { fehlend: [99] }), 99)).toBe(true);
    expect(zelleFehlt(sp('x'), NaN)).toBe(true); expect(zelleFehlt(sp('x'), 0)).toBe(false);
    expect(zelleFehlt(sp('t', 'text'), '')).toBe(true); expect(zelleFehlt(sp('t', 'text', { leerGueltig: true }), '')).toBe(false); expect(zelleFehlt(sp('t', 'text'), '0')).toBe(false);
  });
});

describe('Portionen: 1 Mio. Zeilen ohne Einfrieren', () => {
  it('die Hand wird zwischen den Portionen zurückgegeben; Ergebnis ist von der Portionsgröße unabhängig', async () => {
    const n = 20_000;
    const z: PlausiZelle[][] = Array.from({ length: n }, (_, i) => [i % 7000, i % 100]);
    const spa = [sp('k'), sp('w')];
    const regeln = leseRegeln([{ art: 'schluessel', spalten: ['k'] }, { art: 'bereich', spalte: 'w', min: 0, max: 90 }]);
    let pausen = 0, bis = 0;
    const gross = await pruefeRegeln(spa, z, regeln, { portion: n });
    const klein = await pruefeRegeln(spa, z, regeln, { portion: 1000, pause: async () => { pausen++; }, fortschritt: b => { bis = Math.max(bis, b); } });
    expect(pausen).toBe(40);                      // 20 Portionen Zählen + 20 Portionen Prüfen
    expect(bis).toBeGreaterThan(0);
    expect(klein.regeln).toEqual(gross.regeln);
    expect(klein.zeilenVerletzt).toBe(gross.zeilenVerletzt);
    expect(klein.liste).toEqual(gross.liste);
  });
  it('Liste: höchstens 1.000 Zeilen, gezählt wird alles; Abbrechen stoppt nach der Portion', async () => {
    const n = 5000;
    const z: PlausiZelle[][] = Array.from({ length: n }, (_, i) => [i]);
    const regeln = leseRegeln([{ art: 'bereich', spalte: 'x', min: 10, max: null }]);
    const e = await pruefeRegeln([sp('x')], z, regeln);
    expect(e.liste).toHaveLength(10);
    expect(e.zeilenVerletzt).toBe(10);
    const grosse = await pruefeRegeln([sp('x')], z, leseRegeln([{ art: 'bereich', spalte: 'x', min: null, max: -1 }]));
    expect(grosse.liste).toHaveLength(1000); expect(grosse.zeilenVerletzt).toBe(5000);
    expect(listeKuerzungSatz(5000)).toContain('die ersten 1000');
    expect(listeKuerzungSatz(10)).toBe('');
    const ac = new AbortController();
    const ab = await pruefeRegeln([sp('x')], z, regeln, { portion: 1000, pause: async () => { ac.abort(); }, signal: ac.signal });
    expect(ab.abgebrochen).toBe(true);
  });
  it('eine Million Zeilen läuft in Portionen durch (Zeit nur zur Kenntnis)', async () => {
    const n = 1_000_000;
    const z: PlausiZelle[][] = new Array(n);
    for (let i = 0; i < n; i++) z[i] = [i, i % 100];
    const regeln = leseRegeln([{ art: 'schluessel', spalten: ['k'] }, { art: 'bereich', spalte: 'w', min: 0, max: 98 }]);
    let pausen = 0;
    const e = await pruefeRegeln([sp('k'), sp('w')], z, regeln, { pause: async () => { pausen++; } });
    expect(pausen).toBe(40);                       // 20 + 20 Portionen zu 50.000
    expect(e.regeln[0]).toMatchObject({ geprueft: n, verletzt: 0 });
    expect(e.regeln[1]!.verletzt).toBe(10_000);
  }, 120000);
});

describe('Sätze', () => {
  it('die Pflichtsätze stehen da; Regeln lesen sich in Worten', () => {
    expect(erfuelltSatz()).toBe('Eine erfüllte Regel beweist nicht, dass der Wert stimmt.');
    expect(keineKorrekturSatz()).toContain('ändert nichts'); expect(keineKorrekturSatz()).toContain('entscheidest du');
    expect(nichtPruefbarSatz()).toContain('zählt nicht als verletzt');
    expect(regelSatz(r({ art: 'bereich', spalte: 'alter', min: 0, max: 120 }))).toBe('alter liegt zwischen 0 und 120');
    expect(regelSatz(r({ art: 'wenn', wenn: { spalte: 'a', op: '!=', wert: 'x' }, dann: { spalte: 'b', op: '<=', wert: 2.5 } }))).toBe('Wenn a ≠ „x“, dann b ≤ 2,5');
    expect(ergebnisSatz({ id: 'x', geprueft: 5, verletzt: 1, nichtPruefbar: 2, spaltenFehlen: [], artPasstNicht: [] })).toBe('5 geprüft, 1 verletzt, 2 nicht prüfbar (fehlender Wert).');
  });
  it('englisch: dieselben Sätze', () => {
    s.einst.sprache = 'en';
    try {
      expect(erfuelltSatz()).toBe('A rule that is met does not prove that the value is correct.');
      expect(regelSatz(r({ art: 'bereich', spalte: 'alter', min: 0, max: 120 }))).toBe('alter lies between 0 and 120');
    } finally { s.einst.sprache = 'de'; }
  });
});
