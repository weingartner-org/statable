/* Welle 6, L4 „Lernlabor“: Sätze, Eingabe-Prüfung und Anzeige-Hilfen (lib/lernlaborsaetze.ts) und die Bausteine als Text-Ausgabe (svelte/server).
 * Geprüft wird: Zahlen stimmen mit der Rechnung (lib/lernlabor.ts) überein, alle Sätze sind ganz und in beiden Sprachen da, Bilder haben role="img" mit Titel und Beschreibung,
 * Treffer/Fehlschlag steht nie nur in der Farbe (Linienart/Symbol), nirgends „NaN“ oder „undefined“. Die Bausteine werden ohne Browser auf dem Server gerendert (Effekte laufen dort nicht:
 * die Karteireiter zeigen ihren Anfangszustand, die Vierfeldertafel rechnet sofort und wird ganz geprüft; die Bilder bekommen echte Ergebnisse aus lernlabor.ts). */
import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import { inSprache } from './sitzung.svelte';
import * as L from './lernlabor';
import * as S from './lernlaborsaetze';
import Lernlabor from '../bausteine/Lernlabor.svelte';
import LernlaborVierfelder from '../bausteine/LernlaborVierfelder.svelte';
import LernlaborBaum from '../bausteine/LernlaborBaum.svelte';
import LernlaborHistogramm from '../bausteine/LernlaborHistogramm.svelte';
import LernlaborVerlauf from '../bausteine/LernlaborVerlauf.svelte';
import LernlaborSaeulen from '../bausteine/LernlaborSaeulen.svelte';
import LernlaborIntervalle from '../bausteine/LernlaborIntervalle.svelte';
import LernlaborStichprobe from '../bausteine/LernlaborStichprobe.svelte';
import LernlaborBootstrap from '../bausteine/LernlaborBootstrap.svelte';
import LernlaborRandomisierung from '../bausteine/LernlaborRandomisierung.svelte';
import LernlaborZufall from '../bausteine/LernlaborZufall.svelte';
import LernlaborUeberdeckung from '../bausteine/LernlaborUeberdeckung.svelte';
import LernlaborBayes from '../bausteine/LernlaborBayes.svelte';

