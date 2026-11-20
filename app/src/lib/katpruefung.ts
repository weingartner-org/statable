/**
 * Prüfliste der ordinalen, multinomialen und Zähldaten-Regression (Welle 3) und die Vorschläge für die lineare Regression.
 * Reine Funktionen aus Spalten und Zeilen (ohne Sitzung): Blatt.svelte reiht die Punkte in seine Prüfliste ein. Die Sperren und Hinweise selbst stehen in kategreg.ts.
 *
 * Vorschläge sind nie still (Muster rangtests.ts `rangVorschlag`): Sie stehen als Hinweis mit Knopf in der Prüfliste; gerechnet wird erst nach dem Klick.
 */
import type { Spalte } from './verzeichnis';
import type { Wert } from './eingabe';
import { L, Lp, d } from './sitzung.svelte';
import { zitat, aufzaehlung } from '../i18n/profil';
import { katDaten, zaehlZielPruefung, zeitPruefung, zielStufenPruefung, zaehlVorschlag, ordinalVorschlag, type KatArt, type ZielStufe } from './kategreg';
import { referenzGilt, zielArt, type ModellWahl } from './kategwahl';

/** Ein Punkt der Prüfliste (wie `Punkt` in Blatt.svelte); `modell` + `knopf`: Knopf, der dieses Modell wählt. */
export interface KatPunkt { art: 'ok' | 'hinweis' | 'info' | 'sperre'; text: string; klein?: string; modell?: 'ordinal' | 'zaehl'; knopf?: string }

/** Wie viele Zeilen sind vollständig, und die Zielstufen (ordinal, multinomial) in der Ordnung von Statable mit ihren Fällen (Stufen ohne Fälle: 0). */
export function katFaelle(art: KatArt, ziel: string, praed: string[], zeilen: Wert[][], spalten: Spalte[], zeit?: string): { n: number; ausgelassen: number; stufen: ZielStufe[]; yWerte: (string | number)[]; zeitWerte: number[] | null } {
  const zeitDa = !!zeit && spalten.some(x => x.name === zeit);   // eine gewählte Spalte, die es nicht mehr gibt, meldet zeitPruefung
  const dt = katDaten(art, ziel, praed, zeilen, spalten, { zeit: zeitDa ? zeit : undefined });
  const sp = dt.spalten, alle = zeilen.length;
  const ok: number[] = [];
  for (let r = 0; r < alle; r++) if (sp.every(s => s.werte[r] !== null && s.werte[r] !== undefined)) ok.push(r);
  const y = sp[0]!.werte, yWerte = ok.map(r => y[r]!);
  const zaehl = new Map<string, number>(); for (const w of yWerte) zaehl.set(String(w), (zaehl.get(String(w)) ?? 0) + 1);
  const zeitSp = sp.find(s => s.name === 'zeit');
  return { n: ok.length, ausgelassen: alle - ok.length, stufen: dt.stufen.map(text => ({ text, anzahl: zaehl.get(text) ?? 0 })), yWerte,
    zeitWerte: !zeit ? [] : zeitSp ? ok.map(r => zeitSp.werte[r] as number) : null };
}
/** Die Stufen des Ziels, die Fälle haben (in der Ordnung von Statable) - daraus wählt die Vergleichskategorie. */
export const stufenMitFaellen = (s: ZielStufe[]) => s.filter(x => x.anzahl > 0).map(x => x.text);

export interface KatPruefEingabe {
  art: KatArt; ziel: string; praed: string[]; zeilen: Wert[][]; spalten: Spalte[]; modell: ModellWahl;
  /** Bezeichnung einer Spalte für die Texte */ name: (n: string) => string;
}

