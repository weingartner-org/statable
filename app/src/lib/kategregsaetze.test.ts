import { afterEach, describe, expect, it } from 'vitest';
import { s } from './sitzung.svelte';
import type { KatKoef, KatLr, KatPraed, MultReg, OrdReg, ZaehlReg } from './kategreg';
import { saetzeOrdreg, saetzeMultreg, saetzeZaehlreg, tabellenKategreg, gerechnetText, katWarum } from './kategregsaetze';
import ERW from './testdaten/welle3-erwartet.json';

/* Sätze, APA-Zeilen und Tabellen von Welle 3 mit den Zahlen aus der R-Rechnung (scripts/welle3-erwartet.R → welle3-erwartet.json):
 * ordinal: housing (V&R 2002) und der eigene Datensatz mit verletzter Parallelität; multinomial: eigener Datensatz Bus/Rad/Zug; Zähldaten: quine, Offset, Null-Überschuss. */
type Z = Record<string, any>;
const E = ERW as unknown as { datensaetze: Record<string, { spalten: Record<string, { typ: string; labels?: string[] }> }>; ordinal: Z[]; multinomial: Z[]; zaehldaten: Z[] };
const fall = (l: Z[], name: string) => l.find(f => f.name === name)!;
afterEach(() => { s.einst.sprache = 'de'; s.einst.anrede = 'du'; });
const id = (x: string) => x;
const n = (t: string) => t.replace(/[  ]/g, ' ');

/** Prädiktoren eines Falls: Zahl oder Gruppe mit den Stufen des Datensatzes (erste = Vergleich). */
function praedVon(f: Z): KatPraed[] {
  return f.praediktoren.map((p: Z): KatPraed => ({ name: p.name, art: p.typ === 'gruppe' ? 'faktor' : 'zahl', stufen: p.typ === 'gruppe' ? [...p.stufen] : [] }));
}
const idx = (praed: KatPraed[], spalte: string) => praed.findIndex(p => p.name === spalte);
function koefVon(zeilen: Z[], praed: KatPraed[], kategorie?: string): KatKoef[] {
  return zeilen.map(z => ({ pIdx: z.spalte ? idx(praed, z.spalte) : -1, stufe: z.stufe ?? '', ...(kategorie ? { kategorie } : {}), b: z.b, se: z.se, z: z.z, p: z.p, effekt: z.or ?? z.irr, kiU: z.or_ki_unten ?? z.irr_ki_unten, kiO: z.or_ki_oben ?? z.irr_ki_oben }));
}
const lrVon = (zeilen: Z[], praed: KatPraed[]): KatLr[] => zeilen.map(l => ({ pIdx: idx(praed, l.spalte), chi2: l.chi2_geklemmt ?? l.chi2, df: l.df, p: l.p_geklemmt ?? l.p, ...(l.chi2_geklemmt !== undefined ? { unsicher: l.chi2 <= 0 } : {}) }));

