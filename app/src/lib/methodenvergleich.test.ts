import { describe, expect, it } from 'vitest';
import ERW from './testdaten/spaeter-f-erwartet.json';
import { s } from './sitzung.svelte';
import { passingBablok, deming, methodenvergleich } from './methodenvergleich';
import { pbSatz, demingSatz, abweichungSatz, cusumSatz, lambdaErklaerung, lambdaWiederholungSatz, mvGerechnet } from './methodenvergleichsaetze';

/* ===== Später, Welle S-F, Teil 4: Methodenvergleich - Passing-Bablok und Deming (M6; Option „Methodenvergleich“ neben Bland-Altman in der Karte uebereinstimmung, nur bei zwei Zahlenspalten;
 * Fachblatt SPAETER-F Abschnitt 4 und „Entscheidungen Opus (18.10.)“ 5 gehen vor) =====
 * ROTE TESTS des Sollwert-Prüfers. Der Bauer B darf diese Datei und die JSON nicht ändern. Sollwerte: scripts/spaeter-f-erwartet.R (Abschnitt methodenvergleich); jeder Wert hat dort zwei Wege:
 * mcr::mcreg (PaBa analytisch / Deming Jackknife) UND die eigene Umsetzung Schritt für Schritt wie mcr::calc_PaBa; PB-Intervalle zusätzlich gegen das Referenzprogramm „Calanas“ - die 7 Referenzsätze werden im Skript
 * aus mcr/unitTests/runit.mcPaBa.R GELESEN (nicht abgeschrieben); Cusum-Reihe gegen mcr::calcCUSUM; Deming-Steigung gegen das Paket `deming` (1e-4). Die Sollwerte nennen sich im JSON `konstante` (a) und `steigung` (b) der Geraden y = a + b·x.
 * FESTGELEGT (Opus 5): JS, GENAU WIE mcr (Rang-Regel, Winkelmaß „radian“ = Mittel zweier Winkel); Cusum: NUR Statistik und Residuenbild, KEIN p; Werte < 0 sind bei Passing-Bablok gesperrt (wie mcr), n höchstens 4000;
 * Deming: λ = 1 voreingestellt und deutlich sichtbar, mit Sensitivitätstabelle (λ = 0,5; 1; 2) und dem Satz „λ aus Wiederholungsmessungen bestimmen“; KEIN Vergleich mit der gewöhnlichen Regression (OLS).
 * Rechnung in JS (kein R); Math.atan/tan können sich von R in der letzten Stelle unterscheiden: Gleiche Werte bis auf 1e-12 relativ zählen als gleich (Schritt 1 des Algorithmus), darum 1e-9 Toleranz.
 *
 * SCHNITTSTELLE lib/methodenvergleich.ts
 *   passingBablok(x: number[], y: number[], niveau = 0.95): PbErgebnis     KERN ohne Sperren (rechnet auch bei Werten < 0 und negativem Zusammenhang: für die Rechentests; die Oberfläche geht über methodenvergleich())
 *      PbErgebnis = { konstante; konstanteUnten: number | null; konstanteOben: number | null; steigung; steigungUnten: number | null; steigungOben: number | null; anzahlSteigungen: number; cusum: Cusum; residuen: number[] }
 *      null = Grenze nicht bestimmbar (−∞ unten bzw. +∞ oben; zu wenige Steigungen, mcr gibt −Inf/Inf). Algorithmus wie mcr::calc_PaBa Schritt für Schritt (Fachblatt 4.2): Winkel atan(dy/dx) aller Paare i < j mit Toleranz-Differenz,
 *      identische Paare weggelassen, Verschiebung (Offset) durch Winkel <= −π/4 und < −π/4, Median-Rang, C = round(z·√(n(n−1)(2n+5)/18)), Grenzen aus den Rängen, Konstante = Median(y − b·x), Grenzen der Konstanten aus den Grenzen der Steigung.
 *   Cusum = { L: number; M: number; max: number; h: number; reihe: number[] }   L = Zahl Reste > 0, M = Zahl Reste < 0 (Reste mit |e| <= 1e-12·(|y| + |a| + |b·x|) zählen als 0); Punktzahl +√(M/L) bzw. −√(L/M) (0 bei e = 0), sortiert nach
 *      D_i = (y_i + x_i/b − a)/√(1 + 1/b²) (stabil sortiert), reihe = kumulierte Summe, max = max|reihe|, h = max/√(L + M). KEIN Schlüssel p (Opus 5: die Kolmogorov-Form des p ist am Original nicht belegt). residuen = y − a − b·x in Eingabereihenfolge.
 *   deming(x: number[], y: number[], lambda = 1, niveau = 0.95): { lambda; konstante; konstanteSE; konstanteUnten; konstanteOben; steigung; steigungSE; steigungUnten; steigungOben }
 *      λ = Fehlervarianz der Messung auf der waagerechten Achse (x) geteilt durch die der senkrechten (y) (Richtung wie mcr). b = [S_yy − S_xx/λ + √((S_yy − S_xx/λ)² + 4S_xy²/λ)]/(2S_xy), a = ȳ − b·x̄.
 *      Intervall nach Linnet (1990) mit Jackknife: Pseudowerte n·θ − (n−1)·θ_(−i), SE = sd(Pseudowerte)/√n, θ ± t(1 − α/2; n − 2)·SE (wie mcr).
 *   methodenvergleich(x: (number | null)[], y: (number | null)[], opt?: { lambda?: number; niveau?: number }): MvErgebnis | MvFehler          die Funktion der Oberfläche (listenweise, mit allen Sperren)
 *      MvErgebnis = { ok: true; n: number; ausgelassen: number; tau: number (Kendalls τ); pb: PbErgebnis | null; pbFehler: 'negativ' | 'tau' | null; deming: DemingErgebnis; lambdaTabelle: { lambda: number; steigung: number }[] (λ = 0,5; 1; 2 - immer diese drei); hinweise: string[] }
 *      Paare mit einem fehlenden Wert werden ausgelassen (ausgelassen = Zahl). pb ist null (pbFehler gesetzt) bei einem Wert < 0 in x oder y ('negativ' zuerst) oder bei τ <= 0 ('tau'); Deming rechnet dann trotzdem.
 *      hinweise: 'wenig-faelle' (n < 40) · 'wenige-werte' (weniger als 20 verschiedene Werte in x oder in y: viele Bindungen, das Intervall wird grob).
 *      MvFehler = { ok: false; code: 'zu-wenig' (n < 10) | 'zu-gross' (n > 4000) | 'konstant' (x oder y hat nur einen Wert) | 'wenige-werte' (weniger als 5 verschiedene Werte in x oder y) | 'lambda' (λ <= 0 oder nicht endlich) | 'laenge' (x und y verschieden lang) }
 *      Reihenfolge der Prüfungen: laenge, lambda, (Auslassen), zu-wenig, zu-gross, konstant, wenige-werte.
 * SCHNITTSTELLE lib/methodenvergleichsaetze.ts (deutsch, du; Zahlenformat über das Profil; Minus als Zeichen − des Profils)
 *   pbSatz(e: PbErgebnis, opt: { n: number }): string        „Der Methodenvergleich nach Passing und Bablok (n = 108) ergab die Gerade y = −0,12 + 1,09 · x. Das 95-%-Intervall der Steigung reicht von 1,00 bis 1,17, das der Konstanten von −0,20 bis −0,02 …“
 *   demingSatz(e: DemingErgebnis, opt: { n: number }): string  nennt „Deming“, „λ = 1“, „Jackknife“, Steigung und Konstante mit Intervall
 *   abweichungSatz(konstante: { unten: number | null; oben: number | null }, steigung: { unten: number | null; oben: number | null }): string
 *        schließt das Intervall der Konstanten die 0 nicht ein: Hinweis auf eine konstante Abweichung; schließt das der Steigung die 1 nicht ein: Hinweis auf eine proportionale Abweichung; sonst „kein Hinweis auf …“; IMMER „kein Beweis“ (nur ein Hinweis, kein Beweis für Gleichwertigkeit)
 *   cusumSatz(c: Cusum): string                              nennt „Cusum“, die Zahlen L und M und die Statistik h (zwei Stellen) - und KEIN p (kein „p =“, kein „p <“); verweist auf das Residuenbild; „Linearität“ wird nicht bewiesen
 *   lambdaErklaerung(): string                               „Fehlervarianz der Messung auf der waagerechten Achse geteilt durch die der senkrechten“ mit Beispiel („2 heißt: das waagerechte Verfahren misst mit doppelter Fehlervarianz“)
 *   lambdaWiederholungSatz(): string                         λ lässt sich aus Wiederholungsmessungen bestimmen (zwei Messungen je Probe und Verfahren); aus den Daten allein nicht schätzbar
 *   mvGerechnet(a: { art: 'pb' | 'deming'; n: number; lambda?: number }): string      „Passing-Bablok-Regression wie R-Paket mcr 1.3.3.1 (Winkelmaß, Intervall analytisch nach Passing & Bablok), n = 108“ bzw. „Deming-Regression, λ = 1 …, Jackknife-Intervall nach Linnet (1990)“ */
