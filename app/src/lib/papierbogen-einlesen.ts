/**
 * Papierbogen zum Scannen (E8, Teil 2b, Kern): gelesene Seiten zu Bögen ordnen, Unsicheres zur Korrektur melden, Datensatz bilden.
 * Regel wie im Leser: nie raten. Eine Frage ist erst „fertig“, wenn das Kreuz eindeutig gelesen ist oder die Person es von Hand gesetzt hat.
 * Reine Rechnung ohne Oberfläche und ohne Bild; das Bild liest `lese` aus ./papierbogen.
 */
import type { FragebogenPlan } from './fragebogenplan';
import { indexVon } from './fragebogenexport';
import type { Durchgang } from './doppeleingabe';
import type { Antwortwert } from './antwortsatz';
import { bogenFragenVon, bogenLayout, type BogenFrage, type LeseFehler, type LeseOptionen, type Lesung } from './papierbogen';

export interface GescannteSeite { quelle: string; lesung: Lesung }
export type FrageStand = 'leer' | 'eine' | 'mehrere' | 'pruefen';
export interface BogenFrageErgebnis {
  nr: number; id: string; mehrfach: boolean; stand: FrageStand;
  /** gelesene Kreuze (bei „unsicher“ nur die sicheren) */ codes: number[];
  /** mögliche Codes der Frage, für die Korrektur */ moeglich: number[];
}
export interface BogenErgebnis { bogen: number; seiten: number[]; fehlendeSeiten: number[]; fragen: BogenFrageErgebnis[] }
export interface Abgelehnt { quelle: string; grund: LeseFehler | 'doppelt' | 'keineLesung'; bogen?: number; seite?: number }
export interface Sammlung { boegen: BogenErgebnis[]; abgelehnt: Abgelehnt[]; seitenJeBogen: number }

/** Optionen für `lese`: erwartete Kästchen je Seite und Kennung des Plans. */
export function leseOptionenFuer(plan: FragebogenPlan, sprache: string): LeseOptionen {
  const { fragen } = bogenFragenVon(plan, sprache);
  const lay = bogenLayout(fragen, { planId: plan.id, revision: plan.revision, bogen: 0 });
  return { erwartet: seite => lay.find(s => s.seite === seite)?.kaestchen ?? [], kennung: { planId: plan.id, revision: plan.revision, bogen: 0 } };
}

export function ordneBoegen(plan: FragebogenPlan, sprache: string, seiten: GescannteSeite[]): Sammlung {
  const { fragen } = bogenFragenVon(plan, sprache);
  const seitenJeBogen = bogenLayout(fragen as BogenFrage[], { planId: plan.id, revision: plan.revision, bogen: 0 }).length;
  const ix = indexVon(plan), idVonNr = new Map<number, string>();
  for (const [id, nr] of ix.nr) idVonNr.set(nr, id);
  const abgelehnt: Abgelehnt[] = [];
  const jeBogen = new Map<number, Map<number, Lesung>>();
  for (const s of seiten) {
    const l = s.lesung;
    if (!l || !l.ok || !l.kennung) { abgelehnt.push({ quelle: s.quelle, grund: l?.fehler ?? 'keineLesung', ...(l?.kennung ? { bogen: l.kennung.bogen, seite: l.kennung.seite } : {}) }); continue; }
    const m = jeBogen.get(l.kennung.bogen) ?? new Map<number, Lesung>();
    if (m.has(l.kennung.seite)) { abgelehnt.push({ quelle: s.quelle, grund: 'doppelt', bogen: l.kennung.bogen, seite: l.kennung.seite }); continue; }
    m.set(l.kennung.seite, l); jeBogen.set(l.kennung.bogen, m);
  }
  const boegen: BogenErgebnis[] = [...jeBogen.keys()].sort((a, b) => a - b).map(bogen => {
    const m = jeBogen.get(bogen)!, vorhanden = [...m.keys()].sort((a, b) => a - b);
    const fehlend: number[] = [];
    for (let i = 1; i <= seitenJeBogen; i++) if (!m.has(i)) fehlend.push(i);
    const erg: BogenFrageErgebnis[] = [];
    for (const nr of vorhanden) for (const f of m.get(nr)!.fragen) {
      const id = idVonNr.get(f.nr), el = id ? ix.el.get(id) : undefined;
      if (!id || !el || el.art !== 'frage') continue;
      const moeglich = (fragen.find(x => x.nr === f.nr)?.codes ?? []);
      erg.push({ nr: f.nr, id, mehrfach: el.typ === 'mehrfach', stand: f.status, codes: f.codes ?? (f.code === undefined ? [] : [f.code]), moeglich });
    }
    erg.sort((a, b) => a.nr - b.nr);
    return { bogen, seiten: vorhanden, fehlendeSeiten: fehlend, fragen: erg };
  });
  return { boegen, abgelehnt, seitenJeBogen };
}

/** Korrekturen der Person: Schlüssel `<bogen>:<nr>`, Wert = gewählte Codes (leer = bewusst unbeantwortet). */
export type Korrekturen = Record<string, number[]>;
export const korrekturSchluessel = (bogen: number, nr: number) => `${bogen}:${nr}`;

/** Offene Fragen: unsicher gelesen oder mehrere Kreuze bei Einfachauswahl, und noch nicht von Hand gesetzt. */
export function offeneFragen(b: BogenErgebnis, kor: Korrekturen = {}): BogenFrageErgebnis[] {
  return b.fragen.filter(f => !(korrekturSchluessel(b.bogen, f.nr) in kor) && (f.stand === 'pruefen' || (f.stand === 'mehrere' && !f.mehrfach)));
}

export function werteAusBogen(b: BogenErgebnis, kor: Korrekturen = {}): Record<string, Antwortwert> {
  const w: Record<string, Antwortwert> = {};
  for (const f of b.fragen) {
    const k = kor[korrekturSchluessel(b.bogen, f.nr)];
    const codes = k ?? (f.stand === 'pruefen' || (f.stand === 'mehrere' && !f.mehrfach) ? undefined : f.codes);
    if (codes === undefined) { w[f.id] = null; continue; } // offen: bleibt leer, nie geraten
    w[f.id] = codes.length === 0 ? null : f.mehrfach ? [...codes].sort((a, c) => a - c) : codes[0]!;
  }
  return w;
}

/** Datensatz für `datensatzTabelle`: je Bogen eine Zeile mit Namen „Bogen n“. Bögen mit offenen Fragen sind nur dabei, wenn `trotzdem` gesetzt ist. */
export function durchgangAusBoegen(sammlung: Sammlung, kor: Korrekturen = {}, trotzdem = false): { durchgang: Durchgang; uebernommen: number[]; zurueckgehalten: number[] } {
  const durchgang: Durchgang = {}, uebernommen: number[] = [], zurueckgehalten: number[] = [];
  for (const b of sammlung.boegen) {
    if (!trotzdem && (offeneFragen(b, kor).length || b.fehlendeSeiten.length)) { zurueckgehalten.push(b.bogen); continue; }
    durchgang[`Bogen ${b.bogen}`] = werteAusBogen(b, kor) as Durchgang[string];
    uebernommen.push(b.bogen);
  }
  return { durchgang, uebernommen, zurueckgehalten };
}
