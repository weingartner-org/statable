/** Fokus-Modul (Welle 1): reine Logik mit Attrappen, ohne Browser. */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { brauchbar, merkeAusloeser, gibZurueck, fokusAuf, verwirf, tiefe, setzeUmgebung, pruefeFokusfall, fokusProtokoll, leereProtokoll, type FokusUmgebung } from './fokus';

type El = { name: string; verbunden: boolean; fokussiert: number; tabindex?: number; focus: (o?: unknown) => void; opt?: unknown; hasAttribute: (n: string) => boolean; setAttribute: (n: string, v: string) => void };
const el = (name: string, verbunden = true): El => {
  const e: El = { name, verbunden, fokussiert: 0, focus(o) { if (!e.verbunden) return; e.fokussiert++; e.opt = o; umg.aktiv = e; }, hasAttribute: n => n === 'tabindex' && e.tabindex !== undefined, setAttribute: (n, v) => { if (n === 'tabindex') e.tabindex = Number(v); } };
  return e;
};
const body = el('body');
const umg = { aktiv: body as El | null, ersatzAus: new Map<string, El>() } as { aktiv: El | null; ersatzAus: Map<string, El> };
const geplant: (() => void)[] = [];
const umgebung: FokusUmgebung = {
  aktiv: () => umg.aktiv as never,
  body: () => body as never,
  enthaelt: e => (e as unknown as El).verbunden,
  suche: sel => (umg.ersatzAus.get(sel) ?? null) as never,
  spaeter: f => { geplant.push(f); },
  beschreibe: e => (e as unknown as El | null)?.name ?? 'nichts',
  ort: () => '#test',
};
const lauf = () => { while (geplant.length) geplant.shift()!(); };

beforeEach(() => { geplant.length = 0; umg.aktiv = body; umg.ersatzAus.clear(); setzeUmgebung(umgebung); verwirf(tiefe()); leereProtokoll(); });

describe('brauchbar', () => {
  it('nichts, body und ausgehängte Elemente sind unbrauchbar', () => {
    expect(brauchbar(null)).toBe(false);
    expect(brauchbar(undefined)).toBe(false);
    expect(brauchbar(body as never)).toBe(false);
    expect(brauchbar(el('weg', false) as never)).toBe(false);
    expect(brauchbar(el('da') as never)).toBe(true);
  });
});

describe('Auslöser merken und zurückgeben', () => {
  it('gibt den Fokus erst im nächsten Takt zurück, mit preventScroll', () => {
    const knopf = el('knopf'); umg.aktiv = knopf;
    merkeAusloeser();
    umg.aktiv = el('im-dialog');
    gibZurueck('#ersatz');
    expect(knopf.fokussiert).toBe(0);
    lauf();
    expect(knopf.fokussiert).toBe(1);
    expect(knopf.opt).toEqual({ preventScroll: true });
  });
  it('fehlt der Auslöser, geht der Fokus ans Ersatzziel, nie auf body', () => {
    const ersatz = el('ersatz'); umg.ersatzAus.set('#ersatz', ersatz);
    const knopf = el('knopf'); umg.aktiv = knopf;
    merkeAusloeser();
    knopf.verbunden = false;
    gibZurueck('#ersatz');
    lauf();
    expect(ersatz.fokussiert).toBe(1);
    expect(umg.aktiv).toBe(ersatz);
  });
  it('hat inzwischen jemand anderes ein echtes Element fokussiert, bleibt der Fokus dort', () => {
    const ersatz = el('ersatz'); umg.ersatzAus.set('#ersatz', ersatz);
    const knopf = el('knopf'); umg.aktiv = knopf; merkeAusloeser();
    knopf.verbunden = false;
    const seiteFokus = el('von-der-seite'); umg.aktiv = seiteFokus;
    gibZurueck('#ersatz'); lauf();
    expect(ersatz.fokussiert).toBe(0);
    expect(umg.aktiv).toBe(seiteFokus);
  });
  it('war beim Merken body im Fokus, gilt das Ersatzziel', () => {
    const ersatz = el('ersatz'); umg.ersatzAus.set('#ersatz', ersatz);
    merkeAusloeser();
    gibZurueck('#ersatz'); lauf();
    expect(ersatz.fokussiert).toBe(1);
  });
  it('ohne Ersatz geht es ans feste Standardziel (#inhalt)', () => {
    const inhalt = el('inhalt'); umg.ersatzAus.set('#inhalt', inhalt);
    merkeAusloeser(); gibZurueck(); lauf();
    expect(inhalt.fokussiert).toBe(1);
  });
  it('Ersatz darf auch eine Funktion oder ein Element sein', () => {
    const a = el('a'), b = el('b');
    merkeAusloeser(); gibZurueck(() => a as never); lauf();
    umg.aktiv = body; merkeAusloeser(); gibZurueck(b as never); lauf();
    expect([a.fokussiert, b.fokussiert]).toEqual([1, 1]);
  });
  it('der Auslöser kann ausdrücklich angegeben werden', () => {
    const wort = el('wort'); umg.aktiv = body;
    merkeAusloeser(wort as never); gibZurueck('#x'); lauf();
    expect(wort.fokussiert).toBe(1);
  });
});

