import { describe, expect, it } from 'vitest';
import ERW from './testdaten/spaeter-f2-erwartet.json';
import { s } from './sitzung.svelte';
import { gruppenKennzahlen, balkenAchse, balkenAchseFuer, intervalleUeberlappen, balkenSatz, balkenAltText, BALKEN_GRUPPEN_MAX } from './balken';

/* ===== Später, Welle S-F2, Teil E: Balken „Mittelwert nach Gruppe“ ohne Test (Fachblatt SPAETER-F2-ERGAENZUNGEN Abschnitt E und „Entscheidungen Opus (19.10.)“ 11 und 12 gehen vor) =====
 * ROTE TESTS des Sollwert-Prüfers. Der Bauer B darf diese Datei und die JSON nicht ändern. Reine JS-Funktionen in lib/balken.ts (Kennzahlen und Achse); das Bild ist die auf 2 bis 12 Gruppen erweiterte `bausteine/Gruppendiagramm.svelte`
 * (heute nur `ZweiGruppen`); es erscheint bei „Nach Gruppen erkunden“ und beim Gruppenvergleich mit mehr als zwei Gruppen. Voreinstellung Punkte mit Mittelwert und 95-%-KI (Opus 11), Säulen als Wahl, IMMER ab 0, kein Standardfehler allein.
 * Sollwerte: scripts/spaeter-f2-erwartet.R → testdaten/spaeter-f2-erwartet.json, Abschnitt `balken` (datasets::chickwts, ToothGrowth, iris); zweite Quelle t.test(y)$conf.int je Gruppe auf 1e-9; Häufigkeitsgewicht gleich dem Wiederholen der Zeilen (1e-9).
 * Toleranz: 1e-9 relativ.
 *
 * SCHNITTSTELLE lib/balken.ts
 *   BALKEN_GRUPPEN_MAX = 12
 *   gruppenKennzahlen(y: (number | null)[], g: (string | number | null)[], o?: { gewicht?: (number | null)[]; reihenfolge?: string[] }):
 *        { ok: true; gruppen: GruppeKz[]; ausgelassen: number } | { ok: false; code: 'keine-werte' | 'zu-wenig-gruppen' | 'zu-viele-gruppen'; anzahl?: number }
 *      GruppeKz = { gruppe: string; n: number; mittel: number; sd: number | null; se: number | null; df: number | null; kiU: number | null; kiO: number | null; min: number; max: number }
 *      Häufigkeitsgewicht (ganze Zahlen ≥ 0): n = Σw, m = Σw·y/Σw, s² = Σw(y − m)²/(Σw − 1), se = s/√Σw, df = Σw − 1, KI = m ± t(,975; df)·se (t-Verteilung, JE GRUPPE, nicht gepoolt). Ohne Gewicht w = 1.
 *      n = 1 (bzw. Σw = 1): sd, se, df, kiU, kiO = null. Zeilen mit fehlendem y, g oder Gewicht fallen heraus (`ausgelassen` zählt die Zeilen). Gewicht 0 lässt die Zeile weg (Gruppe ohne Gewicht verschwindet nicht, wenn andere Zeilen da sind).
 *      Reihenfolge der Gruppen: `reihenfolge` (Wertelabels der Spalte) wenn gegeben, sonst die Werte aufsteigend (Zahlen numerisch, Text mit localeCompare), NIE nach Mittelwert (Opus 12). Werte in `reihenfolge`, die in den Daten fehlen, werden übergangen;
 *      Daten-Gruppen, die in `reihenfolge` fehlen, kommen hinten dazu. Weniger als 2 Gruppen 'zu-wenig-gruppen', mehr als 12 'zu-viele-gruppen' (anzahl), kein gültiger Wert 'keine-werte'.
 *   balkenAchse(lo: number, hi: number): { schritt: number; unten: number; oben: number }       runde Schritte 1-2-5 × 10^k, etwa fünf Marken (wie Gruppendiagramm.svelte): roh = (hi − lo)/5 (0 → 1), m = 10^⌊log10 roh⌋, n = roh/m, Schritt = (n ≤ 1: 1, ≤ 2: 2, ≤ 5: 5, sonst 10)·m, unten = ⌊lo/Schritt⌋·Schritt, oben = ⌈hi/Schritt⌉·Schritt
 *   balkenAchseFuer(gruppen: GruppeKz[], o: { art: 'saeulen' | 'punkte'; punkte?: number[] }): { schritt: number; unten: number; oben: number }
 *        saeulen: untere Grenze der Daten ist min(0, kleinster Wert), obere max(0, größter Wert) - die Null liegt IMMER auf der Achse; Wertebereich = KI-Enden (kiU/kiO, bei null der Mittelwert) und, wenn `punkte` gegeben, alle Punkte;
 *        punkte: nur der Wertebereich (KI-Enden und Punkte), die Null muss nicht dabei sein.
 *   intervalleUeberlappen(a: { kiU: number | null; kiO: number | null }, b: { kiU: number | null; kiO: number | null }): number | null     Länge der Überlappung (min(oben) − max(unten)); ≤ 0 keine; null, wenn ein Intervall fehlt
 *   balkenSatz(o: { art: 'saeulen' | 'punkte'; fehler: 'ki' | 'sd' | 'keine' }): string    der Satz unter dem Bild (IMMER vorhanden): was die Striche sind; bei fehler 'ki' zusätzlich „Intervalle, die sich überlappen, schließen einen Unterschied nicht aus; das Bild ersetzt keinen Test.“
 *   balkenAltText(gruppen: GruppeKz[], o?: { einheit?: string }): string      für Vorleser: „Mittelwerte von 6 Gruppen: casein 323,6 (n = 12), … ; Spannweite der Mittelwerte von 160,2 bis 328,9.“
 *   Fallgewicht: Schlüssel `diagramm:mittelgruppen` = ['rechnen', 'beschreibend', 'design'] (Test: gewichte-spaeter-f2.test.ts). */