function ordreg(name: string): OrdReg {
  const f = fall(E.ordinal, name), praed = praedVon(f);
  return {
    art: 'ordreg', ziel: f.ziel, praed, n: f.n_gueltig, ausgelassen: f.n_ausgelassen, koef: koefVon(f.koeffizienten, praed), lr: lrVon(f.lr_je_praediktor, praed),
    modelltest: f.modelltest, loglik: f.loglik_modell, loglik0: f.loglik_null, warnungen: [], stufen: f.ziel_stufen, stufenN: Object.values(f.stufen_n) as number[],
    schwellen: f.schwellen, nagelkerke: f.pseudo_r2.nagelkerke, coxSnell: f.pseudo_r2.cox_snell,
    brant: f.brant_pruefbar ? { gesamt: f.brant_soll.gesamt, praed: Object.entries(f.brant_soll.je_praediktor as Record<string, Z>).map(([k, v]) => ({ pIdx: idx(praed, k), ...v })) as any } : null,
    ...(f.brant_pruefbar ? {} : { brantFehler: 'a binary split did not converge' })
  } as OrdReg;
}
function multreg(name: string): MultReg {
  const f = fall(E.multinomial, name), praed = praedVon(f);
  return {
    art: 'multreg', ziel: f.ziel, praed, n: f.n_gueltig, ausgelassen: f.n_ausgelassen,
    koef: Object.entries(f.kategorien as Record<string, Z[]>).flatMap(([k, z]) => koefVon(z, praed, k)), lr: lrVon(f.lr_je_praediktor, praed),
    modelltest: f.modelltest, loglik: f.loglik_modell, loglik0: f.loglik_null, warnungen: [], referenz: f.referenz, kategorien: Object.keys(f.kategorien), stufenN: Object.values(f.stufen_n) as number[],
    konvergiert: f.convergence === 0, nParameter: f.n_parameter, nagelkerke: f.pseudo_r2.nagelkerke, coxSnell: f.pseudo_r2.cox_snell
  };
}
function zaehlreg(name: string, modell: 'poisson' | 'negbin', grund: ZaehlReg['grund']): ZaehlReg {
  const f = fall(E.zaehldaten, name), praed = praedVon(f), S = modell === 'poisson' ? f.poisson : f.negbin_profil;
  const mu0 = modell === 'poisson' ? f.poisson.nullen_erwartet : f.negbin_profil.nullen_erwartet;
  return {
    art: 'zaehlreg', ziel: f.ziel, praed, n: f.n_gueltig, ausgelassen: f.n_ausgelassen, koef: koefVon(S.koeffizienten, praed), lr: lrVon(S.lr_je_praediktor, praed),
    modelltest: S.modelltest, loglik: S.loglik, loglik0: S.loglik - S.modelltest.chi2 / 2, warnungen: [], modell, grund,
    theta: modell === 'negbin' ? S.theta : null, thetaSe: modell === 'negbin' ? S.theta_se : null, thetaAmRand: !!f.negbin_profil.theta_am_rand_oben, pearsonDf: f.poisson.pearson_chi2_df,
    lrUeber: { chi2: Math.max(f.negbin_profil.lr_ueber.lr, 0), p: f.negbin_profil.lr_ueber.p }, nullen: { beobachtet: f.nullen_beobachtet, erwartet: mu0 },
    nullenHinweis: f.nullen_beobachtet > 1.5 * mu0 && f.nullen_beobachtet > 0.1, offset: f.offset ?? null, mittelwert: f.mittelwert, varianz: f.varianz, konvergiert: true
  };
}

