/**
 * Zweite Rechen-Engine: R im Browser (webR 0.6.0, WebAssembly), für Verfahren, die PSPP nicht kann
 * (gemischte Modelle, CFA, McDonalds Omega, Meta-Analyse).
 *
 * - Wird NIE beim Start geladen, erst bei `rMotor().bereit()` (dynamischer Import).
 * - Alles kommt vom eigenen Server (`webr/`, geholt mit scripts/webr-holen.sh) - kein CDN, CSP `connect-src 'self'`.
 * - Kanal: PostMessage (die Seite hat kein COOP/COEP, also kein SharedArrayBuffer). R selbst läuft in einem Worker
 *   (den webR anlegt); die Oberfläche bleibt bedienbar. Unterbrechen mitten in der Rechnung geht dabei nicht: Abbrechen heißt, den Worker zu beenden und R neu zu starten (`neustart`).
 * - Der Fortschritt (Megabyte) kommt aus einem eigenen Vorladen mit fetch(); webR selbst meldet keinen.
 *   Der Browser (und der Service Worker) hält die Dateien danach bereit - webR findet sie beim Start im Cache.
 */
import { R_START } from './rproben';
import { rId } from './rsicher';
import { text } from '../i18n/laufzeit';
import { zaehle } from '../lib/zaehlen';
import { zm } from '../lib/zeitmarke';

/** Statusmeldungen in der Sprache der Seite (die App setzt <html lang>); hier ohne Abhängigkeit zur Oberfläche (Prüfung D). Texte und Schlüssel wie bei L(). */
const T = (de: string, en: string, k?: string, w?: unknown[]) => text(typeof document !== 'undefined' ? document.documentElement.lang : 'de', de, en, k, w);

export interface RFortschritt {
  phase: 'laden' | 'starten' | 'pakete' | 'rechnen' | 'bereit';
  /** Bytes bisher / insgesamt in dieser Ladestufe (0, wenn nichts geladen wird). */
  geladen: number;
  gesamt: number;
  /** Fertiger Text für die Oberfläche, z. B. „R wird geladen … 12 von 40 MB“. */
  text: string;
}

/** Eine Spalte aus der Statable-Sitzung. `werte`: Zahlen oder Text; fehlend = null. */
export interface RSpalte {
  name: string;
  /** zahl: numeric · faktor: Zahlencodes mit Wertelabels · text: character */
  art: 'zahl' | 'faktor' | 'text';
  werte: (number | string | null)[];
  /** nur bei art 'faktor': Code → Beschriftung, in dieser Reihenfolge werden die Stufen angelegt */
  labels?: { wert: number | string; label: string }[];
}

interface Manifest {
  version: string;
  basis: { p: string; b: number }[];
  pakete: Record<string, { p: string; b: number }[]>;
}

/* ---- Teil des webR-Moduls, den wir brauchen (es liefert selbst keine Typen aus, wenn man es per URL lädt) ---- */
interface RObj { toJs(): Promise<unknown>; toString?(): Promise<string> }
interface Shelter {
  evalR(code: string): Promise<RObj>;
  purge(): Promise<void>;
  RList: new (x: unknown) => Promise<unknown>;
  RDouble: new (x: (number | null)[] | Float64Array) => Promise<unknown>;
  RCharacter: new (x: (string | null)[]) => Promise<unknown>;
}
interface WebRInstanz {
  init(): Promise<void>;
  close(): void;
  installPackages(pakete: string[], opts?: { quiet?: boolean }): Promise<void>;
  evalRVoid(code: string): Promise<void>;
  Shelter: new () => Promise<Shelter>;
  objs: { globalEnv: { bind(name: string, wert: unknown): Promise<void> } };
  RList: new (x: unknown) => Promise<unknown>;
  RCharacter: new (x: (string | null)[]) => Promise<unknown>;
}
interface WebRModul { WebR: new (opts: Record<string, unknown>) => WebRInstanz }

/** Adresse des webR-Ordners (relativ zur Seite - läuft unter jedem Pfad). */
export const webrBasis = () => new URL('webr/', document.baseURI).href;

