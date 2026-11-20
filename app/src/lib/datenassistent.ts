/**
 * Daten-Assistenten (Welle 5): Umkodieren, Berechnen, Fälle auswählen, Zusammenführen, Aggregieren, doppelte Fälle.
 * Reine Funktionen auf `Daten` (Spalten + Zeilen): sie bauen den PSPP-Befehl, den die Oberfläche über `aendere()` ausführt
 * (ein Rückgängig-Schritt), und prüfen vorher in JS, was PSPP still falsch macht. Fachblatt: docs/fachblaetter/WELLE5-DATEN-ASSISTENTEN.md;
 * API und Sollwerte (R, eigener Code): datenassistent.test.ts und datenassistent-pspp.test.ts.
 *
 * Die PSPP-Fallen, die hier abgefangen werden (Beleg je Falle in datenassistent-pspp.test.ts):
 *  - RECODE: Bereiche und ELSE fangen benutzerdefiniert fehlende Werte („9 = keine Angabe“) ein → die Fehlend-Regel steht vor den Wertregeln.
 *  - 0/0 ist in PSPP 0, nicht leer; ein Vergleich mit Text und leerer Zelle ergibt „falsch“ statt „unbekannt“.
 *  - MATCH FILES: Kennungen nur in der zweiten Datei fallen still weg, doppelte Kennungen werden still falsch gepaart, leere Kennungen
 *    verbinden sich miteinander, unsortierte Dateien geben keine Meldung, gleiche Spaltennamen lassen die zweite Spalte still weg.
 *  - AGGREGATE: MODE=ADDVARIABLES bildet auf unsortierten Daten Gruppen nur aus aufeinanderfolgenden Fällen; MEDIAN ohne gültigen Wert ist NaN.
 *  - Doppelte Fälle: PSPP vergleicht byte- und bitgenau - darum rechnet Statable sie selbst (NFC, 15 Stellen, Schalter für Lücken).
 * Vorhandenes wird wiederverwendet, nicht verdoppelt: `umpolBefehl`, `skalenwertBefehl`, `freierName`, `gueltigerName` aus skalabau.ts.
 */
import { istFehlend as istCode } from './fehlend';
import type { Spalte } from './verzeichnis';
import { zitWert } from './befehlstext';
import { textCodes, type Wert } from './eingabe';
import type { Daten } from './umformen';
import { freierName, gueltigerName, skalenwertBefehl } from './skalabau';
import { groesste } from './menge';
import { L } from './sitzung.svelte';

export type { Daten };

/** Ein Fehler, den die Oberfläche in Worten sagt. `code` siehe Test; `details` trägt Listen/Zahlen für den Satz. */
export class AssistentFehler extends Error {
  code: string;
  details: unknown;
  constructor(code: string, details?: unknown) { super(code); this.code = code; this.details = details; }
}

/* ---------- Kleine Helfer ---------- */
/** Text in PSPP-Anführungszeichen; ein Apostroph wird verdoppelt. */
const zit = zitWert;   // lib/befehlstext.ts
const literal = (w: number | string) => (typeof w === 'number' ? String(w) : zit(w));
/** Index der Spalte; PSPP unterscheidet bei Namen nicht zwischen Groß und Klein. −1, wenn es sie nicht gibt. */
const finde = (d: Daten, name: string) => d.spalten.findIndex(s => s.name.toUpperCase() === name.toUpperCase());
const spalteOder = (d: Daten, name: string) => { const i = finde(d, name); if (i < 0) throw new AssistentFehler('spalte', name); return i; };
/** PSPP füllt Text mit Leerzeichen auf: Leerzeichen HINTEN zählen beim Vergleich nicht, VORN schon. */
const ohneHinten = (t: string) => t.replace(/ +$/, '');

/** Stellen nach dem Komma einer Zahl (höchstens 6), für das Format einer neuen Spalte. */
function nachkommastellen(n: number) {
  const t = String(n), k = t.indexOf('.');
  return k < 0 || /e/i.test(t) ? 0 : Math.min(6, t.length - k - 1);
}

/** Zielname prüfen: gültiger PSPP-Name, und eine vorhandene Spalte nie still überschreiben. */
function zielPruefen(d: Daten, ziel: string, ueberschreiben?: boolean) {
  if (!gueltigerName(ziel)) throw new AssistentFehler('name', ziel);
  if (finde(d, ziel) >= 0 && !ueberschreiben) throw new AssistentFehler('ueberschreiben', ziel);
}

/* ================== Gemeinsam: Bedingungen, Fehlend, Schreibweisen ================== */
export type Vergleich = '=' | '<>' | '<' | '<=' | '>' | '>=';
export interface Teilbedingung { spalte: string; op: Vergleich; wert: number | string }

/**
 * Bedingung als PSPP-Ausdruck: `alter >= 18 AND gruppe = 1`.
 * Mit `d`: Vergleiche auf TEXT-Spalten werden so geschrieben, dass eine leere Zelle „nicht prüfbar“ (leer) ergibt. PSPP liefert dort sonst
 * „falsch“, und `geschl <> 'w'` schlösse leere Zellen ein. Die Form `((vergleich + 1) / (spalte <> '') - 1)`: geteilt durch 0 ist leer,
 * sonst bleibt 0/1 erhalten; das „+ 1“ ist nötig, weil 0/0 in PSPP 0 ergibt. Zahlenspalten bleiben unverändert (dort ist der Vergleich mit Lücken schon leer).
 */
export function bedingung(teile: Teilbedingung[], verknuepfung: 'AND' | 'OR' = 'AND', d?: Daten): string {
  return teile.map(t => {
    const roh = `${t.spalte} ${t.op} ${literal(t.wert)}`;
    const i = d ? finde(d, t.spalte) : -1;
    if (!d || i < 0 || d.spalten[i]!.art !== 'text') return roh;
    const codes = textCodes(d.spalten[i]!.fehlendText).map(c => ` AND ${t.spalte} <> ${zit(c)}`).join('');
    return `((((${roh}) + 1) / (${t.spalte} <> ''${codes})) - 1)`;
  }).join(` ${verknuepfung} `);
}

/** Fehlt der Wert? Leer, nur Leerraum, NaN oder ein Code, den die Spalte als „keine Angabe“ führt. */
export function istFehlend(sp: Spalte, v: Wert): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === 'number') return Number.isNaN(v) || istCode(sp, v);
  if (v.trim() === '') return true;
  return textCodes(sp.fehlendText).some(c => c.trimEnd() === v.trimEnd());
}

