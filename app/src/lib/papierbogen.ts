/**
 * Papierbogen zum Scannen (E8, Teil 1: Kern). Statable schreibt und liest die Markierungen selbst, ohne QR-Code-Paket und ohne Cloud.
 *
 * Aufbau einer A4-Seite (Maße in Millimetern, Ursprung oben links):
 * - Vier Eckmarken (ausgefüllte Quadrate): oben links größer (12 mm), die anderen drei 8 mm. Daran erkennt der Leser, wie das Blatt liegt
 *   (auch auf dem Kopf oder gedreht) und rechnet Verzerrung (Foto, schiefer Scan) heraus.
 * - Kennleiste (eine Reihe von 39 Zellen): Startzelle, 36 Bit Inhalt (Fragebogen-Kennung 12 Bit, Fassung 6 Bit, Bogen-Nummer 14 Bit, Seite 4 Bit),
 *   Paritätszelle. So weiß der Leser, zu welchem Fragebogen, welcher Fassung, welchem Bogen und welcher Seite ein Blatt gehört.
 * - Kästchen: eine Zeile je Frage (höchstens 20 Antworten), 5 mm groß. Gelesen wird nur das Innere (mittlere 60 %), der Rand zählt nicht.
 * Der Leser nimmt Graustufen (`Uint8Array`, 0 = schwarz); wie das Bild aus PDF oder Foto entsteht, ist Sache der Oberfläche (Teil 2).
 * Entscheidungen: Es gibt nie eine stille Vermutung. Unsichere Kästchen, mehrere Kreuze und fehlende Eckmarken werden gemeldet und nie geraten.
 */

import type { FragebogenPlan } from './fragebogenplan';
import { modellVon, sperre } from './fragebogenexport';

export const SEITE_MM = { b: 210, h: 297 } as const;
export const MARKEN = [
  { x: 14, y: 14, s: 12 }, // oben links (groß)
  { x: 196, y: 14, s: 8 }, // oben rechts
  { x: 14, y: 283, s: 8 }, // unten links
  { x: 196, y: 283, s: 8 } // unten rechts
] as const;
export const KENN = { x0: 30, y: 26, schritt: 3.5, zelle: 2.6, zellen: 39 } as const;
export const KAESTCHEN = { x0: 20, y0: 40, zeile: 9, schritt: 8, s: 5, maxZeilen: 25, maxOptionen: 20 } as const;

export interface BogenFrage { nr: number; codes: number[] }
export interface BogenKennung { planId: string; revision: number; bogen: number }
export interface LKaestchen { nr: number; code: number; x: number; y: number; s: number }
export interface LSeite { seite: number; bits: number[]; kaestchen: LKaestchen[] }

const hash12 = (t: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return (h ^ (h >>> 12) ^ (h >>> 24)) & 0xfff;
};
const bitsVon = (wert: number, n: number): number[] => Array.from({ length: n }, (_, i) => (wert >>> (n - 1 - i)) & 1);
const wertVon = (b: number[]): number => b.reduce((a, x) => a * 2 + x, 0);

/** Die 39 Zellen der Kennleiste: 1, 36 Bit, Parität (gerade Zahl Einsen im Inhalt), nach hinten aufgefüllt auf 39 mit der Startzelle der Gegenseite (1). */
export function kennBits(k: BogenKennung, seite: number): number[] {
  if (!Number.isInteger(k.bogen) || k.bogen < 0 || k.bogen > 16383) throw new Error('bogenNummer');
  if (!Number.isInteger(seite) || seite < 1 || seite > 16) throw new Error('seitenZahl');
  const inhalt = [...bitsVon(hash12(k.planId), 12), ...bitsVon(k.revision & 63, 6), ...bitsVon(k.bogen, 14), ...bitsVon(seite - 1, 4)];
  const par = inhalt.reduce((a, b) => a + b, 0) % 2;
  return [1, ...inhalt, par, 1];
}

