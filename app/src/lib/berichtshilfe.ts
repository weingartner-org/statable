/**
 * Berichtshilfe (Stufe A5): COREQ und SRQR in eigener Kurzfassung (Fachblatt `docs/ausbau/FACHBLATT-BERICHTSHILFE.md`).
 *
 * Quellen: Tong, Sainsbury & Craig (2007), COREQ, International Journal for Quality in Health Care 19(6), 349-357, doi:10.1093/intqhc/mzm042;
 * O'Brien, Harris, Beckman, Reed & Cook (2014), SRQR, Academic Medicine 89(9), 1245-1251, doi:10.1097/ACM.0000000000000388.
 *
 * Lizenz: Der Wortlaut beider Listen ist geschützt. Statable übernimmt keinen Satz daraus, sondern zeigt je Punkt eine eigene Kurzfassung
 * in einfacher Sprache; das Thema des Punkts steht als Fachbegriff in Klammern. Kennungen sind fest (`coreq-01` … `srqr-21`).
 *
 * Regeln: Keine Gesamtnote, keine Zahl „erfüllt“, nur „x von n bearbeitet“ und „noch offen“. Was Statable aus dem Projekt weiß, ist nur ein
 * Hinweis; es wird beim Öffnen berechnet und nie als Stand gespeichert. Nie Text aus Dokumenten, nur Zahlen, Namen von Arten und Angaben der Person.
 */
import { L } from './sitzung.svelte';
import { ARBEITSWEISE_TEXT, arbeitsweise as arbeitsweiseVon } from './arbeitsweise';
import { BERICHT_LISTEN, type BerichtListe, type BerichtPunkt, type BerichtPunktStand, type QualProjekt } from './qualprojekt';
import { satzFuer, spaltenText } from './feinstruktur-spalten';

export interface BerichtPunktText {
  kennung: string;
  /** Nummer, wie sie in der Originalliste steht (COREQ 1-32, SRQR S1-S21) */
  nummer: string;
  /** Thema des Punkts als Fachbegriff (englisch, wie Zeitschriften ihn nennen) */
  begriff: string;
  bereich: () => string;
  text: () => string;
}

const nr2 = (n: number): string => String(n).padStart(2, '0');

const B_TEAM = () => L('Forschungsteam und Reflexivität (research team and reflexivity)', 'Research team and reflexivity');
const B_DESIGN = () => L('Aufbau der Studie (study design)', 'Study design');
const B_AUSWERT = () => L('Auswertung und Ergebnisse (analysis and findings)', 'Analysis and findings');

