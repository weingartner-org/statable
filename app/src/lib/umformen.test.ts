import { describe, expect, it } from 'vitest';
import { nodeEngine } from './testengine';
import { leseVerzeichnis, type Spalte } from './verzeichnis';
import { neuAufbauen, type Wert } from './eingabe';
import { breitZuLang, langZuBreit, leiteBeschriftungenAb, schlageGruppenVor, schlageLangVor, type BreitLang, type Daten } from './umformen';

const sp = (name: string, rest: Partial<Spalte> = {}): Spalte => ({ name, bezeichnung: '', art: 'zahl', niveau: 'metrisch', format: 'F8.0', fehlend: [], fehlendText: '', werteLabels: {}, ...rest });
const text = (name: string) => sp(name, { art: 'text', niveau: 'nominal', format: 'A3' });

/* Fünf Personen, zwei Zeitpunkte; Text-Kennung, Gruppe mit Wertelabels, ein fehlender Wert, 99 = keine Angabe in t2. */
const BREIT: Daten = {
  spalten: [text('id'), sp('gruppe', { niveau: 'nominal', werteLabels: { '1': 'Kontrolle', '2': 'Training' } }),
    sp('wissen_t1', { bezeichnung: 'Wissen (vorher)', fehlend: [99], fehlendText: '99', werteLabels: {} }), sp('wissen_t2', { bezeichnung: 'Wissen (nachher)', fehlend: [99], fehlendText: '99' })],
  zeilen: [['P01', 1, 5, 7], ['P02', 2, 4, 99], ['P03', 1, null, 6], ['P04', 2, 3, 5], ['P05', 1, 6, 8]]
};
const OPT: BreitLang = { messspalten: ['wissen_t1', 'wissen_t2'], zeitLabels: ['1', '2'], kennung: 'id', kennungName: '', zeitName: 'zeit', wertName: 'wissen', zeitAls: 'nummer' };

describe('breit → lang', () => {
  it('eine Zeile je Person und Zeitpunkt, Gruppe läuft mit, fehlende Werte bleiben fehlend', () => {
    const r = breitZuLang(BREIT, OPT);
    expect(r.spalten.map(s => s.name)).toEqual(['id', 'gruppe', 'zeit', 'wissen']);
    expect(r.zeilen).toHaveLength(10);
    expect(r.zeilen.slice(0, 4)).toEqual([['P01', 1, 1, 5], ['P01', 1, 2, 7], ['P02', 2, 1, 4], ['P02', 2, 2, 99]]);
    expect(r.zeilen[4]).toEqual(['P03', 1, 1, null]);
    const w = r.spalten[3]!;
    expect(w.fehlend).toEqual([99]);            // gleiche „keine Angabe“ in beiden Spalten → bleibt
    expect(w.niveau).toBe('metrisch');
    expect(r.spalten[1]!.werteLabels).toEqual({ '1': 'Kontrolle', '2': 'Training' });
    expect(r.hinweise).toEqual([]);
  });
  it('neue Kennung: Zeilennummer; Zeitpunkt als Text; Beschriftungen als Wertelabels', () => {
    const neu = breitZuLang(BREIT, { ...OPT, kennung: null, kennungName: 'Person', zeitLabels: ['vorher', 'nachher'] });
    expect(neu.spalten.map(s => s.name)).toEqual(['Person', 'id', 'gruppe', 'zeit', 'wissen']);
    expect(neu.zeilen[2]!.slice(0, 2)).toEqual([2, 'P02']);
    expect(neu.spalten[3]!.werteLabels).toEqual({ '1': 'vorher', '2': 'nachher' });
    expect(neu.spalten[0]!.bezeichnung).toBe('');
    const t = breitZuLang(BREIT, { ...OPT, zeitLabels: ['vorher', 'nachher'], zeitAls: 'text' });
    expect(t.spalten[2]!.art).toBe('text'); expect(t.zeilen[1]![2]).toBe('nachher');
  });
  it('unterschiedliche „keine Angabe“ werden zu leeren Feldern; gemischte Arten werden Text; Namen bleiben frei', () => {
    const d: Daten = { spalten: [sp('a', { fehlend: [9] }), sp('b', { fehlend: [-1] })], zeilen: [[9, 1], [2, -1]] };
    const r = breitZuLang(d, { ...OPT, messspalten: ['a', 'b'], zeitLabels: ['', ''], kennung: null, kennungName: 'person', wertName: 'Wert in Punkten', zeitName: 'zeit' });
    expect(r.zeilen.map(z => z[2])).toEqual([null, 1, 2, null]);
    expect(r.hinweise).toContainEqual({ art: 'fehlendAngeglichen' });
    expect(r.spalten[2]!.name).toBe('Wert_in_Punkten'); expect(r.spalten[2]!.bezeichnung).toBe('Wert in Punkten');
    const g = breitZuLang({ spalten: [sp('a'), text('b')], zeilen: [[1, 'x']] }, { ...OPT, messspalten: ['a', 'b'], zeitLabels: ['', ''], kennung: null });
    expect(g.spalten.at(-1)!.art).toBe('text'); expect(g.zeilen[0]!.at(-1)).toBe('1'); expect(g.hinweise).toContainEqual({ art: 'gemischt' });
  });
  it('belegte Namen bekommen eine Nummer', () => {
    const r = breitZuLang(BREIT, { ...OPT, zeitName: 'gruppe', wertName: 'id' });
    expect(r.spalten.map(s => s.name)).toEqual(['id', 'gruppe', 'gruppe_2', 'id_2']);
  });
});

