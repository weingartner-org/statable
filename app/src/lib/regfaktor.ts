/**
 * Gruppen-Spalten als Prädiktoren der Regression (Abschlusstest F1, 10.10.2026).
 *
 * Eine Spalte mit Gruppen (Text, Niveau „nominal“ oder Wertebeschriftungen ohne Niveau „ordinal“; 2 bis 12 Stufen) darf nicht als Zahl in die Regression:
 * „Studiengang 1, 2, 3“ als Zahl unterstellt eine Reihenfolge mit gleichen Abständen, die es nicht gibt (Abschlusstest: R² ,29 statt ,60).
 * Statable bildet darum k − 1 Hilfsspalten mit 0 und 1 (Dummy-Kodierung, Field 2018, Kap. 11; Cohen, Cohen, West & Aiken 2003, Kap. 8).
 * Vergleichsgruppe (Referenz) ist die erste Stufe: bei Zahlen der kleinste Code, bei Text die alphabetisch erste Antwort - wie R `factor()` und wie im
 * Mehrebenenmodell (mehrebenen.ts). Die Hilfsspalten entstehen nur für die Rechnung (TEMPORARY + RECODE … INTO); Werte, die keine der Stufen sind
 * (fehlend), bleiben systemfehlend und fallen wie sonst listenweise heraus.
 *
 * Gesamttest einer Gruppen-Spalte mit drei und mehr Stufen: PSPP 2.1.1 kennt bei REGRESSION nur /METHOD=ENTER. Statable rechnet darum ein zweites Modell
 * ohne die Hilfsspalten dieser Spalte, mit denselben Personen (SELECT IF auf die erste Hilfsspalte), und prüft die Änderung von R²:
 * F = ((SS_Rest ohne − SS_Rest mit) / q) / (SS_Rest mit / df_Rest mit), q = k − 1 - wie R `anova(lm(ohne), lm(mit))`.
 * Logistische Regression: Likelihood-Quotienten-Test χ² = −2LL ohne − −2LL mit, df = q - wie R `anova(glm(ohne), glm(mit), test = "Chisq")`.
 * Vergleichswerte: scripts/regression-faktor-erwartet.R, Tests: regfaktor.test.ts.
 *
 * Wer eine geordnete Spalte (Niveau „ordinal“, z. B. eine Antwortskala) als Zahl rechnen will, behält sie als Zahl; Statable sagt das in der Prüfliste.
 * ⚠ von der Fachperson abzunehmen: Grenze 12 Stufen, Ausnahme „ordinal“.
 */
import type { Spalte } from './verzeichnis';
import { zitWert, pk } from './befehlstext';
import { L } from './sitzung.svelte';
import { zitat } from '../i18n/profil';

/** Höchstens so viele Stufen rechnet Statable als Gruppen (wie Mehrebenenmodell und Gruppenvergleich). */
export const FAKTOR_MAX = 12;

const beschriftet = (sp: Spalte) => Object.keys(sp.werteLabels).length > 0;
/** Ist die Spalte eine Gruppen-Spalte (unabhängig von der Zahl der Stufen)? Text; Zahl mit Niveau „nominal“; Zahl mit Wertebeschriftungen, außer Niveau „ordinal“. */
export const istGruppenSpalte = (sp: Spalte): boolean => sp.art === 'text' || (sp.art === 'zahl' && (sp.niveau === 'nominal' || (beschriftet(sp) && sp.niveau !== 'ordinal')));
/** Als Faktor (Hilfsspalten) rechnen: Gruppen-Spalte mit 2 bis 12 Stufen. */
export const regAlsFaktor = (sp: Spalte, stufen: number): boolean => istGruppenSpalte(sp) && stufen >= 2 && stufen <= FAKTOR_MAX;
/** Gruppen-Spalte aus Zahlen mit mehr als 12 Stufen: wird als Zahl gerechnet - die Prüfliste sagt es. */
export const zuVieleStufen = (sp: Spalte, stufen: number): boolean => sp.art === 'zahl' && istGruppenSpalte(sp) && stufen > FAKTOR_MAX;
/** Geordnete Spalte mit Beschriftungen: bleibt eine Zahl (gleiche Abstände angenommen) - die Prüfliste sagt es. */
export const ordinalAlsZahl = (sp: Spalte): boolean => sp.art === 'zahl' && sp.niveau === 'ordinal' && beschriftet(sp);

/** Eine Stufe: `wert` so geschrieben wie in den Daten (Zahl als Text), `name` die Wertebeschriftung oder der Wert. */
export interface RegStufe { wert: string; name: string }
/** Eine Gruppen-Spalte als Prädiktor: Stufen in fester Reihenfolge (erste = Vergleichsgruppe), je weitere Stufe eine Hilfsspalte mit Bezeichnung. */
export interface RegFaktor { spalte: string; bezeichnung: string; text: boolean; stufen: RegStufe[]; hilfs: string[]; labels: string[] }

/** Die Gruppen-Spalte als Faktor oder `null` (keine Gruppen-Spalte, unter 2 oder über 12 Stufen). `werte`: gültige Werte der Spalte, `vergeben`: alle Spaltennamen. */
export function regFaktor(sp: Spalte, werte: (string | number)[], vergeben: string[]): RegFaktor | null {
  const text = sp.art !== 'zahl';
  const roh = [...new Set(werte.filter(v => v !== '' && v !== null && v !== undefined).map(v => (text ? String(v) : Number(v))))];
  if (!regAlsFaktor(sp, roh.length)) return null;
  const sortiert = text ? (roh as string[]).sort(new Intl.Collator('de').compare) : (roh as number[]).sort((a, b) => a - b).map(String);
  const name = (w: string) => sp.werteLabels[w] ?? sp.werteLabels[String(Number(w))] ?? w;
  const stufen = sortiert.map(wert => ({ wert, name: name(wert) }));
  const belegt = new Set(vergeben.map(n => n.toUpperCase()));
  const basis = sp.name.slice(0, 58), bez = sp.bezeichnung || sp.name, ref = stufen[0]!.name;
  const hilfs: string[] = [], labels: string[] = [];
  stufen.slice(1).forEach((st, j) => {
    let n = `${basis}_${j + 2}`;
    while (belegt.has(n.toUpperCase())) n += 'x';
    belegt.add(n.toUpperCase()); hilfs.push(n);
    labels.push(L(`${bez}: ${st.name} (gegen ${ref})`, `${bez}: ${st.name} (vs. ${ref})`));
  });
  return { spalte: sp.name, bezeichnung: bez, text, stufen, hilfs, labels };
}