/** Immer NFC (é als ein oder zwei Zeichen ist dasselbe). Ohne `genau` zusätzlich Leerraum am Rand weg (auch geschützte Leerzeichen) und klein geschrieben. */
export function normalisiereText(t: string, genau: boolean): string {
  const n = t.normalize('NFC');
  return genau ? n : n.trim().toLowerCase();
}

/** Schreibweisen, die sich nur in Groß/klein oder Randleerraum unterscheiden („Ja“, „ja“, „ ja“): jeweils mit den Rohwerten und ihrer Häufigkeit. */
export function textVarianten(werte: Wert[]): { schluessel: string; varianten: { wert: string; anzahl: number }[] }[] {
  const je = new Map<string, Map<string, number>>();
  for (const w of werte) {
    if (typeof w !== 'string' || w.trim() === '') continue;
    const k = normalisiereText(w, false), roh = je.get(k) ?? new Map<string, number>();
    roh.set(w, (roh.get(w) ?? 0) + 1);
    je.set(k, roh);
  }
  return [...je].filter(([, roh]) => roh.size > 1)
    .map(([schluessel, roh]) => ({ schluessel, varianten: [...roh].map(([wert, anzahl]) => ({ wert, anzahl })) }));
}

/* ================== D1a Umkodieren ================== */
/** Alte Werte: ein Wert, ein Bereich (null = LOWEST/HIGHEST) oder die Fehlend-Arten von PSPP. */
export type Alt = { wert: number | string } | { bereich: [number | null, number | null] } | { fehlend: 'MISSING' | 'SYSMIS' };
export interface UmkodierRegel { von: Alt; nach: number | string }
export interface UmkodierOpt {
  spalte: string; ziel: string; regeln: UmkodierRegel[];
  /** Werte, die keine Regel trifft: übernehmen, leer lassen oder auf einen Wert setzen */
  uebrige: 'uebernehmen' | 'leer' | { wert: number | string };
  /** „keine Angabe“ der Quelle: leer machen oder behalten (dann mit denselben Codes in der neuen Spalte) */
  fehlend: 'leer' | 'behalten';
  labels: Record<string, string>;
  ueberschreiben?: boolean;
}

/**
 * Die neue Spalte als Werte, genau wie PSPP sie bildet (für die Vorschau und als Gegenprobe zum Befehl).
 * Reihenfolge wie im RECODE: ausdrückliche MISSING/SYSMIS-Regeln, dann die Fehlend-Voreinstellung, dann die Wertregeln, zuletzt „übrige“.
 */
export function umkodierWerte(d: Daten, o: UmkodierOpt): Wert[] {
  const i = spalteOder(d, o.spalte), sp = d.spalten[i]!;
  return d.zeilen.map(z => {
    const v = z[i] ?? null;
    const systemFehlend = v === null || (typeof v === 'string' && v.trim() === '');
    const benutzerFehlend = !systemFehlend && istFehlend(sp, v);
    for (const r of o.regeln) {
      if ('fehlend' in r.von && (r.von.fehlend === 'MISSING' ? systemFehlend || benutzerFehlend : systemFehlend)) return r.nach;
    }
    if (systemFehlend) return null;
    if (benutzerFehlend) return o.fehlend === 'behalten' ? v : null;
    for (const r of o.regeln) {
      const alt = r.von;
      if ('wert' in alt) {
        const gleich = typeof alt.wert === 'string' && typeof v === 'string' ? ohneHinten(alt.wert) === ohneHinten(v) : alt.wert === v;
        if (gleich) return r.nach;
      } else if ('bereich' in alt) {
        if (typeof v === 'number' && v >= (alt.bereich[0] ?? -Infinity) && v <= (alt.bereich[1] ?? Infinity)) return r.nach;
      }
    }
    if (o.uebrige === 'uebernehmen') return v;
    if (o.uebrige === 'leer') return null;
    return o.uebrige.wert;
  });
}

/** Vorschau alt × neu mit Häufigkeit: Zahlen aufsteigend, Text in der Reihenfolge des Auftretens, leer zuletzt. `alt` ist der rohe Wert (9 bleibt 9). */
export function umkodierVorschau(d: Daten, o: UmkodierOpt): { alt: Wert; neu: Wert; anzahl: number }[] {
  const i = spalteOder(d, o.spalte), neu = umkodierWerte(d, o);
  const paare = new Map<string, { alt: Wert; neu: Wert; anzahl: number }>();
  d.zeilen.forEach((z, r) => {
    const alt = z[i] ?? null, schluessel = JSON.stringify([alt, neu[r]]), e = paare.get(schluessel);
    if (e) e.anzahl++; else paare.set(schluessel, { alt, neu: neu[r] ?? null, anzahl: 1 });
  });
  const liste = [...paare.values()];
  const nurZahlen = liste.every(e => e.alt === null || typeof e.alt === 'number');
  return liste.map((e, n) => ({ e, n })).sort((a, b) => {
    const leerA = a.e.alt === null ? 1 : 0, leerB = b.e.alt === null ? 1 : 0;
    if (leerA !== leerB) return leerA - leerB;
    return nurZahlen && a.e.alt !== null ? (a.e.alt as number) - (b.e.alt as number) : a.n - b.n;
  }).map(x => x.e);
}

/**
 * RECODE für die Oberfläche. Neue Zahlenspalte: Format F8.<Stellen der tatsächlichen neuen Werte>; neue Textspalte: STRING-Zeile vor RECODE.
 * Wertelabels der neuen Spalte im selben Schritt. Ziel = Quelle überschreibt (kein INTO, Format bleibt) - nur mit `ueberschreiben`.
 */
