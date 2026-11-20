/**
 * Mehrebenen-Modelle (gemischte lineare Modelle, R: lme4 + lmerTest über webR) - Typen, Erkennung einer Gruppierungsspalte,
 * Daten für R und Lesen der R-Antwort. Die Rechnung selbst steht in engine/statable.R (sp_mehrebenen), der Aufruf in rverfahren.svelte.ts.
 *
 * Aufbau nach den Programmen und Lehrbüchern (nachgesehen 08.10.2026): jamovi (GAMLj „Mixed Model“) und JASP („Linear Mixed Models“, lme4/afex) rechnen
 * lmer mit REML, geben feste Effekte mit Satterthwaite-Freiheitsgraden (lmerTest) und die Varianzen der Zufallseffekte aus; GAMLj zeigt außerdem ICC und R² marginal/konditional.
 * Lehrbücher der Bildungsforschung (Hox, Moerbeek & van de Schoot; Snijders & Bosker; Raudenbush & Bryk) beginnen mit dem Nullmodell (ICC), dann folgt das
 * Random-Intercept-Modell mit Prädiktoren, erst danach das Random-Slope-Modell. Statable macht es genauso: Nullmodell und Modell mit Prädiktoren in einem Schritt, die zufällige Steigung nur für Fachleute.
 *
 * ⚠ Von der Fachperson abzunehmen: die Schwellen der Erkennung (5 bis 200 Gruppen, im Schnitt mindestens 2 Fälle), die Hinweise „unter 10 Gruppen“ und „ICC ab ,05 / Designeffekt ab 2“ (Faustregeln).
 */
import { istFehlend } from './fehlend';
import type { Spalte } from './verzeichnis';
import type { RSpalte } from '../engine/webr';
import { rAnzeigeName } from '../engine/rsicher';

export const R_PAKETE_MEB = ['lme4', 'lmerTest'];

/** Faustregeln (⚠ Fachperson): unter dieser Zahl von Gruppen sind Varianzen der Gruppen-Ebene sehr unsicher; ab dieser Zahl gilt die Gruppen-Ebene als ausreichend (Maas & Hox 2005: 30). */
export const MEB_GRUPPEN_WENIG = 10;
export const MEB_GRUPPEN_GUT = 30;
/** Ab diesem ICC oder Designeffekt lohnt ein Mehrebenenmodell (Faustregel; Designeffekt > 2 nach Muthén & Satorra 1995). */
export const MEB_ICC_SCHWELLE = 0.05;
export const MEB_DEFF_SCHWELLE = 2;

