/**
 * Bedingungen des Fragebogen-Plans auswerten (Paket 2A): `zeigen` (wird ein Element gezeigt?) und `unerreichbar` (Bedingungen, die nie wahr werden können).
 * Nur Typen aus fragebogenplan.ts (kein Laufzeit-Import): kein Zyklus. Bedingungen sind Bäume, nie Text; nichts wird ausgeführt.
 */
import type { Antwortliste, Bedingung, Block, Element, Frage, FragebogenPlan, Hinweis, Seite } from './fragebogenplan';

/** Antworten je Frage-id: einfach/zahl eine Zahl, mehrfach die Liste der angekreuzten Codes, text ein Text. */
export type Antworten = Record<string, number | number[] | string | null | undefined>;

const fehlt = (v: unknown): boolean => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0) || (typeof v === 'number' && Number.isNaN(v));
const zahlVon = (v: unknown): number | null => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  return null;
};
const vergleich = (a: number, ist: '=' | '≠' | '<' | '≤' | '>' | '≥', b: number): boolean =>
  ist === '=' ? a === b : ist === '≠' ? a !== b : ist === '<' ? a < b : ist === '≤' ? a <= b : ist === '>' ? a > b : a >= b;

const hatFrage = (b: Bedingung): b is Extract<Bedingung, { frage: string }> => 'frage' in b;

/** Alle Elemente samt Seite, in Plan-Reihenfolge. */
function indexVon(plan: FragebogenPlan): { el: Map<string, Element | Seite>; seiteVon: Map<string, Seite> } {
  const el = new Map<string, Element | Seite>(), seiteVon = new Map<string, Seite>();
  for (const s of plan.elemente) { el.set(s.id, s); for (const e of s.elemente) { el.set(e.id, e); seiteVon.set(e.id, s); } }
  return { el, seiteVon };
}

/**
 * Wird das Element gezeigt? Ohne `wennGezeigt` immer. Eine fehlende Antwort macht jeden Vergleich falsch (auch ≠), `beantwortet: false` wahr.
 * Mit `plan` gilt die Kaskade: Eine verborgene Frage (eigene Bedingung falsch oder verborgene Seite) gilt für andere Bedingungen als unbeantwortet,
 * auch wenn in `antworten` noch ein alter Wert steht; ein Element auf einer verborgenen Seite wird nicht gezeigt. Ohne `plan` zählt nur die direkte Bedingung.
 */
export function zeigen(element: Element | Seite, antworten: Antworten, plan?: FragebogenPlan): boolean {
  const idx = plan ? indexVon(plan) : null;
  const unterwegs = new Set<string>();   // Schutz vor Kreisen in fremden Plänen
  const sichtbar = (e: Element | Seite): boolean => {
    if (unterwegs.has(e.id)) return true;
    unterwegs.add(e.id);
    try {
      const seite = idx && e.art !== 'seite' ? idx.seiteVon.get(e.id) : undefined;
      if (seite && !sichtbar(seite)) return false;
      return !e.wennGezeigt || auswerten(e.wennGezeigt);
    } finally { unterwegs.delete(e.id); }
  };
  const antwort = (id: string): unknown => {
    const ziel = idx?.el.get(id);
    if (ziel && !sichtbar(ziel)) return undefined;
    return antworten[id];
  };
  const auswerten = (b: Bedingung): boolean => {
    if ('und' in b) return b.und.every(auswerten);
    if ('oder' in b) return b.oder.some(auswerten);
    if ('nicht' in b) return !auswerten(b.nicht);
    const v = antwort(b.frage);
    if ('beantwortet' in b) return b.beantwortet === !fehlt(v);
    if (fehlt(v)) return false;
    if ('gewaehlt' in b) return Array.isArray(v) ? v.includes(b.gewaehlt) : typeof v === 'number' && v === b.gewaehlt;
    if (Array.isArray(v)) return false;
    const n = zahlVon(v);
    return n !== null && vergleich(n, b.ist, b.wert);
  };
  return sichtbar(element);
}

/* ------------------------------------------------------------------ unerreichbar */
type Vgl = { ist: '=' | '≠' | '<' | '≤' | '>' | '≥'; wert: number };
type Bereich = { art: 'menge'; werte: number[] } | { art: 'strecke'; min?: number; max?: number; ganz: boolean };

/** Wertebereich der Antworten einer Frage: Codes der Liste, `zahl.min/max`; sonst unbegrenzt (nur der Vergleich der Bedingungen untereinander zählt). */
function bereichVon(f: Frage | Block | Hinweis | Seite | undefined, listen: Map<string, Antwortliste>): Bereich {
  if (f && f.art === 'frage') {
    if ((f.typ === 'einfach') && f.liste && listen.has(f.liste)) return { art: 'menge', werte: listen.get(f.liste)!.optionen.map(o => o.wert) };
    if (f.typ === 'einwilligung') return { art: 'menge', werte: [1] };
    if ((f.typ === 'zahl' || f.typ === 'regler') && f.zahl) return { art: 'strecke', ...(typeof f.zahl.min === 'number' ? { min: f.zahl.min } : {}), ...(typeof f.zahl.max === 'number' ? { max: f.zahl.max } : {}), ganz: f.zahl.ganz === true };
  }
  return { art: 'strecke', ganz: false };
}

