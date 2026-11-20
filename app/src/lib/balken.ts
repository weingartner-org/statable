/**
 * Balken „Mittelwert nach Gruppe“ ohne Test (Später S-F2, Teil E; Fachblatt SPAETER-F2-ERGAENZUNGEN Abschnitt E und „Entscheidungen Opus (19.10.)“ 11 und 12).
 * Kennzahlen je Gruppe (2 bis 12 Gruppen), das 95-%-Konfidenzintervall mit der t-Verteilung JE GRUPPE (nicht gepoolt), die runde Achse (Säulen immer ab 0),
 * der Satz zu überlappenden Intervallen und der Text für Vorleser. Mit Häufigkeitsgewicht gleich dem Wiederholen der Zeilen.
 * Die Gruppen stehen in der Reihenfolge der Spalte (Wertelabels bzw. Werte), nie nach Größe. Sollwerte: scripts/spaeter-f2-erwartet.R; Tests: balken.test.ts.
 */
import { L, Lp } from './sitzung.svelte';
import { komma } from './ergebnis';
import { tQuantil } from './verteilung';

export const BALKEN_GRUPPEN_MAX = 12;

export interface GruppeKz { gruppe: string; n: number; mittel: number; sd: number | null; se: number | null; df: number | null; kiU: number | null; kiO: number | null; min: number; max: number }
export type KennzahlenErgebnis = { ok: true; gruppen: GruppeKz[]; ausgelassen: number } | { ok: false; code: 'keine-werte' | 'zu-wenig-gruppen' | 'zu-viele-gruppen'; anzahl?: number };

const gut = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export function gruppenKennzahlen(y: (number | null)[], g: (string | number | null)[], o: { gewicht?: (number | null)[]; reihenfolge?: string[] } = {}): KennzahlenErgebnis {
  const je = new Map<string, { roh: string | number; werte: number[]; w: number[] }>();
  let ausgelassen = 0, gueltig = 0;
  for (let i = 0; i < y.length; i++) {
    const wert = y[i], grp = g[i], w = o.gewicht ? o.gewicht[i] : 1;
    if (!gut(wert) || grp === null || grp === undefined || grp === '' || !gut(w) || w < 0) { ausgelassen++; continue; }
    gueltig++;
    if (w === 0) continue;
    const schl = String(grp), eintrag = je.get(schl);
    if (eintrag) { eintrag.werte.push(wert); eintrag.w.push(w); } else je.set(schl, { roh: grp, werte: [wert], w: [w] });
  }
  if (gueltig === 0) return { ok: false, code: 'keine-werte' };
  // Reihenfolge: gegeben (Wertelabels), Rest hinten; sonst aufsteigend (Zahlen numerisch, Text mit localeCompare)
  const standard = [...je.values()].sort((a, b) => (typeof a.roh === 'number' && typeof b.roh === 'number' ? a.roh - b.roh : String(a.roh).localeCompare(String(b.roh), 'de', { numeric: false }))).map(e => String(e.roh));
  const reihe = o.reihenfolge ? [...o.reihenfolge.filter(x => je.has(x)).filter((x, i, a) => a.indexOf(x) === i), ...standard.filter(x => !o.reihenfolge!.includes(x))] : standard;
  if (reihe.length < 2) return { ok: false, code: 'zu-wenig-gruppen', anzahl: reihe.length };
  if (reihe.length > BALKEN_GRUPPEN_MAX) return { ok: false, code: 'zu-viele-gruppen', anzahl: reihe.length };
  const gruppen: GruppeKz[] = reihe.map(name => {
    const e = je.get(name)!;
    const sw = e.w.reduce((a, b) => a + b, 0), m = e.werte.reduce((a, v, i) => a + v * e.w[i]!, 0) / sw;
    let min = Infinity, max = -Infinity;
    for (const v of e.werte) { if (v < min) min = v; if (v > max) max = v; }
    if (sw <= 1) return { gruppe: name, n: sw, mittel: m, sd: null, se: null, df: null, kiU: null, kiO: null, min, max };
    const s2 = e.werte.reduce((a, v, i) => a + e.w[i]! * (v - m) ** 2, 0) / (sw - 1), sd = Math.sqrt(s2), se = sd / Math.sqrt(sw), df = sw - 1;
    const t = sd === 0 ? 0 : tQuantil(0.975, df);
    return { gruppe: name, n: sw, mittel: m, sd, se, df, kiU: m - t * se, kiO: m + t * se, min, max };
  });
  return { ok: true, gruppen, ausgelassen };
}