/** COREQ: eigene Kurzfassung, 32 Punkte in drei Bereichen */
const COREQ_ROH: [string, () => string, () => string][] = [
  ['Interviewer/facilitator', B_TEAM, () => L('Wer hat die Interviews oder Gruppen geführt?', 'Who led the interviews or groups?')],
  ['Credentials', B_TEAM, () => L('Welche Abschlüsse haben diese Personen?', 'What degrees do these people hold?')],
  ['Occupation', B_TEAM, () => L('Was war ihre berufliche Rolle zur Zeit der Studie?', 'What was their job at the time of the study?')],
  ['Gender', B_TEAM, () => L('Welches Geschlecht haben sie (wenn für die Studie wichtig)?', 'What is their gender (if it matters for the study)?')],
  ['Experience and training', B_TEAM, () => L('Welche Erfahrung oder Schulung hatten sie für diese Methode?', 'What experience or training did they have for this method?')],
  ['Relationship established', B_TEAM, () => L('Gab es vor der Studie schon eine Beziehung zu den Teilnehmenden?', 'Did a relationship with the participants exist before the study?')],
  ['Participant knowledge of the interviewer', B_TEAM, () => L('Was wussten die Teilnehmenden über die interviewende Person und den Zweck?', 'What did participants know about the person interviewing and the purpose?')],
  ['Interviewer characteristics', B_TEAM, () => L('Was wird über Vorannahmen, Interessen und Gründe der interviewenden Person berichtet?', 'What is said about the assumptions, interests and motives of the person interviewing?')],
  ['Methodological orientation and theory', B_DESIGN, () => L('Welche methodische Ausrichtung trägt die Studie (zum Beispiel Grounded Theory, Inhaltsanalyse, Phänomenologie)?', 'Which methodological orientation underlies the study (for example grounded theory, content analysis, phenomenology)?')],
  ['Sampling', B_DESIGN, () => L('Wie wurden die Teilnehmenden ausgewählt (gezielt, Schneeball, nach Gelegenheit)?', 'How were participants chosen (purposive, snowball, convenience)?')],
  ['Method of approach', B_DESIGN, () => L('Wie wurden sie angesprochen (persönlich, Telefon, Mail)?', 'How were they contacted (in person, phone, email)?')],
  ['Sample size', B_DESIGN, () => L('Wie viele haben teilgenommen?', 'How many took part?')],
  ['Non-participation', B_DESIGN, () => L('Wie viele haben abgelehnt oder abgebrochen, und warum?', 'How many declined or dropped out, and why?')],
  ['Setting of data collection', B_DESIGN, () => L('Wo wurden die Daten erhoben (zu Hause, Arbeitsplatz, online)?', 'Where were the data collected (at home, at work, online)?')],
  ['Presence of non-participants', B_DESIGN, () => L('War außer den Beteiligten noch jemand dabei?', 'Was anyone else present besides those taking part?')],
  ['Description of sample', B_DESIGN, () => L('Welche wichtigen Merkmale hat die Stichprobe (zum Beispiel Alter, Fach)?', 'What are the important features of the sample (for example age, subject)?')],
  ['Interview guide', B_DESIGN, () => L('Gab es einen Leitfaden, und wurde er vorher erprobt?', 'Was there an interview guide, and was it tried out beforehand?')],
  ['Repeat interviews', B_DESIGN, () => L('Gab es wiederholte Interviews, wie viele?', 'Were interviews repeated, and how many?')],
  ['Audio/visual recording', B_DESIGN, () => L('Wurde mit Ton oder Bild aufgenommen?', 'Was sound or video recorded?')],
  ['Field notes', B_DESIGN, () => L('Wurden während oder nach dem Interview Notizen gemacht?', 'Were notes taken during or after the interview?')],
  ['Duration', B_DESIGN, () => L('Wie lange dauerten die Interviews?', 'How long did the interviews last?')],
  ['Data saturation', B_DESIGN, () => L('Wurde Sättigung besprochen, und wie wurde sie beurteilt?', 'Was saturation discussed, and how was it judged?')],
  ['Transcripts returned', B_DESIGN, () => L('Bekamen Teilnehmende ihr Transkript zum Ansehen oder Berichtigen?', 'Did participants get their transcript to look at or correct?')],
  ['Number of data coders', B_AUSWERT, () => L('Wie viele Personen haben kodiert?', 'How many people coded?')],
  ['Description of the coding tree', B_AUSWERT, () => L('Wird der Codebaum beschrieben?', 'Is the code tree described?')],
  ['Derivation of themes', B_AUSWERT, () => L('Wurden die Themen vorab festgelegt oder aus den Daten gebildet?', 'Were the themes set in advance or developed from the data?')],
  ['Software', B_AUSWERT, () => L('Welche Software wurde verwendet?', 'Which software was used?')],
  ['Participant checking', B_AUSWERT, () => L('Haben Teilnehmende Rückmeldung zu den Ergebnissen gegeben?', 'Did participants give feedback on the findings?')],
  ['Quotations presented', B_AUSWERT, () => L('Werden Zitate gezeigt, und sind sie zugeordnet (zum Beispiel mit Teilnehmer-Nummer)?', 'Are quotes shown, and are they attributed (for example with a participant number)?')],
  ['Data and findings consistent', B_AUSWERT, () => L('Passen gezeigte Daten und Ergebnisse zusammen?', 'Do the data shown and the findings fit together?')],
  ['Clarity of major themes', B_AUSWERT, () => L('Werden die Hauptthemen klar dargestellt?', 'Are the main themes presented clearly?')],
  ['Clarity of minor themes', B_AUSWERT, () => L('Werden auch Nebenfälle oder kleinere Themen beschrieben?', 'Are side cases or smaller themes described as well?')],
];

const B_SRQR = () => L('Berichtsstandard (SRQR)', 'Reporting standard (SRQR)');
/** SRQR: eigene Kurzfassung, 21 Punkte */
const SRQR_ROH: [string, () => string][] = [
  ['Title', () => L('Sagt der Titel, worum es geht und dass es qualitative Forschung ist?', 'Does the title say what it is about and that it is qualitative research?')],
  ['Abstract', () => L('Fasst die Zusammenfassung Ziel, Vorgehen, Ergebnisse und Schluss kurz?', 'Does the summary briefly cover aim, approach, findings and conclusion?')],
  ['Problem formulation', () => L('Was ist das Problem, und warum ist es wichtig?', 'What is the problem, and why does it matter?')],
  ['Purpose or research question', () => L('Was ist das Ziel oder die Forschungsfrage?', 'What is the aim or the research question?')],
  ['Qualitative approach and research paradigm', () => L('Welcher Ansatz und welches Grundverständnis (zum Beispiel interpretativ)? Warum?', 'Which approach and which basic stance (for example interpretive)? Why?')],
  ['Researcher characteristics and reflexivity', () => L('Wer forscht, mit welchen Vorannahmen und Beziehungen, und wie wurde damit umgegangen?', 'Who does the research, with which assumptions and relationships, and how was this handled?')],
  ['Context', () => L('Wo und unter welchen Umständen fand die Studie statt?', 'Where and under which circumstances did the study take place?')],
  ['Sampling strategy', () => L('Wie und warum wurden Teilnehmende oder Dokumente gewählt; wann war genug?', 'How and why were participants or documents chosen; when was it enough?')],
  ['Ethical issues pertaining to human subjects', () => L('Ethikvotum, Einwilligung, Schutz der Daten?', 'Ethics approval, consent, data protection?')],
  ['Data collection methods', () => L('Wie wurden Daten erhoben, wann, und hat sich das Vorgehen geändert?', 'How and when were data collected, and did the approach change?')],
  ['Data collection instruments and technologies', () => L('Welche Leitfäden, Geräte, Aufnahmen?', 'Which guides, devices, recordings?')],
  ['Units of study', () => L('Wie viele Teilnehmende, Dokumente oder Ereignisse, mit welchen Merkmalen?', 'How many participants, documents or events, with which features?')],
  ['Data processing', () => L('Wie wurden Daten aufbereitet (Transkription, Pseudonymisierung, Prüfung)?', 'How were data prepared (transcription, pseudonymisation, checking)?')],
  ['Data analysis', () => L('Wie wurde ausgewertet (Schritte, Personen, Ansatz)?', 'How was the analysis done (steps, people, approach)?')],
  ['Techniques to enhance trustworthiness', () => L('Was wurde für Vertrauenswürdigkeit getan (zum Beispiel Tagebuch, Konsens, Rückmeldung)?', 'What was done for trustworthiness (for example journal, consensus, feedback)?')],
  ['Synthesis and interpretation', () => L('Welche Hauptergebnisse, und wie hängen sie mit Theorie oder früherer Forschung zusammen?', 'Which main findings, and how do they relate to theory or earlier research?')],
  ['Links to empirical data', () => L('Werden Ergebnisse mit Daten belegt (Zitate, Beobachtungen)?', 'Are findings backed by data (quotes, observations)?')],
  ['Integration with prior work, implications, transferability, contribution', () => L('Was trägt die Studie bei, und wofür gelten die Ergebnisse?', 'What does the study add, and where do the findings apply?')],
  ['Limitations', () => L('Welche Grenzen hat die Studie?', 'What are the limits of the study?')],
  ['Conflicts of interest', () => L('Gibt es Interessenkonflikte?', 'Are there conflicts of interest?')],
  ['Funding', () => L('Wie wurde die Studie finanziert?', 'How was the study funded?')],
];

