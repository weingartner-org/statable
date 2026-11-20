/**
 * Daten-Assistent „Mikrodaten schützen“ (Paket M5b): die Verbindung zwischen den Daten des Projekts und lib/anonym.ts (M3, gegen sdcMicro belegt).
 * Hier wird nichts gerechnet, was anonym.ts schon kann: Kennzahlen, Kappen, lokales Unterdrücken und das Protokoll kommen von dort.
 * Das Ergebnis ist ein Schritt zum Rückgängigmachen (`aendereDaten`); das Original bleibt über „Rückgängig“ erreichbar.
 */
import { s, L, Lp, aendereDaten } from './sitzung.svelte';
import { fehlendMenge, istFehlend } from './fehlend';
import { textCodes, type Wert } from './eingabe';
import { gewichtsWerte } from './fallgewicht.svelte';
import { anonymisieren, anonymFehlerSatz, haeufigkeiten, kennzahlen, kennzahlenSatz, type AnonymKennzahlen, type AnonymSchritt, type ProtokollZeile, type Wert as AWert } from './anonym';
import type { Spalte } from './verzeichnis';

export const SCHUTZ_K = [2, 3, 5] as const;
export const SCHUTZ_MAX_FAELLE = 200000;

/** Eine Kappungsregel: Spalte, oben oder unten, Perzentil (Prozent) oder feste Grenze. */
export interface Kappung { spalte: string; seite: 'oben' | 'unten'; modus: 'perzentil' | 'grenze'; wert: number }
export interface SchutzPlan {
  /** Schlüsselmerkmale, das wichtigste zuerst */ schluessel: string[];
  k: number; mitGewicht: boolean; kappen: Kappung[]; lokal: boolean; entfernen: string[];
}
export const schutzStart = (): SchutzPlan => ({ schluessel: [], k: 3, mitGewicht: true, kappen: [], lokal: true, entfernen: [] });

/** Satz zur Grenze des Verfahrens - steht im Assistenten und im Protokoll. */
export const schutzGrenzeSatz = () => L('k-Anonymität schützt nicht vor allem. Vor der Weitergabe prüft die zuständige Stelle.', 'k-anonymity does not protect against everything. Before release, the responsible body checks the data.');

const spalteMit = (name: string): Spalte | undefined => s.spalten.find(x => x.name === name);
/** Die Werte einer Spalte; „keine Angabe“, Lücken und leerer Text sind fehlend (null). */
export function schutzWerte(name: string): AWert[] {
  const i = s.spalten.findIndex(x => x.name === name);
  if (i < 0) return [];
  const sp = s.spalten[i]!, fe = fehlendMenge(sp), tc = textCodes(sp.fehlendText);
  return s.zeilen.map(z => {
    const v = z[i];
    if (v === null || v === undefined) return null;
    if (typeof v === 'number') return Number.isNaN(v) || fe.includes(v) || istFehlend(sp, v) ? null : v;
    return v === '' || tc.includes(String(v)) ? null : String(v);
  });
}
const gewichtSpalte = (p: SchutzPlan): (number | null)[] | undefined => (p.mitGewicht && s.gewicht ? gewichtsWerte(s.gewicht.spalte) : undefined);
export const schutzHatGewicht = () => !!s.gewicht;

/** Kennzahlen vor oder nach den Schritten (Standard: die Daten des Projekts). */
export function schutzKennzahlen(p: SchutzPlan, spalten?: Record<string, AWert[]>): AnonymKennzahlen | null {
  if (!p.schluessel.length || s.zeilen.length > SCHUTZ_MAX_FAELLE) return null;
  const cols = p.schluessel.map(n => (spalten ? spalten[n] : schutzWerte(n)) ?? []);
  return kennzahlen(haeufigkeiten(cols, gewichtSpalte(p)), p.k);
}

export interface SchutzErgebnis {
  ok: true; protokoll: ProtokollZeile[]; saetze: string[]; vorher: AnonymKennzahlen; nachher: AnonymKennzahlen;
  /** die geschützten Spalten (nur die, die der Assistent angefasst hat); entfernte fehlen */ daten: Record<string, AWert[]>;
}
export interface SchutzFehler { ok: false; satz: string }

