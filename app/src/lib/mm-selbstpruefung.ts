/**
 * Selbstprüfung (Stufe A2) nach MMAT 2018, Teil 5 mit den beiden Vorfragen (Hong, Pluye, Fàbregues u. a. 2018, Mixed Methods Appraisal Tool,
 * Version 2018, Registrierung 1148552, McGill University) und nach GRAMMS (O'Cathain, Murphy & Nicholl 2008, Journal of Health Services Research
 * & Policy 13(2), 92-98).
 *
 * Lizenz: Der Wortlaut beider Listen ist geschützt (MMAT als eingetragenes Werk, GRAMMS als Zeitschriftenartikel). Statable übernimmt darum keinen
 * Wortlaut, sondern eine eigene, kurze Fassung in einfacher Sprache mit Quelle. Die Kennungen sind fest. Keine Gesamtnote: Die MMAT-Anleitung rät
 * selbst davon ab, eine Gesamtzahl zu bilden; GRAMMS ist eine Berichtsliste, keine Bewertung.
 * Hinweise rechnet Statable beim Öffnen aus dem Projekt; gespeichert wird nur, was die Person setzt (wie Berichtshilfe A5).
 */
import { L } from './sitzung.svelte';
import type { Integration } from './integration';
import { notation } from './mm-design';
import type { PruefStand, QualProjekt, SelbstPunkt, Selbstpruefung } from './qualprojekt';

export type Liste = Selbstpruefung['liste'];
export interface PruefPunkt { kennung: string; nummer: string; text: () => string }

export const MMAT: readonly PruefPunkt[] = [
  { kennung: 'mmat-s1', nummer: 'S1', text: () => L('Gibt es klare Forschungsfragen?', 'Are there clear research questions?') },
  { kennung: 'mmat-s2', nummer: 'S2', text: () => L('Passen die erhobenen Daten zu diesen Fragen?', 'Do the collected data fit these questions?') },
  { kennung: 'mmat-5-1', nummer: '5.1', text: () => L('Ist begründet, warum die Studie Zahlen und Texte verbindet?', 'Is it justified why the study combines numbers and texts?') },
  { kennung: 'mmat-5-2', nummer: '5.2', text: () => L('Sind die Teile der Studie tatsächlich verbunden, um die Frage zu beantworten?', 'Are the parts of the study actually linked to answer the question?') },
  { kennung: 'mmat-5-3', nummer: '5.3', text: () => L('Wird gut gedeutet, was die Verbindung ergibt?', 'Is what the linking yields interpreted well?') },
  { kennung: 'mmat-5-4', nummer: '5.4', text: () => L('Wird mit Abweichungen und Widersprüchen zwischen beiden Teilen gut umgegangen?', 'Are deviations and contradictions between the two parts dealt with well?') },
  { kennung: 'mmat-5-5', nummer: '5.5', text: () => L('Erfüllt jeder Teil die Gütekriterien seiner eigenen Methode?', 'Does each part meet the quality criteria of its own method?') },
];
export const GRAMMS: readonly PruefPunkt[] = [
  { kennung: 'gramms-1', nummer: '1', text: () => L('Begründung: Warum passt Mixed Methods zu dieser Frage?', 'Justification: why do mixed methods fit this question?') },
  { kennung: 'gramms-2', nummer: '2', text: () => L('Design: Zweck, Gewicht und Reihenfolge der Methoden', 'Design: purpose, priority and order of the methods') },
  { kennung: 'gramms-3', nummer: '3', text: () => L('Jede Methode: Auswahl, Erhebung, Auswertung', 'Each method: sampling, data collection, analysis') },
  { kennung: 'gramms-4', nummer: '4', text: () => L('Integration: wo, wie und von wem verbunden wurde', 'Integration: where, how and by whom it was linked') },
  { kennung: 'gramms-5', nummer: '5', text: () => L('Grenzen: was eine Methode durch die andere einschränkt', 'Limitations: what one method limits because of the other') },
  { kennung: 'gramms-6', nummer: '6', text: () => L('Erkenntnis: was erst durch die Verbindung sichtbar wurde', 'Insight: what became visible only through the linking') },
];
export const punkteDer = (l: Liste): readonly PruefPunkt[] => (l === 'mmat' ? MMAT : GRAMMS);

