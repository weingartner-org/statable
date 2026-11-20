/**
 * Import-Dialog „Fragebogen erkannt - übernehmen?“ (Später S-C, D4): verbindet die reine Erkennung (fragebogen.ts, kodebuch.ts, spsssyntax.ts) mit der Sitzung.
 * GRUNDSATZ: Nichts passiert still. Die Datei wird gelesen und erkannt, dann zeigt der Dialog jeden Vorschlag mit Kästchen; erst „Übernehmen“ verändert etwas,
 * und jede Gruppe von Änderungen ist ein eigener Schritt im Befehlsprotokoll und lässt sich mit „Rückgängig“ zurücknehmen.
 */
import { zm } from './zeitmarke';
import { leseDatei, dekodiere, type Tabelle, type Eingelesen } from './einlesen';
import { L, Lp, s, melde, setzeSets } from './sitzung.svelte';
import { merkeSyntax } from './befehlsspeicher.svelte';
import { sage } from './ansage';
import { zit, pk } from './befehlstext';
import { erkenneFragebogen, textRecodeBefehl, ordneTextZu, umgepoltHinweis, cryptpadJsonTabelle, type Erkennung, type Vorschlag } from './fragebogen';
import { pruefeMehrfachZelle, vorbelegung, endergebnis, zellText, type MehrfachZelleErgebnis, type ZeilenEntscheid } from './dienste/mehrfachzelle';
import { mehrfachZelleBefehle, kennzeichenBefehle, zuKennzeichnen } from './dienste/mehrfachzelle-befehle';
import { NEXTCLOUD_ANDERES } from './dienste/nextcloud';
import { liesSpssSyntax, type SpssSyntaxErgebnis } from './spsssyntax';
import { kodebuchAusSyntax, wendeKodebuchAn, type Kodebuch } from './kodebuch';
import { istXlsform, planAusXlsform, ordneSpalten, kodebuchAusPlan, abbildungsBefehl, type FragebogenPlan, type PlanMeldung, type SpaltenZuordnung, type XlsAbbildung } from './fragebogenplan';
import { fehlendcodesBefehl } from './datenassistentc';
import { wendeAn as fuehreAusEcht, sammleMeldungen } from './datenassistentlauf';
import { freierName } from './skalabau';
import { setNameFehler, type MehrfachSet } from './mehrfach';
import type { Spalte } from './verzeichnis';
import type { Wert } from './eingabe';
import type { DateiZugriff } from './dateiziel';

export type VorschlagArt = Vorschlag['art'];
const TABELLENENDUNG = /\.(csv|tsv|txt|xlsx|xlsm|xls|ods)$/i;

/** Was die Person im Dialog angekreuzt hat. */
export interface FbWahl {
  kopfzeilen: boolean; namen: boolean; beschriftungen: boolean;
  /** Kästchen je Vorschlag (id → an) */ haken: Record<string, boolean>;
  /** Reihenfolge der Stufen je „Antworten als Text“-Vorschlag (id → Stufen, Nummer 1 bis n) */ stufen: Record<string, string[]>;
  /** Entscheidung der Person für Texte, die zu keiner Stufe passen (id → Text → '' = noch nicht entschieden, 'leer' = bewusst leer, sonst die Stufennummer) */ zuordnung: Record<string, Record<string, string>>;
  /** Doppelte Antworten: Gruppe (0-basiert) → die übrigen Zeilen kennzeichnen? (fehlt = ja, Voreinstellung) */ doppelt: Record<number, boolean>;
  /** Doppelte Antworten: Gruppe → die Zeile (0-basiert), die behalten wird (fehlt = die erste) */ behalte: Record<number, number>;
}

/** Zustand eines Vorschlags „Mehrfachauswahl in einer Zelle“ im Dialog: die bearbeitbare Optionsliste, das Ergebnis der Aufteilung damit und die Entscheidung der Person für unklare Zeilen. */
export interface MzZustand { optionen: string[]; erg: MehrfachZelleErgebnis; entscheid: Record<number, ZeilenEntscheid> }

export class FragebogenImport {
  offen = $state(false);
  datei = $state<File | null>(null);
  handle: DateiZugriff | null = null;
  tabelle = $state.raw<Tabelle | null>(null);
  name = $state('');
  kb = $state.raw<Kodebuch | null>(null);
  syntax = $state.raw<{ name: string; ergebnis: SpssSyntaxErgebnis } | null>(null);
  erk = $state.raw<Erkennung | null>(null);
  wahl = $state<FbWahl>({ kopfzeilen: true, namen: true, beschriftungen: true, haken: {}, stufen: {}, zuordnung: {}, doppelt: {}, behalte: {} });
  /** Beschriftungen, die schon in der Datei stehen (CryptPad-JSON: Fragetexte); gilt auch ohne gewähltes Kodebuch */
  grundKb: Kodebuch | null = null;
  /** Mehrfachauswahl in einer Zelle: je Vorschlag-id Optionsliste, Aufteilung und Entscheidungen (ersetzt als Ganzes, nie verändert: große Tabellen) */
  mz = $state.raw<Record<string, MzZustand>>({});
  /** Eine Kodebuch-Datei (.sps) wird gerade gelesen (Lade-Animation) */
  liest = $state(false);
  /** Fehler beim Lesen der Kodebuch-Datei (.sps; ein Satz) */
  kbFehler = $state('');
  /** Eine XLSForm wird gerade gelesen (eigene Lade-Animation, getrennt vom .sps-Kodebuch) */
  xlsLiest = $state(false);
  /** Fehler beim Lesen der XLSForm (ein Satz, getrennt vom .sps-Kodebuch) */
  xlsFehler = $state('');
  /** Eine gelesene XLSForm als Kodebuch (Paket 1C): Plan, Meldungen, Zuordnung der Spalten, Vorschlag Text → Zahl. Der Plan wird noch nicht im Projekt gespeichert (Stufe 2). */
  xls = $state.raw<{ name: string; plan: FragebogenPlan; meldungen: PlanMeldung[]; zuordnung: SpaltenZuordnung[]; unzugeordnet: string[]; abbildungen: XlsAbbildung[]; hinweise: string[] } | null>(null);
  /** Kästchen je Text-Zahl-Abbildung (Liste → angekreuzt); ohne Zustimmung bleibt die Spalte, wie sie ist */
  xlsHaken = $state<Record<string, boolean>>({});

