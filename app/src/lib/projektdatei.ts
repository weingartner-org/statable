/**
 * Projekt als Datei (.statable): alles, was im Browser liegt, in einer Datei zum Mitnehmen.
 * Fassung 1: JSON (lesbar): Formatversion, Name, Quelle, die Daten als .sav (Base64), die Blätter (mit Notizen und Diagramm-Einstellungen), die Mehrfachantworten-Sets (`sets`),
 * die festgelegten Skalen (`skalen`; beide fehlen in älteren Dateien) und die Entscheidungen der Datenprüfung.
 * Fassung 2 (docs/erheben/ENTWURF-PROJEKTDATEI-2.md): ein ZIP (fflate) mit `statable.json` zuerst, `projekt.json`, `daten.sav` und den Fragebogen-Plänen samt Bildern.
 * Geschrieben wird Fassung 2 nur, wenn etwas Neues drin ist (ein Fragebogen-Plan); sonst Fassung 1, damit ältere Statable-Fassungen die Datei weiter öffnen.
 * Beides kommt von woanders: jedes Feld wird einzeln geprüft gelesen, nichts aus der Datei wird ausgeführt; unbekannte ZIP-Einträge werden weder entpackt noch gelesen, nur gemeldet.
 */
import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from 'fflate';
import type { Projekt } from './ablage';
import type { FragebogenPlan } from './fragebogenplan';
import type { Durchgang, PlanEingaben } from './doppeleingabe';
import { lesePretest, type PretestPlan } from './pretest';
import { L } from './sitzung.svelte';
import { entwurfWirksam, EINSAME_REGELN, type Entwurf, type EinsameRegel, type Gewicht } from './gewichte';
import { psppNameOk } from './befehlstext';
import { leseProtokoll, istPruefsumme } from './protokoll';
import { eurostatQuelleLesen } from './eurostatquelle';
import { leseZusatz } from './zusatz';
import { leseIntegration, integrationAusgefuellt } from './integration';
import { leseCodeSpalten } from './codespalten';
import { leseLeitfaeden } from './leitfaden';
import { pruefeQualProjekt, qualFassung } from './qualprojekt';
import { konsensAlsJson, leseKonsensEntwurf } from './konsens-zustand';
import { lesePlanung } from './planung';

/** Plausibilitätsregeln und Karte aus der Datei: geprüft gelesen; ist nichts Brauchbares darin, bleibt das Feld weg. */
function zusatzFeld(x: unknown): Pick<Projekt, 'zusatz'> { const z = leseZusatz(x); return z.plausi || z.karte ? { zusatz: z } : {}; }

export const ENDUNG = '.statable';
export const FORMAT = 'statable-projekt';
export const VERSION = 1;
/** Fassung 2: ZIP-Behälter. */
export const VERSION_ZIP = 2;
/**
 * Schutz vor ZIP-Bomben, aus dem ZIP-Verzeichnis vor dem Entpacken: entpackt höchstens 2 GB und höchstens das 100-fache der Dateigröße.
 * Unter 100 KB entpackt gilt die 100-fach-Regel nicht (damit winzige Projekte nicht fälschlich fallen; so legt es der Kopf von projektdatei-2.test.ts fest).
 */
export const MAX_ENTPACKT = 2 * 1024 ** 3;
export const MAX_FAKTOR = 100;
export const FAKTOR_AB = 100 * 1024;

export class ProjektdateiFehler extends Error {
  grund: 'unlesbar' | 'neuer' | 'zugross';
  constructor(grund: 'unlesbar' | 'neuer' | 'zugross') { super(grund); this.grund = grund; }
}
/** Beim Öffnen einer Fassung-2-Datei: etwas, das Statable nicht kennt und übersprungen hat (nie entpackt, nie gelesen). */
export interface DateiMeldung { art: 'unbekannterEintrag' | 'planungKaputt' | 'leitfadenKaputt' | 'qualKaputt' | 'qualQuelleFehlt' | 'konsensKaputt'; name: string; satz: string }

