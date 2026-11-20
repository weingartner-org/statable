/**
 * Das Blatt „Offene Antworten ordnen“ (Welle 4, G7): Zustand im Blatt (`blatt.kat`, also in der `.statable`-Datei), Verbindung zu den Daten
 * und „In die Daten übernehmen“. Die reine Logik steht in `kategorisieren.ts`.
 *
 * Kategorien, Leitfaden und Zuordnung leben im Blatt. Die Ergebnisspalten entstehen NUR auf Knopfdruck (jeder Rückgängig-Schritt der Daten ist eine ganze Kopie):
 * ein PSPP-Befehl über `aendere()` = ein Rückgängig-Schritt. Eigene Spalten aus einer früheren Übernahme werden dabei überschrieben (erkannt am Namen im Blatt),
 * fremde Spalten gleichen Namens nie.
 */
import { s, L, Lp, aendere, rueckgaengig, setzeSets, sichern, type Blatt } from './sitzung.svelte';
import { lesbar } from './verzeichnis';
import {
  ergebnis, haeufigkeiten, uebernahmeBefehl, leererKatZustand,
  type Antwort, type KatErgebnis, type KatHaeufigkeit, type KatZustand
} from './kategorisieren';
import type { MehrfachSet } from './mehrfach';

/** Was eine Übernahme in die Daten geschrieben hat: die Namen der Spalten und der Name des Mehrfachantworten-Sets (oder null). */
export interface KatUebernahme {
  namen: string[]; set: string | null;
  /** Merkmale der geschriebenen Spalten (gleiche Reihenfolge wie `namen`): Variablenlabel und Wertelabels. Fehlt in älteren Projekten (dann zählt der Name allein). */
  merkmal?: { label: string; werte: string }[];
}
export interface KatBlatt {
  /** Die Textspalte mit den offenen Antworten. */
  spalte: string;
  /** Spalte, die jede Zeile eindeutig erkennt (Nr, ID …); leer = die Zeilennummer. */
  kennung: string;
  /** Kodierung 1: Kategorien (Kodierleitfaden), Modus und Zuordnung. */
  z: KatZustand;
  /** Kodierung 2 (Zweitkodierung): gleiche Kategorien, eigene Zuordnung; fehlt = nicht angelegt. */
  zuordnung2?: Record<string, string[]>;
  /** Was die Übernahme je Kodierung in die Daten geschrieben hat (Index 0 = Kodierung 1). */
  uebernommen: (KatUebernahme | null)[];
  /** Später S-D, G12: „Zahlen nach Themen“ - die Frage, die neben den Themen steht, und was die Person dazu gewählt hat. Fehlt = nichts gewählt (alte Projekte). */
  themen?: ThemenWahl;
}
/** Die Wahl bei „Zahlen nach Themen“: `frage` ist ein Spaltenname ('' = keine); `art` 'auto' wählt nach der Spalte; `zitate` je Kategorie die Schlüssel der Antworten, die die Person als Zitat gewählt hat (höchstens 3). */
export interface ThemenWahl { frage: string; art: 'auto' | 'zahl' | 'kategorie'; ohne: boolean; matrix: boolean; zitate: Record<string, string[]> }
/** Der Stand für Bericht und Export (liegt im `ergebnis` des Blatts, damit der Bericht ihn ohne die Daten lesen kann). */
export interface KatAnzeige {
  spalte: string; bezeichnung: string;
  h: KatHaeufigkeit; h2?: KatHaeufigkeit;
  leitfaden: { name: string; beschreibung: string; beispiel: string }[];
}

/* ------------------------------------------------------------ Antworten aus den Daten */

