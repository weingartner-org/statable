/**
 * Fälle für Interviews vorschlagen (Später, Welle S-D, G11; Fachblatt docs/fachblaetter/SPAETER-D-PSYCHOLOGIE-MIXED-RECHNER.md, Abschnitt 2 und „Entscheidungen Opus“ 2).
 * Reine Funktionen ohne Oberfläche und ohne PSPP. Statable wählt NIE von selbst aus und schreibt NIE in die Daten: Die Regeln liefern nur eine geordnete Liste mit Rechenwerten;
 * die Person hakt Fälle an und übernimmt sie als eigene Gruppe in der Fälle-Tabelle (`uebernehmeVorschlag`, rückgängig mit `nimmVorschlagZurueck`).
 * Quellen: Seawright & Gerring (2008), Political Research Quarterly 61(2), 294-308; Teddlie & Yu (2007), Journal of Mixed Methods Research 1(1), 77-100;
 * Ivankova, Creswell & Stick (2006), Field Methods 18(1), 3-20; Gonzalez (1985), Theoretical Computer Science 38, 293-306 (Farthest-first); Sweeney (2002), Int. J. Uncertainty, Fuzziness and Knowledge-Based Systems 10(5), 557-570.
 *
 * Festlegungen (Opus 17.10.): vier Regeln (extrem, typisch, abweichend, maximale Variation); bei Gleichstand entscheidet die KLEINERE Zeilennummer (keine Zufallsauswahl);
 * Rechenwerte, die sich erst jenseits der 9. Stelle unterscheiden, sind gleich (Gleitkomma-Rauschen); „weitere“ zählt die nicht gewählten Fälle mit demselben Rechenwert.
 */
import { L } from './sitzung.svelte';
import { loescheGruppe, neueGruppe, verschiebe, type Faelle } from './faelle';
import { mahalanobis } from './auffaellig';

export type FallRegel = 'extrem' | 'typisch' | 'abweichend' | 'variation' | 'einflussreich' | 'divers';
export type Richtung = 'hoch' | 'tief' | 'besser' | 'schlechter';
export interface Vorschlag { zeile: number; rang: number; richtung: Richtung | null; wert: number; rohwert: number | null; weitere: number }
export interface Auswahl {
  regel: FallRegel; k: number; n: number; ausgeschlossen: number; vorschlaege: Vorschlag[];
  hinweise: ('gleichstaende' | 'n-klein' | 'viele-gewaehlt' | 'hebel-eins' | 'zellen-mehr-als-k')[];
  fehler: null | 'keine-faelle' | 'zu-wenige-werte' | 'regression-unmoeglich' | 'singulaer';
  extra: {
    median?: number; anzahlMax?: number; anzahlMin?: number; r2?: number; koeffizienten?: number[];
    /** einflussreich: Fälle über 4/n, irgendein D über 1 (beides Daumenregeln), die Grenze 4/n, Fälle mit Hebelwert 1 (Zeilennummern). */
    ueber4n?: number; ueber1?: boolean; grenze4n?: number; hebelEins?: number[];
    /** divers: besetzte Zellen, alle denkbaren Kombinationen, leere Kombinationen als Code-Listen. */
    zellen?: number; moegliche?: number; leer?: number[][];
  };
}

export const K_MIN = 1, K_MAX = 10, K_VORGABE = 3;
/** Rechenwerte gelten als gleich, wenn sie sich erst jenseits der 9. Stelle unterscheiden. */
const rund = (v: number): number => Number(v.toFixed(9));

interface Fall { zeile: number; pos: number }
interface Eintrag { zeile: number; wert: number; roh: number | null }