export const COREQ: readonly BerichtPunktText[] = COREQ_ROH.map(([begriff, bereich, text], i) => ({ kennung: `coreq-${nr2(i + 1)}`, nummer: String(i + 1), begriff, bereich, text }));
export const SRQR: readonly BerichtPunktText[] = SRQR_ROH.map(([begriff, text], i) => ({ kennung: `srqr-${nr2(i + 1)}`, nummer: `S${i + 1}`, begriff, bereich: B_SRQR, text }));
export const punkteDerListe = (l: BerichtListe): readonly BerichtPunktText[] => (l === 'coreq' ? COREQ : SRQR);
export { BERICHT_LISTEN };

export const listeName = (l: BerichtListe): string => (l === 'coreq'
  ? L('COREQ (Interviews und Fokusgruppen, 32 Punkte)', 'COREQ (interviews and focus groups, 32 items)')
  : L('SRQR (qualitative Forschung allgemein, 21 Punkte)', 'SRQR (qualitative research in general, 21 items)'));

export const DOI: Record<BerichtListe, string> = { coreq: 'https://doi.org/10.1093/intqhc/mzm042', srqr: 'https://doi.org/10.1097/ACM.0000000000000388' };

/** Quellenhinweis über der Liste und im Kopf des Word-Anhangs (Fachblatt 1, Punkt 2) */
export const quelleText = (l: BerichtListe): string => (l === 'coreq'
  ? L('Eigene Kurzfassung nach Tong u. a. (2007). Für die Einreichung bei einer Zeitschrift die Originalliste verwenden.', 'Own short version after Tong et al. (2007). For journal submission use the original checklist.')
  : L('Eigene Kurzfassung nach O\'Brien u. a. (2014). Für die Einreichung bei einer Zeitschrift die Originalliste verwenden.', 'Own short version after O\'Brien et al. (2014). For journal submission use the original checklist.'));

export const standText = (s: BerichtPunktStand): string =>
  ({ erfuellt: L('Erfüllt (berichtet)', 'Met (reported)'), offen: L('Offen', 'Open'), 'nicht-zutreffend': L('Trifft nicht zu', 'Not applicable') })[s];

/** Was die Person gesetzt hat (oder undefined) */
export function punktStand(q: Pick<QualProjekt, 'berichtshilfe'>, l: BerichtListe, kennung: string): BerichtPunkt | undefined {
  return q.berichtshilfe?.find(x => x.liste === l)?.punkte.find(p => p.kennung === kennung);
}

/**
 * Stand, Fundstelle oder Notiz setzen. `stand: null` nimmt den Stand zurück. Ohne Stand wird nichts gespeichert (auch keine Fundstelle):
 * Ein Punkt gilt erst als bearbeitet, wenn die Person einen Stand wählt. Leere Listen fallen weg, `berichtshilfe` fehlt dann ganz.
 */