s.einst.sprache = 'de'; s.einst.anrede = 'du';
type Z = Record<string, any>;
const B = (ERW as unknown as Z).balken as Z;
const nah = (ist: any, soll: number, tol: number, was: string) => { expect(typeof ist, `${was}: Zahl erwartet, ist ${JSON.stringify(ist)}`).toBe('number'); expect(Number.isNaN(ist), `${was}: NaN`).toBe(false); expect(Math.abs(ist - soll), `${was} (ist ${ist}, soll ${soll})`).toBeLessThanOrEqual(tol * Math.max(Math.abs(soll), 1e-300)); };
const ok = (e: any) => { expect(e.ok, `Fehler: ${JSON.stringify(e)}`).toBe(true); return e; };
const vergleiche = (ist: Z[], soll: Z[], tol: number, was: string) => {
  expect(ist.map(x => x.gruppe), `${was}: Gruppen`).toEqual(soll.map(x => x.gruppe));
  soll.forEach((sg, i) => { for (const k of ['n', 'mittel', 'sd', 'se', 'df', 'min', 'max']) nah(ist[i]![k], sg[k], tol, `${was} ${sg.gruppe} ${k}`); nah(ist[i]!.kiU, sg.ki_u, tol, `${was} ${sg.gruppe} kiU`); nah(ist[i]!.kiO, sg.ki_o, tol, `${was} ${sg.gruppe} kiO`); });
};

describe('Kennzahlen je Gruppe: gleich t.test je Gruppe (drei Datensätze)', () => {
  for (const [name, text] of [['chickwts', 'chickwts (6 Gruppen, n 10 bis 14)'], ['tooth', 'ToothGrowth (2 Gruppen, n 30)'], ['iris', 'iris (3 Gruppen, n 50)']] as const) {
    it(`${text}: n, Mittel, SD, SE, df, KI, kleinster und größter Wert; Gruppen in der Reihenfolge der Spalte (aufsteigend)`, () => {
      const d = B[name] as Z; const e = ok(gruppenKennzahlen(d.y, d.g)); expect(e.ausgelassen).toBe(0); vergleiche(e.gruppen, d.gruppen, 1e-9, name);
    });
  }
  it('die Reihenfolge der Zeilen ist gleichgültig (gemischt): dasselbe Ergebnis; mit „reihenfolge“ (Wertelabels) in dieser Reihenfolge, nicht nach Größe (Opus 12)', () => {
    const d = B.chickwts as Z; const idx = d.y.map((_: number, i: number) => i).reverse(); const e = ok(gruppenKennzahlen(idx.map((i: number) => d.y[i]), idx.map((i: number) => d.g[i]))); vergleiche(e.gruppen, d.gruppen, 1e-9, 'gemischt');
    const r = ['sunflower', 'soybean', 'meatmeal', 'linseed', 'horsebean', 'casein']; const e2 = ok(gruppenKennzahlen(d.y, d.g, { reihenfolge: r })); expect(e2.gruppen.map((x: Z) => x.gruppe)).toEqual(r); nah(e2.gruppen[0].mittel, 328.9166667, 1e-9, 'sunflower');
    const e3 = ok(gruppenKennzahlen(d.y, d.g, { reihenfolge: ['soybean', 'nix', 'casein'] })); expect(e3.gruppen.map((x: Z) => x.gruppe)).toEqual(['soybean', 'casein', 'horsebean', 'linseed', 'meatmeal', 'sunflower']);
  });
  it('gepoolte Fehlervarianz ist NICHT die Voreinstellung: die Intervalle sind je Gruppe gerechnet (chickwts: MSE 3008,55, df 65 würde andere Zahlen geben)', () => {
    const d = B.chickwts as Z, p = d.gepoolt_alternative as Z; const e = ok(gruppenKennzahlen(d.y, d.g)); nah(p.mse, 3008.5542, 1e-6, 'MSE'); expect(p.df).toBe(65); expect(Math.abs(e.gruppen[0].se - p.gruppen[0].se)).toBeGreaterThan(1e-3);
  });
  it('Zahlenwerte als Gruppen (0/1 oder 1/2/3) werden wie Text behandelt, Reihenfolge numerisch (2 vor 10)', () => {
    const e = ok(gruppenKennzahlen([1, 2, 3, 4, 5, 6], [10, 10, 2, 2, 2, 10])); expect(e.gruppen.map((x: Z) => x.gruppe)).toEqual(['2', '10']); expect(e.gruppen.map((x: Z) => x.n)).toEqual([3, 3]);
  });
});