/** Rechnet die Schritte auf einer Kopie (das Projekt bleibt unverändert). Reihenfolge: kappen, lokal unterdrücken, Spalten entfernen. */
export function schutzRechnen(p: SchutzPlan): SchutzErgebnis | SchutzFehler {
  if (!p.schluessel.length) return { ok: false, satz: L('Es braucht mindestens ein Schlüsselmerkmal.', 'At least one key variable is needed.') };
  if (s.zeilen.length > SCHUTZ_MAX_FAELLE) return { ok: false, satz: L('Zu viele Fälle für diese Rechnung im Browser.', 'Too many cases for this calculation in the browser.') };
  const noetig = new Set([...p.schluessel, ...p.kappen.map(k => k.spalte), ...p.entfernen]);
  const daten: Record<string, AWert[]> = {};
  for (const n of noetig) daten[n] = schutzWerte(n);
  const vorher = schutzKennzahlen(p, daten)!;
  const schritte: AnonymSchritt[] = [];
  for (const k of p.kappen) schritte.push({ art: k.seite, spalte: k.spalte, ...(k.modus === 'grenze' ? { grenze: k.wert } : { prozent: k.wert }) });
  if (p.lokal) schritte.push({ art: 'lokal', k: p.k, schluessel: p.schluessel });
  if (p.entfernen.length) schritte.push({ art: 'entfernen', spalten: p.entfernen });
  const r = anonymisieren(daten, schritte);
  if (!r.ok) return { ok: false, satz: anonymFehlerSatz(r) };
  return { ok: true, protokoll: r.protokoll, saetze: r.saetze, vorher, nachher: schutzKennzahlen(p, r.daten)!, daten: r.daten };
}

/** Das Protokoll als Text zum Kopieren (und für den Bericht von Hand): Schlüsselmerkmale, Schritte mit Merkmal und Zahl der Fälle, Kennzahlen vorher und nachher, Grenze des Verfahrens. */
export function schutzProtokoll(p: SchutzPlan, e: SchutzErgebnis): string {
  const zeilen = [
    L('Protokoll: Mikrodaten schützen', 'Log: protecting microdata'),
    L(`Schlüsselmerkmale (wichtigstes zuerst): ${p.schluessel.join(', ')}. k = ${p.k}.`, `Key variables (most important first): ${p.schluessel.join(', ')}. k = ${p.k}.`),
    L(`Vorher: ${kennzahlenSatz(e.vorher)}`, `Before: ${kennzahlenSatz(e.vorher)}`),
    ...e.saetze.map(x => '- ' + x),
    ...(e.saetze.length ? [] : ['- ' + L('Es wurde nichts verändert.', 'Nothing was changed.')]),
    L(`Nachher: ${kennzahlenSatz(e.nachher)}`, `After: ${kennzahlenSatz(e.nachher)}`),
    schutzGrenzeSatz()
  ];
  return zeilen.join('\n');
}

/** Die neue Fassung der Daten (Spalten und Zeilen), ohne sie zu speichern: das Projekt bleibt unverändert. Unterdrückte Angaben werden leer; „keine Angabe“-Werte bleiben, wie sie waren. */
export function schutzFassung(p: SchutzPlan, e: SchutzErgebnis): { spalten: Spalte[]; zeilen: Wert[][] } {
  const spalten = $state.snapshot(s.spalten) as Spalte[];
  const behalten = spalten.map((sp, i) => ({ sp, i })).filter(x => !p.entfernen.includes(x.sp.name));
  const alt: Record<string, AWert[]> = {};
  for (const { sp } of behalten) if (e.daten[sp.name]) alt[sp.name] = schutzWerte(sp.name);
  const zeilen = s.zeilen.map((r, z) => behalten.map(({ sp, i }) => {
    const neu = e.daten[sp.name];
    if (!neu) return r[i] as Wert;
    return (neu[z] === null && alt[sp.name]![z] === null ? r[i] : neu[z]) as Wert;   // war schon fehlend: die Angabe bleibt
  }));
  return { spalten: behalten.map(x => x.sp), zeilen };
}

/** Zahl der Schritte für die Meldung: lokales Unterdrücken ist ein Schritt, auch wenn das Protokoll eine Zeile je Schlüsselmerkmal hat (Testrunde 24.10.: „4 Schritte“ bei einem Schritt). */
export function schrittZahl(protokoll: ProtokollZeile[]): number {
  return protokoll.filter(z => z.art !== 'lokal').length + (protokoll.some(z => z.art === 'lokal') ? 1 : 0);
}

/** Wendet das Ergebnis auf das Projekt an: ein Schritt zum Rückgängigmachen. Gibt eine Meldung zurück, wenn es nicht ging. */
export async function schutzAnwenden(p: SchutzPlan, e: SchutzErgebnis): Promise<string | null> {
  const f = schutzFassung(p, e);
  if (!f.spalten.length) return L('Es bliebe keine Spalte übrig.', 'No column would be left.');
  const n = schrittZahl(e.protokoll);
  const schritte = Lp(n, `${n} Schritt`, `${n} Schritte`, `${n} step`, `${n} steps`);
  const text = L(`Mikrodaten geschützt (k = ${p.k}, ${schritte}; ${e.vorher.unterK} auf ${e.nachher.unterK} Fälle unter k)`, `Microdata protected (k = ${p.k}, ${schritte}; ${e.vorher.unterK} to ${e.nachher.unterK} cases below k)`);
  const ok = await aendereDaten(text, f.spalten, f.zeilen, false, { art: 'mikro' });
  return ok ? null : L('Das ließ sich nicht speichern. Es ist alles wie vorher.', "That couldn't be saved. Everything is as it was before.");
}
