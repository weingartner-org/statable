import { describe, expect, it } from 'vitest';
import erwartet from './testdaten/welle5-erwartet.json';
import type { Spalte } from './verzeichnis';
import { skalenwertBefehl } from './skalabau';
import {
  AssistentFehler, aggregierenBefehl, anhaengenBefehl, anhaengenPruefen, auswahlBefehl, bedingung, behaltenBefehl, berechneBefehl, doppelteFaelle, gruppenUebersicht,
  istFehlend, kennwertName, leereErgebnisse, markiereDoppelte, mindestzahl, namenskonflikte, normalisiereKennung, normalisiereText, textVarianten, umkodierBefehl,
  umkodierVorschau, umkodierWerte, umpolQuelle, zaehleAuswahl, zeilenStatistikBefehl, zuordnenBefehl, zuordnenPruefen, type Daten, type Kennwert
} from './datenassistent';

/* ===== Fachblatt Welle 5 (docs/fachblaetter/WELLE5-DATEN-ASSISTENTEN.md, der „Nachtrag nach der Landkarte“ geht vor): Daten-Assistenten + doppelte Fälle =====
 * REINE FUNKTIONEN des Moduls app/src/lib/datenassistent.ts - kein PSPP in diesem Test (das steht in datenassistent-pspp.test.ts, dort laufen die erzeugten Befehle echt).
 * Sollwerte: scripts/welle5-erwartet.R → testdaten/welle5-erwartet.json (R, eigener Code). Der Bauer ändert weder Test noch Skript noch JSON.
 *
 * ---------------------------------- API (festgelegt vom Prüfer; Modul lib/datenassistent.ts) ----------------------------------
 *  Alles arbeitet auf `Daten = { spalten: Spalte[]; zeilen: Wert[][] }` (Typ aus lib/umformen.ts, Wert = string | number | null; null = leer). Das Modul exportiert auch die Typen `Daten` und `Kennwert`.
 *  Fehler: `class AssistentFehler extends Error { code: string; details?: unknown }`. Codes: 'ueberschreiben' (Zielname gibt es schon, `ueberschreiben` fehlt - NIE still überschreiben),
 *  'name' (kein PSPP-Name, `gueltigerName` aus skalabau.ts), 'spalte' (Spalte gibt es nicht / hat den falschen Typ), 'regeln' (keine Regel), 'gemischt' (neue Werte teils Zahl, teils Text),
 *  'ausdruck' (leer), 'sperre' (Zusammenführen nicht erlaubt; details = Liste/Objekt der Gründe), 'kennwertText' (Mittelwert o. ä. einer Textspalte), 'datei' (Aggregieren „neu“ ohne Dateipfad).
 *  Wiederverwendet, NICHT verdoppelt (aus lib/skalabau.ts): `freierName`, `gueltigerName`, `skalenwertBefehl` (Mittelwert = dieselbe Funktion), `umpolBefehl`/`umpolSpanne`.
 *
 *  Gemeinsam
 *   bedingung(teile: {spalte, op: '='|'<>'|'<'|'<='|'>'|'>=', wert: number|string}[], verknuepfung: 'AND'|'OR' = 'AND', d?: Daten): string      → "alter >= 18 AND gruppe = 1", Text in '…' mit '' für Apostroph
 *      Mit `d`: Vergleiche auf TEXT-Spalten werden so geschrieben, dass eine leere Zelle (oder ein Fehlend-Code der Spalte) „nicht prüfbar“ = leer ergibt. PSPP liefert bei Text sonst „falsch“ (0) -
 *      `geschl <> 'w'` würde leere Zellen EINSCHLIESSEN (Test „oder_text“ in datenassistent-pspp.test.ts). Zahlenspalten bleiben unverändert (dort ist die Bedingung mit Fehlend schon leer).
 *   istFehlend(sp: Spalte, v: Wert): boolean          null, '' / nur Leerraum, NaN, Code aus sp.fehlend (Zahl) bzw. sp.fehlendText (Text)
 *   normalisiereText(t: string, genau: boolean): string   immer NFC; genau = false: zusätzlich Leerraum am Rand weg (auch geschütztes Leerzeichen) und klein geschrieben
 *   textVarianten(werte: Wert[]): { schluessel: string; varianten: { wert: string; anzahl: number }[] }[]     Schreibweisen, die sich nur in Groß/klein/Rand-Leerraum unterscheiden (≥ 2 verschiedene Rohwerte)
 *  Umkodieren (D1a)
 *   UmkodierOpt = { spalte, ziel, regeln: {von: Alt, nach: number|string}[], uebrige: 'uebernehmen'|'leer'|{wert}, fehlend: 'leer'|'behalten', labels: Record<string,string>, ueberschreiben?: boolean }
 *   Alt = {wert: number|string} | {bereich: [number|null, number|null]} (null = LOWEST/HIGHEST) | {fehlend: 'MISSING'|'SYSMIS'}
 *   Reihenfolge der Regeln in PSPP (erster Treffer gewinnt): 1. ausdrückliche MISSING/SYSMIS-Regeln, 2. die Fehlend-Voreinstellung (`(MISSING=SYSMIS)` bzw. `(MISSING='')` bei Text-Ziel;
 *   bei 'behalten' `(MISSING=COPY)` + `MISSING VALUES <ziel> (<Codes der Quelle>)`), 3. Wert-Regeln in der gegebenen Reihenfolge, 4. `ELSE`: 'uebernehmen' → (ELSE=COPY), 'leer' → keines (bei überschreiben: (ELSE=SYSMIS)),
 *   {wert} → (ELSE=wert). Grund (Falle 5): PSPP lässt Bereiche und ELSE benutzerdefiniert Fehlende einfangen - ohne das Voranstellen wird aus „Keine Angabe“ ein gültiger Wert.
 *   umkodierWerte(d, o): Wert[]                  die neue Spalte als Werte, wie PSPP sie bildet (Text byte-genau; Leerzeichen HINTEN zählen nicht, PSPP füllt auf)
 *   umkodierVorschau(d, o): {alt: Wert, neu: Wert, anzahl: number}[]     Zahlen aufsteigend, Text in Reihenfolge des Auftretens, leer (null) zuletzt; alt = ROHER Wert (9 bleibt 9)
 *   umkodierBefehl(d, o): { syntax: string; ziel: string; format: string; hinweise: {art: 'textVarianten', gruppen: ReturnType<typeof textVarianten>}[] }
 *      Neue Zahlenspalte: Format F8.<Nachkommastellen der tatsächlichen neuen Werte, höchstens 6>; Text-Ziel: STRING-Zeile vor RECODE, Breite = max(Breite der Quelle, längster neuer Text); bei ziel = spalte (überschreiben)
 *      kein INTO, kein STRING, Format bleibt (format = Format der Quelle). VALUE LABELS der neuen Spalte im selben Schritt.
 *  Umpolen (vorhanden: umpolBefehl in skalabau.ts) - neu nur umpolQuelle(sp, werte, fest?): 'fest' | 'labels' | 'daten'   „woher die Spanne kommt“ (der Satz sagt es)
 *  Berechnen (D1b)
 *   mindestzahl(k: number, wahl: number | 'haelfte'): number           'haelfte' = ⌈k/2⌉; Zahlen auf 1…k begrenzt
 *   zeilenStatistikBefehl(d, {fn: 'MEAN'|'SUM'|'MIN'|'MAX'|'SD', spalten, mindestens: number|'haelfte', ziel, bezeichnung, ueberschreiben?}): { syntax; ziel; mindestens: number }
 *      MEAN: syntax ist EXAKT skalenwertBefehl(spalten, ziel, bezeichnung, mindestens) („eine Funktion, nicht zwei“). Voreinstellung der Oberfläche ist 1 (Nachtrag 1), nicht die Hälfte.
 *   berechneBefehl(d, {ziel, ausdruck, bedingung?, dezimalen?, bezeichnung?, ueberschreiben?}): { syntax; ziel }       ohne Bedingung COMPUTE, mit Bedingung IF (…) (andere Fälle bleiben leer);
 *      FORMATS mit `dezimalen` Nachkommastellen (Voreinstellung 2), VARIABLE LEVEL SCALE
 *   leereErgebnisse(nachher: Daten, ziel, eingaben: string[]): { leer, luecken, rechenfehler }      leer = Fälle mit leerem Ergebnis; luecken = davon mit mindestens einer fehlenden Eingabe;
 *      rechenfehler = davon mit lauter gültigen Eingaben (Division durch 0, LN(≤ 0), SQRT(< 0))
 *  Fälle auswählen (D1c) - KEIN Filter (Nachtrag 2)
 *   auswahlBefehl(d, {ziel, bedingung, bezeichnung?, ueberschreiben?}): { syntax; ziel }         Auswahlspalte 1 = erfüllt, 0 = nicht, leer = wegen Lücken nicht prüfbar (Kleene-Logik wie PSPP/R)
 *   zaehleAuswahl(d, spalte): { erfuellt, nicht, leer, entfernt }                                  entfernt = nicht + leer = Fälle, die „Nur diese Fälle behalten“ entfernt
 *   behaltenBefehl(spalte, wert = 1): string                                                       SELECT IF (spalte = wert). + EXECUTE.   (auch für doppelte Fälle: behaltenBefehl('doppelt', 0))
 *  Zusammenführen (D1d)
 *   anhaengenPruefen(a, b): { nurA: string[]; nurB: string[]; gemeinsam: string[] (Schreibweise von A); typkonflikte: {name, a: Art, b: Art}[]; moeglich: boolean }   Namen ohne Beachtung von Groß/klein; Konflikt = Text gegen Zahl
 *   anhaengenBefehl(a, b, dateiB): string          ADD FILES; wirft 'sperre' (details = die Prüfung) bei Typkonflikt
 *   zuordnenPruefen(a, b, o: {beziehung: '1:1'|'viele:1', kennungA, kennungB, umbenennen?: Record<string,string>}): {
 *        a, b: { faelle, ohneKennung, ohnePartner: Wert[] (verschiedene Kennungen ohne Partner, Reihenfolge des Auftretens), faelleOhnePartner, doppelt: Wert[] };
 *        entfallenB: number (Fälle der zweiten Datei, die NICHT im Ergebnis stehen: ohne Kennung, bei viele:1 zusätzlich die ohne Partner); sperren: Sperre[]; hinweise: {art:'schreibweise', zusaetzlich}[] }
 *      „Kennung gleich“ wie in PSPP: Zahl numerisch, Text byte-genau außer Leerzeichen hinten. Ohne Kennung = leer / Fehlend-Code: findet NIE einen Partner (PSPP würde leer mit leer verbinden).
 *      Sperren (Reihenfolge): {art:'typ', a, b} (Zahl gegen Text) · {art:'doppelt', seite:'a', kennungen} (nur bei 1:1) · {art:'doppelt', seite:'b', kennungen} (bei 1:1 und viele:1) · {art:'namen', konflikte} (gleiche Spaltennamen, nicht umbenannt).
 *      Hinweis 'schreibweise': so viele verschiedene Kennungen von A ohne Partner hätten einen nach normalisiereKennung (nur wenn beide Kennungen Text).
 *   namenskonflikte(a, b, kennungB): {name, vorschlag}[]      Spalten von B (ausser der Kennung) mit gleichem Namen wie in A; Vorschlag `<name>_2`, ist das vergeben `_3` …
 *   normalisiereKennung(w: Wert): string                      Zahl → Text; Text: NFC, Rand-Leerraum weg, klein, bei nur Ziffern ohne führende Nullen („007“ = „7“, „000“ = „0“)
 *   zuordnenBefehl(a, b, o, dateiB): { syntax: string; vorbereitungB: string }   wirft 'sperre' (details = Sperren). Ablauf der Oberfläche: B einlesen → `vorbereitungB` ausführen (Fälle ohne Kennung entfernen, nach Kennung
 *      sortieren) → als .sav nach dateiB speichern → A wieder aktiv → `syntax` ausführen. Ergebnis: Zeilen von A in der alten Reihenfolge, bei 1:1 danach die Fälle nur aus B (nach Kennung);
 *      viele:1 = MATCH FILES /TABLE (B-only fällt weg), 1:1 = /FILE + /FILE (beide bleiben); Kennung von B heißt im Ergebnis wie die von A (/RENAME); `umbenennen` (B-Name → neuer Name) per /RENAME;
 *      Hilfsspalten sind am Ende weg.
 *  Aggregieren (D1e)
 *   Kennwert = {fn: 'N'|'NU'|'NMISS'|'MEAN'|'SD'|'MEDIAN'|'MIN'|'MAX'|'SUM', spalte?: string, name: string}      N/NU ohne Spalte = Fälle der Gruppe; mit Spalte = gültige Werte. (NU = ungewichtet = hier gleich N.)
 *   kennwertName(spalte|undefined, fn, vorhandene): string       `<spalte>_<fn klein>` bzw. `<fn klein>`, über freierName eindeutig
 *   gruppenUebersicht(d, gruppen): { gruppen: number; ohneAngabe: number }      Zahl der Gruppen wie PSPP sie bildet (fehlend = eine eigene Gruppe, benutzerdefiniert fehlend 9 = EINE WEITERE), ohneAngabe = Fälle mit leerer/fehlender Gruppenangabe
 *   aggregierenBefehl(d, {gruppen, kennwerte, modus: 'spalten'|'neu', datei?}): { syntax: string; namen: string[] }
 *      'spalten': AGGREGATE … MODE=ADDVARIABLES - neue Spalten am Ende in der Reihenfolge der Kennwerte, Zeilenfolge unverändert, keine Hilfsspalte übrig.
 *      'neu': Ergebnis als .sav nach `datei`; der aktuelle Datensatz bleibt unverändert. In beiden Fällen: MEDIAN einer Gruppe ohne gültigen Wert ist LEER (PSPP liefert NaN!).
 *  Doppelte Fälle (D2)
 *   doppelteFaelle(d, {spalten: string[] (leer = alle), genau?: boolean = false, fehlendGleich?: boolean = true}): { markierung: (0|1)[]; gruppen: {zeilen: number[] (ab 1), anzahl}[]; wiederholungen; nichtPruefbar }
 *      Gleich = Text NFC (+ ohne Rand-Leerraum und klein, wenn !genau); Zahlen auf 15 gültige Stellen; leer / Fehlend-Code = fehlend; fehlendGleich = false → Fälle mit einem fehlenden Wert in den
 *      gewählten Spalten sind nicht prüfbar (markierung 0, gezählt in nichtPruefbar). Erster Fall einer Gruppe = 0, Wiederholungen = 1. Gruppen nach der ersten Zeile geordnet.
 *   markiereDoppelte(d, opt, name = 'doppelt'): Daten      neue Spalte hinten (freierName), Zahl, nominal, Format F1.0, Wertelabels für 0 und 1; die Eingabe wird nicht verändert
 * --------------------------------------------------------------------------------------------------------------------------------- */