/** Erlaubte Stände je Liste: MMAT kennt Ja / Nein / Kann ich nicht sagen; GRAMMS beschrieben / noch nicht / trifft nicht zu. */
export const staendeDer = (l: Liste): readonly PruefStand[] => (l === 'mmat' ? ['ja', 'nein', 'unklar'] : ['ja', 'nein', 'nicht-zutreffend']);
export const standText = (l: Liste, s: PruefStand): string => (l === 'mmat'
  ? ({ ja: L('Ja', 'Yes'), nein: L('Nein', 'No'), unklar: L('Kann ich nicht sagen', 'Can\'t tell'), 'nicht-zutreffend': L('Trifft nicht zu', 'Not applicable') })[s]
  : ({ ja: L('Beschrieben', 'Reported'), nein: L('Noch nicht beschrieben', 'Not yet reported'), unklar: L('Unklar', 'Unclear'), 'nicht-zutreffend': L('Trifft nicht zu', 'Not applicable') })[s]);
export const quelleText = (l: Liste): string => (l === 'mmat'
  ? L('Eigene Kurzfassung nach dem Mixed Methods Appraisal Tool (MMAT), Version 2018, Teil 5 (Hong u. a. 2018). Keine Gesamtnote: Die Anleitung rät davon ab.', 'Own short version after the Mixed Methods Appraisal Tool (MMAT), version 2018, part 5 (Hong et al. 2018). No overall score: the guidance advises against it.')
  : L('Eigene Kurzfassung nach GRAMMS, Good Reporting of A Mixed Methods Study (O\'Cathain, Murphy & Nicholl 2008). Eine Berichtsliste, keine Bewertung.', 'Own short version after GRAMMS, Good Reporting of A Mixed Methods Study (O\'Cathain, Murphy & Nicholl 2008). A reporting list, not a rating.'));

/** Was die Person gesetzt hat (oder undefined). */
export function punktStand(q: Pick<QualProjekt, 'selbstpruefung'>, l: Liste, kennung: string): SelbstPunkt | undefined {
  return q.selbstpruefung?.find(x => x.liste === l)?.punkte.find(p => p.kennung === kennung);
}

/** Setzen oder (stand null) entfernen; Fundstelle und Notiz bleiben beim Ändern des Stands. */
export function setzePunkt(q: QualProjekt, l: Liste, kennung: string, aenderung: { stand?: PruefStand | null; fundstelle?: string; notiz?: string }, jetzt = Date.now()): QualProjekt {
  const listen = [...(q.selbstpruefung ?? [])];
  let i = listen.findIndex(x => x.liste === l);
  if (i < 0) { listen.push({ liste: l, punkte: [] }); i = listen.length - 1; }
  const alt = listen[i]!.punkte.find(p => p.kennung === kennung);
  let punkte = listen[i]!.punkte.filter(p => p.kennung !== kennung);
  const stand = aenderung.stand === undefined ? alt?.stand : aenderung.stand ?? undefined;
  const fundstelle = (aenderung.fundstelle ?? alt?.fundstelle ?? '').trim();
  const notiz = (aenderung.notiz ?? alt?.notiz ?? '').trim();
  if (stand) {
    const p: SelbstPunkt = { kennung, stand, geaendert: jetzt };
    if (fundstelle) p.fundstelle = fundstelle;
    if (notiz) p.notiz = notiz;
    const reihe = punkteDer(l).map(x => x.kennung);
    punkte = [...punkte, p].sort((a, b) => reihe.indexOf(a.kennung) - reihe.indexOf(b.kennung));
  }
  listen[i] = { liste: l, punkte };
  const r = { ...q, selbstpruefung: listen.filter(x => x.punkte.length) };
  if (!r.selbstpruefung.length) delete (r as Partial<QualProjekt>).selbstpruefung;
  return r;
}

