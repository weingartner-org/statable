/**
 * Daten umstrukturieren: breit (eine Zeile je Person, eine Spalte je Zeitpunkt) ↔ lang (eine Zeile je Person und Zeitpunkt).
 * PSPP 2.1.1 kennt VARSTOCASES/CASESTOVARS nicht ("not yet implemented", geprüft 08.10.2026) - darum baut dieses Modul
 * die Daten neu auf; die Oberfläche lädt das Ergebnis über `neuAufbauen` (lib/eingabe.ts) in die Engine.
 * Wertelabels, Messniveau, Format und „keine Angabe“ der Messspalten werden mitgenommen.
 * Vorbilder: SPSS Daten → Umstrukturieren (VARSTOCASES/CASESTOVARS), R tidyr::pivot_longer/pivot_wider.
 */
import { istFehlend, gleichFehlend, hatFehlend } from './fehlend';
import type { Spalte } from './verzeichnis';
import type { Wert } from './eingabe';
import { psppName } from './einlesen';
import { kleinste, groesste } from './menge';
import type { ZpHinweise } from './coxzeit';

export interface Daten { spalten: Spalte[]; zeilen: Wert[][] }
/** Was beim Umbau auffiel. Die Oberfläche formuliert es in Worten. */
export type Hinweis =
  | { art: 'doppelt'; anzahl: number }              // lang → breit: dieselbe Person mit demselben Zeitpunkt mehrfach (die erste Zeile zählt)
  | { art: 'variiert'; spalten: string[] }          // lang → breit: Spalte ändert sich innerhalb einer Person - fällt weg
  | { art: 'ohneKennung'; anzahl: number }          // lang → breit: Zeilen ohne Kennung fallen weg
  | { art: 'ohneZeit'; anzahl: number }             // lang → breit: Zeilen ohne Zeitpunkt fallen weg
  | { art: 'gemischt' }                             // breit → lang: Zahl- und Textspalten gemischt → Text
  | { art: 'fehlendAngeglichen' }                   // breit → lang: unterschiedliche „keine Angabe“-Codes → leere Felder
  | { art: 'labelsVerschieden' }                    // breit → lang: Wertelabels der Messspalten unterscheiden sich → weggelassen
  | { art: 'intervalle'; hinweise: ZpHinweise; vorzug?: number }     // Später S-F: Zeitpunkte je Person → Intervalle (Zahlen der Umformung)
  | { art: 'unsterblich' };                         // Später S-F: Satz zum Unsterblichkeitsfehler
export interface Umgebaut extends Daten { hinweise: Hinweis[] }

/** Namen der Projekte, die diese Sitzung beim Umstrukturieren angelegt hat (Name → Name davor): so streift die Seite beim nächsten Umbau den Zusatz „(lang)“ ab, ohne übersetzte Wörter zu erkennen - in jeder Sprache gleich. */
export const umgebauteProjekte = new Map<string, string>();

export interface BreitLang {
  messspalten: string[];
  /** Beschriftung je Messspalte (gleiche Reihenfolge); leer = Spaltenname */
  zeitLabels: string[];
  /** Name einer vorhandenen Spalte, oder null = neue Spalte mit Zeilennummern */
  kennung: string | null;
  kennungName: string; zeitName: string; wertName: string;
  /** nummer: 1 … k mit den Beschriftungen als Wertelabels; text: die Beschriftungen selbst */
  zeitAls: 'nummer' | 'text';
}
export interface LangBreit {
  kennung: string; zeit: string; werte: string[];
  /** Spaltennamen mit den Beschriftungen des Zeitpunkts (namen) oder mit den Werten (nummern) */
  zeitNamen: 'namen' | 'nummern';
}

const leer = (v: Wert) => v === null || v === '';
const schluessel = (v: Wert) => (typeof v === 'number' ? `n${v}` : `t${v}`);
const gleich = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Name nach den PSPP-Regeln; die Eingabe bleibt als Bezeichnung erhalten, wenn sie vom Namen abweicht. */
function neueSpalte(eingabe: string, vorschlag: string, vergeben: Set<string>, rest: Partial<Spalte>): Spalte {
  const wunsch = eingabe.trim() || vorschlag;
  const name = psppName(wunsch, vergeben, vergeben.size + 1);
  return { name, bezeichnung: wunsch === name ? '' : wunsch, art: 'zahl', niveau: 'nominal', format: 'F8.0', fehlend: [], fehlendText: '', werteLabels: {}, ...rest };
}

