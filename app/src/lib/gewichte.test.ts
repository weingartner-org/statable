import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import erwartet from './testdaten/spaeter-a-erwartet.json';
import erwartetC from './testdaten/spaeter-c-erwartet.json';
import {
  beschreibe, designeffekt, normiere, erweitern, gewichtAbgleich, gewichtBefehl, gewichtSatz, gewichtStatus, GewichtFehler, kish, kishSatz, leseEngineGewicht, pruefeGewicht,
  seHaeufigkeit, sperrSatz, wAnteile, wKreuz, wMittel, wQuantil, wSD, wVarianz, type Gewicht, type GewichtArt
} from './gewichte';
import { VERFAHREN } from './verfahren';
import { s } from './sitzung.svelte';

/* ===== Welle S-A, Teil 1: Fälle gewichten (Fachblatt docs/fachblaetter/SPAETER-A-GRUNDLAGEN.md, Abschnitt 1 und „Entscheidungen Opus“) =====
 * Sollwerte: scripts/spaeter-a-erwartet.R → testdaten/spaeter-a-erwartet.json (Abschnitt gewichte). Der Bauer ändert Test und JSON nicht.
 * Das Modul `lib/gewichte.ts` (reine Funktionen, keine Oberfläche) hat diese API - sie ist hier festgelegt:
 *
 *   type GewichtArt = 'haeufigkeit' | 'umfrage';  interface Gewicht { spalte: string; art: GewichtArt }
 *   pruefeGewicht(werte: (number | null)[], art): { fehler: null | { code: 'nicht-ganzzahlig' | 'negativ' | 'keine-gueltig'; angebot?: 'umfrage' };
 *       w: number[] /* bereinigt: 0 wo die Zeile nicht zählt (Gewicht 0, fehlend) *\/; summe; zeilen /* Zeilen mit w > 0 *\/; nullZeilen; fehlendZeilen; hinweise: 'summe-gross'[] }
 *       Häufigkeit: ganze Zahlen ≥ 0 (Toleranz 1e-9, dann runden), nicht ganzzahlig = Fehler mit Angebot „umfrage“, negativ = Fehler, 0 und fehlend zählen nicht (mit Zahl),
 *       „summe-gross“ bei Σw > 100 · Zeilen. Umfragegewicht: beliebig > 0; 0 zählt nicht wie in PSPP (Opus), fehlend zählt nicht (mit Zahl), negativ = Fehler.
 *       Kein Gewicht gültig = Fehler 'keine-gueltig'.
 *   erweitern<T>(zeilen: T[], w: number[], grenze = 200000): T[]      Zeile w-mal; wirft GewichtFehler('zu-gross') wenn Σw > grenze, GewichtFehler('nicht-ganzzahlig') bei Kommagewicht
 *   normiere(w): number[]                          Gewichte auf Σw = Zahl der Zeilen mit w > 0 (Nullen bleiben 0); gilt für QUARTILE bei Umfragegewichten (beschreibe, Quartil-Klassen)
 *   wMittel(y, w) · wVarianz(y, w) (Nenner Σw − 1) · wSD · wQuantil(y, w, p) (= PSPP percentile.c HAVERAGE, roh: hängt von Σw + 1 ab; bei ganzzahligem w gleich R type 6)
 *   wAnteile(werte, w): { werte; summe; prozent }   wKreuz(a, b, w): { zeilen; spalten; summe[][]; zeilenprozent[][]; spaltenprozent[][]; gesamtprozent[][] }
 *   kish(w) = (Σw)²/Σw² · designeffekt(w) = n/kish (n = Zeilen mit w > 0) · seHaeufigkeit(y, w) = √(wVarianz/Σw)
 *   beschreibe(y, w, art): { summe; zeilen; n; mittel; varianz; sd; min; max; q25; q50; q75; se?; kish?; designeffekt? }
 *       n = Σw bei Häufigkeit, = Zeilen bei Umfrage; `se` gibt es NUR bei Häufigkeit (bei Umfrage kein Standardfehler, kein KI, kein p: Feld fehlt); `kish`/`designeffekt` nur bei Umfrage
 *   gewichtStatus(id, art): 'rechnen' | 'beschreibend' | 'sperren' | 'hinweis' | 'unberuehrt'   (Tabelle aus JSON gewichte.sperrtabelle; unbekannte Id = Fehler)
 *   sperrSatz(id, gewicht, titel): string | null     null bei rechnen/beschreibend/unberuehrt; Hinweis: „Das Fallgewicht wird hier nicht verwendet.“; Sperre: Sätze des Fachblatts 1.2 in „Fallgewicht“-Wortwahl
 *   gewichtBefehl(g?: Gewicht): string               'WEIGHT BY w.' bzw. 'WEIGHT OFF.'
 *   leseEngineGewicht(items): string | null          liest die Ausgabe von `SHOW WEIGHT.` (Tabelle „Settings“, Zeile WEIGHT): Spaltenname oder null bei OFF
 *   gewichtAbgleich(engine: string | null, projekt?: Gewicht): 'ok' | 'frage' | 'setzen'
 *       engine hat Gewicht und das Projekt kennt dasselbe → ok; engine hat eines, das Projekt keines oder ein anderes → 'frage' (Pflichtfrage nach der Art);
 *       Projekt hat Gewicht, Engine nicht → 'setzen'; beide keines → ok. Spaltennamen ohne Beachtung von Groß/klein.
 *   gewichtSatz(g, summe, zeilen): string            „gewichtet mit w als Häufigkeit (N = 15 aus 8 Zeilen)“ / „gewichtet mit wu als Umfragegewicht (n = 8, Summe der Gewichte 9,1)“ (de)
 *   kishSatz(w): string                              enthält „6,6“ und „statt 8“
 * Wortwahl: überall „Fallgewicht“ (nicht „Gewicht“ allein); Häufigkeitsgewicht und Umfragegewicht sind seine zwei Arten.
 */

