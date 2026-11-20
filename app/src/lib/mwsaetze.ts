/**
 * Sätze, APA-Zeile und Tabellen zur Messwiederholung (Zahlen: messwiederholung.ts).
 * Die Tabellen sind echte Tabellen im Format der PSPP-Ausgabe (TableItem), damit Blatt, Bericht, Word, PDF und Excel
 * sie wie alle anderen zeigen - sie werden bei jedem Aufruf neu gebaut und folgen so der Sprache.
 * Wortstufe aus ηG² (Abschlusstest T61/F4); Regel „immer Greenhouse-Geisser“ wie afex.
 */
import type { Cell, TableItem } from '../engine/types';
import { spalteNach, L } from './sitzung.svelte';
import { ki, dfKlammer, pfeil } from '../i18n/profil';
import { lesbar } from './verzeichnis';
import { komma, ohneNull, pWert, pStellen, eta2Wort, type Saetze, unter05 } from './ergebnis';
import { korrekturName, korrigiert, type Messwiederholung, type MwEffekt, type MwKorrektur } from './messwiederholung';

const T = L;
/** Freiheitsgrade: ganz, sonst zwei Stellen (unter 100) bzw. eine Stelle (wie F(1,72, 101,5)). */
const dfText = (d: number) => (Math.abs(d - Math.round(d)) < 1e-9 ? komma(d, 0) : komma(d, d < 100 ? 2 : 1));
const aufzaehlen = (l: string[]) => (l.length < 2 ? l.join('') : `${l.slice(0, -1).join(', ')} ${T('und', 'and')} ${l.at(-1)}`);

/** Name eines Zeitpunkts (Spaltenbezeichnung) aus dem Index. */
export type ZeitName = (i: number) => string;

const effektName = (q: MwEffekt['quelle']) => (q === 'zeit' ? T('Zeit', 'Time') : q === 'gruppe' ? T('Gruppe', 'Group') : T('Zeit × Gruppe', 'Time × group'));

/** F-Zeile in APA-Form (ohne Klammerzusatz zur Korrektur). */
function fZeile(e: Messwiederholung, ef: MwEffekt, kor: MwKorrektur): string {
  const k = korrigiert(e, ef, kor);
  return `F${dfKlammer(dfText(k.df1), dfText(k.df2))} = ${komma(ef.f)}, p ${pWert(k.p)}, ηp² = ${ohneNull(ef.etaP)}, ${ki(ohneNull(ef.etaPLo), ohneNull(ef.etaPHi))}, ηG² = ${ohneNull(ef.etaG)}`;
}

/** Paare von Zeitpunkten, die sich nach Bonferroni unterscheiden („pre/post“, „pre/fup“). */
function signifikantePaare(e: Messwiederholung, zn: ZeitName): string[] {
  return e.paare.filter(p => p.pAnp < 0.05).map(p => `${zn(p.i)}/${zn(p.j)}`);
}

