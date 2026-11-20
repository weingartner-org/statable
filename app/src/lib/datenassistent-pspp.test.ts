import { beforeAll, describe, expect, it } from 'vitest';
import erwartet from './testdaten/welle5-erwartet.json';
import { nodeEngine } from './testengine';
import { leseVerzeichnis, type Spalte } from './verzeichnis';
import { neuAufbauen, type Wert } from './eingabe';
import { parseCsv } from '../dialogs/csv';
import { umpolBefehl, umpolSpanne } from './skalabau';
import {
  aggregierenBefehl, anhaengenBefehl, auswahlBefehl, bedingung, behaltenBefehl, berechneBefehl, doppelteFaelle, gruppenUebersicht, leereErgebnisse, markiereDoppelte, umkodierBefehl, umkodierWerte,
  zaehleAuswahl, zeilenStatistikBefehl, zuordnenBefehl, type Daten, type Kennwert
} from './datenassistent';

/* ===== Fachblatt Welle 5: Laufen die von lib/datenassistent.ts erzeugten Befehle in der ECHTEN PSPP-Engine (2.1.1) und geben dieselben Werte wie R? =====
 * Zweite Quelle für jede Zahl: PSPP selbst (dieser Test) gegen R (scripts/welle5-erwartet.R → testdaten/welle5-erwartet.json). API und Regeln: Kopf von datenassistent.test.ts.
 * Der Bauer ändert diesen Test nicht. Toleranz 1e-9 (relativ bei Werten über 1, sonst absolut).
 *
 * ---------------------------------------------- Was PSPP anders macht als das Fachblatt oder R (alle in Tests festgehalten) ----------------------------------------------
 *  1. RECODE: Bereiche (4 THRU HI) und ELSE fangen benutzerdefiniert fehlende Werte (9 = Keine Angabe) ein, ELSE=wert auch leere Zellen (Test u3 „naiv“, u9). Ohne (MISSING=SYSMIS) vorn wird aus „Keine Angabe“
 *     ein gültiger Wert in der neuen Spalte. Bei (ELSE=COPY) wird die 9 mitkopiert und ist in der neuen Spalte gültig. Text: nur genau gleich (Groß/klein, Leerzeichen VORN zählen; HINTEN nicht).
 *  1b. 0/0 ist in PSPP 0 (SPSS: leer); x/0 mit x ≠ 0 ist leer. Darum kann man „Division durch 0“ nicht allein an „Ergebnis leer“ erkennen (Test „Beleg: 0/0“).
 *  1c. Vergleiche auf TEXT-Spalten: eine leere Zelle gibt "falsch" (0), nicht leer; `geschl <> 'w'` schließt leere Zellen ein (Test „oder_text“). Darum bedingung(…, d).
 *  2. COMPUTE a + b: fehlt einer → leer (wie das Fachblatt). MEAN/SUM/MIN/MAX(…) rechnen mit den vorhandenen Werten (MEAN.n verlangt n gültige) - anders als „a + b“. SUM() ohne einen gültigen Wert ist LEER (R: 0).
 *     MIN/MAX: die vorhandenen. SD braucht mindestens 2 Werte. Division durch 0, LN(≤0), SQRT(<0) → leer ohne Meldung.
 *  3. COMPUTE s = (bedingung): Kleene-Logik (leer UND falsch = falsch; leer ODER wahr = wahr), sonst leer; eine Bedingung mit Fehlend-Code (99) ist leer. SELECT IF entfernt Fälle mit falscher UND mit leerer Bedingung.
 *  4. ADD FILES: Spalten nur in einer Datei → leer; Namen ohne Beachtung von Groß/klein; Text unterschiedlicher Breite wird breiter; Text gegen Zahl = Fehler "different types"; Fehlend-Codes und Wertelabels
 *     der ERSTEN Datei gelten für die Spalte.
 *  5. MATCH FILES: (a) TABLE: Kennungen nur in der zweiten Datei fallen STILL weg, FILE+FILE behält sie; (b) NICHT sortierte Dateien: keine Meldung, aber fehlende Partner (Test „unsortiert“); (c) leere Kennung verbindet sich
 *     mit leerer Kennung; (d) doppelte Kennung: still nur die erste Zeile (TABLE) bzw. Zeile für Zeile (FILE+FILE, überzählige Zeilen bleiben ohne Partner); (e) gleiche Namen ausser der Kennung: die Spalte der
 *     ERSTEN Datei gewinnt, die der zweiten fällt still weg; (f) Kennung Text gegen Zahl: Fehler; (g) Text byte-genau (Groß/klein, Leerzeichen VORN zählen, HINTEN nicht); (h) /IN=… gibt es in PSPP 2.1.1 nicht.
 *  6. AGGREGATE: N ohne Klammer = Fälle der Gruppe, N(x) = gültige Werte von x, NU/NU(x) dasselbe ohne Gewichte (das Fachblatt nennt N/NU „mit/ohne fehlende“ - falsch). Fehlende Gruppenangabe: eigene Gruppe (zuerst);
 *     benutzerdefiniert fehlend (g = 9): ZUSÄTZLICHE eigene Gruppe. MEDIAN einer Gruppe ohne gültigen Wert ist leer wie alle anderen Kennwerte (PSPP 2.1.3; 2.1.1 gab NaN, CSV: nan). Sortieren vorher ist nicht nötig; MODE=ADDVARIABLES
 *     behält die Zeilenfolge. ⚠ ABER: MODE=ADDVARIABLES bildet auf NICHT nach den BREAK-Spalten sortierten Daten nur Gruppen aus aufeinanderfolgenden Fällen (still falsche Gruppenwerte): vorher sortieren
 *     und die Zeilenfolge danach wiederherstellen (Test „als neue Spalten“). MEDIAN stimmt mit R median() überein (Mittel der beiden mittleren Werte bei gerader Zahl).
 *  7. Doppelte Fälle: PSPP (MATCH FILES /FIRST) vergleicht byte-genau (é als 1 oder 2 Zeichen = verschieden), Zahlen bitgenau (0,1 + 0,2 ≠ 0,3), Fehlend-Code 99 ≠ leer. Statable normalisiert (NFC, 15 Stellen, fehlend = fehlend per Schalter)
 *     und rechnet darum in JS (doppelteFaelle), nicht in PSPP. Der „genau“-Modus stimmt mit PSPP überein - ausser genau in diesen drei Punkten.
 * ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */

