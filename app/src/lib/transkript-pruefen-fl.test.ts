import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Dokument } from './qualprojekt';
import { neuesQualProjekt, pruefeQualProjekt } from './qualprojekt';
import { leseTranskript, transkriptDokument, vorschlagZuordnung } from './transkript-lesen';
import { pruefeTranskript, uebernimmVorschlag, type Hinweis } from './transkript-pruefen';

/* Fachblatt Feinstruktur F0: docs/feinstruktur/FACHBLATT-PRUEFER-VORLAGEN.md, Abschnitte 1-3 und 10.
 * Sollwerte nur aus dem Fachblatt und aus docs/feinstruktur/beispiele/, nie aus dem Code.
 * Regelwerk 'froschauer-lueger': Schlüssel fl-…, herkunft 'froschauer-lueger', der Prüfer ändert nie selbst.
 * Regel g (Betonung) gibt es in reinem Text nicht und wird hier nicht geprüft.
 */

const BEISPIELE = fileURLToPath(new URL('../../../docs/feinstruktur/beispiele/', import.meta.url));
const lies = (n: string): string => readFileSync(BEISPIELE + n, 'utf8');

/** Text → Dokument über den echten Einlese-Weg (Namen der Personen gleich der Kennung, Rollen aus der Kennung). */
async function dokAus(text: string, name = 'Test'): Promise<Dokument> {
  const roh = await leseTranskript('test.txt', new TextEncoder().encode(text));
  const z = vorschlagZuordnung(roh);
  return transkriptDokument(roh, z, name, text).dokument;
}
/** Vier Beiträge mit Zeitmarken; `zeile` steht im zweiten (B1). Beide Personen kommen zweimal vor, damit sie als Sprecher erkannt werden. */
const rahmen = (zeile: string): string => `[00:00:01] I1: Frage eins?\n[00:00:05] B1: ${zeile}\n[00:00:20] I1: Frage zwei?\n[00:00:25] B1: Ja, so war das.`;
const pruefe = async (text: string, namen?: string[]): Promise<Hinweis[]> => pruefeTranskript(await dokAus(text), 'froschauer-lueger', 'de', namen ? { namen } : undefined);
const arten = (h: Hinweis[]): string[] => h.map((x) => x.art as string);
const inRahmen = async (zeile: string, namen?: string[]): Promise<Hinweis[]> => pruefe(rahmen(zeile), namen);
const schnitt = (d: Dokument, h: Hinweis): string => Array.from(d.text).slice(h.start, h.ende).join('');

describe('Regelwerk froschauer-lueger: Allgemeines', () => {
  it('jeder Hinweis hat herkunft froschauer-lueger, einen Satz in de und en, und die Stelle liegt im Text; das Dokument bleibt unverändert', async () => {
    const d = await dokAus(rahmen('Das war ... komisch [lacht] und (mhm) so::'));
    const vorher = JSON.parse(JSON.stringify(d));
    const de = pruefeTranskript(d, 'froschauer-lueger', 'de');
    const en = pruefeTranskript(d, 'froschauer-lueger', 'en');
    expect(d).toEqual(vorher);
    expect(de.length).toBeGreaterThanOrEqual(3);
    expect(en.length).toBe(de.length);
    for (const h of de) {
      expect(h.herkunft).toBe('froschauer-lueger');
      expect((h.art as string).startsWith('fl-')).toBe(true);
      expect(h.satz.length).toBeGreaterThan(10);
      expect(h.start).toBeGreaterThanOrEqual(0);
      expect(h.ende).toBeGreaterThanOrEqual(h.start);
      expect(h.ende).toBeLessThanOrEqual(Array.from(d.text).length);
    }
    expect(en[0]!.satz).not.toBe(de[0]!.satz);
  });

  it('Dresing/Pehl-Hinweise gibt es nicht: mhm und äh sind Text, nie schreibweise oder rezeptionssignal', async () => {
    const t = '[00:00:01] I1: Frage?\n[00:00:05] B1: mhm äh ähm hm\n[00:00:09] I1: mhm\n[00:00:12] B1: Ja, genau, mhm.\n[00:00:20] I1: mhm\n[00:00:22] B1: okay';
    const h = await pruefe(t);
    expect(h).toEqual([]);
    const dp = pruefeTranskript(await dokAus(t), 'einfach', 'de').map((x) => x.art);
    expect(dp.length).toBeGreaterThan(0);   // Gegenprobe: im alten Regelwerk melden sie
  });
});

