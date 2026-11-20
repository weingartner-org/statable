/**
 * Sätze, APA-Zeilen und Tabellen zu Mediation und Moderation (Zahlen: mediation.ts, moderation.ts).
 * Die Tabellen sind echte Tabellen (TableItem), die Blatt, Bericht, Word, PDF und Excel wie die PSPP-Tabellen zeigen; sie werden bei jedem Aufruf neu gebaut und folgen so der Sprache.
 * ⚠ Satzvorlagen, Schwellen (n < 50 als „klein“) und die Wortwahl zum indirekten Effekt von der Fachperson abzunehmen.
 */
import type { TableItem } from '../engine/types';
import { spalteNach, L } from './sitzung.svelte';
import { ki, proz, zitat as anfuehrung, iv } from '../i18n/profil';
import { lesbar } from './verzeichnis';
import { kd, komma, ohneNull, pWert, kurz, type Saetze, unter05 } from './ergebnis';
import { tabelle, fx, fo, fp, fd, type Z } from './mwsaetze';
import type { Mediation, MedPfad } from './mediation';
import { bootstrapGerechnet, bootstrapHinweise } from './bootstrapsaetze';
import { hesterberg } from './bootstrap';
import type { Moderation, Steigung } from './moderation';

const T = L;
const kiB = (lo: string, hi: string) => T(`95 %-Bootstrap-KI ${iv(lo, hi)}`, `95% bootstrap CI ${iv(lo, hi)}`);
const zitat = (t: string) => anfuehrung(kurz(t));
const prozent = (v: number) => proz(komma(v * 100, 0));
const klein = (n: number) => n < 50;

/** Angaben für die Sätze der Bootstrap-Grundlage (alte Projekte ohne Felder: Perzentil, keine Warnungen). */
const bootAngaben = (e: Mediation) => ({ art: e.intervallArt ?? 'perzentil', wunsch: e.intervallWunsch ?? e.intervallArt ?? 'perzentil', ziehungen: e.ziehungen, startwert: e.startwert, n: e.n, ungueltig: e.ungueltig ?? 0, warnungen: e.bootWarnungen ?? [] } as const);

/** Lesbare Spaltenbezeichnung aus den Daten des Projekts (ohne Projekt: der Name selbst). */
export const spaltenName = (n: string) => { const sp = spalteNach(n); return sp ? lesbar(sp, true) : n; };

/* ------------------------------------------------------------ Mediation */

const pfadText = (p: MedPfad) => `B = ${komma(p.b, kd(p.b))}, ${ki(komma(p.lo, kd(p.b)), komma(p.hi, kd(p.b)))}, p ${pWert(p.p)}`;

