/**
 * CryptPad Forms (CSV und JSON) erkennen (Paket 1B). NACH QUELLCODE ERKANNT (www/form/export.js), NICHT AN ECHTEN EXPORTEN GEPRÜFT
 * (Quelle: docs/erheben/KOPFZEILEN-DIENSTE.md Abschnitt 4; Prüfdateien testdaten/dienste/cryptpad/).
 * Merkmal: die ersten zwei Köpfe `Time`,`Participant` (de `Zeit`,`Teilnehmer`; JSON `_time`,`_name`) UND Zellen der ersten Spalte als ISO 8601 mit `Z`.
 * Anonym steht `Guest` (de `Gast`). Mehrfachauswahl: im Quellcode nicht belegt, darum nie ein Vorschlag „Mehrfachauswahl in einer Zelle“. Raster `Frage | Zeile`.
 */
import type { Tabelle } from '../einlesen';

export const CRYPTPAD_META = /^(time|participant|zeit|teilnehmer|_time|_name)$/i;
export const CRYPTPAD_ZEIT = /^(time|zeit|_time)$/i;
const ISO_Z = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const GAST = /^(guest|gast)$/i;

export function istCryptpad(kopf: string[], zeilen: unknown[][] = []): boolean {
  const a = kopf[0]?.trim().toLowerCase(), b = kopf[1]?.trim().toLowerCase();
  const kopfOk = (a === 'time' && b === 'participant') || (a === 'zeit' && b === 'teilnehmer') || (a === '_time' && b === '_name');
  if (!kopfOk) return false;
  const z = zeilen.map(r => r[0]).filter(v => v !== null && v !== undefined && String(v).trim() !== '');
  return z.length > 0 && z.every(v => typeof v === 'string' && ISO_Z.test(v.trim()));
}

/** Teilnehmer zählt nur, wenn mindestens eine gefüllte Zelle NICHT „Guest“/„Gast“ ist. */
export function cryptpadPersonenbezug(kopf: string, zellen: unknown[]): boolean {
  if (!/^(participant|teilnehmer|_name)$/i.test(kopf.trim())) return false;
  return zellen.some(v => v !== null && v !== undefined && String(v).trim() !== '' && !GAST.test(String(v).trim()));
}

/**
 * Der JSON-Export eines CryptPad-Formulars als Tabelle: oberste Ebene `questions` (qN → Objekt) und `responses` (Liste; je Antwort `_time`, `_name`, `qN`).
 * `fragetexte[qN]` ist `questions[qN].q`, wenn das ein Text ist (der übrige Inhalt der Frageobjekte ist nicht belegt). Kein JSON oder falscher Aufbau: null, wirft nie.
 */
export function cryptpadJsonTabelle(text: string): { tabelle: Tabelle; fragetexte: Record<string, string> } | null {
  let j: unknown;
  try { j = JSON.parse(text.replace(/^﻿/, '')); } catch { return null; }
  if (!j || typeof j !== 'object' || Array.isArray(j)) return null;
  const o = j as { questions?: unknown; responses?: unknown };
  if (!o.questions || typeof o.questions !== 'object' || Array.isArray(o.questions) || !Array.isArray(o.responses)) return null;
  const fragen = Object.keys(o.questions as object);
  const fragetexte: Record<string, string> = {};
  for (const k of fragen) { const q = (o.questions as Record<string, unknown>)[k]; const t = q && typeof q === 'object' ? (q as { q?: unknown }).q : undefined; if (typeof t === 'string' && t.trim()) fragetexte[k] = t; }
  const wert = (v: unknown): string | number | null => (v === null || v === undefined ? null : typeof v === 'string' ? (v === '' ? null : v) : typeof v === 'number' ? v : typeof v === 'boolean' ? String(v) : JSON.stringify(v));
  const kopf = ['_time', '_name', ...fragen];
  const zeilen = (o.responses as unknown[]).map(r => { const a = r && typeof r === 'object' ? (r as Record<string, unknown>) : {}; return kopf.map(k => wert(a[k])); });
  return { tabelle: { kopf, zeilen, quelle: 'cryptpad.json' } as Tabelle, fragetexte };
}
