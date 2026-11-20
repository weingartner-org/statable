/**
 * Paket 2D (Qualitätsprüfung nach Regeln), rote Tests vom Prüfer. `qualitaetspruefung.ts` gibt es noch nicht; die Tests laden es dynamisch und sind darum rot, nicht kaputt.
 *
 * ===== Festlegungen für den Bauer (Datei `app/src/lib/qualitaetspruefung.ts`) =====
 *
 * pruefeQualitaet(plan: FragebogenPlan, sprache: string): QualitaetsHinweis[]
 *   QualitaetsHinweis = { regel: string; element: string; text: string; quelle: string }
 *   - `element` = id der Frage bzw. des Blocks (bei Block-Items: id des Items, bei den weitergereichten Befunden aus planPruefen: das `element` des Befunds,
 *     bei `wertelabels` also die id der Option). Hinweise ohne Element gibt es nicht.
 *   - `text`: ein nicht leerer Satz in `sprache` ('de' oder 'en'), ohne Anrede, keine Urteile ("Hinweis", nicht "Fehler"). `quelle`: Kurzbeleg als Text (siehe unten),
 *     bei den weitergereichten Regeln namen/wertelabels/unerreichbar darf er '' sein.
 *   - Höchstens EIN Hinweis je Regel und Element (mehrere betroffene Optionen oder Texte desselben Elements ergeben einen Hinweis). Ausnahme: `mitte` (ein Element erhält nur einen der beiden Texte).
 *   - Rein: verändert den Plan nicht; Ausgabe in Plan-Reihenfolge (Elemente, Block-Items hinter ihrem Block). Fehlt der Text in `sprache`, wird dieser Text nicht geprüft (kein Absturz).
 *   - Geprüft werden nur Texte in `sprache` (Frage.text, Block.text, Block-Item.text, Optionstexte der Liste); die andere Sprache wird für diesen Aufruf nicht angesehen.
 *   - Abhaken: `plan.geprueft?: Record<elementId, string[]>` (Regelkennungen). Steht die Regel in der Liste des Elements, entfällt genau dieser Hinweis (nicht die anderen
 *     des Elements, nicht gleiche Regeln an anderen Elementen). Das Feld ist Teil des Plans (Bauer ergänzt den Typ `FragebogenPlan` um `geprueft?`), geht beim JSON-Speichern
 *     und Lesen nicht verloren, und `planPruefen` ändert sich dadurch NICHT (Fehler lassen sich nicht abhaken).
 *
 * Vorbehandlung für die Textregeln doppelfrage, doppelte-verneinung, suggestiv, lang (je Text einzeln):
 *   1. Inhalt in runden und eckigen Klammern entfällt.  2. Jedes Vorkommen des Texts einer Option der Antwortliste dieser Frage (ohne Groß/klein) entfällt
 *   (so zählt die Aufzählung der Antworten im Fragetext nicht: "... sehr, ziemlich, wenig oder überhaupt nicht?").  3. Wörter = durch Leerraum getrennte Stücke mit mindestens
 *   einem Buchstaben oder einer Ziffer; Wortvergleiche ohne Groß/klein und an Wortgrenzen ("Niederlanden" enthält kein "nie").
 *
 *   doppelfrage         Bindewort de " und "/" oder ", en " and "/" or " mit der Folge: das Wort UNMITTELBAR nach dem Bindewort steht in der festen Liste
 *                         de: ihr ihre ihrem ihren ihrer ihres die der das den dem mit in für bei sind haben ist hat würden sollen
 *                         en: your the their his her my our with in for at do does did are is should would will can
 *                       (Näherung für "zwei Satzteile mit je eigener Aussage"; Fachblatt 2D gesteht die Vereinfachung ein). Kein Hinweis bei einfacher Aufzählung
 *                       ("Freunde, Verwandte oder Kollegen", "man and woman"), bei Bindewort in Klammern oder in der Optionsaufzählung. Quelle enthält "Lenzner".
 *   doppelte-verneinung (a) mindestens ZWEI Verneinungswörter im Fragetext: de nicht, kein (auch keine/keinen/keinem/keiner/keines), nie, niemals, niemand, nichts und aus der
 *                       festen Liste unzufrieden unwichtig unmöglich unnötig unfair ungerecht unglücklich unwahrscheinlich; en not, no, never, none, nobody, nothing, nowhere, jedes Wort
 *                       auf n't, und unhappy unimportant unlikely unfair unnecessary unsatisfied.  ODER (b) mindestens EIN Verneinungswort im Fragetext und eine Option (nicht
 *                       fehlend) der Frage, die Zustimmung verneint: de "lehne ... ab", "stimme ... nicht zu", "trifft ... nicht zu"; en "disagree". Quelle enthält "Lenzner".
 *   suggestiv           Fragetext (Rest nach Vorbehandlung, getrimmt) BEGINNT mit (ohne Groß/klein) de: "Stimmen Sie nicht auch zu", "Finden Sie nicht auch", "Sind Sie nicht der Meinung",
 *                       "Sind Sie nicht auch"; en: "Wouldn't you agree", "Don't you think", "Don't you agree", "Isn't it true". Der Hinweistext sagt, dass die Liste Beispiele sind
 *                       (de enthält "Beispiele", en "examples"). Quelle enthält "Lenzner".
 *   lang                mehr als 25 Wörter (genau 25 löst nicht aus). Hinweistext nennt die Schwelle 25 UND sagt, dass sie eine Faustregel ist (de "Faustregel", en "rule of thumb").
 *                       Quelle enthält "Lenzner". (Belegblatt: Schwelle ist eigene Festlegung, nicht aus der Quelle.)
 *   skala-unausgewogen  Frage/Block mit geordneter Liste (geordnet: true); die Optionen ohne `fehlend` gehören alle zu EINER der bekannten Zustimmungs-/Zufriedenheitsskalen
 *                       aus `SKALEN` (lib/fragebogen.ts, Reihen "stimme zu", "trifft zu", "zufrieden", en "agree", "satisfied"; Häufigkeitsskalen "Nie ... Immer"/"Never ... Always" werden NICHT
 *                       beurteilt); Stufen unterhalb der Mitte der 5er-Skala zählen negativ, oberhalb positiv, "Teils/teils"/"Neutral" ist die Mitte. Hinweis, wenn negative und positive Stufen
 *                       ungleich viele sind. Unbekannte Beschriftungen: kein Hinweis. Quelle enthält "Menold".
 *   mitte               geordnete Liste; gerade Zahl (mindestens 4) Stufen ohne Fehlendoptionen: Hinweis, Text enthält de "ohne Mitte" / en "no midpoint";
 *                       ungerade Zahl Stufen: kein Hinweis (Opus 08.11.: der Teil „ungerade ohne weiß nicht“ ist gestrichen - keine klare Quelle, löst bei guten ESS-Skalen aus). Sonst keiner.
 *                       Nicht geordnete Listen und Listen mit 2 Stufen: keiner. Quelle enthält "Menold".
 *   matrix-gross        Block mit mehr als 7 Items ODER Liste mit mehr als 7 Stufen (ohne Fehlendoptionen); genau 7 löst nicht aus; ein Hinweis je Block, auch wenn beides zutrifft
 *                       (Befund `block-items`/`block-stufen` aus planPruefen wird so abgebildet). Hinweistext sagt, dass 7 eine Faustregel ist (de "Faustregel", en "rule of thumb"),
 *                       und behauptet NICHT, dass es am Handy besonders schlimm sei. Quelle enthält "Couper".
 *   barriere-skala      Frage/Block mit geordneter Liste (mindestens 3 Stufen), in der eine Option (ohne `fehlend`) nur aus Ziffern besteht oder die automatische Form "3 von 5" / "3 of 5"
 *                       hat: ein Hinweis je Frage/Block, Text enthält de "Zahlen" / en "numbers". Vollständig beschriftete Skala: keiner. Quelle enthält "WCAG".
 *   barriere-bild       Befund `bild-alt` aus planPruefen (Bild ohne Alternativtext), gleiches Element. Quelle enthält "WCAG".
 *   barriere-farbe      Text einer Frage, eines Blocks, einer Hilfe (Frage.hilfe) oder einer Option nennt eine Farbwort (de grün rot gelb blau; en green red yellow blue) UND eines der Wörter
 *                       de markiert, Feld, Kreis / en marked, field, circle. Beides fehlt: keiner. Element: Frage bzw. Block. Quelle enthält "WCAG".
 *   namen / wertelabels / unerreichbar   aus planPruefen (regel beginnt mit "name-" bzw. ist `option-text`/`item-text` bzw. aus `unerreichbar(plan)`), gleiches Element.
 *   NICHT gebaut (Belegblatt: nicht belegt): skalenlaenge-wechselt, umpolung-unmarkiert. Sie dürfen nie vorkommen.
 *
 * Alle Wortlaute echter Fragen stehen unten mit Herkunft. Zwei sind durch die gelesenen GESIS-Quellen belegt (ESS-Lebenszufriedenheit, ISSP 2012 Familie, Menold & Bogner 2016, S. 1 und 8);
 * die übrigen sind Fragen nach dem Muster von ESS, ALLBUS, SOEP und ISSP, vom Prüfer nachgebildet; ihr Wortlaut ist nicht am Original geprüft und wird nicht als Originalwortlaut ausgegeben (Opus 08.11.).
 */