const E = erwartet as any;
let e: Awaited<ReturnType<typeof nodeEngine>>;
beforeAll(async () => { e = await nodeEngine(); });

type Zelle = number | string | null;
const nah = (ist: Zelle | undefined, soll: Zelle, was: string) => {
  if (soll === null) { expect(ist, was).toBeNull(); return; }
  if (typeof soll === 'string') { expect(ist, was).toBe(soll); return; }
  expect(typeof ist, `${was}: ${ist}`).toBe('number');
  expect(Number.isNaN(ist as number), `${was}: NaN (PSPP liefert nan statt leer)`).toBe(false);
  expect(Math.abs((ist as number) - soll), `${was}: PSPP ${ist} gegen R ${soll}`).toBeLessThanOrEqual(1e-9 * Math.max(1, Math.abs(soll)));
};
const nahListe = (ist: Zelle[], soll: Zelle[], was: string) => { expect(ist.length, `${was}: Länge`).toBe(soll.length); soll.forEach((s, i) => nah(ist[i], s, `${was} [${i}]`)); };

/** Läuft der Befehl ohne Fehler und Warnung? (PSPP bricht nach dem ersten Fehler ab.) */
function ok(syntax: string, dateien: Record<string, Uint8Array> = {}) {
  const r = e.run(syntax, dateien);
  const probleme = r.filter(i => i.type === 'message' && /error|warning/.test((i as { severity?: string }).severity ?? '')).map(i => (i as { text?: string }).text ?? JSON.stringify(i));
  expect(probleme, `PSPP meldet Probleme bei:\n${syntax}`).toEqual([]);
  return r;
}
/** Meldungen (Fehler/Warnungen/Hinweise) eines Befehls, ohne etwas zu verlangen. */
const meldungen = (syntax: string) => e.run(syntax).filter(i => i.type === 'message').map(i => (i as { severity?: string; text?: string }).severity + ': ' + ((i as { text?: string }).text ?? '').split('\n')[0]);

function lade(d: Daten) { const { syntax, csv } = neuAufbauen(d.spalten, d.zeilen); ok('NEW FILE.\n' + syntax, { '/eingabe.csv': csv }); }
/** Zweite Datei: aktive Daten sichern, B aufbauen, `vorbereitung` laufen lassen, als .sav ablegen, A wieder aktiv (so macht es die Oberfläche; siehe zuordnenBefehl). */
function ladeZweite(b: Daten, pfad: string, vorbereitung = '') {
  const { syntax, csv } = neuAufbauen(b.spalten, b.zeilen);
  ok(`SAVE OUTFILE='/aktiv.sav'.\nNEW FILE.\n${syntax}\n${vorbereitung}\nSAVE OUTFILE='${pfad}'.\nGET FILE='/aktiv.sav'.`, { '/eingabe.csv': csv });
}
/** Aktive Daten aus der Engine: Spalten (DISPLAY DICTIONARY) und Zeilen. Text unverändert (Leerzeichen VORN bleiben), leer = null; Zahl: leer = null, „nan“ = NaN. */
function lies(): Daten {
  const spalten = leseVerzeichnis(e.run('DISPLAY DICTIONARY.'));
  e.run("SAVE TRANSLATE /OUTFILE='/t.csv' /TYPE=CSV /FIELDNAMES /REPLACE /CELLS=VALUES.");
  const roh = parseCsv(new TextDecoder().decode(e.lies('/t.csv'))).slice(1);
  const zeilen = roh.map(z => spalten.map((s, i) => {
    const w = z[i] ?? '';
    if (s.art === 'text') return w === '' ? null : w;
    return w.trim() === '' ? null : Number(w);
  }));
  return { spalten, zeilen };
}
const spaltenwerte = (d: Daten, name: string) => { const i = d.spalten.findIndex(s => s.name.toLowerCase() === name.toLowerCase()); expect(i, `Spalte ${name} fehlt: ${d.spalten.map(s => s.name)}`).toBeGreaterThanOrEqual(0); return d.zeilen.map(z => z[i] as Zelle); };
const spaltenNamen = (d: Daten) => d.spalten.map(s => s.name);
const sp = (name: string, rest: Partial<Spalte> = {}): Spalte => ({ name, bezeichnung: '', art: 'zahl', niveau: 'metrisch', format: 'F8.0', fehlend: [], fehlendText: '', werteLabels: {}, ...rest });
const kopie = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

