/**
 * Fragebogen-Import (Später S-C, D4; Fachblatt 2.4, 2.5, 2.7 und „Entscheidungen Opus (17.10.)“):
 * Hersteller erkennen (SoSci Survey, LimeSurvey, Unipark/EFS, Qualtrics), Kopfzeilen, Fragetexte als Beschriftung, Fehlendcode-Vorschläge,
 * Metadaten-Spalten, Test-/Vorschau-/unvollständige Fälle, Mehrfachsets mit Zählwert, Antworten als Text.
 *
 * GRUNDSATZ: Statable ändert beim Einlesen NICHTS still. Jede Erkennung ist ein VORSCHLAG (mit Kästchen und Vorschau); die Eingabe-Tabelle wird nie verändert,
 * `erkenneFragebogen` gibt eine bereinigte KOPIE zurück (Qualtrics: ohne die Kopfzeilen 2 und 3). Unipark und Qualtrics sind nach der Herstellerdokumentation gebaut,
 * nicht an echten Exporten geprüft (testdaten/fragebogen/LIESMICH.md).
 */
import { istFehlend, hatFehlend } from './fehlend';
import { alsZahl, psppName, type Tabelle, type Zelle } from './einlesen';
import { zit } from './befehlstext';
import type { Kodebuch, Hersteller } from './kodebuch';
import { kodebuchGruppen } from './kodebuch';
import type { Daten } from './umformen';
import type { Spalte } from './verzeichnis';
import { L, Lp, d as anrede } from './sitzung.svelte';
import { aufzaehlung } from '../i18n/profil';
import { komma } from './ergebnis';
import { istKobo, KOBO_META, KOBO_ZEIT, KOBO_PERSONENBEZUG } from './dienste/kobo';
import { istMoodleQuestionnaire, moodlePersonenbezug, MOODLE_META, MOODLE_ZEIT } from './dienste/moodle';
import { istMsForms, msformsPersonenbezug, MSFORMS_META, MSFORMS_ZEIT, MSFORMS_TRENNER } from './dienste/msforms';
import { istNextcloud, nextcloudPersonenbezug, NEXTCLOUD_META, NEXTCLOUD_ZEIT, NEXTCLOUD_TRENNER } from './dienste/nextcloud';
import { istCryptpad, cryptpadPersonenbezug, CRYPTPAD_META, CRYPTPAD_ZEIT } from './dienste/cryptpad';
import { istGoogleForms, GOOGLE_META, GOOGLE_ZEIT, GOOGLE_TRENNER } from './dienste/googleforms';
import { pruefeMehrfachZelle } from './dienste/mehrfachzelle';
import { doppelteZeilen, rasterBloecke, RASTER } from './dienste/gemeinsam';
export { cryptpadJsonTabelle } from './dienste/cryptpad';

export interface ErkSpalte { kopf: string; name: string; label?: string; rolle: 'frage' | 'metadaten'; zeit?: boolean; personenbezug?: boolean }
export type Vorschlag = { id: string } & (
  | { art: 'fehlend'; spalte: string; codes: number[]; quelle: 'hersteller' | 'kodebuch' | 'hinweis'; wirkung: { mittelVorher: number | null; mittelNachher: number | null; n: number } }
  | { art: 'metadaten' | 'personenbezug'; spalten: string[] }
  | { art: 'testfaelle' | 'unvollstaendige' | 'schnellantworter'; zeilen: number[]; grund: string }
  | { art: 'mehrfachset'; name: string; spalten: string[]; zaehlwert?: number | string; umkodierung: 'zaehlwert' | 'nichtleer' | 'ungleichNull'; quelle: 'kodebuch' | 'hersteller' | 'muster'; ausserhalb?: string[] }
  | { art: 'wertelabels'; spalte: string; labels: Record<string, string> }
  /** Mehrfachauswahl in einer Zelle (Google, Microsoft, Nextcloud, Kobo mit XLSForm): `unklar` = 0-basierte Datenzeilen, die die Person entscheidet */
  | { art: 'mehrfachZelle'; spalte: string; trenner: string; optionen: string[]; anders: boolean; unklar: number[] }
  /** Doppelte Antworten: je Gruppe (0-basierte Datenzeilen, aufsteigend) mindestens zwei Zeilen; nie automatisch gelöscht */
  | { art: 'doppelte'; gruppen: number[][]; grund: 'kennung' | 'gleich' }
  /** Raster: mehrere Spalten mit demselben Fragetext vor dem Zeilentext */
  | { art: 'itemblock'; frage: string; spalten: string[]; items: string[] }
  | { art: 'textAntworten'; spalten: string[]; stufen: string[] | null; vorbelegt: boolean }
);
export interface Erkennung {
  /** `sicher` ist false nur bei 'googleforms' („vermutlich“); sonst true. */
  hersteller: Hersteller; sicher: boolean; kopfzeilen: number; zeitzone?: string;
  tabelle: Tabelle; beschriftungen: Record<string, string>; spalten: ErkSpalte[]; vorschlaege: Vorschlag[];
  meldungen: { art: 'leer' | 'nurKopf'; satz: string }[];
}

/* ------------------------------------------------------------------ Hilfen */
const leerZelle = (v: Zelle | undefined) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
/** Zahl aus einer Zelle: Fragebogen-Werkzeuge schreiben Dezimalpunkte; ein Komma gilt auch. */
const zahlVon = (v: Zelle | undefined): number | null => (leerZelle(v) ? null : typeof v === 'number' ? (Number.isFinite(v) ? v : null) : v instanceof Date ? null : alsZahl(String(v), true));
const text = (v: Zelle | undefined) => (leerZelle(v) ? '' : String(v).trim());
const klein = (v: Zelle | undefined) => text(v).toLowerCase();
const mittel = (w: number[]) => (w.length ? w.reduce((a, b) => a + b, 0) / w.length : null);
const sortiertEindeutig = (w: number[]) => [...new Set(w)].sort((a, b) => a - b);

/** Spaltenwerte (Zellen) einer Tabelle. */
const spalteVon = (t: Tabelle, i: number): Zelle[] => t.zeilen.map(z => z[i] ?? null);
/** Alle nicht leeren Zellen sind Zahlen (und es gibt mindestens eine): die Zahlen, sonst null. */
function nurZahlen(zellen: Zelle[]): number[] | null {
  const aus: number[] = [];
  for (const z of zellen) { if (leerZelle(z)) continue; const n = zahlVon(z); if (n === null) return null; aus.push(n); }
  return aus.length ? aus : null;
}

/** Name im Satz „Das sieht nach einer Datei von … aus.“ (die Dienste von Paket 1B tragen schon ihren Namen, ihr Erkenner kommt dort). */
const HERSTELLER_NAME: Record<Hersteller, string> = { sosci: 'SoSci Survey', limesurvey: 'LimeSurvey', unipark: 'Unipark', qualtrics: 'Qualtrics', msforms: 'Microsoft Forms', nextcloud: 'Nextcloud Forms', cryptpad: 'CryptPad', googleforms: 'Google Forms', kobo: 'KoboToolbox', odk: 'ODK', moodlefeedback: 'Moodle Feedback', moodlequestionnaire: 'Moodle Questionnaire', unbekannt: '' };
/** Hersteller, die nach Dokumentation bzw. Quellcode erkannt, aber nicht an echten Exporten geprüft sind (alle neuen; SoSci, LimeSurvey, Unipark und Qualtrics haben ihren eigenen Hinweis im Dateikopf). */
const NICHT_GEPRUEFT: Hersteller[] = ['msforms', 'nextcloud', 'cryptpad', 'googleforms', 'kobo', 'odk', 'moodlefeedback', 'moodlequestionnaire'];