/** Die Zahlenspalten in die Fälle ohne Lücke in IRGENDEINER Spalte (Zeilennummern und Werte). */
function vollstaendige(spalten: (number | null)[][], zeilen?: number[]): { faelle: Fall[]; werte: number[][]; gesamt: number } {
  const gesamt = spalten.reduce((m, sp) => Math.max(m, sp.length), 0);
  const faelle: Fall[] = [], werte: number[][] = spalten.map(() => []);
  for (let i = 0; i < gesamt; i++) {
    if (!spalten.every(sp => typeof sp[i] === 'number' && Number.isFinite(sp[i] as number))) continue;
    faelle.push({ zeile: zeilen?.[i] ?? i + 1, pos: i });
    spalten.forEach((sp, j) => werte[j]!.push(sp[i] as number));
  }
  return { faelle, werte, gesamt };
}
const mittel = (x: number[]): number => x.reduce((a, b) => a + b, 0) / x.length;
const sdMit = (x: number[], m = mittel(x)): number => (x.length > 1 ? Math.sqrt(x.reduce((a, b) => a + (b - m) ** 2, 0) / (x.length - 1)) : 0);
const medianVon = (x: number[]): number => { const s = [...x].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2; };

/** Die ersten k Einträge nach dem Rechenwert (aufsteigend oder absteigend), bei Gleichstand die kleinere Zeilennummer; `weitere` = nicht gewählte Fälle mit demselben Rechenwert.
 *  Bei „typisch“ (`alleGleichen`) zählt `weitere` alle ANDEREN Fälle mit demselben Rechenwert, auch gewählte: so rechnet das Soll in R (scripts/spaeter-d-erwartet.R Zeile 292), 72 und 145 haben je „1 weiteren“. */
function waehle(eintraege: Eintrag[], k: number, absteigend: boolean, richtung: Richtung | null, alleGleichen = false): Vorschlag[] {
  const sortiert = [...eintraege].sort((a, b) => { const x = rund(a.wert), y = rund(b.wert); return x === y ? a.zeile - b.zeile : absteigend ? y - x : x - y; });
  const gewaehlt = sortiert.slice(0, Math.min(k, sortiert.length));
  const gruppe = new Map<number, number>(), davon = new Map<number, number>();
  for (const e of sortiert) gruppe.set(rund(e.wert), (gruppe.get(rund(e.wert)) ?? 0) + 1);
  for (const e of gewaehlt) davon.set(rund(e.wert), (davon.get(rund(e.wert)) ?? 0) + 1);
  return gewaehlt.map((e, i) => ({ zeile: e.zeile, rang: i + 1, richtung, wert: e.wert, rohwert: e.roh, weitere: gruppe.get(rund(e.wert))! - (alleGleichen ? 1 : davon.get(rund(e.wert))!) }));
}

/** Gauss-Jordan mit Spaltenpivot; `null` bei (fast) singulärer Matrix. Die Matrix ist die Korrelationsmatrix der Prädiktoren (Einheiten stehen vorher gleich). */
function umkehren(a: number[][]): number[][] | null {
  const n = a.length, m = a.map((z, i) => [...z, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(m[r]![c]!) > Math.abs(m[p]![c]!)) p = r;
    if (Math.abs(m[p]![c]!) < 1e-10) return null;
    [m[c], m[p]] = [m[p]!, m[c]!];
    const d = m[c]![c]!;
    for (let j = 0; j < 2 * n; j++) m[c]![j]! /= d;
    for (let r = 0; r < n; r++) if (r !== c) { const f = m[r]![c]!; if (f !== 0) for (let j = 0; j < 2 * n; j++) m[r]![j]! -= f * m[c]![j]!; }
  }
  return m.map(z => z.slice(n));
}

