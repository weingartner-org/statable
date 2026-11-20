import { beforeAll, describe, expect, it } from 'vitest';
import erwartet from './testdaten/spaeter-c-erwartet.json';
import { nodeEngine } from './testengine';
import { neuAufbauen } from './eingabe';
import { leseVerzeichnis, type Spalte } from './verzeichnis';
import { parseCsv } from '../dialogs/csv';
import { leseEngineGewicht } from './gewichte';
import { normRechnen } from './normwerte';
import type { Daten } from './umformen';
import { AssistentFehler } from './datenassistent';
import { rangWerte, rangBefehl, type RangOpt } from './rangbildung';

/* ===== Später, Welle S-C, Bauer B (Vorab: reine Funktionen): Rangbildung (RANK) genau wie SPSS - IBM rank.pdf, PSPP rank.c, R =====
 * Fachblatt 4.4 und Entscheidung Opus 5: Rang (A/D, Bindungen), Rangprozent, Normalrang (Formel wählbar), Gruppen (k), Savage; Rang IMMER ohne Fallgewicht (WEIGHT OFF davor, danach wiederherstellen); zwei Prozentränge mit zwei Namen.
 * Sollwerte: testdaten/spaeter-c-erwartet.json (daten.rang) aus scripts/spaeter-c-erwartet.R: erste Quelle die IBM-Definition (SPSS Algorithms 14.0, rank.pdf) 1:1 in R, zweite Quelle 256 Läufe der echten PSPP-Engine
 * (4 Bindungsarten × 2 Richtungen × 4 Formeln × 8 Fälle, je Rang/Anteil/Prozent/N/NTILES(4)/Savage/Proportion/Normal) auf 1e-9 gleich. Der Bauer ändert Test, Skript und JSON nicht.
 * Hinweis IBM gegen PSPP: IBM setzt PROPORTION auf SYSMIS, wenn der Wert negativ ist, PSPP wenn er nicht größer als 0 ist - verschieden nur bei exakt 0, das bei Rankit/Blom/Tukey für R ≥ 1 nie vorkommt: kein Handlungsbedarf.
 *
 * ---------------------------------- Schnittstelle (festgelegt vom Prüfer; Modul lib/rangbildung.ts, rein, ohne Oberfläche) ----------------------------------
 *  RangOpt = { art: 'rang' | 'rangprozent' | 'anteil' | 'normal' | 'gruppen' | 'savage';
 *              bindungen?: 'mean' | 'low' | 'high' | 'condense';     // Voreinstellung 'mean' (SPSS)
 *              richtung?: 'auf' | 'ab';                              // Voreinstellung 'auf': der kleinste Wert hat Rang 1 (SPSS); 'ab': der größte
 *              formel?: 'blom' | 'tukey' | 'rankit' | 'vw';          // nur für 'normal' (Normalrang = Φ⁻¹(PROPORTION)), Voreinstellung 'blom'; vw = Van der Waerden
 *              k?: number;                                           // nur für 'gruppen' (NTILES), Voreinstellung 4
 *              fehlend?: 'ausschliessen' | 'einschliessen' }         // Voreinstellung 'ausschliessen': benutzerdefiniert fehlende Werte → leer; 'einschliessen': sie werden wie gültige gerangt
 *  rangWerte(werte: (number | null)[], o: RangOpt, gruppen?: (string | number | null)[], fehlendCodes?: number[]): (number | null)[]
 *      Entsprechung: rang = RANK, rangprozent = PERCENT (R/W · 100, Rang 100 für den höchsten), anteil = RFRACTION (R/W), normal = NORMAL (Formel), gruppen = NTILES(k) = floor(R·k/(W+1)) + 1, savage = SAVAGE.
 *      W = Zahl der gültigen Fälle der Rangbildung (je BY-Gruppe, ohne Fallgewicht: jeder Fall zählt 1). Fehlende (null, NaN, Codes aus fehlendCodes) → null, es sei denn fehlend: 'einschliessen' (nur für die Codes; null bleibt null).
 *      Fälle ohne gültige Gruppe → null. Wirft nie; nie NaN im Ergebnis.
 *  rangBefehl(d: Daten, o: RangOpt & { spalte: string; ziel: string; gruppe?: string; gewicht?: { spalte: string; art: 'haeufigkeit' | 'umfrage' } | null; ueberschreiben?: boolean }): { syntax: string; ziel: string; bezeichnung: string; format: string }
 *      syntax: PSPP-RANK mit INTO, /TIES, /FRACTION, /MISSING, BY-Gruppe; bei gewicht: `WEIGHT OFF.` VOR dem RANK und `WEIGHT BY <spalte>.` danach (gewichtBefehl aus lib/gewichte.ts), ohne gewicht kein WEIGHT-Befehl.
 *      bezeichnung: „Rang von x, aufsteigend, Bindungen: Mittel“ (Rang, auf, mean); für die anderen Arten Rangprozent (SPSS) / Anteil / Normalrang (Blom) / Gruppe (NTILES 4) / Savage-Wert mit dem Namen der Spalte, der Richtung und - wo es wirkt - den Bindungen.
 *      format: F8.0 für gruppen und für rang mit low/high/condense, sonst F8.3. Fehler als AssistentFehler: Text-Spalte → code 'spalte'; Zielname vergeben ohne ueberschreiben → 'ueberschreiben'; ungültiger Name → 'name'; Gruppenspalte unbekannt → 'spalte'.
 */
