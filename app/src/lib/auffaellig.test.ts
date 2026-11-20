import { describe, expect, it } from 'vitest';
import erwartet from './testdaten/spaeter-c-erwartet.json';
import * as modul from './auffaellig';
import { zWerte, zGrenze, zKannFinden, zAuffaellig, mahalanobis, gleichfoermig, schnell, auffaelligeFaelle } from './auffaellig';
import type { Daten } from './umformen';
import type { Spalte } from './verzeichnis';
import { s } from './sitzung.svelte';

/* ===== Später, Welle S-C, Bauer B (Vorab: reine Funktionen): auffällige Fälle - NUR HINWEISE mit Kennzeichnungsspalte, nie automatisch löschen =====
 * Fachblatt 4.6 und Entscheidung Opus 5: z-Werte (|z| > 3,29) mit der Grenze (n − 1)/√n (Shiffler 1988), Mahalanobis-Abstand D² (Vergleichswert χ² bei p < ,001), gleichförmiges Antworten (Itemblock ≥ 5 Items), Antwortzeit relativ zum Median.
 * Ausgabe: Liste der Fälle MIT GRUND und je Regel eine 0/1-Kennzeichnungsspalte; kein „löschen“-Knopf, keine Funktion dafür. Das Fallgewicht wird nicht verwendet (datencheck:alle = hinweis).
 * Sollwerte: testdaten/spaeter-c-erwartet.json (daten.auffaellig) aus scripts/spaeter-c-erwartet.R: z gegen PSPP DESCRIPTIVES /SAVE (beide Datensätze), D² gegen R mahalanobis() und von Hand (S⁻¹), χ²-Quantil qchisq.
 * ⚠ Offene Auslegung (dem Opus gemeldet): Fachblatt 4.6 Nr. 3 sagt, gleichförmiges Antworten sei „nur bei gemischter Polung aussagekräftig“, 4.7 (8) „bei gemischter Polung nicht erkannt“ - die beiden Sätze widersprechen sich.
 * Der Test legt fest: gleichförmige Blöcke werden IMMER erkannt (Hinweis), die Stärke steht dabei: 'deutlich' bei gemischter Polung (Zustimmung zu gegenpoligen Items ist ein Widerspruch), 'schwach' bei gleicher Polung (kann echt sein).
 * Der Bauer ändert Test, Skript und JSON nicht.
 *
 * ---------------------------------- Schnittstelle (festgelegt vom Prüfer; Modul lib/auffaellig.ts, rein, ohne Oberfläche; alle Indizes 0-basiert) ----------------------------------
 *  zWerte(werte: (number | null)[]): (number | null)[]            (x − Mittel)/SD mit Nenner n − 1 über die gültigen Werte (ohne Fallgewicht); null bleibt null; weniger als 2 gültige Werte oder SD 0 → lauter null (nie NaN)
 *  zGrenze(n: number): number                                       der größte mögliche |z| bei n Werten: (n − 1)/√n
 *  zKannFinden(n: number, grenze = 3.29): boolean                   zGrenze(n) > grenze (also erst ab n = 13; das Fachblatt sagt „n < 12“ ungenau)
 *  zAuffaellig(werte, grenze = 3.29): { zeile: number; wert: number; z: number }[]      |z| > grenze
 *  mahalanobis(zeilen: (number | null)[][], p = 0.001): { d2: (number | null)[]; df: number; grenze: number; funde: number[]; nGeprueft: number; nichtGeprueft: number } | { fehler: 'singulaer' | 'zuWenigFaelle' | 'konstant' | 'keineSpalten' }
 *      Zeilen mit einer Lücke werden NICHT geprüft (d2 null, zählen in nichtGeprueft); df = Zahl der Spalten k; grenze = χ²-Quantil (1 − p; k); n ≤ k + 1 → 'zuWenigFaelle'; singuläre Kovarianzmatrix (z. B. Spalte = 2 · andere) → 'singulaer'; eine Spalte ohne Streuung → 'konstant'
 *  gleichfoermig(block: (number | null)[][], o?: { minItems?: number /* 5 *\/; anteil?: number /* 0.9 *\/; umgepolt?: boolean[] }): { zeile: number; anteil: number; staerke: 'deutlich' | 'schwach' }[]
 *      je Person der größte Anteil gleicher Antworten unter den gültigen Items (≥ anteil → Fund); Personen mit weniger als minItems gültigen Antworten werden nicht geprüft; ein Block mit weniger als minItems Spalten wird gar nicht geprüft.
 *      staerke 'deutlich', wenn `umgepolt` gleichzeitig true und false enthält, sonst 'schwach'.
 *  schnell(zeiten: (number | null)[], anteilMedian = 0.4): { zeilen: number[]; median: number; grenze: number }     „sehr schnell“: Zeit < anteilMedian · Median der gültigen Zeiten (Faustregel; Leiner 2019 nennt TIME_RSI ≥ 2)
 *  auffaelligeFaelle(d: Daten, o: { z?: string[]; mahalanobis?: string[]; gleichfoermig?: string[]; umgepolt?: string[]; zeit?: string }): AuffErgebnis
 *      AuffErgebnis = { faelle: { zeile: number; gruende: { regel: 'z' | 'D2' | 'gleichfoermig' | 'schnell'; spalte?: string; wert?: number; z?: number; d2?: number; staerke?: 'deutlich' | 'schwach' }[] }[];   // nur Fälle mit mindestens einem Grund, nach Zeile
 *                       kennzeichen: { name: 'auffaellig_z' | 'auffaellig_D2' | 'auffaellig_gleichfoermig' | 'auffaellig_schnell'; werte: (0 | 1)[] }[];       // nur für die gewählten Regeln; eine Spalte je Regel
 *                       hinweise: { art: 'zKannNichtsFinden' | 'mahalanobis' | 'wenigeFaelle'; satz: string }[] }
 *      Die Hinweissätze sind ganze Sätze (de/du): zKannNichtsFinden = „Bei so wenigen Fällen kann die z-Regel nichts finden; schau dir die Werte selbst an.“ (genau dieser Satz, bei n ≤ 12); mahalanobis nennt den Grund eines Fehlers.
 *      Das Modul bietet KEINE Funktion zum Entfernen, Löschen oder Ausschließen von Fällen an.
 */
