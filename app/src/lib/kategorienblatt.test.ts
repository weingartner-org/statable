import { beforeAll, describe, expect, it } from 'vitest';
import { s } from './sitzung.svelte';
import { aendereStruktur, antwortenVon, ergebnisFuer, neuesKatBlatt, sicht, uebereinstimmungsSpalten, uebernahmeStand, waehleKennung, zweiteAnlegen, type KatBlatt } from './kategorienblatt';
import { katVorpruefung } from './kategorienblatt';
import { fuehreZusammen, haeufigkeiten, loescheKategorie, neueKategorie, ordne, setzeModus, ergebnis, uebernahmeBefehl, type Antwort } from './kategorisieren';
import { saetzeKategorien, tabellenKategorien } from './kategoriensaetze';
import { anzeige } from './kategorienblatt';
import { zurEngine } from './einlesen';
import { nodeEngine } from './testengine';
import { leseVerzeichnis, type Spalte } from './verzeichnis';

/* Eigene Tests zu G7 (Bauer): Blatt-Zustand, zweite Kodierung, Übernahme-Stand, Überschreiben eigener Spalten und lange Zeilenlisten gegen die echte Engine. */

const sp = (name: string, art: 'zahl' | 'text' = 'text'): Spalte => ({ name, bezeichnung: name, art, niveau: 'nominal', format: art === 'text' ? 'A50' : 'F8.2', fehlend: [], fehlendText: '', werteLabels: {} });
function daten(zeilen: (string | number | null)[][], spalten: Spalte[] = [sp('nr', 'zahl'), sp('antwort')]) {
  s.spalten = spalten; s.zeilen = zeilen; s.sets = [];
}
const texte = ['Mehr Praxis.', 'Rückmeldung bitte.', '', 'Zeit fehlte.', 'Praxis und Zeit.'];
const zeilen5 = texte.map((t, i) => [i + 1, t]);

describe('Blatt: Zeilen als Antworten', () => {
  it('Kennungsspalte (eindeutig, vollständig) wird erkannt; sonst Zeilennummer', () => {
    daten(zeilen5);
    expect(waehleKennung('antwort')).toBe('nr');
    daten([[1, 'a'], [1, 'b']]);
    expect(waehleKennung('antwort')).toBe('');
    daten([[1, 'a'], [null, 'b']]);
    expect(waehleKennung('antwort')).toBe('');
  });
  it('Schlüssel aus der Kennung, bei doppelter Kennung die Zeilennummer', () => {
    daten(zeilen5);
    const kb = neuesKatBlatt('antwort', 'T').kat!;
    expect(antwortenVon(kb).map(a => a.schluessel)).toEqual(['1', '2', '3', '4', '5']);
    expect(antwortenVon(kb)[2]!.text).toBe('');
    kb.kennung = '';
    expect(antwortenVon(kb).map(a => a.schluessel)).toEqual(['Z1', 'Z2', 'Z3', 'Z4', 'Z5']);
  });
  it('Prüfliste: zählt Antworten, sperrt nie', () => {
    daten(zeilen5);
    expect(katVorpruefung('antwort')[0]).toMatchObject({ art: 'ok' });
    daten([[1, ''], [2, null]]);
    expect(katVorpruefung('antwort').some(p => p.art === 'hinweis')).toBe(true);
    expect(katVorpruefung('antwort').every(p => (p.art as string) !== 'sperre')).toBe(true);
  });
});

