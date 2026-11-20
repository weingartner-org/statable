/**
 * Fallgewicht im Projekt (Später, Welle S-A, Teil 1): setzen, ausschalten, die Pflichtfrage nach der Art, was gerade gilt.
 * Die Rechnung steht in lib/gewichte.ts; hier steht der Zustand (`s.gewicht`, `s.gewichtFrage` in lib/sitzung.svelte.ts) und die Oberfläche dazu.
 * Das Gewicht gehört dem Projekt, nicht dem Blatt: ein Wechsel macht alle Blätter „veraltet“ (lib/blattstand.ts), nie einzelne ungewichtet.
 */
import { fehlendMenge, istFehlend } from './fehlend';
import { s, d, L, Lp, aendere, aendereDaten, melde, sichern } from './sitzung.svelte';
import { baueSpalte, textCodes, type Wert } from './eingabe';
import { leseZahl } from './power';
import { rake, type RakingErgebnis } from './raking';
import { planKalibrieren, kalibrierenLesen, genauigkeitFehlerSatz, R_PAKETE_KALIBRIEREN, KAL_MAX_MERKMALE, type KalPlan, type KalEingabe, type KalErgebnisOk } from './genauigkeit';
import type { Quelle } from './gewichtbeschreibend';
import { entwurfPruefen, type EntwurfProblem } from './umfrageentwurf';
import { gewichtBefehl, kishSatz, pruefeGewicht, entwurfWirksam, type Entwurf, type Gewicht, type GewichtAbdruck, type GewichtArt, type Gewichtspruefung } from './gewichte';
import { zahlDe } from './format';
import type { Spalte } from './verzeichnis';

/** Der Dialog „Fallgewicht“: offen oder zu (die Pflichtfrage öffnet ihn von selbst). */
export const gewichtDialog = $state({ offen: false, spalte: '' });
/** Öffnet den Dialog; `spalte`: schon gewählt (der Vorschlag der Daten-Seite). */
export const oeffneGewichtDialog = (spalte = '') => { gewichtDialog.spalte = spalte; gewichtDialog.offen = true; };

export const artName = (a: GewichtArt) => (a === 'haeufigkeit' ? L('Häufigkeitsgewicht', 'frequency weight') : L('Umfragegewicht', 'survey weight'));
/** Kurz, für den Chip im Kopf und die Zeile unter „Gerechnet“. */
export const artKurz = (a: GewichtArt) => (a === 'haeufigkeit' ? L('Häufigkeit', 'frequency') : L('Umfrage', 'survey'));

/** Der Satz zu einem Problem im Stichprobenplan (Abschnitt 6, Teil A), das schon beim Setzen auffällt. */
export function entwurfProblemSatz(p: EntwurfProblem): string {
  switch (p.code) {
    case 'spalte-fehlt': return L(`Die Spalte ${p.spalte} gibt es nicht mehr. Der Stichprobenplan muss neu gewählt werden.`, `The column ${p.spalte} no longer exists. Choose the sampling design again.`);
    case 'ist-gewicht': return L(`Die Spalte ${p.spalte} ist das Fallgewicht und kann nicht zugleich zum Stichprobenplan gehören.`, `The column ${p.spalte} is the case weight and cannot also belong to the sampling design.`);
    case 'doppelt': return L(`Die Spalte ${p.spalte} steht mehrfach im Stichprobenplan. Jede Angabe braucht eine eigene Spalte.`, `The column ${p.spalte} appears several times in the sampling design. Every item needs a column of its own.`);
    default: return L(`Die Angabe zur Grundgesamtheit muss eine Spalte mit Zahlen sein (${p.spalte}).`, `The population size must be a column of numbers (${p.spalte}).`);
  }
}
/** Der Plan, wie er gespeichert wird: nur die wirksamen Angaben, nur beim Umfragegewicht; ein Problem als Satz. */
function planFuer(g: Gewicht): { entwurf?: Entwurf } | { fehler: string } {
  const w = g.art === 'umfrage' ? entwurfWirksam(g.entwurf) : null;
  if (!w) return {};
  const p = entwurfPruefen(w, g.spalte, s.spalten);
  return p ? { fehler: entwurfProblemSatz(p) } : { entwurf: w };
}

