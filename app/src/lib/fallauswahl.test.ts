import { describe, expect, it } from 'vitest';
import erwartet from './testdaten/spaeter-d-erwartet.json';
import { baueFaelle, bildeGruppen, type RohSpalte, type Wert } from './faelle';
import { fallauswahl, kennungWarnung, nimmVorschlagZurueck, uebernehmeVorschlag } from './fallauswahl';

/* ===== ROTE TESTS Welle S-D, G11: Fälle für Interviews vorschlagen (nie automatisch) - Prüfer; der Bauer B ändert Test und JSON nicht =====
 * Soll: scripts/spaeter-d-erwartet.R → testdaten/spaeter-d-erwartet.json (g11). Fachblatt Abschnitt 2 + „Entscheidungen Opus“ 2. Daten: testdaten/mediation-moderation.csv (X = selbstwirksamkeit, Y = wohlbefinden), Zeilennummer = Zeile der Daten.
 * Zweite Quelle im Skript: zwei getrennte R-Umsetzungen (vektorisiert / Schleifen), PSPP EXAMINE (Werte; bei Gleichstand andere Fälle: PSPP-Befund F13), PSPP REGRESSION /SAVE RESID, rstandard und Hat-Matrix von Hand.
 * Neues Modul `lib/fallauswahl.ts` (reine Funktionen, kein PSPP, schreibt nie in die Daten, wählt nie von selbst aus). API:
 *
 *   fallauswahl(regel: 'extrem' | 'typisch' | 'abweichend' | 'variation', spalten: (number | null)[][] /* je Spalte alle Zeilen; null = fehlend *\/, o?: { k?: number /* 1 bis 10, Voreinstellung 3 *\/; zeilen?: number[] /* Zeilennummern, Voreinstellung 1 … n *\/ }): Auswahl
 *     Auswahl = { regel; k; n: number /* Fälle ohne Lücke in IRGENDEINER übergebenen Spalte *\/; ausgeschlossen: number; vorschlaege: Vorschlag[]; hinweise: ('gleichstaende' | 'n-klein' | 'viele-gewaehlt')[];
 *                 fehler: null | 'keine-faelle' | 'zu-wenige-werte' | 'regression-unmoeglich' | 'singulaer';
 *                 extra: { median?: number; anzahlMax?: number; anzahlMin?: number; r2?: number; koeffizienten?: number[] } }
 *     Vorschlag = { zeile: number /* Zeilennummer wie in den Daten *\/; rang: number /* 1 … k je Liste *\/; richtung: 'hoch' | 'tief' | 'besser' | 'schlechter' | null; wert: number /* Rechenwert *\/; rohwert: number | null; weitere: number }
 *   Regeln (Spalte 1 = spalten[0]):
 *     extrem      nur Spalte 1: erst die k höchsten (richtung 'hoch'), dann die k niedrigsten ('tief'); wert = z = (x − M)/SD (SD mit n − 1); rohwert = x
 *     typisch     eine Spalte: kleinster Abstand |x − Median| (wert = Abstand, rohwert = x, extra.median); mehrere Spalten: kleinste Mahalanobis-D² (Kovarianz klassisch, n − 1) zum Mittelwertvektor (rohwert null)
 *     abweichend  Spalte 1 = Ziel Y, die übrigen X (OLS): intern studentisierte Residuen r = e/(s·√(1 − h)); erst die k größten positiven ('besser'), dann die k größten negativen ('schlechter'); rohwert = Rest e; extra.r2 und extra.koeffizienten (Konstante zuerst)
 *     variation   Farthest-first auf z-Werten aller Spalten (euklidisch): Start = Fall mit dem größten Abstand zum Schwerpunkt (wert = dieser Abstand), danach jeweils der Fall mit dem größten KLEINSTEN Abstand zu den schon gewählten (wert = dieser Abstand); richtung/rohwert null, weitere 0
 *   Gleichstand: Rechenwerte, die sich erst jenseits der 9. Stelle unterscheiden, sind gleich (Gleitkomma-Rauschen); dann entscheidet die KLEINERE Zeilennummer. `weitere` = Zahl der NICHT gewählten Fälle mit demselben Rechenwert (Extrem, Typisch, Abweichend).
 *   Hinweise: 'gleichstaende' wenn irgendein Vorschlag weitere > 0 · 'n-klein' wenn n < 10 oder n < 2k · 'viele-gewaehlt' wenn mehr als n/2 Fälle vorgeschlagen sind. Bei n < 2k können dieselben Fälle in beiden Listen stehen (nicht entfernen).
 *   Fehler: kein gültiger Fall → 'keine-faelle'; Spalte 1 (Ziel) mit weniger als 3 verschiedenen Werten → 'zu-wenige-werte' (vorschlaege leer); abweichend mit n ≤ Prädiktoren + 2 oder Rangmangel → 'regression-unmoeglich'; typisch mit singulärer Kovarianz → 'singulaer'.
 *   kennungWarnung(spaltenname: string, werte?: (string | number | null)[]): boolean        Namen mit „name“, „mail“, „tel“, „adresse“ (ohne Beachtung von Groß/klein) oder Werte mit „@“ → true (Klarnamen werden nie gelistet)
 *   uebernehmeVorschlag(e: Faelle, schluessel: string[], name = 'Interview-Vorschlag'): string        legt mit neueGruppe eine eigene Gruppe an und verschiebt die Fälle mit verschiebe (nur im Zustand des Blatts, NIE in die Daten); gibt die Gruppen-id zurück
 *   nimmVorschlagZurueck(e: Faelle, id: string): void        = loescheGruppe: die Fälle gehen zurück in ihre vorgeschlagenen Gruppen
 */