const E = erwartet as any;
const gleichZahl = (ist: any, soll: any, was: string) => {
  expect(ist.length, `${was}: Länge`).toBe(soll.length);
  soll.forEach((s: number | string | null, i: number) => {
    if (s === null) expect(ist[i], `${was} [${i}]`).toBeNull();
    else if (typeof s === 'string') expect(ist[i], `${was} [${i}]`).toBe(s);
    else { expect(typeof ist[i], `${was} [${i}]`).toBe('number'); expect(Math.abs(ist[i] - s), `${was} [${i}]: ${ist[i]} gegen ${s}`).toBeLessThanOrEqual(1e-9 * Math.max(1, Math.abs(s))); }
  });
};
const fehler = (f: () => unknown): AssistentFehler => { try { f(); } catch (e) { expect(e).toBeInstanceOf(AssistentFehler); return e as AssistentFehler; } throw new Error('es wurde kein Fehler geworfen'); };
const sp = (name: string, rest: Partial<Spalte> = {}): Spalte => ({ name, bezeichnung: '', art: 'zahl', niveau: 'metrisch', format: 'F8.0', fehlend: [], fehlendText: '', werteLabels: {}, ...rest });
const mitSpalte = (d: Daten, s: Spalte, werte: (number | string | null)[]): Daten => ({ spalten: [...d.spalten, s], zeilen: d.zeilen.map((z, i) => [...z, werte[i] ?? null]) });

