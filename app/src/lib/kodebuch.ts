/**
 * Kodebuch (Später S-C, D4; Fachblatt 2.3, 2.5 Nr. 1, Entscheidung Opus 3): Namen, Beschriftungen, Wertelabels, Fehlendcodes und Mehrfachauswahl-Gruppen einer Fragebogen-Umfrage.
 * Das Kodebuch entsteht aus der SPSS-Syntax (`spsssyntax.ts`, Whitelist-Leser) oder aus der Erkennung (`fragebogen.ts`). Es ÄNDERT NICHTS von selbst:
 * `wendeKodebuchAn` setzt nur, was die Person angekreuzt hat (`wahl`), und gibt dazu die PSPP-Befehle fürs Befehlsprotokoll und die Gegenbefehle zurück.
 * Werte der Daten werden nie verändert - nur ihre Bedeutung.
 */
import { fehlendSyntax, fehlendAnzeige } from './fehlend';
import type { SpssSyntaxErgebnis, SpssFehlend } from './spsssyntax';
import { zit } from './befehlstext';
import type { Daten } from './umformen';
import type { Spalte } from './verzeichnis';
import type { MehrfachSet } from './mehrfach';

/** `odk` und `moodlefeedback` gibt es vorerst nur als Typ (kein Erkenner: Fachblatt Stufe 1, Nachtrag nach 1A); `msforms`, `nextcloud`, `cryptpad`, `googleforms` baut Paket 1B. */
export type Hersteller = 'sosci' | 'limesurvey' | 'unipark' | 'qualtrics' | 'msforms' | 'nextcloud' | 'cryptpad' | 'googleforms' | 'kobo' | 'odk' | 'moodlefeedback' | 'moodlequestionnaire' | 'unbekannt';
export interface KodebuchSpalte {
  name?: string; label?: string; werteLabels?: Record<string, string>; fehlend?: SpssFehlend[]; niveau?: 'nominal' | 'ordinal' | 'skala';
  rolle?: 'frage' | 'metadaten' | 'zeit' | 'text';
  gruppe?: { id: string; art: 'mehrfach' | 'itemblock'; zaehlwert?: number | string };
  /** Mehrfachauswahl in EINER Zelle (Kobo/ODK-Sammelspalte, Paket 1B): Trenner und die Optionen aus dem XLSForm-Plan */
  mehrfachZelle?: { trenner: string; optionen: string[] };
}
export interface Kodebuch { hersteller: Hersteller; spalten: Record<string, KodebuchSpalte>; fall: { testFilter?: string; vollstaendigFilter?: string } }
export interface KodebuchWahl { fehlend?: boolean; wertelabels?: boolean; labels?: boolean; mehrfachsets?: boolean }
export interface KodebuchMeldung { art: 'zuVieleCodes' | 'unbekannteSpalte'; spalte: string }

const istNicht = (l: string) => /^\s*(nicht|not|kein|keine|keiner|nein|no)\b/i.test(l);

/** Eine Wertebeschriftung, die „angekreuzt“ bedeutet, wenn nur zwei Werte beschriftet sind (der andere bedeutet „nicht“): der Zählwert aus dem Kodebuch. */
function zaehlwertAusLabels(w: Record<string, string>): number | string | undefined {
  const e = Object.entries(w);
  if (e.length !== 2) return undefined;
  const ja = e.filter(([, l]) => !istNicht(l));
  if (ja.length !== 1) return undefined;
  const v = ja[0]![0];
  return v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : v;
}
const gleicheLabels = (a: Record<string, string>, b: Record<string, string>) => JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());

/** Namen mit demselben Stamm (`A002_01`, `A002_02` → `A002`; Endung `_` und Ziffern): nach der Zahl der Endung geordnet. */
function stamm(name: string): { stamm: string; nr: number } | null {
  const m = /^(.*?)_(\d+)$/.exec(name);
  return m && m[1] ? { stamm: m[1], nr: Number(m[2]) } : null;
}

