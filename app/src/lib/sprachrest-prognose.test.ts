import { IN_ARBEIT } from '../i18n/laufzeit';
import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { s } from './sitzung.svelte';
import { ladeSprache } from '../i18n/laufzeit';
import { artikelListe } from '../hilfe/artikel';
import ERW from './testdaten/prognose-erwartet.json';
import {
  prognoseLesen, prognoseLeitplanken, prognoseCodeSatz, prognoseHauptsatz, prognoseApa, prognoseLjungSatz, prognosePruefSatz, prognoseModellText, parameterName, parameterNameGlaettung, glaettungName,
  prognoseRCode, type PrognoseE, type PrognoseCode, type LeitEin
} from './prognose';
import { prognoseTabellen } from './prognoseblatt';
import { zeitreiheFussSatz } from './zeitreihesaetze';

/* Leitfaden Falle 12 und 20 für die Prognose: Ein fertiger Sprachtext, der in ein anderes `L(…)` eingesetzt wird, bleibt in jeder Sprache deutsch oder englisch.
 * Die Prüfsprache „xx“ setzt jeden übersetzten Text in [Klammern] mit Akzentbuchstaben (i18n/katalog.mjs, `pseudo`); was außerhalb übrig bleibt, ist fest eingesetzter deutscher oder englischer Text.
 *
 * Der zweite Block (ÜBERSETZUNGEN) prüft, ob die 13 Sprachdateien die neuen Sätze enthalten. Er ist der EINZIGE Test dieser Datei, der aus einem anderen Grund rot sein darf:
 * solange die Übersetzungen fehlen (sie kommen von einem anderen Auftrag), meldet er sie. Alle anderen Tests der Prognose sind unabhängig davon grün. */
