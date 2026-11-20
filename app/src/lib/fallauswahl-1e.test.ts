import { describe, expect, it } from 'vitest';
import { fallauswahl } from './fallauswahl';

/* ===== ROTE TESTS Paket 1E: Fallauswahl „einflussreich“ (Cook-Distanz) und „divers“ (Zellen aus Kategorien) - Prüfer; der Bauer ändert diese Datei nicht =====
 * Soll: scripts/fallauswahl-erwartet.R (Ausgabe scripts/fallauswahl-erwartet.txt). Fachblatt docs/erheben/FACHBLATT-STUFE-1.md, Paket 1E.
 * Zweite Quelle der Cook-Werte: Fox & Weisberg (2019), An R Companion to Applied Regression, 3. Aufl., Abschnitt 8.3.3, S. 401-402 (influencePlot, Spalte CookD): stimmt mit R auf 6 Stellen.
 * Die Regeln gibt es noch nicht, daher `as any` an der Aufrufstelle: Die Tests laufen und schlagen fehl.
 *
 * Aufruf wie bei den alten Regeln: fallauswahl(regel, spalten, { k?, zeilen? }); `FallRegel` bekommt 'einflussreich' und 'divers'.
 * Alle Spalten sind Zahlen oder null (fehlend); Kategorien werden als ZAHLEN-CODES übergeben (z. B. 1, 2, 3, wie Werte-Codes im Datensatz), null = fehlend.
 * Die Reihenfolge der Kategorien ist die Größe des Codes aufsteigend; Zeilen mit null in IRGENDEINER gewählten Spalte fallen listenweise weg (ausgeschlossen, n wie bei den alten Regeln).
 *
 * einflussreich: spalten[0] = Ziel Y, übrige Spalten = X (wie 'abweichend'; Modell mit Konstante, p = Zahl der Koeffizienten).
 *   Vorschlaege: die k Fälle mit der größten Cook-Distanz, absteigend (EINE Liste, kein „hoch/tief“); bei Gleichstand (auf 9 Stellen) die kleinere Zeilennummer.
 *   Je Vorschlag: zeile, rang 1…, richtung null, wert = D, rohwert null, weitere wie bei den alten Regeln (nicht gewählte Fälle mit gleichem D).
 *   extra.ueber4n: number = Anzahl der Fälle mit D > 4/n (n = Zahl der gültigen Fälle; echt größer); extra.ueber1: boolean = irgendein D > 1; extra.grenze4n: number = 4/n.
 *     (Beide sind Daumenregeln; die Oberfläche nennt sie so, die Funktion liefert nur die Zahlen.)
 *   Hebelwert 1 (h ≥ 1 - 1e-12): D ist dort 0/0, R liefert NaN. Die Funktion liefert nie NaN/Infinity: der Fall wird NICHT gerankt, es gilt
 *     extra.hebelEins: number[] = Zeilennummern dieser Fälle (aufsteigend) und hinweise enthält 'hebel-eins'; fehler bleibt null, die übrigen Fälle werden gerankt (D wie in R).
 *     Der Bauer muss dafür `regression()` lockern: dort liefert h > 1 - 1e-12 bisher null (→ 'regression-unmoeglich'), das gilt für 'abweichend' weiter.
 *   Rangmangel / zu wenige Fälle: wie 'abweichend' → fehler 'regression-unmoeglich'. Die Prüfung „Spalte 1 hat weniger als 3 verschiedene Werte“ bleibt wie bei 'abweichend'.
 *   Typ: Auswahl.hinweise erhält 'hebel-eins'; Auswahl.extra erhält ueber4n, ueber1, grenze4n, hebelEins (alle optional im Typ).
 *
 * divers: spalten = 1 bis 3 kategoriale Spalten (Codes). Jede vorkommende Kombination ist eine Zelle.
 *   Je Zelle EIN Fall: die kleinste Zeilennummer unter den Fällen ohne Lücke in den gewählten Spalten. Reihenfolge: Zelle nach Fallzahl absteigend, bei Gleichstand nach den Codes
 *   (erste Spalte zuerst, dann zweite …, jeweils aufsteigend). Je Vorschlag: zeile, rang 1…, richtung null, wert = Fallzahl der Zelle, rohwert null, weitere = Fallzahl der Zelle - 1
 *   (die nicht vorgeschlagenen Fälle derselben Zelle; zählt NICHT als 'gleichstaende', dieser Hinweis kommt bei 'divers' nie vor). Die Zelle selbst gibt `extra.zellen` nicht her; die Fallzahl steht in `wert`.
 *   extra.zellen: number = Zahl der besetzten Zellen; extra.moegliche: number = Produkt der Zahl der vorkommenden Kategorien je Spalte (alle denkbaren Kombinationen);
 *   extra.leer: number[][] = die leeren Kombinationen als Code-Listen in Spaltenreihenfolge, sortiert wie die Zellen (Codes aufsteigend); ohne leere Kombination [].
 *   k begrenzt die Zahl der Vorschläge; gibt es mehr besetzte Zellen als k, enthält hinweise 'zellen-mehr-als-k' (der Text „Es gibt 12 Kombinationen; gezeigt werden die 10 häufigsten“ entsteht aus extra.zellen und k).
 *   Die übrigen Hinweise gelten wie bisher ('n-klein' bei n < 10 oder n < 2k, 'viele-gewaehlt' bei mehr als n/2 Vorschlägen). Die Prüfung „weniger als 3 verschiedene Werte“ gilt hier NICHT
 *   (zwei Kategorien sind erlaubt). Keine gültigen Fälle → fehler 'keine-faelle'.
 *   Typ: Auswahl.hinweise erhält 'zellen-mehr-als-k'; Auswahl.extra erhält zellen, moegliche, leer.
 */
