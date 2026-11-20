import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { leseCsv, zurEngine } from './einlesen';
import { st, aufzaehlung, faktoren, komma, kurz, ohneNull, saetzeFaktoren, saetzePraePost, saetzeSkala, saetzeVorhersage, saetzeZusammenhang, saetzeZweiGruppen, skala, vorhersage, zusammenhang, zweiGruppen } from './ergebnis';
import { nodeEngine } from './testengine';

let e: Awaited<ReturnType<typeof nodeEngine>>;
beforeAll(async () => {
  e = await nodeEngine();
  const { syntax, csv } = zurEngine(leseCsv(readFileSync(new URL('./testdaten/schlaf-und-konzentration.csv', import.meta.url), 'utf8')));
  e.run(syntax, { '/import.csv': csv });
});

describe('Sehr kleine Werte erscheinen nicht als „0,0“ (Prüfung G9)', () => {
  it('Stellen nach Größe: ab Basis, aber zwei gültige Ziffern bei kleinen Werten', () => {
    expect(st(0.001, 1)).toBe(4); expect(st(0.0525, 1)).toBe(3); expect(st(0.5, 1)).toBe(1); expect(st(3.1, 1)).toBe(1);
    expect(st(0, 1)).toBe(1); expect(st(0.004, 2)).toBe(4); expect(st(0.05, 2)).toBe(2); expect(st(1e-9, 2)).toBe(6);
    expect(komma(0.00105, st(0.00105, 1))).toBe('0,0010');
  });
  it('Gruppenvergleich: Mittel 0,00100 und 0,00105 stehen nicht als „0,0 gegen 0,0“ im Satz', async () => {
    const e = await nodeEngine();
    const csv = 'g,klein\n' + Array.from({ length: 20 }, (_, i) => `a,${0.001 + (i % 5) * 0.0001}\nb,${0.00105 + (i % 5) * 0.0001}`).join('\n') + '\n';
    const { syntax, csv: daten } = zurEngine(leseCsv(csv));
    e.run(syntax, { '/import.csv': daten });
    const r = zweiGruppen(e.run("T-TEST GROUPS=g('a' 'b') /VARIABLES=klein."), 'klein', 'g');
    const s = saetzeZweiGruppen(r, n => n);
    expect(s.haupt).not.toContain('0,0 ');
    expect(s.haupt).toMatch(/0,00\d+/);
  });
});

describe('Faktorenanalyse: Spalte, die PSPP nicht aufnimmt, wird genannt (Prüfung G12)', () => {
  // 18.10.: Die alten Daten lösten den Fall nur durch den PSPP-Fehler F1 aus (falsche Eigenvektoren, patches/0003). Neue Daten (seed 61 in R): v3 hat bei Varimax nirgends ≥ ,30.
  it('fa-unkorreliert.csv (v3 hängt mit keiner anderen zusammen): „v3“ steht als ausgelassen im Satz', async () => {
    const e = await nodeEngine();
    const { syntax, csv } = zurEngine(leseCsv(readFileSync(new URL('./testdaten/fa-unkorreliert.csv', import.meta.url), 'utf8')));
    e.run(syntax, { '/import.csv': csv });
    const items = e.run('FACTOR /VARIABLES=v1 v2 v3 v4 v5 v6 /PRINT=ROTATION /FORMAT=SORT BLANK(.30) /CRITERIA=MINEIGEN(1) ITERATE(25) /EXTRACTION=PC /ROTATION=VARIMAX.');
    const r = faktoren(items, ['v1', 'v2', 'v3', 'v4', 'v5', 'v6'].map(n => [n, n] as [string, string]));
    const gezeigt = new Set([...r.faktoren.flatMap(f => f.fragen.map(q => q.name)), ...r.ohne]);
    const fehlt = ['v1', 'v2', 'v3', 'v4', 'v5', 'v6'].filter(n => !gezeigt.has(n));
    expect(r.ausgelassen ?? []).toEqual(fehlt);   // was in der Matrix fehlt, steht als ausgelassen da - nie still
    expect(fehlt.length).toBeGreaterThan(0);   // die Prüfdaten lösen den Fall wirklich aus
    expect(saetzeFaktoren(r).zusatz).toContain(`„${fehlt[0]}“`);
    expect(faktoren(items).ausgelassen).toBeUndefined();   // ohne Angabe der gewählten Spalten wie bisher
  });
  it('lange Bezeichnungen (über 48 Zeichen, in der Oberfläche mit „ …“ gekürzt) gelten nicht als ausgelassen', async () => {
    const e = await nodeEngine();
    const { syntax, csv } = zurEngine(leseCsv(readFileSync(new URL('./testdaten/fa-unkorreliert.csv', import.meta.url), 'utf8')));
    e.run(syntax, { '/import.csv': csv });
    const lang = (n: string) => `Frage ${n} Ich beschreibe hier einen sehr langen Fragebogentext, der gekürzt wird.`;
    const items = e.run(`VARIABLE LABELS v1 '${lang('1')}' v2 '${lang('2')}' v4 '${lang('4')}' v5 '${lang('5')}' v6 '${lang('6')}'.\nFACTOR /VARIABLES=v1 v2 v4 v5 v6 /PRINT=ROTATION /FORMAT=SORT BLANK(.30) /CRITERIA=MINEIGEN(1) ITERATE(25) /EXTRACTION=PC /ROTATION=VARIMAX.`);
    const kurzer = (b: string) => (b.length > 48 ? b.slice(0, 46).trimEnd() + ' …' : b);   // wie lesbar(…, true) in lib/verzeichnis.ts
    const r = faktoren(items, ['v1', 'v2', 'v4', 'v5', 'v6'].map((n, i) => [n, kurzer(lang(String([1, 2, 4, 5, 6][i])))] as [string, string]));
    expect(r.ausgelassen ?? []).toEqual([]);
  });
});