const nichtLeer = (v: unknown) => v !== null && v !== undefined && String(v).trim() !== '';
/** Eine Kennungsspalte, deren Werte alle da und verschieden sind (Name wie nr, id, lfdn …); sonst ''. */
export function waehleKennung(spalte: string): string {
  const kandidaten = s.spalten.filter(sp => sp.name !== spalte && /^(nr|id|lfdn|lfd_?nr|nummer|fall|case|code|proband|vp)$/i.test(sp.name));
  for (const sp of kandidaten) {
    const i = s.spalten.indexOf(sp), werte = s.zeilen.map(z => z[i]);
    if (werte.every(nichtLeer) && new Set(werte.map(String)).size === werte.length) return sp.name;
  }
  return '';
}
/** Die Zeilen der Daten als Antworten. Der Schlüssel ist die Kennung (falls es eine gibt) oder die Zeilennummer „Z<n>“. */
export function antwortenVon(kb: KatBlatt): Antwort[] {
  const it = s.spalten.findIndex(x => x.name === kb.spalte), ik = kb.kennung ? s.spalten.findIndex(x => x.name === kb.kennung) : -1;
  if (it < 0) return [];
  const gesehen = new Set<string>();
  return s.zeilen.map((z, i) => {
    let schl = ik >= 0 && nichtLeer(z[ik]) ? String(z[ik]) : `Z${i + 1}`;
    if (gesehen.has(schl)) schl = `Z${i + 1}`;   // doppelte Kennung: auf die Zeilennummer ausweichen
    gesehen.add(schl);
    const v = z[it];
    return { schluessel: schl, text: v === null || v === undefined ? null : String(v) };
  });
}
export const bezeichnungVon = (kb: KatBlatt) => { const sp = s.spalten.find(x => x.name === kb.spalte); return sp ? lesbar(sp, true) : kb.spalte; };

/* ------------------------------------------------------------ Zustand */

export function neuesKatBlatt(spalte: string, titel: string): Blatt {
  const kb: KatBlatt = { spalte, kennung: waehleKennung(spalte), z: leererKatZustand(), uebernommen: [null, null] };
  const b: Blatt = {
    id: Math.random().toString(36).slice(2, 8), titel, art: 'kategorien', l1: spalte, l2: null, l3: [spalte],
    syntax: `* ${L('Offene Antworten ordnen: Statable ordnet nichts selbst zu. Die Zuordnung kommt von einer Person; Statable zählt und schreibt die Ergebnisspalten auf Knopfdruck.', 'Ordering open answers: Statable does not assign anything itself. The assignment comes from a person; Statable counts and writes the result columns on request.')}`,
    items: [], ergebnis: null, imBericht: true, notiz: '', zeit: Date.now(), kat: kb
  };
  b.ergebnis = { typ: 'kategorien', e: anzeige(kb) };
  return b;
}
/** Die Kodierung `nr` als Zustand: die Kategorienliste und der Modus gehören beiden, die Zuordnung ist je Kodierung. Mutiert nur `zuordnung` (und `kategorien` per Splice). */
export function sicht(kb: KatBlatt, nr: 1 | 2): KatZustand {
  if (nr === 1) return kb.z;
  return { kategorien: kb.z.kategorien, mehrfach: kb.z.mehrfach, zuordnung: kb.zuordnung2 ?? {} };   // legt nichts an (auch in $derived benutzbar): `zweiteAnlegen` setzt zuordnung2
}
/** Eine Änderung an Kategorien oder Modus gilt für beide Kodierungen (löschen und zusammenführen räumen auch die zweite Zuordnung auf). */
export function aendereStruktur(kb: KatBlatt, f: (z: KatZustand) => void) {
  const vor = JSON.parse(JSON.stringify({ kategorien: kb.z.kategorien, mehrfach: kb.z.mehrfach })) as Pick<KatZustand, 'kategorien' | 'mehrfach'>;
  f(kb.z);
  if (kb.zuordnung2) {
    const z2: KatZustand = { kategorien: vor.kategorien, mehrfach: vor.mehrfach, zuordnung: JSON.parse(JSON.stringify(kb.zuordnung2)) };
    f(z2);
    kb.zuordnung2 = z2.zuordnung;
  }
}
/** Zweite Kodierung anlegen: gleiche Kategorien, leere eigene Zuordnung. */
export function zweiteAnlegen(kb: KatBlatt) { kb.zuordnung2 = {}; }
/** Die zweite Kodierung entfernen (die Spalten in den Daten bleiben, wie sie sind). */
export function zweiteEntfernen(kb: KatBlatt) { kb.zuordnung2 = undefined; }
export const grundname = (kb: KatBlatt, nr: 1 | 2) => (nr === 1 ? kb.spalte : `${kb.spalte.slice(0, 50)}_2`);

