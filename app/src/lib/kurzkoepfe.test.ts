import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { tabelleDe } from './export';
import { tabelleHtmlStruktur } from './tabellenstruktur';
import { kurzform, KURZFORMEN } from './kurzkoepfe';
import { s } from './sitzung.svelte';
import { IN_ARBEIT } from '../i18n/laufzeit';
import type { TableItem } from '../engine/types';

/** Wächter für die Kurzformen der Spaltenköpfe in allen Sprachen (Wörterbuch output/<sp>-dict.json). */
const dictDir = fileURLToPath(new URL('../output/', import.meta.url));
const SPRACHEN = readdirSync(dictDir).filter(f => f.endsWith('-dict.json')).map(f => f.replace('-dict.json', ''))
  // Sprachen in Arbeit (V6a) bekommen ihre Kurzformen beim Nachziehen (V6b), vor der Freigabe.
  .filter(sp => !(IN_ARBEIT as string[]).includes(sp));
const dict = (sp: string) => JSON.parse(readFileSync(`${dictDir}${sp}-dict.json`, 'utf8')) as Record<string, string>;
/** Englische PSPP-Köpfe, für die es in de/en Kurzformen gibt. */
const EN_KOEPFE = Object.keys(KURZFORMEN.en!);
/** Ausgelassen, weil es keine allgemein übliche Kurzform gibt. */
const AUSGELASSEN: Record<string, string[]> = { el: ['Variance'], pl: ['Variance'], cs: ['Variance'] };

describe('Kurzformen der Spaltenköpfe: alle Sprachen', () => {
  it('jede im Wörterbuch vorhandene Sprache hat eine Tabelle', () => {
    for (const sp of SPRACHEN) expect(KURZFORMEN[sp], sp).toBeDefined();
  });
  for (const sp of SPRACHEN) {
    describe(sp, () => {
      const d = dict(sp);
      it('jeder Schlüssel ist ein echter Wörterbuchwert, jede Kurzform kürzer als die Langform', () => {
        for (const [lang, kurz] of Object.entries(KURZFORMEN[sp]!)) {
          if (sp === 'en') { expect(lang in d || lang === lang, lang).toBe(true); expect(kurz.length, lang).toBeLessThan(lang.length); continue; }
          expect(Object.values(d).includes(lang), `${sp}: ${lang}`).toBe(true);
          expect(kurz.length, `${sp}: ${lang} -> ${kurz}`).toBeLessThan(lang.length);
        }
      });
      it('jeder Kopf mit Kurzform auf Englisch hat sie auch hier (außer ausgelassen oder schon kurz)', () => {
        if (sp === 'en') return;
        for (const k of EN_KOEPFE) {
          const lang = d[k]; if (lang === undefined) continue;
          if (AUSGELASSEN[sp]?.includes(k)) { expect(kurzform(lang, sp), `${sp}: ${lang}`).toBeNull(); continue; }
          const schonKurz = lang.length <= 3 || /^R²$/.test(lang);
          if (schonKurz) continue;
          expect(kurzform(lang, sp), `${sp}: ${lang}`, ).not.toBeNull();
        }
      });
    });
  }
  it('Prüfsprache xx: Kurzformen stehen in Klammern wie das Wörterbuch', () => {
    for (const k of Object.values(KURZFORMEN.xx!)) expect(k).toMatch(/^\[.+\]$/);
  });
});

describe('Eindeutigkeit in der Tabelle', () => {
  const lade = (): TableItem[] => {
    const t = readFileSync(new URL('../../../docs/entwurf-opus/daten/pspp-ausgabe.json', import.meta.url), 'utf8');
    let j: unknown; try { j = JSON.parse(t); } catch { j = t.trim().split('\n').map(l => JSON.parse(l)); }
    return ((Array.isArray(j) ? j : [j]) as { type: string }[]).filter(i => i.type === 'table') as TableItem[];
  };
  const gs = lade().find(t => t.label === 'Group Statistics')!;
  it('zwei verschiedene Köpfe mit derselben Kurzform bleiben lang, eindeutige werden gekürzt', () => {
    s.einst.sprache = 'en';
    const tb = tabelleDe(gs, null);
    const st = tabelleHtmlStruktur(tb, { praefix: 'x', kurz: x => (x === 'Mean' || x === 'Std. Deviation') ? 'Z' : x === 'S.E. Mean' ? 'SE' : null });
    const koepfe = st.kopf[0]!.filter(c => c.art === 'th').map(c => c.text);
    expect(koepfe).toContain('Mean'); expect(koepfe).toContain('Std. Deviation'); expect(koepfe).not.toContain('Z');
    expect(koepfe).toContain('SE');
    expect(st.abkuerzungen).toEqual([{ kurz: 'SE', lang: 'S.E. Mean' }]);
  });
});