describe('Regel a: Zeitmarke bei jedem Sprecherwechsel', () => {
  it('muss melden: Sprecherwechsel ohne Zeitmarke, wenn andere Beiträge eine haben', async () => {
    const t = '[00:00:01] I1: Frage eins?\n[00:00:05] B1: Antwort.\nI1: Und weiter?\n[00:00:20] B1: Ja.\n[00:00:30] I1: ok';
    const d = await dokAus(t);
    const h = pruefeTranskript(d, 'froschauer-lueger', 'de').filter((x) => x.art === 'fl-zeitmarke-wechsel');
    expect(h.length).toBe(1);
    expect(h[0]!.abschnitt).toBe(2);
  });
  it('darf nicht melden: keiner hat eine Zeitmarke, dann ein einziger Hinweis „keine Zeitmarken“', async () => {
    const h = await pruefe('I1: Frage eins?\nB1: Antwort.\nI1: Und weiter?\nB1: Ja.');
    expect(arten(h)).not.toContain('fl-zeitmarke-wechsel');
    expect(h.filter((x) => x.art === 'fl-zeitmarken-fehlen').length).toBe(1);
  });
  it('darf nicht melden: Zeile mit /I1: (gleichzeitiges Sprechen) braucht keine Zeitmarke', async () => {
    const h = await inRahmen('Ich denke\n/I1: ja genau\nund weiter');
    expect(h).toEqual([]);
  });
});

describe('Regel b: Sprecherkennung I1, B1', () => {
  it('muss melden: Interviewer:, Frau M.: und B: ohne Nummer', async () => {
    expect(arten(await pruefe('[00:00:01] I1: Frage?\n[00:00:05] B1: Antwort.\nInterviewer: noch eine Frage\n[00:00:20] I1: Frage zwei?\n[00:00:25] B1: Ja.'))).toContain('fl-kennung');
    expect(arten(await pruefe('[00:00:01] I1: Frage?\n[00:00:05] B1: Antwort.\n[00:00:09] Frau M.: Ja\n[00:00:20] I1: Frage zwei?\n[00:00:25] B1: Ja.'))).toContain('fl-kennung');
    expect(arten(await pruefe('[00:00:01] I: Frage?\n[00:00:05] B: Antwort.\n[00:00:20] I: Frage zwei?\n[00:00:25] B: Ja.'))).toContain('fl-kennung');
  });
  it('darf nicht melden: I1:, B2:', async () => {
    const h = await pruefe('[00:00:01] I1: Frage?\n[00:00:05] B2: Antwort.\n[00:00:20] I1: Frage zwei?\n[00:00:25] B2: Ja.');
    expect(arten(h)).not.toContain('fl-kennung');
  });
});