/** Das Kodebuch aus einer gelesenen SPSS-Syntax. Mehrfachauswahl-Gruppen: mindestens zwei Spalten mit demselben Stamm und denselben zwei Wertelabels - der Zählwert kommt aus den Beschriftungen, nicht aus einer Vermutung. */
export function kodebuchAusSyntax(syn: SpssSyntaxErgebnis, hersteller: Hersteller = 'unbekannt'): Kodebuch {
  const spalten: Record<string, KodebuchSpalte> = {};
  const hol = (n: string) => (spalten[n] ??= {});
  for (const [n, l] of Object.entries(syn.variablenlabels)) hol(n).label = l;
  for (const [n, w] of Object.entries(syn.wertelabels)) hol(n).werteLabels = w;
  for (const [n, f] of Object.entries(syn.fehlend)) hol(n).fehlend = f;
  for (const [n, v] of Object.entries(syn.niveau)) hol(n).niveau = v;
  // Mehrfachauswahl: gleicher Stamm, dieselben zwei Wertelabels
  const je = new Map<string, { name: string; nr: number }[]>();
  for (const [n, s] of Object.entries(spalten)) {
    const st = stamm(n);
    if (!st || !s.werteLabels || Object.keys(s.werteLabels).length !== 2) continue;
    const liste = je.get(st.stamm) ?? [];
    liste.push({ name: n, nr: st.nr }); je.set(st.stamm, liste);
  }
  for (const [id, liste] of je) {
    if (liste.length < 2) continue;
    const erste = spalten[liste[0]!.name]!.werteLabels!;
    const gleich = liste.filter(x => gleicheLabels(spalten[x.name]!.werteLabels!, erste));
    const zaehlwert = zaehlwertAusLabels(erste);
    if (gleich.length < 2 || zaehlwert === undefined) continue;
    for (const x of gleich) spalten[x.name]!.gruppe = { id, art: 'mehrfach', zaehlwert };
  }
  return { hersteller, spalten, fall: {} };
}

/** Die Gruppen mit ihren Spalten (nach Endungszahl geordnet) - für Mehrfachsets. */
export function kodebuchGruppen(kb: Kodebuch): { id: string; spalten: string[]; zaehlwert?: number | string }[] {
  const je = new Map<string, { name: string; nr: number; zaehlwert?: number | string }[]>();
  for (const [n, s] of Object.entries(kb.spalten)) {
    if (s.gruppe?.art !== 'mehrfach') continue;
    const liste = je.get(s.gruppe.id) ?? [];
    liste.push({ name: n, nr: stamm(n)?.nr ?? 0, zaehlwert: s.gruppe.zaehlwert }); je.set(s.gruppe.id, liste);
  }
  return [...je].map(([id, l]) => ({ id, spalten: l.sort((a, b) => a.nr - b.nr).map(x => x.name), zaehlwert: l[0]!.zaehlwert }));
}