describe('ordinale Regression', () => {
  it('housing: Brant unauffällig - der Satz beginnt mit dem Ergebnis, die APA-Zeile nennt Modelltest, Nagelkerke, Brant', () => {
    const st = saetzeOrdreg(ordreg('a_housing'), id);
    expect(st.haupt).toBe('Mit „Infl“, „Type“ und „Cont“ lässt sich „Sat“ signifikant vorhersagen.');
    expect(st.apa).toMatch(/^χ²\(6\) = 169,73, p < ,001, Nagelkerke R² = ,11; /);
    expect(st.apa).toContain('Infl (High): OR = 3,63, 95 %-KI [2,83; 4,66], p < ,001');
    expect(st.apa).toMatch(/; Brant χ²\(6\) = 8,53, p = ,201$/);
    expect(st.zusatz).toContain('Die Annahme paralleler Linien wird nicht verworfen (Brant-Test χ²(6) = 8,53, p = ,201).');
    expect(st.zusatz).toContain('„Infl“ trägt insgesamt signifikant zur Vorhersage bei, χ²(2) = 108,24, p < ,001.');
    expect(st.zusatz).toContain('Die Stufen von „Sat“ gehen von „Low“ bis „High“');
    expect(st.zusatz).toContain('Nagelkerkes R² = ,11 ist ein Pseudo-R²');
    expect(n(st.haupt + st.zusatz + st.vorsicht)).not.toMatch(/deutlich/);
  });
  it('verletzte Parallelität steht ZUERST, vor dem Ergebnissatz; das Angebot (multinomial) macht die Seite', () => {
    const e = ordreg('b_eigen_brant_signifikant'), st = saetzeOrdreg(e, id);
    expect(st.haupt.startsWith('Die Annahme paralleler Linien ist verletzt (Brant-Test χ²(')).toBe(true);
    expect(st.haupt).toMatch(/Ein einziges OR fasst sie dann nur ungenau zusammen\. Mit /);
    expect(e.brant!.gesamt.p).toBeLessThan(0.05);
    expect(st.marken.some(m => m.hinweis && m.text.startsWith('Brant'))).toBe(true);
    s.einst.sprache = 'en';
    expect(saetzeOrdreg(e, id).haupt.startsWith('The parallel-lines assumption is violated (Brant test χ²(')).toBe(true);
  });
  it('Brant nicht prüfbar: Satz ohne Zahl, kein Abbruch', () => {
    const e = ordreg('d_brant_trennung_teilung'), st = saetzeOrdreg(e, id);
    expect(e.brant).toBeNull();
    expect(st.haupt.startsWith('Die Annahme paralleler Linien lässt sich mit diesen Daten nicht prüfen.')).toBe(true);
    expect(st.apa).not.toContain('Brant');
    expect(st.marken.some(m => m.text.includes('nicht prüfbar'))).toBe(true);
  });
  it('eine Zahl als einziger Prädiktor: „Mit jeder Einheit mehr … steigt die Chance, eine höhere Stufe … anzugeben, um den Faktor …“', () => {
    const e = ordreg('b_eigen_brant_signifikant'), x = e.koef.find(k => k.stufe === '' && k.pIdx === 0)!;
    const eins: OrdReg = { ...e, praed: [e.praed[0]!], koef: [{ ...x, p: 0.003, effekt: 1.05, kiU: 1.02, kiO: 1.09 }], lr: [], brant: { gesamt: { chi2: 4.1, df: 3, p: 0.251 }, praed: [] } };
    expect(saetzeOrdreg(eins, id).haupt).toBe('Mit jeder Einheit mehr bei „x“ steigt die Chance, eine höhere Stufe von „y“ anzugeben, um den Faktor 1,05 (OR = 1,05, 95 %-KI [1,02; 1,09], p = ,003).');
    const sinkt = { ...eins, koef: [{ ...eins.koef[0]!, effekt: 0.5, kiU: 0.4, kiO: 0.62 }] };
    expect(saetzeOrdreg(sinkt, id).haupt).toContain('sinkt die Chance, eine höhere Stufe von „y“ anzugeben, um den Faktor 2,00 (OR = 0,50');
    const nichts = { ...eins, koef: [{ ...eins.koef[0]!, p: 0.41, effekt: 1.01, kiU: 0.98, kiO: 1.04 }] };
    expect(saetzeOrdreg(nichts, id).haupt).toContain('zeigt sich kein signifikanter Zusammenhang mit höheren Stufen');
    expect(saetzeOrdreg({ ...eins, koef: [{ ...eins.koef[0]!, effekt: 1.003, kiU: 1, kiO: 1.01 }] }, id).haupt).toContain('praktisch nicht');
  });
  it('Gruppen-Spalte mit zwei Stufen als einziger Prädiktor: Vergleich mit der ersten Stufe', () => {
    const e = ordreg('c_leere_stufe'), g = e.koef.find(k => k.pIdx === 1 && k.stufe === 'Stadt')!;
    const eins: OrdReg = { ...e, praed: [{ ...e.praed[1]!, stufen: ['Land', 'Stadt'] }], koef: [{ ...g, pIdx: 0, p: 0.01, effekt: 2.3, kiU: 1.4, kiO: 3.7 }], lr: [], brant: { gesamt: { chi2: 2, df: 2, p: 0.3 }, praed: [] } };
    expect(saetzeOrdreg(eins, id).haupt).toBe('Bei „Stadt“ („g“) ist die Chance, eine höhere Stufe von „y_leer“ anzugeben, gegenüber „Land“ um den Faktor 2,30 höher (OR = 2,30, 95 %-KI [1,40; 3,70], p = ,010).');
  });
  it('Tabellen: Koeffizienten, Schwellen, Modelltests, Brant', () => {
    const t = tabellenKategreg(ordreg('a_housing'), id);
    expect(t.map(x => x.label)).toEqual(['Ordinal Regression Coefficients', 'Ordinal Regression Thresholds', 'Ordinal Regression Model Tests', 'Ordinal Regression Brant Test']);
    expect(t[0]!.rows).toBe(1 + 6); expect(t[1]!.rows).toBe(1 + 2);
    expect(tabellenKategreg(ordreg('d_brant_trennung_teilung'), id).map(x => x.label)).toEqual(['Ordinal Regression Coefficients', 'Ordinal Regression Thresholds', 'Ordinal Regression Model Tests']);
  });
});