describe('Regel c: Pausen', () => {
  it.each([
    ['...', 'Und auf einmal ... is da niemand'],
    ['(...)', 'Und auf einmal (...) is da niemand'],
    ['(3 Sek.)', 'Und auf einmal (3 Sek.) is da niemand'],
    ['. . . mit einem Leerzeichen', 'Und auf einmal . . . is da niemand'],
  ])('muss melden: %s', async (_n, z) => {
    expect(arten(await inRahmen(z))).toContain('fl-pause-form');
  });
  it('Vorschlag: ... wird zu zwei Leerzeichen, Punkten mit Leerzeichen, zwei Leerzeichen', async () => {
    const d = await dokAus(rahmen('auf einmal ... is da'));
    const h = pruefeTranskript(d, 'froschauer-lueger', 'de').find((x) => x.art === 'fl-pause-form')!;
    expect(h.vorschlag).toBeDefined();
    const neu = uebernimmVorschlag(d, h);
    expect(neu.text).toContain('auf einmal  . . .  is da');
    expect(pruefeTranskript(neu, 'froschauer-lueger', 'de')).toEqual([]);
  });
  it('darf nicht melden: richtige Pause, Satzende, Abkürzungen z. B., u. a., d. h. (Falle: Punkt mit Leerzeichen)', async () => {
    expect(await inRahmen('Ja  . .  äh  und  . . . .  dann')).toEqual([]);
    expect(await inRahmen('Das war komisch. Und dann ging es weiter.')).toEqual([]);
    expect(await inRahmen('Das, z. B. heute, u. a. morgen, d. h. so, u. U. auch, o. Ä. eben')).toEqual([]);
  });
});

describe('Regel d: nichtverbale Äußerung in runden Klammern mit Kennung', () => {
  it('muss melden: [lacht] mit Vorschlag (B1 lacht), *lacht*, (lacht) ohne Kennung', async () => {
    const d = await dokAus(rahmen('Das war [lacht] schön'));
    const h = pruefeTranskript(d, 'froschauer-lueger', 'de').find((x) => x.art === 'fl-nonverbal-form')!;
    expect(h).toBeDefined();
    expect(schnitt(d, h)).toBe('[lacht]');
    expect(h.vorschlag).toBe('(B1 lacht)');
    expect(arten(await inRahmen('Das war *lacht* schön'))).toContain('fl-nonverbal-form');
    expect(arten(await inRahmen('Das war (lacht) schön'))).toContain('fl-nonverbal-form');
  });
  it('darf nicht melden: (B1 lacht), (I1 räuspert sich), Zeitmarke in runden Klammern', async () => {
    expect(await inRahmen('Das war (B1 lacht) schön')).toEqual([]);
    expect(await inRahmen('Das war (I1 räuspert sich) schön')).toEqual([]);
    expect(await inRahmen('(00:01:02) Und so war das (00:01:05)')).toEqual([]);
  });
});

describe('Regel e: Geräusche in spitzen Klammern nach außen', () => {
  it('muss melden: (Telefon läutet) mit Vorschlag, [Telefon], <Telefon läutet>', async () => {
    const d = await dokAus(rahmen('Dann (Telefon läutet) ging es weiter'));
    const h = pruefeTranskript(d, 'froschauer-lueger', 'de').find((x) => x.art === 'fl-geraeusch-form')!;
    expect(h).toBeDefined();
    expect(h.vorschlag).toBe('>Telefon läutet<');
    expect(arten(await inRahmen('Dann [Telefon] ging es weiter'))).toContain('fl-geraeusch-form');
    expect(arten(await inRahmen('Dann <Telefon läutet> ging es weiter'))).toContain('fl-geraeusch-form');
  });
  it('darf nicht melden: >Tür geht auf< neben <Schule A> (Falle e gegen m), und < 5 / > 3 als Vergleich', async () => {
    expect(await inRahmen('Da >Tür geht auf< und in der <Schule A> war es so')).toEqual([]);
    expect(await inRahmen('Es waren < 5 Leute und mehr als > 3 Stühle')).toEqual([]);
  });
});

describe('Regel f: Hörersignale sind normaler Text', () => {
  it('muss melden: (mhm) mit Vorschlag mhm, [äh]', async () => {
    const d = await dokAus(rahmen('Ja (mhm) genau'));
    const h = pruefeTranskript(d, 'froschauer-lueger', 'de').find((x) => x.art === 'fl-signal-klammer')!;
    expect(h).toBeDefined();
    expect(h.vorschlag).toBe('mhm');
    expect(arten(await inRahmen('Ja [äh] genau'))).toContain('fl-signal-klammer');
  });
  it('darf nicht melden: mhm, äh, ähm als Text', async () => {
    expect(await inRahmen('Ja mhm genau äh und ähm so')).toEqual([]);
  });
});

