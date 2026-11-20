import { describe, expect, it } from 'vitest';
import type { Dokument } from './qualprojekt';
import { pruefeTranskript, type Hinweis, type RegelArt } from './transkript-pruefen';

/* Fachblatt Stufe 4B (docs/erheben/FACHBLATT-STUFE-4.md), Belege: docs/erheben/BELEGE-TRANSKRIPTION.md
 * (Dresing und Pehl, Praxisbuch, 8. Aufl. 2018 und 9. Aufl. 2024).
 * Die Tests sind absichtlich ROT, bis lib/transkript-pruefen.ts und lib/qualprojekt.ts gebaut sind.
 *
 * API (der Bauer legt sie in app/src/lib/transkript-pruefen.ts an):
 *   export type RegelArt = 'sprecher-fehlt'|'sprecherwechsel-im-absatz'|'zeitmarke-fehlt'|'zeit-rueckwaerts'|'unverstaendlich-ohne-zeit'|'rezeptionssignal'|'schreibweise'|'wortabbruch'|'pause-form'|'lautaeusserung-form'|'langer-beitrag'|'name-unbenannt';
 *   export interface Hinweis { art: RegelArt; abschnitt: number; start: number; ende: number; satz: string; vorschlag?: string; herkunft: 'dresing-pehl'|'statable' }   // start/ende: Codepoints in dokument.text, Ende exklusiv
 *   export function pruefeTranskript(dok: Dokument, regeln: 'einfach'|'erweitert', sprache: 'de'|'en'): Hinweis[];
 *
 * Festlegungen dieser Tests (Fragen an Opus stehen in BELEGE-TRANSKRIPTION.md):
 *  - "Hat Zeit": abschnitt.zeitMs oder abschnitt.bisMs gesetzt, ODER eine f4-Marke #hh:mm:ss-d# im Text des Beitrags.
 *  - Hinweis hat zusätzlich herkunft: 'dresing-pehl' | 'statable' (Entscheid 7). RegelArt enthält fuellwort NICHT mehr, dafür 'rezeptionssignal' und 'schreibweise' (Entscheid 2).
 *  - ANNAHME: transkript.sprecher[].rolle?: 'interview' | 'befragt' | 'andere' (für rezeptionssignal; im Architekturblatt noch nicht, kommt aus der Sprecher-Zuordnung 4A). Im Testhelfer: Kennung I = interview, alle anderen = befragt.
 *  - Der Prüfer ändert das Dokument nie (Tiefenvergleich).
 *  - start/ende eines Hinweises zeigen auf die genaue Stelle (Codepoints), nicht auf den ganzen Beitrag, wo eine Stelle gemeint ist.
 */

interface B { k?: string; t: string; zeitMs?: number; bisMs?: number }

const cp = (s: string) => Array.from(s).length;
const schnitt = (dok: Dokument, h: Hinweis) => Array.from(dok.text).slice(h.start, h.ende).join('');

/** Baut ein Dokument: je Beitrag "Kennung: Text", Beiträge durch Leerzeile. Der Name eines Sprechers ist gleich seiner Kennung. */
function baue(beitraege: B[]): Dokument {
  let text = '';
  const abschnitte: NonNullable<Dokument['transkript']>['abschnitte'] = [];
  beitraege.forEach((b, i) => {
    if (i > 0) text += '\n\n';
    const start = cp(text);
    text += b.k ? `${b.k}: ${b.t}` : b.t;
    const a: (typeof abschnitte)[number] = { start, ende: cp(text) };
    if (b.k) a.sprecher = b.k;
    if (b.zeitMs !== undefined) a.zeitMs = b.zeitMs;
    if (b.bisMs !== undefined) a.bisMs = b.bisMs;
    abschnitte.push(a);
  });
  const kennungen = [...new Set(beitraege.map((b) => b.k).filter((k): k is string => !!k))];
  return {
    id: 'd1', name: 'Test', art: 'audio', text, erstellt: 0, geaendert: 0,
    transkript: { sprecher: kennungen.map((k) => ({ id: k, name: k, rolle: k === 'I' ? 'interview' : 'befragt' })), abschnitte },
  } as Dokument;
}

