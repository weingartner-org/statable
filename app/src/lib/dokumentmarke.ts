/**
 * Gemeinsamer Baustein für die Marke unten in jedem erzeugten Dokument (Johannes 10.11.): Logo, „statable.eu“, Datum und - wo es Seiten gibt - die Seitenzahl.
 * Word und Excel (lib/export.ts, lib/tabellenexcel.ts), Druckansicht (lib/druckansicht.ts) und Diagramm-Bild (lib/bild.ts) nehmen alles von hier.
 * Das Logo wird nie neu gezeichnet: Quelle ist lib/logo.ts. Dieses Modul hängt nicht von export.ts ab (das Datum kommt als Text herein).
 */
import { L } from './sitzung.svelte';
import { logoInhalt } from './logo';

/** Farben und Adresse der Marke. Fußgrau #5A646E hat auf Weiß rund 6:1 (WCAG AA verlangt 4,5:1). */
export const MARKE = { adresse: 'statable.eu', petrol: '#17756A', koralle: '#C4502F', tinte: '#1D2530', tinte2: '#4C5661', fussGrau: '#5A646E' } as const;

/** Das Logo als vollständiges SVG (für HTML); u: Vorsilbe der Verlaufs-IDs. */
export const logoSvg = (u: string, px: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${px}" height="${px}" aria-hidden="true" focusable="false">${logoInhalt(u)}</svg>`;

/** Fußtext: „statable.eu · 10.11.2026“. */
export const fussText = (datum: string) => `${MARKE.adresse} · ${datum}`;

const pngCache = new Map<number, Promise<{ daten: Uint8Array; url: string }>>();
/** Das Logo als PNG (quadratisch, px Pixel, durchsichtiger Grund). Nur im Browser aufrufen; je Größe einmal gerechnet. */
export function logoPng(px = 96): Promise<{ daten: Uint8Array; url: string }> {
  let p = pngCache.get(px);
  if (!p) {
    p = (async () => {
      const img = new Image();
      await new Promise<void>((ok, nein) => { img.onload = () => ok(); img.onerror = () => nein(new Error('logo')); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(logoSvg('dmpng', px).replace(' aria-hidden="true" focusable="false"', '')); });
      const c = document.createElement('canvas'); c.width = px; c.height = px;
      c.getContext('2d')!.drawImage(img, 0, 0, px, px);
      const url = c.toDataURL('image/png'), bin = atob(url.split(',')[1]!), daten = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) daten[i] = bin.charCodeAt(i);
      return { daten, url };
    })();
    pngCache.set(px, p);
    p.catch(() => pngCache.delete(px));
  }
  return p;
}

type Docx = typeof import('docx');
/** Fußzeile für Word: [Logo] statable.eu · Datum, rechts „Seite i von n“. Ohne `logo` (Tests in Node) nur Text. Arial 8 pt, Fußgrau. */
export function wordFuss(D: Docx, datum: string, logo?: Uint8Array) {
  const farbe = MARKE.fussGrau.slice(1), text = (t: string) => new D.TextRun({ text: t, font: 'Arial', size: 16, color: farbe });
  const kinder: (InstanceType<Docx['TextRun']> | InstanceType<Docx['ImageRun']>)[] = [];
  if (logo) kinder.push(new D.ImageRun({ type: 'png', data: logo, transformation: { width: 12, height: 12 }, altText: { name: 'Statable', title: 'Statable', description: L('Logo von Statable', 'Statable logo') } }));
  kinder.push(text(` ${fussText(datum)}`), new D.TextRun({ children: ['\t', L('Seite ', 'Page '), D.PageNumber.CURRENT, L(' von ', ' of '), D.PageNumber.TOTAL_PAGES], font: 'Arial', size: 16, color: farbe }));
  return new D.Footer({ children: [new D.Paragraph({ tabStops: [{ type: D.TabStopType.RIGHT, position: 9026 }], children: kinder })] });
}

/** Gedruckte Fußzeile eines Excel-Blatts: links statable.eu, Mitte Datum, rechts Seite i / n. */
export function excelFuss(ws: { headerFooter: { oddFooter?: string } }) {
  ws.headerFooter = { ...ws.headerFooter, oddFooter: `&L&8${MARKE.adresse}&C&8&D&R&8&P / &N` };
}