describe('Regel h: Unverständliches', () => {
  it.each(['(unv.)', '(unverständlich)', '[?]', '(???)'])('muss melden: %s', async (z) => {
    expect(arten(await inRahmen(`Ich hab sie ${z} nimmer verstanden`))).toContain('fl-unverstaendlich-form');
  });
  it('darf nicht melden: (. . .) gegen Pause', async () => {
    expect(await inRahmen('Ich hab sie (. . .) nimmer verstanden')).toEqual([]);
    expect(await inRahmen('Ich hab sie (. . . .) nimmer verstanden')).toEqual([]);
  });
});

describe('Regel i: vermuteter Wortlaut', () => {
  it('muss melden (als Frage): (Huhn oder Hund?), [etwa so?], (Nachhilfe oder Nachsicht) mit Vorschlag (Nachhilfe/Nachsicht)', async () => {
    expect(arten(await inRahmen('Da war ein (Huhn oder Hund?) im Garten'))).toContain('fl-vermutet-form');
    expect(arten(await inRahmen('Da war [etwa so?] im Garten'))).toContain('fl-vermutet-form');
    const d = await dokAus(rahmen('Die hat da (Nachhilfe oder Nachsicht) gmacht'));
    const h = pruefeTranskript(d, 'froschauer-lueger', 'de').find((x) => x.art === 'fl-vermutet-form')!;
    expect(h).toBeDefined();
    expect(h.vorschlag).toBe('(Nachhilfe/Nachsicht)');
  });
  it('darf nicht melden: (etwa so), (Huhn/Hund)', async () => {
    expect(await inRahmen('Es geht um (etwa so) Fakten und (Huhn/Hund) im Garten')).toEqual([]);
  });
});

describe('Regel j: gedehnt und schnell', () => {
  it('muss melden: sooo, s-o, so::, gedehnt mit nur einem Leerzeichen', async () => {
    expect(arten(await inRahmen('Ich war sooo müde'))).toContain('fl-dehnung-form');
    expect(arten(await inRahmen('Ich war s-o müde'))).toContain('fl-dehnung-form');
    expect(arten(await inRahmen('Ich war so:: müde'))).toContain('fl-dehnung-form');
    expect(arten(await inRahmen('Das war w i r k l i c h müde'))).toContain('fl-dehnung-form');
  });
  it('darf nicht melden: Dehnung richtig, Dialekt und schnelles Sprechen', async () => {
    expect(await inRahmen('Ich war  s o  müde und  w i r k l i c h  froh')).toEqual([]);
    expect(await inRahmen('Des hammas dann gmacht, wie gehts dir, ham’ma ja, geh ma')).toEqual([]);
  });
});

describe('Regel k: Unterbrechung', () => {
  it('muss melden: (I1: mhm) mit Vorschlag /I1: mhm/, [I1: mhm], /I1 mhm/', async () => {
    const d = await dokAus(rahmen('Und dann hab i (I1: mhm) meine Kollegin gfragt'));
    const h = pruefeTranskript(d, 'froschauer-lueger', 'de').find((x) => x.art === 'fl-unterbrechung-form')!;
    expect(h).toBeDefined();
    expect(h.vorschlag).toBe('/I1: mhm/');
    expect(arten(await inRahmen('Und dann hab i [I1: mhm] meine Kollegin gfragt'))).toContain('fl-unterbrechung-form');
    expect(arten(await inRahmen('Und dann hab i /I1 mhm/ meine Kollegin gfragt'))).toContain('fl-unterbrechung-form');
  });
  it('darf nicht melden: /I1: mhm/', async () => {
    expect(await inRahmen('Und dann hab i /I1: mhm/ meine Kollegin gfragt')).toEqual([]);
  });
});