export function bogenLayout(fragen: BogenFrage[], k: BogenKennung): LSeite[] {
  for (const f of fragen) if (f.codes.length < 1 || f.codes.length > KAESTCHEN.maxOptionen) throw new Error(`zuvieleAntworten:${f.nr}`);
  const seiten: LSeite[] = [];
  let zeile = 0, kn: LKaestchen[] = [];
  const fertig = () => { seiten.push({ seite: seiten.length + 1, bits: [], kaestchen: kn }); kn = []; zeile = 0; };
  for (const f of fragen) {
    if (zeile >= KAESTCHEN.maxZeilen) fertig();
    f.codes.forEach((c, i) => kn.push({ nr: f.nr, code: c, x: KAESTCHEN.x0 + i * KAESTCHEN.schritt, y: KAESTCHEN.y0 + zeile * KAESTCHEN.zeile, s: KAESTCHEN.s }));
    zeile++;
  }
  if (kn.length || !seiten.length) fertig();
  for (const s of seiten) s.bits = kennBits(k, s.seite);
  return seiten;
}

/* ------------------------------------------------------------------ Probe-Scans (für Tests und für „Leser ausprobieren“) */
export interface Stoerung { drehung?: number; verschiebung?: [number, number]; massstab?: number; perspektive?: number; rauschen?: number; unschaerfe?: boolean; sauber?: boolean; seed?: number }
export interface Bild { b: number; h: number; grau: Uint8Array }

const prng = (seed: number) => () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };

/** Eine Seite in einem Zug zeichnen: `angekreuzt` = Menge „nr:code“. Danach `verzerre`. */
export function zeichneSeite(s: LSeite, angekreuzt: Set<string>, dpi = 100, halb: Set<string> = new Set()): Bild {
  const px = dpi / 25.4, b = Math.round(SEITE_MM.b * px), h = Math.round(SEITE_MM.h * px);
  const grau = new Uint8Array(b * h).fill(255);
  const rect = (x: number, y: number, w: number, hh: number, wert = 0) => {
    for (let j = Math.max(0, Math.round(y * px)); j < Math.min(h, Math.round((y + hh) * px)); j++)
      for (let i = Math.max(0, Math.round(x * px)); i < Math.min(b, Math.round((x + w) * px)); i++) grau[j * b + i] = wert;
  };
  for (const m of MARKEN) rect(m.x - m.s / 2, m.y - m.s / 2, m.s, m.s);
  s.bits.forEach((v, i) => { if (v) rect(KENN.x0 + i * KENN.schritt, KENN.y, KENN.zelle, KENN.zelle); });
  for (const k of s.kaestchen) {
    const w = 0.4; // Rand
    rect(k.x, k.y, k.s, w); rect(k.x, k.y + k.s - w, k.s, w); rect(k.x, k.y, w, k.s); rect(k.x + k.s - w, k.y, w, k.s);
    const id = `${k.nr}:${k.code}`;
    if (angekreuzt.has(id)) rect(k.x + 0.8, k.y + 0.8, k.s - 1.6, k.s - 1.6);
    else if (halb.has(id)) rect(k.x + 1.5, k.y + 1.5, 1.8, 1.8);
  }
  return { b, h, grau };
}

/** Scan nachbilden: drehen, verschieben, skalieren, leicht in die Perspektive kippen, Rauschen, Unschärfe, Helligkeitsverlauf. */
export function verzerre(q: Bild, st: Stoerung): Bild {
  const { b, h } = q, rnd = prng(st.seed ?? 7);
  const a = ((st.drehung ?? 0) * Math.PI) / 180, c = Math.cos(a), sn = Math.sin(a), m = st.massstab ?? 1, [dx, dy] = st.verschiebung ?? [0, 0], p = st.perspektive ?? 0;
  const cx = b / 2, cy = h / 2, aus = new Uint8Array(b * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < b; i++) {
    // Rückwärts: Zielpunkt → Quellpunkt
    const w = 1 + p * ((j - cy) / h), x = (i - cx - dx) / (m * w), y = (j - cy - dy) / (m * w);
    const sx = c * x + sn * y + cx, sy = -sn * x + c * y + cy;
    let v = 255;
    if (sx >= 0 && sy >= 0 && sx < b - 1 && sy < h - 1) {
      if (st.unschaerfe) {
        const x0 = Math.floor(sx), y0 = Math.floor(sy), fx = sx - x0, fy = sy - y0, g = q.grau;
        v = (g[y0 * b + x0]! * (1 - fx) + g[y0 * b + x0 + 1]! * fx) * (1 - fy) + (g[(y0 + 1) * b + x0]! * (1 - fx) + g[(y0 + 1) * b + x0 + 1]! * fx) * fy;
      } else v = q.grau[Math.round(sy) * b + Math.round(sx)]!;
    }
    if (!st.sauber) v = v * (0.9 + 0.1 * (i / b)) + (st.rauschen ?? 0) * (rnd() - 0.5) * 2;
    aus[j * b + i] = Math.max(0, Math.min(255, Math.round(v)));
  }
  return { b, h, grau: aus };
}

