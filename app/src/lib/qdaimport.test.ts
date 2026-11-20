import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import erwartet from './testdaten/spaeter-c-erwartet.json';
import { nodeEngine } from './testengine';
import { leseCsv, leseTabellenkalkulation, type Tabelle } from './einlesen';
import { parseCsv } from '../dialogs/csv';
import { gueltigerName } from './skalabau';
import { intercoder } from './intercoder';
import { rechneTabelle } from './tabellenmodell';
import { liesQda, alsHaeufigkeit, alsVorkommen, alsMehrfachSet, zaehleSegmente, dokumentEbene, dokumentEbeneHinweis, normalisiereDokumentName, dokumenteAbgleichen, verbindeMitVariablen, type QdaErgebnis } from './qdaimport';
import { s } from './sitzung.svelte';

/* ===== Später, Welle S-C, Bauer B: Import qualitativer Codierungen (G13 Stufe 1) - MAXQDA/ATLAS.ti/NVivo-Tabellen und Segmenttabelle =====
 * Fachblatt 3 und „Entscheidungen Opus (17.10.)“ Punkt 4: In S-C nur Stufe 1 (Code-Matrix, Segmenttabelle, Dokumentvariablen, Zusammenführen); REFI-QDA (.qdpx) ENTFÄLLT; G2 nur auf Dokument-Ebene mit dem Satz aus 3.3;
 * Summenzeilen werden nur nach Nachrechnen weggelassen, und die Person bestätigt es. Segmenttext wird nie übernommen. Nichts wird still verändert.
 * Sollwerte: testdaten/spaeter-c-erwartet.json (Abschnitt `qda`) aus scripts/spaeter-c-erwartet.R: ein von Hand gebautes Mini-Projekt (4 Dokumente, 5 Codes, 2 Codierende A/B, 33 Stellen, genau eine DOPPELTE Stelle),
 * alle Zählungen aus der Segmenttabelle; Kappa und Krippendorff-alpha der Dokument-Ebene aus irr (kappa2, kripp.alpha), Prozent von Hand. ALLE Dateien unter testdaten/qda/ sind NACHGEBAUT (LIESMICH.md dort).
 *
 * ---------------------------------- Schnittstelle (festgelegt vom Prüfer; Modul lib/qdaimport.ts) ----------------------------------
 *  liesQda(t: Tabelle, opt?: { summenWeglassen?: boolean; elternAuslassen?: boolean; doppelteEntfernen?: boolean }): QdaErgebnis       Eingabe = Ergebnis von leseCsv / leseTabellenkalkulation; wirft nie; ändert `t` nie
 *  QdaErgebnis = {
 *    art: 'matrix' | 'segmente' | 'unbekannt';
 *    hersteller: 'maxqda' | 'atlasti' | 'nvivo' | 'unbekannt';      // maxqda: Blatt „Code-Matrix“ oder Summe „SUMME“; atlasti: Blatt „Code-Document Table“ / „Quotations“, Summe „Totals“, Spalte „Author“; nvivo: leere linke obere Zelle, Blatt „Matrix“; Segmenttabelle ohne Merkmale: unbekannt
 *    dokumente: string[]; codes: { name: string /* Originalbezeichnung mit Pfad (Backslash) und Umlauten *\/; spalte: string /* PSPP-Name nach psppName: Umlaute ae/oe/ue, \ → _ *\/ }[];
 *    zaehlung: number[][];                       // [code][dokument], LEER = 0; bei relativ: die Werte aus der Datei. Matrix: Reihenfolge wie in der Datei; Segmente: Reihenfolge des ersten Auftretens
 *    relativ: false | 'anteil' | 'prozent';       // 'anteil': Spalten summieren sich zu 1 (normalisiert), 'prozent': zu 100 - KEINE Zählungen; die Datei ist wie die Anzeige von ATLAS.ti gerundet (4 bzw. 2 Stellen), erkannt wird mit Toleranz 0,1 % der Summe
 *    summen: { zeile: string | null; spalte: string | null; nachgerechnet: boolean | null; weggelassen: boolean };   // erkannte Summenbezeichnungen (SUMME, Summe, Totals, Total, Gesamt, Sum), nachgerechnet: stimmt jede Summe? null = keine da
 *    eltern: string[];                           // Originalnamen der Elterncodes: Zeile = Summe der Kinder (Pfadanfang `Eltern\`) in ALLEN Dokumenten
 *    codierende: string[] | null;                // aus der Spalte Codierende/Author/Autor/Benutzer/User; null = keine Spalte
 *    segmente?: { dokument: string; code: string; beginn: number | null; ende: number | null; codierende: string | null }[];   // nur Segmenttabelle; KEIN Text der Stelle
 *    doppelte: { dokument: string; code: string; beginn: number; ende: number; codierende: string | null; anzahl: number }[];    // gleiche Stelle, gleicher Code, gleiche Codierende, gleicher Anfang und Ende: GEMELDET, nicht still entfernt
 *    hinweise: { art: 'mehrereCodierende' | 'relativ' | 'summeStimmtNicht' | 'doppelte' | 'elterncodes' | 'datenschutz' | 'doppelteDokumente' | 'faelleOhneCodierung'; spalten?: string[] }[];
 *    meldungen: { art: 'leer' | 'keineQdaTabelle'; satz: string }[];   // ganze Sätze (de/du)
 *  }
 *  Voreinstellung (ohne opt): NICHTS wird weggelassen. Die Summenzeile/-spalte stehen als Dokument/Code „SUMME“ da, mit `summen`-Angabe und Vorschlag. summenWeglassen:true lässt sie weg, aber nur wenn `nachgerechnet` true ist
 *  (sonst bleiben sie und es gibt den Hinweis summeStimmtNicht). elternAuslassen:true entfernt die Elterncodes. doppelteEntfernen:true zählt die Doppelungen nur einmal.
 *  Hinweise: 'datenschutz' (Dokumentnamen sind oft Teilnehmernamen) immer; 'mehrereCodierende' bei Matrizen und bei Segmenten ohne Codierenden-Spalte; 'relativ' bei relativ; 'doppelte' bei Doppelungen; 'faelleOhneCodierung' mit den Dokumenten, deren ganze Spalte 0 ist.
 *  alsHaeufigkeit(e): Daten | null      Zeilen = Dokumente; Spalten `dokument` (Text) + je Code eine Zahlenspalte (name = code.spalte, bezeichnung = code.name, F8.0); null bei relativ (nie als Zählung ausgeben)
 *  alsVorkommen(e): Daten | null       dasselbe mit 0/1 („kommt im Dokument vor“), werteLabels 0 „nicht codiert“, 1 „codiert“; null bei relativ
 *  alsMehrfachSet(e, name): MehrfachSet     { name, label: name, spalten: alle Code-Spalten in Reihenfolge, zaehlwert: 1 } für Welle 4 und die Tabelle (Themen nach Gruppe)
 *  zaehleSegmente(e, o?: { codierende?: string; doppelteEntfernen?: boolean }): number[][]     [code][dokument] aus e.segmente, in der Reihenfolge von e.codes und e.dokumente
 *  dokumentEbene(e): { einheiten: string[]; codierende: string[]; spalten: (0 | 1)[][] } | null      Einheit = Dokument × Code (Label `${dokument}|${code.spalte}`), Wert 0/1 je Codierende (spalten[k] gehört zu codierende[k]); null ohne ≥ 2 Codierende
 *  dokumentEbeneHinweis(): string         „Das misst, ob zwei Personen ein Dokument gleich einordnen, nicht ob sie dieselben Textstellen markiert haben.“ (genau dieser Satz)
 *  normalisiereDokumentName(n: string): string     Unicode NFC, Randleerraum weg, klein, Dateiendung (.docx .doc .pdf .txt .rtf .odt) weg
 *  dokumenteAbgleichen(a: string[], b: string[]): { zugeordnet: { a: string; b: string }[]; nurA: string[]; nurB: string[] }     über normalisiereDokumentName; „Interview 1“ und „interview_1“ sind NICHT gleich
 *  verbindeMitVariablen(h: Daten, v: Daten, o: { dokument: string; schluessel: string }): { daten: Daten; nichtZugeordnet: { codes: string[]; variablen: string[] } }      Spalten von v (außer dem Schlüssel) an h; ohne Partner leer (null), nie geraten
 */