s.einst.sprache = 'de'; s.einst.anrede = 'du';
type Z = Record<string, any>;
const M = (ERW as unknown as Z).methodenvergleich as Z, DAT = M.daten as Z;
const nah = (ist: any, soll: number | null, tol: number, was: string) => {
  if (soll === null) { expect(ist, `${was}: Grenze nicht bestimmbar → null`).toBeNull(); return; }
  expect(typeof ist, `${was}: Zahl erwartet, ist ${JSON.stringify(ist)}`).toBe('number'); expect(Number.isNaN(ist), `${was}: NaN`).toBe(false);
  expect(Math.abs(ist - soll), `${was} (ist ${ist}, soll ${soll})`).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(soll)));
};
const keinNaN = (x: unknown, pfad = ''): void => {
  if (typeof x === 'number') expect(Number.isNaN(x), `NaN bei ${pfad}`).toBe(false);
  else if (Array.isArray(x)) x.forEach((v, i) => keinNaN(v, `${pfad}[${i}]`));
  else if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) keinNaN(v, `${pfad}.${k}`);
};
const ok = (e: any) => { expect(e.ok, `Fehler: ${JSON.stringify(e)}`).toBe(true); return e; };
const xy = (name: string) => [DAT[name].x as number[], DAT[name].y as number[]] as const;
const PB_FELDER = ['konstante', 'konstanteUnten', 'konstanteOben', 'steigung', 'steigungUnten', 'steigungOben'] as const;
function pbGleich(ist: Z, soll: Z, was: string, tol = 1e-9) {
  for (const k of PB_FELDER) nah(ist[k], soll[k], tol, `${was} ${k}`); expect(ist.anzahlSteigungen, `${was}: Zahl der Steigungen`).toBe(soll.anzahlSteigungen); keinNaN(ist, was);
}
function cusumGleich(ist: Z, soll: Z, was: string, mitReihe = true) {
  expect([ist.L, ist.M], `${was}: L, M`).toEqual([soll.L, soll.M]); nah(ist.max, soll.max, 1e-9, `${was} max`); nah(ist.h, soll.h, 1e-9, `${was} h`); expect('p' in ist, `${was}: Opus 5 - kein p`).toBe(false);
  if (mitReihe) { expect(ist.reihe.length).toBe(soll.reihe.length); soll.reihe.forEach((v: number, i: number) => nah(ist.reihe[i], v, 1e-9, `${was} Cusum[${i}]`)); }
}
const demGleich = (ist: Z, soll: Z, was: string) => { for (const k of ['lambda', 'konstante', 'konstanteSE', 'konstanteUnten', 'konstanteOben', 'steigung', 'steigungSE', 'steigungUnten', 'steigungOben']) nah(ist[k], soll[k], 1e-8, `${was} ${k}`); keinNaN(ist, was); };