/* ------------------------------------------------------------ Anzeige für Bericht und Export */

export function anzeige(kb: KatBlatt): KatAnzeige {
  const antw = antwortenVon(kb);
  return {
    spalte: kb.spalte, bezeichnung: bezeichnungVon(kb), h: haeufigkeiten(antw, kb.z), ...(kb.zuordnung2 ? { h2: haeufigkeiten(antw, sicht(kb, 2)) } : {}),
    leitfaden: kb.z.kategorien.map(k => ({ name: k.name, beschreibung: k.beschreibung, beispiel: k.beispiel }))
  };
}

/* ------------------------------------------------------------ In die Daten übernehmen */

/** Wertelabels einer Spalte als Text, nach Wert geordnet (Merkmal zum Wiedererkennen). */
const werteText = (sp: { werteLabels: Record<string, string> }) => JSON.stringify(Object.entries(sp.werteLabels).sort((a, b) => Number(a[0]) - Number(b[0])));
/**
 * Die eigenen Spalten dieser Kodierung, die es in den Daten noch gibt - und die wirklich die eigenen sind: Der Name allein genügt nicht.
 * Wurde die eigene Spalte gelöscht und eine fremde gleichen Namens angelegt, passen weder das Variablenlabel noch die Wertelabels, und sie gilt als fremd.
 * (Beim Umbenennen einer Kategorie ändert sich bei „mehrere“ das Variablenlabel, bei „eine“ die Wertelabels - eines der beiden Merkmale passt dann noch.)
 */
export function eigeneSpalten(kb: KatBlatt, nr: 1 | 2): string[] {
  const u = kb.uebernommen[nr - 1]; if (!u) return [];
  return u.namen.filter((n, k) => {
    const sp = s.spalten.find(x => x.name === n); if (!sp) return false;
    const m = u.merkmal?.[k]; if (!m) return true;
    return sp.bezeichnung === m.label || werteText(sp) === m.werte;
  });
}
/** Namen, die zu anderen Spalten oder Sets gehören als die eigenen dieser Kodierung (sie werden nie überschrieben). */
function fremdeNamen(kb: KatBlatt, nr: 1 | 2): string[] {
  const eigen = new Set(eigeneSpalten(kb, nr).map(n => n.toUpperCase())), eigenesSet = eigenesSetName(kb, nr)?.toUpperCase();
  return [...s.spalten.map(x => x.name).filter(n => !eigen.has(n.toUpperCase())), ...s.sets.map(x => x.name).filter(n => n.toUpperCase() !== eigenesSet)];
}
/** Das eigene Mehrfachantworten-Set: gleicher Name UND dieselben Spalten wie bei der Übernahme (ein fremdes Set gleichen Namens bleibt unberührt). */
function eigenesSetName(kb: KatBlatt, nr: 1 | 2): string | null {
  const u = kb.uebernommen[nr - 1]; if (!u?.set) return null;
  const set = s.sets.find(x => x.name === u.set);
  return set && JSON.stringify(set.spalten) === JSON.stringify(u.namen) ? u.set : null;
}
export function ergebnisFuer(kb: KatBlatt, nr: 1 | 2, fremd = fremdeNamen(kb, nr)): KatErgebnis {
  return ergebnis(antwortenVon(kb), sicht(kb, nr), grundname(kb, nr), fremd, bezeichnungVon(kb), nr === 2 ? L(' (zweite Kodierung)', ' (second coding)') : '');
}
export type UebernahmeStand = 'nicht' | 'aktuell' | 'geaendert';
/**
 * Stimmen die Spalten in den Daten mit der Zuordnung überein?
 * nicht = nie übernommen (oder die Spalten gibt es nicht mehr, auch nach „Rückgängig“); aktuell = Werte, Wertelabels und Anzahl gleich; geaendert = die Zuordnung hat sich seitdem geändert.
 */