describe('Umkodieren: der erzeugte RECODE gegen R (und gegen das JS-Abbild umkodierWerte)', () => {
  for (const f of E.umkodieren) {
    it(`${f.name}: ${f.titel}`, () => {
      lade(f.daten);
      const inPlace = f.opt.ziel === f.opt.spalte;
      const vorher = lies();
      const b = umkodierBefehl(f.daten, f.opt);
      ok(b.syntax);
      const nachher = lies();
      const neu = spaltenwerte(nachher, f.opt.ziel);
      nahListe(neu, f.erwartet.werte, `${f.name}: PSPP gegen R`);
      nahListe(umkodierWerte(f.daten, f.opt) as Zelle[], neu, `${f.name}: JS-Abbild gegen PSPP`);
      const z = nachher.spalten.find(s => s.name === f.opt.ziel)!;
      expect(z.format, `${f.name}: Format der neuen Spalte`).toBe(f.erwartet.ziel_format);
      if (!inPlace) {
        expect(spaltenwerte(nachher, f.opt.spalte), 'die Quellspalte bleibt unverändert').toEqual(spaltenwerte(vorher, f.opt.spalte));
        expect(z.fehlend.map(Number).sort(), `${f.name}: Fehlend-Codes der neuen Spalte`).toEqual(((f.erwartet.ziel_fehlend ?? []) as number[]).slice().sort());
        expect(nachher.spalten.map(s => s.name)).toEqual([...vorher.spalten.map(s => s.name), f.opt.ziel]);
      } else expect(nachher.spalten.map(s => s.name)).toEqual(vorher.spalten.map(s => s.name));
      // Wertelabels im selben Schritt
      const lab = Object.entries(f.opt.labels as Record<string, string>);
      if (z.art === 'zahl') expect(z.werteLabels, `${f.name}: Wertelabels`).toEqual(Object.fromEntries(lab.map(([k, l]) => [String(Number(k)), l])));
      expect(nachher.zeilen.length).toBe(f.daten.zeilen.length);
    });
  }
  it('Beleg zu u3 („naiv“): ohne (MISSING=SYSMIS) fängt 4 THRU HI die 9 (Keine Angabe) ein - sie ist dann ein GÜLTIGER Wert', () => {
    const f = E.umkodieren.find((u: any) => u.name === 'u3_bereich_bis_hi');
    lade(f.daten);
    ok('RECODE x (4 THRU HI=3) (LO THRU 3=1) (ELSE=COPY) INTO naiv.\nEXECUTE.\nDESCRIPTIVES naiv.');
    nahListe(spaltenwerte(lies(), 'naiv'), f.erwartet.naiv_pspp_werte, 'naiv');
  });
  it('Beleg: ELSE=COPY kopiert die 9 mit; sie gilt in der neuen Spalte (keine Fehlend-Vereinbarung) als gültig', () => {
    const f = E.umkodieren.find((u: any) => u.name === 'u1_uebernehmen');
    lade(f.daten);
    ok('RECODE x (LO THRU 2=1) (3=2) (ELSE=COPY) INTO naiv.\nEXECUTE.');
    const d = lies();
    expect(spaltenwerte(d, 'naiv')[5]).toBe(9);
    expect(d.spalten.find(s => s.name === 'naiv')!.fehlend).toEqual([]);
  });
  it('Text: Leerzeichen HINTEN zählen nicht (PSPP füllt auf), VORN und Groß/klein schon', () => {
    const d: Daten = { spalten: [sp('s', { art: 'text', format: 'A8', niveau: 'nominal' })], zeilen: [['ja'], ['ja  '], [' ja'], ['Ja'], [null]] };
    lade(d);
    const o = { spalte: 's', ziel: 'n', regeln: [{ von: { wert: 'ja' }, nach: 1 }], uebrige: 'leer' as const, fehlend: 'leer' as const, labels: {} };
    ok(umkodierBefehl(d, o).syntax);
    expect(spaltenwerte(lies(), 'n')).toEqual([1, 1, null, null, null]);
  });
});

describe('Umpolen (umpolBefehl aus lib/skalabau.ts, unverändert wiederverwendet): Spanne aus Labels oder Daten', () => {
  for (const [name, f] of Object.entries(E.umpolen) as [string, any][]) {
    it(`${name}: Spanne ${f.spanne.min}-${f.spanne.max} (${f.quelle}), Werte wie R`, () => {
      const d: Daten = { spalten: [f.spalte], zeilen: f.werte.map((w: Zelle) => [w]) };
      lade(d);
      const alle = f.werte_alle ?? f.werte;
      expect(umpolSpanne(f.spalte, alle)).toEqual(f.fest ? umpolSpanne(f.spalte, alle) : f.spanne);
      const b = umpolBefehl(f.spalte, alle, [f.spalte.name], f.fest);
      expect({ min: b.min, max: b.max }).toEqual(f.spanne);
      ok(b.syntax);
      nahListe(spaltenwerte(lies(), b.neu), f.erwartet, name);
    });
  }
});