describe('Passing-Bablok wie mcr: creatinine (n = 108) und das Referenzprogramm „Calanas“', () => {
  it('creatinine: Konstante −0,1171728644 [−0,2001149481; −0,0200000000], Steigung 1,0880089027 [1,0000000000; 1,1730046244], 5777 Steigungen (gedruckt als Calanas-Referenz im mcr-Test)', () => {
    const [x, y] = xy('creatinine'); const e = passingBablok(x, y); pbGleich(e, M.creatinine.pb, 'creatinine');
    nah(e.konstante, -0.11717286443298, 1e-9, 'Calanas Konstante'); nah(e.steigung, 1.08800890272179, 1e-9, 'Calanas Steigung'); nah(e.konstanteUnten, -0.20011494807756, 1e-9, 'Calanas unten'); nah(e.konstanteOben, -0.0200000000000013, 1e-9, 'Calanas oben');
    nah(e.steigungUnten, 1, 1e-9, 'Calanas Steigung unten'); nah(e.steigungOben, 1.17300462437155, 1e-9, 'Calanas Steigung oben'); expect(e.anzahlSteigungen).toBe(5777);
  });
  for (const nm of ['td9', 'td13', 'td15', 'td41', 'td20', 'td75']) {
    it(`Referenzsatz Calanas ${nm} (n = 50${nm === 'td20' || nm === 'td75' ? ', negativer Zusammenhang: der Kern rechnet, die Oberfläche sperrt' : ''}${nm === 'td13' ? ', Werte um 1e7' : nm === 'td9' ? ', Werte um 1e-5' : ''}): Konstante, Steigung und beide Intervalle auf 1e-9`, () => {
      const [x, y] = xy(nm); pbGleich(passingBablok(x, y), M.calanas[nm].pb, nm);
    });
  }
  it('kleine Fälle: n = 8 (gerade Zahl von Steigungen) und n = 7 (ungerade) - Steigung 1,058892623 [0,9188296; 1,1668811] und 1,071428571 [0,7821452; 1,2266949]', () => {
    for (const nm of ['n8', 'n7']) { const [x, y] = xy(nm); pbGleich(passingBablok(x, y), M[nm].pb, nm); }
    nah(passingBablok(...xy('n8')).steigung, 1.058892623, 1e-8, 'n = 8 (Fachblatt)'); nah(passingBablok(...xy('n7')).steigung, 1.071428571, 1e-8, 'n = 7 (Fachblatt)');
  });
  it('n = 4: zu wenige Steigungen für das Intervall - die Grenzen sind null (−∞/+∞), die Punktwerte da', () => { const e = passingBablok(...xy('n4')); pbGleich(e, M.n4.pb, 'n4'); expect([e.steigungUnten, e.steigungOben, e.konstanteUnten, e.konstanteOben]).toEqual([null, null, null, null]); });
  it('Bindungen (creatinine auf eine Dezimale gerundet, N = 5684 Winkel; auf ganze Zahlen ×5, N = 5449): Punkt und Intervall wie mcr, das Intervall ist grob', () => {
    for (const nm of ['bind1', 'bind2']) { const e = passingBablok(...xy(nm)); pbGleich(e, M[nm].pb, nm); }
    expect(passingBablok(...xy('bind1')).anzahlSteigungen).toBe(5684); expect(passingBablok(...xy('bind2')).anzahlSteigungen).toBe(5449);
  });
  it('Achsen vertauscht (creatinine, y gegen x): wie mcr; Steigung · Steigung′ = 1', () => {
    const [x, y] = xy('creatinine_getauscht'); const e = passingBablok(x, y); pbGleich(e, M.creatinine_getauscht.pb, 'creatinine getauscht'); nah(e.steigung * passingBablok(...xy('creatinine')).steigung, 1, 1e-9, 'b · b′');
  });
  it('n = 4000 (obere Grenze), Werte auf zwei Dezimalen (viele Bindungen): wie mcr, in höchstens 30 s', () => {
    const [x, y] = xy('gross'); const t0 = performance.now(); const e = passingBablok(x, y); const dt = performance.now() - t0; expect(dt, `Rechenzeit ${Math.round(dt)} ms`).toBeLessThan(30000);
    for (const k of PB_FELDER) nah(e[k], M.gross.pb[k], 1e-9, `gross ${k}`); expect(e.anzahlSteigungen).toBe(M.gross.pb.anzahlSteigungen); cusumGleich(e.cusum, M.gross.pb.cusum, 'gross', false);
  }, 60000);
});