const META: Record<'sosci' | 'limesurvey' | 'unipark' | 'qualtrics' | 'kobo' | 'moodlequestionnaire' | 'msforms' | 'nextcloud' | 'cryptpad' | 'googleforms', { namen: RegExp; zeit: RegExp }> = {
  msforms: { namen: MSFORMS_META, zeit: MSFORMS_ZEIT },
  nextcloud: { namen: NEXTCLOUD_META, zeit: NEXTCLOUD_ZEIT },
  cryptpad: { namen: CRYPTPAD_META, zeit: CRYPTPAD_ZEIT },
  googleforms: { namen: GOOGLE_META, zeit: GOOGLE_ZEIT },
  kobo: { namen: KOBO_META, zeit: KOBO_ZEIT },
  moodlequestionnaire: { namen: MOODLE_META, zeit: MOODLE_ZEIT },
  sosci: { namen: /^(case|serial|ref|questnnr|mode|started|lastdata|mailsent|language|finished|lastpage|maxpage|missing|missrel|q_viewer|time_sum|time_rsi|time\d+)$/i, zeit: /^(started|lastdata|mailsent)$/i },
  limesurvey: { namen: /^(id|submitdate|lastpage|startlanguage|seed|startdate|datestamp|token|ipaddr|refurl)$/i, zeit: /^(submitdate|startdate|datestamp)$/i },
  unipark: { namen: /^(lfdn|tid|external_lfdn|dispcode|lastpage|quality|duration|browser|referer|date_of_last_access|date_of_first_mail|datetime|participant)$/i, zeit: /^(date_of_last_access|date_of_first_mail|datetime)$/i },
  qualtrics: { namen: /^(startdate|enddate|status|ipaddress|progress|duration \(in seconds\)|finished|recordeddate|responseid|recipientlastname|recipientfirstname|recipientemail|externalreference|externaldatareference|locationlatitude|locationlongitude|distributionchannel|userlanguage)$/i, zeit: /^(startdate|enddate|recordeddate)$/i }
};
const metaVon = (h: Hersteller) => (META as Partial<Record<Hersteller, { namen: RegExp; zeit: RegExp }>>)[h] ?? null;
const PERSONENBEZUG = /^(ipaddress|ipaddr|recipientemail|recipientlastname|recipientfirstname|externalreference|externaldatareference|locationlatitude|locationlongitude|token)$/i;
const CODES: Partial<Record<Hersteller, number[]>> = { sosci: [-1, -2, -3, -8, -9], unipark: [-77, -66, -99], qualtrics: [-99] };
/** Ohne Kodebuch und Hersteller (Entscheidung Opus 3): diese Zahlen in einer sonst 0-bis-10-Spalte lösen einen Hinweis aus. */
const HINWEIS_CODES = [-1, -9, -66, -77, -99, 99, 999];

function erkenneHersteller(kopf: string[], zeilen: Zelle[][] = []): Hersteller {
  const k = new Set(kopf.map(x => x.trim().toLowerCase()));
  const anz = (l: string[]) => l.filter(x => k.has(x)).length;
  if (anz(['startdate', 'enddate', 'status', 'progress', 'finished', 'recordeddate', 'responseid', 'distributionchannel', 'userlanguage']) >= 4) return 'qualtrics';
  if (anz(['case', 'serial', 'ref', 'questnnr', 'mode', 'started']) >= 4) return 'sosci';
  if (anz(['id', 'submitdate', 'lastpage', 'startlanguage']) >= 3) return 'limesurvey';
  const system = anz(['tid', 'dispcode', 'lastpage', 'quality', 'duration', 'browser', 'referer', 'date_of_last_access', 'date_of_first_mail', 'datetime', 'participant', 'external_lfdn']);
  if (k.has('lfdn') && (system >= 1 || kopf.filter(x => /^v_\d+$/i.test(x.trim())).length >= 2)) return 'unipark';
  if (istKobo(kopf)) return 'kobo';
  if (istMoodleQuestionnaire(kopf, zeilen)) return 'moodlequestionnaire';
  // Paket 1B (nach Dokumentation bzw. Quellcode, nicht an echten Exporten geprüft): zuerst die genauesten Merkmale, Google (nur „vermutlich“) zuletzt
  if (istNextcloud(kopf, zeilen)) return 'nextcloud';
  if (istCryptpad(kopf, zeilen)) return 'cryptpad';
  if (istMsForms(kopf)) return 'msforms';
  if (istGoogleForms(kopf, zeilen)) return 'googleforms';
  return 'unbekannt';
}

/* ------------------------------------------------------------------ Skalen als Text */
/** Bekannte Antwortskalen, je Stufe die Schreibweisen (die erste ist die gezeigte). Reihenfolge der Stufen = Reihenfolge der Zahlen 1 bis n. */
export const SKALEN: string[][][] = [
  [['Stimme gar nicht zu', 'Stimme überhaupt nicht zu', 'Lehne völlig ab'], ['Stimme eher nicht zu', 'Stimme nicht zu'], ['Teils/teils', 'Teils, teils', 'Weder noch', 'Neutral'], ['Stimme eher zu', 'Stimme zu'], ['Stimme voll zu', 'Stimme voll und ganz zu', 'Stimme völlig zu']],
  [['Trifft gar nicht zu', 'Trifft überhaupt nicht zu'], ['Trifft eher nicht zu', 'Trifft nicht zu'], ['Teils/teils', 'Teils, teils'], ['Trifft eher zu', 'Trifft zu'], ['Trifft voll zu', 'Trifft voll und ganz zu', 'Trifft völlig zu']],
  [['Sehr unzufrieden'], ['Unzufrieden', 'Eher unzufrieden'], ['Teils/teils', 'Teils, teils', 'Weder noch'], ['Zufrieden', 'Eher zufrieden'], ['Sehr zufrieden']],
  [['Nie'], ['Selten'], ['Manchmal', 'Gelegentlich'], ['Oft', 'Häufig'], ['Immer', 'Sehr oft']],
  [['Strongly disagree'], ['Disagree', 'Somewhat disagree'], ['Neither agree nor disagree', 'Neutral', 'Undecided'], ['Agree', 'Somewhat agree'], ['Strongly agree']],
  [['Never'], ['Rarely'], ['Sometimes'], ['Often'], ['Always']],
  [['Very dissatisfied'], ['Dissatisfied', 'Somewhat dissatisfied'], ['Neither satisfied nor dissatisfied', 'Neutral'], ['Satisfied', 'Somewhat satisfied'], ['Very satisfied']]
];
const norm = (t: string) => t.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
/** Position der Schreibweise in der Skala (0-basiert) oder -1. */
const stufeIn = (skala: string[][], wert: string) => skala.findIndex(st => st.some(s => norm(s) === norm(wert)));
/** Die Stufen einer bekannten deutschen oder englischen Skala in der richtigen Reihenfolge, wenn alle Werte dazugehören (Teilmenge genügt). */
export function bekannteSkala(werte: string[]): string[] | null {
  const w = werte.filter(x => x.trim() !== '');
  if (!w.length) return null;
  for (const skala of SKALEN) if (w.every(x => stufeIn(skala, x) >= 0)) return skala.map(st => st[0]!);
  return null;
}
/** Laufen die Beschriftungen einer bekannten Skala GEGEN die Zahlenreihenfolge (1 = „stimme voll zu“ … 5 = „stimme gar nicht zu“)? */
export function umgepoltHinweis(werteLabels: Record<string, string>): boolean {
  const e = Object.entries(werteLabels).map(([k, l]) => ({ k: Number(k), l })).filter(x => Number.isFinite(x.k) && x.k > 0).sort((a, b) => a.k - b.k);
  if (e.length < 2) return false;
  for (const skala of SKALEN) {
    const pos = e.map(x => stufeIn(skala, x.l));
    if (pos.some(p => p < 0)) continue;
    if (pos.every((p, i) => i === 0 || p < pos[i - 1]!)) return true;
  }
  return false;
}
/** Alle Schreibweisen, die zur selben Stufe gehören (zum Beispiel „Stimme zu“ zu „Stimme eher zu“): aus den bekannten Skalen. */
const gleicheStufe = (a: string, b: string) => norm(a) === norm(b) || SKALEN.some(sk => sk.some(st => st.some(x => norm(x) === norm(a)) && st.some(x => norm(x) === norm(b))));
/**
 * Welcher Stufe gehört welcher Text? Jede Schreibweise der Daten (`rohwerte`) wird gesucht: gleich geschrieben, oder eine bekannte Schreibweise derselben Stufe.
 * Was zu keiner Stufe passt, steht in `offen` und bekommt NIE still „fehlend“: Die Person entscheidet (`zuordnung`: Stufennummer oder null = bewusst leer).
 */