const arten = (hs: Hinweis[], art: RegelArt) => hs.filter((h) => h.art === art);

describe('Allgemeines', () => {
  it('ändert das Dokument nie', () => {
    const d = baue([{ k: 'I', t: 'Wie war das?' }, { k: 'B', t: 'also ... ja [lacht] Sor- Gedanken' }, { t: 'ohne Kennung' }]);
    const vorher = JSON.parse(JSON.stringify(d));
    pruefeTranskript(d, 'einfach', 'de');
    pruefeTranskript(d, 'erweitert', 'en');
    expect(d).toEqual(vorher);
  });
  it('ein sauberes Transkript ergibt keine Hinweise', () => {
    const d = baue([
      { k: 'I', t: 'Wie war das?', zeitMs: 0, bisMs: 3000 },
      { k: 'B', t: 'Gut, ich war (lacht) zufrieden. (...) Danach ging es weiter.', zeitMs: 3000, bisMs: 12000 },
    ]);
    expect(pruefeTranskript(d, 'einfach', 'de')).toEqual([]);
    expect(pruefeTranskript(d, 'erweitert', 'de')).toEqual([]);
  });
  it('jeder Hinweis hat einen Satz, und Stelle liegt im Text; Satz in en ist ein anderer als in de', () => {
    const d = baue([{ k: 'I', t: 'Wie war das?' }, { k: 'B', t: 'Gut.' }, { t: 'ohne Kennung' }]);
    const de = pruefeTranskript(d, 'einfach', 'de');
    const en = pruefeTranskript(d, 'einfach', 'en');
    expect(de.length).toBeGreaterThan(0);
    expect(en.length).toBe(de.length);
    for (const h of de) {
      expect(h.satz.length).toBeGreaterThan(5);
      expect(h.start).toBeGreaterThanOrEqual(0);
      expect(h.ende).toBeGreaterThanOrEqual(h.start);
      expect(h.ende).toBeLessThanOrEqual(cp(d.text));
    }
    expect(en[0]!.satz).not.toBe(de[0]!.satz);
  });
});

describe('sprecher-fehlt (8. Aufl. R. 14 und 11; 9. Aufl. R. 5)', () => {
  const regeln = ['einfach', 'erweitert'] as const;
  for (const r of regeln) {
    it(`Treffer: Beitrag ohne Kennung, obwohl andere eine haben (${r})`, () => {
      const d = baue([{ k: 'I', t: 'Frage?' }, { k: 'B', t: 'Antwort.' }, { t: 'Noch ein Beitrag ohne Kennung.' }]);
      const hs = arten(pruefeTranskript(d, r, 'de'), 'sprecher-fehlt');
      expect(hs).toHaveLength(1);
      expect(hs[0]!.abschnitt).toBe(2);
    });
  }
  it('Nicht-Treffer: niemand hat eine Kennung (reiner Text)', () => {
    const d = baue([{ t: 'Ein Absatz.' }, { t: 'Noch ein Absatz.' }]);
    expect(arten(pruefeTranskript(d, 'einfach', 'de'), 'sprecher-fehlt')).toEqual([]);
  });
  it('Nicht-Treffer: alle haben eine Kennung', () => {
    const d = baue([{ k: 'I', t: 'Frage?' }, { k: 'B', t: 'Antwort.' }]);
    expect(arten(pruefeTranskript(d, 'einfach', 'de'), 'sprecher-fehlt')).toEqual([]);
  });
});

describe('sprecherwechsel-im-absatz (jeder Beitrag ein Absatz: 8. Aufl. R. 11, 9. Aufl. R. 5)', () => {
  it('Treffer: zweite Kennung mitten im Absatz; Stelle ist die Kennung', () => {
    const d = baue([{ k: 'I', t: 'Wie war das? B: Gut.' }, { k: 'B', t: 'Danke.' }]);
    const hs = arten(pruefeTranskript(d, 'einfach', 'de'), 'sprecherwechsel-im-absatz');
    expect(hs).toHaveLength(1);
    expect(hs[0]!.abschnitt).toBe(0);
    expect(schnitt(d, hs[0]!)).toBe('B:');
  });
  it('Nicht-Treffer: Doppelpunkt in anderer Rolle (Verhältnis 3:1, "sagte: ja", Uhrzeit)', () => {
    const d = baue([
      { k: 'I', t: 'Um 10:30 war das Verhältnis 3:1.' },
      { k: 'B', t: 'Er sagte: ja. Fazit: gut.' },
    ]);
    expect(arten(pruefeTranskript(d, 'einfach', 'de'), 'sprecherwechsel-im-absatz')).toEqual([]);
  });
});

