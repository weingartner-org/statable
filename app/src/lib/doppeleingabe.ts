/**
 * Doppelte Dateneingabe (Paket 2F): Sprungregeln, Abgleich zweier Durchgänge, Entscheidungen, Protokoll und Eingabeprüfung.
 * Reine Funktionen, kein Svelte. Nur `import type` aus fragebogenplan und `zeigen` aus fragebogenplan-bedingung. Festlegungen: Kopf von doppeleingabe-2f.test.ts.
 * Rechnung: nur Zählen. Fehler je 1.000 Felder = Abweichungen / verglichene Felder × 1000; verglichen werden nur Bögen, die in beiden Durchgängen vorkommen,
 * und nur Felder, die in mindestens einem der beiden Durchgänge gezeigt waren (übersprungene Filterfelder zählen nicht).
 * Beleg: Paulsen, Overgaard & Lauritsen (2012), PLoS ONE 7(4): e35087, „Quality of data entry using single entry, double entry and automated forms processing“.
 */
import type { Block, Element, Frage, FragebogenPlan } from './fragebogenplan';
import { zeigen, type Antworten as PlanAntworten } from './fragebogenplan-bedingung';

export type Wert = number | number[] | string | undefined;
export type Antworten = Record<string, Wert | null>;
/** Bogen-Nummer (Text) → Antworten dieses Bogens; die Reihenfolge der Schlüssel ist die Reihenfolge der Eingabe. */
export type Durchgang = Record<string, Antworten>;
/** Die Durchgänge eines Plans, wie sie im Projekt liegen. `einfach` = nur ein Durchgang, ohne Abgleich. */
export interface PlanEingaben { A?: Durchgang; B?: Durchgang; einfach?: Durchgang }
export interface Abweichung { bogen: string; feld: string; a: Wert; b: Wert }
export interface Abgleich { abweichungen: Abweichung[]; nurA: string[]; nurB: string[]; beide: string[]; felder: number; jeFeld: Record<string, number> }
export interface Protokoll {
  boegen: number; nurA: number; nurB: number; felder: number; abweichungen: number; jeFeld: Record<string, number>; je1000: number; nachA: number; nachB: number; neu: number;
  /** Bögen, die nur in einem Durchgang vorkamen und ausdrücklich „nur einfach erfasst“ übernommen wurden (fehlt, wenn keiner). */
  nurEinfach?: number;
}
export interface Entscheidung { bogen: string; feld: string; wahl: 'A' | 'B' | 'neu'; wert?: Wert }
export interface Pruefung { stufe: 'ok' | 'fehler' | 'rueckfrage'; text: string }

/** Der Filter-Code für „übersprungen“ (Architekturblatt 5.3). */
export const FILTER_CODE = -7;

/* ---------------------------------------------------------------- Felder des Plans */
interface FeldInfo { id: string; element: Element; frage?: Frage; block?: Block }
function feldListe(plan: FragebogenPlan): FeldInfo[] {
  const aus: FeldInfo[] = [];
  for (const s of plan.elemente) for (const el of s.elemente) {
    if (el.art === 'hinweis') continue;
    if (el.art === 'block') for (const it of el.items) aus.push({ id: it.id, element: el, block: el });
    else aus.push({ id: el.id, element: el, frage: el });
  }
  return aus;
}
const leer = (v: unknown): boolean => v === undefined || v === null || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0) || (typeof v === 'number' && Number.isNaN(v));
const trimBogen = (n: string) => n.trim();

/** Felder in Plan-Reihenfolge, deren Element laut `zeigen` gezeigt wird (Block-Items: wie der Block); Hinweise sind keine Felder. */
export function gezeigteFelder(plan: FragebogenPlan, antworten: Antworten): string[] {
  const an = antworten as PlanAntworten;
  return feldListe(plan).filter(f => zeigen(f.element, an, plan)).map(f => f.id);
}

