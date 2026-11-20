import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import erwartet from './testdaten/spaeter-c-erwartet.json';
import { dekodiere, leseCsv, leseTabellenkalkulation, type Tabelle } from './einlesen';
import * as FB from './fragebogen';
import { erkenneFragebogen, erkennungSaetze, vorschlagSatz, type Erkennung } from './fragebogen';
import { s } from './sitzung.svelte';

/* ===== Paket 1B (Prüfer, ROTE TESTS vor dem Bau): Erkenner Microsoft Forms, Nextcloud Forms, CryptPad, Google Forms (nur „vermutlich“),
 * dazu Kobo und Moodle Questionnaire (Metaspalten, Paket 1C), Mehrfachauswahl in einer Zelle, doppelte Antworten, Raster als Itemblock.
 * Grundlage: docs/erheben/FACHBLATT-STUFE-1.md (Nachtrag nach 1A, Paket 1B), docs/erheben/KOPFZEILEN-DIENSTE.md.
 * Prüfdateien: testdaten/dienste/<dienst>/ (erfunden, nach Dokumentation erzeugt, LIESMICH.md dort; Erzeuger erzeugen.mjs).
 * Alles hier ist „nach Dokumentation bzw. Quellcode erkannt, nicht an echten Exporten geprüft“.
 *
 * ---------------------------------- Festlegungen für den Bauer (vom Prüfer; erweitern lib/fragebogen.ts oder lib/dienste/<dienst>.ts, Aufruf bleibt erkenneFragebogen(t, kb?)) ----------------------------------
 *  Hersteller (lib/kodebuch.ts) wird um 'msforms' | 'nextcloud' | 'cryptpad' | 'googleforms' | 'kobo' | 'moodlequestionnaire' (und, nur als Typ, 'odk' | 'moodlefeedback') erweitert.
 *  Erkennung.sicher: boolean       NEU, immer gesetzt. false NUR bei 'googleforms' („vermutlich“); true bei jedem anderen erkannten Hersteller (auch den alten); bei 'unbekannt' beliebig.
 *  Erkennung.zeitzone?: string     'UTC' bei msforms (Quelle: Q&A, „may be“) und cryptpad (ISO mit Z); bei googleforms, nextcloud, kobo, moodlequestionnaire NICHT gesetzt (Nextcloud: Verschiebung steht in jedem Wert).
 *  Erkennung.tabelle               wie bisher bereinigte Kopie; kopfzeilen = 1.
 *  Eingabe                         Tabelle aus leseCsv(dekodiere(bytes)) (dekodiere entfernt die BOM) bzw. leseTabellenkalkulation; CryptPad-JSON: cryptpadJsonTabelle(text) (unten).
 *  ErkSpalte                       wie bisher: rolle 'metadaten' für die Metaspalten des Dienstes (Liste je Datei in den Tests), zeit: true für Zeitspalten, personenbezug: true wenn der Vorschlag 'personenbezug' sie nennt.
 *  Vorschlag 'personenbezug'       nur Spalten mit mindestens einer nicht leeren Zelle. CryptPad: Participant/Teilnehmer/_name zählt nur, wenn mindestens eine Zelle NICHT „Guest“/„Gast“ ist.
 *                                  Moodle Questionnaire: Full name zählt nicht, wenn alle nicht leeren Zellen mit „Anonymous“ beginnen.
 *  NEU Vorschlag  { id: `mehrfachzelle:${spalte}`; art: 'mehrfachZelle'; spalte: string /* ErkSpalte.name *\/; trenner: string; optionen: string[]; anders: boolean; unklar: number[] /* 0-basierte Datenzeilen *\/ }
 *      Trenner je Dienst: googleforms ', ' | msforms ';' | nextcloud '; ' (cryptpad: keiner belegt → nie ein mehrfachZelle-Vorschlag). Verfahren GENAU wie Fachblatt Paket 1B, Schritte 1-5. Festlegungen zu dem, was das Fachblatt offen lässt:
 *      (a) Zellen werden an `trenner` geteilt und getrimmt, LEERE Teile fallen weg (Microsoft: „A;B;“ → A, B). Prüfung auf den Trenner bei Microsoft: die Zelle enthält ';'.
 *      (b) Schritt 1: Kandidat = mindestens 20 % (≥, also genau 20 % zählt) der NICHT leeren Zellen enthalten den Trenner.
 *      (c) Schritt 2: Ein Teil zählt je ZELLE einmal, auch eine Zelle ohne Trenner (sie besteht aus einem Teil). Option = Teil mit Zählung ≥ 2. Die Klausel „dazu ganze Zellen ohne Trenner, die zweimal vorkommen“ ist damit
 *          schon enthalten. Zähler über ALLE nicht leeren Zellen. Reihenfolge `optionen` = erstes Vorkommen, Zeile für Zeile, Teil für Teil.
 *      (d) Ein Vorschlag entsteht nur bei mindestens ZWEI Optionen (sonst ist es Freitext, z. B. Kommentar mit Komma).
 *      (e) Schritt 3: je Zelle bekannte Optionen längste zuerst als GANZE Segmente (zwischen Zellrand/Trenner) abziehen; was übrig bleibt (Segmente mit Trenner wieder verbunden) ist der Rest. Rest da → `anders: true`
 *          (anders = in mindestens einer Zeile bleibt ein Rest, unklare Zeilen eingeschlossen). Die Option „system-other-answer:“ (Nextcloud-Präfix) wird NICHT geprüft: der Rest enthält sie unverändert.
 *      (f) Schritt 4: unklar = Rest enthält den Trenner ODER eine bekannte Option kommt als Zeichenfolge im Rest vor (Teilzeichenfolge, Groß/klein unterscheiden).
 *      (g) Optionen, die selbst den Trenner enthalten („Water, still“ bei Google), kann Schritt 2 NICHT finden: sie zerfallen in Teile (siehe Test „SCHWÄCHE“).
 *  NEU Vorschlag  { id: 'doppelte'; art: 'doppelte'; gruppen: number[][] /* 0-basierte Datenzeilen, je Gruppe aufsteigend, Gruppen nach erster Zeile; nur Gruppen mit ≥ 2 Zeilen *\/; grund: 'kennung' | 'gleich' }
 *      msforms: Spalte `ID` vorhanden → gleiche ID = eine Gruppe, grund 'kennung' (auch wenn andere Zellen abweichen); ohne ID-Spalte: Zeilen, die in ALLEN Spalten gleich sind, grund 'gleich'. Nextcloud, CryptPad, Kobo, Moodle:
 *      nur 'gleich' (Nextcloud: Submission ID ist eindeutig, also nie gleich). Kein Vorschlag, wenn es keine Gruppe gibt. Nie automatisch löschen (Vorschlag mit Kästchen, Voreinstellung: die erste Zeile jeder Gruppe behalten).
 *  NEU Vorschlag  { id: `itemblock:${frage}`; art: 'itemblock'; frage: string; spalten: string[] /* ErkSpalte.name in Tabellenreihenfolge *\/; items: string[] }
 *      Raster: mindestens 2 Spalten mit demselben Fragetext vor dem Zeilentext. Google `Frage [Zeile]`, Nextcloud `Frage (Zeile)`, CryptPad `Frage | Zeile`. Microsoft/Kobo/Moodle: keiner.
 *  cryptpadJsonTabelle(text: string): { tabelle: Tabelle; fragetexte: Record<string, string> } | null      (Export aus lib/fragebogen.ts)
 *      null, wenn der Text kein JSON ist oder `questions`/`responses` fehlen. tabelle.kopf = ['_time', '_name', 'q1', 'q2', …] (Schlüssel wörtlich, in der Reihenfolge der `questions`), eine Zeile je Element von `responses`;
 *      fragetexte[qN] = questions[qN].q (nur wenn Text; der Inhalt der Frageobjekte ist NICHT belegt). erkenneFragebogen(tabelle) erkennt daran 'cryptpad' (Kopf `_time` und `_name`, Zelle 1 ISO mit Z).
 *  erkennungSaetze(e): erster Satz „Das sieht nach einer Datei von <Name> aus.“ mit Name 'Microsoft Forms' | 'Nextcloud Forms' | 'CryptPad' | 'Google Forms' | 'KoboToolbox' | 'Moodle Questionnaire'; dazu bei allen neuen Diensten ein Satz mit
 *      „nicht an echten Exporten geprüft“; bei Google zusätzlich „vermutlich“ (der erste Satz darf „Das sieht vermutlich nach einer Datei von Google Forms aus.“ lauten, vorgeschrieben ist nur „Datei von Google Forms“)
 *      und ein Satz, der „Zeitzone“ nennt (die steht nicht in der Datei).
 *  vorschlagSatz(v): für mehrfachZelle (bei unklar.length > 0 mit „nicht eindeutig“), doppelte („gleich“ oder „doppelt“), itemblock: ein Satz mit mehr als 10 Zeichen ohne NaN/undefined.
 *  Gegenprobe: alle Dateien aus testdaten/fragebogen/ behalten ihren Hersteller (Abschnitt am Ende; läuft schon grün).
 */