const MB = (b: number) => Math.round(b / 1e5) / 10;
const zahlen = (b: number) => (b < 1e6 ? '< 1' : String(Math.round(b / 1e6)));

/** So lange wartet Statable höchstens auf eine Antwort von R, dann bricht es von selbst ab. Bewusst lang: Mehrebenen brauchte 127 s, Quantil über 5 Minuten (Messlauf 31.10.); ein Worker im Rechnen antwortet nicht, „rechnet noch“ und „hängt“ sehen also gleich aus. */
export const R_ZEITGRENZE_MS = 30 * 60_000;

/** Fehler mit fertigem, übersetztem Text (nicht noch einmal durch rFehlerText schicken - die Sprachprüfung am Satzanfang gilt nur für Deutsch/Englisch). */
export class Fertig extends Error {}

/** R wurde beendet, bevor die Rechnung fertig war. Die Daten sind unverändert, denn R rechnet auf einer Kopie. Ist ein `Fertig`, damit der Satz durch alle `catch`-Zweige der Verfahren unverändert kommt. */
export class RAbgebrochen extends Fertig {
  constructor(readonly grund: 'person' | 'zeit' | 'tot' = 'person') {
    super(grund === 'zeit' ? T('R hat nach 30 Minuten keine Antwort gegeben. Statable hat die Rechnung abgebrochen. Die Daten sind unverändert.', 'R gave no answer after 30 minutes. Statable cancelled the calculation. The data are unchanged.')
      : grund === 'tot' ? T('R ist abgestürzt, meist weil der Arbeitsspeicher nicht reicht. Beim nächsten Rechnen startet R neu. Die Daten sind unverändert.', 'R crashed, usually because there is not enough memory. R restarts with the next calculation. The data are unchanged.')
      : T('Rechnung abgebrochen. Die Daten sind unverändert.', 'Calculation cancelled. The data are unchanged.'));
    this.name = 'RAbgebrochen';
  }
}

/** Fehler, nach denen R nicht mehr zu gebrauchen ist: Der WebAssembly-Speicher von R ist zerstört, jeder weitere Aufruf scheitert genauso (scripts/gross/r/ERGEBNIS.md). */
const R_TOT = /memory access out of bounds|\bunreachable\b|RuntimeError|\bAborted\b/;

/** R-Antwort (toJs-Baum) in einfache JS-Werte: benannte Vektoren/Listen → Objekte, NA → null. */
export function rZuJson(x: unknown): unknown {
  if (x && typeof x === 'object' && 'values' in (x as object)) {
    const o = x as { values: unknown; names?: (string | null)[] | null };
    const v = Array.isArray(o.values) ? o.values.map(rZuJson) : o.values;
    if (o.names && Array.isArray(v) && o.names.every(n => n)) return Object.fromEntries(o.names.map((n, i) => [n as string, v[i]]));
    return v;
  }
  return x;
}

/**
 * Eine Spalte als Zahlenfeld für R: 8 Byte je Wert statt eines Arrays mit Objekten (1 Mio. × 20: rund 490 MB weniger im Hauptfaden, Messung 31.10.).
 * Fehlend (null, NaN) steht hier als NaN, ein Zahlenfeld kennt kein null. `rDataFrameCode` macht daraus in R das richtige NA (NA und NaN sind in R verschieden).
 */
export function alsZahlenfeld(werte: (number | string | null)[]): Float64Array {
  const f = new Float64Array(werte.length);
  for (let i = 0; i < werte.length; i++) { const v = werte[i]; f[i] = v == null ? NaN : Number(v); }
  return f;
}