const fa = (regel: string, spalten: (number | null)[][], o: { k?: number; zeilen?: number[] } = {}): any => fallauswahl(regel as any, spalten, o);
const nah = (ist: number, soll: number, tol = 5e-7) => expect(Math.abs(ist - soll), `${ist} gegen ${soll}`).toBeLessThanOrEqual(tol);

/* Duncan (carData::Duncan, 45 Berufe, Zeilen in der Reihenfolge von R) */
const prestige = [82, 83, 90, 76, 90, 87, 93, 90, 52, 88, 57, 89, 97, 59, 73, 38, 76, 81, 45, 92, 39, 34, 41, 16, 33, 53, 67, 57, 26, 29, 10, 15, 19, 10, 13, 24, 20, 7, 3, 16, 6, 11, 8, 41, 10];
const income = [62, 72, 75, 55, 64, 21, 64, 80, 67, 72, 42, 76, 76, 41, 48, 76, 53, 60, 42, 78, 29, 48, 55, 29, 21, 47, 81, 36, 22, 44, 15, 7, 42, 9, 21, 21, 16, 16, 9, 14, 12, 17, 7, 34, 8];
const education = [86, 76, 92, 90, 86, 84, 93, 100, 87, 86, 74, 98, 97, 84, 91, 34, 45, 56, 44, 82, 72, 55, 71, 50, 23, 39, 28, 32, 22, 25, 29, 7, 26, 19, 15, 20, 26, 28, 17, 22, 30, 25, 20, 47, 32];
/* die zehn größten Cook-Distanzen aus R (Zeile → D, 10 Stellen): minister 6, conductor 16, reporter 9, RR.engineer 27, contractor 17, machinist 28, insurance.agent 23, factory.owner 18, store.clerk 24, coal.miner 32 */
const TOP10: [number, number][] = [[6, 0.5663797396], [16, 0.2236412222], [9, 0.0989845638], [27, 0.0809680748], [17, 0.0585234584], [28, 0.0421484729], [23, 0.0377398339], [18, 0.0373042052], [24, 0.0332672795], [32, 0.0301688420]];

