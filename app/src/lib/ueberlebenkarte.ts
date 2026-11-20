/**
 * Später S-F (Bauer A): die Anbindung von Sterbetafel und Cox mit zeitabhängiger Größe an die Karte „Wie lange dauert es bis zu einem Ereignis?“ - reine Funktionen ohne Sitzung:
 * die Tabelle in Intervall-Form aus den Spalten der Daten, die Vorbereitung für R, die Prüfliste (Sperren, Hinweise) und die Auswahl der Spalten.
 * Fachblatt: docs/fachblaetter/SPAETER-F-UEBERLEBEN-MEDIZIN.md Abschnitt 2.4 und 2.5. Die Rechnung selbst: coxzeit.ts (R: engine/statable-ueberleben.R), sterbetafel.ts (JS).
 * ⚠ Satzvorlagen von der Fachperson abzunehmen.
 */
import { istFehlend } from './fehlend';
import type { Spalte } from './verzeichnis';
import type { Wert } from './eingabe';
import { textCodes } from './eingabe';
import { L, Lp, d } from './sitzung.svelte';
import { coxBefunde, type CoxPraed } from './cox';
import { pruefeIntervalle, zpZeilenAusTabelle, type IntervallTabelle, type IntervallPruefung, type ZpZeile, type CoxZeitInfo } from './coxzeit';
import { fehlerSatz, pruefHinweisSatz, unsterblichkeitSatz } from './coxzeitsaetze';
import { kennung as istKennung } from './verfahren';
import { regFaktor, istGruppenSpalte } from './regfaktor';

/** Die Spalten, die die Karte für die Tabelle in Intervall-Form braucht. `stopp` ist die Zeitspalte der Karte (Lücke l1), `ereignis` die Ereignisspalte (l2), `wert` die zeitabhängige Größe (eine der Spalten in l4). */
export interface ZeitSpalten { kennung: string; start: string; stopp: string; ereignis: string; wert: string; fest: string[] }

const nie = (_v: Wert | undefined): _v is string | number => false;
function gueltigFuer(sp: Spalte): (v: Wert | undefined) => v is string | number {
  const fehlText = sp.art === 'text' ? new Set(textCodes(sp.fehlendText)) : new Set<string>();
  return (v): v is string | number => {
    if (v === null || v === undefined || v === '') return false;
    if (sp.art === 'zahl') return typeof v === 'number' && Number.isFinite(v) && !istFehlend(sp, v);
    return typeof v === 'string' && !fehlText.has(v.trimEnd());
  };
}

/**
 * Die Spalten der Daten als Tabelle in Intervall-Form. Zahlen: nur gültige (nicht fehlend, nicht „keine Angabe“); Ereignis: 1 beim Wert `ereignisWert` (so wie in den Daten), sonst 0
 * (`null` = jeder gültige Wert ist ein Ereignis); die Kennung darf Zahl oder Text sein.
 */
export function intervallTabelleAus(zeilen: Wert[][], spalten: Spalte[], c: ZeitSpalten, ereignisWert: string | number | null): IntervallTabelle {
  const ix = (n: string) => spalten.findIndex(x => x.name === n), sp = (n: string) => spalten.find(x => x.name === n);
  const zahl = (n: string): (number | null)[] => { const i = ix(n), g = sp(n) ? gueltigFuer(sp(n)!) : nie; return zeilen.map(z => { const v = z[i]; return g(v) && typeof v === 'number' ? v : null; }); };
  const ik = ix(c.kennung), gk = sp(c.kennung) ? gueltigFuer(sp(c.kennung)!) : nie, ie = ix(c.ereignis), ge = sp(c.ereignis) ? gueltigFuer(sp(c.ereignis)!) : nie;
  // Feste Größen wie in der normalen Cox-Karte: Gruppen-Spalten (Text, Wertebeschriftungen, 2 bis 12 Stufen) als Faktor (Codes 1 … k, erste Stufe = Vergleichsgruppe), Zahlen linear
  const fest: Record<string, (number | null)[]> = {}, faktoren: Record<string, string[]> = {};
  for (const n of c.fest) {
    const spN = sp(n), i = ix(n);
    if (spN && istGruppenSpalte(spN)) {
      const g = gueltigFuer(spN), f = regFaktor(spN, zeilen.map(z => z[i]).filter(g), []);
      if (f) {
        const code = new Map(f.stufen.map((st, j) => [st.wert, j + 1]));
        fest[n] = zeilen.map(z => { const v = z[i]; return g(v) ? code.get(f.text ? String(v) : String(Number(v))) ?? null : null; });
        faktoren[n] = f.stufen.map(st => st.name);
        continue;
      }
    }
    fest[n] = zahl(n);
  }
  return {
    kennung: zeilen.map(z => { const v = z[ik]; return gk(v) ? v : null; }),
    start: zahl(c.start), stopp: zahl(c.stopp),
    ereignis: zeilen.map(z => { const v = z[ie]; if (!ge(v)) return null; return ereignisWert === null || v === ereignisWert ? 1 : 0; }),
    wert: zahl(c.wert), fest, ...(Object.keys(faktoren).length ? { faktoren } : {})
  };
}