/** R-Code für einen data.frame aus Statable-Spalten. `.sp_werte` / `.sp_meta` werden vorher gebunden. */
export function rDataFrameCode(name: string, spalten: RSpalte[]): string {
  return `${rId(name)} <- local({
  w <- .sp_werte; art <- .sp_art; lab <- .sp_lab
  rm(list = '.sp_werte', envir = globalenv())   # sonst teilt sich R die Spalten mit der Bindung und legt beim Ändern jede noch einmal an
  for (i in seq_along(w)) {
    if (is.double(w[[i]])) { n <- is.nan(w[[i]]); if (any(n)) w[[i]][n] <- NA_real_ }
    if (art[i] == 'faktor') { l <- lab[[i]]; w[[i]] <- factor(w[[i]], levels = l$wert, labels = l$label) }
  }
  as.data.frame(w, stringsAsFactors = FALSE, check.names = FALSE, optional = TRUE)
})`;
}

/** webR wirft teils leere Objekte - mit dem Namen des Schritts wird daraus ein lesbarer Fehler. */
async function schritt<T>(name: string, f: () => Promise<T>): Promise<T> {
  try { return await f(); } catch (e) {
    if (e instanceof RAbgebrochen) throw e;
    const t = (e as Error)?.message || (typeof e === 'string' ? e : JSON.stringify(e, Object.getOwnPropertyNames(e as object)));
    throw new Error(`${name}: ${t === '{}' ? T('keine Meldung', 'no message') : t}`);
  }
}

export class RMotor {
  private modul?: WebRModul;
  private r?: WebRInstanz;
  private manifest?: Manifest;
  private startet?: Promise<void>;
  private geladenePakete = new Set<string>();
  private fertigeDateien = new Set<string>();
  /** Dateien, die gerade geholt werden (damit Vorwärmen und eine echte Rechnung dieselbe Datei nicht doppelt laden). */
  private laufend = new Map<string, Promise<void>>();
  /** Vorwärmen (31.10.): R wird schon geladen, bevor jemand „Rechnen“ drückt. `abbruch` stoppt nur dieses Vorladen - sobald eine Rechnung R wirklich verlangt (`gebraucht`), gilt er nicht mehr. */
  private abbruch = false;
  /** Wie viele Rechnungen R gerade wirklich verlangen (Laden, Pakete, Rechnen); solange es welche gibt, ist das Vorladen nicht mehr abbrechbar. */
  private nutzer = 0;
  private get gebraucht() { return this.nutzer > 0; }
  /** Bytes über alle Ladestufen des Vorwärmens (ein ruhiger Balken von 0 bis 100 %), sonst `undefined`. */
  private summe?: { geladen: number; gesamt: number };
  /** Zählt die Neustarts: Was vor einem Neustart begonnen hat, darf danach nichts mehr an R oder am Zustand tun. */
  generation = 0;
  /** Warum R zuletzt neu gestartet wurde; damit scheitern auch Rechnungen, die noch in der Warteschlange stehen. */
  letzterAbbruch = new RAbgebrochen();
  /** Wird abgelehnt, sobald R neu startet. Alles, was auf R wartet, läuft dagegen (`warte`): webR selbst lässt offene Aufrufe eines beendeten Workers für immer offen. */
  private abbruchSignal!: Promise<never>;
  private abbruchAblehnen!: (e: RAbgebrochen) => void;
  /** Wird nach einem Neustart gerufen: Das neue R kennt die festen Funktionen von Statable noch nicht. */
  onNeustart?: () => void;

  constructor() { this.neuesSignal(); }

  private neuesSignal() {
    this.abbruchSignal = new Promise<never>((_, nein) => { this.abbruchAblehnen = nein; });
    this.abbruchSignal.catch(() => undefined);
  }

  /** Auf R warten: endet auch, wenn R neu startet, die Zeitgrenze abläuft oder R stirbt. */
  private warte<W>(p: Promise<W>): Promise<W> {
    const gen = this.generation;
    const uhr = setTimeout(() => { if (gen === this.generation) this.neustart(new RAbgebrochen('zeit')); }, R_ZEITGRENZE_MS);
    return Promise.race([p, this.abbruchSignal]).catch((e: unknown) => {
      if (!(e instanceof RAbgebrochen) && R_TOT.test(String((e as Error)?.message ?? e))) {
        if (gen === this.generation) this.neustart(new RAbgebrochen('tot'));
        throw this.letzterAbbruch;
      }
      throw e;
    }).finally(() => clearTimeout(uhr));
  }

