/** Stufe A2, Teile Design-Steckbrief, Selbstprüfung, Instrumentenentwicklung, Code-Landkarte (auf dem Server gerendert, wie Ausbau-a3-ui.test.ts). */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import { s } from '../lib/sitzung.svelte';
import { pruefeQualProjekt, type QualProjekt } from '../lib/qualprojekt';
import { setzeDesign } from '../lib/mm-design';
import { setzePunkt } from '../lib/mm-selbstpruefung';
import { aendereItem, legeItemAn } from '../lib/instrument';
import { umfrageDaten } from '../lib/mixed-beispiel';
import type { DatenSicht } from '../lib/mixed';
import MmDesign from './MmDesign.svelte';
import MmSelbstpruefung from './MmSelbstpruefung.svelte';
import MmInstrument from './MmInstrument.svelte';
import CodeLandkarte from './CodeLandkarte.svelte';

s.einst.sprache = 'de'; s.einst.anrede = 'sie';
const html = (c: unknown, props: Record<string, unknown>) => (render(c as never, { props: props as never }).body as string).replace(/ ?svelte-\w+/g, '').replace(/<!--[^>]*-->/g, '').replace(/ class=""/g, '');

const hilfe = (): QualProjekt => pruefeQualProjekt(JSON.parse(readFileSync('public/beispiel/mixed/hilfe-projekt.json', 'utf8')));
const daten = (): DatenSicht => { const d = umfrageDaten(readFileSync('public/beispiel/mixed/umfrage.csv', 'utf8')); return { spalten: d.spalten as never, zeilen: d.zeilen as never }; };
const leer: DatenSicht = { spalten: [], zeilen: [] };

describe('Design-Steckbrief', () => {
  it('ohne Angaben: vier Fragen, kein Ergebnis', () => {
    const h = html(MmDesign, { q: hilfe() });
    expect((h.match(/<fieldset/g) ?? []).length).toBe(4);
    expect(h).toContain('Statable fragt und benennt; es empfiehlt kein Design.');
    expect(h).toContain('Beantworten Sie die erste Frage');
    expect(h).not.toContain('Schreibweise:');
  });
  it('erst Zahlen + Gewicht quan: Schreibweise, Name, Ablauf in Text', () => {
    const q = setzeDesign(setzeDesign(hilfe(), d => ({ ...d, reihenfolge: 'quan-zuerst' })), d => ({ ...d, gewicht: 'quan' }));
    const h = html(MmDesign, { q });
    expect(h).toContain('QUAN → qual');
    expect(h).toContain('explanatory sequential design');
    expect(h).toContain('Vertiefungsdesign');
    expect(h).toContain('Morse (1991)');
    expect(h).toContain('Schritt 1:');
    expect(h).toMatch(/aria-hidden="true"/);
    expect(h).toMatch(/<input[^>]*type="radio"[^>]*value="quan-zuerst"[^>]*checked/);
  });
  it('mehrphasig: kein Standardname, Frage zur Beschreibung', () => {
    const q = setzeDesign(hilfe(), d => ({ ...d, reihenfolge: 'mehrphasig' }));
    const h = html(MmDesign, { q });
    expect(h).toContain('keinen Standardnamen');
    expect(h).toContain('Zum Nachdenken');
    expect(h).toContain('Das sind Fragen, keine Empfehlungen.');
  });
});

describe('Selbstprüfung', () => {
  it('MMAT: sieben Punkte, kein „von 7 erfüllt“, nur Bearbeitungsstand', () => {
    const h = html(MmSelbstpruefung, { q: hilfe(), daten: leer });
    expect((h.match(/class="punkt"/g) ?? []).length).toBe(7);
    expect(h).toContain('0 von 7 Punkten bearbeitet.');
    expect(h).toContain('Keine Gesamtnote');
    expect(h).not.toMatch(/erfüllt|Gesamtpunktzahl|Punktzahl:/);
  });
  it('Punkt 5.1 auf „Ja“ gesetzt: Optionsfeld an, Zählung 1 von 7, Hinweis aus dem Projekt', () => {
    s.integration = { warum: 'Weil Zahlen und Interviews verschiedene Seiten zeigen.' };
    const q = setzePunkt(hilfe(), 'mmat', 'mmat-5-1', { stand: 'ja', fundstelle: 'Abschnitt 2' });
    const h = html(MmSelbstpruefung, { q, daten: daten() });
    expect(h).toContain('1 von 7 Punkten bearbeitet.');
    expect(h).toMatch(/<input[^>]*name="ko-mm-sp-mmat-mmat-5-1"[^>]*value="ja"[^>]*checked/);
    expect(h).toContain('Abschnitt 2');
    expect(h).toContain('Statable sieht im Projekt:');
    expect(h).toContain('Fundstelle (wo im Bericht?)');
    s.integration = {};
  });
});