export function saetzeMesswiederholung(e: Messwiederholung, zn: ZeitName, gruppenName: string = ''): Saetze {
  const kor = e.korrektur, k = e.zeitpunkte.length, gemischt = !!e.gruppe, z = e.zeit;
  // T61/F4 (Abschlusstest): Die Wortstufe kommt aus dem generalisierten η² (Olejnik & Algina 2003; Bakeman 2005; afex „ges“) - nur ηG² ist mit Cohens Grenzen
  // für η² aus Gruppenvergleichen vergleichbar; ηp² fällt bei Messwiederholung viel größer aus und steht mit Intervall daneben.
  const kz = korrigiert(e, z, kor), sigZ = kz.p < 0.05, wortZ = eta2Wort(z.etaG);
  const m = e.randmittel, auf = m.at(-1)! > m[0]!, ab = m.at(-1)! < m[0]!;
  const monoAuf = m.every((v, i) => i === 0 || v >= m[i - 1]!) && auf, monoAb = m.every((v, i) => i === 0 || v <= m[i - 1]!) && ab;
  // T14: Gerundet gleiche Mittel heißen „bleibt fast gleich“, Auf und Ab „steigt und fällt“ (vorher „verläuft nicht gleichförmig der Wert“).
  const flach = m.every(v => komma(v, 1) === komma(m[0]!, 1));
  // Nachttest 24.10.: „steigt und fällt: 3,1 → 3,0 → 3,0“ - verdeckt eine Stelle die Bewegung, stehen zwei
  const stellen = !flach && m.some((v, i) => i > 0 && komma(v, 1) === komma(m[i - 1]!, 1)) ? 2 : 1;
  const reihe = k <= 6 ? m.map(v => komma(v, stellen)).join(' ' + pfeil() + ' ') : `${komma(m[0]!, stellen)} ${pfeil()} … ${pfeil()} ${komma(m.at(-1)!, stellen)}`;
  const verlauf = monoAuf ? T('steigt', 'rises') : monoAb ? T('sinkt', 'falls') : T('steigt und fällt', 'goes up and down');
  const haupt = gemischt
    ? (flach
      ? T(`Verglichen werden ${e.gruppen.length} Gruppen (${gruppenName || e.gruppenSpalte}) über ${k} Zeitpunkte; im Mittel der Gruppen bleibt der Wert fast gleich: ${reihe}.`,
        `${e.gruppen.length} groups (${gruppenName || e.gruppenSpalte}) are compared over ${k} time points; averaged over the groups the value stays almost the same: ${reihe}.`)
      : T(`Verglichen werden ${e.gruppen.length} Gruppen (${gruppenName || e.gruppenSpalte}) über ${k} Zeitpunkte; im Mittel der Gruppen ${verlauf} der Wert: ${reihe}.`,
        `${e.gruppen.length} groups (${gruppenName || e.gruppenSpalte}) are compared over ${k} time points; averaged over the groups the value ${verlauf}: ${reihe}.`))
    : flach
      ? T(`Im Schnitt bleibt der Wert über die ${k} Zeitpunkte fast gleich: ${reihe}.`, `On average the value stays almost the same over the ${k} time points: ${reihe}.`)
      : T(`Im Schnitt ${verlauf} der Wert über die ${k} Zeitpunkte: ${reihe}.`, `On average the value ${verlauf} over the ${k} time points: ${reihe}.`);

  const paare = signifikantePaare(e, zn);
  const paarSatz = paare.length
    ? T(` Nach Bonferroni-Korrektur unterscheiden sich ${aufzaehlen(paare.slice(0, 6))}${paare.length > 6 ? L(' …', ' …') : ''}.`, ` After Bonferroni correction, ${aufzaehlen(paare.slice(0, 6))}${paare.length > 6 ? L(' …', ' …') : ''} differ.`)
    : T(' Nach Bonferroni-Korrektur unterscheidet sich kein Paar von Zeitpunkten.', ' After Bonferroni correction, no pair of time points differs.');
  const kiZ = ki(ohneNull(z.etaPLo), ohneNull(z.etaPHi));
  const zeitSatz = sigZ
    ? T(`Die Werte unterscheiden sich über die Zeit${gemischt ? L(' (gemittelt über die Gruppen)', ' (averaged over the groups)') : ''}; der Effekt ist ${wortZ} (ηG² = ${ohneNull(z.etaG)}, nach üblicher Faustregel für ηG²; ηp² = ${ohneNull(z.etaP)}, ${kiZ}). Ein mindestens so großer Unterschied wäre selten, wenn sich über die Zeit in Wahrheit nichts verändert (p ${pWert(kz.p)}).${paarSatz}`,
      `The values differ over time${gemischt ? L(' (gemittelt über die Gruppen)', ' (averaged over the groups)') : ''}; the effect is ${wortZ} (ηG² = ${ohneNull(z.etaG)}, by a common rule of thumb for ηG²; ηp² = ${ohneNull(z.etaP)}, ${kiZ}). A difference at least this large would be rare if nothing truly changed over time (p ${pWert(kz.p)}).${paarSatz}`)
    : T(`Die Unterschiede über die Zeit sind ${wortZ} (ηG² = ${ohneNull(z.etaG)}; ηp² = ${ohneNull(z.etaP)}, ${kiZ}) und kommen auch dann nicht selten vor, wenn sich in Wahrheit nichts verändert (p ${pWert(kz.p)}). Die Daten belegen darum keine Veränderung - das heißt nicht, dass es keine gibt.`,
      `The differences over time are ${wortZ} (ηG² = ${ohneNull(z.etaG)}; ηp² = ${ohneNull(z.etaP)}, ${kiZ}) and are not unusual even if nothing truly changes (p ${pWert(kz.p)}). So the data do not show a change - that does not mean there is none.`);
  let zusatz = zeitSatz;
  if (gemischt) {
    const w = e.wechsel!, g = e.gruppe!, kw = korrigiert(e, w, kor), sigW = kw.p < 0.05, sigG = g.p < 0.05;
    zusatz += sigW
      ? T(` Die Wechselwirkung Zeit × Gruppe ist signifikant (ηp² = ${ohneNull(w.etaP)}, p ${pWert(kw.p)}): Die Entwicklung über die Zeit unterscheidet sich zwischen den Gruppen. Die Haupteffekte sind dann mit Vorsicht zu lesen.`,
        ` The time × group interaction is significant (ηp² = ${ohneNull(w.etaP)}, p ${pWert(kw.p)}): the development over time differs between the groups. The main effects must then be read with care.`)
      : T(` Dass sich die Entwicklung über die Zeit zwischen den Gruppen unterscheidet, zeigen die Daten nicht (Wechselwirkung Zeit × Gruppe: ηp² = ${ohneNull(w.etaP)}, p ${pWert(kw.p)}).`,
        ` The data do not show that the development over time differs between the groups (time × group interaction: ηp² = ${ohneNull(w.etaP)}, p ${pWert(kw.p)}).`);
    zusatz += sigG
      ? T(` Die Gruppen unterscheiden sich im Mittel über alle Zeitpunkte (ηp² = ${ohneNull(g.etaP)}, p ${pWert(g.p)}).`, ` The groups differ on average over all time points (ηp² = ${ohneNull(g.etaP)}, p ${pWert(g.p)}).`)
      : T(` Einen Unterschied zwischen den Gruppen im Mittel über alle Zeitpunkte belegen die Daten nicht (ηp² = ${ohneNull(g.etaP)}, p ${pWert(g.p)}).`, ` The data do not show a difference between the groups on average over all time points (ηp² = ${ohneNull(g.etaP)}, p ${pWert(g.p)}).`);
  }

  const sp = e.sphaer, spOk = Number.isFinite(sp.w), verletzt = spOk && sp.p < 0.05;
  const korText = korrekturName(kor);
  const sphaerSatz = k < 3 ? '' : !spOk
    ? T(` Der Mauchly-Test lässt sich bei ${e.n} Personen nicht berechnen; Greenhouse-Geisser-ε = ${ohneNull(sp.gg)}.`, ` Mauchly's test cannot be calculated with ${e.n} people; Greenhouse-Geisser ε = ${ohneNull(sp.gg)}.`)
    : kor === 'keine'
    ? T(` Die Freiheitsgrade sind nicht korrigiert (Mauchly W = ${ohneNull(sp.w)}, p ${pWert(sp.p)}; Greenhouse-Geisser-ε = ${ohneNull(sp.gg)}).`, ` The degrees of freedom are not corrected (Mauchly W = ${ohneNull(sp.w)}, p ${pWert(sp.p)}; Greenhouse-Geisser ε = ${ohneNull(sp.gg)}).`)
    : verletzt
    ? T(` Der Mauchly-Test spricht gegen Sphärizität (W = ${ohneNull(sp.w)}, p ${pWert(sp.p)}); berichtet wird mit ${korText}-Korrektur (ε = ${ohneNull(kor === 'gg' ? sp.gg : sp.hf)}).`,
      ` Mauchly's test indicates a violation of sphericity (W = ${ohneNull(sp.w)}, p ${pWert(sp.p)}); the ${korText} correction is reported (ε = ${ohneNull(kor === 'gg' ? sp.gg : sp.hf)}).`)
    : T(` Der Mauchly-Test spricht nicht gegen Sphärizität (W = ${ohneNull(sp.w)}, p ${pWert(sp.p)}); berichtet wird trotzdem mit ${korText}-Korrektur (ε = ${ohneNull(kor === 'gg' ? sp.gg : sp.hf)}), denn der Test erkennt Abweichungen bei wenigen Personen kaum und schlägt bei vielen schon bei kleinen an.`,
      ` Mauchly's test does not indicate a violation of sphericity (W = ${ohneNull(sp.w)}, p ${pWert(sp.p)}); the ${korText} correction is reported all the same (ε = ${ohneNull(kor === 'gg' ? sp.gg : sp.hf)}), because the test hardly detects deviations with few people and reacts to small ones with many.`);
  const vorsicht = (e.gesamt > e.n ? T(`Es gehen nur die ${e.n} Personen mit allen ${k} Messungen ein (${e.gesamt - e.n} mit Lücken ausgelassen). `, `Only the ${e.n} people with all ${k} measurements are included (${e.gesamt - e.n} with gaps left out). `) : '')
    + (e.n < 20 ? T(`Bei ${e.n} Personen sind Sphärizität und Normalverteilung schwer zu beurteilen, das Ergebnis ist unsicherer. `, `With ${e.n} people, sphericity and normality are hard to judge and the result is less certain. `) : '')
    + sphaerSatz.trim()
    // T61/F4: welches η² die Stufe trägt
    + T(' Die Einordnung folgt ηG², das mit η² aus Gruppenvergleichen vergleichbar ist; ηp² fällt bei Messwiederholung meist deutlich größer aus (Olejnik und Algina 2003; Bakeman 2005).', ' The classification follows ηG², which is comparable with η² from group comparisons; with repeated measures ηp² is usually considerably larger (Olejnik and Algina 2003; Bakeman 2005).')
    + (gemischt ? '' : T(' Ohne Vergleichsgruppe können Übung, Reifung oder andere Einflüsse hinter einer Veränderung über die Zeit stecken.', ' Without a comparison group, practice, maturation or other influences may be behind a change over time.'));

  const apa = gemischt
    ? [e.gruppe!, z, e.wechsel!].map(ef => `${effektName(ef.quelle)}: ${fZeile(e, ef, kor)}`).join('; ') + (kor === 'keine' ? '' : ` (${korText})`)
    : fZeile(e, z, kor) + (kor === 'keine' || k < 3 ? '' : ` (${korText})`);
  const eps = kor === 'gg' ? sp.gg : sp.hf;
  return {
    haupt, zusatz: zusatz.trim(), vorsicht: vorsicht.trim(), apa,
    marken: [
      { text: `${T('Veränderung über die Zeit', 'Change over time')}: ${wortZ} · ηG² = ${ohneNull(z.etaG)}`, erklaer: 'eta-quadrat' },
      { text: `p ${pWert(kz.p)}${unter05(sigZ)}`, erklaer: 'p-wert' },
      { text: T(`Plausibler Bereich für ηp²: ${ohneNull(z.etaPLo)} bis ${ohneNull(z.etaPHi)}`, `Plausible range for ηp²: ${ohneNull(z.etaPLo)} to ${ohneNull(z.etaPHi)}`), erklaer: 'konfidenzintervall' },
      ...(k >= 3 ? [
        { text: spOk ? T(`Sphärizität: Mauchly p ${pWert(sp.p)}`, `Sphericity: Mauchly p ${pWert(sp.p)}`) : T('Sphärizität: nicht prüfbar', 'Sphericity: cannot be tested'), erklaer: 'sphaerizitaet', hinweis: verletzt },
        { text: kor === 'keine' ? T(`ε (${korrekturName('gg')}) = ${ohneNull(sp.gg)}`, `ε (${korrekturName('gg')}) = ${ohneNull(sp.gg)}`) : `ε = ${ohneNull(eps)} (${korText})`, erklaer: 'greenhouse-geisser' }] : []),
      { text: `ηp² = ${ohneNull(z.etaP)}`, erklaer: 'eta-quadrat' },
      { text: T(`${e.n} Personen`, `${e.n} people`), erklaer: 'stichprobe', hinweis: e.n < 20 }
    ]
  };
}

