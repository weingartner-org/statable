import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import erwartet from './testdaten/spaeter-c-erwartet.json';
import { nodeEngine } from './testengine';
import { leseCsv, leseTabellenkalkulation, planeSpalten, zurEngine, type Tabelle } from './einlesen';
import { leseVerzeichnis } from './verzeichnis';
import { parseCsv } from '../dialogs/csv';
import { liesSpssSyntax } from './spsssyntax';
import { kodebuchAusSyntax } from './kodebuch';
import { erkenneFragebogen, erkenneImSav, erkennungSaetze, mehrfachWerte, vorschlagSatz, bekannteSkala, textRecodeBefehl, umgepoltHinweis, type Erkennung } from './fragebogen';
import { s } from './sitzung.svelte';

/* ===== Später, Welle S-C, Bauer B: Fragebogen-Import (D4) - Hersteller erkennen, Kopfzeilen, Fehlendcodes, Metadaten, Test-/Vorschaufälle, Mehrfachsets, Text statt Zahlen =====
 * Fachblatt 2.4, 2.5, 2.7 und „Entscheidungen Opus (17.10.)“: Statable ändert beim Einlesen NICHTS still. Jede Erkennung ist ein VORSCHLAG (mit Kästchen und Vorschau); die Eingabe-Tabelle bleibt unverändert.
 * Ohne Kodebuch: in einer Zahlenspalte, deren übrige Werte im Bereich 0 bis 10 liegen, lösen -1, -9, -77, -99, -66 und 99 bzw. 999 einen HINWEIS aus („sieht aus wie ein Code für keine Antwort - als fehlend markieren?“).
 * Test-, Vorschau- und unvollständige Fälle werden als Vorschlag zum Herausfiltern angezeigt (Filter, nie löschen).
 * Sollwerte: testdaten/spaeter-c-erwartet.json (Abschnitt `fragebogen`) aus scripts/spaeter-c-erwartet.R (R und PSPP für die Mittelwerte). Die Dateien unter testdaten/fragebogen/ sind NACHGEBAUT nach der Herstellerdoku und
 * kein echter Export (LIESMICH.md dort); Unipark (Systemvariablen, Mehrfach-Kodierung) ist NICHT belegt, die Erwartung dazu ist ein Vorschlag des Prüfers (echte Datei von Johannes nötig).
 *
 * ---------------------------------- Schnittstelle (festgelegt vom Prüfer; Modul lib/fragebogen.ts) ----------------------------------
 *  erkenneFragebogen(t: Tabelle, kb?: Kodebuch): Erkennung            Eingabe = das Ergebnis von leseCsv/leseTabellenkalkulation (alle Zellen noch Text bzw. Zahl wie gelesen); ändert `t` nie; wirft nie
 *  erkenneImSav(d: Daten): Erkennung                                   Eingabe = Daten aus einer .sav (Spalten mit Fehlend-Codes und Wertelabels aus der Engine); `tabelle` bleibt leer
 *  Erkennung = {
 *    hersteller: Hersteller; kopfzeilen: number /* 1, bei Qualtrics 3 *\/; zeitzone?: string /* Qualtrics, aus Zeile 3 *\/;
 *    tabelle: Tabelle;                  // BEREINIGT: kopf = Spaltenköpfe der ersten Zeile, zeilen = nur Datenzeilen (Qualtrics: ab Zeile 4) - sonst wie t
 *    beschriftungen: Record<string, string>;   // Spaltenname → Beschriftung (Qualtrics Zeile 2; LimeSurvey der Teil nach dem ERSTEN „. “ der Überschrift)
 *    spalten: { kopf: string; name: string /* PSPP-Name wie psppName, bei LimeSurvey der Fragecode *\/; label?: string; rolle: 'frage' | 'metadaten'; zeit?: boolean; personenbezug?: boolean }[];
 *    vorschlaege: Vorschlag[];          // jeder mit eindeutigem `id` (Kästchen)
 *    meldungen: { art: 'leer' | 'nurKopf'; satz: string }[];
 *  }
 *  Vorschlag (alle mit id: string) =
 *     { art: 'fehlend'; spalte: string; codes: number[]; quelle: 'hersteller' | 'kodebuch' | 'hinweis'; wirkung: { mittelVorher: number | null; mittelNachher: number | null; n: number } }
 *       Hersteller-Codes: SoSci -1 bis -3, -8, -9; Unipark -77, -66, -99 und 0; Qualtrics -99. `codes` = die Codes dieser Herstellerliste, die in DIESER Spalte vorkommen (aufsteigend). Unipark: 0 nur, wenn die Spalte kein
 *       Wertelabel für 0 hat UND auch -77 enthält (strenger als das Fachblatt: sonst wäre jede 0-bis-10-Skala betroffen). Text-Spalten bekommen nie einen Zahlenvorschlag.
 *       wirkung: Mittelwert der Spalte vor und nach der Markierung und die Zahl der Werte danach (n) - für den Satz „Mittelwert ohne Markierung 0,67, mit Markierung 3,50“.
 *     | { art: 'metadaten' | 'personenbezug'; spalten: string[] }
 *     | { art: 'testfaelle' | 'unvollstaendige' | 'schnellantworter'; zeilen: number[] /* 0-basiert, Datenzeilen *\/; grund: string }      // nur wenn es solche Fälle gibt; schnellantworter ist ein Hinweis
 *     | { art: 'mehrfachset'; name: string; spalten: string[]; zaehlwert?: number | string; umkodierung: 'zaehlwert' | 'nichtleer' | 'ungleichNull'; quelle: 'kodebuch' | 'hersteller' | 'muster'; ausserhalb?: string[] }
 *     | { art: 'wertelabels'; spalte: string; labels: Record<string, string> }                 // nur mit Kodebuch
 *     | { art: 'textAntworten'; spalten: string[]; stufen: string[] | null; vorbelegt: boolean }   // ≥ 2 Spalten mit derselben Menge von ≤ 12 Texten (Likert-Block); stufen = bekannte Skala in der richtigen Reihenfolge
 *  mehrfachWerte(e: Erkennung, setName: string): (number | null)[][]      je Datenzeile die Werte 1/0 (null = fehlt) der Set-Spalten nach `umkodierung`:
 *        zaehlwert: Spalte == zaehlwert → 1, sonst (leer ausgenommen) 0, leer → null (SoSci: 1 = nicht gewählt, 2 = gewählt; leer = nicht gefragt/übersprungen)
 *        nichtleer: nicht leer → 1, leer → 0 (LimeSurvey `Y`/leer, Qualtrics Umkodierungswert/leer, nie fehlend)
 *        ungleichNull: ≠ 0 → 1, 0 → 0, leer → null (Qualtrics mit „Recode seen but unanswered“: 0 = gesehen, nicht gewählt; leer = nicht gesehen)
 *  erkennungSaetze(e: Erkennung): string[]       ganze Sätze (de/du): 1. „Das sieht nach einer Datei von <Hersteller> aus.“ (SoSci Survey, LimeSurvey, Qualtrics, Unipark), dann die Zahl der Antworten und der Test-/Vorschau- und unvollständigen Fälle
 *  vorschlagSatz(v: Vorschlag): string           ein ganzer Satz je Vorschlag; bei `fehlend` mit quelle 'hinweis' enthält er „als fehlend markieren“ und beide Mittelwerte mit zwei Nachkommastellen und Komma
 *  bekannteSkala(werte: string[]): string[] | null      die Stufen einer bekannten deutschen oder englischen Likert-Skala in der richtigen Reihenfolge, wenn alle Werte (ohne Groß/klein, Randleerraum) dazugehören, sonst null
 *  textRecodeBefehl(spalte: string, ziel: string, stufen: string[]): string     PSPP: `RECODE spalte ('Stufe 1'=1) ('Stufe 2'=2) … INTO ziel.` + VALUE LABELS ziel + EXECUTE. - die Originalspalte bleibt
 *  umgepoltHinweis(werteLabels: Record<string, string>): boolean       true, wenn die Beschriftungen einer bekannten Skala GEGEN die Zahlenreihenfolge laufen (1 = „stimme voll zu“ … 5 = „stimme gar nicht zu“)
 */