describe('Berechnen: Zeilenstatistik mit Mindestzahl (fehlende Werte wie PSPP)', () => {
  const z = E.berechnen.zeilen;
  beforeAll(() => { /* je Test frisch laden */ });
  it('a + b: fehlt einer, ist das Ergebnis leer', () => {
    lade(z.daten);
    ok(berechneBefehl(z.daten, { ziel: 'summe', ausdruck: z.summe_i1_i2.ausdruck }).syntax);
    nahListe(spaltenwerte(lies(), 'summe'), z.summe_i1_i2.erwartet, 'i1 + i2');
  });
  for (const [name, s] of Object.entries(z.statistik) as [string, any][]) {
    it(`${name} (Mindestzahl ${s.mindestens} → ${s.aufgeloest} von 5): Werte wie R, SUM ohne gültigen Wert leer`, () => {
      lade(z.daten);
      const b = zeilenStatistikBefehl(z.daten, { fn: s.fn, spalten: z.spalten, mindestens: s.mindestens, ziel: 'erg', bezeichnung: 'Ergebnis' });
      ok(b.syntax);
      const d = lies();
      nahListe(spaltenwerte(d, 'erg'), s.erwartet, name);
      const sa = d.spalten.find(x => x.name === 'erg')!;
      expect(sa.niveau).toBe('metrisch');
      expect(sa.art).toBe('zahl');
    });
  }
  it('die Zahl der gültigen Werte je Zeile (Probe für die Sollwerte): 5, 4, 2, 1, 0, 3, 2, 2 - der Code 99 in i3 zählt nicht', () => {
    lade(z.daten);
    ok('COMPUTE gz = NVALID(i1, i2, i3, i4, i5).\nEXECUTE.');
    nahListe(spaltenwerte(lies(), 'gz'), z.gueltige_je_zeile, 'NVALID');
  });
});

describe('Berechnen: Formel, Rechenfehler und „nur wenn“', () => {
  const r = E.berechnen.rechenfehler, b3 = E.berechnen.bedingung;
  for (const k of ['geteilt', 'ln', 'wurzel']) {
    it(`${r[k].ausdruck}: Division durch 0, LN(≤ 0), SQRT(< 0) → leer ohne Meldung; Lücken und Rechenfehler getrennt gezählt`, () => {
      lade(r.daten);
      const b = berechneBefehl(r.daten, { ziel: 'erg', ausdruck: r[k].ausdruck, dezimalen: 3 });
      const meld = e.run(b.syntax).filter(i => i.type === 'message' && /error|warning/.test((i as { severity?: string }).severity ?? ''));
      expect(meld, 'PSPP rechnet 1/0 und LN(0) still zu leer').toEqual([]);
      const d = lies();
      nahListe(spaltenwerte(d, 'erg'), r[k].erwartet, r[k].ausdruck);
      expect(leereErgebnisse(d, 'erg', r[k].eingaben)).toEqual(r[k].zaehlung);
      const sa = d.spalten.find(x => x.name === 'erg')!;
      expect(sa.format).toMatch(/^F\d+\.3$/);
      expect(sa.niveau).toBe('metrisch');
    });
  }
  it('Beleg: 0/0 ist in PSPP 0 (nicht leer!); x/0 mit x ≠ 0 ist leer - ein Hinweis „Division durch 0“ kann sich also nicht auf „Ergebnis leer“ allein verlassen', () => {
    lade({ spalten: [sp('a'), sp('b')], zeilen: [[0, 0], [5, 0], [0, 5]] });
    ok('COMPUTE q = a / b.\nEXECUTE.');
    expect(spaltenwerte(lies(), 'q')).toEqual([0, null, 0]);
  });
  it('„nur wenn“: IF-Bedingung; Fälle mit falscher oder fehlender Bedingung bleiben leer', () => {
    lade(b3.daten);
    ok(berechneBefehl(b3.daten, { ziel: 'erg', ausdruck: b3.ausdruck, bedingung: b3.bedingung.text }).syntax);
    nahListe(spaltenwerte(lies(), 'erg'), b3.erwartet, 'nur wenn');
  });
});

describe('Fälle auswählen: Auswahlspalte 1 / 0 / leer (Kleene-Logik), dann „Nur diese Fälle behalten“ = SELECT IF', () => {
  const aw = E.auswaehlen;
  for (const f of aw.faelle) {
    it(`${f.name} (${f.bedingung.text})`, () => {
      lade(aw.daten);
      const b = auswahlBefehl(aw.daten, { ziel: 'auswahl', bedingung: bedingung(f.bedingung.teile, f.bedingung.verknuepfung, aw.daten), bezeichnung: 'Auswahl' });
      ok(b.syntax);
      const d = lies();
      nahListe(spaltenwerte(d, 'auswahl'), f.auswahl, `${f.name}: Auswahlspalte gegen R`);
      expect(d.zeilen.length, 'Auswählen löscht keinen Fall').toBe(aw.daten.zeilen.length);
      expect(Object.keys(d.spalten.find(s => s.name === 'auswahl')!.werteLabels).sort(), 'Wertelabels für 1 und 0').toEqual(['0', '1']);
      const z = zaehleAuswahl(d, 'auswahl');
      expect(z).toEqual({ ...f.zaehlung, entfernt: f.entfernt });
      // behalten
      ok(behaltenBefehl('auswahl'));
      const danach = lies();
      expect(danach.zeilen.length, 'Zahl der behaltenen Fälle').toBe(f.zaehlung.erfuellt);
      expect(spaltenwerte(danach, 'id')).toEqual(f.behalten_ids);
      expect(aw.daten.zeilen.length - danach.zeilen.length, 'Zahl der entfernten Fälle (für die Rückfrage)').toBe(f.entfernt);
    });
  }
  it('Beleg: SELECT IF entfernt auch Fälle, deren Bedingung wegen Lücken nicht prüfbar ist (Satz in der Rückfrage)', () => {
    const f = aw.faelle[0];
    lade(aw.daten);
    ok(`SELECT IF (${f.bedingung.text}).\nEXECUTE.`);
    expect(lies().zeilen.length).toBe(f.zaehlung.erfuellt);
  });
});