/** Zentrieren (Field-Stufe 2b): keine, am Gesamtmittel oder am Gruppenmittel (dann zwei Größen je Zahlen-Spalte: Abweichung vom Gruppenmittel = innerhalb, Gruppenmittel = zwischen). */
export type MebZentrierung = 'keine' | 'gesamt' | 'gruppe';
/** Eine Größe im Modell, die aus einer Spalte der Daten entsteht: `rolle` nur bei Gruppenmittel-Zentrierung. */
export interface MebTeil { quelle: string; rolle?: 'innerhalb' | 'zwischen' }
/** `teile`: nur bei abgeleiteten Größen - eine (innerhalb/zwischen) oder zwei (Produkt, Wechselwirkung); dann ist `name` nur eine Kennung, angezeigt wird `praedName` (mehrebenensaetze.ts). */
export interface MebPraed { name: string; art: 'zahl' | 'faktor'; /** Stufen (Beschriftungen), die erste ist die Vergleichsgruppe */ stufen: string[]; teile?: MebTeil[]; /** Gruppen-Ebene: bei Gruppenmittel-Zentrierung eine Spalte, die innerhalb jeder Gruppe gleich ist (bleibt unverändert) */ gruppenEbene?: boolean }
export interface MebFest { pIdx: number; stufe: string; b: number; se: number; df: number; t: number; p: number; lo: number; hi: number }
export interface MebGruppe { name: string; n: number; mittel: number; abw: number; se: number }
export interface MebTest { pIdx: number; f: number; df1: number; df2: number; p: number }
export interface Mehrebenen {
  art: 'mehrebenen';
  y: string; gruppe: string; praed: MebPraed[]; steigung: string; zentriert: boolean;
  /** Zweite Gruppierung (gekreuzte Zufallseffekte, z. B. Personen × Reize; fehlt in älteren Ergebnissen und ohne zweite Gruppierung): nur zufällige Achsenabschnitte. `gekreuzt` false = geschachtelt erkannt (jede Stufe nur innerhalb einer Stufe der ersten Gruppierung). */
  gruppe2?: string; gekreuzt?: boolean; ng2?: number; gn2Min?: number; gn2Max?: number;
  /** Varianz und Anteil der zweiten Gruppierung im Nullmodell (`nullTau2`, `nullIcc2`) und im Modell (`tau2`, `iccVoll2`); der Anteil je Gruppierung ist τ²g / (τ²1 + τ²2 + σ²). */
  nullTau2?: number; nullIcc2?: number; tau2?: number; iccVoll2?: number;
  /** Field-Stufe 2b (fehlt in älteren Ergebnissen): Art des Zentrierens, Wechselwirkungen (Produkt zweier Größen) und die gewählten Spalten vor allem Zentrieren/Produkten. */
  zentrierArt?: MebZentrierung; wechsel?: [MebTeil, MebTeil][]; praedOrig?: string[]; zentrierSpalten?: string[];
  n: number; nAlle: number; ng: number; gnMin: number; gnMed: number; gnMax: number; gnMittel: number; yMittel: number; ySd: number;
  /** Nullmodell */
  nullTau: number; nullSigma: number; nullIcc: number; nullKonst: number; nullKonstSe: number; nullKonstDf: number; deff: number;
  /** Modell mit Prädiktoren (ohne Prädiktoren: das Nullmodell) */
  mitPraed: boolean; fest: MebFest[]; tests: MebTest[]; tau: number; sigma: number; iccVoll: number; r2m: number; r2c: number;
  tauSteigung?: number; korAchSteig?: number; aufgeklaert1?: number; aufgeklaert2?: number; /** nur mit zweiter Gruppierung: erklärte Varianz zwischen deren Stufen */ aufgeklaert3?: number;
  gruppen: MebGruppe[];
  singular: boolean; nullSingular: boolean; konv: boolean; meldungen: string[];
  /** Ja/Nein-Ergebnis (S-H): verallgemeinertes gemischtes Modell (glmer, Logit). Dann sind `b` Log-Odds, `t` der Wald-z-Wert, `df` und `deff` fehlen (NaN), `nullSigma`/`sigma` = π²/3. */
  binaer?: boolean;
  /** Der Wert, der als Ereignis zählt (der größere der zwei Werte), als Beschriftung */
  ereignis?: string;
}

/* ------------------------------------------------------------ Erkennung einer Gruppierungsspalte */

export interface GruppenVorschlag { spalte: string; gruppen: number; mittel: number; weil: 'name' | 'kennung' }
export const MEB_MIN_GRUPPEN = 5, MEB_MAX_GRUPPEN = 200;
// Mit den Wörtern der 13 weiteren Sprachen (Übungsdateien heißen seit 29.10. in jeder Sprache anders: classe, τάξη, клас, csoport …).
const NAME = /(klass|schul|gruppe|seminar|kurs|cluster|school|class|group|team|kita|lehrkraft|lehrer|teacher|clase|clasă|clasa|klas|turma|třída|trieda|osztály|τάξη|τμήμα|клас|grupo|gruppo|groep|grupp|grup|skupina|csoport|ομάδα|груп|école|ecole|escuela|escola|scuola|skola|szkoła|škola|iskola|σχολ|школ|училищ|enseignant|profesor|docente|insegnante|leraar|lärare|nauczyciel|učitel|tanár|δάσκαλ|учител|вчител)/iu;
const KENNUNG = /(^|[^a-zäöüß])(id|nr|code|kennung|kennzahl|nummer|proband|vp)([^a-zäöüß]|$)/i;
/** Messgrößen, die nur „Schule“, „Klasse“, „Kurs“ … im Namen tragen („Fehltage im Schuljahr“, „Schulnote“, „Klassengröße“), sind keine Gruppierung (Abschlusstest 10.10.). */
const MESSGROESSE = /(tag|jahr|note|noten|gr(ö|oe)(ß|ss)e|anzahl|zahl|punkt|alter|dauer|minute|stunde|zeit|eintritt|weg|entfernung|kosten|days|year|grade|size|count|number of|score|points|age|duration|time|taille|tamaño|dimensione|tamanho|grootte|storlek|mărime|wielkość|velikost|méret|μέγεθος|размер|розмір|nombre|número|numero|aantal|antal|număr|liczba|počet|létszám|αριθμός|кількість|брой|âge|edad|età|idade|leeftijd|ålder|vârstă|wiek|věk|életkor|ηλικία|вік|възраст)/iu;