describe('Zweite Kodierung: Struktur gilt für beide, die Zuordnung ist eigen', () => {
  function kodiert(): KatBlatt {
    daten(zeilen5);
    const kb = neuesKatBlatt('antwort', 'T').kat!;
    const a = neueKategorie(kb.z, 'Praxis'), b = neueKategorie(kb.z, 'Zeit'), c = neueKategorie(kb.z, 'Rückmeldung');
    ordne(kb.z, '1', a); ordne(kb.z, '2', c); ordne(kb.z, '4', b);
    zweiteAnlegen(kb);
    ordne(sicht(kb, 2), '1', b); ordne(sicht(kb, 2), '2', c);
    return kb;
  }
  it('die zweite Zuordnung ist eigen; die erste bleibt unberührt', () => {
    const kb = kodiert();
    expect(kb.z.zuordnung['1']).toEqual([kb.z.kategorien[0]!.id]);
    expect(kb.zuordnung2!['1']).toEqual([kb.z.kategorien[1]!.id]);
  });
  it('Kategorie löschen und zusammenführen räumen auch die zweite Zuordnung auf', () => {
    const kb = kodiert();
    const [a, b, c] = kb.z.kategorien.map(k => k.id);
    aendereStruktur(kb, z => loescheKategorie(z, b!));
    expect(kb.z.zuordnung['4']).toBeUndefined();
    expect(kb.zuordnung2!['1']).toBeUndefined();
    expect(kb.zuordnung2!['2']).toEqual([c]);
    aendereStruktur(kb, z => fuehreZusammen(z, a!, c!));
    expect(kb.z.zuordnung['1']).toEqual([c]);
    expect(kb.z.kategorien.map(k => k.name)).toEqual(['Rückmeldung']);
  });
  it('Moduswechsel gilt für beide Kodierungen', () => {
    const kb = kodiert();
    aendereStruktur(kb, z => setzeModus(z, true));
    expect(kb.z.mehrfach).toBe(true);
    ordne(sicht(kb, 2), '1', kb.z.kategorien[0]!.id);
    expect(kb.zuordnung2!['1']!.length).toBe(2);
    aendereStruktur(kb, z => setzeModus(z, false));
    expect(kb.zuordnung2!['1']!.length).toBe(1);
  });
  it('Ergebnis und Häufigkeiten je Kodierung', () => {
    const kb = kodiert();
    const antw = antwortenVon(kb);
    expect(haeufigkeiten(antw, sicht(kb, 1)).nZugeordnet).toBe(3);
    expect(haeufigkeiten(antw, sicht(kb, 2)).nZugeordnet).toBe(2);
    expect(ergebnisFuer(kb, 2, []).spalten[0]!.name).toBe('antwort_2_kat');
  });
});

describe('Sätze und Tabellen: beschreibend', () => {
  it('Kein Test, keine Verallgemeinerung; Prozentbasis und Summe über 100 % genannt', () => {
    daten(zeilen5);
    const kb = neuesKatBlatt('antwort', 'T').kat!;
    const a = neueKategorie(kb.z, 'Praxis', 'Praxisbezug', 'Mehr Praxis.'), b = neueKategorie(kb.z, 'Zeit');
    setzeModus(kb.z, true);
    ordne(kb.z, '1', a); ordne(kb.z, '5', a); ordne(kb.z, '5', b); ordne(kb.z, '4', b);
    const e = anzeige(kb);
    const st = saetzeKategorien(e);
    expect(st.haupt).toContain('3 von 4');
    expect(st.zusatz).toMatch(/Basis|beziehen sich auf die 3 Personen/);
    expect(st.zusatz).toMatch(/mehr als 100 %/);
    expect(st.zusatz).toMatch(/1 Person ohne Antwort, 1 Antwort noch offen/);
    expect(st.zusatz).toMatch(/prüft nichts/);
    expect(`${st.haupt} ${st.zusatz}`).not.toMatch(/\bp\s*[<=]|signifikant|belegt|zeigt/);
    const t = tabellenKategorien(e);
    expect(t.length).toBe(2);   // Häufigkeiten + Kodierleitfaden (Beschreibung ausgefüllt)
    expect(t[0]!.cols).toBe(4);   // Kategorie, n, % der Personen, % der Nennungen
  });
});

