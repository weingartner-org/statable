import { describe, expect, it } from 'vitest';
import ERW from './testdaten/spaeter-d2-erwartet.json';
import { s } from './sitzung.svelte';
import { komma, pWert } from './ergebnis';
import type { Gewicht, GewichtAbdruck } from './gewichte';
import type { Spalte } from './verzeichnis';
import { regFaktor } from './regfaktor';
import { umfrageLesen, umfrageSatz } from './umfrage';
import { gruppenDaten, regressionDaten, wlsKoeffizienten, logitKoeffizienten, pruefeAntwort, gruppenRechnen, regressionRechnen } from './umfrage-gr-rechnen';
import { brauchtRBlatt } from './live';
import { darfNeuRechnen } from './neurechnen.svelte';
import { koefName, saetzeDesignB, tabellenDesignB, rocEntfaelltSatz, type DesignB } from './umfrage-gr';

/* Später S-D2, Bauer B: eigene Tests zu Gruppenvergleich und Regression mit Umfragegewicht (Aufbereitung der Daten, Selbstprüfung, Tabellen, Sätze am Blatt).
 * Die Sollwerte-Datei und lib/umfrage.test.ts bleiben unverändert; hier steht, was darüber hinaus zum Anbinden gehört. */
s.einst.sprache = 'de'; s.einst.anrede = 'du';
type Z = Record<string, any>;
const J = ERW as unknown as Z;
const fall = (id: string): Z => (J.faelle as Z[]).find(f => f.id === id)!;
const gU = { spalte: 'pw', art: 'umfrage', klumpenfrei: true } as Gewicht;
const abdruck = { ...gU, summe: 6194, zeilen: 200, rechenweg: 'survey', surveyVersion: '4.5' } as GewichtAbdruck;
const alsWebR = (x: any, schluessel = ''): any => (x === null ? { type: 'null' } : Array.isArray(x) ? x.map(v => alsWebR(v, schluessel)) : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, alsWebR(v, k)])) : schluessel === 'warnungen' ? x : [x]);
const lies = (id: string) => umfrageLesen(fall(id).art, alsWebR(fall(id).soll)) as Z;

/** Eine Sitzung aus dem Datensatz der Sollwerte-Datei: Spalten (alle Zahlen, Niveau metrisch) und Zeilen. */
function sitzung(daten: string, namen: string[]): { spalten: Spalte[]; zeilen: (number | null)[][] } {
  const sp = J.daten[daten].spalten as Record<string, (number | null)[]>, n = sp[namen[0]!]!.length;
  return {
    spalten: namen.map(name => ({ name, bezeichnung: name, art: 'zahl', niveau: 'metrisch', format: 'F8.2', fehlend: [], fehlendText: '', werteLabels: {} }) as Spalte),
    zeilen: Array.from({ length: n }, (_, r) => namen.map(name => sp[name]![r] ?? null))
  };
}
const wVon = (daten: string, name: string): number[] => (J.daten[daten].spalten[name] as number[]).map(x => (x > 0 ? x : 0));
const name = (n: string) => ({ api00: 'API-Wert', awards: 'Auszeichnung', ell: 'Sprachförderung', meals: 'Gratismahlzeiten', hoch700: 'API-Wert ab 700', stype: 'Schultyp' } as Record<string, string>)[n] ?? n;
const wert = (_sp: string, w: string | number) => ({ '1': 'Nein', '2': 'Ja' } as Record<string, string>)[String(w)] ?? String(w);

