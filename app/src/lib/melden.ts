/**
 * „Melden“ (Fehler oder Wunsch) mit Bild vom Fenster, 23.10.2026. Hauptweg: Die Meldung geht auf Knopfdruck an den Server von Statable (server/pb_hooks/melden.pb.js),
 * der sie ablegt und an service@statable.eu mailt - ohne Mailprogramm. Ist der Server nicht erreichbar (Entwicklung, Netz weg, Server noch nicht eingerichtet), bleibt der
 * Rückweg: das Mailprogramm der Person öffnen; das Bild liegt dann in der Zwischenablage (zum Einfügen) und lässt sich speichern. Ohne Knopfdruck wird nichts gesendet.
 * Das Bild zeichnet `html2canvas-pro` aus dem Seitenbaum nach (ohne Rückfrage des Browsers, nur das Fenster); es wird erst beim Melden geladen.
 * Elemente mit `data-kein-bildschirmabzug` fehlen im Bild.
 */
export const MELDEN_ADRESSE = 'service@statable.eu';
export const KEIN_BILD = 'data-kein-bildschirmabzug';
/** Adresse der Meldestelle; relativ zur Seite, damit es unter jedem Pfad stimmt (Entwicklung: Vite leitet `/api` an den lokalen PocketBase um). */
export const MELDEN_URL = (import.meta.env.VITE_MELDEN_URL as string | undefined) || 'api/statable/melden';

/** Gibt es die Meldestelle auf dem Server? Erst wenn sie eingerichtet ist (docs/MELDEN-SERVER-EINRICHTEN-2026-10-23.md), wird mit `VITE_MELDEN_SERVER=1 npm run build` ausgeliefert; bis dahin bleibt es beim Mailprogramm. In der Entwicklung (vite) immer an. */
export const MELDEN_SERVER = import.meta.env.DEV || import.meta.env.VITE_MELDEN_SERVER === '1';

export type SendeErgebnis = 'ok' | 'kein-server' | 'zu-viele' | 'fehler';
/** Meldung an den Server schicken. `kein-server`: nicht erreichbar oder Route fehlt (404/405); der Aufrufer bietet dann den Weg über das Mailprogramm an. */
export async function sendeMeldung(m: { art: 'fehler' | 'wunsch' | 'barriere'; text: string; technik: string; seite: string; antwort: string; bild: Blob | null }): Promise<SendeErgebnis> {
  const f = new FormData();
  f.set('art', m.art); f.set('text', m.text.trim()); f.set('technik', m.technik); f.set('seite', m.seite); f.set('antwort', m.antwort.trim());
  if (m.bild) f.set('bild', m.bild, 'fenster.png');
  try {
    const r = await fetch(MELDEN_URL, { method: 'POST', body: f });
    if (r.ok) return 'ok';
    if (r.status === 404 || r.status === 405 || r.status === 502 || r.status === 503) return 'kein-server';
    if (r.status === 429) return 'zu-viele';
    return 'fehler';
  } catch { return 'kein-server'; }
}
/** Der erste Teil der Adresse (die Seite), ohne Daten. */
export const seiteKurz = (): string => location.hash.replace(/^#/, '').split('/')[0] || 'start';

/** Länger wartet niemand auf ein Bild - dann geht die Meldung ohne. */
const FRIST_MS = 10000;

/** Den sichtbaren Teil des Fensters als PNG aufnehmen; `null`, wenn es nicht klappt (die Meldung geht dann ohne Bild). */
export async function nimmFensterAuf(): Promise<Blob | null> {
  try {
    const { default: html2canvas } = await import('html2canvas-pro');
    const zeichnen = html2canvas(document.documentElement, {
      backgroundColor: getComputedStyle(document.body).backgroundColor || '#ffffff',
      scale: Math.min(1, 1600 / Math.max(window.innerWidth, 1)), logging: false, useCORS: false,
      x: window.scrollX, y: window.scrollY, width: window.innerWidth, height: window.innerHeight, windowWidth: window.innerWidth, windowHeight: window.innerHeight,
      ignoreElements: el => el.hasAttribute(KEIN_BILD) || el.tagName === 'DIALOG',
      // Die Aufnahme baut die Seite neu auf und startet dabei jede Einblend-Animation (`einblenden`, `aufklappen` …) von vorn: Inhalte mit Deckkraft 0 kamen leer ins Bild
      // (Meldungen 01. bis 03.11.: Ergebnisfläche links leer). Ohne Animation zeigt das Bild den Endstand.
      onclone: doc => { const st = doc.createElement('style'); st.textContent = '*,*::before,*::after{animation:none!important;transition:none!important}'; doc.head.appendChild(st); }
    });
    const fertig = await Promise.race([zeichnen, new Promise<null>(r => setTimeout(() => r(null), FRIST_MS))]);
    if (!fertig) return null;
    return await new Promise<Blob | null>(r => fertig.toBlob(b => r(b), 'image/png'));
  } catch { return null; }
}

/** Technische Angaben ohne Daten: Stand der App, Sprache, Seite (nur der erste Teil der Adresse), Fenstergröße, Browser. */
export function technik(sprache: string): string {
  const skript = document.querySelector<HTMLScriptElement>('script[src*="/assets/index-"], script[src*="/assets/main-"]')?.src.match(/(?:index|main)-([^./]+)\.js/)?.[1] ?? '?';
  const seite = (location.hash.replace(/^#/, '').split('/')[0] || 'start');
  return [`Stand: ${skript}`, `Sprache: ${sprache}`, `Seite: ${seite}`, `Fenster: ${window.innerWidth} x ${window.innerHeight} (${Math.round(window.devicePixelRatio * 100)} %)`, `Browser: ${navigator.userAgent}`].join('\n');
}

/** Adresse für das Mailprogramm. */
export function mailAdresse(art: 'fehler' | 'wunsch' | 'barriere', text: string, technikText: string, mitBild: boolean, deutsch: boolean): string {
  const betreff = art === 'fehler' ? (deutsch ? 'Statable: Etwas funktioniert nicht' : 'Statable: Something does not work') : art === 'barriere' ? (deutsch ? 'Statable: Barriere gefunden' : 'Statable: Accessibility barrier') : (deutsch ? 'Statable: Ein Wunsch' : 'Statable: A wish');
  const bildHinweis = mitBild ? (deutsch ? '\n\n[Bild vom Fenster: bitte hier einfügen (Strg + V oder Cmd + V)]' : '\n\n[Picture of the window: please paste it here (Ctrl + V or Cmd + V)]') : '';
  const rumpf = `${text.trim()}${bildHinweis}\n\n--\n${technikText}`;
  return `mailto:${MELDEN_ADRESSE}?subject=${encodeURIComponent(betreff)}&body=${encodeURIComponent(rumpf)}`;
}

/** Das Bild in die Zwischenablage legen (zum Einfügen in die Mail); false, wenn der Browser es nicht erlaubt. */
export async function bildKopieren(bild: Blob): Promise<boolean> {
  try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': bild })]); return true; } catch { return false; }
}