export function saetzeMediation(e: Mediation, name: (n: string) => string = spaltenName): Saetze {
  const X = zitat(name(e.x)), M = zitat(name(e.m)), Y = zitat(name(e.y));
  const sigAb = e.abLo > 0 || e.abHi < 0, sigDirekt = e.direkt.p < 0.05, sigTotal = e.total.p < 0.05;
  const gegenlaeufig = sigAb && Math.sign(e.ab) !== Math.sign(e.direkt.b) && Math.abs(e.direkt.b) > 1e-9;
  // T12: Bei entgegengesetzten Vorzeichen ist „zum Teil“ (partielle Mediation) falsch - kompetitive Mediation (Zhao, Lynch & Chen 2010; Hayes 2018, Kap. 4).
  const haupt = sigAb
    ? (sigDirekt && gegenlaeufig
      ? T(`Über ${M} läuft ein indirekter Effekt von ${X} auf ${Y}; der direkte Effekt zeigt in die Gegenrichtung (kompetitive Mediation). Beide heben sich teilweise auf.`,
        `There is an indirect effect of ${X} on ${Y} through ${M}; the direct effect points in the opposite direction (competitive mediation). The two partly cancel each other out.`)
      : sigDirekt
      ? T(`Der Einfluss von ${X} auf ${Y} läuft zum Teil über ${M}.`, `The influence of ${X} on ${Y} runs in part through ${M}.`)
      : T(`Der Einfluss von ${X} auf ${Y} läuft über ${M}. Daneben ist kein direkter Effekt nachweisbar.`, `The influence of ${X} on ${Y} runs through ${M}. Besides that, no direct effect can be shown.`))
    : T(`Dass der Einfluss von ${X} auf ${Y} über ${M} läuft, belegen die Daten nicht. Das Intervall schließt 0 ein.`, `The data do not show that the influence of ${X} on ${Y} runs through ${M}. The interval includes 0.`);
  const anteilSatz = sigAb && Number.isFinite(e.anteil)
    ? T(` Rund ${prozent(e.anteil)} des Gesamteffekts laufen über ${M}.`, ` About ${prozent(e.anteil)} of the total effect runs through ${M}.`)
    : gegenlaeufig ? T(' Direkter und indirekter Effekt haben unterschiedliche Vorzeichen; ein Anteil lässt sich dann nicht sinnvoll angeben.', ' The direct and the indirect effect have different signs; a proportion cannot be given sensibly then.') : '';
  const zusatz = T(
    `Pfad a (${name(e.x)} → ${name(e.m)}): ${pfadText(e.a)}. Pfad b (${name(e.m)} → ${name(e.y)}, bei gleichem ${name(e.x)}): ${pfadText(e.b)}. Direkter Effekt c′: ${pfadText(e.direkt)}. Gesamteffekt c: ${pfadText(e.total)}${sigTotal ? '' : L(' (nicht belegt)', ' (not significant)')}. Vollständig standardisiert beträgt der indirekte Effekt ${komma(e.abStd)}, ${kiB(komma(e.abStdLo), komma(e.abStdHi))}.${anteilSatz}`,
    `Path a (${name(e.x)} → ${name(e.m)}): ${pfadText(e.a)}. Path b (${name(e.m)} → ${name(e.y)}, holding ${name(e.x)} constant): ${pfadText(e.b)}. Direct effect c′: ${pfadText(e.direkt)}. Total effect c: ${pfadText(e.total)}${sigTotal ? '' : L(' (nicht belegt)', ' (not significant)')}. Completely standardized, the indirect effect is ${komma(e.abStd)}, ${kiB(komma(e.abStdLo), komma(e.abStdHi))}.${anteilSatz}`);
  const vorsicht = T('Mediation mit Querschnittsdaten belegt keine Kausalität: Dass der Zwischenschritt zwischen den beiden anderen liegt, ist eine Annahme aus der Theorie, die die Daten allein nicht prüfen.',
    'Mediation with cross-sectional data does not establish causality: that the intermediate step lies between the other two is an assumption from theory that the data alone cannot test.')
    + (e.gesamt > e.n ? T(` Es gehen nur die ${e.n} Personen mit allen drei Angaben ein (${e.gesamt - e.n} ausgelassen).`, ` Only the ${e.n} people with all three answers are included (${e.gesamt - e.n} left out).`) : '')
    + (klein(e.n) && !hesterberg(e.n) ? T(` Bei ${e.n} Personen ist das Bootstrap-Intervall ungenau.`, ` With ${e.n} people the bootstrap interval is imprecise.`) : '')
    + bootstrapHinweise(bootAngaben(e)).map(h => ' ' + h).join('');
  const apa = `ab = ${komma(e.ab, kd(e.ab))}, ${kiB(komma(e.abLo, kd(e.ab)), komma(e.abHi, kd(e.ab)))}; a = ${komma(e.a.b, kd(e.a.b))}, p ${pWert(e.a.p)}; b = ${komma(e.b.b, kd(e.b.b))}, p ${pWert(e.b.p)}; c′ = ${komma(e.direkt.b, kd(e.direkt.b))}, p ${pWert(e.direkt.p)}; c = ${komma(e.total.b, kd(e.total.b))}, p ${pWert(e.total.p)}`;
  return {
    haupt, zusatz, vorsicht, apa,
    marken: [
      { text: T(`Indirekter Effekt ab = ${komma(e.ab, kd(e.ab))}`, `Indirect effect ab = ${komma(e.ab, kd(e.ab))}`), erklaer: 'mediation' },
      { text: T(`${kiB(komma(e.abLo, kd(e.ab)), komma(e.abHi, kd(e.ab)))} ${sigAb ? L('schließt 0 aus', 'excludes 0') : L('schließt 0 ein', 'includes 0')}`, `${kiB(komma(e.abLo, kd(e.ab)), komma(e.abHi, kd(e.ab)))} ${sigAb ? L('schließt 0 aus', 'excludes 0') : L('schließt 0 ein', 'includes 0')}`), erklaer: 'bootstrap', hinweis: !sigAb },
      { text: T(`Standardisiert: ${komma(e.abStd)}`, `Standardized: ${komma(e.abStd)}`), erklaer: 'mediation' },
      ...(Number.isFinite(e.anteil) ? [{ text: T(`Anteil über ${name(e.m)}: ${prozent(e.anteil)}`, `Proportion through ${name(e.m)}: ${prozent(e.anteil)}`), erklaer: 'mediation' }] : []),
      { text: `${T('Pfad a', 'Path a')}: p ${pWert(e.a.p)}${unter05(e.a.p < 0.05)}`, erklaer: 'p-wert' },
      { text: `${T('Pfad b', 'Path b')}: p ${pWert(e.b.p)}${unter05(e.b.p < 0.05)}`, erklaer: 'p-wert' },
      { text: T(`${e.n} Personen`, `${e.n} people`), erklaer: 'stichprobe', hinweis: klein(e.n) }
    ]
  };
}

