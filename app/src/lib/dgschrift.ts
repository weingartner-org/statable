/**
 * Diagramme auf dem Handy: Die SVG-Diagramme werden mit der Breite verkleinert, die Schrift mit. Bei 390 px läge die
 * Achsenbeschriftung dann unter 8 px. Hier wird jedes Diagramm beobachtet; ist es kleiner als gezeichnet, bekommt es
 * die Klasse `skaliert` und die Schriftgrößen `--dg-klein` und `--dg-text` (in der Zeichnung gerechnet, so dass sie
 * auf dem Bildschirm etwa 11 bis 12 px ergeben). Gespeicherte Bilder (PNG/SVG) bleiben unberührt: bild.ts nimmt eine Kopie ohne diese Werte.
 */
const ZIEL_KLEIN = 11.5, ZIEL_TEXT = 12.5, MAX_KLEIN = 21, MAX_TEXT = 23;

function passe(svg: SVGSVGElement) {
  const vb = svg.viewBox.baseVal, breite = svg.getBoundingClientRect().width;
  if (!vb || !vb.width || !breite) return;
  const skala = breite / vb.width;
  if (skala >= 0.9) { svg.classList.remove('skaliert'); svg.style.removeProperty('--dg-klein'); svg.style.removeProperty('--dg-text'); return; }
  svg.classList.add('skaliert');
  svg.style.setProperty('--dg-klein', Math.min(MAX_KLEIN, ZIEL_KLEIN / skala).toFixed(1) + 'px');
  svg.style.setProperty('--dg-text', Math.min(MAX_TEXT, ZIEL_TEXT / skala).toFixed(1) + 'px');
}

export function diagrammSchrift() {
  if (typeof ResizeObserver === 'undefined' || typeof MutationObserver === 'undefined') return;
  const ro = new ResizeObserver(es => { for (const e of es) passe(e.target as SVGSVGElement); });
  const beobachte = (wurzel: ParentNode) => wurzel.querySelectorAll<SVGSVGElement>('svg.diagramm').forEach(svg => { if (!(svg as any)._dgs) { (svg as any)._dgs = true; ro.observe(svg); } });
  beobachte(document);
  new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n instanceof Element) { if (n.matches('svg.diagramm') ) { if (!(n as any)._dgs) { (n as any)._dgs = true; ro.observe(n); } } else beobachte(n); } }).observe(document.body, { childList: true, subtree: true });
}