const norm = (t: string) => t.replace(/[  ]/g, ' ');
const kahl = (html: string) => norm(html.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
const de = <T>(f: () => T) => inSprache('de', f), en = <T>(f: () => T) => inSprache('en', f);
const sauber = (html: string) => { expect(html).not.toMatch(/NaN|undefined|Infinity|\[object/); };

describe('Eingaben lesen', () => {
  it('Zahlen mit Komma und Punkt, Minuszeichen; Unsinn ist NaN', () => {
    expect(S.leseZahl('1,5')).toBe(1.5); expect(S.leseZahl('−2')).toBe(-2); expect(S.leseZahl('.5')).toBe(0.5); expect(S.leseZahl('abc')).toBeNaN(); expect(S.leseZahl('')).toBeNaN(); expect(S.leseZahl('1,2,3')).toBeNaN();
    expect(S.leseGanz('12')).toBe(12); expect(S.leseGanz('1,5')).toBeNaN();
  });
  it('Anteile: Prozent oder Bruch, außerhalb von 0 bis 1 ist NaN', () => {
    expect(S.leseAnteil('1')).toBeCloseTo(0.01, 15); expect(S.leseAnteil('33,3')).toBeCloseTo(0.333, 15); expect(S.leseAnteil('1/3')).toBeCloseTo(1 / 3, 15); expect(S.leseAnteil('100')).toBe(1); expect(S.leseAnteil('0')).toBe(0);
    for (const t of ['101', '-1', '2/1', 'x', '', '1/0/2']) expect(S.leseAnteil(t), t).toBeNaN();
  });
  it('Reihen: getrennt durch Leerzeichen, Semikolon, Zeilenwechsel; die erste falsche Angabe wird genannt', () => {
    expect(S.leseReihe('1,5 2;3\n4')).toEqual({ werte: [1.5, 2, 3, 4], falsch: null });
    expect(S.leseReihe('1 2 x 4').falsch).toBe('x'); expect(S.leseReihe('').werte).toEqual([]);
    expect(S.fehlerReihe(S.leseReihe('1'), 2, 200, 'reihe')).toMatch(/mindestens 2/); expect(S.fehlerReihe(S.leseReihe('1 2'), 2, 200, 'reihe')).toBe('');
    expect(S.fehlerReihe(S.leseReihe(Array(201).fill(1).join(' ')), 2, 200, 'reihe')).toMatch(/höchstens 200/); expect(S.fehlerReihe(S.leseReihe('1 x'), 2, 200, 'gruppe')).toMatch(/„x“/);
    en(() => expect(S.fehlerReihe(S.leseReihe('1 x'), 2, 200, 'gruppe')).toMatch(/"x" is not a number/));
  });
  it('Prüfung der Vierfeldertafel: Prozent, Bezugsgröße, nie ein positives Ergebnis, vier Häufigkeiten', () => {
    expect(S.fehlerRate(0.01, 0.9, 0.91, undefined)).toBe(''); expect(S.fehlerRate(NaN, 0.9, 0.91, undefined)).toMatch(/Prävalenz/); expect(S.fehlerRate(0.01, 0.9, 0.91, 0.5)).toMatch(/Bezugsgröße/);
    expect(S.fehlerRate(0.5, 0, 1, undefined)).toMatch(/nie ein positives/); expect(S.fehlerRate(0.5, 1, 0, undefined)).toMatch(/nie ein negatives/);
    expect(S.fehlerHaeufig([8, 95, 2, 895])).toBe(''); expect(S.fehlerHaeufig([8, 95, 2, NaN])).toMatch(/ganze Zahlen/); expect(S.fehlerHaeufig([0, 0, 0, 0])).toMatch(/größer als 0/);
    expect(S.fehlerHaeufig([0, 5, 0, 5])).toMatch(/Kranke und Gesunde/); expect(S.fehlerHaeufig([0, 0, 5, 5])).toMatch(/positive und negative/);
  });
});

describe('Zahlenformat und Achsen', () => {
  it('Wahrscheinlichkeit zweifach (Dezimal und Prozent), kleine Werte nie „0“', () => {
    expect(norm(de(() => S.wk(0.0443)))).toBe('0,0443 (4,43 %)'); expect(norm(en(() => S.wk(0.0443)))).toMatch(/^0\.0443 \(4\.43\s?%\)$/);
    expect(de(() => S.wk(0.00001))).toMatch(/^< 0,0001/); expect(de(() => S.wk(0))).toMatch(/^0,0000/); expect(S.wk(NaN)).toBe('-');
    expect(de(() => S.g4(1234.5678))).toBe('1235'); expect(de(() => S.g4(0.123456))).toBe('0,1235'); expect(de(() => S.haeuf(133.3333333333))).toBe('133,333333'); expect(de(() => S.haeuf(90))).toBe('90');
  });
  it('Marken liegen im Bereich; Skalen bilden Anfang und Ende ab; Zehnermarken enden bei N', () => {
    const m = S.marken(0, 1, 5); expect(m[0]).toBe(0); expect(m.at(-1)).toBe(1); expect(S.marken(2, 2)).toEqual([2]);
    const f = S.skala(0, 10, 100, 200); expect(f(0)).toBe(100); expect(f(10)).toBe(200); expect(S.logSkala(1, 100, 0, 200)(10)).toBeCloseTo(100, 10);
    expect(S.zehnerMarken(1000)).toEqual([1, 10, 100, 1000]); expect(S.zehnerMarken(500)).toEqual([1, 10, 100, 500]);
  });
  it('Bild der Grundgesamtheit: Wahrscheinlichkeiten je Klasse ergeben 1 (Fläche der Dichte 1)', () => {
    const pops: L.Population[] = [{ art: 'normal', mu: 100, sigma: 15 }, { art: 'gleich', a: 0, b: 1 }, { art: 'exponential', rate: 0.25 }, { art: 'zweigipflig', mu1: -2, mu2: 2, sigma: 1 }, { art: 'wuerfel' }, { art: 'anteil', p: 0.3 }];
    for (const p of pops) { const h = S.populationBild(p); expect(h.zaehler.reduce((a, b) => a + b, 0), p.art).toBeCloseTo(1, p.art === 'exponential' ? 2 : 3); expect(h.kanten.length).toBe(h.zaehler.length + 1); }
    expect(S.populationBild({ art: 'anteil', p: 0.3 }).zaehler).toEqual([0.7, 0.3]);
  });
});

describe('Sätze: Zahlen aus der Rechnung, Startwert genannt, beide Sprachen', () => {
  it('Satz mit dem Mantra „Die Zufallszahlen stimmen nicht mit R oder SPSS überein; gleiche Verteilung, andere Zahlen.“ (wörtlich)', () => {
    expect(de(S.SATZ_ZUFALL)).toBe('Die Zufallszahlen stimmen nicht mit R oder SPSS überein; gleiche Verteilung, andere Zahlen.');
    expect(en(S.SATZ_ZUFALL)).toMatch(/do not match those of R or SPSS/);
  });
  it('Stichprobenverteilung: Mittelwert-Satz und Anteil-Satz sind verschieden, nennen Startwert, n, B und beide Standardfehler', () => {
    const e = L.stichprobenverteilung({ pop: { art: 'exponential', rate: 1 }, n: 10, B: 1000, startwert: 1 });
    const a = de(() => S.satzStichprobe(e, 'exponential')), b = de(() => S.satzStichprobe(e, 'anteil'));
    expect(a).toContain('Startwert 1'); expect(a).toContain('n = 10'); expect(a).toContain('1000'); expect(a).toContain('σ/√n'); expect(a).toContain(de(() => S.g4(e.empirischerSE))); expect(a).toContain(de(() => S.g4(e.theoretischerSE)));
    expect(b).toContain('√(p(1−p)/n)'); expect(b).toContain('Anteile'); expect(a).not.toContain('Anteile'); sauber(a); sauber(b);
    expect(en(() => S.satzStichprobe(e, 'exponential'))).toContain('seed 1');
  });
  it('Bootstrap: Intervall und t-Intervall stehen im Satz; Hinweis bei n < 10 nur dann', () => {
    const e = L.bootstrap({ daten: [12, 15, 9, 20, 14, 11, 18, 13, 16, 10], B: 1000, niveau: 0.95, startwert: 1 });
    const s = de(() => S.satzBootstrap(e)), t = de(() => S.satzBootstrapT(e));
    expect(s).toContain('Startwert 1'); expect(norm(s)).toContain('95 %-Perzentil'); expect(s).toContain('[11,8; 15,8]'); expect(t).toContain('[11,28; 16,32]'); sauber(s + t);
    expect(en(() => S.satzBootstrap(e))).toContain('[11.8, 15.8]');
  });
  it('Randomisierung: „p ≈“ mit (Anzahl + 1)/(B + 1), Vollauszählung 8/462, Welch wie R', () => {
    const e = L.randomisierung({ g1: [12, 15, 9, 20, 14], g2: [8, 10, 7, 11, 6, 9], B: 1000, startwert: 1 });
    const s = de(() => S.satzRandomisierung(e)); expect(s).toContain('(23 + 1)/(1000 + 1)'); expect(s).toContain('Startwert 1'); expect(s).toContain('p ≈ ,024');
    const x = L.randomisierungExakt([12, 15, 9, 20, 14], [8, 10, 7, 11, 6, 9])!; expect(de(() => S.satzRandomisierungExakt(x))).toContain('8/462 = ,0173');
    expect(de(() => S.satzWelch(e.welch))).toContain('t(5,4) = 2,79, p = ,035');
    expect(de(S.hinweisKeineVollauszaehlung)).toMatch(/20 000/);
  });
  it('Zufallsexperimente: Ereignisnamen, Mehrzahl bei roten Kugeln, Satz mit relativer Häufigkeit und P', () => {
    expect(de(() => S.ereignisRot(1))).toBe('genau 1 rote Kugel'); expect(de(() => S.ereignisRot(2))).toBe('genau 2 rote Kugeln'); expect(en(() => S.ereignisRot(1))).toBe('exactly 1 red ball'); expect(de(() => S.ereignisSumme(7))).toBe('Augensumme 7');
    const s = de(() => S.satzExperiment('Augenzahl 6', 1000, 1, 0.476, 0.5)); expect(norm(s)).toContain('0,4760 (47,60 %)'); expect(norm(s)).toContain('Startwert 1'); expect(norm(s)).toContain('0,5000 (50,00 %)');
  });
  it('Bayes: natürliche Häufigkeiten, PPV 9,17 %, NPV 99,89 %, Rechenweg Schritt für Schritt; nicht ganze Zahlen werden gezeigt, nicht gerundet', () => {
    const v = L.vierfeldertafel({ modus: 'rate', praevalenz: 0.01, se: 0.9, sp: 0.91 });
    const sätze = norm(de(() => S.saetzeBayes(v).join(' ')));
    expect(sätze).toContain('Unter 10000 Personen sind 100 krank'); expect(sätze).toContain('891 positiv (falsch positiv)'); expect(sätze).toContain('0,0917 (9,17 %)'); expect(sätze).toContain('0,9989 (99,89 %)'); sauber(sätze);
    const weg = norm(de(() => S.rechenwegBayes(v).join('\n'))); expect(weg).toContain('PPV'); expect(weg).toContain('0,091743'); expect(weg).toContain('0,998891'); expect(weg).toContain('0,0981'); sauber(weg);
    const u = L.vierfeldertafel({ modus: 'rate', praevalenz: 1 / 3, se: 0.6, sp: 0.8, N: 1000 });
    expect(de(() => S.saetzeBayes(u).join(' '))).toContain('333,333333'); expect(de(S.hinweisNichtGanz)).toMatch(/nicht gerundet/);
  });
  it('Unabhängigkeit: je Fall ein ganzer Satz, beide Zahlen mit sechs Stellen', () => {
    const j = de(() => S.satzUnabhaengig(0.3, 0.4, 0.12, true)), n = de(() => S.satzUnabhaengig(0.01, 0.103, 0.008, false));
    expect(j).toContain('unabhängig'); expect(j).toContain('0,120000'); expect(n).toContain('abhängig'); expect(n).not.toContain('sind unabhängig'); expect(n).toContain('0,001030'); expect(n).toContain('0,008000');
  });
  it('Überdeckung: Satz mit „etwa 95 von 100 Mal“, keine Deutung „mit 95 % liegt p im Intervall“, laufende Summe nur ab der zweiten Runde; Wald-Satz', () => {
    const e = L.ueberdeckung({ art: 'anteil', p: 0.3, n: 40, niveau: 0.95, startwert: 1, mitWald: true });
    const s = norm(de(() => S.satzUeberdeckung(e, 0, 100, e.ueberdeckt))), s2 = norm(de(() => S.satzUeberdeckung(e, 1, 200, 190)));
    expect(s).toContain('Startwert 1'); expect(s).toContain('95 von 100 Mal'); expect(s).toContain('überdeckt oder nicht'); expect(s).not.toContain('Zusammen'); expect(s2).toContain('Zusammen sind es 190 von 200 (95,0 %)');
    const w = norm(de(() => S.satzWaldVergleich(95, 93, 100))); expect(w).toContain('Wald'); expect(w).toContain('93,0 %'); expect(w).toContain('Wilson 95,0 %'); expect(w).toContain('Brown, Cai & DasGupta');
    const lehre = de(() => S.lehreKiNiveau(0.95)); expect(lehre).toContain('mit 95 %'); expect(inSprache('de', () => lehre)).not.toMatch(/Sie/);
  });
});

describe('Bausteine als Text (svelte/server)', () => {
  const html = (c: any, props: Record<string, unknown> = {}) => render(c, { props }).body;

  it('Vierfeldertafel (Anfangszustand = Beispiel 1 %, 90 %, 91 %): Tabelle mit Rändern, zwei Bäume, Rechenweg, Unabhängigkeits-Check', () => {
    const h = de(() => html(LernlaborVierfelder)), t = kahl(h);
    sauber(h); expect(t).toContain('Vierfeldertafel'); expect(t).toContain('Bezugsgröße: N = 10000'); expect(t).toContain('0,0917 (9,17 %)'); expect(t).toContain('Rechenweg'); expect(t).toContain('abhängig');
    expect((h.match(/role="img"/g) ?? []).length).toBe(2); expect((h.match(/<table/g) ?? []).length).toBeGreaterThanOrEqual(3); expect(h).toContain('scope="col"'); expect(h).toContain('scope="row"');
    expect(t).toContain('891'); expect(t).toContain('9009'); expect(t).toContain('Umkehrbaum');
    const e = kahl(en(() => html(LernlaborVierfelder))); expect(e).toContain('Four-field table'); expect(e).not.toContain('Vierfeldertafel');
  });
  it('Baum: vorwärts und rückwärts, jedes Bild mit Titel und Beschreibung, Zahlen der Zellen sind da', () => {
    const v = L.vierfeldertafel({ modus: 'haeufig', rp: 8, fp: 95, fn: 2, rn: 895 });
    for (const r of ['vor', 'rueck'] as const) {
      const h = de(() => html(LernlaborBaum, { v, richtung: r })); sauber(h);
      expect(h).toMatch(/role="img" aria-label="[^"]{20,}"/); expect(h).toContain('Beschreibung und Daten</summary>'); expect(h).toMatch(/<p[^>]*>Von [^<]{40,}<\/p>/);
      for (const z of r === 'vor' ? ['1000', '10', '990', '95', '895'] : ['1000', '103', '897', '8', '95']) expect(kahl(h), `${r} ${z}`).toContain(z);
    }
    expect(kahl(de(() => html(LernlaborBaum, { v, richtung: 'rueck' })))).toContain('PPV');
  });
  it('Histogramm: Säulen, Kurve, Linien mit Linienart und Klammer; role=img mit Titel/Beschreibung', () => {
    const e = L.stichprobenverteilung({ pop: { art: 'normal', mu: 0, sigma: 1 }, n: 10, B: 500, startwert: 1 }), hist = L.histogramm(e.werte);
    const kurve = Array.from({ length: 30 }, (_, i) => ({ x: -1 + i / 15, y: L.normalDichte(-1 + i / 15, 0, 0.3) }));
    const h = html(LernlaborHistogramm, { h: hist, n: 500, kurve, linien: [{ x: 0, text: 'μ = 0', stil: 'strich', farbe: 'tinte' }, { x: 0.2, text: 'b', stil: 'voll', farbe: 'b' }, { x: -0.2, text: 'c', stil: 'punkt', farbe: 'a' }], bereich: { von: -0.4, bis: 0.4, text: '95 %' }, xText: 'x', yText: 'y', titel: 'Titel Histogramm', beschreibung: 'Beschreibung Histogramm' });
    sauber(h); expect(h).toContain('role="img"'); expect(h).toMatch(/role="img" aria-label="Histogramm[^"]*"/); expect(h).toContain('>Beschreibung Histogramm</p>'); expect((h.match(/<rect /g) ?? []).length).toBeGreaterThan(5);
    expect(h).toContain('stroke-dasharray="7 4"'); expect(h).toContain('stroke-dasharray="2 4"'); expect(h).toContain('<path d="M'); expect(h).toContain('95 %');
  });
  it('Verlauf, Säulen, Intervalle: Text-Alternative; Treffer und Fehlschlag unterscheiden sich durch Linienart und Symbol, nicht nur durch Farbe', () => {
    const m = L.muenzwurf({ p: 0.5, N: 5000, startwert: 1 });
    const v = html(LernlaborVerlauf, { verlauf: m.verlauf, p: 0.5, pText: 'P = 0,5', xText: 'Wiederholungen', yText: 'rel. H.', titel: 'Titel Verlauf', beschreibung: 'Beschreibung Verlauf' });
    sauber(v); expect(v).toContain('role="img"'); expect(v).toMatch(/role="img" aria-label="Liniendiagramm[^"]*"/); expect(v).toContain('>Beschreibung Verlauf</p>'); expect(v).toContain('stroke-dasharray="7 4"'); expect(v).toContain('P = 0,5');
    const sä = html(LernlaborSaeulen, { zeilen: [{ name: '1', beob: 0.2, p: 1 / 6 }, { name: '2', beob: 0.1, p: 1 / 6 }], nameText: 'Ergebnis', yText: 'rel. H.', beobText: 'beobachtet', pText: 'P', titel: 'Titel Säulen', beschreibung: 'Beschreibung Säulen' });
    sauber(sä); expect(sä).toContain('<pattern'); expect(sä).toContain('stroke-dasharray="4 2"'); expect(sä).toMatch(/role="img" aria-label="[^"]*Säulendiagramm[^"]*"/); expect(sä).toContain('>Beschreibung Säulen</p>');
    const u = L.ueberdeckung({ art: 'anteil', p: 0.3, n: 40, niveau: 0.95, startwert: 1 });
    const iv = html(LernlaborIntervalle, { intervalle: u.intervalle, wahr: 0.3, von: 0, bis: 1, xText: 'Anteil', wahrText: 'p = 0,3', jaText: 'überdeckt', neinText: 'überdeckt nicht', titel: 'Titel Intervalle', beschreibung: 'Beschreibung Intervalle' });
    sauber(iv); expect(iv).toContain('role="img"'); expect(iv).toMatch(/role="img" aria-label="Konfidenzintervalle übereinander: Titel Intervalle/);
    const ja = u.intervalle.filter(i => i.ueberdeckt).length, nein = u.intervalle.length - ja;
    expect((iv.match(/stroke-dasharray="5 3"/g) ?? []).length, 'gestrichelte Linien = nicht überdeckt (+1 in der Legende)').toBe(nein + 1);
    expect((iv.match(/<circle /g) ?? []).length, 'Kreise = überdeckt (+1 in der Legende)').toBe(ja + 1); expect((iv.match(/rotate\(45/g) ?? []).length, 'Rauten = nicht überdeckt (+1 Legende)').toBe(nein + 1);
  });
  it('Karteireiter im Anfangszustand: Eingaben mit Beschriftung, keine Ergebnisse ohne Lauf, kein „NaN“; Lernlabor-Rahmen mit neun Reitern, Startwert und dem Satz zu R/SPSS', () => {
    for (const [c, titel] of [[LernlaborStichprobe, 'Grundgesamtheit'], [LernlaborBootstrap, 'Deine Werte'], [LernlaborRandomisierung, 'Zwei Gruppen'], [LernlaborZufall, 'Das Experiment'], [LernlaborUeberdeckung, 'Welches Intervall?']] as const) {
      const h = de(() => html(c, { startwert: 1, anstoss: 0 })); sauber(h); expect(kahl(h), titel).toContain(titel); expect(h).toMatch(/<label for="/); expect(h).toContain('class="k haupt gross"');
    }
    { const hb = de(() => html(LernlaborBayes)); sauber(hb); expect(kahl(hb)).toContain('Vorwissen und Daten'); expect(hb).toMatch(/<label for="ll-bv-a"/); expect(kahl(hb)).toContain('Glaubwürdigkeitsintervall'); expect(hb).toContain('role="img"'); expect(kahl(en(() => html(LernlaborBayes)))).toContain('credible interval'); }
    const h = de(() => html(Lernlabor)), t = kahl(h); sauber(h);
    expect((h.match(/role="tab"/g) ?? []).length).toBe(9); expect(h).toContain('role="tablist"'); expect(h).toContain('role="tabpanel"'); expect(h).toContain('id="ll-startwert"'); expect(h).toContain('value="1"');
    expect(t).toContain('Die Zufallszahlen stimmen nicht mit R oder SPSS überein; gleiche Verteilung, andere Zahlen.'); expect(t).toContain('Noch einmal (neuer Startwert)'); expect(t).toContain('Konfidenzintervalle');
    expect(kahl(en(() => html(Lernlabor)))).toContain('The random numbers do not match those of R or SPSS');
    expect(kahl(de(() => html(Lernlabor)))).toMatch(/probierst du aus/);
  });
});
