/**
 * Erzeugt die Prüfdateien der Dienste (Paket 1A/1B/1C) reproduzierbar. Aufruf aus dem Ordner `app`:
 *   node src/lib/testdaten/dienste/erzeugen.mjs
 * Alle Antworten sind ERFUNDEN. Die Form der Dateien folgt docs/erheben/KOPFZEILEN-DIENSTE.md (siehe LIESMICH.md).
 * XLSX schreibt exceljs (feste Zeitstempel, damit der Inhalt bei jedem Lauf gleich ist).
 */
import ExcelJS from 'exceljs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const hier = dirname(fileURLToPath(import.meta.url));
const pfad = (...p) => join(hier, ...p);
const dir = (d) => mkdirSync(pfad(d), { recursive: true });

/** CSV-Feld nach den Regeln von CryptPad (escapeCSV): Anführungszeichen bei " , Zeilenumbruch ; ; innere " verdoppelt. */
const feldCryptpad = (v) => (/["\n;,]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v);
/** Allgemeines CSV-Feld: Anführungszeichen, wenn Trenner, " oder Zeilenumbruch darin steht. */
const feld = (v, trenner) => (v === null || v === undefined ? '' : (String(v).includes(trenner) || /["\n\r]/.test(String(v)) ? `"${String(v).replaceAll('"', '""')}"` : String(v)));
const csvText = (zeilen, trenner = ',', f = (v) => feld(v, trenner)) => zeilen.map((z) => z.map(f).join(trenner)).join('\n') + '\n';
const schreibe = (datei, inhalt) => writeFileSync(pfad(datei), inhalt);
const mitBom = (text) => Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(text, 'utf8')]);

async function xlsx(datei, blaetter) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Statable Prüfdatei'; wb.created = new Date(0); wb.modified = new Date(0);
  for (const [name, zeilen] of Object.entries(blaetter)) {
    const ws = wb.addWorksheet(name);
    for (const z of zeilen) ws.addRow(z.map((v) => (v === undefined ? null : v)));
  }
  await wb.xlsx.writeFile(pfad(datei));
}

/* ------------------------------------------------------------------ Google Forms (en, CSV) */
dir('googleforms');
{
  const kopf = ['Timestamp', 'Which meals do you usually eat?', 'Which drinks do you like?', 'How may we contact you?', 'Rate the canteen [Food]', 'Rate the canteen [Service]', 'Any comments?'];
  const zeilen = [
    ['8/6/2023 9:34:20', 'Breakfast, Lunch', 'Tea, Coffee', 'Mail, Phone', 'Good', 'Fair', 'Fine, thanks'],
    ['8/6/2023 10:02:11', 'Lunch, Dinner', 'Tea, Water', 'Yes, any way', 'Fair', 'Fair', ''],
    ['8/6/2023 12:15:40', 'Breakfast, Dinner', 'Coffee, Water', 'Mail, Yes, any way', 'Poor', 'Good', 'Too loud, too crowded'],
    ['8/7/2023 8:41:05', 'Breakfast, Lunch, Late snack', 'Tea, Soda, Cola', 'Phone', 'Good', 'Good', ''],
    ['8/7/2023 11:02:49', 'Lunch', 'Water', 'Phone', 'Good', 'Poor', 'Nothing'],
    ['8/7/2023 11:02:49', 'Lunch', 'Water', 'Phone', 'Good', 'Poor', 'Nothing']   // doppelte Antwort: in allen Spalten gleich
  ];
  schreibe('googleforms/googleforms-en.csv', csvText([kopf, ...zeilen]));
}

/* ------------------------------------------------------------------ Microsoft Forms (en, XLSX) */
dir('msforms');
{
  const t = (h, m, s) => new Date(Date.UTC(2026, 9, 1, h, m, s));   // UTC, als Excel-Datumswert
  const kopf = ['ID', 'Start time', 'Completion time', 'Email', 'Name', 'Which meals do you usually eat?', 'How satisfied are you?', 'Any comments?'];
  const zeilen = [
    [1, t(8, 0, 10), t(8, 3, 50), 'anna@example.org', 'Anna Beispiel', 'Breakfast;Lunch;', 'Satisfied', 'Great; but noisy'],
    [2, t(8, 30, 0), t(8, 33, 12), 'ben@example.org', 'Ben Muster', 'Lunch;Dinner;', 'Neutral', 'Fine'],
    [3, t(9, 10, 5), t(9, 12, 44), 'carla@example.org', 'Carla Probe', 'Breakfast;Dinner;', 'Satisfied', undefined],
    [2, t(8, 30, 0), t(8, 33, 12), 'ben@example.org', 'Ben Muster', 'Lunch;Dinner;', 'Neutral', 'Fine'],   // wiederholter Export: gleiche ID
    [4, t(10, 0, 0), t(10, 2, 30), 'dora@example.org', 'Dora Test', 'Lunch;', 'Dissatisfied', undefined],
    [5, t(10, 20, 0), t(10, 22, 10), 'emil@example.org', 'Emil Probe', undefined, 'Neutral', undefined]
  ];
  await xlsx('msforms/msforms-en.xlsx', { Sheet1: [kopf, ...zeilen] });   // Blattname unbekannt (KOPFZEILEN-DIENSTE 2.1): hier „Sheet1“
}

/* ------------------------------------------------------------------ Nextcloud Forms (CSV mit BOM, en und de) */
dir('nextcloud');
{
  const kopfEn = ['Submission ID', 'User ID', 'User display name', 'Timestamp', 'Which meals do you usually eat?', 'Rate the canteen (Food)', 'Rate the canteen (Service)', 'Any comments?'];
  const en = [
    [1, 'anna', 'Anna Beispiel', '2026-11-08T10:15:30+01:00', 'Breakfast; Lunch', 'Good', 'Fair', 'Nice, but loud'],
    [2, '', 'Anonymous user', '2026-11-08T11:02:00+01:00', 'Lunch; Dinner', 'Fair', 'Fair', ''],
    [3, 'ben', 'Ben Muster', '2026-11-08T12:30:45+01:00', 'Breakfast; Dinner; system-other-answer:Late snack', 'Poor', 'Good', 'Fine'],
    [4, '', 'Anonymous user', '2026-11-08T13:05:10+01:00', 'Breakfast; Lunch; system-other-answer:Soda; Cola', 'Good', 'Good', ''],
    [5, 'carla', 'Carla Probe', '2026-11-08T14:00:00+01:00', 'system-other-answer:Pizza', 'Good', 'Poor', '']
  ];
  schreibe('nextcloud/nextcloud-en.csv', mitBom(csvText([kopfEn, ...en])));
  const kopfDe = ['Einreichungs-ID', 'Benutzer-ID', 'Anzeigename des Nutzers', 'Zeitstempel', 'Welche Mahlzeiten essen Sie meistens?', 'Mensa bewerten (Essen)', 'Mensa bewerten (Service)', 'Anmerkungen'];
  const de = [
    [1, 'anna', 'Anna Beispiel', '2026-11-08T10:15:30+01:00', 'Frühstück; Mittagessen', 'Gut', 'Mittel', 'Schön, aber laut'],
    [2, '', 'Anonymer Benutzer', '2026-11-08T11:02:00+01:00', 'Mittagessen; Abendessen', 'Mittel', 'Mittel', ''],
    [3, 'ben', 'Ben Muster', '2026-11-08T12:30:45+01:00', 'Frühstück; Abendessen', 'Schlecht', 'Gut', 'In Ordnung'],
    [4, '', 'Anonymer Benutzer', '2026-11-08T13:05:10+01:00', 'Frühstück; Mittagessen; Abendessen', 'Gut', 'Gut', '']
  ];
  schreibe('nextcloud/nextcloud-de.csv', mitBom(csvText([kopfDe, ...de])));
}

/* ------------------------------------------------------------------ CryptPad (CSV und JSON, en und de) */
dir('cryptpad');
{
  const csv = (zeilen) => zeilen.map((z) => z.map(feldCryptpad).join(',')).join('\n') + '\n';
  const en = [
    ['Time', 'Participant', 'How satisfied are you?', 'Rate | Food', 'Rate | Service', 'Preferred date', 'Any comments?'],
    ['2026-11-08T09:15:30.000Z', 'Guest', 'Satisfied', 'Good', 'Fair', '2026-12-01T00:00:00.000Z', 'Nice, but "loud"'],
    ['2026-11-08T09:40:02.000Z', 'Dora', 'Neutral', 'Fair', 'Fair', '2026-12-02T00:00:00.000Z', ''],
    ['2026-11-08T10:05:44.000Z', 'Guest', 'Satisfied', 'Poor', 'Good', '2026-12-01T00:00:00.000Z', 'Fine; thanks'],
    ['2026-11-08T10:30:00.000Z', 'Guest', 'Very satisfied', 'Good', 'Good', '', 'Nothing']
  ];
  schreibe('cryptpad/cryptpad-en.csv', csv(en));
  const de = [
    ['Zeit', 'Teilnehmer', 'Wie zufrieden sind Sie?', 'Bewertung | Essen', 'Bewertung | Service', 'Wunschtermin', 'Anmerkungen'],
    ['2026-11-08T09:15:30.000Z', 'Gast', 'Zufrieden', 'Gut', 'Mittel', '2026-12-01T00:00:00.000Z', 'Schön, aber "laut"'],
    ['2026-11-08T09:40:02.000Z', 'Gast', 'Neutral', 'Mittel', 'Mittel', '2026-12-02T00:00:00.000Z', ''],
    ['2026-11-08T10:05:44.000Z', 'Gast', 'Zufrieden', 'Schlecht', 'Gut', '2026-12-01T00:00:00.000Z', 'In Ordnung; danke']
  ];
  schreibe('cryptpad/cryptpad-de.csv', csv(de));
  // JSON: nur die belegten Schlüssel (`questions`, `responses`, `_time`, `_name`, `q1`, `q2`). Der Inhalt der Frageobjekte ist NICHT belegt: `{ "q": Fragetext }` ist erfunden.
  const json = (fragen, antworten) => JSON.stringify({ questions: Object.fromEntries(fragen.map((f, i) => [`q${i + 1}`, { q: f }])), responses: antworten }, null, 2) + '\n';
  schreibe('cryptpad/cryptpad-en.json', json(['How satisfied are you?', 'Any comments?'], [
    { _time: '2026-11-08T09:15:30.000Z', _name: 'Guest', q1: 'Satisfied', q2: 'Nice, but loud' },
    { _time: '2026-11-08T09:40:02.000Z', _name: 'Dora', q1: 'Neutral', q2: '' },
    { _time: '2026-11-08T10:05:44.000Z', _name: 'Guest', q1: 'Satisfied', q2: 'Fine' }
  ]));
  schreibe('cryptpad/cryptpad-de.json', json(['Wie zufrieden sind Sie?', 'Anmerkungen'], [
    { _time: '2026-11-08T09:15:30.000Z', _name: 'Gast', q1: 'Zufrieden', q2: 'Schön, aber laut' },
    { _time: '2026-11-08T09:40:02.000Z', _name: 'Gast', q1: 'Neutral', q2: '' },
    { _time: '2026-11-08T10:05:44.000Z', _name: 'Gast', q1: 'Zufrieden', q2: 'In Ordnung' }
  ]));
}

/* ------------------------------------------------------------------ XLSForm (gemeinsame Grundlage für Kobo und Plan) */
dir('xlsform');
{
  const DE = 'Deutsch (de)', EN = 'English (en)';
  const surveyKopf = ['type', 'name', `label::${DE}`, `label::${EN}`, `hint::${DE}`, `hint::${EN}`, 'required', 'relevant', 'parameters'];
  const q = (type, name, de, en, extra = {}) => [type, name, de, en, extra.hintDe ?? '', extra.hintEn ?? '', extra.required ?? '', extra.relevant ?? '', extra.parameters ?? ''];
  const survey = [
    surveyKopf,
    q('begin_group', 'besuch', 'Ihr Besuch', 'Your visit'),
    q('select_multiple mahlzeit', 'mahlzeiten', 'Welche Mahlzeiten essen Sie meistens?', 'Which meals do you usually eat?', { required: 'yes' }),
    q('select_one zufrieden', 'zufrieden', 'Wie zufrieden sind Sie mit dem Essen?', 'How satisfied are you with the food?'),
    q('select_one verkehr or_other', 'verkehr', 'Wie kommen Sie zur Mensa?', 'How do you get to the canteen?'),
    q('end_group', '', '', ''),
    q('integer', 'alter', 'Wie alt sind Sie?', 'How old are you?', { hintDe: 'Bitte in Jahren', hintEn: 'Please give years', required: 'yes' }),
    q('decimal', 'entfernung', 'Wie weit ist Ihr Weg in Kilometern?', 'How far is your way in kilometres?'),
    q('text', 'kommentar', 'Was sollen wir verbessern?', 'What should we improve?', { relevant: '${zufrieden} <= 2' }),
    q('date', 'termin', 'An welchem Tag kommen Sie am liebsten?', 'Which day do you prefer?'),
    q('range', 'schmeckt', 'Wie gut schmeckt es (0 bis 10)?', 'How tasty is it (0 to 10)?', { parameters: 'start=0 end=10 step=1' }),
    q('rank prioritaet', 'prio', 'Was ist Ihnen wichtig? Bitte ordnen Sie.', 'What matters to you? Please rank.'),
    q('acknowledge', 'einv', 'Ich stimme der Auswertung zu.', 'I agree to the analysis.'),
    q('note', 'danke', 'Danke für Ihre Teilnahme.', 'Thank you for taking part.')
  ];
  const choices = [
    ['list_name', 'name', `label::${DE}`, `label::${EN}`],
    ['mahlzeit', 'fruehstueck', 'Frühstück', 'Breakfast'], ['mahlzeit', 'mittagessen', 'Mittagessen', 'Lunch'], ['mahlzeit', 'abendessen', 'Abendessen', 'Dinner'],
    // Namen ganze Zahlen, absichtlich absteigend: sie gelten als Codes, die Reihenfolge der Liste ändert sie nicht
    ['zufrieden', 5, 'Sehr zufrieden', 'Very satisfied'], ['zufrieden', 4, 'Zufrieden', 'Satisfied'], ['zufrieden', 3, 'Teils, teils', 'Neither'], ['zufrieden', 2, 'Unzufrieden', 'Dissatisfied'], ['zufrieden', 1, 'Sehr unzufrieden', 'Very dissatisfied'],
    ['verkehr', 'bus', 'Bus', 'Bus'], ['verkehr', 'bahn', 'Bahn', 'Train'], ['verkehr', 'rad', 'Fahrrad', 'Bicycle'],
    ['prioritaet', 'preis', 'Preis', 'Price'], ['prioritaet', 'geschmack', 'Geschmack', 'Taste'], ['prioritaet', 'naehe', 'Nähe', 'Proximity']
  ];
  const settings = [['form_title', 'form_id', 'default_language', 'version'], ['Mensa-Umfrage', 'mensa', DE, '2026110801']];
  await xlsx('xlsform/mensa.xlsx', { survey, choices, settings });

  // Grenzfälle: `label` ohne Sprache neben `label::English (en)`, Liste mit gemischten Namen (3, 1, andere), fehlende Übersetzung, choice_filter
  const gKopf = ['type', 'name', 'label', 'label::English (en)', 'choice_filter'];
  await xlsx('xlsform/mensa-grenzfaelle.xlsx', {
    survey: [
      gKopf,
      ['select_one ort', 'stadtteil', 'Welcher Stadtteil?', 'Which district?', ''],
      ['select_one strasse', 'strasse', 'Welche Straße?', '', 'stadtteil=${stadtteil}'],   // englischer Fragetext fehlt
      ['text', 'anmerkung', 'Anmerkung', 'Remark', '']
    ],
    choices: [
      ['list_name', 'name', 'label', 'label::English (en)', 'stadtteil'],
      ['ort', 3, 'Nord', 'North', ''], ['ort', 1, 'Süd', 'South', ''], ['ort', 'andere', 'Andere', 'Other', ''],
      ['strasse', 'hauptstr', 'Hauptstraße', 'Main Street', 1], ['strasse', 'nordweg', 'Nordweg', '', 3]   // englische Beschriftung der Option fehlt
    ]
  });

  // Nicht unterstützte Typen: geopoint, image, calculate, begin_repeat (gültig in XLSForm, Statable überspringt sie und meldet es)
  const EN1 = 'label::English (en)';
  await xlsx('xlsform/mensa-geopoint.xlsx', {
    survey: [
      ['type', 'name', EN1, 'calculation'],
      ['text', 'titel', 'Name of the canteen', ''],
      ['geopoint', 'standort', 'Where are you?', ''],
      ['image', 'foto', 'Photo of the meal', ''],
      ['calculate', 'doppelt', '', '2 * 3'],
      ['begin_repeat', 'kinder', 'Children', ''],
      ['text', 'kindname', 'Name of the child', ''],
      ['end_repeat', '', '', ''],
      ['select_one ja_nein', 'wiederkommen', 'Will you come back?', '']
    ],
    choices: [['list_name', 'name', EN1], ['ja_nein', 'ja', 'Yes'], ['ja_nein', 'nein', 'No']]
  });
}

/* ------------------------------------------------------------------ KoboToolbox */
dir('kobo');
{
  const metaKopf = ['__version__', 'meta/instanceID', '_id', '_uuid', '_submission_time', '_validation_status', '_notes', '_status', '_submitted_by', '_tags', '_index'];
  const metaZeile = (i, zeit, pruef, wer) => ['vTEST1', `uuid:00000000-0000-4000-8000-00000000000${i}`, 1000 + i, `00000000-0000-4000-8000-00000000000${i}`, zeit, pruef, '', 'submitted_via_web', wer, '', i];
  // 1. XML values and headers, Gruppen mit `/`, „Single and separate columns“: eine Spalte mit Leerzeichen UND je Option eine Spalte mit 1/0 (Excel)
  const kopf = ['start', 'end', 'besuch/mahlzeiten', 'besuch/mahlzeiten/fruehstueck', 'besuch/mahlzeiten/mittagessen', 'besuch/mahlzeiten/abendessen', 'besuch/zufrieden', 'besuch/verkehr', 'besuch/verkehr_other', 'alter', 'entfernung', 'kommentar', 'termin', 'schmeckt', ...metaKopf, 'zusatz_unbekannt'];
  const s = (m) => `2026-10-20T08:${m}:02.123+02:00`;
  const zeilen = [
    [s('10'), s('12'), 'fruehstueck mittagessen', 1, 1, 0, 5, 'bus', undefined, 34, 2.5, 'Alles gut', new Date(Date.UTC(2026, 10, 2)), 8, ...metaZeile(1, '2026-10-20T06:15:30', 'Approved', 'kobo_anna'), 'x'],
    [s('20'), s('23'), 'mittagessen', 0, 1, 0, 3, 'other', 'Roller', 51, 12, undefined, new Date(Date.UTC(2026, 10, 3)), 5, ...metaZeile(2, '2026-10-20T06:26:00', '', ''), 'x'],
    [s('30'), s('31'), undefined, 0, 0, 0, 1, 'rad', undefined, 22, 0.8, 'Zu teuer', undefined, 2, ...metaZeile(3, '2026-10-20T06:31:10+00:00', 'On Hold', ''), 'x'],
    [s('40'), s('44'), 'fruehstueck mittagessen abendessen', 1, 1, 1, 2, 'bahn', undefined, 45, 7.25, undefined, new Date(Date.UTC(2026, 10, 2)), 9, ...metaZeile(4, '2026-10-20T06:44:50+00:00', 'Not Approved', ''), 'x']
  ];
  await xlsx('kobo/kobo-xml-eins-null.xlsx', { Sheet1: [kopf, ...zeilen] });   // Blattname unbekannt

  // 2. XML values and headers, nur getrennte Spalten („Separate columns“), True/False, CSV mit Semikolon (so berichtet in der Kobo-Community)
  const kopf2 = ['start', 'end', 'besuch/mahlzeiten/fruehstueck', 'besuch/mahlzeiten/mittagessen', 'besuch/mahlzeiten/abendessen', 'besuch/zufrieden', 'besuch/verkehr', 'alter', '_id', '_uuid', '_submission_time', '_validation_status', '_index'];
  const z2 = (i, f, m, a, zu, v, alter) => [`2026-10-21T09:0${i}:00.000+02:00`, `2026-10-21T09:0${i + 1}:30.000+02:00`, f, m, a, zu, v, alter, 2000 + i, `00000000-0000-4000-8000-0000000001${i}0`, `2026-10-21T07:0${i + 1}:30`, 'Approved', i];
  schreibe('kobo/kobo-xml-true-false.csv', csvText([kopf2, z2(1, 'True', 'True', 'False', 4, 'bus', 29), z2(3, 'False', 'True', 'False', 3, 'rad', 41), z2(5, 'False', 'False', 'False', 2, 'bahn', 56)], ';'));
}

/* ------------------------------------------------------------------ Moodle Questionnaire */
dir('moodlequestionnaire');
{
  const kopf = ['Response', 'Submitted on:', 'Institution', 'Department', 'Course', 'Group', 'User id', 'User idnumber', 'Full name', 'Username', 'Q01_zufriedenheit', 'Q02_mahlzeiten->fruehstueck', 'Q02_mahlzeiten->mittagessen', 'Q03_kommentar'];
  schreibe('moodlequestionnaire/moodlequestionnaire.csv', csvText([kopf,
    [1, '08/11/2026 10:15:30', 'Universität Beispiel', 'Soziologie', 'Statistik 1', 'A', 17, 's123', 'Anna Beispiel', 'abeispiel', 1, 1, 0, 'Gut'],
    [2, '08/11/2026 10:40:02', 'Universität Beispiel', 'Soziologie', 'Statistik 1', 'B', 18, 's124', 'Ben Muster', 'bmuster', 3, 0, 1, ''],
    [3, '09/11/2026 08:05:44', 'Universität Beispiel', 'Soziologie', 'Statistik 1', 'A', 19, 's125', 'Carla Probe', 'cprobe', 2, 1, 1, 'Zu laut']
  ]));
  // anonym: ID und Username leer, Name = „Anonymous“ + laufende Nummer; die übrigen Profilfelder leer gelassen (Verhalten dort nicht belegt)
  schreibe('moodlequestionnaire/moodlequestionnaire-anonym.csv', csvText([kopf,
    [1, '08/11/2026 10:15:30', '', '', 'Statistik 1', '', '', '', 'Anonymous1', '', 1, 1, 0, 'Gut'],
    [2, '08/11/2026 10:40:02', '', '', 'Statistik 1', '', '', '', 'Anonymous2', '', 3, 0, 1, ''],
    [3, '09/11/2026 08:05:44', '', '', 'Statistik 1', '', '', '', 'Anonymous3', '', 2, 1, 1, 'Zu laut']
  ]));
}
console.log('Prüfdateien geschrieben in', hier);