describe('Cusum: nur Statistik und Residuenbild, KEIN p (Opus 5)', () => {
  it('creatinine: L = M = 54, max = 8, h = 0,7698; die ganze kumulierte Reihe gleich mcr::calcCUSUM (108 Werte)', () => {
    const e = passingBablok(...xy('creatinine')); cusumGleich(e.cusum, M.creatinine.pb.cusum, 'creatinine'); expect(e.cusum.reihe.length).toBe(108); expect(e.cusum.max).toBe(8); nah(e.cusum.h, 0.769800358919501, 1e-9, 'h');
    expect(Object.keys(e.cusum).sort()).toEqual(['L', 'M', 'h', 'max', 'reihe']);
  });
  it('die Sätze mit positivem Zusammenhang (td9, td13, td15, td41) und n = 8, 7, 4: Reihe und Zahlen gleich mcr; bei ungerader Zahl liegt ein Rest genau auf der Geraden (0 zählt nicht)', () => {
    for (const nm of ['td9', 'td13', 'td15', 'td41']) cusumGleich(passingBablok(...xy(nm)).cusum, M.calanas[nm].pb.cusum, nm);
    for (const nm of ['n8', 'n7', 'n4']) cusumGleich(passingBablok(...xy(nm)).cusum, M[nm].pb.cusum, nm);
    expect(passingBablok(...xy('n7')).cusum.L + passingBablok(...xy('n7')).cusum.M).toBe(6);
  });
  it('Residuen in Eingabereihenfolge: y − a − b·x', () => {
    const [x, y] = xy('creatinine'); const e = passingBablok(x, y); expect(e.residuen.length).toBe(108); e.residuen.forEach((r, i) => nah(r, y[i]! - e.konstante - e.steigung * x[i]!, 1e-12, `Rest ${i}`));
    M.creatinine.pb.residuen.forEach((r: number, i: number) => nah(e.residuen[i], r, 1e-9, `Rest gegen R ${i}`));
  });
  it('Satz zum Cusum: Statistik und Zahlen, aber kein p; Residuenbild; keine Aussage „Linearität bewiesen“', () => {
    const t = cusumSatz(passingBablok(...xy('creatinine')).cusum); expect(t).toMatch(/Cusum/); expect(t).toContain('0,77'); expect(t).toContain('54'); expect(t).not.toMatch(/\bp\s*[=<>]/); expect(t).toMatch(/Residuen/); expect(t).toMatch(/beweis/i); expect(t).toMatch(/nicht|kein/); expect(t).not.toMatch(/NaN|undefined|null/);
  });
});