/** Die Punkte für das gewählte Modell: Fälle, Ziel (Ordnung, Vergleichskategorie, Zählwerte), Beobachtungszeit, Sperren und Hinweise. Die Sperren stehen vorn. */
export function katPruefliste(i: KatPruefEingabe): KatPunkt[] {
  const f = katFaelle(i.art, i.ziel, i.praed, i.zeilen, i.spalten, i.art === 'zaehlreg' && i.modell.zeit ? i.modell.zeit : undefined);
  const nm = i.name, ziel = zitat(nm(i.ziel)), p: KatPunkt[] = [];
  p.push({ art: f.n >= 10 ? 'ok' : 'hinweis', text: Lp(f.n, `${f.n} Fall mit allen Angaben`, `${f.n} Fälle mit allen Angaben`, `${f.n} case with all answers`, `${f.n} cases with all answers`),
    klein: f.ausgelassen > 0 ? Lp(f.ausgelassen, `${f.ausgelassen} Zeile mit einer Lücke wird ausgelassen.`, `${f.ausgelassen} Zeilen mit Lücken werden ausgelassen.`, `${f.ausgelassen} row with a gap is left out.`, `${f.ausgelassen} rows with gaps are left out.`) : undefined });
  const koeff = (() => { const dt = katDaten(i.art, i.ziel, i.praed, i.zeilen, i.spalten); return dt.praed.reduce((a, q) => a + (q.art === 'faktor' ? q.stufen.length - 1 : 1), 0); })();

  if (i.art === 'ordreg' || i.art === 'multreg') {
    const mit = f.stufen.filter(x => x.anzahl > 0), leer = f.stufen.filter(x => x.anzahl === 0);
    const sp = i.spalten.find(x => x.name === i.ziel)!;
    for (const b of zielStufenPruefung(i.art, f.stufen, koeff)) p.push({ art: b.art, text: b.text });
    if (i.art === 'ordreg') {
      if (sp.art === 'text') p.push({ art: 'sperre', text: L(`Die Reihenfolge der Stufen von ${ziel} ist nicht festgelegt`, `The order of the levels of ${ziel} has not been set`),
        klein: d('Lege sie unter „Spalten beschreiben“ fest; alphabetisch rechnet Statable nicht.', 'Legen Sie sie unter „Spalten beschreiben“ fest; alphabetisch rechnet Statable nicht.', 'Set it under "Describe columns"; Statable does not calculate in alphabetical order.') });
      else if (mit.length >= 2) p.push({ art: 'info', text: L(`${ziel} ist geordnet: ${mit.map(x => zitat(x.text)).join(' < ')} (${mit.length} Stufen)`, `${ziel} is ordered: ${mit.map(x => zitat(x.text)).join(' < ')} (${mit.length} levels)`),
        klein: L('Die Reihenfolge der Stufen kommt aus den Daten (Zahlen nach ihrem Code, also nach den Wertebeschriftungen) und ist nie alphabetisch. Positive Koeffizienten heißen: höhere Werte der Vorhersagegröße gehen mit höheren Stufen einher.', 'The order of the levels comes from the data (numbers by their code, i.e. by the value labels) and is never alphabetical. Positive coefficients mean: higher values of the predictor go with higher levels.') });
      if (leer.length) p.push({ art: 'info', text: Lp(leer.length, `Eine Stufe ohne Fälle fällt weg: ${aufzaehlung(leer.map(x => zitat(x.text)))}`, `Stufen ohne Fälle fallen weg: ${aufzaehlung(leer.map(x => zitat(x.text)))}`, `A level without cases is dropped: ${aufzaehlung(leer.map(x => zitat(x.text)))}`, `Levels without cases are dropped: ${aufzaehlung(leer.map(x => zitat(x.text)))}`) });
      p.push({ art: 'info', text: L('Statable prüft die Annahme paralleler Linien (Brant-Test)', 'Statable checks the parallel-lines assumption (Brant test)'),
        klein: L('Sie besagt, dass jede Vorhersagegröße an allen Trennstellen der Stufen gleich wirkt - nur dann reicht ein einziges Odds Ratio. Ist sie verletzt, steht das zuerst im Ergebnis, und die multinomiale Regression wird angeboten.', 'It says that each predictor acts equally at all cut points between the levels - only then is a single odds ratio enough. If it is violated, the result says so first and offers the multinomial regression.') });
    } else {
      const ref = referenzGilt(i.modell, stufenMitFaellen(f.stufen));
      if (mit.length >= 3) p.push({ art: 'info', text: L(`Ziel mit ${mit.length} Kategorien ohne Ordnung: multinomiale Regression, Vergleich mit ${zitat(ref)}`, `Target with ${mit.length} categories without order: multinomial regression, compared with ${zitat(ref)}`),
        klein: L(`Jede andere Kategorie wird mit ${zitat(ref)} verglichen. Die Vergleichskategorie lässt sich unter „Weitere Wege“ ändern; am besten eine übliche oder große Gruppe. Statable nimmt wie R die erste, SPSS die letzte.`, `Every other category is compared with ${zitat(ref)}. The reference category can be changed under "More options"; ideally a usual or large group. Statable takes the first, like R; SPSS takes the last.`) });
      if (i.modell.referenz && !mit.some(x => x.text === i.modell.referenz) && f.stufen.some(x => x.text === i.modell.referenz))
        p.push({ art: 'sperre', text: L(`Die Vergleichskategorie ${zitat(i.modell.referenz)} hat keine Fälle`, `The reference category ${zitat(i.modell.referenz)} has no cases`), klein: d('Wähle unter „Weitere Wege“ eine Kategorie mit Fällen.', 'Wählen Sie unter „Weitere Wege“ eine Kategorie mit Fällen.', 'Choose a category with cases under "More options".') });
    }
  } else {
    const b = zaehlZielPruefung(f.yWerte as number[], nm(i.ziel)); if (b) p.push({ art: 'sperre', text: b.text });
    if (i.modell.zeit) {
      const z = zeitPruefung(f.zeitWerte, nm(i.modell.zeit)); if (z) p.push({ art: 'sperre', text: z.text });
      else p.push({ art: 'info', text: L(`Beobachtungszeit: ${zitat(nm(i.modell.zeit))}`, `Observation time: ${zitat(nm(i.modell.zeit))}`),
        klein: L('Statable rechnet mit dem Logarithmus der Zeit als Offset. Das Ergebnis sind dann Raten je Zeiteinheit dieser Spalte, nicht Anzahlen insgesamt.', 'Statable uses the logarithm of the time as an offset. The result is then rates per unit of time of this column, not totals.') });
    } else p.push({ art: 'info', text: L('Ohne Beobachtungszeit: Jeder Fall gilt als gleich lang beobachtet', 'Without observation time: every case counts as observed for the same length of time'),
      klein: d('Waren die Fälle unterschiedlich lange beobachtet (zum Beispiel verschieden viele Wochen), verzerrt das die Ergebnisse. Dann wähle unter „Weitere Wege“ die Beobachtungszeit.', 'Waren die Fälle unterschiedlich lange beobachtet (zum Beispiel verschieden viele Wochen), verzerrt das die Ergebnisse. Dann wählen Sie unter „Weitere Wege“ die Beobachtungszeit.', 'If the cases were observed for different lengths of time (for example different numbers of weeks), this distorts the results. Then choose the observation time under "More options".') });
    p.push({ art: 'info', text: i.modell.zaehl === 'poisson' ? L('Poisson-Regression (so gewählt)', 'Poisson regression (chosen like this)') : i.modell.zaehl === 'negbin' ? L('Negativ-binomiale Regression (so gewählt)', 'Negative binomial regression (chosen like this)') : L('Poisson oder negativ-binomial: Statable prüft es', 'Poisson or negative binomial: Statable checks'),
      klein: i.modell.zaehl === 'auto' ? L('Streuen die Werte stärker, als ein Poisson-Modell erlaubt (Überdispersion), rechnet Statable negativ-binomial und sagt es zuerst im Ergebnis; sonst Poisson.', 'If the values vary more than a Poisson model allows (overdispersion), Statable calculates negative binomial and says so first in the result; otherwise Poisson.')
        : L('Die automatische Wahl prüft die Überdispersion und gibt den Grund an. Bei Poisson trotz Überdispersion wären die p-Werte zu klein; das Ergebnis weist darauf hin.', 'The automatic choice checks overdispersion and gives the reason. With Poisson despite overdispersion the p values would be too small; the result points this out.') });
  }
  // Sperren nach vorn
  return [...p.filter(x => x.art === 'sperre'), ...p.filter(x => x.art !== 'sperre')];
}