export function umkodierBefehl(d: Daten, o: UmkodierOpt) {
  const quelle = spalteOder(d, o.spalte), sp = d.spalten[quelle]!;
  if (!o.regeln.length) throw new AssistentFehler('regeln');
  if (!gueltigerName(o.ziel)) throw new AssistentFehler('name', o.ziel);
  const inPlace = o.ziel.toUpperCase() === o.spalte.toUpperCase();
  if (finde(d, o.ziel) >= 0 && !o.ueberschreiben) throw new AssistentFehler('ueberschreiben', o.ziel);

  const neueWerte = [...o.regeln.map(r => r.nach), ...(typeof o.uebrige === 'object' ? [o.uebrige.wert] : [])];
  const zielText = typeof neueWerte[0] === 'string';
  if (neueWerte.some(n => (typeof n === 'string') !== zielText)) throw new AssistentFehler('gemischt');

  const quellBreite = sp.art === 'text' ? Number(/^A(\d+)$/.exec(sp.format)?.[1] ?? 1) : 1;
  const breite = Math.max(1, quellBreite, ...neueWerte.filter((n): n is string => typeof n === 'string').map(n => n.length));
  const alt = (a: Alt) => 'wert' in a ? literal(a.wert)
    : 'bereich' in a ? `${a.bereich[0] === null ? 'LOWEST' : a.bereich[0]} THRU ${a.bereich[1] === null ? 'HIGHEST' : a.bereich[1]}`
    : a.fehlend;
  const regel = (r: UmkodierRegel) => `(${alt(r.von)}=${literal(r.nach)})`;
  const uebrige = o.uebrige === 'uebernehmen' ? '(ELSE=COPY)'
    : o.uebrige === 'leer' ? (inPlace ? (zielText ? "(ELSE='')" : '(ELSE=SYSMIS)') : '')   // in der Spalte selbst bliebe sonst der alte Wert stehen
    : `(ELSE=${literal(o.uebrige.wert)})`;
  const teile = [
    ...o.regeln.filter(r => 'fehlend' in r.von).map(regel),                                          // 1. ausdrückliche MISSING/SYSMIS
    o.fehlend === 'behalten' ? '(MISSING=COPY)' : zielText ? "(MISSING='')" : '(MISSING=SYSMIS)',    // 2. sonst fängt ein Bereich die „9“ ein
    ...o.regeln.filter(r => !('fehlend' in r.von)).map(regel),                                       // 3. Wertregeln
    uebrige                                                                                          // 4. übrige Werte
  ].filter(Boolean);

  const zeilen: string[] = [];
  if (zielText && !inPlace) zeilen.push(`STRING ${o.ziel} (A${breite}).`);
  zeilen.push(`RECODE ${o.spalte} ${teile.join(' ')}${inPlace ? '' : ` INTO ${o.ziel}`}.`);
  let format = sp.format;
  if (!inPlace) {
    const stellen = groesste([0, ...umkodierWerte(d, o).filter((w): w is number => typeof w === 'number').map(nachkommastellen)]);
    format = zielText ? `A${breite}` : `F8.${stellen}`;
    zeilen.push(`FORMATS ${o.ziel} (${format}).`);
  }
  const labels = Object.entries(o.labels);
  if (labels.length) zeilen.push(`VALUE LABELS ${o.ziel} ${labels.map(([k, l]) => `${zielText ? zit(k) : Number(k)} ${zit(l)}`).join(' ')}.`);
  if (o.fehlend === 'behalten' && sp.fehlend.length) zeilen.push(`MISSING VALUES ${o.ziel} (${sp.fehlend.join(', ')}).`);
  if (!inPlace) zeilen.push(`VARIABLE LEVEL ${o.ziel} (${zielText ? 'NOMINAL' : 'ORDINAL'}).`);
  zeilen.push('EXECUTE.');

  const gruppen = sp.art === 'text' ? textVarianten(d.zeilen.map(z => z[quelle] ?? null)) : [];
  return { syntax: zeilen.join('\n'), ziel: o.ziel, format, hinweise: gruppen.length ? [{ art: 'textVarianten' as const, gruppen }] : [] };
}

/** Woher die Spanne beim Umpolen kommt - der Satz in der Oberfläche sagt es: fest (von der Person eingestellt), aus den Wertelabels oder aus den Daten. */
export function umpolQuelle(sp: Spalte, _werte: Wert[], fest?: { min: number; max: number }): 'fest' | 'labels' | 'daten' {
  if (fest) return 'fest';
  const gueltig = Object.keys(sp.werteLabels).map(Number).filter(w => Number.isFinite(w) && !istCode(sp, w));
  return gueltig.length >= 2 ? 'labels' : 'daten';
}

/* ================== D1b Berechnen ================== */
export type Zeilenfunktion = 'MEAN' | 'SUM' | 'MIN' | 'MAX' | 'SD';

/** Wie viele gültige Werte eine Zeile mindestens braucht: „haelfte“ = ⌈k/2⌉, eine Zahl wird auf 1…k begrenzt. */
export function mindestzahl(k: number, wahl: number | 'haelfte'): number {
  const n = wahl === 'haelfte' ? Math.ceil(k / 2) : Math.round(wahl);
  return Math.max(1, Math.min(k, n));
}

/**
 * Skalenwert aus verfügbaren Items für NEU angelegte Skalenwerte (Später S-C, Entscheidung Opus 5): Voreinstellung „mindestens die Hälfte der Fragen“ (Faustregel), statt wie bisher mindestens 1.
 * `skalenwertBefehl` (skalabau.ts) behält seine Voreinstellung 1 - gespeicherte Projekte und Befehle bleiben unverändert. Wer weniger als die Hälfte beantwortet hat, bekommt keinen Wert (leer, nicht 0).
 */
export function neuerSkalenwertBefehl(fragen: string[], name: string, bezeichnung: string, mindestens: number | 'haelfte' = 'haelfte'): string {
  return skalenwertBefehl(fragen, name, bezeichnung, mindestzahl(fragen.length, mindestens));
}

/**
 * Kennwert über mehrere Spalten je Fall. Mittelwert = dieselbe Funktion wie der Skalenbau (`skalenwertBefehl`, Vorgabe der Oberfläche: mindestens 1 gültiger Wert).
 * PSPP: MEAN/SUM/MIN/MAX rechnen mit den vorhandenen Werten, `.n` verlangt n gültige; SD braucht ohnehin zwei (dann ist `.2` schon dabei).
 */
export function zeilenStatistikBefehl(d: Daten, o: { fn: Zeilenfunktion; spalten: string[]; mindestens: number | 'haelfte'; ziel: string; bezeichnung: string; ueberschreiben?: boolean }) {
  zielPruefen(d, o.ziel, o.ueberschreiben);
  for (const n of o.spalten) if (d.spalten[spalteOder(d, n)]!.art !== 'zahl') throw new AssistentFehler('spalte', n);
  const mindestens = mindestzahl(o.spalten.length, o.mindestens);
  if (o.fn === 'MEAN') return { syntax: skalenwertBefehl(o.spalten, o.ziel, o.bezeichnung, mindestens), ziel: o.ziel, mindestens };
  const syntax = [
    `COMPUTE ${o.ziel} = ${o.fn}${mindestens > 1 ? `.${mindestens}` : ''}(${o.spalten.join(', ')}).`,
    `VARIABLE LABELS ${o.ziel} ${zit(o.bezeichnung.slice(0, 250))}.`,
    `FORMATS ${o.ziel} (F8.2).`,
    `VARIABLE LEVEL ${o.ziel} (SCALE).`,
    'EXECUTE.'
  ].join('\n');
  return { syntax, ziel: o.ziel, mindestens };
}