describe('lang → breit', () => {
  const lang = breitZuLang(BREIT, OPT);
  it('Rundreise breit → lang → breit ergibt das Original (ohne „keine Angabe“-Umwandlung)', () => {
    const zurueck = langZuBreit(lang, { kennung: 'id', zeit: 'zeit', werte: ['wissen'], zeitNamen: 'nummern' });
    expect(zurueck.spalten.map(s => s.name)).toEqual(['id', 'gruppe', 'wissen_1', 'wissen_2']);
    expect(zurueck.zeilen).toEqual(BREIT.zeilen);
    expect(zurueck.spalten[2]!.fehlend).toEqual([99]);
    expect(zurueck.hinweise).toEqual([]);
  });
  it('Zeitpunkt-Namen aus den Wertelabels; fehlende Kombinationen werden leer; Zeilen ohne Kennung fallen weg', () => {
    const d: Daten = {
      spalten: [text('id'), sp('zeit', { werteLabels: { '1': 'vorher', '2': 'nachher' } }), sp('w')],
      zeilen: [['a', 1, 5], ['a', 2, 6], ['b', 1, 4], ['c', 2, 8], [null, 1, 9]]
    };
    const r = langZuBreit(d, { kennung: 'id', zeit: 'zeit', werte: ['w'], zeitNamen: 'namen' });
    expect(r.spalten.map(s => s.name)).toEqual(['id', 'w_vorher', 'w_nachher']);
    expect(r.zeilen).toEqual([['a', 5, 6], ['b', 4, null], ['c', null, 8]]);
    expect(r.hinweise).toEqual([{ art: 'ohneKennung', anzahl: 1 }]);
  });
  it('mehrere Messwert-Spalten: je Messwert alle Zeitpunkte; Text-Zeitpunkte in der Reihenfolge des Auftretens', () => {
    const d: Daten = { spalten: [sp('nr'), text('zp'), sp('x'), sp('y')], zeilen: [[1, 'prae', 1, 10], [1, 'post', 2, 20], [2, 'prae', 3, 30], [2, 'post', 4, 40]] };
    const r = langZuBreit(d, { kennung: 'nr', zeit: 'zp', werte: ['x', 'y'], zeitNamen: 'namen' });
    expect(r.spalten.map(s => s.name)).toEqual(['nr', 'x_prae', 'x_post', 'y_prae', 'y_post']);
    expect(r.zeilen).toEqual([[1, 1, 2, 10, 20], [2, 3, 4, 30, 40]]);
    expect(r.spalten[1]!.bezeichnung).toBe('x (prae)');
  });
  it('Doppelte Kombinationen: die erste zählt; Spalten, die sich in einer Person ändern, fallen weg', () => {
    const d: Daten = { spalten: [sp('p'), sp('t'), sp('w'), sp('alter'), sp('ort')], zeilen: [[1, 1, 5, 20, 1], [1, 1, 9, 20, 1], [1, 2, 6, 21, 1], [2, 1, 4, 30, 2]] };
    const r = langZuBreit(d, { kennung: 'p', zeit: 't', werte: ['w'], zeitNamen: 'nummern' });
    expect(r.zeilen).toEqual([[1, 1, 5, 6], [2, 2, 4, null]]);
    expect(r.spalten.map(s => s.name)).toEqual(['p', 'ort', 'w_1', 'w_2']);
    expect(r.hinweise).toContainEqual({ art: 'doppelt', anzahl: 1 });
    expect(r.hinweise).toContainEqual({ art: 'variiert', spalten: ['alter'] });
  });
});

