/**
 * Spalten bedienen (Field-Stufe 3, Daten-Bedienung a-c): Spaltentyp umstellen (Zahl, Text, Datum), Dezimalstellen der Anzeige setzen,
 * Wertelabels auf andere Spalten übertragen. Reine Funktionen auf `Daten`; die Oberfläche (bausteine/SpaltenWerkzeuge.svelte) führt sie über
 * `aendereDaten` (Typ) bzw. `wendeAn` (Anzeige, Labels) aus - je ein Rückgängig-Schritt und ein Protokolleintrag.
 * Sicherheit: Namen und Texte aus Dateien gehen nur durch `zit` / `zitWert` (lib/befehlstext.ts) in einen Befehl, nie als Code.
 */
import { zit, zitWert } from './befehlstext';
import { istFehlend } from './fehlend';
import { textCodes, type Wert } from './eingabe';
import { profilDatum } from './einlesen';
import type { Daten } from './umformen';
import type { Spalte } from './verzeichnis';

export type Zielart = 'zahl' | 'text' | 'datum';
export type UmwandlungGrund = 'gleich' | 'zeit' | 'spalte';
export interface Nichtumwandelbar { zeile: number; wert: string }
export interface UmwandlungsPlan {
  ziel: Zielart; spalte: string; grund?: UmwandlungGrund;
  /** Werte nach der Umwandlung (null = fehlend) */ werte: Wert[];
  /** Spalte nach der Umwandlung (Name bleibt) */ neu: Spalte;
  /** Zellen mit Wert, die sich nicht umwandeln lassen: sie werden fehlend (Zeile 0-basiert) */ nichtUmwandelbar: Nichtumwandelbar[];
  /** Zellen mit Wert, die umgewandelt wurden */ umgewandelt: number;
  /** Wertelabels, die wegfallen (Schlüssel passen nicht zur neuen Art) */ verlorenLabels: number;
  /** Zahlen, die als „keine Angabe“ gekennzeichnet waren und fehlend bleiben */ fehlendBleibt: number;
}

const ZEIT_FORMAT = /^(YMDHMS|DATETIME|TIME|DTIME|MTIME)/i;
const pad = (n: number, l = 2) => String(n).padStart(l, '0');
function tagGibt(y: number, m: number, d: number): boolean {
  if (y < 1583 || y > 9999 || m < 1 || m > 12 || d < 1) return false;
  const t = new Date(Date.UTC(2000, m - 1, d)); t.setUTCFullYear(y, m - 1, d);
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}
const datumText = (y: number, m: number, d: number) => `${pad(d)}.${pad(m)}.${pad(y, 4)}`;

/** Ein Datum aus Text: JJJJ-MM-TT, sonst in der Schreibweise der Sprache (31.12.2026 / 12/31/2026), sonst TT.MM.JJJJ. `format`: ADATE heißt Monat zuerst. null, wenn nicht lesbar. */
export function liesDatumText(t: string, format = ''): { y: number; m: number; d: number } | null {
  const s = t.trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (m) { const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]; return tagGibt(y, mo, d) ? { y, m: mo, d } : null; }
  if (/^ADATE/i.test(format)) m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s);
  if (/^ADATE/i.test(format) && m) { const [mo, d, y] = [Number(m[1]), Number(m[2]), Number(m[3])]; return tagGibt(y, mo, d) ? { y, m: mo, d } : null; }
  const p = profilDatum(s);
  if (p && tagGibt(p.jahr, p.mon, p.tag)) return { y: p.jahr, m: p.mon, d: p.tag };
  m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(s);
  if (m) { const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])]; return tagGibt(y, mo, d) ? { y, m: mo, d } : null; }
  return null;
}

/** Eine Zahl aus Text: Komma oder Punkt als Dezimaltrenner, kein Tausenderpunkt (mehrdeutig). null, wenn nicht lesbar. */
export function liesZahlText(t: string): number | null {
  const s = t.trim();
  if (!/^[+-]?(\d+([.,]\d*)?|[.,]\d+)([eE][+-]?\d+)?$/.test(s)) return null;
  const v = Number(s.replace(',', '.'));
  return Number.isFinite(v) ? v : null;
}
const stellen = (v: number) => { const t = String(v), k = t.indexOf('.'); return k < 0 || /e/i.test(t) ? 0 : Math.min(6, t.length - k - 1); };
const hatLeer = (t: string, sp: Spalte) => t.trim() === '' || textCodes(sp.fehlendText).includes(t.trim());