describe('Gemeinsames: Bedingung, Fehlend, Normalisierung', () => {
  it('bedingung(): Spalte, Vergleich, Wert; Text in Anführungszeichen mit verdoppeltem Apostroph', () => {
    expect(bedingung([{ spalte: 'alter', op: '>=', wert: 18 }])).toBe('alter >= 18');
    for (const f of E.auswaehlen.faelle) expect(bedingung(f.bedingung.teile, f.bedingung.verknuepfung), f.name).toBe(f.bedingung.text);
    expect(bedingung(E.berechnen.bedingung.bedingung.teile)).toBe(E.berechnen.bedingung.bedingung.text);
    expect(bedingung(E.auswaehlen.apostroph.teile, E.auswaehlen.apostroph.verknuepfung)).toBe(E.auswaehlen.apostroph.text);
    expect(bedingung([{ spalte: 'x', op: '<>', wert: -1.5 }, { spalte: 'y', op: '<=', wert: 0 }], 'OR')).toBe('x <> -1.5 OR y <= 0');
  });
  it('bedingung() mit Daten: Textspalten werden gegen leere Zellen abgesichert, Zahlenspalten bleiben wie sie sind', () => {
    const f = E.auswaehlen.faelle[2];                                      // geschl = 'w' OR alter < 18
    const t = bedingung(f.bedingung.teile, f.bedingung.verknuepfung, E.auswaehlen.daten);
    expect(t).toContain("geschl = 'w'");
    expect(t).toContain('alter < 18');
    expect(t).not.toBe(f.bedingung.text);
    expect(t).toMatch(/OR/);
    const z = E.auswaehlen.faelle[0];                                      // nur Zahlen
    expect(bedingung(z.bedingung.teile, z.bedingung.verknuepfung, E.auswaehlen.daten)).toBe(z.bedingung.text);
    expect(bedingung(f.bedingung.teile, f.bedingung.verknuepfung), 'ohne Daten unverändert').toBe(f.bedingung.text);
  });
  it('istFehlend(): leer, Leerraum, Fehlend-Code der Spalte; nicht 0 und nicht normaler Text', () => {
    const z = sp('z', { fehlend: [9, 99], fehlendText: '9, 99' }), t = sp('t', { art: 'text', format: 'A5', fehlendText: 'k.A.' });
    expect([null, 9, 99, NaN].map(v => istFehlend(z, v))).toEqual([true, true, true, true]);
    expect([0, 1, 98].map(v => istFehlend(z, v))).toEqual([false, false, false]);
    expect([null, '', '  ', 'k.A.'].map(v => istFehlend(t, v))).toEqual([true, true, true, true]);
    expect(['x', '0', 'ka'].map(v => istFehlend(t, v))).toEqual([false, false, false]);
  });
  it('normalisiereText(): NFC immer; Rand-Leerraum (auch geschütztes Leerzeichen) und Groß/klein nur ohne „genau“', () => {
    expect(normalisiereText('Äsop', true)).toBe('Äsop');
    expect(normalisiereText(' Anna ', true)).toBe(' Anna ');
    expect(normalisiereText(' Anna Berg ', false)).toBe('anna berg');
    expect(normalisiereText('Anna  Berg', false)).toBe('anna  berg');         // Leerzeichen INNEN bleiben
    expect(normalisiereText('Straße', false)).not.toBe(normalisiereText('STRASSE', false));
  });
  it('textVarianten(): findet Schreibweisen, die sich nur in Groß/klein und Rand-Leerzeichen unterscheiden', () => {
    const f = E.umkodieren.find((u: any) => u.name === 'u8_text_zahl');
    const werte = f.daten.zeilen.map((z: any) => z[0]);
    expect(textVarianten(werte)).toEqual(f.erwartet.varianten);
    expect(textVarianten(['a', 'b', 'a', null, '', 'c'])).toEqual([]);            // gleiche Rohwerte sind keine Varianten
  });
});

