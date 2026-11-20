import { describe, expect, it } from 'vitest';
import ERW from './testdaten/spaeter-f-erwartet.json';
import { s } from './sitzung.svelte';
import { zufall } from './zufall';
import { teilstrom } from './lernlabor';
import { STARTWERT_ZUTEILUNG, stichprobeZiehen, zuteilen, vollstaendigZuteilen, kennungenLesen, stichprobeAusListe, zuteilungCsv, auswahlCsv, csvZelle } from './zuteilung';
import { zuteilungLehrmittelSatz, zuteilungGerechnet } from './zuteilungsaetze';

/* ===== Später, Welle S-F, Teil 5: Zufall zuteilen - Zufallsauswahl und Zuteilungsliste (L6; Kachel im Reiter „Verstehen“; Fachblatt SPAETER-F Abschnitt 5 und „Entscheidungen Opus (18.10.)“ 6 gehen vor) =====
 * ROTE TESTS des Sollwert-Prüfers. Der Bauer B darf diese Datei und die JSON nicht ändern. Sollwerte: scripts/spaeter-f-erwartet.R (Abschnitt zuteilung).
 * R und JS haben verschiedene Zufallserzeuger - darum gibt es KEINE Gleichheit mit R-Zufall, sondern: der Erzeuger der App (lib/zufall.ts = mulberry32, Teilströme `teilstrom` aus lib/lernlabor.ts, beide dokumentiert) ist im Skript in R NACHGEBAUT
 * (die Kontrollwerte aus lernlabor-gold.test.ts stimmen auf alle Stellen), die Verfahren unten sind festgelegt, die Listen sind deren Ausgabe; dazu Eigenschaften (Blockbalance, Ungleichgewicht, Schichten unabhängig, Gleichverteilung bei FESTEN Startwerten).
 * Nichts davon ist „richtig im Vergleich mit einem Standard“: Opus bestätigt die Festlegung. Ändert sich der Erzeuger, müssen alle gespeicherten Listen bewusst neu erzeugt werden.
 * FESTGELEGT (Opus 6): Startwert SICHTBAR und änderbar, Voreinstellung 20261008 (wie überall), nie aus der Uhr; jede exportierte Datei beginnt mit der Kopfzeile „Lehrmittel - nicht für echte Studien (keine Verdeckung)“; Kachelname „Zufall zuteilen“.
 * Alles in JS (kein R, kein PSPP, keine Spaltennamen).
 *
 * VERFAHREN (Fachblatt 5.2, hier verbindlich)
 *   Strom: strom(startwert, nummer) = zufall(teilstrom(startwert, nummer)); ohne Schichten Nummer 0, mit Schichten Nummer = Position der Schicht (1, 2, …) - jede Schicht hat ihren EIGENEN Strom.
 *   Mischen (Fisher-Yates absteigend): für i = m bis 2: j = 1 + ⌊u()·i⌋ (1-basiert); tausche v[i] und v[j] (ein Zufallswert je Schritt).
 *   Einfache Zufallsstichprobe k aus n (ohne Zurücklegen): a = (1, …, n); für i = 1 bis k: j = i + ⌊u()·(n − i + 1)⌋; tausche a[i], a[j]; Ergebnis a[1..k] in Ziehungsreihenfolge (sortiert dazu).
 *   Vollständige Zuteilung mit festen Gruppengrößen: Vektor mit n_g Kennzeichen je Gruppe (in der Reihenfolge der Gruppen), gemischt.
 *   Blockrandomisierung: Verhältnis (ganze Zahlen) mit Summe s; Blockgrößen = Vielfache von s; solange die Liste kürzer als N ist: Blockgröße = blockgroessen[⌊u()·Zahl der Größen⌋] (EIN u je Block, auch bei nur einer Größe),
 *   Block = jede Gruppe (Blockgröße/s · Verhältnis) mal in der Reihenfolge der Gruppen, GEMISCHT (nach derselben Mischregel, derselbe Strom, danach). Die Liste wird auf N abgeschnitten (der letzte Block kann unvollständig bleiben);
 *   mit aufrunden = true bleibt der letzte Block ganz (die Liste ist dann länger als N).
 *   Stratifizierung: je Schicht (Name, N_s) eine eigene Blockrandomisierung mit strom(startwert, Schichtnummer).
 *
 * SCHNITTSTELLE lib/zuteilung.ts
 *   STARTWERT_ZUTEILUNG = 20261008
 *   stichprobeZiehen(n: number, k: number, startwert: number, nr = 0): { ok: true; gezogen: number[]; sortiert: number[] } | { ok: false; code: 'n' | 'k' | 'startwert' }
 *      n ganze Zahl 1 … 1 000 000; k ganze Zahl 1 … n (k = n ist erlaubt = alle, k = 0 ist gesperrt); startwert ganze Zahl 0 … 2³² − 1.
 *   zuteilen(e: { n?: number; schichten?: { name: string; n: number }[]; gruppen: string[]; verhaeltnis: number[]; blockgroessen: number[]; startwert: number; aufrunden?: boolean }): ZuteilungErgebnis | ZuteilungFehler
 *      ZuteilungErgebnis = { ok: true; liste: { nr: number; schicht: string | null; gruppe: string; block: number }[]; bloecke: { schicht: string | null; groessen: number[] }[]; kontrolle: { schicht: string | null; jeGruppe: number[]; bloecke: number; maxAbweichung: number }[] }
 *      Mit `schichten` gilt `n` nicht; ohne Schichten ist schicht = null und der Strom Nummer 0. nr = laufende Nummer in der Schicht ab 1, block = Blocknummer in der Schicht ab 1; die Liste steht Schicht für Schicht in der eingegebenen Reihenfolge.
 *      bloecke = die gezogenen Blockgrößen je Schicht (der letzte Block auch, wenn er abgeschnitten wurde). kontrolle: Zahl je Gruppe (Reihenfolge der Gruppen), Zahl der Blöcke (gezogene), maxAbweichung = größter Unterschied zwischen
 *      der größten und der kleinsten Gruppensumme nach irgendeinem Fall der (abgeschnittenen bzw. aufgerundeten) Liste.
 *      ZuteilungFehler = { ok: false; code: 'n' (nicht 1 … 100 000 oder nicht ganz) | 'gruppen' (weniger als 2, mehr als 6, leerer oder doppelter Name) | 'verhaeltnis' (andere Länge als gruppen, nicht ganz oder < 1) |
 *                          'blockgroesse' (keine Größe oder eine ist kein Vielfaches von s) | 'schichten' (mehr als 8, leerer oder doppelter Name, n einer Schicht ungültig) | 'startwert' }
 *   vollstaendigZuteilen(e: { groessen: number[]; gruppen: string[]; startwert: number; nr?: number }): { ok: true; liste: { nr: number; gruppe: string }[] } | { ok: false; code: 'groessen' | 'gruppen' | 'startwert' }      groessen: ganze Zahlen >= 1, gleich lang wie gruppen
 *   kennungenLesen(text: string): { kennungen: string[]; leer: number; doppelt: string[] }
 *      eine Kennung je Zeile (Zeilen getrimmt); LEERE Zeilen werden übersprungen und gezählt; DOPPELTE Kennungen werden NICHT entfernt (sonst bekäme eine Person doppelte Chance), sondern gemeldet (jede doppelte Kennung einmal, in der Reihenfolge des ersten Auftretens).
 *   stichprobeAusListe(text: string, k: number, startwert: number): { ok: true; gezogen: string[]; sortiert: string[]; leer: number; doppelt: string[] } | { ok: false; code: 'liste-leer' | 'k' | 'startwert' | 'zu-viele-zeilen' (mehr als 1 000 000 Zeilen) | 'zeile-zu-lang' (mehr als 200 Zeichen) }
 *      gezogen = Kennungen in Ziehungsreihenfolge, sortiert = dieselben in der Reihenfolge der Liste. Auswahl über die Positionen in `kennungen` (stichprobeZiehen).
 *   csvZelle(text: string): string          schützt vor CSV-Injektion: beginnt der Text mit =, +, - oder @ (auch Tabulator oder Wagenrücklauf), steht ein Apostroph davor; Anführungszeichen, Trennzeichen und Zeilenumbrüche werden für CSV gesichert
 *   zuteilungCsv(e: ZuteilungErgebnis, opt: { startwert: number }): string · auswahlCsv(a: { gezogen: string[]; n: number; k: number }, opt: { startwert: number }): string
 *      BEIDE beginnen mit der Kopfzeile aus zuteilungLehrmittelSatz() und nennen den Startwert in einer der ersten Zeilen; Zellen laufen über csvZelle.
 * SCHNITTSTELLE lib/zuteilungsaetze.ts (deutsch, du)
 *   zuteilungLehrmittelSatz(): string = „Lehrmittel - nicht für echte Studien (keine Verdeckung)“ (genau diese Kopfzeile, nur Bindestrich)
 *   zuteilungGerechnet(a: { art: 'block'; verhaeltnis: number[]; blockgroessen: number[]; startwert: number; strom: number } | { art: 'stichprobe'; n: number; k: number; startwert: number }): string
 *        „Blockrandomisierung 1:1, Blockgrößen 4 und 6, Startwert 20261008, Strom 0“ bzw. „Zufallsauswahl: Fisher-Yates mit mulberry32, Startwert 20261008“ */