describe('Regel l: gleichzeitiges Sprechen', () => {
  it('muss melden: [gleichzeitig], //, (überlappend), \\I1: am Zeilenanfang', async () => {
    expect(arten(await inRahmen('Und dann [gleichzeitig] weiter'))).toContain('fl-gleichzeitig-form');
    expect(arten(await inRahmen('Und dann // weiter'))).toContain('fl-gleichzeitig-form');
    expect(arten(await inRahmen('Und dann (überlappend) weiter'))).toContain('fl-gleichzeitig-form');
    expect(arten(await inRahmen('Und dann\n\\I1: ja das kenn ich\nweiter'))).toContain('fl-gleichzeitig-form');
  });
  it('darf nicht melden: Zeile, die mit / und Kennung beginnt', async () => {
    expect(await inRahmen('Und dann\n/I1: ja genau\nweiter')).toEqual([]);
  });
});

describe('Regel m: Anonymisierung in spitzen Klammern nach innen', () => {
  it('muss melden: >Schule A< mit Vorschlag <Schule A>, [Schule A], (Name)', async () => {
    const d = await dokAus(rahmen('In der >Schule A< war das so'));
    const h = pruefeTranskript(d, 'froschauer-lueger', 'de').find((x) => x.art === 'fl-anonym-form')!;
    expect(h).toBeDefined();
    expect(h.vorschlag).toBe('<Schule A>');
    expect(arten(await inRahmen('In der [Schule A] war das so'))).toContain('fl-anonym-form');
    expect(arten(await inRahmen('Meine Kollegin (Name) war da'))).toContain('fl-anonym-form');
  });
  it('fehlend: nur Namen aus der Namensliste, ohne Liste rät Statable nichts', async () => {
    const z = 'Meine Kollegin Anna war da';
    expect(arten(await inRahmen(z))).not.toContain('fl-anonym-fehlt');
    const d = await dokAus(rahmen(z));
    const h = pruefeTranskript(d, 'froschauer-lueger', 'de', { namen: ['Anna'] }).filter((x) => x.art === 'fl-anonym-fehlt');
    expect(h.length).toBe(1);
    expect(schnitt(d, h[0]!)).toBe('Anna');
    expect(arten(await inRahmen('Meine Kollegin <Name B> war da', ['Anna']))).not.toContain('fl-anonym-fehlt');
    expect(arten(await inRahmen('Annabelle war da', ['Anna']))).not.toContain('fl-anonym-fehlt');
  });
  it('darf nicht melden: <Schule A>, <Name B>', async () => {
    expect(await inRahmen('In der <Schule A> sagte <Name B> das')).toEqual([]);
  });
});

describe('Regel n: Gendern mit Doppelpunkt', () => {
  it.each(['Schüler*innen', 'SchülerInnen', 'Schüler/innen'])('muss melden (Hinweis): %s', async (w) => {
    expect(arten(await inRahmen(`Die ${w} haben gelernt`))).toContain('fl-gendern-form');
  });
  it('Vorschlag: SchülerInnen → Schüler:innen', async () => {
    const d = await dokAus(rahmen('Die SchülerInnen haben gelernt'));
    const h = pruefeTranskript(d, 'froschauer-lueger', 'de').find((x) => x.art === 'fl-gendern-form')!;
    expect(h.vorschlag).toBe('Schüler:innen');
  });
  it('darf nicht melden: Schüler:innen, und nie, ob gegendert werden sollte', async () => {
    expect(await inRahmen('Die Schüler:innen und die Lehrer haben gelernt')).toEqual([]);
  });
});