/** Bleibt von dem Bereich nach allen Vergleichen nichts übrig? */
function leer(b: Bereich, vgl: Vgl[]): boolean {
  if (b.art === 'menge') return !b.werte.some(w => vgl.every(v => vergleich(w, v.ist, v.wert)));
  let lo = b.min ?? -Infinity, hi = b.max ?? Infinity, loOffen = false, hiOffen = false;
  const aus: number[] = [];
  const unten = (w: number, offen: boolean) => { if (w > lo || (w === lo && offen)) { lo = w; loOffen = offen; } };
  const oben = (w: number, offen: boolean) => { if (w < hi || (w === hi && offen)) { hi = w; hiOffen = offen; } };
  for (const v of vgl) {
    if (v.ist === '=') { unten(v.wert, false); oben(v.wert, false); }
    else if (v.ist === '≠') aus.push(v.wert);
    else if (v.ist === '>') unten(v.wert, true);
    else if (v.ist === '≥') unten(v.wert, false);
    else if (v.ist === '<') oben(v.wert, true);
    else oben(v.wert, false);
  }
  if (b.ganz) {   // nur ganze Zahlen: die Grenzen auf ganze Zahlen ziehen
    if (Number.isFinite(lo)) { lo = loOffen && Number.isInteger(lo) ? lo + 1 : Math.ceil(lo); loOffen = false; }
    if (Number.isFinite(hi)) { hi = hiOffen && Number.isInteger(hi) ? hi - 1 : Math.floor(hi); hiOffen = false; }
  }
  if (lo > hi || (lo === hi && (loOffen || hiOffen))) return true;
  return lo === hi && aus.includes(lo);
}

/**
 * Ids der Elemente, deren Bedingung nie wahr werden kann. Feste Verfahren, kein Löser: (1) eine `und`-Verknüpfung von Vergleichen auf dieselbe Frage mit leerem Bereich,
 * auch ein einzelner Vergleich außerhalb des Wertebereichs (`alter > 150` bei `max = 120`, Code nicht in der Liste); (2) `gewaehlt` mit einem Code, der nicht in der Liste steht;
 * (3) Verweis auf eine Frage, die selbst unerreichbar ist. `oder` nur, wenn alle Zweige es sind; `nicht` wird nicht untersucht.
 * Ein Element auf einer unerreichbaren Seite ist ebenfalls unerreichbar (eine verborgene Seite verbirgt ihre Fragen). Reihenfolge wie im Plan.
 */
export function unerreichbar(plan: FragebogenPlan): string[] {
  const { el } = indexVon(plan);
  const listen = new Map(plan.antwortlisten.map(l => [l.id, l]));
  const aus: string[] = [], tot = new Set<string>();
  const markiere = (id: string) => { if (!tot.has(id)) { tot.add(id); aus.push(id); } };

  /** Kann die Bedingung nie wahr werden? */
  const nie = (b: Bedingung): boolean => {
    if ('oder' in b) return b.oder.every(nie);
    if ('nicht' in b) return false;
    if ('und' in b) {
      if (b.und.some(nie)) return true;
      const je = new Map<string, Vgl[]>();
      const sammle = (x: Bedingung) => {
        if ('und' in x) x.und.forEach(sammle);
        else if (hatFrage(x) && 'ist' in x) { const l = je.get(x.frage) ?? []; l.push({ ist: x.ist, wert: x.wert }); je.set(x.frage, l); }
      };
      sammle(b);
      for (const [id, vgl] of je) if (leer(bereichVon(el.get(id), listen), vgl)) return true;
      return false;
    }
    if (tot.has(b.frage) && !('beantwortet' in b && b.beantwortet === false)) return true;
    if ('gewaehlt' in b) {
      const f = el.get(b.frage);
      return !!f && f.art === 'frage' && !!f.liste && listen.has(f.liste) && !listen.get(f.liste)!.optionen.some(o => o.wert === b.gewaehlt);
    }
    if ('ist' in b) return leer(bereichVon(el.get(b.frage), listen), [{ ist: b.ist, wert: b.wert }]);
    return false;
  };

  for (const s of plan.elemente) {
    const seiteTot = !!s.wennGezeigt && nie(s.wennGezeigt);
    if (seiteTot) markiere(s.id);
    for (const e of s.elemente) if (seiteTot || (e.wennGezeigt && nie(e.wennGezeigt))) markiere(e.id);
  }
  return aus;
}