/** Findet die wahrscheinlichste Gruppierungsspalte: Name wie klasse/schule/gruppe/seminar, oder eine Kennung (id, nr, code …) mit 5 bis 200 verschiedenen Werten
 *  und im Schnitt mindestens zwei Fällen je Wert (eine Nummer, die in jeder Zeile anders ist, ist keine Gruppierung). `ausser`: Spalten, die in der Frage schon vorkommen. */
export function erkenneGruppierung(spalten: Spalte[], zeilen: (string | number | null)[][], ausser: string[] = []): GruppenVorschlag | null {
  const treffer: (GruppenVorschlag & { rang: number })[] = [];
  spalten.forEach((sp, i) => {
    if (ausser.includes(sp.name) || sp.art === 'datum') return;
    const text = `${sp.name} ${sp.bezeichnung}`;
    const weil = NAME.test(text) && !MESSGROESSE.test(text.replace(KENNUNG, ' ')) ? 'name' : KENNUNG.test(sp.name) ? 'kennung' : null;
    if (!weil) return;
    const zaehl = new Map<string | number, number>();
    for (const z of zeilen) { const v = z[i]; if (v === null || v === undefined || v === '' || (typeof v === 'number' && istFehlend(sp, v))) continue; zaehl.set(v, (zaehl.get(v) ?? 0) + 1); }
    const k = zaehl.size, n = [...zaehl.values()].reduce((a, b) => a + b, 0);
    if (k < MEB_MIN_GRUPPEN || k > MEB_MAX_GRUPPEN || n / k < 2) return;
    treffer.push({ spalte: sp.name, gruppen: k, mittel: n / k, weil, rang: weil === 'name' ? 0 : 1 });
  });
  treffer.sort((a, b) => a.rang - b.rang);
  const t = treffer[0];
  return t ? { spalte: t.spalte, gruppen: t.gruppen, mittel: t.mittel, weil: t.weil } : null;
}

/* ------------------------------------------------------------ Wachstumsmodell erkennen (Field-Stufe 2b) */

const ZEIT = /(zeit|time|wave|welle|messzeit|messung|measure|occasion|session|woche|week|monat|month|tag\b|day|jahr|year|alter|age|trial|durchgang|visit|termin)/iu;
export interface WachstumsVorschlag { gruppe: string; zeit: string; messungenJeGruppe: number }
/** Sind die Daten Person × Zeitpunkt in langer Form? Dann gibt es eine Zahlen-Spalte, die wie ein Zeitpunkt heißt, in den Gruppen (Personen) variiert und von mindestens drei Messungen je Person im Mittel begleitet wird.
 *  Nur ein Hinweis (die Rechnung gibt es: zufällige Steigung der Zeit je Person). `praed`: die gewählten Erklärungsspalten, `ausser`: nichts weiter. */
export function erkenneWachstum(spalten: Spalte[], zeilen: (string | number | null)[][], gruppe: string, praed: string[]): WachstumsVorschlag | null {
  const ig = spalten.findIndex(s => s.name === gruppe);
  if (ig < 0) return null;
  for (const n of praed) {
    const sp = spalten.find(s => s.name === n), i = spalten.findIndex(s => s.name === n);
    if (!sp || sp.art !== 'zahl' || !ZEIT.test(`${sp.name} ${sp.bezeichnung}`)) continue;
    const jeGruppe = new Map<string | number, Set<number>>(), anzahl = new Map<string | number, number>();
    for (const z of zeilen) { const g = z[ig], v = z[i]; if (g === null || g === undefined || g === '' || typeof v !== 'number' || istFehlend(sp, v)) continue; const m = jeGruppe.get(g) ?? new Set<number>(); m.add(v); jeGruppe.set(g, m); anzahl.set(g, (anzahl.get(g) ?? 0) + 1); }
    const k = jeGruppe.size; if (k < MEB_MIN_GRUPPEN) continue;
    const mittel = [...anzahl.values()].reduce((a, b) => a + b, 0) / k;
    const variiert = [...jeGruppe.values()].filter(m => m.size >= 2).length / k;
    if (mittel >= 3 && variiert >= 0.8) return { gruppe, zeit: n, messungenJeGruppe: mittel };
  }
  return null;
}

