/** Diagramm als Bild speichern: SVG mit festen Farben (keine CSS-Variablen) und als PNG in doppelter Größe. */
import { L, s } from './sitzung.svelte';
import { MARKE } from './dokumentmarke';
import { logoInhalt } from './logo';
import { dateiname as dateinameRoh } from './dateiname';
import regularUrl from '../stil/fonts/atkinson-regular.woff2?url';
import boldUrl from '../stil/fonts/atkinson-bold.woff2?url';
import { druckFaktor, pngMitDpi, DRUCK_DPI } from './pngdpi';

/** Fußzeile in jedem Bild: Logo und Name, ganz klein rechts unten (Johannes 08.10.). */
export const FUSS = 22;
/** Höhe des Fußes unter dem Bild: 0, wenn das Logo in den Einstellungen abgeschaltet ist. */
export const fussHoehe = (marke = true) => (marke && s.einst.bildLogo !== false ? FUSS : 0);
const LOGO_KLEIN = logoInhalt('fusslogo');
function fussAnhaengen(k: SVGSVGElement) {
  if (s.einst.bildLogo === false) return;
  const vb = k.viewBox.baseVal, ns = 'http://www.w3.org/2000/svg', unten = vb.y + vb.height;
  k.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.width} ${vb.height + FUSS}`);
  const g = document.createElementNS(ns, 'g'); g.setAttribute('aria-hidden', 'true');
  g.innerHTML = `<g transform="translate(${vb.x + vb.width - 112} ${unten + 5}) scale(.2)">${LOGO_KLEIN}</g><text x="${vb.x + vb.width - 96}" y="${unten + 14.5}" style="font-size:10px;letter-spacing:.02em;fill:${MARKE.fussGrau}">${MARKE.adresse}</text>`;
  k.appendChild(g);
}

function speichere(blob: Blob, name: string) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

/** Löst var(--x) und color-mix() über den Browser auf, damit die Datei überall gleich aussieht. */
function eigenstaendig(svg: SVGSVGElement, marke = true): string {
  // Immer helle Farben: das Bild landet in Word oder auf Papier, auch wenn die App gerade dunkel ist.
  const h = document.documentElement, vorher = h.dataset.thema;
  h.dataset.thema = 'hell';
  try { return aufloesen(svg, marke); } finally { if (vorher === undefined) delete h.dataset.thema; else h.dataset.thema = vorher; }
}
function aufloesen(svg: SVGSVGElement, marke = true): string {
  const k = svg.cloneNode(true) as SVGSVGElement;
  const wurzel = getComputedStyle(svg);
  const fest = (wert: string, eigenschaft: 'fill' | 'stroke') => {
    if (!wert.includes('var(')) return wert;
    const probe = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    probe.style.setProperty(eigenschaft, wert); svg.appendChild(probe);
    const r = getComputedStyle(probe).getPropertyValue(eigenschaft); probe.remove();
    return r || wert;
  };
  for (const el of k.querySelectorAll<SVGElement>('[fill],[stroke]')) {
    for (const a of ['fill', 'stroke'] as const) { const w = el.getAttribute(a); if (w) el.setAttribute(a, fest(w, a)); }
  }
  // Farben, die im style-Attribut stehen (Schrift auf farbigem Grund), werden ebenso aufgelöst.
  for (const el of k.querySelectorAll<SVGElement>('[style*="var("]')) {
    el.setAttribute('style', (el.getAttribute('style') ?? '').replace(/\b(fill|stroke)\s*:\s*([^;]+)/g, (_m, p: 'fill' | 'stroke', w: string) => `${p}:${fest(w.trim(), p)}`));
  }
  const tinte = wurzel.getPropertyValue('--tinte').trim() || '#1C2127', tinte2 = wurzel.getPropertyValue('--tinte-2').trim() || '#4C5661';
  const schrift = wurzel.getPropertyValue('--schrift-ui').trim() || 'system-ui, sans-serif';
  const stil = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  stil.textContent = `text{font-family:${schrift};fill:${tinte}}.klein{font-size:13px;fill:${tinte2}}`;
  k.insertBefore(stil, k.firstChild);
  if (marke) fussAnhaengen(k);
  const vb = k.viewBox.baseVal;
  k.setAttribute('width', String(vb.width)); k.setAttribute('height', String(vb.height)); k.removeAttribute('style');
  k.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  return new XMLSerializer().serializeToString(k);
}

/** „<Titel> - Abbildung“: dieselbe Schreibweise wie bei PDF, Word und Excel (lib/dateiname.ts). */
const dateiname = (t: string) => `${dateinameRoh(t || L('Diagramm', 'Chart'))} - ${L('Abbildung', 'Figure')}`;

/** Die Schrift der App (Atkinson Hyperlegible, Braille Institute; Lizenztext siehe Schriftdatei) wird in die SVG-Datei eingebettet - sonst ersetzt Illustrator oder Inkscape sie (Abnahme 4, B9). */
async function schriftEinbetten(svgText: string): Promise<string> {
  const als64 = async (url: string) => { const b = new Uint8Array(await (await fetch(url)).arrayBuffer()); let x = ''; for (let i = 0; i < b.length; i += 0x8000) x += String.fromCharCode(...b.subarray(i, i + 0x8000)); return btoa(x); };
  try {
    const [r, f] = await Promise.all([als64(regularUrl), als64(boldUrl)]);
    const css = `@font-face{font-family:'Atkinson Hyperlegible';font-weight:400;src:url(data:font/woff2;base64,${r}) format('woff2')}@font-face{font-family:'Atkinson Hyperlegible';font-weight:700;src:url(data:font/woff2;base64,${f}) format('woff2')}`;
    return svgText.replace(/<style([^>]*)>/, (m0) => `${m0}${css}`);
  } catch { return svgText; }   // ohne Schrift: die Ersatzschriften der Liste greifen
}
export async function speichereSvg(svg: SVGSVGElement, titel: string) {
  speichere(new Blob([await schriftEinbetten(eigenstaendig(svg))], { type: 'image/svg+xml' }), dateiname(titel) + '.svg');
}

/** SVG → Zeichenfläche (heller Grund) in f-facher Größe. */
async function rastere(svg: SVGSVGElement, f: number, marke = true): Promise<HTMLCanvasElement> {
  const text = eigenstaendig(svg, marke), vb = { width: svg.viewBox.baseVal.width, height: svg.viewBox.baseVal.height + fussHoehe(marke) };
  const img = new Image();
  await new Promise<void>((ok, nein) => { img.onload = () => ok(); img.onerror = () => nein(new Error(L('Bild nicht lesbar', 'Image could not be read'))); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(text); });
  const c = document.createElement('canvas'); c.width = Math.round(vb.width * f); c.height = Math.round(vb.height * f);
  const g = c.getContext('2d')!; g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
  return c;
}
const alsBlob = (c: HTMLCanvasElement) => new Promise<Blob | null>(ok => c.toBlob(ok, 'image/png'));

/** SVG → PNG-Daten (hell, weißer Grund) für PDF und Word. */
/** marke = false: ohne eigene Logo-Fußzeile (im Bericht trägt die Seite das Logo schon, lib/dokumentmarke.ts). */
export async function alsPng(svg: SVGSVGElement, f = 2, marke = true): Promise<{ daten: Uint8Array; url: string; breite: number; hoehe: number }> {
  const vb = svg.viewBox.baseVal, c = await rastere(svg, f, marke);
  const url = c.toDataURL('image/png');
  const bin = atob(url.split(',')[1]!); const daten = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) daten[i] = bin.charCodeAt(i);
  return { daten, url, breite: vb.width, hoehe: vb.height + fussHoehe(marke) };
}

export async function speicherePng(svg: SVGSVGElement, titel: string) {
  const blob = await alsBlob(await rastere(svg, 2));
  if (blob) speichere(blob, dateiname(titel) + '.png');
}

/** PNG für den Druck: bei 16 cm Breite 300 dpi, mit dpi-Angabe (pHYs) im Bild, damit Word die Größe richtig nimmt. */
export async function druckPng(svg: SVGSVGElement): Promise<Blob | null> {
  const vb = svg.viewBox.baseVal, blob = await alsBlob(await rastere(svg, druckFaktor(vb.width)));
  return blob ? new Blob([pngMitDpi(new Uint8Array(await blob.arrayBuffer()), DRUCK_DPI) as BlobPart], { type: 'image/png' }) : null;
}
export async function speicherePngDruck(svg: SVGSVGElement, titel: string) {
  const blob = await druckPng(svg);
  if (blob) speichere(blob, dateiname(titel) + ' 300dpi.png');
}
/** PNG in die Zwischenablage (zum Einfügen in Word, PowerPoint, Mails). Wirft, wenn der Browser es nicht kann. */
export async function kopierePng(svg: SVGSVGElement) {
  const blob = await alsBlob(await rastere(svg, 2));
  if (!blob) throw new Error('png');
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
}
export const kannBildKopieren = () => typeof ClipboardItem !== 'undefined' && !!navigator.clipboard?.write;