describe('zeitmarke-fehlt (nur 8. Aufl. R. 11: mindestens am Absatzende)', () => {
  it('Treffer: Beitrag ohne Zeit, obwohl andere eine haben', () => {
    const d = baue([
      { k: 'I', t: 'Frage?', zeitMs: 0, bisMs: 2000 },
      { k: 'B', t: 'Antwort.' },
      { k: 'I', t: 'Weiter?', zeitMs: 5000, bisMs: 7000 },
    ]);
    const hs = arten(pruefeTranskript(d, 'einfach', 'de'), 'zeitmarke-fehlt');
    expect(hs).toHaveLength(1);
    expect(hs[0]!.abschnitt).toBe(1);
  });
  it('Nicht-Treffer: niemand hat eine Zeit', () => {
    const d = baue([{ k: 'I', t: 'Frage?' }, { k: 'B', t: 'Antwort.' }]);
    expect(arten(pruefeTranskript(d, 'einfach', 'de'), 'zeitmarke-fehlt')).toEqual([]);
  });
  it('Nicht-Treffer: Marke steht im Text (f4-Text), nicht in den Abschnitten', () => {
    const d = baue([
      { k: 'I', t: 'Frage? #00:00:02-0#' },
      { k: 'B', t: 'Antwort. #00:00:09-4#' },
    ]);
    expect(arten(pruefeTranskript(d, 'einfach', 'de'), 'zeitmarke-fehlt')).toEqual([]);
  });
  it('Nicht-Treffer: nur bisMs gesetzt zählt als Zeit', () => {
    const d = baue([
      { k: 'I', t: 'Frage?', bisMs: 2000 },
      { k: 'B', t: 'Antwort.', bisMs: 9000 },
    ]);
    expect(arten(pruefeTranskript(d, 'einfach', 'de'), 'zeitmarke-fehlt')).toEqual([]);
  });
});

describe('unverstaendlich-ohne-zeit (8. Aufl. R. 13: Marke, wenn innerhalb einer Minute keine andere steht)', () => {
  it('Treffer: (unv.) in einem Beitrag, der länger als 60 s dauert, ohne Marke im Text', () => {
    const d = baue([{ k: 'B', t: 'Und dann war da (unv.) und so weiter.', zeitMs: 0, bisMs: 120000 }]);
    const hs = arten(pruefeTranskript(d, 'einfach', 'de'), 'unverstaendlich-ohne-zeit');
    expect(hs).toHaveLength(1);
    expect(schnitt(d, hs[0]!)).toBe('(unv.)');
  });
  it('Treffer auch bei "(unverständlich)"', () => {
    const d = baue([{ k: 'B', t: 'Dann (unverständlich) kam das.', zeitMs: 0, bisMs: 90000 }]);
    expect(arten(pruefeTranskript(d, 'erweitert', 'de'), 'unverstaendlich-ohne-zeit')).toHaveLength(1);
  });
  it('Nicht-Treffer: Beitrag kürzer als eine Minute (Marke am Absatzende ist nah genug)', () => {
    const d = baue([{ k: 'B', t: 'Und dann war da (unv.) und so weiter.', zeitMs: 0, bisMs: 20000 }]);
    expect(arten(pruefeTranskript(d, 'einfach', 'de'), 'unverstaendlich-ohne-zeit')).toEqual([]);
  });
  it('Nicht-Treffer: Marke direkt dahinter im Text', () => {
    const d = baue([{ k: 'B', t: 'Und dann war da (unv. #00:01:02-3#) und so weiter.', zeitMs: 0, bisMs: 120000 }]);
    expect(arten(pruefeTranskript(d, 'einfach', 'de'), 'unverstaendlich-ohne-zeit')).toEqual([]);
  });
  it('Nicht-Treffer: vermuteter Wortlaut "(Axt?)" ist nicht unverständlich', () => {
    const d = baue([{ k: 'B', t: 'Er hatte eine (Axt?) dabei.', zeitMs: 0, bisMs: 120000 }]);
    expect(arten(pruefeTranskript(d, 'einfach', 'de'), 'unverstaendlich-ohne-zeit')).toEqual([]);
  });
});