describe('multinomiale Regression', () => {
  it('eigener Datensatz (Bus, Rad, Zug): LR-Test je Prädiktor zuerst, dann die Einzel-OR; Vergleich mit „Bus“ in Satz, Gerechnet-Zeile und APA', () => {
    const e = multreg('c_eigen'), st = saetzeMultreg(e, id);
    expect(st.haupt).toBe('Mit „alter“ und „w“ lässt sich „v“ signifikant vorhersagen (Vergleich mit „Bus“).');
    expect(st.zusatz).toContain('„alter“ trägt insgesamt signifikant zur Vorhersage bei, χ²(2) = 14,84, p < ,001.');
    expect(st.zusatz).toContain('„w“ trägt insgesamt nicht signifikant zur Vorhersage bei, χ²(4) = 8,75, p = ,068.');
    expect(st.zusatz).toContain('Gegenüber „Bus“ steigt mit jeder Einheit mehr bei „alter“ die Chance für „Zug“ um den Faktor 1,03 (OR = 1,03, 95 %-KI [1,01; 1,06], p = ,003).');
    expect(st.apa).toBe('χ²(6) = 24,12, p < ,001, Nagelkerke R² = ,12; alter: χ²(2) = 14,84, p < ,001; w: χ²(4) = 8,75, p = ,068');
    expect(gerechnetText(e)).toBe('multinomiale logistische Regression, Vergleich mit „Bus“');
    expect(n(st.haupt + st.zusatz)).not.toMatch(/deutlich/);
  });
  it('Nicht-Konvergenz (Trennung) steht zuerst; negative LR-χ² sind auf 0 geklemmt und unsicher', () => {
    const e = multreg('d_trennung'), st = saetzeMultreg(e, id);
    expect(e.konvergiert).toBe(false);
    expect(st.haupt.startsWith('Die Schätzung ist nicht sicher zu Ende gekommen; die Zahlen sind nicht verlässlich - meist trennt ein Prädiktor die Kategorien.')).toBe(true);
    expect(st.haupt).toContain('Trennung: Die Schätzung für');
    expect(st.zusatz).toContain('(unsicher)');
    expect(st.marken.some(m => m.hinweis)).toBe(true);
  });
  it('Referenzwechsel: dieselbe Anpassung, anderer Satz; englisch', () => {
    const a = multreg('a_housing_referenz_erste'), b = multreg('b_housing_referenz_letzte');
    expect(saetzeMultreg(a, id).haupt).toContain('Vergleich mit „Low“'); expect(saetzeMultreg(b, id).haupt).toContain('Vergleich mit „High“');
    expect(a.modelltest.chi2).toBeCloseTo(b.modelltest.chi2, 6);
    s.einst.sprache = 'en';
    expect(saetzeMultreg(a, id).haupt).toContain('(compared with "Low")');
    expect(gerechnetText(b)).toBe('multinomial logistic regression, compared with "High"');
  });
  it('Tabellen mit Spalte „Kategorie“, Fußnote nennt die Vergleichskategorie', () => {
    const t = tabellenKategreg(multreg('c_eigen'), id);
    expect(t[0]!.cells.find(c => c.h && c.c === 0)!.t).toBe('Kategorie');
    expect(t[0]!.footnotes[0]!.t).toContain('„Bus“');
    expect(t[0]!.rows).toBe(1 + 8);
  });
});

