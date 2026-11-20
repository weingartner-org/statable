/**
 * Sätze, APA-Zeile und Tabellen zum Mehrebenen-Modell (Zahlen: mehrebenen.ts, R: lme4/lmerTest).
 * Die Tabellen sind echte Tabellen (TableItem) für Blatt, Bericht, Word, PDF und Excel; sie folgen bei jedem Aufruf der Sprache.
 * ⚠ Von der Fachperson abzunehmen: Satzvorlagen, die Einordnung des ICC (unter ,05 gering, bis ,15 mittel, darüber groß - Hox 2010, Faustregel),
 *   die Gruppenzahl-Hinweise (unter 10 sehr unsicher, unter 30 mit Vorsicht - Maas & Hox 2005) und die Erklärung der Singularität.
 */
import type { TableItem } from '../engine/types';
import { spalteNach, L, Lp } from './sitzung.svelte';
import { ki, proz, zitat as anfuehrung } from '../i18n/profil';
import { lesbar } from './verzeichnis';
import { kd, komma, ohneNull, pWert, kurz, aufzaehlung, type Saetze } from './ergebnis';
import { tabelle, fx, fo, fp, fd, type Z } from './mwsaetze';
import { MEB_GRUPPEN_GUT, MEB_GRUPPEN_WENIG, MEB_ICC_SCHWELLE, MEB_DEFF_SCHWELLE, type Mehrebenen, type MebFest, type MebPraed, type MebTeil, type GruppenVorschlag } from './mehrebenen';

const T = L;
const zitat = (t: string) => anfuehrung(kurz(t));
/** Zitat ohne Kürzen auf 40 Zeichen: Namen mit Rolle oder Produkt („A (innerhalb) × B“) würden sonst mitten im Namen abbrechen. */
const zitatLang = (t: string) => anfuehrung(kurz(t, 90));
const prozent = (v: number) => proz(komma(v * 100, 0));
const dfText = (d: number) => (Math.abs(d - Math.round(d)) < 1e-9 ? komma(d, 0) : komma(d, d < 100 ? 2 : 1));
export const spaltenName = (n: string) => { const sp = spalteNach(n); return sp ? lesbar(sp, true) : n; };

/** Wort zur Größe des ICC (Hox 2010: .05 klein, .10 mittel, .15 groß; hier in drei Stufen). ⚠ Fachperson. */
// T19: nach Hox (,05 klein, ,10 mittel, ,15 groß): unter ,05 gering, bis unter ,10 klein, bis unter ,15 mittel, darüber groß (am angezeigten Wert).
export const iccWort = (icc0: number, icc = Math.round(icc0 * 100) / 100) => (icc < MEB_ICC_SCHWELLE ? T('gering', 'negligible') : icc < 0.1 ? T('klein', 'small') : icc < 0.15 ? T('mittel', 'medium') : T('groß', 'large'));

/** Name einer Größe im Modell: Spalte, bei Zentrieren am Gruppenmittel „Spalte (innerhalb der Gruppe)“ bzw. „Spalte (Gruppenmittel)“, bei einem Produkt „A × B“.
 *  `knapp`: „(innerhalb)“ statt „(innerhalb der Gruppe)“ - für Sätze, in denen lange Namen sonst abgeschnitten würden. */
export function praedName(p: MebPraed, name: (n: string) => string = spaltenName, knapp = false): string {
  if (!p.teile) return name(p.name);
  const rolle = (r: 'innerhalb' | 'zwischen') => (r === 'innerhalb' ? (knapp ? T('innerhalb', 'within') : T('innerhalb der Gruppe', 'within the group')) : T('Gruppenmittel', 'group mean'));
  return p.teile.map(t => (t.rolle ? `${name(t.quelle)} (${rolle(t.rolle)})` : name(t.quelle))).join(' × ');
}
/** Name der Größe mit zufälliger Steigung. */
export const steigungAnzeige = (e: Mehrebenen, name: (n: string) => string = spaltenName) => { const st = e.praed.find(p => p.name === e.steigung); return st ? praedName(st, name) : name(e.steigung); };
/** Beschriftung eines festen Effekts: Konstante, Zahl oder Stufe eines Faktors gegenüber der Vergleichsgruppe. */
export function festName(e: Mehrebenen, f: MebFest, name: (n: string) => string = spaltenName): string {
  if (f.pIdx < 0) return T('Konstante (Achsenabschnitt)', 'Intercept');
  const p = e.praed[f.pIdx]!;
  return p.art === 'faktor' ? `${praedName(p, name)}: ${f.stufe} ${T('gegenüber', 'vs.')} ${p.stufen[0]}` : praedName(p, name);
}
const festKurz = (e: Mehrebenen, f: MebFest, name: (n: string) => string) => {
  if (f.pIdx < 0) return T('Konstante', 'intercept');
  const p = e.praed[f.pIdx]!;
  return p.art === 'faktor' ? `${praedName(p, name, true)} (${f.stufe})` : praedName(p, name, true);
};
const effekte = (e: Mehrebenen) => e.fest.filter(f => f.pIdx >= 0);
const bedeutsam = (e: Mehrebenen) => effekte(e).filter(f => f.p < 0.05);

/** Median-Odds-Ratio (Larsen & Merlo 2005): so stark unterscheidet sich die Chance im Median zwischen zwei Personen aus zwei zufällig gewählten Gruppen (mit gleichen Merkmalen). */
export const mor = (tau: number) => Math.exp(Math.sqrt(2 * Math.max(tau, 0)) * 0.6744897501960817);
/** Ja/Nein-Ergebnis: „OR = 1,05, 95 %-KI [1,01; 1,10], z = 2,40, p = ,016“ (Odds Ratio = exp(b), Intervall exp(b ± 1,96 · SE)). */
const orApa = (f: MebFest) => `OR = ${komma(Math.exp(f.b), 2)}, ${ki(komma(Math.exp(f.lo), 2), komma(Math.exp(f.hi), 2))}, z = ${komma(f.t)}, p ${pWert(f.p)}`;

/** „b = 2,09, 95 %-KI [1,88; 2,30], t(6832) = 19,77, p < ,001“ */
const festApa = (f: MebFest) => `b = ${komma(f.b, kd(f.b))}, ${ki(komma(f.lo, kd(f.b)), komma(f.hi, kd(f.b)))}, t(${dfText(f.df)}) = ${komma(f.t)}, p ${pWert(f.p)}`;