describe('Umkodieren (D1a)', () => {
  for (const f of E.umkodieren) {
    describe(f.name, () => {
      it(`${f.titel}: neue Werte wie R`, () => { gleichZahl(umkodierWerte(f.daten, f.opt).map(v => v), f.erwartet.werte.map((v: any) => v), f.name); });
      it('Befehl: Zielname, Format und Hinweise', () => {
        const b = umkodierBefehl(f.daten, f.opt);
        expect(b.ziel).toBe(f.opt.ziel);
        expect(b.format).toBe(f.erwartet.ziel_format);
        if (f.name === 'u8_text_zahl' || f.name === 'u10_text_text' || f.name === 'u9_text_zahl_uebrige_wert' || f.name === 'u11_apostroph')
          expect(b.hinweise, 'Text-Spalte mit Groß/klein- und Randleerzeichen-Varianten → Hinweis').toEqual([{ art: 'textVarianten', gruppen: E.umkodieren.find((u: any) => u.name === 'u8_text_zahl').erwartet.varianten }]);
        else expect(b.hinweise, 'Zahlenspalte → kein Hinweis').toEqual([]);
        expect(b.syntax).toMatch(/\nEXECUTE\.$/);
      });
    });
  }
  const u = (n: string) => E.umkodieren.find((x: any) => x.name === n);

  it('Vorschau alt × neu: Zahlen aufsteigend, Text nach Auftreten, leer zuletzt (9 bleibt als roher Wert sichtbar)', () => {
    for (const n of ['u1_uebernehmen', 'u2_leer', 'u8_text_zahl']) expect(umkodierVorschau(u(n).daten, u(n).opt), n).toEqual(u(n).erwartet.vorschau);
    const v = umkodierVorschau(u('u1_uebernehmen').daten, u('u1_uebernehmen').opt);
    expect(v.reduce((s, e) => s + e.anzahl, 0)).toBe(10);
  });
  it('Befehl für die neue Spalte: RECODE … INTO, Fehlend-Regel VOR den Bereichen, ELSE=COPY nur bei „übernehmen“', () => {
    const a = umkodierBefehl(u('u1_uebernehmen').daten, u('u1_uebernehmen').opt).syntax;
    expect(a).toMatch(/^RECODE x /m);
    expect(a).toContain('INTO x_neu');
    expect(a.indexOf('(MISSING=SYSMIS)')).toBeGreaterThan(-1);
    expect(a.indexOf('(MISSING=SYSMIS)')).toBeLessThan(a.search(/LO(WEST)? THRU 2=1/));
    expect(a).toMatch(/\(3=2\)/);
    expect(a).toContain('(ELSE=COPY)');
    expect(a).toMatch(/VALUE LABELS x_neu 1 'niedrig' 2 'mittel'\./);
    expect(a).toMatch(/FORMATS x_neu \(F8\.1\)\./);
    const l = umkodierBefehl(u('u2_leer').daten, u('u2_leer').opt).syntax;
    expect(l).not.toContain('ELSE=COPY');
    expect(l).toMatch(/FORMATS x_neu \(F8\.0\)\./);
    const hi = umkodierBefehl(u('u3_bereich_bis_hi').daten, u('u3_bereich_bis_hi').opt).syntax;
    expect(hi.indexOf('(MISSING=SYSMIS)')).toBeLessThan(hi.search(/4 THRU HI(GHEST)?=3/));
  });
  it('„Keine Angabe behalten“: (MISSING=COPY) und die Codes der Quelle in MISSING VALUES der neuen Spalte', () => {
    const s = umkodierBefehl(u('u4_fehlend_behalten').daten, u('u4_fehlend_behalten').opt).syntax;
    expect(s).toContain('(MISSING=COPY)');
    expect(s).not.toContain('(MISSING=SYSMIS)');
    expect(s).toMatch(/MISSING VALUES x_neu \(9\)\./);
  });
  it('MISSING und SYSMIS ausdrücklich: stehen VOR der Voreinstellung (sonst fängt sie die Werte ab)', () => {
    const s = umkodierBefehl(u('u5_sysmis_ausdruecklich').daten, u('u5_sysmis_ausdruecklich').opt).syntax;
    expect(s.indexOf('(SYSMIS=77)')).toBeGreaterThan(-1);
    expect(s.indexOf('(SYSMIS=77)')).toBeLessThan(s.indexOf('(MISSING=SYSMIS)'));
    const m = umkodierBefehl(u('u6_missing_ausdruecklich').daten, u('u6_missing_ausdruecklich').opt).syntax;
    expect(m).toContain('(MISSING=55)');
  });
  it('Text: STRING-Zielspalte vor RECODE, Text in Anführungszeichen, Apostroph verdoppelt', () => {
    const a = umkodierBefehl(u('u10_text_text').daten, u('u10_text_text').opt).syntax;
    expect(a.indexOf('STRING s_neu (A12).')).toBeGreaterThan(-1);
    expect(a.indexOf('STRING s_neu (A12).')).toBeLessThan(a.indexOf('RECODE s'));
    expect(a).toContain("('ja'='J')");
    expect(a).toContain('(ELSE=COPY)');
    expect(umkodierBefehl(u('u11_apostroph').daten, u('u11_apostroph').opt).syntax).toContain("('ja'='it''s')");
    const z = umkodierBefehl(u('u8_text_zahl').daten, u('u8_text_zahl').opt).syntax;
    expect(z).not.toContain('STRING');
    expect(z).toContain("('ja'=1)");
    expect(umkodierBefehl(u('u9_text_zahl_uebrige_wert').daten, u('u9_text_zahl_uebrige_wert').opt).syntax).toContain('(ELSE=99)');
  });
  it('Überschreiben nur ausdrücklich: ohne ueberschreiben Fehler, mit ueberschreiben kein INTO und das Format bleibt', () => {
    const f = u('u7_ueberschreiben');
    const b = umkodierBefehl(f.daten, f.opt);
    expect(b.syntax).not.toContain('INTO');
    expect(b.syntax).toMatch(/^RECODE x /m);
    expect(b.format).toBe('F8.1');
    const ohne = fehler(() => umkodierBefehl(f.daten, { ...f.opt, ueberschreiben: false }));
    expect(ohne.code).toBe('ueberschreiben');
    const anderes = fehler(() => umkodierBefehl({ ...f.daten, spalten: [...f.daten.spalten, sp('y')], zeilen: f.daten.zeilen.map((z: any) => [...z, 1]) }, { ...f.opt, ziel: 'y', ueberschreiben: undefined }));
    expect(anderes.code, 'auch eine ANDERE vorhandene Spalte wird nicht still überschrieben').toBe('ueberschreiben');
    // in der Spalte selbst: „übrige leer“ muss ausdrücklich ELSE=SYSMIS sagen (sonst bleiben die übrigen Werte stehen)
    expect(umkodierBefehl(f.daten, { ...f.opt, uebrige: 'leer' }).syntax).toContain('(ELSE=SYSMIS)');
  });
  it('Fehler: ungültiger Zielname, keine Regeln, unbekannte Spalte, Zahl und Text gemischt', () => {
    const f = u('u1_uebernehmen');
    expect(fehler(() => umkodierBefehl(f.daten, { ...f.opt, ziel: 'x neu' })).code).toBe('name');
    expect(fehler(() => umkodierBefehl(f.daten, { ...f.opt, ziel: '1x' })).code).toBe('name');
    expect(fehler(() => umkodierBefehl(f.daten, { ...f.opt, regeln: [] })).code).toBe('regeln');
    expect(fehler(() => umkodierBefehl(f.daten, { ...f.opt, spalte: 'gibtsnicht' })).code).toBe('spalte');
    expect(fehler(() => umkodierBefehl(f.daten, { ...f.opt, regeln: [{ von: { wert: 1 }, nach: 1 }, { von: { wert: 2 }, nach: 'zwei' }] })).code).toBe('gemischt');
  });
  it('Text-Quelle: Leerzeichen HINTEN zählen nicht (PSPP füllt auf), Leerzeichen VORN und Groß/klein schon', () => {
    const d: Daten = { spalten: [sp('s', { art: 'text', format: 'A8', niveau: 'nominal' })], zeilen: [['ja'], ['ja  '], [' ja'], ['Ja']] };
    const o = { spalte: 's', ziel: 'n', regeln: [{ von: { wert: 'ja' }, nach: 1 }], uebrige: 'leer' as const, fehlend: 'leer' as const, labels: {} };
    expect(umkodierWerte(d, o)).toEqual([1, 1, null, null]);
  });
});