s.einst.sprache = 'de'; s.einst.anrede = 'du';
type Z = Record<string, any>;
const U = (ERW as unknown as Z).zuteilung as Z;
const SW = U.startwert as number;
const ok = (e: any) => { expect(e.ok, `Fehler: ${JSON.stringify(e)}`).toBe(true); return e; };
const text = (liste: Z[], schicht: string | null = null) => liste.filter(z => z.schicht === schicht).map(z => z.gruppe).join('');
const AB = ['A', 'B'];
const block = (n: number, verh: number[], gr: string[], gro: number[], startwert = SW, extra: Z = {}) => ok(zuteilen({ n, gruppen: gr, verhaeltnis: verh, blockgroessen: gro, startwert, ...extra }));
const code = (e: Z) => { const r = zuteilen(e as any) as Z; expect(r.ok, JSON.stringify(e)).toBe(false); return r.code; };
const maxDiff = (liste: Z[], gr: string[]) => { const c = gr.map(() => 0); let m = 0; for (const z of liste) { c[gr.indexOf(z.gruppe)]!++; m = Math.max(m, Math.max(...c) - Math.min(...c)); } return m; };

describe('Erzeuger: Kontrollwerte aus lernlabor-gold.test.ts, im Skript in R nachgebaut (die Grundlage der Sollwerte)', () => {
  it('Startwert der Zuteilung ist 20261008, überall dieselbe Voreinstellung', () => { expect(STARTWERT_ZUTEILUNG).toBe(20261008); expect(SW).toBe(20261008); });
  it('zufall(1): 0,6270739405881613 / 0,002735721180215478 / 0,5274470399599522; teilstrom(1, 0) = 1989183610, (1, 1) = 2712350597, (2, 0) = 797705063', () => {
    const u = zufall(1); const w = [u(), u(), u()]; U.gold.zufall1.forEach((v: number, i: number) => expect(Math.abs(w[i]! - v)).toBeLessThanOrEqual(1e-15)); expect([teilstrom(1, 0), teilstrom(1, 1), teilstrom(2, 0)]).toEqual(U.gold.teilstrom);
  });
});

