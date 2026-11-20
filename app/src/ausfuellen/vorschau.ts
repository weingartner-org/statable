/**
 * Skript der Vorschauseite (vorschau.html): Beispielplan mit allen Fragetypen, zwei Sprachen, Filter, Block und Pflicht.
 * Mit `#alle` in der Adresse stehen alle Seiten untereinander (für axe); sonst geht es mit „Weiter“ und „Zurück“ seitenweise.
 */
import { zeichneSeite, fokussiereSeitentitel, texte, type Optionen } from './index';
import type { FragebogenPlan, Lok, Seite, Frage, Antwortliste } from '../lib/fragebogenplan';
import { zeigen, type Antworten } from '../lib/fragebogenplan-bedingung';

const zw = (de: string, en: string): Lok => ({ de, en });
const liste = (id: string, geordnet: boolean, werte: [string, string, object?][]): Antwortliste =>
  ({ id, name: id, geordnet, optionen: werte.map(([de, en, extra], i) => ({ id: `${id}:${i + 1}`, wert: i + 1, text: zw(de, en), ...(extra ?? {}) })) });
const frage = (id: string, typ: Frage['typ'], de: string, en: string, extra: Partial<Frage> = {}): Frage =>
  ({ art: 'frage', id, name: id, typ, text: zw(de, en), kodebuch: { niveau: 'nominal' }, ...extra });

const plan: FragebogenPlan = {
  format: 'statable-fragebogen', version: 1, id: 'vorschau', revision: 1, titel: zw('Beispielumfrage', 'Sample survey'), sprachen: ['de', 'en'],
  einstellungen: { fortschritt: true, zurueck: true, pretest: false, fehlendFilter: 'code' },
  antwortlisten: [
    liste('farben', false, [['Rot', 'Red'], ['Grün', 'Green'], ['Blau', 'Blue']]),
    liste('medien', false, [['Zeitung', 'Newspaper'], ['Radio', 'Radio'], ['Internet', 'Internet'], ['Nichts davon', 'None of these', { ausschliessend: true }]]),
    liste('stufen', true, [['stimme gar nicht zu', 'strongly disagree'], ['stimme eher nicht zu', 'disagree'], ['teils, teils', 'neither'], ['stimme eher zu', 'agree'], ['stimme voll zu', 'strongly agree']]),
    liste('prio', false, [['Familie', 'Family'], ['Arbeit', 'Work'], ['Freizeit', 'Leisure'], ['Gesundheit', 'Health'], ['Geld', 'Money']]),
  ],
  skalen: [],
  elemente: [
    { art: 'seite', id: 'auswahl', name: 'auswahl', titel: zw('Auswahl', 'Choices'), elemente: [
      frage('F1', 'einfach', 'Welche Farbe mögen Sie am liebsten?', 'Which colour do you like best?', { liste: 'farben', hilfe: zw('Bitte genau eine Antwort wählen.', 'Please choose exactly one answer.'), pflicht: { an: true }, anders: { an: true, text: zw('Eine andere Farbe, und zwar:', 'Another colour, namely:') } }),
      frage('F1b', 'einfach', 'Wie stark gefällt Ihnen diese Farbe?', 'How much do you like this colour?', { liste: 'stufen', kodebuch: { niveau: 'ordinal' }, wennGezeigt: { frage: 'F1', ist: '=', wert: 1 } }),
      frage('F2', 'mehrfach', 'Welche Medien nutzen Sie?', 'Which media do you use?', { liste: 'medien', zufall: true }),
    ] },
    { art: 'seite', id: 'felder', name: 'felder', titel: zw('Zahlen, Text und Regler', 'Numbers, text and sliders'), elemente: [
      frage('Z', 'zahl', 'Wie alt sind Sie?', 'How old are you?', { zahl: { min: 0, max: 120, ganz: true, einheit: zw('Jahre', 'years') }, hilfe: zw('In ganzen Jahren.', 'In whole years.'), pflicht: { an: true }, kodebuch: { niveau: 'skala' }, gueltig: { regel: { frage: 'Z', ist: '≥', wert: 16 }, meldung: zw('Mindestens 16 Jahre', 'At least 16 years') } }),
      frage('T', 'text', 'Welchen Beruf üben Sie aus?', 'What is your occupation?', { text_: { mehrzeilig: false, maxZeichen: 60 } }),
      frage('T2', 'text', 'Möchten Sie noch etwas anmerken?', 'Anything else you would like to add?', { text_: { mehrzeilig: true } }),
      frage('D', 'datum', 'Wann sind Sie geboren?', 'When were you born?'),
      frage('R', 'regler', 'Wie zufrieden sind Sie insgesamt?', 'How satisfied are you overall?', { zahl: { min: 1, max: 7, schritt: 1, ganz: true }, hilfe: zw('1 = gar nicht, 7 = sehr', '1 = not at all, 7 = very') }),
      frage('RL', 'regler', 'Wie sehr stimmen Sie zu?', 'How much do you agree?', { liste: 'stufen', zahl: { min: 1, max: 5, ganz: true } }),
    ] },
    { art: 'seite', id: 'rang', name: 'rang', titel: zw('Reihenfolge und Zustimmung', 'Ranking and consent'), elemente: [
      { art: 'hinweis', id: 'H1', name: 'H1', text: zw('Die Karte zeigt das Untersuchungsgebiet.', 'The map shows the study area.'), bild: { datei: 'karte.svg', alt: zw('Karte mit einem Kreis in einem Quadrat', 'Map with a circle inside a square') } },
      frage('RG', 'rangfolge', 'Was ist Ihnen wichtig?', 'What matters to you?', { liste: 'prio', hilfe: zw('Ordnen Sie von wichtig nach unwichtig.', 'Order from most to least important.'), pflicht: { an: true }, zufall: true, kodebuch: { niveau: 'ordinal' } }),
      frage('E', 'einwilligung', 'Ich habe die Information zur Studie gelesen.', 'I have read the study information.', { pflicht: { an: true } }),
    ] },
    { art: 'seite', id: 'block', name: 'block', titel: zw('Aussagen', 'Statements'), elemente: [
      { art: 'block', id: 'B', name: 'B', text: zw('Wie sehr stimmen Sie den folgenden Aussagen zu?', 'How much do you agree with the following statements?'), hilfe: zw('Eine Antwort je Zeile.', 'One answer per row.'), liste: 'stufen', pflicht: { an: true }, kodebuch: { niveau: 'ordinal' },
        items: [
          { id: 'B1', name: 'b1', text: zw('Ich fühle mich gut informiert.', 'I feel well informed.') },
          { id: 'B2', name: 'b2', text: zw('Ich vertraue den Behörden.', 'I trust the authorities.') },
          { id: 'B3', name: 'b3', text: zw('Die Umfrage war verständlich.', 'The survey was easy to understand.') },
        ] },
    ] },
    { art: 'seite', id: 'zusatz', name: 'zusatz', titel: zw('Nur bei Rot', 'Only for red'), wennGezeigt: { frage: 'F1', ist: '=', wert: 1 }, elemente: [
      frage('X', 'text', 'Warum Rot?', 'Why red?', { text_: { mehrzeilig: false } }),
    ] },
  ],
  geaendert: 1,
};