describe('Zusammenführen: Fälle anhängen (ADD FILES)', () => {
  for (const n of ['z1_spalten_nur_in_einer', 'z2_namen_gross_klein', 'z4_textbreite']) {
    it(`${n}: Spalten nur in einer Datei → leer; Ergebnis wie R`, () => {
      const f = E.anhaengen[n];
      lade(f.a);
      ladeZweite(f.b, '/zweite.sav');
      ok(anhaengenBefehl(f.a, f.b, '/zweite.sav'));
      const d = lies();
      expect(spaltenNamen(d).map(x => x.toLowerCase())).toEqual(f.ergebnis_spalten.map((x: string) => x.toLowerCase()));
      f.ergebnis.forEach((z: Zelle[], i: number) => z.forEach((w, j) => nah(d.zeilen[i]![j] as Zelle, w, `${n} [${i}][${j}]`)));
      expect(d.zeilen.length).toBe(f.ergebnis.length);
      if (f.ergebnis_fehlend_a) expect(d.spalten.find(s => s.name === 'a')!.fehlend, 'Fehlend-Codes der ERSTEN Datei gelten').toEqual(f.ergebnis_fehlend_a);
    });
  }
  it('Beleg: Text gegen Zahl lehnt PSPP ab (Fehler) - darum die Sperre in JS', () => {
    const f = E.anhaengen.z3_typkonflikt;
    lade(f.a);
    ladeZweite(f.b, '/zweite.sav');
    expect(meldungen("ADD FILES /FILE=* /FILE='/zweite.sav'.").join('\n')).toMatch(/different types/);
  });
});