s.einst.sprache = 'de'; s.einst.anrede = 'du';
const A = (erwartet as any).daten.auffaellig, Z = A.z, D = A.d2, GL = A.gleich, ZT = A.zeit;
const lueck = (a: any[]): (number | null)[] => a.map(v => (v === null ? null : Array.isArray(v) ? v[0] : v));
const nah = (ist: number | null | undefined, soll: number | null, w: string, t = 1e-9) => {
  if (soll === null) { expect(ist, w).toBeNull(); return; }
  expect(typeof ist, `${w}: ${ist}`).toBe('number'); expect(Number.isNaN(ist as number), `${w}: NaN`).toBe(false);
  expect(Math.abs((ist as number) - soll), `${w}: ${ist} gegen ${soll}`).toBeLessThanOrEqual(t * Math.max(1, Math.abs(soll)));
};
const nahListe = (a: (number | null)[], b: (number | null)[], w: string, t = 1e-9) => { expect(a.length, `${w}: Länge`).toBe(b.length); b.forEach((v, i) => nah(a[i], v, `${w} [${i}]`, t)); };
const sp = (name: string, rest: Partial<Spalte> = {}): Spalte => ({ name, bezeichnung: '', art: 'zahl', niveau: 'metrisch', format: 'F8.2', fehlend: [], fehlendText: '', werteLabels: {}, ...rest });