s.einst.sprache = 'de'; s.einst.anrede = 'du';
const Q = (erwartet as any).qda;
const datei = (n: string) => new URL(`./testdaten/qda/${n}`, import.meta.url);
const csv = (n: string): Tabelle => leseCsv(readFileSync(datei(n), 'utf8'), n);
const xlsx = async (n: string): Promise<Tabelle> => { const b = readFileSync(datei(n)); return leseTabellenkalkulation(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer, n); };
const arten = (e: QdaErgebnis) => e.hinweise.map(h => h.art);
const gleichZahlen = (a: number[][], b: number[][], w: string) => { expect(a.length, `${w}: Zeilen`).toBe(b.length); a.forEach((z, i) => { expect(z.length, `${w}: Spalten`).toBe(b[i]!.length); z.forEach((v, j) => { expect(Number.isNaN(v), `${w} NaN`).toBe(false); expect(Math.abs(v - b[i]![j]!), `${w} [${i}][${j}]`).toBeLessThanOrEqual(1e-9); }); }); };
/** Zählung auf die erwartete Reihenfolge der Codes bringen (Segmente: Reihenfolge des ersten Auftretens). */
const aufCodes = (e: QdaErgebnis, z: number[][], soll: { name: string }[]) => soll.map(c => { const i = e.codes.findIndex(x => x.name === c.name); expect(i, `Code ${c.name} fehlt: ${e.codes.map(x => x.name)}`).toBeGreaterThanOrEqual(0); return z[i]!; });