  /** Das laufende R; fehlt es, wurde es gerade neu gestartet. */
  private jetztR(): WebRInstanz {
    if (!this.r) throw this.letzterAbbruch;
    return this.r;
  }

  /**
   * R sofort beenden und alles Wartende mit `RAbgebrochen` scheitern lassen; das nächste `bereit()` startet ein frisches R.
   * `fertigeDateien` bleibt, die Dateien liegen ja im Cache. Ein `start()`, das gerade läuft, schließt seine Instanz selbst.
   */
  neustart(grund = new RAbgebrochen()): void {
    this.generation++;
    this.letzterAbbruch = grund;
    const r = this.r, ablehnen = this.abbruchAblehnen;
    this.r = undefined; this.startet = undefined; this.summe = undefined;
    this.geladenePakete.clear(); this.laufend.clear();
    this.neuesSignal();
    try { r?.close(); } catch { /* war schon zu */ }
    ablehnen(grund);
    this.onNeustart?.();
  }
  /** Wird bei jedem Schritt gerufen (Ladebalken, Statuszeile). */
  onFortschritt?: (f: RFortschritt) => void;

  private melde(phase: RFortschritt['phase'], geladen = 0, gesamt = 0, text = '') {
    this.onFortschritt?.({ phase, geladen, gesamt, text });
  }

  /** Was das Laden insgesamt kostet (für die Frage „Soll R geladen werden?“), ohne etwas zu laden. */
  async kosten(pakete: string[] = []): Promise<{ basisBytes: number; paketBytes: number }> {
    const m = await this.holeManifest();
    return { basisBytes: m.basis.reduce((a, d) => a + d.b, 0), paketBytes: this.paketDateien(m, pakete).reduce((a, d) => a + d.b, 0) };
  }

  private async holeManifest(): Promise<Manifest> {
    if (!this.manifest) {
      const r = await fetch(webrBasis() + 'manifest.json');
      if (!r.ok) throw new Error(T('R ist in dieser Installation nicht enthalten (webr/manifest.json fehlt).', 'R is not included in this installation (webr/manifest.json is missing).'));
      this.manifest = await r.json() as Manifest;
    }
    return this.manifest;
  }

  private paketDateien(m: Manifest, pakete: string[]) {
    const dateien = new Map<string, { p: string; b: number }>();
    for (const n of pakete) for (const d of m.pakete[n] ?? []) if (!this.fertigeDateien.has(d.p)) dateien.set(d.p, d);
    return [...dateien.values()];
  }

  /** Dateien holen und die Bytes zählen. Sie landen im Cache des Browsers bzw. des Service Workers. */
  private async vorladen(dateien: { p: string; b: number }[], phase: 'laden' | 'pakete', was: string): Promise<void> {
    const gesamt = dateien.reduce((a, d) => a + d.b, 0);
    let geladen = 0;
    const sm = this.summe;
    const gen = this.generation;
    const tick = () => (sm
      ? this.melde(phase, sm.geladen, sm.gesamt, `${T('R wird geladen', 'Loading R')} … ${zahlen(sm.geladen)} von ${zahlen(sm.gesamt)} MB`)
      : this.melde(phase, geladen, gesamt, `${was} … ${zahlen(geladen)} von ${zahlen(gesamt)} MB`));
    const mehr = (n: number) => { geladen += n; if (sm) sm.geladen += n; tick(); };
    const veraltet = () => gen !== this.generation;
    const pruefeAbbruch = () => { if (veraltet() || (this.abbruch && !this.gebraucht)) throw new DOMException('R-Laden abgebrochen', 'AbortError'); };
    const lade = async (d: { p: string; b: number }) => {
      const antwort = await fetch(webrBasis() + d.p);
      if (!antwort.ok) throw new Error(`${d.p}: HTTP ${antwort.status}`);
      const leser = antwort.body?.getReader();
      if (!leser) mehr((await antwort.arrayBuffer()).byteLength);
      else for (;;) {
        if (veraltet() || (this.abbruch && !this.gebraucht)) { void leser.cancel(); pruefeAbbruch(); }
        const { done, value } = await leser.read(); if (done) break;
        if (veraltet()) { void leser.cancel(); pruefeAbbruch(); }
        mehr(value.byteLength);
      }
      this.fertigeDateien.add(d.p);
    };
    /** Eine Datei, die gerade schon geholt wird (zum Beispiel vom Vorwärmen), nicht noch einmal holen: mitwarten. Wurde das Holen abgebrochen und die Datei wird jetzt gebraucht, selbst holen. */
    const hole = async (d: { p: string; b: number }) => {
      for (;;) {
        if (veraltet()) pruefeAbbruch();
        let p = this.laufend.get(d.p);
        if (!p) { p = lade(d); this.laufend.set(d.p, p); const weg = () => { if (this.laufend.get(d.p) === p) this.laufend.delete(d.p); }; p.then(weg, weg); }
        try { await p; return; } catch (e) { if ((e as Error)?.name === 'AbortError' && this.gebraucht) continue; throw e; }
      }
    };
    tick();
    let i = 0;
    const arbeiter = async () => {
      while (i < dateien.length) {
        pruefeAbbruch();
        const d = dateien[i++]!;
        if (this.fertigeDateien.has(d.p)) continue;
        await hole(d);
      }
    };
    await Promise.all([arbeiter(), arbeiter(), arbeiter()]);
  }