describe('Einfache Zufallsstichprobe: 10 aus 100, Startwert 20261008', () => {
  it('Ziehungsreihenfolge und sortiert gleich den Listen aus dem Skript (R-Nachbau des Erzeugers)', () => {
    const f = U.stichprobe; const e = ok(stichprobeZiehen(f.frage.n, f.frage.k, f.frage.startwert, f.frage.nr)); expect(e.gezogen).toEqual(f.soll.gezogen); expect(e.sortiert).toEqual(f.soll.sortiert); expect(new Set(e.gezogen).size).toBe(10);
    expect(ok(stichprobeZiehen(100, 10, SW)).gezogen, 'ohne Strom-Nummer: Strom 0').toEqual(f.soll.gezogen);
  });
  it('anderer Startwert, andere Ziehung; gleicher Startwert, gleiche Ziehung; anderer Strom (Nummer 1), andere Ziehung', () => {
    const a = ok(stichprobeZiehen(100, 10, SW)).gezogen; expect(ok(stichprobeZiehen(100, 10, SW)).gezogen).toEqual(a); expect(ok(stichprobeZiehen(100, 10, SW + 1)).gezogen).not.toEqual(a); expect(ok(stichprobeZiehen(100, 10, SW, 1)).gezogen).not.toEqual(a);
  });
  it('Ränder: k = n gibt alle (jede Zahl genau einmal), k = 0 gesperrt, k > n, n = 1, Startwert nicht ganz oder außerhalb 0 … 2³² − 1', () => {
    const alle = ok(stichprobeZiehen(7, 7, SW)); expect([...alle.sortiert]).toEqual([1, 2, 3, 4, 5, 6, 7]); expect([...alle.gezogen].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(stichprobeZiehen(7, 0, SW)).toEqual({ ok: false, code: 'k' }); expect(stichprobeZiehen(7, 8, SW)).toEqual({ ok: false, code: 'k' }); expect(stichprobeZiehen(7, 2.5, SW)).toEqual({ ok: false, code: 'k' });
    expect(ok(stichprobeZiehen(1, 1, SW)).gezogen).toEqual([1]); expect(stichprobeZiehen(0, 1, SW)).toEqual({ ok: false, code: 'n' }); expect(stichprobeZiehen(1000001, 1, SW)).toEqual({ ok: false, code: 'n' });
    for (const sw of [-1, 1.5, 2 ** 32, NaN]) expect(stichprobeZiehen(10, 2, sw), `Startwert ${sw}`).toEqual({ ok: false, code: 'startwert' }); ok(stichprobeZiehen(10, 2, 0)); ok(stichprobeZiehen(10, 2, 2 ** 32 - 1));
  });
  it('Einschlusshäufigkeit: 10 aus 40 bei Startwerten 1 bis 20000 - jedes Element gleich oft wie im Skript (Soll 5000 je Element), nur mit FESTEN Startwerten', () => {
    const z = new Array(40).fill(0); for (let i = 1; i <= 20000; i++) for (const v of ok(stichprobeZiehen(40, 10, i)).gezogen) z[v - 1]++;
    expect(z).toEqual(U.einschluss.haeufigkeit); expect(Math.min(...z)).toBeGreaterThan(4800); expect(Math.max(...z)).toBeLessThan(5200);
  }, 60000);
  it('1 000 000 Zeilen: eine Stichprobe von 10 in höchstens 5 s, ohne die Million zu sortieren', () => {
    const t0 = performance.now(); const e = ok(stichprobeZiehen(1000000, 10, SW)); expect(performance.now() - t0).toBeLessThan(5000); expect(new Set(e.gezogen).size).toBe(10); expect(Math.min(...e.gezogen)).toBeGreaterThanOrEqual(1); expect(Math.max(...e.gezogen)).toBeLessThanOrEqual(1000000);
  });
});

describe('Blockrandomisierung: die Listen aus dem Skript (Startwert 20261008), Zeichen für Zeichen', () => {
  it('1:1, Blockgrößen 4 und 6, N = 24, Strom 0: Liste, gezogene Blöcke (der letzte abgeschnitten) und Kontrollzahlen', () => {
    const f = U.block_11, e = block(f.frage.n, f.frage.verhaeltnis, f.frage.gruppen, f.frage.blockgroessen, f.frage.startwert);
    expect(text(e.liste)).toBe(f.soll.zuteilung); expect(e.liste.length).toBe(24); expect(e.bloecke).toEqual([{ schicht: null, groessen: f.soll.bloecke }]);
    expect(e.liste.map((z: Z) => z.nr)).toEqual(Array.from({ length: 24 }, (_, i) => i + 1)); expect(e.liste.every((z: Z) => z.schicht === null)).toBe(true);
    expect(e.kontrolle).toEqual([{ schicht: null, jeGruppe: [12, 12], bloecke: f.soll.bloecke.length, maxAbweichung: f.soll.maxAbweichung }]);
  });
  it('Blocknummern: laufend ab 1; die Zahl der Fälle je Block ist die gezogene Blockgröße (der letzte Block nur so weit, wie die Liste reicht)', () => {
    const f = U.block_11, e = block(24, [1, 1], AB, [4, 6]); const je = new Map<number, number>(); e.liste.forEach((z: Z) => je.set(z.block, (je.get(z.block) ?? 0) + 1));
    expect([...je.keys()]).toEqual(f.soll.bloecke.map((_: number, i: number) => i + 1)); f.soll.bloecke.slice(0, -1).forEach((g: number, i: number) => expect(je.get(i + 1)).toBe(g));
  });
  it('aufrunden: der letzte Block bleibt ganz - Liste = die ungekürzte Folge (28 Plätze), Kontrolle mit dem Ungleichgewicht der ganzen Folge', () => {
    const f = U.block_11, e = block(24, [1, 1], AB, [4, 6], SW, { aufrunden: true }); expect(text(e.liste)).toBe(f.soll.roh); expect(e.liste.length).toBe(f.soll.bloecke.reduce((a: number, b: number) => a + b, 0)); expect(e.kontrolle[0].maxAbweichung).toBe(f.soll.maxAbweichungRoh);
    expect(e.kontrolle[0].jeGruppe).toEqual([e.liste.length / 2, e.liste.length / 2]);
  });
  it('2:1, Blockgrößen 3 und 6, N = 15', () => { const f = U.block_21, e = block(f.frage.n, f.frage.verhaeltnis, f.frage.gruppen, f.frage.blockgroessen); expect(text(e.liste)).toBe(f.soll.zuteilung); expect(e.bloecke[0].groessen).toEqual(f.soll.bloecke); expect(e.kontrolle[0].maxAbweichung).toBe(f.soll.maxAbweichung); });
  it('drei Gruppen 1:1:1, Blockgrößen 3 und 6, N = 21', () => { const f = U.block_111, e = block(f.frage.n, f.frage.verhaeltnis, f.frage.gruppen, f.frage.blockgroessen); expect(text(e.liste)).toBe(f.soll.zuteilung); expect(e.bloecke[0].groessen).toEqual(f.soll.bloecke); expect(e.kontrolle[0].jeGruppe.reduce((a: number, b: number) => a + b, 0)).toBe(21); });
  it('anderer Startwert gibt eine andere Liste (+1), gleicher Startwert dieselbe', () => { const f = U.startwert_anders; expect(text(block(24, [1, 1], AB, [4, 6], f.frage.startwert).liste)).toBe(f.soll.zuteilung); expect(f.soll.zuteilung).not.toBe(U.block_11.soll.zuteilung); });
});

describe('Schichten: jede Schicht hat ihren eigenen Strom (Nummer ab 1) - die Liste einer Schicht ändert sich nicht, wenn eine andere größer wird', () => {
  it('zwei Schichten zu je 12 (1:1, Blockgröße 4): S1 und S2 gleich den Listen aus dem Skript; Nummer und Block zählen je Schicht', () => {
    const f = U.schichten, e = ok(zuteilen({ ...f.frage, startwert: f.frage.startwert })); expect(text(e.liste, 'S1')).toBe(f.soll.S1.zuteilung); expect(text(e.liste, 'S2')).toBe(f.soll.S2.zuteilung);
    expect(e.liste.filter((z: Z) => z.schicht === 'S2').map((z: Z) => z.nr)).toEqual(Array.from({ length: 12 }, (_, i) => i + 1)); expect(e.liste.slice(0, 12).every((z: Z) => z.schicht === 'S1')).toBe(true);
    expect(e.bloecke).toEqual([{ schicht: 'S1', groessen: f.soll.S1.bloecke }, { schicht: 'S2', groessen: f.soll.S2.bloecke }]); expect(e.kontrolle.map((k: Z) => k.schicht)).toEqual(['S1', 'S2']);
  });
  it('S2 wächst auf 40: die Liste von S1 bleibt dieselbe, S2 ist länger', () => {
    const f = U.schichten_gross, e = ok(zuteilen(f.frage)), kl = ok(zuteilen(U.schichten.frage)); expect(text(e.liste, 'S1')).toBe(f.soll.S1.zuteilung); expect(text(e.liste, 'S1')).toBe(text(kl.liste, 'S1')); expect(text(e.liste, 'S2')).toBe(f.soll.S2.zuteilung);
    expect(e.liste.filter((z: Z) => z.schicht === 'S2').length).toBe(40); expect(text(e.liste, 'S2').startsWith(text(kl.liste, 'S2')), 'dieselbe Folge: die kürzere Liste ist der Anfang der längeren').toBe(true);
  });
  it('Schichtenfolge getauscht: S2 zuerst bekommt Strom 1 - die Listen vertauschen sich NICHT (der Strom hängt an der Position)', () => {
    const f = U.schichten.frage; const e = ok(zuteilen({ ...f, schichten: [f.schichten[1], f.schichten[0]] })); expect(text(e.liste, 'S2')).toBe(U.schichten.soll.S1.zuteilung); expect(text(e.liste, 'S1')).toBe(U.schichten.soll.S2.zuteilung);
  });
  it('mehr als 8 Schichten, leere oder doppelte Namen, Schicht mit n = 0: Fehler „schichten“', () => {
    const base = { gruppen: AB, verhaeltnis: [1, 1], blockgroessen: [4], startwert: SW }; const sch = (k: number) => Array.from({ length: k }, (_, i) => ({ name: `S${i}`, n: 8 }));
    ok(zuteilen({ ...base, schichten: sch(8) })); expect(code({ ...base, schichten: sch(9) })).toBe('schichten'); expect(code({ ...base, schichten: [{ name: '', n: 8 }] })).toBe('schichten'); expect(code({ ...base, schichten: [{ name: 'A', n: 8 }, { name: 'A', n: 8 }] })).toBe('schichten'); expect(code({ ...base, schichten: [{ name: 'A', n: 0 }] })).toBe('schichten');
  });
});

describe('Vollständige Zuteilung mit festen Gruppengrößen', () => {
  it('10 : 10, Strom 0: Liste gleich dem Skript, genau 10 A und 10 B', () => { const f = U.vollstaendig, e = ok(vollstaendigZuteilen({ groessen: f.frage.groessen, gruppen: f.frage.gruppen, startwert: f.frage.startwert })); expect(e.liste.map((z: Z) => z.gruppe).join('')).toBe(f.soll.zuteilung); expect(e.liste.map((z: Z) => z.nr)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1)); });
  it('Fehler: Größen und Gruppen verschieden lang, Größe 0, zu viele Gruppen, Startwert', () => {
    const c = (e: Z) => (vollstaendigZuteilen(e as any) as Z).code; expect(c({ groessen: [5], gruppen: AB, startwert: SW })).toBe('gruppen'); expect(c({ groessen: [5, 0], gruppen: AB, startwert: SW })).toBe('groessen'); expect(c({ groessen: [1, 1, 1, 1, 1, 1, 1], gruppen: ['a', 'b', 'c', 'd', 'e', 'f', 'g'], startwert: SW })).toBe('gruppen'); expect(c({ groessen: [5, 5], gruppen: AB, startwert: -3 })).toBe('startwert');
  });
});