export function tabellenMediation(e: Mediation, name: (n: string) => string = spaltenName): TableItem[] {
  const X = name(e.x), M = name(e.m), Y = name(e.y);
  const zeile = (bez: string, p: MedPfad): Z[] => [bez, fx(p.b, kd(p.b)), fx(p.se, 3), fx(p.beta), fx(p.t), fp(p.p), fx(p.lo, kd(p.b)), fx(p.hi, kd(p.b))];
  const pfade = tabelle('Mediation Paths', T('Pfade der Mediation', 'Paths of the mediation'),
    [T('Pfad', 'Path'), 'B', 'SE', 'β', 't', 'p', T('95 %-KI untere Grenze', '95% CI lower'), T('95 %-KI obere Grenze', '95% CI upper')],
    [zeile(`a: ${X} → ${M}`, e.a), zeile(`b: ${M} → ${Y}`, e.b), zeile(T(`c′: ${X} → ${Y} (direkt)`, `c′: ${X} → ${Y} (direct)`), e.direkt), zeile(T(`c: ${X} → ${Y} (gesamt)`, `c: ${X} → ${Y} (total)`), e.total)],
    [T(`Drei lineare Regressionen mit denselben ${e.n} Personen (PSPP); b und c′ gelten bei gleichem Wert der jeweils anderen Größe. R² für ${M} = ${ohneNull(e.r2M)}, für ${Y} (mit ${X} und ${M}) = ${ohneNull(e.r2Y)}. β: standardisiert.`,
      `Three linear regressions with the same ${e.n} people (PSPP); b and c′ hold the other predictor constant. R² for ${M} = ${ohneNull(e.r2M)}, for ${Y} (with ${X} and ${M}) = ${ohneNull(e.r2Y)}. β: standardized.`)]);
  const indirekt = tabelle('Indirect Effect', T('Indirekter Effekt (Bootstrap)', 'Indirect effect (bootstrap)'),
    [T('Effekt', 'Effect'), T('Schätzung', 'Estimate'), T('Bootstrap-SE', 'Bootstrap SE'), T('95 %-KI untere Grenze', '95% CI lower'), T('95 %-KI obere Grenze', '95% CI upper')],
    [[T('Indirekter Effekt ab', 'Indirect effect ab'), fx(e.ab), fx(e.abSe, 3), fx(e.abLo), fx(e.abHi)],
      [T('ab vollständig standardisiert', 'ab completely standardized'), fx(e.abStd), '-', fx(e.abStdLo), fx(e.abStdHi)],
      [T('Anteil ab / c', 'Proportion ab / c'), Number.isFinite(e.anteil) ? fo(e.anteil) : '-', '-', '-', '-']],
    [`${bootstrapGerechnet(bootAngaben(e))} ${T(`ab standardisiert = ab · SD(${X}) / SD(${Y}). Der Anteil wird nur angegeben, wenn er zwischen 0 und 1 liegt.`,
      `Standardized ab = ab · SD(${X}) / SD(${Y}). The proportion is given only if it lies between 0 and 1.`)}`]);
  return [pfade, indirekt];
}

