import { describe, expect, it } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import { pruefeDocx } from '../../../scripts/docx-pruefen.mjs';
import { offenePlatzhalter } from './datenschutzvorlage';
import { einwilligungsvorlageAbschnitte, einwilligungsvorlageHtml, einwilligungsvorlageWord } from './einwilligung-vorlage';

/* Sollwerte F2B: FACHBLATT-EINWILLIGUNG.md Abschnitt 2 (Teile der Vorlage), SCHNITTSTELLEN-F2.md 2.2.
 * Aufruf: einwilligungsvorlageAbschnitte(sprache, {}), ...Word(sprache, {}), ...Html(sprache, {}) - ohne Angaben stehen Platzhalter in eckigen Klammern. */

type Sp = 'de' | 'en';
const SATZ: Record<Sp, string> = { de: 'Dies ist eine Vorlage und keine Rechtsberatung.', en: 'This is a template and not legal advice.' };

/** Die elf Teile der Tabelle (Wer forscht bis Unterschrift), Überschriften als Muster. */
const TEILE: Record<Sp, [string, RegExp][]> = {
  de: [
    ['Wer forscht', /Wer forscht/i], ['Thema und Ziel', /Thema/i], ['Ablauf', /Ablauf/i], ['Aufnahme und Transkript', /Aufnahme/i],
    ['Zugang und Speicherort', /Zugang|Speicher/i], ['Anonymisierung', /Anonymisierung/i], ['Grenzen der Vertraulichkeit', /Vertraulichkeit/i],
    ['Freiwilligkeit', /Freiwilligkeit/i], ['Widerruf', /Widerruf/i], ['Kästchen', /Zustimmung|Einwilligung|Kästchen|Ihre Entscheidung/i], ['Unterschrift', /Unterschrift/i]
  ],
  en: [
    ['Who is researching', /who|researcher|research team/i], ['Topic and aim', /topic|aim|purpose/i], ['Procedure', /procedure|course|process/i], ['Recording and transcript', /recording/i],
    ['Access and storage', /access|storage/i], ['Anonymisation', /anonymi[sz]ation/i], ['Limits of confidentiality', /confidential/i],
    ['Voluntariness', /voluntar/i], ['Withdrawal', /withdraw/i], ['Boxes', /consent|agreement|your choice|tick/i], ['Signature', /signature/i]
  ]
};
/** Die fünf Kästchen-Punkte (Teilnahme, Tonaufnahme, Zitate, Archivierung, Weitergabe). */
const KAESTCHEN: Record<Sp, RegExp[]> = {
  de: [/Teilnahme/, /Tonaufnahme|Aufnahme/, /Zitate/, /Archivierung/, /Weitergabe/],
  en: [/participation/i, /recording/i, /quot/i, /archiv/i, /shar|passing|disclos|transfer/i]
};
const alsText = (a: ReturnType<typeof einwilligungsvorlageAbschnitte>): string => a.map((x) => [x.ueberschrift, ...x.absaetze, ...(x.punkte ?? [])].join('\n')).join('\n');
const xml = (b: Uint8Array): string => strFromU8(unzipSync(b)['word/document.xml']!);
const sichtbar = (d: string): string => [...d.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)].map((m) => m[1]!.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")).join('');

describe.each(['de', 'en'] as Sp[])('Vorlage (%s): Abschnitte', (sp) => {
  const abschnitte = einwilligungsvorlageAbschnitte(sp, {});
  it('hat Überschriften und Absätze (keine leere Liste, keine leere Überschrift)', () => {
    expect(abschnitte.length).toBeGreaterThanOrEqual(10);
    for (const a of abschnitte) {
      expect(a.ueberschrift.trim().length).toBeGreaterThan(0);
      expect(a.absaetze.length + (a.punkte?.length ?? 0)).toBeGreaterThan(0);
    }
  });
  it.each(TEILE[sp])('Teil „%s“ ist als Überschrift vorhanden', (_n, muster) => {
    expect(abschnitte.some((a) => muster.test(a.ueberschrift))).toBe(true);
  });
  it('die Teile stehen in der Reihenfolge des Fachblatts (Wer forscht zuerst, Unterschrift zuletzt)', () => {
    const idx = TEILE[sp].map(([, m]) => abschnitte.findIndex((a) => m.test(a.ueberschrift)));
    expect(idx[0]).toBeLessThanOrEqual(idx[1]!);
    expect(idx[idx.length - 1]).toBe(abschnitte.length - 1);
  });
  it.each(KAESTCHEN[sp].map((m, i) => [i + 1, m] as [number, RegExp]))('Kästchen-Punkt %i ist im Text genannt', (_i, muster) => {
    expect(muster.test(alsText(abschnitte))).toBe(true);
  });
  it('Platzhalter in eckigen Klammern sind mit offenePlatzhalter zählbar (mindestens fünf, ohne Angaben)', () => {
    expect(offenePlatzhalter(alsText(abschnitte)).length).toBeGreaterThanOrEqual(5);
  });
  it('mit ausgefüllten Angaben sind es weniger offene Platzhalter (Optionen werden benutzt)', () => {
    const voll = einwilligungsvorlageAbschnitte(sp, { kontakt: 'Max Muster, max@example.org', verantwortlich: 'Beispiel-Hochschule' } as never);
    expect(offenePlatzhalter(alsText(voll)).length).toBeLessThan(offenePlatzhalter(alsText(abschnitte)).length);
    expect(alsText(voll)).toContain('max@example.org');
  });
  it('Widerruf-Teil nennt, dass Veröffentlichtes nicht mehr zurückgeholt werden kann', () => {
    const t = alsText(abschnitte);
    expect(sp === 'de' ? /nicht mehr zurück|nicht zurückgeholt|nicht zurückholen/i.test(t) : /cannot (be )?(taken|called|retrieved|undone)|can no longer be/i.test(t)).toBe(true);
  });
  it('Anonymisierung sagt ehrlich, dass biographische Erzählungen schwer ganz unkenntlich zu machen sind', () => {
    const t = alsText(abschnitte);
    expect(sp === 'de' ? /schwer|nicht ganz|nie ganz|nicht vollständig/i.test(t) : /hard|difficult|not completely|never entirely/i.test(t)).toBe(true);
  });
  it('keine Rechtsgrundlage als Behauptung: nur ein Platzhalter für die Hochschule', () => {
    const t = alsText(abschnitte);
    expect(t).not.toMatch(/Art\. ?6|DSGVO-konform|rechtlich zulässig|§ ?\d/);
  });
});

describe.each(['de', 'en'] as Sp[])('Vorlage (%s): Word', (sp) => {
  it('entsteht, docx-pruefen ohne Befund', async () => {
    const b = await einwilligungsvorlageWord(sp, {});
    expect(b).toBeInstanceOf(Uint8Array);
    expect(pruefeDocx(b)).toEqual([]);
  });
  it('hat Titel und Überschriften', async () => {
    const d = xml(await einwilligungsvorlageWord(sp, {}));
    expect(d).toContain('w:val="Title"');
    expect((d.match(/w:val="Heading[12]"/g) ?? []).length).toBeGreaterThanOrEqual(10);
  });
  it('enthält den Satz „keine Rechtsberatung“ und alle Teile', async () => {
    const s = sichtbar(xml(await einwilligungsvorlageWord(sp, {})));
    expect(s).toContain(SATZ[sp]);
    for (const [, m] of TEILE[sp]) expect(m.test(s)).toBe(true);
    for (const m of KAESTCHEN[sp]) expect(m.test(s)).toBe(true);
  });
  it('Platzhalter sind im Word-Text zählbar', async () => {
    const s = sichtbar(xml(await einwilligungsvorlageWord(sp, {})));
    expect(offenePlatzhalter(s).length).toBeGreaterThanOrEqual(5);
  });
});

describe.each(['de', 'en'] as Sp[])('Vorlage (%s): HTML', (sp) => {
  const html = einwilligungsvorlageHtml(sp, {});
  it('ist ein vollständiges Dokument mit lang und nicht leerem title', () => {
    expect(html).toMatch(/^\s*<!doctype html>/i);
    expect(html).toMatch(new RegExp(`<html[^>]*\\blang="${sp}"`));
    const t = html.match(/<title>([^<]*)<\/title>/);
    expect(t).not.toBeNull();
    expect(t![1]!.trim().length).toBeGreaterThan(3);
    expect(html).toMatch(/<meta[^>]*charset/i);
    expect(html).toMatch(/<meta[^>]*viewport/i);
  });
  it('ein Formular mit fünf fieldset, jedes mit legend', () => {
    expect(html).toContain('<form');
    const fs = html.match(/<fieldset\b[\s\S]*?<\/fieldset>/g) ?? [];
    expect(fs).toHaveLength(5);
    for (const f of fs) expect(f).toMatch(/<legend\b[^>]*>[\s\S]+?<\/legend>/);
  });
  it('jedes fieldset gehört zu einem der fünf Punkte, in der Reihenfolge Teilnahme, Aufnahme, Zitate, Archivierung, Weitergabe', () => {
    const fs = html.match(/<fieldset\b[\s\S]*?<\/fieldset>/g) ?? [];
    fs.forEach((f, i) => expect(KAESTCHEN[sp][i]!.test(f.match(/<legend\b[^>]*>([\s\S]+?)<\/legend>/)![1]!)).toBe(true));
  });
  it('je Punkt zwei Kästchen „Ja“ und „Nein“ (Yes/No), jedes mit label for=id', () => {
    const fs = html.match(/<fieldset\b[\s\S]*?<\/fieldset>/g) ?? [];
    const ja = sp === 'de' ? 'Ja' : 'Yes', nein = sp === 'de' ? 'Nein' : 'No';
    for (const f of fs) {
      const inputs = f.match(/<input\b[^>]*>/g) ?? [];
      expect(inputs).toHaveLength(2);
      for (const i of inputs) {
        expect(i).toMatch(/type="(checkbox|radio)"/);
        const id = i.match(/\bid="([^"]+)"/);
        expect(id).not.toBeNull();
        expect(f).toMatch(new RegExp(`<label[^>]*\\bfor="${id![1]}"[^>]*>`));
      }
      const labels = [...f.matchAll(/<label\b[^>]*>([\s\S]*?)<\/label>/g)].map((m) => m[1]!.replace(/<[^>]+>/g, '').trim());
      expect(labels).toEqual([ja, nein]);
    }
  });
  it('alle Kennungen (id) sind eindeutig', () => {
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]!);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('enthält den Satz „keine Rechtsberatung“ als eigenen Hinweis, alle Teile und zählbare Platzhalter', () => {
    expect(html).toContain(SATZ[sp]);
    const text = html.replace(/<[^>]+>/g, ' ');
    for (const [, m] of TEILE[sp]) expect(m.test(text)).toBe(true);
    expect(offenePlatzhalter(text).length).toBeGreaterThanOrEqual(5);
  });
  it('hat Überschriften h1 und h2 und kein Skript', () => {
    expect(html).toMatch(/<h1\b/);
    expect((html.match(/<h2\b/g) ?? []).length).toBeGreaterThanOrEqual(8);
    expect(html).not.toMatch(/<script\b/i);
  });
  it('Zeichen aus den Angaben werden maskiert (kein eingeschleustes HTML)', () => {
    const h = einwilligungsvorlageHtml(sp, { kontakt: '<img src=x onerror=alert(1)>' } as never);
    expect(h).not.toContain('<img src=x');
    expect(h).toContain('&lt;img');
  });
});