import { beforeAll, describe, expect, it } from 'vitest';
import type { Antwortliste, Block, Element, Frage, FragebogenPlan, Lok, Option } from './fragebogenplan';

interface QualitaetsHinweis { regel: string; element: string; text: string; quelle: string }
interface Neu { pruefeQualitaet?: (p: FragebogenPlan, sprache: string) => QualitaetsHinweis[] }
let neu: Neu = {};
beforeAll(async () => { neu = await import('./qualitaetspruefung').catch(() => ({})) as Neu; });
const pruefe = (p: FragebogenPlan, s: string): QualitaetsHinweis[] => {
  if (typeof neu.pruefeQualitaet !== 'function') throw new Error('pruefeQualitaet fehlt noch (Paket 2D)');
  return neu.pruefeQualitaet(p, s);
};
type Plan = FragebogenPlan & { geprueft?: Record<string, string[]> };

/* ------------------------------------------------------------------ Bausteine */
type Sp = 'de' | 'en';
const lok = (s: string, t: string): Lok => ({ [s]: t });
const optionen = (id: string, s: string, texte: string[], fehlend: string[] = []): Option[] => [
  ...texte.map((t, i) => ({ id: `${id}:${i + 1}`, wert: i + 1, text: lok(s, t) })),
  ...fehlend.map((t, i) => ({ id: `${id}:f${i + 1}`, wert: -8 - i, text: lok(s, t), fehlend: 'weissNicht' as const }))
];
const liste = (id: string, s: string, texte: string[], o: { geordnet?: boolean; fehlend?: string[] } = {}): Antwortliste => ({ id, name: id, geordnet: o.geordnet ?? true, optionen: optionen(id, s, texte, o.fehlend) });
const frage = (id: string, name: string, s: string, text: string, extra: Partial<Frage> = {}): Frage => ({ art: 'frage', id, name, typ: 'einfach', text: lok(s, text), kodebuch: { niveau: 'ordinal' }, ...extra });
const block = (id: string, name: string, s: string, text: string, listeId: string, itemTexte: string[], extra: Partial<Block> = {}): Block => ({
  art: 'block', id, name, text: lok(s, text), liste: listeId, kodebuch: { niveau: 'ordinal' },
  items: itemTexte.map((t, i) => ({ id: `${id}i${i + 1}`, name: `${name}${i + 1}`, text: lok(s, t) })), ...extra
});
const plan = (sprachen: string[], elemente: Element[], listen: Antwortliste[] = [], extra: Partial<FragebogenPlan> = {}): Plan => ({
  format: 'statable-fragebogen', version: 1, id: 'p-1', revision: 1, titel: Object.fromEntries(sprachen.map(s => [s, 'Test'])), sprachen,
  einstellungen: { fortschritt: true, zurueck: true, pretest: false, fehlendFilter: 'code' },
  antwortlisten: listen, skalen: [], elemente: [{ art: 'seite', id: 's1', name: 'seite1', elemente }], geaendert: 1, ...extra
});
/** Plan mit einer Frage in einer Sprache. */
const einFall = (s: Sp, text: string, opt: string[] = [], extra: Partial<Frage> = {}): Plan =>
  plan([s], [frage('q1', 'q1', s, text, { liste: opt.length ? 'l1' : undefined, ...extra })], opt.length ? [liste('l1', s, opt, { geordnet: false })] : []);
const mit = (h: QualitaetsHinweis[], regel: string) => h.filter(x => x.regel === regel);
const wortlaut = (n: number) => Array.from({ length: n }, (_, i) => `Wort${i}`).join(' ') + '?';