const R = (erwartet as any).daten.rang, ABW = (erwartet as any).abweichungen;
const FALL = ['fachblatt', 'fachblatt_include', 'gruppen', 'bindungsfrei', 'alle_gleich', 'n1', 'systemfehlend', 'dezimal_negativ'] as const;
const TIES = ['mean', 'low', 'high', 'condense'] as const, DIR = ['auf', 'ab'] as const;
const DIRSPSS: Record<string, string> = { auf: 'A', ab: 'D' };
const ART_JSON: Record<string, string> = { rang: 'rang', rangprozent: 'prozent', anteil: 'anteil', gruppen: 'ntiles', savage: 'savage' };
const xv = (x: any[]) => x.map(a => (a === null ? null : (a as number)));
const nah = (ist: number | null | undefined, soll: number | null, w: string) => {
  if (soll === null) { expect(ist, w).toBeNull(); return; }
  expect(typeof ist, `${w}: ${ist}`).toBe('number'); expect(Number.isNaN(ist as number), `${w}: NaN`).toBe(false);
  expect(Math.abs((ist as number) - soll), `${w}: ${ist} gegen ${soll}`).toBeLessThanOrEqual(1e-9 * Math.max(1, Math.abs(soll)));
};
const nahListe = (ist: (number | null)[], soll: (number | null)[], w: string) => { expect(ist.length, `${w}: Länge`).toBe(soll.length); soll.forEach((s, i) => nah(ist[i], s, `${w} [${i}]`)); };
const eingabe = (f: any) => ({ x: xv(f.x), g: f.g ?? undefined, codes: f.usermiss === null || f.usermiss === undefined ? [] : [f.usermiss as number], include: !!f.include });

describe('rangWerte: alle Arten × Bindungen × Richtung × Formel gegen die IBM-Rechnung (= R = PSPP) in acht Fällen', () => {
  for (const nm of FALL) {
    const f = R[nm], e = eingabe(f);
    for (const ti of TIES) for (const di of DIR) it(`${nm}: Bindungen ${ti}, ${di === 'auf' ? 'aufsteigend' : 'absteigend'}: Rang, Rangprozent, Anteil, Gruppen(4), Savage; Normalrang in allen vier Formeln`, () => {
      const v = f.varianten[`${ti}|${DIRSPSS[di]}`], o = { bindungen: ti, richtung: di, fehlend: e.include ? 'einschliessen' : 'ausschliessen' } as Partial<RangOpt>;
      for (const art of ['rang', 'rangprozent', 'anteil', 'gruppen', 'savage'] as const) nahListe(rangWerte(e.x, { ...o, art } as RangOpt, e.g, e.codes), v[ART_JSON[art]!], `${nm} ${ti} ${di} ${art}`);
      for (const fo of ['blom', 'tukey', 'rankit', 'vw'] as const) nahListe(rangWerte(e.x, { ...o, art: 'normal', formel: fo } as RangOpt, e.g, e.codes), f.varianten[`${ti}|${DIRSPSS[di]}|${fo}`].normal, `${nm} ${ti} ${di} normal ${fo}`);
    });
  }
  it('Voreinstellungen: Bindungen Mittel, aufsteigend, Blom, 4 Gruppen (SPSS)', () => {
    const f = R.fachblatt, e = eingabe(f), v = f.varianten['mean|A'];
    nahListe(rangWerte(e.x, { art: 'rang' }, undefined, e.codes), v.rang, 'rang'); nahListe(rangWerte(e.x, { art: 'gruppen' }, undefined, e.codes), v.ntiles, 'ntiles'); nahListe(rangWerte(e.x, { art: 'normal' }, undefined, e.codes), f.varianten['mean|A|blom'].normal, 'normal');
  });
  it('NTILES mit anderem k: k = 10 (Rang MEAN aufsteigend) und k = 5 (HIGH absteigend) wie in R und PSPP', () => {
    const f = R.fachblatt, e = eingabe(f);
    nahListe(rangWerte(e.x, { art: 'gruppen', k: 10 }, undefined, e.codes), f.ntiles10, 'k = 10'); nahListe(rangWerte(e.x, { art: 'gruppen', k: 5, bindungen: 'high', richtung: 'ab' }, undefined, e.codes), f.ntiles5_high_D, 'k = 5 high ab');
  });
});