describe('Eigenschaften (unabhängig von R): Blockbalance, Ungleichgewicht, Gleichverteilung', () => {
  it('jeder VOLLSTÄNDIGE Block ist genau ausgeglichen (1:1, 2:1, 1:1:1) und das Ungleichgewicht bleibt höchstens halbe Blockgröße (1:1) - 300 feste Startwerte', () => {
    for (let sw = 1; sw <= 300; sw++) {
      for (const [verh, gr, gro] of [[[1, 1], AB, [4]], [[1, 1], AB, [4, 6]], [[2, 1], AB, [3, 6]], [[1, 1, 1], ['A', 'B', 'C'], [3, 6]]] as [number[], string[], number[]][]) {
        const e = block(40, verh, gr, gro, sw, { aufrunden: true }); let off = 0; const s_ = verh.reduce((a, b) => a + b, 0);
        for (const g of e.bloecke[0].groessen) { const blk = e.liste.slice(off, off + g); gr.forEach((n, k) => expect(blk.filter((z: Z) => z.gruppe === n).length, `Startwert ${sw}, Block bei ${off}`).toBe((verh[k]! * g) / s_)); off += g; }
        if (verh.length === 2 && verh[0] === verh[1]) expect(maxDiff(e.liste, gr), `Startwert ${sw}`).toBeLessThanOrEqual(Math.max(...gro) / 2);
      }
    }
  });
  it('Blockgröße 4 (1:1): Ungleichgewicht höchstens 2; Größen 4 und 6: höchstens 3 (Skript: 2000 Läufe, nie darüber)', () => {
    let a = 0, b = 0; for (let sw = 1; sw <= 500; sw++) { a = Math.max(a, maxDiff(block(40, [1, 1], AB, [4], sw).liste, AB)); b = Math.max(b, maxDiff(block(60, [1, 1], AB, [4, 6], sw).liste, AB)); } expect(a).toBeLessThanOrEqual(2); expect(b).toBeLessThanOrEqual(3);
  });
  it('N kleiner als ein Block (N = 3, Größen 4 und 6): drei Plätze, nur gültige Gruppen; mit aufrunden der ganze Block; N = 1: ein Platz', () => {
    const e = block(3, [1, 1], AB, [4, 6]); expect(e.liste.length).toBe(3); expect(e.liste.every((z: Z) => AB.includes(z.gruppe))).toBe(true); expect(e.bloecke[0].groessen.length).toBe(1); expect([4, 6]).toContain(e.bloecke[0].groessen[0]);
    expect(block(3, [1, 1], AB, [4, 6], SW, { aufrunden: true }).liste.length).toBe(e.bloecke[0].groessen[0]); expect(block(1, [1, 1], AB, [4]).liste.length).toBe(1); expect(block(100000, [1, 1], AB, [4]).liste.length).toBe(100000);
  });
  it('Gleichverteilung bei FESTEN Startwerten 1 bis 60000 (1:1, Block 4): die sechs Anordnungen kommen genau so oft vor wie im Skript (R-Nachbau), χ² unter der Schwelle für p = ,001', () => {
    const zaehl: Record<string, number> = {}; for (let sw = 1; sw <= 60000; sw++) { const t = text(block(4, [1, 1], AB, [4], sw).liste); zaehl[t] = (zaehl[t] ?? 0) + 1; }
    expect(zaehl).toEqual(U.gleichverteilung.zaehler); const werte = Object.values(zaehl); expect(werte.length).toBe(6); const chi2 = werte.reduce((a, v) => a + (v - 10000) ** 2 / 10000, 0); expect(chi2).toBeLessThan(20.515); expect(Math.min(...werte)).toBeGreaterThanOrEqual(9700); expect(Math.max(...werte)).toBeLessThanOrEqual(10300);
  }, 120000);
});