describe('MAXQDA Code-Matrix (nachgebaut): Codes in Zeilen, Dokumente in Spalten, Summe', () => {
  const x = Q.maxqda_matrix;
  it('Pflichtfall 1: erkannt als Matrix von MAXQDA; mit summenWeglassen: genau 4 Dokumente und 5 Codes ohne SUMME-Zeile und -Spalte, Zählung wie in der Segmenttabelle', async () => {
    const t = await xlsx(x.datei), e = liesQda(t, { summenWeglassen: true });
    expect(e.art).toBe('matrix'); expect(e.hersteller).toBe('maxqda'); expect(e.dokumente).toEqual(x.dokumente); expect(e.codes).toEqual(x.codes); gleichZahlen(e.zaehlung, x.zaehlung, 'Zählung');
    expect(e.summen).toEqual({ zeile: 'SUMME', spalte: 'SUMME', nachgerechnet: true, weggelassen: true });
  });
  it('ohne Bestätigung bleibt die Summe stehen (als Dokument und Code „SUMME“), mit der Angabe, dass sie nachgerechnet stimmt - die Person entscheidet', async () => {
    const e = liesQda(await xlsx(x.datei));
    expect(e.dokumente).toEqual([...x.dokumente, 'SUMME']); expect(e.codes.map(c => c.name)).toEqual([...x.codes.map((c: any) => c.name), 'SUMME']);
    expect(e.summen).toEqual({ zeile: 'SUMME', spalte: 'SUMME', nachgerechnet: true, weggelassen: false });
    expect(e.zaehlung[5]!.slice(0, 4)).toEqual(x.summe_zeile); expect(e.zaehlung.slice(0, 5).map(z => z[4])).toEqual(x.summe_spalte);
  });
  it('Pflichtfall 2: leer = 0 (in der Matrix heißt leer „nicht codiert“); nirgends null oder NaN', async () => {
    const t = await xlsx(x.datei); expect(t.zeilen.flat().some(v => v === null), 'die Datei hat leere Zellen').toBe(true);
    const e = liesQda(t, { summenWeglassen: true }); expect(e.zaehlung.flat().every(v => typeof v === 'number' && Number.isFinite(v))).toBe(true); expect(e.zaehlung[0]![2]).toBe(0);
  });
  it('Pflichtfall 6: eine Matrix sagt nichts über die Codierenden → Hinweis „mehrereCodierende“; dazu der Datenschutz-Hinweis auf Dokumentnamen', async () => {
    const e = liesQda(await xlsx(x.datei)); expect(arten(e)).toContain('mehrereCodierende'); expect(arten(e)).toContain('datenschutz'); expect(e.codierende).toBeNull();
  });
  it('Pflichtfall 12: Umlaute und `\\` in Codepfaden: name = Originalbezeichnung mit Pfad, spalte = gültiger PSPP-Name (Rueckmeldung_Lehrkraft)', async () => {
    const e = liesQda(await xlsx(x.datei), { summenWeglassen: true });
    expect(e.codes[2]).toEqual({ name: 'Rückmeldung\\Lehrkraft', spalte: 'Rueckmeldung_Lehrkraft' });
    for (const c of e.codes) expect(gueltigerName(c.spalte), c.spalte).toBe(true); expect(new Set(e.codes.map(c => c.spalte)).size).toBe(e.codes.length);
  });
  it('die Eingabe-Tabelle wird nie verändert', async () => { const t = await xlsx(x.datei), kopie = JSON.parse(JSON.stringify(t)); liesQda(t, { summenWeglassen: true, elternAuslassen: true }); expect(t).toEqual(kopie); });
});

