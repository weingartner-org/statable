import { describe, it, expect, beforeEach } from 'vitest';
import { sage, setzeAnsageUmgebung, ENTPRELL_MS, bereiteRegionenVor, beginneRechnung, zaehleErgebnis, RECHNUNG_SCHWELLE_MS, endeJuengstAngesagt, type AnsageUmgebung, type Kanal } from './ansage';

const text: Record<Kanal, string> = { hoeflich: '', dringend: '' };
const schreibt: string[] = [];
const geplant: (() => void)[] = [];
let uhr = 0;
const umg: AnsageUmgebung = {
  schreibe: (k, t) => { text[k] = t; schreibt.push(`${k}:${t}`); },
  spaeter: f => { geplant.push(f); },
  jetzt: () => uhr,
};
const fristen: { f: () => void; ab: number; weg: boolean }[] = [];
umg.nach = (f, ms) => { const e = { f, ab: uhr + ms, weg: false }; fristen.push(e); return () => { e.weg = true; }; };
const zeit = (ms: number) => { uhr += ms; for (const e of fristen) if (!e.weg && e.ab <= uhr) { e.weg = true; e.f(); } };
const takt = () => { while (geplant.length) geplant.shift()!(); };

beforeEach(() => { text.hoeflich = ''; text.dringend = ''; schreibt.length = 0; geplant.length = 0; fristen.length = 0; uhr = 10_000; setzeAnsageUmgebung(umg); });

describe('sage', () => {
  it('leert die Region sofort und füllt sie erst im nächsten Takt', () => {
    text.hoeflich = 'alt';
    sage('Gespeichert');
    expect(text.hoeflich).toBe('');
    expect(geplant.length).toBe(1);
    takt();
    expect(text.hoeflich).toBe('Gespeichert');
  });
  it('die zwei Kanäle sind getrennt', () => {
    sage('leise', 'hoeflich'); sage('Fehler', 'dringend'); takt();
    expect(text).toEqual({ hoeflich: 'leise', dringend: 'Fehler' });
  });
  it('Standardkanal ist höflich', () => { sage('x'); takt(); expect(text.hoeflich).toBe('x'); });
  it('gleiche Meldung innerhalb der Entprellzeit wird verworfen, danach wieder gesendet (Leeren und Füllen)', () => {
    expect(sage('Gespeichert')).toBe(true); takt();
    uhr += ENTPRELL_MS - 1;
    expect(sage('Gespeichert')).toBe(false); expect(geplant.length).toBe(0);
    uhr += 1;
    text.hoeflich = 'Gespeichert';
    expect(sage('Gespeichert')).toBe(true);
    expect(text.hoeflich).toBe('');
    takt();
    expect(text.hoeflich).toBe('Gespeichert');
  });
  it('gleicher Text in anderem Kanal wird nicht entprellt', () => {
    sage('Achtung', 'hoeflich'); expect(sage('Achtung', 'dringend')).toBe(true);
  });
  it('zwei verschiedene Meldungen im selben Takt: eine Füllung, der neueste Text gewinnt', () => {
    sage('erste'); sage('zweite'); takt();
    expect(text.hoeflich).toBe('zweite');
    expect(schreibt.filter(x => x === 'hoeflich:').length).toBe(1);
  });
  it('leere Meldung wird nicht gesendet', () => { expect(sage('  ')).toBe(false); expect(geplant.length).toBe(0); });
});

describe('Regionen', () => {
  it('entstehen genau einmal, auch bei mehrmaligem Aufruf', () => {
    const kinder: { id: string; attr: Record<string, string> }[] = [];
    const doc = {
      body: { appendChild: (e: { id: string; attr: Record<string, string> }) => { kinder.push(e); } },
      getElementById: (id: string) => kinder.find(k => k.id === id) ?? null,
      createElement: () => { const attr: Record<string, string> = {}; return { id: '', className: '', attr, setAttribute: (n: string, v: string) => { attr[n] = v; } }; },
    };
    bereiteRegionenVor(doc as never); bereiteRegionenVor(doc as never); bereiteRegionenVor(doc as never);
    expect(kinder.map(k => k.id).sort()).toEqual(['ansage-dringend', 'ansage-hoeflich']);
    expect(kinder.find(k => k.id === 'ansage-hoeflich')!.attr['aria-live']).toBe('polite');
    expect(kinder.find(k => k.id === 'ansage-dringend')!.attr['aria-live']).toBe('assertive');
  });
});

describe('Rechnungen', () => {
  it('schnelle Rechnung: keine Ansage, auch nicht am Ende', () => {
    const ende = beginneRechnung('Statable rechnet');
    zeit(RECHNUNG_SCHWELLE_MS - 1); ende('Ergebnis fertig'); zeit(5000); takt();
    expect(text.hoeflich).toBe(''); expect(schreibt).toEqual([]);
  });
  it('lange Rechnung: eine Ansage am Anfang, eine am Ende, nichts dazwischen', () => {
    const ende = beginneRechnung('Statable rechnet');
    zeit(RECHNUNG_SCHWELLE_MS); takt();
    expect(text.hoeflich).toBe('Statable rechnet');
    schreibt.length = 0; zeit(20_000); takt();
    expect(schreibt).toEqual([]);
    ende('Ergebnis fertig, 3 Tabellen, 1 Diagramm'); takt();
    expect(text.hoeflich).toBe('Ergebnis fertig, 3 Tabellen, 1 Diagramm');
  });
  it('Fehler oder Abbruch am Ende: still', () => {
    const ende = beginneRechnung('Statable rechnet');
    zeit(RECHNUNG_SCHWELLE_MS); takt(); schreibt.length = 0;
    ende(null); takt();
    expect(schreibt).toEqual([]);
  });
  it('zwei gleichzeitige lange Rechnungen: nur die erste spricht', () => {
    const a = beginneRechnung('Statable rechnet'); const b = beginneRechnung('Statable rechnet');
    zeit(RECHNUNG_SCHWELLE_MS); takt(); expect(schreibt.filter(x => x === 'hoeflich:Statable rechnet').length).toBe(1);
    b('zweites Ende'); takt(); expect(text.hoeflich).toBe('Statable rechnet');
    a('erstes Ende'); takt(); expect(text.hoeflich).toBe('erstes Ende');
  });
  it('zählt Tabellen und Diagramme', () => {
    expect(zaehleErgebnis([{ type: 'table' }, { type: 'table' }, { type: 'chart' }, { type: 'image' }, { type: 'title' }, { type: 'log' }])).toEqual({ tabellen: 2, diagramme: 2 });
  });
});

describe('Ende-Ansage und „Ergebnis aktualisiert“ (F6)', () => {
  it('nach einer angesagten langen Rechnung ist endeJuengstAngesagt wahr, nach 5 s nicht mehr', () => {
    expect(endeJuengstAngesagt()).toBe(false);
    const ende = beginneRechnung('Statable rechnet');
    zeit(RECHNUNG_SCHWELLE_MS); takt(); ende('Ergebnis fertig, 1 Tabelle.'); takt();
    expect(endeJuengstAngesagt()).toBe(true);
    zeit(5000);
    expect(endeJuengstAngesagt()).toBe(false);
  });
  it('schnelle Rechnung ohne Ansage: endeJuengstAngesagt bleibt falsch (dann sagt das Blatt „Ergebnis aktualisiert“)', () => {
    const ende = beginneRechnung('Statable rechnet'); zeit(100); ende('Ergebnis fertig'); takt();
    expect(endeJuengstAngesagt()).toBe(false);
  });
});