/** Lineare Regression von y auf x (mit Konstante): Reste, intern studentisierte Residuen, R², Koeffizienten (Konstante zuerst); `null` bei Rangmangel. */
function regression(y: number[], x: number[][], hebelEinsErlaubt = false): { rest: number[]; stud: number[]; r2: number; koeffizienten: number[]; hat: number[]; s2: number } | null {
  const n = y.length, p = x.length, my = mittel(y), mx = x.map(c => mittel(c)), sx = x.map((c, j) => sdMit(c, mx[j]));
  if (sx.some(s => !(s > 0))) return null;
  const z = x.map((c, j) => c.map(v => (v - mx[j]!) / sx[j]!));
  const g = z.map(a => z.map(b => a.reduce((s, v, i) => s + v * b[i]!, 0)));
  const inv = umkehren(g);
  if (!inv) return null;
  const zy = z.map(a => a.reduce((s, v, i) => s + v * (y[i]! - my), 0));
  const bz = inv.map(r => r.reduce((s, v, j) => s + v * zy[j]!, 0));
  const hat = Array.from({ length: n }, (_, i) => { let h = 1 / n; for (let a = 0; a < p; a++) for (let b = 0; b < p; b++) h += z[a]![i]! * inv[a]![b]! * z[b]![i]!; return h; });
  const fit = Array.from({ length: n }, (_, i) => my + bz.reduce((s, v, j) => s + v * z[j]![i]!, 0));
  const rest = y.map((v, i) => v - fit[i]!);
  const sse = rest.reduce((s, v) => s + v * v, 0), sst = y.reduce((s, v) => s + (v - my) ** 2, 0), s2 = sse / (n - p - 1);
  if (!(s2 > 1e-24 * Math.max(1, sst)) || (!hebelEinsErlaubt && hat.some(h => h > 1 - 1e-12))) return null;
  const stud = rest.map((e, i) => (hat[i]! > 1 - 1e-12 ? NaN : e / Math.sqrt(s2 * (1 - hat[i]!))));
  const slope = bz.map((b, j) => b / sx[j]!);
  return { rest, stud, r2: 1 - sse / sst, koeffizienten: [my - slope.reduce((s, b, j) => s + b * mx[j]!, 0), ...slope], hat, s2 };
}

/** Cook-Distanz (Cook 1977): D_i = e_i² / (p · MSE) · h_ii / (1 - h_ii)², p = Koeffizienten mit Konstante. Bei Hebelwert 1 nicht bestimmt (NaN). */
const cookD = (rest: number[], hat: number[], s2: number, p: number): number[] =>
  rest.map((e, i) => (hat[i]! > 1 - 1e-12 ? NaN : (e * e) / (p * s2) * (hat[i]! / (1 - hat[i]!) ** 2)));

/** Diverse Fälle: je besetzte Zelle der Kategorien-Kombination der Fall mit der kleinsten Zeilennummer; Zellen nach Fallzahl absteigend, dann nach Codes. */
function divers(werte: number[][], faelle: Fall[], k: number, auswahl: Auswahl): void {
  const zellen = new Map<string, { codes: number[]; index: number[] }>();
  faelle.forEach((_, i) => {
    const codes = werte.map(c => c[i]!), schluessel = codes.join('|');
    const z = zellen.get(schluessel); if (z) z.index.push(i); else zellen.set(schluessel, { codes, index: [i] });
  });
  const vergleich = (a: number[], b: number[]): number => { for (let j = 0; j < a.length; j++) if (a[j] !== b[j]) return a[j]! - b[j]!; return 0; };
  const sortiert = [...zellen.values()].sort((a, b) => b.index.length - a.index.length || vergleich(a.codes, b.codes));
  auswahl.vorschlaege = sortiert.slice(0, k).map((z, r) => {
    const erster = z.index.reduce((m, i) => (faelle[i]!.zeile < faelle[m]!.zeile ? i : m), z.index[0]!);
    return { zeile: faelle[erster]!.zeile, rang: r + 1, richtung: null, wert: z.index.length, rohwert: null, weitere: z.index.length - 1 };
  });
  const kategorien = werte.map(c => [...new Set(c)].sort((a, b) => a - b));
  let alle: number[][] = [[]];
  for (const kat of kategorien) alle = alle.flatMap(pre => kat.map(c => [...pre, c]));
  auswahl.extra = { zellen: zellen.size, moegliche: alle.length, leer: alle.filter(c => !zellen.has(c.join('|'))) };
  if (zellen.size > k) auswahl.hinweise.push('zellen-mehr-als-k');
}

