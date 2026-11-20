import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { KUERZEL } from './kuerzel';
import { inSprache } from './sitzung.svelte';
import { ROH_BF, kuerzelZeilen } from '../hilfe/artikel-barrierefrei';

/** Wächter Barrierefreiheit Welle 7 (Auftrag C): Die Erklärung zur Barrierefreiheit (`seiten/Rechtliches.svelte`, Art `barrierefreiheit`) sagt nur, was
 *  `docs/barrierefreiheit/ABSCHLUSS.md` belegt:
 *  - alle Pflichtabschnitte stehen da;
 *  - „vollständig vereinbar“ steht nirgends, solange ABSCHLUSS.md nicht selbst „vollständig vereinbar“ sagt;
 *  - die Zahlen (erfüllt, nicht erfüllt, nicht gemessen, trifft nicht zu) sind die aus ABSCHLUSS.md, und jedes nicht erfüllte Kriterium steht in „Bekannte Grenzen“;
 *  - ist die NVDA-Messung der Wellen 2 bis 6 „nicht gemessen“, steht das in „Nicht geprüft“;
 *  - keine Erwähnung fachlicher Abnahme;
 *  - die Kürzelliste des Hilfe-Artikels ist aus `KUERZEL` erzeugt und stimmt mit ihr überein;
 *  - Fußzeile, Route und Melden-Auswahl „Barriere“ sind da.
 *  Jede Regel hat eine Gegenprobe (der Fehler wird absichtlich eingebaut, dann muss die Regel rot werden). */

const SRC = fileURLToPath(new URL('..', import.meta.url));
const DOCS = fileURLToPath(new URL('../../../docs/barrierefreiheit/', import.meta.url));
const lies = (p: string) => readFileSync(p, 'utf8');

const PFLICHT = ['Stand der Vereinbarkeit', 'Was gemessen wurde', 'Was geht', 'Bekannte Grenzen', 'Nicht geprüft', 'Barriere melden', 'Durchsetzung', 'Erstellung dieser Erklärung'];

/** Der Teil von Rechtliches.svelte, der die Erklärung ausgibt. */
export function erklaerungsTeil(quelle: string): string {
  const a = quelle.indexOf("{:else if art === 'barrierefreiheit'}");
  if (a < 0) return '';
  const b = quelle.indexOf('{:else}', a + 10);
  return b < 0 ? quelle.slice(a) : quelle.slice(a, b);
}

/** Zählung aus ABSCHLUSS.md (Tabelle „Stand | Anzahl“ unter „Zählung und offene Kriterien“) und die Listen darunter. */
export function leseAbschluss(md: string) {
  const i = md.indexOf('Zählung und offene Kriterien');
  const teil = i < 0 ? '' : md.slice(i);
  const zahl = (name: string) => Number(new RegExp(`\\|\\s*${name}\\s*\\|\\s*(\\d+)\\s*\\|`).exec(teil)?.[1] ?? NaN);
  const liste = (kopf: string) => {
    const m = new RegExp(`${kopf}[^\\n]*:\\n((?:- [^\\n]*\\n?)+)`).exec(teil);
    return m ? m[1]!.split('\n').filter(Boolean).map(z => z.replace(/^- /, '').trim()) : [];
  };
  return {
    erfuellt: zahl('erfüllt'), nichtErfuellt: zahl('nicht erfüllt'), nichtGemessen: zahl('nicht gemessen'), trifftNichtZu: zahl('trifft nicht zu'),
    vollstaendig: /Aussage zur Vereinbarkeit:\s*\*{0,2}\s*vollständig vereinbar/.test(teil),
    offeneNichtErfuellt: liste('Nicht erfüllt'),
  };
}