const vorher = s.einst.sprache;
afterEach(() => { s.einst.sprache = vorher; });
/** Wörter mit unverändertem Buchstaben (wie in sprachrest-f2.test.ts): Die Prüfsprache ersetzt a e i o u A E O U c n y durch Akzentbuchstaben; ein Wort mit einem dieser Buchstaben ohne Akzent ist fest eingesetzter Text. */
const rest = (t: string): string[] => (t.match(/[A-Za-zÀ-ÖØ-öø-ÿ]{2,}/g) ?? []).filter(w => /[aeiouAEOUcny]/.test(w) && !['ARIMA', 'ar', 'ma', 'sar', 'sma'].includes(w));   // ARIMA und die Koeffizientensymbole (ar1, ma1, sar1, sma1 wie in R) sind Eigennamen, keine Übersetzung
const pruefe = (name: string, t: string) => { expect(t, name).toMatch(/^\[/); expect(rest(t), `${name}: Rest außerhalb der Klammern in „${t}“`).toEqual([]); };

const J = ERW as unknown as Record<string, { b: number[]; se: number[]; bn: string[]; mittel: number[]; u80: number[]; o80: number[]; u95: number[]; o95: number[]; aicc: number }>;
const AIR = J.air_log!;
const roh = (extra: Record<string, unknown> = {}): Record<string, unknown> => ({
  art: ['arima'], p: [0], d: [1], q: [1], P: [0], D: [1], Q: [1], periode: [12], konst: [false], drift: [false], log: [true],
  namen: AIR.bn, b: AIR.b, se: AIR.se, sigma2: [0.001], aic: [-491.4], aicc: [AIR.aicc], bic: [-483.2], nobs: [131], tauglich: [true],
  mittel: AIR.mittel, u80: AIR.u80, o80: AIR.o80, u95: AIR.u95, o95: AIR.o95, rmse: [10.5], mae: [8.1], mape: [3.2],
  ljung: { q: 26.45, h: 24, p: 0.233, fitdf: 2 }, acf_res: [0.1], pruef: { rmse: 18.59, mae: 13.26, rmse_naiv: 50.71, mae_naiv: 47.83 }, pr: [12],
  wahl: { d: [1], D: [1], kpss: [0.537], staerke: [0.951], geprueft: [30], lp: [0, 2], lq: [1, 1], lP: [0, 0], lQ: [1, 1], lk: [false, false], la: [-483.21, -481.79] }, ...extra
});
const antwort = (extra: Record<string, unknown> = {}) => { const l = prognoseLesen(roh(extra)); if (!l.ok) throw new Error('Lesen'); return l.antwort; };
const pe = (art: 'auto' | 'arima' | 'glaettung', extra: Record<string, unknown> = {}): PrognoseE => ({ wahl: { art, h: 12, log: true, p: 0, d: 1, q: 1, P: 0, D: 1, Q: 1, konst: false, glaettung: 'mult' }, pr: 12, antwort: antwort(extra) });

describe('Prüfsprache xx: kein deutscher oder englischer Rest in den Sätzen der Prognose', () => {
  it('Leitplanken: alle zwölf Zeilen der Tabelle', async () => {
    await ladeSprache('xx'); s.einst.sprache = 'xx';
    const ein = (p: PrognoseE, o: Partial<LeitEin> = {}): LeitEin => ({ wahl: p.wahl, antwort: p.antwort, T: 30, periode: 12, alleWerteUeber0: true, ...o });
    const alle = [
      ein(pe('auto', { ljung: { q: 99, h: 24, p: 0.001, fitdf: 2 }, pruef: { rmse: 60, mae: 50, rmse_naiv: 50, mae_naiv: 40 }, wahl: { d: [1], D: [1], kpss: [0.5], staerke: [0.9], geprueft: [9], lp: [0, 1], lq: [1, 1], lP: [0, 0], lQ: [1, 1], lk: [false, false], la: [-483.21, -482.5] }, u95: [-1, 2, 3] })),
      ein(pe('auto', { pruef: [], pr: [0] }), { periode: 52, T: 300 }),
      ein(pe('arima', { tauglich: [false] })),
      ein(pe('glaettung', { art: ['glaettung'], glaettung: ['mult'], log: [false] }))
    ];
    const codes = new Set<string>();
    for (const e of alle) for (const l of prognoseLeitplanken(e)) { codes.add(l.code); pruefe(`leitplanke ${l.code}`, l.satz); }
    expect([...codes].sort()).toEqual(['aehnlich', 'auto', 'holt-winters', 'immer', 'keine-saison', 'kein-pruefzeitraum', 'kurz', 'ljung', 'log', 'nicht-tauglich', 'pruef-nicht-besser', 'untergrenze'].sort());
  });
  it('Sperren, Wahl und Fehler (jeder Code)', async () => {
    await ladeSprache('xx'); s.einst.sprache = 'xx';
    const codes: PrognoseCode[] = ['zu-viele-luecken', 'luecken-nur-selbst', 'ungleich', 'zu-kurz', 'alle-gleich', 'auto-zu-lang', 'saison-nicht-moeglich', 'mult-nicht-positiv', 'log-nicht-positiv', 'wahl-ungueltig', 'horizont', 'zu-kurz-saison', 'kein-modell', 'nicht-konvergiert', 'r-fehler'];
    for (const c of codes) pruefe(`code ${c}`, prognoseCodeSatz(c));
    pruefe('fuss', zeitreiheFussSatz());
  });
  it('Hauptsatz (Automatik und von Hand), Ljung-Box, Prüfzeitraum, APA, Modellnamen und Parameter', async () => {
    await ladeSprache('xx'); s.einst.sprache = 'xx';
    const zeiten = ['t1', 't2', 't3', 't4', 't5', 't6', 't7', 't8', 't9', 't0', 't1', 't2'];
    for (const art of ['auto', 'arima'] as const) pruefe(`hauptsatz ${art}`, prognoseHauptsatz(pe(art), { name: 'w', zeiten, stellen: 0, automatik: art === 'auto' }));
    pruefe('hauptsatz 1 Zeitpunkt', prognoseHauptsatz({ ...pe('arima'), antwort: antwort({ mittel: [450], u80: [429], o80: [472], u95: [418], o95: [484] }) }, { name: 'w', zeiten: ['t1'], stellen: 0, automatik: false }));
    pruefe('ljung schlecht', prognoseLjungSatz({ q: 40, h: 24, p: 0.01, fitdf: 2 })); pruefe('ljung gut', prognoseLjungSatz({ q: 20, h: 24, p: 0.5, fitdf: 2 }));
    pruefe('pruef', prognosePruefSatz({ rmse: 1, mae: 1, rmseNaiv: 2, maeNaiv: 2, pr: 12 }));
    // der Modellname steht vorn (ARIMA(…) ist kein übersetzter Text); was dahinter kommt, läuft durch L
    for (const [n, t] of [['Drift', prognoseModellText(antwort({ log: [false], drift: [true], konst: [true], D: [0], Q: [0] }))], ['Mittelwert', prognoseModellText(antwort({ log: [false], drift: [false], konst: [true], d: [0], D: [0], Q: [0] }))]] as const) { expect(t, n).toMatch(/^ARIMA\(\d,\d,\d\)\[/); expect(rest(t), n).toEqual([]); }
    for (const g of ['einfach', 'holt', 'add', 'mult'] as const) pruefe(`glättung ${g}`, glaettungName(g));
    for (const n of ['intercept', 'drift', 'ar1', 'ma2', 'sar1', 'sma1']) pruefe(`parameter ${n}`, parameterName(n));
    for (const n of ['alpha', 'beta', 'gamma'] as const) pruefe(`glättungsparameter ${n}`, parameterNameGlaettung(n));
    // die APA-Zeile ist zum Teil festes Fachzeichen (AICc, RMSE, Ljung-Box); ihre Wörter „Prüfzeitraum“, „gegen“, „einfache Regel“ laufen durch L
    const apa = prognoseApa(pe('auto')); expect(apa).toContain('[');
    expect(apa).not.toMatch(/Prüfzeitraum|einfache Regel|test period|simple rule/);
  });
  it('Tabellen: Titel, Fußnoten und die Kopfzeilen, die durch L laufen', async () => {
    await ladeSprache('xx'); s.einst.sprache = 'xx';
    const zeiten = Array.from({ length: 12 }, (_, i) => `t${i}`);
    for (const art of ['auto', 'glaettung'] as const) {
      const p = pe(art, art === 'glaettung' ? { art: ['glaettung'], glaettung: ['mult'], log: [false], alpha: [0.27], beta: [0.03], gamma: [0.87], wahl: { type: 'null' } } : {});
      for (const t of prognoseTabellen(p, { name: 'w', zeiten, stellen: 0 })) {
        pruefe(`${art} ${t.label}: Titel`, t.title!.t);
        t.footnotes.forEach((f, i) => pruefe(`${art} ${t.label}: Fußnote ${i}`, f.t));
        t.cells.filter(c => c.r === 0 && c.t.length > 3 && !/^(AICc|ΔAICc|RMSE|MAE)$/.test(c.t)).forEach(c => pruefe(`${art} ${t.label}: Kopf ${c.t}`, c.t));
      }
    }
  });
  it('R-Text zum Ansehen: nur Kommentare laufen durch L, der Code bleibt R', async () => {
    await ladeSprache('xx'); s.einst.sprache = 'xx';
    const c = prognoseRCode(pe('arima'), 'passagiere', 144);
    expect(c).toContain('# [');
    expect(c).toContain('arima(log(y)'); expect(c).toContain('exp(p$pred)');
  });
});

describe('ÜBERSETZUNGEN der neuen Sätze (rot, solange sie in den 13 Sprachdateien fehlen; der einzige Test hier, der deshalb rot sein darf)', () => {
  const katalog = JSON.parse(readFileSync(new URL('../i18n/katalog.json', import.meta.url), 'utf8')) as Record<string, { de: string | string[]; orte: string[] }>;
  const NEUE_DATEIEN = ['lib/prognose.ts', 'lib/prognoseblatt.ts', 'bausteine/BlattPrognose.svelte', 'bausteine/Prognosediagramm.svelte'];
  /** Geänderte Sätze in bestehenden Dateien (bekommen einen neuen Schlüssel; die alte Übersetzung wurde aus den Sprachdateien entfernt). */
  const GEAENDERT = ['Eine Prognose rechnet Statable nur auf Klick', 'Die Prognose (ARIMA, Glättung) rechnet R (stats)', 'Prognose (ARIMA, Automatik, Glättung) rechnet Statable nur auf Klick', 'Differenzen als eigene Spalten (dafür gibt es', 'Die Reihe ist neu aufgebaut. Die Prognose gehört zur alten Reihe', 'Eine Prognose rechnet Statable nur auf Klick, im Abschnitt'];
  const artikel = artikelListe('de').find(a => a.id === 'zeitreihe-prognose')!;
  const texteDesArtikels = new Set<string>();
  const sammle = (b: unknown) => { if (typeof b === 'string') texteDesArtikels.add(b); else if (b && typeof b === 'object') Object.values(b).forEach(sammle); };
  sammle(artikel.titel); sammle(artikel.inhalt); sammle(artikel.stichwoerter.join(' '));
  const nachDe = (k: { de: string | string[] }) => [k.de].flat().at(-1)!;
  const noetig = Object.entries(katalog).filter(([, v]) => v.orte.some(o => NEUE_DATEIEN.includes(o)) || (v.orte.includes('hilfe/artikel.ts') && texteDesArtikels.has(nachDe(v))) || GEAENDERT.some(g => nachDe(v).includes(g))).map(([k]) => k);
  const ordner = new URL('../i18n/sprachen/', import.meta.url);
  const sprachen = readdirSync(ordner).filter(f => /^[a-z]{2}\.json$/.test(f) && !/^x[xr]/.test(f)).map(f => f.slice(0, 2)).filter(c => !(IN_ARBEIT as string[]).includes(c)); // Sprachen in Arbeit (Bauplan 7 Sprachen) zählen erst ab der Freigabe

  it('der Katalog kennt die neuen Sätze (Prüfung der Prüfung)', () => {
    expect(artikel, 'Hilfe-Artikel zeitreihe-prognose').toBeDefined();
    expect(noetig.length).toBeGreaterThan(100); expect(sprachen.length).toBe(13);
  });
  it('jede der 13 Sprachen hat jeden neuen Satz', () => {
    const fehlt: string[] = [];
    for (const sp of sprachen) {
      const tab: Record<string, unknown> = { ...JSON.parse(readFileSync(new URL(`${sp}.json`, ordner), 'utf8')), ...(existsSync(new URL(`${sp}.hilfe.json`, ordner)) ? JSON.parse(readFileSync(new URL(`${sp}.hilfe.json`, ordner), 'utf8')) : {}) };
      const weg = noetig.filter(k => !(k in tab));
      if (weg.length) fehlt.push(`${sp}: ${weg.length} von ${noetig.length}`);
    }
    expect(fehlt, `Übersetzungen fehlen (Rückfall Englisch): ${fehlt.join('; ')}`).toEqual([]);
  });
});