describe('Summen nur nach Nachrechnen; Elterncodes; relative Werte (Fachblatt 3.4)', () => {
  it('Summenzeile mit einer falschen Zahl: nachgerechnet false, trotz summenWeglassen bleibt sie, Hinweis summeStimmtNicht', async () => {
    const e = liesQda(await xlsx(Q.maxqda_summe_falsch.datei), { summenWeglassen: true });
    expect(e.summen.nachgerechnet).toBe(false); expect(e.summen.weggelassen).toBe(false); expect(arten(e)).toContain('summeStimmtNicht'); expect(e.dokumente).toContain('SUMME');
  });
  it('Pflichtfall 8: Elterncodes Motivation und Rückmeldung (Zeile = Summe ihrer Kinder in allen Dokumenten) erkannt; mit elternAuslassen weg, die fünf Codes bleiben mit den richtigen Zahlen', async () => {
    const x = Q.maxqda_hierarchie, t = await xlsx(x.datei);
    const e = liesQda(t, { summenWeglassen: true }); expect(e.eltern).toEqual(x.eltern); expect(arten(e)).toContain('elterncodes'); expect(e.codes.map(c => c.name)).toEqual(x.codes_alle);
    const o = liesQda(t, { summenWeglassen: true, elternAuslassen: true }); expect(o.codes).toEqual(x.codes_ohne_eltern); gleichZahlen(o.zaehlung, x.zaehlung_ohne_eltern, 'ohne Eltern');
    expect(e.codes.filter(c => c.name === 'Motivation' || c.name === 'Rückmeldung').map(c => c.spalte)).toEqual(x.elternnamen_spalte);
  });
  it('Elterncode nur, wenn die Zeile in ALLEN Dokumenten die Summe der Kinder erreicht (gleich oder darüber); liegt sie in einem Dokument darunter, ist es kein Elterncode', () => {
    const k = (z: number[]): Tabelle => ({ kopf: ['Code', 'D1', 'D2'], zeilen: [['Thema', z[0]!, z[1]!], ['Thema\\A', 1, 1], ['Thema\\B', 1, 0]], quelle: 'x.xlsx' });
    expect(liesQda(k([2, 1])).eltern).toEqual(['Thema']);   // gleich der Summe
    expect(liesQda(k([5, 1])).eltern).toEqual(['Thema']);   // darüber (Fachblatt 3.4 Nr. 5)
    expect(liesQda(k([1, 1])).eltern).toEqual([]);          // D1: 1 < 2
  });
  it('Pflichtfall 3: normalisierte Werte (Spalten summieren sich zu 1) → relativ „anteil“, KEINE Zählung: alsHaeufigkeit und alsVorkommen geben null', async () => {
    const x = Q.atlasti_normalisiert, e = liesQda(await xlsx(x.datei)); expect(e.art).toBe('matrix'); expect(e.hersteller).toBe('atlasti'); expect(e.relativ).toBe('anteil');
    gleichZahlen(e.zaehlung, x.werte, 'Werte aus der Datei'); expect(arten(e)).toContain('relativ'); expect(alsHaeufigkeit(e)).toBeNull(); expect(alsVorkommen(e)).toBeNull();
  });
  it('Prozentwerte (Spalten summieren sich zu 100, Zeile Totals) → relativ „prozent“; die Totals-Zeile wird als Summe erkannt', async () => {
    const x = Q.atlasti_prozent, e = liesQda(await xlsx(x.datei)); expect(e.relativ).toBe('prozent'); expect(e.summen.zeile).toBe('Totals'); expect(e.summen.spalte).toBeNull(); expect(alsHaeufigkeit(e)).toBeNull();
  });
  it('doppelte Dokumentnamen in der Matrix → Hinweis doppelteDokumente', () => {
    const e = liesQda({ kopf: ['Code', 'Interview 1', 'Interview 1', 'Interview 2'], zeilen: [['A', 1, 2, 3], ['B', 0, 1, 1]], quelle: 'x.xlsx' });
    expect(arten(e)).toContain('doppelteDokumente'); expect(new Set(e.dokumente).size, 'die Namen werden eindeutig gemacht, nichts geht verloren').toBe(3);
  });
});