/** Ein Prädiktor der Regression: eine Zahlenspalte (`faktor` null) oder eine Gruppen-Spalte mit ihren Hilfsspalten. */
export interface RegTerm { spalte: string; faktor: RegFaktor | null }
export const regTerme = (praed: string[], faktor?: (n: string) => RegFaktor | null): RegTerm[] => praed.map(spalte => ({ spalte, faktor: faktor?.(spalte) ?? null }));
/** Die Spalten, mit denen PSPP rechnet: Zahlenspalten selbst, Gruppen-Spalten als Hilfsspalten - in der Reihenfolge der Wahl. */
export const regVariablen = (t: RegTerm[]): string[] => t.flatMap(x => (x.faktor ? x.faktor.hilfs : [x.spalte]));
/** Gruppen-Spalten, deren Gesamttest ein zweites Modell braucht: mindestens drei Stufen und weitere Prädiktoren. (Zwei Stufen: der Test der einen Hilfsspalte;
 *  nur diese Spalte im Modell: der Modelltest.) */
export const regGesamttests = (t: RegTerm[]): RegTerm[] => (t.length > 1 ? t.filter(x => x.faktor && x.faktor.hilfs.length >= 2) : []);

const q = zitWert;   // Werte und Beschriftungen aus den Daten: Inhalt bleibt, Steuerzeichen als Hex (lib/befehlstext.ts)
/** RECODE je Hilfsspalte (Stufe = 1, alle anderen Stufen = 0, sonst systemfehlend) und die Bezeichnungen. */
export function regRecodes(t: RegTerm[]): string {
  const f = t.flatMap(x => (x.faktor ? [x.faktor] : []));
  if (!f.length) return '';
  const wert = (k: RegFaktor, w: string) => (k.text ? q(w) : String(Number(w)));
  const rec = f.flatMap(k => k.hilfs.map((h, j) => `RECODE ${k.spalte} (${wert(k, k.stufen[j + 1]!.wert)}=1) (${k.stufen.filter((_, i) => i !== j + 1).map(s => wert(k, s.wert)).join(' ')}=0) INTO ${h}.`));
  const lab = f.flatMap(k => k.hilfs.map((h, j) => `${h} ${q(k.labels[j]!)}`)).join('\n  /');
  return `${rec.join('\n')}\nVARIABLE LABELS ${lab}.`;
}
const kommentarKopf = () => `* ${L('Gruppen-Spalten gehen als 0/1-Hilfsspalten ein (Dummy-Kodierung, Vergleichsgruppe: die erste Stufe); die Hilfsspalten gelten nur für die nächste Rechnung (TEMPORARY).', 'Group columns enter as 0/1 helper columns (dummy coding, reference group: the first level); the helper columns exist only for the next calculation (TEMPORARY).')}`;
const kommentarTest = (k: RegFaktor) => `* ${pk(L(`Gesamttest für ${zitat(k.bezeichnung)}: dasselbe Modell ohne seine Hilfsspalten, mit denselben Personen.`, `Overall test for ${zitat(k.bezeichnung)}: the same model without its helper columns, with the same people.`))}`;

/** Lineare Regression; mit Gruppen-Spalten: Hilfsspalten, danach je Gesamttest ein Modell ohne diese Spalte. Ohne Gruppen-Spalten wie bisher. */
export function regressionBefehl(ziel: string, t: RegTerm[]): string {
  const reg = (vars: string[]) => `REGRESSION\n  /VARIABLES=${vars.join(' ')} ${ziel}\n  /STATISTICS=COEFF R ANOVA CI(95)\n  /DEPENDENT=${ziel}\n  /METHOD=ENTER.`;
  if (!t.some(x => x.faktor)) return reg(regVariablen(t));
  const rec = regRecodes(t);
  return [`${kommentarKopf()}\nTEMPORARY.\n${rec}\n${reg(regVariablen(t))}`,
    ...regGesamttests(t).map(g => `${kommentarTest(g.faktor!)}\nTEMPORARY.\n${rec}\nSELECT IF NOT SYSMIS(${g.faktor!.hilfs[0]}).\n${reg(regVariablen(t.filter(x => x !== g)))}`)].join('\n');
}
/** Für die logistische Regression: der Teil nach TEMPORARY (Hilfsspalten der Gruppen-Spalten) und die Gesamttest-Läufe; `lauf(vars, auswahl)` baut einen Lauf. */
export function regLogistikTeile(t: RegTerm[], lauf: (vars: string[], vorher: string) => string): string {
  const rec = regRecodes(t);
  if (!rec) return lauf(regVariablen(t), '');
  return [lauf(regVariablen(t), `${rec}\n`),
    ...regGesamttests(t).map(g => `${kommentarTest(g.faktor!)}\n${lauf(regVariablen(t.filter(x => x !== g)), `${rec}\nSELECT IF NOT SYSMIS(${g.faktor!.hilfs[0]}).\n`)}`)].join('\n');
}
