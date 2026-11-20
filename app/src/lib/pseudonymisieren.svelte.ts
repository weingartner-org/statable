/**
 * Zustand des Bereichs „Personen unkenntlich machen (Pseudonymisieren)“ (Stufe 5, Paket 5E2).
 * Liegt in einem Modul, damit „Rückgängig“ und die Zuordnungsliste einen Seitenwechsel überstehen.
 * Die Zuordnungsliste steht nur hier im Arbeitsspeicher: nie in der Projektdatei, nie im Autospeichern.
 * „Rückgängig“ gilt bis zum nächsten Speichern des Projekts (Fachblatt 5D).
 */
import type { Name, NamensArt, RegelArt, Treffer, Zuordnung } from './pseudonym';
import type { QualProjekt } from './qualprojekt';
import { beiGespeichert } from './passwortfrage';

export const ps = $state<{
  namen: Name[];
  sprecherAlsPersonen: boolean;
  /** Sprechernamen, deren Häkchen fehlt (nur Rollenwort, kein Name) */
  sprecherAb: string[];
  regeln: Record<RegelArt, boolean>;
  treffer: Treffer[];
  gesucht: boolean;
  /** umbenannte Platzhalter: ursprünglicher Ersatz → neuer Text */
  umbenannt: Record<string, string>;
  /** Stand vor dem letzten Ersetzen (für „Rückgängig“); `null` nach dem Speichern oder nach „Rückgängig“ */
  vorher: QualProjekt | null;
  /** Der Stand direkt nach dem Ersetzen als Text: „Rückgängig“ gilt nur, solange sich seither nichts geändert hat */
  nachherJson: string;
  zuordnung: Zuordnung[];
  csvGespeichert: boolean;
  /** Zahlen des letzten Ersetzens für die Anzeige */
  zuletzt: { stellen: number; dokumente: number } | null;
}>({
  namen: [], sprecherAlsPersonen: true, sprecherAb: [],
  regeln: { email: true, telefon: true, datum: true, plz: true, adresse: true, url: true, iban: true },
  treffer: [], gesucht: false, umbenannt: {}, vorher: null, nachherJson: '', zuordnung: [], csvGespeichert: false, zuletzt: null,
});

export const neuerName = (text: string, art: NamensArt): Name => ({ text: text.trim(), art });

/** Nach dem Speichern des Projekts lässt sich das Ersetzen nicht mehr rückgängig machen. */
beiGespeichert(() => { ps.vorher = null; ps.nachherJson = ''; });