describe('Ergebnisse stimmen mit docs/entwurf-opus/daten/ZAHLEN.md', () => {
  it('zwei Gruppen (Welch) mit d und Gruppen-KI', () => {
    const r = zweiGruppen(e.run("T-TEST GROUPS=handy_im_bett('nein' 'ja') /VARIABLES=konzentration."), 'konzentration', 'handy_im_bett');
    expect([r.a.name, r.a.n, komma(r.a.m), komma(r.a.sd), komma(r.a.kiLo), komma(r.a.kiHi)]).toEqual(['nein', 43, '60,72', '13,04', '56,71', '64,73']);
    expect([komma(r.b.kiLo), komma(r.b.kiHi)]).toEqual(['51,34', '56,50']);
    expect([komma(r.t), komma(r.df), komma(r.p, 3), komma(r.diffLo), komma(r.diffHi)]).toEqual(['2,86', '77,46', '0,005', '2,07', '11,52']);
    expect([komma(r.d), komma(r.dLo), komma(r.dHi)]).toEqual(['0,57', '0,19', '0,95']);
    const s = saetzeZweiGruppen(r, n => ({ konzentration: 'Konzentration', handy_im_bett: 'Handy im Bett' }[n] ?? n));
    expect(s.apa).toBe('t(77,46) = 2,86, p = ,005, d = 0,57, 95 %-KI [0,19; 0,95]');
  });
  it('t-Test: Bereich nach Einstellung, Richtung unabhängig von der Gruppenfolge', async () => {
    const { s: sitz } = await import('./sitzung.svelte');
    const name = (n: string) => n;
    const umgekehrt = zweiGruppen(e.run("T-TEST GROUPS=handy_im_bett('ja' 'nein') /VARIABLES=konzentration."), 'konzentration', 'handy_im_bett');
    expect(saetzeZweiGruppen(umgekehrt, name).apa).toBe('t(77,46) = 2,86, p = ,005, d = 0,57, 95 %-KI [0,19; 0,95]');
    // Test 07.10.: die Marke zeigte bei „für d“ den Bereich in Punkten neben d - jetzt derselbe Bereich wie in der Zeile.
    expect(saetzeZweiGruppen(umgekehrt, name).marken.map(m => m.text)).toContain('Plausibler Bereich für d: 0,19 bis 0,95');
    try {
      sitz.einst.kiT = 'punkte';
      expect(saetzeZweiGruppen(umgekehrt, name).apa).toBe('t(77,46) = 2,86, p = ,005, 95 %-KI [2,07; 11,52], d = 0,57');
      sitz.einst.kiT = 'beide';
      expect(saetzeZweiGruppen(umgekehrt, name).apa).toBe('t(77,46) = 2,86, p = ,005, Differenz 95 %-KI [2,07; 11,52], d = 0,57, 95 %-KI [0,19; 0,95]');   // B10: das erste KI trägt das Wort Differenz
      expect(saetzeZweiGruppen(umgekehrt, name).marken.map(m => m.text)).toContain('Plausibler Bereich des Unterschieds: 2,1 bis 11,5');
    } finally { sitz.einst.kiT = 'd'; }
  });
  it('Prä-Post, Bereich „beide“: das erste KI trägt das Wort Veränderung (B10)', async () => {
    const { s: sitz } = await import('./sitzung.svelte');
    const e0 = { art: 'prae-post', vorher: 'a', nachher: 'b', n: 30, m1: 10, sd1: 2, m2: 12, sd2: 2, diff: 2, sdDiff: 3, diffLo: 0.88, diffHi: 3.12, t: 3.65, df: 29, p: 0.001, r: 0.5, dz: 0.67, dzLo: 0.28, dzHi: 1.05, dav: 1 } as const;
    try {
      sitz.einst.kiT = 'beide';
      expect(saetzePraePost({ ...e0 }, n => n).apa).toBe('t(29) = 3,65, p = ,001, Veränderung 95 %-KI [0,88; 3,12], dz = 0,67, 95 %-KI [0,28; 1,05], dav = 1,00');
      sitz.einst.kiT = 'd';
      expect(saetzePraePost({ ...e0 }, n => n).apa).toBe('t(29) = 3,65, p = ,001, dz = 0,67, 95 %-KI [0,28; 1,05], dav = 1,00');
    } finally { sitz.einst.kiT = 'd'; }
  });
  it('Zusammenhang (nach 99 = keine Angabe)', () => {
    const r = zusammenhang(e.run('MISSING VALUES schlaf_stunden (99).\nCORRELATIONS /VARIABLES=schlaf_stunden konzentration.'), 'schlaf_stunden', 'konzentration');
    expect([ohneNull(r.r), komma(r.p, 3), r.n, ohneNull(r.kiLo), ohneNull(r.kiHi)]).toEqual([',19', '0,039', 115, ',01', ',36']);
  });

  it('Vorhersage (multiple Regression)', () => {
    const r = vorhersage(e.run('REGRESSION /VARIABLES=schlaf_stunden kaffee_tassen /DEPENDENT=konzentration /METHOD=ENTER /STATISTICS=COEFF R ANOVA CI(95).'), 'konzentration');
    expect([ohneNull(r.r2), r.df1, r.df2, komma(r.f), komma(r.p, 3)]).toEqual([',05', 2, 112, '2,78', '0,066']);
    expect(r.praediktoren.map(x => [x.name, komma(x.b), ohneNull(x.beta)])).toEqual([['schlaf_stunden', '2,33', ',17'], ['kaffee_tassen', '−1,10', '−,10']]);
    const s = saetzeVorhersage(r, n => n);
    expect(s.apa).toBe('R² = ,05, 95 %-KI [,00; ,13], F(2, 112) = 2,78, p = ,066');
    expect(s.haupt).toBe('„schlaf_stunden“ und „kaffee_tassen“ erklären zusammen 5\u00a0% der Unterschiede bei „konzentration“.');
    expect(s.zusatz).toContain('kleiner Anteil');
    expect(s.zusatz).toContain('Keine der Größen');
  });
  it('Vorhersage (einfach) nennt B mit KI', () => {
    const s = saetzeVorhersage(vorhersage(e.run('REGRESSION /VARIABLES=schlaf_stunden /DEPENDENT=konzentration /METHOD=ENTER /STATISTICS=COEFF R ANOVA CI(95).'), 'konzentration'), n => n);
    expect(s.haupt).toMatch(/^Wer bei „schlaf_stunden“ eine Einheit mehr hat, hat bei „konzentration“ im Schnitt \d+,\d\d mehr\.$/);
    expect(s.apa).toMatch(/; B = .*, 95 %-KI \[/);
  });
  it('Skala: Alpha, auffällige Fragen', () => {
    const r = skala(e.run("RELIABILITY /VARIABLES=alter semester kaffee_tassen konzentration /SCALE('Skala') ALL /MODEL=ALPHA /SUMMARY=TOTAL."));
    expect([ohneNull(r.alpha), r.fragen.length, r.n]).toEqual(['−,02', 4, 120]);
    const s = saetzeSkala(r);
    expect(s.haupt).toContain('nicht ausreichend');
    expect(s.zusatz).toContain('„semester“, „kaffee_tassen“ und „konzentration“ laufen gegen');
    expect(s.marken[1]!.text).toBe('3 Fragen prüfen');
    expect(s.apa).toBe('Cronbachs α = −,02, 95 %-KI [−,35; ,25] (4 Items, n = 120)');
  });
  it('kurz kürzt lange Fragetexte an der Wortgrenze', () => {
    expect(kurz('Frage 22 Es fällt mir schwer, bei der Sache zu bleiben.')).toBe('Frage 22 Es fällt mir schwer, bei der …');
    expect(kurz('Konzentration (Punkte).')).toBe('Konzentration (Punkte)');
  });
  it('Faktorenanalyse: Gruppen aus der rotierten Matrix', () => {
    const r = faktoren(e.run('FACTOR /VARIABLES=alter semester schlaf_stunden kaffee_tassen konzentration /PRINT=UNIVARIATE ROTATION /FORMAT=SORT BLANK(.30) /CRITERIA=MINEIGEN(1) ITERATE(25) /EXTRACTION=PC /ROTATION=VARIMAX.'));
    expect(r.faktoren.map(f => f.fragen.map(q => q.name))).toEqual([['alter', 'semester'], ['schlaf_stunden', 'kaffee_tassen', 'konzentration']]);
    expect([komma(r.erklaert * 100, 1), r.n, r.fragen]).toEqual(['56,4', 115, 5]);
    const s = saetzeFaktoren(r);
    expect(s.zusatz).toContain('„kaffee_tassen“ (negativ geladen)');
    expect(s.apa).toBe('Hauptkomponentenanalyse mit Varimax-Rotation: 2 Komponenten mit Eigenwert > 1, zusammen 56,4\u00a0% Varianz (n = 115)');
  });
});

describe('Englisch (APA 7)', () => {
  it('t-Test und Korrelation mit Punkt, CI mit Komma, ohne führende Null bei p und r', async () => {
    const { s } = await import('./sitzung.svelte');
    s.einst.sprache = 'en';
    try {
      const g = zweiGruppen(e.run("T-TEST GROUPS=handy_im_bett('nein' 'ja') /VARIABLES=konzentration."), 'konzentration', 'handy_im_bett');
      const sg = saetzeZweiGruppen(g, n => ({ konzentration: 'concentration', handy_im_bett: 'phone in bed' }[n] ?? n));
      expect(sg.apa).toBe('t(77.46) = 2.86, p = .005, d = 0.57, 95% CI [0.19, 0.95]');
      expect(sg.haupt).toBe('The group "ja" (phone in bed) scored 6.8 lower on "concentration" on average than "nein": 53.9 vs. 60.7.');
      expect(sg.zusatz).toContain('medium-sized (by a common rule of thumb)');
      const z = zusammenhang(e.run('CORRELATIONS /VARIABLES=schlaf_stunden konzentration.'), 'schlaf_stunden', 'konzentration');
      expect(saetzeZusammenhang(z, n => n).apa).toBe('r(113) = .19, p = .039, 95% CI [.01, .36]');
      expect(saetzeZusammenhang(z, n => n).marken[0]!.text).toBe('Relationship: weak · r = .19');
    } finally { s.einst.sprache = 'de'; }
  });
});

describe('Aufzählung und Beitragssatz (Test 07.10.: Kurs-Probeprüfung Regression)', () => {
  it('setzt „und“ auch, wenn Namen oder Zahlen Kommas enthalten', () => {
    expect(aufzaehlung(['„Frage 11, 23“', '„Geschlecht“ (β = ,21)'])).toBe('„Frage 11, 23“ und „Geschlecht“ (β = ,21)');
    expect(aufzaehlung(['a', 'b', 'c'])).toBe('a, b und c');
    expect(aufzaehlung(['a'])).toBe('a');
  });
  it('zwei eigene Beiträge: „leisten A und B“; einer: nennt den anderen beim Namen', () => {
    const p = (name: string, beta: number, pw: number) => ({ name, b: beta, beta, p: pw, lo: beta - 0.1, hi: beta + 0.1 });
    const basis = { art: 'vorhersage' as const, ziel: 'wieder', r2: 0.15, r2korr: 0.14, f: 16.67, df1: 2, df2: 192, p: 0.0001 };
    const zwei = saetzeVorhersage({ ...basis, praediktoren: [p('zeit', 0.29, 0.0001), p('geschlecht', 0.21, 0.002)] }, n => n);
    expect(zwei.zusatz).toContain('Einen eigenen Beitrag leisten „zeit“ (β = ,29, 95 %-KI [,19; ,39]) und „geschlecht“ (β = ,21, 95 %-KI [,11; ,31]).');
    const eins = saetzeVorhersage({ ...basis, praediktoren: [p('zeit', -0.07, 0.346), p('platz', -0.19, 0.019)] }, n => n);
    expect(eins.zusatz).toContain('Einen eigenen Beitrag leistet „platz“ (β = −,19, 95 %-KI [−,29; −,09]), „zeit“ nicht deutlich.');
  });
  it('0/1-Gruppe als Vorhersage: nennt die Gruppen statt „1 mehr“ (Probeprüfung Frage 1 (6))', () => {
    const basis = { art: 'vorhersage' as const, ziel: 'wieder', r2: 0.06, r2korr: 0.06, f: 13.2, df1: 1, df2: 193, p: 0.0004 };
    const s = saetzeVorhersage({ ...basis, praediktoren: [{ name: 'Geschlecht', b: 0.58, beta: 0.25, p: 0.0004, lo: 0.26, hi: 0.89 }] }, n => n, () => ['männlich', 'weiblich']);
    expect(s.haupt).toBe('„weiblich“ (Geschlecht) hatte bei „wieder“ im Schnitt 0,58 mehr als „männlich“.');
  });
});