/**
 * Die Teiler einer Formel (alles, was hinter einem `/` steht): `a / b` → `b`, `x / (y - z)` → `(y - z)`, `a / LN(b) ** 2` → `LN(b) ** 2`.
 * Texte in Anführungszeichen werden übersprungen. Wozu: PSPP rechnet 0/0 still zu 0 (nur x/0 mit x ≠ 0 ist leer) - Statable setzt jeden Teiler 0 auf leer.
 */
export function teilerVon(ausdruck: string): string[] {
  const s = ausdruck, aus: string[] = [];
  const ueberspringe = (i: number) => { while (s[i] === ' ') i++; return i; };
  /** Ende der Klammer, die bei `i` aufgeht (Index hinter der schließenden Klammer; Ende des Textes, wenn sie fehlt). */
  const klammerEnde = (i: number) => { let tiefe = 0; for (; i < s.length; i++) { if (s[i] === '(') tiefe++; else if (s[i] === ')' && --tiefe === 0) return i + 1; } return s.length; };
  /** Ein Operand ab `i`: Vorzeichen, dann Klammer, Zahl, Spalte oder Funktionsaufruf. */
  const operand = (i: number): number => {
    i = ueberspringe(i);
    if (s[i] === '+' || s[i] === '-') i = ueberspringe(i + 1);
    if (s[i] === '(') return klammerEnde(i);
    const m = /^[\p{L}\p{N}_.@#$]+/u.exec(s.slice(i));
    if (!m) return i;
    i += m[0].length;
    return s[ueberspringe(i)] === '(' ? klammerEnde(ueberspringe(i)) : i;
  };
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "'") { i = s.indexOf("'", i + 1); if (i < 0) break; continue; }
    if (s[i] !== '/') continue;
    let ende = operand(i + 1);
    while (s.startsWith('**', ueberspringe(ende))) ende = operand(ueberspringe(ende) + 2);   // a / b ** 2: der Teiler ist b ** 2
    const teiler = s.slice(i + 1, ende).trim();
    if (teiler && !aus.includes(teiler)) aus.push(teiler);
  }
  return aus;
}

/**
 * Neue Spalte aus einer Formel. Mit Bedingung `IF (…)`: die übrigen Fälle bleiben leer. Messniveau metrisch, Nachkommastellen wählbar (Vorgabe 2).
 * Ist ein Teiler 0, ist das Ergebnis leer - auch bei 0/0 (PSPP ergäbe dort 0): je Teiler der Formel eine Zeile `IF (<teiler> = 0) <neu> = $SYSMIS.`
 */
export function berechneBefehl(d: Daten, o: { ziel: string; ausdruck: string; bedingung?: string; dezimalen?: number; bezeichnung?: string; ueberschreiben?: boolean }) {
  zielPruefen(d, o.ziel, o.ueberschreiben);
  if (!o.ausdruck.trim()) throw new AssistentFehler('ausdruck');
  const nurWenn = o.bedingung ? `(${o.bedingung}) AND ` : '';   // bei einer überschriebenen Spalte bleiben Fälle ohne Bedingung unberührt
  const syntax = [
    o.bedingung ? `IF (${o.bedingung}) ${o.ziel} = ${o.ausdruck}.` : `COMPUTE ${o.ziel} = ${o.ausdruck}.`,
    ...teilerVon(o.ausdruck).map(t => `IF (${nurWenn}${t} = 0) ${o.ziel} = $SYSMIS.`),
    ...(o.bezeichnung ? [`VARIABLE LABELS ${o.ziel} ${zit(o.bezeichnung)}.`] : []),
    `FORMATS ${o.ziel} (F10.${o.dezimalen ?? 2}).`,
    `VARIABLE LEVEL ${o.ziel} (SCALE).`,
    'EXECUTE.'
  ].join('\n');
  return { syntax, ziel: o.ziel };
}

/**
 * Leere Ergebnisse nach dem Rechnen, getrennt: `luecken` = mindestens eine Eingabe fehlt (erwartbar), `rechenfehler` = alle Eingaben gültig
 * (Teilen durch 0 - auch 0/0 -, LN(≤ 0), SQRT(< 0)). Mit `bedingungsSpalte` (1 = erfüllt, 0 = nicht, leer = nicht prüfbar; von „Nur wenn …“) werden die Fälle,
 * die die Bedingung nicht erfüllen, nicht als Lücke oder Rechenfehler gezählt, sondern getrennt: `bedingungNicht` und `bedingungOffen`.
 */
export function leereErgebnisse(nachher: Daten, ziel: string, eingaben: string[], bedingungsSpalte?: string) {
  const z = spalteOder(nachher, ziel), e = eingaben.map(n => spalteOder(nachher, n)), b = bedingungsSpalte ? spalteOder(nachher, bedingungsSpalte) : -1;
  let leer = 0, luecken = 0, rechenfehler = 0, bedingungNicht = 0, bedingungOffen = 0;
  for (const r of nachher.zeilen) {
    if (!istFehlend(nachher.spalten[z]!, r[z] ?? null)) continue;
    leer++;
    const bed = b >= 0 ? r[b] ?? null : 1;
    if (bed === 0) bedingungNicht++;
    else if (bed !== 1) bedingungOffen++;
    else if (e.some(j => istFehlend(nachher.spalten[j]!, r[j] ?? null))) luecken++;
    else rechenfehler++;
  }
  return b >= 0 ? { leer, luecken, rechenfehler, bedingungNicht, bedingungOffen } : { leer, luecken, rechenfehler };
}