/** Prüft den Erklärungstext (Quelltext des Teils) gegen ABSCHLUSS.md. Gibt die Befunde als Sätze zurück (leer = in Ordnung). */
export function pruefeErklaerung(teil: string, abschlussMd: string, nvdaMd: string): string[] {
  const b: string[] = [];
  const ab = leseAbschluss(abschlussMd);
  if (!teil) return ['Der Teil „barrierefreiheit“ fehlt in Rechtliches.svelte.'];
  for (const h of PFLICHT) if (!teil.includes(`L("${h}"`) && !teil.includes(`L('${h}'`)) b.push(`Pflichtabschnitt fehlt: ${h}`);
  if (!ab.vollstaendig) {
    if (/vollständig(?:e|er|en)?\s+(?:mit|vereinbar|konform)|fully\s+(?:conformant|compliant)|vollständig\s+barrierefrei|fully\s+accessible/i.test(teil)) b.push('Der Text behauptet volle Vereinbarkeit, ABSCHLUSS.md sagt „teilweise“.');
    if (!/teilweise vereinbar/.test(teil)) b.push('Der Status „teilweise vereinbar“ steht nicht im Text.');
  }
  const z = (re: RegExp) => Number(re.exec(teil)?.[1] ?? NaN);
  const soll: [string, number, number][] = [
    ['erfüllt', z(/(\d+) Zeilen sind erfüllt/), ab.erfuellt],
    ['nicht erfüllt', z(/(\d+) Zeilen? (?:sind|ist) nicht erfüllt/), ab.nichtErfuellt],
    ['nicht gemessen', z(/(\d+) Zeilen sind nicht gemessen/), ab.nichtGemessen],
    ['trifft nicht zu', z(/(\d+) Zeilen treffen nicht zu/), ab.trifftNichtZu],
  ];
  for (const [name, ist, s] of soll) if (ist !== s) b.push(`Zahl „${name}“: Text ${ist}, ABSCHLUSS.md ${s}.`);
  const gesamt = z(/die (\d+) Zeilen der Prüftabelle/);
  if (gesamt !== ab.erfuellt + ab.nichtErfuellt + ab.nichtGemessen + ab.trifftNichtZu) b.push(`Gesamtzahl der Zeilen ${gesamt} passt nicht zur Summe in ABSCHLUSS.md.`);
  const grenzen = teil.slice(teil.indexOf('Bekannte Grenzen'), teil.indexOf('Nicht geprüft'));
  for (const k of ab.offeneNichtErfuellt) { const nr = /^[\d.]+/.exec(k)?.[0]; if (nr && !grenzen.includes(nr)) b.push(`Nicht erfülltes Kriterium ${k} fehlt unter „Bekannte Grenzen“.`); }
  if (/nicht gemessen/i.test(nvdaMd) && !/Mit NVDA nicht gemessen/.test(teil)) b.push('NVDA-WELLE-2-6.md nennt „nicht gemessen“, der Text sagt es unter „Nicht geprüft“ nicht (NVDA).');
  if (/Abnahme|abgenommen|Fachperson|Gegenlesen|muttersprachlich/i.test(teil)) b.push('Der Text erwähnt fachliche Abnahme.');
  if (!/mailto:service@statable\.eu/.test(teil)) b.push('Kontakt service@statable.eu fehlt.');
  return b;
}

const rechtliches = lies(`${SRC}seiten/Rechtliches.svelte`);
const abschluss = lies(`${DOCS}ABSCHLUSS.md`);
const nvda = lies(`${DOCS}NVDA-WELLE-2-6.md`);
const teil = erklaerungsTeil(rechtliches);

describe('Erklärung zur Barrierefreiheit', () => {
  it('ist in Ordnung gegen ABSCHLUSS.md', () => {
    expect(pruefeErklaerung(teil, abschluss, nvda)).toEqual([]);
  });
  it('ABSCHLUSS.md und WCAG-2.2-AA.md zählen gleich', () => {
    const ab = leseAbschluss(abschluss);
    const zeilen = lies(`${DOCS}WCAG-2.2-AA.md`).split('\n').filter(x => /^\| [\d*]/.test(x)).map(x => x.split(' | ').pop()!);
    const n = (re: RegExp) => zeilen.filter(x => re.test(x)).length;
    expect(zeilen.length).toBe(ab.erfuellt + ab.nichtErfuellt + ab.nichtGemessen + ab.trifftNichtZu);
    expect(n(/^erfüllt/)).toBe(ab.erfuellt);
    expect(n(/^nicht erfüllt/)).toBe(ab.nichtErfuellt);
    expect(n(/^nicht gemessen/)).toBe(ab.nichtGemessen);
    expect(n(/^trifft nicht zu/)).toBe(ab.trifftNichtZu);
  });
  it('„vollständig vereinbar“ steht in keiner Seite und keinem Artikel, solange ABSCHLUSS.md „teilweise“ sagt', () => {
    expect(leseAbschluss(abschluss).vollstaendig).toBe(false);
    const hilfe = lies(`${SRC}hilfe/artikel-barrierefrei.ts`);
    for (const t of [rechtliches, hilfe]) expect(/vollständig vereinbar|fully conformant|fully compliant/i.test(t)).toBe(false);
  });
  it('Fußzeile der Startseite, Route, Navigation und Melden-Auswahl sind da', () => {
    expect(lies(`${SRC}seiten/Start.svelte`)).toContain('href="#barrierefreiheit"');
    expect(lies(`${SRC}App.svelte`)).toContain("seite === 'barrierefreiheit'");
    expect(lies(`${SRC}lib/navi.ts`)).toContain("'barrierefreiheit'");
    const melden = lies(`${SRC}bausteine/Melden.svelte`);
    expect(melden).toContain('value="barriere"');
    expect(lies(`${SRC}lib/melden.ts`)).toContain("'barriere'");
  });

  describe('Gegenproben (der Fehler wird eingebaut, die Regel muss rot werden)', () => {
    const ok = () => pruefeErklaerung(teil, abschluss, nvda);
    it('Ausgangslage ist grün', () => expect(ok()).toEqual([]));
    it('volle Vereinbarkeit im Text', () => {
      const t = teil.replace('teilweise vereinbar mit der Konformitätsstufe AA', 'vollständig vereinbar mit der Konformitätsstufe AA');
      expect(t).not.toBe(teil);
      expect(pruefeErklaerung(t, abschluss, nvda).length).toBeGreaterThan(0);
    });
    it('falsche Zahl', () => {
      const t = teil.replace('36 Zeilen sind erfüllt', '37 Zeilen sind erfüllt');
      expect(t).not.toBe(teil);
      expect(pruefeErklaerung(t, abschluss, nvda).join(' ')).toContain('erfüllt');
    });
    it('Pflichtabschnitt fehlt', () => {
      const t = teil.replace('L("Durchsetzung"', 'L("Etwas anderes"');
      expect(t).not.toBe(teil);
      expect(pruefeErklaerung(t, abschluss, nvda).join(' ')).toContain('Durchsetzung');
    });
    it('nicht erfülltes Kriterium verschwindet aus den Grenzen', () => {
      const t = teil.replaceAll('3.1.2', 'Sprache von Teilen');
      expect(t).not.toBe(teil);
      expect(pruefeErklaerung(t, abschluss, nvda).join(' ')).toContain('3.1.2');
    });
    it('NVDA-Lücke wird verschwiegen', () => {
      const t = teil.replace('Mit NVDA nicht gemessen sind', 'Gemessen sind');
      expect(t).not.toBe(teil);
      expect(pruefeErklaerung(t, abschluss, nvda).join(' ')).toContain('NVDA');
    });
    it('fachliche Abnahme wird erwähnt', () => {
      const t = teil.replace('Selbstbewertung des Betreibers.', 'Selbstbewertung des Betreibers, abgenommen durch eine Fachperson.');
      expect(t).not.toBe(teil);
      expect(pruefeErklaerung(t, abschluss, nvda).join(' ')).toContain('Abnahme');
    });
    it('ABSCHLUSS.md mit anderer Zahl macht den Text falsch', () => {
      const ab = abschluss.replace(/\|\s*nicht gemessen\s*\|\s*11\s*\|/, '| nicht gemessen | 10 |');
      expect(ab).not.toBe(abschluss);
      expect(pruefeErklaerung(teil, ab, nvda).length).toBeGreaterThan(0);
    });
    it('Teil fehlt ganz', () => expect(pruefeErklaerung('', abschluss, nvda).length).toBeGreaterThan(0));
  });
});