/* ------------------------------------------------------------ gekreuzt oder geschachtelt */

/** Zwei Gruppierungen: Liegt jede Stufe der einen nur innerhalb einer Stufe der anderen (in beide Richtungen geprüft: Schüler in Klassen oder Klassen in Schulen), ist es geschachtelt;
 *  sonst gekreuzt (Personen × Reize: jede Person sieht viele Reize, jeder Reiz wird von vielen Personen gesehen). Zeilen mit Lücken (null) zählen nicht. */
export function erkenneKreuzung(g1: (string | null)[], g2: (string | null)[]): 'gekreuzt' | 'geschachtelt' {
  const liegtIn = (x: (string | null)[], y: (string | null)[]) => {
    const innerhalb = new Map<string, string>();
    for (let i = 0; i < x.length; i++) {
      const a = x[i], b = y[i];
      if (a === null || a === undefined || b === null || b === undefined) continue;
      const vorher = innerhalb.get(b);
      if (vorher === undefined) innerhalb.set(b, a); else if (vorher !== a) return false;
    }
    return true;
  };
  return liegtIn(g1, g2) || liegtIn(g2, g1) ? 'geschachtelt' : 'gekreuzt';
}

/* ------------------------------------------------------------ Daten für R */

const gueltig = (v: unknown, sp: Spalte | undefined): v is string | number => v !== null && v !== undefined && v !== '' && !(typeof v === 'number' && istFehlend(sp, v));
/** Ein Prädiktor ist ein Faktor (Gruppen), wenn er Text ist, Wertebeschriftungen hat oder nominal ist - und höchstens 12 Stufen hat. Zwei Stufen ohne Beschriftung und ohne Niveau „nominal“ bleiben eine Zahl. */
export function praedAlsFaktor(sp: Spalte, stufen: number): boolean {
  if (stufen > 12) return false;
  if (sp.art === 'text') return true;
  return Object.keys(sp.werteLabels).length > 0 || sp.niveau === 'nominal';
}

/** `zentrierSpalten`: welche Zahlen-Spalten zentriert werden (fehlt: alle). Bei Gruppenmittel-Zentrierung bleibt eine Spalte, die in keiner Gruppe variiert (eine Größe der Gruppen-Ebene wie „Schulart“), unverändert: ihre Abweichung vom Gruppenmittel wäre überall 0. */
export interface MebDatenOpt { zentrieren?: MebZentrierung; wechsel?: [MebTeil, MebTeil][]; zentrierSpalten?: string[]; /** zweite Gruppierung (gekreuzt): eine Text-Spalte `g2` hinter den Prädiktoren */ gruppe2?: string }
/** Die Kennung einer abgeleiteten Größe (nie ein Spaltenname der Daten). */
const teilKennung = (t: MebTeil) => (t.rolle ? `${t.quelle}\u2063${t.rolle}` : t.quelle);

/**
 * Daten für R. Zentrieren und Produkte entstehen hier (nicht in R): nur auf den vollständigen Fällen (Messwert, Gruppe und alle gewählten Spalten gültig - wie R `complete.cases`),
 * Gesamtmittel = Mittel dieser Fälle, Gruppenmittel = Mittel der Fälle der Gruppe (Rohwerte). Gruppenmittel-Zentrierung ersetzt jede Zahlen-Spalte durch zwei Größen:
 * Abweichung vom Gruppenmittel (innerhalb) und Gruppenmittel (zwischen). Produkte (Wechselwirkungen, auch über die Ebenen) nehmen die Größen, wie sie im Modell stehen
 * (nach dem Zentrieren; Gruppen-Spalte mit zwei Stufen als 0/1, zweite Stufe = 1); eine Gruppen-Spalte mit mehr als zwei Stufen geht nicht in ein Produkt.
 */