/* ================== D1c Fälle auswählen (kein Filter: FILTER BY wirkt nur auf PSPP-Prozeduren) ================== */
/** Auswahlspalte: 1 = Bedingung erfüllt, 0 = nicht, leer = wegen Lücken nicht prüfbar (Kleene-Logik wie PSPP und R). Nutzbar als Gruppe oder Bedingung. */
export function auswahlBefehl(d: Daten, o: { ziel: string; bedingung: string; bezeichnung?: string; ueberschreiben?: boolean }) {
  zielPruefen(d, o.ziel, o.ueberschreiben);
  const syntax = [
    `COMPUTE ${o.ziel} = (${o.bedingung}).`,
    ...(o.bezeichnung ? [`VARIABLE LABELS ${o.ziel} ${zit(o.bezeichnung)}.`] : []),
    `VALUE LABELS ${o.ziel} 1 ${zit(L('erfüllt', 'met'))} 0 ${zit(L('nicht erfüllt', 'not met'))}.`,
    `FORMATS ${o.ziel} (F1.0).`,
    `VARIABLE LEVEL ${o.ziel} (NOMINAL).`,
    'EXECUTE.'
  ].join('\n');
  return { syntax, ziel: o.ziel };
}

/** Zählt 1 / 0 / leer einer Auswahlspalte. `entfernt` = nicht + leer = Fälle, die „Nur diese Fälle behalten“ entfernt. */
export function zaehleAuswahl(d: Daten, spalte: string) {
  const i = spalteOder(d, spalte);
  let erfuellt = 0, nicht = 0, leer = 0;
  for (const z of d.zeilen) {
    const v = z[i] ?? null;
    if (v === 1) erfuellt++; else if (v === 0) nicht++; else leer++;
  }
  return { erfuellt, nicht, leer, entfernt: nicht + leer };
}

/** „Nur diese Fälle behalten“: SELECT IF entfernt auch Fälle, deren Bedingung nicht prüfbar ist. Auch für Markierspalten (`behaltenBefehl('doppelt', 0)`). */
export const behaltenBefehl = (spalte: string, wert = 1) => `SELECT IF (${spalte} = ${wert}).\nEXECUTE.`;

/* ================== D1d Zusammenführen ================== */
/** Fälle anhängen: welche Spalten stehen in beiden Dateien (ohne Beachtung von Groß/klein), welche nur in einer, wo stehen Zahl und Text gegeneinander. */
export function anhaengenPruefen(a: Daten, b: Daten) {
  const nurA = a.spalten.filter(s => finde(b, s.name) < 0).map(s => s.name);
  const nurB = b.spalten.filter(s => finde(a, s.name) < 0).map(s => s.name);
  const gemeinsam = a.spalten.filter(s => finde(b, s.name) >= 0).map(s => s.name);
  const typkonflikte = gemeinsam.flatMap(name => {
    const x = a.spalten[finde(a, name)]!, y = b.spalten[finde(b, name)]!;
    return (x.art === 'text') !== (y.art === 'text') ? [{ name, a: x.art, b: y.art }] : [];
  });
  return { nurA, nurB, gemeinsam, typkonflikte, moeglich: typkonflikte.length === 0 };
}

/** ADD FILES mit der zweiten Datei (liegt als .sav in der Engine). Zahl gegen Text lehnt PSPP ab - hier schon eine Sperre mit der Prüfung als `details`. */
export function anhaengenBefehl(a: Daten, b: Daten, dateiB: string): string {
  const p = anhaengenPruefen(a, b);
  if (!p.moeglich) throw new AssistentFehler('sperre', p);
  return `ADD FILES /FILE=* /FILE=${zit(dateiB)}.\nEXECUTE.`;
}

/** Kennung zum Vergleichen der Schreibweise: Zahl als Text; Text NFC, ohne Randleerraum, klein, bei nur Ziffern ohne führende Nullen („007“ = „7“). */
export function normalisiereKennung(w: Wert): string {
  if (typeof w === 'number') return String(w);
  const k = normalisiereText(w ?? '', false);
  return /^[0-9]+$/.test(k) ? k.replace(/^0+(?=.)/, '') : k;
}

export type Beziehung = '1:1' | 'viele:1';
export interface ZuordnenOpt {
  /** 1:1 = jede Kennung steht in beiden Dateien höchstens einmal; viele:1 = Personen in A, je Klasse eine Zeile in B */
  beziehung: Beziehung; kennungA: string; kennungB: string;
  /** Spalten von B, die in A schon heißen: B-Name → neuer Name */
  umbenennen?: Record<string, string>;
}
export type Sperre =
  | { art: 'typ'; a: Spalte['art']; b: Spalte['art'] }
  | { art: 'doppelt'; seite: 'a' | 'b'; kennungen: Wert[] }
  | { art: 'namen'; konflikte: { name: string; vorschlag: string }[] };

/** Spalten von B (ausser der Kennung) mit demselben Namen wie in A. Vorschlag `<name>_2`, ist das vergeben `_3` … */
export function namenskonflikte(a: Daten, b: Daten, kennungB: string): { name: string; vorschlag: string }[] {
  const belegt = new Set([...a.spalten, ...b.spalten].map(s => s.name.toUpperCase()));
  const konflikte: { name: string; vorschlag: string }[] = [];
  for (const s of b.spalten) {
    if (s.name.toUpperCase() === kennungB.toUpperCase() || finde(a, s.name) < 0) continue;
    let k = 2;
    while (belegt.has(`${s.name}_${k}`.toUpperCase())) k++;
    const vorschlag = `${s.name}_${k}`;
    belegt.add(vorschlag.toUpperCase());
    konflikte.push({ name: s.name, vorschlag });
  }
  return konflikte;
}

/** „Gleiche Kennung“ wie in PSPP: Zahl numerisch, Text byte-genau (Leerzeichen hinten nicht). Ohne Kennung (leer, Fehlend-Code) → null: findet nie einen Partner. */
const kennungSchluessel = (sp: Spalte, v: Wert): string | null =>
  istFehlend(sp, v) ? null : typeof v === 'number' ? `n${v}` : `t${ohneHinten(String(v))}`;

/** Zählt eine Seite: Fälle, ohne Kennung, Kennungen ohne Partner auf der anderen Seite, doppelte Kennungen. */
function kennungSeite(d: Daten, kennung: string, andere: Set<string>) {
  const i = spalteOder(d, kennung), sp = d.spalten[i]!;
  const je = new Map<string, { roh: Wert; anzahl: number }>();
  let ohneKennung = 0;
  for (const z of d.zeilen) {
    const k = kennungSchluessel(sp, z[i] ?? null);
    if (k === null) { ohneKennung++; continue; }
    const e = je.get(k);
    if (e) e.anzahl++; else je.set(k, { roh: z[i]!, anzahl: 1 });
  }
  const ohnePartner = [...je].filter(([k]) => !andere.has(k));
  return {
    je,
    zahlen: {
      faelle: d.zeilen.length, ohneKennung,
      ohnePartner: ohnePartner.map(([, e]) => e.roh),
      faelleOhnePartner: ohnePartner.reduce((summe, [, e]) => summe + e.anzahl, 0),
      doppelt: [...je.values()].filter(e => e.anzahl > 1).map(e => e.roh)
    }
  };
}

