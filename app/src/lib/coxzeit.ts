/**
 * Später S-F, Teil 2: Cox-Regression mit einer zeitabhängigen Größe (Zählprozess-Form) - der UMFORMER (Form A „ein Wechsel zu einer Zeit“), die Prüfung der Intervall-Form,
 * die Daten und der Aufruf für R. Fachblatt: docs/fachblaetter/SPAETER-F-UEBERLEBEN-MEDIZIN.md Abschnitt 2 und „Entscheidungen Opus (18.10.)“ 3. Tests: coxzeit.test.ts, engine/spaeter-f.webr.test.ts.
 *
 * Form A: je Person Ende, Ereignis (0/1) und der Zeitpunkt eines Wechsels (leer = nie). Wert 0 vor dem Wechsel, 1 ab dem Wechsel. Die Abschnitte sind links offen, rechts geschlossen: (Start, Stopp];
 * der Wert gilt AB dem Start, das Ereignis geschieht AM Stopp. Voreinstellung STRENG: ein Wechsel am Tag des Ereignisses gilt erst danach (die Person bleibt ohne Wechsel; das Ereignis gehört
 * noch zum alten Wert). Wahl „zaehlt“ (Regel der survival-Vignette `timedep`): der Wechsel wird um `vorzug` vorgezogen = die HÄLFTE DES KLEINSTEN POSITIVEN ABSTANDS zwischen verschiedenen Zeitwerten (Enden und Wechselzeiten, dazu der Beginn 0) in den Daten - so legen survival/tmerge die Ordnung fest; bei Tagen 0,5, bei Jahren ein Bruchteil; nie vor den Beginn der Beobachtung. Das entscheidet das Ergebnis (Fachblatt Befund 5).
 * Keine Form B (Messungen), keine späte Aufnahme (Linkstrunkierung). Der Umformer rechnet in JS; an R gehen nur Zahlen und eine Ganzzahl-Kennung je Person.
 * Fallgewicht: gesperrt (kaplanmeier:cox-zeitabh), der Assistent nimmt das Gewicht nicht mit (assistent:intervalle).
 */
import type { RSpalte } from '../engine/webr';
import type { CoxPraed, CoxErgebnis } from './cox';
import { rIds, rQ, rWahl, rAnzeigeName, rAnzeigeText } from '../engine/rsicher';

export interface ZpZeile { person: number; kennung: string | number; start: number; stopp: number; ereignis: 0 | 1; wert: 0 | 1; fest: Record<string, number | null> }
export interface ZpHinweise {
  personen: number; zeilen: number; ereignisse: number;
  wechselAmAnfang: number; wechselAmEnde: number; wechselNachEnde: number;
  geteilt: number; ohneWechsel: number; ausgeschlossen: number; regel: 'streng' | 'zaehlt';
}
export type ZpRegel = 'streng' | 'zaehlt';
export interface WechselEingabe { kennung: (string | number | null)[]; ende: (number | null)[]; ereignis: (number | null)[]; wechsel: (number | null)[]; fest?: Record<string, (number | null)[]> }

const zahl = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Umformer Form A: Zeilen in Zählprozess-Form (Start, Stopp, Ereignis, Wert) für Cox mit zeitabhängiger Größe. Regeln je Person: Fachblatt 2.3 (R1 bis R4, R9). */
export function umformenWechsel(e: WechselEingabe, opt: { regel?: ZpRegel } = {}): { ok: true; zeilen: ZpZeile[]; hinweise: ZpHinweise; vorzug?: number } | { ok: false; code: 'keine-personen' } {
  const regel: ZpRegel = opt.regel === 'zaehlt' ? 'zaehlt' : 'streng';
  const n = Math.min(e.kennung.length, e.ende.length, e.ereignis.length, e.wechsel.length);
  const festNamen = Object.keys(e.fest ?? {});
  const zeilen: ZpZeile[] = [];
  const vorzug = regel === 'zaehlt' ? halberAbstand(e, n) : undefined;
  const h: ZpHinweise = { personen: 0, zeilen: 0, ereignisse: 0, wechselAmAnfang: 0, wechselAmEnde: 0, wechselNachEnde: 0, geteilt: 0, ohneWechsel: 0, ausgeschlossen: 0, regel };
  for (let i = 0; i < n; i++) {
    const k = e.kennung[i], T = e.ende[i], ev = e.ereignis[i];
    if (k === null || k === undefined || k === '' || !zahl(T) || T <= 0 || (ev !== 0 && ev !== 1)) { h.ausgeschlossen++; continue; }
    h.personen++;
    const fest: Record<string, number | null> = {};
    for (const nm of festNamen) { const v = e.fest![nm]?.[i]; fest[nm] = zahl(v) ? v : null; }
    const mach = (start: number, stopp: number, ereignis: 0 | 1, wert: 0 | 1): ZpZeile => ({ person: i + 1, kennung: k, start, stopp, ereignis, wert, fest: { ...fest } });
    const w0 = e.wechsel[i];
    let w: number | null = zahl(w0) ? w0 : null;   // fehlend oder NaN = nie
    if (w !== null) {
      if (w <= 0) h.wechselAmAnfang++;
      else if (w === T) h.wechselAmEnde++;
      else if (w > T) h.wechselNachEnde++;
    }
    if (w === null || w > T || (w === T && regel === 'streng' && w > 0)) { zeilen.push(mach(0, T, ev, 0)); h.ohneWechsel++; continue; }
    if (w === T && regel === 'zaehlt') w = T - vorzug!;
    if (w <= 0) { zeilen.push(mach(0, T, ev, 1)); continue; }
    zeilen.push(mach(0, w, 0, 0), mach(w, T, ev, 1)); h.geteilt++;
  }
  if (!h.personen) return { ok: false, code: 'keine-personen' };
  h.zeilen = zeilen.length; h.ereignisse = zeilen.reduce((a, z) => a + z.ereignis, 0);
  return { ok: true, zeilen, hinweise: h, ...(vorzug !== undefined ? { vorzug } : {}) };
}