export function setzeBerichtPunkt(q: QualProjekt, l: BerichtListe, kennung: string, aenderung: { stand?: BerichtPunktStand | null; fundstelle?: string; notiz?: string }, jetzt = Date.now()): QualProjekt {
  if (!punkteDerListe(l).some(p => p.kennung === kennung)) throw new Error(`Berichtshilfe: unbekannter Punkt ${kennung}`);
  const listen = [...(q.berichtshilfe ?? [])];
  let i = listen.findIndex(x => x.liste === l);
  if (i < 0) { listen.push({ liste: l, punkte: [] }); i = listen.length - 1; }
  const alt = listen[i]!.punkte.find(p => p.kennung === kennung);
  let punkte = listen[i]!.punkte.filter(p => p.kennung !== kennung);
  const stand = aenderung.stand === undefined ? alt?.stand : aenderung.stand ?? undefined;
  const fundstelle = (aenderung.fundstelle ?? alt?.fundstelle ?? '').trim();
  const notiz = (aenderung.notiz ?? alt?.notiz ?? '').trim();
  if (stand) {
    const p: BerichtPunkt = { kennung, stand, geaendert: jetzt };
    if (fundstelle) p.fundstelle = fundstelle;
    if (notiz) p.notiz = notiz;
    const reihe = punkteDerListe(l).map(x => x.kennung);
    punkte = [...punkte, p].sort((a, b) => reihe.indexOf(a.kennung) - reihe.indexOf(b.kennung));
  }
  listen[i] = { liste: l, punkte };
  const r: QualProjekt = { ...q, berichtshilfe: listen.filter(x => x.punkte.length).sort((a, b) => BERICHT_LISTEN.indexOf(a.liste) - BERICHT_LISTEN.indexOf(b.liste)) };
  if (!r.berichtshilfe!.length) delete r.berichtshilfe;
  return r;
}

/** Reine Zählung als Arbeitshilfe (keine Note): bearbeitet = mit Stand; noch offen = ohne Stand oder „offen“ */
export function zaehlung(q: Pick<QualProjekt, 'berichtshilfe'>, l: BerichtListe): { n: number; bearbeitet: number; nochOffen: number } {
  const alle = punkteDerListe(l);
  const gesetzt = q.berichtshilfe?.find(x => x.liste === l)?.punkte ?? [];
  const nochOffen = alle.filter(p => { const s = gesetzt.find(x => x.kennung === p.kennung)?.stand; return !s || s === 'offen'; }).length;
  return { n: alle.length, bearbeitet: gesetzt.length, nochOffen };
}

/* ---- Hinweise aus dem Projekt („Statable weiß“) ---- */

export interface BerichtHinweis {
  text: string;
  /** Sprung zur Stelle (Hash ohne #), wenn es eine gibt */
  ziel?: string;
  zielText?: string;
}
/** Angaben außerhalb des qualitativen Projekts (Leitfaden-Assistent liegt in der Sitzung) */
export interface Aussen { leitfaeden?: number }

/** Länge eines Transkripts in Millisekunden aus den Zeitmarken (0 = keine Zeitmarken) */
export function transkriptDauerMs(d: QualProjekt['dokumente'][number]): number {
  let m = 0;
  for (const a of d.transkript?.abschnitte ?? []) m = Math.max(m, a.bisMs ?? 0, a.zeitMs ?? 0);
  return m;
}

const minuten = (ms: number): number => Math.round(ms / 60000);
const zahlText = (n: number, de1: string, deN: string, en1: string, enN: string): string => L(n === 1 ? `1 ${de1}` : `${n} ${deN}`, n === 1 ? `1 ${en1}` : `${n} ${enN}`);

/**
 * Was Statable aus dem Projekt weiß, je Kennung. Nur Hinweise, nie Stand. Steht nichts im Projekt, gibt es keinen Eintrag (kein „unbekannt“).
 * Nie Text aus Dokumenten oder Protokollen, nur Zahlen, Arten und Namen von Kodierenden, Fallvariablen, Quellen.
 */
