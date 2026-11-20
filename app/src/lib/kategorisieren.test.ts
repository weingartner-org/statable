import { beforeAll, describe, expect, it } from 'vitest';
import erwartet from './testdaten/welle4-erwartet.json';
import {
  benenneKategorie, ergebnis, fuehreZusammen, haeufigkeiten, leererKatZustand, loescheKategorie, neueKategorie, ordne, setzeModus, uebernahmeBefehl, verschiebeKategorie, zustaende, zustandVon,
  type Antwort, type KatZustand
} from './kategorisieren';
import { intercoder } from './intercoder';
import { mehrfachRechnen, setNameFehler, type MehrfachSet } from './mehrfach';
import { zurEngine } from './einlesen';
import { gueltigerName } from './skalabau';
import { nodeEngine } from './testengine';
import { leseVerzeichnis } from './verzeichnis';

/*
 * ROTE TESTS Welle 4, G7 „Offene Antworten ordnen“ (Prüfer). Der Bauer darf diese Datei NICHT ändern; sie wird grün, wenn app/src/lib/kategorisieren.ts die unten festgelegte API liefert.
 * Sollwerte: scripts/welle4-erwartet.R → testdaten/welle4-erwartet.json (g7). Fachblatt docs/fachblaetter/WELLE4-FAELLE-OFFENE-ANTWORTEN.md, Abschnitt G7 und „Nachtrag nach der Landkarte“ Punkte 4 und 6.
 * Reine Logik plus die PSPP-Syntax zum Übernehmen („In die Daten übernehmen“, Nachtrag 4), einmal echt gegen die Engine (Node, wie hierreg-pspp.test.ts).
 *
 * API (alles aus './kategorisieren'):
 *   interface Antwort { schluessel: string; text: string | null }                      Zeilen in Reihenfolge der Daten (Fall i = $CASENUM i + 1)
 *   interface Kategorie { id: string; name: string; beschreibung: string; beispiel: string }
 *   interface KatZustand { kategorien: Kategorie[]; mehrfach: boolean; zuordnung: Record<string, string[]> }     schluessel → Kategorie-ids; im Blatt gespeichert
 *   type AntwortZustand = 'leer' | 'offen' | 'zugeordnet'
 *   leererKatZustand(): KatZustand                                                     keine Kategorien, mehrfach = false (Voreinstellung: eine Kategorie je Antwort)
 *   neueKategorie(z, name, beschreibung = '', beispiel = ''): string                  hängt hinten an, gibt die id zurück. Der Code einer Kategorie = Stelle in z.kategorien + 1
 *   benenneKategorie(z, id, name) / loescheKategorie(z, id) / fuehreZusammen(z, vonId, nachId) / verschiebeKategorie(z, id, richtung: -1 | 1)
 *        löschen: ihre Zuordnungen entfallen (Antworten ohne Kategorie werden wieder „offen“); zusammenführen: Zuordnungen von → nach (ohne Doppelte), von entfällt; verschieben ändert die Codes.
 *   ordne(z, schluessel, kategorieId, an = true): void
 *        eine Kategorie je Antwort: an = true ERSETZT die bisherige; an = false entfernt. Mehrfach: fügt hinzu bzw. entfernt. Zuordnungen bleiben nach Reihenfolge der Kategorienliste geordnet.
 *   setzeModus(z, mehrfach: boolean): void           mehrfach → eins: jede Antwort behält die Kategorie mit dem kleinsten Code; eins → mehrfach: nichts geht verloren
 *   zustandVon(a: Antwort, z): AntwortZustand        leer = kein Text oder nur Leerraum (gewinnt gegen jede Zuordnung); offen = Text, keine Kategorie; zugeordnet = mindestens eine Kategorie
 *   zustaende(antworten, z): AntwortZustand[]
 *   haeufigkeiten(antworten, z): KatHaeufigkeit
 *        = { modus: 'eins'|'mehrfach'; nZeilen; nLeer; nOffen; nZugeordnet; nNennungen; summePersonenProzent;
 *            kategorien: { id; name; code; n; prozentPersonen; prozentNennungen }[] }
 *        Prozent 0-100. prozentPersonen: Basis = Antworten mit mindestens einer Kategorie (nZugeordnet); prozentNennungen: Basis = Summe aller Zuordnungen (bei „eins“ gleich prozentPersonen).
 *        Kategorien ohne Zuordnung stehen mit n = 0.
 *   ergebnis(antworten, z, grundname: string, vorhandene: string[] = []): KatErgebnis
 *        = { modus; spalten: { name; kategorieId: string | null; label: string; werte: (number | null)[] }[]; labels: { code; label }[]; set: { name; label; spalten: string[]; zaehlwert: 1 } | null }
 *        eins: GENAU eine Spalte `<grund>_kat`, Codes 1..k, null für leer und offen; labels = Wertelabels. mehrfach: je Kategorie `<grund>_kat1` … `<grund>_katK`: 1 zugeordnet, 0 = Antwort mit anderer Kategorie,
 *        null = leer oder offen; set = Mehrfachantworten-Set (Name gültig nach mehrfach.ts setNameFehler). Namen, die in `vorhandene` (FREMDE Spalten) stehen, werden mit freierName ausgewichen (`gefehlt_kat2`).
 *   uebernahmeBefehl(erg: KatErgebnis): string        PSPP-Syntax: COMPUTE/RECODE (Werte nach $CASENUM), VALUE LABELS, VARIABLE LEVEL … (NOMINAL), EXECUTE; Hochkomma in Namen verdoppelt.
 * Übergabe an die Übereinstimmung: intercoder([spalte1.werte, spalte2.werte], 'nominal') auf den (übernommenen) Ergebnisspalten zweier Kodierungen.
 */