const svg = encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="100" viewBox="0 0 160 100"><rect x="4" y="4" width="152" height="92" fill="none" stroke="#1a1a1a" stroke-width="4"/><circle cx="80" cy="50" r="30" fill="#0a4fa8"/></svg>');
const bildUrl = (datei: string) => (datei === 'karte.svg' ? `data:image/svg+xml,${svg}` : datei);

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const bib = $('bibliothek');
let sprache = 'de';
let antworten: Antworten = {};
let aktuell = 0;
const alle = () => location.hash === '#alle';

const sichtbar = (s: Seite) => zeigen(s, antworten, plan);

async function zeichne(fokus: boolean) {
  plan.einstellungen.pretest = $<HTMLInputElement>('pretest').checked;
  document.documentElement.lang = sprache;
  $('titel').textContent = sprache === 'en' ? 'Preview of the question types' : 'Vorschau der Fragetypen';
  document.title = sprache === 'en' ? 'Statable - Question type preview' : 'Statable - Vorschau der Fragetypen';
  const opt = (): Optionen => ({
    sprache, eng: $<HTMLInputElement>('eng').checked, modus: 'vorschau', bildUrl, zufallStart: 4711,
    beiAenderung: an => { antworten = an; },
    beiWeiter: an => { antworten = an; void weiter(); },
    beiZurueck: () => { void zurueck(); },
  });
  bib.replaceChildren();
  if (alle()) {
    for (const s of plan.elemente) bib.append(zeichneSeite(plan, s, antworten, opt()));
    return;
  }
  const s = plan.elemente[aktuell]!;
  const w = zeichneSeite(plan, s, antworten, opt());
  bib.append(w);
  if (fokus) fokussiereSeitentitel(w);
}
async function weiter() {
  let n = aktuell + 1;
  while (n < plan.elemente.length && !(sichtbar(plan.elemente[n]!))) n++;
  if (n >= plan.elemente.length) {
    bib.replaceChildren();
    const e = document.createElement('div');
    e.id = 'ende'; e.tabIndex = -1;
    e.textContent = sprache === 'en' ? 'Thank you. Your answers: ' : 'Danke. Ihre Antworten: ';
    e.append(document.createElement('code')); e.lastChild!.textContent = JSON.stringify(antworten);
    bib.append(e); e.focus();
    return;
  }
  aktuell = n; await zeichne(true);
}
async function zurueck() {
  let n = aktuell - 1;
  while (n > 0 && !(sichtbar(plan.elemente[n]!))) n--;
  aktuell = Math.max(0, n); await zeichne(true);
}

document.querySelectorAll<HTMLButtonElement>('[data-sprache]').forEach(b => b.addEventListener('click', () => {
  sprache = b.dataset.sprache!;
  document.querySelectorAll<HTMLButtonElement>('[data-sprache]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  void zeichne(false);
}));
// Das Wörterbuch der Bibliothek ist hier nur zur Kontrolle sichtbar (window.texte)
(window as unknown as { texte: typeof texte }).texte = texte;
$('eng').addEventListener('change', () => void zeichne(false));
$('pretest').addEventListener('change', () => void zeichne(false));
window.addEventListener('hashchange', () => void zeichne(false));
$<HTMLInputElement>('eng').checked = window.matchMedia('(max-width: 600px)').matches;
void zeichne(false);
