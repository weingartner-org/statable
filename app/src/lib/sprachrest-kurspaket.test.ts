import { IN_ARBEIT } from '../i18n/laufzeit';
import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { s } from './sitzung.svelte';
import { ladeSprache } from '../i18n/laufzeit';
import { VERFAHREN } from './verfahren';
import {
  diskrCodeSatz, diskrWarnungen, saetzeDiskr, tabellenDiskr, diskrRCode, diskrGerechnet, diskrFachwort, diskrWarum, diskrPunkte, diskrDaten, DISKR_SPERREN, type DiskrCode, type DiskrE
} from './diskriminanz';
import {
  logCodeSatz, logWarnungen, saetzeLog, tabellenLog, logRCode, logTerme, logGerechnet, logFachwort, logWarum, logModellName, LOG_SPERREN, type LogCode, type LogE, type LogModell
} from './loglinear';
import { manovaCodeSatz, manovaWarnungen, saetzeManova, tabellenManova, manovaRCode, manovaGerechnet, manovaFachwort, manovaWarum, MANOVA_SPERREN, type ManovaCode, type ManovaE } from './manova';
import { probitCodeSatz, probitWarnungen, saetzeProbit, tabellenProbit, probitRCode, probitGerechnet, probitFachwort, probitWarum, PROBIT_SPERREN, type ProbitCode, type ProbitE } from './probit';
import { wlsCodeSatz, wlsWarnungen, saetzeWls, tabellenWls, wlsRCode, wlsGerechnet, wlsFachwort, wlsWarum, wlsNichtFallgewicht, WLS_SPERREN, type WlsCode, type WlsE } from './wls';
import { sitz, reihe } from './kptesthilfe';
import type { TableItem } from '../engine/types';

/* Leitfaden Falle 12 und 20 für das Kurs-Paket (Fachblatt KURSPAKET): Ein fertiger Sprachtext, der in ein anderes `L(…)` eingesetzt wird, bleibt in jeder Sprache deutsch oder englisch.
 * Die Prüfsprache „xx“ setzt jeden übersetzten Text in [Klammern] mit Akzentbuchstaben (i18n/katalog.mjs, `pseudo`); was außerhalb übrig bleibt, ist fest eingesetzter deutscher oder englischer Text.
 * Voraussetzung: `node i18n/katalog.mjs` wurde nach dem letzten Ändern der Texte gelaufen (schreibt sprachen/xx.json). Muster: lib/sprachrest-zeitreihen-abrunden.test.ts.
 *
 * Der zweite Block (ÜBERSETZUNGEN) prüft, ob die 13 Sprachdateien die neuen Sätze enthalten. Er ist der EINZIGE Test dieser Datei, der aus einem anderen Grund rot sein darf:
 * solange die Übersetzungen fehlen (sie kommen von einem anderen Auftrag), meldet er sie. */