/**
 * Antworten für ALLE Felder: gezeigte Felder mit ihrem Wert (fehlt er: kein Schlüssel), nicht gezeigte mit -7 (fehlendFilter „code“) oder ohne Schlüssel („leer“).
 * Ein eingetippter Wert eines nicht gezeigten Feldes wird verworfen. `:anders` und `:kommentar` gezeigter Fragen bleiben erhalten.
 */
export function mitFilterCodes(plan: FragebogenPlan, antworten: Antworten): Antworten {
  const an = antworten as PlanAntworten, aus: Antworten = {};
  for (const f of feldListe(plan)) {
    if (zeigen(f.element, an, plan)) {
      const v = antworten[f.id];
      if (!leer(v)) aus[f.id] = v;
      for (const z of [':anders', ':kommentar']) { const x = antworten[f.id + z]; if (f.frage && !leer(x)) aus[f.id + z] = x; }
    } else if (plan.einstellungen.fehlendFilter === 'code') aus[f.id] = FILTER_CODE;
  }
  return aus;
}

/* ---------------------------------------------------------------- Abgleich */
const normiert = (v: unknown, geordnet: boolean): Wert => {
  if (leer(v)) return undefined;
  if (Array.isArray(v)) return geordnet ? [...v] : [...v].sort((x, y) => x - y);
  if (typeof v === 'string') return v.trim();
  return v as number;
};
const gleich = (x: Wert, y: Wert): boolean => {
  if (Array.isArray(x) || Array.isArray(y)) return Array.isArray(x) && Array.isArray(y) && x.length === y.length && x.every((w, i) => w === y[i]);
  return x === y;
};
const nachTrim = (d: Durchgang): Map<string, Antworten> => new Map(Object.entries(d).map(([k, v]) => [trimBogen(k), v]));

export function abgleich(plan: FragebogenPlan, a: Durchgang, b: Durchgang): Abgleich {
  const ma = nachTrim(a), mb = nachTrim(b);
  const beide = [...ma.keys()].filter(k => mb.has(k)), nurA = [...ma.keys()].filter(k => !mb.has(k)), nurB = [...mb.keys()].filter(k => !ma.has(k));
  const felder = feldListe(plan);
  const abweichungen: Abweichung[] = [], jeFeld: Record<string, number> = {};
  let n = 0;
  for (const bogen of beide) {
    const xa = ma.get(bogen)!, xb = mb.get(bogen)!;
    const fa = mitFilterCodes(plan, xa), fb = mitFilterCodes(plan, xb);
    const ga = new Set(gezeigteFelder(plan, xa)), gb = new Set(gezeigteFelder(plan, xb));
    for (const f of felder) {
      if (!ga.has(f.id) && !gb.has(f.id)) continue;
      n++;
      const geordnet = f.frage?.typ === 'rangfolge';
      const wa = normiert(fa[f.id], geordnet), wb = normiert(fb[f.id], geordnet);
      if (!gleich(wa, wb)) { abweichungen.push({ bogen, feld: f.id, a: wa, b: wb }); jeFeld[f.id] = (jeFeld[f.id] ?? 0) + 1; }
    }
  }
  return { abweichungen, nurA, nurB, beide, felder: n, jeFeld };
}

/** Abweichungen je 1.000 verglichene Felder (ungerundet); ohne Felder 0. */
export const fehlerJe1000 = (ab: Abgleich): number => (ab.felder > 0 ? (ab.abweichungen.length / ab.felder) * 1000 : 0);

/**
 * Der Datensatz nach den Entscheidungen. Wirft „unbekannt …“ bei einer Entscheidung ohne Abweichung und „offen …“, solange eine Abweichung keine Entscheidung hat.
 * `nurEinfach`: Bogen-Nummern aus `nurA`/`nurB`, die die Person ausdrücklich „nur einfach erfasst“ übernimmt (sonst bleiben solche Bögen draußen); das Protokoll nennt ihre Zahl.
 */