describe('Fachblatt-Zahlen (4.4, gemessen in der Engine, hier nur zur Lesbarkeit festgehalten)', () => {
  const x = xv(R.fachblatt.x), cod = [-9], g = (o: Partial<RangOpt> & { art: RangOpt['art'] }) => rangWerte(x, o as RangOpt, undefined, cod);
  it('x = 10, 20, 20, 30, 30, 30, 5, [-9 fehlend], 40, 20: Rang MEAN 2, 4, 4, 7, 7, 7, 1, leer, 9, 4; LOW …3, 6 …; HIGH …5, 8 …; CONDENSE …3, 4 …', () => {
    expect(g({ art: 'rang' })).toEqual([2, 4, 4, 7, 7, 7, 1, null, 9, 4]); expect(g({ art: 'rang', bindungen: 'low' })).toEqual([2, 3, 3, 6, 6, 6, 1, null, 9, 3]);
    expect(g({ art: 'rang', bindungen: 'high' })).toEqual([2, 5, 5, 8, 8, 8, 1, null, 9, 5]); expect(g({ art: 'rang', bindungen: 'condense' })).toEqual([2, 3, 3, 4, 4, 4, 1, null, 5, 3]);
  });
  it('Blom-Normalrang -0,9320 / -0,2744 / 0,5716 / -1,4942 / 1,4942; Tukey -0,9208; Rankit -0,9674; Van der Waerden -0,8416; Rangprozent 22,22 / 44,44 / 77,78 / 11,11 / 100; Gruppen(4) 1, 2, 3, 1, 4; Savage -0,7639 / -0,4433 / 0,3845 / -0,8889 / 1,8290', () => {
    const r = (a: number | null) => (a === null ? null : Math.round(a * 1e4) / 1e4);
    expect(g({ art: 'normal' }).map(r)).toEqual([-0.932, -0.2744, -0.2744, 0.5716, 0.5716, 0.5716, -1.4942, null, 1.4942, -0.2744]);
    expect(r(g({ art: 'normal', formel: 'tukey' })[0]!)).toBe(-0.9208); expect(r(g({ art: 'normal', formel: 'rankit' })[0]!)).toBe(-0.9674); expect(r(g({ art: 'normal', formel: 'vw' })[0]!)).toBe(-0.8416);
    expect(g({ art: 'rangprozent' }).map(a => (a === null ? null : Math.round(a * 100) / 100))).toEqual([22.22, 44.44, 44.44, 77.78, 77.78, 77.78, 11.11, null, 100, 44.44]);
    expect(g({ art: 'gruppen' })).toEqual([1, 2, 2, 3, 3, 3, 1, null, 4, 2]); expect(g({ art: 'savage' }).map(r)).toEqual([-0.7639, -0.4433, -0.4433, 0.3845, 0.3845, 0.3845, -0.8889, null, 1.829, -0.4433]);
  });
  it('NTILES-Gruppen sind bei Bindungen nicht gleich groß (gleiche Werte, gleiche Gruppe): hier 3 von 9 Fällen in Gruppe 2 und 3 in Gruppe 3, aber nur 2 in Gruppe 1', () => {
    const gr = g({ art: 'gruppen' }).filter((a): a is number => a !== null), n = (k: number) => gr.filter(a => a === k).length;
    expect([n(1), n(2), n(3), n(4)]).toEqual([2, 3, 3, 1]);
  });
});

