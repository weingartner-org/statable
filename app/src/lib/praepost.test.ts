import { beforeAll, describe, expect, it } from 'vitest';
import { komma, ohneNull, praePost, saetzePraePost } from './ergebnis';
import { nodeEngine } from './testengine';
import { dzBereich } from './verteilung';
import { s as s0 } from './sitzung.svelte';

/* Vergleichswerte aus R (Skript: scripts/praepost-erwartet.R), 14 Personen:
 *   t.test(post, prae, paired = TRUE); d_z = mean(dd)/sd(dd); Bereich: uniroot(pt(t, n-1, ncp) = .975/.025) / √n; d_av = mean(dd)/mean(sd(prae), sd(post)) */
const PRAE = [12, 14, 9, 15, 11, 13, 10, 16, 12, 14, 8, 13, 11, 15], POST = [14, 17, 8, 19, 13, 18, 11, 19, 12, 16, 12, 16, 12, 17];
const DATEN = 'NEW FILE.\nDATA LIST LIST /prae post.\nBEGIN DATA\n' + PRAE.map((v, i) => `${v} ${POST[i]}`).join('\n') + '\nEND DATA.\n';

let e: Awaited<ReturnType<typeof nodeEngine>>;
beforeAll(async () => { e = await nodeEngine(); e.run(DATEN); });

describe('Gepaarte Messung (T-TEST PAIRS ... (PAIRED))', () => {
  it('Zahlen wie R', () => {
    const r = praePost(e.run('T-TEST PAIRS=prae WITH post (PAIRED).'), 'prae', 'post');
    expect(r.n).toBe(14);
    expect([r.m1, r.sd1, r.m2, r.sd2].map(v => v.toFixed(6))).toEqual(['12.357143', '2.373156', '14.571429', '3.344669']);
    expect([r.diff, r.sdDiff, r.diffLo, r.diffHi, r.t, r.r].map(v => v.toFixed(6))).toEqual(['2.214286', '1.625687', '1.275642', '3.152929', '5.096369', '0.892974']);
    expect([r.df, r.p.toFixed(5)]).toEqual([13, '0.00021']);
    expect([r.dz, r.dzLo, r.dzHi, r.dav].map(v => v.toFixed(4))).toEqual(['1.3621', '0.6123', '2.0856', '0.7745']);
  });
  it('dzBereich: nichtzentrales t wie R', () => {
    const [lo, hi] = dzBereich(1.362062, 14);
    expect([lo.toFixed(4), hi.toFixed(4)]).toEqual(['0.6123', '2.0856']);
  });
  it('sehr große Effekte: Bereich enthält dz (Normalnäherung ab ncp 30)', () => {
    // Browser-Fund: dz = 4,10 bei n = 117 (ncp = 44) - der Bereich lag vorher daneben.
    const [lo, hi] = dzBereich(4.1, 117);
    expect(lo).toBeLessThan(4.1); expect(hi).toBeGreaterThan(4.1);
    expect([lo.toFixed(2), hi.toFixed(2)]).toEqual(['3.54', '4.66']);   // R: d ± 1,959964 · sqrt(1/n + d²/(2n))
  });
  it('Satz, APA und Marken', () => {
    const s = saetzePraePost(praePost(e.run('T-TEST PAIRS=prae WITH post (PAIRED).'), 'prae', 'post'), n => (n === 'prae' ? 'Vorher' : 'Nachher'));
    expect(s.haupt).toBe('Bei „Nachher“ lag der Wert im Schnitt 2,2 höher als bei „Vorher“: 14,6 gegen 12,4.');
    // Abschlusstest F4 (Lakens 2013): die Wortstufe kommt aus dav (vergleichbar mit Cohens Grenzen), dz bleibt für die Teststärke und das Intervall.
    expect(s.zusatz).toContain('Die Veränderung ist mittelgroß (dav = 0,77, nach üblicher Faustregel für d).');
    expect(s.vorsicht).toContain('Die Einordnung folgt dav, das wie d aus Gruppenvergleichen gerechnet ist. dz = 1,36 fällt größer aus, weil vorher und nachher zusammenhängen (r = ,89); es ist das Maß für die Teststärke (Lakens 2013).');
    expect(s.apa).toBe('t(13) = 5,10, p < ,001, dz = 1,36, 95 %-KI [0,61; 2,09], dav = 0,77');
    expect(s.marken.map(m => m.text)).toEqual(['Veränderung: mittelgroß · dav = 0,77', 'p < ,001 · unter ,05', 'Plausibler Bereich für dz: 0,61 bis 2,09', 'dz = 1,36', 'Kleine Stichprobe (n = 14)']);
    void ohneNull; void komma;
  });
  it('F4: schwacher Zusammenhang vorher-nachher - dz kleiner als dav; Englisch', () => {
    const r = praePost(e.run('T-TEST PAIRS=prae WITH post (PAIRED).'), 'prae', 'post');
    const s = saetzePraePost({ ...r, r: 0.3, dz: 0.6, dav: 0.85 }, n => n);
    expect(s.zusatz).toContain('Die Veränderung ist groß (dav = 0,85, nach üblicher Faustregel für d).');
    expect(s.vorsicht).toContain('dz = 0,60 fällt kleiner aus, weil vorher und nachher nur schwach zusammenhängen (r = ,30)');
    s0.einst.sprache = 'en'; s0.einst.zahl = 'sprache';
    const en = saetzePraePost(r, n => n);
    expect(en.zusatz).toContain('The change is medium-sized (dav = 0.77, by a common rule of thumb for d).');
    expect(en.vorsicht).toContain('The classification follows dav, which is calculated like d in group comparisons. dz = 1.36 is larger because before and after are related (r = .89); it is the measure for statistical power (Lakens 2013).');
    s0.einst.sprache = 'de'; s0.einst.zahl = 'komma';
  });
  it('Wilcoxon (Hinweis bei kleiner Stichprobe) läuft in PSPP; p wie R (exact = FALSE, correct = FALSE)', () => {
    const r = e.run('NPAR TESTS /WILCOXON=prae WITH post (PAIRED).');
    expect(r.some(i => i.type === 'table' && i.label === 'Test Statistics')).toBe(true);
    expect(r.some(i => i.type === 'message' && i.severity === 'error')).toBe(false);
  });
  it('Kontrollgruppe: GLM kennt in PSPP 2.1.1 keine Kovariaten, die Regression mit Gruppenspalte gibt die ANCOVA-Zahlen (R lm(post ~ prae + g))', () => {
    e.run('COMPUTE g = MOD($CASENUM - 1, 2).\nEXECUTE.');
    const r = e.run('REGRESSION /VARIABLES=prae g /DEPENDENT=post /METHOD=ENTER /STATISTICS=COEFF R ANOVA CI(95).');
    expect(r.filter(i => i.type === 'message').map(i => (i as { text: string }).text)).toEqual([]);
    const ko = r.find(i => i.type === 'table' && /^Coefficients/.test(i.label)) as { cells: { t: string; n?: number }[] };
    const zahlen = ko.cells.filter(c => c.n !== undefined).map(c => c.n!);
    expect(zahlen.some(v => Math.abs(v - 2.9777992) < 1e-6)).toBe(true);   // B der Gruppe: Unterschied nach Abzug der Vorher-Werte
    expect(zahlen.some(v => Math.abs(v - 0.0507092) < 1e-6)).toBe(true);   // p
  });
});