/** Die Hälfte des kleinsten positiven Abstands zwischen verschiedenen Zeitwerten (gültige Enden, Wechselzeiten, dazu 0). Ohne zwei verschiedene Werte: 0,5. */
function halberAbstand(e: WechselEingabe, n: number): number {
  const zeiten = new Set<number>([0]);
  for (let i = 0; i < n; i++) { const T = e.ende[i], w = e.wechsel[i]; if (zahl(T) && T > 0) zeiten.add(T); if (zahl(w) && w > 0) zeiten.add(w); }
  const v = [...zeiten].sort((a, b) => a - b);
  let kleinste = Infinity;
  for (let i = 1; i < v.length; i++) kleinste = Math.min(kleinste, v[i]! - v[i - 1]!);
  return Number.isFinite(kleinste) ? kleinste / 2 : 0.5;
}

/* ------------------------------------------------------------ Prüfung der Intervall-Form */

export interface IntervallZeile { kennung: string | number; start: number; stopp: number; ereignis: number; wert: number | null }
export type ZpFehlerCode = 'start-nicht-kleiner' | 'ueberlappung' | 'luecke' | 'mehrere-ereignisse' | 'ereignis-nicht-am-ende';
export type ZpHinweisCode = 'ereignisse-nur-ein-wert' | 'wenig-wechsel';
export interface IntervallPruefung { fehler: ZpFehlerCode[]; hinweise: ZpHinweisCode[]; ereignisseBeiWert0: number; ereignisseBeiWert1: number; personenMitWechsel: number }
export const ZP_MIN_WECHSEL = 5;

/**
 * Prüft die Zeilen einer Tabelle in Intervall-Form (beliebige Reihenfolge; je Person werden sie nach Start sortiert). Fehler: die Karte rechnet nicht. Hinweise: es wird gerechnet.
 * Je Fehlercode höchstens einmal, in der Reihenfolge von `ZpFehlerCode`.
 */
export function pruefeIntervalle(zeilen: IntervallZeile[]): IntervallPruefung {
  const je = new Map<string, IntervallZeile[]>();
  for (const z of zeilen) { const s = `${typeof z.kennung}:${z.kennung}`; (je.get(s) ?? je.set(s, []).get(s)!).push(z); }
  const f = new Set<ZpFehlerCode>();
  let e0 = 0, e1 = 0, mitWechsel = 0, nichtBinaer = false;
  for (const z of zeilen) { if (!(z.start < z.stopp)) f.add('start-nicht-kleiner'); if (z.wert !== null && z.wert !== 0 && z.wert !== 1) nichtBinaer = true; if (z.wert === null) nichtBinaer = true; if (z.ereignis === 1) { if (z.wert === 0) e0++; else if (z.wert === 1) e1++; } }
  for (const zs of je.values()) {
    const s = [...zs].sort((a, b) => a.start - b.start);
    for (let i = 1; i < s.length; i++) { if (s[i]!.start < s[i - 1]!.stopp) f.add('ueberlappung'); else if (s[i]!.start > s[i - 1]!.stopp) f.add('luecke'); }
    const ev = s.filter(z => z.ereignis === 1).length;
    if (ev > 1) f.add('mehrere-ereignisse'); else if (ev === 1 && s[s.length - 1]!.ereignis !== 1) f.add('ereignis-nicht-am-ende');
    if (s.some(z => z.wert !== s[0]!.wert)) mitWechsel++;
  }
  const reihenfolge: ZpFehlerCode[] = ['start-nicht-kleiner', 'ueberlappung', 'luecke', 'mehrere-ereignisse', 'ereignis-nicht-am-ende'];
  const hinweise: ZpHinweisCode[] = [];
  if (!nichtBinaer && zeilen.length && (e0 > 0) !== (e1 > 0)) hinweise.push('ereignisse-nur-ein-wert');
  if (je.size && mitWechsel < ZP_MIN_WECHSEL) hinweise.push('wenig-wechsel');
  return { fehler: reihenfolge.filter(c => f.has(c)), hinweise, ereignisseBeiWert0: e0, ereignisseBeiWert1: e1, personenMitWechsel: mitWechsel };
}

