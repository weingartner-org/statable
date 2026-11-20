/**
 * Vorlagen für den Fragebogen-Plan (Paket 2C): Startpunkte, frei änderbar. Alle Texte sind selbst formuliert; geschützte Instrumente (Skalen mit festem Wortlaut) werden nicht übernommen.
 * Jede Antwortstufe hat einen Text in Deutsch UND Englisch (Prüfregel `option-text`); die Fehlendcodes -8/-9 kommen als abwählbare Optionen dazu.
 * Rein: Plan hinein, Plan heraus. Text aus dem Plan wird hier nie ausgeführt.
 */
import type { Antwortliste, Block, Frage, FragebogenPlan, Lok, Option } from './fragebogenplan';
import { FEHLEND_CODE, FEHLEND_TEXT, finde, lokAusPaar, neueId, vergebeneNamen } from './fragebogenplan-editor';
import { namensVorschlag } from './fragebogenplan';
import { L } from './sitzung.svelte';

export type VorlageId = 'zustimmung5' | 'zufriedenheit5' | 'haeufigkeit5' | 'jaNein' | 'alter' | 'geschlecht' | 'abschluss' | 'einwilligung';
/** Eine Stufe: Code, Text de, Text en. */
type Stufe = [number, string, string];

interface Definition {
  id: VorlageId;
  /** Name der Antwortliste (zum Wiederverwenden), leer = ohne Liste */
  liste?: string;
  stufen?: Stufe[];
  geordnet?: boolean;
  /** Fehlendcodes anbieten (abwählbar) */
  fehlend?: ('weissNicht' | 'keineAngabe')[];
  /** Fragetext de/en */
  frage: [string, string];
  name: string;
  typ: Frage['typ'];
  niveau: 'nominal' | 'ordinal' | 'skala';
  /** als Block (mehrere Aussagen mit gleichen Stufen) möglich */
  block?: boolean;
  hilfe?: [string, string];
}

const DEFS: Definition[] = [
  { id: 'zustimmung5', liste: 'zustimmung5', geordnet: true, fehlend: ['weissNicht', 'keineAngabe'], typ: 'einfach', niveau: 'ordinal', block: true, name: 'zustimmung',
    frage: ['Wie sehr stimmen Sie der folgenden Aussage zu? (Aussage hier eintragen)', 'How much do you agree with the following statement? (enter statement here)'],
    stufen: [[1, 'stimme gar nicht zu', 'strongly disagree'], [2, 'stimme eher nicht zu', 'somewhat disagree'], [3, 'teils, teils', 'neither agree nor disagree'], [4, 'stimme eher zu', 'somewhat agree'], [5, 'stimme voll und ganz zu', 'strongly agree']] },
  { id: 'zufriedenheit5', liste: 'zufriedenheit5', geordnet: true, fehlend: ['weissNicht', 'keineAngabe'], typ: 'einfach', niveau: 'ordinal', block: true, name: 'zufriedenheit',
    frage: ['Wie zufrieden sind Sie mit … (hier eintragen)?', 'How satisfied are you with … (enter here)?'],
    stufen: [[1, 'sehr unzufrieden', 'very dissatisfied'], [2, 'eher unzufrieden', 'somewhat dissatisfied'], [3, 'weder zufrieden noch unzufrieden', 'neither satisfied nor dissatisfied'], [4, 'eher zufrieden', 'somewhat satisfied'], [5, 'sehr zufrieden', 'very satisfied']] },
  { id: 'haeufigkeit5', liste: 'haeufigkeit5', geordnet: true, fehlend: ['weissNicht', 'keineAngabe'], typ: 'einfach', niveau: 'ordinal', block: true, name: 'haeufigkeit',
    frage: ['Wie oft kommt es vor, dass … (hier eintragen)?', 'How often does it happen that … (enter here)?'],
    stufen: [[1, 'nie', 'never'], [2, 'selten', 'rarely'], [3, 'manchmal', 'sometimes'], [4, 'oft', 'often'], [5, 'immer', 'always']] },
  { id: 'jaNein', liste: 'ja_nein', geordnet: false, fehlend: ['weissNicht', 'keineAngabe'], typ: 'einfach', niveau: 'nominal', name: 'ja_nein',
    frage: ['Frage mit Antwort Ja oder Nein (hier eintragen)', 'Question with the answer yes or no (enter here)'],
    stufen: [[0, 'Nein', 'No'], [1, 'Ja', 'Yes']] },
  { id: 'alter', typ: 'zahl', niveau: 'skala', name: 'alter',
    frage: ['Wie alt sind Sie?', 'How old are you?'], hilfe: ['Bitte in ganzen Jahren angeben.', 'Please give your age in whole years.'] },
  { id: 'geschlecht', liste: 'geschlecht', geordnet: false, fehlend: ['keineAngabe'], typ: 'einfach', niveau: 'nominal', name: 'geschlecht',
    frage: ['Welchem Geschlecht fühlen Sie sich zugehörig?', 'Which gender do you identify with?'],
    stufen: [[1, 'weiblich', 'female'], [2, 'männlich', 'male'], [3, 'divers', 'non-binary']] },
  { id: 'abschluss', liste: 'abschluss', geordnet: true, fehlend: ['keineAngabe'], typ: 'einfach', niveau: 'ordinal', name: 'abschluss',
    frage: ['Was ist Ihr höchster Bildungsabschluss?', 'What is your highest level of education?'],
    stufen: [[1, 'kein Schulabschluss', 'no school-leaving qualification'], [2, 'Abschluss der Pflichtschule', 'compulsory school completed'], [3, 'mittlerer Schulabschluss', 'intermediate secondary qualification'],
      [4, 'Hochschulreife (zum Beispiel Abitur oder Matura)', 'university entrance qualification'], [5, 'Hochschulabschluss (Bachelor oder gleichwertig)', "bachelor's degree or equivalent"], [6, 'Master, Diplom oder Promotion', "master's degree, diploma or doctorate"]] },
  { id: 'einwilligung', typ: 'einwilligung', niveau: 'nominal', name: 'einwilligung',
    frage: ['Ich habe die Information zur Studie gelesen und bin mit der Teilnahme einverstanden.', 'I have read the study information and agree to take part.'] }
];