const E = (erwartet as any).gewichte;
const H = E.haeufigkeit, F = E.fachblatt, U = E.umfrage;
/** S-C T8 (Entscheidung Opus 1): beschreibe() normiert Umfragegewichte auf Σw = Zeilen; die neuen Sollwerte für Varianz und SD stehen in spaeter-c-erwartet.json (abweichungen.beschreibe_umfragegewicht.betroffen[].neu), die alten in spaeter-a-erwartet.json gelten dafür nicht mehr. */
const NEU = (erwartetC as any).abweichungen.beschreibe_umfragegewicht.betroffen.map((b: any) => b.neu);
const nah = (ist: number, soll: number, tol = 1e-9) => expect(Math.abs(ist - soll), `${ist} gegen ${soll}`).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(soll)));
const nahListe = (ist: number[], soll: number[], tol = 1e-9) => { expect(ist.length).toBe(soll.length); soll.forEach((x, i) => nah(ist[i]!, x, tol)); };
const nahMatrix = (ist: number[][], soll: number[][], tol = 1e-9) => { expect(ist.length).toBe(soll.length); soll.forEach((z, i) => nahListe(ist[i]!, z, tol)); };
const wiederholt = (x: number[], w: number[]) => x.flatMap((v, i) => Array(w[i]).fill(v));
s.einst.sprache = 'de'; s.einst.anrede = 'du';

describe('Gewicht prüfen und bereinigen (Entscheidungen Opus: Umfragegewicht 0 wie PSPP = zählt nicht, mit Zahl)', () => {
  for (const f of E.pruefung) it(`${f.name} (${f.art})`, () => {
    const werte = (f.werte as (number | null)[]).map(v => v ?? null);
    const r = pruefeGewicht(werte, f.art as GewichtArt);
    if (f.fehler) {
      expect(r.fehler?.code).toBe(f.fehler);
      if (f.angebot) expect(r.fehler?.angebot).toBe(f.angebot);
      return;
    }
    expect(r.fehler).toBeNull();
    nahListe(r.w, f.w); nah(r.summe, f.summe);
    expect([r.zeilen, r.nullZeilen, r.fehlendZeilen, [...r.hinweise]]).toEqual([f.zeilen, f.nullZeilen, f.fehlendZeilen, f.hinweise]);
  });
});