interface SollHaeufig { code: number; label: string; n: number; prozent?: number; prozent_personen?: number; prozent_nennungen?: number }
interface SollKoeff { n_einheiten: number; n_nur_eine: number; alles_gleich: boolean; kappa: number | null; alpha_nominal: number | null; uebereinstimmung_prozent: number; kodierung1: (number | null)[]; kodierung2: (number | null)[]; label?: string; code?: number }
const g7 = (erwartet as unknown as { g7: any }).g7;
const kategorienNamen: string[] = g7.kategorien.map((k: { name: string }) => k.name);
const antworten: Antwort[] = g7.antworten.id.map((id: string, i: number) => ({ schluessel: id, text: g7.antworten.text[i] }));
const NZ = antworten.length;
const sollZustand: string[] = g7.zustand;

const nah = (ist: number | null | undefined, s: number | null, was: string, tol = 1e-9) => {
  if (s === null) { expect(ist, was).toBeNull(); return; }
  expect(ist, was).toBeTypeOf('number');
  expect(Math.abs(ist! - s), `${was}: ${ist} gegen ${s}`).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(s)));
};

/** Zustand aus Code-Listen je Antwort bauen (Codes 1..k = Kategorien in der Reihenfolge des JSON). */
function bauen(mehrfach: boolean, codes: number[][]): { z: KatZustand; ids: string[] } {
  const z = leererKatZustand();
  setzeModus(z, mehrfach);
  const ids = kategorienNamen.map(n => neueKategorie(z, n));
  codes.forEach((cs, i) => cs.forEach(c => ordne(z, antworten[i]!.schluessel, ids[c - 1]!, true)));
  return { z, ids };
}
const einzelCodes = (codes: (number | null)[]): number[][] => codes.map(c => (c === null ? [] : [c]));
const eins = () => bauen(false, einzelCodes(g7.einzel.gruppenspalte.codes));
const mehr = () => bauen(true, g7.mehrfach.zuordnung);
const eins2 = () => bauen(false, einzelCodes(g7.zweitkodierung.einzel.kodierung2));
const mehr2 = () => bauen(true, g7.zweitkodierung.mehrfach.zuordnung2);

