/**
 * Redeanteile je Person (Fachblatt Stufe 4, 4B). Wort = Treffer von `[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*`.
 * Vor dem Zählen fallen Zeitmarken und Klammer-Anmerkungen `( … )` und `[ … ]` weg (auch verschachtelt).
 */
import type { Dokument } from './qualprojekt';
import { dez } from '../i18n/profil';
import { alleInhalte, MARKE_ALLE } from './transkript-text';

const WORT = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;
const KLAMMER = /\([^()]*\)|\[[^[\]]*\]/g;

export function zaehleWoerter(text: string): number {
  let t = String(text ?? '').replace(MARKE_ALLE, ' ');
  for (let vorher = ''; vorher !== t;) { vorher = t; t = t.replace(KLAMMER, ' '); }
  return (t.match(WORT) ?? []).length;
}

/** Schlüssel = `transkript.sprecher[].id`; gleicher Name = dieselbe Person. */
export type Zuordnung = Record<string, { name: string; rolle?: string }>;

export interface RedeanteilZeile {
  person: string; rolle?: string;
  beitraege: number; woerter: number; anteilWoerter: number;
  sprechzeitMs: number | null; anteilZeit: number | null;
}

const eineStelle = (x: number): number => Math.round(x * 1000) / 10;

export function redeanteile(dok: Dokument, zuordnung?: Zuordnung): RedeanteilZeile[] {
  const t = dok.transkript;
  if (!t) return [];
  const inhalte = alleInhalte(dok);
  const alleMitZeit = t.abschnitte.length > 0 && t.abschnitte.every((a) => a.zeitMs !== undefined);
  const personen = new Map<string, { rolle?: string; beitraege: number; woerter: number; zeit: number }>();
  t.abschnitte.forEach((a, i) => {
    if (!a.sprecher) return;
    const sp = t.sprecher.find((x) => x.id === a.sprecher);
    const z = zuordnung?.[a.sprecher];
    const name = z?.name ?? sp?.name ?? a.sprecher;
    const rolle = z ? z.rolle : sp?.rolle;
    const p = personen.get(name) ?? { rolle, beitraege: 0, woerter: 0, zeit: 0 };
    if (p.rolle === undefined && rolle !== undefined) p.rolle = rolle;
    p.beitraege += 1;
    p.woerter += zaehleWoerter(inhalte[i]!);
    if (alleMitZeit) {
      const ende = a.bisMs ?? t.abschnitte[i + 1]?.zeitMs;
      if (ende !== undefined) p.zeit += Math.max(0, ende - a.zeitMs!);
    }
    personen.set(name, p);
  });
  const summeW = [...personen.values()].reduce((s, p) => s + p.woerter, 0);
  const summeZ = [...personen.values()].reduce((s, p) => s + p.zeit, 0);
  return [...personen.entries()].map(([person, p]) => ({
    person, ...(p.rolle !== undefined ? { rolle: p.rolle } : {}),
    beitraege: p.beitraege, woerter: p.woerter,
    anteilWoerter: summeW > 0 ? eineStelle(p.woerter / summeW) : 0,
    sprechzeitMs: alleMitZeit ? p.zeit : null,
    anteilZeit: alleMitZeit && summeZ > 0 ? eineStelle(p.zeit / summeZ) : null
  }));
}

/** Zahl mit dem Dezimalzeichen des Profils. */
const zahl = (n: number | null, stellen?: number): string => (n === null ? '' : dez(stellen === undefined ? String(n) : n.toFixed(stellen)));
const TRENNER = (): string => (dez('1.5') === '1,5' ? ';' : ',');

/** Kopfzeile und Zellen als Text: wie in CSV und Word. */
export function redeanteileKopf(sprache: string): string[] {
  return sprache === 'de'
    ? ['Person', 'Rolle', 'Beiträge', 'Wörter', 'Anteil Wörter (%)', 'Sprechzeit (s)', 'Anteil Zeit (%)']
    : ['Person', 'Role', 'Contributions', 'Words', 'Share of words (%)', 'Speaking time (s)', 'Share of time (%)'];
}
export function redeanteileZellen(z: RedeanteilZeile): string[] {
  return [z.person, z.rolle ?? '', String(z.beitraege), String(z.woerter), zahl(z.anteilWoerter, 1), z.sprechzeitMs === null ? '' : zahl(z.sprechzeitMs / 1000, 1), zahl(z.anteilZeit, 1)];
}

/** Ein Wert, der eine Tabellenkalkulation als Formel lesen würde, bekommt ein Hochkomma davor. */
const csvZelle = (t: string, trenner: string): string => {
  const s = /^[=+\-@\t\r]/.test(t) && !/^-?\d+(?:[.,]\d+)?$/.test(t) ? `'${t}` : t;
  return /["\n\r]/.test(s) || s.includes(trenner) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV (UTF-8, ohne BOM); Trenner `;` bei Dezimalkomma, sonst `,`; Zahlen mit dem Profil. */
export function redeanteileCsv(zeilen: RedeanteilZeile[], sprache: string): string {
  const tr = TRENNER();
  const zeile = (zellen: string[]) => zellen.map((c) => csvZelle(c, tr)).join(tr);
  return [zeile(redeanteileKopf(sprache)), ...zeilen.map((z) => zeile(redeanteileZellen(z)))].join('\r\n') + '\r\n';
}