describe('Erweitern (Häufigkeitsgewicht): die Zeile w-mal; gleichwertig mit PSPP WEIGHT', () => {
  it('Zeilen wiederholt, Gewicht 0 verschwindet, Reihenfolge bleibt', () => {
    expect(erweitern(['a', 'b', 'c', 'd'], [2, 0, 1, 3])).toEqual(['a', 'a', 'c', 'd', 'd', 'd']);
  });
  it('Summe über der Grenze (200 000): gesperrt „zu groß“, genau auf der Grenze geht', () => {
    expect(() => erweitern([1, 2], [150000, 50001])).toThrow(GewichtFehler);
    try { erweitern([1, 2], [150000, 50001]); } catch (e) { expect((e as GewichtFehler).code).toBe('zu-gross'); }
    expect(erweitern([1, 2], [150000, 50000]).length).toBe(200000);
  });
  it('eigene Grenze', () => { expect(() => erweitern([1], [5], 4)).toThrow(GewichtFehler); });
  it('Kommagewicht: Fehler nicht-ganzzahlig (nie runden)', () => {
    try { erweitern([1, 2], [1.5, 2]); expect.unreachable(); } catch (e) { expect((e as GewichtFehler).code).toBe('nicht-ganzzahlig'); }
  });
});

describe('Häufigkeitsgewicht: Datensatz H (14 Zeilen, Σw = 29, zwei Zeilen mit Gewicht 0) gegen R auf der rep()-erweiterten Datei', () => {
  const w: number[] = H.daten.w, y: number[] = H.daten.y, x: number[] = H.daten.x;
  it('Mittel, Varianz, SD, SE, Spanne', () => {
    for (const [v, k] of [[y, H.kennwerte_y], [x, H.kennwerte_x]] as [number[], any][]) {
      const b = beschreibe(v, w, 'haeufigkeit');
      nah(b.summe, 29); expect(b.zeilen).toBe(12); nah(b.n, k.n);
      nah(b.mittel, k.mittel); nah(b.varianz, k.var); nah(b.sd, k.sd); nah(b.se!, k.se); nah(b.min, k.min); nah(b.max, k.max);
      nah(b.q25, k.q25); nah(b.q50, k.q50); nah(b.q75, k.q75);
      expect(b.kish).toBeUndefined();
    }
  });
  it('Quartile = Typ 6 auf der erweiterten Datei (die Regel der Verteilungskarte, nicht Typ 7)', () => {
    nah(wQuantil(y, w, .25), H.kennwerte_y.q25); nah(wQuantil(y, w, .75), H.kennwerte_y.q75);
  });
  it('EIGENSCHAFT gewichtet = erweitert: dieselben Zahlen bis 1e-9 (Mittel, Varianz, Quartile, Anteile, Kreuztabelle)', () => {
    const ey = wiederholt(y, w), one = ey.map(() => 1);
    nah(wMittel(y, w), wMittel(ey, one)); nah(wVarianz(y, w), wVarianz(ey, one)); nah(wSD(y, w), wSD(ey, one));
    for (const p of [.1, .25, .5, .75, .9]) nah(wQuantil(y, w, p), wQuantil(ey, one, p));
    const a: number[] = H.daten.g, b: number[] = H.daten.jn;
    const k1 = wKreuz(a, b, w), k2 = wKreuz(wiederholt(a, w), wiederholt(b, w), one);
    nahMatrix(k1.summe, k2.summe); nahMatrix(k1.zeilenprozent, k2.zeilenprozent); nahMatrix(k1.spaltenprozent, k2.spaltenprozent);
    const p1 = wAnteile(H.daten.kat, w), p2 = wAnteile(wiederholt(H.daten.kat, w), one);
    nahListe(p1.summe, p2.summe); nahListe(p1.prozent, p2.prozent);
  });
  it('Häufigkeiten der Kategorie und Gruppe gegen R', () => {
    for (const [name, v] of [['haeufigkeit_kat', H.daten.kat], ['haeufigkeit_g', H.daten.g]] as [string, number[]][]) {
      const r = wAnteile(v, w);
      nahListe(r.werte, H[name].werte); nahListe(r.summe, H[name].n); nahListe(r.prozent, H[name].prozent);
    }
  });
  it('Kreuztabelle g × jn: Zählungen und alle Prozente gegen R (Gewicht 0 zählt nicht)', () => {
    const k = wKreuz(H.daten.g, H.daten.jn, w), r = H.kreuz_g_jn;
    nahListe(k.zeilen, r.zeilen); nahListe(k.spalten, r.spalten);
    nahMatrix(k.summe, r.n); nahMatrix(k.zeilenprozent, r.zeilenprozent); nahMatrix(k.gesamtprozent, r.gesamtprozent);
    // spaltenprozent: R liefert je Spalte (Liste von Spalten), das Modul je Zeile - Vergleich über die Transponierte
    const t = r.spaltenprozent as number[][];
    k.spaltenprozent.forEach((z, i) => z.forEach((v, j) => nah(v, t[j]![i]!)));
  });
  it('Gewichte ×3 (Eigenschaft c): Mittel und Anteile bleiben, N und SE ändern sich', () => {
    const w3 = w.map(v => 3 * v), b3 = beschreibe(y, w3, 'haeufigkeit'), m3 = H.mal3;
    nah(b3.summe, m3.summe); nah(b3.mittel, m3.mittel_y); nah(b3.se!, m3.se_y); nah(b3.sd, m3.sd_y);
    nah(b3.mittel, beschreibe(y, w, 'haeufigkeit').mittel);
    expect(b3.se!).toBeLessThan(beschreibe(y, w, 'haeufigkeit').se!);
    nah(wKreuz(H.daten.g, H.daten.jn, w3).zeilenprozent[0]![0]!, wKreuz(H.daten.g, H.daten.jn, w).zeilenprozent[0]![0]!);
  });
});

