/**
 * S-G: Diagramme gestalten (Johannes 22.10.: „ein guter Editor, der wirklich abdeckt, was man braucht“).
 * Gilt für ALLE Diagramme, weil jedes in `DiagrammExport` steckt: der Editor arbeitet am fertigen SVG, nicht an den Zahlen.
 *   - Beschriftungen umbenennen (Titel, Achsentitel, Gruppen- und Legendennamen). Zahlen, Prozente, p-Werte und Achsenmarken bleiben UNVERÄNDERBAR.
 *   - Farben der Datenzeichen tauschen (Palette, Graustufen, eigene Farbe); Achsen, Linien und Schrift bleiben.
 *   - Schriftgröße, Punktgröße und Linienstärke.
 * Die Wahl ist ein kleines Objekt (`Gestalt`) am Blatt und wird mit dem Projekt gespeichert. Die Anwendung ist wiederholbar: Svelte darf das Diagramm
 * neu zeichnen, `wendeAn` setzt danach dieselbe Gestalt wieder darauf (Originalwerte stehen in data-g-*).
 */
export interface Gestalt {
  /** Original-Beschriftung → neue Beschriftung (nur Texte, die keine Zahl sind) */
  texte: Record<string, string>;
  /** Original-Farbe (#rrggbb) → neue Farbe */
  farben: Record<string, string>;
  /** Schrift in Prozent (100 = wie berechnet) */
  schrift: number;
  /** Punktgröße und Linienstärke in Prozent */
  zeichen: number;
  /** Reihenfolge der Kategorien (Häufigkeiten: die Stufen; Kreuztabelle: die Antworten) und, nur bei der Kreuztabelle, der Gruppen; leer = wie berechnet */
  reihe?: string[]; reiheB?: string[];
}
export const gestaltGrund = (): Gestalt => ({ texte: {}, farben: {}, schrift: 100, zeichen: 100 });
export const istGrund = (g: Gestalt | undefined) => !g || (!Object.keys(g.texte).length && !Object.keys(g.farben).length && g.schrift === 100 && g.zeichen === 100 && !g.reihe?.length && !g.reiheB?.length);
export const gestaltMit = (g: Partial<Gestalt> | undefined): Gestalt => ({ ...gestaltGrund(), ...(g ?? {}) });

/** Farbwahl: eine ruhige Reihe für alle Fälle (Okabe-Ito, auch bei Farbfehlsichtigkeit unterscheidbar) und Statable-Farben; Namen kommen aus der Oberfläche. */
export const PALETTE: { hex: string; id: 'petrol' | 'koralle' | 'blau' | 'orange' | 'gruen' | 'gelb' | 'violett' | 'rot' | 'grau' | 'schwarz' }[] = [
  { hex: '#17756a', id: 'petrol' }, { hex: '#e8735a', id: 'koralle' }, { hex: '#0072b2', id: 'blau' }, { hex: '#e69f00', id: 'orange' },
  { hex: '#009e73', id: 'gruen' }, { hex: '#f0e442', id: 'gelb' }, { hex: '#cc79a7', id: 'violett' }, { hex: '#d55e00', id: 'rot' },
  { hex: '#8c8c8c', id: 'grau' }, { hex: '#222222', id: 'schwarz' }
];
/** Graustufen für Schwarz-Weiß-Druck: so viele Töne wie Farben, von dunkel nach hell. */
export const graustufen = (n: number): string[] => Array.from({ length: n }, (_, i) => { const v = n === 1 ? 70 : Math.round(40 + (i * 170) / (n - 1)); const h = v.toString(16).padStart(2, '0'); return `#${h}${h}${h}`; });

/** „1,5“, „-3“, „45 %“, „< ,001“, „12.345“, „95 %“, „−0,2“ und „n = 5“: ein Text, der nur eine Zahl oder eine Angabe mit Zahl ist - bleibt unverändert. */
export const istZahlText = (t: string) => /^[\s<>=≤≥±+\-−–(]*[\d.,]*\d[\d.,]*\s*(%|‰)?[\s)]*$/.test(t.trim()) || t.trim() === ''
  || /[=<>≤≥]\s*[-−]?[\d.,]*\d/.test(t);   // „n = 5“, „p < ,05“, „M = 5,0“: Angaben mit Zahl sind berechnet

