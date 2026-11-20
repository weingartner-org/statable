/**
 * Macht aus jedem Fachbegriff im Text einen Knopf, der die Seitenleiste öffnet (Johannes 31.10.: alle über 1.400 Wörter, überall).
 * Er beobachtet die ganze Seite: Texte, die erst beim Rechnen entstehen (Auswertung, Bericht), und Texte, die Svelte später ändert, werden von selbst verlinkt.
 *
 * Svelte besitzt seine Textknoten. Darum bleibt der Originalknoten stehen und behält den Text bis zum ersten Begriff; Knopf und Resttext kommen dahinter.
 * Ändert Svelte den Knoten oder entfernt ihn, räumen wir unsere Teile weg und beginnen (bei Änderung) neu.
 */
import { finde, type BegriffsIndex } from '../hilfe/begriffsfinder';

/** Id des einen versteckten Hinweistexts „Fachbegriff, Eingabe zeigt die Erklärung“, auf den jeder Fachwort-Knopf zeigt. */
export const FACHWORT_HINWEIS_ID = 'begriff-hinweis';
const AUSSER = 'a,button,summary,label,code,pre,kbd,textarea,select,option,input,script,style,svg,th,nav,header,h1,h2,h3,h4,h5,h6,[role="heading"],[data-nolink],[contenteditable="true"],[aria-hidden="true"],.begriff-link,.nur-vorleser';
/** Teile, die wir zu einem Textknoten angelegt haben. */
interface Spur { teile: Node[]; erwartet: string; roh: string }
const spuren = new WeakMap<Text, Spur>();
const eigene = new WeakSet<Node>();
let index: BegriffsIndex | null = null, beobachter: MutationObserver | null = null, offen = new Set<Node>(), geplant = 0;
let aktuellerBegriff: () => string | undefined = () => undefined;

function raeume(k: Text) {
  const sp = spuren.get(k); if (!sp) return;
  for (const t of sp.teile) t.parentNode?.removeChild(t);
  spuren.delete(k);
}

function bearbeite(k: Text) {
  if (!index || !k.parentElement || eigene.has(k)) return;
  const alt = spuren.get(k);
  if (alt) { if (k.data === alt.erwartet) return; raeume(k); }
  const text = k.data;
  if (text.length < 5 || k.parentElement.closest(AUSSER)) return;
  const funde = finde(text, index, aktuellerBegriff());
  if (!funde.length) return;
  const teile: Node[] = [], vor = k.nextSibling, eltern = k.parentNode!;
  // Der Originalknoten behält den Text vor dem ersten Fund; dahinter: Knopf, Zwischentext, Knopf … Rest.
  const dazu = (n: Node) => { eigene.add(n); eltern.insertBefore(n, vor); teile.push(n); };
  funde.forEach((f, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'begriff-link'; b.dataset.gl = f.id; b.textContent = text.slice(f.von, f.bis);
    // Kein Tab-Stopp (Welle 1: auf einer Seite stehen oft über 100); im Lesemodus von NVDA und per Maus bleibt das Wort erreichbar. Der Hinweis steht einmal im DOM (`BegriffsDialog.svelte`).
    b.tabIndex = -1; b.setAttribute('aria-describedby', FACHWORT_HINWEIS_ID);
    dazu(b);
    const bis = funde[i + 1]?.von ?? text.length;
    if (bis > f.bis) dazu(document.createTextNode(text.slice(f.bis, bis)));
  });
  k.data = text.slice(0, funde[0]!.von);
  spuren.set(k, { teile, erwartet: k.data, roh: text });
}

function durchsuche(wurzel: Node) {
  if (wurzel.nodeType === Node.TEXT_NODE) { bearbeite(wurzel as Text); return; }
  if (wurzel.nodeType !== Node.ELEMENT_NODE) return;
  const w = document.createTreeWalker(wurzel, NodeFilter.SHOW_TEXT);
  const liste: Text[] = [];
  for (let n = w.nextNode(); n; n = w.nextNode()) liste.push(n as Text);
  for (const k of liste) bearbeite(k);
}
function raeumeBaum(wurzel: Node) {
  if (wurzel.nodeType === Node.TEXT_NODE) { raeume(wurzel as Text); return; }
  if (wurzel.nodeType !== Node.ELEMENT_NODE) return;
  const w = document.createTreeWalker(wurzel, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) raeume(n as Text);
}

function arbeite() {
  geplant = 0;
  const liste = [...offen]; offen = new Set();
  for (const n of liste) if (n.isConnected) durchsuche(n);
}
function plane(n: Node) {
  offen.add(n);
  if (!geplant) geplant = setTimeout(arbeite, 40) as unknown as number;   // kein requestAnimationFrame: ein verdeckter Tab würde nie verlinken
}

function aufAenderung(ms: MutationRecord[]) {
  for (const m of ms) {
    if (m.type === 'characterData') {
      const k = m.target as Text, sp = spuren.get(k);
      if (sp && k.data !== sp.erwartet) { raeume(k); plane(k); }
      else if (!sp && !eigene.has(k)) plane(k);
    } else {
      for (const n of m.removedNodes) if (!n.isConnected) raeumeBaum(n);
      for (const n of m.addedNodes) if (!eigene.has(n)) plane(n);
    }
  }
}

/** Startet das Beobachten (einmal); `begriff` liefert den Begriff, der gerade in der Seitenleiste steht und nicht noch einmal verlinkt wird. */
export function starteVerlinker(begriff?: () => string | undefined) {
  if (begriff) aktuellerBegriff = begriff;
  if (beobachter || typeof MutationObserver === 'undefined') return;
  beobachter = new MutationObserver(aufAenderung);
  beobachter.observe(document.body, { childList: true, subtree: true, characterData: true });
}
/** Neuer Index (erste Ladung oder Sprachwechsel): alles, was auf der Seite steht, wird nachgeholt. */
export function setzeIndex(ix: BegriffsIndex | null) {
  index = ix;
  if (ix && typeof document !== 'undefined') plane(document.body);
}
export function stoppeVerlinker() { beobachter?.disconnect(); beobachter = null; offen = new Set(); index = null; }

/** Die Fachwort-Knöpfe eines Bereichs in Lesereihenfolge, nur die sichtbaren (nicht in `hidden`, `inert` oder `aria-hidden`). Welle 2 hängt das an die Befehlspalette („Fachbegriffe dieses Abschnitts“). */
export function fachbegriffeImBereich(wurzel: ParentNode = document): HTMLButtonElement[] {
  return [...wurzel.querySelectorAll<HTMLButtonElement>('button.begriff-link')]
    .filter(b => !b.closest('[hidden],[inert],[aria-hidden="true"]') && b.getClientRects().length > 0);
}