describe('pause-form (einfach: (...) ab 3 s, 8. Aufl. R. 9 / 9. Aufl. R. 3; erweitert: (.), (..), (...), (Zahl), R. 2)', () => {
  it('Treffer einfach: freistehende Punkte ohne Klammer, Vorschlag (...)', () => {
    const d = baue([{ k: 'B', t: 'Also ... ja, das war so.' }]);
    const hs = arten(pruefeTranskript(d, 'einfach', 'de'), 'pause-form');
    expect(hs).toHaveLength(1);
    expect(schnitt(d, hs[0]!)).toBe('...');
    expect(hs[0]!.vorschlag).toBe('(...)');
  });
  it('Treffer erweitert: ebenfalls', () => {
    const d = baue([{ k: 'B', t: 'Also ... ja.' }]);
    expect(arten(pruefeTranskript(d, 'erweitert', 'de'), 'pause-form')).toHaveLength(1);
  });
  it('Nicht-Treffer: (...) ist richtig', () => {
    const d = baue([{ k: 'B', t: 'Also (...) ja.' }]);
    expect(arten(pruefeTranskript(d, 'einfach', 'de'), 'pause-form')).toEqual([]);
    expect(arten(pruefeTranskript(d, 'erweitert', 'de'), 'pause-form')).toEqual([]);
  });
  it('Nicht-Treffer: Auslassungspunkte am Wortende ("Weiß nicht...")', () => {
    const d = baue([{ k: 'B', t: 'Weiß nicht... vielleicht.' }]);
    expect(arten(pruefeTranskript(d, 'einfach', 'de'), 'pause-form')).toEqual([]);
  });
  it('Nicht-Treffer erweitert: gestufte Pausen (.) (..) (3) sind richtig', () => {
    const d = baue([{ k: 'B', t: 'Ja (.) also (..) nein (5) doch.' }]);
    expect(arten(pruefeTranskript(d, 'erweitert', 'de'), 'pause-form')).toEqual([]);
  });
});

describe('lautaeusserung-form (Klammern: 8. Aufl. R. 12 / 9. Aufl. R. 4)', () => {
  it('Treffer: eckige Klammern, Vorschlag (lacht)', () => {
    const d = baue([{ k: 'B', t: 'Das war so [lacht] komisch.' }]);
    const hs = arten(pruefeTranskript(d, 'einfach', 'de'), 'lautaeusserung-form');
    expect(hs).toHaveLength(1);
    expect(schnitt(d, hs[0]!)).toBe('[lacht]');
    expect(hs[0]!.vorschlag).toBe('(lacht)');
  });
  it('Treffer: Sternchen, Vorschlag (seufzt)', () => {
    const d = baue([{ k: 'B', t: 'Ja *seufzt* gut.' }]);
    const hs = arten(pruefeTranskript(d, 'erweitert', 'de'), 'lautaeusserung-form');
    expect(hs).toHaveLength(1);
    expect(hs[0]!.vorschlag).toBe('(seufzt)');
  });
  it('Nicht-Treffer: (lacht) und (lachen) sind richtig', () => {
    const d = baue([{ k: 'B', t: 'Das war (lacht) komisch (lachen) und (weint) traurig.' }]);
    expect(arten(pruefeTranskript(d, 'einfach', 'de'), 'lautaeusserung-form')).toEqual([]);
  });
  it('Nicht-Treffer: das Wort im normalen Satz ("wir lachen viel")', () => {
    const d = baue([{ k: 'B', t: 'Wir lachen viel zusammen und sie seufzt manchmal.' }]);
    expect(arten(pruefeTranskript(d, 'einfach', 'de'), 'lautaeusserung-form')).toEqual([]);
  });
  it('Nicht-Treffer: [Lärm] ist keine Lautäußerung einer Person (Anmerkung)', () => {
    const d = baue([{ k: 'B', t: 'Es war laut [Lärm] draußen.' }]);
    expect(arten(pruefeTranskript(d, 'einfach', 'de'), 'lautaeusserung-form')).toEqual([]);
  });
});