export function mebApa(e: Mehrebenen, name: (n: string) => string = spaltenName): string {
  const zwei = e.gruppe2 !== undefined && e.nullIcc2 !== undefined;
  const kopf = zwei ? (e.gekreuzt === false ? T('Mehrebenenmodell mit geschachtelten Zufallseffekten', 'Multilevel model with nested random effects') : T('Mehrebenenmodell mit gekreuzten Zufallseffekten', 'Multilevel model with crossed random effects')) : T('Mehrebenenmodell', 'Multilevel model');
  const stich = zwei ? T(`N = ${e.n} in ${e.ng} Gruppen (${name(e.gruppe)}) und ${e.ng2} Gruppen (${name(e.gruppe2!)})`, `N = ${e.n} in ${e.ng} groups (${name(e.gruppe)}) and ${e.ng2} groups (${name(e.gruppe2!)})`) : T(`N = ${e.n} in ${e.ng} Gruppen`, `N = ${e.n} in ${e.ng} groups`);
  const iccZwei = zwei ? `ICC ${name(e.gruppe)} = ${ohneNull(e.nullIcc)}, ICC ${name(e.gruppe2!)} = ${ohneNull(e.nullIcc2!)}` : '';
  if (e.binaer) {
    const k2 = T('Mehrebenenmodell (Ja/Nein-Ergebnis, Logit)', 'Multilevel model (yes/no outcome, logit)');
    if (!e.mitPraed) return `${k2}: ${T('latenter ICC', 'latent ICC')} = ${ohneNull(e.nullIcc)}, MOR = ${komma(mor(e.nullTau), 2)} (${stich})`;
    return `${k2}: ${T('latenter ICC (Nullmodell)', 'latent ICC (null model)')} = ${ohneNull(e.nullIcc)}; ${effekte(e).map(f => `${festKurz(e, f, name)}: ${orApa(f)}`).join('; ')}; R²m = ${ohneNull(e.r2m)}, R²c = ${ohneNull(e.r2c)} (${stich})`;
  }
  if (!e.mitPraed) return zwei ? `${kopf}: ${iccZwei} (${stich})` : `${kopf}: ICC = ${ohneNull(e.nullIcc)}, ${T('Designeffekt', 'design effect')} = ${komma(e.deff, 1)} (${stich})`;
  const fest = effekte(e).map(f => `${festKurz(e, f, name)}: ${festApa(f)}`).join('; ');
  return `${kopf}: ${zwei ? `${iccZwei} ${T('(Nullmodell)', '(null model)')}` : `ICC ${T('(Nullmodell)', '(null model)')} = ${ohneNull(e.nullIcc)}`}; ${fest}; R²m = ${ohneNull(e.r2m)}, R²c = ${ohneNull(e.r2c)} (${stich})`;
}

/** Sätze zu Gruppenmittel-Zentrierung (Effekt innerhalb gegen zwischen, Kontexteffekt) und zu Wechselwirkungen (Produktgrößen). */
function zentrierSaetze(e: Mehrebenen, name: (n: string) => string): string[] {
  const aus: string[] = [];
  const Y = zitat(name(e.y));
  const effektVon = (idx: number) => e.fest.find(f => f.pIdx === idx);
  if (e.zentrierArt === 'gruppe') {
    const quellen = [...new Set(e.praed.flatMap(p => (p.teile?.length === 1 && p.teile[0]!.rolle ? [p.teile[0]!.quelle] : [])))];
    for (const qn of quellen) {
      const i1 = e.praed.findIndex(p => p.teile?.length === 1 && p.teile[0]!.quelle === qn && p.teile[0]!.rolle === 'innerhalb'), i2 = e.praed.findIndex(p => p.teile?.length === 1 && p.teile[0]!.quelle === qn && p.teile[0]!.rolle === 'zwischen');
      const a = effektVon(i1), b = effektVon(i2);
      if (!a || !b) continue;
      const X = zitat(name(qn)), dir = (v: number) => (v >= 0 ? T('mehr', 'higher') : T('weniger', 'lower'));
      aus.push(T(`Gruppenmittel-Zentrierung bei ${X}: Innerhalb der Gruppen geht eine Einheit mehr als im Gruppenmittel mit ${komma(Math.abs(a.b), kd(a.b))} ${dir(a.b)} bei ${Y} einher (Effekt innerhalb, b = ${komma(a.b, kd(a.b))}, p ${pWert(a.p)}). Zwischen den Gruppen geht ein um eine Einheit höheres Gruppenmittel mit ${komma(Math.abs(b.b), kd(b.b))} ${dir(b.b)} bei ${Y} einher (Effekt zwischen, b = ${komma(b.b, kd(b.b))}, p ${pWert(b.p)}). Die Differenz zwischen − innerhalb (${komma(b.b - a.b, kd(b.b - a.b))}) heißt Kontexteffekt: Ist sie groß, wirkt das Umfeld der Gruppe zusätzlich zur eigenen Position in der Gruppe. Beide Effekte sind Zusammenhänge, keine Ursachen.`,
        `Group mean centring for ${X}: within the groups, one unit more than the group mean goes with ${komma(Math.abs(a.b), kd(a.b))} ${dir(a.b)} for ${Y} (within effect, b = ${komma(a.b, kd(a.b))}, p ${pWert(a.p)}). Between the groups, a group mean higher by one unit goes with ${komma(Math.abs(b.b), kd(b.b))} ${dir(b.b)} for ${Y} (between effect, b = ${komma(b.b, kd(b.b))}, p ${pWert(b.p)}). The difference between − within (${komma(b.b - a.b, kd(b.b - a.b))}) is called the contextual effect: if it is large, the setting of the group matters in addition to one's own position within the group. Both effects are relationships, not causes.`));
    }
  }
  e.praed.forEach((p, i) => {
    if (p.teile?.length !== 2) return;
    const f = effektVon(i);
    if (!f) return;
    const [ta, tb] = p.teile as [MebTeil, MebTeil];
    const nA = praedName({ name: '', art: 'zahl', stufen: [], teile: [ta] }, name, true), nB = praedName({ name: '', art: 'zahl', stufen: [], teile: [tb] }, name, true);
    const info = (t: MebTeil) => e.praed.find(q => (q.teile?.length === 1 && q.teile[0]!.quelle === t.quelle && q.teile[0]!.rolle === t.rolle) || (!q.teile && q.name === t.quelle));
    const gruppenEbene = (t: MebTeil) => t.rolle === 'zwischen' || !!info(t)?.gruppenEbene;
    const ueberEbenen = (ta.rolle === 'innerhalb' && gruppenEbene(tb)) || (tb.rolle === 'innerhalb' && gruppenEbene(ta));
    const sig = f.p < 0.05;
    const wirk = ueberEbenen ? (ta.rolle === 'innerhalb' ? [nA, nB] : [nB, nA]) : [nA, nB];
    const wwName = zitatLang(`${nA} × ${nB}`), bTxt = komma(f.b, kd(f.b)), bAbs = komma(Math.abs(f.b), kd(f.b));
    const kopf = ueberEbenen
      ? T(`Wechselwirkung über die Ebenen ${wwName}: b = ${bTxt}, p ${pWert(f.p)}.`, `Cross-level interaction ${wwName}: b = ${bTxt}, p ${pWert(f.p)}.`)
      : T(`Wechselwirkung ${wwName}: b = ${bTxt}, p ${pWert(f.p)}.`, `Interaction ${wwName}: b = ${bTxt}, p ${pWert(f.p)}.`);
    const deutung = !sig ? T('Es ist nicht nachweisbar, dass der Zusammenhang vom jeweils anderen Wert abhängt.', 'It cannot be shown that the relationship depends on the other value.')
      : f.b >= 0
        ? T(`Der Zusammenhang von ${zitatLang(wirk[0]!)} mit ${Y} hängt von ${zitatLang(wirk[1]!)} ab: Je Einheit mehr bei ${zitatLang(wirk[1]!)} wächst die Steigung von ${zitatLang(wirk[0]!)} um ${bAbs}.`, `The relationship of ${zitatLang(wirk[0]!)} with ${Y} depends on ${zitatLang(wirk[1]!)}: for each unit more in ${zitatLang(wirk[1]!)} the slope of ${zitatLang(wirk[0]!)} increases by ${bAbs}.`)
        : T(`Der Zusammenhang von ${zitatLang(wirk[0]!)} mit ${Y} hängt von ${zitatLang(wirk[1]!)} ab: Je Einheit mehr bei ${zitatLang(wirk[1]!)} sinkt die Steigung von ${zitatLang(wirk[0]!)} um ${bAbs}.`, `The relationship of ${zitatLang(wirk[0]!)} with ${Y} depends on ${zitatLang(wirk[1]!)}: for each unit more in ${zitatLang(wirk[1]!)} the slope of ${zitatLang(wirk[0]!)} decreases by ${bAbs}.`);
    const ebenenHinweis = ueberEbenen ? T('Eine Wechselwirkung über die Ebenen heißt: Ein Merkmal der Gruppe verändert, wie stark ein Merkmal innerhalb der Gruppe wirkt.', 'A cross-level interaction means: a characteristic of the group changes how strongly a characteristic within the group acts.') : '';
    const haupt = T('Der Haupteffekt jeder beteiligten Größe gilt dort, wo die andere 0 ist.', 'The main effect of each variable involved holds where the other is 0.');
    aus.push([kopf, deutung, ebenenHinweis, haupt].filter(Boolean).join(' '));
  });
  return aus;
}

