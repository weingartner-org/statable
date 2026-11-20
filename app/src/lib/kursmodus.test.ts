import { afterEach, describe, expect, it } from 'vitest';
import { saetzeZweiGruppen, phStandard, type ZweiGruppen } from './ergebnis';
import { s } from './sitzung.svelte';

/* Kursmodus „klassisch“ (Andreas, 23.10.): Sollwerte Rscript am Mac (R 4.6.1) für n₁ = 12, m₁ = 5, s₁ = 2 und n₂ = 10, m₂ = 3,5, s₂ = 1,5:
 * klassisch t(20) = 1,95456, p = ,06475896, Bereich der Differenz [−0,1008439; 3,100844], gepoolte SD 1,792345; Welch t = 2,007449, df = 19,82296, p = ,05853023. */
const e: ZweiGruppen = {
  art: 'zwei-gruppen', abhaengig: 'wert', gruppenSpalte: 'gruppe',
  a: { name: 'A', n: 12, m: 5, sd: 2, kiLo: 3.7, kiHi: 6.3 }, b: { name: 'B', n: 10, m: 3.5, sd: 1.5, kiLo: 2.4, kiHi: 4.6 },
  diff: 1.5, t: 2.007449, df: 19.82296, p: 0.05853023, diffLo: -0.0546, diffHi: 3.0546,
  tKlassisch: 1.95456, dfKlassisch: 20, pKlassisch: 0.06475896, d: 0.836887, dLo: -0.05, dHi: 1.7, spGepoolt: 1.792345
};
const name = (n: string) => n;
afterEach(() => { s.einst.kurs = 'welch'; });

describe('Kursmodus: klassischer t-Test als Hauptergebnis', () => {
  it('Standard (Welch): t(19,82), p = ,059', () => { s.einst.kurs = 'welch'; const a = saetzeZweiGruppen(e, name); expect(a.apa).toContain('t(19,82)'); expect(a.apa).toContain('p = ,059'); expect(a.zusatz).toContain('nach Welch'); });
  it('klassisch: t(20), p = ,065, kein Welch im Satz, Bereich der Differenz aus dem gepoolten Standardfehler', () => {
    s.einst.kurs = 'klassisch'; s.einst.kiT = 'punkte';
    const a = saetzeZweiGruppen(e, name);
    expect(a.apa).toContain('t(20) = 1,95'); expect(a.apa).toContain('p = ,065'); expect(a.apa).toContain('−0,10'); expect(a.apa).toContain('3,10'); expect(a.zusatz).toContain('klassische t-Test'); expect(a.zusatz).not.toContain('nach Welch');
    s.einst.kiT = 'd';
  });
  it('klassisch: Standard-Paarvergleich Tukey, sonst Games-Howell', () => { s.einst.kurs = 'klassisch'; expect(phStandard()).toBe('tukey'); s.einst.kurs = 'welch'; expect(phStandard()).toBe('gh'); });
});