function zuBase64(b: Uint8Array): string {
  let t = '';
  for (let i = 0; i < b.length; i += 0x8000) t += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(t);
}
function ausBase64(t: string): Uint8Array {
  const r = atob(t), b = new Uint8Array(r.length);
  for (let i = 0; i < r.length; i++) b[i] = r.charCodeAt(i);
  return b;
}

/* JSON kennt kein NaN und kein Unendlich - in Ergebnissen kommen sie vor. Darum als kleine Marke ablegen. */
const ZAHL = '$statable-zahl';
const ersetzer = (_: string, v: unknown) => (typeof v === 'number' && !Number.isFinite(v) ? { [ZAHL]: String(v) } : v);
const zurueck = (_: string, v: unknown) => (v && typeof v === 'object' && ZAHL in v ? Number((v as Record<string, string>)[ZAHL]) : v);

/** Alle Felder eines Projekts außer den Daten (.sav) und den Fragebogen-Plänen: für Fassung 1 und für `projekt.json` in Fassung 2 gleich. */
function felder(p: Projekt) {
  return { name: p.name, quelle: p.quelle, zeit: p.zeit, blaetter: p.blaetter, sets: p.sets ?? [], skalen: p.skalen ?? [], ...(p.codeSpalten?.length ? { codeSpalten: p.codeSpalten } : {}), entscheid: p.entscheid, ...(p.gewicht ? { gewicht: p.gewicht } : {}), ...(p.protokoll ? { protokoll: p.protokoll, protokollLuecke: p.protokollLuecke === true } : {}), ...(p.datei ? { datei: p.datei } : {}), ...(p.zusatz && (p.zusatz.plausi || p.zusatz.karte) ? { zusatz: p.zusatz } : {}), ...(integrationAusgefuellt(p.integration) ? { integration: p.integration } : {}), ...(p.enthaeltZitate ? { enthaeltZitate: true } : {}) };
}
const alsJson = (x: unknown): Uint8Array => strToU8(JSON.stringify(x, ersetzer));

/** Die Pfade im ZIP: Plan `fragebogen/<plan-id>.json`, Bild `fragebogen/<plan-id>/<datei>` (Schlüssel im Projekt: `<plan-id>/<datei>`). */
const planPfad = (id: string) => `fragebogen/${id}.json`;
/** Paket 2F: die Durchgänge der Eingabe, `fragebogen/<plan-id>/eingabe-<A|B|einfach>.json`. */
const DURCHGAENGE = ['A', 'B', 'einfach'] as const;
const bildPfad = (schluessel: string) => `fragebogen/${schluessel}`;
/** Paket 4D: die Interview-Leitfäden (Stufe 4). */
const LEITFADEN_PFAD = 'qualitativ/leitfaeden.json';
/** Stufe V2: die Forschungsplanung (Datenmanagementplan, Präregistrierung). */
const PLANUNG_PFAD = 'planung/planung.json';
/** Paket 4C: das qualitative Projekt. Modell ohne Texte in `qualitativ/projekt.json`, jeder Text als UTF-8 (ohne Marke) in `qualitativ/quellen/<dokument-id>.txt`. */
const QUAL_PFAD = 'qualitativ/projekt.json';
/** Paket 5E1: die offenen Entscheidungen beim Konsens (nur mit qualitativem Projekt). */
const KONSENS_PFAD = 'qualitativ/konsens.json';
const QUELLEN_ORDNER = 'qualitativ/quellen/';
const quellePfad = (dokId: string) => `${QUELLEN_ORDNER}${encodeURIComponent(dokId)}.txt`;
const quelleArt = (name: string) => name.startsWith(QUELLEN_ORDNER) && /^[^/\\]+\.txt$/.test(name.slice(QUELLEN_ORDNER.length)) && !/(^|\/)\.\.?(\/|$)/.test(name);

/**
 * Das Projekt als Datei (Bytes). Ohne Neues (kein Fragebogen-Plan) Fassung 1 (JSON, UTF-8, beginnt mit `{`); mit Plan Fassung 2 (ZIP, `statable.json` als erster Eintrag).
 * Text wird gepackt, Bilder und andere Medien ungepackt (schon komprimiert).
 */