const G = (erwartet as any).g11;
const nah = (ist: number, soll: number, tol = 1e-9) => expect(Math.abs(ist - soll), `${ist} gegen ${soll}`).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(soll)));
const spalten = (f: any): (number | null)[][] => Object.values(f.eingabe) as (number | null)[][];

describe('Je Regel das Beispiel aus R (Zeilen, Rechenwerte 1e-9, Gleichstände)', () => {
  for (const f of G.faelle) it(`${f.name}: ${f.text}`, () => {
    const r = fallauswahl(f.regel, spalten(f), { k: f.k, zeilen: f.zeilen ?? undefined });
    expect(r.regel).toBe(f.regel); expect(r.k).toBe(f.k); expect(r.n).toBe(f.n); expect(r.ausgeschlossen).toBe(f.ausgeschlossen); expect(r.fehler).toBe(f.fehler ?? null);
    expect(r.vorschlaege.map(v => v.zeile)).toEqual(f.vorschlaege.map((v: any) => v.zeile)); expect(r.vorschlaege.map(v => v.rang)).toEqual(f.vorschlaege.map((v: any) => v.rang));
    expect(r.vorschlaege.map(v => v.richtung)).toEqual(f.vorschlaege.map((v: any) => v.richtung ?? null)); expect(r.vorschlaege.map(v => v.weitere)).toEqual(f.vorschlaege.map((v: any) => v.weitere));
    r.vorschlaege.forEach((v, i) => { const e = f.vorschlaege[i]; nah(v.wert, e.wert); if (e.rohwert === null) expect(v.rohwert).toBeNull(); else nah(v.rohwert!, e.rohwert); });
    expect([...r.hinweise].sort()).toEqual([...f.hinweise].sort());
    const ex = f.extra ?? {};
    if (ex.median !== undefined) nah(r.extra.median!, ex.median); if (ex.anzahl_max !== undefined) { expect(r.extra.anzahlMax).toBe(ex.anzahl_max); expect(r.extra.anzahlMin).toBe(ex.anzahl_min); }
    if (ex.r2 !== undefined) nah(r.extra.r2!, ex.r2); if (ex.koeffizienten) ex.koeffizienten.forEach((c: number, i: number) => nah(r.extra.koeffizienten![i]!, c));
    for (const v of r.vorschlaege) { expect(Number.isNaN(v.wert)).toBe(false); expect(Number.isInteger(v.zeile) && v.zeile >= 1).toBe(true); }
  });
});