export interface CoxZeitVorbereitung {
  zeilen: ZpZeile[]; ausgelassen: number; pruefung: IntervallPruefung;
  personen: number; ereignisse: number; binaer: boolean;
  /** Die Prädiktoren in der Reihenfolge der Rechnung: zuerst die zeitabhängige Größe, dann die festen (Gruppen-Spalten als Faktor) */
  praed: CoxPraed[];
  /** Gruppen-Spalten unter den festen Größen: Beschriftungen der Stufen (erste = Vergleichsgruppe); leer, wenn es keine gibt */
  faktoren: Record<string, string[]>;
}

/** Aus den Spalten der Karte alles, was geprüft und gerechnet wird. Rechnet nichts in R. */
export function coxZeitVorbereiten(zeilen: Wert[][], spalten: Spalte[], c: ZeitSpalten, ereignisWert: string | number | null): CoxZeitVorbereitung {
  const tab = intervallTabelleAus(zeilen, spalten, c, ereignisWert), z = zpZeilenAusTabelle(tab);
  const pruefung = pruefeIntervalle(z.zeilen.map(r => ({ kennung: r.kennung, start: r.start, stopp: r.stopp, ereignis: r.ereignis, wert: r.wert })));
  return {
    zeilen: z.zeilen, ausgelassen: z.ausgelassen, pruefung, personen: new Set(z.zeilen.map(r => r.person)).size,
    ereignisse: z.zeilen.reduce((a, r) => a + r.ereignis, 0), binaer: z.zeilen.every(r => r.wert === 0 || r.wert === 1),
    faktoren: tab.faktoren ?? {},
    praed: [{ name: c.wert, art: 'zahl' as const, stufen: [] }, ...c.fest.map(name => (tab.faktoren?.[name] ? { name, art: 'faktor' as const, stufen: [...tab.faktoren[name]!] } : { name, art: 'zahl' as const, stufen: [] }))]
  };
}

/** Die Angaben zum Ergebnis (für die Sätze), gebaut aus der Vorbereitung und den Spalten. */
export const coxZeitInfo = (v: CoxZeitVorbereitung, c: ZeitSpalten, zeilenImModell: number): CoxZeitInfo =>
  ({ personen: v.personen, zeilen: zeilenImModell, start: c.start, stopp: c.stopp, kennung: c.kennung, wertName: c.wert, binaer: v.binaer, wechselPersonen: v.pruefung.personenMitWechsel });

export interface KartenPunkt { art: 'sperre' | 'hinweis' | 'info' | 'ok'; text: string; klein?: string }

/**
 * Die Prüfliste der Wahl „Eine Angabe ändert sich im Lauf der Zeit“: Sperren, wenn die Wahl nicht vollständig ist oder die Tabelle nicht in Intervall-Form ist; Hinweise, wenn gerechnet wird.
 * `l4`: die Spalten unter „Welche Angaben sollen das Risiko erklären?“. `name`: Anzeigename einer Spalte.
 */