describe('z-Werte und die Grenze kleiner Stichproben (Shiffler 1988)', () => {
  it('Fachblatt 10 Fälle: Mittel 13,2, SD 6,0882, Fall 7 z = 2,7594, Fall 5 z = −0,6899 (PSPP DESCRIPTIVES /SAVE = R)', () => {
    const z = zWerte(Z.a); nahListe(z, Z.z, 'z a'); nah(z[6], 2.7594, 'Fall 7', 1e-4); nah(z[4], -0.6899, 'Fall 5', 1e-4);
    expect(Math.abs(Z.mittel - 13.2)).toBeLessThan(1e-9);
  });
  it('n = 30 mit Tippfehler 99: z-Werte gleich PSPP/R; die Regel findet genau diesen einen Fall (Zeile 15)', () => {
    nahListe(zWerte(Z.a30), Z.z30, 'z30'); expect(zAuffaellig(Z.a30).map(f => f.zeile)).toEqual(Z.funde30); const f = zAuffaellig(Z.a30)[0]!; expect(f.wert).toBe(99); nah(f.z, Z.z30[14], 'z des Tippfehlers');
  });
  it('n = 10: der größte mögliche |z| ist 9/√10 = 2,846 - die Regel KANN nichts finden, auch bei offensichtlichem Ausreißer (Fall 7, z = 2,76)', () => {
    nah(zGrenze(10), Z.max_moeglich, 'zGrenze(10)'); nah(zGrenze(10), 9 / Math.sqrt(10), 'Formel'); expect(zKannFinden(10)).toBe(false); expect(zAuffaellig(Z.a)).toEqual(Z.funde);
  });
  for (const t of Z.z_n_grenze_tabelle as { n: number; max: number; kann: boolean }[]) it(`n = ${t.n}: größter möglicher |z| ${t.max.toFixed(3)} → ${t.kann ? 'kann finden' : 'kann nichts finden'}`, () => { nah(zGrenze(t.n), t.max, 'max'); expect(zKannFinden(t.n)).toBe(t.kann); });
  it('Ränder: konstante Spalte, ein Wert, Lücken, leere Eingabe - lauter null, nie NaN', () => {
    expect(zWerte([5, 5, 5])).toEqual([null, null, null]); expect(zWerte([4])).toEqual([null]); expect(zWerte([])).toEqual([]); nahListe(zWerte([1, null, 3, NaN as any]), [-Math.SQRT1_2, null, Math.SQRT1_2, null], 'z mit Lücken');
    expect(zAuffaellig([5, 5, 5])).toEqual([]); expect(zAuffaellig([])).toEqual([]);
  });
  it('das Fallgewicht gibt es hier nicht: die Signaturen kennen keins (datencheck:alle = hinweis)', () => { expect(zWerte.length).toBe(1); expect(mahalanobis.length).toBeLessThanOrEqual(2); });
});

describe('Mahalanobis-Abstand D²: gegen R mahalanobis() und die Formel von Hand', () => {
  it('Fachblatt 10 × 3: D² 0,3960 / 1,2705 / 4,0841 / … / 7,8356 (Fall 7) …; Grenze χ²(3; ,999) = 16,266 - KEIN Fall überschreitet sie (n = 10, k = 3: zu wenig Fälle)', () => {
    const r = mahalanobis(D.zeilen) as any; expect(r.fehler).toBeUndefined(); nahListe(r.d2, D.d2, 'D2'); expect(r.df).toBe(3); nah(r.grenze, D.grenze, 'χ²', 1e-6); expect(r.funde).toEqual(D.funde);
    expect(r.nGeprueft).toBe(10); expect(r.nichtGeprueft).toBe(0); nah(r.d2[6], 7.8356, 'Fall 7', 1e-4);
  });
  it('n = 30, zwei Spalten (x mit Tippfehler, y): D² gegen R, Grenze χ²(2; ,999) = 13,816, der Tippfehler wird gefunden', () => {
    const r = mahalanobis(D.zeilen30) as any; nahListe(r.d2, D.d2_30, 'D2 n = 30'); nah(r.grenze, D.grenze2, 'χ²(2)', 1e-6); expect(r.df).toBe(2); expect(r.funde).toEqual(D.funde30); expect(r.funde).toContain(14);
  });
  it('Lücken: Zeilen mit fehlendem Wert werden nicht geprüft (d2 null), die übrigen gegen R mit nur den vollständigen Zeilen; die Zahl der nicht prüfbaren Fälle wird genannt', () => {
    const z = D.mit_luecke.zeilen.map((r: any[]) => lueck(r)); const r = mahalanobis(z) as any; nahListe(r.d2, lueck(D.mit_luecke.d2), 'D2 mit Lücke'); expect(r.nichtGeprueft).toBe(D.mit_luecke.nicht_geprueft); expect(r.nGeprueft).toBe(9);
    nah(r.grenze, D.mit_luecke.grenze, 'Grenze', 1e-6);
  });
  it('singuläre Matrix (Spalte = 2 · andere), zu wenige Fälle (n ≤ k + 1), konstante Spalte, keine Spalten → Fehlermeldung statt Ergebnis', () => {
    expect((mahalanobis(D.singulaer.zeilen) as any).fehler).toBe('singulaer'); expect((mahalanobis(D.zuwenig.zeilen) as any).fehler).toBe('zuWenigFaelle');
    expect((mahalanobis([[1, 5], [2, 5], [3, 5], [4, 5], [6, 5]]) as any).fehler).toBe('konstant'); expect((mahalanobis([[], [], []]) as any).fehler).toBe('keineSpalten'); expect((mahalanobis([]) as any).fehler).toBeTruthy();
  });
  it('die Wahrscheinlichkeit p wirkt: p = ,01 gibt eine kleinere Grenze als p = ,001', () => { expect((mahalanobis(D.zeilen30, 0.01) as any).grenze).toBeLessThan((mahalanobis(D.zeilen30) as any).grenze); });
});

