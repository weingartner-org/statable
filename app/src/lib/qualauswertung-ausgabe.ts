/**
 * Ausgabe der qualitativen Auswertung (Stufe 5, Paket 5E1): Fall-Code-Matrix als Datensatz, Texte und Anzeigedaten für Abweichungen,
 * Konsens-Protokoll als Daten. Reine Funktionen ohne Oberfläche; die Rechenkerne (`qualauswertung.ts`, `segmentuebereinstimmung.ts`, `konsens.ts`) bleiben unberührt.
 * Text aus dem Projekt (Namen, Codes, Interviewtext) kommt nur als Text, nie als Befehlstext, in den Datensatz (er geht über `oeffneNeueDaten`, wie die Redeanteile).
 */
import { cpTeil, positionsKarte, type Code, type PositionsKarte, type QualProjekt } from './qualprojekt';
import { baumListe, geschwister } from './kodierleitfaden';
import { kodiereinheiten, type Matrix, type MatrixOptionen } from './qualauswertung';
import { segmentUebereinstimmung, type Abweichung, type AbweichungArt, type SegmentErgebnis } from './segmentuebereinstimmung';
import { konsensAnlegen, type Entscheidung, type Wahl } from './konsens';
import type { KonsensEntwurf } from './konsens-zustand';
import type { Spalte } from './verzeichnis';
import { psppName } from './einlesen';

export type Sprache = 'de' | 'en';

/* ---------------------------------------------------------------- Codes */

/** Pfad eines Codes: „Belastung / hoch“. */
export function codePfad(codes: readonly Code[], id: string): string {
  const nach = new Map(codes.map(c => [c.id, c]));
  const t: string[] = [], gesehen = new Set<string>();
  for (let c = nach.get(id); c && !gesehen.has(c.id); c = c.elternId !== undefined ? nach.get(c.elternId) : undefined) { gesehen.add(c.id); t.unshift(c.name); }
  return t.join(' / ');
}

/** Die kodierbaren Codes in Anzeigereihenfolge, mit Ebene. */
export function kodierbareCodes(q: QualProjekt): { id: string; name: string; pfad: string; ebene: number }[] {
  return baumListe(q.codes).filter(b => b.code.kodierbar).map(b => ({ id: b.code.id, name: b.code.name, pfad: codePfad(q.codes, b.code.id), ebene: b.ebene }));
}

/** Obercodes, deren Untercodes Stufen sein können (mindestens ein direkter Untercode). */
export function stufenCodes(q: QualProjekt): { id: string; name: string; unter: { id: string; name: string }[] }[] {
  return baumListe(q.codes).filter(b => geschwister(q.codes, b.code.id).length > 0)
    .map(b => ({ id: b.code.id, name: codePfad(q.codes, b.code.id), unter: geschwister(q.codes, b.code.id).map(u => ({ id: u.id, name: u.name })) }));
}

/** Voreinstellung der Stufen: 1, 2, 3 … in der Reihenfolge der Untercodes. */
export const standardStufen = (unter: readonly { id: string }[]): Record<string, number> => Object.fromEntries(unter.map((u, i) => [u.id, i + 1]));

/* ---------------------------------------------------------------- Matrix als Datensatz */

export const FEHLEND_NICHT_EINGESTUFT = 98;
export const FEHLEND_UNEINDEUTIG = 99;
export const ZITAT_MAX = 2000;
export const ZITAT_TRENNER = ' | ';

export interface MatrixDatensatz { spalten: Spalte[]; zeilen: (string | number | null)[][]; meldungen: string[]; enthaeltZitate: boolean }

const textSp = (name: string, bez: string): Spalte => ({ name, bezeichnung: bez, art: 'text', niveau: 'nominal', format: 'A1', fehlend: [], fehlendText: '', werteLabels: {} });
/** Code-Spalten tragen `herkunft: 'codes'`: Auswertungen mit ihnen zeigen den Hinweis aus `lib/codespalten.ts` (0 heißt nicht erwähnt, gezielte Auswahl). */
const zahlSp = (name: string, bez: string, format: string, niveau: Spalte['niveau'], werteLabels: Record<string, string> = {}, fehlend: number[] = []): Spalte =>
  ({ name, bezeichnung: bez, art: 'zahl', niveau, format, fehlend, fehlendText: fehlend.join(', '), werteLabels });
