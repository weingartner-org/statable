import { beforeAll, describe, expect, it } from 'vitest';
import { saetzeZweiGruppen, zweiGruppen } from './ergebnis';
import { nodeEngine } from './testengine';
import { s } from './sitzung.svelte';

/* Abschlusstest F8 (10.10.2026): Der Satz zum t-Test nach Welch sagt, dass d die gepoolte SD nutzt; hat eine Gruppe weniger als 20 Personen,
 * nennt er Hedges g dazu (Lakens 2013). Vergleichswerte: scripts/hedges-erwartet.R (effectsize::cohens_d / hedges_g, pooled_sd = TRUE). */
const A = [12, 15, 11, 18, 14, 16, 13, 17, 15, 19, 12, 16], B = [10, 12, 9, 14, 11, 13, 8, 12, 10, 15, 11, 9, 13, 12, 10];
let e: Awaited<ReturnType<typeof nodeEngine>>;
beforeAll(async () => {
  e = await nodeEngine();
  e.run('DATA LIST LIST /g x.\nBEGIN DATA\n' + [...A.map(v => `1 ${v}`), ...B.map(v => `2 ${v}`)].join('\n') + '\nEND DATA.');
  s.einst.sprache = 'de'; s.einst.zahl = 'komma';
});
const rechne = () => zweiGruppen(e.run('T-TEST GROUPS=g(1 2) /VARIABLES=x.'), 'x', 'g');

describe('Abschlusstest F8: Hedges g und gepoolte SD beim t-Test nach Welch', () => {
  it('g und sein Intervall wie R effectsize::hedges_g', () => {
    const r = rechne();
    expect([r.d, r.dLo, r.dHi].map(v => v.toFixed(4))).toEqual(['1.5976', '0.7080', '2.4633']);
    expect([r.g!, r.gLo!, r.gHi!].map(v => v.toFixed(4))).toEqual(['1.5491', '0.6865', '2.3885']);
  });
  it('Satz: d mit gepoolter SD; Hedges g bei einer Gruppe unter 20; Marke', () => {
    const t = saetzeZweiGruppen(rechne(), n => n);
    expect(t.zusatz).toContain('Cohens d (1,60) rechnet mit der gemeinsamen (gepoolten) Standardabweichung beider Gruppen, der Test nach Welch nicht.');
    expect(t.zusatz).toContain('Weil eine Gruppe weniger als 20 Personen hat, steht daneben Hedges g = 1,55, 95 %-KI [0,69; 2,39]: Es gleicht aus, dass d bei kleinen Gruppen etwas zu groß ausfällt.');
    expect(t.marken.map(m => m.text)).toContain('Hedges g = 1,55');
  });
  it('ab 20 je Gruppe kein g, der Hinweis zur gepoolten SD bleibt', () => {
    const r = { ...rechne(), a: { ...rechne().a, n: 25 }, b: { ...rechne().b, n: 30 } };
    const t = saetzeZweiGruppen(r, n => n);
    expect(t.zusatz).toContain('gepoolten');
    expect(t.zusatz).not.toContain('Hedges');
  });
  it('Englisch', () => {
    s.einst.sprache = 'en'; s.einst.zahl = 'sprache';
    const t = saetzeZweiGruppen(rechne(), n => n);
    expect(t.zusatz).toContain("Cohen's d (1.60) uses the common (pooled) standard deviation of both groups; Welch's test does not.");
    expect(t.zusatz).toContain("Because one group has fewer than 20 people, Hedges' g = 1.55, 95% CI [0.69, 2.39] is given as well: it corrects for d coming out slightly too large in small groups.");
    s.einst.sprache = 'de'; s.einst.zahl = 'komma';
  });
});