describe('Häufigkeitsgewicht = Zeilen wiederholen (1e-9); Fehlendes; Grenzen der Gruppenzahl', () => {
  it('chickwts mit Gewichten 1 bis 4 (Startwert 20261026): n = Σw, df = Σw − 1, SD, SE, KI gleich der aufgeblähten Tabelle', () => {
    const h = B.haeufigkeitsgewicht as Z, d = B.chickwts as Z; const e = ok(gruppenKennzahlen(d.y, d.g, { gewicht: h.gewichte })); expect(e.gruppen).toHaveLength(6);
    h.gruppen.forEach((sg: Z, i: number) => { for (const k of ['n', 'mittel', 'sd', 'se', 'df']) nah(e.gruppen[i][k], sg[k], 1e-9, `${sg.gruppe} ${k}`); nah(e.gruppen[i].kiU, sg.ki_u, 1e-9, `${sg.gruppe} kiU`); nah(e.gruppen[i].kiO, sg.ki_o, 1e-9, `${sg.gruppe} kiO`); });
    expect(e.gruppen[0].n).toBe((h.gewichte as number[]).filter((_, i) => d.g[i] === 'casein').reduce((a, b) => a + b, 0));
  });
  it('Gewicht 1 überall gleich ohne Gewicht; Gewicht 0 lässt die Zeile weg', () => {
    const d = B.iris as Z; const a = ok(gruppenKennzahlen(d.y, d.g)), b = ok(gruppenKennzahlen(d.y, d.g, { gewicht: d.y.map(() => 1) })); a.gruppen.forEach((x: Z, i: number) => { nah(x.mittel, b.gruppen[i].mittel, 1e-12, 'Mittel'); nah(x.se, b.gruppen[i].se, 1e-12, 'se'); });
    const w = d.y.map((_: number, i: number) => (i === 0 ? 0 : 1)); const c = ok(gruppenKennzahlen(d.y, d.g, { gewicht: w })); expect(c.gruppen[0].n).toBe(49);
  });
  it('fehlende Werte in y, g oder Gewicht: die Zeile fällt heraus, `ausgelassen` zählt sie', () => {
    const e = ok(gruppenKennzahlen([1, 2, null, 4, 5, 6, 7], ['a', 'a', 'a', null, 'b', 'b', 'b'], { gewicht: [1, 1, 1, 1, 1, null, 1] })); expect(e.ausgelassen).toBe(3); expect(e.gruppen.map((x: Z) => x.n)).toEqual([2, 2]);
  });
  it('eine Gruppe mit einer Person: Mittel ja, sd, se, df und Intervall null (kein Intervall, Satz); NaN gibt es nie', () => {
    const e = ok(gruppenKennzahlen([1, 2, 3, 10], ['a', 'a', 'a', 'b'])); const b = e.gruppen[1]; expect(b.n).toBe(1); expect(b.mittel).toBe(10); for (const k of ['sd', 'se', 'df', 'kiU', 'kiO']) expect(b[k], k).toBeNull();
    for (const g of e.gruppen) for (const v of Object.values(g)) expect(typeof v === 'number' ? Number.isNaN(v) : false).toBe(false);
  });
  it('alle Werte einer Gruppe gleich: SD 0, Intervall mit Breite 0', () => { const e = ok(gruppenKennzahlen([5, 5, 5, 1, 2, 3], ['a', 'a', 'a', 'b', 'b', 'b'])); expect(e.gruppen[0].sd).toBe(0); expect(e.gruppen[0].kiU).toBe(5); expect(e.gruppen[0].kiO).toBe(5); });
  it('12 Gruppen gehen, 13 gesperrt (Satz), 1 Gruppe gesperrt, nichts gültig gesperrt', () => {
    expect(BALKEN_GRUPPEN_MAX).toBe(12); const mk = (k: number) => Array.from({ length: k * 3 }, (_, i) => ({ y: i % 3 + (i / 7), g: `G${String(Math.floor(i / 3)).padStart(2, '0')}` }));
    const a = mk(12), b = mk(13); expect(gruppenKennzahlen(a.map(x => x.y), a.map(x => x.g)).ok).toBe(true); const r = gruppenKennzahlen(b.map(x => x.y), b.map(x => x.g)) as Z; expect(r.ok).toBe(false); expect(r.code).toBe('zu-viele-gruppen'); expect(r.anzahl).toBe(13);
    expect((gruppenKennzahlen([1, 2, 3], ['a', 'a', 'a']) as Z).code).toBe('zu-wenig-gruppen'); expect((gruppenKennzahlen([null, null], ['a', 'b']) as Z).code).toBe('keine-werte');
  });
});