describe('Eingaben prüfen: Fehler als Antwort (nie ein Absturz, nie eine halbe Liste)', () => {
  const base = { n: 20, gruppen: AB, verhaeltnis: [1, 1], blockgroessen: [4, 6], startwert: SW };
  it('Blockgröße kein Vielfaches der Summe des Verhältnisses (4 und 5 bei 1:1; 4 bei 2:1) oder keine Größe', () => {
    expect(code({ ...base, blockgroessen: [4, 5] })).toBe('blockgroesse'); expect(code({ ...base, verhaeltnis: [2, 1], blockgroessen: [4] })).toBe('blockgroesse'); expect(code({ ...base, blockgroessen: [] })).toBe('blockgroesse'); expect(code({ ...base, blockgroessen: [0] })).toBe('blockgroesse'); expect(code({ ...base, blockgroessen: [4.5] })).toBe('blockgroesse');
  });
  it('N: 0, negativ, nicht ganz, über 100 000; fehlt ganz (weder n noch Schichten)', () => {
    for (const n of [0, -4, 7.5, 100001, NaN]) expect(code({ ...base, n }), `n = ${n}`).toBe('n'); expect(code({ ...base, n: undefined })).toBe('n');
  });
  it('Gruppen: eine, sieben, leerer oder doppelter Name; Verhältnis in falscher Länge, 0 oder nicht ganz; Startwert ungültig', () => {
    expect(code({ ...base, gruppen: ['A'], verhaeltnis: [1] })).toBe('gruppen'); expect(code({ ...base, gruppen: ['a', 'b', 'c', 'd', 'e', 'f', 'g'], verhaeltnis: [1, 1, 1, 1, 1, 1, 1] })).toBe('gruppen'); expect(code({ ...base, gruppen: ['A', ''] })).toBe('gruppen'); expect(code({ ...base, gruppen: ['A', 'A'] })).toBe('gruppen');
    expect(code({ ...base, verhaeltnis: [1] })).toBe('verhaeltnis'); expect(code({ ...base, verhaeltnis: [1, 0] })).toBe('verhaeltnis'); expect(code({ ...base, verhaeltnis: [1, 1.5] })).toBe('verhaeltnis'); expect(code({ ...base, startwert: -1 })).toBe('startwert'); expect(code({ ...base, startwert: 2 ** 32 })).toBe('startwert');
    ok(zuteilen({ ...base, gruppen: ['a', 'b', 'c', 'd', 'e', 'f'], verhaeltnis: [1, 1, 1, 1, 1, 1], blockgroessen: [6, 12] }));
  });
});