/* ---------------------------------------------------------------- Achse */
export interface BalkenAchse { schritt: number; unten: number; oben: number }
/** Runde Schritte 1-2-5 × 10^k, etwa fünf Marken. */
export function balkenAchse(lo: number, hi: number): BalkenAchse {
  const roh = (hi - lo) / 5 || 1, m = 10 ** Math.floor(Math.log10(roh)), n = roh / m;
  const schritt = (n <= 1 + 1e-12 ? 1 : n <= 2 + 1e-12 ? 2 : n <= 5 + 1e-12 ? 5 : 10) * m;
  return { schritt, unten: Math.floor(lo / schritt + 1e-9) * schritt || 0, oben: Math.ceil(hi / schritt - 1e-9) * schritt || 0 };
}
/** Achse für die Gruppen: Säulen enthalten die Null IMMER; Wertebereich = Enden der Striche (bei Gruppen ohne Intervall der Mittelwert) und, wenn gegeben, alle Punkte. */
export function balkenAchseFuer(gruppen: GruppeKz[], o: { art: 'saeulen' | 'punkte'; punkte?: number[]; fehler?: 'ki' | 'se' | 'sd' | 'keine' }): BalkenAchse {
  const fehler = o.fehler ?? 'ki';
  const werte: number[] = [];
  for (const g of gruppen) {
    if (fehler === 'ki') werte.push(g.kiU ?? g.mittel, g.kiO ?? g.mittel);
    else if (fehler === 'se') { const h = g.se ?? (g.sd ?? 0) / Math.sqrt(g.n || 1); werte.push(g.mittel - h, g.mittel + h); }
    else if (fehler === 'sd') werte.push(g.mittel - (g.sd ?? 0), g.mittel + (g.sd ?? 0));
    else werte.push(g.mittel);
  }
  if (o.punkte) for (const v of o.punkte) if (gut(v)) werte.push(v);
  let lo = Math.min(...werte), hi = Math.max(...werte);
  if (o.art === 'saeulen') { lo = Math.min(0, lo); hi = Math.max(0, hi); }
  return balkenAchse(lo, hi);
}

/** Länge der Überlappung zweier Intervalle (≤ 0: keine); null, wenn eines fehlt. */
export function intervalleUeberlappen(a: { kiU: number | null; kiO: number | null }, b: { kiU: number | null; kiO: number | null }): number | null {
  if (a.kiU === null || a.kiO === null || b.kiU === null || b.kiO === null) return null;
  return Math.min(a.kiO, b.kiO) - Math.max(a.kiU, b.kiU);
}