describe('Deming mit Jackknife nach Linnet (1990): wie mcr', () => {
  it('creatinine, λ = 1: Konstante −0,05891341 (SE 0,034375) [−0,127066; 0,009239], Steigung 1,05453934 (SE 0,024883) [1,005207; 1,103872]; gedruckt im mcr-Test: −0,05891341 und 1,054539', () => {
    const [x, y] = xy('creatinine'); const e = deming(x, y, 1); demGleich(e, M.creatinine.deming[0], 'λ = 1');
    nah(e.konstante, -0.05891341, 1e-6, 'gedruckt Konstante'); nah(e.steigung, 1.054539, 1e-6, 'gedruckt Steigung'); nah(e.konstanteSE, 0.034375, 1e-3, 'SE Konstante (Fachblatt)'); nah(e.steigungSE, 0.024883, 1e-3, 'SE Steigung (Fachblatt)'); nah(e.steigungUnten, 1.005207, 1e-5, 'unten (Fachblatt)'); nah(e.steigungOben, 1.103872, 1e-5, 'oben (Fachblatt)');
  });
  it('λ = 0,5 / 2 / 4 auf creatinine: Steigung 1,03414933 / 1,07458608 / 1,09013613; die Richtung von λ ist Fehlervarianz(x) / Fehlervarianz(y)', () => {
    const [x, y] = xy('creatinine'); [0.5, 2, 4].forEach((l, i) => demGleich(deming(x, y, l), M.creatinine.deming[i + 1], `λ = ${l}`));
    nah(deming(x, y, 0.5).steigung, 1.03414933, 1e-6, 'λ = 0,5'); nah(deming(x, y, 2).steigung, 1.07458608, 1e-6, 'λ = 2'); nah(deming(x, y, 4).steigung, 1.09013613, 1e-6, 'λ = 4');
  });
  it('n = 8, die ersten 30 Zeilen, negative Werte (Deming rechnet bei Werten < 0), Achsen vertauscht (λ = 1: Steigung · Steigung′ = 1)', () => {
    demGleich(deming(...xy('n8'), 1), M.n8.deming[0], 'n8'); demGleich(deming(...xy('crea30'), 1), M.crea30.deming[0], 'crea30'); demGleich(deming(...xy('negativ'), 1), M.negativ.deming[0], 'negativ');
    demGleich(deming(...xy('creatinine_getauscht'), 1), M.creatinine_getauscht.deming[0], 'getauscht'); nah(deming(...xy('creatinine'), 1).steigung * deming(...xy('creatinine_getauscht'), 1).steigung, 1, 1e-9, 'b · b′');
  });
  it('Eigenschaft: bei λ = 1 ist die Gerade die orthogonale Regression (Hauptachse); bei fast perfekter Gerade y = 2x + 1 sind Steigung 2 und Konstante 1', () => {
    const x = Array.from({ length: 20 }, (_, i) => i + 1), y = x.map(v => 2 * v + 1); const e = deming(x, y, 1); nah(e.steigung, 2, 1e-12, 'Steigung'); nah(e.konstante, 1, 1e-12, 'Konstante'); keinNaN(e);
  });
});

