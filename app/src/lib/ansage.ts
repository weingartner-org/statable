/**
 * Ansagen für Screenreader (Barrierefreiheit Welle 1, Plan Abschnitt 2 „Ansagen“). Ein zentrales Modul statt vieler verstreuter Live-Regionen.
 * - Zwei Kanäle, je eine feste Region, die einmal im DOM steht: „hoeflich“ (aria-live polite, wartet, bis der Satz zu Ende gesprochen ist)
 *   und „dringend“ (assertive/alert, unterbricht). Dringend nur für Fehler und Datenverlust-Gefahr.
 * - Eine Meldung wird so gesendet: Region leeren, im nächsten Takt (`setTimeout(0)`, nie `requestAnimationFrame`) füllen. Sonst liest NVDA
 *   eine gleiche Meldung zum zweiten Mal nicht.
 * - Gleiche Meldung im gleichen Kanal innerhalb von `ENTPRELL_MS` wird verworfen (Doppelklick, Schleifen).
 * - Jede Live-Meldung erscheint in NVDA auch als Blitzmeldung auf der Braillezeile und verdrängt die gelesene Zeile: sparsam ansagen.
 *   Regel: nur, was der Mensch wissen muss, ohne hinzusehen. Nichts bei jedem Tastendruck, nichts doppelt (Region plus Fokus auf dasselbe).
 * Die Logik hängt an einer kleinen Umgebung (`AnsageUmgebung`), damit sie ohne Browser getestet werden kann.
 */

export type Kanal = 'hoeflich' | 'dringend';

export interface AnsageUmgebung {
  /** Schreibt den Text in die Region des Kanals (leerer Text leert sie). Legt die Region an, falls sie fehlt. */
  schreibe(kanal: Kanal, text: string): void;
  spaeter(f: () => void): void;
  /** Führt `f` nach `ms` aus; die zurückgegebene Funktion nimmt es zurück. */
  nach(f: () => void, ms: number): () => void;
  jetzt(): number;
}

export const ENTPRELL_MS = 1000;
/** Bestätigung nach einem Fokuswechsel (Kodier-Arbeitsplatz): NVDA spricht zuerst die Fokus-Ansage; eine sofortige Ansage ging in der NVDA-Messung 6b verloren. */
export const NACH_FOKUS_MS = 1500;
export const REGION_ID: Record<Kanal, string> = { hoeflich: 'ansage-hoeflich', dringend: 'ansage-dringend' };

/** Legt die zwei Regionen an (genau einmal; vorhandene werden wiederverwendet) und liefert sie zurück. */
export function bereiteRegionenVor(doc: Document): Record<Kanal, HTMLElement> {
  const hole = (kanal: Kanal): HTMLElement => {
    const id = REGION_ID[kanal];
    const da = doc.getElementById(id);
    if (da) return da;
    const e = doc.createElement('div');
    e.id = id;
    e.className = 'nur-vorleser';
    e.setAttribute('aria-live', kanal === 'dringend' ? 'assertive' : 'polite');
    e.setAttribute('role', kanal === 'dringend' ? 'alert' : 'status');
    e.setAttribute('aria-atomic', 'true');
    doc.body.appendChild(e);
    return e;
  };
  return { hoeflich: hole('hoeflich'), dringend: hole('dringend') };
}

const browser: AnsageUmgebung = {
  schreibe: (kanal, text) => { if (typeof document !== 'undefined' && document.body) bereiteRegionenVor(document)[kanal].textContent = text; },
  spaeter: f => { setTimeout(f, 0); },
  nach: (f, ms) => { const t = setTimeout(f, ms); return () => clearTimeout(t); },
  jetzt: () => Date.now(),
};
let umg: AnsageUmgebung = browser;
/** Nur für Tests. */
export const setzeAnsageUmgebung = (u: AnsageUmgebung | null) => { umg = u ?? browser; zuletzt.clear(); wartend.clear(); angesagteRechnungen = 0; letzteEnde = -Infinity; };

const zuletzt = new Map<Kanal, { text: string; zeit: number }>();
const wartend = new Map<Kanal, string>();

