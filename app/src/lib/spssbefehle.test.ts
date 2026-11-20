import { afterEach, describe, expect, it } from 'vitest';
import { nodeEngine } from './testengine';
import { s } from './sitzung.svelte';
import { freundlich } from './meldungen';
import { spssAngleichen } from './spssangleich';
import { kommentareEinzeilig } from './spssbefehle';

/** Prüfbericht B (07.11.): GET FILE am Anfang, SPSS-Befehle ohne PSPP, mehrzeilige Kommentare, Warnungen, SAVE. Läuft mit der echten Engine; Wortlaut wie auf der Seite „Befehle“. */
const zeilen = Array.from({ length: 30 }, (_, i) => `${(i * 7) % 11} ${(i * 5) % 13} ${i % 3} ${(i * 3) % 7}`).join('\n');
const DATEN = `DATA LIST LIST /y (F8.0) x (F8.0) g (F8.0) z (F8.0).\nBEGIN DATA\n${zeilen}\nEND DATA.\n`;

const vorher = s.einst.sprache, anredeVorher = s.einst.anrede;
afterEach(() => { s.einst.sprache = vorher; s.einst.anrede = anredeVorher; });

/** Wie `ausfuehren` in Befehle.svelte: angleichen, laufen lassen, Meldungen von Statable davor und danach. */
async function lauf(syntax: string, datenOffen = true, sprache: 'de' | 'en' = 'de') {
  s.einst.sprache = sprache; s.einst.anrede = 'sie';
  const e = await nodeEngine();
  e.run(DATEN);
  const a = spssAngleichen(syntax, undefined, datenOffen);
  const r = e.run(a.syntax);
  const von = (xs: string[]) => xs.map(text => ({ type: 'message' as const, severity: 'warning', text }));
  const items = [...von(a.meldungen.vorher), ...r, ...von(a.meldungen.nachher)];
  return { a, items, tabellen: items.filter(i => i.type === 'table').length, meldungen: items.filter(i => i.type === 'message').map(i => freundlich((i as { text: string }).text, (i as { severity: string }).severity)) };
}

describe('GET FILE / GET DATA am Anfang einer .sps-Datei', () => {
  it('Daten offen: übersprungen und gemeldet, der Rest läuft', async () => {
    const r = await lauf("GET FILE='C:\\Kurs\\daten.sav'.\nDESCRIPTIVES y x.\nFREQUENCIES g.");
    expect(r.tabellen).toBeGreaterThanOrEqual(2);
    expect(r.meldungen).toHaveLength(1);
    expect(r.meldungen[0]!.titel).toBe('Die Daten sind schon offen');
    expect(r.meldungen[0]!.text).toMatch(/GET FILE 'C:\\Kurs\\daten\.sav' wurde übersprungen; es wird mit den offenen Daten gerechnet\./);
    expect(r.a.syntax).not.toMatch(/GET FILE/);
  });
  it('GET DATA, GET SAS, GET STATA und IMPORT ebenso (mehrzeilig)', async () => {
    const r = await lauf("GET DATA /TYPE=TXT\n  /FILE='a.txt'\n  /VARIABLES=a F1.\nGET SAS DATA='x.sas7bdat'.\nGET STATA FILE='x.dta'.\nIMPORT FILE='x.por'.\nDESCRIPTIVES y.");
    expect(r.meldungen.map(m => m.titel)).toEqual(Array(4).fill('Die Daten sind schon offen'));
    expect(r.tabellen).toBeGreaterThanOrEqual(1);
  });
  it('keine Daten offen: erklärt, dass Statable keine Dateien von der Festplatte liest', async () => {
    const r = await lauf("GET FILE='daten.sav'.", false);
    expect(r.meldungen[0]!.titel).toBe('Statable liest keine Dateien von der Festplatte');
    expect(r.meldungen[0]!.tun).toMatch(/Öffnen Sie die Datei zuerst .*führen Sie dann die Befehle aus/);
  });
  it('englisch', async () => {
    const r = await lauf("GET FILE='d.sav'.\nDESCRIPTIVES y.", true, 'en');
    expect(r.meldungen[0]!.text).toMatch(/GET FILE 'd\.sav' was skipped/);
  });
  it('der Dateiname steht nur in der Meldung, nie im Befehl an PSPP', async () => {
    const r = await lauf("GET FILE='geheim x.sav'.\nDESCRIPTIVES y.");
    expect(r.a.syntax).not.toMatch(/geheim/);
    expect(r.a.meldungen.vorher).toEqual(["Statable: skipped GET FILE 'geheim x.sav' (open)"]);
  });
  it('nach SAVE OUTFILE im selben Lauf bleibt GET FILE (Arbeitsspeicher)', async () => {
    const a = spssAngleichen("SAVE OUTFILE='/tmp/q.sav'.\nGET FILE='/tmp/q.sav'.", undefined, true);
    expect(a.syntax).toMatch(/GET FILE/);
    expect(a.meldungen.nachher).toHaveLength(1);
  });
  it('GET DATA mit INLINE bleibt', () => {
    expect(spssAngleichen("GET DATA /TYPE=TXT /FILE=INLINE /VARIABLES=a F1.", undefined, true).syntax).toMatch(/INLINE/);
  });
});

