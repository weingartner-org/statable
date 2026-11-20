/**
 * Beispielplan für die Tests der Ausfüllseite (Stufe 3C): alle Fragetypen, zwei Sprachen, Einwilligung, Code, ein Filter, ein Fragetext mit `</script>` zum Prüfen des Escapens.
 * Kein Test und kein Teil der App.
 */
import type { Antwortliste, Frage, FragebogenPlan, Lok, Seite } from '../lib/fragebogenplan';

const zw = (de: string, en: string): Lok => ({ de, en });
const liste = (id: string, geordnet: boolean, werte: [string, string][]): Antwortliste =>
  ({ id, name: id, geordnet, optionen: werte.map(([de, en], i) => ({ id: `${id}:${i + 1}`, wert: i + 1, text: zw(de, en) })) });
const frage = (id: string, typ: Frage['typ'], de: string, en: string, extra: Partial<Frage> = {}): Frage =>
  ({ art: 'frage', id, name: id, typ, text: zw(de, en), kodebuch: { niveau: 'nominal' }, ...extra });

export const GEFAEHRLICH = '</script><img src=x onerror=alert(1)>';

export function testplan(empfaenger: string, extra: Record<string, unknown> = {}): FragebogenPlan & { codeVerlangt?: boolean } {
  const seiten: Seite[] = [
    { art: 'seite', id: 'auswahl', name: 'auswahl', titel: zw('Auswahl', 'Choices'), elemente: [
      frage('F1', 'einfach', `Welche Farbe mögen Sie? ${GEFAEHRLICH}`, 'Which colour do you like?', { liste: 'farben', hilfe: zw('Bitte genau eine Antwort wählen.', 'Please choose exactly one answer.'), pflicht: { an: true }, anders: { an: true, text: zw('Eine andere Farbe, und zwar:', 'Another colour, namely:') } }),
      frage('F2', 'mehrfach', 'Welche Medien nutzen Sie?', 'Which media do you use?', { liste: 'medien' }),
    ] },
    { art: 'seite', id: 'felder', name: 'felder', titel: zw('Zahlen, Text und Regler', 'Numbers, text and sliders'), elemente: [
      frage('Z', 'zahl', 'Wie alt sind Sie?', 'How old are you?', { zahl: { min: 0, max: 120, ganz: true, einheit: zw('Jahre', 'years') }, pflicht: { an: true }, kodebuch: { niveau: 'skala' } }),
      frage('T', 'text', 'Welchen Beruf üben Sie aus?', 'What is your occupation?', { text_: { mehrzeilig: false, maxZeichen: 60 } }),
      frage('D', 'datum', 'Wann sind Sie geboren?', 'When were you born?'),
      frage('R', 'regler', 'Wie zufrieden sind Sie insgesamt?', 'How satisfied are you overall?', { zahl: { min: 1, max: 7, schritt: 1, ganz: true }, hilfe: zw('1 = gar nicht, 7 = sehr', '1 = not at all, 7 = very') }),
    ] },
    { art: 'seite', id: 'rang', name: 'rang', titel: zw('Reihenfolge', 'Ranking'), elemente: [
      frage('RG', 'rangfolge', 'Was ist Ihnen wichtig?', 'What matters to you?', { liste: 'prio', hilfe: zw('Ordnen Sie von wichtig nach unwichtig.', 'Order from most to least important.'), kodebuch: { niveau: 'ordinal' } }),
    ] },
    { art: 'seite', id: 'block', name: 'block', titel: zw('Aussagen', 'Statements'), elemente: [
      { art: 'block', id: 'B', name: 'B', text: zw('Wie sehr stimmen Sie zu?', 'How much do you agree?'), hilfe: zw('Eine Antwort je Zeile.', 'One answer per row.'), liste: 'stufen', pflicht: { an: true }, kodebuch: { niveau: 'ordinal' },
        items: [
          { id: 'B1', name: 'b1', text: zw('Ich fühle mich gut informiert.', 'I feel well informed.') },
          { id: 'B2', name: 'b2', text: zw('Ich vertraue den Behörden.', 'I trust the authorities.') },
          { id: 'B3', name: 'b3', text: zw('Die Umfrage war verständlich.', 'The survey was easy to understand.') },
        ] },
    ] },
    { art: 'seite', id: 'zusatz', name: 'zusatz', titel: zw('Nur bei Rot', 'Only for red'), wennGezeigt: { frage: 'F1', ist: '=', wert: 1 }, elemente: [
      frage('X', 'text', 'Warum Rot?', 'Why red?', { text_: { mehrzeilig: false } }),
    ] },
  ];
  return {
    format: 'statable-fragebogen', version: 1, id: 'testplan-3c', revision: 2, titel: zw('Beispielumfrage', 'Sample survey'), sprachen: ['de', 'en'],
    einleitung: zw('Diese Umfrage dauert etwa fünf Minuten.', 'This survey takes about five minutes.'),
    einwilligung: { text: zw('Ich willige in die Verarbeitung meiner Antworten ein.', 'I consent to the processing of my answers.'), pflicht: true },
    abschluss: zw('Bitte schicken Sie die Antwort an forschung@example.org', 'Please send the answer to forschung@example.org'),
    einstellungen: { fortschritt: true, zurueck: true, pretest: false, fehlendFilter: 'code' },
    antwortlisten: [
      liste('farben', false, [['Rot', 'Red'], ['Grün', 'Green'], ['Blau', 'Blue']]),
      liste('medien', false, [['Zeitung', 'Newspaper'], ['Radio', 'Radio'], ['Internet', 'Internet']]),
      liste('stufen', true, [['stimme gar nicht zu', 'strongly disagree'], ['stimme eher nicht zu', 'disagree'], ['teils, teils', 'neither'], ['stimme eher zu', 'agree'], ['stimme voll zu', 'strongly agree']]),
      liste('prio', false, [['Familie', 'Family'], ['Arbeit', 'Work'], ['Freizeit', 'Leisure'], ['Gesundheit', 'Health'], ['Geld', 'Money']]),
    ],
    skalen: [], elemente: seiten, empfaenger: { schluessel: empfaenger, name: 'Dr. Muster' }, geaendert: 1, codeVerlangt: true, ...extra,
  } as FragebogenPlan & { codeVerlangt?: boolean };
}

/** Die Antworten, die der Test eintippt, und das, was beim Entschlüsseln herauskommen muss (Rot, Zusatzseite). */
export const ERWARTET = { F1: 1, F2: [2, 3], Z: 42, T: 'Grüße </script> & <b>fett</b>', D: '1990-05-17', R: 5, RG: [2, 1, 3, 4, 5], B1: 4, B2: 2, B3: 5, X: 'weil Rot schön ist' };