/** Zahlenspalten, die als Fallgewicht in Frage kommen (PSPP gewichtet nur mit Zahlen). */
export const gewichtsKandidaten = (): Spalte[] => s.spalten.filter(sp => sp.art === 'zahl');

const spalteMit = (name: string) => s.spalten.find(x => x.name.toLowerCase() === name.toLowerCase());
/** Die Werte der Spalte als Gewichte: „keine Angabe“-Werte der Spalte und Lücken sind fehlend. */
export function gewichtsWerte(name: string): (number | null)[] {
  const i = s.spalten.findIndex(x => x.name.toLowerCase() === name.toLowerCase());
  if (i < 0) return [];
  const fe = fehlendMenge(s.spalten[i]);
  return s.zeilen.map(z => { const v = z[i]; return typeof v === 'number' && !fe.includes(v) ? v : null; });
}
/** Prüfung einer gewählten Spalte und Art (für die Vorschau im Dialog). */
export const pruefeSpalte = (name: string, art: GewichtArt): Gewichtspruefung => pruefeGewicht(gewichtsWerte(name), art);

let zwischen: { z: unknown; sp: unknown; schluessel: string; r: Gewichtspruefung } | null = null;
/** Prüfung des Gewichts, das im Projekt gilt (zwischengespeichert, solange Zeilen, Spalten und Wahl dieselben sind). Null = ungewichtet. */
export function gewichtPruefung(): Gewichtspruefung | null {
  const g = s.gewicht;
  if (!g) return null;
  const z = s.zeilen, sp = s.spalten, schluessel = `${g.spalte}|${g.art}`;
  if (zwischen && zwischen.z === z && zwischen.sp === sp && zwischen.schluessel === schluessel) return zwischen.r;
  const r = pruefeSpalte(g.spalte, g.art);
  zwischen = { z, sp, schluessel, r };
  return r;
}

export type GewichtLage =
  | { art: 'aus' }
  | { art: 'frage'; spalte: string }
  | { art: 'fehler'; gewicht: Gewicht; pruefung: Gewichtspruefung }
  | { art: 'gilt'; gewicht: GewichtAbdruck; pruefung: Gewichtspruefung };
/** Was gerade gilt: ungewichtet, Pflichtfrage offen, Spalte unbrauchbar geworden (Daten bearbeitet) oder gewichtet. */
export function gewichtLage(): GewichtLage {
  if (s.gewichtFrage) return { art: 'frage', spalte: s.gewichtFrage };
  const g = s.gewicht;
  if (!g) return { art: 'aus' };
  const r = gewichtPruefung()!;
  return r.fehler ? { art: 'fehler', gewicht: g, pruefung: r } : { art: 'gilt', gewicht: { ...g, summe: r.summe, zeilen: r.zeilen }, pruefung: r };
}
/** Das Gewicht, mit dem gerade gerechnet wird; sonst undefined (ungewichtet, Frage offen oder Spalte unbrauchbar). */
export function aktivesGewicht(): GewichtAbdruck | undefined { const l = gewichtLage(); return l.art === 'gilt' ? l.gewicht : undefined; }