/** Farthest-first auf z-Werten (Gonzalez 1985): Start = größter Abstand zum Schwerpunkt, danach jeweils der Fall mit dem größten KLEINSTEN Abstand zu den schon gewählten. */
function variation(werte: number[][], faelle: Fall[], k: number): Vorschlag[] {
  const n = faelle.length, z = werte.map(c => { const m = mittel(c), s = sdMit(c, m); return c.map(v => (s > 0 ? (v - m) / s : 0)); });
  const abstand = (a: number, b: number) => Math.sqrt(z.reduce((s, c) => s + (c[a]! - c[b]!) ** 2, 0));
  const mitte = (a: number) => Math.sqrt(z.reduce((s, c) => s + c[a]! ** 2, 0));
  const waehlen = (maß: (i: number) => number, frei: number[]): { i: number; w: number } => {
    let best = frei[0]!, bw = maß(best);
    for (const i of frei.slice(1)) { const w = maß(i); const a = rund(w), b = rund(bw); if (a > b || (a === b && faelle[i]!.zeile < faelle[best]!.zeile)) { best = i; bw = w; } }
    return { i: best, w: bw };
  };
  const alle = Array.from({ length: n }, (_, i) => i), gewaehlt: number[] = [], aus: Vorschlag[] = [];
  const nimm = (i: number, w: number) => { gewaehlt.push(i); aus.push({ zeile: faelle[i]!.zeile, rang: aus.length + 1, richtung: null, wert: w, rohwert: null, weitere: 0 }); };
  const start = waehlen(mitte, alle); nimm(start.i, start.w);
  while (gewaehlt.length < Math.min(k, n)) {
    const frei = alle.filter(i => !gewaehlt.includes(i));
    const kleinste = new Map<number, number>(frei.map(i => [i, Math.min(...gewaehlt.map(g => abstand(i, g)))]));
    const nxt = waehlen(i => kleinste.get(i)!, frei); nimm(nxt.i, nxt.w);
  }
  return aus;
}

/**
 * Der Vorschlag nach einer Regel. `spalten`: je Spalte alle Zeilen (null = fehlend); Spalte 1 ist die Hauptspalte (bei „abweichend“ die Zielspalte Y, die übrigen sind X).
 * `o.k`: Fälle je Seite (1 bis 10, Voreinstellung 3); `o.zeilen`: die Zeilennummern der Zeilen (Voreinstellung 1 bis n).
 */