export function saetzeMehrebenen(e: Mehrebenen, name: (n: string) => string = spaltenName): Saetze {
  // Ja/Nein-Ergebnis (S-H): „mit der Chance auf „Ja“ bei „Abitur“ zusammen“ - die Satzteile sind eigene Texte (Falle 12).
  const E = zitat(e.ereignis ?? '');
  const Y = e.binaer ? T(`der Chance auf ${E} bei ${zitat(name(e.y))}`, `the odds of ${E} for ${zitat(name(e.y))}`) : zitat(name(e.y));
  const G = zitat(name(e.gruppe)), icc = e.nullIcc, sig = bedeutsam(e), eff = effekte(e), morW = mor(e.mitPraed ? e.tau : e.nullTau);
  const iccLogit = T(`Im Nullmodell liegen ${prozent(icc)} der Streuung zwischen den Gruppen (${G}, ${e.ng} Gruppen; latenter ICC = ${ohneNull(icc)}, ${iccWort(icc)}). Zwei Personen aus zwei zufällig gewählten Gruppen unterscheiden sich in der Chance auf ${E} im Median um den Faktor ${komma(mor(e.nullTau), 2)} (Median-Odds-Ratio).`,
    `In the null model, ${prozent(icc)} of the variation lies between the groups (${G}, ${e.ng} groups; latent ICC = ${ohneNull(icc)}, ${iccWort(icc)}). Two people from two randomly chosen groups differ in the odds of ${E} by a median factor of ${komma(mor(e.nullTau), 2)} (median odds ratio).`);
  const iccSatz = e.binaer ? iccLogit : T(`Im Nullmodell liegen ${prozent(icc)} der Streuung von ${Y} zwischen den Gruppen (${G}, ${e.ng} Gruppen) und ${prozent(1 - icc)} innerhalb der Gruppen (ICC = ${ohneNull(icc)}, ${iccWort(icc)}).`,
    `In the null model, ${prozent(icc)} of the variation in ${Y} lies between the groups (${G}, ${e.ng} groups) and ${prozent(1 - icc)} within the groups (ICC = ${ohneNull(icc)}, ${iccWort(icc)}).`);
  // Zweite Gruppierung (gekreuzte Zufallseffekte): Der Anteil der Streuung teilt sich auf beide Gruppierungen und den Rest innerhalb.
  const zweiG = e.gruppe2 !== undefined && e.nullIcc2 !== undefined && !e.binaer;
  const G2 = zweiG ? zitat(name(e.gruppe2!)) : '';
  const icc2 = e.nullIcc2 ?? 0;
  const iccZweiSatz = zweiG ? T(`Im Nullmodell gehen ${prozent(icc)} der Streuung von ${Y} auf Unterschiede zwischen den Stufen von ${G} zurück (${e.ng} Gruppen), ${prozent(icc2)} auf Unterschiede zwischen den Stufen von ${G2} (${e.ng2} Gruppen) und ${prozent(1 - icc - icc2)} bleiben innerhalb (ICC ${G} = ${ohneNull(icc)}, ICC ${G2} = ${ohneNull(icc2)}, zusammen ${ohneNull(icc + icc2)}).`,
    `In the null model, ${prozent(icc)} of the variation in ${Y} stems from differences between the levels of ${G} (${e.ng} groups), ${prozent(icc2)} from differences between the levels of ${G2} (${e.ng2} groups) and ${prozent(1 - icc - icc2)} remain within (ICC ${G} = ${ohneNull(icc)}, ICC ${G2} = ${ohneNull(icc2)}, together ${ohneNull(icc + icc2)}).`) : '';
  const kreuzSatz = zweiG ? (e.gekreuzt === false
    ? T(`Geschachtelte Zufallseffekte: Eine der beiden Gruppierungen (${G} und ${G2}) liegt innerhalb der anderen, nicht gekreuzt. Statable rechnet es trotzdem richtig, weil die Kennungen eindeutig sind.`,
      `Nested random effects: one of the two groupings (${G} and ${G2}) lies within the other, not crossed. Statable calculates it correctly anyway because the identifiers are unique.`)
    : T(`Gekreuzte Zufallseffekte (Kreuzklassifikation): ${G} und ${G2} gehen beide als zufällige Stichprobe ins Modell ein, jede Stufe der einen kommt mit vielen Stufen der anderen vor. So gelten die festen Effekte nicht nur für genau diese ${e.ng2} Stufen von ${G2} und diese ${e.ng} von ${G}, sondern darüber hinaus; wer eine der beiden übergeht, setzt die Standardfehler zu klein an, vor allem für Merkmale, die sich zwischen den Stufen dieser Gruppierung unterscheiden.`,
      `Crossed random effects (cross-classification): ${G} and ${G2} both enter the model as random samples, each level of one occurs with many levels of the other. The fixed effects then hold beyond exactly these ${e.ng2} levels of ${G2} and these ${e.ng} of ${G}; ignoring one of them sets the standard errors too small, above all for characteristics that differ between the levels of that grouping.`)) : '';
  const haupt = !e.mitPraed
    ? (zweiG ? iccZweiSatz : iccSatz)
    : sig.length && zweiG
      ? Lp(sig.length, `Unter Berücksichtigung der Gruppierungen (${G} und ${G2}) hängt ${aufzaehlung(sig.map(f => zitatLang(festKurz(e, f, name))))} mit ${Y} zusammen (p < ,05).`, `Unter Berücksichtigung der Gruppierungen (${G} und ${G2}) hängen ${aufzaehlung(sig.map(f => zitatLang(festKurz(e, f, name))))} mit ${Y} zusammen (p < ,05).`,
        `Taking the groupings (${G} and ${G2}) into account, ${aufzaehlung(sig.map(f => zitatLang(festKurz(e, f, name))))} is related to ${Y} (p < .05).`, `Taking the groupings (${G} and ${G2}) into account, ${aufzaehlung(sig.map(f => zitatLang(festKurz(e, f, name))))} are related to ${Y} (p < .05).`)
    : zweiG && !sig.length
      ? T(`Unter Berücksichtigung der Gruppierungen (${G} und ${G2}) ist kein Zusammenhang der Erklärungsspalten mit ${Y} nachweisbar.`, `Taking the groupings (${G} and ${G2}) into account, no relationship of the explanatory columns with ${Y} can be shown.`)
    : sig.length
      ? Lp(sig.length, `Unter Berücksichtigung der Gruppierung (${G}) hängt ${aufzaehlung(sig.map(f => zitatLang(festKurz(e, f, name))))} mit ${Y} zusammen (p < ,05).`, `Unter Berücksichtigung der Gruppierung (${G}) hängen ${aufzaehlung(sig.map(f => zitatLang(festKurz(e, f, name))))} mit ${Y} zusammen (p < ,05).`,
        `Taking the grouping (${G}) into account, ${aufzaehlung(sig.map(f => zitatLang(festKurz(e, f, name))))} is related to ${Y} (p < .05).`, `Taking the grouping (${G}) into account, ${aufzaehlung(sig.map(f => zitatLang(festKurz(e, f, name))))} are related to ${Y} (p < .05).`)
      : T(`Unter Berücksichtigung der Gruppierung (${G}) ist kein Zusammenhang der Erklärungsspalten mit ${Y} nachweisbar.`, `Taking the grouping (${G}) into account, no relationship of the explanatory columns with ${Y} can be shown.`);

  const teile: string[] = [];
  if (e.mitPraed) teile.push(zweiG ? iccZweiSatz : iccSatz);
  if (kreuzSatz) teile.push(kreuzSatz);
  if (e.mitPraed) {
    if (e.binaer) teile.push(T(`Feste Effekte als Chancenverhältnisse (Odds Ratios): ${eff.map(f => `${zitatLang(festKurz(e, f, name))} ${orApa(f)}`).join('; ')}. Ein Wert über 1 heißt: höhere Chance auf ${E} (bei Zahlen je Einheit mehr, bei Gruppen gegenüber der Vergleichsgruppe).`,
      `Fixed effects as odds ratios: ${eff.map(f => `${zitatLang(festKurz(e, f, name))} ${orApa(f)}`).join('; ')}. A value above 1 means higher odds of ${E} (for numbers per unit more, for groups compared with the reference group).`));
    else teile.push(T(`Feste Effekte: ${eff.map(f => `${zitatLang(festKurz(e, f, name))} b = ${komma(f.b, kd(f.b))}, ${ki(komma(f.lo, kd(f.b)), komma(f.hi, kd(f.b)))}, p ${pWert(f.p)}`).join('; ')}.`,
      `Fixed effects: ${eff.map(f => `${zitatLang(festKurz(e, f, name))} b = ${komma(f.b, kd(f.b))}, ${ki(komma(f.lo, kd(f.b)), komma(f.hi, kd(f.b)))}, p ${pWert(f.p)}`).join('; ')}.`));
    teile.push(T(`Die festen Effekte erklären ${prozent(e.r2m)} der Varianz (R² marginal = ${ohneNull(e.r2m)}), zusammen mit den Gruppen ${prozent(e.r2c)} (R² konditional = ${ohneNull(e.r2c)}).`,
      `The fixed effects explain ${prozent(e.r2m)} of the variance (marginal R² = ${ohneNull(e.r2m)}), together with the groups ${prozent(e.r2c)} (conditional R² = ${ohneNull(e.r2c)}).`));
    // Field-Stufe 2b: Deutung bei Zentrieren am Gruppenmittel (Effekt innerhalb gegen zwischen) und bei Wechselwirkungen (auch über die Ebenen)
    for (const q of zentrierSaetze(e, name)) teile.push(q);
    if (!e.binaer && e.tauSteigung === undefined && e.aufgeklaert1 !== undefined && e.aufgeklaert2 !== undefined && zweiG && e.aufgeklaert3 !== undefined) {
      const a1 = e.aufgeklaert1, a2 = e.aufgeklaert2, a3 = e.aufgeklaert3;
      const bewegt = (a: number) => (a >= 0 ? L(`sinkt um ${prozent(a)}`, `falls by ${prozent(a)}`) : L('steigt', 'rises'));
      if (a1 >= 0 && a2 >= 0 && a3 >= 0) teile.push(T(`Gegenüber dem Nullmodell sinkt die Varianz innerhalb um ${prozent(a1)}, die Varianz zwischen den Stufen von ${G} um ${prozent(a2)} und die zwischen den Stufen von ${G2} um ${prozent(a3)}.`,
        `Compared with the null model, the variance within falls by ${prozent(a1)}, the variance between the levels of ${G} by ${prozent(a2)} and that between the levels of ${G2} by ${prozent(a3)}.`));
      else teile.push(T(`Gegenüber dem Nullmodell ändert sich die Varianz: innerhalb ${bewegt(a1)}, zwischen den Stufen von ${G} ${bewegt(a2)} und zwischen den Stufen von ${G2} ${bewegt(a3)}.`,
        `Compared with the null model the variance changes: within it ${bewegt(a1)}, between the levels of ${G} it ${bewegt(a2)} and between the levels of ${G2} it ${bewegt(a3)}.`));
    } else if (!e.binaer && e.tauSteigung === undefined && e.aufgeklaert1 !== undefined && e.aufgeklaert2 !== undefined) {
      const a1 = e.aufgeklaert1, a2 = e.aufgeklaert2;
      teile.push(T(`Gegenüber dem Nullmodell sinkt die Varianz innerhalb der Gruppen um ${prozent(a1)}; die Varianz zwischen den Gruppen ${a2 >= 0 ? L(`sinkt um ${prozent(a2)}`, `falls by ${prozent(a2)}`) : L('steigt (das kommt vor, wenn die Erklärungsspalten innerhalb der Gruppen mehr streuen als zwischen ihnen)', 'rises (this happens when the explanatory columns vary more within than between groups)')}.`,
        `Compared with the null model, the variance within the groups falls by ${prozent(a1)}; the variance between the groups ${a2 >= 0 ? L(`sinkt um ${prozent(a2)}`, `falls by ${prozent(a2)}`) : L('steigt (das kommt vor, wenn die Erklärungsspalten innerhalb der Gruppen mehr streuen als zwischen ihnen)', 'rises (this happens when the explanatory columns vary more within than between groups)')}.`));
    }
  }
  if (e.tauSteigung !== undefined) {
    const steigungName = steigungAnzeige(e, name);
    // T13: Eine geschätzte Varianz > 0 belegt keine Unterschiede zwischen den Gruppen - das prüft erst ein Modellvergleich (Snijders & Bosker 2012, Kap. 6); bei Grenzlösung nur die Zahlen.
    teile.push(T(`Zufällige Steigung für ${zitatLang(steigungName)}: Varianz ${komma(e.tauSteigung)}, Korrelation mit dem Achsenabschnitt ${ohneNull(e.korAchSteig ?? NaN)}.`,
      `Random slope for ${zitatLang(steigungName)}: variance ${komma(e.tauSteigung)}, correlation with the intercept ${ohneNull(e.korAchSteig ?? NaN)}.`)
      + (e.singular ? '' : T(` Geschätzt streuen die Steigungen zwischen den Gruppen mit einer Standardabweichung von ${komma(Math.sqrt(Math.max(e.tauSteigung, 0)))}; ob sich der Zusammenhang wirklich zwischen den Gruppen unterscheidet, zeigt erst ein Vergleich mit dem Modell ohne zufällige Steigung.`,
        ` The estimated standard deviation of the slopes across groups is ${komma(Math.sqrt(Math.max(e.tauSteigung, 0)))}; whether the relationship really differs between groups only shows in a comparison with the model without a random slope.`)));
  }
  if (e.binaer) {
    if (e.mitPraed) teile.push(T(`Nach den Erklärungsspalten beträgt das Median-Odds-Ratio ${komma(morW, 2)}.`, `After the explanatory columns the median odds ratio is ${komma(morW, 2)}.`));
  } else if (zweiG) {
    // kein Designeffekt bei zwei Gruppierungen (er gilt nur für eine Gruppierung)
  } else if (icc >= MEB_ICC_SCHWELLE || e.deff > MEB_DEFF_SCHWELLE) {
    teile.push(T(`Designeffekt = ${komma(e.deff, 1)}: Eine Rechnung, die die Gruppierung übergeht, würde die Standardfehler um etwa den Faktor ${komma(Math.sqrt(e.deff), 1)} zu klein ansetzen.`,
      `Design effect = ${komma(e.deff, 1)}: an analysis that ignores the grouping would set the standard errors too small by about a factor of ${komma(Math.sqrt(e.deff), 1)}.`));
  } else {
    teile.push(T(`Der ICC ist gering (unter ,05) und der Designeffekt = ${komma(e.deff, 1)}: Die Gruppierung fällt hier kaum ins Gewicht.`, `The ICC is small (below .05) and the design effect = ${komma(e.deff, 1)}: the grouping hardly matters here.`));
  }

  const v: string[] = [];
  if (e.ng < MEB_GRUPPEN_WENIG) v.push(T(`Es sind nur ${e.ng} Gruppen: Die Varianz zwischen den Gruppen und die Tests sind dann sehr unsicher (Faustregel: mindestens ${MEB_GRUPPEN_WENIG}, besser ${MEB_GRUPPEN_GUT}).`, `There are only ${e.ng} groups: the variance between groups and the tests are then very uncertain (rule of thumb: at least ${MEB_GRUPPEN_WENIG}, preferably ${MEB_GRUPPEN_GUT}).`));
  else if (e.ng < MEB_GRUPPEN_GUT) v.push(T(`Mit ${e.ng} Gruppen ist die Gruppen-Ebene nur mit Vorsicht zu lesen (Faustregel: ab etwa ${MEB_GRUPPEN_GUT} Gruppen verlässlich).`, `With ${e.ng} groups the group level should be read with caution (rule of thumb: reliable from about ${MEB_GRUPPEN_GUT} groups).`));
  if (zweiG && e.ng2! < MEB_GRUPPEN_WENIG) v.push(T(`Es sind nur ${e.ng2} Stufen von ${G2}: Ihre Varianz ist dann sehr unsicher (Faustregel: mindestens ${MEB_GRUPPEN_WENIG}, besser ${MEB_GRUPPEN_GUT}).`, `There are only ${e.ng2} levels of ${G2}: their variance is then very uncertain (rule of thumb: at least ${MEB_GRUPPEN_WENIG}, preferably ${MEB_GRUPPEN_GUT}).`));
  if ((e.singular || e.nullSingular) && zweiG) v.push(T('R meldet eine Grenzlösung (singular fit): Die Varianz einer Gruppierung liegt bei 0. Diese Gruppierung trägt dann nichts bei; das Modell mit nur einer Gruppierung gibt praktisch dasselbe.', 'R reports a boundary fit (singular fit): the variance of one grouping is at 0. That grouping then adds nothing; the model with one grouping gives practically the same.'));
  else if (e.singular || e.nullSingular) v.push(T('R meldet eine Grenzlösung (singular fit): Eine Varianz der Gruppen-Ebene liegt bei 0 oder eine Korrelation bei ±1. Das Modell ist dann zu reich für die Daten; ein einfacheres (ohne zufällige Steigung) ist sicherer.', 'R reports a boundary fit (singular fit): a variance at the group level is at 0 or a correlation at ±1. The model is then too rich for the data; a simpler one (without a random slope) is safer.'));
  if (e.konv && zweiG) v.push(T('Die Schätzung ist nicht sicher konvergiert (R-Warnung). Die Zahlen können ungenau sein; hilft meist: Zahlen zentrieren, Erklärungsspalten herausnehmen oder die zweite Gruppierung weglassen.', 'The estimation did not converge reliably (R warning). The numbers may be inexact; it usually helps to center the numbers, leave out explanatory columns or drop the second grouping.'));
  else if (e.konv) v.push(T('Die Schätzung ist nicht sicher konvergiert (R-Warnung). Die Zahlen können ungenau sein; hilft meist: Zahlen zentrieren, Erklärungsspalten herausnehmen, keine zufällige Steigung.', 'The estimation did not converge reliably (R warning). The numbers may be inexact; it usually helps to center the numbers, leave out explanatory columns, or drop the random slope.'));
  if (e.nAlle > e.n) v.push(T(`Es gehen ${e.n} von ${e.nAlle} Fällen ein (nur mit allen Angaben).`, `${e.n} of ${e.nAlle} cases are included (only those with all answers).`));
  if (e.binaer) v.push(T(`Das Ergebnis hat zwei Werte; Ereignis ist ${E} (der größere Wert). Gerechnet wird ein verallgemeinertes gemischtes Modell (Logit, Laplace-Näherung). Chancenverhältnisse sind keine Risikoverhältnisse: Bei häufigen Ereignissen überzeichnen sie den Unterschied.`, `The outcome has two values; the event is ${E} (the larger value). A generalized mixed model (logit, Laplace approximation) is calculated. Odds ratios are not risk ratios: for common events they exaggerate the difference.`));
  v.push(T('Ein Mehrebenenmodell beschreibt Zusammenhänge unter Berücksichtigung der Gruppierung; Ursachen belegt es nicht.', 'A multilevel model describes relationships taking the grouping into account; it does not establish causes.'));

  const marken: Saetze['marken'] = [
    { text: `${e.binaer ? T('latenter ICC', 'latent ICC') : 'ICC'} = ${ohneNull(icc)}`, erklaer: 'icc-mehrebenen' },
    ...(zweiG ? [{ text: `ICC ${name(e.gruppe2!)} = ${ohneNull(icc2)}`, erklaer: 'icc-mehrebenen' }] : e.binaer ? [{ text: `MOR = ${komma(mor(e.nullTau), 2)}`, erklaer: 'icc-mehrebenen' }] : [{ text: `${T('Designeffekt', 'Design effect')} = ${komma(e.deff, 1)}`, erklaer: 'icc-mehrebenen', hinweis: e.deff > MEB_DEFF_SCHWELLE }]),
    { text: T(`${e.ng} Gruppen`, `${e.ng} groups`), erklaer: 'mehrebenen', hinweis: e.ng < MEB_GRUPPEN_WENIG },
    ...(zweiG ? [{ text: T('gekreuzte Zufallseffekte', 'crossed random effects'), erklaer: 'mehrebenen' }] : [])
  ];
  if (e.mitPraed) {
    marken.push({ text: `R² ${T('marginal', 'marginal')} = ${ohneNull(e.r2m)}`, erklaer: 'r-quadrat' }, { text: `R² ${T('konditional', 'conditional')} = ${ohneNull(e.r2c)}`, erklaer: 'r-quadrat' });
    for (const f of eff.slice(0, 3)) marken.push({ text: `${festKurz(e, f, name)}: p ${pWert(f.p)}`, erklaer: 'p-wert' });
  }
  if (e.singular || e.nullSingular || e.konv) marken.push({ text: e.konv ? T('Konvergenz unsicher', 'convergence uncertain') : T('Grenzlösung (singular)', 'boundary fit (singular)'), erklaer: 'mehrebenen', hinweis: true });
  if (e.nAlle > e.n) marken.push({ text: T(`${e.n} von ${e.nAlle} Fällen`, `${e.n} of ${e.nAlle} cases`), erklaer: 'stichprobe', hinweis: true });
  return { haupt, zusatz: teile.join(' '), vorsicht: v.join(' '), apa: mebApa(e, name), marken };
}