export function entscheide(plan: FragebogenPlan, a: Durchgang, b: Durchgang, ab: Abgleich, entscheidungen: Entscheidung[], nurEinfach: string[] = []): { datensatz: Durchgang; protokoll: Protokoll } {
  const schluessel = (bogen: string, feld: string) => `${trimBogen(bogen)}\u0000${feld}`;
  const abw = new Map(ab.abweichungen.map(x => [schluessel(x.bogen, x.feld), x]));
  const wahl = new Map<string, Entscheidung>();
  for (const e of entscheidungen) {
    if (!abw.has(schluessel(e.bogen, e.feld))) throw new Error(`unbekannt: Bogen ${e.bogen}, Feld ${e.feld} hat keine Abweichung`);
    wahl.set(schluessel(e.bogen, e.feld), e);
  }
  const offen = ab.abweichungen.filter(x => !wahl.has(schluessel(x.bogen, x.feld)));
  if (offen.length) throw new Error(`offen: ${offen.length} Abweichung(en) ohne Entscheidung`);
  const ma = nachTrim(a), mb = nachTrim(b);
  const datensatz: Durchgang = {};
  let nachA = 0, nachB = 0, neu = 0;
  for (const bogen of ab.beide) {
    const ant: Antworten = mitFilterCodes(plan, ma.get(bogen)!);
    let geaendert = false;
    for (const x of ab.abweichungen.filter(y => y.bogen === bogen)) {
      const e = wahl.get(schluessel(bogen, x.feld))!;
      const w: Wert = e.wahl === 'A' ? x.a : e.wahl === 'B' ? x.b : e.wert;
      if (e.wahl === 'A') nachA++; else if (e.wahl === 'B') nachB++; else neu++;
      if (leer(w)) delete ant[x.feld]; else ant[x.feld] = w;
      geaendert = true;
    }
    datensatz[bogen] = geaendert ? mitFilterCodes(plan, ant) : ant;
  }
  let einfach = 0;
  for (const bogen of nurEinfach.map(trimBogen)) {
    const quelle = ab.nurA.includes(bogen) ? ma.get(bogen) : ab.nurB.includes(bogen) ? mb.get(bogen) : undefined;
    if (!quelle || bogen in datensatz) continue;
    datensatz[bogen] = mitFilterCodes(plan, quelle); einfach++;
  }
  return { datensatz, protokoll: { boegen: ab.beide.length, nurA: ab.nurA.length, nurB: ab.nurB.length, felder: ab.felder, abweichungen: ab.abweichungen.length, jeFeld: { ...ab.jeFeld }, je1000: fehlerJe1000(ab), nachA, nachB, neu, ...(einfach ? { nurEinfach: einfach } : {}) } };
}

/** Datensatz aus nur einem Durchgang (ohne Abgleich): jeder Bogen mit Filter-Codes aufgefüllt. */
export function einfachDatensatz(plan: FragebogenPlan, d: Durchgang): Durchgang {
  return Object.fromEntries(Object.entries(d).map(([k, v]) => [trimBogen(k), mitFilterCodes(plan, v)]));
}

/* ---------------------------------------------------------------- Protokolltext */
const zahlText = (x: number, sprache: 'de' | 'en'): string => { const t = (Math.round(x * 10) / 10).toFixed(1); return sprache === 'de' ? t.replace('.', ',') : t; };

