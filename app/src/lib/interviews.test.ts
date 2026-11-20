import { beforeEach, describe, expect, it } from 'vitest';
import { s } from './sitzung.svelte';
import { aendere, aktuellerLeitfaden, entferneLeitfaden, iv, leitfaeden, legeLeitfadenAn, uebernimmHauptkategorien, vorhandeneHauptkategorien } from './interviews.svelte';
import { neuerBlock, sammleFragen } from './leitfaden';

describe('Interviews: Zustand ohne Projekt', () => {
  beforeEach(() => { iv.entwurf = []; iv.aktiv = null; iv.hauptkategorien = []; iv.qualEntwurf = undefined; iv.offen = null; s.projekt = null; });
  it('legt Leitfäden als Entwurf an, ändert und entfernt sie', () => {
    const a = legeLeitfadenAn('A', 'de'), b = legeLeitfadenAn('B', 'en');
    expect(leitfaeden().map(x => x.titel)).toEqual(['A', 'B']);
    expect(aktuellerLeitfaden()?.id).toBe(b.id);
    aendere(x => sammleFragen(x, 'Wie geht es?'));
    expect(aktuellerLeitfaden()?.gesammelt).toHaveLength(1);
    expect(leitfaeden()[0]!.gesammelt).toHaveLength(0);
    entferneLeitfaden(b.id);
    expect(aktuellerLeitfaden()?.id).toBe(a.id);
  });
  it('Hauptkategorien: gleiche Namen (Groß-/Kleinschreibung egal) nur einmal', () => {
    expect(uebernimmHauptkategorien(['Stress', 'Zeit'])).toBe(2);
    expect(uebernimmHauptkategorien(['stress', 'Lernen'])).toBe(1);
    expect(vorhandeneHauptkategorien()).toEqual(['Stress', 'Zeit', 'Lernen']);
    const lf = neuerBlock(legeLeitfadenAn('C', 'de'), 'x');
    expect(lf.leitfaden.bloecke).toHaveLength(1);
  });
});
