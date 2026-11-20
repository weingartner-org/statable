import { describe, expect, it } from 'vitest';
import { findeDeutungsmarker } from './deutungsmarker';
import type { MarkerGruppe } from './deutungsmarker';

/* Sollwerte F2A: SCHNITTSTELLEN-F2.md 1.1 (Tabelle Deutsch, Regeln Englisch) und FACHBLATT-PRUEFER-VORLAGEN.md Abschnitt 8.
 * Jede Zeile der Tabelle hat mindestens einen Satz, der markiert wird (genau ein Treffer), und einen ähnlichen, der nicht markiert wird.
 * Indizes werden mit indexOf berechnet, nicht von Hand gezählt. `nach` sucht den Treffer erst hinter diesem Textstück.
 * Festlegungen, die das Blatt nicht trifft: SOLLWERTE-F2.md. */

interface Pos { text: string; treffer: string; gruppe: MarkerGruppe; satz?: string; nach?: string }
const von = (f: Pos): number => (f.nach ? f.text.indexOf(f.nach) + f.nach.length : 0);
const start = (f: Pos): number => f.text.indexOf(f.treffer, von(f));
const p = (text: string, treffer: string, gruppe: MarkerGruppe, extra: Partial<Pos> = {}): Pos => ({ text, treffer, gruppe, ...extra });