/** Breit → lang: die gewählten Messspalten werden zu Zeilen. Alle anderen Spalten laufen mit. */
export function breitZuLang(d: Daten, o: BreitLang): Umgebaut {
  const idx = o.messspalten.map(n => d.spalten.findIndex(x => x.name === n));
  if (idx.length < 2 || idx.some(i => i < 0) || new Set(idx).size !== idx.length) throw new Error('messspalten');
  const kennungIdx = o.kennung === null ? -1 : d.spalten.findIndex(x => x.name === o.kennung);
  if (o.kennung !== null && (kennungIdx < 0 || idx.includes(kennungIdx))) throw new Error('kennung');
  const hinweise: Hinweis[] = [];
  const mess = idx.map(i => d.spalten[i]!);
  const rest = d.spalten.map((sp, i) => ({ sp, i })).filter(x => !idx.includes(x.i));
  const vergeben = new Set(rest.map(x => x.sp.name.toLowerCase()));

  const kennungNeu = o.kennung === null ? neueSpalte(o.kennungName, 'person', vergeben, { niveau: 'nominal' }) : null;
  const zeitSp = neueSpalte(o.zeitName, 'zeit', vergeben, {});
  const wertSp = neueSpalte(o.wertName, 'wert', vergeben, {});

  // Zeitpunkt: 1 … k (mit Beschriftung als Wertelabel) oder Text
  const labels = mess.map((m, k) => (o.zeitLabels[k] ?? '').trim() || m.name);
  if (o.zeitAls === 'text') {
    zeitSp.art = 'text'; zeitSp.format = `A${Math.max(1, groesste(labels.map(t => new TextEncoder().encode(t).length)))}`;
  } else {
    labels.forEach((t, k) => { if (t !== String(k + 1)) zeitSp.werteLabels[String(k + 1)] = t; });
  }

  // Messwert: Art, Niveau, Format, Labels und „keine Angabe“ aus den Messspalten
  const art = mess.every(m => m.art === 'zahl') ? 'zahl' : mess.every(m => m.art === 'datum') ? 'datum' : 'text';
  if (art === 'text' && mess.some(m => m.art !== 'text')) hinweise.push({ art: 'gemischt' });
  const erste = mess[0]!;
  wertSp.art = art; wertSp.niveau = art === 'text' ? 'nominal' : erste.niveau;
  wertSp.format = art === 'text' ? 'A1' : erste.format;
  wertSp.bezeichnung = o.wertName.trim() && o.wertName.trim() !== wertSp.name ? o.wertName.trim() : '';
  const fehlGleich = mess.every(m => gleichFehlend(m, erste));
  if (art === 'zahl' && fehlGleich) { wertSp.fehlend = [...erste.fehlend]; wertSp.fehlendBereich = erste.fehlendBereich; wertSp.fehlendText = erste.fehlendText; }
  else if (art === 'zahl' && mess.some(m => hatFehlend(m))) hinweise.push({ art: 'fehlendAngeglichen' });
  const labelsGleich = mess.every(m => gleich(Object.entries(m.werteLabels).sort(), Object.entries(erste.werteLabels).sort()));
  if (art !== 'text' && labelsGleich) wertSp.werteLabels = { ...erste.werteLabels };
  else if (art !== 'text' && mess.some(m => Object.keys(m.werteLabels).length)) hinweise.push({ art: 'labelsVerschieden' });

  const zeilen: Wert[][] = [];
  d.zeilen.forEach((z, r) => {
    mess.forEach((m, k) => {
      let w: Wert = z[idx[k]!] ?? null;
      if (typeof w === 'number' && art === 'zahl' && !fehlGleich && istFehlend(m, w)) w = null;
      if (art === 'text' && w !== null) w = String(w);
      zeilen.push([...(kennungNeu ? [r + 1] : []), ...rest.map(x => z[x.i] ?? null), o.zeitAls === 'text' ? labels[k]! : k + 1, w]);
    });
  });
  return { spalten: [...(kennungNeu ? [kennungNeu] : []), ...rest.map(x => x.sp), zeitSp, wertSp], zeilen, hinweise };
}