s.einst.sprache = 'de'; s.einst.anrede = 'du';
const FB = (erwartet as any).fragebogen;
const lies = (n: string) => readFileSync(new URL(`./testdaten/fragebogen/${n}`, import.meta.url), 'utf8');
const csv = (n: string): Tabelle => leseCsv(lies(n), n);
const nah = (a: number | null | undefined, b: number, w = '') => { expect(typeof a, w).toBe('number'); expect(Math.abs((a as number) - b), `${w}: ${a} gegen ${b}`).toBeLessThanOrEqual(1e-9 * Math.max(1, Math.abs(b))); };
const sortiert = (c: number[]) => [...c].sort((a, b) => a - b);
const fehlendKarte = (e: Erkennung) => Object.fromEntries(e.vorschlaege.filter((v: any) => v.art === 'fehlend').map((v: any) => [v.spalte, sortiert(v.codes)]));
const vorschlag = (e: Erkennung, art: string) => e.vorschlaege.filter((v: any) => v.art === art) as any[];
const sets = (e: Erkennung) => vorschlag(e, 'mehrfachset');

/** Gemeinsame Prüfung einer Datei gegen den erwarteten Abschnitt. */
function pruefe(e: Erkennung, x: any) {
  expect(e.hersteller, 'Hersteller').toBe(x.hersteller);
  expect(e.kopfzeilen, 'Kopfzeilen').toBe(x.kopfzeilen);
  expect(e.tabelle.zeilen.length, 'Datenzeilen').toBe(x.datenzeilen);
  expect(new Set(e.vorschlaege.map((v: any) => v.id)).size, 'eindeutige ids').toBe(e.vorschlaege.length);
  if (x.metadaten) expect(e.spalten.filter(sp => sp.rolle === 'metadaten').map(sp => sp.kopf), 'Metadaten-Spalten').toEqual(x.metadaten);
  if (x.fehlend) expect(fehlendKarte(e), 'Fehlendcode-Vorschläge').toEqual(Object.fromEntries(Object.entries(x.fehlend).map(([k, v]) => [k, sortiert(v as number[])])));
  for (const [art, schluessel] of [['testfaelle', 'testfaelle'], ['unvollstaendige', 'unvollstaendige']] as const) {
    const soll = x[schluessel]; if (!soll) continue;
    const v = vorschlag(e, art);
    if (soll.zeilen.length === 0) expect(v, `${art}: keine Vorschläge`).toEqual([]);
    else { expect(v.length, art).toBe(1); expect(v[0].zeilen, `${art}: Zeilen`).toEqual(soll.zeilen); expect(v[0].grund, `${art}: Grund`).toBeTruthy(); }
  }
  if (x.personenbezug) expect(vorschlag(e, 'personenbezug').flatMap(v => v.spalten).sort(), 'Personenbezug').toEqual([...x.personenbezug].sort());
  if (x.mehrfachsets) {
    expect(sets(e).map(v => ({ name: v.name, spalten: v.spalten })), 'Mehrfachsets').toEqual(x.mehrfachsets.map((m: any) => ({ name: m.name, spalten: m.spalten })));
    for (const m of x.mehrfachsets) { const v = sets(e).find(q => q.name === m.name); if (m.zaehlwert !== undefined) expect(v.zaehlwert, `Zählwert ${m.name}`).toBe(m.zaehlwert); if (m.ausserhalb) for (const a of m.ausserhalb) expect(v.spalten).not.toContain(a); }
  }
  if (x.mehrfach_matrix && x.mehrfachsets?.length) expect(mehrfachWerte(e, x.mehrfachsets[0].name), 'Mehrfach-Werte je Datenzeile').toEqual(x.mehrfach_matrix);
  const satz = erkennungSaetze(e).join(' '); expect(satz).not.toMatch(/NaN|undefined|\$\{/);
  for (const v of e.vorschlaege) { const t = vorschlagSatz(v); expect(t.length).toBeGreaterThan(10); expect(t).not.toMatch(/NaN|undefined|\$\{/); }
}

describe('SoSci Survey (CSV, nachgebaut): -9/-1 fehlend, Metadaten, Test- und unvollständiger Fall, Mehrfachauswahl 1/2', () => {
  const x = FB.sosci, t = csv(x.datei);
  it('ohne Kodebuch: Hersteller aus den Systemvariablen CASE;SERIAL;REF;QUESTNNR;MODE;STARTED; Hersteller-Codes -9 und -1 in A001 (Pflichtfall 1)', () => {
    const e = erkenneFragebogen(t); pruefe(e, { ...x, mehrfachsets: undefined, mehrfach_matrix: undefined });
    const f = vorschlag(e, 'fehlend'); expect(f.length).toBe(1); expect(f[0].quelle).toBe('hersteller');
    nah(f[0].wirkung.mittelVorher, x.mittel.roh, 'Mittel roh'); nah(f[0].wirkung.mittelNachher, x.mittel.mit_markierung, 'Mittel markiert'); expect(f[0].wirkung.n).toBe(x.mittel.n_mit);
    const t2 = vorschlagSatz(f[0]); expect(t2).toContain('0,67'); expect(t2).toContain('3,50');
  });
  it('ohne Kodebuch: Mehrfachauswahl A002_01 bis _03 als Set mit Zählwert 2 aus der Hersteller-Regel (SoSci: 1 = nicht gewählt, 2 = gewählt)', () => {
    const v = sets(erkenneFragebogen(t)); expect(v.length).toBe(1); expect(v[0]).toMatchObject({ name: 'A002', spalten: ['A002_01', 'A002_02', 'A002_03'], zaehlwert: 2, umkodierung: 'zaehlwert', quelle: x.mehrfachsets[0].quelle_ohne_kodebuch });
  });
  it('mit Kodebuch aus der .sps (Pflichtfall 2): Zählwert 2 mit Quelle „kodebuch“, dazu Wertelabels-Vorschläge; Werte je Zeile 1/0, die nicht erreichte Zeile (abgebrochen) ist null', () => {
    const kb = kodebuchAusSyntax(liesSpssSyntax(lies('sosci-nachgebaut.sps')), 'sosci'), e = erkenneFragebogen(t, kb);
    pruefe(e, x);
    expect(vorschlag(e, 'wertelabels').find(v => v.spalte === 'A001').labels).toEqual((erwartet as any).fragebogen.sosci_sps.wertelabels.A001);
    expect(fehlendKarte(e).A001).toEqual([-9, -1]); expect(vorschlag(e, 'fehlend')[0].quelle).toBe('kodebuch');
  });
  it('Pflichtfall 6: der Testfall (MODE = pretest) und der unvollständige Fall (FINISHED = 0) werden GENANNT und als Filter vorgeschlagen, nie gelöscht; die Tabelle behält alle 6 Zeilen', () => {
    const e = erkenneFragebogen(t); expect(e.tabelle.zeilen.length).toBe(6);
    expect(vorschlag(e, 'testfaelle')[0].zeilen).toEqual([2]); expect(vorschlag(e, 'unvollstaendige')[0].zeilen).toEqual([3]);
    const sz = erkennungSaetze(e).join(' '); expect(sz).toContain('SoSci Survey'); expect(sz).toMatch(/6 Antworten/); expect(sz).toMatch(/1[^.]*Test/); expect(sz).toMatch(/1[^.]*unvollständig/);
  });
  it('Schnellantworter (TIME_RSI ≥ 2, Leiner 2019) ist nur ein HINWEIS: Zeile 4 wird genannt, nichts wird ausgeschlossen', () => {
    const v = vorschlag(erkenneFragebogen(t), 'schnellantworter'); expect(v.length).toBe(1); expect(v[0].zeilen).toEqual(x.schnellantworter.zeilen);
  });
  it('Pflichtfall 13: Umlaute und Semikolon in Anführungszeichen im Text bleiben ganz; ebenso doppelte Anführungszeichen', () => {
    const e = erkenneFragebogen(t), j = e.spalten.findIndex(sp => sp.name === x.text_mit_umlauten.spalte);
    expect(e.tabelle.zeilen[x.text_mit_umlauten.zeile]![j]).toBe(x.text_mit_umlauten.wert); expect(e.tabelle.zeilen[x.text_mit_anfuehrung.zeile]![j]).toBe(x.text_mit_anfuehrung.wert);
  });
  it('die Eingabe-Tabelle wird nie verändert (Nichts passiert still)', () => { const kopie = JSON.parse(JSON.stringify(t)); erkenneFragebogen(t); expect(t).toEqual(kopie); });
});

describe('LimeSurvey (CSV, nachgebaut): Überschrift „Fragecode. Fragetext“, Y/leer, submitdate leer', () => {
  it('Pflichtfall 9: am ERSTEN „. “ geteilt - auch bei Punkt im Fragetext („… beschreiben. Z. B. Material.“); Teilfragen G01Q02[SQ001] → G01Q02_SQ001', () => {
    const x = FB.limesurvey_code, e = erkenneFragebogen(csv(x.datei)); pruefe(e, { ...x, mehrfachsets: undefined, mehrfach_matrix: undefined });
    for (const u of x.ueberschriften) { const sp = e.spalten.find(c => c.kopf === u.kopf)!; expect(sp, u.kopf).toBeTruthy(); expect(sp.name).toBe(u.name); expect(e.beschriftungen[u.name]).toBe(u.label); }
    expect(e.hersteller).toBe('limesurvey'); expect(erkennungSaetze(e).join(' ')).toContain('LimeSurvey');
  });
  it('Pflichtfall 8: leer = NICHT GEWÄHLT (nicht fehlend); Zählwert Y; auch die Person ohne jede Nennung (und der unvollständige Fall) hat 0, 0, 0', () => {
    const x = FB.limesurvey_code, e = erkenneFragebogen(csv(x.datei)); pruefe(e, x);
    const v = sets(e)[0]; expect(v).toMatchObject({ name: 'G01Q02', zaehlwert: 'Y', umkodierung: 'nichtleer' });
    expect(mehrfachWerte(e, 'G01Q02').flat().includes(null as any)).toBe(false);
  });
  it('„volle Antworten“ (Text statt Codes): Mehrfachsets mit Zählwert „Ja“, Likert-Block G02Q05 als Textantworten mit der bekannten Skala; Q1 steht allein und ist KEIN Block', () => {
    const x = FB.limesurvey_text, e = erkenneFragebogen(csv(x.datei)); pruefe(e, x);
    const t = vorschlag(e, 'textAntworten'); expect(t.length).toBe(1); expect(t[0]).toMatchObject({ spalten: x.textantworten[0].spalten, stufen: x.textantworten[0].stufen_vorbelegt, vorbelegt: true });
    expect(t.flatMap(v => v.spalten)).not.toContain(x.einzel_text[0]);
  });
});

describe('Qualtrics (CSV, nachgebaut): drei Kopfzeilen, Status/Finished, numerische Mehrfachspalten mit je eigenem Umkodierungswert', () => {
  const x = FB.qualtrics_numerisch;
  it('Pflichtfall 4: drei Kopfzeilen erkannt, Daten ab Zeile 4 (6 Datenzeilen), Zeitzone aus der ImportId-Zeile, Beschriftung aus Zeile 2, Name aus Zeile 1', () => {
    const e = erkenneFragebogen(csv(x.datei)); pruefe(e, x);
    expect(e.zeitzone).toBe(x.zeitzone); expect(e.tabelle.kopf).toEqual(x.zeile1); expect(e.beschriftungen.Q1).toBe(x.zeile2_beispiel.Q1);
    for (const [kopf, name] of Object.entries(x.namen) as [string, string][]) expect(e.spalten.find(c => c.kopf === kopf)!.name).toBe(name);
    expect(e.tabelle.zeilen[0]![x.zeile1.indexOf('ResponseId')]).toMatch(/^R_/);   // die erste Datenzeile ist wirklich eine Antwort, nicht die ImportId-Zeile
  });
  it('Pflichtfall 5: Mehrfach-Spalten Q2_1 bis Q2_3 mit den Umkodierungswerten 1, 2, 3 → Set Q2, nichtleer = 1, leer = 0; Q2_3_TEXT gehört nicht ins Set', () => {
    const e = erkenneFragebogen(csv(x.datei)), v = sets(e)[0];
    expect(v).toMatchObject({ name: 'Q2', spalten: ['Q2_1', 'Q2_2', 'Q2_3'], umkodierung: 'nichtleer' }); expect(v.spalten).not.toContain('Q2_3_TEXT');
    expect(mehrfachWerte(e, 'Q2')).toEqual(x.mehrfach_matrix);
  });
  it('Pflichtfall 6: Status 1 (Vorschau, DistributionChannel preview) und Finished 0 (Progress 40) werden genannt, nicht gelöscht', () => {
    const e = erkenneFragebogen(csv(x.datei)); expect(e.tabelle.zeilen.length).toBe(6);
    expect(vorschlag(e, 'testfaelle')[0].zeilen).toEqual([3]); expect(vorschlag(e, 'unvollstaendige')[0].zeilen).toEqual([4]);
    const sz = erkennungSaetze(e).join(' '); expect(sz).toContain('Qualtrics'); expect(sz).toMatch(/Test|Vorschau/); expect(sz).toMatch(/unvollständig/);
  });
  it('Pflichtfall 11: IP-Adresse, E-Mail und Standort sind personenbezogen → Hinweis (kein stilles Entfernen); die Spalten bleiben in der Tabelle', () => {
    const e = erkenneFragebogen(csv(x.datei)); expect(vorschlag(e, 'personenbezug').length).toBe(1);
    expect(e.tabelle.kopf).toEqual(expect.arrayContaining(x.personenbezug)); expect(vorschlagSatz(vorschlag(e, 'personenbezug')[0])).toMatch(/erkennbar|Person/);
    expect(e.spalten.filter(c => c.personenbezug).map(c => c.name).sort()).toEqual([...x.personenbezug].sort());
  });
  it('ohne Option „-99“ gibt es keinen Fehlend-Vorschlag (leer = unbeantwortet); der Mittelwert von Q1 ist 3,6 (5 Werte)', () => { const e = erkenneFragebogen(csv(x.datei)); expect(vorschlag(e, 'fehlend')).toEqual([]); nah(x.mittel_q1.roh, 3.6); });
  it('Zeile 1 bis 3 wirklich drei: eine Datei mit nur EINER Kopfzeile, die Qualtrics-Spalten hat, wird nicht als drei gelesen', () => {
    const l = lies(x.datei).split('\n'); const e = erkenneFragebogen(leseCsv([l[0], l[3], l[4]].join('\n'), 'eine-kopfzeile.csv'));
    expect(e.kopfzeilen).toBe(1); expect(e.tabelle.zeilen.length).toBe(2);
  });
});

describe('Qualtrics: „Recode seen but unanswered as -99“ und Text statt Zahlen', () => {
  it('-99: Vorschlag „fehlend“ für Q1 und Q4_2 (Herstellercode), NIE für Mehrfach- oder Textspalten (dort bedeutet 0 „nicht gewählt“); Mittel Q1 roh -13,5 gegen 3,6', () => {
    const x = FB.qualtrics_minus99, e = erkenneFragebogen(csv(x.datei)); pruefe(e, x);
    const f = vorschlag(e, 'fehlend').find(v => v.spalte === 'Q1'); expect(f.quelle).toBe('hersteller'); nah(f.wirkung.mittelVorher, x.mittel_q1.roh, 'roh'); nah(f.wirkung.mittelNachher, x.mittel_q1.mit_markierung, 'markiert');
    for (const n of x.fehlend_nicht_vorgeschlagen) expect(fehlendKarte(e)[n], n).toBeUndefined();
  });
  it('-99: Mehrfachspalten mit 0 = nicht gewählt, ≠ 0 = 1, leer (nicht gesehen: abgebrochene Person) = fehlt', () => {
    const x = FB.qualtrics_minus99, e = erkenneFragebogen(csv(x.datei)), v = sets(e)[0];
    expect(v).toMatchObject({ name: 'Q2', umkodierung: 'ungleichNull' }); expect(mehrfachWerte(e, 'Q2')).toEqual(x.mehrfach_matrix);
  });
  it('Pflichtfall 7: Text statt Zahlen: der Likert-Block Q4_1 bis Q4_3 wird als „Antwort als Text“ erkannt, Stufen aus der bekannten Skala vorbelegt; die einzelne Spalte Q1 nicht', () => {
    const x = FB.qualtrics_text, e = erkenneFragebogen(csv(x.datei)); pruefe(e, x);
    const t = vorschlag(e, 'textAntworten'); expect(t.length).toBe(1); expect(t[0]).toMatchObject({ spalten: x.textantworten[0].spalten, stufen: x.textantworten[0].stufen_vorbelegt, vorbelegt: true });
    expect(t.flatMap(v => v.spalten)).not.toContain('Q1'); expect(vorschlagSatz(t[0])).toMatch(/Wörter|Zahlen/);
    expect(e.tabelle.zeilen.map(z => z[2])).toEqual(x.status_texte);   // Status steht als Text („Survey Preview“)
  });
  it('Text-in-Zahlen: textRecodeBefehl legt eine NEUE Zahlenspalte an, das Original bleibt; die Zahlen gleich den erwarteten (1 bis 5)', async () => {
    const x = FB.qualtrics_text, e = erkenneFragebogen(csv(x.datei)), m = await nodeEngine();
    const z = zurEngine(e.tabelle); m.run('NEW FILE.\n' + z.syntax, { '/import.csv': z.csv });
    const stufen = x.textantworten[0].stufen_vorbelegt as string[];
    const b = textRecodeBefehl('Q4_1', 'Q4_1_zahl', stufen); expect(b).toContain('INTO Q4_1_zahl'); expect(b).toContain('VALUE LABELS Q4_1_zahl');
    const out = m.run(b + '\nSAVE TRANSLATE /OUTFILE=\'/t.csv\' /TYPE=CSV /FIELDNAMES /REPLACE /CELLS=VALUES.'); expect(out.filter(i => i.type === 'message' && (i as any).severity === 'error')).toEqual([]);
    const zeilen = parseCsv(new TextDecoder().decode(m.lies('/t.csv'))), kopf = zeilen[0]!, i1 = kopf.indexOf('Q4_1'), i2 = kopf.indexOf('Q4_1_zahl');
    expect(i1).toBeGreaterThanOrEqual(0); expect(i2).toBeGreaterThan(i1);
    const soll = x.zahlen_q4.map((r: any) => (r[0] === null ? null : r[0]));
    zeilen.slice(1).forEach((r, k) => { expect(r[i1]!.trim(), `Original Zeile ${k}`).toBe(soll[k] === null ? '' : stufen[soll[k] - 1]); expect(r[i2]!.trim() === '' ? null : Number(r[i2]), `Zahl Zeile ${k}`).toBe(soll[k]); });
  });
});

describe('Skalen als Text, umgepolte Skalen (Fachblatt 2.5 Nr. 2 und 3)', () => {
  it('bekannteSkala: deutsch und englisch, ohne Groß/klein und Randleerraum; Teilmenge reicht; Fremdes → null', () => {
    const de = ['Stimme gar nicht zu', 'Stimme eher nicht zu', 'Teils/teils', 'Stimme eher zu', 'Stimme voll zu'];
    expect(bekannteSkala(['stimme VOLL zu ', 'Stimme gar nicht zu'])).toEqual(de);
    expect(bekannteSkala(['Never', 'always', 'Sometimes'])!.map(w => w.toLowerCase())).toEqual(expect.arrayContaining(['never', 'sometimes', 'always']));
    expect(bekannteSkala(['rot', 'grün', 'blau'])).toBeNull(); expect(bekannteSkala([])).toBeNull();
  });
  it('Pflichtfall 12: Umgekehrte Skala (1 = stimme voll zu … 5 = stimme gar nicht zu) → Hinweis; normale Skala und unbekannte Beschriftungen nicht', () => {
    expect(umgepoltHinweis({ '1': 'stimme voll zu', '2': 'stimme eher zu', '3': 'teils/teils', '4': 'stimme eher nicht zu', '5': 'stimme gar nicht zu' })).toBe(true);
    expect(umgepoltHinweis({ '1': 'stimme gar nicht zu', '2': 'stimme eher nicht zu', '3': 'teils/teils', '4': 'stimme eher zu', '5': 'stimme voll zu' })).toBe(false);
    expect(umgepoltHinweis({ '1': 'rot', '2': 'grün' })).toBe(false); expect(umgepoltHinweis({})).toBe(false);
  });
});

describe('Unipark / EFS (nachgebaut, NICHT belegt): -77, 0 (mit Bedingung), -66, -99 als Vorschlag; Systemvariablen als Metadaten; keine Test-/Unvollständig-Vorschläge', () => {
  const x = FB.unipark;
  it('CSV: Hersteller aus lfdn + v_N; v_1 und v_2 bekommen [-77, 0]; v_4 (ja/nein mit echter 0), v_5 (0-bis-10-Skala) und die Textspalte v_3 nichts; Mittel v_1 roh -10,5 gegen 3,5', () => {
    const e = erkenneFragebogen(csv(x.datei)); pruefe(e, x);
    const f = vorschlag(e, 'fehlend').find(v => v.spalte === 'v_1'); nah(f.wirkung.mittelVorher, x.mittel_v1.roh, 'roh'); nah(f.wirkung.mittelNachher, x.mittel_v1.mit_markierung, 'markiert'); expect(f.wirkung.n).toBe(x.mittel_v1.n_mit);
    for (const n of Object.keys(x.fehlend_nicht_vorgeschlagen)) expect(fehlendKarte(e)[n], n).toBeUndefined();
  });
  it('Excel (xlsx) liefert dieselbe Erkennung wie die CSV (Zahlen kommen als Zahlen)', async () => {
    const b = readFileSync(new URL('./testdaten/fragebogen/unipark-nachgebaut.xlsx', import.meta.url)), t = await leseTabellenkalkulation(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer, 'unipark-nachgebaut.xlsx');
    const e = erkenneFragebogen(t); expect(e.hersteller).toBe('unipark'); expect(fehlendKarte(e)).toEqual(Object.fromEntries(Object.entries(x.fehlend).map(([k, v]) => [k, sortiert(v as number[])])));
  });
  describe('Pflichtfall 10: .sav mit und ohne gesetzte Missing-Werte (von der Engine geschrieben)', () => {
    let m: Awaited<ReturnType<typeof nodeEngine>>;
    beforeAll(async () => { m = await nodeEngine(); });
    const lade = (datei: string) => {
      m.run('NEW FILE.', {}); m.run(`GET FILE='/u.sav'.`, { '/u.sav': readFileSync(new URL(`./testdaten/fragebogen/${datei}`, import.meta.url)) });
      const spalten = leseVerzeichnis(m.run('DISPLAY DICTIONARY.'));
      m.run("SAVE TRANSLATE /OUTFILE='/t.csv' /TYPE=CSV /FIELDNAMES /REPLACE /CELLS=VALUES.");
      const zeilen = parseCsv(new TextDecoder().decode(m.lies('/t.csv'))).slice(1).map(z => spalten.map((_, i) => (z[i]!.trim() === '' ? null : Number(z[i]))));
      return { spalten, zeilen } as any;
    };
    it('mit gesetzten Missing-Werten: nichts vorzuschlagen (schon erledigt)', () => { const e = erkenneImSav(lade(FB.unipark_sav.mit)); expect(e.hersteller).toBe('unipark'); expect(vorschlag(e, 'fehlend')).toEqual([]); });
    it('ohne gesetzte Missing-Werte: -77 und 0 für v_1 und v_2 als Vorschlag mit Wirkung; v_4 mit Wertelabel 0 = nein und v_5 (0 bis 10) nichts', () => {
      const e = erkenneImSav(lade(FB.unipark_sav.ohne)); expect(fehlendKarte(e)).toEqual({ v_1: [-77, 0], v_2: [-77, 0] });
      expect(vorschlag(e, 'fehlend')[0].wirkung.mittelNachher).not.toBe(vorschlag(e, 'fehlend')[0].wirkung.mittelVorher);
    });
  });
});

describe('Ohne Kodebuch, unbekannter Hersteller: Hinweis auf Codes (Entscheidung Opus 3), nie automatisch', () => {
  const x = FB.unbekannt, e = erkenneFragebogen(csv(x.datei));
  it('Hersteller unbekannt; Hinweise für q1 (-9), q2 (-99), q3 (99), q4 (999), q5 (-1) mit Wirkung auf den Mittelwert', () => {
    expect(e.hersteller).toBe('unbekannt'); expect(e.kopfzeilen).toBe(1);
    const h = vorschlag(e, 'fehlend'); expect(h.map(v => v.spalte)).toEqual(x.hinweise.map((q: any) => q.spalte)); expect(h.every(v => v.quelle === 'hinweis')).toBe(true);
    for (const q of x.hinweise) { const v = h.find(a => a.spalte === q.spalte); expect(v.codes, q.spalte).toEqual(q.codes); nah(v.wirkung.mittelVorher, q.mittel_mit, q.spalte + ' vorher'); nah(v.wirkung.mittelNachher, q.mittel_ohne, q.spalte + ' nachher'); expect(v.wirkung.n).toBe(q.n_ohne); }
  });
  it('keine Hinweise für alter (99 zwischen 19 und 67), temp (-1 neben -5 und 30) und die Kennung id', () => { for (const n of x.keine_hinweise) expect(fehlendKarte(e)[n], n).toBeUndefined(); });
  it('der Satz fragt: „… als fehlend markieren?“ mit beiden Mittelwerten (zwei Nachkommastellen, Komma)', () => {
    const fm = (v: number) => v.toFixed(2).replace('.', ',');
    for (const sp of ['q3', 'q4', 'q5']) { const q = x.hinweise.find((a: any) => a.spalte === sp), t = vorschlagSatz(vorschlag(e, 'fehlend').find(v => v.spalte === sp)); expect(t).toContain('als fehlend markieren'); expect(t).toContain(fm(q.mittel_mit)); expect(t).toContain(fm(q.mittel_ohne)); }
  });
  it('NIE automatisch: die Spalten behalten ihre Werte, die Tabelle ist unverändert, es gibt keine Befehle', () => {
    const t = csv(x.datei), kopie = JSON.parse(JSON.stringify(t)); const e2 = erkenneFragebogen(t); expect(t).toEqual(kopie); expect(e2.tabelle.zeilen).toEqual(t.zeilen);
  });
  it('das Fachblatt-Beispiel: SoSci-Werte 4, 5, -9, 3, -1, 2 ohne Hersteller: -1 und -9 in einer Spalte, die sonst 2 bis 5 hat → Hinweis, Mittel 0,67 gegen 3,50', () => {
    const t: Tabelle = { kopf: ['q1', 'q2'], zeilen: x.fachblatt_beispiel.werte.map((v: number, i: number) => [String(v), String(i)]), quelle: 'bsp.csv' };
    const f = vorschlag(erkenneFragebogen(t), 'fehlend').find(v => v.spalte === 'q1'); expect(f).toBeTruthy(); expect(sortiert(f.codes)).toEqual([-9, -1]); nah(f.wirkung.mittelVorher, 2 / 3); nah(f.wirkung.mittelNachher, 3.5);
  });
});

describe('Pflichtfall 14 und Ränder: leere Datei, nur Kopf, keine Fragebogen-Datei', () => {
  it('Tabelle ohne Spalten: Meldung „leer“ als ganzer Satz, kein Absturz', () => {
    const e = erkenneFragebogen({ kopf: [], zeilen: [], quelle: 'leer.csv' }); expect(e.meldungen.map(m => m.art)).toEqual(['leer']); expect(e.meldungen[0]!.satz).toMatch(/\.$/); expect(e.vorschlaege).toEqual([]);
  });
  it('nur eine Kopfzeile, keine Antworten: Meldung „nurKopf“', () => {
    const e = erkenneFragebogen(leseCsv('CASE;SERIAL;REF;QUESTNNR;MODE;STARTED;A001\n', 'nur-kopf.csv')); expect(e.meldungen.map(m => m.art)).toEqual(['nurKopf']); expect(e.meldungen[0]!.satz).toMatch(/Antworten|Zeilen/);
  });
  it('irgendeine andere Tabelle: Hersteller unbekannt, keine Metadaten, keine Vorschläge, keine Meldung', () => {
    const e = erkenneFragebogen(leseCsv('Name;Alter;Ort\nAnna;23;Wien\nBen;31;Graz\n', 'x.csv')); expect(e.hersteller).toBe('unbekannt'); expect(e.vorschlaege).toEqual([]); expect(e.meldungen).toEqual([]);
    expect(e.spalten.every(c => c.rolle === 'frage')).toBe(true);
  });
  it('die planeSpalten der bereinigten Qualtrics-Tabelle sehen Zahlen als Zahlen (kein Zeilen-2-Text in den Daten)', () => {
    const e = erkenneFragebogen(csv(FB.qualtrics_numerisch.datei)); const p = planeSpalten(e.tabelle); expect(p.find(c => c.name === 'Q1')!.art).toBe('zahl'); expect(p.find(c => c.name === 'Progress')!.art).toBe('zahl');
  });
});
