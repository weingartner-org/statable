/**
 * Stufe 3E: Sammelimport. Viele Antwortdateien (binär .age) und Armor-Text (auch mehrere Blöcke in einer Datei oder im Textfeld) einlesen,
 * entschlüsseln, prüfen (Plan, Revision, doppelte Antwort, Einmal-Codes) und als Durchgang für den Datensatz bereitstellen.
 * Grundlage: docs/erheben/FACHBLATT-STUFE-3.md (Entscheide 3E/3F). Reine Funktionen außer `entschluesseleAlle`.
 * Texte aus den Antworten werden hier nie als Code oder HTML verwendet; sie wandern nur als Daten weiter.
 */
import type { FragebogenPlan } from './fragebogenplan';
import { entschluesseleAntwort, type Antwortsatz } from './antwortsatz';
import { KryptoFehler, empfaengerAusIdentitaet } from './schluessel';
import { normalisiereCode } from './einmalcodes';
import type { Durchgang } from './doppeleingabe';
import { L } from './sitzung.svelte';

export interface Stueck { quelle: string; daten: Uint8Array | string }
export type EingangsZustand = 'uebernommen' | 'doppelt' | 'andererPlan' | 'andereRevision' | 'unbekannterCode' | 'doppelterCode'
  | 'ohneCode' | 'nichtEntschluesselbar' | 'kaputt' | 'keinAge';
export interface Eingang { quelle: string; satz?: Antwortsatz; fehler?: 'falsche-identitaet' | 'kaputt' | 'zu-gross' | 'format' | 'keinAge' }
export interface PruefZeile { quelle: string; antwortId?: string; code?: string; zustand: EingangsZustand; uebernehmen: boolean; hinweis?: string }
export interface Pruefung { zeilen: PruefZeile[]; saetze: Antwortsatz[]; zahlen: Record<EingangsZustand, number> }

export const ALLE_ZUSTAENDE: EingangsZustand[] = ['uebernommen', 'doppelt', 'andererPlan', 'andereRevision', 'unbekannterCode', 'doppelterCode', 'ohneCode', 'nichtEntschluesselbar', 'kaputt', 'keinAge'];
/** Größte Datei, die der Sammelimport annimmt (je Armor-Block gilt zusätzlich die Grenze von 1 MB). */
export const MAX_DATEI_BYTES = 50_000_000;

const KOPF = new TextEncoder().encode('age-encryption.org/v1\n');
const BLOCK = /-----BEGIN AGE ENCRYPTED FILE-----[\s\S]*?-----END AGE ENCRYPTED FILE-----/g;

const istBinaer = (b: Uint8Array) => b.length >= KOPF.length && KOPF.every((x, i) => b[i] === x);
const zeilenEnden = (s: string) => s.replace(/\r\n?/g, '\n');
const blockText = (s: string): string[] => (s.match(BLOCK) ?? []).map(b => zeilenEnden(b).trim() + '\n');

export function zerlegeEingaben(dateien: { name: string; bytes: Uint8Array }[], text?: string): Stueck[] {
  const r: Stueck[] = [];
  for (const d of dateien) {
    if (istBinaer(d.bytes)) { r.push({ quelle: d.name, daten: d.bytes }); continue; }
    const bloecke = blockText(new TextDecoder().decode(d.bytes));
    if (bloecke.length === 0) r.push({ quelle: d.name, daten: '' });
    else bloecke.forEach((b, i) => r.push({ quelle: bloecke.length > 1 ? `${d.name} (${L('Block', 'block')} ${i + 1})` : d.name, daten: b }));
  }
  if (text !== undefined && text.trim() !== '') {
    const bloecke = blockText(text);
    if (bloecke.length === 0) r.push({ quelle: L('Eingefügter Text', 'Pasted text'), daten: '' });
    else bloecke.forEach((b, i) => r.push({ quelle: L(`Eingefügter Text, Block ${i + 1}`, `Pasted text, block ${i + 1}`), daten: b }));
  }
  return r;
}

