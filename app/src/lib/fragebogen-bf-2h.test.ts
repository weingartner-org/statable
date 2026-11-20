import { describe, expect, it } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';
import { planPruefen, platzhalterStellen, type FragebogenPlan } from './fragebogenplan';
import { neuerPlan } from './fragebogenplan-editor';
import { vorlageEinfuegen } from './fragebogenplan-vorlagen';
import { erzeugeExport, sperrFehler } from './fragebogenexport-menue';
import { papierGrossdruck, papierStandard } from './papier';
import { kodebuchWord } from './fragebogenexport';

/** Stufe 2, Behebung der Befunde aus NVDA-Messung und automatischer Messung: Platzhalter-Sperre, Word ohne Rechtschreibmeldungen, Großdruck mit Überschriften. */
const mitVorlagen = (n = 2): FragebogenPlan => {
  let p = neuerPlan({ de: 'Probe', en: 'Probe' });
  for (let i = 0; i < n; i++) p = (vorlageEinfuegen(p, 'zustimmung5', null, { fehlend: true }) as unknown as { plan: FragebogenPlan }).plan;
  return p;
};
const ersetzt = (p: FragebogenPlan): FragebogenPlan => {
  const t = structuredClone(p);
  t.elemente.forEach(s => s.elemente.forEach((e, i) => { e.text = { de: `Das Essen war gut ${i + 1}.`, en: `The food was good ${i + 1}.` }; }));
  return t;
};
const xml = (b: Uint8Array) => strFromU8(unzipSync(b)['word/document.xml']!);

describe('Platzhalter der Vorlagen', () => {
  it('werden als Hinweis gemeldet und nennen das Element', () => {
    const p = mitVorlagen();
    expect(platzhalterStellen(p)).toHaveLength(2);
    const h = planPruefen(p).filter(b => b.regel === 'platzhalter');
    expect(h).toHaveLength(2);
    expect(h.every(b => b.art === 'hinweis' && !!b.element)).toBe(true);
  });
  it('sperren die Exporte als Fehler (mit Sprunglink-Element)', async () => {
    const p = mitVorlagen();
    const f = sperrFehler(p);
    expect(f.length).toBe(2);
    expect(f[0]!.element).toBeTruthy();
    await expect(erzeugeExport('word', p, 'de')).rejects.toThrow(/Vorlagentext noch nicht ersetzt/);
  });
  it('sind nach dem Ersetzen weg und der Export geht', async () => {
    const p = ersetzt(mitVorlagen());
    expect(platzhalterStellen(p)).toHaveLength(0);
    expect(planPruefen(p).some(b => b.regel === 'platzhalter')).toBe(false);
    expect((await erzeugeExport('word', p, 'de'))[0]!.bytes.length).toBeGreaterThan(1000);
  });
});

describe('Word: keine Rechtschreibmeldungen bei Antwortzeilen, Codes und Variablennamen', () => {
  it('Großdruck: noProof auf Antwortzeilen, Fragen sind Überschrift, Absätze einer Frage hängen zusammen', async () => {
    const x = xml(await papierGrossdruck(ersetzt(mitVorlagen()), 'de'));
    expect(x.match(/<w:noProof\/>/g)!.length).toBeGreaterThanOrEqual(10);
    expect(x).toMatch(/<w:pStyle w:val="Heading1"\/>/);   // ohne Seitentitel bleibt es auf Ebene 1 (Ebenen nicht überspringen)
    expect(x).toMatch(/<w:keepNext\/>/);
    expect(x).toMatch(/<w:keepLines\/>/);
  });
  it('Großdruck mit Seitentitel: Fragen sind Überschrift 2', async () => {
    const p = ersetzt(mitVorlagen());
    p.elemente[0]!.titel = { de: 'Teil A', en: 'Part A' };
    const x = xml(await papierGrossdruck(p, 'de'));
    expect(x).toMatch(/<w:pStyle w:val="Heading2"\/>/);
  });
  it('Standard-Papierbogen: Antwortzeilen mit noProof', async () => {
    expect(xml(await papierStandard(ersetzt(mitVorlagen()), 'de'))).toMatch(/<w:noProof\/>/);
  });
  it('Kodebuch: Variablennamen und Codes mit noProof; gleiche Beschriftung und Fragetext nicht doppelt', async () => {
    const p = ersetzt(mitVorlagen());
    const x = xml(await kodebuchWord(p, 'de'));
    expect(x.match(/<w:noProof\/>/g)!.length).toBeGreaterThanOrEqual(8);
    const frage = p.elemente[0]!.elemente[0]!.text['de']!;
    // der Fragetext steht je Variable einmal, nicht zusätzlich als Beschriftung
    expect(x.split(frage).length - 1).toBeLessThanOrEqual(2 /* Frage 1: Variable und Fehlendcodes-Zeilen ausgeschlossen */ + 2);
  });
});
