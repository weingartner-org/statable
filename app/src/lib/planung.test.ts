/**
 * Stufe V2 Teil 1 (Forschungsplanung): Fragen und Kennungen, Setzen ohne Vorbefüllung, Zählung ohne Note, Hinweise aus dem Projekt
 * (nie Text, nie gespeichert), Word-Dokument mit `docx-pruefen`, Englisch gleichwertig.
 */
import { describe, expect, it } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import { pruefeDocx } from '../../../scripts/docx-pruefen.mjs';
import { s } from './sitzung.svelte';
import { DMP, PREREG, KENNUNG, PLAN_LISTEN, antwortVon, bereichName, bereichZahl, fragebogenQuelle, planHinweise, planungWord, setzeAntwort, zaehlung, fragenDerListe, type Planung } from './planung';
import type { FragebogenPlan } from './fragebogenplan';

s.einst.sprache = 'de';
const wortlaut = (bytes: Uint8Array): string => {
  const doc = strFromU8(unzipSync(bytes)['word/document.xml']!);
  return [...doc.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)].map(m => m[1]!).join(' ').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
};

describe('Fragen', () => {
  it('18 und 21 Fragen, feste Kennungen, jede genau einmal, Bereiche 1 bis 6 in Reihenfolge', () => {
    expect(DMP.length).toBe(18);
    expect(PREREG.length).toBe(21);
    for (const l of PLAN_LISTEN) {
      const ks = fragenDerListe(l).map(q => q.kennung);
      expect(new Set(ks).size).toBe(ks.length);
      for (const k of ks) expect(k).toMatch(KENNUNG[l]);
      const bereiche = fragenDerListe(l).map(q => q.bereich);
      expect([...bereiche].sort((a, b) => a - b)).toEqual(bereiche);
      expect(new Set(bereiche).size).toBe(bereichZahl(l));
      for (let b = 1; b <= bereichZahl(l); b++) expect(bereichName(l, b).length).toBeGreaterThan(5);
    }
  });
  it('jede Frage hat Frage, Hilfe und Fachbegriff, auf Deutsch und Englisch verschieden', () => {
    for (const lang of ['de', 'en'] as const) {
      s.einst.sprache = lang;
      for (const q of [...DMP, ...PREREG]) {
        expect(q.frage().length).toBeGreaterThan(10);
        expect(q.hilfe().length).toBeGreaterThan(15);
        expect(q.begriff.length).toBeGreaterThan(2);
      }
    }
    s.einst.sprache = 'en';
    const en = DMP[0]!.frage();
    s.einst.sprache = 'de';
    expect(DMP[0]!.frage()).not.toBe(en);
    expect(en).toMatch(/Which data/);
  });
  it('Englisch hat keine deutschen Rückstände, Deutsch keine englischen Fragewörter am Anfang', () => {
    s.einst.sprache = 'en';
    for (const q of [...DMP, ...PREREG]) { expect(q.frage()).not.toMatch(/\b(Sie|Ihre|und|oder)\b/); expect(q.hilfe()).not.toMatch(/\b(Sie|Ihre|und|oder)\b/); }
    s.einst.sprache = 'de';
  });
  it('kein Du in den deutschen Texten', () => {
    s.einst.sprache = 'de';
    for (const q of [...DMP, ...PREREG]) expect(q.frage() + ' ' + q.hilfe()).not.toMatch(/\b(du|dein|deine|dir|dich)\b/i);
  });
});

