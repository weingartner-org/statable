/**
 * Rechnet etwas über eine ganze Datenspalte nur EINMAL je Datenstand (Abschlusstest A2): Der Stand ist das Array `zeilen` - es wird bei jeder
 * Änderung der Daten durch ein neues ersetzt (`s.zeilen = …`), das alte Ergebnis verschwindet dann mit ihm (WeakMap). Bei 100.000 Zeilen kostete
 * „wie viele verschiedene Werte hat die Spalte?“ je Aufruf 40 ms und wurde bei jeder Eingabe in der Frage dutzendfach gefragt.
 */
const speicher = new WeakMap<object, Map<string, unknown>>();
export function einmal<T>(stand: object, schluessel: string, rechne: () => T): T {
  let m = speicher.get(stand);
  if (!m) speicher.set(stand, (m = new Map()));
  if (m.has(schluessel)) return m.get(schluessel) as T;
  const v = rechne(); m.set(schluessel, v); return v;
}