export function projektAlsDatei(p: Projekt): Uint8Array {
  const plaene = p.fragebogen ?? [];
  const leitfaeden = p.leitfaeden ?? [];
  const qual = p.qual;
  const planung = p.planung ?? [];
  if (!plaene.length && !leitfaeden.length && !planung.length && !qual) { const { name, quelle, zeit, ...rest } = felder(p); return alsJson({ format: FORMAT, version: VERSION, name, quelle, zeit, sav: zuBase64(p.sav), ...rest }); }
  const bilder = Object.entries(p.fragebogenBilder ?? {});
  const eingaben = Object.entries(p.eingaben ?? {}).flatMap(([id, e]) => (plaene.some(x => x.id === id) ? DURCHGAENGE.flatMap(d => (e[d] ? [[`fragebogen/${id}/eingabe-${d}.json`, e[d]] as const] : [])) : []));
  const pretests = Object.entries(p.pretest ?? {}).filter(([id, e]) => plaene.some(x => x.id === id) && (e.vorschau.length || e.daten.length)).map(([id, e]) => [`fragebogen/${id}/pretest.json`, e] as const);
  const inhalt = ['projekt.json', 'daten.sav', ...plaene.map(x => planPfad(x.id)), ...bilder.map(([k]) => bildPfad(k)), ...eingaben.map(([n]) => n), ...pretests.map(([n]) => n), ...(leitfaeden.length ? [LEITFADEN_PFAD] : []), ...(planung.length ? [PLANUNG_PFAD] : []), ...(qual ? [QUAL_PFAD, ...qual.dokumente.map(d => quellePfad(d.id)), ...(p.konsens ? [KONSENS_PFAD] : [])] : [])];
  const zip: Zippable = { 'statable.json': alsJson({ format: FORMAT, version: VERSION_ZIP, inhalt }), 'projekt.json': alsJson(felder(p)), 'daten.sav': p.sav };
  for (const x of plaene) zip[planPfad(x.id)] = alsJson(x);
  for (const [n, d] of eingaben) zip[n] = alsJson(d);
  for (const [n, d] of pretests) zip[n] = alsJson(d);
  if (leitfaeden.length) zip[LEITFADEN_PFAD] = alsJson(leitfaeden);
  if (planung.length) zip[PLANUNG_PFAD] = alsJson(planung);
  if (qual) {
    const { _unbekannt, ...qualBekannt } = qual;   // Felder aus einer neueren Fassung wieder an ihren Platz (Architekturblatt Feinstruktur, Abschnitt 5)
    zip[QUAL_PFAD] = alsJson({ ...(_unbekannt ?? {}), ...qualBekannt, version: qualFassung(qual), dokumente: qual.dokumente.map(({ text: _t, ...rest }) => rest) });
    for (const d of qual.dokumente) zip[quellePfad(d.id)] = strToU8(d.text);
    if (p.konsens) zip[KONSENS_PFAD] = alsJson(konsensAlsJson(p.konsens));
  }
  for (const [k, b] of bilder) zip[bildPfad(k)] = [b, { level: 0 }];
  return zipSync(zip);
}