describe('Zusammenführen: Spalten über eine Kennung (MATCH FILES)', () => {
  const zm = E.zuordnen;
  const opt = (f: any, extra: object = {}) => ({ beziehung: f.beziehung, kennungA: f.kennungA, kennungB: f.kennungB, ...extra });
  function fuehrZusammen(f: any, extra: object = {}) {
    const o = opt(f, extra), b = zuordnenBefehl(f.a, f.b, o, '/zweite.sav');
    lade(f.a);
    ladeZweite(f.b, '/zweite.sav', b.vorbereitungB);
    ok(b.syntax);
    return lies();
  }
  for (const n of ['m1_viele_zu_eins', 'm2_eins_zu_eins', 'm5_kennung_fehlt_beidseitig', 'm7_text_kennung', 'm8_namenskonflikt']) {
    it(`${n}: Spalten, Werte und Zeilenfolge wie R`, () => {
      const f = zm[n];
      const d = fuehrZusammen(f, f.umbenennen ? { umbenennen: f.umbenennen } : {});
      expect(spaltenNamen(d), 'Spalten (keine Hilfsspalte übrig)').toEqual(f.ergebnis_spalten);
      expect(d.zeilen.length).toBe(f.ergebnis.length);
      f.ergebnis.forEach((z: Zelle[], i: number) => z.forEach((w, j) => nah(d.zeilen[i]![j] as Zelle, w, `${n} [${i}][${f.ergebnis_spalten[j]}]`)));
    });
  }
  it('Zahlen der Prüfung stimmen mit dem Ergebnis überein (m1: 6 Fälle, 2 Klassen nur in B fehlen)', () => {
    const f = zm.m1_viele_zu_eins, d = fuehrZusammen(f);
    expect(d.zeilen.length).toBe(f.pruefen.a.faelle);
    expect(spaltenwerte(d, 'lehrer').filter(x => x === null).length).toBe(f.pruefen.a.faelleOhnePartner + f.pruefen.a.ohneKennung);
    expect(f.pruefen.entfallenB).toBe(f.pruefen.b.faelleOhnePartner);
  });
  it('1:1: Fälle nur in B kommen ans Ende (A-Spalten leer), entfallenB = 0', () => {
    const f = zm.m2_eins_zu_eins, d = fuehrZusammen(f);
    expect(spaltenwerte(d, 'id').slice(-2)).toEqual(['P05', 'P06']);
    expect(spaltenwerte(d, 'score').slice(-2)).toEqual([null, null]);
    expect(f.pruefen.entfallenB).toBe(0);
  });
  it('Leerzeichen HINTEN bei Text-Kennungen zählen nicht (PSPP), VORN schon', () => {
    const a: Daten = { spalten: [sp('k', { art: 'text', format: 'A5', niveau: 'nominal' }), sp('x')], zeilen: [['7', 1], [' 7', 2]] };
    const b: Daten = { spalten: [sp('k', { art: 'text', format: 'A5', niveau: 'nominal' }), sp('w')], zeilen: [['7  ', 9]] };
    const o = { beziehung: 'viele:1' as const, kennungA: 'k', kennungB: 'k' }, z = zuordnenBefehl(a, b, o, '/zweite.sav');
    lade(a); ladeZweite(b, '/zweite.sav', z.vorbereitungB); ok(z.syntax);
    expect(spaltenwerte(lies(), 'w')).toEqual([9, null]);
  });
  it('Kennung heißt in B anders (klasse → kl): das Ergebnis trägt den Namen von A', () => {
    const f = zm.m8_namenskonflikt, d = fuehrZusammen(f, { umbenennen: f.umbenennen });
    expect(spaltenNamen(d)).not.toContain('klasse');
    expect(spaltenwerte(d, 'kl')).toEqual([10, 20, 30]);
  });

  // ---- Belege für das, was PSPP still falsch macht (Begründung der Sperren und Hinweise) ----
  const naiv = (f: any, tabelle = true) => {
    lade(f.a);
    ladeZweite(f.b, '/zweite.sav', `SORT CASES BY ${f.kennungB}.`);
    ok(`SORT CASES BY ${f.kennungA}.\nMATCH FILES /FILE=* /${tabelle ? 'TABLE' : 'FILE'}='/zweite.sav'${f.kennungA === f.kennungB ? '' : ` /RENAME=(${f.kennungB}=${f.kennungA})`} /BY ${f.kennungA}.\nEXECUTE.`);
    const d = lies(), pid = spaltenwerte(d, 'pid') as number[];
    return { d, nachPid: (name: string) => pid.map((p, i) => [p, spaltenwerte(d, name)[i] ?? null] as const).sort((x, y) => x[0] - y[0]).map(x => x[1]) };
  };
  it('Beleg m3: doppelte Kennung in der Tabelle - PSPP meldet nichts und nimmt die erste Zeile', () => {
    const f = zm.m3_doppelt_in_tabelle, n = naiv(f);
    nahListe(n.nachPid('lehrer'), f.pspp_naiv_lehrer, 'm3 naiv');
  });
  it('Beleg m5: PSPP verbindet leere Kennung mit leerer Kennung', () => {
    const f = zm.m5_kennung_fehlt_beidseitig, n = naiv(f);
    nahListe(n.nachPid('lehrer'), f.pspp_naiv_lehrer, 'm5 naiv');
  });
  it('Beleg m8: gleiche Spaltennamen - die Spalten der zweiten Datei fallen still weg', () => {
    const f = zm.m8_namenskonflikt, n = naiv(f);
    expect(spaltenNamen(n.d)).toEqual(f.pspp_naiv_spalten);
    expect(spaltenwerte(n.d, 'x')).toEqual([5, 6, 7]);
  });
  it('Beleg m4: 1:1 mit doppelter Kennung - Zeilen werden der Reihe nach gepaart, überzählige bleiben leer', () => {
    const f = zm.m4_eins_zu_eins_doppelt;
    lade(f.a); ladeZweite(f.b, '/zweite.sav', 'SORT CASES BY k.');
    ok("SORT CASES BY k.\nMATCH FILES /FILE=* /FILE='/zweite.sav' /BY k.\nEXECUTE.");
    expect(lies().zeilen).toEqual([[1, 1, 7], [1, 2, null], [2, 3, 8], [2, null, 9]]);
  });
  it('Beleg: NICHT sortiert gibt PSPP keine Meldung, aber falsche (fehlende) Partner', () => {
    const f = zm.m1_viele_zu_eins;
    lade(f.a);
    ladeZweite(f.b, '/zweite.sav', `SORT CASES BY ${f.kennungB}.`);
    ok("MATCH FILES /FILE=* /TABLE='/zweite.sav' /BY kl.\nEXECUTE.");
    const d = lies(), pid = spaltenwerte(d, 'pid') as number[], lehrer = spaltenwerte(d, 'lehrer');
    expect(lehrer[pid.indexOf(6)], 'pid 6 (Klasse 20, steht hinter der 30) findet ihren Partner nicht').toBeNull();
  });
  it('Beleg: Kennung Text gegen Zahl lehnt PSPP ab', () => {
    const f = zm.m6_kennung_typ;
    lade(f.a);
    ladeZweite(f.b, '/zweite.sav');
    expect(meldungen("MATCH FILES /FILE=* /TABLE='/zweite.sav' /BY k.").join('\n')).toMatch(/different types/);
  });
  it('Beleg: /IN=… gibt es in PSPP 2.1.1 nicht (darum zählt JS die Fälle ohne Partner)', () => {
    const f = zm.m1_viele_zu_eins;
    lade(f.a); ladeZweite(f.b, '/zweite.sav', 'SORT CASES BY kl.');
    expect(meldungen("SORT CASES BY kl.\nMATCH FILES /FILE=* /FILE='/zweite.sav' /BY kl /IN=inb.").join('\n')).toMatch(/error/);
  });
});