const codeSp = (...a: Parameters<typeof zahlSp>): Spalte => ({ ...zahlSp(...a), herkunft: 'codes' });

/**
 * Die Fall-Code-Matrix als neue Tabelle: eine Zeile je Fall (oder Dokument), Spalte `Fall`/`Dokument` (Text), die Fallvariablen aus der Datei, dann je Code eine Spalte
 * (Beschriftung = Pfad des Codes). 0/1: nominal mit Wertelabels, Anzahl: metrisch, Einstufung: ordinal, 98 = nicht eingestuft und 99 = uneindeutig als fehlend mit Label.
 * Zitate (nur auf ausdrückliche Wahl): je Code eine Textspalte `<Name>_zitate`, Segmenttexte des Falls in Reihenfolge im Text, getrennt durch „ | “, höchstens 2.000 Zeichen.
 */
export function matrixDatensatz(q: QualProjekt, m: Matrix, o: MatrixOptionen, sprache: Sprache, mitZitaten = false): MatrixDatensatz {
  const de = sprache === 'de';
  const vergeben = new Set<string>();
  const spalten: Spalte[] = [];
  const meldungen: string[] = [];
  const nachFall = new Map(q.faelle.map(f => [f.id, f]));
  const dokNach = new Map(q.dokumente.map(d => [d.id, d]));
  const dokIx = new Map(q.dokumente.map((d, i) => [d.id, i]));

  spalten.push(textSp(psppName(o.zeilen === 'faelle' ? (de ? 'Fall' : 'Case') : (de ? 'Dokument' : 'Document'), vergeben, 1), o.zeilen === 'faelle' ? (de ? 'Fall' : 'Case') : (de ? 'Dokument' : 'Document')));
  if (o.zeilen === 'dokumente') spalten.push(textSp(psppName(de ? 'Fall' : 'Case', vergeben, 2), de ? 'Fall' : 'Case'));
  const fallVars = o.zeilen === 'faelle' ? q.variablen : [];
  for (const v of fallVars) {
    const name = psppName(v.name, vergeben, spalten.length + 1), bez = v.beschreibung?.trim() || v.name;
    if (v.typ === 'ganzzahl') spalten.push(zahlSp(name, bez, 'F8.0', 'metrisch'));
    else if (v.typ === 'zahl') spalten.push(zahlSp(name, bez, 'F8.2', 'metrisch'));
    else if (v.typ === 'ja/nein') spalten.push(zahlSp(name, bez, 'F1.0', 'nominal', { '0': de ? 'nein' : 'no', '1': de ? 'ja' : 'yes' }));
    else spalten.push(textSp(name, bez));
  }

  const codeSpalten: { code: string; col: number; zitate?: number }[] = [];
  const stufeUnter = o.art === 'stufe' ? geschwister(q.codes, o.codes[0] ?? '') : [];
  for (let i = 0; i < m.spalten.length; i++) {
    const sp = m.spalten[i]!;
    const pfad = codePfad(q.codes, sp.code) || sp.name;
    const name = psppName(sp.name, vergeben, spalten.length + 1);
    if (o.art === '01') spalten.push(codeSp(name, pfad, 'F1.0', 'nominal', { '0': de ? 'nicht kodiert' : 'not coded', '1': de ? 'kodiert' : 'coded' }));
    else if (o.art === 'anzahl') spalten.push(codeSp(name, pfad, 'F8.0', 'metrisch'));
    else {
      const labels: Record<string, string> = {};
      for (const u of stufeUnter) { const z = o.stufen?.[u.id]; if (z !== undefined) labels[String(z)] = labels[String(z)] ? `${labels[String(z)]} / ${u.name}` : u.name; }
      labels[String(FEHLEND_NICHT_EINGESTUFT)] = de ? 'nicht eingestuft' : 'not rated';
      labels[String(FEHLEND_UNEINDEUTIG)] = de ? 'uneindeutig' : 'ambiguous';
      spalten.push(codeSp(name, pfad, 'F8.0', 'ordinal', labels, [FEHLEND_NICHT_EINGESTUFT, FEHLEND_UNEINDEUTIG]));
    }
    codeSpalten.push({ code: sp.code, col: spalten.length - 1 });
  }
  const zitatenAn = mitZitaten && o.art !== 'stufe' && m.spalten.length > 0;
  if (zitatenAn) {
    for (let i = 0; i < codeSpalten.length; i++) {
      const sp = spalten[codeSpalten[i]!.col]!;
      const name = psppName(`${sp.name}_zitate`, vergeben, spalten.length + 1);
      spalten.push(textSp(name, de ? `Zitate: ${sp.bezeichnung}` : `Quotes: ${sp.bezeichnung}`));
      codeSpalten[i]!.zitate = spalten.length - 1;
    }
  }

  const karten = new Map<string, PositionsKarte>();
  const einheiten = zitatenAn ? kodiereinheiten(q, o.kodierende, m.spalten.map(s => s.code)) : [];
  let gekuerzt = 0;
  const unein = new Set(m.uneindeutig);
  const zeilen: (string | number | null)[][] = m.zeilen.map((z, zi) => {
    const rest = m.werte[zi] ?? [];
    const docs: string[] = z.id.startsWith('dok:') ? [z.id.slice(4)] : o.zeilen === 'dokumente' ? [z.id] : q.dokumente.filter(d => d.fall === z.id).map(d => d.id);
    const zeile: (string | number | null)[] = [z.name];
    if (o.zeilen === 'dokumente') zeile.push(nachFall.get(dokNach.get(z.id)?.fall ?? '')?.name ?? '');
    const fall = nachFall.get(z.id);
    for (const v of fallVars) {
      const w = fall ? (Object.prototype.hasOwnProperty.call(fall.werte, v.id) ? fall.werte[v.id] : Object.prototype.hasOwnProperty.call(fall.werte, v.name) ? fall.werte[v.name] : null) ?? null : null;   // Schlüssel = Variable.id (Architekturblatt); ältere Daten nutzen den Namen
      if (v.typ === 'ganzzahl' || v.typ === 'zahl') zeile.push(typeof w === 'number' && Number.isFinite(w) ? w : typeof w === 'string' && w.trim() !== '' && Number.isFinite(Number(w)) ? Number(w) : null);
      else if (v.typ === 'ja/nein') zeile.push(typeof w === 'boolean' ? (w ? 1 : 0) : null);
      else zeile.push(w === null ? null : String(w));
    }
    for (let i = 0; i < codeSpalten.length; i++) {
      const w = rest[i] ?? null;
      zeile.push(o.art === 'stufe' && w === null ? (unein.has(z.id) ? FEHLEND_UNEINDEUTIG : FEHLEND_NICHT_EINGESTUFT) : w);
    }
    if (zitatenAn) {
      const ds = new Set(docs);
      for (const cs of codeSpalten) {
        const segs = new Map<string, { dokument: string; start: number; ende: number }>();
        for (const e of einheiten) if (e.code === cs.code && ds.has(e.dokument)) segs.set(e.segment, e);
        const teile = [...segs.values()].sort((a, b) => (dokIx.get(a.dokument) ?? 0) - (dokIx.get(b.dokument) ?? 0) || a.start - b.start || a.ende - b.ende).map(e => {
          const d = dokNach.get(e.dokument)!;
          let k = karten.get(d.id); if (!k) karten.set(d.id, k = positionsKarte(d.text));
          return cpTeil(d.text, e.start, e.ende, k).replace(/\s+/g, ' ').trim();
        }).filter(t => t !== '');
        let t = teile.join(ZITAT_TRENNER);
        if ([...t].length > ZITAT_MAX) { t = [...t].slice(0, ZITAT_MAX - 1).join('') + '…'; gekuerzt++; }
        zeile.push(t === '' ? null : t);
      }
    }
    return zeile;
  });
  if (gekuerzt) meldungen.push(de ? `${gekuerzt} Zitat-Zelle${gekuerzt === 1 ? ' war' : 'n waren'} länger als ${ZITAT_MAX} Zeichen und wurde${gekuerzt === 1 ? '' : 'n'} mit „…“ gekürzt.` : `${gekuerzt} quote cell${gekuerzt === 1 ? ' was' : 's were'} longer than ${ZITAT_MAX} characters and ${gekuerzt === 1 ? 'was' : 'were'} shortened with "…".`);
  if (o.art === 'stufe' && m.uneindeutig.length) meldungen.push(de ? `${m.uneindeutig.length} Fall${m.uneindeutig.length === 1 ? ' ist' : 'e sind'} uneindeutig (verschiedene Stufen) und steht mit dem Wert ${FEHLEND_UNEINDEUTIG}, fehlend, im Datensatz.` : `${m.uneindeutig.length} case${m.uneindeutig.length === 1 ? ' is' : 's are'} ambiguous (different levels) and appear${m.uneindeutig.length === 1 ? 's' : ''} with the value ${FEHLEND_UNEINDEUTIG}, missing, in the data set.`);
  return { spalten, zeilen, meldungen, enthaeltZitate: zitatenAn };
}