export function ordneTextZu(stufen: string[], rohwerte: string[], zuordnung: Record<string, number | null> = {}): { regeln: [string, number | null][]; offen: string[] } {
  const regeln: [string, number | null][] = [], offen: string[] = [], gesehen = new Set<string>();
  const entschieden = (t: string) => Object.hasOwn(zuordnung, t);   // die Entscheidung der Person geht vor (auch „als fehlend markieren“ für einen Text, der zu einer Stufe passen würde)
  for (const s of stufen) { regeln.push([s, entschieden(s) ? zuordnung[s] ?? null : stufen.indexOf(s) + 1]); gesehen.add(s); }
  for (const r of rohwerte) {
    if (gesehen.has(r)) continue; gesehen.add(r);
    const i = stufen.findIndex(s => gleicheStufe(s, r));
    if (entschieden(r)) regeln.push([r, zuordnung[r] ?? null]);
    else if (i >= 0) regeln.push([r, i + 1]);
    else offen.push(r);
  }
  return { regeln, offen };
}
/**
 * Text in Zahlen: RECODE in eine NEUE Spalte (die Original-Spalte bleibt), Wertelabels, Messniveau „ordinal“.
 * `rohwerte`: die Schreibweisen, wie sie in den Daten stehen (Groß/klein, Randleerraum, andere Schreibweisen derselben Stufe); jede wird der passenden Stufe zugeordnet.
 * Bleibt ein Text ohne Stufe und ohne Entscheidung der Person, wirft die Funktion einen Fehler (`offeneTexte`), statt ihn still zu „fehlend“ zu machen.
 */
export function textRecodeBefehl(spalte: string, ziel: string, stufen: string[], rohwerte: string[] = [], zuordnung: Record<string, number | null> = {}): string {
  const z = ordneTextZu(stufen, rohwerte, zuordnung);
  if (z.offen.length) throw new Error(`offeneTexte: ${z.offen.join(' | ')}`);
  const regeln = z.regeln.map(([roh, nr]) => `(${zit(roh, 255)}=${nr === null ? 'SYSMIS' : nr})`);
  return [
    `RECODE ${spalte} ${regeln.join(' ')} INTO ${ziel}.`,
    `VALUE LABELS ${ziel} ${stufen.map((s, i) => `${i + 1} ${zit(s, 120)}`).join(' ')}.`,
    `FORMATS ${ziel} (F8.0).`,
    `VARIABLE LEVEL ${ziel} (ORDINAL).`,
    'EXECUTE.'
  ].join('\n');
}

/** Unipark: 0 heißt „gesehen, nicht bearbeitet“ - aber nur, wo 0 keine gültige Antwort ist. Eine Skala, die bei 1 beginnt und mindestens drei Stufen hat, schließt die 0 als Antwort aus; eine 0/1-Spalte nicht. */
export function nullIstCode(vorhanden: number[]): boolean {
  const rest = vorhanden.filter(x => ![-77, -66, -99, 0].includes(x));
  return rest.length >= 3 && Math.min(...rest) >= 1 && Math.max(...rest) >= 3;
}

/* ------------------------------------------------------------------ Hauptfunktion */
const leereErkennung = (t: Tabelle, meldungen: Erkennung['meldungen'] = []): Erkennung => ({ hersteller: 'unbekannt', sicher: true, kopfzeilen: 1, tabelle: t, beschriftungen: {}, spalten: t.kopf.map(k => ({ kopf: k, name: k, rolle: 'frage' })), vorschlaege: [], meldungen });

/** Die Stammform einer Mehrfach-Spalte: `A002_01`, `Q2_1`, `G01Q02_SQ001` → Stamm und Endung. `_TEXT`-Spalten gehören nicht dazu. */
const stammVon = (name: string) => { const m = /^(.+?)_([A-Za-z]*\d+)$/.exec(name); return m ? { stamm: m[1]!, ende: m[2]! } : null; };

export function erkenneFragebogen(t: Tabelle, kb?: Kodebuch): Erkennung {
  try { return erkenneIntern(t, kb); }
  catch { return leereErkennung(t); }
}