/* ------------------------------------------------------------ aus einer Tabelle in Intervall-Form */

/** Die Spalten einer Tabelle in Intervall-Form (jede Spalte gleich lang). */
export interface IntervallTabelle {
  kennung: (string | number | null)[]; start: (number | null)[]; stopp: (number | null)[]; ereignis: (number | null)[]; wert: (number | null)[];
  /** feste Größen: Zahlen, bei Gruppen-Spalten (`faktoren`) die Codes 1 … k */
  fest: Record<string, (number | null)[]>;
  /** Gruppen-Spalten unter den festen Größen: Beschriftungen der Stufen in der Reihenfolge der Codes (erste = Vergleichsgruppe) */
  faktoren?: Record<string, string[]>;
}

/**
 * Zeilen der Tabelle als `ZpZeile` (für `coxZpDaten`): die Person ist die Nummer nach der ersten Zeile der Kennung. Zeilen ohne Kennung, Start, Stopp, Ereignis (0/1) oder Wert (0/1 oder Zahl) fallen weg und werden gezählt.
 * `wert` darf eine beliebige Zahl sein (die Größe muss nicht 0/1 sein); die Form `ZpZeile.wert: 0 | 1` ist die des Umformers, hier gilt der Zahlenwert.
 */
export function zpZeilenAusTabelle(t: IntervallTabelle): { zeilen: ZpZeile[]; ausgelassen: number } {
  const nummer = new Map<string, number>(), zeilen: ZpZeile[] = [];
  let aus = 0;
  const n = t.kennung.length;
  for (let i = 0; i < n; i++) {
    const k = t.kennung[i], a = t.start[i], b = t.stopp[i], ev = t.ereignis[i], w = t.wert[i];
    if (k === null || k === undefined || k === '' || !zahl(a) || !zahl(b) || (ev !== 0 && ev !== 1) || !zahl(w)) { aus++; continue; }
    const s = `${typeof k}:${k}`;
    let p = nummer.get(s); if (p === undefined) { p = nummer.size + 1; nummer.set(s, p); }
    const fest: Record<string, number | null> = {};
    for (const nm of Object.keys(t.fest)) { const v = t.fest[nm]![i]; fest[nm] = zahl(v) ? v : null; }
    zeilen.push({ person: p, kennung: k, start: a, stopp: b, ereignis: ev, wert: w as 0 | 1, fest });
  }
  return { zeilen, ausgelassen: aus };
}

/** Die Zeilenindizes der LETZTEN Zeile jeder Person (größter Stopp): ihre Zeit und ihr Ereignis sind die der Person - für die Kaplan-Meier-Kurve neben der Cox-Rechnung. */
export function letzteZeileJePerson(kennung: (string | number | null)[], stopp: (number | null)[]): number[] {
  const letzte = new Map<string, number>();
  for (let i = 0; i < kennung.length; i++) {
    const k = kennung[i], s = stopp[i];
    if (k === null || k === undefined || k === '' || !zahl(s)) continue;
    const key = `${typeof k}:${k}`, alt = letzte.get(key);
    if (alt === undefined || s > (stopp[alt] as number)) letzte.set(key, i);
  }
  return [...letzte.values()].sort((a, b) => a - b);
}

/** Was zur Rechnung gehört, aber nicht in R vorkommt: Zahl der Personen (R zählt sie aus den Zeilen im Modell; hier die der Tabelle), die Spalten der Tabelle in Intervall-Form, ob die Größe 0/1 ist. */
export interface CoxZeitInfo { personen: number; zeilen: number; start: string; stopp: string; kennung: string; wertName: string; binaer: boolean; wechselPersonen: number }
/** Das gespeicherte Ergebnis der Karte: die Cox-Antwort aus R (Namen p01 … sind schon den Spalten zugeordnet) und die Angaben dazu. */
export interface CoxZeitErgebnis { cox: CoxErgebnis; info: CoxZeitInfo }

/* ------------------------------------------------------------ Daten und Aufruf für R */

const rName = (k: number) => `p${String(k + 1).padStart(2, '0')}`;

