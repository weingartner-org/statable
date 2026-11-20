/** Abschlusstest A7: Meta-Analyse mit zu vielen Studien - eine sachliche Meldung vor dem Rechnen, keine technische R-Meldung nach Minuten. */
import { describe, expect, it } from 'vitest';
import { META_K_MAX, metaGrenzeText } from './metaanalyse';
import { rFehlerText } from './rverfahren.svelte';

describe('Meta-Analyse: Obergrenze der Studienzahl', () => {
  it('bis zur Grenze keine Meldung (3.000 Studien liefen in 42 s)', () => {
    expect(META_K_MAX).toBe(3000);
    expect(metaGrenzeText(30)).toBeNull(); expect(metaGrenzeText(3000)).toBeNull();
  });
  it('darüber: sagt, wie viele es sind, was Statable schafft und was man tun kann', () => {
    const t = metaGrenzeText(5000)!;
    expect(t).toMatch(/5[\s.,  ]?000/); expect(t).toMatch(/3[\s.,  ]?000/);
    expect(t).toContain('Auswahl'); expect(t).not.toMatch(/allocate|vector/);
  });
  it('„cannot allocate vector of size …“ wird zur Speicher-Meldung, nicht zur technischen R-Meldung', () => {
    const t = rFehlerText('cannot allocate vector of size 190.7 Mb');
    expect(t).toContain('Arbeitsspeicher'); expect(t).not.toContain('cannot allocate');
  });
});
