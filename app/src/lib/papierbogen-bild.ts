/**
 * Papierbogen zum Scannen (E8, Teil 2b-2): Bilddateien und PDF-Seiten in Graustufen-Bilder für `lese` (./papierbogen).
 * Alles im Browser; nichts wird hochgeladen. Große Scans werden auf höchstens `MAX_SEITE_PX` an der langen Seite verkleinert.
 */
import type { Bild } from './papierbogen';

export const MAX_SEITE_PX = 1800;
export const MAX_BILD_BYTES = 40 * 1048576;

/** Pixel (RGBA) zu Graustufen (Luminanz). Reine Rechnung, getestet. */
export function grauAusRgba(daten: Uint8ClampedArray | Uint8Array, b: number, h: number): Bild {
  const grau = new Uint8Array(b * h);
  for (let i = 0, j = 0; i < grau.length; i++, j += 4) {
    const a = daten[j + 3]! / 255;
    // Transparenz gilt als Papier (weiß)
    const lum = 0.299 * daten[j]! + 0.587 * daten[j + 1]! + 0.114 * daten[j + 2]!;
    grau[i] = Math.round(lum * a + 255 * (1 - a));
  }
  return { b, h, grau };
}

export function skaliert(b: number, h: number): { b: number; h: number } {
  const f = Math.min(1, MAX_SEITE_PX / Math.max(b, h));
  return { b: Math.max(1, Math.round(b * f)), h: Math.max(1, Math.round(h * f)) };
}

function ausCanvas(c: HTMLCanvasElement | OffscreenCanvas, b: number, h: number): Bild {
  const ctx = c.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
  return grauAusRgba(ctx.getImageData(0, 0, b, h).data, b, h);
}

function neuesCanvas(b: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = b; c.height = h;
  const ctx = c.getContext('2d')!; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, b, h);
  return c;
}

export async function bildAusDatei(datei: File): Promise<Bild> {
  if (datei.size > MAX_BILD_BYTES) throw new Error('zu groß');
  const bm = await createImageBitmap(datei);
  try {
    const { b, h } = skaliert(bm.width, bm.height);
    const c = neuesCanvas(b, h);
    c.getContext('2d')!.drawImage(bm, 0, 0, b, h);
    return ausCanvas(c, b, h);
  } finally { bm.close?.(); }
}

/** Jede PDF-Seite als Bild. `bei` meldet den Stand (Seite, von). */
export async function bilderAusPdf(datei: File, bei?: (seite: number, von: number) => void): Promise<Bild[]> {
  if (datei.size > MAX_BILD_BYTES) throw new Error('zu groß');
  const pdfjs = await import('pdfjs-dist') as unknown as {
    getDocument(o: Record<string, unknown>): { promise: Promise<any> };
    GlobalWorkerOptions: { workerSrc: string };
  };
  pdfjs.GlobalWorkerOptions.workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default as string;
  const bytes = new Uint8Array(await datei.arrayBuffer());
  const doc = await pdfjs.getDocument({ data: bytes, isEvalSupported: false, enableXfa: false, useSystemFonts: false }).promise;
  const aus: Bild[] = [];
  try {
    for (let n = 1; n <= doc.numPages; n++) {
      bei?.(n, doc.numPages);
      const seite = await doc.getPage(n);
      const v1 = seite.getViewport({ scale: 1 });
      const { b } = skaliert(v1.width * 3, v1.height * 3);
      const scale = b / v1.width, v = seite.getViewport({ scale });
      const w = Math.round(v.width), h = Math.round(v.height), c = neuesCanvas(w, h);
      await seite.render({ canvasContext: c.getContext('2d')!, viewport: v }).promise;
      aus.push(ausCanvas(c, w, h));
      seite.cleanup?.();
    }
  } finally { await doc.destroy?.(); }
  return aus;
}
