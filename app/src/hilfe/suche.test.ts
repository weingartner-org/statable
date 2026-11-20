import { describe, it, expect } from 'vitest';
import { artikelListe, BEREICHE } from './artikel';
import { suche, glatt, abstand } from './suche';

const de = artikelListe('de'), en = artikelListe('en');
const ids = (q: string, l = de) => suche(l, q).map(t => t.artikel.id);

describe('Hilfe-Suche', () => {
  it('leere Suche findet nichts', () => { expect(ids('')).toEqual([]); expect(ids('   ')).toEqual([]); expect(ids('--')).toEqual([]); });
  it('„mittelwert“ und „Mittelwerte“ finden den Mittelwert-Artikel zuerst', () => {
    expect(ids('mittelwert')[0]).toBe('mittelwert');
    expect(ids('Mittelwerte')).toContain('mittelwert');
    expect(ids('Mittelwerte')[0]).toBe('mittelwert');
  });
  it('Wortanfang: „konfidenz“ findet Konfidenzintervall', () => { expect(ids('konfidenz')[0]).toBe('konfidenzintervall'); });
  it('Tippfehler: „kronbach“ findet Cronbachs Alpha', () => {
    const r = ids('kronbach'); expect(r).toContain('reliabilitaet'); expect(r.slice(0, 3)).toContain('frage-skala');
  });
  it('Omega, CFA und Fit-Indizes werden gefunden (08.10.)', () => {
    expect(ids('omega')).toEqual(expect.arrayContaining(['omega', 'frage-skala']));
    expect(ids('McDonald')).toContain('frage-skala');
    expect(ids('konfirmatorisch')[0]).toBe('cfa');
    expect(ids('konfirmatorisch')).toContain('frage-faktor');
    expect(ids('CFA Faktorenanalyse')).toContain('frage-faktor');
    expect(ids('rmsea')).toEqual(expect.arrayContaining(['fit-indizes', 'frage-faktor']));
    expect(ids('Pfaddiagramm')).toContain('frage-faktor');
    expect(ids('confirmatory', en)).toEqual(expect.arrayContaining(['cfa', 'frage-faktor']));
    expect(ids('omega', en)).toContain('omega');
  });
  it('Mehrebenenmodell, ICC der Gruppen und Verwandtes werden gefunden (08.10.)', () => {
    expect(ids('mehrebenen')).toEqual(expect.arrayContaining(['mehrebenen', 'frage-mehrebenen']));
    expect(ids('Mehrebenenmodell')[0]).toMatch(/mehrebenen/);
    expect(ids('gemischtes Modell')).toContain('frage-mehrebenen');
    expect(ids('lme4')).toContain('frage-mehrebenen');
    expect(ids('Designeffekt')).toEqual(expect.arrayContaining(['icc-mehrebenen', 'frage-mehrebenen']));
    expect(ids('ICC Gruppen')).toContain('icc-mehrebenen');
    expect(ids('ICC Beurteilende')).toContain('icc');
    expect(ids('verschachtelt')).toContain('frage-mehrebenen');
    expect(ids('Raupendiagramm')).toContain('frage-mehrebenen');
    expect(ids('singular fit')).toContain('frage-mehrebenen');
    expect(ids('multilevel', en)).toEqual(expect.arrayContaining(['mehrebenen', 'frage-mehrebenen']));
    expect(ids('random slope', en)).toContain('frage-mehrebenen');
  });
  it('Das Mehrebenen-Artikel hat „Kurz“ oben und „Für Fachleute“ unten und höchstens etwa 450 Wörter', () => {
    const a = de.find(x => x.id === 'frage-mehrebenen')!;
    const hs = a.inhalt.filter((b): b is { h: string } => typeof b === 'object' && 'h' in b).map(b => b.h);
    expect(hs[0]).toBe('Kurz'); expect(hs.at(-1)).toBe('Für Fachleute');
    const wort = a.inhalt.flatMap(b => (typeof b === 'string' ? [b] : 'h' in b ? [b.h] : 'ul' in b ? b.ul : 'ol' in b ? b.ol : 'apa' in b ? [b.apa] : [])).join(' ').split(/\s+/).length;
    expect(wort).toBeLessThan(450);
  });
  it('Meta-Analyse und ihre Begriffe werden gefunden (08.10.)', () => {
    expect(ids('Meta-Analyse')).toContain('frage-meta');
    expect(ids('Metaanalyse')).toContain('frage-meta');
    expect(ids('Studien zusammenfassen')).toContain('frage-meta');
    expect(ids('Forest-Plot')).toEqual(expect.arrayContaining(['frage-meta', 'forest-plot']));
    expect(ids('Funnel')).toEqual(expect.arrayContaining(['funnel-plot']));
    expect(ids('Egger')).toEqual(expect.arrayContaining(['funnel-plot', 'frage-meta']));
    expect(ids('Heterogenität')).toEqual(expect.arrayContaining(['i-quadrat']));
    expect(ids('Tau')).toContain('tau-quadrat');
    expect(ids('Prädiktionsintervall')).toContain('praediktionsintervall');
    expect(ids('metafor')).toContain('frage-meta');
    expect(ids('pooled effect', en)).toContain('meta-effekt');
    expect(ids('prediction interval', en)).toContain('praediktionsintervall');
    expect(ids('funnel plot', en)).toContain('funnel-plot');
  });
  it('Der Meta-Analyse-Artikel hat „Kurz“ oben, „Für Fachleute“ unten und höchstens etwa 400 Wörter, in beiden Sprachen', () => {
    for (const l of [de, en]) {
      const a = l.find(x => x.id === 'frage-meta')!;
      const hs = a.inhalt.filter((b): b is { h: string } => typeof b === 'object' && 'h' in b).map(b => b.h);
      expect(hs[0]).toBe(l === de ? 'Kurz' : 'In brief'); expect(hs.at(-1)).toBe(l === de ? 'Für Fachleute' : 'For specialists');
      const wort = a.inhalt.flatMap(b => (typeof b === 'string' ? [b] : 'h' in b ? [b.h] : 'ul' in b ? b.ul : 'ol' in b ? b.ol : 'apa' in b ? [b.apa] : [])).join(' ').split(/\s+/).length;
      expect(wort).toBeLessThan(470);   // 22.10.: +40 Wörter für den Absatz zur Meta-Regression (vorher 420; englischer Text zählt mehr Wörter)
    }
  });
  it('Umlaute und ß sind gleichgesetzt', () => {
    expect(ids('ausreisser')).toContain('ausreisser'); expect(ids('Ausreißer')).toContain('ausreisser');
    expect(ids('zuverlaessigkeit')).toContain('reliabilitaet'); expect(ids('zuverlässigkeit')).toContain('reliabilitaet');
    expect(glatt('Größe')).toBe(glatt('Groesse'));
  });
  it('alle Suchwörter müssen vorkommen', () => { expect(ids('mittelwert zebrafisch')).toEqual([]); });
  it('Titel zählt mehr als Text', () => { expect(ids('p-wert')[0]).toBe('p-wert'); });
  it('englisch', () => { expect(ids('confidence interval', en)[0]).toBe('konfidenzintervall'); });
  it('Ausschnitt ist ein Teile-Array mit markiertem Treffer, ohne HTML', () => {
    const t = suche(de, 'varimax')[0]!;
    expect(t.ausschnitt.some(x => x.treffer && glatt(x.text) === 'varimax')).toBe(true);
    expect(t.ausschnitt.map(x => x.text).join('')).not.toMatch(/<mark/);
  });
  it('Abstand', () => { expect(abstand('kronbach', 'cronbach')).toBe(1); });
  it('Fragearten werden über Alltagswörter gefunden', () => {
    expect(ids('spearman')[0]).toBe('frage-zusammenhang');
    expect(ids('spearman', en)).toContain('frage-zusammenhang');
    expect(ids('vorher nachher')[0]).toBe('frage-praepost');
    expect(ids('before after', en)[0]).toBe('frage-praepost');
    expect(ids('odds')).toContain('frage-vorhersage');
    expect(ids('odds')).toContain('odds-ratio');
    expect(ids('logistisch').slice(0, 3)).toContain('frage-vorhersage');
    expect(ids('logistic', en)).toContain('frage-vorhersage');
  });
  it('Übereinstimmung: kappa, icc, interrater, beurteiler', () => {
    for (const q of ['kappa', 'icc', 'interrater', 'beurteiler']) expect(ids(q), q).toContain('frage-uebereinstimmung');
    expect(ids('interrater')[0]).toBe('frage-uebereinstimmung');
    expect(ids('beurteiler')[0]).toBe('frage-uebereinstimmung');
    for (const q of ['kappa', 'icc', 'interrater', 'raters']) expect(ids(q, en), q).toContain('frage-uebereinstimmung');
  });
  it('Bland-Altman, Sensitivität, Spezifität (Diagnostik)', () => {
    for (const q of ['bland-altman', 'bland altman', 'bias', 'übereinstimmungsgrenzen', 'methodenvergleich']) expect(ids(q), q).toContain('frage-uebereinstimmung');
    for (const q of ['bland altman', 'limits of agreement', 'method comparison']) expect(ids(q, en), q).toContain('frage-uebereinstimmung');
    for (const q of ['sensitivität', 'spezifität', 'screening', 'referenzstandard', 'likelihood-quotient', 'vorhersagewert']) expect(ids(q), q).toContain('frage-kreuz');
    for (const q of ['sensitivity', 'specificity', 'screening', 'reference standard', 'predictive value']) expect(ids(q, en), q).toContain('frage-kreuz');
    for (const q of ['bland-altman', 'sensitivität', 'spezifität']) expect(ids(q)[0], q).toMatch(/^(bland-altman|sensitivitaet|spezifitaet)$/);
    for (const l of [de, en]) for (const id of ['bland-altman', 'sensitivitaet', 'spezifitaet', 'vorhersagewert']) expect(l.find(a => a.id === id)?.bereich, id).toBe('begriffe');
  });
  it('Mediation und Moderation', () => {
    for (const q of ['mediation', 'mediator', 'indirekter effekt', 'zwischenschritt', 'bootstrap']) expect(ids(q), q).toContain('frage-mediation');
    expect(ids('mediation')[0]).toBe('mediation');   // der Begriff zuerst
    for (const q of ['moderation', 'moderator', 'wechselwirkung', 'einfache steigungen', 'simple slopes', 'johnson-neyman', 'hängt davon ab']) expect(ids(q), q).toContain('frage-moderation');
    expect(ids('moderation')[0]).toBe('moderation');
    expect(ids('bootstrap')[0]).toBe('bootstrap');
    for (const q of ['mediation', 'indirect effect', 'mediator']) expect(ids(q, en), q).toContain('frage-mediation');
    for (const q of ['moderation', 'interaction', 'simple slopes', 'bootstrap']) expect(ids(q, en), q).toContain(q === 'bootstrap' ? 'frage-mediation' : 'frage-moderation');
  });
  it('Einzelfallanalyse: NAP, Tau-U, Einzelfall, Förderung', () => {
    for (const q of ['einzelfall', 'einzelfallanalyse', 'nap', 'tau-u', 'pnd', 'ausgangslage', 'förderphase', 'verlaufsdiagramm', 'multiple baseline', 'förderdiagnostik']) expect(ids(q), q).toContain('frage-einzelfall');
    expect(ids('nap')[0]).toBe('nap');
    expect(ids('tau-u')[0]).toBe('tau-u');
    expect(ids('einzelfall').slice(0, 2)).toEqual(expect.arrayContaining(['einzelfall', 'frage-einzelfall']));
    for (const q of ['single case', 'nap', 'tau-u', 'baseline', 'time-series chart']) expect(ids(q, en), q).toContain('frage-einzelfall');
    expect(ids('single case', en).slice(0, 2)).toEqual(expect.arrayContaining(['einzelfall', 'frage-einzelfall']));
  });
  it('Kaplan-Meier: Überlebenskurve, Zensierung, Log-Rank, Median', () => {
    for (const q of ['kaplan-meier', 'kaplan meier', 'überlebenskurve', 'zensierung', 'zensiert', 'log-rank', 'logrank', 'studienabbruch', 'zeit bis zum ereignis', 'anzahl unter risiko', 'überlebenszeit']) expect(ids(q), q).toContain('frage-kaplanmeier');
    expect(ids('kaplan-meier').slice(0, 2)).toEqual(expect.arrayContaining(['frage-kaplanmeier']));
    expect(ids('log-rank')[0]).toBe('log-rank');
    expect(ids('zensierung')[0]).toBe('zensierung');
    for (const q of ['kaplan-meier', 'survival curve', 'censoring', 'log-rank', 'time to event', 'number at risk', 'study dropout']) expect(ids(q, en), q).toContain('frage-kaplanmeier');
    expect(ids('censoring', en)[0]).toBe('zensierung');
    for (const l of [de, en]) for (const id of ['kaplan-meier', 'zensierung', 'ueberlebensfunktion', 'median-ueberlebenszeit', 'log-rank', 'anzahl-unter-risiko']) expect(l.find(a => a.id === id)?.bereich, id).toBe('begriffe');
  });
  it('Mehrfachantworten: Mehreres ankreuzen, Prozent der Fälle', () => {
    for (const q of ['mehrfachantworten', 'mehrfachnennungen', 'mehreres ankreuzen', 'mrsets', 'mult response']) expect(ids(q), q).toContain('frage-mehrfachantworten');
    expect(ids('mehrfachantworten').slice(0, 2)).toEqual(expect.arrayContaining(['frage-mehrfachantworten']));
    expect(ids('prozent der fälle')[0]).toBe('prozent-der-faelle');
    expect(ids('prozent der antworten')[0]).toBe('prozent-der-antworten');
    for (const q of ['multiple responses', 'tick all that apply', 'multiple response set', 'percent of cases']) expect(ids(q, en), q).toContain('frage-mehrfachantworten');
    for (const l of [de, en]) for (const id of ['mehrfachantworten-set', 'prozent-der-faelle', 'prozent-der-antworten']) expect(l.find(a => a.id === id)?.bereich, id).toBe('begriffe');
  });
  it('Messwiederholung: Sphärizität, Greenhouse-Geisser, Mauchly', () => {
    for (const q of ['messwiederholung', 'sphärizität', 'sphaerizitaet', 'mauchly', 'greenhouse', 'huynh-feldt', 'zeitpunkte', 'längsschnitt']) expect(ids(q), q).toContain('frage-messwiederholung');
    expect(ids('messwiederholung')[0]).toBe('frage-messwiederholung');
    for (const q of ['mauchly', 'sphärizität']) expect(ids(q).slice(0, 2), q).toEqual(expect.arrayContaining(['sphaerizitaet', 'frage-messwiederholung']));   // der Begriff zuerst, dann die Frageart
    for (const q of ['repeated measures', 'sphericity', 'mauchly', 'greenhouse-geisser', 'time points']) expect(ids(q, en), q).toContain('frage-messwiederholung');
    expect(ids('sphericity', en).slice(0, 2)).toContain('frage-messwiederholung');
    for (const l of [de, en]) for (const id of ['sphaerizitaet', 'greenhouse-geisser']) expect(l.find(a => a.id === id)?.bereich, id).toBe('begriffe');
  });
  it('Normwerte: t-wert, prozentrang, stanine, z-wert, iq', () => {
    for (const q of ['t-wert', 'prozentrang', 'stanine', 'normwerte', 'testnorm', 'standardwerte']) expect(ids(q), q).toContain('normwerte');
    for (const q of ['t-wert', 'prozentrang', 'stanine']) expect(ids(q)[0], q).toBe('normwerte');
    for (const q of ['t score', 'percentile rank', 'stanine', 'norm scores']) expect(ids(q, en), q).toContain('normwerte');
    expect(ids('percentile rank', en)[0]).toBe('normwerte');
  });
  it('Bayes-Faktor: Artikel unter „Ergebnisse lesen“, Begriff unter A-Z, in beiden Sprachen auffindbar', () => {
    for (const q of ['bayes', 'bayes-faktor', 'bf10', 'jasp', 'evidenz für die nullhypothese', 'prior']) expect(ids(q), q).toContain('bayes-faktor');
    for (const q of ['bayes factor', 'bf10', 'jasp', 'prior']) expect(ids(q, en), q).toContain('bayes-faktor');
    expect(ids('bayes-faktor')[0]).toMatch(/^bayes/);
    for (const l of [de, en]) { expect(l.find(a => a.id === 'bayes-faktor')?.bereich).toBe('lesen'); expect(l.find(a => a.id === 'bayes')?.bereich).toBe('begriffe'); }
    for (const l of [de, en]) { const a = l.find(x => x.id === 'bayes-faktor')!; expect(a.inhalt.length).toBeGreaterThan(8); }
  });
  it('Bayes-Artikel hat höchstens etwa 350 Wörter und das Gerüst Kurz … Für Fachleute', () => {
    const wort = (a: { inhalt: unknown[] }) => a.inhalt.map(b => typeof b === 'string' ? b : Object.values(b as object).flat().join(' ')).join(' ').split(/\s+/).length;
    const a = de.find(x => x.id === 'bayes-faktor')!;
    expect(wort(a)).toBeLessThan(400); expect(a.inhalt[0]).toEqual({ h: 'Kurz' }); expect(a.inhalt.at(-2)).toEqual({ h: 'Für Fachleute' });
  });
  it('neue Begriffe stehen unter Begriffe A-Z', () => {
    for (const l of [de, en]) for (const id of ['rangkorrelation', 'gepaarte-messung', 'logistische-regression', 'odds-ratio']) expect(l.find(a => a.id === id)?.bereich, id).toBe('begriffe');
  });
  it('Deutsch und Englisch sind gleich gebaut (gleiche Blockarten in gleicher Reihenfolge, gleich viele Listenpunkte)', () => {
    const form = (b: unknown) => { if (typeof b === 'string') return 'p'; const o = b as Record<string, unknown>; const k = Object.keys(o)[0]!; const v = o[k]; return k + (Array.isArray(v) ? v.length : ''); };
    for (const a of de) {
      const e = en.find(x => x.id === a.id);
      expect(e, a.id).toBeDefined();
      if (a.bereich !== 'begriffe') expect(e!.inhalt.map(form), a.id).toEqual(a.inhalt.map(form));
    }
  });
  it('Lange Artikel beginnen mit „Kurz“ (de) bzw. „In brief“ (en)', () => {
    const wort = (a: { inhalt: unknown[] }) => a.inhalt.map(b => typeof b === 'string' ? b : Object.values(b as object).flat().join(' ')).join(' ').split(/\s+/).length;
    for (const a of de.filter(x => wort(x) > 250 && x.id !== 'datenschutz-projekt' && x.id !== 'ueber-statable')) {   // „Über Statable“: der erste Absatz ist die Kurzbeschreibung und zugleich die Suchmaschinen-Beschreibung
      expect(a.inhalt[0], a.id).toEqual({ h: 'Kurz' });
      expect(en.find(x => x.id === a.id)!.inhalt[0], a.id).toEqual({ h: 'In brief' });
    }
  });
  it('Mehrere Projekte stehen in beiden Sprachen im Artikel zum Projekt', () => {
    expect(JSON.stringify(de.find(a => a.id === 'datenschutz-projekt')!.inhalt)).toContain('Zuletzt bearbeitet');
    expect(JSON.stringify(en.find(a => a.id === 'datenschutz-projekt')!.inhalt)).toContain('Recently edited');
  });
  it('jeder Artikel gehört zu einem Bereich, Verweise führen ins Leere nie', () => {
    for (const l of [de, en]) {
      const alle = new Set(l.map(a => a.id)), b = new Set(BEREICHE.map(x => x.id));
      expect(alle.size).toBe(l.length);
      for (const a of l) { expect(b.has(a.bereich)).toBe(true); for (const v of a.verwandt) expect(alle.has(v), `${a.id} → ${v}`).toBe(true); }
    }
  });
});