/** Name der Vorlage für die Auswahl. */
export function vorlageName(id: VorlageId): string {
  switch (id) {
    case 'zustimmung5': return L('Zustimmung (5 Stufen)', 'Agreement (5 levels)');
    case 'zufriedenheit5': return L('Zufriedenheit (5 Stufen)', 'Satisfaction (5 levels)');
    case 'haeufigkeit5': return L('Häufigkeit (5 Stufen)', 'Frequency (5 levels)');
    case 'jaNein': return L('Ja oder Nein', 'Yes or no');
    case 'alter': return L('Alter (Zahl)', 'Age (number)');
    case 'geschlecht': return L('Geschlecht', 'Gender');
    case 'abschluss': return L('Höchster Abschluss', 'Highest qualification');
    case 'einwilligung': return L('Einwilligung', 'Consent');
  }
}
export const VORLAGEN: VorlageId[] = DEFS.map(d => d.id);
export const vorlageDefinition = (id: VorlageId): Definition => DEFS.find(d => d.id === id)!;
/** Hat die Vorlage Stufen, die sich als Block (mehrere Aussagen) einsetzen lassen? */
export const vorlageKannBlock = (id: VorlageId) => !!vorlageDefinition(id).block;
/** Bietet die Vorlage abwählbare Fehlend-Optionen an? */
export const vorlageHatFehlend = (id: VorlageId) => !!vorlageDefinition(id).fehlend?.length;

/** Der Hinweis, der nach dem Einfügen dazugehört (oder ''). */
export function vorlageHinweis(id: VorlageId): string {
  if (id === 'geschlecht') return L('Hinweis: Geschlecht lässt sich nicht für alle Menschen mit festen Antworten abbilden. Die Vorlage enthält darum ein offenes Feld „Anderes, und zwar“. Lassen Sie es nur weg, wenn Ihre Studie das begründet verlangt.', 'Note: gender cannot be covered for everyone with fixed answers. The template therefore contains an open field "Other, namely". Remove it only if your study justifies it.');
  if (id === 'abschluss') return L('Hinweis: Die Stufen sind ein Vorschlag. Bildungssysteme unterscheiden sich von Land zu Land; passen Sie die Antworten an das Land Ihrer Befragten an (zum Beispiel nach ISCED).', 'Note: the levels are only a suggestion. Education systems differ between countries; adapt the answers to the country of your respondents (for example following ISCED).');
  if (id === 'zustimmung5' || id === 'zufriedenheit5' || id === 'haeufigkeit5') return L('Hinweis: Der Fragetext ist ein Platzhalter. Tragen Sie Ihre Aussage ein.', 'Note: the question text is a placeholder. Enter your own statement.');
  if (id === 'einwilligung') return L('Hinweis: Eine Einwilligung braucht den Wortlaut Ihrer Studie und Ihrer Ethikkommission. Der Satz ist nur ein Beispiel.', 'Note: consent needs the wording of your study and your ethics committee. The sentence is only an example.');
  return '';
}