/** Satzvorschlag für den Methodenteil; Zahlen kommen aus dem Protokoll. */
export function protokollText(p: Protokoll, sprache: 'de' | 'en'): string {
  const je = zahlText(p.je1000, sprache), nur = p.nurA + p.nurB;
  const s = (n: number, eins: string, viele: string) => `${n} ${n === 1 ? eins : viele}`;
  if (sprache === 'en') {
    const teile = [
      `The data were entered twice and independently (two passes, A and B, without sight of the other pass) and then compared. ${s(p.boegen, 'questionnaire', 'questionnaires')} with ${s(p.felder, 'field', 'fields')} were compared.`,
      `The comparison found ${s(p.abweichungen, 'discrepancy', 'discrepancies')}, which is ${je} discrepancies per 1,000 fields.`,
      p.abweichungen ? `Every discrepancy was decided with the paper questionnaire at hand: ${p.nachA} in favour of pass A, ${p.nachB} in favour of pass B, ${p.neu} with a new value.` : ''
    ];
    if (nur) teile.push(`${s(nur, 'questionnaire was', 'questionnaires were')} entered in only one pass (${p.nurA} in pass A, ${p.nurB} in pass B) and not compared.`);
    if (p.nurEinfach) teile.push(`${p.nurEinfach} of these ${p.nurEinfach === 1 ? 'was' : 'were'} explicitly included in the data set as single-entry questionnaires.`);
    return teile.filter(Boolean).join(' ');
  }
  const teile = [
    `Die Daten wurden doppelt und unabhängig eingegeben (zwei Durchgänge, A und B, ohne Einsicht in den jeweils anderen) und anschließend abgeglichen. Verglichen wurden ${s(p.boegen, 'Bogen', 'Bögen')} mit ${s(p.felder, 'Feld', 'Feldern')}.`,
    `Der Abgleich ergab ${s(p.abweichungen, 'Abweichung', 'Abweichungen')}, das sind ${je} Abweichungen je 1.000 Felder.`,
    p.abweichungen ? `Jede Abweichung wurde mit dem Papierbogen in der Hand entschieden: ${p.nachA} nach Durchgang A, ${p.nachB} nach Durchgang B, ${p.neu} mit neuem Wert.` : ''
  ];
  if (nur) teile.push(`${s(nur, 'Bogen wurde', 'Bögen wurden')} nur in einem Durchgang erfasst (${p.nurA} in Durchgang A, ${p.nurB} in Durchgang B) und nicht verglichen.`);
  if (p.nurEinfach) teile.push(`${p.nurEinfach === 1 ? 'Davon wurde 1 Bogen' : `Davon wurden ${p.nurEinfach} Bögen`} ausdrücklich als einfach erfasst in den Datensatz übernommen.`);
  return teile.filter(Boolean).join(' ');
}

/* ---------------------------------------------------------------- Eingabeprüfung */
const TEXTE = {
  de: {
    pflicht: 'Pflichtfrage ohne Antwort. Auf dem Papierbogen nachsehen; fehlt die Antwort dort, leer lassen oder den Code für „keine Angabe“ eingeben.',
    code: (c: string) => `Der Code „${c}“ steht nicht in der Antwortliste dieser Frage.`,
    zahl: (c: string) => `„${c}“ ist keine Zahl.`,
    ganz: 'Bitte eine ganze Zahl eingeben.',
    bereich: (min: number, max: number) => `Die Zahl muss zwischen ${min} und ${max} liegen.`,
    min: (min: number) => `Die Zahl darf nicht kleiner als ${min} sein.`,
    max: (max: number) => `Die Zahl darf nicht größer als ${max} sein.`,
    laenge: (n: number) => `Der Text ist länger als ${n} Zeichen.`,
    datum: 'Bitte ein Datum als JJJJ-MM-TT eingeben.',
    einwilligung: 'Für die Zustimmung gilt nur der Code 1.'
  },
  en: {
    pflicht: 'Required question without an answer. Check the paper questionnaire; if the answer is missing there, leave it empty or enter the code for “no answer”.',
    code: (c: string) => `The code "${c}" is not in this question's answer list.`,
    zahl: (c: string) => `"${c}" is not a number.`,
    ganz: 'Please enter a whole number.',
    bereich: (min: number, max: number) => `The number must be between ${min} and ${max}.`,
    min: (min: number) => `The number must not be smaller than ${min}.`,
    max: (max: number) => `The number must not be larger than ${max}.`,
    laenge: (n: number) => `The text is longer than ${n} characters.`,
    datum: 'Please enter a date as YYYY-MM-DD.',
    einwilligung: 'Only the code 1 counts as agreement.'
  }
};
const ok: Pruefung = { stufe: 'ok', text: '' };
const fehler = (text: string): Pruefung => ({ stufe: 'fehler', text });
const codeVon = (v: unknown): number | null => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && /^-?\d+$/.test(v.trim())) return Number(v.trim());
  return null;
};
const zahlVon = (v: unknown): number | null => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v.trim()))) return Number(v.trim());
  return null;
};