/* ---------------- Deutsch: markiert ---------------- */
const DE_POS: Pos[] = [
  // absicht
  p('Er wollte gehen.', 'wollte', 'absicht'),
  p('Sie will bleiben.', 'will', 'absicht'),
  p('Die Kinder wollten spielen.', 'wollten', 'absicht'),
  p('Er dachte lange nach.', 'dachte', 'absicht'),
  p('Sie fühlte sich fremd.', 'fühlte sich', 'absicht'),
  p('Er freute sich sehr.', 'freute sich', 'absicht'),
  p('Sie ärgerte sich laut.', 'ärgerte sich', 'absicht'),
  p('Er fand es schwierig.', 'fand es', 'absicht'),
  p('Sie hatte vor zu gehen.', 'hatte vor', 'absicht'),
  p('Sie hatte vor, früh zu gehen.', 'hatte vor', 'absicht'),
  p('Er versuchte, die Tür zu öffnen.', 'versuchte', 'absicht'),
  p('Er war froh.', 'war froh', 'absicht'),
  p('Sie war traurig.', 'war traurig', 'absicht'),
  p('Er war nervös.', 'war nervös', 'absicht'),
  p('Sie war wütend.', 'war wütend', 'absicht'),
  p('Er war unsicher.', 'war unsicher', 'absicht'),
  p('Sie war genervt.', 'war genervt', 'absicht'),
  p('Er war gelangweilt.', 'war gelangweilt', 'absicht'),
  p('Sie war sichtlich nervös.', 'war sichtlich nervös', 'absicht'),
  p('Er war sichtlich froh.', 'war sichtlich froh', 'absicht'),
  // gewissheit
  p('Er war offensichtlich müde.', 'offensichtlich', 'gewissheit'),
  p('Die offensichtliche Eile fiel auf.', 'offensichtliche', 'gewissheit'),
  p('Sie kam offenbar zu spät.', 'offenbar', 'gewissheit'),
  p('Es gab eine eindeutige Reaktion.', 'eindeutige', 'gewissheit'),
  p('Das Zeichen war eindeutig.', 'eindeutig', 'gewissheit'),
  p('OFFENSICHTLICH war er müde.', 'OFFENSICHTLICH', 'gewissheit'),
  p('Natürlich kam sie zu spät.', 'Natürlich', 'gewissheit'),
  p('Er kam, natürlich, zu spät.', 'natürlich', 'gewissheit'),
  p('Sicher, das stimmt.', 'Sicher', 'gewissheit'),
  p('Er wusste es sicher, aber nichts weiter.', 'sicher', 'gewissheit'),
  p('Klar kam sie pünktlich.', 'Klar', 'gewissheit'),
  p('Er sagte es klar, und sie ging.', 'klar', 'gewissheit'),
  // vermutung
  p('Er kam wahrscheinlich spät.', 'wahrscheinlich', 'vermutung'),
  p('Sie ist vermutlich krank.', 'vermutlich', 'vermutung'),
  p('Das war wohl ein Irrtum.', 'wohl', 'vermutung'),
  p('Er schien anscheinend müde.', 'anscheinend', 'vermutung'),
  p('Sie lächelte scheinbar.', 'scheinbar', 'vermutung'),
  p('Vielleicht kommt er noch.', 'Vielleicht', 'vermutung'),
  // begruendung
  p('Er ging, weil es regnete.', 'weil', 'begruendung'),
  p('Deshalb ging er.', 'Deshalb', 'begruendung'),
  p('Darum blieb sie.', 'Darum', 'begruendung'),
  p('Er blieb, da es spät war.', 'da', 'begruendung', { nach: 'blieb,' }),
  p('Er ging hinaus, um zu rauchen.', 'um', 'begruendung', { nach: 'hinaus,' }),
  p('Er nahm den Stift, um die Nummer sofort zu notieren.', 'um', 'begruendung', { nach: 'Stift,' }),
  p('Er ging, um schnell noch das Fenster im Raum zu öffnen.', 'um', 'begruendung', { nach: 'ging,' }),   // genau 6 Wörter zwischen um und zu
  // wertung
  p('Die Musik war zu laut.', 'zu laut', 'wertung'),
  p('Er sprach zu leise.', 'zu leise', 'wertung'),
  p('Das war unhöflich.', 'unhöflich', 'wertung'),
  p('Das ist typisch.', 'typisch', 'wertung'),
  p('Die typische Antwort kam.', 'typische', 'wertung'),
  p('Ein komischer Moment.', 'komischer', 'wertung'),
  p('Das klang komisch.', 'komisch', 'wertung'),
  p('Eine seltsame Stille.', 'seltsame', 'wertung'),
  p('Es war seltsam.', 'seltsam', 'wertung'),
  // Satzgrenzen
  p('Er ging.\nSicher wusste sie es.', 'Sicher', 'gewissheit', { satz: 'Sicher wusste sie es.' }),
  p('Er ging. Natürlich wusste sie es.', 'Natürlich', 'gewissheit', { satz: 'Natürlich wusste sie es.' }),
  p('Was nun? Deshalb blieb sie!', 'Deshalb', 'begruendung', { satz: 'Deshalb blieb sie!' }),
  p('  Er wollte gehen.  ', 'wollte', 'absicht', { satz: 'Er wollte gehen.' }),
  // wörtliche Rede nur teilweise: Marker außerhalb der Anführungszeichen zählt
  p('Er wollte sagen: „Hallo“.', 'wollte', 'absicht'),
  p('Er sagte „es ist komisch“, weil es regnete.', 'weil', 'begruendung')
];

/* ---------------- Deutsch: darf nicht markiert werden ---------------- */
const DE_NEG: string[] = [
  'Das war ein sicherer Ort.',
  'Der Himmel war klar.',
  'Eine klare Stimme sprach.',
  'Sie sprach klar.',
  'Er hielt sich sicher fest.',
  'Er kam natürlich pünktlich.',
  'Da stand ein Mann.',
  'Er stand da.',
  'Er sah, dass da jemand stand.',
  'Das war um 10 Uhr.',
  'Er hatte vor dem Haus gewartet.',
  'Das Wohlfühlen fiel ihm leicht.',
  'Er kam wohlgemerkt pünktlich.',
  'Er wohnt in Weilheim.',
  'Der Wille war stark.',
  'Sie hieß ihn willkommen.',
  'Er sprach laut.',
  'Der Raum war leise.',
  'Er ging zu Fuß.',
  'Er war müde.',
  'Er sagte, es regne.',
  'Er versuchte es noch einmal.',
  'Er versuchte es. Dann ging er zu Anna.',
  'Er ging um den Tisch, zu Anna.',
  'Er ging um den Tisch herum und setzte sich auf den Stuhl zu Anna.',   // 9 Wörter zwischen um und zu
  'Er ging, um schnell noch gleich das Fenster im Raum zu öffnen.',      // 7 Wörter zwischen um und zu
  'Er stellte das Glas auf den Tisch.',
  'Er sagte: „Ich wollte gehen, weil es regnete.“',
  'Er sagte: "Ich wollte gehen, weil es regnete."',
  'Er sagte: “Ich wollte gehen, weil es regnete.”',
  'Er sagte: »Ich wollte gehen, weil es regnete.«',
  'Er sagte: «Ich wollte gehen, weil es regnete.»',
  '„Das ist komisch, weil es offenbar regnet“, sagte er.',
  '',
  '   \n  '
];