describe('Gleichförmiges Antworten (Itemblock mit ≥ 5 Items) und Antwortzeit', () => {
  const blockMitLuecken = (b: any[][]) => b.map(lueck);
  it('Block mit 6 Items, 8 Personen: gefunden werden Person 1, 4, 5 und 6 (alle gleich); Person 2 (5 von 6 = 83 %), Person 3, 7 nicht; Person 8 hat nur 3 gültige Antworten und wird nicht geprüft', () => {
    const r = gleichfoermig(blockMitLuecken(GL.block6)); expect(r.map(x => x.zeile)).toEqual(GL.erwartet6); r.forEach(x => nah(x.anteil, 1, 'Anteil'));
    const anteile = lueck(GL.anteil6); expect(anteile[1]).toBeCloseTo(5 / 6, 12); expect(anteile[7]).toBeNull();
  });
  it('9 von 10 gleichen Antworten genügen (≥ 90 %), 8 von 10 nicht', () => { const r = gleichfoermig(GL.block10); expect(r.map(x => x.zeile)).toEqual(GL.erwartet10); nah(r[0]!.anteil, 0.9, '9/10'); });
  it('ein Block mit weniger als 5 Items wird gar nicht geprüft (4 gleiche Antworten sind kein Befund)', () => { expect(gleichfoermig(GL.block4)).toEqual(GL.erwartet4); });
  it('Stärke: bei gleicher Polung „schwach“ (kann echt sein), bei gemischter Polung der Items „deutlich“ - der Fund bleibt in beiden Fällen', () => {
    const b = blockMitLuecken(GL.block6);
    expect(gleichfoermig(b, { umgepolt: [false, false, false, false, false, false] }).every(x => x.staerke === 'schwach')).toBe(true);
    const g = gleichfoermig(b, { umgepolt: [false, true, false, true, false, true] }); expect(g.map(x => x.zeile)).toEqual(GL.erwartet6); expect(g.every(x => x.staerke === 'deutlich')).toBe(true);
  });
  it('eigene Schwellen: minItems 3 und anteil 1 finden auch den Fall mit nur 3 gültigen Antworten (Person 8)', () => { expect(gleichfoermig(blockMitLuecken(GL.block6), { minItems: 3, anteil: 1 }).map(x => x.zeile)).toContain(7); });
  it('Antwortzeit: unter 40 % des Medians (295 s → Grenze 118 s) sind Person 3 (90 s) und Person 5 (100 s); Person 10 (120 s) nicht; die fehlende Zeit wird nicht geprüft', () => {
    const r = schnell(lueck(ZT.zeiten)); expect(r.zeilen).toEqual(ZT.erwartet); nah(r.median, ZT.median, 'Median'); nah(r.grenze, ZT.grenze, 'Grenze'); expect(schnell([]).zeilen).toEqual([]); expect(schnell([null, null]).zeilen).toEqual([]);
  });
});