/** Der Stichprobenplan aus der Datei (Abschnitt 6, Teil A): nur Namen als Text und eine der vier Regeln für Schichten mit einem Klumpen; alles andere fällt weg (fehlt in älteren Dateien). */
const entwurfAus = (e: unknown): { entwurf?: Entwurf } => {
  if (!e || typeof e !== 'object') return {};
  const o = e as Record<string, unknown>, text = (k: string) => (typeof o[k] === 'string' && (o[k] as string).length > 0 && (o[k] as string).length <= 200 ? { [k]: o[k] as string } : {});
  const w = entwurfWirksam({ ...text('klumpen'), ...text('klumpen2'), ...text('schicht'), ...text('fpc'), ...text('fpc2'), ...(typeof o.einsam === 'string' && (EINSAME_REGELN as readonly string[]).includes(o.einsam) ? { einsam: o.einsam as EinsameRegel } : {}) });
  return w ? { entwurf: w } : {};
};
/** Das Fallgewicht aus der Datei: nur eine Spalte und eine der zwei Arten (bei Umfrage mit der Antwort „einzeln gezogen“, falls vorhanden) gelten, alles andere ist „ungewichtet“. */
export const gewichtAus = (g: unknown): Gewicht | null => (g && typeof g === 'object' && typeof (g as Gewicht).spalte === 'string' && ((g as Gewicht).art === 'haeufigkeit' || (g as Gewicht).art === 'umfrage')
  ? { spalte: (g as Gewicht).spalte, art: (g as Gewicht).art, ...((g as Gewicht).art === 'umfrage' && typeof (g as Gewicht).klumpenfrei === 'boolean' ? { klumpenfrei: (g as Gewicht).klumpenfrei } : {}), ...(entwurfAus((g as Gewicht).art === 'umfrage' && (g as Gewicht).klumpenfrei === true ? (g as Gewicht).entwurf : undefined)) } : null);   // `klumpenfrei` (Später S-D2) fehlt in älteren Dateien = nicht beantwortet

/**
 * Eine Projektdatei kommt von woanders: Spaltennamen im Blatt (l1, l2, l3) gehen später in PSPP-Befehle. Was kein möglicher PSPP-Variablenname ist
 * (Apostroph, Leerzeichen, Zeilenumbruch, Klammer, Semikolon …), wird verworfen - ein echter Name besteht die Prüfung immer.
 */
export function namenPruefen<T extends { l1?: unknown; l2?: unknown; l3?: unknown }>(b: T): T {
  if (!b || typeof b !== 'object') return b;
  const aus = { ...b } as Record<string, unknown>;
  // l3 trägt bei manchen Blättern Platzhalter ('') an festen Stellen: die Plätze bleiben, nur unmögliche Namen werden zu ''.
  for (const k of ['l1', 'l2'] as const) if (aus[k] != null && aus[k] !== '' && !psppNameOk(aus[k])) aus[k] = null;
  if (aus.l3 !== undefined) aus.l3 = Array.isArray(aus.l3) ? aus.l3.map(x => (x === '' || psppNameOk(x) ? x : '')) : [];
  return aus as T;
}

/**
 * Das Protokoll jeder Datenänderung (Abschnitt 6, Teil B) und die Prüfsumme der Datei, aus der die Daten kamen. Beides fehlt in Dateien aus der Zeit davor: dann fehlt es auch im Ergebnis,
 * und das Projekt gilt als „Protokoll beginnt mit dieser Fassung“ (protokollLuecke).
 */
function leseProtokollFelder(o: Record<string, unknown>): Pick<Projekt, 'protokoll' | 'protokollLuecke' | 'datei'> {
  const r: Pick<Projekt, 'protokoll' | 'protokollLuecke' | 'datei'> = {};
  if (Array.isArray(o.protokoll)) { r.protokoll = leseProtokoll(o.protokoll, psppNameOk, gewichtAus); r.protokollLuecke = o.protokollLuecke === true; }
  const d = o.datei as Record<string, unknown> | undefined;
  if (d && typeof d === 'object' && typeof d.name === 'string') { const eurostat = eurostatQuelleLesen(d.eurostat); r.datei = { name: d.name.slice(0, 200), sha256: istPruefsumme(d.sha256) ? d.sha256 : null, ...(eurostat ? { eurostat } : {}) }; }
  return r;
}