describe('Eintragen und Zählen', () => {
  it('ohne Stand und ohne Text wird nichts gespeichert', () => {
    expect(setzeAntwort(undefined, 'dmp', 'dmp-1-1', {})).toBeUndefined();
    expect(setzeAntwort(undefined, 'dmp', 'dmp-1-1', { text: '   ' })).toBeUndefined();
  });
  it('Text allein zählt nicht als bearbeitet; Stand schon; Zurücknehmen entfernt, Text bleibt', () => {
    let p: Planung[] | undefined = setzeAntwort(undefined, 'dmp', 'dmp-1-1', { text: ' Fragebogen ' }, 5);
    expect(antwortVon(p, 'dmp', 'dmp-1-1')).toEqual({ kennung: 'dmp-1-1', text: 'Fragebogen', geaendert: 5 });
    expect(zaehlung(p, 'dmp')).toEqual({ n: 18, bearbeitet: 0, nochOffen: 18 });
    p = setzeAntwort(p, 'dmp', 'dmp-1-1', { stand: 'ausgefuellt' }, 6);
    expect(zaehlung(p, 'dmp')).toEqual({ n: 18, bearbeitet: 1, nochOffen: 17 });
    p = setzeAntwort(p, 'dmp', 'dmp-1-2', { stand: 'nicht-zutreffend' }, 7);
    expect(zaehlung(p, 'dmp').bearbeitet).toBe(2);
    p = setzeAntwort(p, 'dmp', 'dmp-1-2', { stand: 'offen' }, 8);
    expect(zaehlung(p, 'dmp').bearbeitet).toBe(1);
    p = setzeAntwort(p, 'dmp', 'dmp-1-1', { stand: null }, 9);
    expect(antwortVon(p, 'dmp', 'dmp-1-1')?.text).toBe('Fragebogen');
    expect(zaehlung(p, 'dmp').bearbeitet).toBe(0);
  });
  it('Listen und Antworten bleiben sortiert, Eingabe wird nicht verändert, leere Listen fallen weg', () => {
    const a = setzeAntwort(undefined, 'prereg', 'pre-5-1', { stand: 'ausgefuellt' }, 1);
    const eingefroren = JSON.stringify(a);
    const b = setzeAntwort(a, 'dmp', 'dmp-6-1', { stand: 'ausgefuellt' }, 2);
    const c = setzeAntwort(b, 'dmp', 'dmp-1-3', { stand: 'ausgefuellt' }, 3);
    expect(JSON.stringify(a)).toBe(eingefroren);
    expect(c!.map(x => x.liste)).toEqual(['dmp', 'prereg']);
    expect(c![0]!.antworten.map(x => x.kennung)).toEqual(['dmp-1-3', 'dmp-6-1']);
    const d = setzeAntwort(setzeAntwort(c, 'dmp', 'dmp-1-3', { stand: null }, 4), 'dmp', 'dmp-6-1', { stand: null }, 5);
    expect(d!.map(x => x.liste)).toEqual(['prereg']);
    expect(setzeAntwort(d, 'prereg', 'pre-5-1', { stand: null }, 6)).toBeUndefined();
  });
  it('unbekannte Frage wird abgelehnt, auch eine der anderen Liste', () => {
    expect(() => setzeAntwort(undefined, 'dmp', 'xyz', { text: 'a' })).toThrow();
    expect(() => setzeAntwort(undefined, 'dmp', 'pre-1-1', { text: 'a' })).toThrow();
  });
  it('keine Note und kein Prozentwert in der Zählung', () => {
    const z = zaehlung(undefined, 'prereg');
    expect(Object.keys(z).sort()).toEqual(['bearbeitet', 'n', 'nochOffen']);
  });
});

function fragebogen(): FragebogenPlan {
  const lok = { de: 'GEHEIMER FRAGETEXT' };
  return {
    format: 'statable-fragebogen', version: 1, id: 'p1', revision: 1, titel: lok, sprachen: ['de', 'en'], einwilligung: { text: lok, pflicht: true },
    einstellungen: { fortschritt: true, zurueck: true, pretest: false, fehlendFilter: 'code' },
    antwortlisten: [{ id: 'l1', name: 'L', geordnet: true, optionen: [] }],
    skalen: [{ id: 's1', name: 'S', items: ['a', 'b'], bildung: 'mittelwert', mindestens: 2 }],
    elemente: [
      { art: 'seite', id: 'sa', name: 'A', elemente: [
        { art: 'frage', id: 'q1', name: 'q1', typ: 'zahl', text: lok, pflicht: { an: true }, kodebuch: { niveau: 'skala' } },
        { art: 'frage', id: 'q2', name: 'q2', typ: 'text', text: lok, kodebuch: { niveau: 'nominal' } },
        { art: 'hinweis', id: 'h1', name: 'h1', text: lok },
      ] },
      { art: 'seite', id: 'sb', name: 'B', elemente: [
        { art: 'block', id: 'b1', name: 'b1', text: lok, liste: 'l1', items: [{ id: 'i1', name: 'i1', text: lok }, { id: 'i2', name: 'i2', text: lok }, { id: 'i3', name: 'i3', text: lok }], kodebuch: { niveau: 'skala' } },
      ] },
    ],
    empfaenger: { schluessel: 'age1abc', name: 'X' }, codeVerlangt: true, geaendert: 1,
  } as unknown as FragebogenPlan;
}