describe('Aggregieren: Kennwerte je Gruppe gegen R', () => {
  const ag = E.aggregieren;
  const KW: [Kennwert['fn'], string | undefined, string, string][] = [['N', undefined, 'k_n', 'N'], ['N', 'x', 'k_nx', 'NX'], ['NU', undefined, 'k_nu', 'NU'], ['NU', 'x', 'k_nux', 'NUX'], ['NMISS', 'x', 'k_nmiss', 'NMISS'],
    ['MEAN', 'x', 'k_mean', 'MEAN'], ['SD', 'x', 'k_sd', 'SD'], ['MEDIAN', 'x', 'k_median', 'MEDIAN'], ['MIN', 'x', 'k_min', 'MIN'], ['MAX', 'x', 'k_max', 'MAX'], ['SUM', 'x', 'k_sum', 'SUM']];
  const kennwerte: Kennwert[] = KW.map(([fn, spalte, name]) => ({ fn, ...(spalte ? { spalte } : {}), name }));

  for (const n of ['nach_g', 'nach_h_und_g']) {
    const f = ag[n];
    it(`${n}, neue Datei: eine Zeile je Gruppe wie R; der aktuelle Datensatz bleibt unverändert; MEDIAN/SUM ohne gültigen Wert leer (nicht nan)`, () => {
      lade(ag.daten);
      const vorher = lies();
      const b = aggregierenBefehl(ag.daten, { gruppen: f.gruppen, kennwerte, modus: 'neu', datei: '/gruppen.sav' });
      expect(b.namen).toEqual(kennwerte.map(k => k.name));
      ok(b.syntax);
      expect(lies(), 'aktueller Datensatz unverändert (Spalten, Zeilen, Reihenfolge)').toEqual(vorher);
      ok("GET FILE='/gruppen.sav'.");
      const d = lies();
      expect(spaltenNamen(d)).toEqual([...f.gruppen, ...kennwerte.map(k => k.name)]);
      expect(d.zeilen.length, 'Zahl der Gruppen').toBe(f.zeilen.length);
      f.zeilen.forEach((soll: any, i: number) => {
        soll.schluessel.forEach((s: Zelle, j: number) => nah(d.zeilen[i]![j] as Zelle, s, `${n} Zeile ${i} Gruppe ${f.gruppen[j]}`));
        KW.forEach(([, , name, rname], j) => nah(d.zeilen[i]![f.gruppen.length + j] as Zelle, soll[rname], `${n} Zeile ${i} ${name}`));
      });
    });
    it(`${n}, als neue Spalten (ADDVARIABLES): Gruppenwerte je Fall, Zeilenfolge und alte Spalten unverändert, keine Hilfsspalte`, () => {
      lade(ag.daten);
      const vorher = lies();
      const b = aggregierenBefehl(ag.daten, { gruppen: f.gruppen, kennwerte, modus: 'spalten' });
      ok(b.syntax);
      const d = lies();
      expect(spaltenNamen(d)).toEqual([...spaltenNamen(vorher), ...kennwerte.map(k => k.name)]);
      expect(d.zeilen.map(z => z.slice(0, vorher.spalten.length)), 'alte Spalten und Zeilenfolge unverändert').toEqual(vorher.zeilen);
      const gi = f.gruppen.map((g: string) => spaltenNamen(d).indexOf(g));
      d.zeilen.forEach((z, r) => {
        const soll = f.zeilen.find((x: any) => x.schluessel.every((s: Zelle, j: number) => s === (z[gi[j]] ?? null)));
        expect(soll, `Gruppe von Zeile ${r + 1}`).toBeDefined();
        KW.forEach(([, , name, rname], j) => nah(z[vorher.spalten.length + j] as Zelle, soll[rname], `${n} Zeile ${r + 1} ${name}`));
      });
    });
  }
  it('Gruppe mit benutzerdefiniert fehlendem Code (9): PSPP bildet eine EXTRA-Gruppe - gruppenUebersicht zählt sie mit', () => {
    const f = ag.gruppe_mit_9;
    lade(f.daten);
    const b = aggregierenBefehl(f.daten, { gruppen: f.gruppen, kennwerte: [{ fn: 'N', name: 'k_n' }, { fn: 'MEAN', spalte: 'x', name: 'k_mean' }], modus: 'neu', datei: '/gruppen.sav' });
    ok(b.syntax); ok("GET FILE='/gruppen.sav'.");
    const d = lies();
    expect(d.zeilen.length).toBe(f.uebersicht.gruppen);
    expect(gruppenUebersicht(f.daten, f.gruppen)).toEqual(f.uebersicht);
    f.zeilen.forEach((soll: any, i: number) => { nah(d.zeilen[i]![0] as Zelle, soll.schluessel[0], `Gruppe ${i}`); nah(d.zeilen[i]![1] as Zelle, soll.N, `N ${i}`); nah(d.zeilen[i]![2] as Zelle, soll.MEAN, `MEAN ${i}`); });
  });
  it('gruppenUebersicht() gegen die Zeilenzahl, die PSPP wirklich bildet', () => {
    lade(ag.daten);
    for (const g of [['g'], ['h', 'g']]) {
      ok(`AGGREGATE /OUTFILE='/u.sav' /BREAK=${g.join(' ')} /n=N.`); ok("GET FILE='/u.sav'."); const d = lies();
      expect(gruppenUebersicht(ag.daten, g).gruppen, g.join('+')).toBe(d.zeilen.length);
      lade(ag.daten);
    }
  });
  it('Beleg: MEDIAN ohne gültigen Wert ist in PSPP 2.1.3 fehlend (2.1.1: NaN), alle anderen Kennwerte sind leer; ohne SORT CASES geht es trotzdem', () => {
    lade(ag.daten);
    ok("AGGREGATE /OUTFILE='/roh.sav' /BREAK=g /n=N(x) /md=MEDIAN(x) /m=MEAN(x) /su=SUM(x).\nGET FILE='/roh.sav'.");
    const d = lies(), g4 = d.zeilen.find(z => z[0] === 4)!;
    expect(g4[1]).toBe(0);
    expect(g4[2], 'MEDIAN ohne gültigen Wert').toBeNull(); // PSPP 2.1.3 (a53f3b3): Fehlend wie die anderen; 2.1.1 gab NaN
    expect(g4[3]).toBeNull();
    expect(g4[4]).toBeNull();
  });
  it('Beleg: N ohne Klammer zählt Fälle, N(x) gültige Werte; NU(x) = N(x) (keine Gewichte) - das Fachblatt „N/NU mit/ohne fehlende“ stimmt nicht', () => {
    lade(ag.daten);
    ok("AGGREGATE /OUTFILE='/nu.sav' /BREAK=g /n=N /nx=N(x) /nu=NU /nux=NU(x) /nm=NMISS(x).\nGET FILE='/nu.sav'.");
    const d = lies(), g2 = d.zeilen.find(z => z[0] === 2)!;
    expect(g2.slice(1)).toEqual([4, 3, 4, 3, 1]);
  });
  it('Fehler schon in JS: Mittelwert einer Textspalte', () => {
    expect(() => aggregierenBefehl(ag.daten, { gruppen: ['g'], kennwerte: [{ fn: 'MEAN', spalte: 'h', name: 'm' }], modus: 'spalten' })).toThrow();
  });
});