/** Aus dem gelesenen JSON-Objekt (Fassung 1 ganz, Fassung 2 aus `projekt.json`) und den Daten das Projekt bauen, jedes Feld geprüft. */
function projektAus(o: Record<string, unknown>, sav: Uint8Array): Projekt {
  return {
    name: typeof o.name === 'string' && o.name ? o.name : 'Statable', quelle: typeof o.quelle === 'string' ? o.quelle : '',
    sav, blaetter: (o.blaetter as Projekt['blaetter']).map(namenPruefen), sets: Array.isArray(o.sets) ? (o.sets as NonNullable<Projekt['sets']>).filter(x => x && typeof x === 'object' && Array.isArray(x.spalten)).map(x => ({ ...x, spalten: x.spalten.filter(psppNameOk) })) : [], skalen: Array.isArray(o.skalen) ? (o.skalen as Projekt['skalen'])!.filter(x => x && typeof x.name === 'string' && Array.isArray(x.fragen) && x.fragen.every(f => typeof f === 'string')) : [], entscheid: (o.entscheid ?? {}) as Projekt['entscheid'],
    ...(gewichtAus(o.gewicht) ? { gewicht: gewichtAus(o.gewicht)! } : {}),
    ...(o.enthaeltZitate === true ? { enthaeltZitate: true } : {}),
    ...(leseCodeSpalten(o.codeSpalten).length ? { codeSpalten: leseCodeSpalten(o.codeSpalten) } : {}),
    ...leseProtokollFelder(o),
    ...(o.zusatz !== undefined ? zusatzFeld(o.zusatz) : {}),
    ...(leseIntegration(o.integration) ? { integration: leseIntegration(o.integration)! } : {}),
    zeit: typeof o.zeit === 'number' ? o.zeit : Date.now()
  };
}

/** Ein JSON-Eintrag des ZIP als Objekt; fehlt er oder ist er kaputt: unlesbar. */
function json(b: Uint8Array | undefined): Record<string, unknown> {
  if (!b) throw new ProjektdateiFehler('unlesbar');
  try { const o = JSON.parse(strFromU8(b), zurueck); if (o && typeof o === 'object' && !Array.isArray(o)) return o as Record<string, unknown>; } catch { /* unten */ }
  throw new ProjektdateiFehler('unlesbar');
}

/** Fassung 1: JSON-Text. */
function leseFassung1(bytes: Uint8Array): Projekt {
  let o: Record<string, unknown>;
  try { o = JSON.parse(new TextDecoder('utf-8').decode(bytes), zurueck); } catch { throw new ProjektdateiFehler('unlesbar'); }
  if (!o || o.format !== FORMAT || typeof o.sav !== 'string' || !Array.isArray(o.blaetter)) throw new ProjektdateiFehler('unlesbar');
  if (typeof o.version !== 'number' || o.version > VERSION) throw new ProjektdateiFehler('neuer');
  let sav: Uint8Array;
  try { sav = ausBase64(o.sav); } catch { throw new ProjektdateiFehler('unlesbar'); }
  return projektAus(o, sav);
}

/** Die Namen und angegebenen entpackten Größen aus dem ZIP-Verzeichnis (Central Directory), ohne etwas zu entpacken. Ein Zip64-Archiv gilt als zu groß (das hier erzeugt Statable nie). */
function verzeichnis(b: Uint8Array): { name: string; groesse: number }[] {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let e = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 22 - 0xffff); i--) if (dv.getUint32(i, true) === 0x06054b50) { e = i; break; }
  if (e < 0) throw new ProjektdateiFehler('unlesbar');
  const anzahl = dv.getUint16(e + 10, true), groesseVz = dv.getUint32(e + 12, true), ab = dv.getUint32(e + 16, true);
  if (anzahl === 0xffff || groesseVz === 0xffffffff || ab === 0xffffffff) throw new ProjektdateiFehler('zugross');
  const aus: { name: string; groesse: number }[] = [];
  let i = ab;
  for (let k = 0; k < anzahl; k++) {
    if (i + 46 > b.length || dv.getUint32(i, true) !== 0x02014b50) throw new ProjektdateiFehler('unlesbar');
    const nl = dv.getUint16(i + 28, true), el = dv.getUint16(i + 30, true), kl = dv.getUint16(i + 32, true);
    if (i + 46 + nl > b.length) throw new ProjektdateiFehler('unlesbar');
    aus.push({ name: strFromU8(b.subarray(i + 46, i + 46 + nl), true), groesse: dv.getUint32(i + 24, true) });
    i += 46 + nl + el + kl;
  }
  return aus;
}