describe('Fachblatt-Beispiel y = 3,5,4,6,2,7,5,4; w = 1,2,3,1,2,1,3,2 (Σw = 15, k = 8) und Falle 3: Skala der Gewichte', () => {
  const y: number[] = F.y, w: number[] = F.w;
  it('Häufigkeitsgewicht: Mittel 4,3333, Varianz mit Σw − 1, SE 0,3473254', () => {
    const b = beschreibe(y, w, 'haeufigkeit');
    nah(b.mittel, F.haeufigkeit.mittel); nah(b.varianz, F.haeufigkeit.varianz); nah(b.sd, F.haeufigkeit.sd); nah(b.se!, F.haeufigkeit.se);
    nah(b.mittel, 4.3333333, 1e-7); nah(b.se!, 0.3473254, 1e-7);
  });
  it('SE nach Häufigkeitsformel hängt von der Skala der Gewichte ab: ×0,25 / ×1 / ×10 → 0,784 / 0,347 / 0,106 (R); Mittel bleibt', () => {
    for (const sk of F.skala) {
      const ws = w.map((v: number) => v * sk.faktor);
      nah(seHaeufigkeit(y, ws), sk.se_haeufigkeitsformel); nah(wMittel(y, ws), sk.mittel);
    }
    nahListe(F.skala.map((k: any) => k.se_haeufigkeitsformel), [0.7836718, 0.3473254, 0.1064651], 1e-6);
  });
  it('Umfragegewicht wu: gewichtetes Mittel 4,6593 (ungewichtet 4,5), Anteil 0,5714 (0,5), Kish n_eff 6,6089 von 8, Designeffekt 1,2105', () => {
    const wu: number[] = F.wu, g: number[] = F.g;
    const b = beschreibe(y, wu, 'umfrage');
    nah(b.mittel, F.umfrage.mittel); nah(b.mittel, 4.6593407, 1e-7); nah(wMittel(g, wu), F.umfrage.anteil_g); nah(wMittel(g, wu), 0.5714286, 1e-6);
    nah(b.varianz, NEU[0].varianz); nah(b.sd, NEU[0].sd);
    nah(b.q25, F.umfrage.q25); nah(b.q50, F.umfrage.q50); nah(b.q75, F.umfrage.q75);
    nah(kish(wu), F.umfrage.kish_neff); nah(kish(wu), 6.6089385, 1e-7); nah(designeffekt(wu), F.umfrage.designeffekt); nah(designeffekt(wu), 1.2104818, 1e-6);
    nah(b.kish!, kish(wu)); nah(b.designeffekt!, designeffekt(wu));
    expect(b.summe).toBeCloseTo(9.1, 12); expect(b.n).toBe(8);
  });
  it('Umfragegewicht: KEIN Standardfehler, KI oder p (Entscheidung Opus), auch nicht als leeres Feld', () => {
    const b = beschreibe(y, F.wu, 'umfrage') as Record<string, unknown>;
    for (const k of ['se', 'sd_mittel', 'ki', 'kiLo', 'kiHi', 'p', 't']) expect(k in b, k).toBe(false);
  });
  it('gleiche Gewichte → n_eff = n, Designeffekt 1; Gewichte mit 0 zählen nicht als Zeile', () => {
    nah(kish([2, 2, 2, 2, 2, 2, 2, 2]), 8); nah(designeffekt([2, 2, 2, 2, 2, 2, 2, 2]), 1);
    nah(kish([1, 1, 0, 1]), 3); nah(designeffekt([1, 1, 0, 1]), 1);
  });
  it('Kish-Satz nennt n_eff und n', () => {
    const t = kishSatz(F.wu); expect(t).toContain('6,6'); expect(t).toContain('statt 8');
  });
});