describe('wortabbruch (Entscheid 3: einfach weglassen, erweitert mit / schreiben; 8. Aufl. R. 5 und Erw. R. 1)', () => {
  it('einfach, Treffer: "Sor-" vor Leerzeichen, kein Vorschlag', () => {
    const d = baue([{ k: 'B', t: 'Ich habe mir aber Sor- Gedanken gemacht.' }]);
    const hs = arten(pruefeTranskript(d, 'einfach', 'de'), 'wortabbruch');
    expect(hs).toHaveLength(1);
    expect(schnitt(d, hs[0]!)).toBe('Sor-');
    expect(hs[0]!.vorschlag).toBeUndefined();
  });
  it('einfach, Treffer: "Sor/" und Abbruch vor Satzzeichen ("Sor-,")', () => {
    expect(arten(pruefeTranskript(baue([{ k: 'B', t: 'Ich habe Sor/ Gedanken.' }]), 'einfach', 'de'), 'wortabbruch')).toHaveLength(1);
    expect(arten(pruefeTranskript(baue([{ k: 'B', t: 'Ich Sor-, nein, ich war da.' }]), 'einfach', 'de'), 'wortabbruch')).toHaveLength(1);
  });
  it('erweitert, Treffer: "Sor-" mit Vorschlag "Sor/"', () => {
    const d = baue([{ k: 'B', t: 'Ich habe mir aber Sor- Gedanken gemacht.' }]);
    const hs = arten(pruefeTranskript(d, 'erweitert', 'de'), 'wortabbruch');
    expect(hs).toHaveLength(1);
    expect(schnitt(d, hs[0]!)).toBe('Sor-');
    expect(hs[0]!.vorschlag).toBe('Sor/');
  });
  it('erweitert, Nicht-Treffer: "Sor/" ist richtig', () => {
    const d = baue([{ k: 'B', t: 'Ich habe mir aber Sor/ Gedanken gemacht.' }]);
    expect(arten(pruefeTranskript(d, 'erweitert', 'de'), 'wortabbruch')).toEqual([]);
  });
  it('Nicht-Treffer in beiden: E-Mail-Adresse, Fahr-Rad, freistehender Strich', () => {
    const d = baue([{ k: 'B', t: 'Schreib die E-Mail-Adresse und das Fahr-Rad auf, Zug - Zug.' }]);
    expect(arten(pruefeTranskript(d, 'einfach', 'de'), 'wortabbruch')).toEqual([]);
    expect(arten(pruefeTranskript(d, 'erweitert', 'de'), 'wortabbruch')).toEqual([]);
  });
});