export function uebernahmeStand(kb: KatBlatt, nr: 1 | 2): UebernahmeStand {
  const u = kb.uebernommen[nr - 1];
  if (!u || !u.namen.length || eigeneSpalten(kb, nr).length !== u.namen.length) return 'nicht';
  const sp = u.namen.map(n => s.spalten.findIndex(x => x.name === n));
  if (sp.some(i => i < 0)) return 'nicht';
  const erg = ergebnisFuer(kb, nr, []);
  if (erg.spalten.length !== sp.length) return 'geaendert';
  for (let k = 0; k < sp.length; k++) {
    const col = s.spalten[sp[k]!]!, soll = erg.spalten[k]!;
    if (erg.modus === 'eins') {
      const labels = erg.labels.length === Object.keys(col.werteLabels).length && erg.labels.every(l => col.werteLabels[String(l.code)] === l.label);
      if (!labels) return 'geaendert';
    } else if (col.bezeichnung !== soll.label) return 'geaendert';
    for (let i = 0; i < soll.werte.length; i++) {
      const ist = s.zeilen[i]?.[sp[k]!];
      if ((ist === undefined || ist === null || ist === '' ? null : ist) !== soll.werte[i]) return 'geaendert';
    }
  }
  return 'aktuell';
}
/** Schreibt die Ergebnisspalten der Kodierung `nr` in die Daten (ein Rückgängig-Schritt) und legt bei Mehrfachzuordnung das Mehrfachantworten-Set an. `true`, wenn es gelang. */
export async function uebernehmen(b: Blatt, nr: 1 | 2): Promise<boolean> {
  const kb = b.kat; if (!kb) return false;
  const eigen = kb.uebernommen[nr - 1] ?? null, eigeneNamen = eigeneSpalten(kb, nr);
  const erg = ergebnisFuer(kb, nr);
  const neu = new Set(erg.spalten.map(x => x.name.toUpperCase()));
  const loesche = eigeneNamen.filter(n => !neu.has(n.toUpperCase()));   // übrig gebliebene eigene Spalten (weniger Kategorien, anderer Modus)
  const syntax = uebernahmeBefehl(erg, { loesche });
  const r = await aendere(nr === 1 ? L('Offene Antworten in die Daten übernommen', 'Open answers written to the data') : L('Zweite Kodierung in die Daten übernommen', 'Second coding written to the data'), syntax, undefined, { art: 'kategorien', ausDaten: true });
  if (r.items.some(i => i.type === 'message' && i.severity === 'error')) { await rueckgaengig(); return false; }
  // Mehrfachantworten-Set: das eigene alte ersetzen, fremde nie anfassen
  const alt = eigenesSetName(kb, nr);
  let sets: MehrfachSet[] = s.sets.filter(x => x.name !== alt && x.name !== erg.set?.name);
  if (erg.set) sets = [...sets, { name: erg.set.name, label: erg.set.label, spalten: [...erg.set.spalten], zaehlwert: 1 }];
  if (sets.length !== s.sets.length || erg.set || alt) await setzeSets(sets);
  const namen = erg.spalten.map(x => x.name);
  kb.uebernommen[nr - 1] = { namen, set: erg.set?.name ?? null, merkmal: namen.map(n => { const sp = s.spalten.find(x => x.name === n); return { label: sp?.bezeichnung ?? '', werte: sp ? werteText(sp) : '[]' }; }) };
  s.funde = s.funde.filter(f => !(f.art === 'leer' && namen.includes(f.spalte)));   // gewollt leer (offen und ohne Antwort sind fehlend): kein Befund im Daten-Check
  void sichern();
  return true;
}