s.einst.sprache = 'de'; s.einst.anrede = 'du';

const bytes = (pfad: string) => new Uint8Array(readFileSync(new URL(`./testdaten/dienste/${pfad}`, import.meta.url)));
const csv = (pfad: string): Tabelle => leseCsv(dekodiere(bytes(pfad)), pfad);
const xlsx = async (pfad: string): Promise<Tabelle> => { const b = bytes(pfad); return leseTabellenkalkulation(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer, pfad); };
const text = (pfad: string) => readFileSync(new URL(`./testdaten/dienste/${pfad}`, import.meta.url), 'utf8');
const hatBom = (pfad: string) => { const b = bytes(pfad); return b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf; };

const nameVon = (e: Erkennung, kopf: string) => { const sp = e.spalten.find(x => x.kopf === kopf); expect(sp, `Spalte „${kopf}“ fehlt`).toBeTruthy(); return sp!.name; };
const alle = (e: Erkennung, art: string) => e.vorschlaege.filter((v: any) => v.art === art) as any[];
const mz = (e: Erkennung, kopf: string) => alle(e, 'mehrfachZelle').find(v => v.spalte === nameVon(e, kopf));
const metaKoepfe = (e: Erkennung) => e.spalten.filter(x => x.rolle === 'metadaten').map(x => x.kopf).sort();
const zeitKoepfe = (e: Erkennung) => e.spalten.filter(x => x.zeit).map(x => x.kopf).sort();
const pbKoepfe = (e: Erkennung) => alle(e, 'personenbezug').flatMap(v => v.spalten as string[]).map(n => e.spalten.find(x => x.name === n)!.kopf).sort();
const sortiert = (a: string[]) => [...a].sort();