describe('Ränder (Fachblatt 4.4): alle gleich, ein Fall, Lücken, negative und gebrochene Werte - nie NaN', () => {
  it('alle gleich (n = 10): Rang 5,5 bei MEAN; 1 bei LOW; 10 bei HIGH; 1 bei CONDENSE', () => {
    const x = Array(10).fill(5); expect(rangWerte(x, { art: 'rang' })).toEqual(Array(10).fill(5.5)); expect(rangWerte(x, { art: 'rang', bindungen: 'low' })).toEqual(Array(10).fill(1));
    expect(rangWerte(x, { art: 'rang', bindungen: 'high' })).toEqual(Array(10).fill(10)); expect(rangWerte(x, { art: 'rang', bindungen: 'condense' })).toEqual(Array(10).fill(1));
  });
  it('ein einziger Fall: Rang 1, Rangprozent 100, Savage 0 (R: Blom-Normalrang 0)', () => {
    expect(rangWerte([4], { art: 'rang' })).toEqual([1]); expect(rangWerte([4], { art: 'rangprozent' })).toEqual([100]); nah(rangWerte([4], { art: 'savage' })[0], R.n1.varianten['mean|A'].savage[0], 'Savage n = 1'); nah(rangWerte([4], { art: 'normal' })[0], R.n1.varianten['mean|A|blom'].normal[0], 'Normal n = 1');
  });
  it('fehlende Werte (null, NaN, Code) bleiben leer; sind alle fehlend: lauter null, kein Fehler; leere Eingabe: leere Ausgabe', () => {
    expect(rangWerte([3, null, NaN, 1], { art: 'rang' })).toEqual([2, null, null, 1]); expect(rangWerte([null, null], { art: 'savage' })).toEqual([null, null]); expect(rangWerte([], { art: 'rang' })).toEqual([]);
    expect(rangWerte([-9, 4, 2], { art: 'rang' }, undefined, [-9])).toEqual([null, 2, 1]); expect(rangWerte([-9, 4, 2], { art: 'rang', fehlend: 'einschliessen' }, undefined, [-9])).toEqual([1, 3, 2]);
  });
  it('Fälle ohne gültige Gruppe → leer; je Gruppe eigene Rangbildung', () => {
    expect(rangWerte([5, 1, 9, 3], { art: 'rang' }, ['a', 'a', 'b', null])).toEqual([2, 1, 1, null]);
  });
  it('kein Ergebnis ist NaN oder Infinity, in keinem der Fälle', () => {
    for (const nm of FALL) { const e = eingabe(R[nm]); for (const art of ['rang', 'rangprozent', 'anteil', 'normal', 'gruppen', 'savage'] as const) for (const v of rangWerte(e.x, { art }, e.g, e.codes)) expect(v === null || Number.isFinite(v), `${nm} ${art}`).toBe(true); }
  });
});

describe('Zwei Prozentränge (Befund 8): „Rangprozent (SPSS)“ = R/W · 100 gegen „Prozentrang (Mitte)“ der Normwert-Karte = 100 · (R − 0,5)/N', () => {
  it('x = 1, 2, 3, 4: Rangprozent 25 / 50 / 75 / 100 (nie 0, der höchste Wert immer 100), die Normwert-Karte 12,5 / 37,5 / 62,5 / 87,5 - beide richtig, aber nicht dasselbe', () => {
    expect(rangWerte([1, 2, 3, 4], { art: 'rangprozent' })).toEqual([25, 50, 75, 100]);
    expect(normRechnen([1, 2, 3, 4], { typ: 'stichprobe' }).map(z => z!.pr)).toEqual([12.5, 37.5, 62.5, 87.5]);
  });
  it('die Bezeichnung benennt es: „Rangprozent (SPSS)“ im Assistenten', () => {
    expect(rangBefehl(daten([1, 2, 3]), { spalte: 'x', ziel: 'rp', art: 'rangprozent' }).bezeichnung).toContain('Rangprozent (SPSS)');
  });
});