describe('Umfragegewicht, Datensatz U (12 Zeilen, Kommagewichte): nur beschreibend gewichtet gegen R', () => {
  const y: number[] = U.daten.y, w: number[] = U.daten.wu;
  it('Mittel, Varianz (Σw − 1), SD, Anteil, Quartile (HAVERAGE), Kish', () => {
    const b = beschreibe(y, w, 'umfrage');
    nah(b.summe, U.summe); nah(b.mittel, U.mittel); nah(b.varianz, NEU[1].varianz); nah(b.sd, NEU[1].sd); nah(b.min, U.min); nah(b.max, U.max);
    nah(b.q25, U.q25); nah(b.q50, U.q50); nah(b.q75, U.q75); nah(b.kish!, U.kish_neff); nah(b.designeffekt!, U.designeffekt);
    expect(Math.abs(b.mittel - U.mittel_ungewichtet)).toBeGreaterThan(1e-3);   // das Gewicht wirkt wirklich
    nah(wMittel(U.daten.jn, w), U.anteil_jn);
  });
  it('Prozente einer Kategorie und Kreuztabelle gruppe × jn (gewichtete Zählungen und Prozente)', () => {
    const p = wAnteile(U.daten.kat, w); nahListe(p.werte, U.prozent_kat.werte); nahListe(p.summe, U.prozent_kat.summe); nahListe(p.prozent, U.prozent_kat.prozent);
    const k = wKreuz(U.daten.gruppe, U.daten.jn, w), r = U.kreuz_gruppe_jn;
    nahMatrix(k.summe, r.summe); nahMatrix(k.zeilenprozent, r.zeilenprozent); nahMatrix(k.gesamtprozent, r.gesamtprozent);
    (r.spaltenprozent as number[][]).forEach((sp, j) => sp.forEach((v, i) => nah(k.spaltenprozent[i]![j]!, v)));
  });
  it('Skalierung der Umfragegewichte (×0,1 / ×1 / ×7): Mittel, Anteil UND Quartile ändern sich nicht - Quartile rechnen mit auf Σw = Zeilen normierten Gewichten', () => {
    for (const sk of U.skalen) {
      const ws = w.map(v => v * sk.faktor), b = beschreibe(y, ws, 'umfrage');
      nah(wMittel(y, ws), sk.mittel); nah(wMittel(U.daten.jn, ws), sk.anteil); nah(b.q50, sk.q50); nah(b.q50, U.q50); nah(b.q25, U.q25); nah(b.q75, U.q75);
    }
    // und der Grund: das rohe PSPP-HAVERAGE (wQuantil) hängt von der Skala ab (Σw + 1) - darum wird für Umfragegewichte normiert
    nah(wQuantil(y, w, .75), U.q75_roh); nah(wQuantil(y, w.map(v => 7 * v), .75), U.skalen[2].q75_roh);
    expect(Math.abs(U.skalen[2].q75_roh - U.q75_roh)).toBeGreaterThan(1e-3);
    nahListe(normiere(w), U.wn); nah(normiere(w).reduce((a, b) => a + b, 0), 12);
    nahListe(normiere([2, 0, 6]), [.5, 0, 1.5]);
  });
  it('Quartile bei ganzzahligem Gewicht = R type 6; bei Kommagewicht PSPP EXAMINE-HAVERAGE (nicht FREQUENCIES), siehe gewichte-pspp.test.ts', () => {
    const bsp = (erwartet as any).abweichungen.percentile_kommagewichte;
    nah(wQuantil(bsp.y, bsp.w, .25), bsp.haverage.q25); nah(wQuantil(bsp.y, bsp.w, .5), bsp.haverage.q50); nah(wQuantil(bsp.y, bsp.w, .75), bsp.haverage.q75);
    expect(Math.abs(wQuantil(bsp.y, bsp.w, .5) - bsp.frequencies_compatible.q50)).toBeGreaterThan(1);  // 6,4 gegen 4,9: die Abweichung ist echt und gewollt
  });
});

