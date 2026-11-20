// Wächter E1 (WCAG 1.3.1, 2.4.2, 3.1.1, 2.4.1/4.1.2): die festen Hilfeseiten (hilfeSeiten) sind barrierefrei gebaut.
// Jede Tabelle hat eine caption, jedes <nav> einen Namen, jede Seite lang und einen Titel. Mit Gegenprobe: der Prüfer findet präparierte Fehler.
import { describe, expect, it } from 'vitest';
import { artikelListe } from './artikel';
import { hilfeSeiten } from './seiten';

const SPRACHEN = ['de', 'en', 'fr'] as const;
const eingabe = () => ({
  sprachen: [...SPRACHEN] as ('de' | 'en' | 'fr')[],
  artikel: Object.fromEntries(SPRACHEN.map(s => [s, artikelListe(s)])) as Record<string, ReturnType<typeof artikelListe>>,
  unterzeile: { de: 'Statistik für Studium und Forschung', en: 'Statistics for study and research', fr: 'Statistiques' } as Record<string, string>,
  schrift: { normal: 'assets/a.woff2', fett: 'assets/b.woff2' }
});

/** Liefert die Befunde einer Seite (leer = in Ordnung). */
export function befunde(html: string): string[] {
  const b: string[] = [];
  if (!/<html lang="[a-z]{2,3}"/.test(html)) b.push('html ohne lang');
  if (!/<title>[^<]+<\/title>/.test(html)) b.push('ohne Titel');
  for (const t of html.match(/<table[\s>][\s\S]*?<\/table>/g) ?? []) if (!/^<table[^>]*>\s*<caption>[^<]+<\/caption>/.test(t)) b.push('Tabelle ohne caption');
  for (const n of html.match(/<nav[\s>][^>]*>/g) ?? []) if (!/aria-label="[^"]+"/.test(n)) b.push('nav ohne Namen');
  return b;
}

describe('Feste Hilfeseiten: barrierefreier Aufbau', () => {
  const seiten = hilfeSeiten(eingabe()).filter(d => d.pfad.endsWith('.html'));
  it('es gibt Seiten, und mindestens eine hat eine Tabelle', () => {
    expect(seiten.length).toBeGreaterThan(100);
    expect(seiten.some(d => d.inhalt.includes('<table'))).toBe(true);
  });
  it('jede Tabelle hat eine caption, jedes nav einen Namen, jede Seite lang und Titel', () => {
    const rot = seiten.flatMap(d => befunde(d.inhalt).map(x => `${d.pfad}: ${x}`));
    expect(rot.slice(0, 10)).toEqual([]);
  });
  it('Gegenprobe: der Prüfer findet fehlende caption, nav ohne Namen, fehlendes lang und fehlenden Titel', () => {
    const mit = seiten.find(d => d.inhalt.includes('<table'))!.inhalt;
    expect(befunde(mit)).toEqual([]);
    expect(befunde(mit.replace(/<caption>[^<]*<\/caption>/, ''))).toContain('Tabelle ohne caption');
    expect(befunde(mit.replace(/<nav [^>]*aria-label="[^"]*"/, '<nav'))).toContain('nav ohne Namen');
    expect(befunde(mit.replace(/<html lang="[a-z]+"/, '<html'))).toContain('html ohne lang');
    expect(befunde(mit.replace(/<title>[^<]*<\/title>/, ''))).toContain('ohne Titel');
  });
});
