/** Kleinster und größter Wert ohne `Math.min(...liste)`: der Spread legt jedes Element auf den Aufrufstapel
 *  und stürzt ab 100 000 bis 125 000 Werten ab (Prüfung G1/G5, 08.10.: Skala mit 10 000 × 15, Datei mit 125 000 Zeilen).
 *  Gleiche Bedeutung wie Math.min/Math.max: leere Liste → Infinity bzw. -Infinity, NaN bleibt NaN. */
export function kleinste(a: Iterable<number>): number { let m = Infinity; for (const v of a) { if (Number.isNaN(v)) return NaN; if (v < m) m = v; } return m; }
export function groesste(a: Iterable<number>): number { let m = -Infinity; for (const v of a) { if (Number.isNaN(v)) return NaN; if (v > m) m = v; } return m; }