describe('Gedrucktes Beispiel (Lehrbuchniveau): gewichtetes Mittel zweier Klassen', () => {
  const g = E.gedruckt;
  it('(20 · 80 + 30 · 90) / 50 = 86 = Mittel aller 50 Noten; das ungewichtete Mittel der Mittel (85) ist falsch', () => {
    nah(wMittel(g.klassenmittel, g.groesse), 86);
    nah(wMittel([...g.morgens, ...g.nachmittags], Array(50).fill(1)), 86);
    nah(wMittel(g.klassenmittel, [1, 1]), 85);
    expect(g.quelle).toContain('Wikipedia');
  });
});

describe('Verfahren → richtig gewichtet / beschreibend / gesperrt / Hinweis (Fachblatt 1.5 mit Entscheidungen Opus, 17.10.)', () => {
  const T = E.sperrtabelle as { id: string; titel: string; h: string; u: string; erlaubtH?: string[]; erlaubtU?: string[]; nachziehen?: number }[];
  for (const f of T) it(`${f.id}: Häufigkeit ${f.h}${f.erlaubtH ? ' (auch ' + f.erlaubtH.join('/') + ')' : ''}, Umfrage ${f.u}${f.erlaubtU ? ' (auch ' + f.erlaubtU.join('/') + ')' : ''}`, () => {
    expect([f.h, ...(f.erlaubtH ?? [])]).toContain(gewichtStatus(f.id, 'haeufigkeit'));
    expect([f.u, ...(f.erlaubtU ?? [])]).toContain(gewichtStatus(f.id, 'umfrage'));
  });
  it('jede der 19 Karten kommt in der Tabelle vor (Teile der Karte als „karte:teil“); die zwei Karten von S-E (Zeitreihen, Cluster) stehen in gewichte-spaeter-e.test.ts, die drei des Kurs-Pakets (Diskriminanz, loglinear, MANOVA) in gewichte-kurspaket.test.ts', () => {
    const karten = VERFAHREN.map(v => v.id).filter(k => k !== 'zeitreihen' && k !== 'cluster' && k !== 'diskriminanz' && k !== 'loglinear' && k !== 'manova' && k !== 'armut'), teile = E.karten_teile as Record<string, string[]>;
    expect(Object.keys(teile).sort()).toEqual([...karten].sort());
    for (const [k, ids] of Object.entries(teile)) for (const id of ids) expect(T.map(t => t.id), `${k}: ${id}`).toContain(id);
  });
  it('unbekannte Id: Fehler, nie still „rechnen“', () => { expect(() => gewichtStatus('gibtsnicht:x', 'haeufigkeit')).toThrow(); });
  it('Rangtests, Wilcoxon, Cronbach-α, Spearman, Messwiederholung, logistisch: Häufigkeit gesperrt (heute ignorieren sie Gewichte still)', () => {
    for (const id of ['gruppen:rang', 'praepost:wilcoxon', 'skala:alpha', 'zusammenhang:rang', 'messwiederholung:alle', 'vorhersage:logistik-roc', 'korrmatrix:alle'])
      expect(['sperren', 'rechnen']).toContain(gewichtStatus(id, 'haeufigkeit'));
    for (const id of ['gruppen:rang', 'praepost:wilcoxon', 'zusammenhang:rang', 'messwiederholung:alle', 'vorhersage:logistik-roc']) expect(gewichtStatus(id, 'haeufigkeit')).toBe('sperren');
  });
  it('Umfragegewicht: kein einziges Verfahren mit p-Wert, KI oder Effektstärke rechnet (nur beschreibend)', () => {
    for (const f of T) if (!['beschreibend', 'sperren', 'hinweis', 'unberuehrt'].includes(gewichtStatus(f.id, 'umfrage'))) {
      expect(f.erlaubtU ?? [], f.id).toContain(gewichtStatus(f.id, 'umfrage'));   // „rechnen“ bei Umfrage nur in den ausdrücklich erlaubten Nachzieh-Fällen (Diagramme)
      expect(f.id.startsWith('diagramm:')).toBe(true);
    }
  });
});

