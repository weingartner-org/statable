/**
 * Sätze zur Messwiederholung mit zwei Faktoren (auch gemischt), zu den Kontrasten mit eigenem Fehlerterm, den einfachen Haupteffekten und zur dreifaktoriellen
 * Varianzanalyse (Field-Stufe 3). Zahlen: messwiederholung2.ts, messwiederholung.ts, anova3.ts. Alles neutral formuliert (keine Anrede).
 */
import { L } from './sitzung.svelte';
import { dfKlammer, ki } from '../i18n/profil';
import { komma, ohneNull, pWert, eta2Wort } from './ergebnis';
import { effektName, korrigiert2, type Mw2, type Mw2Effekt, type Mw2Einfach } from './messwiederholung2';
import { korrekturName, type MwKorrektur, type MwKontrast } from './messwiederholung';
import type { Anova3, Effekt3, Quelle3 } from './anova3';

const dfText = (d: number) => (Math.abs(d - Math.round(d)) < 1e-9 ? komma(d, 0) : komma(d, d < 100 ? 2 : 1));
const aufzaehlen = (l: string[]) => (l.length < 2 ? l.join('') : `${l.slice(0, -1).join(', ')} ${L('und', 'and')} ${l.at(-1)}`);

/** Art des Effekts: Haupteffekt (ein Faktor), Wechselwirkung (zwei) oder Dreifach-Wechselwirkung (drei). */
const stufe = (q: string) => q.length;

/** Statistik-Zeile eines Effekts in APA-Form. */
export function mw2Zeile(e: Mw2, ef: Mw2Effekt, kor: MwKorrektur): string {
  const k = korrigiert2(e, ef, kor);
  return `F${dfKlammer(dfText(k.df1), dfText(k.df2))} = ${komma(ef.f)}, p ${pWert(k.p)}, ηp² = ${ohneNull(ef.etaP)}, ${ki(ohneNull(ef.etaPLo), ohneNull(ef.etaPHi))}, ηG² = ${ohneNull(ef.etaG)}`;
}

/** Ein Satz je Effekt; bei bedeutsamer Wechselwirkung der Hinweis auf die einfachen Haupteffekte. */
export function mw2Satz(e: Mw2, ef: Mw2Effekt, kor: MwKorrektur): string {
  const k = korrigiert2(e, ef, kor), sig = k.p < 0.05, n = effektName(e, ef.quelle), s = stufe(ef.quelle);
  const korr = ef.quelle !== 'g' && kor !== 'keine' && ef.epsGG < 1 - 1e-9 ? L(` (mit ${korrekturName(kor)}-Korrektur)`, ` (with ${korrekturName(kor)} correction)`) : '';
  const zeile = `${mw2Zeile(e, ef, kor)}${korr}`;
  if (s === 1) return sig
    ? L(`Haupteffekt ${n}: statistisch bedeutsam, ${zeile}; Effektstärke ${eta2Wort(ef.etaG)} (nach ηG²).`, `Main effect ${n}: statistically significant, ${zeile}; effect size ${eta2Wort(ef.etaG)} (by ηG²).`)
    : L(`Haupteffekt ${n}: nicht bedeutsam, ${zeile}.`, `Main effect ${n}: not significant, ${zeile}.`);
  return sig
    ? L(`Wechselwirkung ${n}: statistisch bedeutsam, ${zeile}. Der Effekt eines Faktors hängt von der Stufe des anderen ab; die Haupteffekte sind dann nur mit Vorsicht zu lesen, die einfachen Haupteffekte zeigen die Einzelheiten.`,
        `Interaction ${n}: statistically significant, ${zeile}. The effect of one factor depends on the level of the other; the main effects are then to be read with care, the simple main effects show the details.`)
    : L(`Wechselwirkung ${n}: nicht bedeutsam, ${zeile}.`, `Interaction ${n}: not significant, ${zeile}.`);
}