/**
 * Hinweise aus dem Projekt (nur Hinweise; nie still als „ja“ gespeichert). `integration` = die vier Felder im Bericht (lib/integration.ts),
 * `datenZeilen` = Zeilen des Datensatzes (0 = keiner).
 */
export function hinweise(q: QualProjekt, integration: Integration, datenZeilen: number): Record<string, string[]> {
  const r: Record<string, string[]> = {};
  const dazu = (k: string, t: string) => { (r[k] ??= []).push(t); };
  const jd = q.jointDisplays ?? [];
  const meta = jd.reduce((a, j) => a + Object.values(j.metaInferenz).filter(t => t.trim()).length, 0);
  const wider = jd.reduce((a, j) => a + Object.values(j.passung).filter(p => p === 'widerspruch').length, 0);
  const n = notation(q.mmDesign ?? {});
  if (integration.warum?.trim()) { dazu('mmat-5-1', L('Im Bericht steht eine Begründung (Integration: „Warum verbinde ich …“).', 'The report contains a justification (integration: "Why do I combine …").')); dazu('gramms-1', L('Begründung im Bericht vorhanden.', 'Justification present in the report.')); }
  if (q.mmDesign) {
    const teile = [n, q.mmDesign.zwecke.length ? L(`${q.mmDesign.zwecke.length} Zweck(e)`, `${q.mmDesign.zwecke.length} purpose(s)`) : ''].filter(Boolean).join(', ');
    if (teile) dazu('gramms-2', L(`Design-Steckbrief: ${teile}.`, `Design profile: ${teile}.`));
  }
  if (q.dokumente.length || datenZeilen) dazu('gramms-3', L(`Im Projekt: ${q.dokumente.length} Dokumente, ${q.faelle.length} Fälle, ${q.codes.length} Codes; Datensatz mit ${datenZeilen} Zeilen.`, `In the project: ${q.dokumente.length} documents, ${q.faelle.length} cases, ${q.codes.length} codes; data set with ${datenZeilen} rows.`));
  const verb: string[] = [];
  if (q.verknuepfung) verb.push(L('Fälle mit dem Datensatz verknüpft', 'cases linked with the data set'));
  if (jd.length) verb.push(L(`${jd.length} Joint Display(s)`, `${jd.length} joint display(s)`));
  if (q.instrument?.length) verb.push(L(`${q.instrument.length} Item-Entwürfe aus Kategorien`, `${q.instrument.length} item drafts from categories`));
  if (q.mmDesign?.integration.length) verb.push(L(`Integrationsarten im Steckbrief: ${q.mmDesign.integration.length}`, `types of integration in the profile: ${q.mmDesign.integration.length}`));
  if (integration.wo?.trim()) verb.push(L('Integrationspunkt im Bericht beschrieben', 'point of integration described in the report'));
  if (verb.length) { const t = verb.join('; ') + '.'; dazu('mmat-5-2', t); dazu('gramms-4', t); }
  if (meta || integration.gelernt?.trim()) {
    const t = [meta ? L(`${meta} Meta-Inferenz(en) in Joint Displays`, `${meta} meta-inference(s) in joint displays`) : '', integration.gelernt?.trim() ? L('„Was habe ich gelernt“ im Bericht', '"What did I learn" in the report') : ''].filter(Boolean).join('; ') + '.';
    dazu('mmat-5-3', t); dazu('gramms-6', t);
  }
  if (wider || integration.widersprueche?.trim()) dazu('mmat-5-4', [wider ? L(`${wider} Zeile(n) mit Passung „Widerspruch“`, `${wider} row(s) with fit "discordance"`) : '', integration.widersprueche?.trim() ? L('Widersprüche im Bericht beschrieben', 'contradictions described in the report') : ''].filter(Boolean).join('; ') + '.');
  return r;
}