describe('Umpolen: woher kommt die Spanne? (umpolBefehl bleibt in skalabau.ts)', () => {
  for (const [name, f] of Object.entries(E.umpolen) as [string, any][]) {
    it(`${name}: Quelle ${f.quelle}`, () => {
      expect(umpolQuelle(f.spalte, f.werte_alle ?? f.werte, f.fest)).toBe(f.quelle);
    });
  }
});

describe('Berechnen (D1b)', () => {
  const z = E.berechnen.zeilen, r = E.berechnen.rechenfehler, b3 = E.berechnen.bedingung;
  it('mindestzahl(): Hälfte aufgerundet, Zahlen auf 1…k begrenzt', () => {
    expect([1, 2, 3, 4, 5, 6].map(k => mindestzahl(k, 'haelfte'))).toEqual([1, 1, 2, 2, 3, 3]);
    expect(mindestzahl(5, 1)).toBe(1);
    expect(mindestzahl(3, 7)).toBe(3);
    expect(mindestzahl(3, 0)).toBe(1);
    expect(mindestzahl(5, 2.4)).toBe(2);
  });
  for (const [name, s] of Object.entries(z.statistik) as [string, any][]) {
    it(`Zeilenstatistik ${name}: aufgelöste Mindestzahl ${s.aufgeloest}`, () => {
      const b = zeilenStatistikBefehl(z.daten, { fn: s.fn, spalten: z.spalten, mindestens: s.mindestens, ziel: 'erg', bezeichnung: 'Ergebnis' });
      expect(b.mindestens).toBe(s.aufgeloest);
      expect(b.ziel).toBe('erg');
      if (s.fn === 'MEAN') expect(b.syntax, 'Mittelwert = dieselbe Funktion wie der Skalenbau').toBe(skalenwertBefehl(z.spalten, 'erg', 'Ergebnis', s.aufgeloest));
      else expect(b.syntax).toMatch(new RegExp(`COMPUTE erg = ${s.fn}${s.aufgeloest > 1 ? `\\.${s.aufgeloest}` : ''}\\(i1, i2, i3, i4, i5\\)\\.`));
      expect(b.syntax).toMatch(/VARIABLE LEVEL erg \(SCALE\)/);
    });
  }
  it('Zeilenstatistik: Fehler bei vorhandenem Namen, ungültigem Namen, unbekannter oder Text-Spalte', () => {
    const o = { fn: 'MEAN' as const, spalten: z.spalten, mindestens: 1, ziel: 'erg', bezeichnung: 'E' };
    expect(fehler(() => zeilenStatistikBefehl(z.daten, { ...o, ziel: 'i1' })).code).toBe('ueberschreiben');
    expect(() => zeilenStatistikBefehl(z.daten, { ...o, ziel: 'i1', ueberschreiben: true })).not.toThrow();
    expect(fehler(() => zeilenStatistikBefehl(z.daten, { ...o, ziel: 'mein erg' })).code).toBe('name');
    expect(fehler(() => zeilenStatistikBefehl(z.daten, { ...o, spalten: ['i1', 'i9'] })).code).toBe('spalte');
    const text: Daten = { spalten: [sp('a'), sp('t', { art: 'text', format: 'A3' })], zeilen: [[1, 'x']] };
    expect(fehler(() => zeilenStatistikBefehl(text, { ...o, spalten: ['a', 't'] })).code).toBe('spalte');
  });
  it('berechneBefehl(): COMPUTE ohne, IF mit Bedingung; Nachkommastellen; Messniveau metrisch', () => {
    const b = berechneBefehl(r.daten, { ziel: 'erg', ausdruck: 'a / b', dezimalen: 3 });
    expect(b.syntax).toMatch(/^COMPUTE erg = a \/ b\.$/m);
    expect(b.syntax).toMatch(/FORMATS erg \(F\d+\.3\)\./);
    expect(b.syntax).toMatch(/VARIABLE LEVEL erg \(SCALE\)\./);
    expect(berechneBefehl(r.daten, { ziel: 'erg', ausdruck: 'a / b' }).syntax).toMatch(/FORMATS erg \(F\d+\.2\)\./);
    const m = berechneBefehl(b3.daten, { ziel: 'erg', ausdruck: b3.ausdruck, bedingung: b3.bedingung.text });
    expect(m.syntax).toMatch(/^IF \(g = 1 AND a > 2\) erg = a \* 10\.$/m);
    expect(m.syntax).not.toMatch(/^COMPUTE erg/m);
  });
  it('berechneBefehl(): vorhandene Spalte nur mit ueberschreiben, ungültiger Name, leerer Ausdruck', () => {
    expect(fehler(() => berechneBefehl(r.daten, { ziel: 'a', ausdruck: 'b * 2' })).code).toBe('ueberschreiben');
    expect(fehler(() => berechneBefehl(r.daten, { ziel: 'A', ausdruck: 'b * 2' })).code, 'Groß/klein sind bei PSPP-Namen gleich').toBe('ueberschreiben');
    expect(() => berechneBefehl(r.daten, { ziel: 'a', ausdruck: 'b * 2', ueberschreiben: true })).not.toThrow();
    expect(fehler(() => berechneBefehl(r.daten, { ziel: 'neu spalte', ausdruck: 'b' })).code).toBe('name');
    expect(fehler(() => berechneBefehl(r.daten, { ziel: 'erg', ausdruck: '  ' })).code).toBe('ausdruck');
  });
  for (const k of ['geteilt', 'ln', 'wurzel']) {
    it(`leereErgebnisse(${r[k].ausdruck}): Lücken (fehlende Eingabe) und Rechenfehler (alle Eingaben gültig) getrennt gezählt`, () => {
      const nachher = mitSpalte(r.daten, sp('erg', { format: 'F8.2' }), r[k].erwartet);
      expect(leereErgebnisse(nachher, 'erg', r[k].eingaben)).toEqual(r[k].zaehlung);
    });
  }
});