/** Satz zu den einfachen Haupteffekten einer Familie (z. B. A je Stufe von B). */
export function einfachSatz(wer: string, jeWas: string, z: Mw2Einfach[]): string {
  if (!z.length) return '';
  const sig = z.filter(x => x.pHolm < 0.05).map(x => x.stufe);
  return sig.length === z.length
    ? L(`${wer} je Stufe von ${jeWas}: Nach der Holm-Anpassung ist der Effekt bei allen Stufen bedeutsam.`, `${wer} at each level of ${jeWas}: after the Holm adjustment the effect is significant at all levels.`)
    : sig.length
    ? L(`${wer} je Stufe von ${jeWas}: Nach der Holm-Anpassung ist der Effekt bedeutsam bei ${aufzaehlen(sig)}; bei den übrigen Stufen nicht.`, `${wer} at each level of ${jeWas}: after the Holm adjustment the effect is significant at ${aufzaehlen(sig)}; not at the other levels.`)
    : L(`${wer} je Stufe von ${jeWas}: Nach der Holm-Anpassung ist bei keiner Stufe ein Effekt bedeutsam.`, `${wer} at each level of ${jeWas}: after the Holm adjustment no level shows a significant effect.`);
}

/** Satz zu einem Kontrast mit eigenem Fehlerterm. */
export function kontrastSatz(k: MwKontrast, nr: number, stufen: string[]): string {
  const sig = k.p < 0.05, w = k.gewichte.map((g, j) => `${komma(g, 2).replace(/[.,]?0+$/, '')} ${stufen[j]}`).filter((_, j) => k.gewichte[j] !== 0).join(', ');
  const z = `t(${dfText(k.df)}) = ${komma(k.t)}, p ${pWert(k.p)}`;
  return sig
    ? L(`Kontrast ${nr} (${w}): Schätzung ${komma(k.schaetzung, 3)}, ${z}: statistisch bedeutsam.`, `Contrast ${nr} (${w}): estimate ${komma(k.schaetzung, 3)}, ${z}: statistically significant.`)
    : L(`Kontrast ${nr} (${w}): Schätzung ${komma(k.schaetzung, 3)}, ${z}: nicht bedeutsam.`, `Contrast ${nr} (${w}): estimate ${komma(k.schaetzung, 3)}, ${z}: not significant.`);
}

/* ------------------------------------------------------------ dreifaktoriell */
export const effektName3 = (q: Quelle3, a: string, b: string, c: string) => q.split('').map(x => (x === 'a' ? a : x === 'b' ? b : c)).join(' × ');

export function satz3(e: Effekt3, namen: [string, string, string]): string {
  const sig = e.p < 0.05, n = effektName3(e.quelle, ...namen), s = stufe(e.quelle);
  const stat = `F = ${komma(e.f)}, p ${pWert(e.p)}, ηp² = ${ohneNull(e.etaP)}, ${ki(ohneNull(e.etaPLo), ohneNull(e.etaPHi))}`;
  const art = s === 1 ? L('Haupteffekt', 'Main effect') : s === 2 ? L('Wechselwirkung', 'Interaction') : L('Dreifach-Wechselwirkung', 'Three-way interaction');
  return sig ? L(`${art} ${n}: statistisch bedeutsam, ${stat}.`, `${art} ${n}: statistically significant, ${stat}.`) : L(`${art} ${n}: nicht bedeutsam, ${stat}.`, `${art} ${n}: not significant, ${stat}.`);
}

export function dreifachHinweis(e: Anova3, namen: [string, string, string]): string {
  const [a, b, c] = namen, abc = e.effekte[6]!;
  return abc.p < 0.05
    ? L(`Die Dreifach-Wechselwirkung ${a} × ${b} × ${c} ist bedeutsam (p ${pWert(abc.p)}): Die Wechselwirkung von ${a} und ${b} sieht je nach Stufe von ${c} verschieden aus. Deshalb sind die Zweifach-Effekte je Stufe von ${c} zu lesen (im Diagramm: ein Feld je Stufe von ${c}); die Zweifach-Wechselwirkungen und Haupteffekte allein führen in die Irre.`,
        `The three-way interaction ${a} × ${b} × ${c} is significant (p ${pWert(abc.p)}): the interaction of ${a} and ${b} looks different at each level of ${c}. The two-way effects are therefore to be read at each level of ${c} (in the chart: one panel per level of ${c}); the two-way interactions and main effects alone are misleading.`)
    : L(`Die Dreifach-Wechselwirkung ist nicht bedeutsam (p ${pWert(abc.p)}): Die Zweifach-Wechselwirkungen und Haupteffekte lassen sich ohne Rücksicht auf die Stufen des dritten Faktors lesen.`,
        `The three-way interaction is not significant (p ${pWert(abc.p)}): the two-way interactions and main effects can be read without regard to the levels of the third factor.`);
}