describe('methodenvergleich(): die Funktion der Oberfläche mit allen Sperren', () => {
  const [xc, yc] = xy('creatinine');
  it('listenweise: 108 vollständige Paare plus 2 Paare mit fehlendem Wert (wie creatinine mit 110 Zeilen) → n = 108, ausgelassen = 2, Zahlen wie ohne die Lücken', () => {
    const x: (number | null)[] = [...xc.slice(0, 50), null, ...xc.slice(50), 3.3], y: (number | null)[] = [...yc.slice(0, 50), 1.5, ...yc.slice(50), null];
    const e = ok(methodenvergleich(x, y)); expect([e.n, e.ausgelassen]).toEqual([108, 2]); pbGleich(e.pb, M.creatinine.pb, 'creatinine mit Lücken'); demGleich(e.deming, M.creatinine.deming[0], 'Deming mit Lücken'); expect(e.pbFehler).toBeNull(); expect(e.deming.lambda).toBe(1);
  });
  it('λ-Tabelle: immer λ = 0,5; 1; 2 mit der Steigung (1,0341; 1,0545; 1,0746); eine andere Wahl von λ ändert den Deming-Teil, nicht die Tabelle', () => {
    const e = ok(methodenvergleich(xc, yc)); expect(e.lambdaTabelle.map((z: Z) => z.lambda)).toEqual([0.5, 1, 2]); [1.0341, 1.0545, 1.0746].forEach((v, i) => nah(e.lambdaTabelle[i].steigung, v, 5e-5, `Tabelle ${i}`));
    const f = ok(methodenvergleich(xc, yc, { lambda: 4 })); demGleich(f.deming, M.creatinine.deming[3], 'λ = 4'); expect(f.lambdaTabelle).toEqual(e.lambdaTabelle);
  });
  it('Kendalls τ ist positiv bei creatinine; keine Hinweise (n = 108, genug verschiedene Werte)', () => { const e = ok(methodenvergleich(xc, yc)); expect(e.tau).toBeGreaterThan(0.5); expect(e.tau).toBeLessThanOrEqual(1); expect(e.hinweise).toEqual([]); });
  it('Achsen tauschen: die Oberfläche kehrt die Gerade um (PB wie mcr getauscht)', () => { const e = ok(methodenvergleich(yc, xc)); pbGleich(e.pb, M.creatinine_getauscht.pb, 'getauscht'); });
  it('kleines n (30 Paare): Hinweis „wenig-faelle“, gerechnet wird trotzdem; 17 und 19 verschiedene Werte (eine Dezimale): Hinweis „wenige-werte“ bei vollem Ergebnis', () => {
    const a = ok(methodenvergleich(...xy('crea30'))); expect(a.hinweise).toContain('wenig-faelle'); pbGleich(a.pb, M.crea30.pb, 'crea30');
    const b = ok(methodenvergleich(...xy('bind1'))); expect(b.hinweise).toContain('wenige-werte'); pbGleich(b.pb, M.bind1.pb, 'bind1'); expect(b.hinweise).not.toContain('wenig-faelle');
    const c = ok(methodenvergleich(...xy('bind2'))); expect(c.hinweise).toContain('wenige-werte'); pbGleich(c.pb, M.bind2.pb, 'bind2');
  });
  it('Werte < 0: Passing-Bablok gesperrt („negativ“, wie mcr), Deming rechnet und gleicht der Kernfunktion', () => {
    const e = ok(methodenvergleich(...xy('negativ'))); expect([e.pb, e.pbFehler]).toEqual([null, 'negativ']); demGleich(e.deming, M.negativ.deming[0], 'negativ'); keinNaN(e);
  });
  it('negativer Zusammenhang (td75: τ < 0, nur positive Werte; td20: τ = −0,02): Passing-Bablok gesperrt („tau“), Deming rechnet', () => {
    for (const nm of ['td75', 'td20']) { const e = ok(methodenvergleich(...xy(nm))); expect(e.tau, nm).toBeLessThanOrEqual(0); expect([e.pb, e.pbFehler], nm).toEqual([null, 'tau']); keinNaN(e.deming, nm); expect(e.deming.steigung).toBeLessThan(0.1); }
  });
  it('Fehler als Antwort statt Absturz: n < 10, n > 4000, konstante Spalte, weniger als 5 verschiedene Werte, λ <= 0 oder nicht endlich, verschieden lange Listen', () => {
    const code = (x: any, y: any, o?: any) => { const r = methodenvergleich(x, y, o) as Z; expect(r.ok).toBe(false); return r.code; };
    const l = (n: number) => Array.from({ length: n }, (_, i) => i + 1);
    expect(code(l(9), l(9))).toBe('zu-wenig'); expect(code([...l(9), null], [...l(9), 5])).toBe('zu-wenig'); expect(code(l(4001), l(4001))).toBe('zu-gross'); ok(methodenvergleich(l(4000).map(v => v + 0.5), l(4000).map(v => v * 1.1)));
    expect(code(l(20).map(() => 5), l(20))).toBe('konstant'); expect(code(l(20), l(20).map(() => 5))).toBe('konstant');
    expect(code(l(20).map(v => 1 + (v % 4)), l(20))).toBe('wenige-werte'); expect(code(l(20), l(20).map(v => 1 + (v % 4)))).toBe('wenige-werte');
    for (const lam of [0, -1, NaN, Infinity]) expect(code(l(20), l(20), { lambda: lam }), `λ = ${lam}`).toBe('lambda');
    expect(code(l(20), l(19))).toBe('laenge'); expect(code([], [])).toBe('zu-wenig');
  });
  it('n = 4000 über die Oberfläche: gerechnet, Zahlen wie mcr (Zeit höchstens 30 s)', () => {
    const [x, y] = xy('gross'); const e = ok(methodenvergleich(x, y)); expect(e.n).toBe(4000); for (const k of PB_FELDER) nah(e.pb[k], M.gross.pb[k], 1e-9, `gross ${k}`); keinNaN(e.deming);
  }, 120000);
});

