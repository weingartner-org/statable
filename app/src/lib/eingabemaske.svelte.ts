/**
 * Zustand der Eingabemaske (Paket 2F): welcher Durchgang gerade offen ist und wo die eingegebenen Bögen liegen.
 * Bei offenem Projekt in `s.fragebogenEingaben` (Autospeichern, mit dem Projekt in der .statable-Datei: `fragebogen/<plan-id>/eingabe-A.json` usw.),
 * ohne Projekt als Entwurf in diesem Modul (nur diese Sitzung). Jeder gespeicherte Bogen ist sofort abgelegt: Unterbrechen kostet nichts.
 * Bogen-Nummern kommen von Menschen: Objekte werden nur mit berechneten Schlüsseln gebaut (nie `obj[nr] = …` auf einem Objekt, das `__proto__` erben könnte).
 */
import { s, setzeFragebogenEingaben } from './sitzung.svelte';
import type { Antworten, Durchgang, PlanEingaben } from './doppeleingabe';

export type DurchgangId = 'einfach' | 'A' | 'B';

export const em = $state({
  durchgang: 'A' as DurchgangId,
  /** Bogen-Nummer im Feld (auch halb getippt) */
  nr: '',
  /** Bogen, der gerade bearbeitet wird (schon gespeichert); '' = ein neuer Bogen */
  bearbeite: '',
  /** zählt hoch, wenn die Maske neu gezeichnet werden soll (neuer Bogen, anderer Durchgang) */
  zaehler: 0
});

let entwurf = $state.raw<Record<string, PlanEingaben>>({});
const alle = (): Record<string, PlanEingaben> => (s.projekt ? s.fragebogenEingaben : entwurf);
function ablegen(neu: Record<string, PlanEingaben>) { if (s.projekt) void setzeFragebogenEingaben(neu); else entwurf = neu; }

export const eingabenVon = (planId: string): PlanEingaben => alle()[planId] ?? {};
export const durchgangVon = (planId: string, d: DurchgangId): Durchgang => eingabenVon(planId)[d] ?? {};

function setzeDurchgang(planId: string, d: DurchgangId, neu: Durchgang) {
  const bisher = eingabenVon(planId);
  const rest: PlanEingaben = { ...bisher, [d]: neu };
  if (!Object.keys(neu).length) delete rest[d];
  const gesamt = { ...alle(), [planId]: rest };
  if (!rest.A && !rest.B && !rest.einfach) delete gesamt[planId];
  ablegen(gesamt);
}

/** Legt einen Bogen ab (neu oder überschrieben; bei `umbenennen` ersetzt er den alten Bogen an derselben Stelle). */
export function speichereBogen(planId: string, d: DurchgangId, nr: string, antworten: Antworten, alteNr = '') {
  const bisher = durchgangVon(planId, d), n = nr.trim(), alt = alteNr.trim();
  const neu: Durchgang = {};
  let drin = false;
  for (const [k, v] of Object.entries(bisher)) {
    if (k === alt || (!alt && k === n)) { Object.defineProperty(neu, n, { value: antworten, enumerable: true, writable: true, configurable: true }); drin = true; }
    else if (k !== n) Object.defineProperty(neu, k, { value: v, enumerable: true, writable: true, configurable: true });
  }
  if (!drin) Object.defineProperty(neu, n, { value: antworten, enumerable: true, writable: true, configurable: true });
  setzeDurchgang(planId, d, neu);
}

/** Entfernt einen Bogen. */
export function loescheBogen(planId: string, d: DurchgangId, nr: string) {
  const neu: Durchgang = {};
  for (const [k, v] of Object.entries(durchgangVon(planId, d))) if (k !== nr) Object.defineProperty(neu, k, { value: v, enumerable: true, writable: true, configurable: true });
  setzeDurchgang(planId, d, neu);
}

/** Leert einen ganzen Durchgang (die Oberfläche fragt vorher). */
export function leereDurchgang(planId: string, d: DurchgangId) { setzeDurchgang(planId, d, {}); }

/** Der nächste Vorschlag für die Bogen-Nummer: endet die letzte auf Ziffern, eins höher (mit gleicher Länge), sonst leer. */
export function naechsteNummer(nr: string): string {
  const m = /^(.*?)(\d+)$/.exec(nr.trim());
  if (!m) return '';
  const z = String(Number(m[2]) + 1);
  return m[1] + z.padStart(m[2]!.length, '0');
}

/** Legt die Eingaben, die ohne Projekt entstanden sind, in das offene Projekt. */
export function eingabenInsProjekt() {
  if (!s.projekt || !Object.keys(entwurf).length) return;
  const neu = { ...s.fragebogenEingaben }; for (const [id, e] of Object.entries(entwurf)) if (!neu[id]) neu[id] = e;
  entwurf = {}; void setzeFragebogenEingaben(neu);
}

/** Nur für Tests. */
export function setzeEingabenFuerTest(e: Record<string, PlanEingaben>) { entwurf = e; }
