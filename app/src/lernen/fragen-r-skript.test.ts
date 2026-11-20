/**
 * LE3 (14.11.2026): Die Zahlen der Einheit „Ergebnis in R nachrechnen“ (Hilfe-Artikel `sf-r-skript`, Fragen `sf-rs-…`) stammen aus
 * scripts/ueben-erwartet-r-skript.R (Palmer-Pinguine). Dieser Wächter vergleicht jede Zahl im Text mit lib/testdaten/ueben-erwartet-r-skript.json.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { FRAGEN } from './fragen-sauber-forschen';
import { ROH_SF } from '../hilfe/artikel-sauber-forschen';
import { pfadNach, einheitNach } from './lernplan';

const soll = JSON.parse(readFileSync(new URL('../lib/testdaten/ueben-erwartet-r-skript.json', import.meta.url), 'utf8')) as {
  anova: Record<'df_res' | 'f1_art_als_zweites' | 'f1_art_zuerst' | 'f1_ia' | 'f1_sex_als_erstes' | 'f1_sex_zuerst' | 'f3_art' | 'f3_ia' | 'f3_sex' | 'n', number>;
  gewicht: Record<'chi' | 'df' | 'faelle' | 'zeilen', number>; lmgewicht: Record<'df_faelle' | 'df_lm_weights', number>;
};
const z2 = (x: number) => x.toFixed(2);
const komma = (s: string) => s.replace('.', ',');
const textVon = (o: unknown): string => JSON.stringify(o);

describe('LE3: Ergebnis in R nachrechnen', () => {
  const artikel = textVon(ROH_SF.find(r => r.id === 'sf-r-skript'));
  const fragen = FRAGEN.filter(f => f.id.startsWith('sf-rs-'));

  it('sieben Fragen, eingebunden in die Einheit und den Pfad „Sauber forschen“', () => {
    expect(fragen).toHaveLength(7);
    const e = einheitNach('r-skript-nachrechnen')!;
    expect(e.fragen).toEqual(fragen.map(f => f.id));
    expect(pfadNach('sauber-forschen')!.einheiten).toContain('r-skript-nachrechnen');
  });

  it('F-Werte Typ I und Typ III wie in R (Artikel deutsch und englisch, Frage sf-rs-typ3)', () => {
    const a = soll.anova;
    for (const x of [a.f3_art, a.f3_sex, a.f3_ia, a.f1_art_zuerst, a.f1_sex_zuerst, a.f1_art_als_zweites, a.f1_sex_als_erstes]) {
      expect(artikel).toContain(komma(z2(x)));
      expect(artikel).toContain(z2(x));
    }
    expect(z2(a.f1_ia)).toBe(z2(a.f3_ia));
    expect(artikel).toContain(`F(1, ${a.df_res}) = ${komma(z2(a.f3_sex))}`);
    expect(artikel).toContain(`${a.n} `);
    const f = textVon(fragen.find(x => x.id === 'sf-rs-typ3'));
    for (const x of [a.f3_sex, a.f1_sex_zuerst, a.f1_sex_als_erstes]) { expect(f).toContain(komma(z2(x))); expect(f).toContain(z2(x)); }
    expect(f).toContain(`${a.n} `);
  });

  it('Häufigkeitsgewicht: Zeilen, Fälle, Chi-Quadrat, Freiheitsgrade wie in R', () => {
    const g = soll.gewicht, l = soll.lmgewicht;
    const chi = g.chi.toFixed(1);
    expect(artikel).toContain(`${g.zeilen} Zeilen`); expect(artikel).toContain(`${g.faelle} Tiere`);
    expect(artikel).toContain(`χ² = ${komma(chi)} bei df = ${g.df}`); expect(artikel).toContain(`χ² = ${chi} with df = ${g.df}`);
    expect(artikel).toContain(`${l.df_lm_weights} statt ${l.df_faelle} Freiheitsgrade`);
    const f = textVon(fragen.find(x => x.id === 'sf-rs-gewicht'));
    expect(f).toContain(`${g.zeilen} Zeilen`); expect(f).toContain(`${g.faelle} Fällen`); expect(f).toContain(`χ² = ${komma(chi)} bei df = ${g.df}`);
  });
});