  /** R laden und starten (einmal je Sitzung; weitere Aufrufe warten auf denselben Start). */
  async bereit(vor = false): Promise<void> {
    if (!vor) { this.nutzer++; this.abbruch = false; }
    try {
      // Hing das Vorwärmen gerade im Abbruch, startet eine echte Rechnung neu (die Dateien, die schon da sind, kosten nichts)
      for (let versuch = 0; ; versuch++) {
        try {
          if (!this.startet) { const p: Promise<void> = this.start().catch(e => { if (this.startet === p) this.startet = undefined; throw e; }); this.startet = p; }
          await this.warte(this.startet); return;
        }
        catch (e) { if (vor || versuch >= 2 || (e as Error)?.name !== 'AbortError') throw e; }
      }
    } finally { if (!vor) this.nutzer--; }
  }

  private async start(): Promise<void> {
    zm('r-start');
    const gen = this.generation;
    const m = await this.warte(this.holeManifest());
    await this.warte(this.vorladen(m.basis.filter(d => !this.fertigeDateien.has(d.p)), 'laden', T('R wird geladen', 'Loading R')));
    zm('r-basis-geladen');
    this.melde('starten', 0, 0, T('R startet …', 'Starting R …'));
    this.modul ??= await this.warte(import(/* @vite-ignore */ webrBasis() + 'webr.js') as Promise<WebRModul>);
    // channelType 3 = PostMessage (ohne SharedArrayBuffer)
    const r = new this.modul.WebR({ baseUrl: webrBasis(), repoUrl: webrBasis() + 'repo', channelType: 3, interactive: false });
    this.r = r;
    // Vor dem Anlegen des Workers wirkt close() bei webR nicht: Kommt der Neustart so früh, schließt diese Instanz sich nach dem Start selbst.
    const init = r.init();
    void init.then(() => { if (gen !== this.generation) r.close(); }, () => undefined);
    await schritt('R init', () => this.warte(init));
    zm('r-init');
    await schritt('R-Start-Code', async () => {
      const sh = await this.warte(new r.Shelter());
      try { const t = await this.warte((await this.warte(sh.evalR(`tryCatch({ ${R_START}; 'ok' }, error = function(e) conditionMessage(e))`))).toString?.() ?? Promise.resolve('')); if (t !== 'ok') throw new Error(String(t)); } finally { if (gen === this.generation) await this.warte(sh.purge()); }
    });
    zm('r-bereit');
    this.melde('bereit', 0, 0, T('R ist bereit.', 'R is ready.'));
    zaehle('r');
  }