describe('Sätze (deutsch, du): Hinweis statt Beweis, λ erklärt, Cusum ohne p', () => {
  it('Passing-Bablok-Satz für creatinine: Verfahren, n = 108, Gerade y = −0,12 + 1,09 · x, Intervalle der Steigung 1,00 bis 1,17 und der Konstanten −0,20 bis −0,02', () => {
    const t = pbSatz(passingBablok(...xy('creatinine')), { n: 108 }); expect(t).toMatch(/Passing und Bablok/); expect(t).toContain('n = 108'); expect(t).toMatch(/y = [−-]0,12 \+ 1,09 · x/); expect(t).toMatch(/1,00 bis 1,17/); expect(t).toMatch(/[−-]0,20 bis [−-]0,02/); expect(t).not.toMatch(/NaN|undefined|null/);
  });
  it('Deming-Satz: Deming, λ = 1, Jackknife, Steigung 1,05 [1,01; 1,10]', () => {
    const t = demingSatz(deming(...xy('creatinine'), 1), { n: 108 }); expect(t).toMatch(/Deming/); expect(t).toContain('λ = 1'); expect(t).toMatch(/Jackknife/); expect(t).toContain('1,05'); expect(t).toMatch(/1,01/); expect(t).toMatch(/1,10/);
  });
  it('Satz zur Abweichung: Konstante schließt 0 nicht ein → konstante Abweichung; Steigung schließt 1 ein → kein Hinweis auf proportionale; IMMER „kein Beweis“', () => {
    const a = abweichungSatz({ unten: -0.2, oben: -0.02 }, { unten: 0.9, oben: 1.1 }); expect(a).toMatch(/konstante Abweichung/); expect(a).toMatch(/kein Hinweis[^.]*proportionale/); expect(a).toMatch(/kein Beweis/);
    const b = abweichungSatz({ unten: -0.1, oben: 0.2 }, { unten: 1.05, oben: 1.2 }); expect(b).toMatch(/kein Hinweis[^.]*konstante/); expect(b).toMatch(/proportionale Abweichung/); expect(b).toMatch(/kein Beweis/);
    const c = abweichungSatz({ unten: -0.1, oben: 0.2 }, { unten: 0.9, oben: 1.1 }); expect(c).toMatch(/kein Hinweis/); expect(c).toMatch(/kein Beweis/); expect(c).not.toMatch(/(?<!k)ein Hinweis auf eine (konstante|proportionale) Abweichung/);
    const d = abweichungSatz({ unten: null, oben: null }, { unten: null, oben: null }); expect(d).not.toMatch(/NaN|undefined|null/); expect(d).toMatch(/kein Beweis/);
  });
  it('λ erklärt: Richtung, Beispiel 2; der Satz „aus Wiederholungsmessungen bestimmen“', () => {
    const e = lambdaErklaerung(); expect(e).toMatch(/Fehlervarianz/); expect(e).toMatch(/waagerecht/); expect(e).toMatch(/senkrecht/); expect(e).toMatch(/2/); expect(e).toMatch(/doppelte/);
    const w = lambdaWiederholungSatz(); expect(w).toMatch(/Wiederholungsmessungen/); expect(w).toMatch(/λ/);
  });
  it('„Gerechnet“-Zeile: Passing-Bablok wie R-Paket mcr 1.3.3.1, n = 108; Deming mit λ und Jackknife nach Linnet (1990)', () => {
    const p = mvGerechnet({ art: 'pb', n: 108 }); expect(p).toContain('mcr 1.3.3.1'); expect(p).toContain('n = 108'); expect(p).toMatch(/Passing-Bablok/);
    const d = mvGerechnet({ art: 'deming', n: 108, lambda: 2 }); expect(d).toMatch(/Deming/); expect(d).toContain('λ = 2'); expect(d).toMatch(/Linnet \(1990\)/); expect(d).toMatch(/Jackknife/);
  });
});