describe('Daten für den Gruppenvergleich', () => {
  const { spalten, zeilen } = sitzung('apistrat', ['api00', 'awards', 'stype']);
  it('y, Gruppen-Code (1 … k in der Reihenfolge der Gruppenwerte) und bereinigtes Gewicht; Aufruf mit Codes', () => {
    const dg = gruppenDaten('api00', 'awards', wVon('apistrat', 'pw'), zeilen, spalten);
    expect(dg.spalten.map(c => c.name)).toEqual(['y', 'g', 'w']); expect(dg.gruppenWerte).toEqual([1, 2]);
    expect(dg.aufruf).toBe("sp_umfrage_gruppen(d, 'y', 'g', c(1, 2), 'w', NULL)");
    expect(new Set(dg.spalten[1]!.werte)).toEqual(new Set([1, 2]));
  });
  it('drei Gruppen: Codes 1, 2, 3', () => { const dg = gruppenDaten('api00', 'stype', wVon('apistrat', 'pw'), zeilen, spalten); expect(dg.gruppenWerte).toEqual([1, 2, 3]); expect(dg.aufruf).toContain('c(1, 2, 3)'); });
  it('Gewicht 0 bleibt 0 (R löscht die Zeile); fehlende Gruppenwerte werden NA', () => {
    const w = wVon('apistrat', 'pw'); w[3] = 0; const z2 = zeilen.map(r => [...r]); z2[5]![1] = null;
    const dg = gruppenDaten('api00', 'awards', w, z2, spalten); expect(dg.spalten[2]!.werte[3]).toBe(0); expect(dg.spalten[1]!.werte[5]).toBeNull();
  });
  it('die zweite Rechnung (JavaScript) trifft die gewichteten Gruppenmittel aus survey (P19)', () => {
    const dg = gruppenDaten('api00', 'awards', wVon('apistrat', 'pw'), zeilen, spalten), g = fall('P19').soll.gruppen as Z[];
    dg.js.mittel.forEach((m, i) => expect(Math.abs(m - g[i]!.mittel)).toBeLessThan(1e-8));
  });
  it('Textspalte als Gruppe: Codes nach Alphabet', () => {
    const sp = [{ ...spalten[0]! }, { ...spalten[1]!, name: 'g', art: 'text' } as Spalte], z = [[1, 'b'], [2, 'a'], [3, 'b'], [4, 'a']] as (number | string | null)[][];
    const dg = gruppenDaten('api00', 'g', [1, 1, 1, 1], z, sp); expect(dg.gruppenWerte).toEqual(['a', 'b']); expect(dg.spalten[1]!.werte).toEqual([2, 1, 2, 1]);
  });
});

describe('Daten für die Regression', () => {
  const { spalten, zeilen } = sitzung('apistrat', ['api00', 'ell', 'meals', 'hoch700', 'stype']);
  const kein = () => null;
  it('linear: y, p01 … und w; Aufruf', () => {
    const dr = regressionDaten('api00', ['ell', 'meals'], null, kein, wVon('apistrat', 'pw'), zeilen, spalten);
    expect(dr.spalten.map(c => c.name)).toEqual(['y', 'p01', 'p02', 'w']); expect(dr.koefTerme).toEqual([null, { spalte: 'ell' }, { spalte: 'meals' }]);
    expect(dr.aufruf).toBe("sp_umfrage_regression(d, 'y', c('p01', 'p02'), FALSE, 'w', NULL)");
  });
  it('logistisch: Ereignis 1, Vergleichswert 0, anderes fehlt', () => {
    const dr = regressionDaten('hoch700', ['meals'], { ereignis: '1', referenz: '0', text: false }, kein, wVon('apistrat', 'pw'), zeilen, spalten);
    expect(dr.aufruf).toContain('TRUE'); expect(new Set(dr.spalten[0]!.werte)).toEqual(new Set([0, 1])); expect(dr.ereignis).toEqual({ wert: 1, referenz: 0 });
    const umgekehrt = regressionDaten('hoch700', ['meals'], { ereignis: '0', referenz: '1', text: false }, kein, wVon('apistrat', 'pw'), zeilen, spalten);
    expect(umgekehrt.spalten[0]!.werte.map(v => 1 - (v as number))).toEqual(dr.spalten[0]!.werte);
  });
  it('Gruppen-Spalte als Prädiktor: 0/1-Hilfsspalten gegen die erste Stufe, Namen der Stufen in den Termen', () => {
    const sp = spalten.map(x => (x.name === 'stype' ? ({ ...x, niveau: 'nominal' } as Spalte) : x));
    const faktor = (n: string) => regFaktor(sp.find(x => x.name === n)!, zeilen.map(z => z[spalten.findIndex(q => q.name === n)]).filter((v): v is number => v !== null), sp.map(x => x.name));
    const dr = regressionDaten('api00', ['stype', 'meals'], null, faktor, wVon('apistrat', 'pw'), zeilen, sp);
    expect(dr.spalten.map(c => c.name)).toEqual(['y', 'p01', 'p02', 'p03', 'w']); expect(dr.koefTerme.length).toBe(4);
    expect(dr.koefTerme[1]).toEqual({ spalte: 'stype', stufe: '2', referenz: '1' }); expect(dr.koefTerme[2]).toEqual({ spalte: 'stype', stufe: '3', referenz: '1' });
    const st = zeilen.map(z => z[4]); expect(dr.spalten[1]!.werte).toEqual(st.map(v => (v === 2 ? 1 : 0))); expect(dr.spalten[2]!.werte).toEqual(st.map(v => (v === 3 ? 1 : 0)));
  });
});