/**
 * Prüfung vor dem Zusammenführen über eine Kennung: Zahlen je Seite, Fälle der zweiten Datei, die im Ergebnis fehlen (`entfallenB`), Sperren, Hinweise.
 * PSPP prüft nichts davon (Belege in datenassistent-pspp.test.ts). Sperren in dieser Reihenfolge: Typ, doppelt in A (nur 1:1), doppelt in B, gleiche Namen.
 */
export function zuordnenPruefen(a: Daten, b: Daten, o: ZuordnenOpt) {
  const ia = spalteOder(a, o.kennungA), ib = spalteOder(b, o.kennungB);
  const schluessel = (d: Daten, i: number) => {
    const menge = new Set<string>();
    for (const z of d.zeilen) { const k = kennungSchluessel(d.spalten[i]!, z[i] ?? null); if (k) menge.add(k); }
    return menge;
  };
  const kA = schluessel(a, ia), kB = schluessel(b, ib);
  const A = kennungSeite(a, o.kennungA, kB), B = kennungSeite(b, o.kennungB, kA);

  const sperren: Sperre[] = [];
  const artA = a.spalten[ia]!.art, artB = b.spalten[ib]!.art;
  if ((artA === 'text') !== (artB === 'text')) sperren.push({ art: 'typ', a: artA, b: artB });
  if (o.beziehung === '1:1' && A.zahlen.doppelt.length) sperren.push({ art: 'doppelt', seite: 'a', kennungen: A.zahlen.doppelt });
  if (B.zahlen.doppelt.length) sperren.push({ art: 'doppelt', seite: 'b', kennungen: B.zahlen.doppelt });
  const offen = namenskonflikte(a, b, o.kennungB).filter(k => !o.umbenennen || !(k.name in o.umbenennen));
  if (offen.length) sperren.push({ art: 'namen', konflikte: offen });

  // Schreibweise: Kennungen von A ohne Partner, die nach dem Angleichen (Groß/klein, Rand, führende Nullen) einen hätten
  const hinweise: { art: 'schreibweise'; zusaetzlich: number }[] = [];
  if (artA === 'text' && artB === 'text') {
    const inB = new Set([...B.je.values()].map(e => normalisiereKennung(e.roh)));
    const zusaetzlich = [...A.je].filter(([k, e]) => !kB.has(k) && inB.has(normalisiereKennung(e.roh))).length;
    if (zusaetzlich) hinweise.push({ art: 'schreibweise', zusaetzlich });
  }
  // Bei viele:1 (TABLE) fallen Fälle von B ohne Partner aus dem Ergebnis; bei 1:1 bleiben sie. Ohne Kennung fallen sie immer weg.
  const entfallenB = B.zahlen.ohneKennung + (o.beziehung === 'viele:1' ? B.zahlen.faelleOhnePartner : 0);
  return { a: A.zahlen, b: B.zahlen, entfallenB, sperren, hinweise };
}

/**
 * MATCH FILES über eine Kennung. Ablauf der Oberfläche: B einlesen → `vorbereitungB` (Fälle ohne Kennung weg, nach Kennung sortiert) → als .sav nach `dateiB` →
 * A wieder aktiv → `syntax`. Ergebnis: Zeilen von A in der alten Reihenfolge, bei 1:1 danach die Fälle nur aus B. viele:1 = /TABLE, 1:1 = /FILE + /FILE.
 * Eine Hilfsspalte hält die alte Reihenfolge fest und ist am Ende weg.
 */
export function zuordnenBefehl(a: Daten, b: Daten, o: ZuordnenOpt, dateiB: string): { syntax: string; vorbereitungB: string } {
  const sperren = zuordnenPruefen(a, b, o).sperren;
  if (sperren.length) throw new AssistentFehler('sperre', sperren);
  const umbenennen = [
    ...(o.kennungA.toUpperCase() !== o.kennungB.toUpperCase() ? [[o.kennungB, o.kennungA]] : []),   // die Kennung heißt im Ergebnis wie in A
    ...Object.entries(o.umbenennen ?? {})
  ];
  const rename = umbenennen.length ? ` /RENAME=(${umbenennen.map(r => r[0]).join(' ')}=${umbenennen.map(r => r[1]).join(' ')})` : '';
  const reihe = freierName('zz_reihe', [...a.spalten, ...b.spalten].map(s => s.name));
  const syntax = [
    `COMPUTE ${reihe} = $CASENUM.`,
    `SORT CASES BY ${o.kennungA}.`,
    `MATCH FILES /FILE=* /${o.beziehung === 'viele:1' ? 'TABLE' : 'FILE'}=${zit(dateiB)}${rename} /BY ${o.kennungA}.`,
    `IF (SYSMIS(${reihe})) ${reihe} = 1E9 + $CASENUM.`,     // Fälle nur aus B (1:1) ans Ende, in Kennungsfolge
    `SORT CASES BY ${reihe}.`,
    `DELETE VARIABLES ${reihe}.`,
    'EXECUTE.'
  ].join('\n');
  // MISSING() gibt es in PSPP nur für Zahlen; bei Text werden leer und die Fehlend-Codes der Spalte einzeln ausgeschlossen
  const kennungSp = b.spalten[spalteOder(b, o.kennungB)]!;
  const mitKennung = kennungSp.art === 'text'
    ? [`${o.kennungB} <> ''`, ...textCodes(kennungSp.fehlendText).map(c => `${o.kennungB} <> ${zit(c)}`)].join(' AND ')
    : `NOT MISSING(${o.kennungB})`;
  return { syntax, vorbereitungB: `SELECT IF (${mitKennung}).\nSORT CASES BY ${o.kennungB}.` };
}

/* ================== D1e Aggregieren ================== */
/** `N` ohne Spalte = Fälle der Gruppe, mit Spalte = gültige Werte von x. Mit einem Fallgewicht zählt N GEWICHTET (Summe der Gewichte, wie PSPP AGGREGATE es rechnet), `NU` zählt ungewichtet die ZEILEN (auch die mit Gewicht 0);
 *  ohne Fallgewicht sind beide gleich. MEAN, SUM, SD und MEDIAN sind ebenfalls gewichtet (Probe in gewichte-pspp.test.ts). Das Ergebnis-Projekt „eine Zeile je Gruppe“ behält das Fallgewicht nicht. */