describe('Fälle auswählen (D1c): Auswahlspalte und „Nur diese Fälle behalten“', () => {
  const aw = E.auswaehlen;
  it('auswahlBefehl(): neue Spalte aus der Bedingung; Namensschutz', () => {
    const b = auswahlBefehl(aw.daten, { ziel: 'auswahl', bedingung: aw.faelle[1].bedingung.text, bezeichnung: 'Auswahl' });
    expect(b.ziel).toBe('auswahl');
    expect(b.syntax).toContain('alter >= 18 AND gruppe = 1');
    expect(b.syntax).toMatch(/\bauswahl\b/);
    expect(b.syntax, 'kein Filter (Nachtrag 2): FILTER wirkt nur auf PSPP-Prozeduren').not.toMatch(/FILTER/);
    expect(b.syntax, 'Auswählen löscht nichts').not.toMatch(/SELECT IF/);
    expect(fehler(() => auswahlBefehl(aw.daten, { ziel: 'alter', bedingung: 'id > 3' })).code).toBe('ueberschreiben');
    expect(fehler(() => auswahlBefehl(aw.daten, { ziel: 'a b', bedingung: 'id > 3' })).code).toBe('name');
  });
  for (const f of aw.faelle) {
    it(`${f.name}: zaehleAuswahl() zählt 1 / 0 / leer; entfernt = nicht + leer`, () => {
      const nachher = mitSpalte(aw.daten, sp('auswahl', { format: 'F1.0', niveau: 'nominal' }), f.auswahl);
      const z = zaehleAuswahl(nachher, 'auswahl');
      expect(z).toEqual({ ...f.zaehlung, entfernt: f.entfernt });
      expect(z.erfuellt + z.entfernt).toBe(aw.daten.zeilen.length);
    });
  }
  it('behaltenBefehl(): SELECT IF auf die Auswahlspalte (Voreinstellung 1), auch für Markierspalten (0)', () => {
    expect(behaltenBefehl('auswahl')).toMatch(/^SELECT IF \(auswahl = 1\)\./);
    expect(behaltenBefehl('doppelt', 0)).toMatch(/^SELECT IF \(doppelt = 0\)\./);
    expect(behaltenBefehl('auswahl')).toMatch(/EXECUTE\.$/);
  });
});

describe('Zusammenführen: Fälle anhängen (ADD FILES)', () => {
  for (const [name, f] of Object.entries(E.anhaengen) as [string, any][]) {
    it(`${name}: Prüfung`, () => { expect(anhaengenPruefen(f.a, f.b)).toEqual(f.pruefen); });
  }
  it('anhaengenBefehl(): ADD FILES mit der zweiten Datei; Typkonflikt (Text gegen Zahl) ist eine Sperre', () => {
    const f = E.anhaengen.z1_spalten_nur_in_einer;
    const s = anhaengenBefehl(f.a, f.b, '/zweite.sav');
    expect(s).toMatch(/ADD FILES\s+\/FILE=\*\s+\/FILE='\/zweite\.sav'/);
    const k = E.anhaengen.z3_typkonflikt;
    const e = fehler(() => anhaengenBefehl(k.a, k.b, '/zweite.sav'));
    expect(e.code).toBe('sperre');
    expect((e.details as any).typkonflikte).toEqual(k.pruefen.typkonflikte);
  });
});

