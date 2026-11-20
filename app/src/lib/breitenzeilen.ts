/**
 * Welche Zeilen bestimmen die Breite einer Spalte der Datentabelle? (Abschlusstest A2)
 * Vorher wurde jede Zelle jeder Zeile formatiert und gemessen: bei 100.000 Zeilen × 47 Spalten 3 s Stillstand beim Öffnen.
 * Die Breite hängt nur von wenigen Zeilen ab, und die findet ein einfacher Durchlauf ohne Formatieren:
 *  - hat die Spalte höchstens 300 verschiedene Werte, steht jeder Wert (sein erstes Vorkommen) in der Liste - das ist genau;
 *  - sonst: der kleinste und der größte Zahlenwert (die breitesten Ziffernfolgen, auch mit Minuszeichen), die 8 längsten Texte
 *    und 1.000 gleichmäßig verteilte Zeilen.
 */
export function breitenZeilen(zeilen: readonly (readonly (string | number | null)[])[], i: number): number[] {
  const n = zeilen.length, aus = new Set<number>(), erste = new Map<string | number | null, number>();
  let verschieden = true, lo = -1, hi = -1;
  const lang: [number, number][] = [];   // (Länge, Zeile), die längsten Texte
  for (let r = 0; r < n; r++) {
    const v = zeilen[r]![i] ?? null;
    if (verschieden && !erste.has(v)) { erste.set(v, r); if (erste.size > 300) verschieden = false; }
    if (typeof v === 'number') {
      if (lo < 0 || v < (zeilen[lo]![i] as number)) lo = r;
      if (hi < 0 || v > (zeilen[hi]![i] as number)) hi = r;
    } else if (typeof v === 'string' && (lang.length < 8 || v.length > lang[lang.length - 1]![0])) {
      lang.push([v.length, r]); lang.sort((a, b) => b[0] - a[0]); if (lang.length > 8) lang.pop();
    }
  }
  if (verschieden) return [...erste.values()];
  if (lo >= 0) { aus.add(lo); aus.add(hi); }
  lang.forEach(([, r]) => aus.add(r));
  const schritt = Math.max(1, Math.floor(n / 1000));
  for (let r = 0; r < n; r += schritt) aus.add(r);
  return [...aus];
}
