/**
 * Die eigene Datei `.statable-fragebogen.json` (Paket 2C): ein Fragebogen-Plan mit seinen Bildern, als UTF-8-JSON.
 *
 *   { "format": "statable-fragebogen-datei", "version": 1, "plan": { … Plan … }, "bilder": { "<datei>": "<Base64>" } }
 *
 * Die Datei kommt von woanders: `planAusDatei` prüft die FORM gründlich (Typen, Pflichtfelder, Dateinamen der Bilder) und wirft `PlanDateiFehler`, statt etwas zu raten.
 * Der Inhalt (Texte, Namen) bleibt Text; er gelangt nirgends in einen Befehl. Ob der Plan fachlich in Ordnung ist, sagt danach `planPruefen`.
 */
import type { FragebogenPlan } from './fragebogenplan';
import { neueId } from './fragebogenplan-editor';

export const PLAN_ENDUNG = '.statable-fragebogen.json';
export const PLAN_DATEI_FORMAT = 'statable-fragebogen-datei';
/** Größe: höchstens 30 MB Datei, ein Bild höchstens 5 MB. */
export const MAX_DATEI = 30 * 1024 * 1024;
export const MAX_BILD = 5 * 1024 * 1024;

export class PlanDateiFehler extends Error {
  constructor(readonly art: 'unlesbar' | 'neuer' | 'zugross', readonly grund = '') { super(`${art}${grund ? ': ' + grund : ''}`); }
}

const zuBase64 = (b: Uint8Array): string => { let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000)); return btoa(s); };
const ausBase64 = (t: string): Uint8Array => { const s = atob(t); const b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return b; };

/** Ein Dateiname für ein Bild: nur ein Name, kein Pfad (nie `..`, `/`, `\`). */
export const bildNameOk = (n: unknown): n is string => typeof n === 'string' && n.length > 0 && n.length <= 120 && !/[\\/\0]|^\.\.?$/.test(n) && !/^\s|\s$/.test(n);
/** Macht aus einem beliebigen Dateinamen einen erlaubten (Pfadteile weg, seltsame Zeichen zu _). */
export const bildNameAus = (n: string): string => { const x = (n.split(/[\\/]/).pop() ?? '').replace(/[^\p{L}\p{N}._ -]+/gu, '_').trim().slice(0, 120); return x && x !== '.' && x !== '..' ? x : 'bild'; };

const obj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const lokOk = (x: unknown): boolean => obj(x) && Object.values(x).every(v => typeof v === 'string');
const lokOpt = (x: unknown): boolean => x === undefined || lokOk(x);
const bildOk = (x: unknown): boolean => x === undefined || (obj(x) && bildNameOk(x.datei) && lokOk(x.alt));
const bedOk = (x: unknown, tiefe = 0): boolean => {
  if (x === undefined) return true;
  if (!obj(x) || tiefe > 12) return false;
  if ('und' in x) return Array.isArray(x.und) && x.und.every(y => y !== undefined && bedOk(y, tiefe + 1));
  if ('oder' in x) return Array.isArray(x.oder) && x.oder.every(y => y !== undefined && bedOk(y, tiefe + 1));
  if ('nicht' in x) return x.nicht !== undefined && bedOk(x.nicht, tiefe + 1);
  if (typeof x.frage !== 'string') return false;
  if ('ist' in x) return ['=', '≠', '<', '≤', '>', '≥'].includes(x.ist as string) && typeof x.wert === 'number' && Number.isFinite(x.wert);
  if ('gewaehlt' in x) return typeof x.gewaehlt === 'number' && Number.isFinite(x.gewaehlt);
  return typeof x.beantwortet === 'boolean';
};
const TYPEN = ['einfach', 'mehrfach', 'zahl', 'text', 'datum', 'regler', 'rangfolge', 'einwilligung'];