describe('Zustände: leer / offen / zugeordnet', () => {
  it('Mehrfachzuordnung: Zustände wie im JSON (3 leer, 4 offen, 13 zugeordnet)', () => {
    const { z } = mehr();
    expect(zustaende(antworten, z)).toEqual(sollZustand);
    expect(sollZustand.filter(s => s === 'leer').length).toBe(3);
  });
  it('eine Kategorie je Antwort: dieselben Zustände', () => {
    expect(zustaende(antworten, eins().z)).toEqual(sollZustand);
  });
  it('Text nur aus Leerzeichen und null sind leer, Text ohne Kategorie ist offen', () => {
    const z = leererKatZustand(); neueKategorie(z, 'A');
    expect(zustandVon({ schluessel: 'x', text: '   ' }, z)).toBe('leer');
    expect(zustandVon({ schluessel: 'x', text: '' }, z)).toBe('leer');
    expect(zustandVon({ schluessel: 'x', text: null }, z)).toBe('leer');
    expect(zustandVon({ schluessel: 'x', text: 'Etwas' }, z)).toBe('offen');
  });
  it('eine leere Antwort bleibt leer, auch wenn ihr eine Kategorie zugeordnet wird (leer ist fehlend, nie „keine Kategorie“)', () => {
    const { z, ids } = eins();
    ordne(z, 'A04', ids[0]!);
    expect(zustaende(antworten, z)[3]).toBe('leer');
    expect(haeufigkeiten(antworten, z).nZugeordnet).toBe(13);
  });
  it('Zuordnung zurücknehmen macht die Antwort wieder „offen“ (nicht still „zugeordnet“ oder 0)', () => {
    const { z, ids } = eins();
    ordne(z, 'A01', ids[0]!, false);
    expect(zustaende(antworten, z)[0]).toBe('offen');
    expect(haeufigkeiten(antworten, z)).toMatchObject({ nOffen: 5, nZugeordnet: 12, nLeer: 3 });
  });
});

describe('Häufigkeiten und Prozentbasen', () => {
  it('(a) eine Kategorie: n, Prozent der Personen mit zugeordneter Antwort (Basis 13), leer/offen gezählt, Technik n = 0', () => {
    const { z } = eins();
    const h = haeufigkeiten(antworten, z);
    expect(h.modus).toBe('eins');
    expect([h.nZeilen, h.nLeer, h.nOffen, h.nZugeordnet]).toEqual([NZ, g7.einzel.n_leer, g7.einzel.n_offen, g7.einzel.n_zugeordnet]);
    expect(h.kategorien.map(k => k.name)).toEqual(kategorienNamen);
    expect(h.kategorien.map(k => k.code)).toEqual([1, 2, 3, 4, 5]);
    (g7.einzel.haeufigkeit as SollHaeufig[]).forEach((s, i) => {
      expect(h.kategorien[i]!.n, s.label).toBe(s.n);
      nah(h.kategorien[i]!.prozentPersonen, s.prozent!, `${s.label} Prozent`);
      nah(h.kategorien[i]!.prozentNennungen, s.prozent!, `${s.label} Prozent der Nennungen (= Personen bei „eins“)`);
    });
    nah(h.kategorien.reduce((a, k) => a + k.prozentPersonen, 0), 100, 'Summe 100');
    expect(h.kategorien[4]!.n).toBe(0);
  });
  it('(b) Mehrfach: n, Prozent der Personen (Basis 13), Prozent der Nennungen (Basis 19), Summe der Personen-% über 100', () => {
    const { z } = mehr();
    const h = haeufigkeiten(antworten, z);
    expect(h.modus).toBe('mehrfach');
    expect([h.nZeilen, h.nLeer, h.nOffen, h.nZugeordnet, h.nNennungen]).toEqual([NZ, g7.mehrfach.n_leer, g7.mehrfach.n_offen, g7.mehrfach.n_personen, g7.mehrfach.n_nennungen]);
    (g7.mehrfach.haeufigkeit as SollHaeufig[]).forEach((s, i) => {
      expect(h.kategorien[i]!.n, s.label).toBe(s.n);
      nah(h.kategorien[i]!.prozentPersonen, s.prozent_personen!, `${s.label} Prozent der Personen`);
      nah(h.kategorien[i]!.prozentNennungen, s.prozent_nennungen!, `${s.label} Prozent der Nennungen`);
    });
    nah(h.summePersonenProzent, g7.mehrfach.summe_prozent_personen, 'Summe Personen-%');
    expect(h.summePersonenProzent).toBeGreaterThan(100);
    nah(h.kategorien.reduce((a, k) => a + k.prozentNennungen, 0), 100, 'Nennungen-% summieren 100');
  });
  it('Gegenprobe mit mehrfach.ts (mehrfachRechnen auf den 0/1-Spalten): gleiche n und beide Prozentbasen, mit und ohne „Fälle ohne Ankreuzung mitzählen“', () => {
    const { z } = mehr();
    const erg = ergebnis(antworten, z, 'gefehlt');
    const set = erg.set as MehrfachSet;
    const zeilen = Array.from({ length: NZ }, (_, i) => erg.spalten.map(s => s.werte[i]!));
    const h = haeufigkeiten(antworten, z);
    for (const mitNull of [false, true]) {
      const m = mehrfachRechnen({ set, optionsNamen: erg.spalten.map(s => s.label), zeilen, fehlend: erg.spalten.map(() => []), mitNull });
      expect(m.faelle).toBe(h.nZugeordnet);
      expect(m.antworten).toBe(h.nNennungen);
      m.optionen.forEach((o, i) => {
        expect(o.anzahl).toBe(h.kategorien[i]!.n);
        nah(o.proFaelle * 100, h.kategorien[i]!.prozentPersonen, `mitNull ${mitNull} ${o.name} Prozent der Fälle`);
        nah(o.proAntworten * 100, h.kategorien[i]!.prozentNennungen, `mitNull ${mitNull} ${o.name} Prozent der Antworten`);
      });
    }
  });
});

