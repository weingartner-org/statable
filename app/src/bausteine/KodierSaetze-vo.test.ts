/** Befund VO1: Optionen der Satzliste und der Code-Leiste tragen den vollen Namen als aria-label (VoiceOver liest aria-describedby an Optionen nicht). */
import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import { s } from '../lib/sitzung.svelte';
import { kodiere, legeCodeAn, saetze } from '../lib/kodieren';
import { neuesQualProjekt } from '../lib/qualprojekt';
import KodierSaetze from './KodierSaetze.svelte';
import CodeLeiste from './CodeLeiste.svelte';

s.einst.sprache = 'de'; s.einst.anrede = 'du';
const html = (c: unknown, props: Record<string, unknown>) => (render(c as never, { props: props as never }).body as string).replace(/ ?svelte-\w+/g, '');

function projekt() {
  let q = neuesQualProjekt('T');
  q = { ...q, kodierende: [{ id: 'p', name: 'Ich' }], ich: 'p', dokumente: [{ id: 'd1', name: 'Interview 1', art: 'text', text: 'Eins. Zwei.', erstellt: 1, geaendert: 1 }] };
  const a = legeCodeAn(q, 'Motivation'); q = a.q;
  const b = legeCodeAn(q, 'Stress', a.id); q = b.q;
  q = { ...q, codes: q.codes.map(c => (c.id === b.id ? { ...c, definition: 'Gefühl von Überlastung.' } : c)) };
  q = kodiere(q, 'd1', 0, 5, a.id, 'p');
  return { q, a: a.id, b: b.id };
}

describe('Satzliste: VoiceOver', () => {
  const { q, a } = projekt();
  const dok = q.dokumente[0]!;
  const sa = saetze(dok.text, 'de');
  const h = html(KodierSaetze, { dok, q, saetze: sa, gewaehlt: new Set([1]), fokusNr: 1, nurIch: false, ich: 'p', zumCode: () => {}, ziffer: () => {}, memo: () => {}, rueck: () => {} });
  it('aria-label mit Satztext, Position und Codes bzw. Keine Codes', () => {
    expect(sa.length).toBe(2);
    expect(h).toMatch(/id="ko-s-1"[^>]*aria-label="Eins\. Satz 1 von 2, Absatz 1\. Codes: [^"]*Motivation[^"]*\."/);
    expect(h).toMatch(/id="ko-s-2"[^>]*aria-label="Zwei\. Satz 2 von 2, Absatz 1\. Keine Codes\."/);
  });
  it('aria-selected, posinset, setsize', () => {
    expect(h).toMatch(/id="ko-s-1"[^>]*aria-selected="true"[^>]*aria-setsize="2"[^>]*aria-posinset="1"/);
    expect(h).toMatch(/id="ko-s-2"[^>]*aria-selected="false"[^>]*aria-setsize="2"[^>]*aria-posinset="2"/);
  });
  it('innere Spans aria-hidden, kein ko-sb-', () => {
    expect(h).toContain('<span class="satz" aria-hidden="true">Eins.</span>');
    expect(h).toContain('class="nr" aria-hidden="true"');
    expect(h).toContain('class="cn" aria-hidden="true"');
    expect(h).not.toContain('aria-describedby="ko-sb-');
    expect(h).not.toContain('id="ko-sb-');
  });
});

describe('Code-Leiste: VoiceOver', () => {
  const { q, a, b } = projekt();
  const h = html(CodeLeiste, { codes: q.codes, stelle: 'Satz 1', schnell: [b], ueberTaste: false, gib: () => {}, neu: () => {}, zurueck: () => {} });
  it('aria-label mit Pfad und Beschreibung, posinset und setsize', () => {
    expect(h).toMatch(new RegExp(`id="ko-cl-o-${a}"[^>]*aria-label="Motivation"[^>]*aria-setsize="2"[^>]*aria-posinset="1"`));
    // Stufe 6c: sichtbarer Text mit Schnell-Ziffer steht vorn im Namen (WCAG 2.5.3), danach die Beschreibung
    expect(h).toMatch(new RegExp(`id="ko-cl-o-${b}"[^>]*aria-label="Motivation: Stress 1\\. Gefühl von Überlastung\\. Ziffer 1\\."[^>]*aria-setsize="2"[^>]*aria-posinset="2"`));
  });
  it('Pfadtext aria-hidden, keine ko-cl-b-', () => {
    expect(h).toContain('<span aria-hidden="true">Motivation: Stress</span>');
    expect(h).not.toContain('ko-cl-b-');
  });
});