const pause = () => new Promise<void>(res => setTimeout(res, 0));

export async function entschluesseleAlle(stuecke: Stueck[], identitaet: string, fortschritt?: (fertig: number, gesamt: number) => void): Promise<Eingang[]> {
  await empfaengerAusIdentitaet(identitaet);   // wirft KryptoFehler('ungueltig'), bevor ein Stück angefasst wird
  const aus: Eingang[] = [];
  let letzte = 0;
  for (let i = 0; i < stuecke.length; i++) {
    const s = stuecke[i]!;
    if (typeof s.daten === 'string' ? s.daten === '' : s.daten.length === 0) aus.push({ quelle: s.quelle, fehler: 'keinAge' });
    else {
      try { aus.push({ quelle: s.quelle, satz: await entschluesseleAntwort(typeof s.daten === 'string' ? zeilenEnden(s.daten) : s.daten, identitaet) }); }
      catch (e) {
        const c = e instanceof KryptoFehler ? e.code : 'kaputt';
        aus.push({ quelle: s.quelle, fehler: c === 'falsche-identitaet' || c === 'zu-gross' ? c : 'kaputt' });
      }
    }
    // Der Browser soll zwischendurch atmen können; Meldungen nur ab und zu.
    const jetzt = Date.now();
    if (fortschritt && (i + 1 === stuecke.length || jetzt - letzte > 150)) { letzte = jetzt; fortschritt(i + 1, stuecke.length); }
    if (i % 5 === 4) await pause();
  }
  return aus;
}

function bekannteIds(plan: FragebogenPlan): Set<string> {
  const k = new Set<string>();
  for (const seite of plan.elemente) for (const e of seite.elemente) {
    if (e.art === 'hinweis') continue;
    k.add(e.id);
    if (e.art === 'block') for (const it of e.items) k.add(it.id);
  }
  return k;
}

