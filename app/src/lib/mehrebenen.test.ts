import { describe, expect, it, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { s, type Blatt } from './sitzung.svelte';
import type { Spalte } from './verzeichnis';
import { erkenneGruppierung, mebDaten, mebLesen, mebRCode, steigungMoeglich, type Mehrebenen, type MebPraed } from './mehrebenen';
import { saetzeMehrebenen, tabellenMehrebenen, mebApa, festName, ebenenHinweisText } from './mehrebenensaetze';
import { berichtTabellen, excelTabellen, berichtSatz, gerechneteN } from './berichtsatz';
import { rechenZusatz } from './eigenercode';
import { rFehlerText } from './rverfahren.svelte';
import { VERFAHREN } from './verfahren';

/* Zahlen: R am Mac (R 4.6.1, lme4 2.0.6, lmerTest 3.2.1, performance 0.17), scripts/mehrebenen-erwartet.R. Die Rohantworten von sp_mehrebenen() liegen in testdaten/mehrebenen-r.json
 * (so, wie sie aus webR ankommen: jeder Wert ein Vektor). Daten: klassen-ausschnitt.csv (40 Klassen aus nlme::MathAchieve) und lme4::sleepstudy. */
const roh = JSON.parse(readFileSync(join(import.meta.dirname, 'testdaten/mehrebenen-r.json'), 'utf8')) as Record<string, Record<string, unknown>>;
const sp = (name: string, extra: Partial<Spalte> = {}): Spalte => ({ name, bezeichnung: '', art: 'zahl', niveau: 'metrisch', format: 'F8.2', fehlend: [], fehlendText: '', werteLabels: {}, ...extra });
const praedKlassen: MebPraed[] = [{ name: 'SES', art: 'zahl', stufen: [] }, { name: 'Minderheit', art: 'faktor', stufen: ['0', '1'] }];
const klassen = (): Mehrebenen => mebLesen(roh.klassen!, { y: 'Mathe', gruppe: 'Klasse', praed: praedKlassen, steigung: '', zentriert: false });
const nah = (ist: number, soll: number, tol = 1e-6) => expect(Math.abs(ist - soll) / Math.max(Math.abs(soll), 1e-9)).toBeLessThan(tol);

beforeEach(() => { s.einst.sprache = 'de'; s.spalten = [sp('Mathe', { bezeichnung: 'Mathematik-Leistung' }), sp('Klasse', { art: 'text', niveau: 'nominal' }), sp('SES'), sp('Minderheit')]; });

describe('Gruppierungsspalte erkennen', () => {
  const zeilen = (k: number, je: number): (string | number | null)[][] => Array.from({ length: k * je }, (_, i) => [Math.floor(i / je) + 1, i, 'x']);
  it('Name wie klasse/schule/gruppe/seminar mit 5 bis 200 Gruppen und mehreren Fällen', () => {
    const v = erkenneGruppierung([sp('klasse'), sp('wert'), sp('x', { art: 'text' })], zeilen(20, 5));
    expect(v).toMatchObject({ spalte: 'klasse', gruppen: 20, weil: 'name' });
    expect(v!.mittel).toBe(5);
    for (const n of ['Schule', 'Seminar', 'gruppe_nr', 'id_klasse', 'Kurs']) expect(erkenneGruppierung([sp(n)], zeilen(10, 3)), n).not.toBeNull();
  });
  it('Messgrößen mit „Schule“/„Klasse“ im Namen sind keine Gruppierung (Abschlusstest: „Fehltage im Schuljahr“)', () => {
    for (const [n, b] of [['fehltage', 'Fehltage im Schuljahr'], ['note_schule', 'Schulnote'], ['kgr', 'Klassengröße'], ['schuljahre', ''], ['anz_klassen', 'Anzahl Klassen'], ['punkte_kurs', 'Punkte im Kurs'], ['alter_schule', 'Alter bei Schuleintritt'], ['dauer_seminar', 'Dauer des Seminars (Minuten)']] as const)
      expect(erkenneGruppierung([sp(n, { bezeichnung: b })], zeilen(20, 5)), `${n} / ${b}`).toBeNull();
    for (const [n, b] of [['schule', 'Schule'], ['schul_id', ''], ['klasse', 'Klasse (4a, 4b …)'], ['schulnr', 'Schulnummer']] as const)
      expect(erkenneGruppierung([sp(n, { bezeichnung: b })], zeilen(20, 5)), `${n} / ${b}`).not.toBeNull();
  });
  it('Kennung (id, nr, code) nur mit Wiederholungen', () => {
    expect(erkenneGruppierung([sp('ID')], zeilen(30, 4))).toMatchObject({ spalte: 'ID', weil: 'kennung' });
    expect(erkenneGruppierung([sp('ID')], zeilen(120, 1))).toBeNull();            // jede Zeile eine andere Nummer: keine Gruppierung
    expect(erkenneGruppierung([sp('lfd_nr')], zeilen(120, 1))).toBeNull();
    expect(erkenneGruppierung([sp('nummer')], zeilen(15, 2))).not.toBeNull();
  });
  it('zu wenige oder zu viele Gruppen, andere Namen, Ausnahmen', () => {
    expect(erkenneGruppierung([sp('klasse')], zeilen(4, 10))).toBeNull();         // unter 5
    expect(erkenneGruppierung([sp('klasse')], zeilen(300, 2))).toBeNull();        // über 200
    expect(erkenneGruppierung([sp('alter')], zeilen(20, 5))).toBeNull();          // Name sagt nichts
    expect(erkenneGruppierung([sp('klasse')], zeilen(20, 5), ['klasse'])).toBeNull();   // schon in der Frage
    expect(erkenneGruppierung([sp('bild')], zeilen(20, 5))).toBeNull();           // „id“ in „bild“ zählt nicht
  });
  it('„keine Angabe“-Werte zählen nicht als Gruppe', () => {
    const z = zeilen(4, 5).concat(Array.from({ length: 10 }, (_, i) => [99, i, 'x']));
    expect(erkenneGruppierung([sp('klasse', { fehlend: [99] })], z)).toBeNull();   // nur 4 echte Gruppen
    expect(erkenneGruppierung([sp('klasse')], z)).not.toBeNull();
  });
  it('Name geht vor Kennung', () => {
    expect(erkenneGruppierung([sp('id'), sp('schule')], zeilen(10, 5).map(r => [r[0] ?? null, r[0] ?? null]))).toMatchObject({ spalte: 'schule' });
  });
});

describe('Daten für R', () => {
  it('Messwert, Gruppe (Text) und Prädiktoren; Faktor bei Text, Beschriftungen oder nominal', () => {
    const spalten = [sp('y'), sp('g', { art: 'text' }), sp('Alter'), sp('Geschlecht', { werteLabels: { '1': 'weiblich', '2': 'männlich' } }), sp('Typ', { niveau: 'nominal' }), sp('F', { art: 'text' })];
    const zeilen: (string | number | null)[][] = [[1, 'a', 20, 2, 5, 'u'], [2, 'a', 22, 1, 6, 'v'], [3, 'b', 30, 1, 5, 'u'], [null, 'b', 31, null, 7, 'v'], [5, '', 25, 2, 5, 'u']];
    const d = mebDaten('y', 'g', ['Alter', 'Geschlecht', 'Typ', 'F'], zeilen, spalten);
    expect(d.spalten.map(x => `${x.name}:${x.art}`)).toEqual(['y:zahl', 'g:text', 'p01:zahl', 'p02:faktor', 'p03:faktor', 'p04:faktor']);
    expect(d.spalten[0]!.werte).toEqual([1, 2, 3, null, 5]);
    expect(d.spalten[1]!.werte).toEqual(['a', 'a', 'b', 'b', null]);
    expect(d.spalten[3]!.labels).toEqual([{ wert: 1, label: 'weiblich' }, { wert: 2, label: 'männlich' }]);   // kleinster Wert = Vergleichsgruppe
    expect(d.praed.map(p => [p.art, p.stufen.join('|')])).toEqual([['zahl', ''], ['faktor', 'weiblich|männlich'], ['faktor', '5|6|7'], ['faktor', 'u|v']]);
    expect(d.spalten[3]!.werte).toEqual([2, 1, 1, null, 2]);
  });
  it('Werte, die als „keine Angabe“ gelten, werden NA; Gruppen mit Beschriftung nutzen sie', () => {
    const spalten = [sp('y', { fehlend: [99] }), sp('g', { werteLabels: { '1': 'Klasse A', '2': 'Klasse B' } })];
    const d = mebDaten('y', 'g', [], [[1, 1], [99, 2], [3, 2]], spalten);
    expect(d.spalten[0]!.werte).toEqual([1, null, 3]);
    expect(d.spalten[1]!.werte).toEqual(['Klasse A', 'Klasse B', 'Klasse B']);
  });
});

describe('R-Antwort lesen (Fixwerte aus R am Mac)', () => {
  it('Klassen-Ausschnitt: feste Effekte, Varianzen, R², Gruppen', () => {
    const e = klassen();
    expect([e.n, e.ng, e.gnMin, e.gnMax]).toEqual([720, 40, 18, 18]);
    expect(e.fest.map(f => [f.pIdx, f.stufe])).toEqual([[-1, ''], [0, ''], [1, '1']]);
    nah(e.fest[0]!.b, 14.446369485692); nah(e.fest[1]!.b, 2.612222617676); nah(e.fest[2]!.b, -3.10405505639);
    nah(e.fest[1]!.se, 0.3260943595534); nah(e.fest[1]!.df, 688.82178);
    nah(e.fest[1]!.lo, 2.612222617676 - 1.9632 * 0.3260943595534, 1e-3);
    nah(e.tau, 2.47933350648); nah(e.sigma, 35.065712325002); nah(e.iccVoll, 0.06603623598193);
    nah(e.nullIcc, 0.1601107067585); nah(e.deff, 1 + 17 * 0.1601107067585);
    nah(e.r2m, 0.1694430781694); nah(e.r2c, 0.2242899310558);
    expect(e.gruppen.length).toBe(40);
    expect(e.gruppen.every(g => g.n === 18 && g.se > 0)).toBe(true);
    expect(e.singular).toBe(false);
    expect(e.aufgeklaert1).toBeGreaterThan(0);
  });
  it('sleepstudy mit zufälliger Steigung: Varianz der Steigung, Korrelation, R²', () => {
    const e = mebLesen(roh.steigung!, { y: 'Reaction', gruppe: 'Subject', praed: [{ name: 'Days', art: 'zahl', stufen: [] }], steigung: 'Days', zentriert: false });
    nah(e.tau, 612.100158057007); nah(e.tauSteigung!, 35.071714450484); nah(e.korAchSteig!, 0.06555123825695); nah(e.sigma, 654.940008257545);
    nah(e.r2m, 0.2786510581582); nah(e.r2c, 0.7992199227863);
    nah(e.fest[1]!.df, 16.999983752859);
    expect(e.aufgeklaert1).toBeDefined();
  });
  it('Nullmodell ohne Erklärungsspalten', () => {
    const e = mebLesen(roh.null!, { y: 'Reaction', gruppe: 'Subject', praed: [], steigung: '', zentriert: false });
    expect(e.mitPraed).toBe(false);
    nah(e.nullIcc, 0.3948895953673); nah(e.nullTau, 1278.337756569811);
    expect(tabellenMehrebenen(e).map(t => t.label)).toEqual(['Fixed Effects', 'Random Effects', 'Model Fit']);
    expect(saetzeMehrebenen(e).haupt).toContain('39\u00a0%');
    expect(mebApa(e)).toBe('Mehrebenenmodell: ICC = ,39, Designeffekt = 4,6 (N = 180 in 18 Gruppen)');
  });
});

describe('Sätze und Tabellen', () => {
  it('Satz, APA-Zeile, Marken (deutsch)', () => {
    const e = klassen(), st = saetzeMehrebenen(e, n => n);
    expect(st.haupt).toContain('SES');
    expect(st.haupt).toContain('(p < ,05)');
    expect(st.zusatz).toContain('16\u00a0%');
    expect(st.zusatz).toContain('ICC = ,16');
    expect(st.zusatz).toContain('R² marginal = ,17');
    expect(st.zusatz).toContain('Designeffekt = 3,7');
    expect(st.vorsicht).toContain('Ursachen');
    expect(st.apa).toMatch(/^Mehrebenenmodell: ICC \(Nullmodell\) = ,16; SES: b = 2,61, 95 %-KI \[1,97; 3,25\], t\(688,8\) = 8,01, p < ,001; Minderheit \(1\): b = −3,10/);
    expect(st.apa).toContain('R²m = ,17, R²c = ,22 (N = 720 in 40 Gruppen)');
    expect(st.marken.map(m => m.erklaer)).toEqual(expect.arrayContaining(['icc-mehrebenen', 'mehrebenen', 'r-quadrat', 'p-wert']));
  });
  it('englisch', () => {
    s.einst.sprache = 'en';
    const st = saetzeMehrebenen(klassen(), n => n);
    expect(st.haupt).toContain('Taking the grouping');
    expect(st.apa).toContain('Multilevel model: ICC (null model) = .16');
    expect(st.apa).toContain('95% CI [1.97, 3.25]');
  });
  it('Warnungen: wenige Gruppen, Grenzlösung, Konvergenz, ausgelassene Fälle', () => {
    const e = { ...klassen(), ng: 8, singular: true, konv: true, nAlle: 800 };
    const v = saetzeMehrebenen(e, n => n).vorsicht;
    expect(v).toContain('nur 8 Gruppen'); expect(v).toContain('Grenzlösung'); expect(v).toContain('konvergiert'); expect(v).toContain('720 von 800');
    expect(saetzeMehrebenen({ ...klassen(), ng: 25 }, n => n).vorsicht).toContain('Vorsicht');
    expect(saetzeMehrebenen(klassen(), n => n).vorsicht).not.toContain('Gruppen:');
  });
  it('geringer ICC wird als gering benannt', () => {
    const e = { ...klassen(), nullIcc: 0.02, deff: 1.3 };
    expect(saetzeMehrebenen(e, n => n).zusatz).toContain('Die Gruppierung fällt hier kaum ins Gewicht');
  });
  it('Tabellen: feste Effekte, Zufallseffekte, Modellgüte; Beschriftungen', () => {
    const e = klassen(), t = tabellenMehrebenen(e, n => n);
    expect(t.map(x => x.label)).toEqual(['Fixed Effects', 'Random Effects', 'Model Fit']);
    expect(t[0]!.rows).toBe(4);
    expect(t[0]!.cells.some(c => c.t === 'Minderheit: 1 gegenüber 0')).toBe(true);
    expect(t[0]!.cells.some(c => c.t === 'Konstante (Achsenabschnitt)')).toBe(true);
    expect(festName(e, e.fest[1]!, n => n)).toBe('SES');
    expect(t[0]!.footnotes.length).toBe(2);
    const se = mebLesen(roh.steigung!, { y: 'R', gruppe: 'S', praed: [{ name: 'D', art: 'zahl', stufen: [] }], steigung: 'D', zentriert: true });
    const t2 = tabellenMehrebenen(se, n => n);
    expect(t2[1]!.rows).toBe(5);   // Achsenabschnitt, Steigung, Korrelation, Residuum + Kopf
    expect(t2[0]!.footnotes[1]!.t).toContain('zentriert');
  });
  it('Tabellen mit Faktor mit mehr als zwei Stufen enthalten den F-Test', () => {
    const e = klassen(); e.tests = [{ pIdx: 1, f: 12.3, df1: 2, df2: 400, p: 0.00001 }];
    expect(tabellenMehrebenen(e, n => n).map(x => x.label)).toContain('Fixed Effect Tests');
  });
});

describe('Blatt, Bericht, Excel', () => {
  const blatt = (e: Mehrebenen): Blatt => ({ id: 'm', titel: 't', art: 'mehrebenen', l1: 'Mathe', l2: 'Klasse', l3: ['Mathe', 'Klasse', 'SES', 'Minderheit'], syntax: '', items: [], ergebnis: { typ: 'mehrebenen', e }, imBericht: true, notiz: '', zeit: 0 });
  it('Bericht nimmt die eigenen Tabellen, Excel auch; Rechenzusatz nennt R', () => {
    const b = blatt(klassen());
    expect(berichtTabellen(b).length).toBe(3);
    expect(excelTabellen(b).length).toBe(3);
    expect(rechenZusatz([b])).toContain('lme4');
    expect(berichtSatz(b)).toContain('Mehrebenenmodell');
    expect(gerechneteN(b)).toEqual({ n: 720, art: 'personen' });
  });
});

describe('Frageart und Hilfstexte', () => {
  it('Frageart „Sind meine Daten in Gruppen verschachtelt?“ in VERFAHREN', () => {
    const v = VERFAHREN.find(x => x.id === 'mehrebenen')!;
    expect(v.titel).toBe('Sind meine Daten in Gruppen verschachtelt?');
    expect(v.luecken.map(l => l.mindestens ?? 1)).toEqual([1, 1, 0, 0]);
    const w = { l1: ['Mathe'], l2: ['Klasse'], l3: ['SES', 'Minderheit'], l4: [] };
    expect(v.syntax(w, {} as never)).toContain('lmer(Mathe ~ SES + Minderheit + (1 | Klasse)');
    expect(v.titelBlatt(w, n => s.spalten.find(x => x.name === n))).toBe('Mehrebenenmodell: Mathematik-Leistung nach Klasse');
    expect(mebRCode(klassen(), (de) => de)).toContain('library(lmerTest)');
  });
  it('Zufällige Steigung nur für Zahl oder zwei Stufen', () => {
    expect(steigungMoeglich({ name: 'a', art: 'zahl', stufen: [] })).toBe(true);
    expect(steigungMoeglich({ name: 'a', art: 'faktor', stufen: ['x', 'y'] })).toBe(true);
    expect(steigungMoeglich({ name: 'a', art: 'faktor', stufen: ['x', 'y', 'z'] })).toBe(false);
  });
  it('Hinweistext nennt Spalte, Gruppenzahl, Fälle je Gruppe', () => {
    const h = ebenenHinweisText({ spalte: 'Klasse', gruppen: 40, mittel: 18, weil: 'name' }, n => n);
    expect(h.kurz).toBe('Die Daten sind nach „Klasse“ gruppiert (40 Gruppen, im Schnitt 18 Fälle je Gruppe) - ein Mehrebenenmodell berücksichtigt das.');
    expect(h.knopf).toBe('Mit Mehrebenenmodell rechnen');
  });
  it('übersetzt R-Meldungen von lme4', () => {
    expect(rFehlerText('number of levels of each grouping factor must be < number of observations (problems: g)')).toContain('keine Gruppen mit mehreren Fällen');
    expect(rFehlerText('one group only')).toContain('keine Gruppen mit mehreren Fällen');
    expect(rFehlerText('Downdated VtV is not positive definite (lmer)')).toContain('nicht schätzen');
  });
});