/* ------------------------------------------------------------ Moderation */

const wLabel = (e: Moderation, st: Steigung): string => {
  const w = komma(st.w);
  return e.zwei ? `W = ${w}` : st.label === 'minus' ? `W = M − 1 SD (${w})` : st.label === 'plus' ? `W = M + 1 SD (${w})` : `W = M (${w})`;
};
const wKurz = (e: Moderation, st: Steigung): string => (e.zwei ? `W = ${komma(st.w)}` : st.label === 'minus' ? 'M − 1 SD' : st.label === 'plus' ? 'M + 1 SD' : 'M');

export function saetzeModeration(e: Moderation, name: (n: string) => string = spaltenName): Saetze {
  const X = zitat(name(e.x)), W = zitat(name(e.w)), Y = zitat(name(e.y)), sig = e.pDr2 < 0.05;
  const b3 = `B = ${komma(e.bxw.b, kd(e.bxw.b))}, ${ki(komma(e.bxw.lo, kd(e.bxw.b)), komma(e.bxw.hi, kd(e.bxw.b)))}, p ${pWert(e.pDr2)}`;
  const haupt = sig
    ? T(`Der Zusammenhang von ${X} mit ${Y} hängt von ${W} ab.`, `The relationship between ${X} and ${Y} depends on ${W}.`)
    : T(`Dass der Zusammenhang von ${X} mit ${Y} von ${W} abhängt, belegen die Daten nicht.`, `The data do not show that the relationship between ${X} and ${Y} depends on ${W}.`);
  const steig = e.steigungen.map(st => T(`bei ${wKurz(e, st)} ${komma(st.b, kd(st.b))} (p ${pWert(st.p)})`, `at ${wKurz(e, st)} ${komma(st.b, kd(st.b))} (p ${pWert(st.p)})`));
  const aufz = steig.length < 2 ? steig.join('') : `${steig.slice(0, -1).join(', ')} ${T('und', 'and')} ${steig.at(-1)}`;
  const f2a = Math.round(e.f2 * 100) / 100;   // Stufe am angezeigten Wert (T4)
  const f2Wort = f2a < 0.02 ? T('sehr klein', 'very small') : f2a < 0.15 ? T('klein', 'small') : f2a < 0.35 ? T('mittelgroß', 'medium-sized') : T('groß', 'large');
  let jn = '';
  if (e.jn.length === 1) jn = e.jn[0]!.sig
    ? T(` Im ganzen beobachteten Bereich von ${name(e.w)} (${komma(e.wMin)} bis ${komma(e.wMax)}) ist die Steigung von ${name(e.x)} signifikant.`, ` Across the whole observed range of ${name(e.w)} (${komma(e.wMin)} to ${komma(e.wMax)}) the slope of ${name(e.x)} is significant.`)
    : T(` Im ganzen beobachteten Bereich von ${name(e.w)} (${komma(e.wMin)} bis ${komma(e.wMax)}) ist die Steigung von ${name(e.x)} nicht von 0 zu unterscheiden.`, ` Across the whole observed range of ${name(e.w)} (${komma(e.wMin)} to ${komma(e.wMax)}) the slope of ${name(e.x)} cannot be told apart from 0.`);
  else if (e.jn.length > 1) {
    const teile = e.jn.filter(b => b.sig).map(b => (b.von <= e.wMin + 1e-9 ? T(`bis ${komma(b.bis)}`, `up to ${komma(b.bis)}`) : b.bis >= e.wMax - 1e-9 ? T(`ab ${komma(b.von)}`, `from ${komma(b.von)}`) : T(`von ${komma(b.von)} bis ${komma(b.bis)}`, `from ${komma(b.von)} to ${komma(b.bis)}`)));
    jn = teile.length ? T(` Nach Johnson-Neyman ist die Steigung von ${name(e.x)} signifikant bei ${name(e.w)} ${teile.join(` ${L('und', 'and')} `)}, sonst nicht.`, ` By Johnson-Neyman, the slope of ${name(e.x)} is significant for ${name(e.w)} ${teile.join(` ${L('und', 'and')} `)}, otherwise not.`) : '';
  }
  const zusatz = T(
    `Die Wechselwirkung erklärt ${prozent(e.dr2)} der Unterschiede zusätzlich (ΔR² = ${ohneNull(e.dr2)}, f² = ${komma(e.f2)}, ${f2Wort}, nach üblicher Faustregel); das Modell insgesamt erklärt R² = ${ohneNull(e.r2)}. Steigung von ${name(e.x)}: ${aufz}.${jn}`,
    `The interaction explains an additional ${prozent(e.dr2)} of the differences (ΔR² = ${ohneNull(e.dr2)}, f² = ${komma(e.f2)}, ${f2Wort}, by a common rule of thumb); the model as a whole explains R² = ${ohneNull(e.r2)}. Slope of ${name(e.x)}: ${aufz}.${jn}`);
  // T17: In einem Modell mit Wechselwirkung sind die Koeffizienten von X und W bedingte Effekte, keine Haupteffekte (Hayes 2018, Kap. 7.2; Aiken & West 1991).
  const vorsicht = T(`Die Koeffizienten von ${name(e.x)} und ${name(e.w)} sind bedingte Effekte: Sie gelten beim Mittelwert der jeweils anderen Größe (zentriert). Eine Wechselwirkung zeigt, dass der Zusammenhang je nach ${name(e.w)} verschieden ist, nicht, dass ${name(e.w)} ihn verursacht.`,
    `The coefficients of ${name(e.x)} and ${name(e.w)} are conditional effects: they hold at the mean of the other variable (centered). An interaction shows that the relationship differs by ${name(e.w)}, not that ${name(e.w)} causes it.`)
    + (e.gesamt > e.n ? T(` Es gehen nur die ${e.n} Personen mit allen drei Angaben ein (${e.gesamt - e.n} ausgelassen).`, ` Only the ${e.n} people with all three answers are included (${e.gesamt - e.n} left out).`) : '')
    + (klein(e.n) ? T(` Bei ${e.n} Personen lassen sich Wechselwirkungen nur schwer entdecken.`, ` With ${e.n} people interactions are hard to detect.`) : '');
  const apa = T(`Wechselwirkung: ${b3}, ΔR² = ${ohneNull(e.dr2)}, F(1, ${e.df2}) = ${komma(e.fDr2)}; einfache Steigungen: ${e.steigungen.map(st => `${wKurz(e, st)}: b = ${komma(st.b, kd(st.b))}, p ${pWert(st.p)}`).join('; ')}`,
    `Interaction: ${b3}, ΔR² = ${ohneNull(e.dr2)}, F(1, ${e.df2}) = ${komma(e.fDr2)}; simple slopes: ${e.steigungen.map(st => `${wKurz(e, st)}: b = ${komma(st.b, kd(st.b))}, p ${pWert(st.p)}`).join('; ')}`);
  return {
    haupt, zusatz, vorsicht, apa,
    marken: [
      { text: T(`Wechselwirkung: B = ${komma(e.bxw.b, kd(e.bxw.b))}`, `Interaction: B = ${komma(e.bxw.b, kd(e.bxw.b))}`), erklaer: 'moderation' },
      { text: `p ${pWert(e.pDr2)}${unter05(sig)}`, erklaer: 'p-wert' },
      { text: `ΔR² = ${ohneNull(e.dr2)}`, erklaer: 'moderation' },
      { text: T('Einfache Steigungen', 'Simple slopes'), erklaer: 'moderation' },
      { text: T(`${e.n} Personen`, `${e.n} people`), erklaer: 'stichprobe', hinweis: klein(e.n) }
    ]
  };
}