/** "rgb(23, 117, 106)" oder "rgba(…)" → "#17756a"; sonst null (none, transparent, Verläufe). */
export function alsHex(css: string): string | null {
  const m = css.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:[\s,/]+([\d.]+))?\s*\)$/);
  if (!m) return null;
  if (m[4] !== undefined && parseFloat(m[4]) === 0) return null;
  return '#' + [m[1], m[2], m[3]].map(x => Math.min(255, +x!).toString(16).padStart(2, '0')).join('');
}
/** Graue und fast weiße Töne (Achsen, Gitter, Rahmen) gehören nicht zu den Datenfarben. */
export function istNeutral(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return Math.max(r, g, b) - Math.min(r, g, b) < 28;
}

const FORM = 'rect,circle,ellipse,path,polygon,polyline,line';
const nichtDaten = (el: Element) => !!el.closest('[aria-hidden="true"]');

export interface Gefunden { texte: string[]; farben: { hex: string; n: number }[] }

/** Was sich an diesem Diagramm ändern lässt (Originalwerte, nicht die schon geänderten). */
/** Der Text, den „Gestalten“ ändern kann: das Original (`data-g-o`) oder der erste eigene Textknoten - wie `wendeAn`. Ohne eigenen Textknoten (nur `<tspan>`, `<title>`) null:
 *  so ein Text lässt sich nicht umschreiben und kommt nicht in die Liste. Vorher kam `textContent` hinein, samt `<title>` - „diversdivers“ im Säulendiagramm mit Gruppen (29.10.2026). */
export function eigenerText(t: { dataset: DOMStringMap; childNodes: ArrayLike<{ nodeType: number; nodeValue: string | null }> }): string | null {
  if (t.dataset.gO !== undefined) return t.dataset.gO;
  const k = Array.from(t.childNodes).find(n => n.nodeType === 3);
  return k ? k.nodeValue ?? '' : null;
}

export function sammle(svg: SVGSVGElement): Gefunden {
  const texte = new Map<string, number>(), farben = new Map<string, number>();
  svg.querySelectorAll('text').forEach(t => {
    if (nichtDaten(t)) return;
    const o = eigenerText(t as SVGTextElement);
    if (o !== null && o.trim() && !istZahlText(o)) texte.set(o, (texte.get(o) ?? 0) + 1);
  });
  svg.querySelectorAll(FORM).forEach(el => {
    if (nichtDaten(el)) return;
    for (const w of ['fill', 'stroke'] as const) {
      const o = (el as SVGElement).dataset[w === 'fill' ? 'gF' : 'gS'] ?? alsHex(getComputedStyle(el)[w]);
      if (o && !istNeutral(o)) farben.set(o, (farben.get(o) ?? 0) + 1);
    }
  });
  return { texte: [...texte.keys()], farben: [...farben].map(([hex, n]) => ({ hex, n })) };
}

/** Setzt die Gestalt auf das Diagramm; ohne Änderung stellt sie die Originale wieder her. Wiederholbar. */
export function wendeAn(svg: SVGSVGElement, g: Gestalt | undefined) {
  const x = gestaltMit(g);
  svg.querySelectorAll('text').forEach(el => {
    const t = el as SVGTextElement;
    if (nichtDaten(t)) return;
    // Der erste Textknoten gehört Svelte: seinen Wert ändern, den Knoten nie ersetzen.
    const knoten = [...t.childNodes].find(n => n.nodeType === 3);
    if (!knoten) return;
    const jetzt = knoten.nodeValue ?? '';
    const orig = t.dataset.gA !== undefined && jetzt === t.dataset.gA ? (t.dataset.gO ?? jetzt) : jetzt;
    t.dataset.gO = orig;
    const neu = !istZahlText(orig) && x.texte[orig] !== undefined && x.texte[orig]!.trim() ? x.texte[orig]! : orig;
    if (knoten.nodeValue !== neu) knoten.nodeValue = neu;
    t.dataset.gA = neu;
    if (t.dataset.gFs === undefined) t.dataset.gFs = String(parseFloat(getComputedStyle(t).fontSize) || 0);
    const fs = parseFloat(t.dataset.gFs);
    if (fs > 0) { if (x.schrift === 100) t.style.removeProperty('font-size'); else t.style.fontSize = `${(fs * x.schrift) / 100}px`; }
  });
  svg.querySelectorAll(FORM).forEach(el => {
    const e = el as SVGElement;
    if (nichtDaten(e)) return;
    for (const w of ['fill', 'stroke'] as const) {
      const key = w === 'fill' ? 'gF' : 'gS';
      if (e.dataset[key] === undefined) { const h = alsHex(getComputedStyle(e)[w]); e.dataset[key] = h && !istNeutral(h) ? h : ''; }
      const o = e.dataset[key]!;
      if (!o) continue;
      const neu = x.farben[o];
      if (neu) e.style.setProperty(w, neu); else e.style.removeProperty(w);
    }
    if (e.tagName === 'circle') {
      if (e.dataset.gR === undefined) e.dataset.gR = e.getAttribute('r') ?? '';
      const r = parseFloat(e.dataset.gR);
      if (r > 0) e.setAttribute('r', String((r * x.zeichen) / 100));
    } else if ((e.tagName === 'path' || e.tagName === 'polyline' || e.tagName === 'line') && e.dataset.gS && (e.tagName === 'line' || getComputedStyle(e).fill === 'none')) {
      // nur farbige Linien (Daten), nie Achsen und Gitter
      if (e.dataset.gW === undefined) e.dataset.gW = String(parseFloat(getComputedStyle(e).strokeWidth) || 0);
      const w0 = parseFloat(e.dataset.gW);
      if (w0 > 0) { if (x.zeichen === 100) e.style.removeProperty('stroke-width'); else e.style.strokeWidth = String((w0 * x.zeichen) / 100); }
    }
  });
}