export function mebDaten(y: string, gruppe: string, praed: string[], zeilen: (string | number | null)[][], spalten: Spalte[], opt: MebDatenOpt = {}): { spalten: RSpalte[]; praed: MebPraed[]; /** nur mit zweiter Gruppierung */ kreuzung?: 'gekreuzt' | 'geschachtelt' } {
  const sp = (n: string) => spalten.find(x => x.name === n);
  const ix = (n: string) => spalten.findIndex(x => x.name === n);
  const beschr = (n: string, v: string | number) => sp(n)?.werteLabels[String(v)] ?? String(v);
  const zahl = (n: string) => { const i = ix(n), s = sp(n); return zeilen.map(z => (typeof z[i] === 'number' && gueltig(z[i], s) ? (z[i] as number) : null)); };
  const art = opt.zentrieren ?? 'keine';
  const out: RSpalte[] = [{ name: 'y', art: 'zahl', werte: zahl(y) }];
  const ig = ix(gruppe), sg = sp(gruppe);
  const gWerte = zeilen.map(z => (gueltig(z[ig], sg) ? beschr(gruppe, z[ig] as string | number) : null));
  out.push({ name: 'g', art: 'text', werte: gWerte });
  // Grundgrößen: je gewählte Spalte eine Zahl oder ein Faktor (Codes 1 … k)
  interface Basis { n: string; info: MebPraed; faktor: boolean; werte: (number | null)[]; labels?: { wert: number; label: string }[] }
  const basis: Basis[] = praed.map(n => {
    const i = ix(n), s = sp(n)!;
    const roh = zeilen.map(z => z[i]).filter((v): v is string | number => gueltig(v, s));
    const verschieden = [...new Set(roh)].sort((a, b) => (typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b), 'de')));
    if (praedAlsFaktor(s, verschieden.length)) {
      // Faktor: Codes 1 … k in der Reihenfolge der Werte (kleinster Wert bzw. alphabetisch zuerst = Vergleichsgruppe)
      const code = new Map(verschieden.map((v, j) => [v, j + 1]));
      return { n, faktor: true, info: { name: n, art: 'faktor', stufen: verschieden.map(v => beschr(n, v)) }, werte: zeilen.map(z => (gueltig(z[i], s) ? code.get(z[i] as string | number)! : null)), labels: verschieden.map((v, j) => ({ wert: j + 1, label: beschr(n, v) })) };
    }
    return { n, faktor: false, info: { name: n, art: 'zahl', stufen: [] }, werte: zahl(n) };
  });
  // vollständige Fälle
  const yw = out[0]!.werte as (number | null)[];
  const g2Werte: (string | null)[] | null = opt.gruppe2 ? (() => { const i2 = ix(opt.gruppe2!), s2 = sp(opt.gruppe2!); return zeilen.map(z => (gueltig(z[i2], s2) ? beschr(opt.gruppe2!, z[i2] as string | number) : null)); })() : null;
  const komplett = zeilen.map((_, r) => yw[r] !== null && gWerte[r] !== null && (g2Werte === null || g2Werte[r] !== null) && basis.every(b => b.werte[r] !== null));
  const mittel = (w: (number | null)[], wahl: (r: number) => boolean) => { let s = 0, k = 0; w.forEach((v, r) => { if (v !== null && wahl(r)) { s += v; k++; } }); return k ? s / k : NaN; };
  // Größen des Modells
  interface Groesse { name: string; info: MebPraed; werte: (number | null)[]; faktor?: Basis; teil: MebTeil }
  const groessen: Groesse[] = [];
  for (const b of basis) {
    if (b.faktor) { groessen.push({ name: b.n, info: b.info, werte: b.werte, faktor: b, teil: { quelle: b.n } }); continue; }
    const zentriere = art !== 'keine' && (opt.zentrierSpalten === undefined || opt.zentrierSpalten.includes(b.n));
    const nurZwischen = art === 'gruppe' && zentriere && (() => { const erst = new Map<string, number>(); return b.werte.every((v, r) => { if (v === null || !komplett[r]) return true; const k = gWerte[r]!; if (!erst.has(k)) { erst.set(k, v); return true; } return erst.get(k) === v; }); })();
    if (nurZwischen) b.info.gruppenEbene = true;
    if (!zentriere || nurZwischen) groessen.push({ name: b.n, info: b.info, werte: b.werte, teil: { quelle: b.n } });
    else if (art === 'gruppe') {
      const gm = new Map<string, number>(), gs = new Map<string, { s: number; k: number }>();
      b.werte.forEach((v, r) => { if (v !== null && komplett[r]) { const q = gs.get(gWerte[r]!) ?? { s: 0, k: 0 }; q.s += v; q.k++; gs.set(gWerte[r]!, q); } });
      for (const [k, q] of gs) gm.set(k, q.s / q.k);
      const innen = { quelle: b.n, rolle: 'innerhalb' as const }, zwischen = { quelle: b.n, rolle: 'zwischen' as const };
      groessen.push({ name: teilKennung(innen), info: { name: teilKennung(innen), art: 'zahl', stufen: [], teile: [innen] }, werte: b.werte.map((v, r) => (v !== null && komplett[r] ? v - gm.get(gWerte[r]!)! : v === null ? null : null)), teil: innen });
      groessen.push({ name: teilKennung(zwischen), info: { name: teilKennung(zwischen), art: 'zahl', stufen: [], teile: [zwischen] }, werte: b.werte.map((v, r) => (v !== null && komplett[r] ? gm.get(gWerte[r]!)! : null)), teil: zwischen });
    } else {
      const m = mittel(b.werte, r => komplett[r]!);
      groessen.push({ name: b.n, info: b.info, werte: b.werte.map(v => (v === null ? null : v - m)), teil: { quelle: b.n } });
    }
  }
  // Produkte
  const findeGroesse = (t: MebTeil): Groesse | undefined => groessen.find(g => g.teil.quelle === t.quelle && (art !== 'gruppe' || g.faktor || !g.teil.rolle || g.teil.rolle === (t.rolle ?? 'innerhalb')));
  const produkte: Groesse[] = [];
  for (const [ta, tb] of opt.wechsel ?? []) {
    const ga = findeGroesse(ta), gb = findeGroesse(tb);
    if (!ga || !gb || ga === gb) continue;
    if ((ga.faktor && ga.info.stufen.length !== 2) || (gb.faktor && gb.info.stufen.length !== 2)) continue;
    const kennung = `${ga.name}\u2062${gb.name}`;
    if (produkte.some(q => q.name === kennung || q.name === `${gb.name}\u2062${ga.name}`)) continue;
    const wert = (g: Groesse, r: number) => { const v = g.werte[r]; return v === null || v === undefined ? null : g.faktor ? v - 1 : v; };
    const teile = [ga.teil, gb.teil];
    produkte.push({ name: kennung, info: { name: kennung, art: 'zahl', stufen: [], teile }, werte: zeilen.map((_, r) => { const a = wert(ga, r), b = wert(gb, r); return a === null || b === null ? null : a * b; }), teil: { quelle: kennung } });
  }
  const infos: MebPraed[] = [];
  [...groessen, ...produkte].forEach((g, k) => {
    const rname = `p${String(k + 1).padStart(2, '0')}`;
    if (g.faktor) out.push({ name: rname, art: 'faktor', werte: g.werte, labels: g.faktor.labels! });
    else out.push({ name: rname, art: 'zahl', werte: g.werte });
    infos.push(g.info);
  });
  if (g2Werte) {
    out.push({ name: 'g2', art: 'text', werte: g2Werte });
    return { spalten: out, praed: infos, kreuzung: erkenneKreuzung(gWerte.map((v, r) => (komplett[r] ? v : null)), g2Werte.map((v, r) => (komplett[r] ? v : null))) };
  }
  return { spalten: out, praed: infos };
}