/* ------------------------------------------------------------------ Lesen */
export type KStatus = 'leer' | 'angekreuzt' | 'unsicher';
export interface LeseKaestchen { nr: number; code: number; anteil: number; status: KStatus }
export interface LeseFrage { nr: number; status: 'leer' | 'eine' | 'mehrere' | 'pruefen'; code?: number; codes?: number[] }
export type LeseFehler = 'keineMarken' | 'markenUnklar' | 'kennleisteUngueltig' | 'kennungFremd' | 'seiteFremd';
export interface Lesung {
  ok: boolean; fehler?: LeseFehler;
  kennung?: { hash: number; revision: number; bogen: number; seite: number };
  kaestchen: LeseKaestchen[]; fragen: LeseFrage[];
}

interface Fleck { x: number; y: number; flaeche: number; b: number; h: number }

function otsu(g: Uint8Array): number {
  const hist = new Array<number>(256).fill(0);
  for (let i = 0; i < g.length; i += 3) hist[g[i]!]!++;
  const gesamt = hist.reduce((a, b) => a + b, 0);
  let summe = 0; for (let t = 0; t < 256; t++) summe += t * hist[t]!;
  let wb = 0, sb = 0, best = 0, schwelle = 128;
  for (let t = 0; t < 256; t++) {
    wb += hist[t]!; if (!wb) continue;
    const wf = gesamt - wb; if (!wf) break;
    sb += t * hist[t]!;
    const mb = sb / wb, mf = (summe - sb) / wf, v = wb * wf * (mb - mf) ** 2;
    if (v > best) { best = v; schwelle = t; }
  }
  return schwelle;
}

/** Zusammenhängende dunkle Flecken (4er-Nachbarschaft), nur solche mit Mindestfläche. */
function flecken(bild: Bild, schwelle: number, minFlaeche: number): Fleck[] {
  const { b, h, grau } = bild, besucht = new Uint8Array(b * h), aus: Fleck[] = [], stapel = new Int32Array(b * h);
  for (let start = 0; start < b * h; start++) {
    if (besucht[start] || grau[start]! > schwelle) continue;
    let sp = 0, f = 0, sx = 0, sy = 0, x0 = b, x1 = 0, y0 = h, y1 = 0;
    stapel[sp++] = start; besucht[start] = 1;
    while (sp) {
      const p = stapel[--sp]!, x = p % b, y = (p - x) / b;
      f++; sx += x; sy += y; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      if (x > 0 && !besucht[p - 1] && grau[p - 1]! <= schwelle) { besucht[p - 1] = 1; stapel[sp++] = p - 1; }
      if (x < b - 1 && !besucht[p + 1] && grau[p + 1]! <= schwelle) { besucht[p + 1] = 1; stapel[sp++] = p + 1; }
      if (y > 0 && !besucht[p - b] && grau[p - b]! <= schwelle) { besucht[p - b] = 1; stapel[sp++] = p - b; }
      if (y < h - 1 && !besucht[p + b] && grau[p + b]! <= schwelle) { besucht[p + b] = 1; stapel[sp++] = p + b; }
    }
    if (f >= minFlaeche) aus.push({ x: sx / f, y: sy / f, flaeche: f, b: x1 - x0 + 1, h: y1 - y0 + 1 });
  }
  return aus;
}