describe('Achse: Säulen immer ab 0, runde Schritte', () => {
  it('Sollwerte (Bausteinregel 1-2-5): chickwts Säulen mit KI 0 bis 400 (Schritt 100), mit Punkten 0 bis 500; ToothGrowth 0 bis 25 (5) und 0 bis 40 (10); iris 0 bis 8 (2)', () => {
    for (const name of ['chickwts', 'tooth', 'iris']) { const d = B[name] as Z; const g = ok(gruppenKennzahlen(d.y, d.g)).gruppen;
      expect(balkenAchseFuer(g, { art: 'saeulen' }), `${name} Säulen`).toEqual(d.achse_saeulen_ki); expect(balkenAchseFuer(g, { art: 'saeulen', punkte: d.y }), `${name} Säulen mit Punkten`).toEqual(d.achse_saeulen_mit_punkten); }
  });
  it('balkenAchse: 1-2-5-Schritte (0 bis 7 → 0 bis 8 bei Schritt 2; 0 bis 1022 → 0 bis 1500 bei Schritt 500; 0 bis 0,23 → 0 bis 0,25 bei 0,05; gleiche Grenzen → Schritt 1)', () => {
    expect(balkenAchse(0, 7)).toEqual({ schritt: 2, unten: 0, oben: 8 }); expect(balkenAchse(0, 1022)).toEqual({ schritt: 500, unten: 0, oben: 1500 }); const a = balkenAchse(0, 0.23); expect(a.schritt).toBeCloseTo(0.05, 12); expect(a.oben).toBeCloseTo(0.25, 12); expect(balkenAchse(3, 3).schritt).toBe(1);
  });
  it('Säulen mit lauter negativen Werten: die Null liegt auf der Achse (oben ≥ 0), unten unter dem kleinsten KI-Ende; Punkte umfassen nur die KI-Enden', () => {
    const g = ok(gruppenKennzahlen([-5, -6, -7, -3, -2, -1], ['a', 'a', 'a', 'b', 'b', 'b'])).gruppen; const s_ = balkenAchseFuer(g, { art: 'saeulen' }); expect(s_.oben).toBeGreaterThanOrEqual(0); expect(s_.unten).toBeLessThanOrEqual(Math.min(...g.map((x: Z) => x.kiU)));
    const p = balkenAchseFuer(g, { art: 'punkte' }); expect(p.oben).toBeGreaterThanOrEqual(Math.max(...g.map((x: Z) => x.kiO))); expect(p.unten).toBeLessThanOrEqual(Math.min(...g.map((x: Z) => x.kiU)));
  });
  it('Punkte ohne Null: Werte um 650 bis 700 → die Achse muss die Null nicht enthalten, Säulen schon', () => {
    const g = ok(gruppenKennzahlen([650, 660, 670, 690, 700, 710], ['a', 'a', 'a', 'b', 'b', 'b'])).gruppen; expect(balkenAchseFuer(g, { art: 'punkte' }).unten).toBeGreaterThan(0); expect(balkenAchseFuer(g, { art: 'saeulen' }).unten).toBe(0);
  });
  it('bei n = 1 (kein Intervall) zählt der Mittelwert für die Achse; es entsteht nie NaN', () => {
    const g = ok(gruppenKennzahlen([1, 2, 3, 100], ['a', 'a', 'a', 'b'])).gruppen; const a = balkenAchseFuer(g, { art: 'saeulen' }); for (const v of Object.values(a)) expect(Number.isNaN(v)).toBe(false); expect(a.oben).toBeGreaterThanOrEqual(100);
  });
});

