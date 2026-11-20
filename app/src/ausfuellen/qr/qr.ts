/**
 * QR-Code für die Abschlussseite (Stufe 3C). Bibliothek: Nayuki „QR Code generator library“ (MIT, reines TypeScript, ohne Abhängigkeit, unverändert in qrcodegen.ts);
 * gewählt, weil klein, geprüft verbreitet und ohne Netz einsetzbar. Fehlerkorrektur M. „Passend“ heißt: höchstens Version 25 (117 × 117 Module, rund 1.000 Byte) -
 * größere Codes lassen sich vom Bildschirm kaum noch einlesen; dann gibt es `null` und die Seite sagt, dass der Code zu groß ist.
 */
import { qrcodegen } from './qrcodegen';

export const QR_MAX_VERSION = 25;

/** Module des Codes (true = dunkel) oder `null`, wenn der Text nicht in Version 25 mit Fehlerkorrektur M passt. */
export function qrModule(text: string): boolean[][] | null {
  try {
    const q = qrcodegen.QrCode.encodeSegments(qrcodegen.QrSegment.makeSegments(text), qrcodegen.QrCode.Ecc.MEDIUM, 1, QR_MAX_VERSION);
    return Array.from({ length: q.size }, (_, y) => Array.from({ length: q.size }, (_, x) => q.getModule(x, y)));
  } catch { return null; }
}

const NS = 'http://www.w3.org/2000/svg';
/** SVG mit weißem Grund, vier Modulen Ruhezone und festen Farben (Kontrastmodus ändert nichts: sonst wäre der Code nicht lesbar). */
export function qrSvg(module: boolean[][], beschriftung: string): SVGSVGElement {
  const n = module.length, rand = 4;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${n + 2 * rand} ${n + 2 * rand}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', beschriftung);
  svg.setAttribute('shape-rendering', 'crispEdges');
  svg.setAttribute('class', 'qr');
  const grund = document.createElementNS(NS, 'rect');
  for (const [k, v] of Object.entries({ x: '0', y: '0', width: String(n + 2 * rand), height: String(n + 2 * rand), fill: '#ffffff' })) grund.setAttribute(k, v);
  let d = '';
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (!module[y]![x]) continue;
      let l = 1;
      while (x + l < n && module[y]![x + l]) l++;
      d += `M${x + rand} ${y + rand}h${l}v1h-${l}z`;
      x += l - 1;
    }
  }
  const pfad = document.createElementNS(NS, 'path');
  pfad.setAttribute('d', d); pfad.setAttribute('fill', '#000000');
  svg.append(grund, pfad);
  return svg;
}