/* ------------------------------------------------------------------------------------------------ Befehl in der echten Engine */
const sp = (name: string, rest: Partial<Spalte> = {}): Spalte => ({ name, bezeichnung: '', art: 'zahl', niveau: 'metrisch', format: 'F8.0', fehlend: [], fehlendText: '', werteLabels: {}, ...rest });
function daten(x: (number | null)[], g?: (number | null)[], w?: number[], codes: number[] = []): Daten {
  const spalten = [sp('x', { fehlend: codes }), ...(g ? [sp('g', { niveau: 'nominal' })] : []), ...(w ? [sp('w')] : [])];
  return { spalten, zeilen: x.map((v, i) => [v, ...(g ? [g[i] ?? null] : []), ...(w ? [w[i]!] : [])]) } as Daten;
}
let m: Awaited<ReturnType<typeof nodeEngine>>;
beforeAll(async () => { m = await nodeEngine(); });
function lade(d: Daten) { const { syntax, csv } = neuAufbauen(d.spalten, d.zeilen); const out = m.run('NEW FILE.\n' + syntax, { '/eingabe.csv': csv }); expect(out.filter(i => i.type === 'message' && (i as any).severity === 'error')).toEqual([]); }
function spalte(name: string): (number | null)[] {
  const sps = leseVerzeichnis(m.run('DISPLAY DICTIONARY.')); m.run("SAVE TRANSLATE /OUTFILE='/t.csv' /TYPE=CSV /FIELDNAMES /REPLACE /CELLS=VALUES.");
  const z = parseCsv(new TextDecoder().decode(m.lies('/t.csv'))), j = z[0]!.map(s => s.toLowerCase()).indexOf(name.toLowerCase()); expect(j, `Spalte ${name}`).toBeGreaterThanOrEqual(0);
  void sps; return z.slice(1).map(r => (r[j]!.trim() === '' ? null : Number(r[j])));
}
const ok = (syntax: string) => { const out = m.run(syntax); expect(out.filter(i => i.type === 'message' && /error|warning/.test((i as any).severity ?? '')).map((i: any) => i.text), syntax).toEqual([]); };

describe('rangBefehl in der echten PSPP-Engine: dieselben Werte wie R (Fall fachblatt und gruppen)', () => {
  for (const nm of ['fachblatt', 'gruppen'] as const) {
    const f = R[nm], e = eingabe(f);
    it(`${nm}: alle Arten, Bindungen und Richtungen (48 Läufe) - Befehl läuft ohne Meldung, Werte gleich R`, () => {
      const d = daten(e.x, e.g, undefined, e.codes);
      for (const ti of TIES) for (const di of DIR) for (const art of ['rang', 'rangprozent', 'anteil', 'normal', 'gruppen', 'savage'] as const) {
        lade(d); const o = { art, bindungen: ti, richtung: di, ...(art === 'normal' ? { formel: 'tukey' as const } : {}) } as RangOpt;
        const b = rangBefehl(d, { ...o, spalte: 'x', ziel: 'neu', ...(e.g ? { gruppe: 'g' } : {}) }); ok(b.syntax);
        const soll = art === 'normal' ? f.varianten[`${ti}|${DIRSPSS[di]}|tukey`].normal : f.varianten[`${ti}|${DIRSPSS[di]}`][ART_JSON[art]!];
        nahListe(spalte('neu'), soll, `${nm} ${ti} ${di} ${art}`);
        expect(b.ziel).toBe('neu'); expect(b.format).toBe(art === 'gruppen' || (art === 'rang' && ti !== 'mean') ? 'F8.0' : 'F8.3'); expect(b.bezeichnung.length).toBeGreaterThan(5);
      }
    });
  }
  it('Bezeichnung der Voreinstellung: „Rang von x, aufsteigend, Bindungen: Mittel“', () => { expect(rangBefehl(daten([1, 2]), { art: 'rang', spalte: 'x', ziel: 'r' }).bezeichnung).toBe('Rang von x, aufsteigend, Bindungen: Mittel'); });
  it('die neue Spalte hat die Bezeichnung und das Format im Wörterbuch; die Quellspalte bleibt unverändert', () => {
    const d = daten([3, 1, 2]); lade(d); const b = rangBefehl(d, { art: 'rang', spalte: 'x', ziel: 'r' }); ok(b.syntax);
    const sps = leseVerzeichnis(m.run('DISPLAY DICTIONARY.')); expect(sps.find(s => s.name === 'r')!.bezeichnung).toBe(b.bezeichnung); expect(sps.find(s => s.name === 'r')!.format).toBe('F8.3'); expect(spalte('x')).toEqual([3, 1, 2]);
  });
});