describe('rezeptionssignal (Entscheid 2, nur einfach; 8. Aufl. R. 8) - Annahme: transkript.sprecher[].rolle = "interview" | "befragt"', () => {
  const zwischen = (signal: string) => baue([
    { k: 'B', t: 'Ich war damals dabei.' },
    { k: 'I', t: signal },
    { k: 'B', t: 'Und dann ging es los.' },
  ]);
  for (const s of ['hm', 'mhm', 'Aha.', 'ja', 'Genau!', 'okay']) {
    it(`Treffer einfach: Beitrag "${s}" der interviewenden Person zwischen zwei Beiträgen derselben befragten Person`, () => {
      const hs = arten(pruefeTranskript(zwischen(s), 'einfach', 'de'), 'rezeptionssignal');
      expect(hs).toHaveLength(1);
      expect(hs[0]!.abschnitt).toBe(1);
      expect(hs[0]!.vorschlag).toBeUndefined();
      expect(hs[0]!.herkunft).toBe('dresing-pehl');
    });
  }
  it('Nicht-Treffer: erweitert (dort werden Signale geschrieben, 8. Aufl. Erw. R. 3)', () => {
    expect(arten(pruefeTranskript(zwischen('hm'), 'erweitert', 'de'), 'rezeptionssignal')).toEqual([]);
  });
  it('Nicht-Treffer: direkte Antwort auf eine Frage (vorher spricht die interviewende Person)', () => {
    const d = baue([{ k: 'I', t: 'Stimmt das?' }, { k: 'B', t: 'ja' }, { k: 'I', t: 'Und weiter?' }]);
    expect(arten(pruefeTranskript(d, 'einfach', 'de'), 'rezeptionssignal')).toEqual([]);
  });
  it('Nicht-Treffer: Signal der befragten Person', () => {
    const d = baue([{ k: 'I', t: 'Stimmt das?' }, { k: 'B', t: 'hm' }, { k: 'I', t: 'Und weiter?' }]);
    expect(arten(pruefeTranskript(d, 'einfach', 'de'), 'rezeptionssignal')).toEqual([]);
  });
  it('Nicht-Treffer: mehr als nur ein Signal ("Genau, und warum?")', () => {
    expect(arten(pruefeTranskript(zwischen('Genau, und warum?'), 'einfach', 'de'), 'rezeptionssignal')).toEqual([]);
  });
  it('Nicht-Treffer: davor und danach sprechen verschiedene befragte Personen', () => {
    const d = baue([{ k: 'B', t: 'Ich war dabei.' }, { k: 'I', t: 'hm' }, { k: 'C', t: 'Ich auch.' }]);
    expect(arten(pruefeTranskript(d, 'einfach', 'de'), 'rezeptionssignal')).toEqual([]);
  });
  it('Nicht-Treffer: englisch (keine Signal-Regeln, Entscheid 9)', () => {
    expect(arten(pruefeTranskript(zwischen('mhm'), 'einfach', 'en'), 'rezeptionssignal')).toEqual([]);
  });
});

describe('schreibweise (Entscheid 2; 8. Aufl. S. 24 Hinweise 1-2): hm und ähm einheitlich', () => {
  const faelle: [string, string][] = [['mhm', 'hm'], ['hmh', 'hm'], ['mhh', 'hm'], ['äm', 'ähm'], ['ehm', 'ähm'], ['öhm', 'ähm'], ['ähem', 'ähm']];
  for (const r of ['einfach', 'erweitert'] as const) {
    for (const [wort, soll] of faelle) {
      it(`Treffer ${r}: "${wort}" -> "${soll}"`, () => {
        const d = baue([{ k: 'B', t: `Also ${wort} das war so.` }]);
        const hs = arten(pruefeTranskript(d, r, 'de'), 'schreibweise');
        expect(hs).toHaveLength(1);
        expect(schnitt(d, hs[0]!)).toBe(wort);
        expect(hs[0]!.vorschlag).toBe(soll);
        expect(hs[0]!.herkunft).toBe('dresing-pehl');
      });
    }
  }
  it('Groß-/Kleinschreibung bleibt erhalten: "Äm" -> "Ähm", "Mhm" -> "Hm"', () => {
    const d = baue([{ k: 'B', t: 'Äm, ja. Mhm, genau.' }]);
    const hs = arten(pruefeTranskript(d, 'einfach', 'de'), 'schreibweise');
    expect(hs.map((h) => h.vorschlag)).toEqual(['Ähm', 'Hm']);
  });
  it('Nicht-Treffer: hm und ähm sind richtig, Teile anderer Wörter zählen nicht (Ehmann, Ämter)', () => {
    const d = baue([{ k: 'B', t: 'hm, ähm, Herr Ehmann und die Ämter.' }]);
    expect(arten(pruefeTranskript(d, 'einfach', 'de'), 'schreibweise')).toEqual([]);
  });
  it('Nicht-Treffer: englisch (Entscheid 9)', () => {
    const d = baue([{ k: 'B', t: 'Well mhm that was ehm fine.' }]);
    expect(arten(pruefeTranskript(d, 'einfach', 'en'), 'schreibweise')).toEqual([]);
  });
});