describe('ATLAS.ti Code-Dokument-Tabelle und NVivo-Matrix (nachgebaut)', () => {
  it('ATLAS.ti: Häufigkeiten, Nullen stehen als 0, Totals in Zeile und Spalte', async () => {
    const x = Q.atlasti_tabelle, e = liesQda(await xlsx(x.datei), { summenWeglassen: true });
    expect(e.hersteller).toBe('atlasti'); expect(e.relativ).toBe(false); expect(e.dokumente).toEqual(x.dokumente); expect(e.codes).toEqual(x.codes); gleichZahlen(e.zaehlung, x.zaehlung, 'ATLAS.ti'); expect(e.summen.nachgerechnet).toBe(true);
  });
  it('NVivo: leere linke obere Zelle → nvivo; ein Fall ohne Codierung (Interview_Weber, nur Nullen) wird als solcher GENANNT, nicht verworfen', async () => {
    const x = Q.nvivo_matrix, e = liesQda(await xlsx(x.datei)); expect(e.hersteller).toBe('nvivo'); expect(e.dokumente).toEqual(x.dokumente); gleichZahlen(e.zaehlung, x.zaehlung, 'NVivo');
    const h = e.hinweise.find(a => a.art === 'faelleOhneCodierung')!; expect(h.spalten).toEqual(x.faelle_ohne_codierung); expect(e.summen.zeile).toBeNull();
  });
});

