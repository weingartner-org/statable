/** Kleine Helfer für die Diagramme der Quantilregression und der Strafregression (Später S-E): gleichmäßige Achsenmarken und Beschriftungen, die sich nicht überdecken. */

/** Gleichmäßige Achsenmarken zwischen a und b (etwa `ziel` Stück). */
export function achsenMarken(a: number, b: number, ziel = 5): number[] {
  if (!(Number.isFinite(a) && Number.isFinite(b)) || a === b) return Number.isFinite(a) ? [a] : [];
  const s = (b - a) / ziel, m = 10 ** Math.floor(Math.log10(s)), st = [1, 2, 5, 10].map(f => f * m).find(f => f >= s) ?? m;
  const aus: number[] = [];
  for (let v = Math.ceil(a / st - 1e-9) * st; v <= b + 1e-9; v += st) aus.push(Math.round(v / st) * st);
  return aus;
}
/** Beschriftungen an Höhen `ys` (aufsteigend bei Bild-y): auseinanderschieben, bis der Abstand mindestens `abstand` beträgt, innerhalb von [von, bis]. Gibt die neuen Höhen in der alten Reihenfolge zurück. */
export function entzerre(ys: number[], abstand: number, von: number, bis: number): number[] {
  const ix = ys.map((_, i) => i).sort((p, q) => ys[p]! - ys[q]!), pos = ix.map(i => Math.min(Math.max(ys[i]!, von), bis));
  for (let k = 1; k < pos.length; k++) if (pos[k]! - pos[k - 1]! < abstand) pos[k] = pos[k - 1]! + abstand;
  const ueber = pos.length ? pos[pos.length - 1]! - bis : 0;
  if (ueber > 0) { pos[pos.length - 1] = bis; for (let k = pos.length - 2; k >= 0; k--) if (pos[k + 1]! - pos[k]! < abstand) pos[k] = pos[k + 1]! - abstand; }
  const aus = new Array<number>(ys.length);
  ix.forEach((i, k) => { aus[i] = pos[k]!; });
  return aus;
}