function erkenneIntern(t0: Tabelle, kb?: Kodebuch): Erkennung {
  if (!t0.kopf.length) return leereErkennung(t0, [{ art: 'leer', satz: L('Die Datei ist leer: Es gibt keine Spalten.', 'The file is empty: there are no columns.') }]);
  let hersteller = erkenneHersteller(t0.kopf, t0.zeilen);
  // Qualtrics: drei Kopfzeilen. Zeile 3 (hier zeilen[1]) besteht aus {"ImportId": …}
  let kopfzeilen = 1, zeitzone: string | undefined;
  const beschrZeile: Record<number, string> = {};
  let t = t0;
  if (hersteller === 'qualtrics' && t0.zeilen.length >= 2) {
    const z3 = t0.zeilen[1]!;
    if (z3.filter(c => /^\{\s*"{1,2}ImportId"{1,2}/.test(text(c))).length >= 3) {
      kopfzeilen = 3;
      t0.zeilen[0]!.forEach((c, i) => { if (!leerZelle(c)) beschrZeile[i] = text(c); });
      for (const c of z3) { const m = /"{1,2}timeZone"{1,2}\s*:\s*"{1,2}([^"]+?)"{1,2}/.exec(text(c)); if (m) { zeitzone = m[1]; break; } }
      t = { ...t0, zeilen: t0.zeilen.slice(2) };
    }
  }
  // SoSci-Exportoption „Beschriftungen der Variablen einfügen“: die zweite Zeile enthält Fragetexte statt Antworten (Text in Spalten, die sonst nur Zahlen haben)
  if (kopfzeilen === 1 && hersteller === 'sosci' && t0.zeilen.length >= 3) {
    const z0 = t0.zeilen[0]!, rest = t0.zeilen.slice(1);
    const zahlenSp = t0.kopf.map((_, i) => i).filter(i => { const w = rest.map(z => z[i]).filter(v => !leerZelle(v)); return w.length >= 2 && w.every(v => zahlVon(v) !== null); });
    if (zahlenSp.length >= 2 && zahlenSp.filter(i => !leerZelle(z0[i]) && zahlVon(z0[i]) === null).length >= 0.8 * zahlenSp.length) {
      kopfzeilen = 2;
      z0.forEach((c, i) => { if (!leerZelle(c)) beschrZeile[i] = text(c); });
      t = { ...t0, zeilen: rest };
    }
  }
  const vergeben = new Set<string>();
  const roh = t.kopf.map((k, i) => ({ kopf: k, i }));
  // LimeSurvey: „Fragecode. Fragetext“ am ERSTEN „. “ teilen, wenn mindestens 80 % der Fragespalten das Muster haben
  const lsTeilung: Record<number, { code: string; label: string }> = {};
  if (hersteller === 'limesurvey') {
    const fragen = roh.filter(r => !META.limesurvey.namen.test(r.kopf.trim()));
    const treffer = fragen.map(r => { const m = /^([A-Za-z0-9_\[\]]+)\. (.+)$/s.exec(r.kopf); return m ? { i: r.i, code: m[1]!, label: m[2]!.trim() } : null; });
    if (fragen.length && treffer.filter(Boolean).length >= 0.8 * fragen.length) for (const x of treffer) if (x) lsTeilung[x.i] = { code: x.code, label: x.label };
  }
  const meta = metaVon(hersteller);
  const spalten: ErkSpalte[] = roh.map(r => {
    const teil = lsTeilung[r.i];
    const name = psppName(teil ? teil.code : r.kopf, vergeben, r.i + 1);
    const istMeta = !!meta && meta.namen.test(r.kopf.trim());
    const zellen = spalteVon(t, r.i);
    const pb = !!meta && (hersteller === 'kobo' ? KOBO_PERSONENBEZUG.test(r.kopf.trim()) && zellen.some(z => !leerZelle(z)) : hersteller === 'moodlequestionnaire' ? moodlePersonenbezug(r.kopf, zellen)
      : hersteller === 'msforms' ? msformsPersonenbezug(r.kopf, zellen) : hersteller === 'nextcloud' ? nextcloudPersonenbezug(r.kopf, zellen) : hersteller === 'cryptpad' ? cryptpadPersonenbezug(r.kopf, zellen) : hersteller === 'googleforms' ? false : PERSONENBEZUG.test(r.kopf.trim()) && hersteller !== 'sosci' && zellen.some(z => !leerZelle(z)));
    return { kopf: r.kopf, name, rolle: istMeta ? 'metadaten' as const : 'frage' as const, ...(istMeta && meta!.zeit.test(r.kopf.trim()) ? { zeit: true } : {}), ...(pb ? { personenbezug: true } : {}) };
  });
  const beschriftungen: Record<string, string> = {};
  spalten.forEach((sp, i) => {
    if (lsTeilung[i]) beschriftungen[sp.name] = lsTeilung[i]!.label;
    else if (beschrZeile[i] && beschrZeile[i] !== sp.name && beschrZeile[i] !== sp.kopf) beschriftungen[sp.name] = beschrZeile[i]!;
  });
  // Kodebuch: Beschriftungen und Spaltenzuordnung (Groß/klein egal)
  const kbSpalte = (sp: ErkSpalte) => { if (!kb) return undefined; const k = Object.keys(kb.spalten).find(n => n.toUpperCase() === sp.name.toUpperCase() || n.toUpperCase() === sp.kopf.toUpperCase()); return k ? kb.spalten[k] : undefined; };
  spalten.forEach(sp => { const k = kbSpalte(sp); if (k?.label) beschriftungen[sp.name] = k.label; });
  for (const sp of spalten) { const l = beschriftungen[sp.name]; if (l) sp.label = l; }

  const herstellerFinal: Hersteller = kb && hersteller === 'unbekannt' && kb.hersteller !== 'unbekannt' ? kb.hersteller : hersteller;
  const e: Erkennung = { hersteller: herstellerFinal, sicher: herstellerFinal !== 'googleforms', kopfzeilen, ...(zeitzone ? { zeitzone } : {}), tabelle: t, beschriftungen, spalten, vorschlaege: [], meldungen: [] };
  hersteller = e.hersteller;
  if (kopfzeilen === 1 && (hersteller === 'msforms' || hersteller === 'cryptpad')) e.zeitzone = 'UTC';   // Microsoft: Q&A („may be“), CryptPad: ISO mit Z; Google, Nextcloud, Kobo, Moodle: keine Zone setzen
  if (!t.zeilen.length) { e.meldungen.push({ art: 'nurKopf', satz: L('In der Datei stehen nur die Spaltenköpfe, aber keine Antworten (keine Zeilen darunter).', 'The file contains only the column headings, but no answers (no rows below).') }); return e; }

  const idx = (name: string) => spalten.findIndex(sp => sp.name === name);
  const v: Vorschlag[] = [];

  /* ---- Mehrfachsets ---- */
  const imSet = new Set<string>();
  const sets: Extract<Vorschlag, { art: 'mehrfachset' }>[] = [];
  const mitSetId = (s: Omit<Extract<Vorschlag, { art: 'mehrfachset' }>, 'id'>) => { sets.push({ id: `mehrfachset:${s.name}`, ...s }); s.spalten.forEach(n => imSet.add(n)); };
  if (kb) {
    for (const g of kodebuchGruppen(kb)) {
      const da = g.spalten.map(n => spalten.find(sp => sp.name.toUpperCase() === n.toUpperCase() || sp.kopf.toUpperCase() === n.toUpperCase())?.name).filter((x): x is string => !!x);
      if (da.length >= 2 && g.zaehlwert !== undefined) mitSetId({ art: 'mehrfachset', name: g.id, spalten: da, zaehlwert: g.zaehlwert, umkodierung: 'zaehlwert', quelle: 'kodebuch' });
    }
  }
  if (hersteller !== 'unipark' && hersteller !== 'unbekannt') {
    const gruppen = new Map<string, string[]>();
    for (const sp of spalten) { if (sp.rolle === 'metadaten' || imSet.has(sp.name)) continue; const s = stammVon(sp.name); if (s) (gruppen.get(s.stamm) ?? gruppen.set(s.stamm, []).get(s.stamm)!).push(sp.name); }
    for (const [stamm, namen] of gruppen) {
      if (namen.length < 2) continue;
      const spw = namen.map(n => spalteVon(t, idx(n)));
      const ausserhalb = spalten.filter(sp => sp.name.startsWith(stamm + '_') && /_(TEXT|OTHER)$/i.test(sp.name) && !namen.includes(sp.name)).map(sp => sp.name);
      const zusatz = ausserhalb.length ? { ausserhalb } : {};
      if (hersteller === 'sosci') {
        const alle = spw.map(nurZahlen);
        if (alle.every(a => a === null || a.every(x => x === 1 || x === 2)) && alle.some(a => a?.includes(2))) mitSetId({ art: 'mehrfachset', name: stamm, spalten: namen, zaehlwert: 2, umkodierung: 'zaehlwert', quelle: 'hersteller', ...zusatz });
      } else if (hersteller === 'limesurvey') {
        const verschieden = spw.map(z => [...new Set(z.filter(c => !leerZelle(c)).map(c => text(c)))]);
        const alle = new Set(verschieden.flat());
        if (verschieden.every(x => x.length <= 1) && alle.size === 1 && verschieden.some(x => x.length === 1)) mitSetId({ art: 'mehrfachset', name: stamm, spalten: namen, zaehlwert: [...alle][0]!, umkodierung: 'nichtleer', quelle: 'muster', ...zusatz });
      } else if (hersteller === 'qualtrics') {
        const je = spw.map(z => [...new Set(z.filter(c => !leerZelle(c)).map(c => text(c)))]);
        const ohneNull = je.map(x => x.filter(w => zahlVon(w) !== 0));
        const mitNull = je.some(x => x.some(w => zahlVon(w) === 0));
        const ok = je.every((x, i) => x.length <= 2 && ohneNull[i]!.length <= 1) && ohneNull.some(x => x.length === 1);
        if (ok) mitSetId({ art: 'mehrfachset', name: stamm, spalten: namen, umkodierung: mitNull ? 'ungleichNull' : 'nichtleer', quelle: 'muster', ...zusatz });
      }
    }
  }

  /* ---- Paket 1B: Mehrfachauswahl in einer Zelle, doppelte Antworten, Raster ---- */
  const TRENNER: Partial<Record<Hersteller, string>> = { googleforms: GOOGLE_TRENNER, msforms: MSFORMS_TRENNER, nextcloud: NEXTCLOUD_TRENNER };
  const mzNamen = new Set<string>();
  for (const [i, sp] of spalten.entries()) {
    if (sp.rolle !== 'frage' || imSet.has(sp.name)) continue;
    // Kobo und ODK: nur mit XLSForm (die Sammelspalte mit Leerzeichen kennt ihre Optionen dann aus dem Plan); ohne Plan würde jede Freitextspalte mit Leerzeichen aufgeteilt
    const kz = kbSpalte(sp)?.mehrfachZelle;
    const trenner = kz?.trenner ?? TRENNER[hersteller];
    if (trenner === undefined) continue;
    const erg = pruefeMehrfachZelle(spalteVon(t, i), trenner, kz?.optionen);
    if (!erg) continue;
    mzNamen.add(sp.name);
    v.push({ id: `mehrfachzelle:${sp.name}`, art: 'mehrfachZelle', spalte: sp.name, trenner, optionen: erg.optionen, anders: erg.anders, unklar: erg.unklar });
  }
  if (['googleforms', 'msforms', 'nextcloud', 'cryptpad', 'kobo', 'moodlequestionnaire'].includes(hersteller)) {
    const idI = hersteller === 'msforms' ? spalten.findIndex(sp => sp.kopf.trim().toLowerCase() === 'id') : -1;
    const dd = doppelteZeilen(t.zeilen, idI >= 0 ? idI : undefined);
    if (dd.gruppen.length) v.push({ id: 'doppelte', art: 'doppelte', gruppen: dd.gruppen, grund: dd.grund });
  }
  if (hersteller === 'googleforms' || hersteller === 'nextcloud' || hersteller === 'cryptpad') {
    for (const b of rasterBloecke(spalten.filter(sp => sp.rolle === 'frage' && !imSet.has(sp.name)).map(sp => ({ name: sp.name, kopf: sp.kopf })), RASTER[hersteller])) v.push({ id: `itemblock:${b.frage}`, art: 'itemblock', frage: b.frage, spalten: b.spalten, items: b.items });
  }

  /* ---- Fehlendcodes ---- */
  const fehlendV: Vorschlag[] = [];
  for (const [i, sp] of spalten.entries()) {
    if (sp.rolle === 'metadaten' || imSet.has(sp.name)) continue;
    const zahlen = nurZahlen(spalteVon(t, i));
    if (!zahlen) continue;
    const vorh = sortiertEindeutig(zahlen);
    let codes: number[] = [], quelle: 'hersteller' | 'kodebuch' | 'hinweis' | null = null;
    const k = kbSpalte(sp);
    if (k?.fehlend?.length) {
      codes = vorh.filter(x => k.fehlend!.some(f => (typeof f === 'number' ? f === x : x >= f.von && x <= f.bis)));
      if (codes.length) quelle = 'kodebuch';
    }
    if (!quelle && CODES[hersteller]) {
      const herst = vorh.filter(x => CODES[hersteller]!.includes(x));
      if (hersteller === 'unipark' && herst.includes(-77) && vorh.includes(0) && nullIstCode(vorh) && !(k?.werteLabels && '0' in k.werteLabels)) herst.push(0);
      codes = sortiertEindeutig(herst);
      if (codes.length) quelle = 'hersteller';
    }
    if (!quelle) {
      const h = vorh.filter(x => HINWEIS_CODES.includes(x)), rest = vorh.filter(x => !HINWEIS_CODES.includes(x));
      if (h.length && rest.length && rest.every(x => x >= 0 && x <= 10)) { codes = h; quelle = 'hinweis'; }
    }
    if (!quelle || !codes.length) continue;
    const ohne = zahlen.filter(x => !codes.includes(x));
    fehlendV.push({ id: `fehlend:${sp.name}`, art: 'fehlend', spalte: sp.name, codes, quelle, wirkung: { mittelVorher: mittel(zahlen), mittelNachher: mittel(ohne), n: ohne.length } });
  }
  v.push(...fehlendV);

  /* ---- Metadaten, Personenbezug ---- */
  const metaNamen = spalten.filter(sp => sp.rolle === 'metadaten').map(sp => sp.name);
  if (metaNamen.length) v.push({ id: 'metadaten', art: 'metadaten', spalten: metaNamen });
  const pbNamen = spalten.filter(sp => sp.personenbezug).map(sp => sp.name);
  if (pbNamen.length) v.push({ id: 'personenbezug', art: 'personenbezug', spalten: pbNamen });

  /* ---- Test-, Vorschau-, unvollständige Fälle ---- */
  const nach = (name: string) => { const i = spalten.findIndex(sp => sp.kopf.trim().toLowerCase() === name.toLowerCase()); return i < 0 ? null : spalteVon(t, i); };
  const zeilenWo = (f: (z: number) => boolean) => t.zeilen.map((_, z) => z).filter(f);
  let test: number[] = [], unvoll: number[] = [], testGrund = '', unvollGrund = '';
  if (hersteller === 'sosci') {
    const mode = nach('MODE'), fin = nach('FINISHED');
    if (mode) { test = zeilenWo(z => !leerZelle(mode[z]) && klein(mode[z]) !== 'interview'); testGrund = L('MODE ist nicht „interview“ (Testlauf)', 'MODE is not "interview" (test run)'); }
    if (fin) { unvoll = zeilenWo(z => zahlVon(fin[z]) === 0); unvollGrund = L('FINISHED ist 0 (die letzte Seite wurde nicht erreicht)', 'FINISHED is 0 (the last page was not reached)'); }
  } else if (hersteller === 'limesurvey') {
    const sub = nach('submitdate');
    if (sub) { unvoll = zeilenWo(z => leerZelle(sub[z])); unvollGrund = L('submitdate ist leer (nicht abgeschickt)', 'submitdate is empty (not submitted)'); }
  } else if (hersteller === 'qualtrics') {
    const st = nach('Status'), dc = nach('DistributionChannel'), fin = nach('Finished'), pr = nach('Progress');
    test = zeilenWo(z => (st ? ['1', '2'].includes(text(st[z])) || /preview|test/i.test(text(st[z])) : false) || (dc ? ['preview', 'test'].includes(klein(dc[z])) : false));
    testGrund = L('Status oder DistributionChannel zeigt eine Vorschau oder einen Test', 'Status or DistributionChannel shows a preview or a test');
    unvoll = zeilenWo(z => (fin ? ['0', 'false'].includes(klein(fin[z])) : false) || (pr ? (zahlVon(pr[z]) ?? 100) < 100 : false));
    unvollGrund = L('Finished ist 0 oder Progress liegt unter 100', 'Finished is 0 or Progress is below 100');
  }
  if (test.length) v.push({ id: 'testfaelle', art: 'testfaelle', zeilen: test, grund: testGrund });
  if (unvoll.length) v.push({ id: 'unvollstaendige', art: 'unvollstaendige', zeilen: unvoll, grund: unvollGrund });
  if (hersteller === 'sosci') {
    const rsi = nach('TIME_RSI');
    if (rsi) { const z = zeilenWo(i => (zahlVon(rsi[i]) ?? 0) >= 2); if (z.length) v.push({ id: 'schnellantworter', art: 'schnellantworter', zeilen: z, grund: L('TIME_RSI ist 2 oder höher (Hinweis, kein Ausschluss)', 'TIME_RSI is 2 or higher (a hint, not an exclusion)') }); }
  }

  /* ---- Sets ---- */
  v.push(...sets);

  /* ---- Wertelabels aus dem Kodebuch ---- */
  if (kb) {
    for (const sp of spalten) {
      const k = kbSpalte(sp);
      if (k?.werteLabels && Object.keys(k.werteLabels).length) v.push({ id: `wertelabels:${sp.name}`, art: 'wertelabels', spalte: sp.name, labels: k.werteLabels });
    }
  }

  /* ---- Antworten als Text ---- */
  const textSpalten = spalten.map((sp, i) => ({ sp, i })).filter(({ sp }) => sp.rolle === 'frage' && !imSet.has(sp.name) && !mzNamen.has(sp.name) && !/_(TEXT|OTHER)$/i.test(sp.name));
  // Mehr als 12 verschiedene Texte kommen nie in Frage (siehe `kandidaten`): bei der 13. aufhören, statt für jede Zahlenspalte eine Million Texte in eine Menge zu legen (Große Daten 31.10.: 40 s bei 1 Mio. Zeilen).
  const werteTexte = (i: number) => { const m = new Set<string>(); for (const z of t.zeilen) { const c = z[i] ?? null; if (leerZelle(c)) continue; m.add(text(c)); if (m.size > 12) break; } return [...m]; };
  const kandidaten = textSpalten.map(({ sp, i }) => ({ sp, w: werteTexte(i) })).filter(x => x.w.length >= 1 && x.w.length <= 12 && x.w.every(a => zahlVon(a) === null));
  const bloecke = new Map<string, typeof kandidaten>();
  for (const k of kandidaten) {
    const st = stammVon(k.sp.name)?.stamm;
    const schluessel = st ? `s:${st}` : k.w.length >= 3 ? `m:${[...k.w].map(norm).sort().join('|')}` : '';
    if (schluessel) (bloecke.get(schluessel) ?? bloecke.set(schluessel, []).get(schluessel)!).push(k);
  }
  for (const [schl, liste] of bloecke) {
    if (liste.length < 2) continue;
    const alle = [...new Set(liste.flatMap(x => x.w))];
    if (alle.length > 12) continue;
    const stufen = bekannteSkala(alle);
    if (schl.startsWith('s:') && !stufen && liste.some(x => x.w.length < 2)) continue;
    v.push({ id: `text:${schl.slice(2)}`, art: 'textAntworten', spalten: liste.map(x => x.sp.name), stufen, vorbelegt: !!stufen });
  }

  e.vorschlaege = v;
  return e;
}

