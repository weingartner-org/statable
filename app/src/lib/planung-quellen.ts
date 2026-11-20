/**
 * Zahlen aus dem Projekt für „Statable weiß“ in der Forschungsplanung (Stufe V2, Teil 2b).
 * Nur Zahlen, Arten und Einstellungen - nie Text aus Dokumenten, Antworten oder Namen von Personen.
 * Rein (ohne Sitzung), damit der Test ohne Browser läuft; die Seite reicht die Teile des Projekts hinein.
 */
import { fragebogenQuelle, type PlanQuellen } from './planung';
import type { FragebogenPlan } from './fragebogenplan';
import type { QualProjekt } from './qualprojekt';

export interface ProjektTeile {
  fragebogen: readonly FragebogenPlan[];
  qual?: QualProjekt;
  /** Datensatz: nur wenn Daten offen sind */
  daten?: { zeilen: number; spalten: readonly { bezeichnung: string; fehlend: readonly number[]; fehlendBereich?: unknown }[] };
}

export function planQuellen(p: ProjektTeile): PlanQuellen {
  const r: PlanQuellen = {};
  const plan = p.fragebogen[0];
  if (plan) r.fragebogen = fragebogenQuelle(plan);
  const q = p.qual;
  if (q && (q.dokumente.length || q.faelle.length || (q.einwilligungen?.length ?? 0))) {
    const ew = q.einwilligungen ?? [];
    r.qual = {
      dokumente: q.dokumente.length,
      transkripte: q.dokumente.filter(d => d.art === 'audio' || d.art === 'video' || !!d.transkript).length,
      faelle: q.faelle.length,
      einwilligungen: ew.length,
      mitWiderruf: ew.filter(e => (e.widerrufe?.length ?? 0) > 0).length,
      mitLoeschfrist: ew.filter(e => (e.loeschen?.length ?? 0) > 0).length,
      kodierende: q.kodierende.length,
      ...(q.kiNutzung ? { kiAngabe: q.kiNutzung.genutzt ? 'ja' as const : 'nein' as const } : {}),
    };
  }
  const d = p.daten;
  if (d && d.zeilen > 0 && d.spalten.length > 0) {
    r.datensatz = {
      zeilen: d.zeilen,
      spalten: d.spalten.length,
      mitBeschriftung: d.spalten.filter(x => x.bezeichnung.trim() !== '').length,
      fehlendCodes: d.spalten.reduce((a, x) => a + x.fehlend.length, 0),
    };
  }
  return r;
}