describe('Eingefügte Liste (Kennungen) und Export', () => {
  it('Lesen: Zeilen getrimmt, leere Zeilen übersprungen und gezählt, doppelte Kennungen NICHT entfernt, aber gemeldet (einmal, in der Reihenfolge des ersten Auftretens)', () => {
    const r = kennungenLesen('  Anna \nBerta\n\nAnna\n   \nCem\nBerta\nAnna\n'); expect(r.kennungen).toEqual(['Anna', 'Berta', 'Anna', 'Cem', 'Berta', 'Anna']); expect(r.leer).toBe(2); expect(r.doppelt).toEqual(['Anna', 'Berta']);
    expect(kennungenLesen('')).toEqual({ kennungen: [], leer: 0, doppelt: [] }); expect(kennungenLesen('a\r\nb\r\n').kennungen).toEqual(['a', 'b']);
  });
  it('Auswahl aus der Liste: dieselben Positionen wie die Zahlen-Stichprobe (k aus der Zahl der Kennungen); sortiert = Reihenfolge der Liste', () => {
    const namen = Array.from({ length: 100 }, (_, i) => `P${i + 1}`); const r = ok(stichprobeAusListe(namen.join('\n'), 10, SW)); expect(r.gezogen).toEqual(U.stichprobe.soll.gezogen.map((i: number) => `P${i}`)); expect(r.sortiert).toEqual(U.stichprobe.soll.sortiert.map((i: number) => `P${i}`)); expect([r.leer, r.doppelt]).toEqual([0, []]);
  });
  it('mit Doppelten und leeren Zeilen: eine doppelte Person hat zwei Plätze (doppelte Chance) und wird gemeldet; Leere zählen nicht als Kennung', () => {
    const r = ok(stichprobeAusListe('A\n\nB\nA\nC\n\nD', 3, SW)); expect(r.leer).toBe(2); expect(r.doppelt).toEqual(['A']); const k = kennungenLesen('A\n\nB\nA\nC\n\nD').kennungen; const pos = ok(stichprobeZiehen(k.length, 3, SW)).gezogen; expect(r.gezogen).toEqual(pos.map((i: number) => k[i - 1]));
  });
  it('Fehler: leere Liste, k = 0 oder größer als die Liste, Startwert, mehr als 1 000 000 Zeilen, Zeile über 200 Zeichen', () => {
    expect(stichprobeAusListe('', 1, SW)).toEqual({ ok: false, code: 'liste-leer' }); expect(stichprobeAusListe('\n\n  \n', 1, SW)).toEqual({ ok: false, code: 'liste-leer' }); expect(stichprobeAusListe('a\nb', 0, SW)).toEqual({ ok: false, code: 'k' }); expect(stichprobeAusListe('a\nb', 3, SW)).toEqual({ ok: false, code: 'k' });
    expect(stichprobeAusListe('a\nb', 1, -5)).toEqual({ ok: false, code: 'startwert' }); expect(stichprobeAusListe('x'.repeat(201) + '\nb', 1, SW)).toEqual({ ok: false, code: 'zeile-zu-lang' }); ok(stichprobeAusListe('x'.repeat(200) + '\nb', 1, SW));
    expect(stichprobeAusListe(Array.from({ length: 1000001 }, (_, i) => `K${i}`).join('\n'), 5, SW)).toEqual({ ok: false, code: 'zu-viele-zeilen' });
  });
  it('1 000 000 Zeilen in einer Liste: Auswahl von 10 in höchstens 5 s', () => {
    const t = Array.from({ length: 1000000 }, (_, i) => `K${i + 1}`).join('\n'); const t0 = performance.now(); const r = ok(stichprobeAusListe(t, 10, SW)); expect(performance.now() - t0).toBeLessThan(5000); expect(new Set(r.gezogen).size).toBe(10);
    const pos = ok(stichprobeZiehen(1000000, 10, SW)).gezogen; expect(r.gezogen).toEqual(pos.map((i: number) => `K${i}`));
  }, 30000);
  it('CSV-Injektion: Zellen, die mit =, +, - oder @ beginnen, bekommen einen Apostroph; harmlose Zellen bleiben; Anführungszeichen und Trennzeichen werden gesichert', () => {
    for (const t of ['=1+1', '+SUMME(A1)', '-2+3', '@cmd', '\t=x', '\r=y']) { const z = csvZelle(t); expect(z, t).toContain("'"); expect(z, t).not.toMatch(/^"?[=+\-@\t\r]/); }
    expect(csvZelle('Anna')).toBe('Anna'); expect(csvZelle("O'Brien")).not.toMatch(/^'/); expect(csvZelle('a;b,c')).toMatch(/^".*"$/); expect(csvZelle('sag "hi"')).toBe('"sag ""hi"""'); expect(csvZelle('a\nb')).toMatch(/^"[\s\S]*"$/); expect(csvZelle('')).toBe('');
  });
  it('Zuteilungs-CSV: erste Zeile ist die Lehrmittel-Kopfzeile, der Startwert steht in den ersten Zeilen, jede Zeile der Liste ist da, Schichtname „=1+1“ wird geschützt', () => {
    const e = ok(zuteilen({ schichten: [{ name: '=1+1', n: 6 }, { name: 'Süd', n: 6 }], gruppen: AB, verhaeltnis: [1, 1], blockgroessen: [4], startwert: SW })); const csv = zuteilungCsv(e, { startwert: SW }); const zeilen = csv.split(/\r?\n/);
    expect(zeilen[0]).toContain(zuteilungLehrmittelSatz()); expect(zeilen.slice(0, 4).join('\n')).toContain(String(SW)); expect(csv).toContain("'=1+1"); expect(csv).not.toMatch(/(^|[;,\n"])=1\+1/); expect(zeilen.filter(z => /Süd/.test(z)).length).toBeGreaterThanOrEqual(6);
    for (const z of e.liste.slice(0, 3)) expect(csv).toContain(z.gruppe);
  });
  it('Auswahl-CSV: Kopfzeile Lehrmittel, Startwert, n und k; eine Kennung „=cmd|x“ wird geschützt; Ziehungsreihenfolge bleibt', () => {
    const csv = auswahlCsv({ gezogen: ['=cmd|x', 'Berta', '+1'], n: 100, k: 3 }, { startwert: SW }); const zeilen = csv.split(/\r?\n/);
    expect(zeilen[0]).toContain(zuteilungLehrmittelSatz()); expect(zeilen.slice(0, 4).join('\n')).toContain(String(SW)); expect(csv).toContain("'=cmd|x"); expect(csv).toContain("'+1"); expect(csv.indexOf("'=cmd|x")).toBeLessThan(csv.indexOf('Berta')); expect(csv.indexOf('Berta')).toBeLessThan(csv.indexOf("'+1"));
  });
});

describe('Sätze (deutsch, du)', () => {
  it('Kopfzeile: genau „Lehrmittel - nicht für echte Studien (keine Verdeckung)“, nur Bindestrich', () => { const t = zuteilungLehrmittelSatz(); expect(t).toBe('Lehrmittel - nicht für echte Studien (keine Verdeckung)'); expect(t).not.toMatch(/[–—]/); });
  it('„Gerechnet“: Blockrandomisierung 1:1, Blockgrößen 4 und 6, Startwert 20261008, Strom 0; Zufallsauswahl: Fisher-Yates mit mulberry32, Startwert 20261008', () => {
    expect(zuteilungGerechnet({ art: 'block', verhaeltnis: [1, 1], blockgroessen: [4, 6], startwert: SW, strom: 0 })).toBe('Blockrandomisierung 1:1, Blockgrößen 4 und 6, Startwert 20261008, Strom 0');
    expect(zuteilungGerechnet({ art: 'block', verhaeltnis: [2, 1], blockgroessen: [3], startwert: SW, strom: 2 })).toBe('Blockrandomisierung 2:1, Blockgröße 3, Startwert 20261008, Strom 2');
    expect(zuteilungGerechnet({ art: 'stichprobe', n: 100, k: 10, startwert: SW })).toMatch(/Zufallsauswahl: Fisher-Yates mit mulberry32, Startwert 20261008/);
  });
});