/* ---------------------------------------------------------------- Abweichungen und Konsens */

export const NACHHER_SATZ = {
  de: 'Nach der Einigung ist die Übereinstimmung mit dem Konsens kein Gütemaß mehr, sondern zeigt, wie viel sich geändert hat.',
  en: 'After the agreement, the match with the consensus is no longer a quality measure, but shows how much has changed.',
} as const;
export const SCHWELLE_SATZ = (schwelle: number, sprache: Sprache): string => {
  const p = String(Math.round(schwelle * 100));
  return sprache === 'de' ? `Zwei Textstellen gelten als gleich, wenn sie sich zu mindestens ${p} % decken (gemeinsamer Text geteilt durch den Text beider zusammen).`
    : `Two passages count as the same if they overlap by at least ${p} % (shared text divided by the text of both together).`;
};

export const ART_TEXT: Record<AbweichungArt, { de: string; en: string }> = {
  'anderer-code': { de: 'gleiche Stelle, anderer Code', en: 'same passage, different code' },
  grenzen: { de: 'gleicher Code, Stelle verschieden', en: 'same code, passage differs' },
  'nur-eine': { de: 'nur eine Person hat hier kodiert', en: 'only one person coded here' },
};
export const artText = (a: AbweichungArt, sprache: Sprache): string => ART_TEXT[a][sprache];
/** Die Reihenfolge der Gruppen in der Liste. */
export const ART_REIHENFOLGE: readonly AbweichungArt[] = ['anderer-code', 'grenzen', 'nur-eine'];