/** Meldungen zur Spalte (Fachblatt 1.7): Zeilen mit Gewicht 0 und ohne Gewicht (mit Zahl), Summe sehr groß, Kish bei Umfragegewichten. Fehler stehen gesondert. */
export function gewichtHinweise(r: Gewichtspruefung, g: Gewicht): string[] {
  if (r.fehler) return [];
  const aus: string[] = [];
  if (r.nullZeilen) aus.push(Lp(r.nullZeilen, `${r.nullZeilen} Zeile hat das Fallgewicht 0 und zählt nicht mit.`, `${r.nullZeilen} Zeilen haben das Fallgewicht 0 und zählen nicht mit.`, `${r.nullZeilen} row has the case weight 0 and is not counted.`, `${r.nullZeilen} rows have the case weight 0 and are not counted.`));
  if (r.fehlendZeilen) aus.push(Lp(r.fehlendZeilen, `${r.fehlendZeilen} Zeile hat kein Fallgewicht (leer oder „keine Angabe“). Diese Zeile zählt nicht mit - anders als ein Fall mit dem Fallgewicht 1.`, `${r.fehlendZeilen} Zeilen haben kein Fallgewicht (leer oder „keine Angabe“). Diese Zeilen zählen nicht mit - anders als ein Fall mit dem Fallgewicht 1.`,
    `${r.fehlendZeilen} row has no case weight (blank or "no answer"). It is not counted - unlike a case with the case weight 1.`, `${r.fehlendZeilen} rows have no case weight (blank or "no answer"). They are not counted - unlike cases with the case weight 1.`));
  if (r.hinweise.includes('summe-gross'))
    aus.push(L(`Das sieht nach einem Umfragegewicht aus (Summe der Fallgewichte ${zahlDe(r.summe)} bei ${r.zeilen} Zeilen). Als Häufigkeit würden Tests unsinnig scharf: Die Tests täten so, als gäbe es ${zahlDe(r.summe)} Personen.`,
      `This looks like a survey weight (sum of the case weights ${zahlDe(r.summe)} for ${r.zeilen} rows). As a frequency, tests would be absurdly sharp: they would act as if there were ${zahlDe(r.summe)} people.`));
  if (g.art === 'umfrage') {
    aus.push(kishSatz(r.w));
    const m = r.summe / r.zeilen;
    if (m > 2 || m < 0.5)
      aus.push(L(`Die Fallgewichte haben im Mittel den Wert ${zahlDe(Math.round(m * 100) / 100)}. Das ist in Ordnung: Mittelwerte und Anteile hängen nicht davon ab, wie groß die Fallgewichte insgesamt sind. Statable rechnet sie nicht um.`,
        `The case weights average ${zahlDe(Math.round(m * 100) / 100)}. That is fine: means and proportions do not depend on how large the weights are overall. Statable does not rescale them.`));
  }
  return aus;
}
/** Der Satz zu einem Fehler der Spalte (Fachblatt 1.2). */
export function gewichtFehlerSatz(r: Gewichtspruefung, g: Gewicht): string {
  const c = r.fehler?.code;
  if (c === 'nicht-ganzzahlig') return d(`Ein Häufigkeitsgewicht muss eine ganze Zahl sein (eine Zeile zählt 1-mal, 2-mal …). ${g.spalte} hat Kommazahlen. Gleicht die Spalte aus, wie Befragte ausgewählt wurden, wähle „Umfragegewicht“.`,
    `Ein Häufigkeitsgewicht muss eine ganze Zahl sein (eine Zeile zählt 1-mal, 2-mal …). ${g.spalte} hat Kommazahlen. Gleicht die Spalte aus, wie Befragte ausgewählt wurden, wählen Sie „Umfragegewicht“.`,
    `A frequency weight must be a whole number (a row counts once, twice …). ${g.spalte} has decimals. If the column adjusts for how respondents were selected, choose "survey weight".`);
  if (c === 'negativ') return L(`${g.spalte} hat negative Werte. Ein Fallgewicht darf nicht negativ sein.`, `${g.spalte} has negative values. A case weight must not be negative.`);
  return L(`Kein Wert von ${g.spalte} kann als Fallgewicht zählen: Alle sind 0 oder leer.`, `No value of ${g.spalte} can count as a case weight: all are 0 or blank.`);
}

/** Eine Spalte, die nach Gewicht aussieht (Name wie „gewicht“, „weight“, „w“ und nur positive Zahlen): Statable schlägt sie nur vor, setzt sie nie von selbst. */
// Mit den Wörtern der 13 weiteren Sprachen (die Übungsdatei „arbeit-einkommen-puf“ heißt dort poids, ponderación, στάθμιση, вага …).
const GEWICHTSNAME = /^(gewicht|gewichtung|weight|weights|wgt|wght|gew|fallgewicht|hochrechnung|designgewicht|poids|pondération|ponderación|ponderacion|ponderazione|ponderação|ponderacao|ponderare|peso|weging|vikt|waga|wagi|váha|súly|στάθμιση|βάρος|вага|тегло)([_\-.\s]?[\p{L}\p{N}_]*)?$|^w([_\-.][\p{L}\p{N}_]+)?$/iu;
export function gewichtVorschlag(): Spalte | null {
  if (s.gewicht || s.gewichtFrage) return null;
  for (const sp of gewichtsKandidaten()) {
    if (!GEWICHTSNAME.test(sp.name)) continue;
    const w = gewichtsWerte(sp.name).filter((v): v is number => v !== null);
    if (w.length && w.length === s.zeilen.length && w.every(v => v > 0)) return sp;
  }
  return null;
}