/** Die Art eines bekannten Eintrags; Pfade mit `..`, Rückstrich, doppeltem oder führendem `/` und alles andere sind unbekannt (`null`). */
function eintragsart(name: string): 'kopf' | 'projekt' | 'daten' | 'plan' | 'bild' | 'eingabe' | 'pretest' | 'leitfaeden' | 'planung' | 'qual' | 'quelle' | 'konsens' | null {
  if (name === 'statable.json') return 'kopf';
  if (name === 'projekt.json') return 'projekt';
  if (name === 'daten.sav') return 'daten';
  if (name === LEITFADEN_PFAD) return 'leitfaeden';
  if (name === PLANUNG_PFAD) return 'planung';
  if (name === QUAL_PFAD) return 'qual';
  if (name === KONSENS_PFAD) return 'konsens';
  if (quelleArt(name)) return 'quelle';
  if (!name.startsWith('fragebogen/') || /\\|\/\/|^\/|(^|\/)\.\.?(\/|$)/.test(name)) return null;
  const rest = name.slice('fragebogen/'.length);
  if (/^[^/]+\.json$/.test(rest)) return 'plan';
  if (/^[^/]+\/eingabe-(A|B|einfach)\.json$/.test(rest)) return 'eingabe';
  if (/^[^/]+\/pretest\.json$/.test(rest)) return 'pretest';
  if (/^[^/]+\/[^/]+(\/[^/]+)*$/.test(rest)) return 'bild';
  return null;
}

/** Ein Fragebogen-Plan aus der Datei: Form geprüft (der Inhalt wird beim Öffnen des Plans in „Fragebogen planen“ weiter mit `planPruefen` geprüft); ein kaputter Plan wird nie still verworfen. */
function lesePlan(b: Uint8Array, id: string): FragebogenPlan {
  const o = json(b);
  if (o.format !== 'statable-fragebogen' || o.id !== id || typeof o.version !== 'number' || !Array.isArray(o.sprachen) || !o.sprachen.every(x => typeof x === 'string')
    || !Array.isArray(o.elemente) || !Array.isArray(o.antwortlisten) || !Array.isArray(o.skalen) || !o.titel || typeof o.titel !== 'object' || !o.einstellungen || typeof o.einstellungen !== 'object') throw new ProjektdateiFehler('unlesbar');
  return o as unknown as FragebogenPlan;
}

/** Ein Durchgang der Eingabe aus der Datei: nur Bogen-Nummern (Text) mit Zahlen, Zahlenlisten und Text als Werten; alles andere fällt weg. */
function leseDurchgang(b: Uint8Array): Durchgang {
  const o = json(b), aus: Durchgang = {};
  for (const [bogen, a] of Object.entries(o)) {
    if (bogen === '__proto__' || !a || typeof a !== 'object' || Array.isArray(a)) continue;
    const ant: Durchgang[string] = {};
    for (const [k, v] of Object.entries(a as Record<string, unknown>)) {
      if (k === '__proto__') continue;
      if (typeof v === 'number' && Number.isFinite(v)) ant[k] = v;
      else if (typeof v === 'string') ant[k] = v.slice(0, 10000);
      else if (Array.isArray(v) && v.every(x => typeof x === 'number' && Number.isFinite(x))) ant[k] = v as number[];
    }
    aus[bogen] = ant;
  }
  return aus;
}