describe('Instrumentenentwicklung', () => {
  it('Schritte 1 bis 3 sind da, Item-Liste erst mit Items', () => {
    const h = html(MmInstrument, { q: hilfe(), daten: leer });
    for (const t of ['Schritt 1: Items schreiben', 'Schritt 2: In einen Fragebogen-Plan übernehmen', 'Schritt 3: Nach der Erhebung: Trennschärfe prüfen']) expect(h).toContain(t);
    expect(h).toContain('Noch keine Items.');
    expect(h).not.toContain('id="ko-mm-in-liste"');
    expect(h).toContain('Item anlegen');
  });
  it('Item mit Kategorie: Tabelle mit Kategorie, Item, Herkunft, umgepolt, im Fragebogen', () => {
    const q0 = hilfe();
    const code = q0.codes.find(c => c.name.startsWith('A1'))!;
    const { q } = legeItemAn(q0, 'Ich traue mich nicht, nach Hilfe zu fragen.', { art: 'code', id: code.id }, { umgepolt: true });
    const h = html(MmInstrument, { q, daten: leer });
    expect(h).toContain('id="ko-mm-in-liste"');
    for (const t of ['Kategorie', 'Item', 'Herkunft (Beleg)', 'umgepolt', 'im Fragebogen']) expect(h).toContain(`<th scope="col">${t}</th>`);
    expect(h).toContain('A1 Embarrassment and fear of judgement');
    expect(h).toContain('Ich traue mich nicht, nach Hilfe zu fragen.');
    expect(h).toMatch(/<td>ja<\/td>\s*<td>nein<\/td>/);
    expect(h).toContain('1 Item in den Plan übernehmen');
  });
  it('Spalten zugeordnet: Joint Display mit Trennschärfe und Alpha, Satz zu Alpha und n', () => {
    const d = daten();
    let q = hilfe();
    const code = q.codes.find(c => c.name.startsWith('A1'))!;
    for (const [i, sp] of ['hs1', 'hs2', 'hs3'].entries()) {
      const r = legeItemAn(q, `Item ${i + 1}`, { art: 'code', id: code.id });
      q = aendereItem(r.q, r.id, it => ({ ...it, spalte: sp }));
    }
    const h = html(MmInstrument, { q, daten: d });
    expect(h).toContain('Joint Display: Kategorie');
    for (const t of ['Herkunft (Zitat mit Quelle)', 'Trennschärfe', 'Alpha ohne Item']) expect(h).toContain(`<th scope="col">${t}</th>`);
    expect(h).toMatch(/Cronbachs Alpha der Kategorie[^<]*: [−-]?\d,\d\d; n = \d+/);
    expect(h).toMatch(/<td>[−-]?\d,\d\d<\/td>\s*<td>[−-]?\d,\d\d<\/td>/);
    expect(h).toContain('Faktorenanalyse in Statable');
    expect(h).toContain('role="region"');
  });
});

describe('Code-Landkarte', () => {
  it('Auswahl Abstand und Einheit vor dem Knopf, Bestandteile bleiben', () => {
    const q = hilfe();
    const h = html(CodeLandkarte, { q, personen: 'alle' });
    expect(h).toContain('<label for="ko-lk-mass">Abstand</label>');
    expect(h).toContain('Jaccard: nur gemeinsames Vorkommen zählt');
    expect(h).toContain('Simple Matching: auch gemeinsames Fehlen zählt (bei 0/1 gleich Gower)');
    expect(h).toContain('<label for="ko-lk-einheit">Einheit</label>');
    expect(h).toMatch(/<option[^>]*value="faelle"[^>]*>Fälle<\/option>/);
    expect(h).toContain('id="ko-lk-zeichnen"');
    expect(h.indexOf('ko-lk-mass')).toBeLessThan(h.indexOf('ko-lk-zeichnen'));
    expect(h).not.toContain('Gruppen von Codes');
  });
});