describe('auffaelligeFaelle: Liste mit Grund und Kennzeichnungsspalten; nichts wird gelöscht', () => {
  const daten = (): Daten => {
    const x = Z.a30 as number[], y = (D.zeilen30 as number[][]).map(r => r[1]!), zeit = x.map((_, i) => (i === 3 ? 20 : 200 + i));
    return { spalten: [sp('x'), sp('y'), sp('zeit')], zeilen: x.map((v, i) => [v, y[i]!, zeit[i]!]) } as Daten;
  };
  it('z auf x (n = 30): ein Fall, Zeile 14, Grund „z“ mit Wert 99 und z; Kennzeichnungsspalte auffaellig_z hat genau eine 1', () => {
    const r = auffaelligeFaelle(daten(), { z: ['x'] }); expect(r.faelle.length).toBe(1); expect(r.faelle[0]!.zeile).toBe(14);
    expect(r.faelle[0]!.gruende[0]).toMatchObject({ regel: 'z', spalte: 'x', wert: 99 }); nah(r.faelle[0]!.gruende[0]!.z, Z.z30[14], 'z');
    const k = r.kennzeichen.find(c => c.name === 'auffaellig_z')!; expect(k.werte.length).toBe(30); expect(k.werte.reduce<number>((a, b) => a + b, 0)).toBe(1); expect(k.werte[14]).toBe(1); expect(r.hinweise).toEqual([]);
  });
  it('mehrere Regeln gleichzeitig: z auf x, D² auf x und y, Zeit: ein Fall kann mehrere Gründe haben, die Kennzeichnungsspalten gibt es nur für die gewählten Regeln', () => {
    const r = auffaelligeFaelle(daten(), { z: ['x'], mahalanobis: ['x', 'y'], zeit: 'zeit' });
    expect(r.kennzeichen.map(c => c.name).sort()).toEqual(['auffaellig_D2', 'auffaellig_schnell', 'auffaellig_z']);
    const f14 = r.faelle.find(f => f.zeile === 14)!; expect(f14.gruende.map(g => g.regel).sort()).toEqual(['D2', 'z']); expect(r.faelle.find(f => f.zeile === 3)!.gruende.map(g => g.regel)).toEqual(['schnell']);
    expect(r.faelle.map(f => f.zeile)).toEqual([...r.faelle.map(f => f.zeile)].sort((a, b) => a - b));
    nah(f14.gruende.find(g => g.regel === 'D2')!.d2!, D.d2_30[14], 'D2 des Tippfehlers');
  });
  it('Pflichtfall „kleines n“: bei 10 Fällen findet die z-Regel nichts, und der Hinweis sagt es mit genau diesem Satz; bei 30 Fällen kein Hinweis', () => {
    const d: Daten = { spalten: [sp('a')], zeilen: (Z.a as number[]).map(v => [v]) } as Daten, r = auffaelligeFaelle(d, { z: ['a'] });
    expect(r.faelle).toEqual([]); expect(r.hinweise.map(h => h.art)).toEqual(['zKannNichtsFinden']); expect(r.hinweise[0]!.satz).toBe('Bei so wenigen Fällen kann die z-Regel nichts finden; schau dir die Werte selbst an.');
    expect(auffaelligeFaelle(daten(), { z: ['x'] }).hinweise).toEqual([]); expect(r.kennzeichen[0]!.werte.every(v => v === 0)).toBe(true);
  });
  it('D²-Fehler werden als Hinweis genannt, nicht still verschluckt (singuläre Spalten)', () => {
    const d: Daten = { spalten: [sp('c1'), sp('c2')], zeilen: (D.singulaer.zeilen as number[][]).map(r => [...r]) } as Daten, r = auffaelligeFaelle(d, { mahalanobis: ['c1', 'c2'] });
    expect(r.faelle).toEqual([]); expect(r.hinweise.some(h => h.art === 'mahalanobis' && h.satz.length > 15)).toBe(true);
  });
  it('Gleichförmigkeit mit Polung über die Spaltennamen; Fund mit Stärke', () => {
    const namen = ['i1', 'i2', 'i3', 'i4', 'i5', 'i6'], b = GL.block6.map(lueck) as (number | null)[][];
    const d: Daten = { spalten: namen.map(n => sp(n, { format: 'F8.0' })), zeilen: b } as Daten, r = auffaelligeFaelle(d, { gleichfoermig: namen, umgepolt: ['i2', 'i4', 'i6'] });
    expect(r.faelle.map(f => f.zeile)).toEqual(GL.erwartet6); expect(r.faelle.every(f => f.gruende.every(g => g.regel === 'gleichfoermig' && g.staerke === 'deutlich'))).toBe(true);
    expect(r.kennzeichen.find(c => c.name === 'auffaellig_gleichfoermig')!.werte).toEqual([1, 0, 0, 1, 1, 1, 0, 0]);
  });
  it('NIE löschen: das Modul bietet keine Funktion zum Entfernen, Löschen oder Ausschließen an, und die Daten werden nicht verändert', () => {
    expect(Object.keys(modul).filter(k => /l(ö|oe)sch|entfern|delete|remove|ausschl|drop/i.test(k))).toEqual([]);
    const d = daten(), kopie = JSON.parse(JSON.stringify(d)); auffaelligeFaelle(d, { z: ['x'], mahalanobis: ['x', 'y'], zeit: 'zeit' }); expect(d).toEqual(kopie);
  });
  it('fehlende Werte in den gewählten Spalten: Zeilen mit Lücke werden bei D² nicht geprüft und im Hinweis gezählt (wenigeFaelle nur, wenn zu wenige übrig bleiben)', () => {
    const d: Daten = { spalten: [sp('a'), sp('b'), sp('c')], zeilen: (D.mit_luecke.zeilen as any[]).map((r, i) => [lueck(r)[0] ?? null, (D.zeilen[i] as number[])[1]!, (D.zeilen[i] as number[])[2]!]) } as Daten;
    const r = auffaelligeFaelle(d, { mahalanobis: ['a', 'b', 'c'] }); expect(r.kennzeichen[0]!.werte[1]).toBe(0); expect(r.faelle).toEqual([]);
  });
});