/** Prüft EIN Feld beim Tippen: Fehler (falscher Code, Zahl außerhalb der Grenzen), Rückfrage (Pflicht leer, kein Fehler), sonst ok. */
export function pruefeFeld(plan: FragebogenPlan, frage: Frage, wert: unknown, sprache = 'de'): Pruefung {
  const T = sprache === 'en' ? TEXTE.en : TEXTE.de;
  if (leer(wert)) return frage.pflicht?.an ? { stufe: 'rueckfrage', text: T.pflicht } : ok;
  const liste = plan.antwortlisten.find(l => l.id === frage.liste);
  const erlaubt = new Set((liste?.optionen ?? []).map(o => o.wert));
  if (frage.anders?.an) erlaubt.add(Math.max(0, ...erlaubt) + 1);
  switch (frage.typ) {
    case 'einfach': case 'rangfolge': case 'mehrfach': {
      for (const w of Array.isArray(wert) ? wert : [wert]) {
        const c = codeVon(w);
        if (c === null || !erlaubt.has(c)) return fehler(T.code(String(w)));
      }
      return ok;
    }
    case 'zahl': case 'regler': {
      const n = zahlVon(wert);
      if (n === null) return fehler(T.zahl(String(wert)));
      const z = frage.zahl;
      if (z?.ganz && !Number.isInteger(n)) return fehler(T.ganz);
      if (typeof z?.min === 'number' && typeof z?.max === 'number' && (n < z.min || n > z.max)) return fehler(T.bereich(z.min, z.max));
      if (typeof z?.min === 'number' && n < z.min) return fehler(T.min(z.min));
      if (typeof z?.max === 'number' && n > z.max) return fehler(T.max(z.max));
      return ok;
    }
    case 'einwilligung': return codeVon(wert) === 1 ? ok : fehler(T.einwilligung);
    case 'datum': { const t = String(wert).trim(), d = new Date(t + 'T00:00:00Z'); return /^\d{4}-\d{2}-\d{2}$/.test(t) && !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === t ? ok : fehler(T.datum); }
    case 'text': { const m = frage.text_?.maxZeichen; return typeof m === 'number' && String(wert).length > m ? fehler(T.laenge(m)) : ok; }
  }
  return ok;
}

/** Bogen-Nummer: Pflicht und eindeutig je Durchgang (Vergleich nach trim()). */
export function pruefeBogenNummer(durchgang: Durchgang, nr: string): 'ok' | 'leer' | 'doppelt' {
  const n = trimBogen(nr);
  if (!n) return 'leer';
  return Object.keys(durchgang).some(k => trimBogen(k) === n) ? 'doppelt' : 'ok';
}

/**
 * Der Plan als EINE Eingabeseite (ein Bogen = eine Seite): alle Elemente in Plan-Reihenfolge, die bedingte Anzeige der Seite wandert in die Bedingung jedes Elements,
 * damit die Filter wirken wie im Plan. Ohne Fortschritt und ohne „Zurück“ (es gibt nur diese Seite). Der Plan selbst bleibt unverändert.
 */
export function eingabePlan(plan: FragebogenPlan, titel: Record<string, string>): FragebogenPlan {
  const elemente: Element[] = plan.elemente.flatMap(s => s.elemente.map((el): Element => {
    if (!s.wennGezeigt) return el;
    return { ...el, wennGezeigt: el.wennGezeigt ? { und: [s.wennGezeigt, el.wennGezeigt] } : s.wennGezeigt };
  }));
  return { ...plan, einstellungen: { ...plan.einstellungen, fortschritt: false, zurueck: false, pretest: false }, elemente: [{ art: 'seite', id: '#eingabe', name: 'eingabe', titel, elemente }] };
}

/** Alle Felder (Frage oder Block-Item) in Plan-Reihenfolge; für Oberfläche und Datensatz. */
export const felderDesPlans = (plan: FragebogenPlan): { id: string; frage?: Frage; block?: Block }[] => feldListe(plan).map(f => ({ id: f.id, frage: f.frage, block: f.block }));
