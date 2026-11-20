/**
 * Sätze, APA-Zeile und Tabellen zur Korrelationsmatrix (gerechnet in korrmatrix.ts).
 * Darstellung wie in APA-Korrelationstabellen: Unterdreieck mit r, Spalten nummeriert; p und n je Paar in einer zweiten Tabelle (keine Sterne - die App nutzt sonst nirgends welche).
 * ⚠ Satz-Vorlagen und die Faustregel für die Stärke (wie bei „Hängen zwei Dinge zusammen?“: ,1 / ,3 / ,5) von der Fachperson abzunehmen.
 */
import type { TableItem } from '../engine/types';
import { L, Lp } from './sitzung.svelte';
import { zitat } from '../i18n/profil';
import { ohneNull, pWert, kurz, zusammenhangWort, korrZeichen, type Saetze } from './ergebnis';
import { fd, fo, fp, tabelle, type Z } from './mwsaetze';
import { kleinste, groesste } from './menge';
import { paarWert, type KorrMatrix, type KorrPaar } from './korrmatrix';

const T = L;
const q = (x: string) => zitat(kurz(x, 30));
const und = () => T(' und ', ' and ');

/** Paare mit Wert, in der Reihenfolge der Matrix. */
const mitWert = (m: KorrMatrix) => m.paare.flatMap(p => { const w = paarWert(m, p); return w ? [{ p, w }] : []; });
const nSpanne = (m: KorrMatrix) => { const ns = m.paare.map(p => p.n); return { lo: kleinste(ns), hi: groesste(ns) }; };
const nText = (m: KorrMatrix) => { const { lo, hi } = nSpanne(m); return lo === hi ? String(lo) : T(`${lo} bis ${hi}`, `${lo} to ${hi}`); };
const zeichen = (m: KorrMatrix) => korrZeichen(m.methode);
const artName = (m: KorrMatrix) => (m.methode === 'spearman' ? T('Rangkorrelationen nach Spearman', "Spearman's rank correlations") : T('Korrelationen nach Pearson', 'Pearson correlations'));

