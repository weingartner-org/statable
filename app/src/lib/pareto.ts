/** Pareto-Diagramm (S-I, 22.10.2026): Kategorien nach Häufigkeit absteigend, dazu die kumulierte Summe in Prozent der gültigen Angaben. Reine Rechnung. */
export interface ParetoZeile { name: string; anzahl: number; anteil: number; kumuliert: number }
export function paretoZeilen(werte: { name: string; anzahl: number; anteil: number }[]): ParetoZeile[] {
  const gesamt = werte.reduce((s, w) => s + w.anzahl, 0);
  const sortiert = werte.map((w, i) => ({ ...w, i })).sort((a, b) => b.anzahl - a.anzahl || a.i - b.i);
  let summe = 0;
  return sortiert.map(w => { summe += w.anzahl; return { name: w.name, anzahl: w.anzahl, anteil: gesamt ? w.anzahl / gesamt : 0, kumuliert: gesamt ? summe / gesamt : 0 }; });
}
/** Die „wenigen Wichtigen“: so viele Kategorien (von der größten an), bis mindestens `schwelle` der Angaben erreicht ist. */
export function wenigeWichtige(z: ParetoZeile[], schwelle = 0.8): number {
  const i = z.findIndex(r => r.kumuliert >= schwelle - 1e-12); return i < 0 ? z.length : i + 1;
}