describe('Zähldaten-Regression', () => {
  it('quine, automatisch negativ-binomial: der Modellwechsel steht zuerst, wörtlich nach dem Fachblatt', () => {
    const e = zaehlreg('a_quine', 'negbin', 'ueberdispersion'), st = saetzeZaehlreg(e, id);
    expect(st.haupt.startsWith('Die Werte streuen stärker, als ein Poisson-Modell erlaubt (Pearson χ²/df = 13,2; LR-Test χ² = 1192,0, p < ,001). Statable rechnet darum negativ-binomial; mit Poisson wären die p-Werte zu klein. Mit ')).toBe(true);
    expect(st.apa).toBe('negativ-binomiale Regression, θ = 1,27; χ²(6) = 25,12, p < ,001; Eth (N): IRR = 0,57, 95 %-KI [0,42; 0,76], p < ,001; Sex (M): IRR = 1,09, 95 %-KI [0,79; 1,49], p = ,607; Age (F1): IRR = 0,64, 95 %-KI [0,40; 1,02], p = ,061; Age (F2): IRR = 1,09, 95 %-KI [0,69; 1,73], p = ,709; Age (F3): IRR = 1,43, 95 %-KI [0,88; 2,32], p = ,151; Lrn (SL): IRR = 1,34, 95 %-KI [0,93; 1,93], p = ,117');
    expect(st.zusatz).toContain('θ = 1,27 (SPSS gibt stattdessen α = 1/θ = 0,78 aus)');
    expect(st.zusatz).toContain('„Eth“ trägt insgesamt signifikant zur Vorhersage bei, χ²(1) = 12,52, p < ,001.');
    expect(st.zusatz).toContain('Bei „N“ („Eth“) beträgt die erwartete Zahl „Days“ nur das 0,57-Fache der bei „A“ (IRR = 0,57, 95 %-KI [0,42; 0,76], p < ,001). Das sind etwa 43 % weniger.');
    expect(st.vorsicht).toContain('kein R²');
    expect(gerechnetText(e)).toBe('negativ-binomiale Regression');
    expect(n(st.haupt + st.zusatz)).not.toMatch(/deutlich/);
  });
  it('Poisson erzwungen trotz Überdispersion: Hinweis zuerst; Poisson-Regression in „Gerechnet“', () => {
    const e = zaehlreg('a_quine', 'poisson', 'gewaehlt'), st = saetzeZaehlreg(e, id);
    expect(st.haupt.startsWith('Poisson wurde gewählt, die Werte streuen aber stärker, als das Modell erlaubt (Pearson χ²/df = 13,2; LR-Test χ² = 1192,0, p < ,001). Die p-Werte sind dann zu klein; das negativ-binomiale Modell passt besser.')).toBe(true);
    expect(gerechnetText(e)).toBe('Poisson-Regression'); expect(st.apa.startsWith('Poisson-Regression; ')).toBe(true);
  });
  it('keine Überdispersion: Poisson mit Satz; θ am Rand', () => {
    const e = zaehlreg('c_ohne_ueberdispersion', 'poisson', 'theta_am_rand'), st = saetzeZaehlreg(e, id);
    expect(st.haupt.startsWith('Keine Überdispersion erkennbar (Pearson χ²/df = ')).toBe(true);
    expect(st.haupt).toContain('Statable rechnet Poisson.');
  });
  it('Null-Überschuss: Hinweis nach dem Modell, vor dem Ergebnissatz; Offset im Satz „je Einheit“', () => {
    const e = zaehlreg('d_viele_nullen', 'negbin', 'ueberdispersion'), st = saetzeZaehlreg(e, id);
    expect(e.nullenHinweis).toBe(true);
    expect(st.haupt.indexOf('Statable rechnet darum negativ-binomial')).toBeLessThan(st.haupt.indexOf('Mehr Nullen, als das Modell erwartet'));
    expect(st.haupt).toContain('ein Modell für Null-Überschuss wäre zu prüfen (nicht in Statable).');
    expect(st.haupt.indexOf('Mehr Nullen')).toBeLessThan(st.haupt.indexOf('Mit „x“ und „g“'));
    const o = saetzeZaehlreg(zaehlreg('b_offset', 'negbin', 'ueberdispersion'), id);
    expect(o.zusatz).toContain('Mit der Beobachtungszeit „zeit“ als Offset: Die Effekte sind Rate-Verhältnisse je Zeiteinheit.');
    expect(o.zusatz).toContain('Das gilt je Einheit von „zeit“.');
  });
  it('Tabellen: Koeffizienten, Modelltests, Überdispersion', () => {
    const t = tabellenKategreg(zaehlreg('a_quine', 'negbin', 'ueberdispersion'), id);
    expect(t.map(x => x.label)).toEqual(['Count Regression Coefficients', 'Count Regression Model Tests', 'Count Regression Overdispersion']);
    expect(t[0]!.rows).toBe(1 + 7);
  });
});