  /** Liest die Datei und erkennt. `true`: der Dialog ist offen und das Öffnen wartet auf die Person. Bei allem anderen (kein Fragebogen, kein Vorschlag) `false`: dann öffnet der gewohnte Weg die Datei. */
  async pruefe(f: File, handle?: DateiZugriff | null): Promise<{ offen: boolean; gelesen?: Eingelesen }> {
    if (/\.json$/i.test(f.name)) return this.pruefeJson(f, handle);
    if (!TABELLENENDUNG.test(f.name)) return { offen: false };
    let e;
    try { e = await leseDatei(f); } catch { return { offen: false }; }   // Fehler zeigt der gewohnte Weg
    if (e.art !== 'tabelle') return { offen: false, gelesen: e };
    zm('fb-0');
    const erk = erkenneFragebogen(e.tabelle); zm('fb-erkannt');
    // Nur anbieten, wenn es etwas zu sagen gibt: ein bekanntes Werkzeug mit Vorschlägen oder Hinweise auf Codes
    // ODK-Exporte haben (noch) keinen eigenen Erkenner; der Kopf `meta-instanceID` ist einzeln belegt und genügt, um den Dialog mit der Wahl „XLSForm als Kodebuch“ anzubieten
    if (erk.hersteller === 'unbekannt' && !erk.vorschlaege.some(v => v.art === 'fehlend') && !e.tabelle.kopf.some(k => k.trim() === 'meta-instanceID')) return { offen: false, gelesen: e };
    this.datei = f; this.handle = handle ?? null; this.tabelle = e.tabelle; this.name = e.name; this.kb = null; this.grundKb = null; this.syntax = null; this.xls = null; this.kbFehler = ''; this.xlsFehler = '';
    this.setzeErkennung(erk);
    this.offen = true;
    return { offen: true };
  }
  /** CryptPad-Export als JSON (`questions` und `responses`): wird zur Tabelle; jedes andere JSON öffnet der gewohnte Weg. Die Fragetexte werden Beschriftungen. */
  private async pruefeJson(f: File, handle?: DateiZugriff | null): Promise<{ offen: boolean }> {
    let r;
    try { r = cryptpadJsonTabelle(await f.text()); } catch { return { offen: false }; }
    if (!r) return { offen: false };
    const kb: Kodebuch = { hersteller: 'cryptpad', spalten: Object.fromEntries(Object.entries(r.fragetexte).map(([k, l]) => [k, { label: l }])), fall: {} };
    const erk = erkenneFragebogen(r.tabelle, kb);
    if (erk.hersteller !== 'cryptpad') return { offen: false };
    this.datei = f; this.handle = handle ?? null; this.tabelle = r.tabelle; this.name = f.name; this.kb = null; this.grundKb = kb; this.syntax = null; this.xls = null; this.kbFehler = ''; this.xlsFehler = '';
    this.setzeErkennung(erk);
    this.offen = true;
    return { offen: true };
  }
  private setzeErkennung(erk: Erkennung) {
    this.erk = erk;
    const haken: Record<string, boolean> = {}, stufen: Record<string, string[]> = {};
    for (const v of erk.vorschlaege) {
      // Voreinstellung: was zum richtigen Lesen oder aus einer sicheren Quelle kommt, ist angekreuzt; Hinweise, Schnellantworter und Texte ohne bekannte Skala nicht.
      // Bei Zweifel nie vorangekreuzt: Hinweise, die Null als Code (Unipark) und eine Mehrfachauswahl, die nur aus den Werten 1 und 2 vermutet wird (SoSci ohne Kodebuch)
      haken[v.id] = v.art === 'fehlend' ? v.quelle !== 'hinweis' && !(v.quelle === 'hersteller' && v.codes.includes(0))
        : v.art === 'mehrfachset' ? v.quelle !== 'hersteller'
        : v.art === 'metadaten' || v.art === 'wertelabels' || v.art === 'testfaelle' || v.art === 'unvollstaendige' || v.art === 'doppelte' ? true : v.art === 'textAntworten' ? v.vorbelegt
        // Mehrfachauswahl in einer Zelle: nur vorangekreuzt, wenn die Erkennung sicher ist und keine Zeile unklar bleibt (bei Zweifel nie)
        : v.art === 'mehrfachZelle' ? erk.sicher && v.unklar.length === 0 : false;
      if (v.art === 'textAntworten') stufen[v.id] = v.stufen ?? this.textWerte(v.spalten);
    }
    this.wahl = { kopfzeilen: true, namen: true, beschriftungen: true, haken, stufen, zuordnung: {}, doppelt: {}, behalte: {} };
    const mz: Record<string, MzZustand> = {};
    for (const v of erk.vorschlaege) if (v.art === 'mehrfachZelle') { const z = this.mzAufteilen(v.spalte, v.trenner, v.optionen); if (z) mz[v.id] = z; }
    this.mz = mz;
  }