describe('Statable-Prüfungen (Entscheid 7): herkunft "statable", Sätze ohne Berufung auf das Buch', () => {
  describe('zeit-rueckwaerts', () => {
    it('Treffer: Beitrag beginnt vor dem Ende des vorigen', () => {
      const d = baue([
        { k: 'I', t: 'Frage?', zeitMs: 10000, bisMs: 20000 },
        { k: 'B', t: 'Antwort.', zeitMs: 5000, bisMs: 9000 },
      ]);
      const hs = arten(pruefeTranskript(d, 'einfach', 'de'), 'zeit-rueckwaerts');
      expect(hs).toHaveLength(1);
      expect(hs[0]!.abschnitt).toBe(1);
      expect(hs[0]!.herkunft).toBe('statable');
      expect(hs[0]!.satz).not.toMatch(/Dresing|Pehl|Buch/);
    });
    it('Treffer: Marken im Text (f4) laufen rückwärts', () => {
      const d = baue([{ k: 'I', t: 'Frage? #00:01:00-0#' }, { k: 'B', t: 'Antwort. #00:00:30-0#' }]);
      expect(arten(pruefeTranskript(d, 'erweitert', 'de'), 'zeit-rueckwaerts')).toHaveLength(1);
    });
    it('Nicht-Treffer: Zeiten wachsen (auch gleich groß)', () => {
      const d = baue([
        { k: 'I', t: 'Frage?', zeitMs: 0, bisMs: 3000 },
        { k: 'B', t: 'Antwort.', zeitMs: 3000, bisMs: 9000 },
      ]);
      expect(arten(pruefeTranskript(d, 'einfach', 'de'), 'zeit-rueckwaerts')).toEqual([]);
    });
    it('gilt auch auf Englisch', () => {
      const d = baue([{ k: 'I', t: 'Q?', zeitMs: 10000, bisMs: 20000 }, { k: 'B', t: 'A.', zeitMs: 5000, bisMs: 9000 }]);
      expect(arten(pruefeTranskript(d, 'einfach', 'en'), 'zeit-rueckwaerts')).toHaveLength(1);
    });
  });

  describe('langer-beitrag (mehr als 400 Wörter)', () => {
    const wort = (n: number) => Array.from({ length: n }, () => 'Wort').join(' ');
    it('Treffer: 401 Wörter', () => {
      const d = baue([{ k: 'I', t: 'Frage?' }, { k: 'B', t: wort(401) }]);
      const hs = arten(pruefeTranskript(d, 'einfach', 'de'), 'langer-beitrag');
      expect(hs).toHaveLength(1);
      expect(hs[0]!.abschnitt).toBe(1);
      expect(hs[0]!.herkunft).toBe('statable');
      expect(hs[0]!.satz).not.toMatch(/Dresing|Pehl|Buch/);
    });
    it('Nicht-Treffer: genau 400 Wörter (Kennung zählt nicht mit)', () => {
      const d = baue([{ k: 'B', t: wort(400) }]);
      expect(arten(pruefeTranskript(d, 'einfach', 'de'), 'langer-beitrag')).toEqual([]);
    });
    it('Nicht-Treffer: Klammer-Anmerkungen zählen nicht mit (400 Wörter + lange Anmerkung)', () => {
      const d = baue([{ k: 'B', t: `${wort(400)} (${wort(50)})` }]);
      expect(arten(pruefeTranskript(d, 'einfach', 'de'), 'langer-beitrag')).toEqual([]);
    });
    it('gilt auch auf Englisch', () => {
      expect(arten(pruefeTranskript(baue([{ k: 'B', t: wort(401) }]), 'einfach', 'en'), 'langer-beitrag')).toHaveLength(1);
    });
  });

  describe('name-unbenannt', () => {
    it('Treffer: SPEAKER_00 und S01 als Sprecher', () => {
      const d = baue([{ k: 'SPEAKER_00', t: 'Frage?' }, { k: 'S01', t: 'Antwort.' }]);
      const hs = arten(pruefeTranskript(d, 'einfach', 'de'), 'name-unbenannt');
      expect(hs.length).toBeGreaterThanOrEqual(2);
      expect(new Set(hs.map((h) => h.abschnitt))).toEqual(new Set([0, 1]));
      expect(hs[0]!.herkunft).toBe('statable');
      expect(hs[0]!.satz).not.toMatch(/Dresing|Pehl|Buch/);
    });
    it('Nicht-Treffer: sprechende Namen (I, B1, Person 1)', () => {
      const d = baue([{ k: 'I', t: 'Frage?' }, { k: 'B1', t: 'Antwort.' }, { k: 'Person 1', t: 'Dritte.' }]);
      expect(arten(pruefeTranskript(d, 'einfach', 'de'), 'name-unbenannt')).toEqual([]);
    });
    it('gilt auch auf Englisch', () => {
      const d = baue([{ k: 'SPEAKER_00', t: 'Q?' }]);
      expect(arten(pruefeTranskript(d, 'einfach', 'en'), 'name-unbenannt').length).toBeGreaterThan(0);
    });
  });
});

