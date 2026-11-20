/**
 * Eine Regel für „gestufte“ Messgrößen (Abschlusstest F5): ordinales Messniveau oder höchstens WENIGE_STUFEN verschiedene Werte.
 * Sie entscheidet bei der Korrelation über Spearman statt Pearson (verfahren.ts) und beim Gruppenvergleich und Vorher-nachher
 * über den Vorschlag eines Rangtests (rangtests.ts) - damit eine als ordinal markierte Note 1-5 in beiden Fällen gleich behandelt wird.
 */
import { groesste } from './menge';

/** Höchstens so viele verschiedene Werte: dann gilt eine Zahlenspalte als „gestuft“ (Likert-Antworten, Noten, Semester …). */
export const WENIGE_STUFEN = 7;

/** Warum eine Messgröße als gestuft gilt: Niveau „ordinal“ (`spalten` = die ordinalen) oder wenige Werte (`stufen` = die größte Zahl verschiedener Werte unter ihnen). */
export interface StufenGrund { art: 'ordinal' | 'stufen'; spalten: string[]; stufen?: number }

export interface StufenCtx { verschieden: (name: string) => number; ordinal?: (name: string) => boolean; bezeichnung?: (name: string) => string }

/** Ordinal geht vor wenigen Stufen; `null`, wenn keine der Spalten gestuft ist. */
export function stufenGrund(namen: string[], c: StufenCtx): StufenGrund | null {
  const bez = (n: string) => c.bezeichnung?.(n) ?? n;
  const ord = namen.filter(n => c.ordinal?.(n));
  if (ord.length) return { art: 'ordinal', spalten: ord.map(bez) };
  const wenige = namen.filter(n => c.verschieden(n) <= WENIGE_STUFEN);
  if (wenige.length) return { art: 'stufen', spalten: wenige.map(bez), stufen: groesste(wenige.map(n => c.verschieden(n))) };
  return null;
}