/* ------------------------------------------------------------------ Echte, gute Fragen (dürfen die Textregeln NICHT auslösen) */
interface Echt { s: Sp; text: string; opt: string[]; herkunft: string }
const ESS_LEBEN: Echt = { s: 'en', text: 'All things considered, how satisfied are you with your life as a whole nowadays?', opt: [], herkunft: 'ESS, Lebenszufriedenheit 0-10; Wortlaut zitiert in Menold & Bogner 2016, S. 1 (gelesen)' };
const ESS_POLITIK_EN: Echt = { s: 'en', text: 'How interested would you say you are in politics - are you very interested, quite interested, hardly interested, or not at all interested?', opt: ['Very interested', 'Quite interested', 'Hardly interested', 'Not at all interested'], herkunft: 'ESS, Interesse an Politik (nachgebildet; Wortlaut nicht am Original geprüft)' };
const ESS_POLITIK_DE: Echt = { s: 'de', text: 'Wie sehr interessieren Sie sich für Politik - sehr, ziemlich, wenig oder überhaupt nicht?', opt: ['Sehr', 'Ziemlich', 'Wenig', 'Überhaupt nicht'], herkunft: 'ESS Deutschland, Interesse an Politik (nachgebildet; Wortlaut nicht am Original geprüft)' };
const ESS_VERTRAUEN: Echt = { s: 'en', text: "Using this card, generally speaking, would you say that most people can be trusted, or that you can't be too careful in dealing with people?", opt: [], herkunft: 'ESS, Vertrauen in Menschen, 0-10 (nachgebildet; genau 25 Wörter, Grenzfall für `lang`)' };
const ESS_TREFFEN: Echt = { s: 'en', text: 'How often do you meet socially with friends, relatives or colleagues?', opt: ['Never', 'Less than once a month', 'Once a month', 'Several times a month', 'Once a week', 'Several times a week', 'Every day'], herkunft: 'ESS, soziale Treffen (nachgebildet; Wortlaut nicht am Original geprüft)' };
const SOEP_LEBEN: Echt = { s: 'de', text: 'Wie zufrieden sind Sie gegenwärtig, alles in allem, mit Ihrem Leben?', opt: [], herkunft: 'SOEP/ALLBUS-Muster Lebenszufriedenheit (nachgebildet; Wortlaut nicht am Original geprüft)' };
const ISSP_EINE: Echt = { s: 'en', text: 'One parent can bring up a child as well as two parents together.', opt: [], herkunft: 'ISSP 2012, Familie und Geschlechterrollen; zitiert in Menold & Bogner 2016, S. 8 (gelesen)' };
const ISSP_PAAR: Echt = { s: 'en', text: 'A same sex female couple can bring up a child as well as a male-female couple.', opt: [], herkunft: 'ISSP 2012; zitiert in Menold & Bogner 2016, S. 8 (gelesen)' };
const ISSP_BEIDE: Echt = { s: 'en', text: 'Both the man and woman should contribute to the household income.', opt: [], herkunft: 'ISSP Familie und Geschlechterrollen (nachgebildet; Wortlaut nicht am Original geprüft); "and" verbindet zwei Einzelwörter' };
const ECHT_FUER: Record<string, Echt[]> = {
  doppelfrage: [ESS_POLITIK_EN, ESS_POLITIK_DE, ESS_TREFFEN, ESS_VERTRAUEN, ISSP_BEIDE],
  'doppelte-verneinung': [ESS_POLITIK_EN, ESS_POLITIK_DE, ESS_VERTRAUEN, ESS_LEBEN, ISSP_EINE],
  suggestiv: [ESS_LEBEN, SOEP_LEBEN, ESS_VERTRAUEN, ISSP_PAAR],
  lang: [ESS_VERTRAUEN, ESS_POLITIK_EN, ESS_TREFFEN, ISSP_PAAR]
};

describe('pruefeQualitaet: Grundlage', () => {
  it('ein unauffälliger Plan ergibt keinen Hinweis', () => {
    expect(pruefe(einFall('de', 'Wie alt sind Sie?'), 'de')).toEqual([]);
    expect(pruefe(einFall('en', 'How old are you?'), 'en')).toEqual([]);
  });
  it('Hinweis hat Regel, Element, Text und Quelle; der Plan bleibt unverändert', () => {
    const p = einFall('en', "Don't you think that taxes are too high?");
    const vorher = JSON.stringify(p);
    const h = pruefe(p, 'en');
    expect(h.length).toBeGreaterThan(0);
    for (const x of h) { expect(x.regel).toMatch(/^[a-z-]+$/); expect(x.element.length).toBeGreaterThan(0); expect(x.text.length).toBeGreaterThan(10); expect(typeof x.quelle).toBe('string'); }
    expect(JSON.stringify(p)).toBe(vorher);
  });
  it('fehlt der Text in der verlangten Sprache, wird er übergangen (kein Absturz, kein Hinweis aus dem fremden Text)', () => {
    const p = plan(['de'], [frage('q1', 'q1', 'de', "Don't you think that taxes are too high?")]);
    expect(pruefe(p, 'en')).toEqual([]);
  });
  it('nur die verlangte Sprache wird angesehen', () => {
    const p = plan(['de', 'en'], [{ ...frage('q1', 'q1', 'de', 'Wie alt sind Sie?'), text: { de: 'Wie alt sind Sie?', en: "Don't you think that taxes are too high?" } }]);
    expect(mit(pruefe(p, 'de'), 'suggestiv')).toEqual([]);
    expect(mit(pruefe(p, 'en'), 'suggestiv').length).toBe(1);
  });
  it('der Hinweistext folgt der Sprache', () => {
    const d = pruefe(einFall('de', 'Finden Sie nicht auch, dass die Steuern zu hoch sind?'), 'de')[0]!.text;
    const e = pruefe(einFall('en', "Don't you think that taxes are too high?"), 'en')[0]!.text;
    expect(d).toMatch(/Beispiele/); expect(e).toMatch(/examples/);
  });
  it('nur bekannte Regelkennungen; die nicht belegten Regeln kommen nie vor', () => {
    const erlaubt = new Set(['doppelfrage', 'doppelte-verneinung', 'suggestiv', 'lang', 'skala-unausgewogen', 'mitte', 'matrix-gross', 'barriere-bild', 'barriere-skala', 'barriere-farbe', 'namen', 'wertelabels', 'unerreichbar']);
    const l1 = liste('l1', 'de', ['a', 'b', 'c', 'd', 'e']), l2 = liste('l2', 'de', ['a', 'b', 'c', 'd', 'e', 'f', 'g']);
    const p = plan(['de'], [
      block('b1', 'bb1', 'de', 'Block', 'l1', ['Ich bin nicht fröhlich.', 'Ich bin zufrieden.', 'Ich bin oft froh.']),
      block('b2', 'bb2', 'de', 'Block', 'l2', ['Ich bin zufrieden.', 'Ich bin glücklich.'])
    ], [l1, l2]);
    for (const x of pruefe(p, 'de')) expect(erlaubt.has(x.regel), x.regel).toBe(true);
    expect(mit(pruefe(p, 'de'), 'skalenlaenge-wechselt')).toEqual([]);
    expect(mit(pruefe(p, 'de'), 'umpolung-unmarkiert')).toEqual([]);
  });
});