export interface Kennwert { fn: 'N' | 'NU' | 'NMISS' | 'MEAN' | 'SD' | 'MEDIAN' | 'MIN' | 'MAX' | 'SUM'; spalte?: string; name: string }

/** Name der neuen Spalte: `<spalte>_<kennwert>` bzw. nur `<kennwert>`, über `freierName` eindeutig. */
export const kennwertName = (spalte: string | undefined, fn: Kennwert['fn'], vorhandene: string[]) =>
  freierName(spalte ? `${spalte}_${fn.toLowerCase()}` : fn.toLowerCase(), vorhandene);

/** Zahl der Gruppen, wie PSPP sie bildet (fehlend = eine eigene Gruppe, ein benutzerdefinierter Code wie 9 eine weitere), und Fälle ohne Gruppenangabe. */
export function gruppenUebersicht(d: Daten, gruppen: string[]) {
  const idx = gruppen.map(g => spalteOder(d, g));
  const verschieden = new Set<string>();
  let ohneAngabe = 0;
  for (const z of d.zeilen) {
    if (idx.some(i => istFehlend(d.spalten[i]!, z[i] ?? null))) ohneAngabe++;
    verschieden.add(JSON.stringify(idx.map(i => { const v = z[i] ?? null; return v === '' ? null : v; })));
  }
  return { gruppen: verschieden.size, ohneAngabe };
}

/**
 * Fälle ohne Gruppenangabe, nach Art getrennt: `leer` (nichts eingetragen) und `keineAngabe` (ein Code, den die Spalte als „keine Angabe“ führt, `codes` = welche).
 * PSPP bildet für beide je eine eigene Gruppe. Bei mehreren Gruppenspalten zählt ein Fall als `leer`, sobald eine Spalte leer ist.
 */
export function gruppenFehlende(d: Daten, gruppen: string[]) {
  const idx = gruppen.map(g => spalteOder(d, g));
  let leer = 0, keineAngabe = 0;
  const codes = new Set<Wert>();
  for (const z of d.zeilen) {
    let hatLeer = false, hatCode = false;
    for (const i of idx) {
      const v = z[i] ?? null, sp = d.spalten[i]!;
      if (v === null || (typeof v === 'string' && v.trim() === '') || (typeof v === 'number' && Number.isNaN(v))) hatLeer = true;
      else if (istFehlend(sp, v)) { hatCode = true; codes.add(v); }
    }
    if (hatLeer) leer++; else if (hatCode) keineAngabe++;
  }
  return { leer, keineAngabe, codes: [...codes] };
}

/**
 * AGGREGATE. `spalten`: neue Spalten am Ende (MODE=ADDVARIABLES), Zeilenfolge unverändert - PSPP bildet die Gruppen nur auf nach BREAK sortierten Daten richtig,
 * darum wird sortiert und danach die alte Reihenfolge (Hilfsspalte) wiederhergestellt. `neu`: Ergebnis als .sav nach `datei`, der Datensatz bleibt unverändert.
 * MEDIAN einer Gruppe ohne gültigen Wert liefert PSPP als NaN; hier wird er leer (Hilfskennwert „gültige Werte“).
 */
export function aggregierenBefehl(d: Daten, o: { gruppen: string[]; kennwerte: Kennwert[]; modus: 'spalten' | 'neu'; datei?: string }) {
  o.gruppen.forEach(g => spalteOder(d, g));
  const vergeben = d.spalten.map(s => s.name.toUpperCase()), neueNamen = new Set<string>();
  for (const k of o.kennwerte) {
    if (k.spalte) {
      const i = spalteOder(d, k.spalte);
      if (!['N', 'NU', 'NMISS'].includes(k.fn) && d.spalten[i]!.art !== 'zahl') throw new AssistentFehler('kennwertText', k.spalte);
    } else if (k.fn !== 'N' && k.fn !== 'NU') throw new AssistentFehler('spalte', k.fn);
    const doppelt = neueNamen.has(k.name.toUpperCase()), belegt = o.modus === 'spalten' && vergeben.includes(k.name.toUpperCase());
    if (!gueltigerName(k.name) || doppelt || belegt) throw new AssistentFehler('name', k.name);
    neueNamen.add(k.name.toUpperCase());
  }
  if (o.modus === 'neu' && !o.datei) throw new AssistentFehler('datei');

  const alleNamen = [...d.spalten.map(s => s.name), ...o.kennwerte.map(k => k.name)];
  const medianNutzer = o.kennwerte.filter(k => k.fn === 'MEDIAN');
  const hilfsNamen = [...alleNamen];
  const gueltigeJeMedian = medianNutzer.map((k, n) => { const hilfe = freierName(`zz_nv${n}`, hilfsNamen); hilfsNamen.push(hilfe); return { k, hilfe }; });
  const kennwerte = [
    ...o.kennwerte.map(k => `/${k.name}=${k.fn}${k.spalte ? `(${k.spalte})` : ''}`),
    ...gueltigeJeMedian.map(x => `/${x.hilfe}=N(${x.k.spalte})`)
  ].join(' ');
  const medianLeer = gueltigeJeMedian.length ? [
    ...gueltigeJeMedian.map(x => `IF (${x.hilfe} = 0) ${x.k.name} = $SYSMIS.`),
    'EXECUTE.',
    `DELETE VARIABLES ${gueltigeJeMedian.map(x => x.hilfe).join(' ')}.`
  ] : [];
  const gruppen = o.gruppen.join(' ');

  const zeilen: string[] = [];
  if (o.modus === 'spalten') {
    const reihe = freierName('zz_reihe', alleNamen);
    zeilen.push(
      `COMPUTE ${reihe} = $CASENUM.`, `SORT CASES BY ${gruppen}.`,
      `AGGREGATE /OUTFILE=* MODE=ADDVARIABLES /BREAK=${gruppen} ${kennwerte}.`,
      ...medianLeer,
      `SORT CASES BY ${reihe}.`, `DELETE VARIABLES ${reihe}.`, 'EXECUTE.'
    );
  } else if (!gueltigeJeMedian.length) {
    zeilen.push(`AGGREGATE /OUTFILE=${zit(o.datei!)} /BREAK=${gruppen} ${kennwerte}.`);
  } else {
    // AGGREGATE /OUTFILE=* ersetzt die aktiven Daten: vorher sichern, das Ergebnis speichern, die Daten zurückholen
    zeilen.push(
      `SAVE OUTFILE='/zz_aktiv.sav'.`,
      `AGGREGATE /OUTFILE=* /BREAK=${gruppen} ${kennwerte}.`,
      ...medianLeer,
      `SAVE OUTFILE=${zit(o.datei!)}.`, `GET FILE='/zz_aktiv.sav'.`, 'EXECUTE.'
    );
  }
  return { syntax: zeilen.join('\n'), namen: o.kennwerte.map(k => k.name) };
}

