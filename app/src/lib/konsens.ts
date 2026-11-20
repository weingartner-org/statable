/**
 * Konsens beim Kodieren (Stufe 5, Paket 5B): legt aus den Kodierungen von A und B und den Entscheidungen des Teams eine neue Person an.
 * Regeln: docs/erheben/FACHBLATT-STUFE-5.md, "Konsens-Ablauf" und "5B Konsens". Reiner Rechenkern; die Eingabe wird nie verändert.
 */
import { segmentUebereinstimmung, type Einheit } from './segmentuebereinstimmung';
import type { QualProjekt, Segment } from './qualprojekt';

export type Wahl = 'a' | 'b' | 'beide' | 'keiner';
export interface Entscheidung { abweichung: string; wahl: Wahl; begruendung: string; regel?: { code: string; text: string } }

const neueId = (): string => globalThis.crypto.randomUUID();

/**
 * Neue Person `name`: alle übereinstimmenden Einheiten (Segment von A kopiert, neue Kennungen), dann je Abweichung
 * a = Einheiten von A der Gruppe, b = von B, beide = alle, keiner = nichts. Abweichung ohne Entscheidung: nichts, steht in `offen`.
 * Regel: an `Code.regel` angehängt (neue Zeile "JJJJ-MM-TT: Text", Datum aus `jetzt` in UTC), Eintrag im Protokoll.
 */
export function konsensAnlegen(q: QualProjekt, o: { a: string; b: string; codes: string[]; schwelle: number; entscheidungen: Entscheidung[]; name: string; jetzt: number }):
  { projekt: QualProjekt; konsens: string; offen: string[] } {
  const e = segmentUebereinstimmung(q, { a: o.a, b: o.b, codes: o.codes, schwelle: o.schwelle });
  const abw = new Map(e.abweichungen.map(x => [x.id, x]));
  const entschieden = new Set<string>();
  const gewaehlt: Einheit[] = e.liste.filter(u => u.passt && u.person === 'a');
  const bekannt: Entscheidung[] = [];
  for (const en of o.entscheidungen) {
    const g = abw.get(en.abweichung); if (!g) continue;   // unbekannte Abweichung: still übergangen
    entschieden.add(en.abweichung); bekannt.push(en);
    for (const u of g.einheiten) if (en.wahl === 'beide' || (en.wahl === 'a' && u.person === 'a') || (en.wahl === 'b' && u.person === 'b')) gewaehlt.push(u);
  }
  const offen = e.abweichungen.filter(x => !entschieden.has(x.id)).map(x => x.id);

  const p = structuredClone(q);
  const konsens = neueId();
  p.kodierende.push({ id: konsens, name: o.name });
  const segmentVon = new Map<string, string>(), kodiert = new Set<string>();
  for (const u of gewaehlt) {
    const sk = `${u.dokument}\u0000${u.start}\u0000${u.ende}`;
    let sid = segmentVon.get(sk);
    if (!sid) {
      sid = neueId(); segmentVon.set(sk, sid);
      const s: Segment = { id: sid, dokument: u.dokument, start: u.start, ende: u.ende, erstellt: o.jetzt, kodierende: konsens };
      p.segmente.push(s);
    }
    const kk = `${sid}\u0000${u.code}`;
    if (kodiert.has(kk)) continue;
    kodiert.add(kk);
    p.kodierungen.push({ id: neueId(), segment: sid, code: u.code, kodierende: konsens, erstellt: o.jetzt });
  }

  const datum = new Date(o.jetzt).toISOString().slice(0, 10);
  p.protokoll.push({ zeit: o.jetzt, kodierende: konsens, was: 'konsens', nachher: { a: o.a, b: o.b, schwelle: o.schwelle, offen: offen.length } });
  for (const en of bekannt) {
    if (!en.regel) continue;
    const c = p.codes.find(x => x.id === en.regel!.code);
    if (c) { const zeile = `${datum}: ${en.regel.text}`; c.regel = c.regel ? `${c.regel}\n${zeile}` : zeile; }
    p.protokoll.push({ zeit: o.jetzt, kodierende: konsens, was: 'regel', nachher: { code: en.regel.code, text: en.regel.text, abweichung: en.abweichung } });
  }
  return { projekt: p, konsens, offen };
}