describe('Segmenttabelle (Dokument; Code; Beginn; Ende; Codierende): Dokument × Code zählen, Codierende, Doppelungen', () => {
  const x = Q.segmente;
  it('Pflichtfall 4: Zählung Dokument × Code über alle 33 Stellen (Doppelte bleiben mitgezählt); je Codierende A und B; 0/1 daraus', () => {
    const e = liesQda(csv(x.datei)); expect(e.art).toBe('segmente'); expect(e.hersteller).toBe(x.hersteller); expect(e.segmente!.length).toBe(x.zeilen); expect(e.dokumente).toEqual(x.dokumente); expect(e.codierende).toEqual(x.codierende);
    gleichZahlen(aufCodes(e, e.zaehlung, x.codes), x.zaehlung_alle, 'alle'); gleichZahlen(aufCodes(e, zaehleSegmente(e), x.codes), x.zaehlung_alle, 'zaehleSegmente');
    gleichZahlen(aufCodes(e, zaehleSegmente(e, { codierende: 'A' }), x.codes), x.zaehlung_A, 'A'); gleichZahlen(aufCodes(e, zaehleSegmente(e, { codierende: 'B' }), x.codes), x.zaehlung_B, 'B');
    gleichZahlen(aufCodes(e, zaehleSegmente(e, { codierende: 'A' }), x.codes).map(r => r.map(v => (v > 0 ? 1 : 0))), x.vorkommen_A, 'Vorkommen A');
  });
  it('Pflichtfall 5: die doppelte Stelle (A, Müller, Intrinsisch, 10-60, zweimal) wird GEMELDET und nicht still entfernt; die gleiche Stelle von B ist keine Doppelung', () => {
    const e = liesQda(csv(x.datei)); expect(e.doppelte).toEqual(x.doppelte); expect(arten(e)).toContain('doppelte');
    expect(e.segmente!.filter(g => g.dokument === 'Interview_Müller' && g.code === 'Motivation\\Intrinsisch' && g.beginn === 10 && g.ende === 60 && g.codierende === 'A').length).toBe(2);
    const o = liesQda(csv(x.datei), { doppelteEntfernen: true }); gleichZahlen(aufCodes(o, o.zaehlung, x.codes), x.zaehlung_alle_ohne_doppelte, 'ohne Doppelte'); gleichZahlen(aufCodes(o, zaehleSegmente(o, { codierende: 'A' }), x.codes), x.zaehlung_A_ohne_doppelte, 'A ohne Doppelte');
  });
  it('Mehrfachcodierung (dieselbe Stelle mit zwei Codes) ist kein Fehler; die Summe der Codes ist nicht die Zahl der Stellen', () => {
    const e = liesQda(csv(x.datei)); const z = e.segmente!.filter(g => g.dokument === 'Interview_Schmidt' && g.beginn === 5 && g.ende === 50); expect(z.map(g => g.codierende).sort()).toEqual(['A', 'B']);
    expect(e.doppelte.length).toBe(1);
  });
  it('mit Codierenden-Spalte: kein Hinweis „mehrereCodierende“; ohne die Spalte: Hinweis „Waren mehrere Personen am Codieren? Dann stimmen die Häufigkeiten nicht.“', () => {
    expect(arten(liesQda(csv(x.datei)))).not.toContain('mehrereCodierende');
    const o = liesQda(csv(Q.segmente_ohne_codierende.datei)); expect(o.codierende).toBeNull(); expect(arten(o)).toContain('mehrereCodierende'); expect(o.segmente!.length).toBe(Q.segmente_ohne_codierende.zeilen);
  });
  it('ATLAS.ti-Zitate (Excel): Spalte „Author“ = Codierende; der Text der Stelle („Quotation Content“) wird NICHT übernommen (Fachblatt 3.4 Nr. 10)', async () => {
    const z = Q.atlasti_zitate, e = liesQda(await xlsx(z.datei)); expect(e.art).toBe('segmente'); expect(e.hersteller).toBe('atlasti'); expect(e.codierende).toEqual(z.codierende);
    expect(Object.keys(e.segmente![0]!).sort()).toEqual(['beginn', 'code', 'codierende', 'dokument', 'ende']); expect(JSON.stringify(e)).not.toContain('Zitat 1 aus');
    gleichZahlen(aufCodes(e, e.zaehlung, Q.segmente.codes), z.zaehlung, 'Zitate');
  });
});

