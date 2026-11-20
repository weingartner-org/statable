import { afterEach, describe, expect, it } from 'vitest';
import { s } from './sitzung.svelte';
import { ladeSprache } from '../i18n/laufzeit';
import { andereArtText, artText, nichtGrundText, protokollAnhang, protokollCsv, vermerkText, vorlageFehlerText } from './protokollsaetze';
import type { Art, NichtGrund, ProtokollEintrag } from './protokoll';

/* Leitfaden Falle 12 für Protokoll und Vorlage (Abschnitt 6, Teil B): Ein fertiger Sprachtext, der in ein anderes `L(…)` eingesetzt wird, bleibt in jeder Sprache deutsch oder englisch.
 * Die Prüfsprache „xx“ setzt jeden übersetzten Text in [Klammern] mit Akzentbuchstaben (i18n/katalog.mjs, `pseudo`); was außerhalb übrig bleibt, ist fest eingesetzter deutscher oder englischer Text.
 * Voraussetzung: `node i18n/katalog.mjs` wurde nach dem letzten Ändern der Texte gelaufen (schreibt sprachen/xx.json). Muster: lib/sprachrest-massnahme.test.ts. */
const vorher = s.einst.sprache;
afterEach(() => { s.einst.sprache = vorher; });
const AUSNAHMEN = ['CSV', 'SHA', 'PSPP', 'Statable', 'PSPP'];
const rest = (t: string): string[] => (t.match(/[A-Za-zÀ-ÖØ-öø-ÿ]{2,}/g) ?? []).filter(w => /[aeiouAEOUcny]/.test(w) && !AUSNAHMEN.includes(w));
const pruefe = (name: string, t: string) => { expect(t, name).toMatch(/^\[/); expect(rest(t), `${name}: Rest außerhalb der Klammern in „${t}“`).toEqual([]); };

const ARTEN: Art[] = ['umkodieren', 'berechnen', 'auswahl', 'fehlend', 'beschriften', 'sortieren', 'spalteWeg', 'umbenennen', 'zaehlen', 'rang', 'aggregieren', 'gewicht', 'befehl', 'zusammen', 'zelle', 'zeilePlus', 'zeileWeg', 'einfuegen', 'spaltePlus', 'neuaufbau', 'umformen', 'index', 'zeitreihe', 'auffaellig', 'reihenfolge', 'raking', 'mikro', 'kategorien', 'datencheck', 'lesart', 'abgleich', 'vorlage'];
const GRUENDE: NichtGrund[] = ['zeilen', 'aus-daten', 'zweite-datei', 'befehl', 'fehler', 'neu', 'art', 'zu-lang'];
const eintrag = (nr: number, extra: Partial<ProtokollEintrag> = {}): ProtokollEintrag => ({ nr, art: 'umkodieren', spalten: ['q'], betroffen: 3, vorher: 10, nachher: 10, zeit: 1_700_000_000_000, quelle: 'hand', ergebnis: 'ok', ...extra });

describe('Prüfsprache xx: kein deutscher oder englischer Rest in den Sätzen des Protokolls und der Vorlage', () => {
  it('Arten, Gründe und Fehlersätze', async () => {
    await ladeSprache('xx'); s.einst.sprache = 'xx';
    for (const a of ARTEN) pruefe(`art ${a}`, artText(a));
    for (const g of GRUENDE) pruefe(`grund ${g}`, nichtGrundText(g));
    for (const g of ['unlesbar', 'neuer', 'zu-gross'] as const) pruefe(`vorlage ${g}`, vorlageFehlerText(g));
    const art = ['zahl', 'text', 'datum'] as const;
    for (const e of art) for (const i of art) if (e !== i) pruefe(`andere Art ${e} ${i}`, andereArtText('q', e, i));
  });
  it('Vermerke, Kopf und Anhang', async () => {
    await ladeSprache('xx'); s.einst.sprache = 'xx';
    const faelle: [string, ProtokollEintrag][] = [
      ['zurückgenommen', eintrag(1, { zurueck: { zeit: 1_700_000_000_000, grund: 'rueckgaengig' } })],
      ['Abbruch', eintrag(2, { zurueck: { zeit: 1_700_000_000_000, grund: 'abbruch' } })],
      ['wiederholt', eintrag(3, { wiederholtVon: 1 })],
      ['Fehler', eintrag(4, { ergebnis: 'fehler', grund: 'pspp' })],
      ['abgebrochen pspp', eintrag(5, { ergebnis: 'abgebrochen', grund: 'pspp' })], ['abgebrochen Person', eintrag(6, { ergebnis: 'abgebrochen', grund: 'person' })], ['abgebrochen sonst', eintrag(7, { ergebnis: 'abgebrochen', grund: 'sonst' })],
      ['Zuordnung', eintrag(8, { zuordnung: { von: 'q', nach: 'z' } })],
      ['Vorlage bestätigt', eintrag(9, { art: 'vorlage', pruefung: { sperren: 0, warnungen: 1, hinweise: 2, bestaetigt: true, zeilenNeueKategorien: 4 } })],
      ['Vorlage unbestätigt', eintrag(10, { art: 'vorlage', pruefung: { sperren: 0, warnungen: 1, hinweise: 2, bestaetigt: false, zeilenNeueKategorien: 4 } })],
      ['nicht wiederholbar', eintrag(11, { nicht: 'zeilen' })]
    ];
    for (const [n, e] of faelle) pruefe(`vermerk ${n}`, vermerkText(e));
    const csv = protokollCsv([eintrag(1), ...faelle.map(f => f[1])]).replace(/^\uFEFF/, '').split('\r\n')[0]!.split(';');
    for (const k of csv) pruefe(`CSV-Kopf ${k}`, k);
    const a = protokollAnhang([eintrag(1, { vorlage: { datei: 'q', pruefsummeVorlage: null, pruefsummeDaten: null, datenName: null, schritt: 2 } })], { name: 'q', sha256: '0123456789'.repeat(6) + '0123' });
    pruefe('Anhang Titel', a.titel);
    for (const k of a.kopf) pruefe(`Anhang Kopf ${k}`, k);
    pruefe('Anhang Quelle', a.zeilen[1]![5]!.split(':')[0]!);
    pruefe('Anhang Datei', a.zeilen[0]![1]!); pruefe('Anhang Prüfsumme', a.zeilen[0]![6]!);
  });
  it('die Seite „Protokoll“ als Ganzes (Server-Ausgabe): alle Texte außerhalb von Namen und Zahlen kommen aus dem Katalog', async () => {
    await ladeSprache('xx'); s.einst.sprache = 'xx';
    const { render } = await import('svelte/server');
    const Seite = (await import('../seiten/Protokoll.svelte')).default;
    s.datei = { name: 'q', sha256: '0123456789'.repeat(6) + '0123' };
    s.protokollLuecke = true;
    s.protokoll = [eintrag(1), eintrag(2, { zurueck: { zeit: 1_700_000_000_000, grund: 'rueckgaengig' } }), eintrag(3, { quelle: 'vorlage', vorlage: { datei: 'q', pruefsummeVorlage: '0123456789'.repeat(6) + '0123', pruefsummeDaten: '0123456789'.repeat(6) + '0123', datenName: 'q', schritt: 1 } })];
    const { body } = render(Seite);
    const text = body.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/g, ' ');
    expect(rest(text), `Rest außerhalb der Klammern`).toEqual([]);
    s.protokoll = []; s.datei = undefined; s.protokollLuecke = false;
  });
});