describe('Kodierschema (Rollen der Sprecher)', () => {
  it('ein einziger Hinweis, wenn kein Sprecher eine Rolle hat und kein Kopf da ist; sonst keiner', async () => {
    const d = await dokAus(rahmen('Ja.'));
    for (const s of d.transkript!.sprecher) delete s.rolle;
    const h = pruefeTranskript(d, 'froschauer-lueger', 'de').filter((x) => x.art === 'fl-kodierschema');
    expect(h.length).toBe(1);
    expect(arten(await inRahmen('Ja.'))).not.toContain('fl-kodierschema');
  });
});

describe('Beispieldateien (docs/feinstruktur/beispiele)', () => {
  it('interview-a-fl.txt und interview-b-fl.txt: null Hinweise', async () => {
    for (const n of ['interview-a-fl.txt', 'interview-b-fl.txt']) {
      const d = await dokAus(lies(n), n);
      expect(d.text, n).toBe(lies(n));
      const h = pruefeTranskript(d, 'froschauer-lueger', 'de', { namen: ['Anna'] });
      expect(h.map((x) => `${x.art}: ${schnitt(d, x)}`), n).toEqual([]);
      expect(pruefeTranskript(d, 'froschauer-lueger', 'en').length, n).toBe(0);
    }
  });

  const soll = JSON.parse(lies('interview-a-fehler-sollliste.json')) as {
    fehler: { nr: number; regel: string; zeile: number; stelle: string; art: string }[];
    darfNichtMelden: { nr: number; zeile: number; stelle: string; art: string }[];
  };
  const SCHLUESSEL: Record<string, string> = {
    'gendern-form': 'fl-gendern-form', 'pause-form': 'fl-pause-form', 'nonverbal-klammer': 'fl-nonverbal-form', 'hoerersignal-klammer': 'fl-signal-klammer',
    'unterbrechung-klammer': 'fl-unterbrechung-form', 'name-nicht-anonymisiert': 'fl-anonym-fehlt', 'sprecherkennung': 'fl-kennung', 'dehnung-form': 'fl-dehnung-form',
    'alternative-form': 'fl-vermutet-form', 'unverstaendlich-abkuerzung': 'fl-unverstaendlich-form', 'zeitmarke-fehlt': 'fl-zeitmarke-wechsel', 'pause-leerzeichen': 'fl-pause-form',
    'geraeusch-klammer': 'fl-geraeusch-form', 'anonymisierung-richtung': 'fl-anonym-form', 'gleichzeitig-zeichen': 'fl-gleichzeitig-form',
  };
  /** Codepoint-Bereich der Stelle in der Datei (Zeile ab 1) */
  function ort(text: string, zeile: number, stelle: string): { z0: number; z1: number; s0: number; s1: number } {
    const zeilen = text.split('\n');
    const vorher = zeilen.slice(0, zeile - 1).join('\n') + (zeile > 1 ? '\n' : '');
    const z0 = Array.from(vorher).length;
    const z1 = z0 + Array.from(zeilen[zeile - 1]!).length;
    const idx = zeilen[zeile - 1]!.indexOf(stelle);
    if (idx < 0) throw new Error(`Stelle nicht gefunden: ${stelle}`);
    const s0 = z0 + Array.from(zeilen[zeile - 1]!.slice(0, idx)).length;
    return { z0, z1, s0, s1: s0 + Array.from(stelle).length };
  }

  it('interview-a-fehler.txt: alle 15 Fehler werden an der Stelle gemeldet, Art passend zum Schlüssel', async () => {
    const text = lies('interview-a-fehler.txt');
    const d = await dokAus(text, 'fehler');
    expect(d.text).toBe(text);
    const h = pruefeTranskript(d, 'froschauer-lueger', 'de', { namen: ['Anna'] });
    expect(soll.fehler.length).toBe(15);
    for (const f of soll.fehler) {
      const art = SCHLUESSEL[f.art];
      expect(art, `Schlüssel für ${f.art}`).toBeDefined();
      const o = ort(text, f.zeile, f.stelle);
      const treffer = h.filter((x) => x.art === art && x.start < o.s1 && x.ende > o.s0 && x.start >= o.z0 && x.ende <= o.z1);
      expect(treffer.length, `Fehler ${f.nr} (${f.art}) in Zeile ${f.zeile}: ${f.stelle}`).toBeGreaterThanOrEqual(1);
    }
  });

  it('interview-a-fehler.txt: ohne Namensliste kein Hinweis auf Anna', async () => {
    const d = await dokAus(lies('interview-a-fehler.txt'), 'fehler');
    expect(arten(pruefeTranskript(d, 'froschauer-lueger', 'de')).filter((a) => a === 'fl-anonym-fehlt').length).toBe(0);
  });

  it('interview-a-fehler.txt: an keiner der Stellen „darf nicht melden“ steht ein Hinweis', async () => {
    const text = lies('interview-a-fehler.txt');
    const d = await dokAus(text, 'fehler');
    const h = pruefeTranskript(d, 'froschauer-lueger', 'de', { namen: ['Anna'] });
    expect(soll.darfNichtMelden.length).toBe(18);
    for (const f of soll.darfNichtMelden) {
      const o = ort(text, f.zeile, f.stelle);
      const treffer = h.filter((x) => x.start < o.s1 && x.ende > o.s0).map((x) => `${x.art}: ${schnitt(d, x)}`);
      expect(treffer, `darf nicht melden ${f.nr} (${f.art}) in Zeile ${f.zeile}: ${f.stelle}`).toEqual([]);
    }
  });

  it('Fehler 9 (Alternative mit oder) ist eine Frage, kein sicherer Fehler: der Satz endet mit einem Fragezeichen oder nennt „Möglichkeit“', async () => {
    const d = await dokAus(lies('interview-a-fehler.txt'), 'fehler');
    const h = pruefeTranskript(d, 'froschauer-lueger', 'de').find((x) => x.art === 'fl-vermutet-form')!;
    expect(/\?|Frage|vielleicht|möglicherweise/i.test(h.satz)).toBe(true);
  });
});