describe('Fallgewicht (Befund 7, Pflicht): Ränge ohne Gewicht, Gewicht danach wiederhergestellt', () => {
  const G = R.gewicht, x = xv(G.x), w = G.w as number[];
  const d = daten(x, undefined, w, [-9]), gew = { spalte: 'w', art: 'haeufigkeit' as const };
  it('der Befehl setzt WEIGHT OFF vor dem RANK und WEIGHT BY w danach; ohne Gewicht gar kein WEIGHT-Befehl', () => {
    const b = rangBefehl(d, { art: 'rang', spalte: 'x', ziel: 'r', gewicht: gew }).syntax, i0 = b.indexOf('WEIGHT OFF.'), i1 = b.indexOf('RANK'), i2 = b.lastIndexOf('WEIGHT BY w.');
    expect(i0).toBeGreaterThanOrEqual(0); expect(i1).toBeGreaterThan(i0); expect(i2).toBeGreaterThan(i1);
    expect(rangBefehl(d, { art: 'rang', spalte: 'x', ziel: 'r' }).syntax).not.toMatch(/WEIGHT/); expect(rangBefehl(d, { art: 'rang', spalte: 'x', ziel: 'r', gewicht: null }).syntax).not.toMatch(/WEIGHT/);
  });
  it('mit aktivem Gewicht: die Ränge sind die der ungewichteten Fälle (R), die Fallzahl wird nicht überschritten, das Gewicht ist danach wieder aktiv', () => {
    lade(d); ok('WEIGHT BY w.'); expect(leseEngineGewicht(m.run('SHOW WEIGHT.'))).toBe('w');
    ok(rangBefehl(d, { art: 'rang', spalte: 'x', ziel: 'r', gewicht: gew }).syntax);
    nahListe(spalte('r'), G.ohne_gewicht_rang_mean, 'Rang MEAN ohne Gewicht'); expect(Math.max(...spalte('r').map(v => v ?? 0))).toBeLessThanOrEqual(9);
    expect(leseEngineGewicht(m.run('SHOW WEIGHT.'))).toBe('w');
    ok(rangBefehl(d, { art: 'rang', spalte: 'x', ziel: 'r2', gewicht: gew, bindungen: 'high', richtung: 'ab' }).syntax); nahListe(spalte('r2'), G.ohne_gewicht_rang_high_D, 'Rang HIGH absteigend ohne Gewicht');
  });
  it('die Falle, die der Test sichert: PSPP-RANK gewichtet von selbst - ohne WEIGHT OFF liefen die Ränge bis 13 bei 9 gültigen Fällen (Beleg in abweichungen.rang_gewicht)', () => {
    expect(Math.max(...(ABW.rang_gewicht.pspp_mit_gewicht as (number | null)[]).map(v => v ?? 0))).toBe(13); expect(Math.max(...(ABW.rang_gewicht.pspp_ohne_gewicht as (number | null)[]).map(v => v ?? 0))).toBe(9);
  });
});

describe('Fehler des Assistenten (AssistentFehler)', () => {
  const d = daten([1, 2, 3]), fehler = (f: () => unknown) => { try { f(); } catch (e) { return e instanceof AssistentFehler ? e.code : 'anderer Fehler'; } return 'kein Fehler'; };
  it('Zielname vergeben → „ueberschreiben“, ungültiger Name → „name“, Text-Spalte → „spalte“, unbekannte Gruppenspalte → „spalte“; mit ueberschreiben geht es', () => {
    expect(fehler(() => rangBefehl(d, { art: 'rang', spalte: 'x', ziel: 'x' }))).toBe('ueberschreiben'); expect(fehler(() => rangBefehl(d, { art: 'rang', spalte: 'x', ziel: '1 ungültig' }))).toBe('name');
    const t: Daten = { spalten: [sp('s', { art: 'text', format: 'A8' })], zeilen: [['a'], ['b']] } as Daten; expect(fehler(() => rangBefehl(t, { art: 'rang', spalte: 's', ziel: 'r' }))).toBe('spalte');
    expect(fehler(() => rangBefehl(d, { art: 'rang', spalte: 'x', ziel: 'r', gruppe: 'gibt_es_nicht' }))).toBe('spalte'); expect(fehler(() => rangBefehl(d, { art: 'rang', spalte: 'x', ziel: 'x', ueberschreiben: true }))).toBe('kein Fehler');
  });
});