describe('Hilfe-Artikel „Statable ohne Maus und mit Screenreader“', () => {
  const artikel = ROH_BF.find(x => x.id === 'barrierefrei-bedienen');
  it('ist angelegt und in artikel.ts eingehängt', () => {
    expect(artikel).toBeTruthy();
    expect(artikel!.titel.de).toContain('Statable ohne Maus und mit Screenreader');
    expect(lies(`${SRC}hilfe/artikel.ts`)).toMatch(/\.\.\.ROH_BF\b/);
  });
  const tabellen = () => artikel!.inhalt.filter((b): b is Extract<typeof b, { tabelle: unknown }> => typeof b === 'object' && b !== null && 'tabelle' in b);
  const zeilenAus = (zeilen: unknown[][]) => zeilen.map(z => [String(z[0]), (z[1] as { de: string }).de]);
  it('Kürzelliste stimmt mit KUERZEL überein (Zahl, Reihenfolge, Kürzel, Name)', () => {
    const t = tabellen();
    expect(t.length).toBe(1);
    const ist = zeilenAus(t[0]!.tabelle.zeilen as unknown[][]);
    expect(ist.length).toBe(KUERZEL.length);
    expect(ist.map(z => z[0])).toEqual(KUERZEL.map(k => k.anzeige));
    expect(ist.map(z => z[1])).toEqual(KUERZEL.map(k => inSprache('de', k.text)));
  });
  it('Gegenprobe: eine von Hand geänderte Liste fällt auf', () => {
    const zeilen = kuerzelZeilen().map(z => [z[0], z[1]] as unknown[]);
    const falsch = zeilen.slice(1);                       // ein Kürzel fehlt
    expect(zeilenAus(falsch).map(z => z[0])).not.toEqual(KUERZEL.map(k => k.anzeige));
    const andere = zeilen.map((z, i) => (i === 0 ? ['Strg+Q', z[1]] : z));   // ein Kürzel erfunden
    expect(zeilenAus(andere).map(z => z[0])).not.toEqual(KUERZEL.map(k => k.anzeige));
  });
  it('nennt die Pflichtthemen und sagt, was nicht mit NVDA gemessen ist', () => {
    const text = JSON.stringify(artikel!.inhalt);
    for (const w of ['Befehlspalette', 'Strg+K', 'Alt+W', 'Fachwörter', 'Strg+Alt+Pfeiltasten', 'Lesemodus', 'Beschreibung und Daten', 'Kontrastmodus', 'Word', 'PDF', 'Excel', 'Kurze Spaltenköpfe', 'Nicht mit NVDA gemessen']) expect(text).toContain(w);
    expect(/Abnahme|abgenommen|Fachperson/i.test(text)).toBe(false);
  });
});