export const legendeText = (nr: number, gesamt: number, art: AbweichungArt, sprache: Sprache): string =>
  sprache === 'de' ? `Abweichung ${nr} von ${gesamt}: ${artText(art, 'de')}` : `Deviation ${nr} of ${gesamt}: ${artText(art, 'en')}`;

export const TEXT_MAX = 400;
const kurz = (t: string): string => { const x = t.replace(/\s+/g, ' ').trim(); const z = [...x]; return z.length > TEXT_MAX ? z.slice(0, TEXT_MAX - 1).join('') + '…' : x; };

export interface StellenAnzeige { person: 'a' | 'b'; name: string; code: string; codeName: string; dokument: string; text: string; start: number; ende: number }
export interface AbweichungAnzeige { id: string; nr: number; gesamt: number; art: AbweichungArt; dokument: string; legende: string; stellen: StellenAnzeige[] }

/** Anzeigedaten der Abweichungen: Nummer, Art, Dokument, die Textstellen (Text nur als Text, höchstens 400 Zeichen). */
export function abweichungenAnzeige(q: QualProjekt, abw: readonly Abweichung[], namen: { a: string; b: string }, sprache: Sprache): AbweichungAnzeige[] {
  const dok = new Map(q.dokumente.map(d => [d.id, d])), codeName = new Map(q.codes.map(c => [c.id, c.name])), karten = new Map<string, PositionsKarte>();
  return abw.map((x, i) => {
    const d = dok.get(x.dokument);
    return {
      id: x.id, nr: i + 1, gesamt: abw.length, art: x.art, dokument: d?.name ?? '', legende: legendeText(i + 1, abw.length, x.art, sprache),
      stellen: x.einheiten.map(e => {
        let k = d ? karten.get(d.id) : undefined; if (d && !k) karten.set(d.id, k = positionsKarte(d.text));
        return { person: e.person, name: e.person === 'a' ? namen.a : namen.b, code: e.code, codeName: codeName.get(e.code) ?? e.code, dokument: d?.name ?? '', text: d ? kurz(cpTeil(d.text, e.start, e.ende, k)) : '', start: e.start, ende: e.ende };
      }),
    };
  });
}