describe('Befunde der Fachprüfung', () => {
  it('Aussagen über eine ganze Spalte nur aus dem LR-Test: Age ist insgesamt signifikant, kein einziger Dummy ist es - es steht nie „kein Zusammenhang bei Age“', () => {
    const e = zaehlreg('a_quine', 'negbin', 'ueberdispersion'), st = saetzeZaehlreg(e, id);
    expect(e.koef.filter(k => e.praed[k.pIdx]?.name === 'Age').every(k => k.p > 0.05)).toBe(true);
    expect(st.zusatz).toContain('„Age“ trägt insgesamt signifikant zur Vorhersage bei, χ²(3) = 11,52, p = ,009.');
    expect(st.zusatz).not.toMatch(/(Bei|Zwischen)[^.]*„Age“[^.]*(kein signifikanter|nicht signifikant)/);
    expect(st.zusatz).not.toMatch(/„F[123]“ \(„Age“\)/);   // nicht signifikante Dummys werden nicht einzeln genannt
    // ein signifikanter Dummy wird nur mit seinem Namen und seiner Stufe genannt
    const ord = saetzeOrdreg(ordreg('a_housing'), id);
    expect(ord.zusatz).toContain('Bei „Atrium“ („Type“) ist die Chance, eine höhere Stufe von „Sat“ anzugeben, gegenüber „Tower“ um den Faktor 1,44 niedriger');
  });
  it('Zähldaten: „auf das 0,91-Fache“ mit dem Effekt selbst, danach der Prozentsatz; auch bei Anstieg', () => {
    const e = zaehlreg('a_quine', 'negbin', 'ueberdispersion'), x = e.koef.find(k => k.pIdx === 0 && k.stufe === 'N')!;
    const eins = (effekt: number, kiU: number, kiO: number): ZaehlReg => ({ ...e, praed: [{ name: 'lernzeit', art: 'zahl', stufen: [] }], koef: [{ ...x, pIdx: 0, stufe: '', p: 0.0004, effekt, kiU, kiO }], lr: [] });
    expect(saetzeZaehlreg(eins(0.91, 0.86, 0.96), id).haupt).toContain('Pro zusätzlicher Einheit „lernzeit“ sinkt die erwartete Zahl „Days“ auf das 0,91-Fache (IRR = 0,91, 95 %-KI [0,86; 0,96], p < ,001). Das sind etwa 9 % weniger.');
    expect(saetzeZaehlreg(eins(1.25, 1.1, 1.4), id).haupt).toContain('steigt die erwartete Zahl „Days“ auf das 1,25-Fache (IRR = 1,25, 95 %-KI [1,10; 1,40], p < ,001). Das sind etwa 25 % mehr.');
    s.einst.sprache = 'en';
    expect(saetzeZaehlreg(eins(0.91, 0.86, 0.96), id).haupt).toContain('falls to 0.91 times (IRR = 0.91, 95% CI [0.86, 0.96], p < .001). That is about 9% less.');
  });
  it('Schranken: OR/IRR über 999 und unter 0,001 als „> 999“ / „< 0,001“ in Satz, APA-Zeile und Tabelle; B und SE nie in Exponentialschreibweise', () => {
    const e = multreg('d_trennung'), st = saetzeMultreg(e, id);
    const alle = tabellenKategreg(e, id).flatMap(tb => tb.cells.map(c => c.t));
    expect(alle.some(z => /e[+-]\d/.test(z))).toBe(false);
    expect(alle.some(z => z === '> 999')).toBe(true);
    expect(alle.some(z => /^-?\d{4,}/.test(z.replace(/[.,]\d+$/, '')) )).toBe(false);   // z, B und SE: keine Rohwerte mit vielen Stellen
    const z = tabellenKategreg({ ...e, koef: e.koef.map((k, i) => (i === 0 ? { ...k, z: 945019481.83 } : i === 1 ? { ...k, z: -2e6 } : k)) }, id)[0]!.cells.map(c => c.t);
    expect(z).toContain('> 999'); expect(z).toContain('< −999');
    expect(st.apa).not.toMatch(/= >|= </);
    const o = ordreg('b_eigen_brant_signifikant'), x = o.koef[0]!;
    const gross: OrdReg = { ...o, praed: [o.praed[0]!], koef: [{ ...x, pIdx: 0, stufe: '', p: 0.001, effekt: 4e5, kiU: 1e4, kiO: 1e9 }], lr: [] };
    const sg = saetzeOrdreg(gross, id);
    expect(sg.haupt).toContain('(OR > 999, 95 %-KI [> 999; > 999], p = ,001)'); expect(sg.haupt).not.toContain('OR = >');
    expect(sg.apa).toContain('OR > 999, 95 %-KI [> 999; > 999]');
    const klein: OrdReg = { ...gross, koef: [{ ...gross.koef[0]!, effekt: 1e-7, kiU: 1e-9, kiO: 1e-5 }] };
    expect(saetzeOrdreg(klein, id).apa).toContain('OR < 0,001, 95 %-KI [< 0,001; < 0,001]');
  });
  it('Hinweise zu den Zielstufen stehen im Ergebnis, auch im Bericht (haupt), nach den einschränkenden Hinweisen', () => {
    const e = ordreg('a_housing');
    const st = saetzeOrdreg({ ...e, stufenN: [3, 600, 1000] }, id);
    expect(st.haupt).toBe('Wenige Fälle in der Stufe „Low“ (3): Die Schätzung ist unsicher. Mit „Infl“, „Type“ und „Cont“ lässt sich „Sat“ signifikant vorhersagen.');
    const verletzt = saetzeOrdreg({ ...ordreg('b_eigen_brant_signifikant'), stufenN: [3, 60, 100, 70] }, id);
    expect(verletzt.haupt.indexOf('Die Annahme paralleler Linien ist verletzt')).toBeLessThan(verletzt.haupt.indexOf('Wenige Fälle'));
    const m = saetzeMultreg({ ...multreg('c_eigen'), stufenN: [90, 60, 25] }, id);
    expect(m.haupt).toContain('Die kleinste Kategorie „Zug“ hat 25 Fälle bei 3 Koeffizienten. Als Faustregel (Peduzzi u. a. 1996)');
  });
});