export function saetzeKorrMatrix(m: KorrMatrix, label: (n: string) => string): Saetze {
  const alle = mitWert(m), z = zeichen(m), k = m.spalten.length, paarZahl = m.paare.length;
  const nm = (p: KorrPaar) => `${q(label(m.spalten[p.i]!))}${und()}${q(label(m.spalten[p.j]!))}`;
  const deutlich = alle.filter(x => x.w.p < 0.05);
  const holmWort = m.holm ? T(' nach Holm', ', Holm-adjusted') : '';
  if (!alle.length) return {
    haupt: T('Für kein Paar ließ sich eine Korrelation rechnen (zu wenige Personen mit beiden Angaben oder keine Streuung).', 'No pair could be correlated (too few people with both answers, or no spread).'),
    zusatz: '', vorsicht: '', apa: '', marken: []
  };
  const sortiert = [...alle].sort((a, b) => Math.abs(b.w.r) - Math.abs(a.w.r)), st = sortiert[0]!, sw = sortiert.at(-1)!;
  // T27: en Einzahl „1 of 6 pairs shows“.
  const haupt = Lp(deutlich.length, `${artName(m)} zwischen ${k} Spalten (${paarZahl} Paare): Bei ${deutlich.length} von ${alle.length} Paaren ist der Zusammenhang deutlich (p < ,05${holmWort}). Am stärksten hängen ${nm(st.p)} zusammen (${z} = ${ohneNull(st.w.r)}), am schwächsten ${nm(sw.p)} (${z} = ${ohneNull(sw.w.r)}).`,
    `${artName(m)} zwischen ${k} Spalten (${paarZahl} Paare): Bei ${deutlich.length} von ${alle.length} Paaren ist der Zusammenhang deutlich (p < ,05${holmWort}). Am stärksten hängen ${nm(st.p)} zusammen (${z} = ${ohneNull(st.w.r)}), am schwächsten ${nm(sw.p)} (${z} = ${ohneNull(sw.w.r)}).`,
    `${artName(m)} between ${k} columns (${paarZahl} pairs): ${deutlich.length} of ${alle.length} pairs shows a clear relationship (p < .05${holmWort}). The strongest is between ${nm(st.p)} (${z} = ${ohneNull(st.w.r)}), the weakest between ${nm(sw.p)} (${z} = ${ohneNull(sw.w.r)}).`,
    `${artName(m)} between ${k} columns (${paarZahl} pairs): ${deutlich.length} of ${alle.length} pairs show a clear relationship (p < .05${holmWort}). The strongest is between ${nm(st.p)} (${z} = ${ohneNull(st.w.r)}), the weakest between ${nm(sw.p)} (${z} = ${ohneNull(sw.w.r)}).`);
  const auf = (l: typeof alle) => l.slice(0, 4).map(x => `${nm(x.p)} (${z} = ${ohneNull(x.w.r)}, ${zusammenhangWort(x.w.r)})`).join('; ') + (l.length > 4 ? T(`; ${l.length - 4} weitere in der Tabelle`, `; ${l.length - 4} more in the table`) : '');
  const pos = deutlich.filter(x => x.w.r > 0), neg = deutlich.filter(x => x.w.r < 0);
  const zusatz = (deutlich.length
    ? [pos.length ? T(`Gemeinsam steigen: ${auf(pos)}.`, `Rise together: ${auf(pos)}.`) : '', neg.length ? T(`Gegenläufig (höher bei der einen, niedriger bei der anderen): ${auf(neg)}.`, `Opposite (higher on one, lower on the other): ${auf(neg)}.`) : ''].filter(Boolean).join(' ')
    : T('Kein Paar zeigt einen Zusammenhang, der selten wäre, wenn es in Wahrheit keinen gäbe. Das heißt nicht, dass es keinen gibt.', 'No pair shows a relationship that would be rare if there were truly none. That does not mean there is none.'))
    + (m.holm ? '' : T(` Bei ${paarZahl} Paaren auf einmal kann auch ohne echten Zusammenhang leicht eines unter ,05 fallen; die Holm-Korrektur gleicht das aus.`, ` With ${paarZahl} pairs at once, one can easily fall below .05 even without a real relationship; the Holm correction compensates for this.`));
  const { lo, hi } = nSpanne(m);
  const vorsicht = T('Ein Zusammenhang ist keine Ursache.', 'A relationship is not a cause.')
    + (lo !== hi ? T(` Lücken zählen paarweise: Je Paar gehen die Personen mit beiden Angaben ein (n = ${lo} bis ${hi}).`, ` Gaps are handled pairwise: each pair uses the people with both answers (n = ${lo} to ${hi}).`) : '')
    + (m.methode === 'spearman' ? T(' Die Rangkorrelation fragt nur, ob höhere Werte tendenziell mit höheren einhergehen - nicht, ob die Punkte auf einer Geraden liegen.', ' A rank correlation only asks whether higher values tend to go with higher values - not whether the points lie on a straight line.') : '');
  // APA: die drei stärksten Paare (wie im Text üblich), der Rest steht in der Tabelle.
  const apaPaar = (x: (typeof alle)[number]) => `${kurz(label(m.spalten[x.p.i]!), 20)} - ${kurz(label(m.spalten[x.p.j]!), 20)}: ${z}(${x.w.n - 2}) = ${ohneNull(x.w.r)}, p ${pWert(x.w.p)}`;
  const apa = sortiert.slice(0, 3).map(apaPaar).join('; ') + (m.holm ? T('; p nach Holm', '; p Holm-adjusted') : '') + (sortiert.length > 3 ? T('; alle Paare in der Tabelle', '; all pairs in the table') : '');
  return {
    haupt, zusatz, vorsicht, apa,
    marken: [
      { text: T(`${deutlich.length} von ${alle.length} Paaren deutlich`, `${deutlich.length} of ${alle.length} pairs clear`), erklaer: 'p-wert' },
      { text: m.methode === 'spearman' ? 'Spearman (rs)' : 'Pearson (r)', erklaer: m.methode === 'spearman' ? 'rangkorrelation' : 'korrelation' },
      ...(m.holm ? [{ text: T('Holm-korrigiert', 'Holm-adjusted'), erklaer: 'korrelationsmatrix' }] : []),
      { text: T(`n je Paar: ${nText(m)}`, `n per pair: ${nText(m)}`), erklaer: 'stichprobe', hinweis: lo < 20 }
    ]
  };
}