  /* ---- Mehrfachauswahl in einer Zelle: bearbeitbare Optionsliste (Fachblatt Stufe 1, Entscheid 2) ---- */
  private mzZellen(spalte: string): unknown[] {
    const i = this.erk!.spalten.findIndex(sp => sp.name === spalte);
    return i < 0 ? [] : this.erk!.tabelle.zeilen.map(z => z[i] ?? null);
  }
  /** Mit dieser Optionsliste neu aufteilen; null, wenn die Liste leer ist. */
  private mzAufteilen(spalte: string, trenner: string, optionen: string[]): MzZustand | null {
    const erg = pruefeMehrfachZelle(this.mzZellen(spalte), trenner, optionen);
    return erg ? { optionen: erg.optionen, erg, entscheid: vorbelegung(erg) } : null;
  }
  mzVorschlag(id: string): Extract<Vorschlag, { art: 'mehrfachZelle' }> | undefined { return this.erk?.vorschlaege.find((x): x is Extract<Vorschlag, { art: 'mehrfachZelle' }> => x.art === 'mehrfachZelle' && x.id === id); }
  /** Die Optionsliste ersetzen (Zusammenführen, Ergänzen, Entfernen): neu aufteilen, die Entscheidungen für unklare Zeilen beginnen von vorn. Gibt die neue Liste zurück. */
  mzSetzeOptionen(id: string, optionen: string[]): string[] {
    const v = this.mzVorschlag(id); if (!v) return [];
    const z = this.mzAufteilen(v.spalte, v.trenner, optionen);
    if (!z) return this.mz[id]?.optionen ?? [];
    this.mz = { ...this.mz, [id]: z };
    return z.optionen;
  }
  /** Zwei Teile zu EINER Option zusammenführen („Yes“ und „any way“ → „Yes, any way“): an der Stelle des ersten Teils, verbunden mit dem Trenner. */
  mzZusammen(id: string, a: string, b: string): boolean {
    const v = this.mzVorschlag(id), z = this.mz[id]; if (!v || !z || a === b || !z.optionen.includes(a) || !z.optionen.includes(b)) return false;
    const ia = z.optionen.indexOf(a), neu = `${a}${v.trenner}${b}`;
    this.mzSetzeOptionen(id, z.optionen.map((o, i) => (i === ia ? neu : o)).filter(o => o !== b)); return true;
  }
  mzDazu(id: string, text: string): boolean {
    const z = this.mz[id], t = text.trim(); if (!z || !t || z.optionen.includes(t)) return false;
    this.mzSetzeOptionen(id, [...z.optionen, t]); return true;
  }
  mzWeg(id: string, option: string): boolean {
    const z = this.mz[id]; if (!z || !z.optionen.includes(option) || z.optionen.length < 2) return false;
    this.mzSetzeOptionen(id, z.optionen.filter(o => o !== option)); return true;
  }
  /** Eine Entscheidung für eine unklare Zeile ändern: `k` = Index der Option, `'anders'` = der Rest als „Anderes“. */
  mzEntscheide(id: string, zeile: number, k: number | 'anders', an: boolean) {
    const z = this.mz[id]; const e = z?.entscheid[zeile]; if (!z || !e) return;
    const neu: ZeilenEntscheid = k === 'anders' ? { ...e, anders: an } : { ...e, optionen: e.optionen.map((x, i) => (i === k ? an : x)) };
    this.mz = { ...this.mz, [id]: { ...z, entscheid: { ...z.entscheid, [zeile]: neu } } };
  }
  /** Der Zellinhalt einer Datenzeile (Text) für die Tabelle der unklaren Zeilen. */
  mzZelle(id: string, zeile: number): string { const v = this.mzVorschlag(id); return v ? zellText(this.mzZellen(v.spalte)[zeile]) ?? '' : ''; }
  /** Die verschiedenen Texte in diesen Spalten (alphabetisch), wenn es keine bekannte Skala gibt: die Person ordnet. */
  textWerte(spalten: string[]): string[] {
    const t = this.erk!.tabelle, idx = spalten.map(n => this.erk!.spalten.findIndex(sp => sp.name === n)).filter(i => i >= 0);
    return [...new Set(idx.flatMap(i => t.zeilen.map(z => z[i]).filter((v): v is string => typeof v === 'string' && v.trim() !== '').map(v => v.trim())))].sort((a, b) => a.localeCompare(b, 'de'));
  }
  /** Eine mitgelieferte SPSS-Syntax (SoSci `.sps`) lesen: NUR Beschriftungen, Wertebeschriftungen, Fehlend-Codes und Messniveau; alles andere wird übersprungen und gemeldet, nie ausgeführt. */
  async ladeKodebuch(f: File) {
    this.kbFehler = ''; this.liest = true;
    try {
      const ergebnis = liesSpssSyntax(dekodiere(new Uint8Array(await f.arrayBuffer())));
      if (!Object.keys(ergebnis.variablenlabels).length && !Object.keys(ergebnis.wertelabels).length && !Object.keys(ergebnis.fehlend).length) {
        this.kbFehler = L('In dieser Datei stehen keine Beschriftungen, Wertebeschriftungen oder Fehlend-Codes, die ich lesen kann.', 'This file contains no labels, value labels or missing-value codes that I can read.');
        return;
      }
      const kb = kodebuchAusSyntax(ergebnis, this.erk!.hersteller);
      this.syntax = { name: f.name, ergebnis }; this.kb = kb; this.xls = null; this.xlsHaken = {};
      this.setzeErkennung(erkenneFragebogen(this.tabelle!, kb));
    } catch { this.kbFehler = L('Diese Datei ließ sich nicht lesen.', 'This file could not be read.'); }
    finally { this.liest = false; }
  }
  /** Eine XLSForm (.xlsx) als Kodebuch lesen: Fragen, Antwortlisten und Sprachen werden den Spalten der Daten zugeordnet (Kobo, ODK). Nichts geschieht, bevor die Person übernimmt. */
  /** Der Ergebnissatz zur gelesenen XLSForm: steht im Bereich am Dateiknopf (aria-describedby) und wird angesagt. */
  get xlsSatz(): string {
    const x = this.xls; if (!x) return '';
    const n = x.plan.elemente.flatMap(sx => sx.elemente).filter(e => e.art === 'frage').length, l = x.plan.antwortlisten.length, sp = x.plan.sprachen.join(', ');
    return L(`Gelesen aus ${x.name}: ${n} Fragen, ${l} Antwortlisten, Sprachen: ${sp}.`, `Read from ${x.name}: ${n} questions, ${l} answer lists, languages: ${sp}.`);
  }
  async ladeXlsform(f: File) {
    this.xlsFehler = ''; this.xlsLiest = true; sage(L('Die XLSForm wird gelesen.', 'The XLSForm is being read.'));
    try {
      const buf = await f.arrayBuffer();
      if (!(await istXlsform(buf))) { this.xlsFehler = L('Das ist keine XLSForm: Es fehlt das Blatt „survey“ mit den Spalten „type“, „name“ und „label“.', 'This is not an XLSForm: the sheet "survey" with the columns "type", "name" and "label" is missing.'); return; }
      const { plan, meldungen } = await planAusXlsform(buf, f.name);
      const { zuordnung, unzugeordnet } = ordneSpalten(plan, this.tabelle!.kopf);
      if (!zuordnung.length) { this.xlsFehler = L('Keine Spalte der Daten passt zu den Fragen dieser XLSForm. Bitte prüfen, ob es die richtige Datei ist.', 'No column of the data matches the questions of this XLSForm. Please check that it is the right file.'); return; }
      const k = kodebuchAusPlan(plan, zuordnung, this.tabelle!, this.erk!.hersteller);
      this.xls = { name: f.name, plan, meldungen, zuordnung, unzugeordnet, abbildungen: k.abbildungen, hinweise: k.hinweise };
      this.xlsHaken = {}; this.syntax = null; this.kb = k.kodebuch;
      this.setzeErkennung(erkenneFragebogen(this.tabelle!, k.kodebuch));
      sage(this.xlsSatz);
    } catch { this.xlsFehler = L('Diese Datei ließ sich nicht lesen.', 'This file could not be read.'); }
    finally { this.xlsLiest = false; if (this.xlsFehler) sage(this.xlsFehler, 'dringend'); }
  }
  /** Die verschiedenen Texte in den Spalten dieses „Antworten als Text“-Vorschlags, wie sie in den Daten stehen. */
  rohTexte(v: Extract<Vorschlag, { art: 'textAntworten' }>): string[] {
    const t = this.erk!.tabelle, idx = v.spalten.map(n => this.erk!.spalten.findIndex(sp => sp.name === n)).filter(i => i >= 0);
    return [...new Set(idx.flatMap(i => t.zeilen.map(z => z[i]).filter((x): x is string => typeof x === 'string' && x.trim() !== '').map(x => x.trim())))];
  }
  /** Welche Stufe (1 bis n) die Statable-Zuordnung einem Text gibt; null, wenn er zu keiner Stufe passt. */
  stufeVon(v: Extract<Vorschlag, { art: 'textAntworten' }>, t: string): number | null {
    const stufen = this.wahl.stufen[v.id] ?? v.stufen ?? [];
    return ordneTextZu(stufen, [t]).regeln.find(([x]) => x === t)?.[1] ?? null;
  }
  /** Texte, die zu keiner Stufe passen: sie werden NIE still zu „fehlend“, die Person entscheidet. */
  offeneTexte(v: Extract<Vorschlag, { art: 'textAntworten' }>): string[] { return ordneTextZu(this.wahl.stufen[v.id] ?? v.stufen ?? [], this.rohTexte(v)).offen; }
  /** Ist ein angekreuzter Vorschlag „Antworten als Text“ noch mit einem nicht entschiedenen Text? Dann geht „Übernehmen“ nicht. */
  unentschieden(): boolean {
    return !!this.erk && this.erk.vorschlaege.some(v => v.art === 'textAntworten' && this.wahl.haken[v.id] && this.offeneTexte(v).some(t => !(this.wahl.zuordnung[v.id]?.[t])));
  }
  /** Das Kodebuch wieder weglassen. */
  ohneKodebuch() { this.kb = null; this.syntax = null; this.xls = null; this.xlsHaken = {}; this.kbFehler = ''; this.xlsFehler = ''; this.setzeErkennung(erkenneFragebogen(this.tabelle!, this.grundKb ?? undefined)); }
  schliesse() { this.offen = false; this.datei = null; this.tabelle = null; this.erk = null; this.kb = null; this.grundKb = null; this.syntax = null; this.xls = null; this.xlsHaken = {}; this.handle = null; this.kbFehler = ''; this.xlsFehler = ''; this.liest = false; this.xlsLiest = false; this.mz = {}; }
  /** Die Datenspalte (Name nach dem Öffnen) zu einem Kopf der Datei. */
  private spaltenName(kopf: string): string | undefined { return this.erk?.spalten.find(sp => sp.kopf === kopf)?.name; }