describe('Zusammenführen mit Dokumentvariablen (Pflichtfall 7): Schreibweisen weichen ab, ein Dokument ohne Partner wird genannt', () => {
  it('normalisiereDokumentName: Unicode NFD → NFC, klein, Randleerraum, Endung weg', () => {
    for (const n of Q.zusammenfuehren.normalisiert) expect(normalisiereDokumentName(n.roh), n.roh).toBe(n.norm);
    for (const p of Q.schreibweisen_vergleich) expect(normalisiereDokumentName(p.a) === normalisiereDokumentName(p.b), `${p.a} / ${p.b}`).toBe(p.gleich);
  });
  it('dokumenteAbgleichen (aus der Excel-Datei der Dokumentvariablen): 3 zugeordnet, „Gruppendiskussion_1“ ohne Partner; keine Variable ohne Dokument', async () => {
    const z = Q.zusammenfuehren, v = await xlsx(z.variablen_datei_xlsx), namen = v.zeilen.map(r => String(r[0]));
    const a = dokumenteAbgleichen(z.codes_dokumente, namen); expect(a.nurA).toEqual(z.nur_codes); expect(a.nurB).toEqual(z.nur_variablen); expect(a.zugeordnet.map(p => p.a)).toEqual(z.zugeordnet.map((p: any) => p.code));
    expect(a.zugeordnet.length).toBe(3);
  });
  it('dieselben Namen aus der .sav (Engine): die Unicode-Form NFD überlebt das Schreiben und wird beim Abgleich trotzdem gefunden', async () => {
    const m = await nodeEngine(); const z = Q.zusammenfuehren;
    m.run('NEW FILE.'); m.run("GET FILE='/v.sav'.", { '/v.sav': readFileSync(datei(z.variablen_datei_sav)) });
    m.run("SAVE TRANSLATE /OUTFILE='/t.csv' /TYPE=CSV /FIELDNAMES /REPLACE /CELLS=VALUES.");
    const namen = parseCsv(new TextDecoder().decode(m.lies('/t.csv'))).slice(1).map(r => r[0]!.trim());
    const a = dokumenteAbgleichen(z.codes_dokumente, namen); expect(a.zugeordnet.length).toBe(3); expect(a.nurA).toEqual(z.nur_codes);
  });
  it('verbindeMitVariablen: Alter und Geschlecht an die Code-Tabelle; Gruppendiskussion_1 bleibt mit leeren Werten und steht in nichtZugeordnet', async () => {
    const z = Q.zusammenfuehren, e = liesQda(await xlsx(Q.maxqda_matrix.datei), { summenWeglassen: true }), h = alsHaeufigkeit(e)!;
    const v = await xlsx(z.variablen_datei_xlsx);
    const sp = (name: string, art: 'zahl' | 'text' = 'zahl') => ({ name, bezeichnung: '', art, niveau: 'nominal' as const, format: art === 'text' ? 'A20' : 'F8.0', fehlend: [], fehlendText: '', werteLabels: {} });
    const vd = { spalten: [sp('Dokumentname', 'text'), sp('Alter'), sp('Geschlecht', 'text')], zeilen: v.zeilen.map(r => [r[0] as string, r[1] as number, r[2] as string]) };
    const r = verbindeMitVariablen(h, vd as any, { dokument: 'dokument', schluessel: 'Dokumentname' });
    expect(r.nichtZugeordnet).toEqual({ codes: z.nur_codes, variablen: [] }); expect(r.daten.zeilen.length).toBe(4);
    const iA = r.daten.spalten.findIndex(c => c.name === 'Alter'), iG = r.daten.spalten.findIndex(c => c.name === 'Geschlecht'); expect(iA).toBeGreaterThan(0);
    expect(r.daten.zeilen.map(zl => zl[iA])).toEqual([...z.alter, null]); expect(r.daten.zeilen.map(zl => zl[iG])).toEqual([...z.geschlecht, null]);
    expect(r.daten.spalten.some(c => c.name === 'Dokumentname'), 'der Schlüssel der Variablen wird nicht doppelt angehängt').toBe(false);
  });
});