/** Vorschläge für die lineare Regression (nie still): ordinales Ziel mit 3 bis 10 Stufen; Zielwerte, die nach Zählwerten aussehen. Jeder mit Knopf.
 *  Gezählt wird nach dem listenweisen Ausschluss: nur Fälle mit Angaben zu Ziel und allen Vorhersagespalten. */
export function katVorschlaege(ziel: string, praed: string[], zeilen: Wert[][], spalten: Spalte[], name: (n: string) => string): KatPunkt[] {
  const sp = spalten.find(x => x.name === ziel);
  if (!sp || sp.art !== 'zahl' || !praed.length) return [];
  const werte = katFaelle('zaehlreg', ziel, praed, zeilen, spalten).yWerte as number[];
  const verschieden = new Set(werte).size;
  if (zielArt(sp, verschieden) !== 'zahl') return [];
  const aus: KatPunkt[] = [];
  if (ordinalVorschlag(sp, verschieden)) aus.push({ art: 'hinweis', modell: 'ordinal', knopf: L('Ordinal rechnen', 'Calculate ordinal'),
    text: L(`Das Ziel ${zitat(name(ziel))} ist ordinal (${verschieden} Stufen). Eine ordinale Regression passt besser als die lineare.`, `The target ${zitat(name(ziel))} is ordinal (${verschieden} levels). An ordinal regression fits better than the linear one.`),
    klein: L('Die lineare Regression unterstellt gleiche Abstände zwischen den Stufen; die ordinale Regression nicht. Gerechnet wird erst nach dem Klick.', 'Linear regression assumes equal distances between the levels; ordinal regression does not. Nothing is changed until you click.') });
  const zv = zaehlVorschlag(werte, sp.niveau);
  if (zv && zv.schief !== null) aus.push({ art: 'hinweis', modell: 'zaehl', knopf: L('Als Zähldaten rechnen', 'Calculate as count data'),
    text: L(`Die Zielwerte von ${zitat(name(ziel))} sehen nach Zählwerten aus (ganze Zahlen ab 0, rechtsschief). Eine Zähldaten-Regression passt dann besser als die lineare.`, `The target values of ${zitat(name(ziel))} look like counts (whole numbers from 0, right-skewed). A count regression then fits better than the linear one.`),
    klein: L('Zählwerte sind nach oben offen, nie negativ und meist rechtsschief; die lineare Regression kann negative Vorhersagen liefern. Gerechnet wird erst nach dem Klick.', 'Counts are open at the top, never negative and usually right-skewed; linear regression can give negative predictions. Nothing is changed until you click.') });
  else if (zv) aus.push({ art: 'hinweis', modell: 'zaehl', knopf: L('Als Zähldaten rechnen', 'Calculate as count data'),
    text: L(`Die Zielwerte von ${zitat(name(ziel))} sehen nach Zählwerten aus (ganze Zahlen ab 0, viele Nullen). Eine Zähldaten-Regression passt dann besser als die lineare.`, `The target values of ${zitat(name(ziel))} look like counts (whole numbers from 0, many zeros). A count regression then fits better than the linear one.`),
    klein: L('Zählwerte sind nach oben offen, nie negativ und meist rechtsschief; die lineare Regression kann negative Vorhersagen liefern. Gerechnet wird erst nach dem Klick.', 'Counts are open at the top, never negative and usually right-skewed; linear regression can give negative predictions. Nothing is changed until you click.') });
  return aus;
}