/** Was die Umwandlung einer Spalte in eine andere Art täte - ohne etwas zu ändern (für die Vorschau). */
export function umwandeln(d: Daten, name: string, ziel: Zielart): UmwandlungsPlan {
  const i = d.spalten.findIndex(x => x.name === name);
  const leer = (sp: Spalte, grund: UmwandlungGrund): UmwandlungsPlan => ({ ziel, spalte: name, grund, werte: d.zeilen.map(z => z[Math.max(i, 0)] ?? null), neu: sp, nichtUmwandelbar: [], umgewandelt: 0, verlorenLabels: 0, fehlendBleibt: 0 });
  if (i < 0) return leer({ name, bezeichnung: '', art: 'zahl', niveau: 'metrisch', format: '', fehlend: [], fehlendText: '', werteLabels: {} }, 'spalte');
  const sp = d.spalten[i]!;
  if (sp.art === ziel) return leer(sp, 'gleich');
  if (sp.art === 'datum' && ZEIT_FORMAT.test(sp.format)) return leer(sp, 'zeit');
  const nicht: Nichtumwandelbar[] = [];
  let ok = 0, fehlendBleibt = 0;
  const werte: Wert[] = d.zeilen.map((z, r): Wert => {
    const v = z[i] ?? null;
    if (v === null || v === undefined) return null;
    const zeig = String(v);
    const scheitert = (): null => { nicht.push({ zeile: r, wert: zeig }); return null; };
    if (sp.art === 'zahl') {
      const n = v as number;
      if (typeof n !== 'number' || Number.isNaN(n)) return null;
      if (istFehlend(sp, n)) { fehlendBleibt++; return null; }
      if (ziel === 'text') { ok++; return String(n); }
      // Zahl → Datum: JJJJMMTT
      const t = String(n);
      if (!Number.isInteger(n) || !/^\d{8}$/.test(t)) return scheitert();
      const [y, mo, da] = [Number(t.slice(0, 4)), Number(t.slice(4, 6)), Number(t.slice(6, 8))];
      if (!tagGibt(y, mo, da)) return scheitert();
      ok++; return datumText(y, mo, da);
    }
    const t = String(v);
    if (sp.art === 'text') {
      if (hatLeer(t, sp)) return null;
      if (ziel === 'zahl') { const n = liesZahlText(t); if (n === null) return scheitert(); ok++; return n; }
      const dt = liesDatumText(t, sp.format); if (!dt) return scheitert(); ok++; return datumText(dt.y, dt.m, dt.d);
    }
    // Datum → Text oder Zahl (JJJJMMTT)
    if (t.trim() === '') return null;
    if (ziel === 'text') { ok++; return t; }
    const dt = liesDatumText(t, sp.format); if (!dt) return scheitert(); ok++; return Number(`${pad(dt.y, 4)}${pad(dt.m)}${pad(dt.d)}`);
  });
  // neue Spalte: Name, Bezeichnung, Reihenfolge bleiben; Labels und Fehlend-Codes passen nicht mehr
  const gueltigeLabels = ziel === 'zahl' && sp.art === 'text'
    ? Object.fromEntries(Object.entries(sp.werteLabels).filter(([w]) => liesZahlText(w) !== null).map(([w, l]) => [String(liesZahlText(w)), l]))
    : ziel === 'text' && sp.art === 'zahl' ? Object.fromEntries(Object.entries(sp.werteLabels).map(([w, l]) => [String(Number(w)), l])) : {};
  const verloren = Object.keys(sp.werteLabels).length - Object.keys(gueltigeLabels).length;
  const zahlen = werte.filter((v): v is number => typeof v === 'number');
  const dez = Math.max(0, ...zahlen.map(stellen));
  const neu: Spalte = {
    name: sp.name, bezeichnung: sp.bezeichnung, art: ziel,
    niveau: ziel === 'text' ? 'nominal' : 'metrisch',
    format: ziel === 'zahl' ? `F8.${dez}` : ziel === 'datum' ? 'EDATE10' : `A${Math.max(1, ...werte.map(v => (typeof v === 'string' ? new TextEncoder().encode(v).length : 0)))}`,
    fehlend: [], fehlendText: '', werteLabels: gueltigeLabels
  };
  // Labels von Text → Zahl gelten nur, wenn die Schlüssel Zahlen sind; Text→Text (Datum→Text) hat keine
  return { ziel, spalte: name, werte, neu, nichtUmwandelbar: nicht, umgewandelt: ok, verlorenLabels: ziel === 'datum' ? Object.keys(sp.werteLabels).length : verloren, fehlendBleibt };
}

/** Die Daten mit der umgewandelten Spalte (Reihenfolge der Spalten und Zeilen bleibt). */
export function umwandlungAnwenden(d: Daten, plan: UmwandlungsPlan): Daten {
  const i = d.spalten.findIndex(x => x.name === plan.spalte);
  if (i < 0 || plan.grund) return d;
  return { spalten: d.spalten.map((x, j) => (j === i ? plan.neu : x)), zeilen: d.zeilen.map((z, r) => z.map((v, j) => (j === i ? plan.werte[r] ?? null : v))) };
}

