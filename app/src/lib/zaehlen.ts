/**
 * Besucherzählung (Johannes 25.10.2026): Starts, aktive Zeit, Sprache, Gerät, Herkunft, R und R-Pakete, Verfahren, Offline-Fassung.
 * Gegenstück am Server: server/pb_hooks/zaehlung.pb.js (dort die Begründung der zwei Kennungen); Auswertung: public/statistik/.
 *
 * - Nur auf statable.eu, nur im gebauten Paket mit Server (VITE_MELDEN_SERVER=1, wie lib/melden.ts), nie in der Offline-Fassung.
 * - Der Geräte-Merker ist eine gewürfelte Zufallsnummer im lokalen Speicher (kein Cookie), mit nichts verknüpft.
 * - Abgeschaltet (Schalter auf der Datenschutzseite, „Do Not Track“, „Global Privacy Control“): es geht GAR NICHTS mehr hinaus,
 *   der Merker wird gelöscht.
 * - Nie Daten der Auswertung: nur feste Kennwörter (Verfahrens-ID, Paketname, Dateiendung).
 * - Best-effort per sendBeacon; Fehler bleiben still und stören nie die Arbeit.
 * Bewusst ohne Importe (auch engine/webr.ts meldet hierher; lib/offline.ts und lib/melden.ts zögen über i18n/profil die Sitzung nach).
 */

const MERKER = 'statable-geraet';
const AUS = 'statable-zaehlen-aus';
const ROUTE = '/api/statable/zaehlen';
const MAX_MS = 7_200_000;
const RUHE_MS = 10 * 60_000;   // 10 Minuten ohne Eingabe: die Zeit läuft nicht weiter (vergessener Tab ist keine Arbeit)

const lies = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };

/** Wünscht der Browser, nicht verfolgt zu werden? */
function browserSagtNein(): boolean {
  try {
    const n = navigator as Navigator & { globalPrivacyControl?: boolean; msDoNotTrack?: string };
    return n.globalPrivacyControl === true || n.doNotTrack === '1' || n.msDoNotTrack === '1' || (window as unknown as { doNotTrack?: string }).doNotTrack === '1';
  } catch { return false; }
}

/** Ist Zählen hier überhaupt vorgesehen (statable.eu, gebautes Paket mit Server, nicht offline)? */
export const zaehlenMoeglich = (): boolean =>
  import.meta.env.VITE_OFFLINE !== '1' && import.meta.env.VITE_MELDEN_SERVER === '1' && import.meta.env.PROD && typeof location !== 'undefined' && location.hostname === 'statable.eu';

/** Hat die Person die Zählung abgeschaltet (Schalter) oder sagt der Browser „nicht verfolgen“? */
export const zaehlenAus = (): boolean => lies(AUS) === '1' || browserSagtNein();
/** Nur der Schalter (für die Anzeige auf der Datenschutzseite). */
export const zaehlenAbgeschaltet = (): boolean => lies(AUS) === '1';
export const browserNichtVerfolgen = browserSagtNein;

export function zaehlenAbschalten(): void {
  try { localStorage.setItem(AUS, '1'); localStorage.removeItem(MERKER); } catch { /* gesperrter Speicher */ }
}
export function zaehlenAnschalten(): void {
  try { localStorage.removeItem(AUS); } catch { /* egal */ }
}

/** Der Geräte-Merker: 32 Hex-Zeichen, beim ersten Mal gewürfelt. Leer, wenn abgeschaltet oder kein sicherer Zufall da ist. */
function merker(): string {
  if (zaehlenAus()) return '';
  const da = lies(MERKER);
  if (da && /^[0-9a-f]{32}$/.test(da)) return da;
  try {
    const b = new Uint8Array(16);
    crypto.getRandomValues(b);
    const neu = Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(MERKER, neu);
    return lies(MERKER) === neu ? neu : '';
  } catch { return ''; }
}

function sende(nutzlast: Record<string, unknown>): void {
  if (!zaehlenMoeglich() || zaehlenAus()) return;
  try {
    const g = merker();
    const text = JSON.stringify(g ? { ...nutzlast, g } : nutzlast);
    if (navigator.sendBeacon?.(ROUTE, new Blob([text], { type: 'application/json' }))) return;
    void fetch(ROUTE, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: text, keepalive: true }).catch(() => {});
  } catch { /* still */ }
}