/* ------------------------------------------------------------ Tabellen */

export type Z = string | { t: string; n: number; g?: boolean };
/** Feste Stellen mit Punkt (die Ausgabe wandelt in Dezimalkomma); ohne führende Null für Werte bis 1. */
/** Negative Null („-0.00“) nie zeigen. */
const ohneMinusNull = (t: string) => (/^-[0.]+$/.test(t) ? t.slice(1) : t);
export const fx = (v: number, d = 2): Z => (Number.isFinite(v) ? { t: ohneMinusNull(v.toFixed(d)), n: v } : '-');
/** Wie `fx`, aber für Quadratsummen und mittlere Quadrate, die sehr groß werden können: die Anzeige (localizeCell) schreibt ab 1000 aus `n` mit Tausendertrenner der Sprache und höchstens 15 gültigen Stellen. */
export const fxg = (v: number, d = 2): Z => { const z = fx(v, d); return typeof z === 'string' ? z : { ...z, g: true }; };
export const fo = (v: number, d = 2): Z => (Number.isFinite(v) ? { t: ohneMinusNull(v.toFixed(d)).replace(/^(-?)0\./, '$1.'), n: v } : '-');
export const fp = (v: number): Z => (Number.isFinite(v) ? { t: v < 0.001 ? '< .001' : v >= 0.9995 ? '> .999' : v.toFixed(pStellen(v)).replace(/^0\./, '.'), n: v } : '-');   // APA: p ist nie 1
export const fd = (v: number): Z => (Number.isFinite(v) ? { t: Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : v.toFixed(v < 100 ? 2 : 1), n: v } : '-');