/* ---------- echte Engine ---------- */
let e: Awaited<ReturnType<typeof nodeEngine>>;
beforeAll(async () => { e = await nodeEngine(); });
const fehler = (items: ReturnType<typeof e.run>) => items.filter(i => i.type === 'message' && i.severity === 'error');
function lade(antworten: Antwort[]) {
  const b = zurEngine({ kopf: ['id', 'antwort'], zeilen: antworten.map(a => [a.schluessel, a.text ?? '']), quelle: 'Test' });
  e.run('NEW FILE.\n' + b.syntax, { '/import.csv': b.csv });
}
function werte(name: string): (number | null)[] {
  const t = e.run(`LIST ${name}.`).find(i => i.type === 'table' && i.label === 'Data List') as any;
  const spalte = t.cells.find((c: any) => c.r === 0 && c.t === name).c;
  return t.cells.filter((c: any) => c.c === spalte && c.r > 0).map((c: any) => (c.n === undefined || c.n === null || c.n < -1e300 ? null : c.n));
}
describe('PSPP: Übernahme überschreiben und lange Listen', () => {
  const antworten: Antwort[] = Array.from({ length: 3000 }, (_, i) => ({ schluessel: String(i + 1), text: i % 11 === 0 ? '' : `Antwort ${i}` }));
  it('3000 Zeilen: lange ANY-Listen laufen fehlerfrei, die Werte stimmen', () => {
    lade(antworten);
    const z = { kategorien: [] as any[], mehrfach: false, zuordnung: {} as Record<string, string[]> };
    const a = neueKategorie(z, 'A'), b = neueKategorie(z, 'B');
    antworten.forEach((x, i) => { if (x.text) ordne(z, x.schluessel, i % 2 ? a : b); });
    const erg = ergebnis(antworten, z, 'k');
    expect(fehler(e.run(uebernahmeBefehl(erg)))).toEqual([]);
    const w = werte('k_kat');
    expect(w.length).toBe(3000);
    expect(w).toEqual(erg.spalten[0]!.werte);
  });
  it('erneutes Übernehmen: die eigene Spalte wird überschrieben, eine Spalte mit weniger Kategorien wird mit DELETE VARIABLES entfernt', () => {
    const kleine = antworten.slice(0, 6).map((a, i) => ({ ...a, text: `Text ${i}` }));
    lade(kleine);
    const z = { kategorien: [] as any[], mehrfach: false, zuordnung: {} as Record<string, string[]> };
    const a = neueKategorie(z, 'A'), b = neueKategorie(z, 'B');
    ordne(z, '1', a); ordne(z, '2', b);
    expect(fehler(e.run(uebernahmeBefehl(ergebnis(kleine, z, 'k'))))).toEqual([]);
    expect(werte('k_kat').slice(0, 3)).toEqual([1, 2, null]);
    // Zuordnung ändert sich, dieselbe Spalte wird überschrieben
    ordne(z, '1', b); ordne(z, '3', a);
    expect(fehler(e.run(uebernahmeBefehl(ergebnis(kleine, z, 'k'))))).toEqual([]);
    expect(werte('k_kat').slice(0, 4)).toEqual([2, 2, 1, null]);
    // Wechsel zu mehrfach: die alte Spalte fällt weg, neue entstehen
    setzeModus(z, true);
    const erg = ergebnis(kleine, z, 'k');
    expect(fehler(e.run(uebernahmeBefehl(erg, { loesche: ['k_kat'] })))).toEqual([]);
    const namen = leseVerzeichnis(e.run('DISPLAY DICTIONARY.')).map(x => x.name);
    expect(namen).not.toContain('k_kat');
    expect(namen).toContain('k_kat1');
    expect(werte('k_kat1').slice(0, 3)).toEqual([0, 0, 1]);
  });
});

describe('Übernahme-Stand und Übereinstimmung (Zustand der Sitzung)', () => {
  it('nicht → aktuell → geändert; Spalten fehlen nach Rückgängig wieder = nicht', () => {
    daten(zeilen5);
    const kb = neuesKatBlatt('antwort', 'T').kat!;
    const a = neueKategorie(kb.z, 'Praxis'); neueKategorie(kb.z, 'Zeit');
    ordne(kb.z, '1', a);
    expect(uebernahmeStand(kb, 1)).toBe('nicht');
    // so sähen die Daten nach der Übernahme aus
    const erg = ergebnisFuer(kb, 1, []);
    daten(zeilen5.map((z, i) => [...z, erg.spalten[0]!.werte[i]!]), [sp('nr', 'zahl'), sp('antwort'), { ...sp('antwort_kat', 'zahl'), werteLabels: { '1': 'Praxis', '2': 'Zeit' } }]);
    kb.uebernommen[0] = { namen: ['antwort_kat'], set: null };
    expect(uebernahmeStand(kb, 1)).toBe('aktuell');
    ordne(kb.z, '4', a);
    expect(uebernahmeStand(kb, 1)).toBe('geaendert');
    daten(zeilen5);   // Spalte weg (Rückgängig der Übernahme)
    expect(uebernahmeStand(kb, 1)).toBe('nicht');
  });
  it('Übereinstimmung: beide Kodierungen müssen aktuell sein', () => {
    daten(zeilen5);
    const kb = neuesKatBlatt('antwort', 'T').kat!;
    neueKategorie(kb.z, 'Praxis');
    expect(uebereinstimmungsSpalten(kb)).toBeNull();
    zweiteAnlegen(kb);
    expect(uebereinstimmungsSpalten(kb)).toBeNull();
  });
});