describe('doppelfrage (Lenzner & Menold 2016, Abschnitt 2.6)', () => {
  const AUS: [Sp, string][] = [
    ['de', 'Wie zufrieden sind Sie mit Ihrer Arbeit und Ihrem Einkommen?'],
    ['en', 'How satisfied are you with your job and your income?'],
    ['de', 'Sind Sie mit Ihrer Wohnung zufrieden und sind Sie mit der Nachbarschaft zufrieden?'],
    ['en', 'Do you like your flat and do you feel safe in the neighbourhood?']
  ];
  for (const [s, t] of AUS) it(`löst aus (${s}): ${t}`, () => {
    const h = mit(pruefe(einFall(s, t), s), 'doppelfrage');
    expect(h.length).toBe(1); expect(h[0]!.element).toBe('q1'); expect(h[0]!.quelle).toMatch(/Lenzner/);
  });
  const NICHT: [Sp, string][] = [
    ['de', 'Wie oft treffen Sie Freunde, Verwandte oder Kollegen?'],
    ['en', 'How often do you meet friends, relatives or colleagues?'],
    ['de', 'Wie zufrieden sind Sie mit Ihrem Leben (Arbeit und Familie)?'],
    ['en', 'How satisfied are you with your life (work and family)?'],
    ['de', 'Sind Sie Mann und Frau?'],
    ['en', 'Do you agree or disagree that the economy is doing well?']
  ];
  for (const [s, t] of NICHT) it(`löst nicht aus (${s}): ${t}`, () => { expect(mit(pruefe(einFall(s, t), s), 'doppelfrage')).toEqual([]); });
  it('Bindewort in der Aufzählung der Optionen im Fragetext löst nicht aus', () => {
    expect(mit(pruefe(einFall('en', 'Is it good or the bad?', ['good', 'the bad']), 'en'), 'doppelfrage')).toEqual([]);
  });
  it('gilt auch für Blocktext und Block-Items (Element = Block bzw. Item)', () => {
    const l = liste('l1', 'de', ['trifft nicht zu', 'trifft zu']);
    const p = plan(['de'], [block('b1', 'bl', 'de', 'Bitte bewerten Sie Arbeit und Einkommen.', 'l1', ['Ich bin gesund.', 'Ich arbeite gern und ich verdiene gut.', 'Ich arbeite gern und die Bezahlung ist gut.'])], [l]);
    const h = mit(pruefe(p, 'de'), 'doppelfrage');
    expect(h.map(x => x.element)).toEqual(['b1i3']);   // Blocktext "und Einkommen" und Item 2 "und ich" lösen nicht aus, Item 3 "und die" löst aus
    const p2 = plan(['de'], [block('b1', 'bl', 'de', 'Bewerten Sie Ihre Arbeit und die Bezahlung.', 'l1', ['Ich bin gesund.'])], [l]);
    expect(mit(pruefe(p2, 'de'), 'doppelfrage').map(x => x.element)).toEqual(['b1']);
  });
  for (const e of ECHT_FUER.doppelfrage!) it(`echte gute Frage löst nicht aus: ${e.text.slice(0, 50)}... [${e.herkunft}]`, () => {
    expect(mit(pruefe(einFall(e.s, e.text, e.opt), e.s), 'doppelfrage')).toEqual([]);
  });
});

describe('doppelte-verneinung (Lenzner & Menold 2016, Abschnitt 2.7)', () => {
  const AUS: [Sp, string, string[]][] = [
    ['de', 'Es sollte nicht möglich sein, dass niemand kontrolliert wird.', []],
    ['en', 'It should not be possible that nobody is checked.', []],
    ['de', 'Sind Sie unzufrieden, weil nicht genug getan wird?', []],
    ['en', 'Are you unhappy because nothing was done?', []],
    ['de', 'Ärmere Länder sollten nicht weniger für den Umweltschutz tun müssen als reiche Länder.', ['Stimme voll zu', 'Stimme eher zu', 'Stimme eher nicht zu', 'Stimme gar nicht zu']],
    ['en', 'Poorer countries should not be expected to make less effort to protect the environment than rich countries.', ['Strongly agree', 'Agree', 'Disagree', 'Strongly disagree']],
    ['de', 'Ich habe keine Zeit für Hobbys.', ['Ich lehne ab', 'Ich stimme zu']]
  ];
  for (const [s, t, o] of AUS) it(`löst aus (${s}): ${t.slice(0, 60)}`, () => {
    const h = mit(pruefe(einFall(s, t, o), s), 'doppelte-verneinung');
    expect(h.length).toBe(1); expect(h[0]!.element).toBe('q1'); expect(h[0]!.quelle).toMatch(/Lenzner/);
  });
  const NICHT: [Sp, string, string[]][] = [
    ['de', 'Haben Sie in den letzten vier Wochen einen Arzt besucht?', []],
    ['en', 'Have you visited a doctor in the past four weeks?', []],
    ['de', 'Wie unzufrieden sind Sie mit der Politik?', []],
    ['en', 'Which of the following do you not use?', []],
    ['de', 'Welche Gründe sprechen dafür, nicht zu wählen?', []],
    ['de', 'Wie sehr interessiert Sie die Nachrichtenlage in den Niederlanden?', []],
    ['de', 'Kleine Kinder leiden, wenn die Mutter arbeitet.', ['Stimme voll zu', 'Stimme eher zu', 'Stimme eher nicht zu', 'Stimme gar nicht zu']],
    ['en', 'One parent can bring up a child as well as two parents together.', ['Strongly agree', 'Agree', 'Disagree', 'Strongly disagree']]
  ];
  for (const [s, t, o] of NICHT) it(`löst nicht aus (${s}): ${t.slice(0, 60)}`, () => { expect(mit(pruefe(einFall(s, t, o), s), 'doppelte-verneinung')).toEqual([]); });
  it('"not at all" in der Aufzählung der Optionen im Fragetext zählt nicht', () => {
    expect(mit(pruefe(einFall(ESS_POLITIK_EN.s, ESS_POLITIK_EN.text, ESS_POLITIK_EN.opt), 'en'), 'doppelte-verneinung')).toEqual([]);
  });
  for (const e of ECHT_FUER['doppelte-verneinung']!) it(`echte gute Frage löst nicht aus: ${e.text.slice(0, 50)}... [${e.herkunft}]`, () => {
    expect(mit(pruefe(einFall(e.s, e.text, e.opt), e.s), 'doppelte-verneinung')).toEqual([]);
  });
});