/* ------------------------------------------------------------ Tabellen */

/** Tabellen zum Ja/Nein-Ergebnis (S-H): feste Effekte als Log-Odds und Odds Ratio, Zufallseffekt, Modellgüte. */
function tabellenLogit(e: Mehrebenen, name: (n: string) => string): TableItem[] {
  const t: TableItem[] = [], E = e.ereignis ?? '';
  const fuss = T(`R (lme4), verallgemeinertes gemischtes Modell (Logit, Laplace-Näherung). Ereignis: ${E} (der größere Wert). ${e.n} Fälle${e.nAlle > e.n ? L(` von ${e.nAlle}`, ` of ${e.nAlle}`) : ''} in ${e.ng} Gruppen (${name(e.gruppe)}).`, `R (lme4), generalized mixed model (logit, Laplace approximation). Event: ${E} (the larger value). ${e.n} cases${e.nAlle > e.n ? L(` von ${e.nAlle}`, ` of ${e.nAlle}`) : ''} in ${e.ng} groups (${name(e.gruppe)}).`);
  if (e.mitPraed) {
    t.push(tabelle('Fixed Effects', T('Feste Effekte (Log-Odds und Odds Ratio)', 'Fixed effects (log-odds and odds ratio)'),
      [T('Effekt', 'Effect'), 'b', 'SE', 'z', 'p', 'OR', T('OR 95 %-KI untere Grenze', 'OR 95% CI lower'), T('OR 95 %-KI obere Grenze', 'OR 95% CI upper')],
      e.fest.map(f => [festName(e, f, name), fx(f.b, kd(f.b)), fx(f.se, 3), fx(f.t), fp(f.p), fx(Math.exp(f.b), 2), fx(Math.exp(f.lo), 2), fx(Math.exp(f.hi), 2)]),
      [fuss, T(`Wald-z-Test; Intervall: exp(b ± 1,96 · SE). Zahlen ${e.zentriert ? L('am Gesamtmittel zentriert', 'centered at the grand mean') : L('nicht zentriert', 'not centered')}.`, `Wald z test; interval: exp(b ± 1.96 · SE). Numbers ${e.zentriert ? L('am Gesamtmittel zentriert', 'centered at the grand mean') : L('nicht zentriert', 'not centered')}.`)]));
  } else {
    t.push(tabelle('Fixed Effects', T('Gesamt-Chance (Nullmodell)', 'Overall odds (null model)'), [T('Effekt', 'Effect'), 'b', 'SE', T('Chance', 'Odds')],
      [[T('Konstante (Log-Odds im Mittel der Gruppen)', 'Intercept (log-odds at the average group)'), fx(e.nullKonst), fx(e.nullKonstSe, 3), fx(Math.exp(e.nullKonst), 2)]], [fuss]));
  }
  const tau = e.mitPraed ? e.tau : e.nullTau;
  t.push(tabelle('Random Effects', T('Zufallseffekt (Logit-Skala)', 'Random effect (logit scale)'), [T('Komponente', 'Component'), T('Varianz', 'Variance'), 'SD'],
    [[T('Achsenabschnitt (zwischen den Gruppen)', 'Intercept (between groups)'), fx(tau), fx(Math.sqrt(Math.max(tau, 0)))], [T('Innerhalb der Gruppen (fest: π²/3)', 'Within groups (fixed: π²/3)'), fx(Math.PI ** 2 / 3), fx(Math.PI / Math.sqrt(3))]],
    [T('Auf der Logit-Skala ist die Streuung innerhalb der Gruppen fest π²/3 ≈ 3,29 (latente Variable).', 'On the logit scale the variation within groups is fixed at π²/3 ≈ 3.29 (latent variable).')]));
  const g: Z[][] = [[T('Fälle', 'Cases'), fd(e.n)], [T('Gruppen', 'Groups'), fd(e.ng)], [T('Anteil Ereignis', 'Share with the event'), fo(e.yMittel, 3)],
    [T('Latenter ICC im Nullmodell', 'Latent ICC in the null model'), fo(e.nullIcc, 3)], [T('Median-Odds-Ratio (Nullmodell)', 'Median odds ratio (null model)'), fx(mor(e.nullTau), 2)]];
  if (e.mitPraed) g.push([T('Median-Odds-Ratio nach den Erklärungsspalten', 'Median odds ratio after the explanatory columns'), fx(mor(e.tau), 2)], ['R² marginal', fo(e.r2m, 3)], ['R² ' + T('konditional', 'conditional'), fo(e.r2c, 3)]);
  t.push(tabelle('Model Fit', T('Modellgüte', 'Model summary'), [T('Kennwert', 'Statistic'), T('Wert', 'Value')], g,
    [T('R² nach Nakagawa et al. (2017) mit der Verteilungsvarianz π²/3 der Logit-Verknüpfung. Median-Odds-Ratio nach Larsen und Merlo (2005).', 'R² after Nakagawa et al. (2017) with the distribution variance π²/3 of the logit link. Median odds ratio after Larsen and Merlo (2005).')]));
  return t;
}