/* ------------------------------------------------------------ Zweitkodierung → Übereinstimmung */

/**
 * Die Spalten für die Karte „Stimmen Beurteilungen überein?“: bei einer Kategorie je Antwort die zwei Ergebnisspalten, bei Mehrfachzuordnung die zwei 0/1-Spalten der gewählten Kategorie.
 * `null`, wenn beide Kodierungen nicht (aktuell) in den Daten stehen.
 */
export function uebereinstimmungsSpalten(kb: KatBlatt, kategorieId?: string): [string, string] | null {
  if (!kb.zuordnung2 || uebernahmeStand(kb, 1) !== 'aktuell' || uebernahmeStand(kb, 2) !== 'aktuell') return null;
  const u1 = kb.uebernommen[0]!, u2 = kb.uebernommen[1]!;
  if (!kb.z.mehrfach) return u1.namen[0] && u2.namen[0] ? [u1.namen[0], u2.namen[0]] : null;
  const j = kb.z.kategorien.findIndex(k => k.id === (kategorieId ?? kb.z.kategorien[0]?.id));
  return j >= 0 && u1.namen[j] && u2.namen[j] ? [u1.namen[j]!, u2.namen[j]!] : null;
}

/* ------------------------------------------------------------ Prüfliste vor dem Anlegen */

export interface KatPunkt { art: 'ok' | 'hinweis' | 'info'; text: string; klein?: string }
/** Die Prüfliste der Karte (Schritt „Passt das zu deinen Daten?“): wie viele Antworten es gibt, ob sie kurz genug sind. Sperrt nie - eine Spalte ohne Antworten ist ein Hinweis. */
export function katVorpruefung(spalte: string): KatPunkt[] {
  const i = s.spalten.findIndex(x => x.name === spalte);
  if (i < 0) return [];
  const texte = s.zeilen.map(z => z[i]).filter(nichtLeer).map(String);
  const n = texte.length, leer = s.zeilen.length - n;
  const p: KatPunkt[] = [];
  p.push(n
    ? { art: 'ok', text: Lp(n, `${n} Antwort mit Text`, `${n} Antworten mit Text`, `${n} answer with text`, `${n} answers with text`),
        klein: leer ? Lp(leer, `${leer} Zeile ohne Antwort zählt als fehlend, nicht als „keine Kategorie“.`, `${leer} Zeilen ohne Antwort zählen als fehlend, nicht als „keine Kategorie“.`, `${leer} row without an answer counts as missing, not as "no category".`, `${leer} rows without an answer count as missing, not as "no category".`) : undefined }
    : { art: 'hinweis', text: L('In dieser Spalte steht noch keine Antwort', 'This column contains no answer yet'), klein: L('Ohne Antworten gibt es nichts zu ordnen.', 'Without answers there is nothing to sort.') });
  if (n) {
    const lang = texte.filter(t => t.length > 300).length;
    if (lang > n / 4) p.push({ art: 'hinweis', text: L('Viele Antworten sind lang', 'Many answers are long'), klein: L('Statable ist für kurze Antworten im Fragebogen gedacht, nicht für Interviews oder lange Texte. Dafür eignen sich Programme für qualitative Inhaltsanalyse (zum Beispiel MAXQDA oder QCAmap).', 'Statable is meant for short questionnaire answers, not for interviews or long texts. Programs for qualitative content analysis (for example MAXQDA or QCAmap) are better suited for those.') });
  }
  p.push({ art: 'info', text: L('Statable ordnet nichts selbst zu', 'Statable does not assign anything itself'), klein: L('Die Kategorien legt die auswertende Person fest und ordnet jede Antwort zu. Statable zählt, ohne KI und ohne den Text zu verschicken.', 'The person analysing the data defines the categories and assigns each answer. Statable counts, without AI and without sending the text anywhere.') });
  return p;
}