describe('Kategorien ändern (Kodierleitfaden)', () => {
  it('Kategorie anlegen mit Beschreibung und Ankerbeispiel; Codes folgen der Reihenfolge', () => {
    const z = leererKatZustand();
    const a = neueKategorie(z, 'Zeit', 'Zeitmangel', 'Zu wenig Zeit zum Üben.'), b = neueKategorie(z, 'Praxis');
    expect(z.kategorien.map(k => [k.id === a, k.name, k.beschreibung, k.beispiel])).toEqual([[true, 'Zeit', 'Zeitmangel', 'Zu wenig Zeit zum Üben.'], [false, 'Praxis', '', '']]);
    expect(a).not.toBe(b);
    verschiebeKategorie(z, b, -1);
    expect(z.kategorien.map(k => k.name)).toEqual(['Praxis', 'Zeit']);
    verschiebeKategorie(z, b, -1);   // schon vorn: nichts
    expect(z.kategorien.map(k => k.name)).toEqual(['Praxis', 'Zeit']);
  });
  it('Umbenennen ändert den Namen, nicht die Zuordnung', () => {
    const { z, ids } = eins();
    benenneKategorie(z, ids[0]!, 'Praxis');
    const h = haeufigkeiten(antworten, z);
    expect([h.kategorien[0]!.name, h.kategorien[0]!.n]).toEqual(['Praxis', 4]);
  });
  it('Löschen: Zuordnungen entfallen, die Antworten sind wieder offen, die Codes rücken nach', () => {
    const { z, ids } = eins();
    loescheKategorie(z, ids[3]!);   // Sonstiges (2 Antworten)
    const h = haeufigkeiten(antworten, z);
    expect(h.kategorien.map(k => k.name)).toEqual(['Praxisbezug', 'Rückmeldung', 'Zeit', 'Technik']);
    expect([h.nOffen, h.nZugeordnet]).toEqual([6, 11]);
    expect(ergebnis(antworten, z, 'g').spalten[0]!.werte.filter(v => v === 4)).toEqual([]);
  });
  it('Zusammenführen: die Zuordnungen wandern, Doppelte entfallen (Mehrfach: Zeile 2 hat Rückmeldung und Zeit, Zeile 8 Praxis und Zeit)', () => {
    const { z, ids } = mehr();
    fuehreZusammen(z, ids[2]!, ids[1]!);   // Zeit → Rückmeldung
    const h = haeufigkeiten(antworten, z);
    expect(h.kategorien.map(k => k.name)).toEqual(['Praxisbezug', 'Rückmeldung', 'Sonstiges', 'Technik']);
    // Rückmeldung danach: Zeilen 2, 3, 5, 8, 12, 13, 15, 17, 19 = 9 Personen (Zeile 2 hatte beide Kategorien: nur einmal gezählt)
    expect(h.kategorien[1]!.n).toBe(9);
    expect(h.nNennungen).toBe(g7.mehrfach.n_nennungen - 1);
    expect(h.nZugeordnet).toBe(13);
  });
  it('Moduswechsel: mehrfach → eins behält die Kategorie mit dem kleinsten Code, eins → mehrfach verliert nichts', () => {
    const { z } = mehr();
    setzeModus(z, false);
    const h = haeufigkeiten(antworten, z);
    expect(h.modus).toBe('eins');
    expect(h.nZugeordnet).toBe(13);
    // kleinster Code je Zeile: Praxis 6 (Zeilen 1, 5, 8, 15, 17, 20), Rückmeldung 3 (2, 12, 19), Zeit 2 (3, 13), Sonstiges 2 (6, 10)
    expect(h.kategorien.map(k => k.n)).toEqual([6, 3, 2, 2, 0]);
    setzeModus(z, true);
    expect(haeufigkeiten(antworten, z).nNennungen).toBe(13);
    expect(haeufigkeiten(antworten, z).modus).toBe('mehrfach');
  });
  it('Einzelmodus: ordne ersetzt die Kategorie; Mehrfach: ordne fügt hinzu und entfernt einzeln', () => {
    const e = eins();
    ordne(e.z, 'A01', e.ids[2]!);
    expect(e.z.zuordnung['A01']).toEqual([e.ids[2]]);
    const m = mehr();
    ordne(m.z, 'A01', m.ids[2]!);
    expect(m.z.zuordnung['A01']).toEqual([m.ids[0], m.ids[2]]);   // geordnet nach Kategorienliste
    ordne(m.z, 'A01', m.ids[0]!, false);
    expect(m.z.zuordnung['A01']).toEqual([m.ids[2]]);
  });
});