describe('einflussreich: Cook-Distanz, Duncan (R: cooks.distance(lm(prestige ~ income + education)))', () => {
  it('k = 10: Zeilen und D absteigend wie R (6 Stellen), eine Liste, Rang 1 bis 10, richtung und rohwert null', () => {
    const r = fa('einflussreich', [prestige, income, education], { k: 10 });
    expect(r.regel).toBe('einflussreich'); expect(r.fehler).toBeNull(); expect(r.n).toBe(45); expect(r.ausgeschlossen).toBe(0);
    expect(r.vorschlaege.map((v: any) => v.zeile)).toEqual(TOP10.map(t => t[0]));
    expect(r.vorschlaege.map((v: any) => v.rang)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    r.vorschlaege.forEach((v: any, i: number) => { nah(v.wert, TOP10[i]![1]); expect(v.richtung).toBeNull(); expect(v.rohwert).toBeNull(); expect(v.weitere).toBe(0); });
  });
  it('Voreinstellung k = 3: minister (6), conductor (16), reporter (9)', () => {
    const r = fa('einflussreich', [prestige, income, education]);
    expect(r.k).toBe(3); expect(r.vorschlaege.map((v: any) => v.zeile)).toEqual([6, 16, 9]);
  });
  it('Daumenregeln: 3 Fälle über 4/n = 0,0889 (6, 9, 16), keiner über 1', () => {
    const r = fa('einflussreich', [prestige, income, education]);
    expect(r.extra.ueber4n).toBe(3); expect(r.extra.ueber1).toBe(false); nah(r.extra.grenze4n, 4 / 45, 1e-12);
  });
  it('Fox & Weisberg (2019), S. 402: die fünf gedruckten Cook-Werte (minister .566380, conductor .223641, reporter .098985, RR.engineer .080968, contractor .058523)', () => {
    const r = fa('einflussreich', [prestige, income, education], { k: 5 });
    const d = new Map<number, number>(r.vorschlaege.map((v: any) => [v.zeile, v.wert]));
    nah(d.get(6)!, 0.566380); nah(d.get(16)!, 0.223641); nah(d.get(9)!, 0.098985); nah(d.get(27)!, 0.080968); nah(d.get(17)!, 0.058523);
  });
  it('fehlender Wert (prestige von Zeile 6 fehlt): listenweise, n = 44, Zeilennummern bleiben; R: conductor 0,5269425918, reporter 0,1114410764, contractor 0,0654967182; 2 über 4/44', () => {
    const p = [...prestige] as (number | null)[]; p[5] = null;
    const r = fa('einflussreich', [p, income, education], { k: 3 });
    expect(r.n).toBe(44); expect(r.ausgeschlossen).toBe(1); expect(r.vorschlaege.map((v: any) => v.zeile)).toEqual([16, 9, 17]);
    nah(r.vorschlaege[0].wert, 0.5269425918); nah(r.vorschlaege[1].wert, 0.1114410764); nah(r.vorschlaege[2].wert, 0.0654967182);
    expect(r.extra.ueber4n).toBe(2); expect(r.extra.ueber1).toBe(false);
  });
  it('Zeilennummern aus o.zeilen wandern mit', () => {
    const z = prestige.map((_, i) => 1000 + i), r = fa('einflussreich', [prestige, income, education], { k: 3, zeilen: z });
    expect(r.vorschlaege.map((v: any) => v.zeile)).toEqual([1005, 1015, 1008]);
  });
  it('zweimal gerechnet = dasselbe; die Eingabe bleibt unverändert', () => {
    const sp = [prestige, income, education].map(c => Object.freeze([...c]) as unknown as number[]);
    expect(() => fa('einflussreich', sp)).not.toThrow(); expect(fa('einflussreich', sp)).toEqual(fa('einflussreich', sp));
  });
});

describe('einflussreich: Grenzfall Hebelwert 1 (R: Cook-D = NaN) - nie NaN oder Unendlich', () => {
  // erfundenes Beispiel; Fall 7 ist der einzige mit g = 1 → h = 1, Rest 0. R: D(7) = NaN, übrige endlich (größte: 12, 11, 8)
  const y = [3.1, 4, 5.2, 5.9, 7.1, 8.3, 20, 9.8, 11.2, 12.1, 12.8, 14.3], x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], g = [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0];
  it('Hinweis hebel-eins mit Zeile 7, kein Fehlercode, Fall 7 nicht im Ranking, übrige D wie R', () => {
    const r = fa('einflussreich', [y, x, g], { k: 3 });
    expect(r.fehler).toBeNull(); expect(r.hinweise).toContain('hebel-eins'); expect(r.extra.hebelEins).toEqual([7]);
    expect(r.vorschlaege.map((v: any) => v.zeile)).toEqual([12, 11, 8]);
    nah(r.vorschlaege[0].wert, 0.3028240111); nah(r.vorschlaege[1].wert, 0.2820977819); nah(r.vorschlaege[2].wert, 0.0940033900);
  });
  it('auch mit k = 10 kein NaN und kein Unendlich, 11 gültige D', () => {
    const r = fa('einflussreich', [y, x, g], { k: 10 });
    expect(r.vorschlaege.length).toBe(10); for (const v of r.vorschlaege) { expect(Number.isFinite(v.wert)).toBe(true); expect(v.zeile).not.toBe(7); }
    expect(Number.isFinite(r.extra.grenze4n)).toBe(true);
  });
  it('ohne Hebelwert 1 kein Hinweis hebel-eins und extra.hebelEins leer oder fehlt', () => {
    const r = fa('einflussreich', [prestige, income, education]); expect(r.hinweise).not.toContain('hebel-eins'); expect(r.extra.hebelEins ?? []).toEqual([]);
  });
});