describe('SPSS-Befehle, die PSPP nicht kennt', () => {
  const FAELLE: [string, string, RegExp][] = [
    ['MIXED y BY g /FIXED=g.', 'MIXED', /Sind meine Daten in Gruppen verschachtelt\?/],
    ['NOMREG g WITH y.', 'NOMREG', /Lässt sich etwas vorhersagen\?.*multinomiale/],
    ['PLUM g WITH y.', 'PLUM', /ordinale Regression/],
    ['MVA VARIABLES=y x.', 'MVA', /Little-Test/],
    ['CLUSTER y x.', 'CLUSTER', /Welche Gruppen stecken in den Daten\?/],
    ['REPORT FORMAT=LIST /VARIABLES=y.', 'REPORT', /Seite „Bericht“/],
    ['SUMMARIZE /TABLES=y.', 'SUMMARIZE', /Unterscheiden sich Gruppen\?/],
    ['GRAPH /LINE=MEAN(y) BY g.', 'GRAPH /LINE', /Diagramme/],
    ['PARTIAL CORR y WITH x BY z.', 'PARTIAL CORR', /Hängen zwei Dinge zusammen\?.*herausgerechnet/],
    ['GENLIN y BY g.', 'GENLIN', /Poisson/],
    ['MULTIPLE IMPUTATION y x.', 'MULTIPLE IMPUTATION', /Mehrfachimputation/],
    ['ARIMA y.', 'ARIMA', /Wie entwickelt sich ein Wert über die Zeit\?/],
    ['GGRAPH /GRAPHDATASET NAME="g".', 'GGRAPH', /Diagramme/],
    ['CORRESPONDENCE TABLE=y(1,5) BY x(1,5).', 'CORRESPONDENCE', /Korrespondenzanalyse/],
    ['CATPCA y x.', 'CATPCA', /Statable kann das noch nicht\. Fehlt es Ihnen\? „Melden“ oben rechts\./],
    ['PROXIMITIES y x.', 'PROXIMITIES', /Statable kann das noch nicht/],
    ['OMS /SELECT TABLES.', 'OMS', /Export/],
    ['OUTPUT NAME a.', 'OUTPUT NAME', /Export/],
    ['MANOVA y BY g(1,3).', 'MANOVA', /mehreren Zahlen zugleich/],
    ['COXREG y.', 'COXREG', /Cox-Regression/]
  ];
  for (const [befehl, name, erwartet] of FAELLE) {
    it(`${name}: Weg in Statable statt „Tippfehler“`, async () => {
      const r = await lauf(befehl);
      const m = r.meldungen.find(x => x.titel === 'Diesen SPSS-Befehl kann PSPP nicht');
      expect(m, JSON.stringify(r.meldungen.map(x => x.titel))).toBeTruthy();
      expect(m!.text).toContain(`„${name}“`);
      expect(m!.text + ' ' + m!.tun).toMatch(erwartet);
      expect(m!.tun + m!.text).not.toMatch(/Schreibweise|Tutorium/);
    });
  }
  it('Python-Block wird übersprungen, der Rest läuft ohne Folgefehler', async () => {
    const r = await lauf('BEGIN PROGRAM.\nprint(1+1)\nEND PROGRAM.\nDESCRIPTIVES y.');
    expect(r.meldungen.map(x => x.titel)).toEqual(['Dieses Programm läuft in Statable nicht']);
    expect(r.tabellen).toBeGreaterThanOrEqual(1);
  });
  it('GLM /WSFACTOR geht nicht an PSPP: Weg zur Messwiederholung, kein „/TABLES“', async () => {
    const r = await lauf('GLM y x z /WSFACTOR=zeit 3 Polynomial /WSDESIGN=zeit.');
    expect(r.meldungen).toHaveLength(1);
    expect(r.meldungen[0]!.tun).toMatch(/Verändert sich etwas über mehrere Zeitpunkte\?/);
    expect(r.a.aenderungen).toEqual([]);
  });
  it('schrittweise Regression: eigene Meldung mit Blöcken', async () => {
    const r = await lauf('REGRESSION /DEPENDENT y /METHOD=STEPWISE x z.');
    const m = r.meldungen.find(x => x.titel === 'Schrittweise Auswahl gibt es nicht');
    expect(m!.tun).toMatch(/Blöcke bilden/);
  });
  it('englisch', async () => {
    const r = await lauf('MIXED y BY g.', true, 'en');
    expect(r.meldungen[0]!.titel).toBe('PSPP cannot run this SPSS command');
    expect(r.meldungen[0]!.tun).toMatch(/Are my data nested in groups\?/);
  });
  it('gewöhnliche Tippfehler bleiben Tippfehler', async () => {
    const r = await lauf('FREQENCIES y.');
    expect(r.meldungen[0]!.titel).toBe('Diesen Befehl kennt Statable nicht');
  });
});

