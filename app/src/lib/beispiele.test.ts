import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BEISPIELE, FAECHER, META_FEEDBACK } from './beispiele';
import { VERFAHREN } from './verfahren';

const dir = join(__dirname, '..', '..', 'public', 'beispiel');
const kopf = (datei: string) => readFileSync(join(dir, datei + '.csv'), 'utf-8').split('\n')[0]!.split(';');

describe('Beispiel-Katalog', () => {
  it('hat eindeutige Kennungen und bekannte Fächer', () => {
    expect(new Set(BEISPIELE.map(b => b.id)).size).toBe(BEISPIELE.length);
    for (const b of BEISPIELE) expect(FAECHER.some(f => f.id === b.fach)).toBe(true);
  });
  for (const b of BEISPIELE) {
    it(`${b.id}: Spalten, Fragen und Bezeichnungen passen zur Datei`, () => {
      expect(b.schritte.length).toBeGreaterThan(0);
      for (const st of b.schritte) expect(st.art === 'planen' || VERFAHREN.some(v => v.id === st.art)).toBe(true);
      if (!b.datei) { expect(META_FEEDBACK.length).toBe(b.fälle); return; }
      const k = kopf(b.datei);
      const sets = new Set((b.sets ?? []).map(x => '$' + x.name));
      expect(b.bez.map(z => z.spalte)).toEqual(k);                       // jede Spalte hat eine Bezeichnung, in der Reihenfolge der Datei
      for (const z of b.bez) expect(z.bez.de && z.bez.en, z.spalte).toBeTruthy();
      for (const st of b.schritte) for (const n of Object.values(st.w ?? {}).flat()) expect(k.includes(n as string) || sets.has(n as string)).toBe(true);
      for (const w of b.werte ?? []) { expect(k).toContain(w.spalte); expect(w.labels.length, w.spalte).toBeGreaterThan(0); }
      for (const n of Object.keys(b.zellen ?? {})) expect(k).toContain(n);
      for (const n of [...(b.nominal ?? []), ...(b.ordinal ?? [])]) expect(k).toContain(n);
      for (const x of b.sets ?? []) for (const n of x.spalten) expect(k).toContain(n);
      const zeilen = readFileSync(join(dir, b.datei + '.csv'), 'utf-8').trim().split('\n').length - 1;
      expect(zeilen).toBe(b.fälle);
    });
  }
});

/* Spaltennamen in allen Sprachen (Johannes 29.10.2026): jede Übungsdatei in jeder Sprache mit gültigen, je Datei verschiedenen Namen. */
/** Beispiele, deren Spaltennamen in den 13 weiteren Sprachen noch nicht übersetzt sind (Übersetzung in der Woche ab 16.11.2026). */
const PSYCH_OFFEN: Record<string, true> = { 'grunfeld': true, 'zigaretten': true, 'hauspreise': true, 'senatswahlen': true, 'freunde-erinnern': true, 'anorexie-therapie': true, 'studierfaehigkeit': true, 'koerperbild-skala': true, 'diskriminierung-garcia': true, 'freiwilligkeit': true, 'persoenlichkeit-bfi': true, 'woerter-personen-reize': true };

describe('Spaltennamen der Übungsdateien', async () => {
  const { SPALTENNAMEN } = await import('./beispiele');
  const { gueltigerName } = await import('./skalabau');
  const { erkenneGruppierung } = await import('./mehrebenen');
  const SPRACHEN = ['fr', 'es', 'it', 'pt', 'nl', 'sv', 'ro', 'pl', 'cs', 'hu', 'el', 'uk', 'bg'];
  const datei = (sp: string) => JSON.parse(readFileSync(join(__dirname, '..', 'i18n', 'sprachen', sp + '.json'), 'utf-8')) as Record<string, string>;
  const name = (sp: string, n: string, d: Record<string, string>) => { const p = SPALTENNAMEN[n]; return !p ? n : sp === 'de' ? p.de : sp === 'en' ? p.en : d[p.k!]; };
  const dateien = [...BEISPIELE.filter(b => b.datei).map(b => kopf(b.datei!)), ['nr', 'geschlecht', 'alter', 'semester', 'handy_im_bett', 'schlaf_stunden', 'kaffee_tassen', 'konzentration']];
  /** Übersetzung offen (Johannes 09.11.2026: erst Deutsch und Englisch, die 13 weiteren Sprachen in der Woche ab 16.11.2026):
   *  Spalten der neuen Psychologie-Beispiele (Stufe 6 „nutzen“) dürfen in den 13 Sprachen noch fehlen. Danach diese Liste leeren. */
  const UEBERSETZUNG_OFFEN = new Set(BEISPIELE.filter(b => b.datei && b.id in PSYCH_OFFEN).flatMap(b => kopf(b.datei!)));

  it('jeder Eintrag gehört zu einer Spalte, der Bau hat ihm einen Schlüssel gegeben', () => {
    for (const [n, p] of Object.entries(SPALTENNAMEN)) { expect(p.de).toBe(n); expect(p.k, n).toBeTruthy(); expect(dateien.some(k => k.includes(n)), n).toBe(true); }
  });
  for (const sp of ['de', 'en', ...SPRACHEN]) {
    it(`${sp}: übersetzt, gültig und je Datei verschieden`, () => {
      const d = sp === 'de' || sp === 'en' ? {} : datei(sp);
      for (const n of Object.keys(SPALTENNAMEN)) { if (sp !== 'de' && sp !== 'en' && UEBERSETZUNG_OFFEN.has(n) && !d[SPALTENNAMEN[n]!.k!]) continue; const w = name(sp, n, d); expect(w, `${sp} ${n}`).toBeTruthy(); expect(gueltigerName(w!), `${sp} ${n} → ${w}`).toBe(true); expect(new TextEncoder().encode(w!).length).toBeLessThanOrEqual(60); }
      for (const k of dateien) { const neu = k.map(n => (name(sp, n, d) ?? n).toLowerCase()); expect(new Set(neu).size, `${sp}: ${k.join(',')}`).toBe(neu.length); }
    });
    it(`${sp}: die Spalte „klasse“ wird als Gruppierung erkannt`, () => {
      const d = sp === 'de' || sp === 'en' ? {} : datei(sp);
      const spalten = [{ name: name(sp, 'klasse', d)!, bezeichnung: '', art: 'text', niveau: 'nominal', format: 'A3', fehlend: [], fehlendText: '', werteLabels: {} }] as unknown as Parameters<typeof erkenneGruppierung>[0];
      const zeilen = Array.from({ length: 40 }, (_, i) => [`k${i % 8}`]);
      expect(erkenneGruppierung(spalten, zeilen)?.weil, `${sp}: ${spalten[0]!.name}`).toBe('name');
    });
  }
});
