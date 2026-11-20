/**
 * Zähler für die befragte Person (Feinstruktur F1A; Fachblatt `docs/feinstruktur/FACHBLATT-PRUEFER-VORLAGEN.md`, Abschnitt 3):
 * Wörter und Redezeit nur der Beiträge mit Rolle `befragt`, für einen gewählten Ausschnitt oder das ganze Transkript.
 * Die Zählregel steht fest und wird in der Hilfe genannt (Punkte 1-9 im Fachblatt). Die Redeanteile aus Stufe 4 (`redeanteile.ts`) bleiben unverändert.
 * Statable nennt die Zahl und die Regel, entscheidet aber nicht, ob eine Abgabe passt.
 * Positionen der Auswahl zählen in Codepoints in `dokument.text`, Ende exklusiv.
 */
import type { Dokument } from './qualprojekt';
import { codepoints, MARKE_ALLE } from './transkript-text';

const WORT = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;
export const MARKE_ANFANG = /^(?:#\d{2,}:\d{2}:\d{2}-\d#|\[\d{2,}:\d{2}:\d{2}\]|\(\d{2,}:\d{2}:\d{2}\)|\d{2,}:\d{2}:\d{2}(?=\s))[ \t]*/;
export const KENNUNG = /^(\S[^:\n]{0,29}?):(?=\s|$)/;

export interface Auswahl { start: number; ende: number }

export interface BefragtZaehlung {
  woerter: number;
  /** Summe der Dauer in Millisekunden; `null`, wenn das Transkript keine Zeitmarken hat */
  redezeitMs: number | null;
  /** ein Beitrag der befragten Person hat kein Ende oder keine Zeitmarke */
  unvollstaendig: boolean;
  /** der Ausschnitt schneidet einen Beitrag an: seine Redezeit ist anteilig nach Wörtern geschätzt */
  teilweise: boolean;
  grund?: 'ende' | 'zeit';
}

/** Wörter eines Textstücks nach der Zählregel 1-9 (ohne Zeitmarken; eine Zeile, Zeilen gehören einzeln hinein). */
export function zaehleWoerterBefragt(text: string): number {
  let t = '  ' + String(text ?? '').replace(MARKE_ALLE, ' ') + '  ';
  t = t.replace(/\/[IB]\d+:[^/\n]*\//g, ' ');                       // 2: Unterbrechung der anderen Person
  t = t.replace(/(^|\s)>[^<>\n]*</g, '$1 ');                         // 1: Geräusch, nicht gesprochen
  t = t.replace(/<[^<>\n]*>/g, ' X ');                               // 3: Anonymisierung zählt als ein Wort
  t = t.replace(/(?<=\s\s)((?:\p{L} )+\p{L})(?=\s\s)/gu, (m) => m.replace(/ /g, ''));   // 4: gedehnt = ein Wort
  t = t.replace(/(?<=\p{L}):(?=\p{L})/gu, '');                       // 7: Gendern mit Doppelpunkt = ein Wort
  t = t.replace(/\(([^()\n]*)\)/g, (_m, c: string) => (/^\s*[IB]\d+\b/.test(c) || /^[.\s]*$/.test(c) ? ' ' : ' ' + c.split('/')[0] + ' '));   // 8
  t = t.replace(/\[[^[\]\n]*\]/g, ' ');
  return (t.match(WORT) ?? []).length;   // 5: Pausenpunkte sind keine Wörter; 6: Hörersignale zählen
}

interface Zeile { von: number; bis: number; inhaltVon: number; gleichzeitig: boolean }

/** Zeilen eines Beitrags mit Lage in Codepoints; in der ersten Zeile fallen Zeitmarke und Kennung am Anfang weg. */
function zeilenVon(cps: string[], start: number, ende: number): Zeile[] {
  const r: Zeile[] = [];
  let von = start;
  for (let i = start; i <= ende; i++) {
    if (i < ende && cps[i] !== '\n') continue;
    let bis = i;
    if (bis > von && cps[bis - 1] === '\r') bis--;
    const text = cps.slice(von, bis).join('');
    let pos = 0;
    if (r.length === 0) {
      const m1 = MARKE_ANFANG.exec(text); if (m1) pos = m1[0].length;
      const km = KENNUNG.exec(text.slice(pos));
      if (km && !km[1]!.startsWith('/') && !km[1]!.startsWith('\\')) {
        pos += km[0].length;
        while (text[pos] === ' ' || text[pos] === '\t') pos++;
        const m2 = MARKE_ANFANG.exec(text.slice(pos)); if (m2) pos += m2[0].length;
      }
    }
    r.push({ von, bis, inhaltVon: von + Array.from(text.slice(0, pos)).length, gleichzeitig: /^\s*\/[IB]\d+:/.test(text) });
    von = i + 1;
  }
  return r;
}

export function zaehleBefragt(dok: Dokument, auswahl?: Auswahl): BefragtZaehlung {
  const t = dok.transkript;
  if (!t) return { woerter: 0, redezeitMs: null, unvollstaendig: false, teilweise: false };
  const cps = codepoints(dok.text);
  const S = auswahl ? Math.max(0, Math.min(auswahl.start, auswahl.ende)) : 0;
  const E = auswahl ? Math.min(cps.length, Math.max(auswahl.start, auswahl.ende)) : cps.length;
  const mitZeit = t.abschnitte.some((a) => a.zeitMs !== undefined);
  let woerter = 0, zeit = 0, unvollstaendig = false, teilweise = false;
  let grund: BefragtZaehlung['grund'];

  t.abschnitte.forEach((a, i) => {
    const rolle = a.sprecher ? t.sprecher.find((s) => s.id === a.sprecher)?.rolle : undefined;
    if (rolle !== 'befragt') return;
    if (a.ende <= S || a.start >= E) return;
    const zeilen = zeilenVon(cps, a.start, a.ende);
    let imAusschnitt = 0, gesamt = 0;
    for (const z of zeilen) {
      if (z.gleichzeitig) continue;   // 9: Zeilen mit /I1: gehören der anderen Person
      gesamt += zaehleWoerterBefragt(cps.slice(z.inhaltVon, z.bis).join(''));
      const lo = Math.max(z.inhaltVon, S), hi = Math.min(z.bis, E);
      if (hi > lo) imAusschnitt += zaehleWoerterBefragt(cps.slice(lo, hi).join(''));
    }
    woerter += imAusschnitt;

    if (!mitZeit) return;
    const anfang = a.zeitMs;
    const ende = a.bisMs ?? t.abschnitte[i + 1]?.zeitMs;
    if (anfang === undefined) { unvollstaendig = true; grund ??= 'zeit'; return; }
    if (ende === undefined) { unvollstaendig = true; grund = 'ende'; return; }
    const dauer = Math.max(0, ende - anfang);
    const inhaltAnfang = zeilen[0]!.inhaltVon;
    const voll = S <= inhaltAnfang && E >= a.ende;
    if (voll) zeit += dauer;
    else {
      teilweise = true;
      zeit += gesamt > 0 ? dauer * (imAusschnitt / gesamt) : 0;
    }
  });
  return { woerter, redezeitMs: mitZeit ? Math.round(zeit) : null, unvollstaendig, teilweise, ...(grund ? { grund } : {}) };
}

/** `2 Min. 04 s` (unter einer Minute: `45 s`). */
function zeitText(ms: number, sprache: 'de' | 'en'): string {
  const s = Math.round(ms / 1000);
  const min = Math.floor(s / 60), sek = s % 60;
  if (min === 0) return `${sek} s`;
  return `${min} ${sprache === 'de' ? 'Min.' : 'min'} ${String(sek).padStart(2, '0')} s`;
}

/** Der Satz zum Zähler, zum Beispiel „Ausgewählt: 2 Min. 04 s Redezeit der befragten Person, 287 Wörter.“ */
export function zaehlerSatz(z: BefragtZaehlung, sprache: 'de' | 'en'): string {
  if (sprache === 'de') {
    const w = z.woerter === 1 ? '1 Wort' : `${z.woerter} Wörter`;
    return z.redezeitMs === null
      ? `Ausgewählt: ${w} der befragten Person (keine Zeitmarken, keine Redezeit).`
      : `Ausgewählt: ${zeitText(z.redezeitMs, 'de')} Redezeit der befragten Person, ${w}.`;
  }
  const w = z.woerter === 1 ? '1 word' : `${z.woerter} words`;
  return z.redezeitMs === null
    ? `Selected: ${w} of the respondent (no time stamps, no speaking time).`
    : `Selected: ${zeitText(z.redezeitMs, 'en')} speaking time of the respondent, ${w}.`;
}

/** Hinweise zum Zähler (leer, wenn nichts zu sagen ist): unvollständige Redezeit, anteilig geschätzte Redezeit. */
export function zaehlerHinweis(z: BefragtZaehlung, sprache: 'de' | 'en'): string | undefined {
  const teile: string[] = [];
  if (z.unvollstaendig) {
    teile.push(sprache === 'de'
      ? (z.grund === 'zeit' ? 'Redezeit unvollständig: Bei einem Beitrag fehlt die Zeitmarke.' : 'Redezeit unvollständig: der letzte Beitrag hat kein Ende.')
      : (z.grund === 'zeit' ? 'Speaking time incomplete: one contribution has no time stamp.' : 'Speaking time incomplete: the last contribution has no end.'));
  }
  if (z.teilweise && z.redezeitMs !== null) {
    teile.push(sprache === 'de'
      ? 'Bei angeschnittenen Beiträgen ist die Redezeit nach der Zahl der Wörter anteilig geschätzt.'
      : 'For partly selected contributions, the speaking time is estimated in proportion to the number of words.');
  }
  return teile.length ? teile.join(' ') : undefined;
}