describe('Warnungen sind keine Fehler, Dateien werden nicht gespeichert', () => {
  it('WEIGHT BY mit Gewicht 0: Hinweis statt „Das hat nicht geklappt“', async () => {
    const r = await lauf('WEIGHT BY z.\nFREQUENCIES y.');
    expect(r.meldungen.map(x => x.titel)).toEqual(['Fälle ohne gültiges Gewicht wurden ausgelassen']);
    expect(r.tabellen).toBeGreaterThanOrEqual(1);
  });
  it('DATA LIST FREE mit Dezimalkomma: nennt die richtige Spalte und die Ursache', async () => {
    const r = await lauf('DATA LIST FREE / geschl (A1) alter gew.\nBEGIN DATA\nm 20 70,5\nw 30 60,2\nEND DATA.\nLIST.');
    const titel = r.meldungen.map(x => x.titel);
    expect(titel).not.toContain('Das hat nicht geklappt');
    const t = r.meldungen.find(x => x.titel === 'Ein Fall war unvollständig');
    expect(t!.text).toMatch(/„gew“.*Dezimalkomma/);
  });
  for (const [name, befehl] of [['SAVE OUTFILE', "SAVE OUTFILE='/tmp/q.sav'."], ['SAVE TRANSLATE', "SAVE TRANSLATE OUTFILE='q.csv' /TYPE=CSV."], ['EXPORT', "EXPORT OUTFILE='/tmp/q.por'."]] as const) {
    it(`${name}: klare Meldung statt „Ausgeführt“`, async () => {
      const r = await lauf(befehl);
      expect(r.meldungen).toHaveLength(1);
      expect(r.meldungen[0]!.titel).toBe('Statable speichert keine Dateien über Befehle');
      expect(r.meldungen[0]!.tun).toMatch(/„Daten exportieren“/);
    });
  }
  it('„or“ in Auswahllisten heißt „oder“', async () => {
    const r = await lauf('FACTOR VARIABLES=y x z /EXTRACTION=ML.');
    expect(r.meldungen[0]!.text).toMatch(/PAF, PC, PA1 oder DEFAULT/);
    expect(r.meldungen[0]!.tun).not.toMatch(/Balkendiagramm|Wähl /);
  });
});

describe('mehrzeilige Kommentare', () => {
  it('werden je Zeile einzeilig; einzeilige und Anführungszeichen bleiben', () => {
    expect(kommentareEinzeilig('/* a\n b */\nDESCRIPTIVES y.')).toBe('/* a */\n/* b */\nDESCRIPTIVES y.');
    expect(kommentareEinzeilig('/* a\n\n b */ DESCRIPTIVES y.')).toBe('/* a */\n/*  */\n/* b */ DESCRIPTIVES y.');
    expect(kommentareEinzeilig("COMPUTE t = 'a /* b'.\n/* c */\n")).toBe("COMPUTE t = 'a /* b'.\n/* c */\n");
  });
  it('laufen in der Engine ohne „ist kein bekannter Befehl“', async () => {
    const r = await lauf('/* Kommentar über\n   mehrere Zeilen */\nDESCRIPTIVES y.\n/* noch einer\n über\n drei */\nFREQUENCIES g.');
    expect(r.meldungen).toEqual([]);
    expect(r.tabellen).toBeGreaterThanOrEqual(2);
  });
});