describe('Doppelte Fälle: JS-Normalisierung gegen PSPP (MATCH FILES /FIRST) - wo sie gleich sind und wo nicht', () => {
  const dd = E.doppelte;
  const psppErst = (spalten: string[]) => {
    ok(`COMPUTE zz_nr = $CASENUM.\nSORT CASES BY ${spalten.join(' ')} zz_nr.\nMATCH FILES /FILE=* /BY ${spalten.join(' ')} /FIRST=zz_erst.\nSORT CASES BY zz_nr.\nEXECUTE.`);
    return (spaltenwerte(lies(), 'zz_erst') as number[]).map(v => 1 - v);
  };
  it('„genau“: dieselben Wiederholungen wie PSPP - ausser Zeile 6 (é zusammengesetzt gegen é aus e + Akzent): PSPP vergleicht Bytes, Statable normalisiert (NFC)', () => {
    lade(dd.daten);
    const pspp = psppErst(['name', 'plz']);
    const js = doppelteFaelle(dd.daten, { spalten: ['name', 'plz'], genau: true }).markierung;
    expect(js).toEqual(dd.genau.markierung);
    const ohneNfc = js.slice(); ohneNfc[5] = 0;
    expect(pspp, 'PSPP = Statable „genau“ minus die NFC-Zeile').toEqual(ohneNfc);
    expect(pspp[5], 'PSPP sieht Zeile 6 NICHT als Wiederholung').toBe(0);
    expect(js[5], 'Statable schon').toBe(1);
  });
  it('„genau“, nur Name: ebenfalls gleich bis auf die NFC-Zeile', () => {
    lade(dd.daten);
    const pspp = psppErst(['name']), js = doppelteFaelle(dd.daten, { spalten: ['name'], genau: true }).markierung;
    const ohneNfc = js.slice(); ohneNfc[5] = 0;
    expect(pspp).toEqual(ohneNfc);
  });
  it('Zahlen: PSPP vergleicht bitgenau (0,1 + 0,2 ≠ 0,3); Statable rechnet auf 15 gültige Stellen', () => {
    const d = dd.zahlen.daten as Daten;
    lade({ spalten: [d.spalten[0]!], zeilen: d.zeilen.map(z => [z[0]!]) });
    const pspp = psppErst(['v']), js = doppelteFaelle(d, { spalten: ['v'] }).markierung;
    expect(js).toEqual(dd.zahlen.markierung);
    expect(pspp[1], '1 und 1,0 sind gleich').toBe(1);
    expect(pspp[3], 'PSPP: 0,30000000000000004 ≠ 0,3').toBe(0);
    expect(js[3], 'Statable: gleich').toBe(1);
    expect(pspp[5], '15-stellige Kennungen bleiben verschieden').toBe(0);
  });
  it('Fehlend: PSPP kennt „leer = Fehlend-Code 99“ nicht (Zeile 3 ≠ Zeile 2), Statable setzt sie gleich (Schalter fehlendGleich)', () => {
    const d = dd.fehlend.daten as Daten;
    lade(d);
    const pspp = psppErst(['k', 't']), js = doppelteFaelle(d, { spalten: ['k', 't'], fehlendGleich: true }).markierung;
    expect(js).toEqual(dd.fehlend.gleich.markierung);
    expect(pspp).toEqual([0, 0, 0, 0, 1, 0, 0]);
    expect(js[2]).toBe(1);
  });
  it('Markierspalte laden und „Wiederholungen entfernen“ (SELECT IF doppelt = 0): bleibt jeder erste Fall, Wiederholungen weg', () => {
    const m = markiereDoppelte(dd.daten, { spalten: ['name', 'plz'] });
    lade(m);
    const vorher = lies();
    expect(Object.keys(vorher.spalten.at(-1)!.werteLabels).sort()).toEqual(['0', '1']);
    ok(behaltenBefehl('doppelt', 0));
    const nachher = lies();
    const erste = dd.normalisiert.markierung.map((v: number, i: number) => (v === 0 ? i + 1 : 0)).filter(Boolean);
    expect(spaltenwerte(nachher, 'nr')).toEqual(erste);
    expect(vorher.zeilen.length - nachher.zeilen.length).toBe(dd.normalisiert.wiederholungen);
    expect(spaltenwerte(nachher, 'doppelt').every(v => v === 0)).toBe(true);
  });
  it('Alle Spalten: bei eindeutiger Nummer keine Wiederholung', () => {
    expect(doppelteFaelle(dd.daten, { spalten: [] }).wiederholungen).toBe(0);
  });
});

describe('Zwischenprobe: die JSON-Rohdaten selbst', () => {
  it('Anzahl der Fälle je Fixture ist stimmig (Schutz gegen versehentlich geänderte Eingaben)', () => {
    expect(kopie(E.umkodieren).length).toBe(11);
    expect(E.berechnen.zeilen.daten.zeilen.length).toBe(8);
    expect(E.aggregieren.daten.zeilen.length).toBe(16);
    expect(E.doppelte.daten.zeilen.length).toBe(12);
  });
});