describe('Sperr- und Hinweissätze (Wort „Fallgewicht“ überall)', () => {
  const gH: Gewicht = { spalte: 'w', art: 'haeufigkeit' }, gU: Gewicht = { spalte: 'wu', art: 'umfrage' };
  const nurFallgewicht = (t: string) => expect(t.match(/(?<!Fall|Häufigkeits|Umfrage)[Gg]ewicht(?!et)/g), t).toBeNull();
  it('Hinweis statt Sperre (Einzelfall, Fälle, Kategorien, Meta-Analyse, Daten-Check): genau dieser Satz', () => {
    for (const id of ['einzelfall:alle', 'faelle:alle', 'kategorien:alle', 'meta:alle', 'datencheck:alle']) {
      expect(sperrSatz(id, gH, 'X')).toBe('Das Fallgewicht wird hier nicht verwendet.');
      expect(sperrSatz(id, gU, 'X')).toBe('Das Fallgewicht wird hier nicht verwendet.');
    }
  });
  it('Sperre bei Häufigkeitsgewicht: nennt das Verfahren, „jede Zeile einmal“, Fallgewicht und einen Ausweg', () => {
    const t = sperrSatz('gruppen:rang', gH, 'Mann-Whitney-Test')!;
    expect(t).toContain('Mann-Whitney-Test'); expect(t).toContain('jede Zeile einmal'); expect(t).toContain('Fallgewicht'); expect(t).toMatch(/aus|anderes Verfahren/);
    nurFallgewicht(t);
  });
  it('Sperre bei Umfragegewicht: Stichprobenplan, Standardfehler; sagt, was geht (Mittelwerte, Anteile, Prozente); nennt die Spalte', () => {
    const t = sperrSatz('gruppen:test', gU, 'Gruppenvergleich')!;
    expect(t).toContain('wu'); expect(t).toContain('Stichprobenplan'); expect(t).toContain('Standardfehler'); expect(t).toContain('Mittelwerte'); expect(t).toContain('Anteile'); expect(t).toContain('Prozente');
    nurFallgewicht(t);
  });
  it('rechnet / beschreibend / unberührt: kein Satz', () => {
    expect(sperrSatz('gruppen:test', gH, 'x')).toBeNull(); expect(sperrSatz('verteilung:kennwerte', gU, 'x')).toBeNull(); expect(sperrSatz('assistent:umkodieren', gU, 'x')).toBeNull();
  });
  it('Ergebnis-Zeile „Gerechnet“ und Bericht-Satz nennen Art, N und Zeilen', () => {
    expect(gewichtSatz(gH, 15, 8)).toBe('gewichtet mit w als Häufigkeit (N = 15 aus 8 Zeilen)');
    expect(gewichtSatz(gU, 9.1, 8)).toBe('gewichtet mit wu als Umfragegewicht (n = 8, Summe der Gewichte 9,1)');
  });
});

