/**
 * Rücklauf nach AAPOR (Standard Definitions, 10. Ausgabe 2023, S. 85-88), Paket 3E. Reine Funktionen, keine Oberfläche.
 * Zuordnung: vollständig = I, teilweise = P, nicht zurück = NC; R = O = UH = UR = UO = 0.
 * RR1 = I / (I + P + NC), RR2 = (I + P) / (I + P + NC). Ohne Liste ausgegebener Codes gibt es keine Quote (kein Stichprobenrahmen).
 */
import type { FragebogenPlan } from './fragebogenplan';
import { zeigen, type Antworten } from './fragebogenplan-bedingung';
import { normalisiereCode } from './einmalcodes';
import { L } from './sitzung.svelte';

export interface AntwortsatzMin { antwortId: string; code?: string; werte: Antworten; abgebrochen?: boolean }
export type Zustand = 'vollstaendig' | 'teilweise' | 'nichtZurueck' | 'unbekannt' | 'doppelt';
export interface CodeEintrag { code: string; ausgegeben?: boolean }
export interface KatZeile { code: string; zustand: Zustand; wertung: Zustand; anteil: number | null; antwortIds: string[] }
export interface Kategorisierung {
  anzahl: number; grenze: number; keineQuote: boolean; grund?: string; je: KatZeile[]; ohneCode: string[];
  zahlen: { ausgegeben: number; vollstaendig: number; teilweise: number; nichtZurueck: number; doppelt: number; unbekannt: number } | null;
}

export function entdopple<S extends { antwortId: string }>(saetze: S[]): { saetze: S[]; doppelt: { antwortId: string; anzahl: number }[] } {
  const anzahl = new Map<string, number>();
  const rest: S[] = [];
  for (const s of saetze) {
    const n = anzahl.get(s.antwortId) ?? 0;
    anzahl.set(s.antwortId, n + 1);
    if (n === 0) rest.push(s);
  }
  const doppelt = [...anzahl].filter(([, n]) => n >= 2).map(([antwortId, n]) => ({ antwortId, anzahl: n }));
  return { saetze: rest, doppelt };
}

const beantwortet = (v: unknown): boolean =>
  !(v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0) || (typeof v === 'number' && Number.isNaN(v)));

/** Anteil beantworteter unter den gezeigten Pflichtfragen (ersatzweise allen gezeigten Fragen); 1, wenn es nichts zu beantworten gibt. */
function anteilVon(plan: FragebogenPlan, werte: Antworten): number {
  const pflicht: string[] = [], alle: string[] = [];
  for (const seite of plan.elemente) {
    for (const e of seite.elemente) {
      if (e.art === 'hinweis' || !zeigen(e, werte, plan)) continue;
      const schluessel = e.art === 'block' ? e.items.map(i => i.id) : [e.id];
      alle.push(...schluessel);
      if (e.pflicht) pflicht.push(...schluessel);
    }
  }
  const liste = pflicht.length ? pflicht : alle;
  if (!liste.length) return 1;
  return liste.filter(id => beantwortet(werte[id])).length / liste.length;
}

export function kategorisiere(plan: FragebogenPlan, saetze: AntwortsatzMin[], codes: CodeEintrag[] | undefined, grenze = 0.8): Kategorisierung {
  const { saetze: einzeln } = entdopple(saetze);
  const ausgegeben: string[] = [];
  for (const c of codes ?? []) {
    if (c.ausgegeben === false) continue;
    const k = normalisiereCode(c.code);
    if (k && !ausgegeben.includes(k)) ausgegeben.push(k);
  }
  const ohneCode: string[] = [];
  const gruppen = new Map<string, { satz: AntwortsatzMin; anteil: number }[]>();
  for (const s of einzeln) {
    const k = normalisiereCode(s.code ?? '');
    if (!k) { ohneCode.push(s.antwortId); continue; }
    const g = gruppen.get(k) ?? [];
    g.push({ satz: s, anteil: anteilVon(plan, s.werte) });
    gruppen.set(k, g);
  }
  if (!ausgegeben.length) {
    return {
      anzahl: einzeln.length, grenze, keineQuote: true, ohneCode, je: [], zahlen: null,
      grund: L(
        'Ohne ausgegebene Einmal-Codes gibt es keinen Stichprobenrahmen (die Liste derer, die eingeladen wurden); darum lässt sich keine Rücklaufquote berechnen.',
        'Without issued one-time codes there is no sampling frame (the list of people invited), so no response rate can be calculated.',
      ),
    };
  }
  const einstufung = (a: number): Zustand => a >= grenze ? 'vollstaendig' : a > 0 ? 'teilweise' : 'nichtZurueck';
  const je: KatZeile[] = [];
  for (const code of ausgegeben) {
    const g = gruppen.get(code);
    if (!g) { je.push({ code, zustand: 'nichtZurueck', wertung: 'nichtZurueck', anteil: null, antwortIds: [] }); continue; }
    const beste = Math.max(...g.map(x => x.anteil));
    const wertung = einstufung(beste);
    je.push({ code, zustand: g.length > 1 ? 'doppelt' : wertung, wertung, anteil: beste, antwortIds: g.map(x => x.satz.antwortId) });
  }
  for (const [code, g] of gruppen) {
    if (ausgegeben.includes(code)) continue;
    je.push({ code, zustand: 'unbekannt', wertung: 'unbekannt', anteil: Math.max(...g.map(x => x.anteil)), antwortIds: g.map(x => x.satz.antwortId) });
  }
  const zahlen = { ausgegeben: ausgegeben.length, vollstaendig: 0, teilweise: 0, nichtZurueck: 0, doppelt: 0, unbekannt: 0 };
  for (const z of je) {
    if (z.wertung === 'unbekannt') zahlen.unbekannt++;
    else zahlen[z.wertung as 'vollstaendig' | 'teilweise' | 'nichtZurueck']++;
    if (z.zustand === 'doppelt') zahlen.doppelt++;
  }
  return { anzahl: einzeln.length, grenze, keineQuote: false, je, ohneCode, zahlen };
}

export function rr1(k: Kategorisierung): number | null {
  if (!k.zahlen || k.zahlen.ausgegeben === 0) return null;
  return k.zahlen.vollstaendig / k.zahlen.ausgegeben;
}
export function rr2(k: Kategorisierung): number | null {
  if (!k.zahlen || k.zahlen.ausgegeben === 0) return null;
  return (k.zahlen.vollstaendig + k.zahlen.teilweise) / k.zahlen.ausgegeben;
}
