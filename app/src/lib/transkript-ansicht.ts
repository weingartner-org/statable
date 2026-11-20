/**
 * Reine Logik für die Ansicht eines geöffneten Transkripts (Stufe 4, Paket 4C-2): Abspielen (Rücksprung, Grenzen, Tempo, Zeitfeld),
 * Tasten, Ansage-Drossel, laufender Beitrag, Seitenaufteilung, Teilen an der Schreibmarke, Zeile eines Hinweises, Redeanteile als Datensatz.
 * Kein Zugriff auf Oberfläche oder Speicher; alles ist ohne Browser prüfbar.
 */
import type { Dokument, Fall } from './qualprojekt';
import { cpLaenge, cpTeil } from './qualprojekt';
import { aendereBeitrag, teileBeitrag, type BearbeitenOpt } from './transkript-bearbeiten';
import { beitragTeile, codepoints } from './transkript-text';
import { leseZeit, formatZeit, sprechZeit, type ZeitForm } from './zeitmarken';
import { redeanteile, type Zuordnung } from './redeanteile';
import type { Hinweis } from './transkript-pruefen';
import type { Spalte } from './verzeichnis';
import type { SprecherZuordnung, TranskriptRoh } from './transkript-lesen';

type Sprache = 'de' | 'en';

/* ------------------------------------------------------------------ Zeit */