/* ------------------------------------------------------------ Dezimalstellen (nur Anzeige) */
export interface DezimalPlan { syntax: string; spalten: string[]; uebersprungen: string[] }
/** `FORMATS a b (Fw.d).` je Format-Gruppe; die Werte bleiben, nur die Anzeige ändert sich. Nur Zahlenspalten; die Breite reicht für den größten Wert. */
export function dezimalstellenBefehl(d: Daten, namen: string[], stellenZahl: number): DezimalPlan {
  const n = Math.max(0, Math.min(16, Math.trunc(stellenZahl)));
  const gruppen = new Map<string, string[]>(), ok: string[] = [], uebersprungen: string[] = [];
  for (const name of namen) {
    const i = d.spalten.findIndex(x => x.name === name);
    if (i < 0) continue;
    const sp = d.spalten[i]!;
    if (sp.art !== 'zahl') { uebersprungen.push(name); continue; }
    const vorne = /^(F|COMMA|DOT|DOLLAR|PCT|E|N)/.exec(sp.format)?.[1] ?? 'F';
    const art = vorne === 'E' || vorne === 'N' ? 'F' : vorne;   // E und N lassen sich mit Stellen nicht sinnvoll setzen
    const gross = Math.max(0, ...d.zeilen.map(z => (typeof z[i] === 'number' && Number.isFinite(z[i] as number) ? Math.abs(Math.trunc(z[i] as number)) : 0)));
    const neg = d.zeilen.some(z => typeof z[i] === 'number' && (z[i] as number) < 0) ? 1 : 0;
    const breite = Math.min(40, Math.max(8, String(gross).length + neg + (n > 0 ? n + 1 : 0) + (art === 'COMMA' || art === 'DOT' ? Math.floor(String(gross).length / 3) : 0) + (art === 'DOLLAR' ? 1 : 0) + (art === 'PCT' ? 1 : 0)));
    const f = `${art}${breite}.${n}`;
    (gruppen.get(f) ?? gruppen.set(f, []).get(f)!).push(name);
    ok.push(name);
  }
  const zeilen = [...gruppen].map(([f, ns]) => `FORMATS ${ns.join(' ')} (${f}).`);
  return { syntax: zeilen.length ? [...zeilen, 'EXECUTE.'].join('\n') : '', spalten: ok, uebersprungen };
}
/** Die Stellen nach dem Komma, die eine Zahlenspalte jetzt anzeigt (aus dem Format; sonst aus den Werten). */
export function angezeigteStellen(sp: Spalte): number {
  const m = /^[A-Z]+\d+\.(\d+)$/.exec(sp.format);
  return m ? Number(m[1]) : 0;
}

/* ------------------------------------------------------------ Wertelabels übertragen */
export interface LabelPlan { syntax: string; ziele: string[]; uebersprungen: { name: string; grund: 'art' | 'quelle-leer' }[]; paare: number; ersetzt: string[] }
const mitLabels = (sp: Spalte) => Object.keys(sp.werteLabels).length > 0;
/**
 * Die Wertelabels der Quellspalte (z. B. 1 = stimme zu, 5 = stimme nicht zu) auf andere Spalten übertragen. Gleiche Art nötig (Zahl auf Zahl, Text auf Text).
 * Bisherige Wertelabels der Zielspalte werden ersetzt (`ersetzt` nennt die Spalten, die schon welche hatten). Die Daten bleiben unverändert.
 */
export function labelsUebertragen(d: Daten, quelle: string, ziele: string[]): LabelPlan {
  const q = d.spalten.find(x => x.name === quelle);
  const aus: LabelPlan = { syntax: '', ziele: [], uebersprungen: [], paare: 0, ersetzt: [] };
  if (!q || !mitLabels(q)) { for (const z of ziele) aus.uebersprungen.push({ name: z, grund: 'quelle-leer' }); return aus; }
  const paare = Object.entries(q.werteLabels).filter(([w]) => q.art !== 'zahl' || liesZahlText(w) !== null).map(([w, l]) => [q.art === 'zahl' ? String(Number(w)) : w, l] as [string, string]);
  const zeilen: string[] = [];
  for (const name of ziele) {
    const z = d.spalten.find(x => x.name === name);
    if (!z || z.name === q.name) continue;
    if (z.art !== q.art) { aus.uebersprungen.push({ name, grund: 'art' }); continue; }
    if (mitLabels(z)) aus.ersetzt.push(name);
    aus.ziele.push(name);
  }
  if (!aus.ziele.length) return aus;
  // PSPP: gleiche Labels für mehrere Spalten in einem Befehl; vorher leeren, sonst bleiben alte Werte stehen
  const alle = aus.ziele.join(' ');
  zeilen.push(`VALUE LABELS ${alle}.`, `VALUE LABELS ${alle} ${paare.map(([w, l]) => `${q.art === 'zahl' ? w : zitWert(w)} ${zit(l.slice(0, 120))}`).join(' ')}.`, 'EXECUTE.');
  aus.syntax = zeilen.join('\n'); aus.paare = paare.length;
  return aus;
}