  /** R-Pakete bereitstellen (mit Abhängigkeiten) und laden. */
  async pakete(namen: string[], vor = false): Promise<void> {
    if (!vor) { this.nutzer++; this.abbruch = false; }
    try { await this.paketeEin(namen, vor); } finally { if (!vor) this.nutzer--; }
  }

  private async paketeEin(namen: string[], vor: boolean): Promise<void> {
    await this.bereit(vor);
    const neu = namen.filter(n => !this.geladenePakete.has(n));
    if (!neu.length) return;
    const m = await this.warte(this.holeManifest());
    zm('r-pakete-start');
    await this.warte(this.vorladen(this.paketDateien(m, neu), 'pakete', T('R-Pakete werden geladen', 'Loading R packages')));
    this.melde('pakete', 0, 0, T('R-Pakete werden eingerichtet …', 'Setting up R packages …'));
    zm('r-pakete-geladen');
    await this.warte(this.jetztR().installPackages(neu, { quiet: true }));
    zm('r-pakete-installiert');
    neu.forEach(n => { this.geladenePakete.add(n); zaehle('rpaket', n); });
    this.melde('bereit', 0, 0, T('R ist bereit.', 'R is ready.'));
  }

  /**
   * R und die Pakete schon laden, ohne zu rechnen (Vorgabe Johannes 31.10.: nur aufrufen, wenn klar ist, dass R gebraucht wird).
   * Der Fortschritt (`onFortschritt`) zählt die echten Bytes aller Stufen zusammen. `abbrechen()` stoppt das Laden der Dateien, solange niemand R
   * wirklich verlangt; was schon fertig geladen ist, bleibt im Cache. Ein gestartetes R wird nicht beendet (es ist ja schon bezahlt).
   * Wirft `AbortError`, wenn abgebrochen wurde.
   */
  async vorwaermen(pakete: string[]): Promise<void> {
    this.abbruch = false;
    const m = await this.holeManifest();
    const neu = pakete.filter(n => !this.geladenePakete.has(n));
    const basis = this.startet ? 0 : m.basis.filter(d => !this.fertigeDateien.has(d.p)).reduce((a, d) => a + d.b, 0);
    this.summe = { geladen: 0, gesamt: basis + this.paketDateien(m, neu).reduce((a, d) => a + d.b, 0) };
    try { await this.pakete(pakete, true); } finally { this.summe = undefined; }
  }

  /** Das Vorwärmen anhalten (die Person hat die Wahl verlassen). Wirkt nicht, wenn eine Rechnung R schon braucht. */
  abbrechen(): void { if (!this.gebraucht) this.abbruch = true; }

  /**
   * Daten als data.frame `name` in R anlegen. Zahlen → numeric, Faktoren mit Labels → factor, fehlende Werte → NA.
   * SICHERHEIT: Werte und Labels gehen als gebundene R-Objekte hinein, nie als Code. Die Namen (`name` und jede Spalte) sind die festen, eigenen
   * Namen von Statable (y, p01, v3 …), NIE ein Name aus einer Datei: `rId` lässt nur /^[A-Za-z][A-Za-z0-9_.]*$/ durch und wirft sonst (kein Maskieren).
   * Die echten Spaltennamen der Person bleiben in JS (Anzeige); die Aufrufer ordnen die Antwort dort zurück.
   */
  async daten(name: string, spalten: RSpalte[]): Promise<void> {
    rId(name);
    const gesehen = new Set<string>();
    for (const sp of spalten) { rId(sp.name); if (gesehen.has(sp.name)) throw new Error('Doppelter R-Spaltenname abgelehnt'); gesehen.add(sp.name); }
    await this.bereit();
    const r = this.jetztR(), gen = this.generation, w = <W>(p: Promise<W>) => this.warte(p);
    // Eigener Schutzraum: Alles, was webR hier anlegt, wird am Ende frei. Im allgemeinen Schutzraum blieben die Spalten jeder Rechnung im Speicher von R liegen.
    const sh = await w(new r.Shelter());
    try {
      const werte: Record<string, unknown> = {};
      for (const sp of spalten) {
        werte[sp.name] = sp.art === 'text'
          ? await w(new sh.RCharacter(sp.werte.map(v => (v == null ? null : String(v)))))
          : await w(new sh.RDouble(alsZahlenfeld(sp.werte)));
      }
      const lab: Record<string, unknown> = {};
      for (const sp of spalten) {
        lab[sp.name] = sp.art === 'faktor' && sp.labels
          ? await w(new sh.RList({ wert: await w(new sh.RDouble(sp.labels.map(l => Number(l.wert)))), label: await w(new sh.RCharacter(sp.labels.map(l => l.label))) }))
          : await w(new sh.RList({}));
      }
      const g = r.objs.globalEnv;
      await w(g.bind('.sp_werte', await w(new sh.RList(werte))));
      await w(g.bind('.sp_art', await w(new sh.RCharacter(spalten.map(sp => sp.art)))));
      await w(g.bind('.sp_lab', await w(new sh.RList(lab))));
      await w(sh.purge());
      try { await w(r.evalRVoid(rDataFrameCode(name, spalten))); } finally { if (gen === this.generation) await w(r.evalRVoid("rm(list = intersect(c('.sp_werte', '.sp_art', '.sp_lab'), ls(globalenv(), all.names = TRUE)), envir = globalenv())")); }
    } finally { if (gen === this.generation) await w(sh.purge()); }
  }