export function berichtHinweise(q: QualProjekt, aussen: Aussen = {}): Record<string, BerichtHinweis[]> {
  const r: Record<string, BerichtHinweis[]> = {};
  const dazu = (kennungen: string[], h: BerichtHinweis) => { for (const k of kennungen) (r[k] ??= []).push(h); };
  const INT = { ziel: 'interviews', zielText: L('Zur Seite Interviews', 'To the interviews page') };
  const aw = arbeitsweiseVon(q);

  // Kodierende (COREQ 1 nur als Erinnerung, 24 als Zahl mit Kodierungen)
  const mitKod = q.kodierende.filter(k => q.kodierungen.some(x => x.kodierende === k.id));
  if (q.kodierende.length) dazu(['coreq-01'], { text: L(`Im Projekt eingetragene Kodierende: ${q.kodierende.map(k => k.name || '?').join(', ')}. Wer interviewt hat, kann eine andere Person sein.`, `Coders entered in the project: ${q.kodierende.map(k => k.name || '?').join(', ')}. The person who interviewed may be someone else.`) });
  if (mitKod.length) {
    dazu(['coreq-24'], { text: L(`${zahlText(mitKod.length, 'Person hat', 'Personen haben', 'person has', 'people have')} im Projekt kodiert: ${mitKod.map(k => k.name || '?').join(', ')}.`, `${zahlText(mitKod.length, 'Person hat', 'Personen haben', 'person has', 'people have')} coded in the project: ${mitKod.map(k => k.name || '?').join(', ')}.`) });
    dazu(['srqr-14'], { text: L(`Kodiert von ${zahlText(mitKod.length, 'Person', 'Personen', 'person', 'people')}.`, `Coded by ${zahlText(mitKod.length, 'Person', 'Personen', 'person', 'people')}.`) });
  }
  if (aw === 'ta-reflexiv') dazu(['coreq-24', 'srqr-15'], { text: L('Übereinstimmungszahlen sind bei reflexiver thematischer Analyse kein Gütemaß (Braun und Clarke 2021).', 'Agreement figures are not a quality measure in reflexive thematic analysis (Braun and Clarke 2021).') });

  // Arbeitsweise (COREQ 9, SRQR 5 und 14)
  if (q.arbeitsweise) {
    const t = ARBEITSWEISE_TEXT[aw];
    const name = L(t.name[0], t.name[1]);
    dazu(['coreq-09', 'srqr-05', 'srqr-14'], { text: L(`Gewählte Arbeitsweise: ${name}${t.quelle ? ` (${t.quelle})` : ''}.`, `Chosen approach: ${name}${t.quelle ? ` (${t.quelle})` : ''}.`), ziel: 'kodieren/arbeitsweise', zielText: L('Zur Arbeitsweise', 'To the approach') });
  }

  // Memos nach Art
  const memoZahl = (a: string): number => q.memos.filter(m => m.art === a).length;
  const tb = memoZahl('tagebuch');
  if (tb) dazu(['coreq-08', 'srqr-06'], { text: L(`${zahlText(tb, 'Eintrag', 'Einträge', 'entry', 'entries')} im reflexiven Tagebuch.`, `${zahlText(tb, 'Eintrag', 'Einträge', 'entry', 'entries')} in the reflexive journal.`), ziel: 'kodieren/tagebuch', zielText: L('Zum Tagebuch', 'To the journal') });
  if (tb) dazu(['srqr-15'], { text: L('Reflexives Tagebuch geführt.', 'Reflexive journal kept.'), ziel: 'kodieren/tagebuch', zielText: L('Zum Tagebuch', 'To the journal') });
  const ausw = memoZahl('gt-auswahl');
  if (ausw) dazu(['coreq-10', 'srqr-08'], { text: L(`${zahlText(ausw, 'Memo', 'Memos', 'memo', 'memos')} zur theoretischen Auswahl (theoretical sampling).`, `${zahlText(ausw, 'Memo', 'Memos', 'memo', 'memos')} on theoretical sampling.`), ziel: 'kodieren/gt-memos', zielText: L('Zu den Memos', 'To the memos') });
  const saett = memoZahl('saettigung');
  if (saett) dazu(['coreq-22', 'srqr-08'], { text: L(`Sättigungs-Memo vorhanden (${saett}). Statable berechnet Sättigung nie.`, `Saturation memo present (${saett}). Statable never calculates saturation.`), ziel: 'kodieren/gt-memos', zielText: L('Zu den Memos', 'To the memos') });
  const feld = q.memos.filter(m => m.art?.startsWith('feldnotiz')).length;
  const gedaechtnis = (q.protokolle ?? []).filter(p => p.art === 'gedaechtnis').length;
  const beob = (q.protokolle ?? []).filter(p => p.art === 'beobachtung').length;
  if (feld || gedaechtnis || beob) {
    const teile = [feld ? zahlText(feld, 'Feldnotiz', 'Feldnotizen', 'field note', 'field notes') : '', gedaechtnis ? zahlText(gedaechtnis, 'Gedächtnisprotokoll', 'Gedächtnisprotokolle', 'memory protocol', 'memory protocols') : '', beob ? zahlText(beob, 'Beobachtungsprotokoll', 'Beobachtungsprotokolle', 'observation protocol', 'observation protocols') : ''].filter(Boolean).join(', ');
    dazu(['coreq-20'], { text: L(`Im Projekt: ${teile}.`, `In the project: ${teile}.`), ...INT });
  }

  // Interviewprotokolle: Kontaktweg, Ort, Dauer (nur Zahl, ob ausgefüllt; nie der Text)
  const ip = (q.protokolle ?? []).filter(p => p.art === 'interview');
  if (ip.length) {
    const kontakt = ip.filter(p => p.kopf.kontaktweg?.trim()).length, ort = ip.filter(p => p.kopf.ort?.trim()).length;
    if (kontakt) dazu(['coreq-06', 'coreq-11'], { text: L(`In ${zahlText(kontakt, 'Interviewprotokoll', 'Interviewprotokollen', 'interview protocol', 'interview protocols')} ist der Kontaktweg eingetragen.`, `The way of contact is entered in ${zahlText(kontakt, 'Interviewprotokoll', 'Interviewprotokollen', 'interview protocol', 'interview protocols')}.`), ...INT });
    if (ort) dazu(['coreq-14', 'srqr-07'], { text: L(`In ${zahlText(ort, 'Interviewprotokoll', 'Interviewprotokollen', 'interview protocol', 'interview protocols')} ist der Ort eingetragen.`, `The place is entered in ${zahlText(ort, 'Interviewprotokoll', 'Interviewprotokollen', 'interview protocol', 'interview protocols')}.`), ...INT });
    dazu(['coreq-15'], { text: L(`${zahlText(ip.length, 'Interviewprotokoll', 'Interviewprotokolle', 'interview protocol', 'interview protocols')}: Dort steht, wer dabei war, wenn Sie es notiert haben.`, `${zahlText(ip.length, 'Interviewprotokoll', 'Interviewprotokolle', 'interview protocol', 'interview protocols')}: who was present is there if you noted it.`), ...INT });
  }

  // Interviews, Fälle, Dauer
  const interviews = q.dokumente.filter(d => d.transkript);
  if (q.faelle.length || interviews.length) {
    const teile = [zahlText(q.faelle.length, 'Fall', 'Fälle', 'case', 'cases'), interviews.length ? zahlText(interviews.length, 'Transkript', 'Transkripte', 'transcript', 'transcripts') : '', zahlText(q.dokumente.length, 'Dokument', 'Dokumente', 'document', 'documents')].filter(Boolean).join(', ');
    dazu(['coreq-12', 'srqr-12'], { text: L(`Im Projekt: ${teile}.`, `In the project: ${teile}.`) });
  }
  const proFall = new Map<string, number>();
  for (const d of interviews) if (d.fall) proFall.set(d.fall, (proFall.get(d.fall) ?? 0) + 1);
  const mehrfach = [...proFall.values()].filter(n => n > 1).length;
  if (mehrfach) dazu(['coreq-18'], { text: L(`${zahlText(mehrfach, 'Fall hat', 'Fälle haben', 'case has', 'cases have')} mehr als ein Transkript.`, `${zahlText(mehrfach, 'Fall hat', 'Fälle haben', 'case has', 'cases have')} more than one transcript.`) });
  const dauern = interviews.map(transkriptDauerMs).filter(ms => ms > 0);
  const dauernProt = ip.map(p => p.kopf.dauerMin).filter((x): x is number => typeof x === 'number' && x > 0);
  if (dauern.length) {
    const min = minuten(Math.min(...dauern)), max = minuten(Math.max(...dauern)), mittel = minuten(dauern.reduce((a, b) => a + b, 0) / dauern.length);
    dazu(['coreq-21'], { text: L(`Aus den Zeitmarken von ${zahlText(dauern.length, 'Transkript', 'Transkripten', 'transcript', 'transcripts')}: ${min} bis ${max} Minuten, im Mittel ${mittel} Minuten.`, `From the time stamps of ${zahlText(dauern.length, 'Transkript', 'Transkripten', 'transcript', 'transcripts')}: ${min} to ${max} minutes, on average ${mittel} minutes.`) });
  } else if (dauernProt.length) {
    dazu(['coreq-21'], { text: L(`Aus ${zahlText(dauernProt.length, 'Interviewprotokoll', 'Interviewprotokollen', 'interview protocol', 'interview protocols')}: ${Math.min(...dauernProt)} bis ${Math.max(...dauernProt)} Minuten.`, `From ${zahlText(dauernProt.length, 'Interviewprotokoll', 'Interviewprotokollen', 'interview protocol', 'interview protocols')}: ${Math.min(...dauernProt)} to ${Math.max(...dauernProt)} minutes.`), ...INT });
  }
  // Aufnahme
  const medien = q.dokumente.filter(d => d.art === 'audio' || d.art === 'video' || d.medium).length;
  if (medien) dazu(['coreq-19', 'srqr-11'], { text: L(`${zahlText(medien, 'Dokument hat', 'Dokumente haben', 'document has', 'documents have')} eine Aufnahme (Ton oder Bild).`, `${zahlText(medien, 'Dokument hat', 'Dokumente haben', 'document has', 'documents have')} a recording (sound or video).`) });
  // Transkriptionsregeln und Quelle
  const REGEL: Record<string, [string, string]> = { einfach: ['einfache Regeln (Dresing und Pehl)', 'simple rules (Dresing and Pehl)'], erweitert: ['erweiterte Regeln (Dresing und Pehl)', 'extended rules (Dresing and Pehl)'], 'froschauer-lueger': ['Regeln nach Froschauer und Lueger', 'rules after Froschauer and Lueger'] };
  const regeln = new Map<string, number>();
  for (const d of interviews) if (d.transkript?.regeln) regeln.set(d.transkript.regeln, (regeln.get(d.transkript.regeln) ?? 0) + 1);
  if (regeln.size) dazu(['srqr-13'], { text: L(`Transkriptionsregeln: ${[...regeln].map(([k, n]) => `${REGEL[k]?.[0] ?? k} (${n})`).join(', ')}.`, `Transcription rules: ${[...regeln].map(([k, n]) => `${REGEL[k]?.[1] ?? k} (${n})`).join(', ')}.`) });
  const quellen = [...new Set(interviews.map(d => d.transkript?.quelle).filter((x): x is string => !!x))];
  if (quellen.length) dazu(['srqr-11'], { text: L(`Transkripte aus: ${quellen.join(', ')}.`, `Transcripts from: ${quellen.join(', ')}.`) });
  if (aussen.leitfaeden) dazu(['coreq-17', 'srqr-11'], { text: L(`${zahlText(aussen.leitfaeden, 'Leitfaden', 'Leitfäden', 'interview guide', 'interview guides')} im Leitfaden-Assistenten. Ob er erprobt wurde, wissen nur Sie.`, `${zahlText(aussen.leitfaeden, 'Leitfaden', 'Leitfäden', 'interview guide', 'interview guides')} in the guide assistant. Only you know whether it was tried out.`), ...INT });

  // Fallvariablen (Merkmale der Stichprobe): nur Namen
  if (q.variablen.length) dazu(['coreq-16', 'srqr-12'], { text: L(`Fallvariablen: ${q.variablen.map(v => v.name).join(', ')}.`, `Case variables: ${q.variablen.map(v => v.name).join(', ')}.`), ziel: 'kodieren', zielText: L('Zum Kodier-Arbeitsplatz', 'To the coding workplace') });

  // Einwilligung (F2): nur Zahlen, nie Namen
  const ew = q.einwilligungen ?? [];
  if (ew.length) {
    const faelleMit = new Set(ew.map(e => e.fall)).size;
    const fassungen = new Set(ew.map(e => e.fassung.trim()).filter(Boolean)).size;
    dazu(['srqr-09'], { text: L(`Einwilligung dokumentiert für ${zahlText(faelleMit, 'Fall', 'Fälle', 'case', 'cases')} von ${q.faelle.length}.`, `Consent documented for ${zahlText(faelleMit, 'Fall', 'Fälle', 'case', 'cases')} of ${q.faelle.length}.`), ...INT });
    if (fassungen) dazu(['coreq-07'], { text: L(`${zahlText(fassungen, 'Fassung', 'Fassungen', 'version', 'versions')} der Einwilligung oder des Infoblatts eingetragen.`, `${zahlText(fassungen, 'Fassung', 'Fassungen', 'version', 'versions')} of the consent form or information sheet entered.`), ...INT });
    const letzter = (e: (typeof ew)[number], p: string) => e.punkte.find(x => x.punkt === p)?.stand;
    const nein = ew.filter(e => letzter(e, 'teilnahme') === 'abgelehnt' || letzter(e, 'teilnahme') === 'widerrufen' || (e.widerrufe?.length ?? 0) > 0).length;
    if (nein) dazu(['coreq-13'], { text: L(`${zahlText(nein, 'Fall', 'Fälle', 'case', 'cases')} mit Teilnahme abgelehnt oder widerrufen.`, `${zahlText(nein, 'Fall', 'Fälle', 'case', 'cases')} with participation declined or withdrawn.`), ...INT });
    const aufnahme = ew.filter(e => letzter(e, 'aufnahme') === 'erteilt').length;
    if (aufnahme) dazu(['coreq-19'], { text: L(`Einwilligung zur Aufnahme erteilt: ${aufnahme}.`, `Consent to recording given: ${aufnahme}.`), ...INT });
    const zitate = ew.filter(e => letzter(e, 'zitate') === 'erteilt').length;
    dazu(['coreq-29'], { text: L(`Einwilligung zu Zitaten erteilt: ${zitate} von ${q.faelle.length} Fällen.`, `Consent to quotes given: ${zitate} of ${q.faelle.length} cases.`), ...INT });
  }

  // Codebaum, Themen
  if (q.codes.length) dazu(['coreq-25'], { text: L(`Codebaum mit ${zahlText(q.codes.length, 'Code', 'Codes', 'code', 'codes')}; als Word im Methodenanhang.`, `Code tree with ${zahlText(q.codes.length, 'Code', 'Codes', 'code', 'codes')}; as Word in the methods appendix.`), ziel: 'kodieren', zielText: L('Zum Kodier-Arbeitsplatz', 'To the coding workplace') });
  const themen = (q.themen ?? []).filter(t => t.stand !== 'verworfen');
  if (themen.length) {
    dazu(['coreq-26', 'srqr-16'], { text: L(`${zahlText(themen.length, 'Thema', 'Themen', 'theme', 'themes')} mit Verlauf; der Verlauf zeigt, wie sie entstanden sind.`, `${zahlText(themen.length, 'Thema', 'Themen', 'theme', 'themes')} with history; the history shows how they developed.`), ziel: 'kodieren/themen', zielText: L('Zu den Themen', 'To the themes') });
    const mitBeleg = themen.filter(t => t.belege?.length).length;
    if (mitBeleg) dazu(['srqr-17', 'coreq-29'], { text: L(`${mitBeleg} von ${themen.length} Themen haben gewählte Belegstellen.`, `${mitBeleg} of ${themen.length} themes have chosen passages.`), ziel: 'kodieren/themen', zielText: L('Zu den Themen', 'To the themes') });
  }
  const phasen = q.codes.filter(c => c.phase).length;
  if (phasen) dazu(['coreq-26'], { text: L(`${zahlText(phasen, 'Code hat', 'Codes haben', 'code has', 'codes have')} eine Kodierphase.`, `${zahlText(phasen, 'Code hat', 'Codes haben', 'code has', 'codes have')} a coding phase.`) });

  // Software (COREQ 27): Text zum Übernehmen
  dazu(['coreq-27'], { text: L('Text zum Übernehmen: „Statable (https://statable.eu), freie Web-Anwendung.“ Nennen Sie das Datum Ihrer Arbeit damit.', 'Text to copy: "Statable (https://statable.eu), free web application." State the date of your work with it.') });

  // Sequenzanalysen (A4): Forschungsfrage, Spaltensatz
  const sa = q.sequenzanalysen ?? [];
  if (sa.length) {
    const fragen = sa.filter(x => x.forschungsfrage.trim()).length;
    if (fragen) dazu(['srqr-04'], { text: L(`${zahlText(fragen, 'Sequenzanalyse hat', 'Sequenzanalysen haben', 'sequential analysis has', 'sequential analyses have')} eine Forschungsfrage.`, `${zahlText(fragen, 'Sequenzanalyse hat', 'Sequenzanalysen haben', 'sequential analysis has', 'sequential analyses have')} a research question.`), ziel: 'interviews', zielText: L('Zur Seite Interviews', 'To the interviews page') });
    const saetze = [...new Set(sa.map(x => spaltenText(satzFuer(x, q.spaltensaetze ?? []).name, L('de', 'en'))))];
    dazu(['srqr-14', 'coreq-09'], { text: L(`${zahlText(sa.length, 'Sequenzanalyse', 'Sequenzanalysen', 'sequential analysis', 'sequential analyses')}, Spaltensatz: ${saetze.join(', ')}.`, `${zahlText(sa.length, 'Sequenzanalyse', 'Sequenzanalysen', 'sequential analysis', 'sequential analyses')}, column set: ${saetze.join(', ')}.`), ziel: 'interviews', zielText: L('Zur Seite Interviews', 'To the interviews page') });
  }

  // Mixed Methods (A2)
  const jd = q.jointDisplays ?? [];
  if (jd.length) dazu(['srqr-14', 'srqr-17'], { text: L(`${zahlText(jd.length, 'Joint Display', 'Joint Displays', 'joint display', 'joint displays')} (Zahlen und Texte verbunden).`, `${zahlText(jd.length, 'Joint Display', 'Joint Displays', 'joint display', 'joint displays')} (numbers and texts linked).`), ziel: 'kodieren/joint-display', zielText: L('Zu den Joint Displays', 'To the joint displays') });

  // KI-Nutzung (A1)
  if (q.kiNutzung) dazu(['srqr-13', 'srqr-14'], { text: q.kiNutzung.genutzt ? L('KI-Nutzung offengelegt: ja (Angabe im Methodenanhang).', 'AI use disclosed: yes (statement in the methods appendix).') : L('KI-Nutzung offengelegt: keine KI genutzt.', 'AI use disclosed: no AI used.'), ziel: 'kodieren/nachvollziehbarkeit', zielText: L('Zur KI-Angabe', 'To the AI statement') });
  return r;
}