/** Prüft die Form eines Plans. Gibt `null` zurück, wenn sie stimmt, sonst den Grund (nur für die Fehlersuche, nicht für die Anzeige). */
export function planFormFehler(o: unknown): string | null {
  if (!obj(o)) return 'kein Objekt';
  if (o.format !== 'statable-fragebogen') return 'format';
  if (typeof o.version !== 'number') return 'version';
  if (typeof o.id !== 'string' || !o.id || /[\\/\0]/.test(o.id)) return 'id';
  if (typeof o.revision !== 'number') return 'revision';
  if (!Array.isArray(o.sprachen) || !o.sprachen.length || !o.sprachen.every(x => typeof x === 'string' && x)) return 'sprachen';
  if (!lokOk(o.titel)) return 'titel';
  if (!obj(o.einstellungen)) return 'einstellungen';
  if (!Array.isArray(o.antwortlisten) || !Array.isArray(o.skalen) || !Array.isArray(o.elemente)) return 'listen';
  for (const l of o.antwortlisten as unknown[]) {
    if (!obj(l) || typeof l.id !== 'string' || typeof l.name !== 'string' || typeof l.geordnet !== 'boolean' || !Array.isArray(l.optionen)) return 'liste';
    for (const op of l.optionen as unknown[]) if (!obj(op) || typeof op.id !== 'string' || typeof op.wert !== 'number' || !Number.isFinite(op.wert) || !lokOk(op.text) || !bildOk(op.bild)) return 'option';
  }
  const ids = new Set<string>();
  const merke = (id: unknown): boolean => { if (typeof id !== 'string' || !id || ids.has(id)) return false; ids.add(id); return true; };
  for (const s of o.elemente as unknown[]) {
    if (!obj(s) || s.art !== 'seite' || !merke(s.id) || typeof s.name !== 'string' || !lokOpt(s.titel) || !bedOk(s.wennGezeigt) || !Array.isArray(s.elemente)) return 'seite';
    for (const e of s.elemente as unknown[]) {
      if (!obj(e) || !merke(e.id) || typeof e.name !== 'string' || !lokOk(e.text) || !bedOk(e.wennGezeigt)) return 'element';
      if (e.art === 'frage') {
        if (!TYPEN.includes(e.typ as string) || !obj(e.kodebuch) || !lokOpt(e.hilfe) || !lokOpt(e.kurz) || !bildOk(e.bild)) return 'frage';
        if (e.gueltig !== undefined && !(obj(e.gueltig) && bedOk(e.gueltig.regel) && lokOk(e.gueltig.meldung))) return 'gueltig';
        if (e.liste !== undefined && typeof e.liste !== 'string') return 'frage-liste';
      } else if (e.art === 'block') {
        if (typeof e.liste !== 'string' || !obj(e.kodebuch) || !lokOpt(e.hilfe) || !Array.isArray(e.items)) return 'block';
        for (const it of e.items as unknown[]) if (!obj(it) || !merke(it.id) || typeof it.name !== 'string' || !lokOk(it.text) || !lokOpt(it.kurz)) return 'item';
      } else if (e.art === 'hinweis') {
        if (!bildOk(e.bild)) return 'hinweis';
      } else return 'art';
    }
  }
  return null;
}

/** Plan und Bilder in die Datei (Text, UTF-8). */
export function planAlsDatei(plan: FragebogenPlan, bilder: Record<string, Uint8Array> = {}): string {
  const aus: Record<string, string> = {};
  for (const [schluessel, b] of Object.entries(bilder)) if (schluessel.startsWith(plan.id + '/')) aus[schluessel.slice(plan.id.length + 1)] = zuBase64(b);
  const { codes: _codes, ...ohneCodes } = plan;   // die Code-Liste bleibt im Projekt (Fachblatt 3D)
  return JSON.stringify({ format: PLAN_DATEI_FORMAT, version: 1, plan: ohneCodes, bilder: aus }, null, 2);
}
export const planDateiname = (plan: FragebogenPlan): string => {
  const t = (plan.titel[plan.sprachen[0] ?? 'de'] || Object.values(plan.titel).find(x => x) || 'Fragebogen').replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Fragebogen';
  return t + PLAN_ENDUNG;
};

/**
 * Liest die Datei (Text). Wirft `PlanDateiFehler`. Ein reiner Plan (ohne Hülle, `format: 'statable-fragebogen'`) wird auch gelesen.
 * `bilder` hat die Schlüssel `<datei>` (ohne Plan-id); sie werden beim Übernehmen in `<plan-id>/<datei>` verwandelt.
 */
export function planAusDatei(text: string): { plan: FragebogenPlan; bilder: Record<string, Uint8Array> } {
  if (text.length > MAX_DATEI * 1.4) throw new PlanDateiFehler('zugross');
  let o: unknown;
  try { o = JSON.parse(text.replace(/^﻿/, '')); } catch { throw new PlanDateiFehler('unlesbar', 'json'); }
  if (!obj(o)) throw new PlanDateiFehler('unlesbar', 'objekt');
  const huelle = o.format === PLAN_DATEI_FORMAT;
  if (huelle && typeof o.version === 'number' && o.version > 1) throw new PlanDateiFehler('neuer');
  const plan = (huelle ? o.plan : o) as unknown;
  const grund = planFormFehler(plan);
  if (grund) throw new PlanDateiFehler('unlesbar', grund);
  if ((plan as FragebogenPlan).version > 1) throw new PlanDateiFehler('neuer');
  const bilder: Record<string, Uint8Array> = {};
  if (huelle && obj(o.bilder)) {
    for (const [name, b64] of Object.entries(o.bilder)) {
      if (!bildNameOk(name) || typeof b64 !== 'string') throw new PlanDateiFehler('unlesbar', 'bild');
      if (b64.length > MAX_BILD * 1.4) throw new PlanDateiFehler('zugross');
      try { bilder[name] = ausBase64(b64); } catch { throw new PlanDateiFehler('unlesbar', 'bild'); }
    }
  }
  return { plan: plan as FragebogenPlan, bilder };
}

/**
 * Macht einen gelesenen Plan zu einem NEUEN Plan im Projekt: neue id, wenn die id schon vergeben ist (Import legt nie über einen vorhandenen Plan),
 * Bilder mit dem Schlüssel `<plan-id>/<datei>`.
 */
export function planUebernehmen(plan: FragebogenPlan, bilder: Record<string, Uint8Array>, vorhandeneIds: string[]): { plan: FragebogenPlan; bilder: Record<string, Uint8Array> } {
  const p = structuredClone(plan);
  if (vorhandeneIds.includes(p.id)) p.id = neueId();
  const aus: Record<string, Uint8Array> = {};
  for (const [n, b] of Object.entries(bilder)) aus[`${p.id}/${n}`] = b;
  p.geaendert = Date.now();
  return { plan: p, bilder: aus };
}