export function tabellenModeration(e: Moderation, name: (n: string) => string = spaltenName): TableItem[] {
  const X = name(e.x), W = name(e.w), Y = name(e.y);
  const kz = [T('95 %-KI untere Grenze', '95% CI lower'), T('95 %-KI obere Grenze', '95% CI upper')];
  const t = (bez: string, p: typeof e.bx): Z[] => [bez, fx(p.b, kd(p.b)), fx(p.se, 3), fx(p.beta), fx(p.t), fp(p.p), fx(p.lo, kd(p.b)), fx(p.hi, kd(p.b))];
  const modell = tabelle('Moderation Model', T('Regression mit Wechselwirkung', 'Regression with interaction'),
    [T('Term', 'Term'), 'B', 'SE', 'β', 't', 'p', ...kz],
    [t(T('Konstante', 'Constant'), e.konstante), t(T(`${X} (zentriert)`, `${X} (centered)`), e.bx), t(T(`${W} (zentriert)`, `${W} (centered)`), e.bw), t(`${X} × ${W}`, e.bxw)],
    [T(`Abhängige Größe: ${Y}; ${e.n} Personen; ${X} und ${W} am Mittelwert zentriert (M = ${komma(e.mx)} bzw. ${komma(e.mw)}). R² = ${ohneNull(e.r2)}, ohne Wechselwirkung ${ohneNull(e.r2Ohne)}; ΔR² = ${ohneNull(e.dr2)}, F(1, ${e.df2}) = ${komma(e.fDr2)}, p ${pWert(e.pDr2)}. PSPP-Regression.`,
      `Dependent variable: ${Y}; ${e.n} people; ${X} and ${W} centered at the mean (M = ${komma(e.mx)} and ${komma(e.mw)}). R² = ${ohneNull(e.r2)}, without interaction ${ohneNull(e.r2Ohne)}; ΔR² = ${ohneNull(e.dr2)}, F(1, ${e.df2}) = ${komma(e.fDr2)}, p ${pWert(e.pDr2)}. PSPP regression.`)]);
  const steig = tabelle('Simple Slopes', T(`Einfache Steigungen von ${X}`, `Simple slopes of ${X}`),
    [T('Bei', 'At'), 'b', 'SE', 't', 'p', ...kz],
    e.steigungen.map(st => [wLabel(e, st), fx(st.b, kd(st.b)), fx(st.se, 3), fx(st.t), fp(st.p), fx(st.lo, kd(st.b)), fx(st.hi, kd(st.b))]),
    [T(`Steigung = b(${X}) + b(${X} × ${W}) · (${W} − M). SE aus der Kovarianzmatrix der Koeffizienten, t-Test mit ${e.df2} Freiheitsgraden.${e.zwei ? L(' Der Moderator hat zwei Werte: Steigung bei beiden.', ' The moderator has two values: slope at both.') : ' SD = ' + komma(e.sdw) + '.'}`,
      `Slope = b(${X}) + b(${X} × ${W}) · (${W} − M). SE from the covariance matrix of the coefficients, t test with ${e.df2} degrees of freedom.${e.zwei ? L(' Der Moderator hat zwei Werte: Steigung bei beiden.', ' The moderator has two values: slope at both.') : ' SD = ' + komma(e.sdw) + '.'}`)]);
  const aus = [modell, steig];
  if (e.jn.length > 1) {
    aus.push(tabelle('Johnson-Neyman', T('Johnson-Neyman: Wo ist die Steigung signifikant?', 'Johnson-Neyman: where is the slope significant?'),
      [W, T(`Steigung von ${X}`, `Slope of ${X}`)],
      e.jn.map(b => [`${komma(b.von)} – ${komma(b.bis)}`, b.sig ? T('signifikant (p < ,05)', 'significant (p < .05)') : T('nicht signifikant', 'not significant')]),
      [T('Nur der beobachtete Bereich des Moderators; die Grenzen lösen |b| / SE = t(.975) für die Steigung.', 'Observed range of the moderator only; the boundaries solve |b| / SE = t(.975) for the slope.')]));
  }
  return aus;
}