/** Lang → breit: je Person eine Zeile, je Zeitpunkt (und Messwert) eine Spalte. Fehlende Kombinationen bleiben leer. */
export function langZuBreit(d: Daten, o: LangBreit): Umgebaut {
  const ki = d.spalten.findIndex(x => x.name === o.kennung), zi = d.spalten.findIndex(x => x.name === o.zeit);
  const wi = o.werte.map(n => d.spalten.findIndex(x => x.name === n));
  if (ki < 0 || zi < 0 || !wi.length || wi.some(i => i < 0) || new Set([ki, zi, ...wi]).size !== wi.length + 2) throw new Error('spalten');
  const hinweise: Hinweis[] = [];
  const kSp = d.spalten[ki]!, zSp = d.spalten[zi]!;
  const fehlt = (sp: Spalte, v: Wert) => leer(v) || (typeof v === 'number' && istFehlend(sp, v));

  // Zeitpunkte: Zahlen aufsteigend, sonst in der Reihenfolge des Auftretens
  const stufen = new Map<string, Wert>();
  for (const z of d.zeilen) { const v = z[zi] ?? null; if (!fehlt(zSp, v)) stufen.set(schluessel(v), v); }
  let level = [...stufen.values()];
  if (level.every(v => typeof v === 'number')) level = (level as number[]).sort((a, b) => a - b);
  const levelNr = new Map(level.map((v, i) => [schluessel(v), i]));
  const beschriftung = (v: Wert) => (o.zeitNamen === 'namen' && typeof v === 'number' && zSp.werteLabels[String(v)]) || String(v);

  // Personen in der Reihenfolge des Auftretens
  const rest = d.spalten.map((sp, i) => ({ sp, i })).filter(x => x.i !== ki && x.i !== zi && !wi.includes(x.i));
  const personen = new Map<string, number>();
  const zellen: Wert[][][] = [];        // [person][wert][level]
  const gesetzt: boolean[][][] = [];
  const konstant: Wert[][] = [];        // [person][rest]
  const variiert = new Set<number>();
  const kennungen: Wert[] = [];
  let doppelt = 0, ohneKennung = 0, ohneZeit = 0;

  for (const z of d.zeilen) {
    const kv = z[ki] ?? null;
    if (fehlt(kSp, kv)) { ohneKennung++; continue; }
    const zv = z[zi] ?? null;
    if (fehlt(zSp, zv)) { ohneZeit++; continue; }
    const key = schluessel(kv);
    let p = personen.get(key);
    if (p === undefined) {
      p = personen.size; personen.set(key, p); kennungen.push(kv);
      zellen.push(wi.map(() => level.map(() => null))); gesetzt.push(wi.map(() => level.map(() => false)));
      konstant.push(rest.map(() => null));
    }
    const l = levelNr.get(schluessel(zv))!;
    if (gesetzt[p]![0]![l]) { doppelt++; continue; }
    wi.forEach((i, w) => { zellen[p]![w]![l] = z[i] ?? null; gesetzt[p]![w]![l] = true; });
    rest.forEach((x, c) => {
      const v = z[x.i] ?? null; if (leer(v)) return;
      const alt = konstant[p]![c] ?? null;
      if (alt === null) konstant[p]![c] = v; else if (alt !== v) variiert.add(c);
    });
  }
  if (ohneKennung) hinweise.push({ art: 'ohneKennung', anzahl: ohneKennung });
  if (ohneZeit) hinweise.push({ art: 'ohneZeit', anzahl: ohneZeit });
  if (doppelt) hinweise.push({ art: 'doppelt', anzahl: doppelt });
  const behalten = rest.map((x, c) => ({ x, c })).filter(e => !variiert.has(e.c));
  if (variiert.size) hinweise.push({ art: 'variiert', spalten: [...variiert].sort((a, b) => a - b).map(c => rest[c]!.sp.name) });

  const vergeben = new Set([kSp.name, ...behalten.map(e => e.x.sp.name)].map(n => n.toLowerCase()));
  const neu: { sp: Spalte; w: number; l: number }[] = [];
  wi.forEach((i, w) => {
    const q = d.spalten[i]!;
    level.forEach((v, l) => {
      const b = beschriftung(v);
      const name = psppName(`${q.name}_${b}`, vergeben, vergeben.size + 1);
      neu.push({ sp: { ...q, name, bezeichnung: `${q.bezeichnung || q.name} (${b})`, werteLabels: { ...q.werteLabels }, fehlend: [...q.fehlend] }, w, l });
    });
  });

  const zeilen: Wert[][] = kennungen.map((k, p) => [k, ...behalten.map(e => konstant[p]![e.c] ?? null), ...neu.map(n => zellen[p]![n.w]![n.l] ?? null)]);
  return { spalten: [kSp, ...behalten.map(e => e.x.sp), ...neu.map(n => n.sp)], zeilen, hinweise };
}