describe('Hinweise aus dem Projekt', () => {
  it('Zahlen aus dem Fragebogen-Plan, ohne Text', () => {
    expect(fragebogenQuelle(fragebogen())).toEqual({ seiten: 2, fragen: 2, itemsInBloecken: 3, sprachen: 2, skalen: 1, pflichtfragen: 1, einwilligungsfrage: true, verschluesselt: true, einmalCodes: true });
  });
  it('ohne Quellen nur der Hinweis zum Speicherort; nichts steht in der Datei', () => {
    const h = planHinweise({});
    expect(Object.keys(h)).toEqual(['dmp-3-1']);
  });
  it('Fragebogen, qualitatives Projekt und Datensatz erzeugen Hinweise an den richtigen Fragen mit Zahlen', () => {
    s.einst.sprache = 'de';
    const h = planHinweise({
      fragebogen: fragebogenQuelle(fragebogen()),
      qual: { dokumente: 6, transkripte: 5, faelle: 5, einwilligungen: 3, mitWiderruf: 1, mitLoeschfrist: 2, kodierende: 2, kiAngabe: 'nein' },
      datensatz: { zeilen: 312, spalten: 18, mitBeschriftung: 12, fehlendCodes: 2 },
    });
    const text = (k: string) => (h[k] ?? []).map(x => x.text).join(' | ');
    expect(text('dmp-1-1')).toMatch(/5 Fragen und Items.*2 Sprachen/);
    expect(text('dmp-1-1')).toMatch(/6 Dokumente, davon 5 Transkripte/);
    expect(text('dmp-1-2')).toMatch(/312 Fälle, 18 Spalten/);
    expect(text('dmp-2-1')).toMatch(/12 von 18 Spalten/);
    expect(text('dmp-4-1')).toMatch(/Einwilligungsfrage/);
    expect(text('dmp-4-1')).toMatch(/Einwilligungen erfasst: 3, davon mit Widerruf: 1/);
    expect(text('dmp-3-3')).toMatch(/verschlüsselt/);
    expect(text('dmp-5-3')).toMatch(/2 Einwilligungen/);
    expect(text('pre-3-3')).toMatch(/312 Fälle/);
    expect(text('pre-4-3')).toMatch(/1 Skala/);
    expect(text('pre-6-2')).toMatch(/qualitative/);
    for (const k of Object.keys(h)) expect([...DMP, ...PREREG].some(q => q.kennung === k)).toBe(true);
  });
  it('nie Text aus dem Fragebogen oder dem Projekt, auch nicht im englischen Hinweis', () => {
    for (const lang of ['de', 'en'] as const) {
      s.einst.sprache = lang;
      const h = planHinweise({ fragebogen: fragebogenQuelle(fragebogen()), qual: { dokumente: 1, transkripte: 1, faelle: 1, einwilligungen: 1, mitWiderruf: 0, mitLoeschfrist: 0, kodierende: 1 }, datensatz: { zeilen: 1, spalten: 1, mitBeschriftung: 0, fehlendCodes: 0 } });
      expect(JSON.stringify(h)).not.toMatch(/GEHEIM/);
    }
    s.einst.sprache = 'de';
  });
  it('Einzahl stimmt (eine Frage, ein Fall)', () => {
    s.einst.sprache = 'de';
    const h = planHinweise({ datensatz: { zeilen: 1, spalten: 1, mitBeschriftung: 1, fehlendCodes: 1 } });
    expect(h['dmp-1-2']![0]!.text).toBe('Datensatz: 1 Fall, 1 Spalte.');
    expect(h['dmp-2-1']![0]!.text).toMatch(/1 Fehlend-Code ist benannt/);
  });
});

describe('Word', () => {
  it('gültiges Dokument mit Quellenhinweis, Rechtshinweis, Bereichen, Antworten und Stand; kein Hinweis von Statable', async () => {
    s.einst.sprache = 'de';
    let p = setzeAntwort(undefined, 'prereg', 'pre-1-1', { text: 'Lernen mit Karten', stand: 'ausgefuellt' }, 1);
    p = setzeAntwort(p, 'prereg', 'pre-2-3', { stand: 'nicht-zutreffend' }, 2);
    const bytes = await planungWord('Studie A', p, 'prereg', 'de');
    expect(await pruefeDocx(bytes)).toBeTruthy();
    const t = wortlaut(bytes);
    expect(t).toMatch(/Präregistrierung/);
    expect(t).toMatch(/Center for Open Science/);
    expect(t).toMatch(/keine Rechtsberatung/);
    expect(t).toMatch(/2 von 21 Fragen bearbeitet/);
    expect(t).toMatch(/Lernen mit Karten/);
    expect(t).toMatch(/Trifft nicht zu\./);
    expect(t).toMatch(/\(noch nicht beantwortet\)/);
    expect(t).toMatch(/6\. Sonstiges/);
    expect(t).not.toMatch(/Statable weiß/);
  });
  it('englische Fassung des Datenmanagementplans', async () => {
    s.einst.sprache = 'en';
    const bytes = await planungWord('Study B', undefined, 'dmp', 'en');
    expect(await pruefeDocx(bytes)).toBeTruthy();
    const t = wortlaut(bytes);
    expect(t).toMatch(/Data management plan/);
    expect(t).toMatch(/0 of 18 questions worked on/);
    expect(t).toMatch(/not legal advice/);
    expect(t).not.toMatch(/\bSie\b/);
    s.einst.sprache = 'de';
  });
});