/* ---------------------------------------------------------------------------------------------------------------------------------- Setzen */
/** Setzt das Fallgewicht (ein Schritt zum Rückgängigmachen). Gibt die Fehlermeldung zurück, wenn die Spalte nicht taugt; sonst null.
 *  Umfragegewicht: `g.klumpenfrei` ist die Pflichtangabe „Personen einzeln gezogen: Ja / Nein oder weiß nicht“ (Später S-D2). Der Dialog verlangt sie; fehlt sie hier, gilt die Antwort als nicht gegeben
 *  und alles bleibt wie vor S-D2 (nur beschreibend, Tests gesperrt). Bei Häufigkeitsgewicht wird sie nicht gespeichert. */
export async function setzeFallgewicht(g: Gewicht): Promise<string | null> {
  const sp = spalteMit(g.spalte);
  if (!sp || sp.art !== 'zahl') return L('Das Fallgewicht muss eine Spalte mit Zahlen sein.', 'The case weight must be a column of numbers.');
  const r = pruefeSpalte(sp.name, g.art);
  if (r.fehler) return gewichtFehlerSatz(r, g);
  const plan = planFuer({ ...g, spalte: sp.name });
  if ('fehler' in plan) return plan.fehler;
  // Mit Stichprobenplan rechnet Statable designbasiert (`klumpenfrei: true` heißt „designbasiert“, der Plan steht in `entwurf`)
  const neu: Gewicht = { spalte: sp.name, art: g.art, ...(g.art === 'umfrage' && (plan.entwurf || typeof g.klumpenfrei === 'boolean') ? { klumpenfrei: plan.entwurf ? true : g.klumpenfrei } : {}), ...(plan.entwurf ? { entwurf: plan.entwurf } : {}) };
  await aendere(L(`Fallgewicht ${sp.name} (${artKurz(g.art)}) gesetzt`, `Case weight ${sp.name} (${artKurz(g.art)}) set`), gewichtBefehl(neu), neu);
  melde(L(`Alle Auswertungen rechnen jetzt gewichtet: ${sp.name} als ${artName(g.art)}.`, `All analyses now calculate weighted: ${sp.name} as a ${artName(g.art)}.`), true);
  return null;
}
/** Schaltet das Fallgewicht aus (ein Schritt zum Rückgängigmachen). */
export async function schalteFallgewichtAus() {
  const alt = s.gewicht?.spalte ?? s.gewichtFrage ?? '';
  await aendere(L(`Fallgewicht ${alt} ausgeschaltet`, `Case weight ${alt} switched off`), gewichtBefehl(), null);
  melde(L('Fallgewicht ausgeschaltet. Alle Auswertungen rechnen wieder ungewichtet.', 'Case weight switched off. All analyses calculate unweighted again.'), true);
}
/** Antwort auf die Pflichtfrage „Was bedeutet ‹w›?“: Die Engine trägt das Gewicht schon, Statable lernt nur die Art. Gibt die Fehlermeldung zurück, wenn die Art nicht passt. */
export async function beantworteGewichtFrage(art: GewichtArt, klumpenfrei?: boolean, entwurf?: Entwurf): Promise<string | null> {
  const name = s.gewichtFrage; if (!name) return null;
  const sp = spalteMit(name);
  const plan = planFuer({ spalte: sp?.name ?? name, art, entwurf });
  if ('fehler' in plan) return plan.fehler;
  const g: Gewicht = { spalte: sp?.name ?? name, art, ...(art === 'umfrage' && (plan.entwurf || typeof klumpenfrei === 'boolean') ? { klumpenfrei: plan.entwurf ? true : klumpenfrei } : {}), ...(plan.entwurf ? { entwurf: plan.entwurf } : {}) };
  const r = pruefeSpalte(g.spalte, art);
  if (r.fehler) return gewichtFehlerSatz(r, g);
  s.gewicht = g; s.gewichtFrage = null;
  void sichern();
  melde(L(`Verstanden: ${g.spalte} gilt als ${artName(art)}. Alle Auswertungen rechnen jetzt gewichtet.`, `Understood: ${g.spalte} counts as a ${artName(art)}. All analyses now calculate weighted.`));
  return null;
}

