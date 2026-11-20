/** Beschriftungen an Punkten, die sich nicht überdecken dürfen (Meldung 01.11.: Wright-Karte mit 24 übereinanderliegenden Namen).
 *  Regel (Johannes): überschneiden sich die Texte, wird das ganze Diagramm höher gezeichnet; hilft das nicht mehr, steht kein Text im Bild
 *  (die Namen bleiben als Hinweis am Punkt und in der Tabelle darunter). Rein, ohne Oberfläche. */

export interface Marke { x: number; y: number; text: string }
export interface Plan {
  /** Faktor für die Höhe des Bildes (1 = Grundhöhe). */
  faktor: number;
  /** Je Marke: Text zeigen? */
  zeigen: boolean[];
  /** Es wurden Texte weggelassen. */
  gekuerzt: boolean;
}

/** Geschätzte Breite eines Textes in Pixeln. */
export const textBreite = (t: string, px = 12) => t.length * px * 0.6;

/** Überdecken sich zwei Textfelder? (Feld: ab x nach rechts, um y zentriert) */
function stoesst(a: Marke, b: Marke, px: number): boolean {
  return a.x < b.x + textBreite(b.text, px) && b.x < a.x + textBreite(a.text, px) && Math.abs(a.y - b.y) < px * 1.25;
}

/** Plant Texte für Punkte, deren Höhe `y` (in Pixeln bei Faktor 1, gemessen ab `oben`) mit der Bildhöhe wächst.
 *  `zeichenHoehe(f)` ist die Höhe der Zeichenfläche bei Faktor f; `yAnteil` je Punkt 0 (oben) bis 1 (unten). */
export function planeBeschriftung(
  punkte: { x: number; yAnteil: number; text: string }[],
  o: { px?: number; flaeche: number; oben: number; maxFaktor?: number },
): Plan {
  const px = o.px ?? 12, max = o.maxFaktor ?? 3;
  const bei = (f: number): Marke[] => punkte.map(p => ({ x: p.x, y: o.oben + p.yAnteil * o.flaeche * f, text: p.text }));
  const ueberdeckt = (m: Marke[], zeigen: boolean[]) => { for (let i = 0; i < m.length; i++) if (zeigen[i]) for (let j = i + 1; j < m.length; j++) if (zeigen[j] && stoesst(m[i]!, m[j]!, px)) return true; return false; };
  const alle = punkte.map(() => true);
  for (let f = 1; f <= max + 1e-9; f += 0.25) if (!ueberdeckt(bei(f), alle)) return { faktor: f, zeigen: alle, gekuerzt: false };
  /* Auch bei größter Höhe zu eng: nur die Texte zeigen, die nichts überdecken; bleiben weniger als die Hälfte, gar keine. */
  const m = bei(max), zeigen = punkte.map(() => false);
  m.forEach((a, i) => { if (!m.some((b, j) => j !== i && zeigen[j] && stoesst(a, b, px))) zeigen[i] = true; });
  const wenige = zeigen.filter(Boolean).length * 2 < punkte.length;
  return { faktor: max, zeigen: wenige ? punkte.map(() => false) : zeigen, gekuerzt: true };
}

/** Verteilt Texte in einer Spalte so, dass jeder mindestens `abstand` Pixel Platz hat (Reihenfolge bleibt). Gibt die neuen y zurück. */
export function spreize(ys: number[], abstand: number, lo: number, hi: number): number[] {
  const ix = ys.map((_, i) => i).sort((a, b) => ys[a]! - ys[b]!);
  const pos = ix.map(i => ys[i]!);
  for (let k = 0; k < pos.length; k++) pos[k] = Math.max(pos[k]!, k ? pos[k - 1]! + abstand : lo);
  for (let k = pos.length - 1; k >= 0; k--) pos[k] = Math.min(pos[k]!, k < pos.length - 1 ? pos[k + 1]! - abstand : hi);
  /* nach unten geschoben, aber oben wieder nicht unter lo */
  for (let k = 0; k < pos.length; k++) pos[k] = Math.max(pos[k]!, k ? pos[k - 1]! + abstand : lo);
  const aus = ys.slice();
  ix.forEach((i, k) => { aus[i] = pos[k]!; });
  return aus;
}