describe('Gedruckt im Fachblatt 2.5 (Zeilen und gerundete Werte)', () => {
  const nr = (name: string) => G.faelle.find((f: any) => f.name === name);
  const y = nr('extrem_y').eingabe.y, x = nr('abweichend').eingabe.x;
  it('Extrem: hoch 23, 13, 108 · tief 62, 44, 87; z = 2,592 / 2,161 / −2,303; Gleichstand bei 20,0 (Fälle 13, 108, 126): 126 fällt weg, „weitere: 1“', () => {
    const r = fallauswahl('extrem', [y]); expect(r.vorschlaege.map(v => v.zeile)).toEqual([23, 13, 108, 62, 44, 87]);
    expect([r.vorschlaege[0]!.wert, r.vorschlaege[1]!.wert, r.vorschlaege[3]!.wert].map(v => Math.round(v * 1000) / 1000)).toEqual([2.592, 2.161, -2.303]);
    expect(r.vorschlaege[1]!.weitere).toBe(1); expect(r.vorschlaege[2]!.weitere).toBe(1); expect(r.vorschlaege[0]!.weitere).toBe(0); expect(r.hinweise).toContain('gleichstaende');
    expect(fallauswahl('extrem', [y], { k: 2 }).vorschlaege.slice(0, 2).map(v => v.zeile)).toEqual([23, 13]); expect(fallauswahl('extrem', [y], { k: 2 }).vorschlaege[1]!.weitere).toBe(2);
  });
  it('Typisch (Wohlbefinden, Median 14,5): 72, 145, 34 (fünf Fälle mit Abstand ,1); zwei Spalten (D²): 123, 90, 144', () => {
    const r = fallauswahl('typisch', [y]); expect(r.vorschlaege.map(v => v.zeile)).toEqual([72, 145, 34]); nah(r.extra.median!, 14.5); expect(r.vorschlaege[2]!.weitere).toBe(4);
    expect(fallauswahl('typisch', [x, y]).vorschlaege.map(v => v.zeile)).toEqual([123, 90, 144]);
  });
  it('Abweichend (Y ~ X; b = 9,543047 + 1,068739·X, R² = ,3571): besser 69, 82, 7 · schlechter 14, 87, 121; r = 2,3784 / −2,7531', () => {
    const r = fallauswahl('abweichend', [y, x]); expect(r.vorschlaege.map(v => v.zeile)).toEqual([69, 82, 7, 14, 87, 121]); expect(r.vorschlaege.map(v => v.richtung)).toEqual(['besser', 'besser', 'besser', 'schlechter', 'schlechter', 'schlechter']);
    nah(r.vorschlaege[0]!.wert, 2.3784, 1e-4); nah(r.vorschlaege[3]!.wert, -2.7531, 1e-4); nah(r.extra.koeffizienten![0]!, 9.543047, 1e-6); nah(r.extra.koeffizienten![1]!, 1.068739, 1e-6); nah(r.extra.r2!, 0.3571, 2e-4);
    nah(r.vorschlaege[0]!.rohwert!, 4.868, 1e-3); nah(r.vorschlaege[3]!.rohwert!, -5.628, 1e-3);
  });
  it('Maximale Variation (X, Y als z; k = 5): 126, 44, 82, 140, 102', () => { expect(fallauswahl('variation', [x, y], { k: 5 }).vorschlaege.map(v => v.zeile)).toEqual([126, 44, 82, 140, 102]); });
});