  /** Die Tabelle, die geöffnet wird: mit oder ohne die Kopfzeilen 2 und 3 (Qualtrics), mit den Fragecodes als Namen (LimeSurvey) - oder genau die Datei, wenn nichts angekreuzt ist. */
  zuOeffnen(ohneAenderung = false): Tabelle {
    const t0 = this.tabelle!, erk = this.erk!;
    if (ohneAenderung) return t0;
    const basis = this.wahl.kopfzeilen && erk.kopfzeilen > 1 ? erk.tabelle : t0;
    if (erk.hersteller === 'limesurvey' && this.wahl.namen && Object.keys(erk.beschriftungen).length) return { ...basis, kopf: erk.spalten.map(sp => sp.name) };
    return basis;
  }
  /** Die ersten fünf Spalten, wie sie nach dem Übernehmen heißen (Vorschau im Dialog). */
  vorschau(): { name: string; label: string; werte: string[] }[] {
    const erk = this.erk!, t = this.zuOeffnen();
    const lim = erk.hersteller === 'limesurvey' && this.wahl.namen && Object.keys(erk.beschriftungen).length > 0;
    const fragen = erk.spalten.map((sp, i) => ({ sp, i })).filter(x => x.sp.rolle === 'frage').slice(0, 5);
    const zeilen = t === erk.tabelle || lim ? t.zeilen : erk.tabelle.zeilen;
    return fragen.map(({ sp, i }) => ({ name: lim || erk.kopfzeilen > 1 || erk.hersteller !== 'limesurvey' ? sp.name : sp.kopf, label: this.wahl.beschriftungen ? erk.beschriftungen[sp.name] ?? '' : '', werte: zeilen.slice(0, 3).map(z => (z[i] === null || z[i] === undefined ? '' : String(z[i]))) }));
  }