/* ================== D2 Doppelte Fälle (in JS, nicht in PSPP) ================== */
export interface DoppeltOpt {
  /** Spalten, nach denen verglichen wird; leer = alle */
  spalten: string[];
  /** true = Text Zeichen für Zeichen (nur NFC); Vorgabe false: Randleerraum und Groß/klein zählen nicht */
  genau?: boolean;
  /** true (Vorgabe) = „fehlend = fehlend“ zählt als gleich; false = Fälle mit einer Lücke in den gewählten Spalten sind nicht prüfbar */
  fehlendGleich?: boolean;
}

/**
 * Doppelte Fälle. Gleich = Text NFC (+ ohne Randleerraum und klein, wenn nicht `genau`); Zahlen auf 15 gültige Stellen (0,1 + 0,2 = 0,3);
 * leer und Fehlend-Code sind „fehlend“. Der erste Fall einer Gruppe ist 0, jede Wiederholung 1; Gruppen nach der ersten Zeile geordnet, Zeilen ab 1.
 */
export function doppelteFaelle(d: Daten, o: DoppeltOpt) {
  const idx = (o.spalten.length ? o.spalten : d.spalten.map(s => s.name)).map(n => spalteOder(d, n));
  const genau = o.genau ?? false, fehlendGleich = o.fehlendGleich ?? true;
  const gruppen = new Map<string, number[]>();
  const markierung: (0 | 1)[] = [];
  let nichtPruefbar = 0;
  d.zeilen.forEach((z, r) => {
    const teile = idx.map(i => {
      const sp = d.spalten[i]!, v = z[i] ?? null;
      if (istFehlend(sp, v)) return null;
      return typeof v === 'number' ? String(Number(v.toPrecision(15))) : 't' + normalisiereText(String(v), genau);
    });
    if (!fehlendGleich && teile.some(t => t === null)) { nichtPruefbar++; markierung.push(0); return; }
    const schluessel = JSON.stringify(teile), bisher = gruppen.get(schluessel);
    if (bisher) { bisher.push(r + 1); markierung.push(1); } else { gruppen.set(schluessel, [r + 1]); markierung.push(0); }
  });
  return {
    markierung,
    gruppen: [...gruppen.values()].filter(zeilen => zeilen.length > 1).map(zeilen => ({ zeilen, anzahl: zeilen.length })),
    wiederholungen: markierung.reduce<number>((summe, m) => summe + m, 0),
    nichtPruefbar
  };
}

/** Markierspalte `doppelt` (0 = erster Fall, 1 = Wiederholung) als neue Spalte hinten; die Eingabe bleibt unverändert, ein vorhandener Name wird nie überschrieben. */
export function markiereDoppelte(d: Daten, o: DoppeltOpt, name = 'doppelt'): Daten {
  const r = doppelteFaelle(d, o);
  const sp: Spalte = {
    name: freierName(name, d.spalten.map(s => s.name)), bezeichnung: '', art: 'zahl', niveau: 'nominal', format: 'F1.0', fehlend: [], fehlendText: '',
    werteLabels: { '0': L('erster Fall', 'first case'), '1': L('Wiederholung', 'repeat') }
  };
  return { spalten: [...d.spalten, sp], zeilen: d.zeilen.map((z, i) => [...z, r.markierung[i]!]) };
}

/**
 * Die Markierung als PSPP-Befehl, damit sie sichtbar, kopierbar und mit `aendere()` ein Rückgängig-Schritt ist. Statable findet die Wiederholungen selbst
 * (`doppelteFaelle`) - der Befehl trägt nur ihre Zeilennummern ein (`$CASENUM`, Stand jetzt). Mit `loeschen` werden die Wiederholungen danach entfernt
 * und die Markierspalte wieder weggenommen; das geschieht nur auf ausdrückliche Wahl.
 */
export function doppeltBefehl(d: Daten, o: DoppeltOpt & { ziel: string; ueberschreiben?: boolean; loeschen?: boolean; vorab?: ReturnType<typeof doppelteFaelle> }) {
  zielPruefen(d, o.ziel, o.ueberschreiben);
  const r = o.vorab ?? doppelteFaelle(d, o);   // `vorab`: schon gerechnet (große Tabellen rechnen nur einmal)
  const nummern = r.markierung.flatMap((m, i) => (m === 1 ? [i + 1] : []));
  const zeilen = [
    '* Doppelte Fälle: Statable hat die Wiederholungen selbst gefunden (Schreibweise und Rundung angeglichen), hier stehen ihre Zeilennummern.',
    `COMPUTE ${o.ziel} = 0.`
  ];
  const JE_BEFEHL = 200, JE_ZEILE = 20;
  for (let von = 0; von < nummern.length; von += JE_BEFEHL) {
    const teil = nummern.slice(von, von + JE_BEFEHL), reihen: string[] = [];
    for (let k = 0; k < teil.length; k += JE_ZEILE) reihen.push(teil.slice(k, k + JE_ZEILE).join(', '));
    zeilen.push(`IF (ANY($CASENUM,\n  ${reihen.join(',\n  ')})) ${o.ziel} = 1.`);
  }
  zeilen.push(
    `VALUE LABELS ${o.ziel} 0 ${zit(L('erster Fall', 'first case'))} 1 ${zit(L('Wiederholung', 'repeat'))}.`,
    `FORMATS ${o.ziel} (F1.0).`, `VARIABLE LEVEL ${o.ziel} (NOMINAL).`, 'EXECUTE.'
  );
  if (o.loeschen) zeilen.push(behaltenBefehl(o.ziel, 0), `DELETE VARIABLES ${o.ziel}.`, 'EXECUTE.');
  return { syntax: zeilen.join('\n'), ziel: o.ziel, wiederholungen: r.wiederholungen };
}