  /**
   * Code ausführen; das Ergebnis (letzter Ausdruck) kommt als JSON-taugliches Objekt zurück.
   * `args`: Text und Textlisten (Wertelabels, Zielstufen, Referenzkategorie …). Sie werden als R-Objekte gebunden und im Code als `rArg('name')` (= `.sp_arg$name`) gelesen -
   * NIE in den Code-Text geschrieben. Der Code selbst darf nur feste Wörter, `rId`-Bezeichner und `rZahl`/`rGanz`/`rBool`-Werte enthalten (siehe rsicher.ts).
   */
  async rechne<T = unknown>(code: string, args?: Record<string, string | string[]>): Promise<T> {
    await this.bereit();
    this.melde('rechnen', 0, 0, T('R rechnet …', 'R is calculating …'));
    const r = this.jetztR(), gen = this.generation;
    const schutz = await this.warte(new r.Shelter());
    let gebunden = false;
    try {
      if (args) {
        const liste: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(args)) {
          rId(k);
          if (typeof v !== 'string' && !(Array.isArray(v) && v.every(x => typeof x === 'string'))) throw new Error('R-Argument muss Text oder eine Textliste sein');
          liste[k] = await this.warte(new r.RCharacter((Array.isArray(v) ? v : [v]) as string[]));
        }
        await this.warte(r.objs.globalEnv.bind('.sp_arg', await this.warte(new r.RList(liste))));
        gebunden = true;
      }
      const erg = await this.warte(schutz.evalR(code));
      return rZuJson(await this.warte(erg.toJs())) as T;
    } finally {
      // Nach einem Neustart gibt es dieses R nicht mehr: Ein Aufruf bliebe für immer offen.
      if (gen === this.generation && gebunden) { try { await this.warte(r.evalRVoid('rm(.sp_arg)')); } catch { /* war schon weg */ } }
      if (gen === this.generation) await this.warte(schutz.purge());
      if (gen === this.generation) this.melde('bereit', 0, 0, T('R ist bereit.', 'R is ready.'));
    }
  }

  /** Nur für Tests in Node: eine schon gestartete webR-Instanz übernehmen (R-Start-Code lief, `pakete` sind installiert), ohne Laden über das Netz. */
  einhaengen(instanz: unknown, pakete: string[] = []): void {
    this.r = instanz as WebRInstanz;
    this.startet = Promise.resolve();
    pakete.forEach(p => this.geladenePakete.add(p));
  }

  /** R beenden und den Speicher freigeben (z. B. beim Schließen des Projekts). */
  beenden(): void { this.neustart(); }
}

let einzige: RMotor | undefined;
/** Der eine R-Motor der Sitzung. Erzeugt nur das Objekt - geladen wird erst bei `bereit()`. */
export const rMotor = () => (einzige ??= new RMotor());
export { MB };