describe('Ergebnisspalten (Codes, Labels, 0/1/fehlend)', () => {
  it('(a) eine Kategorie: eine Gruppenspalte `<grund>_kat` mit Codes 1..k, fehlend für leer und offen, Wertelabels', () => {
    const erg = ergebnis(antworten, eins().z, 'gefehlt');
    expect(erg.modus).toBe('eins');
    expect(erg.spalten.length).toBe(1);
    expect(erg.spalten[0]!.name).toBe('gefehlt_kat');
    expect(erg.spalten[0]!.werte).toEqual(g7.einzel.gruppenspalte.codes);
    expect(erg.labels).toEqual(g7.einzel.gruppenspalte.labels);
    expect(erg.set).toBeNull();
  });
  it('(b) Mehrfach: je Kategorie eine 0/1-Spalte (1 zugeordnet, 0 = beantwortet mit anderer Kategorie, fehlend = leer oder offen)', () => {
    const erg = ergebnis(antworten, mehr().z, 'gefehlt');
    expect(erg.modus).toBe('mehrfach');
    expect(erg.spalten.map(s => s.name)).toEqual(['gefehlt_kat1', 'gefehlt_kat2', 'gefehlt_kat3', 'gefehlt_kat4', 'gefehlt_kat5']);
    expect(erg.spalten.map(s => s.label)).toEqual(kategorienNamen);
    g7.mehrfach.spalten.forEach((s: { werte: (number | null)[] }, k: number) => expect(erg.spalten[k]!.werte, kategorienNamen[k]).toEqual(s.werte));
    // nie 0 für leer/offen
    erg.spalten.forEach(s => s.werte.forEach((w, i) => { if (sollZustand[i] !== 'zugeordnet') expect(w, `${s.name} Zeile ${i + 1}`).toBeNull(); }));
  });
  it('(b) Mehrfach: Mehrfachantworten-Set mit Zählwert 1 und gültigem Namen, Spalten in Kategorienreihenfolge', () => {
    const erg = ergebnis(antworten, mehr().z, 'gefehlt');
    expect(erg.set).not.toBeNull();
    expect(erg.set!.spalten).toEqual(erg.spalten.map(s => s.name));
    expect(erg.set!.zaehlwert).toBe(1);
    expect(setNameFehler(erg.set!.name, [], [])).toBe('');
  });
  it('Namen: fremde Spalten gleichen Namens werden nie überschrieben (neuer Name), alle Namen sind für PSPP gültig', () => {
    expect(ergebnis(antworten, eins().z, 'gefehlt', ['gefehlt_kat']).spalten[0]!.name).toBe('gefehlt_kat2');
    expect(ergebnis(antworten, eins().z, 'gefehlt', ['GEFEHLT_KAT', 'gefehlt_kat2']).spalten[0]!.name).toBe('gefehlt_kat3');
    const m = ergebnis(antworten, mehr().z, 'gefehlt', ['gefehlt_kat2']);
    expect(m.spalten.map(s => s.name)).toContain('gefehlt_kat22');
    for (const s of [...ergebnis(antworten, eins().z, 'Gefehlt_Seminar').spalten, ...ergebnis(antworten, mehr().z, 'Gefehlt_Seminar').spalten]) expect(gueltigerName(s.name), s.name).toBe(true);
  });
  it('Mehrfach nach Kategorie-Änderung: Spalten werden aus dem Zustand neu gebildet (keine zweite Wahrheit)', () => {
    const { z, ids } = mehr();
    loescheKategorie(z, ids[4]!);   // Technik
    const erg = ergebnis(antworten, z, 'gefehlt');
    expect(erg.spalten.length).toBe(4);
    expect(erg.set!.spalten.length).toBe(4);
  });
});