/* ------------------------------------------------------------ R-Antwort lesen */

const arr = <T>(x: unknown): T[] => (x == null ? [] : Array.isArray(x) ? (x as T[]) : [x as T]);
const num = (x: unknown): number => { const v = arr<number | null>(x)[0]; return typeof v === 'number' && Number.isFinite(v) ? v : NaN; };
const nums = (x: unknown): number[] => arr<number | null>(x).map(v => (typeof v === 'number' ? v : NaN));
const wahr = (x: unknown) => arr<boolean>(x)[0] === true;

export function mebLesen(r: Record<string, unknown>, kopf: { y: string; gruppe: string; gruppe2?: string; gekreuzt?: boolean; praed: MebPraed[]; steigung: string; zentriert: boolean; ereignis?: string; zentrierArt?: MebZentrierung; wechsel?: [MebTeil, MebTeil][]; praedOrig?: string[]; zentrierSpalten?: string[] }): Mehrebenen {
  const names = arr<string>(r.fest_name), term = nums(r.fest_term), b = nums(r.fest_b), se = nums(r.fest_se), df = nums(r.fest_df), t = nums(r.fest_t), p = nums(r.fest_p), lo = nums(r.fest_lo), hi = nums(r.fest_hi);
  const fest: MebFest[] = names.map((nm, i) => {
    const pIdx = term[i]! - 1, info = kopf.praed[pIdx], rname = `p${String(pIdx + 1).padStart(2, '0')}`;
    return { pIdx, stufe: info?.art === 'faktor' ? (nm === rname ? info.stufen[1] ?? '' : nm.slice(rname.length)) : '', b: b[i]!, se: se[i]!, df: df[i]!, t: t[i]!, p: p[i]!, lo: lo[i]!, hi: hi[i]! };
  });
  const an = arr<string>(r.an_term), af = nums(r.an_f), a1 = nums(r.an_df1), a2 = nums(r.an_df2), ap = nums(r.an_p);
  const tests: MebTest[] = an.map((nm, i) => ({ pIdx: Number(nm.slice(1)) - 1, f: af[i]!, df1: a1[i]!, df2: a2[i]!, p: ap[i]! }));
  const gn = arr<string>(r.gruppe), gnn = nums(r.gruppe_n), gm = nums(r.gruppe_mittel), ga = nums(r.gruppe_abw), gs = nums(r.gruppe_se);
  const m: Mehrebenen = {
    art: 'mehrebenen', ...kopf,
    n: num(r.n), nAlle: num(r.n_alle), ng: num(r.ng), gnMin: num(r.gn_min), gnMed: num(r.gn_med), gnMax: num(r.gn_max), gnMittel: num(r.gn_mittel), yMittel: num(r.y_mittel), ySd: num(r.y_sd),
    nullTau: num(r.null_tau), nullSigma: num(r.null_sigma), nullIcc: num(r.null_icc), nullKonst: num(r.null_const), nullKonstSe: num(r.null_const_se), nullKonstDf: num(r.null_const_df), deff: num(r.deff),
    mitPraed: wahr(r.mit_praed), fest, tests, tau: num(r.tau), sigma: num(r.sigma), iccVoll: num(r.icc_voll), r2m: num(r.r2_m), r2c: num(r.r2_c),
    gruppen: gn.map((name, i) => ({ name, n: gnn[i]!, mittel: gm[i]!, abw: ga[i]!, se: gs[i]! })),
    singular: wahr(r.singular), nullSingular: wahr(r.null_singular), konv: wahr(r.konv), meldungen: arr<string>(r.meldungen)
  };
  if (wahr(r.binaer)) m.binaer = true;
  if (kopf.gruppe2 && r.null_tau2 !== undefined) {
    m.nullTau2 = num(r.null_tau2); m.nullIcc2 = num(r.null_icc2); m.tau2 = num(r.tau2); m.iccVoll2 = num(r.icc_voll2); m.ng2 = num(r.ng2); m.gn2Min = num(r.gn2_min); m.gn2Max = num(r.gn2_max);
  } else { delete m.gruppe2; delete m.gekreuzt; }
  if (kopf.steigung) { m.tauSteigung = num(r.tau_steigung); m.korAchSteig = num(r.kor_ach_steig); }
  if (m.mitPraed) { m.aufgeklaert1 = num(r.aufgeklaert_1); m.aufgeklaert2 = num(r.aufgeklaert_2); if (m.gruppe2 !== undefined && r.aufgeklaert_3 !== undefined) m.aufgeklaert3 = num(r.aufgeklaert_3); }
  return m;
}