/* ---------------- Englisch ---------------- */
const EN_POS: Pos[] = [
  p('He wanted to leave.', 'wanted', 'absicht'),
  p('She wants to stay.', 'wants', 'absicht'),
  p('He intended to go.', 'intended', 'absicht'),
  p('She thought about it.', 'thought', 'absicht'),
  p('He felt tired.', 'felt', 'absicht'),
  p('He enjoyed the music.', 'enjoyed', 'absicht'),
  p('She tried to sleep.', 'tried', 'absicht'),
  p('He was visibly nervous.', 'was visibly nervous', 'absicht'),
  p('She was happy.', 'was happy', 'absicht'),
  p('Obviously he was late.', 'Obviously', 'gewissheit'),
  p('He clearly knew the answer.', 'clearly', 'gewissheit'),
  p('Evidently she left early.', 'Evidently', 'gewissheit'),
  p('Certainly, she left early.', 'Certainly', 'gewissheit'),
  p('Of course she came.', 'Of course', 'gewissheit'),
  p('He came, of course, late.', 'of course', 'gewissheit'),
  p('He probably left.', 'probably', 'vermutung'),
  p('Presumably she knew.', 'Presumably', 'vermutung'),
  p('Apparently he left.', 'Apparently', 'vermutung'),
  p('He seemingly left.', 'seemingly', 'vermutung'),
  p('It seemed quiet.', 'seemed', 'vermutung'),
  p('Perhaps she left.', 'Perhaps', 'vermutung'),
  p('Maybe he left.', 'Maybe', 'vermutung'),
  p('He left because it rained.', 'because', 'begruendung'),
  p('Therefore he left.', 'Therefore', 'begruendung'),
  p('He left, since it was late.', 'since', 'begruendung'),
  p('He stood up in order to leave.', 'in order to', 'begruendung'),
  p('He stood up so that she could pass.', 'so that', 'begruendung'),
  p('The music was too loud.', 'too loud', 'wertung'),
  p('He spoke too quiet.', 'too quiet', 'wertung'),
  p('That was rude.', 'rude', 'wertung'),
  p('A typical answer.', 'typical', 'wertung'),
  p('A strange silence.', 'strange', 'wertung'),
  p('A weird moment.', 'weird', 'wertung'),
  p('An odd smell.', 'odd', 'wertung'),
  p('He left. Obviously she stayed.', 'Obviously', 'gewissheit', { satz: 'Obviously she stayed.' })
];
const EN_NEG: string[] = [
  'The room was loud.',
  'He was tired.',
  'She tried again.',
  'He has been here since Monday.',
  'She certainly left.',
  'He did of course arrive.',
  'The weather was clear.',
  'It was a safe place.',
  'He was thoughtful.',
  'Typically he came late.',
  'The word "because" was on the board.',
  'He said "he wanted to leave".',
  'He said: “He wanted to leave, because it rained.”',
  ''
];

function pruefeEine(f: Pos, sprache: 'de' | 'en'): void {
  const r = findeDeutungsmarker(f.text, sprache);
  expect(r).toHaveLength(1);
  const s = start(f);
  expect(s).toBeGreaterThanOrEqual(0);
  expect(r[0]).toEqual({ start: s, ende: s + f.treffer.length, treffer: f.treffer, gruppe: f.gruppe, satz: f.satz ?? f.text.trim() });
  expect(f.text.slice(r[0]!.start, r[0]!.ende)).toBe(f.treffer);
}