/** Beschriftung eines Sets: der gemeinsame Anfang der Spaltenbeschriftungen ohne die Optionsendung („Welche Medien nutzen Sie? (Mehrfachauswahl): Fernsehen“ → „Welche Medien nutzen Sie? (Mehrfachauswahl)“). */
export function setBeschriftung(labels: string[], name: string): string {
  const l = labels.filter(Boolean);
  if (l.length < 2) return name;
  let p = l[0]!;
  for (const x of l) while (!x.startsWith(p)) p = p.slice(0, -1);
  const schnitt = Math.max(p.lastIndexOf(': '), p.lastIndexOf(' - '), p.lastIndexOf(' ['), p.lastIndexOf(' ('));
  let k = p;
  if (schnitt > 0 && p.length < (l[0] ?? '').length) k = p.slice(0, schnitt);
  else if (p.length < (l[0] ?? '').length) k = p;
  k = k.replace(/[\s:\-–([]+$/, '');
  return k.length >= 3 ? k : name;
}

/** Index der Spalte (PSPP unterscheidet bei Namen nicht zwischen Groß und Klein). */
const finde = (d: Daten, name: string) => d.spalten.findIndex(s => s.name.toUpperCase() === name.toUpperCase());

/** Wie PSPP den Bereich schreibt: `-9 THRU -1`, `LO THRU 0`, `99 THRU HI`. */
const grenze = (v: number) => (v === -Infinity ? 'LO' : v === Infinity ? 'HI' : String(v));

/**
 * Der Fehlend-Teil für eine Spalte: höchstens drei einzelne Codes, oder ein Bereich (auch aus mehr als drei Codes - dann aber NUR, wenn zwischen den Grenzen
 * in dieser Spalte kein anderer Wert vorkommt; PSPP würde ihn sonst still zu „fehlend“ machen). Sonst null = nicht markieren.
 */
export function fehlendBereichText(codes: SpssFehlend[], werte: (string | number | null)[]): { text: string; teile: SpssFehlend[] } | null {
  const einzel = codes.filter((c): c is number => typeof c === 'number');
  const bereiche = codes.filter((c): c is { von: number; bis: number } => typeof c !== 'number');
  if (!codes.length) return { text: '', teile: [] };
  if ((bereiche.length === 0 && einzel.length <= 3) || (bereiche.length === 1 && einzel.length <= 1)) {
    return { text: [...bereiche.map(b => `${grenze(b.von)} THRU ${grenze(b.bis)}`), ...einzel.map(String)].join(', '), teile: [...bereiche, ...einzel] };
  }
  const grenzen = [...einzel, ...bereiche.flatMap(b => [b.von, b.bis])];
  const lo = Math.min(...grenzen), hi = Math.max(...grenzen);
  const gedeckt = (v: number) => einzel.includes(v) || bereiche.some(b => v >= b.von && v <= b.bis);
  const zahlen = werte.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  const fremd = zahlen.some(v => v >= lo && v <= hi && !gedeckt(v));
  if (!fremd) return { text: `${grenze(lo)} THRU ${grenze(hi)}`, teile: [{ von: lo, bis: hi }] };
  // PSPP erlaubt auch einen Bereich PLUS einen Einzelwert: -9, -1, -77 und 99 werden zu „-77 THRU -1, 99“ - wenn der Bereich nichts Gültiges einfängt.
  // (Nur der größte Code darf einzeln stehen; liegt er mitten im Bereich, ist die Spalte eher ein Fall für „zu viele Codes“.)
  if (bereiche.length === 0 && einzel.length >= 3) {
    const sortiert = [...einzel].sort((a, b) => a - b), einzeln = sortiert[sortiert.length - 1]!, unten = sortiert[0]!, oben = sortiert[sortiert.length - 2]!;
    if (!zahlen.some(v => v >= unten && v <= oben && !sortiert.includes(v))) return { text: `${grenze(unten)} THRU ${grenze(oben)}, ${einzeln}`, teile: [{ von: unten, bis: oben }, einzeln] };
  }
  return null;
}

/** Die Gegenbefehle für Fehlend: die alte Markierung der Spalte (Text mit THRU bleibt erhalten) oder leere Klammern. */
export function fehlendAlt(sp: Spalte): string {
  if (!sp.fehlendBereich && /THRU/i.test(sp.fehlendText)) return sp.fehlendText.replace(/\s*;\s*/g, ', ');
  return fehlendSyntax(sp);
}

export function wendeKodebuchAn(d: Daten, kb: Kodebuch, wahl: KodebuchWahl = {}): { daten: Daten; befehle: string[]; rueckgaengig: string[]; sets: MehrfachSet[]; meldungen: KodebuchMeldung[] } {
  const aus = { daten: d, befehle: [] as string[], rueckgaengig: [] as string[], sets: [] as MehrfachSet[], meldungen: [] as KodebuchMeldung[] };
  if (!wahl.fehlend && !wahl.wertelabels && !wahl.labels && !wahl.mehrfachsets) return aus;
  const spalten = d.spalten.map(s => ({ ...s, werteLabels: { ...s.werteLabels }, fehlend: [...s.fehlend] }));
  const gemeldet = new Set<string>();
  const unbekannt = (n: string) => { if (!gemeldet.has(n)) { gemeldet.add(n); aus.meldungen.push({ art: 'unbekannteSpalte', spalte: n }); } };

  if (wahl.labels) {
    for (const [n, s] of Object.entries(kb.spalten)) {
      if (!s.label) continue;
      const i = finde(d, n); if (i < 0) { unbekannt(n); continue; }
      const sp = spalten[i]!;
      if (sp.bezeichnung === s.label) continue;
      aus.befehle.push(`VARIABLE LABELS ${sp.name} ${zit(s.label.slice(0, 250))}.`);
      aus.rueckgaengig.push(sp.bezeichnung ? `VARIABLE LABELS ${sp.name} ${zit(sp.bezeichnung)}.` : `VARIABLE LABELS ${sp.name} ''.`);
      sp.bezeichnung = s.label.slice(0, 250);
    }
  }
  if (wahl.wertelabels) {
    for (const [n, s] of Object.entries(kb.spalten)) {
      if (!s.werteLabels || !Object.keys(s.werteLabels).length) continue;
      const i = finde(d, n); if (i < 0) { unbekannt(n); continue; }
      const sp = spalten[i]!, zahl = sp.art === 'zahl';
      const paare = Object.entries(s.werteLabels).filter(([w]) => !zahl || (w.trim() !== '' && Number.isFinite(Number(w))));
      if (!paare.length) continue;
      const wert = (w: string) => (zahl ? String(Number(w)) : zit(w));
      aus.befehle.push(`VALUE LABELS ${sp.name} ${paare.map(([w, l]) => `${wert(w)} ${zit(l.slice(0, 120))}`).join(' ')}.`);
      const alt = Object.entries(sp.werteLabels);
      aus.rueckgaengig.push(alt.length ? `VALUE LABELS ${sp.name} ${alt.map(([w, l]) => `${wert(w)} ${zit(l.slice(0, 120))}`).join(' ')}.` : `VALUE LABELS ${sp.name}.`);
      sp.werteLabels = Object.fromEntries(paare.map(([w, l]) => [zahl ? String(Number(w)) : w, l.slice(0, 120)]));
    }
  }
  if (wahl.fehlend) {
    for (const [n, s] of Object.entries(kb.spalten)) {
      if (!s.fehlend || !s.fehlend.length) continue;
      const i = finde(d, n); if (i < 0) { unbekannt(n); continue; }
      const sp = spalten[i]!;
      if (sp.art !== 'zahl') continue;
      const werte = d.zeilen.map(z => z[i] ?? null);
      const t = fehlendBereichText(s.fehlend, werte);
      if (!t) { aus.meldungen.push({ art: 'zuVieleCodes', spalte: sp.name }); continue; }
      aus.befehle.push(`MISSING VALUES ${sp.name} (${t.text}).`);
      aus.rueckgaengig.push(`MISSING VALUES ${sp.name} (${fehlendAlt(d.spalten[i]!)}).`);
      sp.fehlend = t.teile.filter((c): c is number => typeof c === 'number');
      sp.fehlendBereich = t.teile.find((c): c is { von: number; bis: number } => typeof c !== 'number');
      sp.fehlendText = fehlendAnzeige(sp);
    }
  }
  if (wahl.mehrfachsets) {
    for (const g of kodebuchGruppen(kb)) {
      const da = g.spalten.filter(n => finde(d, n) >= 0).map(n => spalten[finde(d, n)]!);
      if (da.length < 2 || g.zaehlwert === undefined) continue;
      const label = setBeschriftung(da.map(sp => sp.bezeichnung || kb.spalten[sp.name]?.label || kb.spalten[g.spalten.find(n => n.toUpperCase() === sp.name.toUpperCase()) ?? '']?.label || ''), g.id);
      aus.sets.push({ name: g.id, label, spalten: da.map(sp => sp.name), zaehlwert: g.zaehlwert });
    }
  }
  aus.daten = { ...d, spalten };
  return aus;
}
