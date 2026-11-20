/**
 * Farben für geordnete Antwortskalen (10.10.): Die Stufen einer Skala wie „sehr selten … sehr oft“ sind keine
 * unverbundenen Kategorien - die Farbe soll die Ordnung zeigen. Fachlich richtig ist eine Abstufung eines Tons:
 *   - steigend (einpolig, „nie … immer“): hell → kräftig eines Tons (Diagrammfarbe A),
 *   - zweipolig („stimme gar nicht zu … stimme voll zu“): zwei Töne (A und B), vom hellen Mittelpunkt nach außen kräftiger.
 * Erkannt wird sie am Messniveau der gezählten Spalte (ordinal) mit mindestens drei Stufen; ob sie zweipolig ist, an den
 * Namen der beiden Enden. „weiß nicht“ und „keine Angabe“ stehen außerhalb der Skala und sind grau.
 * Zahlen in den Flächen stehen auf einem Schild in der Grundfarbe (Kreuzdiagramm.svelte): so stimmt der Kontrast in jedem Thema, egal wie die Stufe gefärbt ist.
 * Die Farben sind `color-mix` auf den Themenfarben (--dg-a, --dg-b, --blatt, --tinte): hell, dunkel und die Kontrast-Themen
 * stimmen von selbst, die Abstufung kehrt sich im Dunkelmodus mit um (mehr Ton = weiter vom Grund).
 */
export type SkalenArt = 'keine' | 'steigend' | 'zweipolig';
export interface StufenFarbe {
  /** CSS-Farbe der Fläche */
  fuell: string;
  /** Umriss: dieselbe Farbe dunkler - hält auch die hellste Stufe gegen den Grund sichtbar */
  rand: string;
  /** außerhalb der Skala („weiß nicht“) */
  ausserhalb: boolean;
}

/** Stufen außerhalb der Skala: gehören nicht in die Abstufung. */
const AUSSERHALB = /wei(ß|ss) (ich )?nicht|keine angabe|k\. ?a\.|nicht beurteil|nicht zutreffend|trifft nicht zu\s*\(|don.?t know|no answer|not applicable|prefer not/i;
/** Wörter, an denen eine zweipolige Skala zu erkennen ist (Zustimmung, Zufriedenheit, Bewertung). */
const POL = /(stimme|stimmen|trifft|treffen)\b.*\bzu\b|lehne|ablehn|zufrieden|einverstanden|agree|satisf|positiv|negativ|schlecht|\bgut\b|\bbad\b|\bgood\b|wahrscheinlich|likely|hilfreich|helpful/i;
/** Das verneinende Ende: Verneinung oder Gegenwort. */
const NEIN = /\bnicht\b|\bkein|\bun[a-zäöü]{3,}|lehne|ablehn|schlecht|negativ|disagree|dissatisf|\bnot\b|\bbad\b|unlikely/i;

export const istAusserhalb = (t: string) => AUSSERHALB.test(t);

/** Welche Art Skala: nur bei geordneter Spalte (ordinal), mindestens drei Stufen innerhalb der Skala. */
export function skalenArt(niveau: string | undefined, namen: string[]): SkalenArt {
  if (niveau !== 'ordinal') return 'keine';
  const innen = namen.filter(n => !istAusserhalb(n));
  if (innen.length < 3) return 'keine';
  const a = innen[0]!, z = innen.at(-1)!;
  return POL.test(a) && POL.test(z) && NEIN.test(a) !== NEIN.test(z) ? 'zweipolig' : 'steigend';
}

/** Ein Ton in der Stärke t (0 = schwächste, 1 = stärkste Stufe): vom Grund aus Schritt für Schritt kräftiger, die stärkste Stufe ist der Ton selbst.
 *  Kein Abdunkeln zur Schriftfarbe hin: in den Kontrast-Themen hat die Schrift dieselbe Farbe wie der Ton, die Stufen wären dort nicht mehr zu unterscheiden. */
const ton = (basis: string, t: number): string => `color-mix(in oklab, ${basis} ${Math.round(30 + 70 * Math.min(1, Math.max(0, t)))}%, var(--blatt))`;
const NEUTRAL = 'color-mix(in oklab, var(--tinte-2) 22%, var(--blatt))';
const GRAU = 'color-mix(in oklab, var(--tinte-2) 38%, var(--blatt))';
const mitRand = (fuell: string, ausserhalb = false): StufenFarbe => ({ fuell, ausserhalb, rand: `color-mix(in oklab, var(--tinte) 35%, ${fuell})` });

/** Die Farben der Stufen in der Reihenfolge der Namen. Bei 'keine' ein leeres Feld (dann gilt die Kategorienpalette). */
export function stufenFarben(namen: string[], art: SkalenArt): StufenFarbe[] {
  if (art === 'keine') return [];
  const innen = namen.map((n, i) => ({ n, i })).filter(x => !istAusserhalb(x.n));
  const m = innen.length;
  const farben: StufenFarbe[] = new Array(namen.length);
  namen.forEach((n, i) => { if (istAusserhalb(n)) farben[i] = mitRand(GRAU, true); });
  if (art === 'steigend') {
    innen.forEach((x, k) => { farben[x.i] = mitRand(ton('var(--dg-a)', m > 1 ? k / (m - 1) : 1)); });
    return farben;
  }
  // zweipolig: das verneinende Ende bekommt Ton B, das bejahende Ton A; Mitte (bei ungerader Zahl) hell und neutral
  const neinZuerst = NEIN.test(innen[0]!.n), mitte = (m - 1) / 2;
  innen.forEach((x, k) => {
    const d = k - mitte, t = mitte > 0 ? Math.abs(d) / mitte : 1, istNein = (d < 0) === neinZuerst;
    farben[x.i] = mitRand(d === 0 ? NEUTRAL : ton(istNein ? 'var(--dg-b)' : 'var(--dg-a)', t));
  });
  return farben;
}