describe('Projektdatei: regeln froschauer-lueger und unbekannte Felder', () => {
  const projekt = () => {
    const p = neuesQualProjekt('x');
    p.dokumente.push({ id: 'd1', name: 'D', art: 'text', text: 'I1: Hallo', erstellt: 1, geaendert: 1, transkript: { sprecher: [{ id: 's1', name: 'I1', rolle: 'interview' }], abschnitte: [{ start: 0, ende: 9, sprecher: 's1' }], regeln: 'froschauer-lueger' } });
    return JSON.parse(JSON.stringify(p));
  };
  it('transkript.regeln froschauer-lueger wird angenommen, Fassung 2 (Architekturblatt 5.1, Entscheid F2)', () => {
    const r = pruefeQualProjekt(projekt());
    expect(r.dokumente[0]!.transkript!.regeln).toBe('froschauer-lueger');
    expect(r.version).toBe(2);
  });
  it('ein unbekannter Wert für regeln wird weiter abgelehnt', () => {
    const j = projekt(); j.dokumente[0].transkript.regeln = 'anders';
    expect(() => pruefeQualProjekt(j)).toThrow();
  });
  it('unbekannte Felder der obersten Ebene bleiben erhalten (Architekturblatt Abschnitt 5)', () => {
    const j = projekt();
    j.kuenftigeAnalysen = [{ id: 'q1', titel: 'Neu' }];
    j.zukunft = { x: 1 };
    const r = pruefeQualProjekt(j) as unknown as { _unbekannt?: Record<string, unknown> };
    expect(r._unbekannt).toEqual({ kuenftigeAnalysen: [{ id: 'q1', titel: 'Neu' }], zukunft: { x: 1 } });
    // Ohne unbekannte Felder gibt es kein Feld _unbekannt
    expect((pruefeQualProjekt(projekt()) as unknown as Record<string, unknown>)._unbekannt).toBeUndefined();
  });
});