describe('PSPP-Syntax zum Übernehmen (strukturell)', () => {
  it('(a) enthält COMPUTE/RECODE, VALUE LABELS mit den Kategorien, VARIABLE LEVEL NOMINAL, EXECUTE', () => {
    const erg = ergebnis(antworten, eins().z, 'gefehlt');
    const s = uebernahmeBefehl(erg);
    expect(s).toMatch(/\b(COMPUTE|RECODE)\b/);
    expect(s).toMatch(/VALUE LABELS\s+gefehlt_kat\s+1\s+'Praxisbezug'/);
    expect(s).toMatch(/VARIABLE LEVEL[^.]*\bgefehlt_kat\b[^.]*\(NOMINAL\)/);
    expect(s).toMatch(/EXECUTE\s*\./);
  });
  it('(b) jede 0/1-Spalte kommt in der Syntax vor, NOMINAL, mit Wertelabels', () => {
    const erg = ergebnis(antworten, mehr().z, 'gefehlt');
    const s = uebernahmeBefehl(erg);
    for (const sp of erg.spalten) {
      expect(s, sp.name).toMatch(new RegExp(`\\b${sp.name}\\b`));
      expect(s, sp.name).toMatch(new RegExp(`VARIABLE LEVEL[^.]*\\b${sp.name}\\b[^.]*\\(NOMINAL\\)`));
      expect(s, sp.name).toMatch(new RegExp(`VALUE LABELS\\s+(.*\\s)?\\b${sp.name}\\b`));
    }
  });
  it('Hochkomma in einem Kategorienamen wird verdoppelt', () => {
    const z = leererKatZustand(); const id = neueKategorie(z, "Lehrer's Zeit");
    ordne(z, 'A01', id);
    const s = uebernahmeBefehl(ergebnis(antworten, z, 'gefehlt'));
    expect(s).toContain("'Lehrer''s Zeit'");
  });
});