describe('Vorschläge', () => {
  it('gemeinsamer Stamm mit Zahl: t1_wissen, t2_wissen / wissen_t1, wissen_t2 / item1 … item3', () => {
    const g = schlageGruppenVor(['id', 'alter', 't1_wissen', 't2_wissen', 'x_a1', 'x_a2', 'x_a3'].map(n => sp(n)));
    expect(g.find(x => x.spalten[0] === 't1_wissen')).toMatchObject({ stamm: 'wissen', spalten: ['t1_wissen', 't2_wissen'], labels: ['1', '2'] });
    expect(g.find(x => x.spalten[0] === 'x_a1')).toMatchObject({ spalten: ['x_a1', 'x_a2', 'x_a3'], stamm: 'x' });
    expect(schlageGruppenVor(['wissen_t1', 'wissen_t2'].map(n => sp(n)))[0]).toMatchObject({ stamm: 'wissen' });
  });
  it('Zeitwörter: prae/post, vorher/nachher; Text-Spalten werden nicht vorgeschlagen', () => {
    const g = schlageGruppenVor(['id', 'angst_prae', 'angst_post', 'mut_vorher', 'mut_nachher'].map(n => sp(n)));
    expect(g.map(x => [x.stamm, x.spalten])).toEqual(expect.arrayContaining([['angst', ['angst_prae', 'angst_post']], ['mut', ['mut_vorher', 'mut_nachher']]]));
    expect(schlageGruppenVor([text('a1'), text('a2')])).toEqual([]);
  });
  it('Beschriftungen aus den Namen', () => {
    expect(leiteBeschriftungenAb(['wissen_t1', 'wissen_t2'])).toEqual({ labels: ['1', '2'], stamm: 'wissen' });
    expect(leiteBeschriftungenAb(['t1_wissen', 't2_wissen', 't3_wissen'])).toEqual({ labels: ['1', '2', '3'], stamm: 'wissen' });
    expect(leiteBeschriftungenAb(['angst_prae', 'angst_post']).labels).toEqual(['prae', 'post']);
    expect(leiteBeschriftungenAb(['alter', 'gewicht']).labels).toEqual(['alter', 'gewicht']);
  });
});

describe('mit der Engine', () => {
  it('das Ergebnis lässt sich laden: Labels, Niveaus, „keine Angabe“ und Texte kommen an', async () => {
    const e = await nodeEngine();
    const r = breitZuLang(BREIT, { ...OPT, zeitLabels: ['vorher', 'nachher'] });
    const { syntax, csv } = neuAufbauen(r.spalten, r.zeilen as Wert[][]);
    const items = e.run('NEW FILE.\n' + syntax, { '/eingabe.csv': csv });
    expect(items.filter(i => i.type === 'message' && i.severity === 'error')).toEqual([]);
    const v = leseVerzeichnis(e.run('DISPLAY DICTIONARY.'));
    expect(v.map(x => x.name)).toEqual(['id', 'gruppe', 'zeit', 'wissen']);
    expect(v[2]!.werteLabels).toEqual({ '1': 'vorher', '2': 'nachher' });
    expect(v[3]!.fehlend).toEqual([99]);
    expect(v[0]!.art).toBe('text');
  });
});

describe('Erkennen: schon lang?', () => {
  it('Kennung, Zeitpunkt und Messwert werden erkannt; die breite Tabelle nicht', () => {
    const lang = breitZuLang(BREIT, { ...OPT, zeitLabels: ['1', '2'] });
    expect(schlageLangVor(lang)).toEqual({ kennung: 'id', zeit: 'zeit', werte: ['wissen'] });
    expect(schlageLangVor(BREIT)).toBeNull();
  });
});