describe('suggestiv (Lenzner & Menold 2016, Abschnitt 2.9)', () => {
  const AUS: [Sp, string][] = [
    ['de', 'Stimmen Sie nicht auch zu, dass die Steuern zu hoch sind?'], ['de', 'Finden Sie nicht auch, dass die Steuern zu hoch sind?'],
    ['de', 'Sind Sie nicht der Meinung, dass mehr getan werden muss?'], ['de', '  finden sie nicht auch, dass es zu laut ist?'],
    ['en', "Wouldn't you agree that taxes are too high?"], ['en', "Don't you think that more should be done?"], ['en', "DON'T YOU THINK it is too loud?"]
  ];
  for (const [s, t] of AUS) it(`löst aus (${s}): ${t}`, () => {
    const h = mit(pruefe(einFall(s, t), s), 'suggestiv');
    expect(h.length).toBe(1); expect(h[0]!.quelle).toMatch(/Lenzner/); expect(h[0]!.text).toMatch(s === 'de' ? /Beispiele/ : /examples/);
  });
  const NICHT: [Sp, string][] = [
    ['de', 'Finden Sie, dass die Steuern zu hoch sind?'], ['de', 'Wie finden Sie die Höhe der Steuern?'], ['de', 'Manche fragen: Finden Sie nicht auch, es sei zu laut?'],
    ['en', 'Do you think that taxes are too high?'], ['en', 'Would you agree that taxes are too high?'], ['en', "Many people ask: don't you think so?"]
  ];
  for (const [s, t] of NICHT) it(`löst nicht aus (${s}): ${t}`, () => { expect(mit(pruefe(einFall(s, t), s), 'suggestiv')).toEqual([]); });
  for (const e of ECHT_FUER.suggestiv!) it(`echte gute Frage löst nicht aus: ${e.text.slice(0, 50)}... [${e.herkunft}]`, () => {
    expect(mit(pruefe(einFall(e.s, e.text, e.opt), e.s), 'suggestiv')).toEqual([]);
  });
});

describe('lang (Lenzner & Menold 2016, Abschnitt 2.4; Schwelle 25 ist eine eigene Festlegung)', () => {
  for (const s of ['de', 'en'] as Sp[]) {
    it(`löst aus (${s}): 26 Wörter`, () => {
      const h = mit(pruefe(einFall(s, wortlaut(26)), s), 'lang');
      expect(h.length).toBe(1); expect(h[0]!.element).toBe('q1'); expect(h[0]!.quelle).toMatch(/Lenzner/);
      expect(h[0]!.text).toMatch(/25/); expect(h[0]!.text).toMatch(s === 'de' ? /Faustregel/ : /rule of thumb/);
    });
    it(`löst nicht aus (${s}): genau 25 und 5 Wörter`, () => {
      expect(mit(pruefe(einFall(s, wortlaut(25)), s), 'lang')).toEqual([]);
      expect(mit(pruefe(einFall(s, wortlaut(5)), s), 'lang')).toEqual([]);
    });
    it(`Klammern und Optionsaufzählung zählen nicht mit (${s})`, () => {
      expect(mit(pruefe(einFall(s, wortlaut(10) + ' (' + wortlaut(30) + ')'), s), 'lang')).toEqual([]);
      expect(mit(pruefe(einFall(s, 'ja nein ' + wortlaut(24), ['ja nein']), s), 'lang')).toEqual([]);
    });
  }
  it('gilt auch für Blocktext und Block-Item', () => {
    const l = liste('l1', 'de', ['a', 'b', 'c']);
    const p = plan(['de'], [block('b1', 'bl', 'de', wortlaut(26), 'l1', ['kurz', wortlaut(30)])], [l]);
    expect(mit(pruefe(p, 'de'), 'lang').map(x => x.element).sort()).toEqual(['b1', 'b1i2']);
  });
  for (const e of ECHT_FUER.lang!) it(`echte gute Frage löst nicht aus: ${e.text.slice(0, 50)}... [${e.herkunft}]`, () => {
    expect(mit(pruefe(einFall(e.s, e.text, e.opt), e.s), 'lang')).toEqual([]);
  });
});

/* ------------------------------------------------------------------ Skalenregeln */
const AGREE_EN = ['Strongly agree', 'Agree', 'Neither agree nor disagree', 'Disagree', 'Strongly disagree'];
const AGREE_DE = ['Stimme überhaupt nicht zu', 'Stimme eher nicht zu', 'Teils/teils', 'Stimme eher zu', 'Stimme voll und ganz zu'];
const ZUFR_DE = ['Sehr unzufrieden', 'Unzufrieden', 'Teils/teils', 'Zufrieden', 'Sehr zufrieden'];
const mitListe = (s: Sp, texte: string[], o: { geordnet?: boolean; fehlend?: string[] } = {}): Plan => plan([s], [frage('q1', 'q1', s, s === 'de' ? 'Bitte bewerten Sie.' : 'Please rate.', { liste: 'l1' })], [liste('l1', s, texte, o)]);

describe('skala-unausgewogen (Menold & Bogner 2016, Abschnitt 3)', () => {
  const AUS: [Sp, string[]][] = [
    ['de', ['Stimme gar nicht zu', 'Stimme eher nicht zu', 'Teils/teils', 'Stimme eher zu']],
    ['en', ['Strongly disagree', 'Disagree', 'Neither agree nor disagree', 'Agree']],
    ['en', ['Strongly agree', 'Agree', 'Strongly disagree']],
    ['de', ['Sehr unzufrieden', 'Unzufrieden', 'Zufrieden']]
  ];
  for (const [s, o] of AUS) it(`löst aus (${s}): ${o.join(' / ')}`, () => {
    const h = mit(pruefe(mitListe(s, o), s), 'skala-unausgewogen');
    expect(h.length).toBe(1); expect(h[0]!.element).toBe('q1'); expect(h[0]!.quelle).toMatch(/Menold/);
  });
  const NICHT: [Sp, string[], { geordnet?: boolean; fehlend?: string[] }?][] = [
    ['en', ['Strongly disagree', 'Disagree', 'Agree', 'Strongly agree']],
    ['de', AGREE_DE], ['de', ZUFR_DE], ['en', AGREE_EN, { fehlend: ["Can't choose"] }],
    ['en', ['Never', 'Rarely', 'Sometimes', 'Often', 'Always']],
    ['de', ['Stimme gar nicht zu', 'Stimme eher nicht zu', 'Teils/teils', 'Stimme eher zu'], { geordnet: false }],
    ['en', ['Totally wrong', 'Rather wrong', 'Right']]
  ];
  for (const [s, o, x] of NICHT) it(`löst nicht aus (${s}): ${o.join(' / ')}${x?.geordnet === false ? ' (nicht geordnet)' : ''}`, () => { expect(mit(pruefe(mitListe(s, o, x), s), 'skala-unausgewogen')).toEqual([]); });
  it('Fehlendoptionen zählen nicht als Stufe; gilt auch für Blöcke', () => {
    const l = liste('l1', 'en', ['Strongly disagree', 'Agree'], { fehlend: ['Disagree'] });   // ohne die Fehlendoption: 1 negativ, 1 positiv
    const p = plan(['en'], [block('b1', 'bl', 'en', 'Rate', 'l1', ['x item', 'y item'])], [l]);
    expect(mit(pruefe(p, 'en'), 'skala-unausgewogen').map(h => h.element)).toEqual([]);
    const p2 = plan(['en'], [block('b1', 'bl', 'en', 'Rate', 'l1', ['x item'])], [liste('l1', 'en', ['Strongly disagree', 'Disagree', 'Agree'])]);
    expect(mit(pruefe(p2, 'en'), 'skala-unausgewogen').map(h => h.element)).toEqual(['b1']);
  });
  const ECHT_SKALEN: [string, Sp, string[], { fehlend?: string[] }, string][] = [
    ['ISSP 2012 Zustimmung (Menold & Bogner 2016, S. 8, gelesen)', 'en', AGREE_EN, { fehlend: ["Can't choose"] }, 'ISSP'],
    ['Zustimmung 5 Stufen, GESIS-Panel-/ALLBUS-Muster (nachgebildet; Wortlaut nicht am Original geprüft)', 'de', AGREE_DE, { fehlend: ['Weiß nicht'] }, 'GESIS'],
    ['Zufriedenheit 5 Stufen, SOEP-Muster (nachgebildet; Wortlaut nicht am Original geprüft)', 'de', ZUFR_DE, {}, 'SOEP']
  ];
  for (const [h, s, o, x] of ECHT_SKALEN) it(`echte gute Skala löst nicht aus: ${h}`, () => { expect(mit(pruefe(mitListe(s, o, x), s), 'skala-unausgewogen')).toEqual([]); });
});