export type Ereignis = 'r' | 'rpaket' | 'verfahren' | 'offline' | 'datei' | 'beispiel' | 'export' | 'hilfe' | 'lernen' | 'lernfertig' | 'pfad';
/** Ein Ereignis zählen. `wert` nur als festes Kennwort (Kleinbuchstaben, Ziffern, . _ -), nie Text der Person. */
export function zaehle(was: Ereignis, wert = ''): void {
  const w = String(wert).toLowerCase();
  sende({ k: 'ereignis', was, wert: /^[a-z0-9][a-z0-9._-]{0,39}$/.test(w) ? w : '' });
}

/**
 * Wie `zaehle`, aber je Sitzung (Seitenaufruf) und Wert höchstens einmal - für „geöffnet“: Wer in einer Einheit oder einem Hilfeartikel
 * hin- und herspringt, zählt nicht mehrfach. Seit 06.11.2026 (Johannes): Lerneinheiten (`lernen` geöffnet, `lernfertig` abgeschlossen, `pfad`)
 * und Hilfeartikel der App (`hilfe`) - nur als Summe je Tag, ohne Gerätenummer (der Server verknüpft Ereignisse nie mit dem Merker).
 */
const schonGezaehlt = new Set<string>();
export function zaehleEinmal(was: Ereignis, wert: string): void {
  const k = was + '|' + wert;
  if (schonGezaehlt.has(k)) return;
  schonGezaehlt.add(k);
  zaehle(was, wert);
}

const geraet = (): string => {
  try {
    const touch = matchMedia('(pointer: coarse)').matches;
    const kurz = Math.min(screen.width, screen.height);
    return touch && kurz < 600 ? 'handy' : touch && kurz < 1100 ? 'tablet' : 'rechner';
  } catch { return ''; }
};
const herkunft = (): string => {
  try {
    if (!document.referrer) return '';
    const h = new URL(document.referrer).hostname.toLowerCase().replace(/^www\./, '');
    return h === location.hostname ? '' : h;
  } catch { return ''; }
};

let gestartet = false;
/**
 * Beim Start der App einmal aufrufen: meldet den Start und danach die AKTIVE Zeit in Teilen (bei jedem Wechsel in den Hintergrund
 * und beim Verlassen). Aktiv heißt: Tab sichtbar und in den letzten 10 Minuten eine Eingabe.
 * @param sprache liefert die gerade eingestellte Sprache (sie kann sich während der Arbeit ändern).
 */
export function zaehleStart(sprache: () => string): void {
  if (gestartet || !zaehlenMoeglich() || zaehlenAus()) return;
  gestartet = true;
  const ge = geraet();
  let art = 'browser';
  try { if (matchMedia('(display-mode: standalone)').matches) art = 'app'; } catch { /* Browser */ }
  sende({ k: 'start', sp: sprache(), ge, art, her: herkunft() });

  let summe = 0;                       // abgerechnete, noch nicht gemeldete Zeit
  let seit = document.visibilityState === 'visible' ? Date.now() : 0;   // läuft seit … (0 = steht)
  let letzteEingabe = Date.now();
  const anhalten = () => {
    if (!seit) return;
    const bis = Math.min(Date.now(), letzteEingabe + RUHE_MS);
    if (bis > seit) summe += bis - seit;
    seit = 0;
  };
  const melden = () => {
    anhalten();
    const ms = Math.min(Math.round(summe), MAX_MS);
    summe = 0;
    if (ms >= 1000) sende({ k: 'ende', ms, sp: sprache(), ge });
  };
  const eingabe = () => {
    const jetzt = Date.now();
    // Nach einer Ruhepause beginnt die Zeit neu - die Pause selbst zählt nicht.
    if (seit && jetzt - letzteEingabe > RUHE_MS) { anhalten(); seit = jetzt; }
    letzteEingabe = jetzt;
    if (!seit && document.visibilityState === 'visible') seit = jetzt;
  };
  for (const t of ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll']) addEventListener(t, eingabe, { passive: true, capture: true });
  addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') melden();   // auf dem Handy oft das letzte Ereignis überhaupt
    else { letzteEingabe = Date.now(); seit = Date.now(); }
  });
  addEventListener('pagehide', melden);
}