/** Vorrang der Regeln: 1 Entschlüsselung, 2 Plan, 4 doppelte antwortId, 3 Revision, 5 Codes, 6 übernommen. */
export function pruefeEingaenge(plan: FragebogenPlan, eingaenge: Eingang[], codes?: { code: string; ausgegeben?: boolean }[]): Pruefung {
  const zeilen: PruefZeile[] = [];
  const saetze: Antwortsatz[] = [];
  const zahlen = Object.fromEntries(ALLE_ZUSTAENDE.map(z => [z, 0])) as Record<EingangsZustand, number>;
  const gesehen = new Set<string>();
  const codeVon = new Map<string, string>();       // normalisierter Code -> antwortId des ersten Satzes
  const liste = new Set((codes ?? []).filter(c => c.ausgegeben !== false).map(c => normalisiereCode(c.code)).filter(Boolean));
  const mitCodes = (codes?.length ?? 0) > 0;
  const bekannt = bekannteIds(plan);

  const zeile = (z: PruefZeile, satz?: Antwortsatz) => {
    zeilen.push(z); zahlen[z.zustand]++;
    if (z.uebernehmen && satz) saetze.push(satz);
  };

  for (const e of eingaenge) {
    if (!e.satz) {
      const zustand: EingangsZustand = e.fehler === 'falsche-identitaet' ? 'nichtEntschluesselbar' : e.fehler === 'keinAge' ? 'keinAge' : 'kaputt';
      const hinweis = e.fehler === 'zu-gross' ? L('zu groß', 'too large') : e.fehler === 'format' ? L('keine Statable-Antwort', 'not a Statable answer')
        : e.fehler === 'falsche-identitaet' ? L('Dieser Schlüssel passt nicht zu dieser Antwort.', 'This key does not fit this answer.')
        : e.fehler === 'keinAge' ? L('Keine verschlüsselte Antwort gefunden.', 'No encrypted answer found.') : L('Datei beschädigt oder keine Antwort.', 'File damaged or not an answer.');
      zeile({ quelle: e.quelle, zustand, uebernehmen: false, hinweis });
      continue;
    }
    const s = e.satz;
    const code = s.code ? normalisiereCode(s.code) : '';
    const basis = { quelle: e.quelle, antwortId: s.antwortId, ...(code ? { code } : {}) };
    if (s.plan.id !== plan.id) { zeile({ ...basis, zustand: 'andererPlan', uebernehmen: false, hinweis: L('Gehört zu einem anderen Fragebogen.', 'Belongs to a different questionnaire.') }); continue; }
    if (gesehen.has(s.antwortId)) { zeile({ ...basis, zustand: 'doppelt', uebernehmen: false, hinweis: L('Diese Antwort wurde schon eingelesen; die erste bleibt.', 'This answer was already read in; the first one stays.') }); continue; }
    gesehen.add(s.antwortId);
    if (s.plan.revision !== plan.revision) {
      const fehlen = [...new Set(Object.keys(s.werte).map(k => k.split(':')[0]!))].filter(k => !bekannt.has(k));
      const hinweis = L(`Andere Fassung des Fragebogens (Revision ${s.plan.revision}, jetzt ${plan.revision}).`, `Different version of the questionnaire (revision ${s.plan.revision}, now ${plan.revision}).`)
        + (fehlen.length ? ' ' + L(`Diese Angaben gibt es im Fragebogen nicht mehr und sie fallen weg: ${fehlen.join(', ')}.`, `These items no longer exist in the questionnaire and are dropped: ${fehlen.join(', ')}.`) : '');
      // Der Zustand bleibt andereRevision (Regel 3 vor 5), aber der Code zählt für die Erkennung doppelter Codes mit und Code-Auffälligkeiten stehen im Hinweis (Opus, Abnahme 3E).
      let codeHinweis = '';
      if (mitCodes) {
        if (!code) codeHinweis = ' ' + L('Außerdem fehlt der Einmal-Code.', 'Also, the one-time code is missing.');
        else if (!liste.has(code)) codeHinweis = ' ' + L('Außerdem steht der Code nicht in Ihrer Liste.', 'Also, the code is not in your list.');
        else if (codeVon.has(code) && codeVon.get(code) !== s.antwortId) codeHinweis = ' ' + L('Außerdem wurde derselbe Code schon für eine andere Antwort benutzt.', 'Also, the same code was already used for another answer.');
        else codeVon.set(code, s.antwortId);
      }
      zeile({ ...basis, zustand: 'andereRevision', uebernehmen: true, hinweis: hinweis + codeHinweis }, s);
      continue;
    }
    if (mitCodes) {
      if (!code) { zeile({ ...basis, zustand: 'ohneCode', uebernehmen: true, hinweis: L('Die Antwort hat keinen Einmal-Code.', 'The answer has no one-time code.') }, s); continue; }
      if (!liste.has(code)) { zeile({ ...basis, zustand: 'unbekannterCode', uebernehmen: true, hinweis: L('Dieser Code steht nicht in Ihrer Liste.', 'This code is not in your list.') }, s); continue; }
      const erste = codeVon.get(code);
      if (erste !== undefined && erste !== s.antwortId) { zeile({ ...basis, zustand: 'doppelterCode', uebernehmen: true, hinweis: L('Derselbe Code wurde schon für eine andere Antwort benutzt.', 'The same code was already used for another answer.') }, s); continue; }
      codeVon.set(code, s.antwortId);
    }
    zeile({ ...basis, zustand: 'uebernommen', uebernehmen: true }, s);
  }
  return { zeilen, saetze, zahlen };
}

export function durchgangAusSaetzen(saetze: Antwortsatz[]): Durchgang {
  const d: Durchgang = {};
  for (const s of saetze) d[s.antwortId] = s.werte;
  return d;
}