/** Die Wahlmöglichkeiten einer Abweichung mit verständlichen Namen. Bei „nur eine Person“ gibt es „übernehmen“ (Wert beide) und „nicht übernehmen“. */
export function wahlMoeglichkeiten(art: AbweichungArt, einheiten: readonly { person: 'a' | 'b' }[], namen: { a: string; b: string }, sprache: Sprache): { wert: Wahl; text: string }[] {
  const de = sprache === 'de';
  if (art === 'nur-eine') {
    const wer = einheiten[0]?.person === 'b' ? namen.b : namen.a;
    return [{ wert: 'beide', text: de ? `Kodierung von ${wer} übernehmen` : `Take over the coding by ${wer}` }, { wert: 'keiner', text: de ? 'Nicht übernehmen (die Kodierung wird gestrichen)' : 'Do not take over (the coding is deleted)' }];
  }
  return [
    { wert: 'a', text: art === 'grenzen' ? (de ? `Grenzen von ${namen.a} übernehmen` : `Take over the boundaries of ${namen.a}`) : (de ? `Kodierung von ${namen.a} übernehmen` : `Take over the coding by ${namen.a}`) },
    { wert: 'b', text: art === 'grenzen' ? (de ? `Grenzen von ${namen.b} übernehmen` : `Take over the boundaries of ${namen.b}`) : (de ? `Kodierung von ${namen.b} übernehmen` : `Take over the coding by ${namen.b}`) },
    { wert: 'beide', text: art === 'anderer-code' ? (de ? 'Beide Codes behalten (beide sind richtig)' : 'Keep both codes (both are right)') : (de ? 'Beide Stellen behalten' : 'Keep both passages') },
    { wert: 'keiner', text: de ? 'Keine übernehmen (beide streichen)' : 'Take over neither (delete both)' },
  ];
}
export const wahlText = (w: Wahl, art: AbweichungArt, einheiten: readonly { person: 'a' | 'b' }[], namen: { a: string; b: string }, sprache: Sprache): string =>
  wahlMoeglichkeiten(art, einheiten, namen, sprache).find(x => x.wert === w)?.text ?? w;

/** Die Codes, zu denen eine Kodierregel gehören kann (die Codes der Stellen der Abweichung, ohne Doppelte). */
export const regelCodes = (a: AbweichungAnzeige): { id: string; name: string }[] => { const g = new Set<string>(), r: { id: string; name: string }[] = []; for (const s of a.stellen) if (!g.has(s.code)) { g.add(s.code); r.push({ id: s.code, name: s.codeName }); } return r; };

/** Der Standardname der Konsens-Person, ohne Doppelte unter den Kodierenden. */
export function konsensName(q: QualProjekt, a: string, b: string, gewuenscht?: string): string {
  const nameVon = (id: string) => q.kodierende.find(k => k.id === id)?.name ?? '?';
  const basis = (gewuenscht ?? '').trim() || `Konsens ${nameVon(a)}/${nameVon(b)}`;
  const belegt = new Set(q.kodierende.map(k => k.name));
  let n = basis, i = 2;
  while (belegt.has(n)) n = `${basis} (${i++})`;
  return n;
}