/* ---------------------------------------------------------------------------------------------------------------------------------- Raking (Später S-F2, B) */
/** Der Weg „Gewichte berechnen (Raking)“ im Dialog: aus bekannten Randverteilungen (lib/raking.ts) eine neue Spalte, dann die Pflichtfrage „einzeln gezogen“, dann Umfragegewicht. */
export interface RakingKategorie { wert: string; label: string; n: number }
/** Höchstens so viele Kategorien je Merkmal (sonst ist es kein Gruppenmerkmal). */
export const RAKING_MAX_KATEGORIEN = 50;

const kategorieWert = (sp: Spalte, v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isNaN(v) || istFehlend(sp, v) ? null : String(v);
  const t = String(v);
  return t === '' || textCodes(sp.fehlendText).includes(t) ? null : t;
};
/** Die Werte der Spalte als Kategorien (fehlend = null); Zahlen und Text gleich als Text geführt. */
export function rakingWerte(name: string): (string | null)[] {
  const i = s.spalten.findIndex(x => x.name.toLowerCase() === name.toLowerCase());
  if (i < 0) return [];
  const sp = s.spalten[i]!;
  return s.zeilen.map(z => kategorieWert(sp, z[i]));
}
/** Die Kategorien einer Spalte mit Beschriftung und Zahl der Fälle (Zahlen aufsteigend, Text nach dem Alphabet); null, wenn es zu wenige oder zu viele sind. */
export function rakingKategorien(name: string): RakingKategorie[] | null {
  const i = s.spalten.findIndex(x => x.name.toLowerCase() === name.toLowerCase());
  if (i < 0) return null;
  const sp = s.spalten[i]!, zaehl = new Map<string, number>();
  for (const z of s.zeilen) {
    const k = kategorieWert(sp, z[i]); if (k === null) continue;
    zaehl.set(k, (zaehl.get(k) ?? 0) + 1);
    if (zaehl.size > RAKING_MAX_KATEGORIEN) return null;
  }
  if (zaehl.size < 2) return null;
  const alle = [...zaehl.keys()], zahlen = sp.art === 'zahl';
  alle.sort(zahlen ? (a, b) => Number(a) - Number(b) : (a, b) => a.localeCompare(b));
  return alle.map(w => ({ wert: w, label: sp.werteLabels[zahlen ? String(Number(w)) : w] ?? w, n: zaehl.get(w)! }));
}
/** Spalten, die als Merkmal in Frage kommen: 2 bis 50 verschiedene gültige Werte. Die Prüfung bricht früh ab und ist darum auch bei großen Tabellen schnell. */
export const rakingKandidaten = (): Spalte[] => s.spalten.filter(sp => rakingKategorien(sp.name) !== null);

export interface RakingZustand {
  /** gewählte Merkmale (Spaltennamen), 1 bis 5 */
  merkmale: string[];
  /** je Merkmal: Kategorie → Text, wie getippt */
  eingaben: Record<string, Record<string, string>>;
  /** Spalte mit dem Ausgangsgewicht (Designgewicht) oder leer = 1 */
  ausgang: string;
  /** Name der neuen Spalte */
  name: string;
}
export const rakingStart = (): RakingZustand => ({ merkmale: [], eingaben: {}, ausgang: '', name: 'raking_gewicht' });