describe('Sprache und Anrede', () => {
  it('englisch: Sätze, Faktor „by a factor of“, APA mit Punkt als Dezimalzeichen', () => {
    s.einst.sprache = 'en';
    const st = saetzeZaehlreg(zaehlreg('a_quine', 'negbin', 'ueberdispersion'), id);
    expect(st.haupt).toContain('The values vary more than a Poisson model allows (Pearson χ²/df = 13.2; LR test χ² = 1192.0, p < .001). Statable therefore calculates negative binomial');
    expect(st.apa.startsWith('negative binomial regression, θ = 1.27; χ²(6) = 25.12, p < .001')).toBe(true);
    expect(saetzeOrdreg(ordreg('a_housing'), id).haupt).toBe('"Sat" can be significantly predicted from "Infl", "Type" and "Cont".');
    expect(gerechnetText(ordreg('a_housing'))).toBe('ordinal regression (proportional-odds model)');
  });
  it('Warum-Texte gibt es für alle drei und nennen das Verfahren', () => {
    expect(katWarum('ordreg')).toContain('Brant-Test'); expect(katWarum('multreg')).toContain('Vergleichskategorie'); expect(katWarum('zaehlreg')).toContain('Poisson');
    expect(gerechnetText(ordreg('a_housing'))).toBe('ordinale Regression (Proportional-Odds-Modell)');
  });
});