/** Perspektiv-Abbildung aus vier Punktpaaren (mm → Pixel), Gauß-Verfahren. */
function homographie(von: [number, number][], nach: [number, number][]): number[] | null {
  const A: number[][] = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = von[i]!, [u, v] = nach[i]!;
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
  }
  for (let c = 0; c < 8; c++) {
    let p = c; for (let r = c + 1; r < 8; r++) if (Math.abs(A[r]![c]!) > Math.abs(A[p]![c]!)) p = r;
    if (Math.abs(A[p]![c]!) < 1e-12) return null;
    [A[c], A[p]] = [A[p]!, A[c]!];
    for (let r = 0; r < 8; r++) if (r !== c) { const f = A[r]![c]! / A[c]![c]!; for (let k = c; k < 9; k++) A[r]![k]! -= f * A[c]![k]!; }
  }
  return A.map((z, i) => z[8]! / z[i]!);
}
const abbilden = (H: number[], x: number, y: number): [number, number] => {
  const w = H[6]! * x + H[7]! * y + 1;
  return [(H[0]! * x + H[1]! * y + H[2]!) / w, (H[3]! * x + H[4]! * y + H[5]!) / w];
};

/** Mittlerer Dunkelanteil (0..1) in einem Rechteck der Seite (mm), über viele Stichproben, nach Schwelle. */
function dunkel(bild: Bild, H: number[], schwelle: number, x: number, y: number, w: number, hh: number, n = 7): number {
  let d = 0, z = 0;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const [px, py] = abbilden(H, x + ((i + 0.5) / n) * w, y + ((j + 0.5) / n) * hh), ix = Math.round(px), iy = Math.round(py);
    if (ix < 0 || iy < 0 || ix >= bild.b || iy >= bild.h) continue;
    z++; if (bild.grau[iy * bild.b + ix]! <= schwelle) d++;
  }
  return z ? d / z : 0;
}

export interface LeseOptionen { /** Erwartete Kästchen je Seite (nr, code, Lage); ohne Angabe werden nur Marken und Kennung gelesen. */ erwartet?: (seite: number) => LKaestchen[]; kennung?: BogenKennung }