describe('mitte (Menold & Bogner 2016, Abschnitte 6 und 7)', () => {
  it('gerade Zahl Stufen: Hinweis "ohne Mitte" (de/en)', () => {
    const de = mit(pruefe(mitListe('de', ['Stimme gar nicht zu', 'Stimme eher nicht zu', 'Stimme eher zu', 'Stimme voll zu']), 'de'), 'mitte');
    const en = mit(pruefe(mitListe('en', ['Strongly disagree', 'Disagree', 'Agree', 'Strongly agree']), 'en'), 'mitte');
    expect(de.length).toBe(1); expect(de[0]!.text).toMatch(/ohne Mitte/); expect(de[0]!.quelle).toMatch(/Menold/); expect(de[0]!.element).toBe('q1');
    expect(en.length).toBe(1); expect(en[0]!.text).toMatch(/no midpoint/);
  });
  it('gerade Zahl Stufen mit weiß-nicht-Option: Hinweis bleibt (Fehlendoption ist keine Stufe)', () => {
    expect(mit(pruefe(mitListe('en', ['Very good', 'Good', 'Bad', 'Very bad'], { fehlend: ["Don't know"] }), 'en'), 'mitte').length).toBe(1);
  });
  it('ungerade Zahl Stufen ohne weiß nicht: KEIN Hinweis (Opus 08.11.: Teil gestrichen, keine klare Quelle)', () => {
    expect(mit(pruefe(mitListe('de', AGREE_DE), 'de'), 'mitte')).toEqual([]);
    expect(mit(pruefe(mitListe('en', AGREE_EN), 'en'), 'mitte')).toEqual([]);
  });
  it('löst nicht aus: ungerade mit weiß-nicht, nicht geordnet, nur 2 Stufen', () => {
    expect(mit(pruefe(mitListe('en', AGREE_EN, { fehlend: ["Can't choose"] }), 'en'), 'mitte')).toEqual([]);
    expect(mit(pruefe(mitListe('de', AGREE_DE, { fehlend: ['Weiß nicht'] }), 'de'), 'mitte')).toEqual([]);
    expect(mit(pruefe(mitListe('de', AGREE_DE, { geordnet: false }), 'de'), 'mitte')).toEqual([]);
    expect(mit(pruefe(mitListe('de', ['Ja', 'Nein']), 'de'), 'mitte')).toEqual([]);
    expect(mit(pruefe(mitListe('en', ['Yes', 'No']), 'en'), 'mitte')).toEqual([]);
  });
  it('gilt auch für Blöcke (Element = Block)', () => {
    const p = plan(['en'], [block('b1', 'bl', 'en', 'Rate', 'l1', ['a item', 'b item'])], [liste('l1', 'en', ['Strongly disagree', 'Disagree', 'Agree', 'Strongly agree'])]);
    expect(mit(pruefe(p, 'en'), 'mitte').map(h => h.element)).toEqual(['b1']);
  });
  const ECHT: [string, Sp, string[], string[]][] = [
    ['ISSP 2012 "One parent can bring up a child ..." mit "Can\'t choose" (Menold & Bogner 2016, S. 8, gelesen)', 'en', AGREE_EN, ["Can't choose"]],
    ['ISSP 2012 "A same sex female couple ..." mit "Can\'t choose" (ebenda)', 'en', AGREE_EN, ["Can't choose", 'No answer']],
    ['Zustimmung 5 Stufen mit "Weiß nicht", GESIS-Panel-/ALLBUS-Muster (nachgebildet; Wortlaut nicht am Original geprüft)', 'de', AGREE_DE, ['Weiß nicht']]
  ];
  for (const [h, s, o, f] of ECHT) it(`echte gute Frage löst nicht aus: ${h}`, () => { expect(mit(pruefe(mitListe(s, o, { fehlend: f }), s), 'mitte')).toEqual([]); });
});