/** Fassung 2: ZIP. Die Größen aus dem Verzeichnis werden vor dem Entpacken geprüft; unbekannte Einträge werden nicht entpackt. */
function leseFassung2(bytes: Uint8Array): { projekt: Projekt; meldungen: DateiMeldung[] } {
  const eintraege = verzeichnis(bytes);
  const summe = eintraege.reduce((a, x) => a + x.groesse, 0);
  if (eintraege.some(x => x.groesse > MAX_ENTPACKT) || summe > MAX_ENTPACKT || (summe > FAKTOR_AB && summe > MAX_FAKTOR * bytes.length)) throw new ProjektdateiFehler('zugross');
  const bekannt = new Set(eintraege.map(x => x.name).filter(n => eintragsart(n)));
  let z: Record<string, Uint8Array>;
  try { z = unzipSync(bytes, { filter: f => bekannt.has(f.name) }); } catch { throw new ProjektdateiFehler('unlesbar'); }
  const kopf = json(z['statable.json']);
  if (kopf.format !== FORMAT || typeof kopf.version !== 'number') throw new ProjektdateiFehler('unlesbar');
  if (kopf.version > VERSION_ZIP) throw new ProjektdateiFehler('neuer');
  if (!z['projekt.json'] || !z['daten.sav']) throw new ProjektdateiFehler('unlesbar');
  if (Array.isArray(kopf.inhalt) && kopf.inhalt.some(n => typeof n === 'string' && eintragsart(n) && eintragsart(n) !== 'quelle' && !z[n])) throw new ProjektdateiFehler('unlesbar');
  const o = json(z['projekt.json']);
  if (!Array.isArray(o.blaetter)) throw new ProjektdateiFehler('unlesbar');
  const projekt = projektAus(o, z['daten.sav']);
  const plaene: FragebogenPlan[] = [], bilder: Record<string, Uint8Array> = {}, meldungen: DateiMeldung[] = [], eingaben: Record<string, PlanEingaben> = {}, pretest: Record<string, PretestPlan> = {};
  for (const { name } of eintraege) {
    const art = eintragsart(name);
    if (!art) { meldungen.push({ art: 'unbekannterEintrag', name, satz: L(`Die Datei enthält „${name}“. Das kennt diese Statable-Fassung nicht; der Eintrag wird übersprungen.`, `The file contains "${name}". This version of Statable does not know it; the entry is skipped.`) }); continue; }
    if (art === 'leitfaeden') {
      try { const l = leseLeitfaeden(JSON.parse(strFromU8(z[name]!))); if (l.length) projekt.leitfaeden = l; }
      catch { meldungen.push({ art: 'leitfadenKaputt', name, satz: L('Die Interview-Leitfäden in der Datei ließen sich nicht lesen und wurden übersprungen. Der Rest des Projekts ist geöffnet.', 'The interview guides in the file could not be read and were skipped. The rest of the project is open.') }); }
    }
    else if (art === 'planung') {
      try { const l = lesePlanung(JSON.parse(strFromU8(z[name]!))); if (l.length) projekt.planung = l; }
      catch { meldungen.push({ art: 'planungKaputt', name, satz: L('Die Forschungsplanung (Datenmanagementplan, Präregistrierung) in der Datei ließ sich nicht lesen und wurde übersprungen. Der Rest des Projekts ist geöffnet.', 'The research planning (data management plan, preregistration) in the file could not be read and was skipped. The rest of the project is open.') }); }
    }
    else if (art === 'qual') {
      try {
        const o = json(z[name]!);
        const doks = Array.isArray(o.dokumente) ? o.dokumente : [];
        const fehlen: string[] = [];
        for (const d of doks) {
          if (!d || typeof d !== 'object' || typeof (d as Record<string, unknown>).id !== 'string') continue;
          const q = z[quellePfad((d as { id: string }).id)];
          if (q) (d as Record<string, unknown>).text = strFromU8(q);
          else fehlen.push(String((d as { name?: unknown }).name ?? (d as { id: string }).id));
        }
        projekt.qual = pruefeQualProjekt(o);
        for (const n of fehlen) meldungen.push({ art: 'qualQuelleFehlt', name: n, satz: L(`Der Text des Transkripts „${n}“ fehlt in der Datei. Das Dokument ist geöffnet, aber leer.`, `The text of the transcript "${n}" is missing from the file. The document is open but empty.`) });
      } catch { meldungen.push({ art: 'qualKaputt', name, satz: L('Die Interviews und Transkripte in der Datei ließen sich nicht lesen und wurden übersprungen. Der Rest des Projekts ist geöffnet.', 'The interviews and transcripts in the file could not be read and were skipped. The rest of the project is open.') }); }
    }
    else if (art === 'konsens') { /* wird nach der Schleife gelesen, damit es zum qualitativen Projekt passt */ }
    else if (art === 'quelle') { /* wird bei `qual` gelesen; eine Quelle ohne Dokument bleibt ungenutzt */ }
    else if (art === 'plan') plaene.push(lesePlan(z[name]!, name.slice('fragebogen/'.length, -'.json'.length)));
    else if (art === 'bild') bilder[name.slice('fragebogen/'.length)] = z[name]!;
    else if (art === 'pretest') { const id = /^fragebogen\/([^/]+)\/pretest\.json$/.exec(name)![1]!; let pt: PretestPlan | null = null; try { pt = lesePretest(json(z[name]!)); } catch { pt = null; } if (pt) Object.defineProperty(pretest, id, { value: pt, enumerable: true, writable: true, configurable: true }); }
    else if (art === 'eingabe') { const m = /^fragebogen\/([^/]+)\/eingabe-(A|B|einfach)\.json$/.exec(name)!; (eingaben[m[1]!] ??= {})[m[2] as 'A' | 'B' | 'einfach'] = leseDurchgang(z[name]!); }
  }
  const kn = eintraege.find(x => x.name === KONSENS_PFAD) && z[KONSENS_PFAD];
  if (kn) {
    try {
      const k = leseKonsensEntwurf(JSON.parse(strFromU8(kn)));
      const ids = new Set(projekt.qual?.kodierende.map(x => x.id));
      if (projekt.qual && ids.has(k.a) && ids.has(k.b)) projekt.konsens = k;
      else throw new Error('Personen unbekannt');
    } catch { meldungen.push({ art: 'konsensKaputt', name: KONSENS_PFAD, satz: L('Die offenen Entscheidungen beim Konsens in der Datei ließen sich nicht lesen und wurden übersprungen. Der Rest des Projekts ist geöffnet.', 'The open consensus decisions in the file could not be read and were skipped. The rest of the project is open.') }); }
  }
  for (const id of Object.keys(eingaben)) if (!plaene.some(x => x.id === id)) delete eingaben[id];
  if (Object.keys(eingaben).length) projekt.eingaben = eingaben;
  for (const id of Object.keys(pretest)) if (!plaene.some(x => x.id === id)) delete pretest[id];
  if (Object.keys(pretest).length) projekt.pretest = pretest;
  if (plaene.length) projekt.fragebogen = plaene;
  if (Object.keys(bilder).length) projekt.fragebogenBilder = bilder;
  return { projekt, meldungen };
}