/** Die Ränder aus den Eingaben: Zahl je Kategorie; leere Felder fehlen (das meldet raking.ts); `ungueltig` nennt Felder mit Text, der keine Zahl ist. */
export function rakingRaender(z: RakingZustand): { raender: Record<string, number>[]; ungueltig: { merkmal: string; kategorie: string }[] } {
  const ungueltig: { merkmal: string; kategorie: string }[] = [];
  const raender = z.merkmale.map(m => {
    const r: Record<string, number> = {};
    for (const [k, t] of Object.entries(z.eingaben[m] ?? {})) {
      if (t.trim() === '') continue;
      const v = leseZahl(t);
      if (Number.isFinite(v)) r[k] = v; else ungueltig.push({ merkmal: m, kategorie: k });
    }
    return r;
  });
  return { raender, ungueltig };
}
/** Rechnet das Raking mit den Daten des Projekts. */
export function rakingRechnen(z: RakingZustand): RakingErgebnis {
  const { raender } = rakingRaender(z);
  return rake({ faktoren: z.merkmale.map(rakingWerte), raender, ...(z.ausgang ? { ausgang: gewichtsWerte(z.ausgang) } : {}) });
}
/** Legt die Gewichte als neue Spalte an (ein Schritt zum Rückgängigmachen) und setzt sie als Umfragegewicht mit der Antwort auf „einzeln gezogen“. Gibt die Fehlermeldung zurück oder null. */
export async function rakingUebernehmen(z: RakingZustand, erg: RakingErgebnis, klumpenfrei: boolean): Promise<string | null> {
  if (!erg.ok) return L('Es gibt noch keine Gewichte.', 'There are no weights yet.');
  if (erg.gewichte.length !== s.zeilen.length) return L('Die Daten haben sich geändert. Bitte noch einmal rechnen.', 'The data have changed. Please calculate again.');
  const spalten = $state.snapshot(s.spalten) as Spalte[], neu = baueSpalte({ bezeichnung: z.name.trim() || 'raking_gewicht', art: 'zahl' }, spalten.map(x => x.name));
  neu.bezeichnung = L('Gewicht aus Raking', 'Weight from raking');
  const zeilen = s.zeilen.map((r, i) => [...r, erg.gewichte[i]] as Wert[]);
  if (!(await aendereDaten(L(`Spalte „${neu.name}“ mit Raking-Gewichten angelegt`, `Column "${neu.name}" with raking weights created`), [...spalten, neu], zeilen, false, { art: 'raking' }))) return L('Das ließ sich nicht speichern. Es ist alles wie vorher.', "That couldn't be saved. Everything is as it was before.");
  return setzeFallgewicht({ spalte: neu.name, art: 'umfrage', klumpenfrei });
}

/* ---------------------------------------------------------------------------------------------------------------------------------- Kalibrieren (Mikrodaten, M5b) */
/** Neben Raking: linear kalibrieren (GREG) oder begrenzt kalibrieren. Die Eingabe der Sollsummen ist dieselbe wie beim Raking (`RakingZustand`). */
export type KalVerfahren = 'raking' | 'linear' | 'begrenzt';
/** Zusätzliche Eingaben, wie getippt: Gesamtzahl (leer = Summe des ersten Rands) und die Grenzen für den Faktor neu / alt. */
export interface KalOptionen { gesamt: string; lo: string; hi: string }
export const kalStart = (): KalOptionen => ({ gesamt: '', lo: '0,5', hi: '3' });
export const kalNameStandard = 'kalibriert_gewicht';

const kalSatz = (code: string, extra: Record<string, unknown> = {}, z?: RakingZustand) =>
  genauigkeitFehlerSatz({ fehlerCode: code, ...extra }, { merkmale: z?.merkmale, werte: z?.merkmale.map(m => (rakingKategorien(m) ?? []).map(k => (spalteMit(m)?.art === 'zahl' ? Number(k.wert) : k.wert))) });

/** Baut die Eingabe für survey::calibrate aus den Daten des Projekts (Zahlen als Sollsummen) und prüft sie ohne R. Gibt `{ satz }` zurück, wenn etwas fehlt oder nicht passt. */
export function kalibrierenPlan(z: RakingZustand, verfahren: Exclude<KalVerfahren, 'raking'>, o: KalOptionen): { plan: KalPlan; eingabe: KalEingabe } | { satz: string } {
  if (z.merkmale.length < 1) return { satz: L('Es braucht mindestens ein Merkmal.', 'At least one variable is needed.') };
  if (z.merkmale.length > KAL_MAX_MERKMALE) return { satz: L(`Zum Kalibrieren sind höchstens ${KAL_MAX_MERKMALE} Merkmale möglich.`, `Calibration allows at most ${KAL_MAX_MERKMALE} variables.`) };
  const merkmale = [];
  for (const m of z.merkmale) {
    const sp = spalteMit(m), kats = rakingKategorien(m);
    if (!sp || !kats) return { satz: L(`„${m}“ hat zu wenige oder zu viele Werte.`, `"${m}" has too few or too many values.`) };
    const summen: number[] = [];
    for (const k of kats) {
      const t = (z.eingaben[m]?.[k.wert] ?? '').trim(), v = t === '' ? NaN : leseZahl(t);
      if (!Number.isFinite(v)) return { satz: L('Jedes Feld braucht eine Zahl.', 'Every field needs a number.') };
      summen.push(v);
    }
    merkmale.push({ spalte: sp.name, werte: kats.map(k => (sp.art === 'zahl' ? Number(k.wert) : k.wert)), summen });
  }
  const gt = o.gesamt.trim(), gesamt = gt === '' ? null : leseZahl(gt);
  if (gesamt !== null && !Number.isFinite(gesamt)) return { satz: kalSatz('rand-ungueltig', { merkmal: 0 }) };
  let grenzen: [number, number] | null = null;
  if (verfahren === 'begrenzt') { grenzen = [leseZahl(o.lo), leseZahl(o.hi)]; if (!Number.isFinite(grenzen[0]) || !Number.isFinite(grenzen[1])) return { satz: kalSatz('bounds-ungueltig') }; }
  const eingabe: KalEingabe = { merkmale, gesamt, grenzen };
  const w = z.ausgang ? gewichtsWerte(z.ausgang).map(v => (v !== null && v > 0 ? v : 0)) : s.zeilen.map(() => 1);
  const q: Quelle = { spalten: s.spalten, zeilen: s.zeilen, w };
  const plan = planKalibrieren(q, eingabe);
  if ('problem' in plan) return { satz: kalSatz(plan.problem, { merkmal: plan.merkmal, summe: plan.summe, gesamt: plan.gesamt }, z) };
  return { plan, eingabe };
}