/** Eine Seite lesen. Stoppt mit Fehler, statt zu raten. */
export function lese(bild: Bild, opt: LeseOptionen = {}): Lesung {
  const leer = (fehler: LeseFehler, kennung?: Lesung['kennung']): Lesung => ({ ok: false, fehler, ...(kennung ? { kennung } : {}), kaestchen: [], fragen: [] });
  const schwelle = Math.min(200, Math.max(60, otsu(bild.grau)));
  const mmPx = bild.b / SEITE_MM.b, minF = Math.max(20, 0.6 * (3 * mmPx) ** 2);
  // Nur kompakte, fast quadratische, gefüllte Flecken sind Eckmarken-Kandidaten.
  const kand = flecken(bild, schwelle, minF).filter(f => f.b / f.h > 0.6 && f.b / f.h < 1.6 && f.flaeche / (f.b * f.h) > 0.7 && f.b > 5 * mmPx * 0.6).sort((a, c) => c.flaeche - a.flaeche).slice(0, 4);
  if (kand.length < 4) return leer('keineMarken');
  const gross = kand[0]!, rest = kand.slice(1);
  if (gross.flaeche < 1.6 * rest[0]!.flaeche) return leer('markenUnklar'); // 12² : 8² = 2,25
  const abstand = (f: Fleck) => Math.hypot(f.x - gross.x, f.y - gross.y);
  rest.sort((a, c) => abstand(a) - abstand(c));
  const [tr, bl, br] = rest as [Fleck, Fleck, Fleck];
  const soll = MARKEN.map(m => [m.x, m.y] as [number, number]);
  const H = homographie(soll, [gross, tr, bl, br].map(f => [f.x, f.y] as [number, number]));
  if (!H) return leer('markenUnklar');
  // Plausibilität: 10 mm auf dem Blatt müssen etwa 10 mm im Bild sein (Faktor 0,3 bis 3), sonst ist es keine Eckmarken-Gruppe.
  const [ax, ay] = abbilden(H, 0, 0), [bx, by] = abbilden(H, 10, 0), px1 = Math.hypot(bx - ax, by - ay);
  if (px1 < 3 * mmPx || px1 > 30 * mmPx) return leer('markenUnklar');

  // Kennleiste: Zellen sind „an“, wenn das Innere mehrheitlich dunkel ist.
  const bits: number[] = [];
  for (let i = 0; i < KENN.zellen; i++) bits.push(dunkel(bild, H, schwelle, KENN.x0 + i * KENN.schritt + 0.5, KENN.y + 0.5, KENN.zelle - 1, KENN.zelle - 1, 5) > 0.5 ? 1 : 0);
  const inhalt = bits.slice(1, 37);
  if (bits[0] !== 1 || bits[38] !== 1 || inhalt.reduce((a, b) => a + b, 0) % 2 !== bits[37]) return leer('kennleisteUngueltig');
  const kennung = { hash: wertVon(inhalt.slice(0, 12)), revision: wertVon(inhalt.slice(12, 18)), bogen: wertVon(inhalt.slice(18, 32)), seite: wertVon(inhalt.slice(32, 36)) + 1 };
  if (opt.kennung && (kennung.hash !== hash12(opt.kennung.planId) || kennung.revision !== (opt.kennung.revision & 63))) return leer('kennungFremd', kennung);
  const soll_ = opt.erwartet?.(kennung.seite);
  if (opt.erwartet && !soll_?.length) return leer('seiteFremd', kennung);

  const kaestchen: LeseKaestchen[] = (soll_ ?? []).map(k => {
    const m = k.s * 0.2, anteil = dunkel(bild, H, schwelle, k.x + m, k.y + m, k.s - 2 * m, k.s - 2 * m, 9);
    const status: KStatus = anteil < 0.12 ? 'leer' : anteil > 0.45 ? 'angekreuzt' : 'unsicher';
    return { nr: k.nr, code: k.code, anteil, status };
  });
  const nummern = [...new Set(kaestchen.map(k => k.nr))];
  const fragen: LeseFrage[] = nummern.map(nr => {
    const z = kaestchen.filter(k => k.nr === nr), an = z.filter(k => k.status === 'angekreuzt').map(k => k.code);
    if (z.some(k => k.status === 'unsicher')) return { nr, status: 'pruefen', codes: an };
    if (!an.length) return { nr, status: 'leer' };
    return an.length === 1 ? { nr, status: 'eine', code: an[0]!, codes: an } : { nr, status: 'mehrere', codes: an };
  });
  return { ok: true, kennung, kaestchen, fragen };
}

export const kennungHash = hash12;

/**
 * Fragen des Plans, die sich ankreuzen lassen (Antwort „optionen“ mit Codes). Alles andere (Tabellen, Linien) bleibt für den Papierbogen draußen und wird
 * gemeldet, damit niemand glaubt, es werde gelesen. Gesperrt bei Plan-Fehlern wie die anderen Papierfassungen.
 */
export function bogenFragenVon(plan: FragebogenPlan, sprache: string): { fragen: BogenFrage[]; nichtLesbar: number[] } {
  sperre(plan);
  const m = modellVon(plan, sprache, true), fragen: BogenFrage[] = [], nichtLesbar: number[] = [];
  for (const s of m.seiten) for (const e of s.inhalt) {
    if (e.art !== 'frage') continue;
    const codes = e.antwort.art === 'optionen' ? e.antwort.zeilen.map(z => /^☐ .*\((-?\d+)\)$/.exec(z)?.[1]).map(c => (c === undefined ? NaN : Number(c))) : [];
    if (codes.length && codes.length <= KAESTCHEN.maxOptionen && codes.every(Number.isFinite)) fragen.push({ nr: e.nr, codes });
    else nichtLesbar.push(e.nr);
  }
  return { fragen, nichtLesbar };
}