/* ---------------------------------------------------------------- Sätze */
/** Der Satz unter dem Bild - immer da. Bei Intervallen auch der Satz zu überlappenden Intervallen. */
export function balkenSatz(o: { art: 'saeulen' | 'punkte'; fehler: 'ki' | 'se' | 'sd' | 'keine' }): string {
  const was = o.art === 'saeulen'
    ? L('Die Säulen zeigen den Mittelwert je Gruppe', 'The bars show the mean of each group')
    : L('Die Punkte zeigen die einzelnen Werte, der dicke Strich den Mittelwert je Gruppe', 'The dots show the single values, the thick line the mean of each group');
  if (o.fehler === 'ki') return L(`${was}, die Striche das 95-%-Konfidenzintervall (t-Verteilung, je Gruppe gerechnet). Intervalle, die sich überlappen, schließen einen Unterschied nicht aus; das Bild ersetzt keinen Test.`,
    `${was}, the whiskers the 95% confidence interval (t distribution, calculated for each group). Overlapping intervals do not rule out a difference; the chart does not replace a test.`);
  if (o.fehler === 'se') return L(`${was}, die Striche einen Standardfehler nach oben und unten (Standardabweichung geteilt durch die Wurzel aus n). Ein Standardfehler ist kein Intervall: Sein Balken deckt nur etwa zwei Drittel ab. Im Bericht steht immer dabei, dass die Striche Standardfehler zeigen.`,
    `${was}, the whiskers one standard error up and down (standard deviation divided by the square root of n). A standard error is not an interval: its bar covers only about two thirds. Always state in the report that the whiskers show standard errors.`);
  if (o.fehler === 'sd') return L(`${was}, die Striche eine Standardabweichung nach oben und unten. Sie zeigen die Streuung der Werte, kein Intervall für den Mittelwert.`,
    `${was}, the whiskers one standard deviation up and down. They show the spread of the values, not an interval for the mean.`);
  return L(`${was}. Ohne Striche sieht man nicht, wie sicher die Mittelwerte sind.`, `${was}. Without whiskers you cannot see how certain the means are.`);
}

export function balkenAltText(gruppen: GruppeKz[], o: { einheit?: string } = {}): string {
  const e = o.einheit ? ` ${o.einheit}` : '';
  const liste = gruppen.map(g => `${g.gruppe} ${komma(g.mittel, 1)}${e} (n = ${komma(g.n, 0)})`).join(', ');
  const mw = gruppen.map(g => g.mittel), lo = Math.min(...mw), hi = Math.max(...mw);
  return L(`Mittelwerte von ${gruppen.length} Gruppen: ${liste}; Spannweite der Mittelwerte von ${komma(lo, 1)} bis ${komma(hi, 1)}${e}.`,
    `Means of ${gruppen.length} groups: ${liste}; the means range from ${komma(lo, 1)} to ${komma(hi, 1)}${e}.`);
}

/** Sätze für die Sonderfälle: Gruppe mit einer Person (kein Intervall), kleine Gruppen. */
export function balkenHinweise(gruppen: GruppeKz[]): string[] {
  const aus: string[] = [];
  const eins = gruppen.filter(g => g.n <= 1);
  if (eins.length) aus.push(Lp(eins.length, `Die Gruppe ${eins.map(g => `‚${g.gruppe}‘`).join(', ')} hat nur eine Person; für sie gibt es kein Intervall.`, `Die Gruppen ${eins.map(g => `‚${g.gruppe}‘`).join(', ')} haben nur eine Person; für sie gibt es kein Intervall.`,
    `The group ${eins.map(g => `"${g.gruppe}"`).join(', ')} has only one person; there is no interval for it.`, `The groups ${eins.map(g => `"${g.gruppe}"`).join(', ')} have only one person each; there is no interval for them.`));
  const klein = gruppen.filter(g => g.n > 1 && g.n < 5);
  if (klein.length) aus.push(Lp(klein.length, `Die Gruppe ${klein.map(g => `‚${g.gruppe}‘`).join(', ')} hat weniger als 5 Personen; ihr Intervall ist breit und unsicher.`, `Die Gruppen ${klein.map(g => `‚${g.gruppe}‘`).join(', ')} haben weniger als 5 Personen; ihre Intervalle sind breit und unsicher.`,
    `The group ${klein.map(g => `"${g.gruppe}"`).join(', ')} has fewer than 5 people; its interval is wide and uncertain.`, `The groups ${klein.map(g => `"${g.gruppe}"`).join(', ')} have fewer than 5 people; their intervals are wide and uncertain.`));
  return aus;
}