describe('matrix-gross (Couper u. a. 2013; Schwelle 7 ist eigene Festlegung)', () => {
  const items = (n: number) => Array.from({ length: n }, (_, i) => `Aussage ${i + 1}`);
  for (const s of ['de', 'en'] as Sp[]) {
    const l5 = liste('l5', s, s === 'de' ? AGREE_DE : AGREE_EN), l8 = liste('l8', s, Array.from({ length: 8 }, (_, i) => `Stufe ${i + 1}`)), l7f = liste('l7', s, Array.from({ length: 7 }, (_, i) => `Stufe ${i + 1}`), { fehlend: ['a', 'b'] });
    it(`löst aus (${s}): 8 Items`, () => {
      const h = mit(pruefe(plan([s], [block('b1', 'bl', s, 'Block', 'l5', items(8))], [l5]), s), 'matrix-gross');
      expect(h.length).toBe(1); expect(h[0]!.element).toBe('b1'); expect(h[0]!.quelle).toMatch(/Couper/);
      expect(h[0]!.text).toMatch(s === 'de' ? /Faustregel/ : /rule of thumb/); expect(h[0]!.text).not.toMatch(/Handy|Smartphone|mobile|phone/i);
    });
    it(`löst aus (${s}): 8 Stufen, und nur ein Hinweis, wenn beides zutrifft`, () => {
      expect(mit(pruefe(plan([s], [block('b1', 'bl', s, 'Block', 'l8', items(3))], [l8]), s), 'matrix-gross').length).toBe(1);
      expect(mit(pruefe(plan([s], [block('b1', 'bl', s, 'Block', 'l8', items(9))], [l8]), s), 'matrix-gross').length).toBe(1);
    });
    it(`löst nicht aus (${s}): genau 7 Items, genau 7 Stufen (Fehlendoptionen zählen nicht)`, () => {
      expect(mit(pruefe(plan([s], [block('b1', 'bl', s, 'Block', 'l5', items(7))], [l5]), s), 'matrix-gross')).toEqual([]);
      expect(mit(pruefe(plan([s], [block('b1', 'bl', s, 'Block', 'l7', items(3))], [l7f]), s), 'matrix-gross')).toEqual([]);
    });
  }
  const ISSP = (n: number) => ['One parent can bring up a child as well as two parents together.', 'A same sex female couple can bring up a child as well as a male-female couple.', 'A same sex male couple can bring up a child as well as a male-female couple.',
    'A working mother can establish just as warm and secure a relationship with her children as a mother who does not work.', 'A pre-school child is likely to suffer if his or her mother works.', 'All in all, family life suffers when the woman has a full-time job.', 'Being a housewife is just as fulfilling as working for pay.'].slice(0, n);
  for (const [n, h] of [[3, 'drei Aussagen, ISSP 2012 (Menold & Bogner 2016, S. 8, gelesen)'], [5, 'fünf Aussagen, ISSP-Familienmodul (nachgebildet; Wortlaut nicht am Original geprüft)'], [7, 'sieben Aussagen (Grenzfall), ISSP-Familienmodul (nachgebildet)']] as [number, string][])
    it(`echter guter Block löst nicht aus: ${h}`, () => {
      const l = liste('l1', 'en', AGREE_EN, { fehlend: ["Can't choose"] });
      expect(mit(pruefe(plan(['en'], [block('b1', 'bl', 'en', 'Please say how much you agree.', 'l1', ISSP(n))], [l]), 'en'), 'matrix-gross')).toEqual([]);
    });
});

describe('barriere-skala (WCAG 2.2, 1.3.1)', () => {
  for (const s of ['de', 'en'] as Sp[]) {
    it(`löst aus (${s}): Stufen nur als Zahl`, () => {
      const h = mit(pruefe(mitListe(s, ['1', '2', '3', '4', '5']), s), 'barriere-skala');
      expect(h.length).toBe(1); expect(h[0]!.element).toBe('q1'); expect(h[0]!.quelle).toMatch(/WCAG/); expect(h[0]!.text).toMatch(s === 'de' ? /Zahlen/ : /numbers/);
    });
    it(`löst aus (${s}): automatische Texte "3 von 5" / "3 of 5" belassen den Hinweis`, () => {
      const t = Array.from({ length: 5 }, (_, i) => s === 'de' ? `${i + 1} von 5` : `${i + 1} of 5`);
      t[0] = s === 'de' ? 'Gar nicht' : 'Not at all'; t[4] = s === 'de' ? 'Völlig' : 'Completely';
      expect(mit(pruefe(mitListe(s, t), s), 'barriere-skala').length).toBe(1);
    });
    it(`löst nicht aus (${s}): vollständig beschriftet; Fehlendoption mit Ziffer; nicht geordnet; nur zwei Stufen`, () => {
      expect(mit(pruefe(mitListe(s, s === 'de' ? AGREE_DE : AGREE_EN), s), 'barriere-skala')).toEqual([]);
      expect(mit(pruefe(mitListe(s, s === 'de' ? AGREE_DE : AGREE_EN, { fehlend: ['9'] }), s), 'barriere-skala')).toEqual([]);
      expect(mit(pruefe(mitListe(s, ['1', '2', '3'], { geordnet: false }), s), 'barriere-skala')).toEqual([]);
      expect(mit(pruefe(mitListe(s, ['1', '2']), s), 'barriere-skala')).toEqual([]);
    });
  }
  const ECHT: [string, Sp, string[]][] = [['ISSP 2012 (gelesen)', 'en', AGREE_EN], ['GESIS-Panel-/ALLBUS-Muster (nachgebildet)', 'de', AGREE_DE], ['SOEP-Muster Zufriedenheit (nachgebildet)', 'de', ZUFR_DE]];
  for (const [h, s, o] of ECHT) it(`echte gute, voll beschriftete Skala löst nicht aus: ${h}`, () => { expect(mit(pruefe(mitListe(s, o), s), 'barriere-skala')).toEqual([]); });
});

describe('barriere-bild, barriere-farbe (WCAG 2.2, 1.1.1 und 1.4.1)', () => {
  for (const s of ['de', 'en'] as Sp[]) {
    it(`barriere-bild löst aus (${s}): Bild ohne Alternativtext, gleiches Element`, () => {
      const p = plan([s], [frage('q1', 'q1', s, 'Welches Bild?', { bild: { datei: 'a.png', alt: {} } })]);
      const h = mit(pruefe(p, s), 'barriere-bild');
      expect(h.length).toBe(1); expect(h[0]!.element).toBe('q1'); expect(h[0]!.quelle).toMatch(/WCAG/);
    });
    it(`barriere-bild löst nicht aus (${s}): Bild mit Alternativtext`, () => {
      const p = plan([s], [frage('q1', 'q1', s, 'Welches Bild?', { bild: { datei: 'a.png', alt: lok(s, 'Ein Baum') } })]);
      expect(mit(pruefe(p, s), 'barriere-bild')).toEqual([]);
    });
  }
  const FARBE: [Sp, string][] = [
    ['de', 'Kreuzen Sie das grüne Feld an, wenn Sie zustimmen.'], ['de', 'Das rot markierte Feld bedeutet Ablehnung.'],
    ['en', 'Tick the green circle if you agree.'], ['en', 'The red marked field means disagreement.']
  ];
  for (const [s, t] of FARBE) it(`barriere-farbe löst aus (${s}) im Fragetext und in der Hilfe: ${t}`, () => {
    const h1 = mit(pruefe(einFall(s, t), s), 'barriere-farbe');
    expect(h1.length).toBe(1); expect(h1[0]!.element).toBe('q1'); expect(h1[0]!.quelle).toMatch(/WCAG/);
    const h2 = mit(pruefe(einFall(s, 'Bitte antworten.', [], { hilfe: lok(s, t) }), s), 'barriere-farbe');
    expect(h2.length).toBe(1);
  });
  it('barriere-farbe löst aus: Farbe in einer Antwortoption', () => {
    const p = einFall('de', 'Wie fühlen Sie sich?', ['Das grüne Feld', 'Das rote Feld']);
    expect(mit(pruefe(p, 'de'), 'barriere-farbe').length).toBe(1);
  });
  const OK: [Sp, string][] = [
    ['de', 'Welche Farbe hat Ihr Auto?'], ['de', 'Markieren Sie die Antwort, die auf Sie zutrifft.'], ['en', 'What colour is your car?'], ['en', 'Which parties do you vote for: the Greens or the Reds?'],
    ['en', 'How satisfied are you with your life?']
  ];
  for (const [s, t] of OK) it(`barriere-farbe löst nicht aus (${s}): ${t}`, () => { expect(mit(pruefe(einFall(s, t), s), 'barriere-farbe')).toEqual([]); });
  for (const e of [ESS_LEBEN, ESS_POLITIK_EN, ESS_POLITIK_DE, ESS_TREFFEN]) it(`echte gute Frage löst barriere-farbe nicht aus: ${e.text.slice(0, 40)}... [${e.herkunft}]`, () => {
    expect(mit(pruefe(einFall(e.s, e.text, e.opt), e.s), 'barriere-farbe')).toEqual([]);
  });
});