describe('Stapel für verschachtelte Ebenen', () => {
  it('jede Ebene gibt an ihren eigenen Auslöser zurück, zuletzt geöffnet zuerst', () => {
    const text = el('fachwort-im-text'), rand = el('fachwort-in-der-leiste'), tiefer = el('begriff-im-begriff');
    umg.aktiv = text; merkeAusloeser();
    umg.aktiv = rand; merkeAusloeser();
    umg.aktiv = tiefer;
    expect(tiefe()).toBe(2);
    gibZurueck('#x'); lauf();
    expect(umg.aktiv).toBe(rand);
    gibZurueck('#x'); lauf();
    expect(umg.aktiv).toBe(text);
    expect(tiefe()).toBe(0);
  });
  it('verwirf nimmt Ebenen weg, ohne den Fokus zu bewegen', () => {
    const a = el('a'); umg.aktiv = a; merkeAusloeser(); merkeAusloeser();
    verwirf(2); lauf();
    expect(tiefe()).toBe(0); expect(a.fokussiert).toBe(0);
  });
  it('ein leerer Stapel schadet nicht: Ersatzziel', () => {
    const ersatz = el('ersatz'); umg.ersatzAus.set('#ersatz', ersatz);
    gibZurueck('#ersatz'); lauf();
    expect(ersatz.fokussiert).toBe(1);
  });
});

describe('fokusAuf', () => {
  it('benutzt setTimeout-Takt (spaeter), nie sofort', () => {
    const e = el('e'); fokusAuf(e as never);
    expect(e.fokussiert).toBe(0); lauf(); expect(e.fokussiert).toBe(1);
  });
  it('gibt einem Überschrift-Behälter ohne tabindex tabindex -1', () => {
    const e = el('h2'); fokusAuf(e as never); lauf();
    expect(e.tabindex).toBe(-1);
  });
  it('ein inzwischen ausgehängtes Ziel wird übersprungen, nicht still auf body gelegt', () => {
    const e = el('e'); fokusAuf(e as never); e.verbunden = false; lauf();
    expect(e.fokussiert).toBe(0); expect(umg.aktiv).toBe(body);
  });
});

describe('Fokuswache', () => {
  it('ein Fokus, der auf body fällt, wird protokolliert, nicht repariert', () => {
    const weg = el('weg'); umg.aktiv = body;
    pruefeFokusfall(weg as never, 'focusout');
    expect(fokusProtokoll()).toHaveLength(1);
    expect(fokusProtokoll()[0]).toMatchObject({ von: 'weg', ereignis: 'focusout', ort: '#test' });
    expect(umg.aktiv).toBe(body);
  });
  it('bleibt der Fokus auf einem Element, wird nichts protokolliert', () => {
    umg.aktiv = el('neu');
    pruefeFokusfall(el('alt') as never, 'focusout');
    expect(fokusProtokoll()).toHaveLength(0);
  });
  it('zeigt window.__fokusProtokoll (nur zum Messen)', () => {
    const w: { __fokusProtokoll?: unknown[] } = {};
    vi.stubGlobal('window', w);
    pruefeFokusfall(el('x') as never, 'entfernt');
    expect(w.__fokusProtokoll).toBe(fokusProtokoll());
    vi.unstubAllGlobals();
  });
});