export type KalRechnung = { ok: true; plan: KalPlan; erg: KalErgebnisOk } | { ok: false; satz: string };
/** Rechnet über webR (R-Pakete survey und MASS). Die Oberfläche zeigt dabei die Lade-Animation. */
export async function kalibrierenRechnen(z: RakingZustand, verfahren: Exclude<KalVerfahren, 'raking'>, o: KalOptionen): Promise<KalRechnung> {
  const p = kalibrierenPlan(z, verfahren, o);
  if ('satz' in p) return { ok: false, satz: p.satz };
  const { umfrageRechnen } = await import('./rverfahren.svelte');
  const antwort = await umfrageRechnen('kalibrieren', p.plan.spalten, p.plan.aufruf, R_PAKETE_KALIBRIEREN);
  const r = kalibrierenLesen(p.plan, antwort);
  if ('fehler' in r) return { ok: false, satz: r.fehler };
  if (!r.ok) return { ok: false, satz: kalSatz(r.code, r.e, z) };
  return { ok: true, plan: p.plan, erg: r };
}

/** Legt die kalibrierten Gewichte als neue Spalte an (ein Schritt zum Rückgängigmachen) und setzt sie als Umfragegewicht. Bei negativen Gewichten wird nichts angelegt. */
export async function kalibrierenUebernehmen(z: RakingZustand, erg: KalErgebnisOk, verfahren: Exclude<KalVerfahren, 'raking'>, klumpenfrei: boolean): Promise<string | null> {
  if (erg.gewichte.length !== s.zeilen.length) return L('Die Daten haben sich geändert. Bitte noch einmal rechnen.', 'The data have changed. Please calculate again.');
  if (erg.negativ > 0) return L('Negative Gewichte lassen sich nicht übernehmen. Kalibriere begrenzt.', 'Negative weights cannot be applied. Calibrate with limits.');
  const spalten = $state.snapshot(s.spalten) as Spalte[], neu = baueSpalte({ bezeichnung: z.name.trim() || kalNameStandard, art: 'zahl' }, spalten.map(x => x.name));
  neu.bezeichnung = verfahren === 'linear' ? L('Gewicht aus linearer Kalibrierung', 'Weight from linear calibration') : L('Gewicht aus begrenzter Kalibrierung', 'Weight from calibration with limits');
  const zeilen = s.zeilen.map((r, i) => [...r, erg.gewichte[i]] as Wert[]);
  const text = verfahren === 'linear' ? L(`Spalte „${neu.name}“ mit kalibrierten Gewichten angelegt`, `Column "${neu.name}" with calibrated weights created`) : L(`Spalte „${neu.name}“ mit begrenzt kalibrierten Gewichten angelegt`, `Column "${neu.name}" with weights calibrated with limits created`);
  if (!(await aendereDaten(text, [...spalten, neu], zeilen, false, { art: 'raking' }))) return L('Das ließ sich nicht speichern. Es ist alles wie vorher.', "That couldn't be saved. Everything is as it was before.");
  return setzeFallgewicht({ spalte: neu.name, art: 'umfrage', klumpenfrei });
}