/** „1:23“ oder „1:02:03“ (Sekunden abgerundet) für die Anzeige. */
export function anzeigeZeit(ms: number): string {
  const g = Math.max(0, Math.floor(Number.isFinite(ms) ? ms / 1000 : 0));
  const h = Math.floor(g / 3600), m = Math.floor(g / 60) % 60, s = g % 60;
  const zwei = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${zwei(m)}:${zwei(s)}` : `${Math.floor(g / 60)}:${zwei(s)}`;
}
/** „1:23 von 12:40“ */
export function positionsText(posMs: number, dauerMs: number, sprache: Sprache): string {
  return `${anzeigeZeit(posMs)} ${sprache === 'de' ? 'von' : 'of'} ${anzeigeZeit(dauerMs)}`;
}
/** Eingabe im Zeitfeld: `1:23`, `01:23`, `1:02:03`, `00:01:23` (auch `[00:01:23]` und `#00:01:23-0#`). Sonst `null`. */
export function leseSprungZeit(text: string): number | null {
  const t = String(text ?? '').trim();
  let m = /^(\d{1,3}):([0-5]\d)$/.exec(t);
  if (m) return (Number(m[1]) * 60 + Number(m[2])) * 1000;
  m = /^(\d{1,3}):([0-5]\d):([0-5]\d)$/.exec(t);
  if (m) return ((Number(m[1]) * 60 + Number(m[2])) * 60 + Number(m[3])) * 1000;
  return leseZeit(t);
}
/** Prüft eine Sprungzeit gegen die Dauer. `ok`, sonst Fehlerart (für die Ansage). */
export function pruefeSprung(text: string, dauerMs: number): { ms: number } | { fehler: 'format' | 'zu-spaet' } {
  const ms = leseSprungZeit(text);
  if (ms === null) return { fehler: 'format' };
  if (Number.isFinite(dauerMs) && dauerMs > 0 && ms > dauerMs) return { fehler: 'zu-spaet' };
  return { ms };
}
export function sprungFehlerSatz(art: 'format' | 'zu-spaet', dauerMs: number, sprache: Sprache): string {
  if (art === 'format') return sprache === 'de' ? 'Bitte als 1:23 oder 00:01:23 eingeben.' : 'Please enter it as 1:23 or 00:01:23.';
  return sprache === 'de' ? `Diese Zeit liegt hinter dem Ende der Aufnahme (${anzeigeZeit(dauerMs)}).` : `This time is past the end of the recording (${anzeigeZeit(dauerMs)}).`;
}

export const RUECKSPRUNG_MAX_S = 5;
/** Rücksprung in Sekunden: ganze Zahl von 0 bis 5, sonst die Voreinstellung 2. */
export function ruecksprungSekunden(wert: unknown): number {
  const n = typeof wert === 'string' && wert.trim() !== '' ? Number(wert) : wert;
  return typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= RUECKSPRUNG_MAX_S ? n : 2;
}
/** Startposition (ms) beim Weiterspielen: `ruecksprungS` Sekunden früher, nie vor 0. */
export const startNachAnhalten = (posMs: number, ruecksprungS: number): number => Math.max(0, posMs - ruecksprungSekunden(ruecksprungS) * 1000);
/** Position nach einem Sprung um `deltaS` Sekunden, begrenzt auf 0 bis Dauer (Dauer unbekannt oder 0: nur nach unten begrenzt). */
export function springe(posMs: number, deltaS: number, dauerMs: number): number {
  const neu = posMs + deltaS * 1000;
  const ende = Number.isFinite(dauerMs) && dauerMs > 0 ? dauerMs : Infinity;
  return Math.min(ende, Math.max(0, neu));
}

export const TEMPOS = [0.5, 0.75, 1, 1.25, 1.5] as const;
/** Ein Schritt langsamer (-1) oder schneller (+1); am Rand bleibt es stehen. */
export function tempoSchritt(tempo: number, richtung: -1 | 1): number {
  const i = TEMPOS.findIndex(t => t === tempo);
  const von = i < 0 ? TEMPOS.indexOf(1) : i;
  return TEMPOS[Math.min(TEMPOS.length - 1, Math.max(0, von + richtung))]!;
}

/* ------------------------------------------------------------------ Tasten */

export type AbspielAktion = 'umschalten' | 'zurueck' | 'vor' | 'langsamer' | 'schneller' | 'zeitmarke';
type TastenKern = { key?: string; code?: string; shiftKey: boolean; altKey: boolean; ctrlKey: boolean; metaKey: boolean };
/** F4 Abspielen/Anhalten, F8 zurück, F9 vor, Umschalt+F8 langsamer, Umschalt+F9 schneller, Umschalt+F4 Zeitmarke. Mit Strg, Alt oder Cmd: nichts. */
export function abspielTaste(e: TastenKern): AbspielAktion | undefined {
  if (e.altKey || e.ctrlKey || e.metaKey) return undefined;
  const t = e.code ?? e.key;
  const name = t === 'F4' || t === 'F8' || t === 'F9' ? t : e.key === 'F4' || e.key === 'F8' || e.key === 'F9' ? e.key : undefined;
  if (!name) return undefined;
  if (name === 'F4') return e.shiftKey ? 'zeitmarke' : 'umschalten';
  if (name === 'F8') return e.shiftKey ? 'langsamer' : 'zurueck';
  return e.shiftKey ? 'schneller' : 'vor';
}

/** Ansagen entprellen: höchstens eine je `ms` (Voreinstellung 700). */
export class Drossel {
  private zuletzt = -Infinity;
  constructor(private ms = 700) {}
  erlaubt(jetzt: number): boolean { if (jetzt - this.zuletzt < this.ms) return false; this.zuletzt = jetzt; return true; }
}

/** Ansagen entprellen, ohne eine zu verlieren: die erste geht sofort, jede weitere innerhalb von `ms` wartet (die jeweils letzte bleibt übrig) und geht nach Ablauf der Zeit. */
export class GedrosselteAnsage {
  private zuletzt = -Infinity;
  private wartend: string | null = null;
  private stop: (() => void) | null = null;
  constructor(
    private senden: (text: string) => void,
    private ms = 700,
    private uhr: { jetzt: () => number; nach: (f: () => void, ms: number) => () => void } = { jetzt: () => Date.now(), nach: (f, m) => { const h = setTimeout(f, m); return () => clearTimeout(h); } },
  ) {}
  sag(text: string): void {
    const jetzt = this.uhr.jetzt();
    if (this.stop === null && jetzt - this.zuletzt >= this.ms) { this.zuletzt = jetzt; this.senden(text); return; }
    this.wartend = text;
    if (this.stop === null) {
      this.stop = this.uhr.nach(() => {
        this.stop = null;
        const t = this.wartend; this.wartend = null;
        if (t !== null) { this.zuletzt = this.uhr.jetzt(); this.senden(t); }
      }, Math.max(0, this.ms - (jetzt - this.zuletzt)));
    }
  }
  /** Verwirft, was noch wartet (beim Schließen). */
  abbrechen(): void { this.stop?.(); this.stop = null; this.wartend = null; }
}

/** Sprechzeit als „0:55“ oder „1:02:03“ (Sekunden gerundet) für die Tabelle der Redeanteile. */
export const sprechzeitMinSek = (ms: number): string => anzeigeZeit(Math.round(ms / 1000) * 1000);

/** Welcher Beitrag läuft bei `posMs`? Der letzte, der schon begonnen hat; hinter seinem Ende ohne Nachfolger: keiner (-1). */
export function laufenderBeitrag(abschnitte: readonly { zeitMs?: number; bisMs?: number }[], posMs: number): number {
  let r = -1;
  for (let i = 0; i < abschnitte.length; i++) { const z = abschnitte[i]!.zeitMs; if (z !== undefined && z <= posMs) r = i; }
  if (r < 0) return -1;
  const a = abschnitte[r]!;
  if (a.bisMs !== undefined && posMs >= a.bisMs && !abschnitte.slice(r + 1).some(x => x.zeitMs !== undefined)) return -1;
  return r;
}

/** In welcher Form stehen Zeitmarken im Text? So wird eine neue Marke geschrieben (Voreinstellung f4). */
export function zeitmarkenForm(dok: Dokument): ZeitForm {
  if (/#\d{2,}:\d{2}:\d{2}-\d#/.test(dok.text)) return 'f4';
  if (/\[\d{2,}:\d{2}:\d{2}\]/.test(dok.text)) return 'klammer';
  if (/\(\d{2,}:\d{2}:\d{2}\)/.test(dok.text)) return 'klammer';
  return 'f4';
}

/* ------------------------------------------------------------------ Aufnahme */

export interface MediumAngabe { groesse: number; sha256: string }
export type MediumVergleich = 'neu' | 'gleich' | 'andere-groesse' | 'andere-pruefsumme';
const HEX = /^[0-9a-f]{64}$/;
/** Passt die gewählte Datei zu der Aufnahme, die beim Transkript vermerkt ist? */
export function vergleicheMedium(medium: MediumAngabe | undefined, datei: MediumAngabe): MediumVergleich {
  if (!medium) return 'neu';
  if (medium.groesse !== datei.groesse) return 'andere-groesse';
  if (HEX.test(medium.sha256) && HEX.test(datei.sha256) && medium.sha256 !== datei.sha256) return 'andere-pruefsumme';
  return 'gleich';
}
export function mediumSatz(v: MediumVergleich, sprache: Sprache): string {
  const de = sprache === 'de';
  switch (v) {
    case 'neu': return de ? 'Aufnahme gewählt. Sie bleibt auf Ihrem Gerät und wird nicht hochgeladen.' : 'Recording chosen. It stays on your device and is not uploaded.';
    case 'gleich': return de ? 'Das ist dieselbe Aufnahme wie beim letzten Mal.' : 'This is the same recording as last time.';
    case 'andere-groesse': return de ? 'Diese Datei hat eine andere Größe als die Aufnahme, die zu diesem Transkript gehört. Möglicherweise ist es eine andere Aufnahme; die Zeitmarken passen dann nicht.' : 'This file has a different size than the recording belonging to this transcript. It may be another recording; the time marks then do not fit.';
    case 'andere-pruefsumme': return de ? 'Diese Datei hat dieselbe Größe, aber einen anderen Inhalt als die Aufnahme, die zu diesem Transkript gehört. Möglicherweise ist es eine andere Fassung; die Zeitmarken passen dann nicht.' : 'This file has the same size but different content than the recording belonging to this transcript. It may be another version; the time marks then do not fit.';
  }
}

/* ------------------------------------------------------------------ Seiten */

export const SEITEN_AB = 200;
export const SEITEN_GROESSE = 100;
export const seitenZahl = (n: number): number => (n <= SEITEN_AB ? 1 : Math.ceil(n / SEITEN_GROESSE));
/** Beiträge einer Seite (Seite ab 0): von (einschließlich) bis (ausschließlich). Bis 200 Beiträge gibt es nur eine Seite mit allen. */
export function seitenBereich(n: number, seite: number): { von: number; bis: number } {
  if (n <= SEITEN_AB) return { von: 0, bis: n };
  const s = Math.min(Math.max(0, Math.floor(seite)), seitenZahl(n) - 1);
  return { von: s * SEITEN_GROESSE, bis: Math.min(n, (s + 1) * SEITEN_GROESSE) };
}
export const seiteVon = (n: number, index: number): number => (n <= SEITEN_AB ? 0 : Math.min(seitenZahl(n) - 1, Math.max(0, Math.floor(index / SEITEN_GROESSE))));
/** „Beiträge 101 bis 200 von 312“ */
export function seitenText(n: number, seite: number, sprache: Sprache): string {
  const b = seitenBereich(n, seite);
  return sprache === 'de' ? `Beiträge ${b.von + 1} bis ${b.bis} von ${n}` : `Contributions ${b.von + 1} to ${b.bis} of ${n}`;
}

/* ------------------------------------------------------------------ Beiträge */

/** Überschrift eines Beitrags: „Name, 00:01:23“; ohne Zeit „Beitrag 12: Name“; ohne Name „Beitrag 12“ (mit Zeit „Beitrag 12, 00:01:23“). */
export function beitragTitel(index: number, name: string | undefined, zeitMs: number | undefined, sprache: Sprache, kopf = 0): string {
  if (index < kopf) return kopfTitel(index, sprache);
  const nr = beitragBezeichnung(index, kopf, sprache, true);
  if (zeitMs === undefined) return name ? `${nr}: ${name}` : nr;
  return `${name ?? nr}, ${formatZeit(zeitMs, 'hms')}`;
}
/** Zahl der führenden Abschnitte ohne Sprecher und ohne Zeit (Kopf, z. B. Kodierschema). Nur wenn danach mindestens ein Abschnitt mit Sprecher oder Zeit kommt, sonst 0. */
export function kopfAbschnitte(abschnitte: readonly { sprecher?: string; zeitMs?: number }[]): number {
  let k = 0;
  while (k < abschnitte.length && !abschnitte[k]!.sprecher && abschnitte[k]!.zeitMs === undefined) k++;
  return k < abschnitte.length ? k : 0;
}
/** Überschrift eines Kopf-Abschnitts: „Kopf (Kodierschema)“, bei mehreren „Kopf, Teil 2“. */
export function kopfTitel(index: number, sprache: Sprache): string {
  if (sprache === 'de') return index === 0 ? 'Kopf (Kodierschema)' : `Kopf, Teil ${index + 1}`;
  return index === 0 ? 'Header (transcription key)' : `Header, part ${index + 1}`;
}
/** „Beitrag 3“ bzw. „contribution 3“ (mit `gross`: „Contribution 3“); Kopf-Abschnitte heißen „Kopf“ / „header“. Die Zählung beginnt nach dem Kopf bei 1. */
export function beitragBezeichnung(index: number, kopf: number, sprache: Sprache, gross = false): string {
  if (index < kopf) return sprache === 'de' ? (index === 0 ? 'Kopf' : `Kopf, Teil ${index + 1}`) : (gross ? 'Header' : 'header') + (index === 0 ? '' : `, part ${index + 1}`);
  const n = index - kopf + 1;
  return sprache === 'de' ? `Beitrag ${n}` : `${gross ? 'C' : 'c'}ontribution ${n}`;
}
/** Zugänglicher Name des Knopfes „Ab hier abspielen“. */
export const abspielName = (zeitMs: number, sprache: Sprache): string =>
  sprache === 'de' ? `Ab hier abspielen (${sprechZeit(zeitMs, 'de')})` : `Play from here (${sprechZeit(zeitMs, 'en')})`;

/** Wie `inhaltSauber` in transkript-bearbeiten: Leerzeilen im Inhalt werden zu einem Zeilenumbruch. */
const sauber = (s: string): string => s.replace(/\r\n?/g, '\n').replace(/\n(?:[ \t]*\n)+/g, '\n');

/**
 * „Beitrag hier teilen“: übernimmt erst den Text des Textfeldes (und die gewählte Person), teilt dann an der Schreibmarke.
 * `schreibmarke` zählt in UTF-16-Einheiten im Textfeld (wie `selectionStart`); die Umrechnung in Codepoints macht diese Funktion.
 */
export function teileAnSchreibmarke(dok: Dokument, i: number, text: string, sprecher: string | undefined, schreibmarke: number, opt?: BearbeitenOpt): Dokument {
  const neu = aendereBeitrag(dok, i, text, sprecher, opt);
  const vorher = sauber(text.slice(0, Math.max(0, Math.min(schreibmarke, text.length))));
  const cps = codepoints(neu.text);
  const stelle = beitragTeile(cps, neu, i).inhalt.start + cpLaenge(vorher);
  return teileBeitrag(neu, i, stelle, opt);
}

/* ------------------------------------------------------------------ Hinweise */

export interface HinweisAnzeige { nr: number; name?: string; original: string; vorschlag?: string }
/** Die Stelle eines Hinweises für die Liste: Nummer und Name des Beitrags, der Text an der Stelle und der Vorschlag. */
export function hinweisAnzeige(dok: Dokument, h: Hinweis): HinweisAnzeige {
  const t = dok.transkript;
  const a = t?.abschnitte[h.abschnitt];
  const name = a?.sprecher ? t?.sprecher.find(x => x.id === a.sprecher)?.name : undefined;
  const original = h.ende > h.start ? cpTeil(dok.text, h.start, h.ende) : '';
  return { nr: h.abschnitt + 1, ...(name ? { name } : {}), original: original.length > 80 ? original.slice(0, 79) + '…' : original, ...(h.vorschlag !== undefined ? { vorschlag: h.vorschlag } : {}) };
}

/* ------------------------------------------------------------------ Redeanteile als Datensatz */

export const ROLLEN_NAMEN: Record<string, { de: string; en: string }> = {
  interview: { de: 'Interviewende Person', en: 'Interviewer' }, befragt: { de: 'Befragte Person', en: 'Interviewee' }, andere: { de: 'Andere', en: 'Other' },
};
export const rollenName = (r: string | undefined, sprache: Sprache): string => (r ? (ROLLEN_NAMEN[r]?.[sprache] ?? r) : '');

/** Zuordnung Sprecher-Kennung → Person für `redeanteile` (gleicher Name = dieselbe Person). */
export function zuordnungVon(dok: Dokument): Zuordnung {
  const z: Zuordnung = {};
  for (const s of dok.transkript?.sprecher ?? []) z[s.id] = { name: s.name, ...(s.rolle ? { rolle: s.rolle } : {}) };
  return z;
}

const textSpalte = (name: string, bez: string): Spalte => ({ name, bezeichnung: bez, art: 'text', niveau: 'nominal', format: 'A1', fehlend: [], fehlendText: '', werteLabels: {} });
const zahlSpalte = (name: string, bez: string, format: string, niveau: Spalte['niveau'] = 'metrisch'): Spalte => ({ name, bezeichnung: bez, art: 'zahl', niveau, format, fehlend: [], fehlendText: '', werteLabels: {} });

/** Eine Zeile je Dokument und Person: Dokument, Person, Rolle, Fall, Beiträge, Wörter, Anteil Wörter (%), Sprechzeit (s), Anteil Zeit (%). Nur Text und Zahlen, nie Befehlstext. */
export function redeanteileDatensatz(doks: readonly Dokument[], faelle: readonly Pick<Fall, 'id' | 'name'>[], sprache: Sprache): { spalten: Spalte[]; zeilen: (string | number | null)[][] } {
  const de = sprache === 'de';
  const spalten = [
    textSpalte('dokument', de ? 'Dokument' : 'Document'), textSpalte('person', de ? 'Person' : 'Person'), textSpalte('rolle', de ? 'Rolle' : 'Role'), textSpalte('fall', de ? 'Fall' : 'Case'),
    zahlSpalte('beitraege', de ? 'Beiträge' : 'Contributions', 'F8.0'), zahlSpalte('woerter', de ? 'Wörter' : 'Words', 'F8.0'),
    zahlSpalte('anteil_woerter', de ? 'Anteil Wörter (%)' : 'Share of words (%)', 'F8.1'),
    zahlSpalte('sprechzeit_s', de ? 'Sprechzeit (s)' : 'Speaking time (s)', 'F10.1'), zahlSpalte('anteil_zeit', de ? 'Anteil Zeit (%)' : 'Share of time (%)', 'F8.1'),
  ];
  const zeilen: (string | number | null)[][] = [];
  for (const d of doks) {
    if (!d.transkript) continue;
    const zu = zuordnungVon(d);
    // Fall je Person: der Fall des ersten Sprechers dieses Namens, sonst der des Dokuments
    const fallVon = (name: string): string => {
      const sp = d.transkript!.sprecher.find(x => x.name === name && x.fall) ?? undefined;
      const id = sp?.fall ?? d.fall;
      return faelle.find(f => f.id === id)?.name ?? '';
    };
    for (const r of redeanteile(d, zu)) {
      zeilen.push([d.name, r.person, rollenName(r.rolle, sprache), fallVon(r.person), r.beitraege, r.woerter, r.anteilWoerter, r.sprechzeitMs === null ? null : Math.round(r.sprechzeitMs / 100) / 10, r.anteilZeit]);
    }
  }
  return { spalten, zeilen };
}

/* ------------------------------------------------------------------ Beispielinterview */

/** Feste Zuordnung für das erfundene Beispielinterview: Interviewerin/Interviewer = interview, alle anderen (Studentin/Student) = befragt; ein Dokument ein Fall. */
export function beispielZuordnung(roh: Pick<TranskriptRoh, 'beitraege'>): SprecherZuordnung {
  const kennungen: string[] = [];
  for (const b of roh.beitraege) if (b.sprecher !== undefined && !kennungen.includes(b.sprecher)) kennungen.push(b.sprecher);
  return { faelle: 'dokument', personen: kennungen.map(k => ({ kennung: k, name: k, rolle: /^interviewer(in)?$/i.test(k) ? 'interview' as const : 'befragt' as const })) };
}
export const BEISPIEL_NAME = { de: 'Beispiel: Semesterplanung (erfunden)', en: 'Example: semester planning (invented)' } as const;
export const beispielDateien = (sprache: Sprache): { vtt: string; audio: string } => ({ vtt: `beispiel/interview/semesterplanung-${sprache}-teams.vtt`, audio: `beispiel/interview/semesterplanung-${sprache}.m4a` });

/* ------------------------------------------------------------------ Fehlertexte */

const FEHLER_EN: Record<string, string> = {
  'Dieses Dokument hat schon Textstellen mit Codes. Der Text ist gesperrt und kann nicht mehr geändert werden.': 'This document already has passages with codes. The text is locked and can no longer be changed.',
  'Dieses Dokument hat kein Transkript.': 'This document has no transcript.',
  'Diesen Beitrag gibt es nicht.': 'This contribution does not exist.',
  'Diese Person gibt es in diesem Transkript nicht.': 'This person does not exist in this transcript.',
  'Die Stelle zum Teilen muss mitten im Beitrag liegen.': 'The place to split must be inside the contribution.',
  'Beide Teile brauchen Text. Bitte eine Stelle mitten im Text wählen.': 'Both parts need text. Please choose a place in the middle of the text.',
  'Nach diesem Beitrag kommt kein weiterer.': 'There is no contribution after this one.',
  'Nur Beiträge derselben Person lassen sich zusammenlegen.': 'Only contributions of the same person can be merged.',
  'Hier lässt sich kein Beitrag einfügen.': 'A contribution cannot be inserted here.',
  'Die Stelle liegt nicht in diesem Beitrag. Bitte den Text neu prüfen.': 'The place is not in this contribution. Please check the text again.',
  'Zu diesem Hinweis gibt es keinen Vorschlag.': 'There is no suggestion for this note.',
  'Dieses Transkript hat keine Zeitangaben. WebVTT braucht Zeiten; bitte als Text oder Word ausgeben.': 'This transcript has no times. WebVTT needs times; please export as text or Word.',
};
/** Fehlermeldung der Bearbeiten-Funktionen in der Oberflächensprache (die Funktionen werfen deutsche Sätze). */
export function fehlerText(e: unknown, sprache: Sprache): string {
  const m = e instanceof Error ? e.message : String(e);
  return sprache === 'de' ? m : (FEHLER_EN[m] ?? 'The change was not possible.');
}