export function tabelle(label: string, titel: string, kopf: string[], zeilen: Z[][], fuss: string[] = []): TableItem {
  const zelle = (r: number, c: number, z: Z, h: boolean): Cell => (typeof z === 'string'
    ? { r, c, rs: 1, cs: 1, h, a: c === 0 ? 'l' : 'c', t: z }
    : { r, c, rs: 1, cs: 1, h, a: 'r', t: z.t, n: z.n, ...(z.g ? { g: true } : {}) });
  const cells: Cell[] = [...kopf.map((t, c) => zelle(0, c, t, true)), ...zeilen.flatMap((row, r) => row.map((z, c) => zelle(r + 1, c, z, c === 0)))];
  const fn = (t: string): Cell => ({ r: 0, c: 0, rs: 1, cs: 1, h: false, a: 'l', t });
  return { type: 'table', label, layer: [], title: { r: 0, c: 0, rs: 1, cs: 1, h: false, a: 'l', t: titel }, rows: zeilen.length + 1, cols: kopf.length, headRows: [1, 0], headCols: [1, 0], cells, caption: null, footnotes: fuss.map(fn) };
}

export function tabellenMesswiederholung(e: Messwiederholung, zn: ZeitName, gruppen: (q: number) => string = q => e.gruppen[q]!.name): TableItem[] {
  const kor = e.korrektur, k = e.zeitpunkte.length, gemischt = !!e.gruppe;
  const korText = korrekturName(kor);
  // 1 Beschreibung
  const besch = tabelle('Descriptive Statistics', T('Mittelwerte je Zeitpunkt', 'Means by time point'),
    [gemischt ? T('Gruppe · Zeitpunkt', 'Group · time point') : T('Zeitpunkt', 'Time point'), 'n', 'M', 'SD', T('95 %-KI untere Grenze', '95% CI lower'), T('95 %-KI obere Grenze', '95% CI upper')],
    e.zellen.flatMap((zs, q) => zs.map((c, j) => [gemischt ? `${gruppen(q)} · ${zn(j)}` : zn(j), fd(c.n), fx(c.m), fx(c.sd), fx(c.kiLo), fx(c.kiHi)])),
    [T('Konfidenzintervalle des Mittelwerts mit der t-Verteilung (n − 1 Freiheitsgrade).', 'Confidence intervals of the mean use the t distribution (n − 1 degrees of freedom).')]);
  // 2 Mauchly
  const sp = e.sphaer;
  const mauchly = tabelle('Mauchly Test', T('Mauchly-Test auf Sphärizität', "Mauchly's test of sphericity"),
    [T('Effekt', 'Effect'), 'W', 'χ²', 'df', 'p', 'ε (Greenhouse-Geisser)', 'ε (Huynh-Feldt)'],
    [[T('Zeit', 'Time'), fo(sp.w, 3), fx(sp.chi2), fd(sp.df), fp(sp.p), fo(sp.gg, 3), fo(sp.hf, 3)]],
    [gemischt ? T('Mit der gepoolten Kovarianz innerhalb der Gruppen. ε = 1 heißt: Sphärizität erfüllt; untere Grenze 1/(k − 1).', 'Uses the pooled covariance within groups. ε = 1 means sphericity holds; lower bound 1/(k − 1).') : T('ε = 1 heißt: Sphärizität erfüllt; untere Grenze 1/(k − 1).', 'ε = 1 means sphericity holds; lower bound 1/(k − 1).')]);
  // 3 Varianzanalyse
  const zeile = (ef: MwEffekt, name: string): Z[] => { const c = korrigiert(e, ef, kor); return [name, fx(ef.ss), fd(c.df1), fx(ef.ss / c.df1), fx(ef.f), fp(c.p), fo(ef.etaP), fo(ef.etaPLo), fo(ef.etaPHi), fo(ef.etaG)]; };
  const fehler = (name: string, ss: number, df: number, eps: number): Z[] => [name, fx(ss), fd(df * eps), fx(ss / (df * eps)), '', '', '', '', '', ''];
  const epsK = kor === 'gg' ? sp.gg : kor === 'hf' ? sp.hf : 1;
  const rows: Z[][] = [];
  if (gemischt) rows.push(zeile(e.gruppe!, T('Gruppe', 'Group')), fehler(T('Personen innerhalb der Gruppen', 'People within groups'), e.ssPersonen, e.dfPersonen, 1));
  rows.push(zeile(e.zeit, T('Zeit', 'Time')));
  if (gemischt) rows.push(zeile(e.wechsel!, T('Zeit × Gruppe', 'Time × group')));
  rows.push(fehler(T('Fehler (Zeit)', 'Error (time)'), e.zeit.ssFehler, e.zeit.dfFehler, epsK));
  const anova = tabelle('Tests of Within-Subjects Effects', T('Varianzanalyse mit Messwiederholung', 'Repeated-measures analysis of variance'),
    [T('Quelle', 'Source'), 'SS', 'df', 'MS', 'F', 'p', 'ηp²', T('ηp² 95 %-KI untere Grenze', 'ηp² 95% CI lower'), T('ηp² 95 %-KI obere Grenze', 'ηp² 95% CI upper'), 'ηG²'], rows,
    [T(`Quadratsummen Typ III. ${kor === 'keine' ? L('Freiheitsgrade nicht korrigiert', 'Degrees of freedom not corrected') : L(`Freiheitsgrade der Zeit-Effekte mit ${korText}-ε = ${ohneNull(epsK, 3)} korrigiert`, `Degrees of freedom of the time effects corrected with ${korText} ε = ${ohneNull(epsK, 3)}`)} (ohne Korrektur: Zeit df = ${k - 1}, Fehler df = ${e.zeit.dfFehler}). ηp² = partielles, ηG² = generalisiertes η² (Olejnik & Algina, 2003).`,
      `Type III sums of squares. ${kor === 'keine' ? L('Freiheitsgrade nicht korrigiert', 'Degrees of freedom not corrected') : L(`Freiheitsgrade der Zeit-Effekte mit ${korText}-ε = ${ohneNull(epsK, 3)} korrigiert`, `Degrees of freedom of the time effects corrected with ${korText} ε = ${ohneNull(epsK, 3)}`)} (uncorrected: time df = ${k - 1}, error df = ${e.zeit.dfFehler}). ηp² = partial, ηG² = generalized η² (Olejnik & Algina, 2003).`)]);
  // 4 Paarweise Vergleiche
  const paare = tabelle('Pairwise Comparisons', T('Paarweise Vergleiche der Zeitpunkte (Bonferroni)', 'Pairwise comparisons of the time points (Bonferroni)'),
    [T('Vergleich', 'Comparison'), T('Differenz', 'Difference'), 'SE', 'df', 't', T('p (Bonferroni)', 'p (Bonferroni)'), T('95 %-KI untere Grenze', '95% CI lower'), T('95 %-KI obere Grenze', '95% CI upper'), 'dz'],
    e.paare.map(p => [`${zn(p.j)} − ${zn(p.i)}`, fx(p.diff), fx(p.se, 3), fd(p.df), fx(p.t), fp(p.pAnp), fx(p.kiLo), fx(p.kiHi), fx(p.dz)]),
    [T(`Differenz = späterer minus früherer Zeitpunkt. p-Werte und Konfidenzintervalle sind für ${e.paare.length} Vergleiche nach Bonferroni angepasst.${gemischt ? L(' Über die Gruppen gemittelt, mit der gepoolten Streuung der Differenzen.', ' Averaged over the groups, using the pooled spread of the differences.') : ''}`,
      `Difference = later minus earlier time point. p values and confidence intervals are Bonferroni-adjusted for ${e.paare.length} comparisons.${gemischt ? L(' Über die Gruppen gemittelt, mit der gepoolten Streuung der Differenzen.', ' Averaged over the groups, using the pooled spread of the differences.') : ''}`)]);
  return k >= 3 ? [besch, mauchly, anova, paare] : [besch, anova, paare];
}

/** Namen für Zeitpunkte (Spaltenbezeichnung) und Gruppen (Wertebeschriftung) aus den Daten des Projekts. */
export function mwNamen(e: Messwiederholung): { zn: ZeitName; gruppen: (q: number) => string; gruppenName: string } {
  const gs = e.gruppenSpalte ? spalteNach(e.gruppenSpalte) : undefined;
  return {
    zn: i => lesbar(spalteNach(e.zeitpunkte[i]!), true),
    gruppen: q => { const n = e.gruppen[q]!.name; return gs?.werteLabels[n] ?? gs?.werteLabels[String(Number(n))] ?? n; },
    gruppenName: gs ? lesbar(gs, true) : e.gruppenSpalte ?? ''
  };
}