export function tabellenMehrebenen(e: Mehrebenen, name: (n: string) => string = spaltenName): TableItem[] {
  if (e.binaer) return tabellenLogit(e, name);
  const t: TableItem[] = [];
  const zwei = e.gruppe2 !== undefined && e.nullTau2 !== undefined && e.tau2 !== undefined;
  const g2 = !zwei ? '' : ' ' + (e.gekreuzt === false
    ? T(`Zweite Gruppierung: ${e.ng2} Gruppen (${name(e.gruppe2!)}), geschachtelte Zufallseffekte.`, `Second grouping: ${e.ng2} groups (${name(e.gruppe2!)}), nested random effects.`)
    : T(`Zweite Gruppierung: ${e.ng2} Gruppen (${name(e.gruppe2!)}), gekreuzte Zufallseffekte.`, `Second grouping: ${e.ng2} groups (${name(e.gruppe2!)}), crossed random effects.`));
  const fuss = T(`R (lme4, lmerTest), lineares gemischtes Modell, REML. ${e.n} Fälle${e.nAlle > e.n ? L(` von ${e.nAlle}`, ` of ${e.nAlle}`) : ''} in ${e.ng} Gruppen (${name(e.gruppe)}).`,`R (lme4, lmerTest), linear mixed model, REML. ${e.n} cases${e.nAlle > e.n ? L(` von ${e.nAlle}`, ` of ${e.nAlle}`) : ''} in ${e.ng} groups (${name(e.gruppe)}).`) + g2;
  // Feste Effekte
  if (e.mitPraed) {
    t.push(tabelle('Fixed Effects', T('Feste Effekte', 'Fixed effects'),
      [T('Effekt', 'Effect'), 'b', 'SE', 'df', 't', 'p', T('95 %-KI untere Grenze', '95% CI lower'), T('95 %-KI obere Grenze', '95% CI upper')],
      e.fest.map(f => [festName(e, f, name), fx(f.b, kd(f.b)), fx(f.se, 3), fd(f.df), fx(f.t), fp(f.p), fx(f.lo, kd(f.b)), fx(f.hi, kd(f.b))]),
      [fuss, T(`Freiheitsgrade nach Satterthwaite (lmerTest); Intervall: b ± t(df) · SE. Zahlen ${e.zentriert ? L('am Gesamtmittel zentriert', 'centered at the grand mean') : L('nicht zentriert', 'not centered')}.`, `Degrees of freedom by Satterthwaite (lmerTest); interval: b ± t(df) · SE. Numbers ${e.zentriert ? L('am Gesamtmittel zentriert', 'centered at the grand mean') : L('nicht zentriert', 'not centered')}.`)]));
    const mehr = e.tests.filter(x => x.df1 > 1);
    if (mehr.length) t.push(tabelle('Fixed Effect Tests', T('Tests der Faktoren mit mehr als zwei Stufen', 'Tests of factors with more than two levels'), [T('Effekt', 'Effect'), 'F', 'df1', 'df2', 'p'],
      mehr.map(x => [praedName(e.praed[x.pIdx]!, name), fx(x.f), fd(x.df1), fd(x.df2), fp(x.p)]), [T('Typ-III-F-Test mit Satterthwaite-Freiheitsgraden (lmerTest).', 'Type III F test with Satterthwaite degrees of freedom (lmerTest).')]));
  } else {
    t.push(tabelle('Fixed Effects', T('Gesamtmittelwert (Nullmodell)', 'Grand mean (null model)'), [T('Effekt', 'Effect'), 'b', 'SE', 'df'],
      [[T('Konstante (Gesamtmittel der Gruppenmittel)', 'Intercept (grand mean of the group means)'), fx(e.nullKonst), fx(e.nullKonstSe, 3), fd(e.nullKonstDf)]], [fuss]));
  }
  // Zufallseffekte
  const zeilen: Z[][] = [];
  const sd = (v: number) => fx(Math.sqrt(Math.max(v, 0)));
  if (zwei) {
    const [a1, a2] = e.mitPraed ? [e.iccVoll, e.iccVoll2!] : [e.nullIcc, e.nullIcc2!];
    const tau2 = e.mitPraed ? e.tau2! : e.nullTau2!;
    zeilen.push([T(`Achsenabschnitt ${name(e.gruppe)} (zwischen den Stufen)`, `Intercept ${name(e.gruppe)} (between levels)`), e.mitPraed ? fx(e.tau) : fx(e.nullTau), e.mitPraed ? sd(e.tau) : sd(e.nullTau), fo(a1, 3), e.mitPraed ? fx(e.nullTau) : '-']);
    zeilen.push([T(`Achsenabschnitt ${name(e.gruppe2!)} (zwischen den Stufen)`, `Intercept ${name(e.gruppe2!)} (between levels)`), fx(tau2), sd(tau2), fo(a2, 3), e.mitPraed ? fx(e.nullTau2!) : '-']);
    zeilen.push([T('Residuum (innerhalb)', 'Residual (within)'), e.mitPraed ? fx(e.sigma) : fx(e.nullSigma), e.mitPraed ? sd(e.sigma) : sd(e.nullSigma), fo(1 - a1 - a2, 3), e.mitPraed ? fx(e.nullSigma) : '-']);
  } else {
  zeilen.push([T('Achsenabschnitt (zwischen den Gruppen)', 'Intercept (between groups)'), e.mitPraed ? fx(e.tau) : fx(e.nullTau), e.mitPraed ? sd(e.tau) : sd(e.nullTau), e.mitPraed ? fx(e.nullTau) : '-']);
  if (e.tauSteigung !== undefined) {
    zeilen.push([T(`Steigung ${steigungAnzeige(e, name)} (zwischen den Gruppen)`, `Slope ${steigungAnzeige(e, name)} (between groups)`), fx(e.tauSteigung), sd(e.tauSteigung), '-']);
    zeilen.push([T('Korrelation Achsenabschnitt / Steigung', 'Correlation intercept / slope'), fo(e.korAchSteig ?? NaN), '-', '-']);
  }
  zeilen.push([T('Residuum (innerhalb der Gruppen)', 'Residual (within groups)'), e.mitPraed ? fx(e.sigma) : fx(e.nullSigma), e.mitPraed ? sd(e.sigma) : sd(e.nullSigma), e.mitPraed ? fx(e.nullSigma) : '-']);
  }
  t.push(tabelle('Random Effects', zwei ? T('Zufallseffekte (Varianzen, gekreuzt)', 'Random effects (variances, crossed)') : T('Zufallseffekte (Varianzen)', 'Random effects (variances)'),
    zwei ? [T('Komponente', 'Component'), T('Varianz', 'Variance'), 'SD', e.mitPraed ? T('Anteil an der verbleibenden Varianz', 'Share of the remaining variance') : T('Anteil an der Gesamtvarianz', 'Share of the total variance'), T('Varianz im Nullmodell', 'Variance in the null model')] : [T('Komponente', 'Component'), T('Varianz', 'Variance'), 'SD', T('Varianz im Nullmodell', 'Variance in the null model')], zeilen,
    [zwei ? T('Der Anteil einer Gruppierung ist ihre Varianz geteilt durch die Summe aller Varianzen (τ² beider Gruppierungen und σ²).', 'The share of a grouping is its variance divided by the sum of all variances (τ² of both groupings and σ²).') : T('Die Varianz zwischen den Gruppen heißt τ₀₀, die innerhalb σ².', 'The variance between groups is called τ₀₀, the variance within groups σ².')]));
  // Modellgüte
  const g: Z[][] = [
    [T('Fälle', 'Cases'), fd(e.n)], [T('Gruppen', 'Groups'), fd(e.ng)],
    [T('Fälle je Gruppe (kleinste / mittlere / größte)', 'Cases per group (smallest / median / largest)'), `${komma(e.gnMin, 0)} / ${komma(e.gnMed, e.gnMed % 1 ? 1 : 0)} / ${komma(e.gnMax, 0)}`],
    [T('ICC im Nullmodell', 'ICC in the null model'), fo(e.nullIcc, 3)], [T('Designeffekt', 'Design effect'), fx(e.deff, 2)]
  ];
  if (zwei) {
    const n1 = name(e.gruppe), n2 = name(e.gruppe2!);
    g.length = 0;
    g.push([T('Fälle', 'Cases'), fd(e.n)], [T(`Gruppen (${n1})`, `Groups (${n1})`), fd(e.ng)], [T(`Gruppen (${n2})`, `Groups (${n2})`), fd(e.ng2!)],
      [T(`Fälle je Gruppe (${n1}; kleinste / mittlere / größte)`, `Cases per group (${n1}; smallest / median / largest)`), `${komma(e.gnMin, 0)} / ${komma(e.gnMed, e.gnMed % 1 ? 1 : 0)} / ${komma(e.gnMax, 0)}`]);
    if (e.gn2Min !== undefined && e.gn2Max !== undefined) g.push([T(`Fälle je Gruppe (${n2}; kleinste / größte)`, `Cases per group (${n2}; smallest / largest)`), `${komma(e.gn2Min, 0)} / ${komma(e.gn2Max, 0)}`]);
    g.push([T(`ICC ${n1} im Nullmodell`, `ICC ${n1} in the null model`), fo(e.nullIcc, 3)], [T(`ICC ${n2} im Nullmodell`, `ICC ${n2} in the null model`), fo(e.nullIcc2!, 3)]);
  }
  if (e.mitPraed) {
    if (zwei) g.push([T(`ICC ${name(e.gruppe)} nach den Erklärungsspalten`, `ICC ${name(e.gruppe)} after the explanatory columns`), fo(e.iccVoll, 3)], [T(`ICC ${name(e.gruppe2!)} nach den Erklärungsspalten`, `ICC ${name(e.gruppe2!)} after the explanatory columns`), fo(e.iccVoll2 ?? NaN, 3)]);
    else g.push([T('ICC nach den Erklärungsspalten', 'ICC after the explanatory columns'), fo(e.iccVoll, 3)]);
    g.push( ['R² marginal', fo(e.r2m, 3)], ['R² ' + T('konditional', 'conditional'), fo(e.r2c, 3)]);
    if (zwei && e.aufgeklaert1 !== undefined && e.aufgeklaert3 !== undefined) g.push([T('Erklärte Varianz innerhalb (gegenüber Nullmodell)', 'Explained variance within (vs. null model)'), fo(e.aufgeklaert1, 3)], [T(`Erklärte Varianz zwischen den Stufen von ${name(e.gruppe)} (gegenüber Nullmodell)`, `Explained variance between the levels of ${name(e.gruppe)} (vs. null model)`), fo(e.aufgeklaert2 ?? NaN, 3)], [T(`Erklärte Varianz zwischen den Stufen von ${name(e.gruppe2!)} (gegenüber Nullmodell)`, `Explained variance between the levels of ${name(e.gruppe2!)} (vs. null model)`), fo(e.aufgeklaert3, 3)]);
    else if (e.aufgeklaert1 !== undefined && e.tauSteigung === undefined) g.push([T('Erklärte Varianz innerhalb der Gruppen (gegenüber Nullmodell)', 'Explained variance within groups (vs. null model)'), fo(e.aufgeklaert1, 3)], [T('Erklärte Varianz zwischen den Gruppen (gegenüber Nullmodell)', 'Explained variance between groups (vs. null model)'), fo(e.aufgeklaert2 ?? NaN, 3)]);
  }
  t.push(tabelle('Model Fit', T('Modellgüte', 'Model summary'), [T('Kennwert', 'Statistic'), T('Wert', 'Value')], g,
    [T('R² nach Nakagawa und Schielzeth (2013) und Johnson (2014): marginal = feste Effekte, konditional = feste und zufällige Effekte.', 'R² after Nakagawa and Schielzeth (2013) and Johnson (2014): marginal = fixed effects, conditional = fixed and random effects.')]));
  return t;
}

