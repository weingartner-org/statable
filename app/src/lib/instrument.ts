/**
 * Instrumentenentwicklung (Stufe A2, Mixed Methods „aufbauen“): Kategorie (Code oder Thema) → Item mit Herkunft → Fragebogen-Plan → nach der
 * Erhebung Trennschärfe und Alpha ohne Item → Joint Display „Kategorie, Item, Herkunft, Trennschärfe“.
 * Die Items schreibt immer die Person; Statable formuliert nichts. Ladungen kommen aus der Faktorenanalyse in Statable (eigener Weg, nicht hier).
 *
 * Item-Analyse (wie SPSS RELIABILITY, psych::alpha): nur Zeilen mit Werten in allen Items der Kategorie (listenweise). Umgepolte Items werden vor dem
 * Rechnen gedreht: min + max − Wert, mit min und max der Antwortliste (sonst kleinster und größter Wert aller Items der Kategorie).
 * Cronbachs Alpha = k/(k − 1) · (1 − Σ Var(Item) / Var(Summe)), Varianzen mit n − 1. Trennschärfe = korrigierte Item-Skala-Korrelation
 * (Item mit der Summe der übrigen Items). Alpha ohne Item braucht mindestens drei Items. Sollwerte: scripts/ausbau-a2-erwartet.R.
 */
import { vorlageEinfuegen } from './fragebogenplan-vorlagen';
import { neuerPlan, neueId } from './fragebogenplan-editor';
import type { Block, FragebogenPlan } from './fragebogenplan';
import type { ItemEntwurf, QualProjekt } from './qualprojekt';

/* ---------- Items ändern ---------- */

export function legeItemAn(q: QualProjekt, text: string, herkunft: ItemEntwurf['herkunft'], o: { beleg?: string; umgepolt?: boolean } = {}, jetzt = Date.now()): { q: QualProjekt; id: string } {
  const id = neueId();
  const it: ItemEntwurf = { id, text, erstellt: jetzt, geaendert: jetzt, ...(herkunft ? { herkunft } : {}), ...(o.beleg ? { beleg: o.beleg } : {}), ...(o.umgepolt ? { umgepolt: true } : {}), ...(q.ich ? { kodierende: q.ich } : {}) };
  return { q: { ...q, instrument: [...(q.instrument ?? []), it] }, id };
}
export function aendereItem(q: QualProjekt, id: string, f: (it: ItemEntwurf) => ItemEntwurf, jetzt = Date.now()): QualProjekt {
  return { ...q, instrument: (q.instrument ?? []).map(it => (it.id === id ? { ...f(it), geaendert: jetzt } : it)) };
}
export function entferneItem(q: QualProjekt, id: string): QualProjekt {
  const r = { ...q, instrument: (q.instrument ?? []).filter(it => it.id !== id) };
  if (!r.instrument.length) delete (r as Partial<QualProjekt>).instrument;
  return r;
}

/* ---------- In einen Fragebogen-Plan ---------- */

/**
 * Legt die Items als Blöcke mit der Antwortliste „Zustimmung, 5 Stufen“ in einen Plan: ein Block je Kategorie, Item-Texte wörtlich von der Person,
 * Umpolung im Kodebuch vermerkt. Ohne `plan` entsteht ein neuer Plan. Items, die schon in einem Plan stehen, werden nicht noch einmal übernommen.
 * Gibt den Plan und die Zuordnung Item-Entwurf → Plan-Item zurück (für `ItemEntwurf.plan`).
 */