/* ---- Word-Anhang ---- */

type Sp = 'de' | 'en';

/** Die Berichtshilfe einer Liste als Word-Anhang: Kopf mit Quellenhinweis, dann die ganze Tabelle (auch Punkte ohne Stand). Keine Hinweise von Statable. */
export async function berichtshilfeWord(q: QualProjekt, l: BerichtListe, sprache: Sp): Promise<Uint8Array> {
  const sp: Sp = sprache === 'en' ? 'en' : 'de', de = sp === 'de';
  const { wordWerkzeug } = await import('./nachvollziehbarkeit');
  const w = await wordWerkzeug(sp);
  const name = l === 'coreq' ? 'COREQ' : 'SRQR';
  const titel = de ? `Berichtshilfe ${name} (Anhang)` : `Reporting checklist ${name} (appendix)`;
  const z = zaehlung(q, l);
  type Teil = ReturnType<typeof w.ue> | ReturnType<typeof w.tabelle>;
  const k: Teil[] = [
    w.ue(titel, 'TITLE'),
    w.absatz(q.name),
    w.absatz(`${quelleText(l)} ${DOI[l]}`, { italics: true }),
    w.absatz(de ? `${z.bearbeitet} von ${z.n} Punkten bearbeitet. Den Stand hat die forschende Person gesetzt; die Liste ist keine Bewertung der Studie.` : `${z.bearbeitet} of ${z.n} items worked on. The status was set by the researcher; the list is not a rating of the study.`),
  ];
  const gesetzt = q.berichtshilfe?.find(x => x.liste === l)?.punkte ?? [];
  let bereich = '';
  const zeilen: string[][] = [];
  const teile: Teil[] = [];
  const fertigTabelle = () => { if (zeilen.length) { teile.push(w.tabelle(de ? ['Nr.', 'Punkt', 'Stand', 'Fundstelle', 'Notiz'] : ['No.', 'Item', 'Status', 'Location', 'Note'], zeilen.splice(0))); } };
  for (const p of punkteDerListe(l)) {
    const b = p.bereich();
    if (b !== bereich) { fertigTabelle(); bereich = b; teile.push(w.ue(b, 'HEADING_1')); }
    const x = gesetzt.find(y => y.kennung === p.kennung);
    zeilen.push([p.nummer, `${p.text()} (${p.begriff})`, x ? standText(x.stand) : (de ? 'noch nicht gesetzt' : 'not set yet'), x?.fundstelle ?? '', x?.notiz ?? '']);
  }
  fertigTabelle();
  return w.fertig(titel, [...k, ...teile]);
}