describe('Abnahme 3, K5: Kaplan-Meier ist über die Hilfe-Suche zu finden', () => {
  it('„Überlebenszeit“, „Studienabbruch“, „Kaplan“, englisch „survival“', () => {
    for (const q of ['Überlebenszeit', 'Studienabbruch', 'Kaplan', 'Kaplan-Meier']) expect(ids(q).slice(0, 3), q).toContain('frage-kaplanmeier');
    expect(ids('survival', en)).toContain('frage-kaplanmeier');
    expect(ids('dropout', en)).toContain('frage-kaplanmeier');
  });
  it('Paarvergleiche, Normalverteilung, Partialkorrelation, ROC, Beispiele und Installieren werden gefunden (08.10.)', () => {
    expect(ids('Tukey')).toEqual(expect.arrayContaining(['frage-posthoc']));
    expect(ids('Games-Howell')).toContain('frage-posthoc');
    expect(ids('Shapiro')).toEqual(expect.arrayContaining(['normalverteilung-pruefen', 'shapiro-wilk']));
    expect(ids('Q-Q')).toContain('normalverteilung-pruefen');
    expect(ids('Partialkorrelation')).toContain('frage-partialkorrelation');
    expect(ids('herausrechnen')).toContain('frage-partialkorrelation');
    expect(ids('ROC')).toEqual(expect.arrayContaining(['roc-kurve', 'roc-auc']));
    expect(ids('Schwellenwert')).toContain('roc-kurve');
    expect(ids('Beispiele')).toContain('beispiele-seite');
    expect(ids('offline')).toContain('installieren-offline');
    expect(ids('Tukey', en)).toContain('frage-posthoc');
    expect(ids('partial correlation', en)).toContain('frage-partialkorrelation');
  });
});