describe('Lücken, Zeilennummern, Reproduzierbarkeit', () => {
  it('Lücken: Zeilennummern bleiben die der Daten, die Zahl der Ausgeschlossenen steht dabei (Abweichend: 147 gültige Fälle)', () => {
    const f = G.faelle.find((x: any) => x.name === 'luecken_abweichend'); expect(f.n).toBe(147); expect(f.ausgeschlossen).toBe(3);
    const r = fallauswahl('abweichend', [G.luecken.y, G.luecken.x]); expect(r.ausgeschlossen).toBe(3); for (const v of r.vorschlaege) expect([3, 50, 77]).not.toContain(v.zeile);
  });
  it('gleiche Regeln auf ein Folgeprojekt (gleiche Daten, andere Zeilenfolge, Zeilennummern wandern mit): gleiche Fälle', () => {
    const f = G.mischung, r = fallauswahl('extrem', [f.eingabe.y], { zeilen: f.zeilen });
    expect(r.vorschlaege.map(v => v.zeile)).toEqual(f.vorschlaege.map((v: any) => v.zeile)); expect(r.vorschlaege.map(v => v.zeile)).toEqual([23, 13, 108, 62, 44, 87]);
  });
  it('zweimal gerechnet = dasselbe (keine Zufallsauswahl)', () => { const y = G.y5; expect(fallauswahl('extrem', [y])).toEqual(fallauswahl('extrem', [y])); });
  it('die übergebenen Daten bleiben unverändert (eingefroren: jede Schreibung würde auffallen)', () => {
    const y = Object.freeze([...G.y5]) as unknown as number[], x = Object.freeze([...G.y3]) as unknown as number[];
    for (const regel of ['extrem', 'typisch', 'abweichend', 'variation'] as const) expect(() => fallauswahl(regel, [y, x], { k: 4 })).not.toThrow();
  });
});

describe('Ränder: Fehlercodes und Hinweise, nie NaN', () => {
  it('Skala mit 3 Werten: erlaubt, fast alles Gleichstand (Hinweis), die Zeilennummer entscheidet; Skala 1 bis 5 mit 24 Höchstwerten: Zahl der Gleichstände steht dabei', () => {
    const f3 = G.faelle.find((f: any) => f.name === 'drei_werte'), r3 = fallauswahl('extrem', [G.y3]); expect(r3.fehler).toBeNull(); expect(r3.hinweise).toContain('gleichstaende');
    expect(r3.vorschlaege.slice(0, 3).map(v => v.zeile)).toEqual(f3.vorschlaege.slice(0, 3).map((v: any) => v.zeile)); expect(r3.vorschlaege.slice(0, 3).map(v => v.zeile)).toEqual([...r3.vorschlaege.slice(0, 3).map(v => v.zeile)].sort((a, b) => a - b));
    const r5 = fallauswahl('extrem', [G.y5]); expect(r5.extra.anzahlMax).toBe(24); expect(r5.extra.anzahlMin).toBe(12); expect(r5.vorschlaege[0]!.weitere).toBe(21);
  });
  it('weniger als 3 verschiedene Werte in der Zielspalte: zu-wenige-werte, keine Vorschläge', () => {
    const r = fallauswahl('extrem', [[1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2]]); expect(r.fehler).toBe('zu-wenige-werte'); expect(r.vorschlaege).toEqual([]);
    expect(fallauswahl('typisch', [Array(20).fill(4)]).fehler).toBe('zu-wenige-werte');
  });
  it('n < 2k oder n < 10: Hinweis n-klein; mehr als die Hälfte gewählt: viele-gewaehlt; nie NaN', () => {
    const f = G.faelle.find((x: any) => x.name === 'klein_n8'), r = fallauswahl('extrem', [f.eingabe.y], { k: 5 }); expect(r.n).toBe(8); expect([...r.hinweise].sort()).toEqual(['n-klein', 'viele-gewaehlt']);
    expect(r.vorschlaege.length).toBe(10); for (const v of r.vorschlaege) { expect(Number.isFinite(v.wert)).toBe(true); expect(v.zeile).toBeGreaterThanOrEqual(1); expect(v.zeile).toBeLessThanOrEqual(8); }
    const g = fallauswahl('typisch', [Array.from({ length: 14 }, (_, i) => (i * 7) % 13)], { k: 3 }); expect(g.hinweise).not.toContain('n-klein');
    expect(fallauswahl('typisch', [Array.from({ length: 12 }, (_, i) => (i * 7) % 13)], { k: 7 }).hinweise).toContain('viele-gewaehlt');
  });
  it('keine gültigen Fälle: keine-faelle; Regression mit n ≤ Prädiktoren + 2 oder doppelter Spalte: regression-unmoeglich; typisch mit gleichen Spalten: singulaer', () => {
    expect(fallauswahl('extrem', [[null, null, null]]).fehler).toBe('keine-faelle'); expect(fallauswahl('abweichend', [[1, 2, 3], [3, 1, 2]]).fehler).toBe('regression-unmoeglich');
    const y = Array.from({ length: 30 }, (_, i) => Math.sin(i) * 3 + i * 0.1), x = Array.from({ length: 30 }, (_, i) => Math.cos(i * 1.3) * 2);
    expect(fallauswahl('abweichend', [y, x, x]).fehler).toBe('regression-unmoeglich'); expect(fallauswahl('typisch', [x, x]).fehler).toBe('singulaer'); expect(fallauswahl('abweichend', [y, x]).fehler).toBeNull();
  });
  it('k wird begrenzt: k = 10 bei n = 12 liefert höchstens n Fälle je Liste', () => {
    const r = fallauswahl('typisch', [Array.from({ length: 12 }, (_, i) => (i * 5) % 11)], { k: 10 }); expect(r.vorschlaege.length).toBeLessThanOrEqual(12);
  });
});