import { istAltZ } from './fokus';
describe('istAltZ (Tastaturlayout)', () => {
  const t = (key: string, code: string, extra = {}) => ({ key, code, altKey: true, ctrlKey: false, metaKey: false, shiftKey: false, ...extra });
  it('deutsche Tastatur: Z-Taste meldet key z, code KeyY', () => expect(istAltZ(t('z', 'KeyY'))).toBe(true));
  it('US-Tastatur: key z, code KeyZ', () => expect(istAltZ(t('z', 'KeyZ'))).toBe(true));
  it('deutsche Tastatur: die Y-Taste (key y, code KeyZ) ist nicht Alt+Z', () => expect(istAltZ(t('y', 'KeyZ'))).toBe(false));
  it('Mac: Wahltaste erzeugt Sonderzeichen, code KeyZ zählt', () => expect(istAltZ(t('Ω', 'KeyZ'))).toBe(true));
  it('ohne Alt, mit Strg, mit Umschalt: nein', () => { expect(istAltZ(t('z', 'KeyZ', { altKey: false }))).toBe(false); expect(istAltZ(t('z', 'KeyZ', { ctrlKey: true }))).toBe(false); expect(istAltZ(t('z', 'KeyZ', { shiftKey: true }))).toBe(false); });
  it('Gegenprobe: die alte Prüfung nur über code erkennt die deutsche Z-Taste nicht', () => { const alt = (e: { code: string }) => e.code === 'KeyZ'; expect(alt(t('z', 'KeyY'))).toBe(false); });
});

describe('Fokus neu setzen nach Dialog (Stufe 4, B1, NVDA-Nachmessung 09.11.)', () => {
  const mitBlur = (name: string) => { const e = el(name) as El & { blur: () => void; geloest: number }; e.geloest = 0; e.blur = () => { e.geloest++; umg.aktiv = body; }; return e; };
  it('liegt der Fokus schon am Ziel, wird er gelöst und neu gesetzt (echtes Fokus-Ereignis)', () => {
    const knopf = mitBlur('knopf'); umg.aktiv = knopf;
    fokusAuf(knopf as never, undefined, true); lauf();
    expect(knopf.geloest).toBe(1);
    expect(knopf.fokussiert).toBe(1);
    expect(umg.aktiv).toBe(knopf);
  });
  it('ohne `neu` bleibt alles wie bisher', () => {
    const knopf = mitBlur('knopf'); umg.aktiv = knopf;
    fokusAuf(knopf as never); lauf();
    expect(knopf.geloest).toBe(0);
  });
  it('verzögerte Rückgabe an den Auslöser setzt neu; ein absichtlich gesetztes anderes Ziel wird nicht doppelt gesetzt', () => {
    vi.useFakeTimers();
    try {
      const knopf = mitBlur('knopf'); umg.aktiv = knopf;
      merkeAusloeser(); umg.aktiv = knopf;   // der Browser hat den Fokus beim Schließen schon zurückgegeben
      gibZurueck(undefined, 250); vi.advanceTimersByTime(250); lauf();
      expect(knopf.geloest).toBe(1); expect(umg.aktiv).toBe(knopf);
      const weg = mitBlur('weg'); umg.aktiv = weg; merkeAusloeser(); weg.verbunden = false;
      const feld = mitBlur('feld'); umg.aktiv = feld;   // die Seite hat den Fokus selbst gesetzt
      gibZurueck(undefined, 250); vi.advanceTimersByTime(250); lauf();
      expect(feld.geloest).toBe(0); expect(umg.aktiv).toBe(feld);
    } finally { vi.useRealTimers(); }
  });
});