/** Dieser Prädiktor darf eine zufällige Steigung bekommen: eine Zahl oder ein Faktor mit zwei Stufen. */
export const steigungMoeglich = (p: MebPraed) => p.art === 'zahl' || p.stufen.length === 2;

/** Der R-Aufruf zum Nachrechnen (mit den Einstellungen des Blatts). `T` wählt die Sprache der Kommentare. */
export function mebRCode(e: Mehrebenen, T: (de: string, en: string) => string): string {
  // Nur zum Anzeigen (wird nie ausgeführt, aber vielleicht in RStudio eingefügt): Namen aus den Daten werden maskiert (engine/rsicher.ts).
  const zahlTeil = (tl: MebTeil) => (tl.rolle ? rAnzeigeName(`${tl.quelle}_${tl.rolle === 'innerhalb' ? 'innerhalb' : 'zwischen'}`) : e.zentrierArt === 'gesamt' && (!e.zentrierSpalten || e.zentrierSpalten.includes(tl.quelle)) && e.praed.some(p => !p.teile && p.name === tl.quelle && p.art === 'zahl') ? `scale(${rAnzeigeName(tl.quelle)}, scale = FALSE)` : rAnzeigeName(tl.quelle));
  const rhs = e.praed.map(p => {
    if (p.teile) return p.teile.map(zahlTeil).join(':');
    return e.zentrierArt === 'gesamt' ? (p.art === 'zahl' ? zahlTeil({ quelle: p.name }) : rAnzeigeName(p.name)) : (e.zentriert && p.art === 'zahl' ? `scale(${rAnzeigeName(p.name)}, scale = FALSE)` : rAnzeigeName(p.name));
  }).join(' + ');
  // Gruppenmittel-Zentrierung: die beiden Größen je Spalte entstehen vor dem Modell
  const quellen = [...new Set(e.praed.flatMap(p => (p.teile?.length === 1 && p.teile[0]!.rolle ? [p.teile[0]!.quelle] : [])))];
  const vorbereitung = quellen.length ? [T('# Gruppenmittel-Zentrierung: Abweichung vom Gruppenmittel (innerhalb) und Gruppenmittel (zwischen)', '# Group mean centering: deviation from the group mean (within) and the group mean (between)'),
    ...quellen.flatMap(q => [`daten$${rAnzeigeName(`${q}_zwischen`)} <- ave(daten$${rAnzeigeName(q)}, daten$${rAnzeigeName(e.gruppe)})`, `daten$${rAnzeigeName(`${q}_innerhalb`)} <- daten$${rAnzeigeName(q)} - daten$${rAnzeigeName(`${q}_zwischen`)}`])] : [];
  if (e.binaer) {
    const ereignisAus = `${rAnzeigeName(e.y)} == max(${rAnzeigeName(e.y)}, na.rm = TRUE)`;
    return [
      T('# Der gleiche Aufruf in R (Paket lme4, Ja/Nein-Ergebnis; Ereignis = der größere Wert):', '# The same call in R (package lme4, yes/no outcome; event = the larger value):'),
      'library(lme4)',
      `m0 <- glmer((${ereignisAus}) ~ 1 + (1 | ${rAnzeigeName(e.gruppe)}), data = daten, family = binomial)   # ${T('Nullmodell: latenter ICC = τ² / (τ² + π²/3)', 'null model: latent ICC = τ² / (τ² + π²/3)')}`,
      ...(e.mitPraed ? [`m1 <- glmer((${ereignisAus}) ~ ${rhs} + (1 | ${rAnzeigeName(e.gruppe)}), data = daten, family = binomial)`, `summary(m1)   # ${T('feste Effekte als Log-Odds mit Wald-z-Test', 'fixed effects as log-odds with Wald z test')}`, `exp(fixef(m1))   # ${T('Odds Ratios', 'odds ratios')}`] : [])
    ].join('\n');
  }
  const steigR = e.steigung ? (e.praed.find(p => p.name === e.steigung)?.teile?.map(zahlTeil).join(':') ?? rAnzeigeName(e.steigung)) : '';
  const zwei = e.gruppe2 ? ` + (1 | ${rAnzeigeName(e.gruppe2)})` : '';   // zweite Gruppierung: gekreuzte (oder geschachtelte) Zufallseffekte, nur Achsenabschnitte
  const zuf = (e.steigung ? `(1 + ${steigR} | ${rAnzeigeName(e.gruppe)})` : `(1 | ${rAnzeigeName(e.gruppe)})`) + zwei;
  return [
    T('# Der gleiche Aufruf in R (Pakete lme4 und lmerTest):', '# The same call in R (packages lme4 and lmerTest):'),
    'library(lmerTest)',
    ...vorbereitung,
    `m0 <- lmer(${rAnzeigeName(e.y)} ~ 1 + (1 | ${rAnzeigeName(e.gruppe)})${zwei}, data = daten, REML = TRUE)   # ${T('Nullmodell: ICC', 'null model: ICC')}`,
    ...(e.mitPraed ? [`m1 <- lmer(${rAnzeigeName(e.y)} ~ ${rhs} + ${zuf}, data = daten, REML = TRUE)`, `summary(m1)   # ${T('feste Effekte mit Satterthwaite-Freiheitsgraden', 'fixed effects with Satterthwaite degrees of freedom')}`] : ['summary(m0)'])
  ].join('\n');
}
