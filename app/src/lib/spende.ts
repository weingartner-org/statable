/**
 * Unterstützen (Spenden) - Johannes 23.11.2026: Schalter unten auf der Startseite und alle 10 Stunden aktiver Nutzung eine Erinnerung.
 * ===========================================================================
 * Die Zahlungslinks sind dieselben wie bei den Lernprogrammen (Stripe, Zahlungslinks, Live-Modus). Bezahlt wird bei Stripe in einem neuen Tab:
 * auf dem Server von Statable liegt nie eine Kartennummer, und Statable erfährt nicht, WER gezahlt hat.
 *
 * ★★ KEIN VERSPRECHEN AM KNOPF. Die Texte sagen, dass Statable kostenlos und werbefrei bleibt - für alle, ob sie zahlen oder nicht. Nie „damit …“,
 * nie eine Gegenleistung: Das hält die Zahlung eine Spende.
 *
 * ★★ DIE ZEIT BLEIBT AM GERÄT. Der Zähler (`localStorage`, Schlüssel unten) geht an keinen Server und ist vom Schalter der Besucherzählung
 * unabhängig: Er ist nur dazu da, die Erinnerung auszulösen. Wer die Websitedaten löscht, beginnt bei null.
 *
 * ★ Nur auf statable.eu (und in der Entwicklung). Die Offline-Fassung und Installationen bei einer Hochschule zeigen nichts - dort wäre ein Zahlungslink an
 * Johannes' Konto unpassend.
 */
export type Betrag = { readonly euro: number; readonly url: string };

/** Die vier festen Beträge (Stripe-Zahlungslinks vom 02.09.2026; öffentlich, erheben keine Daten). */
export const BETRAEGE: readonly Betrag[] = [
  { euro: 5, url: 'https://buy.stripe.com/9B6fZif3Jaws3Ab79A6Na01' },
  { euro: 10, url: 'https://buy.stripe.com/7sY3cwaNtfQM4EffG66Na00' },
  { euro: 20, url: 'https://buy.stripe.com/bJe6oI5t9fQM4EfctU6Na02' },
  { euro: 50, url: 'https://buy.stripe.com/7sY14of3J9sodaLgKa6Na03' },
];
/** „Betrag selbst wählen": ein Produkt zu 1 Euro, dessen MENGE (1 bis 500) die Person auf der Bezahlseite einstellt - ein freies Betragsfeld gibt es bei Zahlungslinks nicht. */
export const FREI_URL = 'https://buy.stripe.com/00wbJ28FldIEfiTfG66Na04';

/** Alle wie viele Stunden aktiver Nutzung die Erinnerung kommt. */
export const ERINNERUNG_STUNDEN = 10;
const STUNDE_MS = 3_600_000;
/** Nach so langer Ruhe (keine Eingabe) zählt die Zeit nicht mehr als Nutzung. */
export const RUHE_MS = 5 * 60_000;

export const SCHLUESSEL_ZEIT = 'statable-nutzung';
export const SCHLUESSEL_AUS = 'statable-spende-aus';

/** `ms` = bisherige aktive Nutzung, `naechste` = bei so vielen Stunden kommt die nächste Erinnerung. */
export type Stand = { ms: number; naechste: number };
export const anfangsstand = (): Stand => ({ ms: 0, naechste: ERINNERUNG_STUNDEN });

/** Liest einen gespeicherten Stand; Unsinn (kein JSON, Minus, Text) wird zum Anfangsstand. */
export function leseStand(roh: string | null): Stand {
  try {
    const j = JSON.parse(roh ?? 'null');
    if (j && Number.isFinite(j.ms) && j.ms >= 0 && Number.isFinite(j.naechste) && j.naechste >= ERINNERUNG_STUNDEN) return { ms: j.ms, naechste: j.naechste };
  } catch { /* Anfangsstand */ }
  return anfangsstand();
}

/**
 * Zeit dazurechnen. Fällig, sobald die Nutzung die nächste Schwelle erreicht; die Schwelle springt dann auf das nächste Vielfache von 10 Stunden ÜBER der
 * Nutzung - so kommt die Erinnerung nie zweimal für dieselben 10 Stunden, auch wenn der Tab zwischendurch geschlossen wird.
 * `stunden` ist die erreichte Schwelle (10, 20, 30 …) für den Text.
 */
export function addiere(stand: Stand, plusMs: number): { stand: Stand; faellig: boolean; stunden: number } {
  const ms = stand.ms + Math.max(0, plusMs);
  if (ms < stand.naechste * STUNDE_MS) return { stand: { ms, naechste: stand.naechste }, faellig: false, stunden: 0 };
  const erreicht = Math.floor(ms / (ERINNERUNG_STUNDEN * STUNDE_MS)) * ERINNERUNG_STUNDEN;
  return { stand: { ms, naechste: erreicht + ERINNERUNG_STUNDEN }, faellig: true, stunden: erreicht };
}

/** Gibt es Statable hier mit Spendenweg? (statable.eu, gebaut oder in der Entwicklung; nicht offline) */
export const spendeMoeglich = (): boolean =>
  import.meta.env.VITE_OFFLINE !== '1' && typeof location !== 'undefined' && (import.meta.env.DEV || location.hostname === 'statable.eu');

const lies = (k: string): string | null => { try { return localStorage.getItem(k); } catch { return null; } };
const schreibe = (k: string, w: string | null): void => { try { if (w === null) localStorage.removeItem(k); else localStorage.setItem(k, w); } catch { /* privates Fenster: gilt bis zum Neuladen nicht - hinnehmbar */ } };

/** Hat die Person die Erinnerung abgeschaltet? (Der Schalter auf der Seite „Unterstützen".) */
export const erinnerungAus = (): boolean => lies(SCHLUESSEL_AUS) === '1';
export const erinnerungSchalten = (aus: boolean): void => schreibe(SCHLUESSEL_AUS, aus ? '1' : null);
export const standLesen = (): Stand => leseStand(lies(SCHLUESSEL_ZEIT));
export const standSchreiben = (s: Stand): void => schreibe(SCHLUESSEL_ZEIT, JSON.stringify(s));
/** Stunden aktiver Nutzung, abgerundet (für die Anzeige auf der Seite). */
export const stundenGenutzt = (): number => Math.floor(standLesen().ms / STUNDE_MS);