const mitFehlend = (plan: FragebogenPlan, d: Definition, an: boolean): Option[] => {
  const lauf = (d.stufen ?? []).map(([wert, de, en]): Option => ({ id: '', wert, text: lokAusPaar(plan, de, en) }));
  if (an) for (const f of d.fehlend ?? []) lauf.push({ id: '', wert: FEHLEND_CODE[f], text: lokAusPaar(plan, FEHLEND_TEXT[f].de!, FEHLEND_TEXT[f].en!), fehlend: f });
  return lauf;
};

export interface VorlageErgebnis { plan: FragebogenPlan; id: string; hinweis: string; listeWiederverwendet: boolean }
/**
 * Fügt eine Vorlage ein. Wohin: wie bei `hinzufuegen` (hinter die gewählte Seite oder das gewählte Element; ohne Seite entsteht eine).
 * `block` setzt eine Vorlage mit Stufen als Block mit drei Aussagen ein; `fehlend` hängt „weiß nicht“ und „keine Angabe“ als Fehlend-Optionen an.
 * Eine Liste gleichen Namens im Plan wird wiederverwendet (nicht doppelt angelegt).
 */
export function vorlageEinfuegen(plan: FragebogenPlan, vorlage: VorlageId, auswahl: string | null, optionen: { block?: boolean; fehlend?: boolean } = {}): VorlageErgebnis {
  const d = vorlageDefinition(vorlage);
  const p = structuredClone(plan);
  const f = auswahl ? finde(p, auswahl) : null;
  let seite = f ? p.elemente[f.seiteIndex]! : p.elemente.at(-1);
  if (!seite) { seite = { art: 'seite', id: neueId(), name: namensVorschlag('seite', vergebeneNamen(p)), elemente: [] }; p.elemente.push(seite); }
  let listeId: string | undefined, wieder = false;
  if (d.liste) {
    const vorhanden = p.antwortlisten.find(l => l.name === d.liste);
    if (vorhanden) { listeId = vorhanden.id; wieder = true; }
    else {
      const id = neueId();
      const l: Antwortliste = { id, name: d.liste, geordnet: !!d.geordnet, optionen: mitFehlend(p, d, optionen.fehlend ?? true) };
      l.optionen.forEach((o, i) => { o.id = `${id}:o${i + 1}`; });
      p.antwortlisten.push(l); listeId = id;
    }
  }
  const text: Lok = lokAusPaar(p, d.frage[0], d.frage[1]);
  const name = namensVorschlag(d.name, vergebeneNamen(p));
  const id = neueId();
  let el: Frage | Block;
  if (optionen.block && d.block && listeId) {
    const items = [1, 2, 3].map(i => ({ id: neueId(), name: `i${i}`, text: lokAusPaar(p, `Aussage ${i} (hier eintragen)`, `Statement ${i} (enter here)`) }));
    el = { art: 'block', id, name, text: lokAusPaar(p, 'Bitte geben Sie zu jeder Aussage Ihre Antwort an.', 'Please give your answer for each statement.'), liste: listeId, items, kodebuch: { niveau: d.niveau === 'skala' ? 'skala' : 'ordinal' } };
  } else {
    const fr: Frage = { art: 'frage', id, name, typ: d.typ, text, kodebuch: { niveau: d.niveau } };
    if (d.hilfe) fr.hilfe = lokAusPaar(p, d.hilfe[0], d.hilfe[1]);
    if (listeId) fr.liste = listeId;
    if (d.typ === 'zahl') fr.zahl = { min: 0, max: 120, ganz: true, einheit: lokAusPaar(p, 'Jahre', 'years') };
    if (d.typ === 'einwilligung') fr.pflicht = { an: true };
    if (d.id === 'geschlecht') fr.anders = { an: true, text: lokAusPaar(p, 'Anderes, und zwar:', 'Other, namely:') };
    el = fr;
  }
  seite.elemente.splice(f?.element ? f.index + 1 : seite.elemente.length, 0, el);
  return { plan: p, id, hinweis: vorlageHinweis(vorlage), listeWiederverwendet: wieder };
}