/* ---------- echte PSPP-Engine ---------- */
let e: Awaited<ReturnType<typeof nodeEngine>>;
beforeAll(async () => { e = await nodeEngine(); });

/** Die Antworten als Textspalte in die Engine laden (Spalte `id` hält die Zeilen auch bei leerem Text zusammen). */
function ladeAntworten() {
  const b = zurEngine({ kopf: ['id', 'antwort'], zeilen: antworten.map(a => [a.schluessel, a.text ?? '']), quelle: 'Test' });
  e.run('NEW FILE.\n' + b.syntax, { '/import.csv': b.csv });
  expect(fallzahl()).toBe(NZ);
}
const fallzahl = () => {
  const t = e.run('LIST id.').find(i => i.type === 'table' && i.label === 'Data List') as any;
  const spalte = t.cells.find((c: any) => c.r === 0 && c.t === 'id').c;
  return t.cells.filter((c: any) => c.c === spalte && c.r > 0).length;
};
/** Werte einer Spalte aus LIST; fehlend → null. */
function werte(name: string): (number | null)[] {
  const t = e.run(`LIST ${name}.`).find(i => i.type === 'table' && i.label === 'Data List') as any;
  const spalte = t.cells.find((c: any) => c.r === 0 && c.t === name).c;
  return t.cells.filter((c: any) => c.c === spalte && c.r > 0).map((c: any) => (c.n === undefined || c.n === null || c.n < -1e300 ? null : c.n));
}
const fehler = (items: ReturnType<typeof e.run>) => items.filter(i => i.type === 'message' && i.severity === 'error');

describe('PSPP-Engine: die übernommenen Spalten stimmen mit dem JSON (R) überein', () => {
  it('(a) eine Kategorie: Codes, fehlend für leer/offen, Wertelabels, Niveau nominal', () => {
    ladeAntworten();
    const erg = ergebnis(antworten, eins().z, 'gefehlt');
    const syntax = uebernahmeBefehl(erg);
    expect(fehler(e.run(syntax)), syntax).toEqual([]);
    expect(werte('gefehlt_kat')).toEqual(g7.einzel.gruppenspalte.codes);
    const sp = leseVerzeichnis(e.run('DISPLAY DICTIONARY.')).find(s => s.name === 'gefehlt_kat')!;
    expect(sp.niveau).toBe('nominal');
    expect(sp.werteLabels).toEqual({ '1': 'Praxisbezug', '2': 'Rückmeldung', '3': 'Zeit', '4': 'Sonstiges', '5': 'Technik' });
  });
  it('(b) Mehrfach: 0/1/fehlend je Kategorie wie im JSON, Niveau nominal; Summen = n der Häufigkeitstabelle', () => {
    ladeAntworten();
    const erg = ergebnis(antworten, mehr().z, 'gefehlt');
    const syntax = uebernahmeBefehl(erg);
    expect(fehler(e.run(syntax)), syntax).toEqual([]);
    const verz = leseVerzeichnis(e.run('DISPLAY DICTIONARY.'));
    g7.mehrfach.spalten.forEach((s: { werte: (number | null)[] }, k: number) => {
      expect(werte(`gefehlt_kat${k + 1}`), kategorienNamen[k]).toEqual(s.werte);
      expect(verz.find(v => v.name === `gefehlt_kat${k + 1}`)!.niveau).toBe('nominal');
      expect(werte(`gefehlt_kat${k + 1}`).reduce<number>((a, w) => a + (w ?? 0), 0)).toBe(g7.mehrfach.haeufigkeit[k].n);
    });
  });
  it('Kategorienname mit Hochkomma kommt unverändert als Wertelabel an', () => {
    ladeAntworten();
    const z = leererKatZustand(); const id = neueKategorie(z, "Lehrer's Zeit"); neueKategorie(z, 'Zweite');
    ordne(z, 'A01', id);
    expect(fehler(e.run(uebernahmeBefehl(ergebnis(antworten, z, 'k')))).length).toBe(0);
    expect(leseVerzeichnis(e.run('DISPLAY DICTIONARY.')).find(s => s.name === 'k_kat')!.werteLabels['1']).toBe("Lehrer's Zeit");
  });
});