describe('Zweite Rechnung in JavaScript: Koeffizienten gegen survey (Selbstprüfung)', () => {
  const { spalten, zeilen } = sitzung('apistrat', ['api00', 'ell', 'meals', 'hoch700']);
  it('gewichtete Kleinste Quadrate trifft die Koeffizienten aus survey auf 1e-8 (P24)', () => {
    const dr = regressionDaten('api00', ['ell', 'meals'], null, () => null, wVon('apistrat', 'pw'), zeilen, spalten), b = wlsKoeffizienten(dr.js.x, dr.js.y, dr.js.w)!;
    (fall('P24').soll.koef as Z[]).forEach((k, i) => expect(Math.abs(b[i]! - k.b) / Math.abs(k.b)).toBeLessThan(1e-8));
  });
  it('logistische Rechnung trifft die Koeffizienten (P27) auf 1e-6', () => {
    const dr = regressionDaten('hoch700', ['ell', 'meals'], { ereignis: '1', referenz: '0', text: false }, () => null, wVon('apistrat', 'pw'), zeilen, spalten), b = logitKoeffizienten(dr.js.x, dr.js.y, dr.js.w)!;
    (fall('P27').soll.koef as Z[]).forEach((k, i) => expect(Math.abs(b[i]! - k.b) / Math.abs(k.b)).toBeLessThan(1e-6));
  });
  it('Abbruch bei verstellter Zahl (absichtlich falsche Antwort von R)', () => {
    const dr = regressionDaten('api00', ['ell', 'meals'], null, () => null, wVon('apistrat', 'pw'), zeilen, spalten), e = lies('P24');
    expect(() => pruefeAntwort('regression', e, dr)).not.toThrow();
    e.koef[1].b += 0.001; expect(() => pruefeAntwort('regression', e, dr)).toThrow(/stimmen nicht überein/);
  });
  it('Gruppenmittel vertauscht: Abbruch; Fehlerergebnisse werden nicht geprüft', () => {
    const sp2 = sitzung('apistrat', ['api00', 'awards']), dg = gruppenDaten('api00', 'awards', wVon('apistrat', 'pw'), sp2.zeilen, sp2.spalten), e = lies('P19');
    expect(() => pruefeAntwort('gruppen', e, dg)).not.toThrow();
    [e.gruppen[0], e.gruppen[1]] = [e.gruppen[1], e.gruppen[0]]; expect(() => pruefeAntwort('gruppen', e, dg)).toThrow();
    expect(() => pruefeAntwort('gruppen', lies('P22'), dg)).not.toThrow();
  });
  it('Rechnen: ein Aufruf, Antwort geprüft; über 200 000 Zeilen kein Aufruf, sondern der Fehlersatz', async () => {
    const sp2 = sitzung('apistrat', ['api00', 'awards']); let aufrufe = 0;
    const rufe = async () => { aufrufe++; return lies('P19'); };
    const db = await gruppenRechnen(rufe, 'api00', 'awards', wVon('apistrat', 'pw'), sp2.zeilen, sp2.spalten);
    expect(aufrufe).toBe(1); expect(db.r.test.art).toBe('t'); expect(db.gruppenWerte).toEqual([1, 2]);
    const gross = Array.from({ length: 200001 }, () => [1, 1] as (number | null)[]); aufrufe = 0;
    const fehl = await gruppenRechnen(rufe, 'api00', 'awards', gross.map(() => 1), gross, sp2.spalten);
    expect(aufrufe).toBe(0); expect(fehl.r.fehlerCode).toBe('zu-viele-zeilen'); expect(fehl.r.n).toBe(200001);
    const reg = await regressionRechnen(async () => lies('P24'), 'api00', ['ell', 'meals'], null, () => null, wVon('apistrat', 'pw'), sitzung('apistrat', ['api00', 'ell', 'meals']).zeilen, sitzung('apistrat', ['api00', 'ell', 'meals']).spalten);
    expect(reg.art).toBe('regression'); expect(reg.koefTerme!.length).toBe(3);
  });
});