/* ---------- Vorschläge ---------- */
export interface Gruppe { stamm: string; spalten: string[]; labels: string[] }
const SEP = /[_.\-\s]/;
const MARKE = /(^|[_.\-\s])(prae|prä|pre|post|vorher|nachher|baseline|follow_?up|fu|vor|nach)(?=$|[_.\-\s])/i;

/** „t#_wissen“ → „wissen“, „wissen_t#“ → „wissen“, „item#“ → „item“. */
function stammAus(schl: string): string {
  const m = /^[A-Za-z]{0,2}[#*][_.\-\s]?(.+)$/.exec(schl) ?? /^(.+?)[_.\-\s]?[A-Za-z]{0,2}[#*]$/.exec(schl);
  return (m ? m[1]! : schl.replace(/[#*]/g, '')).replace(/^[_.\-\s]+|[_.\-\s]+$/g, '');
}

/**
 * Spalten mit gemeinsamem Stamm, die sich in einer Zahl unterscheiden (t1_wissen, t2_wissen / wissen_t1, wissen_t2 / item1, item2)
 * oder in einem Zeitwort (prae/post, vorher/nachher): Kandidaten für „breit → lang“. Nur Zahlenspalten.
 */
export function schlageGruppenVor(spalten: Spalte[]): Gruppe[] {
  const zahl = spalten.filter(s => s.art === 'zahl');
  const gruppen = new Map<string, { stamm: string; sp: { name: string; label: string; ord: number }[] }>();
  const ein = (schl: string, name: string, label: string, ord: number) => {
    const g = gruppen.get(schl) ?? { stamm: stammAus(schl), sp: [] }; g.sp.push({ name, label, ord }); gruppen.set(schl, g);
  };
  for (const s of zahl) {
    for (const m of s.name.matchAll(/\d+/g)) ein(s.name.slice(0, m.index) + '#' + s.name.slice(m.index + m[0].length), s.name, m[0], Number(m[0]));
    const t = MARKE.exec(s.name);
    if (t) { const von = t.index + t[1]!.length; ein('m:' + s.name.slice(0, von) + '*' + s.name.slice(von + t[2]!.length), s.name, t[2]!, 0); }
  }
  const spalteNr = new Map(spalten.map((s, i) => [s.name, i]));
  const sicht = new Set<string>();
  const aus: Gruppe[] = [];
  for (const [schl, g] of gruppen) {
    if (g.sp.length < 2 || new Set(g.sp.map(x => x.label.toLowerCase())).size < g.sp.length) continue;
    const ziffern = !schl.startsWith('m:');
    const sp = [...g.sp].sort((a, b) => (ziffern ? a.ord - b.ord : spalteNr.get(a.name)! - spalteNr.get(b.name)!));
    const key = sp.map(x => x.name).join('|');
    if (sicht.has(key)) continue; sicht.add(key);
    aus.push({ stamm: ziffern ? g.stamm : stammAus(schl.slice(2)), spalten: sp.map(x => x.name), labels: sp.map(x => x.label) });
  }
  return aus.sort((a, b) => b.spalten.length - a.spalten.length || spalteNr.get(a.spalten[0]!)! - spalteNr.get(b.spalten[0]!)!);
}

/** Beschriftungen aus Spaltennamen: das Gemeinsame vorn und hinten fällt weg (wissen_t1, wissen_t2 → 1, 2; sonst die Namen). */
export function leiteBeschriftungenAb(namen: string[]): { labels: string[]; stamm: string } {
  if (namen.length < 2) return { labels: [...namen], stamm: '' };
  const n = namen.map(x => x.toLowerCase());
  let p = 0; while (p < Math.min(kleinste(n.map(x => x.length))) && n.every(x => x[p] === n[0]![p])) p++;
  let q = 0; while (q < Math.min(kleinste(n.map(x => x.length))) - p && n.every(x => x[x.length - 1 - q] === n[0]![n[0]!.length - 1 - q])) q++;
  // nur an Wortgrenzen kappen (sonst wird aus prae/post „rae“/„ost“)
  if (!namen.every(x => /^\d/.test(x.slice(p)))) { const g = namen[0]!.slice(0, p).search(/[_.\-\s][^_.\-\s]*$/); p = g < 0 ? 0 : g + 1; }
  if (!namen.every(x => /\d$/.test(x.slice(0, x.length - q)))) { const f = namen[0]!.slice(namen[0]!.length - q).search(SEP); q = f < 0 ? 0 : q - f; }
  const labels = namen.map(x => x.slice(p, x.length - q).replace(/^[_.\-\s]+|[_.\-\s]+$/g, ''));
  if (labels.some(l => !l) || new Set(labels.map(l => l.toLowerCase())).size < labels.length) return { labels: [...namen], stamm: '' };
  const stamm = (namen[0]!.slice(0, p) + namen[0]!.slice(namen[0]!.length - q)).replace(/[_.\-\s]+[A-Za-z]{1,2}$/, '').replace(/^[A-Za-z]{1,2}[_.\-\s]+/, '').replace(/^[_.\-\s]+|[_.\-\s]+$/g, '');
  return { labels, stamm };
}

/* ---------- Erkennen, ob die Daten schon „lang“ sind ---------- */
const NAME_KENNUNG = /^(id|vp|vpn|person|proband|probandin|teilnehmer|teilnehmerin|code|kennung|fall|case|subject|participant|pid|schueler|schüler)/i;
const NAME_ZEIT = /(zeit|time|welle|wave|messung|messzeit|bedingung|condition|phase|session|woche|week|tag|day)/i;

/**
 * Sieht die Tabelle „lang“ aus? Dann: eine Kennung, die sich wiederholt, eine Zeitpunkt-Spalte, bei der (Kennung, Zeitpunkt)
 * fast immer eindeutig ist, und Messspalten, die sich innerhalb einer Person ändern. Sonst null.
 */
export function schlageLangVor(d: Daten): { kennung: string; zeit: string; werte: string[] } | null {
  const n = d.zeilen.length; if (n < 4) return null;
  const spaltenWerte = d.spalten.map((s, i) => d.zeilen.map(z => (leer(z[i] ?? null) || (typeof z[i] === 'number' && istFehlend(s, z[i] as number)) ? null : z[i]!)));
  const verschieden = spaltenWerte.map(w => new Set(w.filter(v => v !== null).map(v => schluessel(v))).size);
  const kandidatK = d.spalten.map((_, i) => i).filter(i => verschieden[i]! >= 3 && verschieden[i]! <= n / 1.5 && spaltenWerte[i]!.every(v => v !== null));
  if (!kandidatK.length) return null;
  const nameK = kandidatK.find(i => NAME_KENNUNG.test(d.spalten[i]!.name));
  const ordnung = [...(nameK !== undefined ? [nameK] : []), ...kandidatK.filter(i => i !== nameK)];
  for (const ki of ordnung) {
    const zKand = d.spalten.map((_, i) => i).filter(i => i !== ki && verschieden[i]! >= 2 && verschieden[i]! <= Math.min(12, n / 2) && verschieden[ki]! * verschieden[i]! <= n * 1.5 && spaltenWerte[i]!.every(v => v !== null));
    const eindeutig = (zi: number) => new Set(d.zeilen.map((_, r) => `${schluessel(spaltenWerte[ki]![r]!)}|${schluessel(spaltenWerte[zi]![r]!)}`)).size >= n * 0.95;
    const passend = zKand.filter(eindeutig);
    const zi = passend.find(i => NAME_ZEIT.test(d.spalten[i]!.name)) ?? passend[0];
    if (zi === undefined) continue;
    // Messspalten: ändern sich innerhalb einer Person
    const werte = d.spalten.map((_, i) => i).filter(i => {
      if (i === ki || i === zi || d.spalten[i]!.art !== 'zahl') return false;
      const erster = new Map<string, Wert>();
      return spaltenWerte[i]!.some((v, r) => { if (v === null) return false; const k = schluessel(spaltenWerte[ki]![r]!); const e = erster.get(k); if (e === undefined) { erster.set(k, v); return false; } return e !== v; });
    });
    if (werte.length) return { kennung: d.spalten[ki]!.name, zeit: d.spalten[zi]!.name, werte: werte.map(i => d.spalten[i]!.name) };
  }
  return null;
}