/** Was für jeden neuen Dienst gilt: Hersteller, sicher, Zahl der Antworten, eindeutige ids, Sätze. */
function grund(e: Erkennung, x: { hersteller: string; sicher: boolean; zeilen: number; name: string }) {
  expect(e.hersteller, 'Hersteller').toBe(x.hersteller);
  expect((e as any).sicher, 'sicher').toBe(x.sicher);
  expect(e.kopfzeilen).toBe(1);
  expect(e.tabelle.zeilen.length, 'Datenzeilen').toBe(x.zeilen);
  expect(new Set(e.vorschlaege.map(v => v.id)).size, 'eindeutige ids').toBe(e.vorschlaege.length);
  const sätze = erkennungSaetze(e);
  expect(sätze[0], 'erster Satz').toContain(`Datei von ${x.name}`);
  expect(sätze.join(' '), 'Hinweis „nicht geprüft“').toMatch(/nicht an echten Exporten geprüft/);
  for (const v of e.vorschlaege) { const t = vorschlagSatz(v); expect(typeof t, `Satz zu ${v.id}`).toBe('string'); expect(t.length).toBeGreaterThan(10); expect(t).not.toMatch(/NaN|undefined|\$\{/); }
}

/* ------------------------------------------------------------------ Google Forms (vermutlich) */
describe('Google Forms (en, CSV): nur „vermutlich“, Mehrfachauswahl „, “, Raster, doppelte Zeile', () => {
  const e = erkenneFragebogen(csv('googleforms/googleforms-en.csv'));
  const sätze = () => erkennungSaetze(e).join(' ');
  it('Hersteller googleforms, aber NICHT sicher; Zeitstempel ohne Zone: der Satz sagt es', () => {
    grund(e, { hersteller: 'googleforms', sicher: false, zeilen: 6, name: 'Google Forms' });
    expect(sätze()).toMatch(/vermutlich/i); expect(sätze()).toMatch(/Zeitzone/); expect(e.zeitzone).toBeUndefined();
  });
  it('Metaspalten: nur Timestamp (E-Mail-Spalte ist nicht belegt, also nicht in der Datei); kein Personenbezug', () => {
    expect(metaKoepfe(e)).toEqual(['Timestamp']); expect(zeitKoepfe(e)).toEqual(['Timestamp']); expect(alle(e, 'personenbezug')).toEqual([]);
  });
  it('Mehrfachauswahl mit „Sonstiges“ ohne Trenner: Optionen in Reihenfolge des ersten Vorkommens, anders, keine unklare Zeile', () => {
    // Zellen: „Breakfast, Lunch“ | „Lunch, Dinner“ | „Breakfast, Dinner“ | „Breakfast, Lunch, Late snack“ | „Lunch“ | „Lunch“ (6 nicht leer, 4 mit „, “ = 67 %).
    // Zählung je Zelle: Breakfast 3 (Z0, Z2, Z3), Lunch 5 (Z0, Z1, Z3, Z4, Z5), Dinner 2 (Z1, Z2), „Late snack“ 1 → Optionen Breakfast, Lunch, Dinner.
    // Z3: Breakfast und Lunch abgezogen, Rest „Late snack“: kein Trenner, keine Option darin → anders, nicht unklar.
    expect(mz(e, 'Which meals do you usually eat?')).toMatchObject({ art: 'mehrfachZelle', trenner: ', ', optionen: ['Breakfast', 'Lunch', 'Dinner'], anders: true, unklar: [] });
  });
  it('„Sonstiges“-Text, der den Trenner enthält: unklare Zeile 3', () => {
    // Zellen: „Tea, Coffee“ | „Tea, Water“ | „Coffee, Water“ | „Tea, Soda, Cola“ | „Water“ | „Water“ (4 von 6 mit Trenner).
    // Tea 3 (Z0, Z1, Z3), Coffee 2 (Z0, Z2), Water 4 (Z1, Z2, Z4, Z5), Soda 1, Cola 1 → Optionen Tea, Coffee, Water.
    // Z3: Tea abgezogen, Rest „Soda, Cola“ enthält den Trenner → unklar (Zeile 3). Die Person entscheidet, ob es EIN Anderes oder zwei sind.
    expect(mz(e, 'Which drinks do you like?')).toMatchObject({ trenner: ', ', optionen: ['Tea', 'Coffee', 'Water'], anders: true, unklar: [3] });
    expect(vorschlagSatz(mz(e, 'Which drinks do you like?'))).toMatch(/nicht eindeutig/);
  });
  it('SCHWÄCHE des festen Verfahrens: eine Option „Yes, any way“, die selbst „, “ enthält, zerfällt in „Yes“ und „any way“', () => {
    // Zellen: „Mail, Phone“ | „Yes, any way“ | „Mail, Yes, any way“ | „Phone“ | „Phone“ | „Phone“. Schritt 2 teilt nur am Trenner:
    // Mail 2 (Z0, Z2), Phone 4 (Z0, Z3, Z4, Z5), Yes 2 (Z1, Z2), „any way“ 2 (Z1, Z2) → vier Optionen. Das ist die WÖRTLICHE Folge des Fachblatts; die Person sieht „Yes“ und „any way“ als getrennte Spalten.
    // Dieser Test hält den Ist-Zustand des Verfahrens fest. Ändert Opus das Verfahren (z. B. Optionsliste aus dem Formular), wird er geändert.
    expect(mz(e, 'How may we contact you?')).toMatchObject({ trenner: ', ', optionen: ['Mail', 'Phone', 'Yes', 'any way'], anders: false, unklar: [] });
  });
  it('Freitext mit Komma wird nicht aufgeteilt (weniger als zwei Optionen); Zeitstempel und Einfachauswahl-Spalten auch nicht', () => {
    // „Any comments?“: Zellen „Fine, thanks“, „Too loud, too crowded“, „Nothing“, „Nothing“: 2 von 4 mit Trenner (Kandidat), Zählung: nur „Nothing“ (2 Zellen) → eine Option → kein Vorschlag.
    expect(mz(e, 'Any comments?')).toBeUndefined();
    expect(alle(e, 'mehrfachZelle').map(v => v.spalte).sort()).toEqual([nameVon(e, 'Which meals do you usually eat?'), nameVon(e, 'Which drinks do you like?'), nameVon(e, 'How may we contact you?')].sort());
  });
  it('Raster `Frage [Zeile]` als Itemblock-Gruppe', () => {
    const b = alle(e, 'itemblock'); expect(b.length).toBe(1);
    expect(b[0]).toMatchObject({ id: 'itemblock:Rate the canteen', frage: 'Rate the canteen', items: ['Food', 'Service'], spalten: [nameVon(e, 'Rate the canteen [Food]'), nameVon(e, 'Rate the canteen [Service]')] });
    expect(vorschlagSatz(b[0]).length).toBeGreaterThan(10);
  });
  it('doppelte Antwort: Zeilen 4 und 5 sind in allen Spalten gleich (auch im Zeitstempel), grund „gleich“', () => {
    const d = alle(e, 'doppelte'); expect(d.length).toBe(1);
    expect(d[0]).toMatchObject({ id: 'doppelte', gruppen: [[4, 5]], grund: 'gleich' });
    expect(vorschlagSatz(d[0])).toMatch(/gleich|doppelt/i);
  });
  it('die Eingabe-Tabelle wird nicht verändert (nur Vorschläge)', () => {
    const t = csv('googleforms/googleforms-en.csv'); const vorher = JSON.stringify(t); erkenneFragebogen(t); expect(JSON.stringify(t)).toBe(vorher);
  });
});

/* ------------------------------------------------------------------ Mehrfachauswahl: Grenzfälle des festen Verfahrens (kleine Tabellen im Google-Aussehen) */
const google = (zellen: string[], extra: string[][] = []): Tabelle => {
  const zeilen = zellen.map((z, i) => [`1/${i + 1}/2024 10:00:${String(i).padStart(2, '0')}`, z, ...(extra[i] ?? [])]);
  const csvText = ['Timestamp,Q', ...zeilen.map(z => z.map(c => (c.includes(',') ? `"${c}"` : c)).join(','))].join('\n');
  return leseCsv(csvText, 'google-klein.csv');
};
describe('Mehrfachauswahl in einer Zelle: Grenzfälle (Fachblatt Paket 1B, Schritte 1 bis 4)', () => {
  it('unter 20 % mit Trenner: kein Kandidat (1 von 6 = 16,7 %), obwohl die Teile sich wiederholen', () => {
    const e = erkenneFragebogen(google(['A', 'A', 'A', 'B', 'B', 'A, B']));
    expect(e.hersteller).toBe('googleforms'); expect(mz(e, 'Q')).toBeUndefined();
  });
  it('genau 20 % mit Trenner (2 von 10) ist ein Kandidat', () => {
    const e = erkenneFragebogen(google(['A, B', 'A, B', 'A', 'A', 'A', 'A', 'B', 'B', 'B', 'B']));
    expect(mz(e, 'Q')).toMatchObject({ trenner: ', ', optionen: ['A', 'B'], anders: false, unklar: [] });
  });
  it('leere Zelle bleibt leer; eine Option, die nur einmal als ganze Zelle steht, aber sonst vorkommt, ist Option; Rest mit Trenner ist unklar', () => {
    // Zellen Z0 „A, B“ | Z1 „A, B“ | Z2 „A, B, X“ | Z3 „X“ | Z4 leer | Z5 „A, B, Y, Z“. Nicht leer 5, mit Trenner 4 (80 %).
    // A 4, B 4, X 2 (Z2, Z3) → Optionen A, B, X; Y 1, Z 1. Z5: Rest „Y, Z“ enthält den Trenner → unklar [5]. Z4 leer: nichts zu tun.
    const e = erkenneFragebogen(google(['A, B', 'A, B', 'A, B, X', 'X', '', 'A, B, Y, Z']));
    expect(mz(e, 'Q')).toMatchObject({ optionen: ['A', 'B', 'X'], anders: true, unklar: [5] });
  });
  it('Rest, in dem eine bekannte Option als Zeichenfolge steckt („Iced Tea“ bei Option „Tea“), ist unklar', () => {
    // Z0 „Tea, Coffee“ | Z1 „Tea, Coffee“ | Z2 „Iced Tea, Coffee“ | Z3 „Tea“. Tea 3 (Z0, Z1, Z3), Coffee 3 (Z0, Z1, Z2), „Iced Tea“ 1 → Optionen Tea, Coffee.
    // Z2: Coffee (6 Zeichen, zuerst) abgezogen; „Iced Tea“ ist KEIN ganzes Segment „Tea“, bleibt als Rest; Rest hat keinen Trenner, enthält aber die Option „Tea“ → unklar [2].
    const e = erkenneFragebogen(google(['Tea, Coffee', 'Tea, Coffee', 'Iced Tea, Coffee', 'Tea']));
    expect(mz(e, 'Q')).toMatchObject({ optionen: ['Tea', 'Coffee'], anders: true, unklar: [2] });
  });
  it('keine Zelle mit Trenner (jede Zelle nur eine Antwort): kein Mehrfach-Vorschlag', () => {
    expect(mz(erkenneFragebogen(google(['A', 'B', 'A', 'B', 'A'])), 'Q')).toBeUndefined();
  });
  it('eine einzige Antwortzeile: keine zwei Optionen, kein Vorschlag', () => {
    expect(mz(erkenneFragebogen(google(['A, B'])), 'Q')).toBeUndefined();
  });
});

describe('Google nur bei Zeitstempel-Kopf UND passenden Zellen (nie ein einziges Merkmal)', () => {
  it('Kopf „Timestamp“, aber Zellen sind keine Datumsangaben: nicht Google', () => {
    const e = erkenneFragebogen(leseCsv('Timestamp,Q\nfrüh,A\nspät,B\nmittag,A', 'x.csv')); expect(e.hersteller).not.toBe('googleforms');
  });
  it('erste Spalte sieht wie Datum aus, aber der Kopf ist „Datum“: nicht Google', () => {
    const e = erkenneFragebogen(leseCsv('Datum,Q\n8/6/2023 9:34:20,A\n8/7/2023 11:02:49,B', 'x.csv')); expect(e.hersteller).not.toBe('googleforms');
  });
  it('Nextcloud (Timestamp an vierter Stelle) wird nicht als Google erkannt', () => {
    expect(erkenneFragebogen(csv('nextcloud/nextcloud-en.csv')).hersteller).toBe('nextcloud');
  });
});

/* ------------------------------------------------------------------ Microsoft Forms */
describe('Microsoft Forms (en, XLSX): ID, Start time, Completion time; „;“ ohne Leerzeichen und am Ende; gleiche ID = wiederholter Export', () => {
  it('Hersteller, UTC, Metaspalten, Personenbezug (Reihenfolge von Email und Name ist nicht belegt: der Test sortiert)', async () => {
    const e = erkenneFragebogen(await xlsx('msforms/msforms-en.xlsx'));
    grund(e, { hersteller: 'msforms', sicher: true, zeilen: 6, name: 'Microsoft Forms' });
    expect(e.zeitzone).toBe('UTC');
    expect(metaKoepfe(e)).toEqual(sortiert(['ID', 'Start time', 'Completion time', 'Email', 'Name']));
    expect(zeitKoepfe(e)).toEqual(sortiert(['Start time', 'Completion time']));
    expect(pbKoepfe(e)).toEqual(['Email', 'Name']);
  });
  it('Mehrfachauswahl: „;“ am Zellende wird ignoriert, einzelne Antwort „Lunch;“ und leere Zelle machen nichts kaputt', async () => {
    const e = erkenneFragebogen(await xlsx('msforms/msforms-en.xlsx'));
    // Zellen: „Breakfast;Lunch;“ | „Lunch;Dinner;“ | „Breakfast;Dinner;“ | „Lunch;Dinner;“ (Wiederholung) | „Lunch;“ | leer. Nicht leer 5, alle mit „;“.
    // Breakfast 2 (Z0, Z2), Lunch 4 (Z0, Z1, Z3, Z4), Dinner 3 (Z1, Z2, Z3). Alle Zeilen ohne Rest: anders false, unklar leer.
    expect(mz(e, 'Which meals do you usually eat?')).toMatchObject({ trenner: ';', optionen: ['Breakfast', 'Lunch', 'Dinner'], anders: false, unklar: [] });
  });
  it('Freitext mit „;“ („Great; but noisy“) bleibt ungeteilt: nur „Fine“ kommt zweimal als ganze Zelle vor, also eine Option, kein Vorschlag', async () => {
    const e = erkenneFragebogen(await xlsx('msforms/msforms-en.xlsx'));
    expect(mz(e, 'Any comments?')).toBeUndefined(); expect(alle(e, 'mehrfachZelle').length).toBe(1);
  });
  it('doppelte Antworten: gleiche ID 2 in Zeile 1 und 3, grund „kennung“; kein Raster', async () => {
    const e = erkenneFragebogen(await xlsx('msforms/msforms-en.xlsx'));
    expect(alle(e, 'doppelte')).toMatchObject([{ id: 'doppelte', gruppen: [[1, 3]], grund: 'kennung' }]); expect(alle(e, 'itemblock')).toEqual([]);
  });
  it('gleiche ID zählt auch, wenn andere Zellen abweichen; ohne ID-Spalte zählt „in allen Spalten gleich“', () => {
    const a = erkenneFragebogen(leseCsv('ID,Start time,Completion time,Name,Q\n1,2026-10-01 08:00:00,2026-10-01 08:01:00,A,x\n1,2026-10-01 08:00:00,2026-10-01 08:05:00,A,y\n2,2026-10-01 09:00:00,2026-10-01 09:01:00,B,x', 'ms.csv'));
    expect(a.hersteller).toBe('msforms'); expect(alle(a, 'doppelte')).toMatchObject([{ gruppen: [[0, 1]], grund: 'kennung' }]);
    const b = erkenneFragebogen(leseCsv('Start time,Completion time,Name,Q\n2026-10-01 08:00:00,2026-10-01 08:01:00,A,x\n2026-10-01 08:00:00,2026-10-01 08:01:00,A,x\n2026-10-01 09:00:00,2026-10-01 09:01:00,B,x', 'ms.csv'));
    expect(alle(b, 'doppelte')).toMatchObject([{ gruppen: [[0, 1]], grund: 'gleich' }]);
  });
  it('mindestens drei der Köpfe ID, Start time, Completion time, Email, Name: zwei genügen nicht', () => {
    expect(erkenneFragebogen(leseCsv('ID,Name,Q\n1,A,x\n2,B,y', 'x.csv')).hersteller).not.toBe('msforms');
  });
});

/* ------------------------------------------------------------------ Nextcloud Forms */
describe('Nextcloud Forms (CSV mit BOM): eigener Erkenner, „; “, Raster `Frage (Zeile)`, anonym, system-other-answer', () => {
  it('en: Datei beginnt mit BOM; Hersteller nextcloud; vier Metaspalten; Personenbezug User ID und Anzeigename; Zeitstempel mit Verschiebung, keine Zeitzone gesetzt', () => {
    expect(hatBom('nextcloud/nextcloud-en.csv')).toBe(true);
    const e = erkenneFragebogen(csv('nextcloud/nextcloud-en.csv'));
    grund(e, { hersteller: 'nextcloud', sicher: true, zeilen: 5, name: 'Nextcloud Forms' });
    expect(e.tabelle.kopf[0]).toBe('Submission ID');   // die BOM darf nicht am ersten Kopf hängen
    expect(metaKoepfe(e)).toEqual(sortiert(['Submission ID', 'User ID', 'User display name', 'Timestamp'])); expect(zeitKoepfe(e)).toEqual(['Timestamp']);
    expect(pbKoepfe(e)).toEqual(['User ID', 'User display name']); expect(e.zeitzone).toBeUndefined();
  });
  it('en: Mehrfachauswahl mit „; “, Präfix system-other-answer: bleibt im Rest, Rest mit Trenner ist unklar (Zeile 3), Zelle nur mit Anderes-Text (Zeile 4) ist Rest', () => {
    const e = erkenneFragebogen(csv('nextcloud/nextcloud-en.csv'));
    // Zellen: „Breakfast; Lunch“ | „Lunch; Dinner“ | „Breakfast; Dinner; system-other-answer:Late snack“ | „Breakfast; Lunch; system-other-answer:Soda; Cola“ | „system-other-answer:Pizza“.
    // Breakfast 3 (Z0, Z2, Z3), Lunch 3 (Z0, Z1, Z3), Dinner 2 (Z1, Z2); alles andere höchstens einmal → Optionen Breakfast, Lunch, Dinner.
    // Z2: Rest „system-other-answer:Late snack“ (kein Trenner) → anders. Z3: Rest „system-other-answer:Soda; Cola“ enthält „; “ → unklar [3]. Z4: ganzer Zellinhalt ist Rest, kein Trenner, keine Option darin → anders, nicht unklar.
    expect(mz(e, 'Which meals do you usually eat?')).toMatchObject({ trenner: '; ', optionen: ['Breakfast', 'Lunch', 'Dinner'], anders: true, unklar: [3] });
    expect(mz(e, 'Any comments?')).toBeUndefined();   // „Nice, but loud“ hat Komma, aber nicht „; “
    expect(alle(e, 'mehrfachZelle').length).toBe(1);
  });
  it('en: Raster `Rate the canteen (Food)` als Itemblock; keine doppelten (Submission ID ist eindeutig)', () => {
    const e = erkenneFragebogen(csv('nextcloud/nextcloud-en.csv'));
    expect(alle(e, 'itemblock')).toMatchObject([{ id: 'itemblock:Rate the canteen', frage: 'Rate the canteen', items: ['Food', 'Service'], spalten: [nameVon(e, 'Rate the canteen (Food)'), nameVon(e, 'Rate the canteen (Service)')] }]);
    expect(alle(e, 'doppelte')).toEqual([]);
  });
  it('de: Köpfe Einreichungs-ID, Benutzer-ID, Anzeigename des Nutzers, Zeitstempel; „Anonymer Benutzer“ ist übersetzt, der Erkenner besteht nicht auf dem englischen Wort', () => {
    expect(hatBom('nextcloud/nextcloud-de.csv')).toBe(true);
    const e = erkenneFragebogen(csv('nextcloud/nextcloud-de.csv'));
    grund(e, { hersteller: 'nextcloud', sicher: true, zeilen: 4, name: 'Nextcloud Forms' });
    expect(metaKoepfe(e)).toEqual(sortiert(['Einreichungs-ID', 'Benutzer-ID', 'Anzeigename des Nutzers', 'Zeitstempel'])); expect(zeitKoepfe(e)).toEqual(['Zeitstempel']);
    expect(pbKoepfe(e)).toEqual(sortiert(['Benutzer-ID', 'Anzeigename des Nutzers']));
  });
  it('de: Mehrfachauswahl mit „; “ ohne Rest (Frühstück 3, Mittagessen 3, Abendessen 3), Raster `Mensa bewerten (Essen)`', () => {
    const e = erkenneFragebogen(csv('nextcloud/nextcloud-de.csv'));
    expect(mz(e, 'Welche Mahlzeiten essen Sie meistens?')).toMatchObject({ trenner: '; ', optionen: ['Frühstück', 'Mittagessen', 'Abendessen'], anders: false, unklar: [] });
    expect(alle(e, 'itemblock')).toMatchObject([{ frage: 'Mensa bewerten', items: ['Essen', 'Service'] }]);
  });
  it('drei der vier Köpfe genügen, zwei nicht', () => {
    expect(erkenneFragebogen(leseCsv('Submission ID,User ID,Timestamp,Q\n1,a,2026-11-08T10:15:30+01:00,x\n2,b,2026-11-08T10:16:30+01:00,y', 'x.csv')).hersteller).toBe('nextcloud');
    expect(erkenneFragebogen(leseCsv('Submission ID,User ID,Q\n1,a,x\n2,b,y', 'x.csv')).hersteller).not.toBe('nextcloud');
  });
});

/* ------------------------------------------------------------------ CryptPad */
describe('CryptPad (CSV und JSON, en und de): Time/Participant bzw. Zeit/Teilnehmer, ISO mit Z, Guest/Gast, Raster `Frage | Zeile`', () => {
  it('en CSV: Hersteller, UTC, Metaspalten, Teilnehmer „Dora“ ist Personenbezug; Anführungszeichen und „;“ im Freitext richtig gelesen', () => {
    const e = erkenneFragebogen(csv('cryptpad/cryptpad-en.csv'));
    grund(e, { hersteller: 'cryptpad', sicher: true, zeilen: 4, name: 'CryptPad' });
    expect(e.zeitzone).toBe('UTC'); expect(metaKoepfe(e)).toEqual(['Participant', 'Time']); expect(zeitKoepfe(e)).toEqual(['Time']); expect(pbKoepfe(e)).toEqual(['Participant']);
    const i = e.tabelle.kopf.indexOf('Any comments?'); expect(e.tabelle.zeilen.map(z => z[i])).toEqual(['Nice, but "loud"', null, 'Fine; thanks', 'Nothing']);
  });
  it('en CSV: Mehrfachauswahl ist bei CryptPad NICHT belegt, also nie ein mehrfachZelle-Vorschlag; Raster als Itemblock; keine doppelten', () => {
    const e = erkenneFragebogen(csv('cryptpad/cryptpad-en.csv'));
    expect(alle(e, 'mehrfachZelle')).toEqual([]); expect(alle(e, 'doppelte')).toEqual([]);
    expect(alle(e, 'itemblock')).toMatchObject([{ id: 'itemblock:Rate', frage: 'Rate', items: ['Food', 'Service'], spalten: [nameVon(e, 'Rate | Food'), nameVon(e, 'Rate | Service')] }]);
  });
  it('de CSV: Zeit/Teilnehmer; alle Teilnehmer „Gast“ → kein Personenbezug; Raster `Bewertung | Essen`', () => {
    const e = erkenneFragebogen(csv('cryptpad/cryptpad-de.csv'));
    grund(e, { hersteller: 'cryptpad', sicher: true, zeilen: 3, name: 'CryptPad' });
    expect(metaKoepfe(e)).toEqual(['Teilnehmer', 'Zeit']); expect(alle(e, 'personenbezug')).toEqual([]);
    expect(alle(e, 'itemblock')).toMatchObject([{ frage: 'Bewertung', items: ['Essen', 'Service'] }]);
  });
  it('Zeit muss ISO mit Z sein: gleiche Köpfe, aber Datum in anderer Form → nicht CryptPad', () => {
    expect(erkenneFragebogen(leseCsv('Time,Participant,Q\n8/6/2023 9:34:20,Guest,a\n8/7/2023 9:34:20,Guest,b', 'x.csv')).hersteller).not.toBe('cryptpad');
  });
  it('JSON en: cryptpadJsonTabelle liest questions/responses; Erkennung cryptpad; _name „Dora“ ist Personenbezug', () => {
    const r = (FB as any).cryptpadJsonTabelle?.(text('cryptpad/cryptpad-en.json'));
    expect(r, 'cryptpadJsonTabelle fehlt oder liefert null').toBeTruthy();
    expect(r.tabelle.kopf).toEqual(['_time', '_name', 'q1', 'q2']); expect(r.tabelle.zeilen.length).toBe(3);
    expect(r.fragetexte).toEqual({ q1: 'How satisfied are you?', q2: 'Any comments?' });
    const e = erkenneFragebogen(r.tabelle);
    grund(e, { hersteller: 'cryptpad', sicher: true, zeilen: 3, name: 'CryptPad' });
    expect(metaKoepfe(e)).toEqual(['_name', '_time']); expect(pbKoepfe(e)).toEqual(['_name']);
  });
  it('JSON de: alle „Gast“ → kein Personenbezug', () => {
    const r = (FB as any).cryptpadJsonTabelle?.(text('cryptpad/cryptpad-de.json')); expect(r).toBeTruthy();
    const e = erkenneFragebogen(r.tabelle); expect(e.hersteller).toBe('cryptpad'); expect(alle(e, 'personenbezug')).toEqual([]);
  });
  it('JSON: anderes JSON, kaputtes JSON und Text ergeben null (wirft nie)', () => {
    const f = (FB as any).cryptpadJsonTabelle; expect(typeof f).toBe('function');
    expect(f('{"a":1}')).toBeNull(); expect(f('{"questions":')).toBeNull(); expect(f('')).toBeNull(); expect(f('[1,2]')).toBeNull();
  });
});

/* ------------------------------------------------------------------ Kobo und Moodle Questionnaire (Metaspalten; Zuordnung zum Plan: fragebogenplan-1c.test.ts) */
describe('KoboToolbox: Köpfe `gruppe/frage`, Systemspalten, Excel mit 1/0 und CSV mit True/False', () => {
  const metaEins = ['start', 'end', '__version__', 'meta/instanceID', '_id', '_uuid', '_submission_time', '_validation_status', '_notes', '_status', '_submitted_by', '_tags', '_index'];
  it('Excel (XML values and headers, Gruppen mit „/“, Einzelspalte UND 0/1-Spalten): Hersteller kobo, Metaspalten, Personenbezug _submitted_by, Zeitspalten', async () => {
    const e = erkenneFragebogen(await xlsx('kobo/kobo-xml-eins-null.xlsx'));
    grund(e, { hersteller: 'kobo', sicher: true, zeilen: 4, name: 'KoboToolbox' });
    expect(metaKoepfe(e)).toEqual(sortiert(metaEins)); expect(zeitKoepfe(e)).toEqual(sortiert(['start', 'end', '_submission_time']));
    expect(pbKoepfe(e)).toEqual(['_submitted_by']);
    expect(e.spalten.find(x => x.kopf === 'zusatz_unbekannt')?.rolle).toBe('frage');   // was der Erkenner nicht kennt, bleibt Frage
    expect(e.spalten.find(x => x.kopf === 'besuch/zufrieden')?.rolle).toBe('frage');
    expect(alle(e, 'mehrfachZelle')).toEqual([]);   // Kobo trennt mit Leerzeichen; das übernimmt die Zuordnung zum Plan (1C), nicht dieser Erkenner
    expect(alle(e, 'doppelte')).toEqual([]);
  });
  it('CSV mit „;“ (True/False, nur getrennte Spalten): Hersteller kobo, Metaspalten ohne __version__ und _submitted_by', () => {
    const e = erkenneFragebogen(csv('kobo/kobo-xml-true-false.csv'));
    grund(e, { hersteller: 'kobo', sicher: true, zeilen: 3, name: 'KoboToolbox' });
    expect(metaKoepfe(e)).toEqual(sortiert(['start', 'end', '_id', '_uuid', '_submission_time', '_validation_status', '_index'])); expect(alle(e, 'personenbezug')).toEqual([]);
    expect(alle(e, 'mehrfachZelle')).toEqual([]);
  });
  it('mindestens zwei von _id, _uuid, _submission_time und „/“ in Köpfen: ein einzelner Systemkopf genügt nicht', () => {
    expect(erkenneFragebogen(leseCsv('_id,q1,q2\n1,a,b\n2,c,d', 'x.csv')).hersteller).not.toBe('kobo');
  });
});
describe('Moodle Questionnaire (CSV): Response, Submitted on:, Datum d/m/Y H:i:s, Fragen Q01_…', () => {
  it('mit Namen: Hersteller, zehn Metaspalten, Zeit-Spalte, Personenbezug (Institution bis Username; Course nicht)', () => {
    const e = erkenneFragebogen(csv('moodlequestionnaire/moodlequestionnaire.csv'));
    grund(e, { hersteller: 'moodlequestionnaire', sicher: true, zeilen: 3, name: 'Moodle Questionnaire' });
    expect(metaKoepfe(e)).toEqual(sortiert(['Response', 'Submitted on:', 'Institution', 'Department', 'Course', 'Group', 'User id', 'User idnumber', 'Full name', 'Username']));
    expect(zeitKoepfe(e)).toEqual(['Submitted on:']); expect(e.zeitzone).toBeUndefined();
    expect(pbKoepfe(e)).toEqual(sortiert(['Institution', 'Department', 'Group', 'User id', 'User idnumber', 'Full name', 'Username']));
    expect(e.spalten.find(x => x.kopf === 'Q01_zufriedenheit')?.rolle).toBe('frage');
    expect(e.spalten.find(x => x.kopf === 'Q02_mahlzeiten->fruehstueck')?.rolle).toBe('frage');   // Form des Checkbox-Kopfs nur teilweise belegt: hier nur „bleibt Frage“
  });
  it('anonym: Full name „Anonymous1…“ und leere Ids → kein Personenbezug; die Spalten bleiben Metaspalten', () => {
    const e = erkenneFragebogen(csv('moodlequestionnaire/moodlequestionnaire-anonym.csv'));
    grund(e, { hersteller: 'moodlequestionnaire', sicher: true, zeilen: 3, name: 'Moodle Questionnaire' });
    expect(alle(e, 'personenbezug')).toEqual([]); expect(metaKoepfe(e)).toContain('Full name');
  });
  it('Response und Submitted on: genügen nicht ohne Datumszellen d/m/Y H:i:s', () => {
    expect(erkenneFragebogen(leseCsv('Response,Submitted on:,Q\n1,gestern,a\n2,heute,b', 'x.csv')).hersteller).not.toBe('moodlequestionnaire');
  });
});

/* ------------------------------------------------------------------ Gegenprobe: nichts Altes wird zu einem neuen Dienst */
describe('Gegenprobe: vorhandene Dateien in testdaten/fragebogen/ behalten ihren Hersteller', () => {
  const NEU = ['msforms', 'nextcloud', 'cryptpad', 'googleforms', 'kobo', 'moodlequestionnaire', 'odk', 'moodlefeedback'];
  const FBX = (erwartet as any).fragebogen as Record<string, { datei?: string; hersteller?: string }>;
  const mitDatei = Object.values(FBX).filter(x => x.datei?.endsWith('.csv') && x.hersteller);
  it('die Liste der erwarteten Dateien ist nicht leer', () => { expect(mitDatei.length).toBeGreaterThanOrEqual(8); });
  for (const x of mitDatei) {
    it(`${x.datei}: ${x.hersteller}`, () => {
      const t = leseCsv(readFileSync(new URL(`./testdaten/fragebogen/${x.datei}`, import.meta.url), 'utf8'), x.datei!);
      const e = erkenneFragebogen(t); expect(e.hersteller).toBe(x.hersteller); expect(NEU).not.toContain(e.hersteller);
    });
  }
  it('jede CSV im Ordner (auch ohne Eintrag in der Erwartungsdatei) wird keinem der neuen Dienste zugeordnet', () => {
    for (const n of readdirSync(new URL('./testdaten/fragebogen/', import.meta.url)).filter(f => f.endsWith('.csv'))) {
      const e = erkenneFragebogen(leseCsv(readFileSync(new URL(`./testdaten/fragebogen/${n}`, import.meta.url), 'utf8'), n));
      expect(NEU, n).not.toContain(e.hersteller);
    }
  });
  it('jede neue Prüfdatei wird nur von IHREM Dienst erkannt (keine Verwechslung untereinander)', async () => {
    const soll: [string, string][] = [['googleforms/googleforms-en.csv', 'googleforms'], ['nextcloud/nextcloud-en.csv', 'nextcloud'], ['nextcloud/nextcloud-de.csv', 'nextcloud'], ['cryptpad/cryptpad-en.csv', 'cryptpad'], ['cryptpad/cryptpad-de.csv', 'cryptpad'], ['kobo/kobo-xml-true-false.csv', 'kobo'], ['moodlequestionnaire/moodlequestionnaire.csv', 'moodlequestionnaire']];
    for (const [d, h] of soll) expect(erkenneFragebogen(csv(d)).hersteller, d).toBe(h);
    expect(erkenneFragebogen(await xlsx('msforms/msforms-en.xlsx')).hersteller).toBe('msforms');
    expect(erkenneFragebogen(await xlsx('kobo/kobo-xml-eins-null.xlsx')).hersteller).toBe('kobo');
  });
});