  /** Nach dem Öffnen: alle angekreuzten Vorschläge als Befehle in die offene Datei. Jede Gruppe ist ein Schritt zum Rückgängigmachen und steht in den Befehlen. */
  async uebernehmeNachOeffnen(): Promise<void> {
    sammleMeldungen(true);
    try { await this.uebernehmeJetzt(); } finally { sammleMeldungen(false); }
  }
  /** Spaltenname für Ansagen: die Beschriftung, wo es eine gibt (Screenreader sprechen „set_ja“ schlecht), sonst der Name. */
  private anzeige(n: string): string { const l = this.erk?.beschriftungen[n]; return l ? l.slice(0, 80) : n; }
  private async uebernehmeJetzt(): Promise<void> {
    const erk = this.erk!, w = this.wahl;
    const daten = () => ({ spalten: $state.snapshot(s.spalten) as Spalte[], zeilen: s.zeilen as Wert[][] });
    const vorhanden = (n: string) => s.spalten.some(c => c.name.toUpperCase() === n.toUpperCase());
    const an = (v: Vorschlag) => !!w.haken[v.id];
    // Jeder Schritt steht danach auch auf der Seite „Befehle“ (das Befehlsprotokoll des Imports); `fuehreAus` merkt sich, was wirklich gelaufen ist.
    const teile: string[] = [], hinweise: string[] = [];   // ein Sammelsatz am Ende statt vieler kurzer Meldungen
    const protokoll: string[] = [`* Fragebogen-Import (${pk(this.name)}): was die Person im Dialog übernommen hat.`];
    const fuehreAus = async (text: string, syntax: string) => { const ok = await fuehreAusEcht(text, syntax); if (ok) protokoll.push(`* ${pk(text)}.`, syntax); return ok; };
    // 1. Fragetexte als Beschriftung
    if (w.beschriftungen) {
      const paare = Object.entries(erk.beschriftungen).filter(([n]) => vorhanden(n));
      if (paare.length) {
        if (await fuehreAus(L('Fragetexte als Beschriftung', 'Question texts as labels'), `VARIABLE LABELS ${paare.map(([n, l]) => `${n} ${zit(l.slice(0, 250))}`).join('\n  /')}.`)) teile.push(L('Beschriftungen gesetzt', 'labels set'));
      }
    }
    // 2. Wertebeschriftungen aus dem Kodebuch
    const wl = erk.vorschlaege.filter((v): v is Extract<Vorschlag, { art: 'wertelabels' }> => v.art === 'wertelabels' && an(v) && vorhanden(v.spalte));
    if (wl.length) {
      const kb: Kodebuch = { hersteller: erk.hersteller, spalten: Object.fromEntries(wl.map(v => [v.spalte, { werteLabels: v.labels }])), fall: {} };
      const r = wendeKodebuchAn(daten(), kb, { wertelabels: true });
      if (r.befehle.length && await fuehreAus(L('Wertebeschriftungen aus dem Kodebuch', 'Value labels from the codebook'), r.befehle.join('\n'))) teile.push(L('Wertebeschriftungen gesetzt', 'value labels set'));
    }
    // 3. Fehlendcodes
    const fe = erk.vorschlaege.filter((v): v is Extract<Vorschlag, { art: 'fehlend' }> => v.art === 'fehlend' && an(v) && vorhanden(v.spalte));
    if (fe.length) {
      const je = new Map<string, string[]>();
      for (const v of fe) { const k = v.codes.join('|'); (je.get(k) ?? je.set(k, []).get(k)!).push(v.spalte); }
      const fe2 = [...je].map(([k, sp]) => fehlendcodesBefehl(daten(), { spalten: sp, codes: k.split('|').map(Number) }));
      const syn = fe2.map(t => t.syntax).filter(Boolean).join('\n');
      if (syn && await fuehreAus(L('Fehlendcodes gesetzt', 'Missing codes set'), syn)) teile.push(L('Fehlendcodes gesetzt', 'missing codes set'));
      for (const m of fe2.flatMap(t => t.meldungen)) hinweise.push(L(`In ${this.anzeige(m.spalte)} liegt zwischen den Codes ein gültiger Wert. Die Spalte ist nicht markiert; die Codes lassen sich unter „Fehlendcodes setzen“ einzeln setzen.`, `In ${this.anzeige(m.spalte)} a valid value lies between the codes. The column is not marked; set the codes one by one under "Set missing codes".`));
    }
    // 4. Metadaten: markieren (Rolle „keine“), nicht löschen
    const md = erk.vorschlaege.find((v): v is Extract<Vorschlag, { art: 'metadaten' | 'personenbezug' }> => v.art === 'metadaten' && an(v));
    if (md) { const n = md.spalten.filter(vorhanden); if (n.length && await fuehreAus(L('Spalten der Umfrage-Software als Metadaten markiert', 'Columns of the survey software marked as metadata'), `VARIABLE ROLE /NONE ${n.join(' ')}.`)) teile.push(L('Metadaten markiert', 'metadata marked')); }
    // 5. Test-, Vorschau-, unvollständige Fälle und Schnellantworter: je eine 0/1-Spalte (nichts wird gelöscht)
    for (const [art, vorschlag, text, kurz] of [['testfaelle', 'testfall', L('Test- und Vorschau-Antworten gekennzeichnet', 'Test and preview answers flagged'), L('Testantworten gekennzeichnet', 'test answers flagged')], ['unvollstaendige', 'unvollstaendig', L('Unvollständige Antworten gekennzeichnet', 'Incomplete answers flagged'), L('unvollständige Antworten gekennzeichnet', 'incomplete answers flagged')], ['schnellantworter', 'schnell', L('Sehr schnelle Antworten gekennzeichnet', 'Very quick answers flagged'), L('sehr schnelle Antworten gekennzeichnet', 'very quick answers flagged')]] as const) {
      const v = erk.vorschlaege.find((x): x is Extract<Vorschlag, { art: 'testfaelle' | 'unvollstaendige' | 'schnellantworter' }> => x.art === art && an(x));
      if (!v) continue;
      const ziel = freierName(vorschlag, s.spalten.map(c => c.name));
      const nummern = [...v.zeilen].sort((a, b) => a - b).map(i => i + 1);
      const bereiche: string[] = [];
      for (let i = 0; i < nummern.length;) { let j = i; while (nummern[j + 1] === nummern[j]! + 1) j++; bereiche.push(i === j ? `$CASENUM = ${nummern[i]}` : `RANGE($CASENUM, ${nummern[i]}, ${nummern[j]})`); i = j + 1; }
      const zeilen = ['COMPUTE ' + ziel + ' = 0.'];
      for (let i = 0; i < bereiche.length; i += 20) zeilen.push(`IF (${bereiche.slice(i, i + 20).join(' OR ')}) ${ziel} = 1.`);
      zeilen.push(`VARIABLE LABELS ${ziel} ${zit(`${v.grund}`.slice(0, 250))}.`, `VALUE LABELS ${ziel} 0 ${zit(L('nein', 'no'))} 1 ${zit(L('ja', 'yes'))}.`, `FORMATS ${ziel} (F1.0).`, `VARIABLE LEVEL ${ziel} (NOMINAL).`, 'EXECUTE.');
      if (await fuehreAus(text, zeilen.join('\n'))) teile.push(kurz);
    }
    // 6. Antworten als Text → neue Spalten mit Zahlen (das Original bleibt)
    for (const v of erk.vorschlaege) {
      if (v.art !== 'textAntworten' || !an(v)) continue;
      const stufen = w.stufen[v.id] ?? v.stufen ?? [];
      if (stufen.length < 2) continue;
      const cmds: string[] = [];
      const entscheid: Record<string, number | null> = {};
      for (const [t, wert] of Object.entries(w.zuordnung[v.id] ?? {})) if (wert) entscheid[t] = wert === 'leer' ? null : Number(wert);   // '' = die automatische Zuordnung gilt
      if (ordneTextZu(stufen, this.rohTexte(v), entscheid).offen.length) { hinweise.push(L('Zu einigen Texten fehlt noch die Entscheidung. Die Spalten mit Zahlen wurden nicht angelegt.', 'A decision is still missing for some texts. The columns with numbers were not created.')); continue; }
      for (const n of v.spalten.filter(vorhanden)) {
        const roh = this.rohTexte(v);
        const ziel = freierName(`${n}_zahl`.slice(0, 60), [...s.spalten.map(c => c.name), ...cmds.map(c => /INTO (\S+)\./.exec(c)?.[1] ?? '')]);
        cmds.push(textRecodeBefehl(n, ziel, stufen, roh, entscheid));
      }
      if (cmds.length && await fuehreAus(L('Antworten als Text in Zahlen umgewandelt (neue Spalten)', 'Answers as text turned into numbers (new columns)'), cmds.join('\n'))) teile.push(L('Textantworten in Zahlen umgewandelt', 'text answers turned into numbers'));
    }
    // 6b. XLSForm: Text-Namen und Beschriftungen der Antworten → Zahlen (nur mit Zustimmung; neue Spalten, das Original bleibt)
    for (const a of this.xls?.abbildungen ?? []) {
      if (!this.xlsHaken[a.liste]) continue;
      const cmds: string[] = [];
      for (const kopf of a.spalten) {
        const n = this.spaltenName(kopf); if (!n || !vorhanden(n)) continue;
        const sp = s.spalten.find(c => c.name.toUpperCase() === n.toUpperCase());
        const i = erk.spalten.findIndex(c => c.name === n);
        const roh = [...new Set(erk.tabelle.zeilen.map(z => z[i]).filter(x => x !== null && x !== undefined && !(x instanceof Date) && String(x).trim() !== '').map(x => String(x).trim()))];
        const ziel = freierName(`${n}_zahl`.slice(0, 60), [...s.spalten.map(c => c.name), ...cmds.map(c => /INTO (\S+)\./.exec(c)?.[1] ?? '')]);
        const r = abbildungsBefehl(n, ziel, a, roh, sp?.art === 'zahl', erk.beschriftungen[n]);
        if ('offen' in r) { hinweise.push(L(`In ${this.anzeige(n)} passen diese Werte zu keiner Antwort der XLSForm: ${r.offen.slice(0, 8).join(', ')}${r.offen.length > 8 ? ' …' : ''}. Die Spalte mit Zahlen wurde nicht angelegt.`, `In ${this.anzeige(n)} these values match no answer of the XLSForm: ${r.offen.slice(0, 8).join(', ')}${r.offen.length > 8 ? ' …' : ''}. The column with numbers was not created.`)); continue; }
        cmds.push(r.befehl);
      }
      if (cmds.length && await fuehreAus(L(`Antworten der Liste ${a.liste} (XLSForm) in Zahlen umgewandelt (neue Spalten)`, `Answers of the list ${a.liste} (XLSForm) turned into numbers (new columns)`), cmds.join('\n'))) teile.push(L(`Antwortliste ${a.liste} in Zahlen umgewandelt`, `answer list ${a.liste} turned into numbers`));
    }
    // 7. Mehrfachsets
    const setsNeu: MehrfachSet[] = [];
    // 7a. Mehrfachauswahl in einer Zelle (Paket 1B): je Option eine 0/1-Spalte, ein Set, Rest als Text `<name>_anders` (das Original bleibt)
    let nMz = 0, nMzAnders = 0;
    for (const v of erk.vorschlaege) {
      if (v.art !== 'mehrfachZelle' || !an(v) || !vorhanden(v.spalte)) continue;
      const z = this.mz[v.id]; if (!z) continue;
      const { werte, anders } = endergebnis(z.erg, z.entscheid, erk.hersteller === 'nextcloud' ? NEXTCLOUD_ANDERES : undefined);
      const frage = (erk.beschriftungen[v.spalte] ?? erk.spalten.find(sp => sp.name === v.spalte)?.kopf ?? v.spalte).slice(0, 200);
      const b = mehrfachZelleBefehle({ spalte: v.spalte, frage, optionen: z.optionen, werte, anders, vorhanden: s.spalten.map(c => c.name), nein: L('nicht angekreuzt', 'not checked'), ja: L('angekreuzt', 'checked'), anderes: L('anderes', 'other') });
      if (!(await fuehreAus(L(`Mehrfachauswahl in einer Zelle (${v.spalte}) in 0/1-Spalten aufgeteilt (neue Spalten)`, `Multiple choice in one cell (${v.spalte}) split into 0/1 columns (new columns)`), b.befehle.join('\n')))) continue;
      let name = v.spalte; if (setNameFehler(name, [...s.sets, ...setsNeu], s.spalten)) name = `${v.spalte}_set`;
      if (b.neu.length >= 2) setsNeu.push({ name, label: frage.length >= 3 ? frage : name, spalten: b.neu, zaehlwert: 1 });
      nMz++; nMzAnders += b.nAnders;
    }
    let nDoppelt = 0;
    // 7b. Doppelte Antworten: nichts wird gelöscht; die übrigen Zeilen jeder gewählten Gruppe bekommen in einer neuen Spalte eine 1 (die behaltene Zeile 0)
    for (const v of erk.vorschlaege) {
      if (v.art !== 'doppelte' || !an(v)) continue;
      const zeilen = zuKennzeichnen(v.gruppen, w.doppelt, w.behalte);
      if (!zeilen.length) continue;
      const ziel = freierName('doppelt', s.spalten.map(c => c.name));
      const grund = v.grund === 'kennung' ? L('Doppelte Antwort (gleiche ID; die behaltene Zeile hat 0)', 'Duplicate answer (same ID; the kept row has 0)') : L('Doppelte Antwort (alle Spalten gleich; die behaltene Zeile hat 0)', 'Duplicate answer (all columns the same; the kept row has 0)');
      if (await fuehreAus(L('Doppelte Antworten gekennzeichnet', 'Duplicate answers flagged'), kennzeichenBefehle(ziel, zeilen, grund, L('nein', 'no'), L('ja', 'yes')).join('\n'))) nDoppelt += zeilen.length;
    }
    // 7c. Mehrfachsets aus Spalten (Kodebuch, Hersteller, Muster)
    for (const v of erk.vorschlaege) {
      if (v.art !== 'mehrfachset' || !an(v)) continue;
      let spalten = v.spalten.filter(vorhanden), zaehlwert: number | string = v.zaehlwert ?? 1;
      if (spalten.length < 2) continue;
      if (v.umkodierung !== 'zaehlwert') {
        // Umkodieren in neue 0/1-Spalten (das Original bleibt): leer = nicht gewählt; bei „ungleich 0“ bleibt leer leer
        const cmds: string[] = [], neu: string[] = [];
        for (const n of spalten) {
          const ziel = freierName(`${n}_ja`.slice(0, 60), [...s.spalten.map(c => c.name), ...neu]);
          neu.push(ziel);
          cmds.push(v.umkodierung === 'nichtleer' ? `RECODE ${n} (MISSING=0) (ELSE=1) INTO ${ziel}.` : `RECODE ${n} (MISSING=SYSMIS) (0=0) (ELSE=1) INTO ${ziel}.`, `FORMATS ${ziel} (F1.0).`, `VARIABLE LEVEL ${ziel} (NOMINAL).`);
        }
        cmds.push('EXECUTE.');
        if (!(await fuehreAus(L(`Mehrfachauswahl ${v.name} in 0/1-Spalten umgewandelt (neue Spalten)`, `Multiple choice ${v.name} turned into 0/1 columns (new columns)`), cmds.join('\n')))) continue;
        spalten = neu; zaehlwert = 1;
      }
      const label = erk.spalten.find(sp => sp.name === v.spalten[0])?.label?.replace(/\s*[-:\[(].*$/, '') || v.name;
      let name = v.name; if (setNameFehler(name, [...s.sets, ...setsNeu], s.spalten)) name = `${v.name}_set`;
      setsNeu.push({ name, label: label.length >= 3 ? label : name, spalten, zaehlwert });
    }
    if (protokoll.length > 1) merkeSyntax(protokoll.join('\n'), L('Fragebogen-Import', 'Questionnaire import'));
    if (setsNeu.length) await setzeSets([...s.sets, ...setsNeu]);
    // Eine Sammelmeldung statt einer je Schritt: NVDA spricht von mehreren kurz hintereinander nur die letzte.
    if (nMz) teile.unshift(Lp(nMz, `Mehrfachauswahl in ${nMz} Spalte aufgeteilt`, `Mehrfachauswahl in ${nMz} Spalten aufgeteilt`, `multiple choice split in ${nMz} column`, `multiple choice split in ${nMz} columns`) + (nMzAnders ? L(` (${nMzAnders} ${nMzAnders === 1 ? 'Antwort' : 'Antworten'} als Anderes)`, ` (${nMzAnders} ${nMzAnders === 1 ? 'answer' : 'answers'} as other)`) : ''));
    if (nDoppelt) teile.push(Lp(nDoppelt, `${nDoppelt} doppelte Antwort markiert`, `${nDoppelt} doppelte Antworten markiert`, `${nDoppelt} duplicate answer flagged`, `${nDoppelt} duplicate answers flagged`));
    if (setsNeu.length) hinweise.push(Lp(setsNeu.length, `Mehrfachantwort-Set angelegt: ${setsNeu.map(x => x.name).join(', ')}.`, `Mehrfachantwort-Sets angelegt: ${setsNeu.map(x => x.name).join(', ')}.`, `Multiple-response set created: ${setsNeu.map(x => x.name).join(', ')}.`, `Multiple-response sets created: ${setsNeu.map(x => x.name).join(', ')}.`));
    const satz = teile.length ? L(`Übernommen: ${teile.join(', ')}.`, `Applied: ${teile.join(', ')}.`) : '';
    if (satz || hinweise.length) melde([satz, ...hinweise].filter(Boolean).join(' '), !!satz);   // gemeinsame Ansage-Region (melde sagt an)
  }

  /** Spalten, deren Beschriftungen gegen die Zahlenreihenfolge laufen (1 = „stimme voll zu“): nur ein Hinweis. */
  umgepolt(): string[] {
    const kb = this.kb; if (!kb) return [];
    return Object.entries(kb.spalten).filter(([, sp]) => sp.werteLabels && umgepoltHinweis(sp.werteLabels)).map(([n]) => n);
  }
}
export const fbImport = new FragebogenImport();