describe('weitergereichte Regeln: namen, wertelabels, unerreichbar', () => {
  for (const s of ['de', 'en'] as Sp[]) {
    it(`namen (${s}): ungültiger Name löst aus, gültiger nicht`, () => {
      const h = mit(pruefe(plan([s], [frage('q1', '1x', s, 'Frage')]), s), 'namen');
      expect(h.length).toBe(1); expect(h[0]!.element).toBe('q1');
      expect(mit(pruefe(plan([s], [frage('q1', 'alter', s, 'Frage')]), s), 'namen')).toEqual([]);
    });
    it(`wertelabels (${s}): Option ohne Text löst aus (Element = Option), mit Text nicht`, () => {
      const l = liste('l1', s, ['a', 'b']); l.optionen[1]!.text = {};
      const p = plan([s], [frage('q1', 'q1', s, 'Frage', { liste: 'l1' })], [l]);
      expect(mit(pruefe(p, s), 'wertelabels').map(x => x.element)).toEqual(['l1:2']);
      expect(mit(pruefe(plan([s], [frage('q1', 'q1', s, 'Frage', { liste: 'l1' })], [liste('l1', s, ['a', 'b'])]), s), 'wertelabels')).toEqual([]);
    });
    it(`unerreichbar (${s}): Bedingung auf Code außerhalb der Liste löst aus, erreichbare nicht`, () => {
      const q1 = frage('q1', 'q1', s, 'Frage', { liste: 'l1' });
      const aus = plan([s], [q1, frage('q2', 'q2', s, 'Folge', { wennGezeigt: { frage: 'q1', gewaehlt: 99 } })], [liste('l1', s, ['a', 'b'])]);
      expect(mit(pruefe(aus, s), 'unerreichbar').map(x => x.element)).toEqual(['q2']);
      const ok = plan([s], [q1, frage('q2', 'q2', s, 'Folge', { wennGezeigt: { frage: 'q1', gewaehlt: 1 } })], [liste('l1', s, ['a', 'b'])]);
      expect(mit(pruefe(ok, s), 'unerreichbar')).toEqual([]);
    });
  }
});

describe('Abhaken (plan.geprueft)', () => {
  const zwei = (): Plan => plan(['de'], [
    frage('q1', 'q1', 'de', 'Wie zufrieden sind Sie mit Ihrer Arbeit und Ihrem Einkommen?'),
    frage('q2', 'q2', 'de', 'Wie zufrieden sind Sie mit Ihrer Wohnung und Ihrer Nachbarschaft?'),
    frage('q3', 'q3', 'de', 'Finden Sie nicht auch, dass es zu laut ist?')
  ]);
  it('ohne Abhaken: alle drei Hinweise', () => {
    expect(mit(pruefe(zwei(), 'de'), 'doppelfrage').map(x => x.element)).toEqual(['q1', 'q2']);
    expect(mit(pruefe(zwei(), 'de'), 'suggestiv').map(x => x.element)).toEqual(['q3']);
  });
  it('Abhaken unterdrückt genau diese Regel an genau diesem Element', () => {
    const p = zwei(); p.geprueft = { q1: ['doppelfrage'], q3: ['doppelfrage'] };
    const h = pruefe(p, 'de');
    expect(mit(h, 'doppelfrage').map(x => x.element)).toEqual(['q2']);      // q1 abgehakt, q3 hatte die Regel nicht
    expect(mit(h, 'suggestiv').map(x => x.element)).toEqual(['q3']);        // andere Regel am abgehakten/anderen Element bleibt
  });
  it('mehrere Regeln je Element; unbekannte Kennungen und unbekannte Elemente stören nicht', () => {
    const p = zwei(); p.geprueft = { q3: ['suggestiv', 'gibtsnicht'], zzz: ['suggestiv'] };
    expect(mit(pruefe(p, 'de'), 'suggestiv')).toEqual([]);
  });
  it('bleibt nach Speichern und Lesen (JSON) erhalten und wirkt weiter', () => {
    const p = zwei(); p.geprueft = { q1: ['doppelfrage'] };
    const gelesen = JSON.parse(JSON.stringify(p)) as Plan;
    expect(gelesen.geprueft).toEqual({ q1: ['doppelfrage'] });
    expect(mit(pruefe(gelesen, 'de'), 'doppelfrage').map(x => x.element)).toEqual(['q2']);
  });
  it('gilt für weitergereichte Hinweise nach Element-id (Option) und ändert planPruefen nicht', async () => {
    const l = liste('l1', 'de', ['a', 'b']); l.optionen[1]!.text = {};
    const p = plan(['de'], [frage('q1', 'q1', 'de', 'Frage', { liste: 'l1' })], [l]); p.geprueft = { 'l1:2': ['wertelabels'] };
    expect(mit(pruefe(p, 'de'), 'wertelabels')).toEqual([]);
    const { planPruefen } = await import('./fragebogenplan');
    expect(planPruefen(p).filter(x => x.regel === 'option-text').length).toBe(1);   // Fehler lässt sich nicht abhaken
  });
  it('Hinweis erscheint wieder, wenn der Eintrag fehlt (Rücknahme)', () => {
    const p = zwei(); p.geprueft = { q1: ['doppelfrage'] }; delete p.geprueft;
    expect(mit(pruefe(p, 'de'), 'doppelfrage').length).toBe(2);
  });
});

describe('Reihenfolge', () => {
  it('Hinweise stehen in Plan-Reihenfolge der Elemente', () => {
    const p = plan(['de'], [
      frage('q1', 'q1', 'de', 'Finden Sie nicht auch, dass es zu laut ist?'),
      frage('q2', 'q2', 'de', 'Wie zufrieden sind Sie mit Ihrer Arbeit und Ihrem Einkommen?'),
      frage('q3', 'q3', 'de', 'Stimmen Sie nicht auch zu, dass es zu laut ist?')
    ]);
    expect(pruefe(p, 'de').map(x => x.element)).toEqual(['q1', 'q2', 'q3']);
  });
});