export interface KonsensErgebnis {
  projekt: QualProjekt; konsens: string; name: string; offen: string[];
  vorher: SegmentErgebnis; nachherA: SegmentErgebnis; nachherB: SegmentErgebnis;
}

/** Legt den Konsens an (nur vollständig entschiedene Abweichungen) und rechnet „vorher“ und „nachher“ (A gegen Konsens, B gegen Konsens). */
export function konsensMitVergleich(q: QualProjekt, e: KonsensEntwurf, name: string, jetzt: number): KonsensErgebnis {
  const entscheidungen: Entscheidung[] = e.entscheidungen.filter(x => (x.begruendung.match(/\S+/g) ?? []).length >= 1);
  const k = konsensAnlegen(q, { a: e.a, b: e.b, codes: e.codes, schwelle: e.schwelle, entscheidungen, name, jetzt });
  const von = (x: string, y: string, p: QualProjekt) => segmentUebereinstimmung(p, { a: x, b: y, codes: e.codes, schwelle: e.schwelle });
  return { projekt: k.projekt, konsens: k.konsens, name, offen: k.offen, vorher: von(e.a, e.b, q), nachherA: von(e.a, k.konsens, k.projekt), nachherB: von(e.b, k.konsens, k.projekt) };
}

export interface ProtokollAbweichung { nr: number; art: AbweichungArt; dokument: string; stellen: { name: string; codeName: string; text: string }[]; entscheidung: string; begruendung: string; regel?: { codeName: string; text: string } }
export interface KonsensProtokollDaten {
  sprache: Sprache; titel: string; datum: string; personA: string; personB: string; konsens: string; schwelle: number;
  codes: { id: string; name: string }[];
  vorher: SegmentErgebnis; nachherA: SegmentErgebnis; nachherB: SegmentErgebnis;
  abweichungen: ProtokollAbweichung[]; offen: number;
}

/** Alle Angaben für das Protokoll als Word (Titel, Datum, Personen, Schwelle, vorher, jede Abweichung mit Entscheidung und Begründung, Regeln, nachher). */
export function konsensProtokollDaten(q: QualProjekt, e: KonsensEntwurf, r: KonsensErgebnis, sprache: Sprache, jetzt: number): KonsensProtokollDaten {
  const nameVon = (id: string) => q.kodierende.find(k => k.id === id)?.name ?? '?';
  const namen = { a: nameVon(e.a), b: nameVon(e.b) };
  const abw = segmentUebereinstimmung(q, { a: e.a, b: e.b, codes: e.codes, schwelle: e.schwelle }).abweichungen;
  const anz = abweichungenAnzeige(q, abw, namen, sprache);
  const codeName = new Map(q.codes.map(c => [c.id, c.name]));
  const de = sprache === 'de';
  const abweichungen: ProtokollAbweichung[] = [];
  for (const a of anz) {
    const en = e.entscheidungen.find(x => x.abweichung === a.id);
    if (!en || (en.begruendung.match(/\S+/g) ?? []).length < 1) continue;
    const einh = a.stellen.map(s => ({ person: s.person }));
    abweichungen.push({
      nr: a.nr, art: a.art, dokument: a.dokument, stellen: a.stellen.map(s => ({ name: s.name, codeName: s.codeName, text: s.text })),
      entscheidung: wahlText(en.wahl, a.art, einh, namen, sprache), begruendung: en.begruendung.trim(),
      ...(en.regel ? { regel: { codeName: codeName.get(en.regel.code) ?? en.regel.code, text: en.regel.text } } : {}),
    });
  }
  return {
    sprache, titel: de ? `Konsens beim Kodieren: ${namen.a} und ${namen.b}` : `Consensus in coding: ${namen.a} and ${namen.b}`,
    datum: new Date(jetzt).toISOString().slice(0, 10), personA: namen.a, personB: namen.b, konsens: r.name, schwelle: e.schwelle,
    codes: e.codes.map(c => ({ id: c, name: codeName.get(c) ?? c })), vorher: r.vorher, nachherA: r.nachherA, nachherB: r.nachherB, abweichungen, offen: r.offen.length,
  };
}