describe('Deutsch: markiert (je Zeile der Tabelle 1.1)', () => {
  it.each(DE_POS)('$gruppe: $treffer in „$text“', (f) => pruefeEine(f, 'de'));
  it('jede Gruppe kommt vor', () => {
    expect(new Set(DE_POS.map((f) => f.gruppe))).toEqual(new Set(['absicht', 'gewissheit', 'vermutung', 'begruendung', 'wertung']));
  });
});

describe('Deutsch: darf nicht markiert werden', () => {
  it.each(DE_NEG)('keine Stelle in „%s“', (t) => expect(findeDeutungsmarker(t, 'de')).toEqual([]));
});

describe('Englisch (mindestens 12 Fälle, markiert und nicht)', () => {
  it.each(EN_POS)('$gruppe: $treffer in „$text“', (f) => pruefeEine(f, 'en'));
  it.each(EN_NEG)('keine Stelle in „%s“', (t) => expect(findeDeutungsmarker(t, 'en')).toEqual([]));
  it('die deutsche Liste greift im Englischen nicht und umgekehrt', () => {
    expect(findeDeutungsmarker('Er wollte gehen.', 'en')).toEqual([]);
    expect(findeDeutungsmarker('He wanted to leave.', 'de')).toEqual([]);
  });
});

describe('mehrere Treffer in einem Text', () => {
  it('sortiert, mit dem richtigen Satz, ohne Überlappung', () => {
    const t = 'Er wollte gehen, weil es offenbar regnete. Sie dachte, das sei typisch.';
    const s1 = 'Er wollte gehen, weil es offenbar regnete.';
    const s2 = 'Sie dachte, das sei typisch.';
    const r = findeDeutungsmarker(t, 'de');
    expect(r.map((x) => [x.treffer, x.gruppe, x.satz])).toEqual([
      ['wollte', 'absicht', s1], ['weil', 'begruendung', s1], ['offenbar', 'gewissheit', s1], ['dachte', 'absicht', s2], ['typisch', 'wertung', s2]
    ]);
    expect(r.map((x) => x.start)).toEqual(['wollte', 'weil', 'offenbar', 'dachte', 'typisch'].map((w) => t.indexOf(w)));
    for (let i = 1; i < r.length; i++) expect(r[i]!.start).toBeGreaterThanOrEqual(r[i - 1]!.ende);
  });
  it('über Zeilenumbrüche hinweg: jede Zeile ist ein eigener Satz', () => {
    const t = 'Er kam spät\nDeshalb blieb sie\nVielleicht ging er';
    const r = findeDeutungsmarker(t, 'de');
    expect(r.map((x) => [x.treffer, x.satz])).toEqual([['Deshalb', 'Deshalb blieb sie'], ['Vielleicht', 'Vielleicht ging er']]);
  });
  it('alle einzeln markierten Sätze hintereinander ergeben genau die einzelnen Treffer', () => {
    const einzel = DE_POS.filter((f) => !f.satz && !f.text.includes('\n'));
    const t = einzel.map((f) => f.text).join(' ');
    const r = findeDeutungsmarker(t, 'de');
    expect(r.map((x) => x.treffer)).toEqual(einzel.map((f) => f.treffer));
    let versatz = 0;
    einzel.forEach((f, i) => {
      expect(r[i]!.start).toBe(versatz + start(f));
      expect(r[i]!.gruppe).toBe(f.gruppe);
      expect(r[i]!.satz).toBe(f.text.trim());
      versatz += f.text.length + 1;
    });
  });
  it('leerer Text gibt eine leere Liste', () => {
    expect(findeDeutungsmarker('', 'de')).toEqual([]);
    expect(findeDeutungsmarker('', 'en')).toEqual([]);
  });
  it('ändert den Text nicht und urteilt nicht (nur Stellen, keine weiteren Felder)', () => {
    const r = findeDeutungsmarker('Er wollte gehen.', 'de');
    expect(Object.keys(r[0]!).sort()).toEqual(['ende', 'gruppe', 'satz', 'start', 'treffer']);
  });
});