export function itemsInPlan(q: QualProjekt, plan: FragebogenPlan | undefined, sprache: 'de' | 'en', titel: { de: string; en: string }): { plan: FragebogenPlan; zuordnung: Record<string, { plan: string; item: string }>; anzahl: number } {
  let p = plan ?? neuerPlan(titel, sprache === 'de' ? ['de', 'en'] : ['en', 'de']);
  const offen = (q.instrument ?? []).filter(it => !it.plan && it.text.trim());
  const gruppen = new Map<string, ItemEntwurf[]>();
  for (const it of offen) { const k = it.herkunft ? `${it.herkunft.art}:${it.herkunft.id}` : ''; const l = gruppen.get(k); if (l) l.push(it); else gruppen.set(k, [it]); }
  const zuordnung: Record<string, { plan: string; item: string }> = {};
  for (const [k, items] of gruppen) {
    const auswahl = p.elemente.at(-1)?.elemente.at(-1)?.id ?? p.elemente.at(-1)?.id ?? null;
    const v = vorlageEinfuegen(p, 'zustimmung5', auswahl, { block: true });
    p = v.plan;
    const block = p.elemente.flatMap(s => s.elemente).find(e => e.id === v.id) as Block | undefined;
    if (!block) continue;
    // Blockname bleibt der Vorschlag von Statable (eindeutig); die Kategorie steht in der Herkunft des Item-Entwurfs
    block.items = items.map((it, i) => {
      const iid = neueId();
      zuordnung[it.id] = { plan: p.id, item: iid };
      return { id: iid, name: `i${i + 1}`, text: Object.fromEntries(p.sprachen.map(s => [s, it.text])), ...(it.umgepolt ? { umgepolt: true } : {}) };
    });
  }
  p = { ...p, geaendert: Date.now() };
  return { plan: p, zuordnung, anzahl: Object.keys(zuordnung).length };
}

export function kategorieName(q: QualProjekt, schl: string): string {
  const [art, id] = [schl.slice(0, schl.indexOf(':')), schl.slice(schl.indexOf(':') + 1)];
  if (art === 'code') return q.codes.find(c => c.id === id)?.name ?? '';
  if (art === 'thema') return (q.themen ?? []).find(t => t.id === id)?.name ?? '';
  return '';
}

/* ---------- Item-Analyse ---------- */

export interface ItemKennwerte { m: number | null; sd: number | null; trennschaerfe: number | null; alphaOhne: number | null }
export interface ItemAnalyse { n: number; k: number; alpha: number | null; items: ItemKennwerte[] }

const mittel = (x: number[]) => x.reduce((a, b) => a + b, 0) / x.length;
const varianz = (x: number[]) => { if (x.length < 2) return NaN; const m = mittel(x); return x.reduce((a, b) => a + (b - m) ** 2, 0) / (x.length - 1); };
function korrelation(x: number[], y: number[]): number | null {
  const mx = mittel(x), my = mittel(y);
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < x.length; i++) { const a = x[i]! - mx, b = y[i]! - my; sxy += a * b; sxx += a * a; syy += b * b; }
  return sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : null;
}
function alpha(spalten: number[][]): number | null {
  const k = spalten.length; if (k < 2 || !spalten[0] || spalten[0].length < 2) return null;
  const summe = spalten[0].map((_, i) => spalten.reduce((a, s) => a + s[i]!, 0));
  const vs = varianz(summe); if (!(vs > 0)) return null;
  return (k / (k - 1)) * (1 - spalten.reduce((a, s) => a + varianz(s), 0) / vs);
}

/**
 * `werte[j]` = Werte des Items j je Zeile (null = fehlend). `umgepolt[j]` dreht das Item. `grenzen` = kleinste und größte Antwortstufe (sonst beobachtet).
 */
export function itemAnalyse(werte: (number | null)[][], umgepolt: boolean[], grenzen?: { min: number; max: number }): ItemAnalyse {
  const k = werte.length;
  const zeilen = k ? werte[0]!.map((_, i) => i).filter(i => werte.every(s => typeof s[i] === 'number' && Number.isFinite(s[i]))) : [];
  const roh = werte.map(s => zeilen.map(i => s[i] as number));
  const alle = roh.flat();
  const lo = grenzen?.min ?? (alle.length ? Math.min(...alle) : 0), hi = grenzen?.max ?? (alle.length ? Math.max(...alle) : 0);
  const x = roh.map((s, j) => (umgepolt[j] ? s.map(v => lo + hi - v) : s));
  const n = zeilen.length;
  const items: ItemKennwerte[] = x.map((s, j) => {
    if (!n) return { m: null, sd: null, trennschaerfe: null, alphaOhne: null };
    const rest = s.map((_, i) => x.reduce((a, t, jj) => (jj === j ? a : a + t[i]!), 0));
    const sd = n < 2 ? null : Math.sqrt(varianz(s));
    return { m: mittel(s), sd, trennschaerfe: k >= 2 && n >= 2 ? korrelation(s, rest) : null, alphaOhne: k >= 3 ? alpha(x.filter((_, jj) => jj !== j)) : null };
  });
  return { n, k, alpha: alpha(x), items };
}