describe('Ergebnisformen: Häufigkeit je Code, 0/1 je Code, Mehrfachset (Pflichtfall 10) und Intercoder-Form (Pflichtfall 11)', () => {
  it('alsHaeufigkeit und alsVorkommen: eine Zeile je Dokument, Spalte `dokument` und je Code eine Zahlenspalte (Name = PSPP-Name, Bezeichnung = Pfad)', async () => {
    const x = Q.maxqda_matrix, e = liesQda(await xlsx(x.datei), { summenWeglassen: true }), h = alsHaeufigkeit(e)!, v = alsVorkommen(e)!;
    expect(h.spalten.map(c => c.name)).toEqual(['dokument', ...x.codes.map((c: any) => c.spalte)]); expect(h.spalten[1]!.bezeichnung).toBe('Motivation\\Intrinsisch'); expect(h.spalten[0]!.art).toBe('text');
    expect(h.zeilen.map(r => r[0])).toEqual(x.dokumente); x.zaehlung.forEach((zeile: number[], i: number) => zeile.forEach((n, j) => { expect(h.zeilen[j]![i + 1]).toBe(n); expect(v.zeilen[j]![i + 1]).toBe(n > 0 ? 1 : 0); }));
    expect(v.spalten[1]!.werteLabels).toEqual({ '0': 'nicht codiert', '1': 'codiert' });
  });
  it('0/1-Spalten als Mehrfachset in „Tabelle zusammenstellen“: Themen nach Gruppe (D1, D3 = 1; D2, D4 = 2), Prozent der Fälle gegen die Hand-Zählung', async () => {
    const x = Q.maxqda_matrix, e = liesQda(await xlsx(x.datei), { summenWeglassen: true }), v = alsVorkommen(e)!, set = alsMehrfachSet(e, 'Themen');
    expect(set).toMatchObject({ name: 'Themen', zaehlwert: 1 }); expect(set.spalten).toEqual(x.codes.map((c: any) => c.spalte));
    const gruppe = [1, 2, 1, 2], daten = { spalten: [...v.spalten, { name: 'g', bezeichnung: '', art: 'zahl' as const, niveau: 'nominal' as const, format: 'F8.0', fehlend: [], fehlendText: '', werteLabels: {} }], zeilen: v.zeilen.map((r, i) => [...r, gruppe[i]!]) };
    const t = rechneTabelle(daten as any, { spalte: 'g', sets: [set], bloecke: [{ art: 'mehrfach', set: 'Themen', mitNull: true }] });
    const vorkommen = x.zaehlung.map((z: number[]) => z.map(n => (n > 0 ? 1 : 0))) as number[][];   // [code][dokument]
    t.zeilen.forEach((zl, i) => { const g1 = vorkommen[i]![0]! + vorkommen[i]![2]!, g2 = vorkommen[i]![1]! + vorkommen[i]![3]!; expect(zl.zellen[0]!.n).toBe(g1); expect(zl.zellen[1]!.n).toBe(g2); expect(Math.abs(zl.zellen[0]!.prozent! - 50 * g1)).toBeLessThan(1e-9); });
  });
  it('Dokument-Ebene (G2): Einheit Dokument × Code, 0/1 je Codierende; Cohens Kappa, Krippendorff-alpha und Übereinstimmung wie in R (irr)', () => {
    const x = Q.dokumentebene, e = liesQda(csv(Q.segmente.datei)), d = dokumentEbene(e)!;
    expect(d.codierende).toEqual(['A', 'B']); expect(d.einheiten.length).toBe(20);
    const nach = new Map(d.einheiten.map((u, i) => [u, i])); x.einheiten.forEach((u: string, i: number) => { const k = nach.get(u); expect(k, `Einheit ${u}`).not.toBeUndefined(); expect(d.spalten[0]![k!], `A ${u}`).toBe(x.A[i]); expect(d.spalten[1]![k!], `B ${u}`).toBe(x.B[i]); });
    const r = intercoder(d.spalten, 'nominal'); expect(Math.abs(r.cohen! - x.cohen)).toBeLessThan(1e-9); expect(Math.abs(r.alpha.wert! - x.alpha)).toBeLessThan(1e-9); expect(Math.abs(r.prozent.wert! - x.prozent)).toBeLessThan(1e-9);
  });
  it('ohne zwei Codierende gibt es keine Dokument-Ebene; der Satz zur Einordnung steht genau so da (Entscheidung Opus 4)', () => {
    expect(dokumentEbene(liesQda(csv(Q.segmente_ohne_codierende.datei)))).toBeNull();
    expect(dokumentEbeneHinweis()).toBe('Das misst, ob zwei Personen ein Dokument gleich einordnen, nicht ob sie dieselben Textstellen markiert haben.');
  });
});

describe('Pflichtfall 13: leere oder falsche Datei - verständliche Meldung statt Absturz', () => {
  it('keine Spalten: Meldung „leer“; ein Brief als Text und eine Namensliste ohne Codes: Meldung „keineQdaTabelle“, jeweils als ganzer Satz', () => {
    const l = liesQda({ kopf: [], zeilen: [], quelle: 'leer.csv' }); expect(l.meldungen.map(m => m.art)).toEqual(['leer']); expect(l.meldungen[0]!.satz).toMatch(/\.$/); expect(l.zaehlung).toEqual([]);
    for (const k of ['nur_text', 'ohne_codes']) { const e = liesQda(leseCsv(Q.falsche_dateien[k], k + '.csv')); expect(e.art, k).toBe('unbekannt'); expect(e.meldungen.map(m => m.art), k).toEqual(['keineQdaTabelle']); expect(e.meldungen[0]!.satz).toMatch(/\.$/); }
  });
  it('Datenschutz: die Dokumentnamen können Namen von Personen sein - der Hinweis kommt bei jeder gelesenen QDA-Tabelle', () => {
    expect(arten(liesQda(csv(Q.segmente.datei)))).toContain('datenschutz');
  });
});