/** Sagt `text` an. Gibt `true` zurück, wenn gesendet (nicht entprellt, nicht leer). */
export function sage(text: string, kanal: Kanal = 'hoeflich'): boolean {
  const t = text.trim();
  if (!t) return false;
  const jetzt = umg.jetzt();
  const z = zuletzt.get(kanal);
  if (z && z.text === t && jetzt - z.zeit < ENTPRELL_MS) return false;
  zuletzt.set(kanal, { text: t, zeit: jetzt });
  const lief = wartend.has(kanal);
  wartend.set(kanal, t);
  if (lief) return true; // die Füllung dieses Kanals steht schon an und nimmt den neuesten Text
  umg.schreibe(kanal, '');
  umg.spaeter(() => {
    const t2 = wartend.get(kanal);
    wartend.delete(kanal);
    if (t2 !== undefined) umg.schreibe(kanal, t2);
  });
  return true;
}

/**
 * Sagt `text` erst nach `ms` an (Voreinstellung 1,2 s), höflich. Für das Ergebnis nach einem Fokuswechsel oder einer Zwischenmeldung:
 * Screenreader sprechen zuerst die Fokusansage und lassen eine gleichzeitige Live-Meldung oft fallen. Die Rückgabe nimmt die Ansage zurück.
 */
export function sageSpaeter(text: string, ms = 1200, kanal: Kanal = 'hoeflich'): () => void {
  return umg.nach(() => { sage(text, kanal); }, ms);
}

/**
 * Leert beide Regionen sofort und verwirft wartende Füllungen. Für Stellen, an denen der alte Text nicht im DOM bleiben darf
 * (Feinstruktur: beim Wechsel ins Deuten stünde sonst „Grenze nach …“ mit einem späteren Wort in der Region, Prüfplan B1).
 */
export function leereAnsagen(): void {
  wartend.clear(); zuletzt.clear();
  umg.schreibe('hoeflich', ''); umg.schreibe('dringend', '');
}

/** Beim Start der App aufrufen: die Regionen stehen dann schon im DOM, bevor die erste Meldung kommt (frisch eingefügte Regionen werden oft nicht gelesen). */
export function starteAnsagen(): void {
  if (typeof document !== 'undefined' && document.body) bereiteRegionenVor(document);
}

/* ---------- Lange Rechnungen: eine Ansage am Anfang, eine am Ende, nichts dazwischen ---------- */

/** Erst eine Rechnung, die länger als das dauert, wird angesagt; schnelle Rechnungen enden, bevor jemand fragt „was passiert?“ (und Blatt-Neurechnungen blieben sonst Lärm). */
export const RECHNUNG_SCHWELLE_MS = 600;
let angesagteRechnungen = 0;
let letzteEnde = -Infinity;
/** Wurde in den letzten `ms` eine Ende-Ansage einer Rechnung gesagt? Wer danach noch „Ergebnis aktualisiert“ sagen wollte, lässt es bleiben (sonst doppelt). */
export const endeJuengstAngesagt = (ms = 5000): boolean => umg.jetzt() - letzteEnde < ms;

/** Zählt Tabellen und Diagramme (Diagramm und Bild) in einer Ausgabe. */
export function zaehleErgebnis(items: readonly { type: string }[]): { tabellen: number; diagramme: number } {
  let tabellen = 0, diagramme = 0;
  for (const i of items) { if (i.type === 'table') tabellen++; else if (i.type === 'chart' || i.type === 'image') diagramme++; }
  return { tabellen, diagramme };
}

/**
 * Beginnt eine Rechnung. Dauert sie länger als `RECHNUNG_SCHWELLE_MS`, wird `start` angesagt (höchstens einmal, solange eine andere angesagte Rechnung läuft).
 * Die zurückgegebene Funktion beendet sie: mit einem Satz wird er angesagt, aber nur, wenn der Anfang angesagt wurde; mit `null` (Fehler, Abbruch) bleibt es still,
 * denn Fehler und Abbruch melden die Aufrufer selbst.
 */
export function beginneRechnung(start: string): (ende: string | null) => void {
  let angesagt = false;
  let fertig = false;
  const zurueck = umg.nach(() => {
    if (fertig || angesagteRechnungen > 0) return;
    angesagt = true; angesagteRechnungen++;
    sage(start);
  }, RECHNUNG_SCHWELLE_MS);
  return ende => {
    if (fertig) return;
    fertig = true;
    zurueck();
    if (angesagt) { angesagteRechnungen--; if (ende) { sage(ende); letzteEnde = umg.jetzt(); } }
  };
}