export function tabellenKorrMatrix(m: KorrMatrix, label: (n: string) => string): TableItem[] {
  const k = m.spalten.length, z = zeichen(m), wert = new Map(m.paare.map(p => [`${p.i}-${p.j}`, paarWert(m, p)]));
  const zeilen: Z[][] = m.spalten.map((sp, a) => [`${a + 1}. ${label(sp)}`, ...Array.from({ length: k - 1 }, (_, b): Z => {
    if (b > a) return ''; if (b === a) return '-';
    const w = wert.get(`${b}-${a}`); return w ? fo(w.r) : '-';
  })]);
  const holmFuss = m.holm ? T(' p nach Holm für alle Paare korrigiert.', ' p Holm-adjusted for all pairs.') : '';
  const matrix = tabelle('Correlation Matrix', T(`Korrelationsmatrix (${m.methode === 'spearman' ? L('Spearman', 'Spearman') : L('Pearson', 'Pearson')})`, `Correlation matrix (${m.methode === 'spearman' ? L('Spearman', 'Spearman') : L('Pearson', 'Pearson')})`),
    ['', ...Array.from({ length: k - 1 }, (_, b) => String(b + 1))], zeilen,
    [T(`${z} = ${m.methode === 'spearman' ? L('Rangkorrelation nach Spearman', "Spearman's rank correlation") : L('Korrelation nach Pearson', 'Pearson correlation')}. Lücken paarweise ausgeschlossen, n je Paar ${nText(m)}. p, n und 95 %-KI je Paar in der folgenden Tabelle.${holmFuss}`,
      `${z} = ${m.methode === 'spearman' ? L('Rangkorrelation nach Spearman', "Spearman's rank correlation") : L('Korrelation nach Pearson', 'Pearson correlation')}. Missing values excluded pairwise, n per pair ${nText(m)}. p, n and 95% CI per pair in the following table.${holmFuss}`)]);
  const kopf = [T('Paar', 'Pair'), z, T('95 %-KI untere Grenze', '95% CI lower'), T('95 %-KI obere Grenze', '95% CI upper'), 'p', ...(m.holm ? [T('p (Holm)', 'p (Holm)')] : []), 'n'];
  const paare = tabelle('Correlation Pairs', T('Alle Paare', 'All pairs'), kopf,
    m.paare.map(p => {
      const w = paarWert(m, p), name = `${a1(p.i)} ${label(m.spalten[p.i]!)} - ${a1(p.j)} ${label(m.spalten[p.j]!)}`;
      return w ? [name, fo(w.r), fo(w.kiLo), fo(w.kiHi), fp(w.pRoh), ...(m.holm ? [fp(w.p)] : []), fd(p.n)] : [name, '-', '-', '-', '-', ...(m.holm ? ['-'] : []), fd(p.n)];
    }),
    [T(`Zweiseitig. ${m.methode === 'spearman' ? L('p über t mit n − 2 Freiheitsgraden (wie R cor.test(method = "spearman", exact = FALSE)), KI nach Bonett und Wright', 'p via t with n − 2 degrees of freedom (as R cor.test(method = "spearman", exact = FALSE)), CI after Bonett and Wright') : L('p über t mit n − 2 Freiheitsgraden, KI über Fisher-z (wie R cor.test)', 'p via t with n − 2 degrees of freedom, CI via Fisher z (as R cor.test)')}.${m.holm ? L(' Holm wie R p.adjust(method = "holm").', ' Holm as R p.adjust(method = "holm").') : ''} „-“: weniger als 3 Personen mit beiden Angaben oder keine Streuung.`,
      `Two-sided. ${m.methode === 'spearman' ? L('p über t mit n − 2 Freiheitsgraden (wie R cor.test(method = "spearman", exact = FALSE)), KI nach Bonett und Wright', 'p via t with n − 2 degrees of freedom (as R cor.test(method = "spearman", exact = FALSE)), CI after Bonett and Wright') : L('p über t mit n − 2 Freiheitsgraden, KI über Fisher-z (wie R cor.test)', 'p via t with n − 2 degrees of freedom, CI via Fisher z (as R cor.test)')}.${m.holm ? L(' Holm wie R p.adjust(method = "holm").', ' Holm as R p.adjust(method = "holm").') : ''} "-": fewer than 3 people with both answers or no spread.`)]);
  return [matrix, paare];
}
const a1 = (i: number) => `${i + 1}.`;

/** Kurzname für „Gerechnet: …“. */
export const korrMatrixName = (m: KorrMatrix) => T(`Korrelationsmatrix (${m.methode === 'spearman' ? L('Spearman', 'Spearman') : L('Pearson', 'Pearson')}${m.holm ? L(', Holm', ', Holm') : ''})`, `correlation matrix (${m.methode === 'spearman' ? L('Spearman', 'Spearman') : L('Pearson', 'Pearson')}${m.holm ? L(', Holm', ', Holm') : ''})`);
/** Für den Text unter der Wahl am Blatt. */
export const holmText = () => T('Die Holm-Korrektur passt die p-Werte an die Zahl der Paare an: Wer viele Paare auf einmal prüft, findet sonst leicht zufällig „deutliche“ Zusammenhänge. Sie ist strenger als ohne Korrektur, aber weniger streng als Bonferroni.',
  'The Holm correction adjusts the p values for the number of pairs: testing many pairs at once otherwise easily produces "clear" relationships by chance. It is stricter than no correction but less strict than Bonferroni.');