/**
 * Liest eine .statable-Datei aus ihren Bytes und meldet, was übersprungen wurde. Erkannt wird an den ersten Bytes: `PK\x03\x04` = Fassung 2 (ZIP),
 * `{` (nach Leerraum und UTF-8-Marke) = Fassung 1, sonst unlesbar. Wirft ProjektdateiFehler (`unlesbar`, `neuer`, `zugross`).
 */
export function leseProjektdateiMitMeldungen(bytes: Uint8Array): { projekt: Projekt; meldungen: DateiMeldung[] } {
  if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) return leseFassung2(bytes);
  let i = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? 3 : 0;
  while (i < bytes.length && (bytes[i] === 0x20 || bytes[i] === 0x09 || bytes[i] === 0x0a || bytes[i] === 0x0d)) i++;
  if (bytes[i] === 0x7b) return { projekt: leseFassung1(bytes), meldungen: [] };
  throw new ProjektdateiFehler('unlesbar');
}
/** Wie `leseProjektdateiMitMeldungen`, ohne die Meldungen. */
export function leseProjektdatei(bytes: Uint8Array): Projekt { return leseProjektdateiMitMeldungen(bytes).projekt; }

/** Dateiname ohne verbotene Zeichen, mit Endung. */
export const projektDateiname = (name: string) => (name || 'Statable').replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ').trim().slice(0, 80) + ENDUNG;