/* ------------------------------------------------------------------ .sav (Unipark u. a.) */
/** Erkennung in Daten aus einer .sav: Fehlend-Vorschläge nur für Codes, die noch nicht als fehlend gesetzt sind; `tabelle` bleibt leer. */
export function erkenneImSav(d: Daten): Erkennung {
  const kopf = d.spalten.map(s => s.name);
  const hersteller = erkenneHersteller(kopf);
  const meta = metaVon(hersteller);
  const vergeben = new Set<string>();
  const spalten: ErkSpalte[] = d.spalten.map((s, i) => ({ kopf: s.name, name: psppName(s.name, vergeben, i + 1), rolle: meta && meta.namen.test(s.name) ? 'metadaten' as const : 'frage' as const, ...(s.bezeichnung ? { label: s.bezeichnung } : {}) }));
  const v: Vorschlag[] = [];
  d.spalten.forEach((s: Spalte, i) => {
    if (s.art !== 'zahl' || spalten[i]!.rolle === 'metadaten') return;
    const zahlen = d.zeilen.map(z => z[i]).filter((x): x is number => typeof x === 'number' && Number.isFinite(x));
    if (!zahlen.length) return;
    const vorh = sortiertEindeutig(zahlen);
    let codes: number[] = [], quelle: 'hersteller' | 'hinweis' | null = null;
    if (CODES[hersteller]) {
      const herst = vorh.filter(x => CODES[hersteller]!.includes(x));
      if (hersteller === 'unipark' && herst.includes(-77) && vorh.includes(0) && nullIstCode(vorh) && !('0' in s.werteLabels)) herst.push(0);
      codes = sortiertEindeutig(herst).filter(c => !istFehlend(s, c));
      if (codes.length) quelle = 'hersteller';
    }
    if (!quelle) {
      const h = vorh.filter(x => HINWEIS_CODES.includes(x) && !istFehlend(s, x)), rest = vorh.filter(x => !HINWEIS_CODES.includes(x));
      if (h.length && rest.length && rest.every(x => x >= 0 && x <= 10) && !hatFehlend(s)) { codes = h; quelle = 'hinweis'; }
    }
    if (!quelle || !codes.length) return;
    const ohne = zahlen.filter(x => !codes.includes(x) && !istFehlend(s, x));
    v.push({ id: `fehlend:${s.name}`, art: 'fehlend', spalte: s.name, codes, quelle, wirkung: { mittelVorher: mittel(zahlen.filter(x => !istFehlend(s, x))), mittelNachher: mittel(ohne), n: ohne.length } });
  });
  return { hersteller, sicher: hersteller !== 'googleforms', kopfzeilen: 1, tabelle: { kopf: [], zeilen: [], quelle: '' }, beschriftungen: {}, spalten, vorschlaege: v, meldungen: [] };
}