describe('Sätze und Tabellen am Blatt', () => {
  const gr = (id: string, extra: Partial<DesignB> = {}): DesignB => ({ art: 'gruppen', r: lies(id), ziel: 'api00', gruppenSpalte: 'awards', gruppenWerte: [1, 2], ...extra });
  const reg = (id: string, logistik = false): DesignB => ({ art: 'regression', r: lies(id), ziel: logistik ? 'hoch700' : 'api00', koefTerme: [null, { spalte: 'ell' }, { spalte: 'meals' }], ...(logistik ? { ereignis: { wert: 1, referenz: 0 } } : {}) });
  it('zwei Gruppen: Sätze mit den Namen der Gruppen in der Reihenfolge, Differenz erste minus zweite, APA-Zeile', () => {
    const t = saetzeDesignB(gr('P19'), gU, name, wert), e = lies('P19');
    expect(t.haupt).toContain('„Nein“ und „Ja“'); expect(t.haupt).toContain('Differenz = −44,69'); expect(t.haupt).toContain('t(198) = −2,27'); expect(t.apa).toContain(`p ${pWert(e.test.p)}`); expect(t.apa).toContain('t(198)');
    expect(t.zusatz).toContain('M = 633,73'); expect(t.vorsicht).toContain('einzeln gezogen'); expect(t.marken[0]!.text).toBe('n = 200');
  });
  it('drei Gruppen: nur der Wald-Test, kein Paarvergleich in Tabelle und Sätzen', () => {
    const db = gr('P21', { gruppenWerte: [1, 2, 3] }), t = saetzeDesignB(db, gU, name, wert), tab = tabellenDesignB(db, abdruck, name, wert);
    expect(t.haupt).toContain('F(2; 197) = 3,48'); expect(t.apa).toContain('F(2; 197)'); expect(tab.length).toBe(2);
    const text = JSON.stringify(tab) + t.haupt + t.zusatz; expect(text).not.toMatch(/Tukey|Games|Holm|Bonferroni|Welch|Student|Levene|Varianzanalyse/);
  });
  it('Tabellen der Gruppen: Mittelwert mit SE und Intervall je Gruppe, Test mit Differenz; p ohne Null', () => {
    const tab = tabellenDesignB(gr('P19'), abdruck, name, wert);
    expect(tab.map(x => x.label)).toEqual(['Survey Group Means', 'Survey Group Test']);
    const zellen = (i: number) => tab[i]!.cells.map(c => c.t);
    expect(zellen(0)).toContain('Nein'); expect(zellen(0)).toContain('633.73'); expect(zellen(0)).toContain('15.63'); expect(zellen(1)).toContain('-44.69'); expect(zellen(1)).toContain('.024');
    expect(tab[1]!.footnotes.map(c => c.t).join(' ')).toMatch(/ersten minus/);
  });
  it('Regression: Sätze je Koeffizient mit Anzeigenamen, R² beschreibend, Gesamttest', () => {
    const t = saetzeDesignB(reg('P24'), gU, name, wert);
    expect(t.haupt).toContain('F(2; 197) = 192,14'); expect(t.haupt).toContain('R² = ,66'); expect(t.haupt).toMatch(/beschreibend/); expect(t.zusatz).toContain('Gratismahlzeiten'); expect(t.zusatz).toContain('Sprachförderung'); expect(t.zusatz).toContain('b = −3,11');
    expect(t.apa).toContain('R² = ,66'); expect(t.zusatz).not.toContain('Konstante');
  });
  it('Regression: Tabelle mit Konstante, b, SE, t, p, KI; Modelltabelle mit R² (linear) bzw. Ereignissen (logistisch)', () => {
    const lin = tabellenDesignB(reg('P24'), abdruck, name, wert), log = tabellenDesignB(reg('P27', true), abdruck, name, wert);
    expect(lin.map(x => x.label)).toEqual(['Survey Regression Coefficients', 'Survey Regression Model']);
    expect(lin[0]!.cells.map(c => c.t)).toEqual(expect.arrayContaining(['Konstante', 'Gratismahlzeiten', '-3.111', '0.284', '.659'.slice(0, 0) || '-10.96'])); expect(lin[1]!.cells.map(c => c.t)).toContain('.66');
    expect(log[0]!.cols).toBe(11); expect(log[0]!.cells.map(c => c.t)).toContain('OR'); expect(log[1]!.cells.map(c => c.t)).toContain('73');
    expect(JSON.stringify(log) + JSON.stringify(lin)).not.toMatch(/ROC|AUC|Beta|β|VIF|Durbin/);
  });
  it('logistisch: Ereignis im Satz, 73 Ereignisse, designbasierte Standardfehler, keine ROC-Wörter', () => {
    const t = saetzeDesignB(reg('P27', true), gU, name, wert), alles = [t.haupt, t.zusatz, t.vorsicht, t.apa].join(' ');
    expect(alles).toContain('73'); expect(t.zusatz).toContain('Ereignis: API-Wert ab 700 = '); expect(alles).toMatch(/designbasiert/); expect(alles).not.toMatch(/ROC|AUC|Pseudo|Hosmer/);
    expect(rocEntfaelltSatz()).toMatch(/ROC/);
  });
  it('Fehler: Satz statt Zahlen, keine Tabellen; Rangmangel nennt den Anzeigenamen, Gruppe-leer den Namen der Gruppe', () => {
    const r = reg('P26'); r.r.spalte = 'p02'; r.koefTerme = [null, { spalte: 'ell' }, { spalte: 'meals' }];
    const t = saetzeDesignB(r, gU, name, wert); expect(t.haupt).toContain('Gratismahlzeiten'); expect(t.haupt).toMatch(/nicht schätzbar/); expect(tabellenDesignB(r, abdruck, name, wert)).toEqual([]);
    const g = saetzeDesignB(gr('P22b'), gU, name, wert); expect(g.haupt).toContain('„Ja“'); expect(g.haupt).not.toMatch(/Gruppe 2/);
    const tr = saetzeDesignB(reg('P28', true), gU, name, wert); expect(tr.haupt).toMatch(/konvergiert/); expect(tr.haupt).not.toMatch(/\d{3,}/);
  });
  it('Namen der Koeffizienten: Gruppen-Spalte mit Stufe gegen Vergleichsstufe', () => {
    expect(koefName({ spalte: 'stype', stufe: '3', referenz: '1' }, name, (_s, w) => ({ '1': 'E', '3': 'M' } as Record<string, string>)[String(w)] ?? String(w))).toBe('Schultyp: M (gegen E)');
    expect(koefName(null, name, wert)).toBe('Konstante'); expect(koefName({ spalte: 'ell' }, name, wert)).toBe('Sprachförderung');
  });
  it('englisch: Punkt, CI, kein Deutsch', () => {
    const alt = s.einst.sprache; s.einst.sprache = 'en';
    try { const t = saetzeDesignB(reg('P24'), gU, name, wert); expect(t.haupt).toContain('R² = .66'); expect(t.haupt).toMatch(/descriptive/); expect(t.zusatz).toMatch(/95% CI/); expect(t.zusatz + t.vorsicht).not.toMatch(/Konfidenz|Stichprobe|Befragte|signifikant/); }
    finally { s.einst.sprache = alt; }
  });
  it('umfrageSatz und saetzeDesignB geben für einen Koeffizienten denselben Hauptsatz (ohne R²-Anhang)', () => {
    const e = lies('P24'), ein = umfrageSatz('regression', e, { gewicht: gU, name: 'Gratismahlzeiten', index: 2, ziel: 'API-Wert' }).haupt;
    expect(saetzeDesignB(reg('P24'), gU, name, wert).zusatz).toContain(ein.replace(/ Das Modell erklärte.*$/, ''));
    expect(komma(e.koef[2].b)).toBe('−3,11');
  });
});

describe('Bericht: Blätter, deren Standardfehler survey (R) gerechnet hat', () => {
  it('brauchen R: der Bericht lädt R nicht von selbst, nur auf ausdrücklichen Wunsch', () => {
    const g = { rechenweg: 'survey' };
    expect(brauchtRBlatt('gruppen')).toBe(false); expect(brauchtRBlatt('gruppen', undefined, g)).toBe(true); expect(brauchtRBlatt('vorhersage', { modell: { art: 'linear' } }, g)).toBe(true);
    expect(brauchtRBlatt('gruppen', undefined, { rechenweg: 'beschreibend' })).toBe(false);
    expect(darfNeuRechnen('gruppen', false, false, undefined, g)).toBe(false); expect(darfNeuRechnen('gruppen', true, false, undefined, g)).toBe(true); expect(darfNeuRechnen('gruppen', false, true, undefined, g)).toBe(true);
    expect(darfNeuRechnen('gruppen', false, false)).toBe(true);
  });
});