describe('Gewichtszustand der Engine (SHOW WEIGHT) und Abgleich mit dem Projekt (Falle 1: Gewicht kommt unbemerkt ins Projekt)', () => {
  const tabelle = (wert: string) => [{ type: 'table', label: 'Settings', rows: 1, cols: 2, headRows: [0, 0], headCols: [0, 0], layer: [], caption: null, footnotes: [],
    title: { r: 0, c: 0, rs: 1, cs: 1, h: false, a: 'c', t: 'Settings', x: true },
    cells: [{ r: 0, c: 0, rs: 1, cs: 1, h: true, a: 'l', t: 'WEIGHT', x: true }, { r: 0, c: 1, rs: 1, cs: 1, h: false, a: 'l', t: wert, x: true }] }];
  it('Befehle', () => {
    expect(gewichtBefehl({ spalte: 'w', art: 'haeufigkeit' })).toBe('WEIGHT BY w.');
    expect(gewichtBefehl()).toBe('WEIGHT OFF.');
  });
  it('lesen: Spaltenname oder null bei OFF', () => {
    expect(leseEngineGewicht(tabelle('w') as never)).toBe('w'); expect(leseEngineGewicht(tabelle('OFF') as never)).toBeNull(); expect(leseEngineGewicht([])).toBeNull();
  });
  it('Abgleich', () => {
    const g: Gewicht = { spalte: 'Gew', art: 'umfrage' };
    expect(gewichtAbgleich(null, undefined)).toBe('ok');
    expect(gewichtAbgleich('gew', g)).toBe('ok');
    expect(gewichtAbgleich('w', undefined)).toBe('frage');
    expect(gewichtAbgleich('w', g)).toBe('frage');
    expect(gewichtAbgleich(null, g)).toBe('setzen');
  });
});

describe('Aggregieren (Falle 2): der falsche Kommentar „NU ist in Statable gleich N (ungewichtet)“ ist berichtigt, beide Zahlen werden beschriftet', () => {
  const lies = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap(f => f.isDirectory() ? lies(join(d, f.name)) : /\.(ts|svelte)$/.test(f.name) && !/\.test\.ts$/.test(f.name) ? [readFileSync(join(d, f.name), 'utf8')] : []);
  const alles = lies(fileURLToPath(new URL('..', import.meta.url))).join('\n');
  it('der falsche Satz steht nirgends mehr', () => { expect(/NU ist in Statable gleich N/.test(alles), 'datenassistent.ts, Zeile um AGGREGATE: Kommentar berichtigen').toBe(false); });
  it('die Beschriftungen „Fälle (gewichtet)“ und „Zeilen (ungewichtet)“ gibt es (N gewichtet, NU ungewichtet)', () => {
    expect(alles.includes('Fälle (gewichtet)'), 'Beschriftung Fälle (gewichtet)').toBe(true); expect(alles.includes('Zeilen (ungewichtet)'), 'Beschriftung Zeilen (ungewichtet)').toBe(true);
  });
});