describe('Überlappende Intervalle ≠ „kein Unterschied“ und die Sätze (de und en)', () => {
  it('chickwts: horsebean gegen linseed überlappen um 2,27 g und sind doch verschieden (Welch p = ,0069); alle Beispiele des Sollwerts', () => {
    const d = B.chickwts as Z; const e = ok(gruppenKennzahlen(d.y, d.g)).gruppen as Z[];
    for (const p of B.ueberlappung_falle.beispiele as Z[]) { const a = e.find(x => x.gruppe === p.a)!, b = e.find(x => x.gruppe === p.b)!; nah(intervalleUeberlappen(a as any, b as any)!, p.ueberlappung, 1e-9, `${p.a} gegen ${p.b}`); expect(p.welch_p).toBeLessThan(0.05); }
    expect(B.ueberlappung_falle.beispiele[0].welch_p).toBeCloseTo(0.00687, 4); nah(B.ueberlappung_falle.faktor_beruehrung, 3.919927969, 1e-9, '3,92'); nah(B.ueberlappung_falle.faktor_signifikant, 2.771808, 1e-6, '2,77');
  });
  it('ToothGrowth: die Intervalle überlappen (OJ gegen VC) und der Welch-Test ist nicht signifikant (p ,06): Überlappung ≠ nie signifikant, nicht signifikant ≠ keine Überlappung', () => {
    const d = B.tooth as Z; const e = ok(gruppenKennzahlen(d.y, d.g)).gruppen as Z[]; expect(intervalleUeberlappen(e[0] as any, e[1] as any)!).toBeGreaterThan(0); expect(intervalleUeberlappen({ kiU: 1, kiO: 2 }, { kiU: 3, kiO: 4 })!).toBeLessThan(0); expect(intervalleUeberlappen({ kiU: null, kiO: null }, e[0] as any)).toBeNull();
  });
  it('Satz unter dem Bild: immer da; bei KI der Überlappungssatz; bei SD und ohne Striche nennt er, was die Striche sind (de)', () => {
    const a = balkenSatz({ art: 'saeulen', fehler: 'ki' }); for (const re of [/Säulen/, /Mittelwert/, /95-%-Konfidenzintervall/, /t-Verteilung/, /Intervalle, die sich überlappen, schließen einen Unterschied nicht aus/, /ersetzt keinen Test/]) expect(a).toMatch(re);
    const b = balkenSatz({ art: 'punkte', fehler: 'sd' }); expect(b).toMatch(/Punkte/); expect(b).toMatch(/Standardabweichung/); expect(b).not.toMatch(/überlappen/); expect(balkenSatz({ art: 'punkte', fehler: 'keine' }).length).toBeGreaterThan(10); expect(a).not.toMatch(/\[prüfen\]|S\. \d/);
  });
  it('Satz englisch', () => { s.einst.sprache = 'en'; try { const a = balkenSatz({ art: 'saeulen', fehler: 'ki' }); for (const re of [/bars/i, /mean/, /95% confidence interval/, /t distribution/, /Overlapping intervals do not rule out a difference/]) expect(a).toMatch(re); } finally { s.einst.sprache = 'de'; } });
  it('Alternativtext für Vorleser: Gruppen mit Mittel und n, Spannweite der Mittelwerte (160,2 bis 328,9)', () => {
    const d = B.chickwts as Z; const t = balkenAltText(ok(gruppenKennzahlen(d.y, d.g)).gruppen); for (const re of [/Mittelwerte von 6 Gruppen/, /casein 323,6 \(n = 12\)/, /horsebean 160,2 \(n = 10\)/, /Spannweite der Mittelwerte von 160,2 bis 328,9/]) expect(t).toMatch(re);
  });
});