/* ------------------------------------------------------------------ Mehrfach-Werte */
/** Je Datenzeile die Werte 1/0 (null = fehlt) der Set-Spalten nach der Umkodierung des Vorschlags. */
export function mehrfachWerte(e: Erkennung, setName: string): (number | null)[][] {
  const s = e.vorschlaege.find((x): x is Extract<Vorschlag, { art: 'mehrfachset' }> => x.art === 'mehrfachset' && x.name === setName);
  if (!s) return [];
  const cols = s.spalten.map(n => e.spalten.findIndex(sp => sp.name === n));
  return e.tabelle.zeilen.map(z => cols.map(c => {
    const zelle = c < 0 ? null : z[c] ?? null;
    if (s.umkodierung === 'nichtleer') return leerZelle(zelle) ? 0 : 1;
    if (leerZelle(zelle)) return null;
    if (s.umkodierung === 'ungleichNull') return zahlVon(zelle) === 0 ? 0 : 1;
    const zw = s.zaehlwert;
    return (typeof zw === 'number' ? zahlVon(zelle) === zw : klein(zelle) === String(zw).toLowerCase()) ? 1 : 0;
  }));
}

/* ------------------------------------------------------------------ Sätze */
export function erkennungSaetze(e: Erkennung): string[] {
  const s: string[] = [];
  if (e.hersteller === 'sosci') s.push(L('Das sieht nach einer Datei von SoSci Survey aus.', 'This looks like a file from SoSci Survey.'));
  else if (e.hersteller === 'limesurvey') s.push(L('Das sieht nach einer Datei von LimeSurvey aus.', 'This looks like a file from LimeSurvey.'));
  else if (e.hersteller === 'unipark') s.push(L('Das sieht nach einer Datei von Unipark aus.', 'This looks like a file from Unipark.'));
  else if (e.hersteller === 'qualtrics') s.push(L('Das sieht nach einer Datei von Qualtrics aus.', 'This looks like a file from Qualtrics.'));
  else if (HERSTELLER_NAME[e.hersteller]) {
    const name = HERSTELLER_NAME[e.hersteller];
    s.push(e.sicher ? L(`Das sieht nach einer Datei von ${name} aus.`, `This looks like a file from ${name}.`) : L(`Das sieht vermutlich nach einer Datei von ${name} aus.`, `This probably looks like a file from ${name}.`));
    if (NICHT_GEPRUEFT.includes(e.hersteller)) s.push(L('Das ist nach der Dokumentation bzw. dem Quellcode des Dienstes erkannt, nicht an echten Exporten geprüft: Bitte die Vorschläge genau ansehen.', 'This was recognised from the documentation or source code of the service and not checked against real exports: please look at the suggestions closely.'));
    if (!e.sicher) s.push(L('Die Zeitzone der Zeitstempel steht nicht in der Datei; Statable rät sie nicht.', 'The time zone of the timestamps is not in the file; Statable does not guess it.'));
  }
  else return s;
  const n = e.tabelle.zeilen.length;
  s.push(Lp(n, `Die Datei enthält ${n} Antwort.`, `Die Datei enthält ${n} Antworten.`, `The file contains ${n} answer.`, `The file contains ${n} answers.`));
  if (e.kopfzeilen === 3) s.push(L('Die ersten drei Zeilen sind Kopfzeilen; die Antworten beginnen in Zeile 4.', 'The first three rows are headings; the answers start in row 4.'));
  if (e.kopfzeilen === 2) s.push(L('Die zweite Zeile enthält die Fragetexte; die Antworten beginnen in Zeile 3.', 'The second row contains the question texts; the answers start in row 3.'));
  if (e.zeitzone) s.push(L(`Die Uhrzeiten stehen in der Zeitzone ${e.zeitzone}.`, `The times are in the time zone ${e.zeitzone}.`));
  const t = e.vorschlaege.find(x => x.art === 'testfaelle'), u = e.vorschlaege.find(x => x.art === 'unvollstaendige');
  if (t && t.art === 'testfaelle') { const k = t.zeilen.length; s.push(Lp(k, `${k} Antwort sieht nach einem Test oder einer Vorschau aus.`, `${k} Antworten sehen nach Tests oder Vorschauen aus.`, `${k} answer looks like a test or a preview.`, `${k} answers look like tests or previews.`)); }
  if (u && u.art === 'unvollstaendige') { const k = u.zeilen.length; s.push(Lp(k, `${k} Antwort ist unvollständig.`, `${k} Antworten sind unvollständig.`, `${k} answer is incomplete.`, `${k} answers are incomplete.`)); }
  return s;
}