export function fallauswahl(regel: FallRegel, spalten: (number | null)[][], o: { k?: number; zeilen?: number[] } = {}): Auswahl {
  const k = Math.min(K_MAX, Math.max(K_MIN, Math.round(o.k ?? K_VORGABE)));
  const { faelle, werte, gesamt } = vollstaendige(spalten, o.zeilen), n = faelle.length;
  const auswahl: Auswahl = { regel, k, n, ausgeschlossen: gesamt - n, vorschlaege: [], hinweise: [], fehler: null, extra: {} };
  if (!n || !spalten.length) { auswahl.fehler = 'keine-faelle'; return auswahl; }
  if (regel !== 'divers' && new Set(werte[0]!.map(rund)).size < 3) { auswahl.fehler = 'zu-wenige-werte'; return auswahl; }
  const y = werte[0]!, zeilen = faelle.map(f => f.zeile);
  if (regel === 'extrem') {
    const m = mittel(y), sd = sdMit(y, m), ein = y.map((v, i): Eintrag => ({ zeile: zeilen[i]!, wert: (v - m) / sd, roh: v }));
    auswahl.vorschlaege = [...waehle(ein, k, true, 'hoch'), ...waehle(ein, k, false, 'tief')];
    const hoch = rund(Math.max(...y)), tief = rund(Math.min(...y));
    auswahl.extra = { anzahlMax: y.filter(v => rund(v) === hoch).length, anzahlMin: y.filter(v => rund(v) === tief).length };
  } else if (regel === 'typisch') {
    if (werte.length === 1) {
      const med = medianVon(y);
      auswahl.vorschlaege = waehle(y.map((v, i): Eintrag => ({ zeile: zeilen[i]!, wert: Math.abs(v - med), roh: v })), k, false, null, true);
      auswahl.extra = { median: med };
    } else {
      const zeilenWerte = y.map((_, i) => werte.map(c => c[i]!)), md = mahalanobis(zeilenWerte);
      if ('fehler' in md) { auswahl.fehler = md.fehler === 'konstant' ? 'zu-wenige-werte' : 'singulaer'; return auswahl; }
      auswahl.vorschlaege = waehle(md.d2.map((v, i): Eintrag => ({ zeile: zeilen[i]!, wert: v as number, roh: null })), k, false, null, true);
    }
  } else if (regel === 'abweichend') {
    const p = werte.length - 1;
    if (p < 1 || n <= p + 2) { auswahl.fehler = 'regression-unmoeglich'; return auswahl; }
    const reg = regression(y, werte.slice(1));
    if (!reg) { auswahl.fehler = 'regression-unmoeglich'; return auswahl; }
    const ein = reg.stud.map((r, i): Eintrag => ({ zeile: zeilen[i]!, wert: r, roh: reg.rest[i]! }));
    auswahl.vorschlaege = [...waehle(ein, k, true, 'besser'), ...waehle(ein, k, false, 'schlechter')];
    auswahl.extra = { r2: reg.r2, koeffizienten: reg.koeffizienten };
  } else if (regel === 'einflussreich') {
    const p = werte.length - 1;
    if (p < 1 || n <= p + 2) { auswahl.fehler = 'regression-unmoeglich'; return auswahl; }
    const reg = regression(y, werte.slice(1), true);
    if (!reg) { auswahl.fehler = 'regression-unmoeglich'; return auswahl; }
    const d = cookD(reg.rest, reg.hat, reg.s2, p + 1);
    const ein: Eintrag[] = [], hebelEins: number[] = [];
    d.forEach((v, i) => { if (Number.isFinite(v)) ein.push({ zeile: zeilen[i]!, wert: v, roh: null }); else hebelEins.push(zeilen[i]!); });
    auswahl.vorschlaege = waehle(ein, k, true, null);
    const grenze = 4 / n;
    auswahl.extra = { ueber4n: ein.filter(e => e.wert > grenze).length, ueber1: ein.some(e => e.wert > 1), grenze4n: grenze, hebelEins: hebelEins.sort((a, b) => a - b) };
    if (hebelEins.length) auswahl.hinweise.push('hebel-eins');
  } else if (regel === 'divers') {
    divers(werte, faelle, k, auswahl);
  } else {
    auswahl.vorschlaege = variation(werte, faelle, k);
  }
  const gewaehlt = new Set(auswahl.vorschlaege.map(v => v.zeile));
  if (regel !== 'divers' && auswahl.vorschlaege.some(v => v.weitere > 0)) auswahl.hinweise.push('gleichstaende');
  if (n < 10 || n < 2 * k) auswahl.hinweise.push('n-klein');
  if (gewaehlt.size > n / 2) auswahl.hinweise.push('viele-gewaehlt');
  return auswahl;
}

/**
 * Sieht die Spalte nach Klarnamen oder Kontaktdaten aus? Der Name der Spalte enthält „name“, „mail“ oder „adresse“ oder beginnt ein Wort mit „tel“ (Telefon; nicht „Mittel“),
 * oder ein Wert enthält „@“. Statable listet Klarnamen nie von selbst.
 */
export function kennungWarnung(spaltenname: string, werte?: (string | number | null)[]): boolean {
  if (/name|mail|adresse/i.test(spaltenname) || /(^|[^a-zäöüß])tel/i.test(spaltenname)) return true;
  return !!werte?.some(v => typeof v === 'string' && v.includes('@'));
}

/** Die angehakten Fälle als eigene Gruppe in die Fälle-Tabelle übernehmen (nur im Zustand des Blatts, NIE in die Daten). Gibt die Kennung der Gruppe zurück. */
export function uebernehmeVorschlag(e: Faelle, schluessel: string[], name: string = L('Interview-Vorschlag', 'Interview suggestion')): string {
  const id = neueGruppe(e, name);
  for (const s of schluessel) verschiebe(e, s, id);
  return id;
}
/** Die Übernahme zurücknehmen: Die Fälle gehen zurück in ihre vorgeschlagenen Gruppen. */
export function nimmVorschlagZurueck(e: Faelle, id: string): void { loescheGruppe(e, id); }