describe('Herkunft der Hinweise (Entscheid 7)', () => {
  it('Regeln des Buchs tragen "dresing-pehl"', () => {
    const d = baue([
      { k: 'I', t: 'Wie war das? B: Gut. also ... ja [lacht]', zeitMs: 0, bisMs: 100 },
      { t: 'ohne Kennung' },
    ]);
    const hs = pruefeTranskript(d, 'erweitert', 'de');
    for (const art of ['sprecher-fehlt', 'sprecherwechsel-im-absatz', 'zeitmarke-fehlt', 'pause-form', 'lautaeusserung-form'] as RegelArt[]) {
      const g = arten(hs, art);
      expect(g.length, art).toBeGreaterThan(0);
      for (const h of g) expect(h.herkunft, art).toBe('dresing-pehl');
    }
  });
});

describe('Englische Regelauswahl (Entscheid 9)', () => {
  it('(inaudible) und (unv.) ohne Zeit in langem Beitrag ergeben unverstaendlich-ohne-zeit', () => {
    const a = baue([{ k: 'B', t: 'And then (inaudible) happened.', zeitMs: 0, bisMs: 120000 }]);
    const b = baue([{ k: 'B', t: 'And then (unv.) happened.', zeitMs: 0, bisMs: 120000 }]);
    expect(arten(pruefeTranskript(a, 'einfach', 'en'), 'unverstaendlich-ohne-zeit')).toHaveLength(1);
    expect(arten(pruefeTranskript(b, 'einfach', 'en'), 'unverstaendlich-ohne-zeit')).toHaveLength(1);
  });
  it('(inaudible) mit Marke dahinter: kein Hinweis', () => {
    const d = baue([{ k: 'B', t: 'And then (inaudible #00:01:02-3#) happened.', zeitMs: 0, bisMs: 120000 }]);
    expect(arten(pruefeTranskript(d, 'einfach', 'en'), 'unverstaendlich-ohne-zeit')).toEqual([]);
  });
  it('en meldet nur die erlaubten Arten, auch wenn deutsche Auslöser im Text stehen', () => {
    const d = baue([
      { k: 'I', t: 'hm', zeitMs: 0, bisMs: 1000 },
      { k: 'B', t: 'mhm ehm Sor- Gedanken, also ... ja [lacht]', zeitMs: 1000, bisMs: 9000 },
      { k: 'I', t: 'hm', zeitMs: 9000, bisMs: 9500 },
      { k: 'B', t: 'ja', zeitMs: 9500, bisMs: 9900 },
      { t: 'ohne Kennung' },
    ]);
    const erlaubt: RegelArt[] = ['sprecher-fehlt', 'sprecherwechsel-im-absatz', 'zeitmarke-fehlt', 'zeit-rueckwaerts', 'unverstaendlich-ohne-zeit', 'pause-form', 'lautaeusserung-form', 'langer-beitrag', 'name-unbenannt'];
    for (const r of ['einfach', 'erweitert'] as const) {
      const hs = pruefeTranskript(d, r, 'en');
      for (const h of hs) expect(erlaubt, `${r}: ${h.art}`).toContain(h.art);
      expect(arten(hs, 'pause-form').length).toBeGreaterThan(0);
      expect(arten(hs, 'lautaeusserung-form').length).toBeGreaterThan(0);
    }
  });
});