describe('Zusammenführen: Spalten über eine Kennung (MATCH FILES)', () => {
  const zm = E.zuordnen;
  const opt = (f: any, extra: object = {}) => ({ beziehung: f.beziehung, kennungA: f.kennungA, kennungB: f.kennungB, ...extra });
  for (const n of ['m1_viele_zu_eins', 'm2_eins_zu_eins', 'm5_kennung_fehlt_beidseitig', 'm7_text_kennung']) {
    it(`${n}: Zahlen je Seite, Fälle ohne Partner, doppelte Kennungen, Hinweise, Sperren`, () => {
      const f = zm[n], p = zuordnenPruefen(f.a, f.b, opt(f));
      expect(p.a).toEqual(f.pruefen.a);
      expect(p.b).toEqual(f.pruefen.b);
      expect(p.entfallenB).toBe(f.pruefen.entfallenB);
      expect(p.sperren).toEqual(f.pruefen.sperren);
      expect(p.hinweise).toEqual(f.pruefen.hinweise);
    });
  }
  for (const n of ['m3_doppelt_in_tabelle', 'm4_eins_zu_eins_doppelt', 'm6_kennung_typ', 'm7b_doppelt_hinten']) {
    it(`${n}: Sperre`, () => {
      const f = zm[n], p = zuordnenPruefen(f.a, f.b, opt(f));
      expect(p.sperren).toEqual(f.sperren);
      const e = fehler(() => zuordnenBefehl(f.a, f.b, opt(f), '/zweite.sav'));
      expect(e.code).toBe('sperre');
      expect(e.details).toEqual(f.sperren);
    });
  }
  it('viele:1: doppelte Kennungen in A (mehrere Personen je Klasse) sind erlaubt, in 1:1 nicht', () => {
    const f = zm.m1_viele_zu_eins;
    expect(zuordnenPruefen(f.a, f.b, opt(f)).sperren).toEqual([]);
    const eins = zuordnenPruefen(f.a, f.b, opt(f, { beziehung: '1:1' }));
    expect(eins.sperren).toEqual([{ art: 'doppelt', seite: 'a', kennungen: [10, 20] }]);
  });
  it('Leerzeichen HINTEN zählen bei der Kennung nicht (PSPP): „7“ und „7 “ sind dieselbe Kennung', () => {
    const f = zm.m7b_doppelt_hinten;
    expect(zuordnenPruefen(f.a, f.b, opt(f)).b.doppelt).toEqual(['7']);
  });
  it('normalisiereKennung(): Zahl → Text, Rand-Leerraum und Groß/klein weg, führende Nullen nur bei reinen Ziffern', () => {
    const n = zm.m7_text_kennung.normalisiert;
    expect(n.eingabe.map((w: string) => normalisiereKennung(w))).toEqual(n.erwartet);
    expect(normalisiereKennung(7)).toBe('7');
    expect(normalisiereKennung(null)).toBe('');
  });
  it('namenskonflikte(): gleiche Spaltennamen ausser der Kennung, Vorschlag _2 (oder _3, wenn vergeben)', () => {
    const f = zm.m8_namenskonflikt;
    expect(namenskonflikte(f.a, f.b, f.kennungB)).toEqual(f.konflikte);
    const g = zm.m8b_vorschlag_vergeben;
    expect(namenskonflikte(g.a, g.b, g.kennungB)).toEqual(g.konflikte);
    const gk: Daten = { spalten: [sp('K'), sp('Note')], zeilen: [] }, bk: Daten = { spalten: [sp('k'), sp('note')], zeilen: [] };
    expect(namenskonflikte(gk, bk, 'k'), 'Groß/klein sind bei Namen gleich; Schreibweise der zweiten Datei im Ergebnis').toEqual([{ name: 'note', vorschlag: 'note_2' }]);
  });
  it('m8: gleiche Spaltennamen sind eine Sperre, bis umbenannt wird; mit „umbenennen“ ist der Weg frei', () => {
    const f = zm.m8_namenskonflikt;
    expect(zuordnenPruefen(f.a, f.b, opt(f)).sperren).toEqual(f.sperren_ohne_umbenennen);
    expect(zuordnenPruefen(f.a, f.b, opt(f, { umbenennen: f.umbenennen })).sperren).toEqual([]);
    expect(fehler(() => zuordnenBefehl(f.a, f.b, opt(f), '/zweite.sav')).code).toBe('sperre');
    const b = zuordnenBefehl(f.a, f.b, opt(f, { umbenennen: f.umbenennen }), '/zweite.sav');
    expect(b.syntax).toMatch(/\/RENAME=/);
    expect(b.syntax).toContain('klasse');
    expect(b.syntax).toContain('note_2');
  });
  it('zuordnenBefehl(): viele:1 = TABLE, 1:1 = FILE + FILE; beide Seiten nach der Kennung sortiert; B ohne Kennung entfernt', () => {
    const v = zm.m1_viele_zu_eins, e = zm.m2_eins_zu_eins;
    const a = zuordnenBefehl(v.a, v.b, opt(v), '/zweite.sav');
    expect(a.syntax).toMatch(/MATCH FILES\s+\/FILE=\*\s+\/TABLE='\/zweite\.sav'\s*(\/RENAME=\([^)]*\)\s*)?\/BY kl/);
    expect(a.syntax).toMatch(/SORT CASES BY kl\./);
    expect(a.vorbereitungB).toMatch(/SORT CASES BY kl\./);
    expect(a.vorbereitungB, 'Fälle ohne Kennung in B fallen vor dem Speichern weg').toMatch(/SELECT IF \(.*kl.*\)\./);
    const b = zuordnenBefehl(e.a, e.b, opt(e), '/zweite.sav');
    expect(b.syntax).not.toContain('/TABLE');
    expect(b.syntax).toMatch(/MATCH FILES\s+\/FILE=\*\s+\/FILE='\/zweite\.sav'/);
    expect(b.syntax).toMatch(/\/BY id/);
  });
  it('Kennung heißt in B anders: /RENAME auf den Namen von A', () => {
    const f = zm.m8_namenskonflikt;
    const b = zuordnenBefehl(f.a, f.b, opt(f, { umbenennen: f.umbenennen }), '/zweite.sav');
    expect(b.vorbereitungB).toMatch(/SORT CASES BY klasse\./);
    expect(b.syntax).toMatch(/\/BY kl\b/);
  });
});

