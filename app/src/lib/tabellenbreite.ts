/**
 * Breite Tabellen in Word und PDF (Prüfung G8): Spalten bekamen gleich viel Platz, egal wie lang das längste Wort ist - „Mittelwe/rt“, „Gesa/mt“,
 * die Zahl „−7,64“ zerfiel in zwei Zeilen. Regel jetzt: Jede Spalte ist mindestens so breit wie ihr längstes Wort (Zahlenzellen: der ganze Text),
 * und reicht die Seitenbreite dafür nicht, wird die Schrift stufenweise kleiner (bis 7 Punkt), erst dann bricht ein Wort.
 * Rein rechnerisch (die Messung der Textbreite kommt von außen), darum testbar.
 */

export interface MessZelle { t: string; span: number; zahl?: boolean }

/** Ungefähre Breite eines Textes in Arial/Liberation Sans, in Punkt bei Schriftgröße 1 (also mal Schriftgröße nehmen). Für Word, wo es keine Messung gibt. */
export function arialBreite(text: string): number {
  let b = 0;
  for (const z of text) {
    if (z === ' ' || z === ' ') b += 0.278;
    else if (/[.,:;'|!ijl]/.test(z)) b += 0.26;
    else if (/[fFtrI()[\]/-]/.test(z)) b += 0.34;
    else if (/[0-9]/.test(z)) b += 0.556;
    else if (/[mMwW%]/.test(z)) b += z === 'm' ? 0.833 : z === 'w' ? 0.722 : z === 'M' ? 0.833 : z === 'W' ? 0.944 : 0.889;
    else if (/[A-ZÄÖÜ]/.test(z)) b += 0.68;
    else if (/[−+=<>×·]/.test(z)) b += 0.584;
    else b += 0.54;
  }
  return b;
}

/** Wie viele echte Spalten hat die Tabelle? */
export const spaltenZahl = (zeilen: MessZelle[][]) => Math.max(1, ...zeilen.map(z => z.reduce((a, c) => a + Math.max(1, c.span), 0)));

/** Pro Spalte die kleinste Breite, bei der kein Wort und keine Zahl umbricht (nur Zellen ohne Spannweite zählen; `polster` ist der Innenabstand links plus rechts). */
export function spaltenMinimum(zeilen: MessZelle[][], messen: (text: string) => number, polster: number): number[] {
  const n = spaltenZahl(zeilen), min = Array<number>(n).fill(0);
  for (const z of zeilen) {
    let k = 0;
    for (const c of z) {
      const span = Math.max(1, c.span);
      if (span === 1) {
        const teile = c.zahl ? [c.t.trim()] : c.t.split(/\s+/);
        for (const w of teile) min[k] = Math.max(min[k]!, messen(w) + polster);
      }
      k += span;
    }
  }
  return min;
}

export interface Stufe { schrift: number; polster: number }
/** Erste Stufe (größte Schrift), bei der alle Mindestbreiten in `verfuegbar` passen; passt keine, die kleinste. `messen(text, schrift)` liefert die Breite in der Einheit von `verfuegbar`. */
export function waehleStufe(zeilen: MessZelle[][], messen: (text: string, schrift: number) => number, stufen: Stufe[], verfuegbar: number): { stufe: Stufe; min: number[]; passt: boolean } {
  let letzte: { stufe: Stufe; min: number[]; passt: boolean } | null = null;
  for (const st of stufen) {
    const min = spaltenMinimum(zeilen, t => messen(t, st.schrift), st.polster);
    letzte = { stufe: st, min, passt: min.reduce((a, b) => a + b, 0) <= verfuegbar };
    if (letzte.passt) return letzte;
  }
  return letzte!;
}

/** Wunschbreiten bleiben, wo sie reichen; zu schmale Spalten wachsen auf ihr Minimum, der Überschuss kommt von Spalten mit Luft (im Verhältnis zu ihrer Luft). */
export function breitenVerteilen(wunsch: number[], min: number[], gesamt: number): number[] {
  const b = wunsch.map((w, i) => Math.max(w, min[i]!));
  let ueber = b.reduce((a, c) => a + c, 0) - gesamt;
  if (ueber <= 0) return b;
  const luft = b.map((w, i) => w - min[i]!), summeLuft = luft.reduce((a, c) => a + c, 0);
  if (summeLuft <= 0) return b;
  const nimm = Math.min(ueber, summeLuft);
  return b.map((w, i) => w - nimm * luft[i]! / summeLuft);
}