describe('divers: Handbeispiel (8 Fälle, 2 Merkmale mit je 2 Kategorien, Kombination A=2/B=2 leer; R table(): 3 2 / 3 0)', () => {
  const A = [1, 2, 1, 1, 2, 1, 1, 2], B = [1, 1, 2, 1, 1, 1, 2, 1];
  // Zellen: (1,1) Zeilen 1, 4, 6 = 3 · (1,2) Zeilen 3, 7 = 2 · (2,1) Zeilen 2, 5, 8 = 3 · (2,2) leer. Gleichstand 3:3 → Codes: (1,1) vor (2,1).
  it('Zeilen 1, 2, 3 · wert 3, 3, 2 · Ränge 1, 2, 3 · richtung und rohwert null · weitere 2, 2, 1', () => {
    const r = fa('divers', [A, B]);
    expect(r.regel).toBe('divers'); expect(r.fehler).toBeNull(); expect(r.k).toBe(3); expect(r.n).toBe(8); expect(r.ausgeschlossen).toBe(0);
    expect(r.vorschlaege.map((v: any) => v.zeile)).toEqual([1, 2, 3]); expect(r.vorschlaege.map((v: any) => v.rang)).toEqual([1, 2, 3]);
    expect(r.vorschlaege.map((v: any) => v.wert)).toEqual([3, 3, 2]); expect(r.vorschlaege.map((v: any) => v.richtung)).toEqual([null, null, null]);
    expect(r.vorschlaege.map((v: any) => v.rohwert)).toEqual([null, null, null]); expect(r.vorschlaege.map((v: any) => v.weitere)).toEqual([2, 2, 1]);
  });
  it('die leere Kombination wird genannt: extra.leer = [[2, 2]], 3 besetzte von 4 möglichen Zellen', () => {
    const r = fa('divers', [A, B]); expect(r.extra.leer).toEqual([[2, 2]]); expect(r.extra.zellen).toBe(3); expect(r.extra.moegliche).toBe(4);
  });
  it('Hinweise: nur n-klein (n = 8); kein gleichstaende (Gleichstand der Fallzahlen ist keiner der Rechenwerte), kein zellen-mehr-als-k bei k = 3', () => {
    expect(fa('divers', [A, B]).hinweise).toEqual(['n-klein']);
  });
  it('k = 2: nur die zwei häufigsten (Zeilen 1, 2), Hinweis zellen-mehr-als-k, extra.zellen = 3', () => {
    const r = fa('divers', [A, B], { k: 2 });
    expect(r.vorschlaege.map((v: any) => v.zeile)).toEqual([1, 2]); expect(r.hinweise).toContain('zellen-mehr-als-k'); expect(r.extra.zellen).toBe(3);
  });
  it('Lücke: B von Zeile 1 fehlt → n = 7, ausgeschlossen 1; Zeilen 2, 4, 3 · wert 3, 2, 2 (Gleichstand 2:2 nach Codes (1,1) vor (1,2)); leer [[2, 2]]', () => {
    const b = [...B] as (number | null)[]; b[0] = null;
    const r = fa('divers', [A, b]);
    expect(r.n).toBe(7); expect(r.ausgeschlossen).toBe(1); expect(r.vorschlaege.map((v: any) => v.zeile)).toEqual([2, 4, 3]); expect(r.vorschlaege.map((v: any) => v.wert)).toEqual([3, 2, 2]);
    expect(r.extra.leer).toEqual([[2, 2]]);
  });
  it('Zeilennummern aus o.zeilen wandern mit (Zeile 1 heißt dann 101 usw.)', () => {
    const r = fa('divers', [A, B], { zeilen: A.map((_, i) => 101 + i) }); expect(r.vorschlaege.map((v: any) => v.zeile)).toEqual([101, 102, 103]);
  });
  it('eine Kategorienspalte allein: Zellen = Kategorien (A: 1 mit 5 Fällen, 2 mit 3 Fällen) → Zeilen 1, 2, keine leere Kombination', () => {
    const r = fa('divers', [A]); expect(r.fehler).toBeNull(); expect(r.vorschlaege.map((v: any) => v.zeile)).toEqual([1, 2]); expect(r.vorschlaege.map((v: any) => v.wert)).toEqual([5, 3]); expect(r.extra.leer).toEqual([]);
  });
  it('keine gültigen Fälle: keine-faelle; zweimal gerechnet = dasselbe; Eingabe unverändert', () => {
    expect(fa('divers', [[null, null], [null, null]]).fehler).toBe('keine-faelle');
    const a = Object.freeze([...A]) as unknown as number[], b = Object.freeze([...B]) as unknown as number[];
    expect(() => fa('divers', [a, b])).not.toThrow(); expect(fa('divers', [a, b])).toEqual(fa('divers', [a, b]));
  });
});
