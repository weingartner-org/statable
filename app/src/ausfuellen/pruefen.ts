/**
 * Prüfung einer Seite (Pflicht, Plausibilität, Zahlenbereich). Rein, ohne DOM: gleiche Antworten ergeben gleiche Fehler.
 * Text aus dem Plan wird nur als Text weitergegeben (kein HTML).
 */
import { zeigen, type Antworten } from '../lib/fragebogenplan-bedingung';
import type { FragebogenPlan, Frage, Lok, Seite } from '../lib/fragebogenplan';
import { t } from './texte';

export interface SeitenFehler { id: string; text: string }
export type Modus = 'ausfuellen' | 'eingabe' | 'vorschau';

/** Text in der Sprache; fehlt sie, der Text der ersten Planspräche, dann irgendeiner (eine leere Beschriftung wäre schlimmer als eine fremdsprachige). */
export function lok(l: Lok | undefined, sprache: string, plan?: FragebogenPlan): string {
  if (!l) return '';
  return l[sprache] || (plan ? l[plan.sprachen[0] ?? ''] : '') || Object.values(l).find(x => x) || '';
}

export const fehlt = (v: unknown): boolean =>
  v === undefined || v === null || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0) || (typeof v === 'number' && Number.isNaN(v));

/** Code der Option „Anderes, und zwar“: eins über dem höchsten Code der Liste (wie beim XLSForm-Import). */
export function andersCode(plan: FragebogenPlan, f: Frage): number {
  const l = plan.antwortlisten.find(x => x.id === f.liste);
  return Math.max(0, ...(l?.optionen.map(o => o.wert) ?? [])) + 1;
}

export function pruefeSeite(plan: FragebogenPlan, seite: Seite, antworten: Antworten, sprache = 'de', modus: Modus = 'ausfuellen'): SeitenFehler[] {
  const aus: SeitenFehler[] = [];
  const standard = `${t(sprache, 'pflicht')}: ${t(sprache, 'bitteBeantworten')}`;
  for (const el of seite.elemente) {
    if (el.art === 'hinweis' || !zeigen(el, antworten, plan)) continue;
    const meldung = (el.pflicht?.meldung ? el.pflicht.meldung[sprache] : '') || standard;
    const pflicht = !!el.pflicht?.an && modus !== 'eingabe';
    if (el.art === 'block') {
      if (pflicht && el.items.some(i => fehlt(antworten[i.id]))) aus.push({ id: el.id, text: meldung });
      continue;
    }
    const v = antworten[el.id];
    let leer = fehlt(v);
    if (!leer && el.anders?.an && fehlt(antworten[`${el.id}:anders`])) {
      const ac = andersCode(plan, el);
      leer = Array.isArray(v) ? v.includes(ac) : v === ac;
    }
    if (leer) { if (pflicht) aus.push({ id: el.id, text: meldung }); continue; }
    if (el.gueltig && !zeigen({ art: 'hinweis', id: `${el.id}#gueltig`, name: '', text: {}, wennGezeigt: el.gueltig.regel }, antworten)) {
      aus.push({ id: el.id, text: lok(el.gueltig.meldung, sprache, plan) }); continue;
    }
    if ((el.typ === 'zahl' || el.typ === 'regler') && typeof v === 'number' && el.zahl) {
      const { min, max, ganz } = el.zahl;
      const text = ganz && !Number.isInteger(v) ? t(sprache, 'zahlGanz')
        : typeof min === 'number' && typeof max === 'number' && (v < min || v > max) ? t(sprache, 'zahlBereich', { min, max })
        : typeof min === 'number' && v < min ? t(sprache, 'zahlMin', { min })
        : typeof max === 'number' && v > max ? t(sprache, 'zahlMax', { max }) : '';
      if (text) aus.push({ id: el.id, text });
    }
  }
  return aus;
}