const zeilenText = (z: number[]) => z.slice(0, 8).map(i => i + 1).join(', ') + (z.length > 8 ? ' …' : '');
export function vorschlagSatz(v: Vorschlag): string {
  switch (v.art) {
    case 'fehlend': {
      const c = aufzaehlung(v.codes.map(x => komma(x, 0).replace('−', '-')));
      const w = v.wirkung.mittelVorher !== null && v.wirkung.mittelNachher !== null
        ? ' ' + Lp(v.wirkung.n, `Der Mittelwert ist ohne Markierung ${komma(v.wirkung.mittelVorher)}, mit Markierung ${komma(v.wirkung.mittelNachher)} (${v.wirkung.n} Wert).`, `Der Mittelwert ist ohne Markierung ${komma(v.wirkung.mittelVorher)}, mit Markierung ${komma(v.wirkung.mittelNachher)} (${v.wirkung.n} Werte).`, `The mean is ${komma(v.wirkung.mittelVorher)} without the marking and ${komma(v.wirkung.mittelNachher)} with it (${v.wirkung.n} value).`, `The mean is ${komma(v.wirkung.mittelVorher)} without the marking and ${komma(v.wirkung.mittelNachher)} with it (${v.wirkung.n} values).`) : '';
      if (v.quelle === 'kodebuch') return L(`Das Kodebuch nennt ${c} in ${v.spalte} als fehlend. Als fehlend markieren?`, `The codebook lists ${c} in ${v.spalte} as missing. Mark as missing?`) + w;
      if (v.quelle === 'hersteller') return L(`${c} in ${v.spalte} sind bei diesem Werkzeug Codes für keine Antwort. Als fehlend markieren?`, `${c} in ${v.spalte} are codes for no answer in this tool. Mark as missing?`) + w;
      return L(`In ${v.spalte} steht ${c}. Das sieht aus wie ein Code für keine Antwort - als fehlend markieren?`, `${v.spalte} contains ${c}. This looks like a code for no answer - mark as missing?`) + w;
    }
    case 'metadaten': { const n = v.spalten.length; return Lp(n, `${n} Spalte enthält Angaben der Umfrage-Software (Zeiten, Status), keine Fragen. Als Metadaten markieren?`, `${n} Spalten enthalten Angaben der Umfrage-Software (Zeiten, Status), keine Fragen. Als Metadaten markieren?`, `${n} column holds information from the survey software (times, status), not questions. Mark as metadata?`, `${n} columns hold information from the survey software (times, status), not questions. Mark as metadata?`); }
    case 'personenbezug': return anrede(`Diese Spalten können Personen erkennbar machen: ${v.spalten.join(', ')}. Für die Abgabe solltest du sie entfernen.`, `Diese Spalten können Personen erkennbar machen: ${v.spalten.join(', ')}. Für die Abgabe sollten Sie sie entfernen.`, `These columns can make people identifiable: ${v.spalten.join(', ')}. You should remove them before handing in.`);
    case 'testfaelle': { const n = v.zeilen.length; return Lp(n, `${n} Antwort (Zeile ${zeilenText(v.zeilen)}) sieht nach einem Test oder einer Vorschau aus. Herausfiltern? Sie wird nicht gelöscht.`, `${n} Antworten (Zeilen ${zeilenText(v.zeilen)}) sehen nach Tests oder Vorschauen aus. Herausfiltern? Sie werden nicht gelöscht.`, `${n} answer (row ${zeilenText(v.zeilen)}) looks like a test or a preview. Filter it out? It is not deleted.`, `${n} answers (rows ${zeilenText(v.zeilen)}) look like tests or previews. Filter them out? They are not deleted.`); }
    case 'unvollstaendige': { const n = v.zeilen.length; return Lp(n, `${n} Antwort (Zeile ${zeilenText(v.zeilen)}) ist unvollständig. Herausfiltern? Sie wird nicht gelöscht.`, `${n} Antworten (Zeilen ${zeilenText(v.zeilen)}) sind unvollständig. Herausfiltern? Sie werden nicht gelöscht.`, `${n} answer (row ${zeilenText(v.zeilen)}) is incomplete. Filter it out? It is not deleted.`, `${n} answers (rows ${zeilenText(v.zeilen)}) are incomplete. Filter them out? They are not deleted.`); }
    case 'schnellantworter': { const n = v.zeilen.length; return Lp(n, `${n} Antwort (Zeile ${zeilenText(v.zeilen)}) wurde sehr schnell ausgefüllt. Das ist nur ein Hinweis, es wird nichts ausgeschlossen.`, `${n} Antworten (Zeilen ${zeilenText(v.zeilen)}) wurden sehr schnell ausgefüllt. Das ist nur ein Hinweis, es wird nichts ausgeschlossen.`, `${n} answer (row ${zeilenText(v.zeilen)}) was filled in very quickly. This is only a hint; nothing is excluded.`, `${n} answers (rows ${zeilenText(v.zeilen)}) were filled in very quickly. This is only a hint; nothing is excluded.`); }
    case 'mehrfachset': {
      const zw = v.zaehlwert === undefined ? '' : String(v.zaehlwert);
      return v.umkodierung === 'zaehlwert'
        ? L(`${v.spalten[0]} bis ${v.spalten.at(-1)} gehören zu einer Frage mit Mehrfachauswahl (angekreuzt = ${zw}). Als Set „${v.name}“ anlegen?`, `${v.spalten[0]} to ${v.spalten.at(-1)} belong to a multiple-choice question (checked = ${zw}). Create it as the set "${v.name}"?`)
        : L(`${v.spalten[0]} bis ${v.spalten.at(-1)} gehören zu einer Frage mit Mehrfachauswahl (eine Zelle mit Inhalt heißt angekreuzt, leer heißt nicht angekreuzt). Als Set „${v.name}“ anlegen?`, `${v.spalten[0]} to ${v.spalten.at(-1)} belong to a multiple-choice question (a filled cell means checked, empty means not checked). Create it as the set "${v.name}"?`);
    }
    case 'mehrfachZelle': {
      const k = v.unklar.length;
      const grundSatz = L(`In ${v.spalte} stehen mehrere Antworten in einer Zelle. Statable teilt sie auf: eine Spalte je Antwortmöglichkeit (${v.optionen.join(', ')}), 1 = angekreuzt, 0 = nicht angekreuzt.`, `${v.spalte} holds several answers in one cell. Statable splits them: one column per answer option (${v.optionen.join(', ')}), 1 = checked, 0 = not checked.`);
      const anders = v.anders ? ' ' + L('Was zu keiner Option passt, kommt als Text in die Spalte „…_anders“.', 'What fits no option goes as text into the column "…_anders".') : '';
      const unklar = k ? ' ' + anrede(`Bei ${k} Antwort${k === 1 ? '' : 'en'} ist nicht eindeutig, wie sie aufzuteilen ${k === 1 ? 'ist' : 'sind'}. Bitte entscheide selbst.`, `Bei ${k} Antwort${k === 1 ? '' : 'en'} ist nicht eindeutig, wie sie aufzuteilen ${k === 1 ? 'ist' : 'sind'}. Bitte entscheiden Sie selbst.`, `For ${k} answer${k === 1 ? ' it is' : 's it is'} not clear how to split ${k === 1 ? 'it' : 'them'}. Please decide yourself.`) : '';
      return grundSatz + anders + unklar;
    }
    case 'doppelte': {
      const zeilenZahl = v.gruppen.reduce((a, g) => a + g.length, 0), n = v.gruppen.length;
      const gr = Lp(n, `${n} Gruppe`, `${n} Gruppen`, `${n} group`, `${n} groups`);
      return v.grund === 'kennung'
        ? L(`${gr} von Antworten (${zeilenZahl} Zeilen) hat dieselbe ID. Vermutlich wurde dieselbe Antwort in einem späteren Export noch einmal mitgeliefert (doppelt). Je Gruppe die erste Zeile behalten und die übrigen kennzeichnen?`, `${gr} of answers (${zeilenZahl} rows) share the same ID. The same answer was probably delivered again in a later export (duplicate). Keep the first row of each group and flag the others?`)
        : L(`Diese Zeilen sind gleich (${gr}, ${zeilenZahl} Zeilen, zum Beispiel Zeile ${zeilenText(v.gruppen[0]!)}). Vermutlich wurde dieselbe Antwort zweimal exportiert. Je Gruppe die erste Zeile behalten und die übrigen kennzeichnen? Gelöscht wird nichts.`, `These rows are identical (${gr}, ${zeilenZahl} rows, for example row ${zeilenText(v.gruppen[0]!)}). The same answer was probably exported twice. Keep the first row of each group and flag the others? Nothing is deleted.`);
    }
    case 'itemblock': return L(`${v.spalten.length} Spalten gehören zur selben Rasterfrage „${v.frage}“ (Zeilen: ${v.items.join(', ')}). Statable ändert daran nichts; die Spalten bleiben einzeln und lassen sich später zusammen auswerten.`, `${v.spalten.length} columns belong to the same grid question "${v.frage}" (rows: ${v.items.join(', ')}). Statable changes nothing here; the columns stay separate and can be analysed together later.`);
    case 'wertelabels': { const n = Object.keys(v.labels).length; return L(`Für ${v.spalte} gibt es ${n} Wertebeschriftungen im Kodebuch. Übernehmen?`, `The codebook has ${n} value labels for ${v.spalte}. Apply them?`); }
    case 'textAntworten': return L(`In ${v.spalten.join(', ')} stehen die Antworten als Wörter. Zum Rechnen brauchen sie Zahlen; die Reihenfolge der Stufen kann Statable nicht erraten. Als neue Spalten mit Zahlen anlegen? Das Original bleibt.`, `In ${v.spalten.join(', ')} the answers are words. To calculate they need numbers; Statable cannot guess the order of the levels. Create new columns with numbers? The original stays.`);
  }
}