const vorher = s.einst.sprache;
afterEach(() => { s.einst.sprache = vorher; });
/** Wörter mit unverändertem Buchstaben: Die Prüfsprache ersetzt a e i o u A E O U c n y durch Akzentbuchstaben; ein Wort mit einem dieser Buchstaben ohne Akzent ist fest eingesetzter Text. */
const ERLAUBT = ['Wilks', 'Pillai', 'Hotelling', 'Lawley', 'Roy', 'MANOVA', 'AIC', 'SE', 'ΔG', 'Probit', 'Logit', 'Leave', 'one', 'out', 'df'];
const rest = (t: string): string[] => (t.match(/[A-Za-zÀ-ÖØ-öø-ÿ]{2,}/g) ?? []).filter(w => /[aeiouAEOUcny]/.test(w) && !ERLAUBT.includes(w));
const pruefe = (name: string, t: string) => { expect(t, name).toMatch(/^\[/); expect(rest(t), `${name}: Rest außerhalb der Klammern in „${t}“`).toEqual([]); };
/** Kopfzellen: entweder übersetzt (in Klammern) oder ein Fachzeichen ohne Rest. */
const kopfOk = (name: string, t: string) => { if (t.startsWith('[')) pruefe(name, t); else expect(rest(t), `${name}: ${t}`).toEqual([]); };
const tabellenOk = (was: string, ts: TableItem[]) => {
  for (const t of ts) {
    pruefe(`${was} ${t.label}: Titel`, t.title!.t);
    t.footnotes.forEach((f, i) => pruefe(`${was} ${t.label}: Fußnote ${i}`, f.t));
    t.cells.filter(c => c.r === 0).forEach(c => kopfOk(`${was} ${t.label}: Kopf ${c.t}`, c.t));
  }
};

const gruppen = [{ name: 'u', n: 15 }, { name: 'v', n: 15 }];
const ein = { tabelle: [[12, 3], [4, 11]], tabelleLoo: [[11, 4], [5, 10]], treffer: 0.77, trefferLoo: 0.7 };
const dk = (o: Partial<DiskrE> = {}): DiskrE => ({ gruppe: 'g', merkmale: ['a', 'b'], n: 30, ausgelassen: 2, k: 2, p: 2, gruppen, eigen: [1.2], anteil: [1], kanon: [0.74], wilks: [0.45], chi: [20], df: [2], pw: [0.0001], standard: [[0.6, 0.5]], zentroide: [[1], [-1]], einteilung: { gleich: ein, groesse: ein }, prior: 'gleich', ...o });
const mod = (art: LogModell['art'], terme: number[][], g2: number, df: number, p: number | null, o: Partial<LogModell> = {}): LogModell => ({ art, terme, g2, df, p, x2: g2, pX2: p, aic: 50, erwartetMin: 2, kleiner5: 0.1, konvergiert: true, ...o });
const lg = (o: Partial<LogE> = {}): LogE => ({ faktoren: ['a', 'b', 'c'], haeuf: 'n', stufen: [2, 2, 2], n: 100, ausgelassen: 1, zellen: 8, leer: 2, wahl: { art: 'zwei', eigen: [] },
  modelle: [mod('zwei', logTerme({ art: 'zwei', eigen: [] }, 3), 6.7, 1, 0.66, { kleiner5: 0.3, erwartetMin: 0.5 }), mod('unabh', logTerme({ art: 'unabh', eigen: [] }, 3), 160, 4, 1e-30)], ...o });
const t5 = (w: number, F: number, p: number) => ({ wert: w, F, df1: 4, df2: 50, p });
const mv = (o: Partial<ManovaE> = {}): ManovaE => ({ gruppe: 'g', ziele: ['a', 'b'], n: 30, ausgelassen: 2, q: 2, k: 2, gruppen, pillai: t5(0.8, 8, 0.0001), wilks: t5(0.2, 12, 0.0001), hotelling: t5(2.6, 17, 0.0001), roy: t5(2.5, 31, 0.0001),
  einzeln: [{ F: 9, df1: 2, df2: 27, p: 0.001 }, { F: 3, df1: 2, df2: 27, p: 0.06 }], rmax: 0.95, paar: ['a', 'b'], ...o });
const pb = (o: Partial<ProbitE> = {}): ProbitE => ({ ziel: 'y', praed: [{ name: 'x', art: 'zahl', stufen: [] }, { name: 'z', art: 'faktor', stufen: ['p', 'q'] }], ereignis: '1', vergleich: '0', n: 40, ausgelassen: 1, ereignisse: 18,
  koef: [{ pIdx: -1, stufe: '', b: -1, se: 0.5, z: -2, p: 0.04, kiU: -2, kiO: 0 }, { pIdx: 0, stufe: '', b: 0.4, se: 0.1, z: 4, p: 0.0001, kiU: 0.2, kiO: 0.6 }, { pIdx: 1, stufe: 'q', b: -0.1, se: 0.2, z: -0.5, p: 0.6, kiU: -0.5, kiO: 0.3 }],
  aic: 50, devianz: 44, nullDevianz: 54, dfRes: 37, dfNull: 39, modelltest: { chi2: 10, df: 2, p: 0.006 }, konvergiert: false, fastTrennbar: true, warnung: true, ...o });
const wl = (o: Partial<WlsE> = {}): WlsE => ({ ziel: 'y', praed: [{ name: 'x', art: 'zahl', stufen: [] }], gewicht: 'w', n: 18, ausgelassen: 1, nullen: 2,
  koef: [{ pIdx: -1, stufe: '', b: 1.2, se: 0.3, t: 4, p: 0.001, kiU: 0.6, kiO: 1.8 }, { pIdx: 0, stufe: '', b: 0.8, se: 0.3, t: 2.6, p: 0.02, kiU: 0.2, kiO: 1.4 }],
  r2: 0.61, r2Korr: 0.59, sigma: 2.2, df: 16, f: 25, fDf1: 1, fDf2: 16, fP: 0.0001, gewichtMin: 0.5, gewichtMax: 2.5, ...o });

describe('Prüfsprache xx: kein deutscher oder englischer Rest in den Sätzen des Kurs-Pakets', () => {
  it('Diskriminanzanalyse: Sperren, Prüfliste, Sätze, Warnungen, Tabellen und R-Text', async () => {
    await ladeSprache('xx'); s.einst.sprache = 'xx';
    for (const c of [...DISKR_SPERREN, 'faelle-je-merkmal'] as DiskrCode[]) { const t = diskrCodeSatz(c, { n: 5, p: 2, namen: ['x'], gruppe: 'g', gruppeN: 1 }); pruefe(`code ${c}`, t.text); if (t.klein) pruefe(`code ${c} klein`, t.klein); }
    const q = sitz({ g: Array.from({ length: 30 }, (_, i) => (i === 0 ? 'e' : i < 15 ? 'a' : 'b')), x1: reihe(30, 0, 1, 7), x2: reihe(30, 1, 2, 5) }, ['g']);
    for (const p of diskrPunkte(diskrDaten('g', ['x1', 'x2'], q.zeilen.map((z, i) => (i === 3 ? [z[0]!, null, z[2]!] : z)), q.spalten))) { pruefe(`punkt ${p.art}`, p.text); if (p.klein) pruefe(`punkt ${p.art} klein`, p.klein); }
    const st = saetzeDiskr(dk(), x => x);
    for (const [k, v] of Object.entries({ haupt: st.haupt, zusatz: st.zusatz })) pruefe(`satz ${k}`, v);
    kopfOk('satz apa', st.apa);
    for (const [i, w] of diskrWarnungen(dk({ n: 25 })).entries()) pruefe(`warnung ${i}`, w);
    pruefe('prior groesse', saetzeDiskr(dk({ prior: 'groesse' }), x => x).zusatz);
    pruefe('gerechnet', diskrGerechnet(dk())); pruefe('fachwort', diskrFachwort()); pruefe('warum', diskrWarum());
    tabellenOk('diskriminanz', tabellenDiskr(dk(), x => x));
    expect(diskrRCode('g', ['a', 'b'], 'groesse')).toContain('# ['); expect(diskrRCode('g', ['a', 'b'], 'gleich')).toContain('# [');
  });
  it('Loglineare Modelle: Sperren, Sätze (großes und kleines p, gesättigt), Warnungen, Tabellen und R-Text', async () => {
    await ladeSprache('xx'); s.einst.sprache = 'xx';
    for (const c of [...LOG_SPERREN, 'leere-zellen'] as LogCode[]) { const t = logCodeSatz(c, { zellen: 99999, leer: 2, n: 5 }); pruefe(`code ${c}`, t.text); if (t.klein) pruefe(`code ${c} klein`, t.klein); }
    const klein = lg({ modelle: [mod('unabh', logTerme({ art: 'unabh', eigen: [] }, 3), 160, 4, 1e-30)], wahl: { art: 'unabh', eigen: [] } });
    const voll = lg({ wahl: { art: 'voll', eigen: [] }, modelle: [mod('voll', logTerme({ art: 'voll', eigen: [] }, 3), 0, 0, null), lg().modelle[0]!] });
    const eigen = lg({ wahl: { art: 'eigen', eigen: [[0, 1]] }, modelle: [mod('eigen', logTerme({ art: 'eigen', eigen: [[0, 1]] }, 3), 19.8, 2, 0.18), lg().modelle[1]!] });
    for (const [n, e] of Object.entries({ gross: lg(), klein, voll, eigen })) {
      const st = saetzeLog(e, x => x);
      for (const [k, v] of Object.entries({ haupt: st.haupt, zusatz: st.zusatz })) pruefe(`satz ${n} ${k}`, v);
      kopfOk(`satz ${n} apa`, st.apa);
      for (const [i, w] of logWarnungen(e).entries()) pruefe(`warnung ${n} ${i}`, w);
      tabellenOk(`loglinear ${n}`, tabellenLog(e, x => x));
      pruefe(`gerechnet ${n}`, logGerechnet(e, x => x));
    }
    pruefe('modellname', logModellName(eigen.modelle[0]!, eigen.faktoren, x => x)); pruefe('fachwort', logFachwort()); pruefe('warum', logWarum());
    expect(logRCode(['a', 'b'], 'n', logTerme({ art: 'voll', eigen: [] }, 2))).toContain('# [');
  });
  it('MANOVA: Sperren, Sätze (mit und ohne Unterschied), Warnungen, Tabellen und R-Text', async () => {
    await ladeSprache('xx'); s.einst.sprache = 'xx';
    for (const c of [...MANOVA_SPERREN, 'hoch-korreliert'] as ManovaCode[]) { const t = manovaCodeSatz(c, { n: 3, q: 2, k: 2, namen: ['x'], paar: ['a', 'b'], rmax: 0.95 }); pruefe(`code ${c}`, t.text); if (t.klein) pruefe(`code ${c} klein`, t.klein); }
    for (const [n, e] of Object.entries({ sig: mv(), nicht: mv({ pillai: t5(0.1, 1, 0.4), rmax: 0.2 }) })) {
      const st = saetzeManova(e, x => x);
      for (const [k, v] of Object.entries({ haupt: st.haupt, zusatz: st.zusatz })) pruefe(`satz ${n} ${k}`, v);
      kopfOk(`satz ${n} apa`, st.apa);
      for (const [i, w] of manovaWarnungen(e, x => x).entries()) pruefe(`warnung ${n} ${i}`, w);
      tabellenOk(`manova ${n}`, tabellenManova(e, x => x));
    }
    pruefe('gerechnet', manovaGerechnet()); pruefe('fachwort', manovaFachwort()); pruefe('warum', manovaWarum());
    expect(manovaRCode('g', ['a', 'b'])).toContain('# [');
  });
  it('Probit: Sperren, Sätze, Warnungen (fast trennbar, Warnung von R, keine Konvergenz), Tabellen und R-Text', async () => {
    await ladeSprache('xx'); s.einst.sprache = 'xx';
    for (const c of [...PROBIT_SPERREN, 'wenige-ereignisse'] as ProbitCode[]) { const t = probitCodeSatz(c, { n: 3, k: 2, namen: ['x'], kleinste: 5 }); pruefe(`code ${c}`, t.text); if (t.klein) pruefe(`code ${c} klein`, t.klein); }
    for (const [n, e] of Object.entries({ voll: pb(), ruhig: pb({ fastTrennbar: false, warnung: false, konvergiert: true, modelltest: { chi2: 1, df: 2, p: 0.6 } }) })) {
      const st = saetzeProbit(e, x => x);
      for (const [k, v] of Object.entries({ haupt: st.haupt, zusatz: st.zusatz })) pruefe(`satz ${n} ${k}`, v);
      kopfOk(`satz ${n} apa`, st.apa);
      for (const [i, w] of probitWarnungen(e).entries()) pruefe(`warnung ${n} ${i}`, w);
      tabellenOk(`probit ${n}`, tabellenProbit(e, x => x));
    }
    pruefe('gerechnet', probitGerechnet()); pruefe('fachwort', probitFachwort()); pruefe('warum', probitWarum());
    expect(probitRCode('y', ['a', 'b'])).toContain('# [');
  });
  it('Gewichtete Regression: Sperren, Sätze, Warnungen, Tabellen, der Satz zum Fallgewicht und R-Text', async () => {
    await ladeSprache('xx'); s.einst.sprache = 'xx';
    for (const c of WLS_SPERREN) { const t = wlsCodeSatz(c, { n: 3, k: 2, zahl: 2, namen: ['x'] }); pruefe(`code ${c}`, t.text); if (t.klein) pruefe(`code ${c} klein`, t.klein); }
    for (const c of ['nullen'] as WlsCode[]) for (const z of [1, 2]) pruefe(`code ${c} ${z}`, wlsCodeSatz(c, { zahl: z }).text);
    for (const [n, e] of Object.entries({ sig: wl(), nicht: wl({ fP: 0.4 }) })) {
      const st = saetzeWls(e, x => x);
      for (const [k, v] of Object.entries({ haupt: st.haupt, zusatz: st.zusatz })) pruefe(`satz ${n} ${k}`, v);
      kopfOk(`satz ${n} apa`, st.apa);
      for (const [i, w] of wlsWarnungen(e, x => x).entries()) pruefe(`warnung ${n} ${i}`, w);
      tabellenOk(`wls ${n}`, tabellenWls(e, x => x));
    }
    pruefe('fallgewicht', wlsNichtFallgewicht()); pruefe('gerechnet', wlsGerechnet()); pruefe('fachwort', wlsFachwort()); pruefe('warum', wlsWarum());
    expect(wlsRCode('y', ['a'], 'w')).toContain('# [');
  });
  it('die drei Karten: Titel, Zusatz, Beispiel, Satz, Fragen, Fachwort und „Warum“', async () => {
    await ladeSprache('xx'); s.einst.sprache = 'xx';
    for (const id of ['diskriminanz', 'loglinear', 'manova']) {
      const v = VERFAHREN.find(x => x.id === id)!, w = { l1: ['a', 'b'], l2: ['c', 'd'], l3: [], l4: [] };
      pruefe(`${id}: Titel`, v.titel); pruefe(`${id}: Zusatz`, v.zusatz!); pruefe(`${id}: Beispiel`, v.beispiel); v.satz.forEach((t, i) => { if (t.replace(/[\s.]/g, '')) pruefe(`${id}: Satz ${i}`, t.trim()); });
      v.luecken.forEach(l => { pruefe(`${id}: Frage ${l.schluessel}`, l.frage); if (l.ohne) pruefe(`${id}: ohne ${l.schluessel}`, l.ohne); });
      pruefe(`${id}: Fachwort`, v.fachwort(w, {} as never)); pruefe(`${id}: Warum`, v.warum(w, {} as never)); expect(v.titelBlatt(w, n => ({ name: n, bezeichnung: n }) as never)).toContain('[');
    }
  });
});

describe('ÜBERSETZUNGEN der neuen Sätze (rot, solange sie in den 13 Sprachdateien fehlen; der einzige Test hier, der deshalb rot sein darf)', () => {
  const katalog = JSON.parse(readFileSync(new URL('../i18n/katalog.json', import.meta.url), 'utf8')) as Record<string, { de: string | string[]; orte: string[] }>;
  const NEUE_DATEIEN = ['lib/diskriminanz.ts', 'lib/loglinear.ts', 'lib/manova.ts', 'lib/probit.ts', 'lib/wls.ts', 'lib/kpdaten.ts', 'bausteine/BlattDiskriminanz.svelte', 'bausteine/BlattLoglinear.svelte', 'bausteine/BlattKurspaket.svelte'];
  /** Neue Sätze in bestehenden Dateien (Karten, Modellwahl, Bericht, Gewicht), erkannt an ihrem Anfang. */
  const IN_BESTEHENDEN = ['Lässt sich die Gruppe eines Falls aus Zahlen erkennen?', 'Wie hängen mehrere Kategorien zusammen?', 'Unterscheiden sich Gruppen in mehreren Zahlen zugleich?', 'Logit (Standard)', 'Probit (Normalverteilung)', 'Linear mit Präzisionsgewichten',
    'Die Probit-Regression', 'Die gewichtete Regression mit Präzisionsgewichten', 'Die Diskriminanzanalyse', 'Das loglineare Modell', 'Die MANOVA', 'Probit-Regression mit R', 'gewichtete Regression mit R', 'Diskriminanzanalyse mit R und MASS', 'loglineare Modelle mit R', 'MANOVA mit R',
    'Probit schätzt die Wahrscheinlichkeit', 'Die gewichtete Regression gibt genauen Werten', 'Das Ziel hat zwei Werte: Logit', 'Spalte mit den Präzisionsgewichten', 'Es fehlt die Spalte mit den Präzisionsgewichten', 'Hilfe: Probit-Regression', 'Hilfe: Gewichtete Regression',
    'Statable rechnet dieses Verfahren mit R (MASS::lda)', 'Statable rechnet dieses Verfahren mit R (glm, Poisson)', 'Statable rechnet dieses Verfahren mit R (manova)', 'Statable rechnet die Probit-Regression', 'Statable rechnet die gewichtete Regression'];
  const nachDe = (k: { de: string | string[] }) => [k.de].flat().at(-1)!;
  /** Field-Stufe 3b (05.11.2026): Sätze, die den Hinweis auf die automatische Suche „Rückwärts wie SPSS“ bekommen haben, sind nur in Deutsch und Englisch da (Johannes: neue Texte zuerst nur de/en); Übersetzung folgt. */
  const NUR_DE_EN_3B = ['Rückwärts wie SPSS'];
  const noetig = Object.entries(katalog).filter(([, v]) => v.orte.some(o => NEUE_DATEIEN.includes(o)) || IN_BESTEHENDEN.some(g => nachDe(v).includes(g))).filter(([, v]) => !NUR_DE_EN_3B.some(g => nachDe(v).includes(g))).map(([k]) => k);
  const ordner = new URL('../i18n/sprachen/', import.meta.url);
  const sprachen = readdirSync(ordner).filter(f => /^[a-z]{2}\.json$/.test(f) && !/^x[xr]/.test(f)).map(f => f.slice(0, 2)).filter(c => !(IN_ARBEIT as string[]).includes(c)); // Sprachen in Arbeit (Bauplan 7 Sprachen) zählen erst ab der Freigabe

  it('der Katalog kennt die neuen Sätze (Prüfung der Prüfung)', () => { expect(noetig.length).toBeGreaterThan(100); expect(sprachen.length).toBe(13); });
  it('jede der 13 Sprachen hat jeden neuen Satz', () => {
    const fehlt: string[] = [];
    for (const sp of sprachen) {
      const tab: Record<string, unknown> = { ...JSON.parse(readFileSync(new URL(`${sp}.json`, ordner), 'utf8')), ...(existsSync(new URL(`${sp}.hilfe.json`, ordner)) ? JSON.parse(readFileSync(new URL(`${sp}.hilfe.json`, ordner), 'utf8')) : {}) };
      const weg = noetig.filter(k => !(k in tab));
      if (weg.length) fehlt.push(`${sp}: ${weg.length} von ${noetig.length} fehlen`);
    }
    expect(fehlt, 'Übersetzungen fehlen noch (kommen aus einem anderen Auftrag)').toEqual([]);
  });
});