/**
 * Welche gespeicherte Wahl gehört zu diesem Diagramm? Im Blatt hängt sie am Titel des Diagramms; der Bericht zeichnet die Diagramme neu und kennt den Titel nicht.
 * Darum zählt der Treffer: die Wahl, deren Beschriftungen und Farben im Diagramm vorkommen, am häufigsten. Eine Wahl nur mit Größen gilt, wenn das Blatt genau eine hat.
 */
export function waehleGestalt(alle: Record<string, Gestalt>, svg: SVGSVGElement): Gestalt | null {
  const eintraege = Object.values(alle);
  if (!eintraege.length) return null;
  const hier = sammle(svg), texte = new Set(hier.texte), farben = new Set(hier.farben.map(f => f.hex));
  let beste: Gestalt | null = null, punkte = 0;
  for (const g of eintraege) {
    const p = Object.keys(g.texte).filter(k => texte.has(k)).length + Object.keys(g.farben).filter(k => farben.has(k)).length;
    if (p > punkte) { punkte = p; beste = g; }
  }
  return beste ?? (eintraege.length === 1 && !Object.keys(eintraege[0]!.texte).length && !Object.keys(eintraege[0]!.farben).length ? eintraege[0]! : null);
}

/** Namen in die gewünschte Reihenfolge bringen; Fehlendes und Neues bleibt in der alten Reihenfolge hinten, Unbekanntes fällt weg. */
export function ordneNach(namen: string[], reihe: string[] | undefined): string[] {
  if (!reihe?.length) return namen;
  return [...reihe.filter(n => namen.includes(n)), ...namen.filter(n => !reihe.includes(n))];
}
/** Welche gespeicherte Reihenfolge gehört zu diesen Kategorien? Die, die genau dieselben Namen enthält (so findet auch der Bericht sie ohne Titel). */
export function reiheFuer(alle: Record<string, Gestalt> | undefined, namen: string[], feld: 'reihe' | 'reiheB' = 'reihe'): string[] | undefined {
  const gleich = (r: string[]) => r.length === namen.length && r.every(n => namen.includes(n));
  return Object.values(alle ?? {}).map(g => g[feld]).find(r => r?.length && gleich(r));
}
/** Daten eines Häufigkeitsdiagramms in der gewählten Reihenfolge der Stufen. */
export function haeufigGeordnet<T extends { werte: { name: string }[] }>(h: T, alle: Record<string, Gestalt> | undefined): T {
  const namen = h.werte.map(w => w.name), reihe = reiheFuer(alle, namen);
  if (!reihe) return h;
  const neu = ordneNach(namen, reihe);
  return { ...h, werte: neu.map(n => h.werte.find(w => w.name === n)!) };
}
/** Kreuztabelle: Antworten (Spalten der Zählung) und Gruppen (Zeilen) in der gewählten Reihenfolge; die Zahlen wandern mit. */
export function kreuzGeordnet<T extends { zaehlung?: { zeilen: string[]; spalten: string[]; tab: number[][] } }>(e: T, alle: Record<string, Gestalt> | undefined): T {
  const z = e.zaehlung; if (!z) return e;
  const sp = ordneNach(z.spalten, reiheFuer(alle, z.spalten, 'reihe')), ze = ordneNach(z.zeilen, reiheFuer(alle, z.zeilen, 'reiheB'));
  if (sp.every((n, i) => n === z.spalten[i]) && ze.every((n, i) => n === z.zeilen[i])) return e;
  const tab = ze.map(r => sp.map(c => z.tab[z.zeilen.indexOf(r)]![z.spalten.indexOf(c)]!));
  return { ...e, zaehlung: { zeilen: ze, spalten: sp, tab } };
}