export function coxZeitPunkte(c: ZeitSpalten, l4: string[], spalten: Spalte[], v: CoxZeitVorbereitung | null, name: (n: string) => string): KartenPunkt[] {
  const p: KartenPunkt[] = [];
  const fehlt = (t: string) => p.push({ art: 'sperre', text: t });
  if (!c.start || !c.kennung) {
    fehlt(d('Wähle die Spalte mit dem Start des Abschnitts und die Spalte mit der Kennung der Person.', 'Wählen Sie die Spalte mit dem Start des Abschnitts und die Spalte mit der Kennung der Person.', 'Choose the column with the start of the interval and the column with the ID of the person.'));
    return p;
  }
  if (!l4.length || !c.wert || !l4.includes(c.wert)) {
    fehlt(d('Wähle unter den Angaben, die das Risiko erklären sollen, die Spalte, die sich im Lauf der Zeit ändert.', 'Wählen Sie unter den Angaben, die das Risiko erklären sollen, die Spalte, die sich im Lauf der Zeit ändert.', 'Among the characteristics that are meant to explain the risk, choose the column that changes over time.'));
    return p;
  }
  const alle = [c.kennung, c.start, c.stopp, c.ereignis, ...l4];
  if (new Set(alle).size < alle.length) { fehlt(L('Eine Spalte steht mehrfach', 'A column is used more than once')); p[p.length - 1]!.klein = L('Kennung, Start, Ende, Ereignis und die Angaben für die Cox-Regression müssen verschiedene Spalten sein.', 'ID, start, end, event and the characteristics for the Cox regression must be different columns.'); return p; }
  if (!v) return p;
  const text = l4.filter(n => spalten.find(x => x.name === n)?.art !== 'zahl' && !v.faktoren[n]);
  if (text.length) {
    p.push({ art: 'sperre', text: Lp(text.length, `${text.map(name).join(', ')} ist weder eine Zahlenspalte noch eine Gruppe mit 2 bis 12 Stufen`, `${text.map(name).join(', ')} sind weder Zahlenspalten noch Gruppen mit 2 bis 12 Stufen`, `${text.map(name).join(', ')} is neither a number column nor a group with 2 to 12 levels`, `${text.map(name).join(', ')} are neither number columns nor groups with 2 to 12 levels`),
      klein: L('Mit einer zeitabhängigen Größe rechnet Statable Zahlen und Gruppen (Text oder Wertebeschriftungen) mit 2 bis 12 Stufen.', 'With a time-dependent covariate Statable calculates with numbers and groups (text or value labels) with 2 to 12 levels.') });
    return p;
  }
  for (const n of Object.keys(v.faktoren)) p.push({ art: 'info', text: L(`${name(n)} wird als Gruppe gerechnet: Vergleichsgruppe ist „${v.faktoren[n]![0]}“`, `${name(n)} is calculated as a group: the reference group is "${v.faktoren[n]![0]}"`) });
  for (const f of v.pruefung.fehler) p.push({ art: 'sperre', text: fehlerSatz(f) });
  if (v.pruefung.fehler.length) return p;
  if (v.ausgelassen > 0) p.push({ art: 'info', text: Lp(v.ausgelassen, `${v.ausgelassen} Zeile mit einer Lücke wird ausgelassen`, `${v.ausgelassen} Zeilen mit Lücken werden ausgelassen`, `${v.ausgelassen} row with a gap is left out`, `${v.ausgelassen} rows with gaps are left out`) });
  p.push({ art: 'ok', text: L(`${Lp(v.personen, `${v.personen} Person`, `${v.personen} Personen`, `${v.personen} person`, `${v.personen} people`)} in ${Lp(v.zeilen.length, `${v.zeilen.length} Zeile`, `${v.zeilen.length} Zeilen`, `${v.zeilen.length} row`, `${v.zeilen.length} rows`)}, ${v.ereignisse} Ereignisse`, `${Lp(v.personen, `${v.personen} Person`, `${v.personen} Personen`, `${v.personen} person`, `${v.personen} people`)} in ${Lp(v.zeilen.length, `${v.zeilen.length} Zeile`, `${v.zeilen.length} Zeilen`, `${v.zeilen.length} row`, `${v.zeilen.length} rows`)}, ${v.ereignisse} events`),
    klein: L(`${v.pruefung.personenMitWechsel} Personen mit Wechsel des Werts; ${v.pruefung.ereignisseBeiWert0} Ereignisse beim Wert 0, ${v.pruefung.ereignisseBeiWert1} beim Wert 1.`, `${v.pruefung.personenMitWechsel} people with a change of the value; ${v.pruefung.ereignisseBeiWert0} events at the value 0, ${v.pruefung.ereignisseBeiWert1} at the value 1.`) });
  for (const h of v.pruefung.hinweise) p.push({ art: 'hinweis', text: pruefHinweisSatz(h, v.pruefung) });
  for (const b of coxBefunde(v.ereignisse, v.praed)) p.push({ art: b.art === 'sperre' ? 'sperre' : 'hinweis', text: b.text, klein: b.klein });
  p.push({ art: 'info', text: L('Eine zeitabhängige Größe: R wird geladen, Bindungen nach Efron', 'A time-dependent covariate: R is loaded, ties by Efron'), klein: unsterblichkeitSatz() });
  return p;
}

/** Ein Vorschlag, wenn die Wahl eingeschaltet wird: die Kennung (eine Spalte, die wie eine Kennung aussieht), der Start (eine Zahlenspalte, deren Name nach Start klingt) und die zeitabhängige Größe (die erste der gewählten Angaben). */
export function schlageZeitSpaltenVor(spalten: Spalte[], zeit: string, ereignis: string, l4: string[]): { kennung: string; start: string; wert: string } {
  const belegt = new Set([zeit, ereignis, ...l4]);
  const frei = spalten.filter(c => !belegt.has(c.name));
  const kennung = frei.find(c => istKennung(c))?.name ?? '';
  const start = frei.find(c => c.art === 'zahl' && /^(t?_?start|start_?\w*|\w*_?start|beginn\w*|von|t0|anfang\w*)$/i.test(c.name))?.name ?? '';
  return { kennung, start, wert: l4[0] ?? '' };
}