describe('Aggregieren (D1e)', () => {
  const ag = E.aggregieren;
  it('gruppenUebersicht(): Gruppen wie PSPP sie bildet; fehlend = eine Gruppe, benutzerdefiniert fehlend (9) eine weitere', () => {
    expect(gruppenUebersicht(ag.daten, ['g'])).toEqual(ag.uebersicht_nach_g);
    expect(gruppenUebersicht(ag.daten, ['h', 'g'])).toEqual(ag.uebersicht_nach_h_und_g);
    expect(gruppenUebersicht(ag.gruppe_mit_9.daten, ['g'])).toEqual(ag.gruppe_mit_9.uebersicht);
    expect(fehler(() => gruppenUebersicht(ag.daten, ['gibtsnicht'])).code).toBe('spalte');
  });
  it('kennwertName(): <spalte>_<fn klein>, ohne Spalte nur der Kennwert; vergebene Namen werden umgangen', () => {
    expect(kennwertName('x', 'MEAN', [])).toBe('x_mean');
    expect(kennwertName('x', 'SD', [])).toBe('x_sd');
    expect(kennwertName('x', 'MEDIAN', [])).toBe('x_median');
    expect(kennwertName('x', 'N', [])).toBe('x_n');
    expect(kennwertName(undefined, 'N', ['id'])).toBe('n');
    expect(kennwertName(undefined, 'N', ['n'])).not.toBe('n');
    expect(kennwertName('x', 'MEAN', ['X_MEAN'])).not.toBe('x_mean');
  });
  const kw = (fn: Kennwert['fn'], spalte: string | undefined, name: string): Kennwert => ({ fn, ...(spalte ? { spalte } : {}), name });
  const alle: Kennwert[] = [kw('N', undefined, 'k_n'), kw('N', 'x', 'k_nx'), kw('NU', undefined, 'k_nu'), kw('NU', 'x', 'k_nux'), kw('NMISS', 'x', 'k_nmiss'), kw('MEAN', 'x', 'k_mean'),
    kw('SD', 'x', 'k_sd'), kw('MEDIAN', 'x', 'k_median'), kw('MIN', 'x', 'k_min'), kw('MAX', 'x', 'k_max'), kw('SUM', 'x', 'k_sum')];
  it('aggregierenBefehl(): neue Spalten (ADDVARIABLES) und neue Datei (OUTFILE)', () => {
    const s = aggregierenBefehl(ag.daten, { gruppen: ['h', 'g'], kennwerte: alle, modus: 'spalten' });
    expect(s.namen).toEqual(alle.map(k => k.name));
    expect(s.syntax).toMatch(/AGGREGATE\s+\/OUTFILE=\*\s+MODE=ADDVARIABLES/);
    expect(s.syntax).toMatch(/\/BREAK=h g\b/);
    expect(s.syntax).toMatch(/\/k_n=N\b(?!\()/);
    expect(s.syntax).toContain('/k_nx=N(x)');
    expect(s.syntax).toContain('/k_nmiss=NMISS(x)');
    expect(s.syntax).toContain('/k_median=MEDIAN(x)');
    const n = aggregierenBefehl(ag.daten, { gruppen: ['g'], kennwerte: [kw('MEAN', 'x', 'k_mean')], modus: 'neu', datei: '/gruppen.sav' });
    expect(n.syntax).toMatch(/OUTFILE='\/gruppen\.sav'/);
    expect(n.syntax).not.toContain('MODE=ADDVARIABLES');
  });
  it('aggregierenBefehl(): Fehler - Mittelwert einer Textspalte, unbekannte Spalte, vergebener oder ungültiger Name, „neu“ ohne Datei', () => {
    const o = { gruppen: ['g'], kennwerte: [kw('MEAN', 'x', 'k_mean')], modus: 'spalten' as const };
    expect(fehler(() => aggregierenBefehl(ag.daten, { ...o, kennwerte: [kw('MEAN', 'h', 'm')] })).code).toBe('kennwertText');
    expect(fehler(() => aggregierenBefehl(ag.daten, { ...o, kennwerte: [kw('SUM', 'h', 'm')] })).code).toBe('kennwertText');
    expect(() => aggregierenBefehl(ag.daten, { ...o, kennwerte: [kw('N', 'h', 'm')] }), 'gültige Texte zählen ist erlaubt').not.toThrow();
    expect(fehler(() => aggregierenBefehl(ag.daten, { ...o, kennwerte: [kw('MEAN', 'zz', 'm')] })).code).toBe('spalte');
    expect(fehler(() => aggregierenBefehl(ag.daten, { ...o, gruppen: ['zz'] })).code).toBe('spalte');
    expect(fehler(() => aggregierenBefehl(ag.daten, { ...o, kennwerte: [kw('MEAN', 'x', 'y')] })).code, 'Name gibt es schon (nur bei neuen Spalten ein Problem)').toBe('name');
    expect(fehler(() => aggregierenBefehl(ag.daten, { ...o, kennwerte: [kw('MEAN', 'x', 'm 1')] })).code).toBe('name');
    expect(fehler(() => aggregierenBefehl(ag.daten, { ...o, kennwerte: [kw('MEAN', 'x', 'm'), kw('SUM', 'x', 'M')] })).code, 'zwei Kennwerte mit demselben Namen').toBe('name');
    expect(fehler(() => aggregierenBefehl(ag.daten, { ...o, modus: 'neu' })).code).toBe('datei');
    expect(() => aggregierenBefehl(ag.daten, { ...o, modus: 'neu', datei: '/g.sav', kennwerte: [kw('MEAN', 'x', 'y')] }), 'in einer neuen Datei ist y frei').not.toThrow();
  });
});

describe('Doppelte Fälle (D2)', () => {
  const dd = E.doppelte;
  const faelle = [dd.normalisiert, dd.genau, dd.nur_name, dd.alle_spalten, dd.text_ziffern, dd.fehlend.gleich, dd.fehlend.verschieden, dd.zahlen];
  const datenVon = (f: any): Daten => (f === dd.text_ziffern || f === dd.zahlen ? dd.zahlen.daten : f === dd.fehlend.gleich || f === dd.fehlend.verschieden ? dd.fehlend.daten : dd.daten);
  for (const f of faelle) {
    it(`${f.name}: Markierung, Gruppen mit Zeilennummern, Zahl der Wiederholungen wie R duplicated()`, () => {
      const r = doppelteFaelle(datenVon(f), { spalten: f.spalten, genau: f.genau, fehlendGleich: f.fehlendGleich });
      expect(r.markierung).toEqual(f.markierung);
      expect(r.gruppen).toEqual(f.gruppen);
      expect(r.wiederholungen).toBe(f.wiederholungen);
      expect(r.nichtPruefbar).toBe(f.nichtPruefbar);
    });
  }
  it('Voreinstellung: nicht „genau“ (Rand-Leerzeichen und Groß/klein zählen nicht), fehlend = fehlend', () => {
    expect(doppelteFaelle(dd.daten, { spalten: ['name', 'plz'] }).markierung).toEqual(dd.normalisiert.markierung);
    expect(doppelteFaelle(dd.fehlend.daten, { spalten: ['k', 't'] }).markierung).toEqual(dd.fehlend.gleich.markierung);
  });
  it('„genau gleich“: nur é als ein oder zwei Zeichen (NFC) ist gleich - sonst zählt jedes Zeichen, auch Groß/klein und Rand-Leerzeichen', () => {
    const g = doppelteFaelle(dd.daten, { spalten: ['name'], genau: true });
    expect(g.gruppen.map(x => x.zeilen)).toEqual([[1, 4], [5, 6], [10, 12]]);   // nur Name: 1 und 4 sind beide „Anna Berg“
  });
  it('Zahlen: 1 = 1,0, 0,1 + 0,2 = 0,3 (15 gültige Stellen), 15-stellige Kennungen bleiben verschieden', () => {
    const r = doppelteFaelle(dd.zahlen.daten, { spalten: ['v'] });
    expect(r.markierung[1]).toBe(1);
    expect(r.markierung[3]).toBe(1);
    expect(r.markierung[5]).toBe(0);
  });
  it('Text „1“ und „1.0“ und „01“ sind verschieden (Text wird nicht als Zahl gelesen), „ 1“ ist „1“', () => {
    const r = doppelteFaelle(dd.zahlen.daten, { spalten: ['t'] });
    expect(r.markierung.slice(0, 4)).toEqual([0, 0, 0, 1]);
  });
  it('Fehler: unbekannte Spalte', () => { expect(fehler(() => doppelteFaelle(dd.daten, { spalten: ['gibtsnicht'] })).code).toBe('spalte'); });
  it('markiereDoppelte(): neue Spalte hinten mit 0 (erster Fall) und 1 (Wiederholung); Eingabe unverändert; Name wird nie überschrieben', () => {
    const vorher = JSON.stringify(dd.daten);
    const m = markiereDoppelte(dd.daten, { spalten: ['name', 'plz'] });
    expect(JSON.stringify(dd.daten)).toBe(vorher);
    const neu = m.spalten.at(-1)!;
    expect(neu.name).toBe('doppelt');
    expect(neu.art).toBe('zahl');
    expect(neu.niveau).toBe('nominal');
    expect(Object.keys(neu.werteLabels).sort()).toEqual(['0', '1']);
    expect(m.spalten).toHaveLength(dd.daten.spalten.length + 1);
    expect(m.zeilen.map(z => z.at(-1))).toEqual(dd.normalisiert.markierung);
    expect(m.zeilen.map(z => z.slice(0, -1))).toEqual(dd.daten.zeilen);
    const zweimal = markiereDoppelte(m, { spalten: ['name', 'plz'] });
    expect(zweimal.spalten.at(-1)!.name).not.toBe('doppelt');
    expect(zweimal.spalten.find(s => s.name === 'doppelt')).toBeDefined();
    expect(markiereDoppelte(dd.daten, { spalten: ['name'] }, 'wiederholung').spalten.at(-1)!.name).toBe('wiederholung');
  });
});
