import { afterEach, describe, expect, it } from 'vitest';
import { s } from './sitzung.svelte';
import { ladeSprache } from '../i18n/laufzeit';
import {
  karteVermerk, giscoBedingungSatz, giscoBestaetigungText, giscoDatenschutzSatz, giscoSpeicherSatz, geoFehlerSatz, geoGeladenSatz, karteWarnungen, zuordnungSaetze, klassenSatz, keineWerteSatz,
  keinWertText, karteModell, karteTabelle, karteCsv, geoLesen, karteZuordnen, klassenBilden, projiziere, type GeoFehler, type GiscoFehler
} from './karte';
import {
  klassFehlerSatz, klassQuelleSatz, klassSpracheSatz, klassSchreibweiseSatz, klassOenaceWarnung, klassNullenWarnung, klassNichtWiederholbarSatz, klassErgebnisSaetze, klassTrefferSatz, KLASS_LIZENZ, KLASS_NAMENSNENNUNG, type Klassifikation, type ZuordnenErgebnis
} from './klassifikation';
import {
  regelSatz, regelArtName, regelProblemSatz, ergebnisSatz, keineKorrekturSatz, erfuelltSatz, nichtPruefbarSatz, listeKuerzungSatz, dateiFehlerSatz, REGEL_ARTEN, PLAUSI_MAX_ZEILEN_LISTE, type Regel, type RegelErgebnis
} from './plausibel';
import { artText } from './protokollsaetze';

/* Leitfaden Falle 12 und 20 für Abschnitt 9 (Karte, Klassifikation, Plausibilitätsregeln): Ein fertiger Sprachtext, der in ein anderes `L(…)` eingesetzt wird, bleibt in jeder Sprache deutsch oder englisch.
 * Die Prüfsprache „xx“ setzt jeden übersetzten Text in [Klammern] mit Akzentbuchstaben (i18n/katalog.mjs, `pseudo`); was außerhalb übrig bleibt, ist fest eingesetzter deutscher oder englischer Text.
 * Voraussetzung: `node i18n/katalog.mjs` wurde nach dem letzten Ändern der Texte gelaufen (schreibt sprachen/xx.json). Muster: lib/sprachrest-abschluss.test.ts. */