describe('Klarnamen: Warnung, nie gelistet', () => {
  it('Spaltenname mit name, mail, tel oder adresse warnt; harmlose Namen nicht', () => {
    for (const n of G.klarnamen.warnung) expect(kennungWarnung(n), n).toBe(true); for (const n of G.klarnamen.keine) expect(kennungWarnung(n), n).toBe(false);
  });
  it('Werte mit „@“ warnen auch bei harmlosem Namen', () => { expect(kennungWarnung('kontakt', ['x@y.de', null])).toBe(true); expect(kennungWarnung('klasse', ['5b', '6a'])).toBe(false); expect(kennungWarnung('id', [17, 18])).toBe(false); });
});

describe('Übernahme in die Gruppen der Fälle-Tabelle und Rückgängig (nur im Blatt, nie in die Daten)', () => {
  const sp = (name: string): RohSpalte => ({ name, bezeichnung: name, art: 'zahl', fehlend: [], werteLabels: {} });
  const zeilen: Wert[][] = [[1, 10], [2, 20], [3, 30], [4, 40], [5, 50], [6, 60]];
  const bau = () => baueFaelle([sp('a'), sp('b')], zeilen, { kennung: '', q: ['a', 'b'], t: [] });
  it('die gewählten Fälle bilden eine Gruppe „Interview-Vorschlag“; vorher nichts angekreuzt; Rückgängig stellt die alte Gruppierung wieder her', () => {
    const e = bau(), vorher = JSON.stringify(bildeGruppen(e).map(g => [g.id, g.mitglieder])), daten = JSON.stringify(e.faelle);
    const id = uebernehmeVorschlag(e, [e.faelle[1]!.schluessel, e.faelle[4]!.schluessel]); const gr = bildeGruppen(e), g = gr.find(x => x.id === id)!;
    expect(g.name).toBe('Interview-Vorschlag'); expect(g.mitglieder).toEqual([1, 4]); expect(g.vorschlag).toBe(false);
    for (const andere of gr.filter(x => x.id !== id)) { expect(andere.mitglieder).not.toContain(1); expect(andere.mitglieder).not.toContain(4); }
    expect(JSON.stringify(e.faelle)).toBe(daten);   // die Fälle selbst bleiben unverändert
    nimmVorschlagZurueck(e, id); expect(JSON.stringify(bildeGruppen(e).map(x => [x.id, x.mitglieder]))).toBe(vorher);
  });
  it('eigener Name der Gruppe', () => { const e = bau(), id = uebernehmeVorschlag(e, [e.faelle[0]!.schluessel], 'Zwei Interviews'); expect(bildeGruppen(e).find(x => x.id === id)!.name).toBe('Zwei Interviews'); });
});
