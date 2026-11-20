/** PNG für den Druck: Maßstab und dpi-Angabe (pHYs-Block). Ohne Browser-Bezug, damit es sich testen lässt. */
export const DRUCK_DPI = 300;
export const DRUCK_CM = 16;
const MAX_PIXEL = 8000;

/** Vergrößerungsfaktor, damit ein Bild der Breite `breite` (Pixel in der App) bei `cm` Zentimetern Breite `dpi` Punkte je Zoll hat. */
export function druckFaktor(breite: number, cm = DRUCK_CM, dpi = DRUCK_DPI): number {
  return Math.min((cm / 2.54) * dpi / breite, MAX_PIXEL / breite);
}

let tabelle: Uint32Array | null = null;
function crc32(b: Uint8Array): number {
  if (!tabelle) { tabelle = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; tabelle[n] = c >>> 0; } }
  let c = 0xffffffff; for (const x of b) c = tabelle[(c ^ x) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Setzt die Auflösung (Punkte je Zoll) in ein PNG: fügt den Block pHYs nach IHDR ein (ersetzt einen vorhandenen). */
export function pngMitDpi(png: Uint8Array, dpi: number): Uint8Array {
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  if (png.length < 33 || sig.some((v, i) => png[i] !== v)) throw new Error('Kein PNG');
  const proM = Math.round(dpi / 0.0254);
  const block = new Uint8Array(21), v = new DataView(block.buffer);
  v.setUint32(0, 9); block.set([0x70, 0x48, 0x59, 0x73], 4);   // "pHYs"
  v.setUint32(8, proM); v.setUint32(12, proM); block[16] = 1;
  v.setUint32(17, crc32(block.subarray(4, 17)));
  // vorhandenen pHYs-Block entfernen
  let aus = png;
  for (let p = 8; p + 12 <= png.length;) {
    const len = new DataView(png.buffer, png.byteOffset + p, 4).getUint32(0), typ = String.fromCharCode(...png.subarray(p + 4, p + 8));
    if (typ === 'pHYs') { aus = new Uint8Array([...png.subarray(0, p), ...png.subarray(p + 12 + len)]); break; }
    p += 12 + len;
  }
  const neu = new Uint8Array(aus.length + 21);
  neu.set(aus.subarray(0, 33)); neu.set(block, 33); neu.set(aus.subarray(33), 54);
  return neu;
}

/** Liest die Auflösung (Punkte je Zoll) aus einem PNG, sonst null. */
export function pngDpi(png: Uint8Array): number | null {
  for (let p = 8; p + 12 <= png.length;) {
    const dv = new DataView(png.buffer, png.byteOffset + p, 12), len = dv.getUint32(0), typ = String.fromCharCode(...png.subarray(p + 4, p + 8));
    if (typ === 'pHYs') { const d = new DataView(png.buffer, png.byteOffset + p + 8, 9); return d.getUint8(8) === 1 ? Math.round(d.getUint32(0) * 0.0254) : null; }
    p += 12 + len;
  }
  return null;
}