const vorher = s.einst.sprache;
afterEach(() => { s.einst.sprache = vorher; });
const AUSNAHMEN = ['GISCO', 'EuroGeographics', 'GeoJSON', 'JSON', 'NUTS', 'IP', 'WGS', 'ISCO', 'CC', 'BY', 'EDV', 'ÖNACE'];
const rest = (t: string): string[] => (t.replace(/https?:\/\/\S+/g, '').match(/[A-Za-zÀ-ÖØ-öø-ÿ]{2,}/g) ?? []).filter(w => /[aeiouAEOUcny]/.test(w) && !AUSNAHMEN.includes(w));
const pruefe = (name: string, t: string) => { expect(t, name).toMatch(/^\[/); expect(rest(t), `${name}: Rest außerhalb der Klammern in „${t}“`).toEqual([]); };

const GEO = { type: 'FeatureCollection', features: [
  { type: 'Feature', properties: { NUTS_ID: 'ZZ11', NAME_LATN: 'Burgenland' }, geometry: { type: 'Polygon', coordinates: [[[9, 46], [10, 46], [10, 47], [9, 47], [9, 46]]] } },
  { type: 'Feature', properties: { NUTS_ID: 'ZZ12', NAME_LATN: 'Niederösterreich' }, geometry: { type: 'Polygon', coordinates: [[[10, 46], [11, 46], [11, 47], [10, 47], [10, 46]]] } }
] };

describe('Prüfsprache xx: kein deutscher oder englischer Rest in den Sätzen der Karte', () => {
  it('Vermerk, Bedingung, Bestätigung, Datenschutz, Speicher, Warnungen', async () => {
    await ladeSprache('xx'); s.einst.sprache = 'xx';
    pruefe('vermerk', karteVermerk()); pruefe('bedingung', giscoBedingungSatz()); pruefe('bestaetigung', giscoBestaetigungText());
    pruefe('datenschutz', giscoDatenschutzSatz()); pruefe('speicher', giscoSpeicherSatz()); pruefe('kein Wert', keinWertText()); pruefe('keine Werte', keineWerteSatz());
    karteWarnungen().forEach((w, i) => pruefe(`warnung ${i}`, w));
  });
  it('alle Fehlersätze der Datei und des Abrufs, gelesen-Satz (Einzahl und Mehrzahl)', async () => {
    await ladeSprache('xx'); s.einst.sprache = 'xx';
    const alle: (GeoFehler | GiscoFehler | 'land')[] = ['unlesbar', 'form', 'typ', 'zu-gross', 'zu-viele', 'koordinaten', 'leer', 'netz', 'zeitlimit', 'abgebrochen', 'umleitung', 'nicht-gefunden', 'dienst', 'adresse', 'land'];
    for (const f of alle) pruefe(`fehler ${f}`, geoFehlerSatz(f));
    for (const [n, o] of [[1, 0], [2, 0], [1, 1], [3, 2]] as [number, number][]) pruefe(`gelesen ${n}/${o}`, geoGeladenSatz(n, o));
  });
  it('Zuordnung, Klassen, Bild (Fuß, Beschreibung, Legende), Tabelle und CSV', async () => {
    await ladeSprache('xx'); s.einst.sprache = 'xx';
    const g = geoLesen(GEO);
    if (!g.ok) throw new Error('GeoJSON');
    const gebiete = g.daten.gebiete;
    for (const [codes, werte] of [[['ZZ11', 'ZZ12', 'ZZ99'], [1, 2, 3]], [['ZZ11', 'ZZ11', '', 'ZZ12'], [1, 2, 3, null]], [['ZZ11'], [null]]] as [string[], (number | null)[]][]) {
      const z = karteZuordnen(gebiete, 'NUTS_ID', codes, werte);
      zuordnungSaetze(z, gebiete.length).forEach((t, i) => pruefe(`zuordnung ${i}`, t));
    }
    const z = karteZuordnen(gebiete, 'NUTS_ID', ['ZZ11', 'ZZ99'], [1, 5]);
    zuordnungSaetze(z, 2).forEach((t, i) => pruefe(`zuordnung 2 ${i}`, t));
    const k = klassenBilden([1, 1, 1, 1, 2], 'quantil', 5)!;
    pruefe('klassen weniger', klassenSatz(k));
    pruefe('klassen weniger eine', klassenSatz({ ...k, anzahl: 1 }));
    expect(g.daten.gebiete.length).toBe(2);
    const w = [1, 5];
    const z2 = karteZuordnen(gebiete, 'NUTS_ID', ['ZZ11', 'ZZ12'], w);
    for (const art of ['quantil', 'gleich'] as const) {
      const kl = klassenBilden(w, art, 3)!;
      for (const quelle of [{ art: 'gisco' as const, name: 'ZZ', ebene: 2, land: 'ZZ' }, { art: 'datei' as const, name: 'a1.x' }]) {
        const m = karteModell({ gebiete, rahmen: projiziere(gebiete), zuordnung: z2, klassen: kl, wertName: 'R1', gebietName: 'NUTS_ID', beschriftung: 'NAME_LATN', quelle });
        pruefe(`titel ${art}`, m.titel); pruefe(`beschreibung ${art}`, m.beschreibung);
        m.fuss.forEach((t, i) => pruefe(`fuss ${art} ${quelle.art} ${i}`, t));
        m.legende.filter(l => l.kein).forEach(l => pruefe('legende kein Wert', l.text));
        if (quelle.art === 'gisco') pruefe('vermerk im Bild', m.vermerk!);
        m.gebiete.filter(x => x.kein).forEach(x => expect(x.titel).toMatch(/\[/));
      }
      const tab = karteTabelle(gebiete, z, kl, 'NAME_LATN', 'NUTS_ID');
      tab.filter(t => t.status !== 'wert').forEach(t => pruefe('Tabelle Klasse', t.klasse));
      const csv = karteCsv(tab, karteVermerk()).split('\n');
      const kopf = csv[0]!.split(';');
      kopf.forEach(h => pruefe(`CSV-Kopf ${h}`, h));
      pruefe('CSV-Vermerk', csv[csv.length - 2]!);
    }
  });
  it('Protokoll', async () => {
    await ladeSprache('xx'); s.einst.sprache = 'xx';
    pruefe('art Klassifikation', artText('klassifikation')); pruefe('art Plausibilität', artText('plausibel'));
  });
});

describe('Prüfsprache xx: kein deutscher oder englischer Rest in den Sätzen der Klassifikation', () => {
  it('Fehler, Quelle, Sprache, Schreibweise, Warnungen', async () => {
    await ladeSprache('xx'); s.einst.sprache = 'xx';
    for (const f of ['netz', 'unlesbar', 'fremd', 'zu-gross', 'form'] as const) pruefe(`fehler ${f}`, klassFehlerSatz(f));
    const k = { id: 'oenace2008', name: 'ÖNACE 2008', ebenen: 2, eintraege: [], quelle: { adresse: 'x', sha256: 'ab', abgerufen: '2026-10-31' }, lizenz: '', namensnennung: '' } as Klassifikation;
    pruefe('quelle', klassQuelleSatz(k).split(KLASS_LIZENZ).join('').split(KLASS_NAMENSNENNUNG).join('')); // Lizenzname und Namensnennung stehen im Wortlaut der Quelle
    for (const [sp, de] of [['de', true], ['en', true], ['en', false]] as const) pruefe(`sprache ${sp} ${de}`, klassSpracheSatz(sp, de));
    pruefe('schreibweise oenace', klassSchreibweiseSatz('oenace')); pruefe('schreibweise isco', klassSchreibweiseSatz('isco'));
    pruefe('oenace', klassOenaceWarnung()); pruefe('nullen', klassNullenWarnung()); pruefe('nicht wiederholbar', klassNichtWiederholbarSatz());
    for (const n of [1, 2]) pruefe(`treffer ${n}`, klassTrefferSatz(n, 100));
  });
  it('Ergebnissätze in Einzahl und Mehrzahl', async () => {
    await ladeSprache('xx'); s.einst.sprache = 'xx';
    for (const n of [1, 3]) {
      const r: ZuordnenErgebnis = { werte: [], gefunden: n, leer: n, nichtGefunden: n, zuGrob: n, angeglichen: n, beispiele: ['X1', 'X2'], nichtGanz: n, getroffen: n };
      const sa = klassErgebnisSaetze(r, 10);
      expect(sa.length).toBe(6);
      sa.forEach((t, i) => pruefe(`ergebnis ${n}/${i}`, t));
    }
  });
});

describe('Prüfsprache xx: kein deutscher oder englischer Rest in den Sätzen der Plausibilitätsregeln', () => {
  it('Regelsätze, Namen der Arten, Prüf- und Problemsätze', async () => {
    await ladeSprache('xx'); s.einst.sprache = 'xx';
    const regeln: Regel[] = [
      { id: 'a', art: 'bereich', spalte: 'X1', min: 0, max: 120 }, { id: 'b', art: 'bereich', spalte: 'X1', min: 0, max: null }, { id: 'c', art: 'bereich', spalte: 'X1', min: null, max: 120 },
      { id: 'd', art: 'werte', spalte: 'X2', erlaubt: ['w', 'm', 1.5] },
      { id: 'e', art: 'wenn', wenn: { spalte: 'A', op: '>=', wert: 18 }, dann: { spalte: 'B', op: '!=', wert: 'N0' } },
      { id: 'f', art: 'summe', teile: ['T1', 'T2'], ziel: 'S', toleranz: 0.5 }, { id: 'g', art: 'schluessel', spalten: ['Id', 'J1'] }
    ];
    regeln.forEach(r => pruefe(`regel ${r.art}`, regelSatz(r)));
    REGEL_ARTEN.forEach(a => pruefe(`art ${a}`, regelArtName(a)));
    const e: RegelErgebnis = { id: 'a', geprueft: 10, verletzt: 2, nichtPruefbar: 1, spaltenFehlen: [], artPasstNicht: [] };
    pruefe('ergebnis', ergebnisSatz(e));
    for (const n of [1, 2]) pruefe(`fehlt ${n}`, regelProblemSatz({ ...e, spaltenFehlen: Array.from({ length: n }, (_, i) => `S${i}`) }));
    pruefe('art passt nicht', regelProblemSatz({ ...e, artPasstNicht: ['X1'] }));
    pruefe('keine Korrektur', keineKorrekturSatz()); pruefe('erfüllt', erfuelltSatz()); pruefe('nicht prüfbar', nichtPruefbarSatz());
    for (const n of [PLAUSI_MAX_ZEILEN_LISTE + 1, PLAUSI_MAX_ZEILEN_LISTE + 5]) pruefe(`kürzung ${n}`, listeKuerzungSatz(n));
    for (const f of ['unlesbar', 'zu-gross', 'fremd'] as const) pruefe(`datei ${f}`, dateiFehlerSatz(f));
  });
});