/* ------------------------------------------------------------ Hinweis „Die Daten sind in Gruppen eingeteilt“ */
/** Der ruhige Hinweis in „Unterscheiden sich Gruppen?“ und „Lässt sich etwas vorhersagen?“ (Prüfliste und Ergebnis). `kurz`: eine Zeile, `klein`: die Erklärung. */
export function ebenenHinweisText(v: GruppenVorschlag, name: (n: string) => string = spaltenName): { kurz: string; klein: string; knopf: string } {
  const n = name(v.spalte), m = komma(v.mittel, v.mittel < 10 ? 1 : 0);
  return {
    kurz: T(`Die Daten sind nach „${n}“ gruppiert (${v.gruppen} Gruppen, im Schnitt ${m} Fälle je Gruppe) - ein Mehrebenenmodell berücksichtigt das.`,
      `The data are grouped by "${n}" (${v.gruppen} groups, on average ${m} cases per group) - a multilevel model takes this into account.`),
    klein: T('Fälle derselben Gruppe ähneln einander oft mehr als Fälle verschiedener Gruppen. Dann sind die Werte nicht unabhängig, und die Tests dieser Frage fallen zu optimistisch aus.',
      'Cases in the same group often resemble each other more than cases in different groups. The values are then not independent, and the tests of this question come out too optimistic.'),
    knopf: T('Mit Mehrebenenmodell rechnen', 'Calculate with a multilevel model')
  };
}