/**
 * Die Daten für R: feste Namen id (Ganzzahl-Kennung der Person), start, stopp, ereignis, p01 (die zeitabhängige Größe), p02 … (feste Größen in der Reihenfolge `festNamen`).
 * Die Anzeigenamen stehen nur in `praed`, nie im R-Code. Fehlende Werte bleiben fehlend (R rechnet listenweise).
 */
export function coxZpDaten(zeilen: ZpZeile[], opt: { wertName: string; festNamen: string[]; faktoren?: Record<string, string[]> }): { spalten: RSpalte[]; praed: CoxPraed[]; personen: number } {
  const sp = (name: string, werte: (number | null)[]): RSpalte => ({ name, art: 'zahl', werte });
  const spalten: RSpalte[] = [sp('id', zeilen.map(z => z.person)), sp('start', zeilen.map(z => z.start)), sp('stopp', zeilen.map(z => z.stopp)), sp('ereignis', zeilen.map(z => z.ereignis)), sp(rName(0), zeilen.map(z => z.wert))];
  // Gruppen-Spalten (Faktoren): die Werte der festen Größe sind Codes 1 … k, `faktoren[name]` die Beschriftungen der Stufen in dieser Reihenfolge (erste = Vergleichsgruppe)
  opt.festNamen.forEach((nm, k) => {
    const werte = zeilen.map(z => z.fest[nm] ?? null), st = opt.faktoren?.[nm];
    spalten.push(st ? { name: rName(k + 1), art: 'faktor', werte, labels: st.map((label, i) => ({ wert: i + 1, label })) } : sp(rName(k + 1), werte));
  });
  const praed: CoxPraed[] = [{ name: opt.wertName, art: 'zahl' as const, stufen: [] }, ...opt.festNamen.map(name => (opt.faktoren?.[name] ? { name, art: 'faktor' as const, stufen: [...opt.faktoren[name]!] } : { name, art: 'zahl' as const, stufen: [] }))];
  return { spalten, praed, personen: new Set(zeilen.map(z => z.person)).size };
}

/** Der Aufruf von `sp_cox_zp` (engine/statable-ueberleben.R); Fehler kommen als `list(fehler = …)`. Im Code stehen nur feste Wörter und Bezeichner (id, start, stopp, ereignis, p01 …). */
export function coxZpAufruf(dt: Pick<ReturnType<typeof coxZpDaten>, 'praed'>, ties: 'efron' | 'breslow' = 'efron'): string {
  const namen = dt.praed.map((_, k) => rName(k)), faktoren = dt.praed.flatMap((p, k) => (p.art === 'faktor' ? [rName(k)] : []));
  return `tryCatch(sp_cox_zp(d, ${rQ('start')}, ${rQ('stopp')}, ${rQ('ereignis')}, ${rQ('id')}, ${rIds(namen)}, ${rIds(faktoren)}, ${rWahl(ties, ['efron', 'breslow'] as const)}), error = function(e) list(fehler = conditionMessage(e)))`;
}

/** Der gleiche Aufruf in R zum Ansehen („Befehl“, Bericht): wird nie ausgeführt; Namen aus den Daten nur über rAnzeigeName. */
export function coxZpRCode(e: { start: string; stopp: string; ereignis: string; praed: string[]; ties?: 'efron' | 'breslow'; faktoren?: Record<string, string[]> }, T: (de: string, en: string) => string): string {
  const rn = rAnzeigeName, rq = rAnzeigeText;
  const gruppen = Object.entries(e.faktoren ?? {}).map(([n, st]) => `daten$${rn(n)} <- factor(daten$${rn(n)}, levels = c(${st.map(rq).join(', ')}))   # ${T('erste Stufe = Vergleichsgruppe', 'first level = reference group')}`);
  return [
    T('# Der gleiche Aufruf in R (Paket survival), Zählprozess-Form: eine Zeile je Person und Abschnitt (Start, Stopp]', '# The same call in R (package survival), counting-process form: one row per person and interval (start, stop]'), 'library(survival)', ...gruppen,
    `m <- coxph(Surv(${rn(e.start)}, ${rn(e.stopp)}, ${rn(e.ereignis)}) ~ ${e.praed.map(p => rn(p)).join(' + ')}, data = daten, ties = '${e.ties === 'breslow' ? 'breslow' : 'efron'}')   # ${T('Bindungen nach Efron (R-Voreinstellung)', 'ties by Efron (R default)')}`,
    `summary(m)   # ${T('B, SE, HR = exp(B); Statable nimmt für p und KI den Wald-Test (qnorm(.975))', 'B, SE, HR = exp(B); Statable uses the Wald test (qnorm(.975)) for p and CI')}`,
    `cox.zph(m, transform = 'km', terms = TRUE)   # ${T('Prüfung der proportionalen Hazards (nur ein Anhaltspunkt bei zeitabhängigen Größen)', 'check of proportional hazards (only a guide with time-dependent covariates)')}`
  ].join('\n');
}