describe('Übergabe an die Übereinstimmung (Zweitkodierung): intercoder() = JSON (Kappa, Alpha)', () => {
  const zk = g7.zweitkodierung;
  const pruefe = (w1: (number | null)[], w2: (number | null)[], s: SollKoeff, was: string) => {
    const r = intercoder([w1, w2], 'nominal');
    expect(r.nEinheiten, `${was} Einheiten`).toBe(s.n_einheiten);
    expect(r.nNurEine, `${was} nur eine Kodierung`).toBe(s.n_nur_eine);
    expect(r.allesGleich, `${was} alles gleich`).toBe(s.alles_gleich);
    if (s.alles_gleich) { expect(r.cohen).toBeNull(); return; }
    nah(r.cohen, s.kappa, `${was} Kappa`);
    nah(r.alpha.wert, s.alpha_nominal, `${was} Alpha`);
    nah((r.prozent.wert ?? NaN) * 100, s.uebereinstimmung_prozent, `${was} Übereinstimmung`, 1e-9);
  };
  it('eine Kategorie je Antwort: Spalten aus ergebnis() zweier Kodierungen', () => {
    const a = ergebnis(antworten, eins().z, 'k1'), b = ergebnis(antworten, eins2().z, 'k2');
    expect(a.spalten[0]!.werte).toEqual(zk.einzel.kodierung1);
    expect(b.spalten[0]!.werte).toEqual(zk.einzel.kodierung2);
    pruefe(a.spalten[0]!.werte, b.spalten[0]!.werte, zk.einzel, 'einzel');
  });
  it('eine Kategorie je Antwort: über die in PSPP übernommenen Spalten', () => {
    ladeAntworten();
    expect(fehler(e.run(uebernahmeBefehl(ergebnis(antworten, eins().z, 'k1')))).length).toBe(0);
    expect(fehler(e.run(uebernahmeBefehl(ergebnis(antworten, eins2().z, 'k2')))).length).toBe(0);
    pruefe(werte('k1_kat'), werte('k2_kat'), zk.einzel, 'einzel (PSPP)');
  });
  it('Mehrfachzuordnung: Kappa und Alpha je Kategorie auf den 0/1-Spalten (alles gleich → keine Koeffizienten)', () => {
    const a = ergebnis(antworten, mehr().z, 'k1'), b = ergebnis(antworten, mehr2().z, 'k2');
    (zk.mehrfach.je_kategorie as SollKoeff[]).forEach((s, k) => pruefe(a.spalten[k]!.werte, b.spalten[k]!.werte, s, `Kategorie ${s.label}`));
  });
  it('Mehrfachzuordnung über die in PSPP übernommenen Spalten', () => {
    ladeAntworten();
    expect(fehler(e.run(uebernahmeBefehl(ergebnis(antworten, mehr().z, 'k1')))).length).toBe(0);
    expect(fehler(e.run(uebernahmeBefehl(ergebnis(antworten, mehr2().z, 'k2')))).length).toBe(0);
    (zk.mehrfach.je_kategorie as SollKoeff[]).forEach((s, k) => pruefe(werte(`k1_kat${k + 1}`), werte(`k2_kat${k + 1}`), s, `Kategorie ${s.label} (PSPP)`));
  });
  it('zweite Kodierung: ein eigener Zustand mit eigener Zuordnung, die erste bleibt unberührt', () => {
    const a = eins(), b = eins2();
    expect(a.z.zuordnung['A05']).not.toEqual(b.z.zuordnung['A05']);   // Zeile 5: 1 gegen 2
    expect(haeufigkeiten(antworten, a.z).kategorien.map(k => k.n)).toEqual([4, 4, 3, 2, 0]);
  });
});
