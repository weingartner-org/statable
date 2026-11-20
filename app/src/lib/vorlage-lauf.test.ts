import 'fake-indexeddb/auto';
import { beforeAll, describe, expect, it } from 'vitest';
import { s, setzeTestMotor, oeffneTabelle, oeffneDatei, aendere, rueckgaengig, wiederholen, oeffneProjekt, motor } from './sitzung.svelte';
import { erzeugeTestMotor } from './testmotor';
import { leseCsv } from './einlesen';
import { entferneSpalte, sortiereDauerhaftAn } from './datenschritte.svelte';
import { vorlageAusProjekt, wendeVorlageAn, pruefeAufDaten, leseVorlageDatei } from './vorlage.svelte';
import { leseVorlage, vorlageAlsText, type Vorlage } from './vorlage';
import { leseProjektdatei, projektAlsDatei } from './projektdatei';
import { csvZelle, type ProtokollEintrag } from './protokoll';

/* Teil B, Prüfung im Test (Fachblatt): Die echten Funktionen der Sitzung laufen gegen die echte PSPP-Engine (lib/testmotor.ts).
 * Zwei Dateien mit gleichen Spalten; die Schritte von Hand auf Datei B ausführen und die Vorlage aus Datei A auf Datei B anwenden: Daten gleich bis aufs Protokoll. */

const SPALTEN = 'id;geschlecht;alter;punkte;freitext';
const ZEILEN_A = ['1;m;20;5;GEHEIMWERT_Anna Mueller', '2;w;31;9;GEHEIMWERT_Bernd Schmitt', '3;m;-99;7;GEHEIMWERT_Clara Zorn', '4;w;45;3;GEHEIMWERT_Dieter Ost'];
const ZEILEN_B = ['11;w;28;4;ANDERER_Text_B1', '12;m;39;8;ANDERER_Text_B2', '13;m;22;10;ANDERER_Text_B3', '14;w;-99;6;ANDERER_Text_B4', '15;w;51;2;ANDERER_Text_B5'];
const csv = (kopf: string, zeilen: string[]) => [kopf, ...zeilen].join('\n') + '\n';
const oeffneCsv = (kopf: string, zeilen: string[], name = 'daten') => oeffneTabelle(leseCsv(csv(kopf, zeilen)), name + '.csv');
const stand = () => JSON.stringify({ sp: s.spalten.map(x => [x.name, x.art, x.bezeichnung, x.niveau, x.fehlend, x.werteLabels]), z: s.zeilen });
const protokollOhneZeit = (p: readonly ProtokollEintrag[]) => p.filter(e => e.art !== 'vorlage').map(e => ({ art: e.art, spalten: e.spalten, betroffen: e.betroffen, vorher: e.vorher, nachher: e.nachher, ergebnis: e.ergebnis, wiederhol: e.wiederhol, nicht: e.nicht, werte: e.werte }));

/** Die Schritte, wie eine Person sie von Hand ausführt (immer dieselben Funktionen wie im Vorlage-Lauf). */
async function schritteVonHand() {
  await aendere('Umkodieren', "RECODE geschlecht ('m'=1) ('w'=2) INTO g2.\nEXECUTE.");
  await aendere('Berechnen', 'COMPUTE punkte2 = punkte * 2.\nEXECUTE.');
  await aendere('Keine Angabe', 'MISSING VALUES alter (-99).');
  await sortiereDauerhaftAn([{ spalte: 'punkte', richtung: 'ab', natuerlich: false }], null);
  await entferneSpalte('freitext');
}

let vorlage: Vorlage;
let vorlageText: string;
let protokollA: string;

beforeAll(async () => {
  setzeTestMotor(await erzeugeTestMotor());
  await motor();
});

/** SAV-Bytes ohne den Zeitstempel im Kopf (Datum und Uhrzeit des Schreibens, Byte 92 bis 108): sonst ist der Vergleich beim Sekundenwechsel rot. */
const ohneZeitstempel = (b: Uint8Array) => { const k = b.slice(); k.fill(0, 92, 109); return k; };

describe('Datei A: Schritte von Hand, Protokoll, Vorlage speichern', () => {
  it('jede Art von Datenänderung steht im Protokoll, ohne Werte aus den Daten', async () => {
    await oeffneCsv(SPALTEN, ZEILEN_A, 'daten-a');
    expect(s.protokoll).toEqual([]); expect(s.protokollLuecke).toBe(false);
    await schritteVonHand();
    expect(s.protokoll.map(e => e.art)).toEqual(['umkodieren', 'berechnen', 'fehlend', 'sortieren', 'spalteWeg']);
    expect(s.protokoll.map(e => e.nr)).toEqual([1, 2, 3, 4, 5]);
    const e1 = s.protokoll[0]!;
    expect(e1).toMatchObject({ spalten: ['g2'], betroffen: 4, vorher: 4, nachher: 4, quelle: 'hand', ergebnis: 'ok', werte: true });
    expect(e1.wiederhol).toMatchObject({ typ: 'syntax' });
    expect(s.protokoll[1]).toMatchObject({ spalten: ['punkte2'], betroffen: 4 });
    expect(s.protokoll[2]!.spalten).toEqual(['alter']);
    expect(s.protokoll[3]).toMatchObject({ wiederhol: { typ: 'sortieren' } });
    expect(s.protokoll[4]).toMatchObject({ spalten: ['freitext'], wiederhol: { typ: 'spalteWeg', name: 'freitext' } });
    protokollA = JSON.stringify(s.protokoll);
    expect(protokollA).not.toContain('GEHEIMWERT');
  });

  it('die Vorlage trägt keine Daten: kein Name, kein Freitext, keine Ergebnisse', () => {
    s.blaetter = [{ id: 'b1', titel: 'Punkte nach Gruppe', art: 'gruppenvergleich', l1: 'punkte', l2: 'g2', syntax: "T-TEST GROUPS=g2(1,2) /VARIABLES=punkte /* GEHEIMWERT_Anna Mueller */.", items: [{ type: 'text', text: 'GEHEIMWERT_Anna Mueller' } as never], ergebnis: { n: 4, auswahl: 'GEHEIMWERT_Bernd Schmitt' }, imBericht: true, notiz: 'Meine Notiz zur Auswertung', zeit: 1, stand: 'alt' }];
    const r = vorlageAusProjekt();
    vorlage = r.vorlage; vorlageText = vorlageAlsText(vorlage);
    expect(vorlageText).not.toContain('GEHEIMWERT'); expect(vorlageText).not.toContain('Mueller');
    expect(vorlage.schritte.map(x => x.art)).toEqual(['umkodieren', 'berechnen', 'fehlend', 'sortieren', 'spalteWeg']);
    expect(r.hinweise).toMatchObject({ nichtWiederholbar: [], mitWerten: 1, ausgelassen: 0, luecke: false, schritte: 5, blaetter: 1 });
    expect(vorlage.eingang).toEqual({ geschlecht: 'text', punkte: 'zahl', alter: 'zahl', freitext: 'text' });
    expect(vorlage.blaetter[0]).toMatchObject({ titel: 'Punkte nach Gruppe', l1: 'punkte', l2: 'g2', notiz: 'Meine Notiz zur Auswertung' });
    expect(JSON.stringify(vorlage.blaetter)).not.toContain('ergebnis');
  });

  it('die Vorlage geht durch den Text (Datei) und zurück, gleiche Schritte', () => {
    const r = leseVorlage(vorlageText);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.vorlage.schritte).toEqual(vorlage.schritte);
  });

  it('das Protokoll geht in die Projektdatei und kommt unverändert zurück; die Datei enthält keine Freitext-Werte im Protokoll', async () => {
    const sav = (await (await motor()).exportSav()).bytes;
    const text = projektAlsDatei({ name: 'A', quelle: 'x', sav, blaetter: [], entscheid: {}, zeit: 1, protokoll: s.protokoll as ProtokollEintrag[], protokollLuecke: false, datei: { name: 'daten-a.csv', sha256: 'a'.repeat(64) } });
    const p = leseProjektdatei(text);
    expect(p.protokoll).toEqual(s.protokoll); expect(p.protokollLuecke).toBe(false); expect(p.datei).toEqual({ name: 'daten-a.csv', sha256: 'a'.repeat(64) });
  });
});

describe('Datei B: von Hand gegen Vorlage', () => {
  let handStand: string, handProtokoll: ReturnType<typeof protokollOhneZeit>;

  it('von Hand auf Datei B', async () => {
    await oeffneCsv(SPALTEN, ZEILEN_B, 'daten-b');
    await schritteVonHand();
    handStand = stand(); handProtokoll = protokollOhneZeit(s.protokoll);
    expect(s.zeilen).toHaveLength(5);
  });

  it('Vorlage aus A auf B: Daten gleich bis aufs Protokoll', async () => {
    await oeffneCsv(SPALTEN, ZEILEN_B, 'daten-b');
    const vorher = stand();
    const p = pruefeAufDaten(vorlage);
    expect(p).toMatchObject({ sperren: 0, warnungen: 0, hinweise: 0 });
    const r = await wendeVorlageAn(vorlage, { dateiname: 'a.statable-vorlage', pruefsummeVorlage: 'b'.repeat(64) });
    expect(r).toEqual({ ok: true, schritte: 5, blaetter: 1, ausgelassen: 0 });
    expect(vorher).not.toBe(stand());
    expect(stand()).toBe(handStand);
    expect(protokollOhneZeit(s.protokoll)).toEqual(handProtokoll);
    // Protokoll: Quelle, Vorlagendatei, Schritt in der Vorlage; ein Vermerk am Anfang
    expect(s.protokoll[0]).toMatchObject({ art: 'vorlage', quelle: 'vorlage', pruefung: { sperren: 0, warnungen: 0, hinweise: 0, bestaetigt: false } });
    const echt = s.protokoll.filter(e => e.art !== 'vorlage');
    expect(echt.every(e => e.quelle === 'vorlage')).toBe(true);
    expect(echt.map(e => e.vorlage!.schritt)).toEqual([1, 2, 3, 4, 5]);
    expect(echt[0]!.vorlage).toMatchObject({ datei: 'a.statable-vorlage', pruefsummeVorlage: 'b'.repeat(64), pruefsummeDaten: null });
    // Die Auswertung kommt ohne Ergebnis und als „veraltet“ (wird beim Öffnen oder mit „Alle rechnen“ gerechnet)
    expect(s.blaetter).toHaveLength(1);
    expect(s.blaetter[0]).toMatchObject({ titel: 'Punkte nach Gruppe', l1: 'punkte', l2: 'g2', items: [], ergebnis: null, notiz: 'Meine Notiz zur Auswertung', stand: 'vorlage', syntax: '' });
    expect(s.blaetter[0]!.id).not.toBe('b1');
    // Keine Werte aus Datei B im Protokoll
    expect(JSON.stringify(s.protokoll)).not.toContain('ANDERER_Text');
  });

  it('Rückgängig nach dem Lauf: der Schritt bleibt im Protokoll mit Vermerk „zurückgenommen“, Wiederholen ergibt einen neuen Eintrag', async () => {
    const n = s.protokoll.length;
    await rueckgaengig();
    expect(s.protokoll).toHaveLength(n);
    const letzter = s.protokoll.filter(e => e.art !== 'vorlage').at(-1)!;
    expect(letzter.art).toBe('spalteWeg'); expect(letzter.zurueck).toMatchObject({ grund: 'rueckgaengig' });
    expect(s.spalten.map(x => x.name)).toContain('freitext');
    await wiederholen();
    expect(s.protokoll).toHaveLength(n + 1);
    const neu = s.protokoll.at(-1)!;
    expect(neu).toMatchObject({ art: 'spalteWeg', wiederholtVon: letzter.nr, quelle: 'hand' }); expect(neu.zurueck).toBeUndefined();
    expect(s.protokoll.find(e => e.nr === letzter.nr)!.zurueck).toBeDefined();   // der alte Eintrag wird nicht verändert oder gelöscht
    expect(s.spalten.map(x => x.name)).not.toContain('freitext');
  });

  it('die Vorlage aus dem Projekt, in dem Schritte zurückgenommen wurden, enthält jeden Schritt einmal', () => {
    const v2 = vorlageAusProjekt().vorlage;
    expect(v2.schritte.map(x => x.art)).toEqual(['umkodieren', 'berechnen', 'fehlend', 'sortieren', 'spalteWeg']);
  });
});

describe('Prüfung vor jeder Änderung', () => {
  const unveraendert = async (f: () => Promise<unknown>) => { const st = stand(), n = s.protokoll.length, v = s.verlauf.length; const r = await f(); expect(stand()).toBe(st); expect(s.protokoll).toHaveLength(n); expect(s.verlauf).toHaveLength(v); return r; };

  it('fehlende Spalte: Sperre mit Name, nichts ändert sich; mit Zuordnung läuft es und die Zuordnung steht im Protokoll', async () => {
    await oeffneCsv('id;geschlecht;age;punkte;freitext', ['1;m;20;5;x', '2;w;31;9;y'], 'ohne-alter');
    const p = pruefeAufDaten(vorlage);
    expect(p.punkte.find(x => x.art === 'fehlt')).toMatchObject({ spalte: 'alter', stufe: 'sperre' });
    expect(await unveraendert(() => wendeVorlageAn(vorlage, { dateiname: 'a', pruefsummeVorlage: null }))).toEqual({ ok: false, art: 'sperre' });
    const r = await wendeVorlageAn(vorlage, { dateiname: 'a.statable-vorlage', pruefsummeVorlage: null, zuordnung: { alter: 'age' } });
    expect(r.ok).toBe(true);
    expect(s.spalten.map(x => x.name)).toContain('alter');
    const z = s.protokoll.find(e => e.zuordnung);
    expect(z).toMatchObject({ art: 'umbenennen', zuordnung: { von: 'age', nach: 'alter' }, quelle: 'vorlage', ohneVorlage: true });
    // aus diesem Projekt wird die Zuordnung nicht in eine neue Vorlage übernommen
    expect(vorlageAusProjekt().vorlage.schritte.map(x => x.art)).toEqual(['umkodieren', 'berechnen', 'fehlend', 'sortieren', 'spalteWeg']);
  });

  it('andere Art (Zahl statt Text): Sperre mit Name', async () => {
    await oeffneCsv(SPALTEN, ['1;1;20;5;x', '2;2;31;9;y'], 'andere-art');
    const p = pruefeAufDaten(vorlage);
    expect(p.punkte.find(x => x.art === 'andere-art')).toMatchObject({ spalte: 'geschlecht', erwartet: 'text', ist: 'zahl', stufe: 'sperre' });
    expect(await unveraendert(() => wendeVorlageAn(vorlage, { dateiname: 'a', pruefsummeVorlage: null }))).toEqual({ ok: false, art: 'sperre' });
  });

  it('neue Spalte: Hinweis, kein Halt', async () => {
    await oeffneCsv(SPALTEN + ';extra', ['1;m;20;5;x;7', '2;w;31;9;y;8'], 'extra');
    const p = pruefeAufDaten(vorlage);
    expect(p).toMatchObject({ sperren: 0, warnungen: 0, hinweise: 1, neueSpalten: ['extra'] });
    expect((await wendeVorlageAn(vorlage, { dateiname: 'a', pruefsummeVorlage: null })).ok).toBe(true);
  });

  it('neue Kategorie: Warnung mit Zahl der Zeilen; ohne Bestätigung ändert sich nichts; mit Bestätigung bleiben die Werte, und das steht im Protokoll (ohne den Wert)', async () => {
    await oeffneCsv(SPALTEN, ['1;m;20;5;x', '2;w;31;9;y', '3;KATEGORIE_Neu7;40;1;z', '4;KATEGORIE_Neu7;41;2;z'], 'neue-kategorie');
    const p = pruefeAufDaten(vorlage);
    expect(p).toMatchObject({ sperren: 0, warnungen: 1, zeilenNeueKategorien: 2 });
    expect(p.punkte.find(x => x.art === 'neue-kategorie')).toMatchObject({ spalte: 'geschlecht', anzahl: 2, beispiele: ['KATEGORIE_Neu7'] });
    expect(await unveraendert(() => wendeVorlageAn(vorlage, { dateiname: 'a', pruefsummeVorlage: null }))).toEqual({ ok: false, art: 'bestaetigung' });
    const r = await wendeVorlageAn(vorlage, { dateiname: 'a', pruefsummeVorlage: null, bestaetigt: true });
    expect(r.ok).toBe(true);
    const g2 = s.spalten.findIndex(x => x.name === 'g2');
    expect(s.zeilen.map(z => z[g2])).toEqual(expect.arrayContaining([null]));   // unbekannte Kategorie bleibt ohne Zuordnung, wie es der Schritt vorsieht
    expect(s.protokoll[0]).toMatchObject({ art: 'vorlage', pruefung: { warnungen: 1, bestaetigt: true, zeilenNeueKategorien: 2 } });
    expect(JSON.stringify(s.protokoll)).not.toContain('KATEGORIE_Neu7');
  });

  it('fehlende Kategorie: Hinweis', async () => {
    await oeffneCsv(SPALTEN, ['1;m;20;5;x', '2;m;31;9;y'], 'nur-m');
    expect(pruefeAufDaten(vorlage).punkte.find(x => x.art === 'kategorie-fehlt')).toMatchObject({ stufe: 'hinweis', anzahl: 1 });
  });
});

describe('Abbrechender Schritt', () => {
  it('Daten wie vor dem Lauf, alles Folgende gestoppt, Grund im Protokoll, nichts gelöscht', async () => {
    const schlecht: Vorlage = {
      ...vorlage, blaetter: [], eingang: { punkte: 'zahl' }, ursprung: [{ name: 'punkte', art: 'zahl' }],
      schritte: [
        { nr: 1, art: 'berechnen', spalten: ['a1'], wiederhol: { typ: 'syntax', befehle: ['COMPUTE a1 = punkte + 1.', 'EXECUTE.'] }, liest: { punkte: 'zahl' }, erzeugt: ['a1'] },
        { nr: 2, art: 'berechnen', spalten: ['b1'], wiederhol: { typ: 'syntax', befehle: ['COMPUTE b1 = gibt_es_nicht + 1.', 'EXECUTE.'] } },
        { nr: 3, art: 'berechnen', spalten: ['c1'], wiederhol: { typ: 'syntax', befehle: ['COMPUTE c1 = 3.', 'EXECUTE.'] } }
      ]
    };
    const gelesen = leseVorlage(JSON.stringify(schlecht));
    expect(gelesen.ok).toBe(true); if (!gelesen.ok) return;
    await oeffneCsv(SPALTEN, ZEILEN_B, 'abbruch');
    await aendere('Vorher', 'COMPUTE vorher = 1.\nEXECUTE.');
    const st = stand(), vl = s.verlauf.length, sav = (await (await motor()).exportSav()).bytes, nPro = s.protokoll.length;
    const r = await wendeVorlageAn(gelesen.vorlage, { dateiname: 'schlecht.statable-vorlage', pruefsummeVorlage: null });
    expect(r).toMatchObject({ ok: false, art: 'abbruch', schritt: 2, schrittArt: 'berechnen', grund: 'pspp' });
    expect(stand()).toBe(st);
    expect(s.verlauf).toHaveLength(vl);
    // Nachgestellt: Zwei Ausgaben mit einer Sekunde Abstand unterscheiden sich nur im Zeitstempel des SAV-Kopfs (Byte 92 bis 108).
    await new Promise(z => setTimeout(z, 1100));
    const nachher = (await (await motor()).exportSav()).bytes;
    const abweichend = [...nachher].flatMap((w, i) => (w === sav[i] ? [] : [i]));
    expect(abweichend.every(i => i >= 92 && i <= 108)).toBe(true);
    expect(abweichend.length).toBeGreaterThan(0);
    expect(ohneZeitstempel(nachher)).toEqual(ohneZeitstempel(sav));
    expect(s.spalten.map(x => x.name)).not.toContain('a1'); expect(s.spalten.map(x => x.name)).not.toContain('c1');
    // Das Protokoll wächst nur (nichts gelöscht): Vermerk, Schritt 1 (zurückgenommen wegen Abbruch), Schritt 2 (Fehler, zurückgenommen)
    expect(s.protokoll.length).toBeGreaterThan(nPro);
    const neu = s.protokoll.slice(nPro);
    expect(neu[0]).toMatchObject({ art: 'vorlage' });
    expect(neu[1]).toMatchObject({ art: 'berechnen', ergebnis: 'ok', quelle: 'vorlage', zurueck: { grund: 'abbruch' }, vorlage: { schritt: 1 } });
    expect(neu[2]).toMatchObject({ art: 'berechnen', ergebnis: 'fehler', grund: 'pspp', zurueck: { grund: 'abbruch' }, vorlage: { schritt: 2 } });
    expect(neu.some(e => e.vorlage?.schritt === 3)).toBe(false);
    expect(s.protokoll.slice(0, nPro)).toEqual(s.protokoll.slice(0, nPro));
  });

  it('Sortieren mit einer Spalte, die es nicht gibt, bricht ab: Eintrag „abgebrochen“ mit Grund', async () => {
    const v: Vorlage = { ...vorlage, blaetter: [], eingang: {}, schritte: [{ nr: 1, art: 'berechnen', spalten: ['q1'], wiederhol: { typ: 'syntax', befehle: ['COMPUTE q1 = 5.'] }, erzeugt: ['q1'] }, { nr: 2, art: 'sortieren', spalten: [], wiederhol: { typ: 'sortieren', schluessel: [{ spalte: 'gibtesnicht', richtung: 'auf', natuerlich: false }], altName: null } }] };
    await oeffneCsv(SPALTEN, ZEILEN_B, 'abbruch2');
    const st = stand(), nPro = s.protokoll.length;
    const r = await wendeVorlageAn(v, { dateiname: 'v', pruefsummeVorlage: null });
    expect(r).toMatchObject({ ok: false, art: 'abbruch', schritt: 2, schrittArt: 'sortieren', grund: 'sonst' });
    expect(stand()).toBe(st);
    const neu = s.protokoll.slice(nPro);
    expect(neu.map(e => [e.art, e.ergebnis])).toEqual([['vorlage', 'ok'], ['berechnen', 'ok'], ['sortieren', 'abgebrochen']]);
    expect(neu[1]!.zurueck).toMatchObject({ grund: 'abbruch' });
  });
});

describe('Nicht wiederholbare Arten', () => {
  it('werden beim Speichern gemeldet, tragen „nicht wiederholbar“ und sperren das Anwenden mit Nummer und Art', async () => {
    await oeffneCsv(SPALTEN, ZEILEN_B, 'nicht');
    const { aendereDaten } = await import('./sitzung.svelte');
    const sp = JSON.parse(JSON.stringify(s.spalten)), z = s.zeilen.map(r => [...r]);
    z[0]![2] = 99;
    await aendereDaten('Zeile 1 geändert', sp, z as never, true, { art: 'zelle' });
    await aendere('Zeilen', 'COMPUTE nur = 1.\nIF (ANY($CASENUM, 1, 3)) nur = 2.\nEXECUTE.');
    await aendere('Befehle', 'FREQUENCIES VARIABLES=geschlecht.');
    await aendere('Daten-Check', "RECODE geschlecht ('m '='m').\nEXECUTE.", undefined, { art: 'datencheck', ausDaten: true });
    const r = vorlageAusProjekt();
    expect(r.hinweise.nichtWiederholbar.map(x => [x.nr, x.art, x.nicht])).toEqual([[1, 'zelle', 'zeilen'], [2, 'berechnen', 'zeilen'], [3, 'befehl', 'befehl'], [4, 'datencheck', 'aus-daten']]);
    const text = vorlageAlsText(r.vorlage);
    expect(text).not.toContain('CASENUM'); expect(text).not.toContain("'m '");   // der Befehl mit Zeilennummern oder Werten wird gar nicht erst abgelegt
    await oeffneCsv(SPALTEN, ZEILEN_B, 'nicht2');
    const p = pruefeAufDaten(r.vorlage);
    expect(p.punkte.filter(x => x.art === 'nicht-wiederholbar').map(x => x.schritt)).toEqual([1, 2, 3, 4]);
    const st = stand();
    expect(await wendeVorlageAn(r.vorlage, { dateiname: 'n', pruefsummeVorlage: null, bestaetigt: true })).toEqual({ ok: false, art: 'sperre' });
    expect(stand()).toBe(st);
  });

  it('Umformen als neues Projekt: erster Eintrag im Protokoll des neuen Projekts, nicht wiederholbar', async () => {
    const { oeffneNeueDaten } = await import('./sitzung.svelte');
    await oeffneCsv(SPALTEN, ZEILEN_B, 'umformen-alt');
    const sp = JSON.parse(JSON.stringify(s.spalten)), z = s.zeilen.map(r => [...r]);
    await oeffneNeueDaten('Neu', 'umstrukturiert', sp, z as never, 'umformen');
    expect(s.protokoll).toHaveLength(1);
    expect(s.protokoll[0]).toMatchObject({ art: 'umformen', nicht: 'neu', vorher: 5, nachher: 5 });
  });
});

describe('Bösartige und kaputte Vorlagen', () => {
  it('Schritte mit eingeschleusten Befehlen sperren den Lauf; nichts wird ausgeführt', async () => {
    const boese = {
      ...vorlage, blaetter: [], eingang: { punkte: 'zahl' }, ursprung: [{ name: 'punkte', art: 'zahl' }],
      schritte: [
        { nr: 1, art: 'befehl', spalten: [], wiederhol: { typ: 'syntax', befehle: ["VARIABLE LABELS punkte 'x\n.\nCOMPUTE inj = 99.\n'."] } },
        { nr: 2, art: 'befehl', spalten: [], wiederhol: { typ: 'syntax', befehle: ["COMPUTE a = 1.", "SAVE OUTFILE='/pwned.sav'."] } },
        { nr: 3, art: 'befehl', spalten: [], wiederhol: { typ: 'syntax', befehle: ['HOST COMMAND=(\'echo\').'] } },
        { nr: 4, art: 'sortieren', spalten: [], wiederhol: { typ: 'sortieren', schluessel: [{ spalte: "punkte'.\nCOMPUTE inj = 1", richtung: 'auf', natuerlich: false }], altName: null } }
      ]
    };
    const gelesen = leseVorlage(JSON.stringify(boese));
    expect(gelesen.ok).toBe(true); if (!gelesen.ok) return;
    await oeffneCsv(SPALTEN, ZEILEN_B, 'boese');
    const st = stand();
    const r = await wendeVorlageAn(gelesen.vorlage, { dateiname: 'boese', pruefsummeVorlage: null, bestaetigt: true });
    expect(r).toEqual({ ok: false, art: 'sperre' });
    expect(stand()).toBe(st);
    const e = await motor();
    expect(s.spalten.map(x => x.name)).not.toContain('inj');
    const lese = await e.run("GET FILE='/pwned.sav'.");
    expect(lese.items.some(i => i.type === 'message' && i.severity === 'error')).toBe(true);   // die Datei gibt es nicht
  });

  it('Zuordnung mit einem Namen, der kein Spaltenname ist: Sperre statt Befehl', async () => {
    await oeffneCsv('id;geschlecht;punkte;freitext', ['1;m;5;x'], 'zu');
    const r = await wendeVorlageAn(vorlage, { dateiname: 'a', pruefsummeVorlage: null, zuordnung: { alter: "id'.\nCOMPUTE inj = 1.\nRENAME VARIABLES (x" } });
    expect(r).toEqual({ ok: false, art: 'sperre' });
    expect(s.spalten.map(x => x.name)).not.toContain('inj');
  });

  it('kaputte Dateien ergeben einen Grund und keinen Absturz', async () => {
    for (const inhalt of ['', 'kein json', '{', '[1,2', '{"format":"statable-vorlage","version":1}', '{"format":"statable-vorlage","version":99,"schritte":[],"blaetter":[],"eingang":{}}', '\u0000\u0001\u0002', '"x"', 'null']) {
      const r = await leseVorlageDatei(new File([inhalt], 'x.statable-vorlage'));
      expect(r.ok, inhalt).toBe(false);
    }
    const gut = await leseVorlageDatei(new File([vorlageText], 'gut.statable-vorlage'));
    expect(gut.ok).toBe(true);
    if (gut.ok) expect(gut.pruefsumme).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('Alte Projekte laden', () => {
  it('eine Projektdatei ohne Protokoll lädt; das Protokoll beginnt mit dieser Fassung', async () => {
    await oeffneCsv(SPALTEN, ZEILEN_B, 'alt');
    const sav = (await (await motor()).exportSav()).bytes;
    const text = projektAlsDatei({ name: 'Alt', quelle: 'x', sav, blaetter: [], entscheid: {}, zeit: 1 });
    expect(JSON.parse(new TextDecoder().decode(text))).not.toHaveProperty('protokoll');
    const p = leseProjektdatei(text);
    expect(p.protokoll).toBeUndefined();
    await oeffneProjekt(p);
    expect(s.protokoll).toEqual([]); expect(s.protokollLuecke).toBe(true); expect(s.datei).toBeUndefined();
    await aendere('x', 'COMPUTE neu = 1.\nEXECUTE.');
    expect(s.protokoll).toHaveLength(1);
    expect(vorlageAusProjekt().hinweise.luecke).toBe(true);
    // gespeichert und wieder geladen: die Lücke bleibt, das Protokoll auch
    const sav2 = (await (await motor()).exportSav()).bytes;
    const p2 = leseProjektdatei(projektAlsDatei({ name: 'Alt', quelle: 'x', sav: sav2, blaetter: [], entscheid: {}, zeit: 2, protokoll: s.protokoll as ProtokollEintrag[], protokollLuecke: s.protokollLuecke }));
    await oeffneProjekt(p2);
    expect(s.protokoll).toHaveLength(1); expect(s.protokollLuecke).toBe(true);
  });

  it('ein Protokoll mit Unsinn in der Datei bringt das Projekt nicht zum Absturz', () => {
    const roh = JSON.parse(new TextDecoder().decode(projektAlsDatei({ name: 'A', quelle: 'x', sav: new Uint8Array([1]), blaetter: [], entscheid: {}, zeit: 1 })));
    roh.protokoll = [1, null, 'x', { art: 'umkodieren', wiederhol: { typ: 'syntax', befehle: ["SAVE OUTFILE='x'."] }, spalten: 'kein Feld' }];
    const p = leseProjektdatei(new TextEncoder().encode(JSON.stringify(roh)));
    expect(p.protokoll).toHaveLength(1); expect(p.protokoll![0]!.wiederhol).toBeUndefined(); expect(p.protokoll![0]!.spalten).toEqual([]);
  });
});

describe('Prüfsumme der neuen Datei', () => {
  it('SHA-256 über die Bytes der geöffneten Datei, im Protokoll bei jedem Schritt aus der Vorlage', async () => {
    const inhalt = csv(SPALTEN, ZEILEN_B);
    const bytes = new TextEncoder().encode(inhalt);
    const erwartet = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(b => b.toString(16).padStart(2, '0')).join('');
    await oeffneDatei(new File([inhalt], 'daten-b.csv'));
    expect(s.datei).toEqual({ name: 'daten-b.csv', sha256: erwartet });
    const r = await wendeVorlageAn(vorlage, { dateiname: 'a.statable-vorlage', pruefsummeVorlage: 'c'.repeat(64) });
    expect(r.ok).toBe(true);
    const echt = s.protokoll.filter(e => e.art !== 'vorlage');
    expect(echt.every(e => e.vorlage!.pruefsummeDaten === erwartet && e.vorlage!.datenName === 'daten-b.csv')).toBe(true);
    expect(s.protokoll[0]!.vorlage).toMatchObject({ pruefsummeDaten: erwartet, pruefsummeVorlage: 'c'.repeat(64) });
  });
});

describe('Lesart wird wiederholt', () => {
  it('„Als Zahl lesen“ steht im Protokoll und läuft aus der Vorlage auf einer neuen Tabelle', async () => {
    const { liesAlsZahl } = await import('./sitzung.svelte');
    await oeffneCsv('id;preis', ['1;10 €', '2;20 €', '3;30 €'], 'preis-a');
    await liesAlsZahl('preis');
    expect(s.protokoll).toHaveLength(1);
    expect(s.protokoll[0]).toMatchObject({ art: 'lesart', wiederhol: { typ: 'lesart', modus: 'zahl', kopf: 'preis' } });
    const v = vorlageAusProjekt().vorlage;
    await oeffneCsv('id;preis', ['7;15 €', '8;25 €'], 'preis-b');
    expect(pruefeAufDaten(v).sperren).toBe(0);
    const r = await wendeVorlageAn(v, { dateiname: 'p', pruefsummeVorlage: null });
    expect(r.ok).toBe(true);
    expect(s.spalten.find(x => x.name === 'preis')!.art).toBe('zahl');
    expect(s.zeilen.map(z => z[1])).toEqual([15, 25]);
    expect(s.protokoll.filter(e => e.art === 'lesart')).toHaveLength(1);
    // Eine Datei ohne diese Kopfzeile: Sperre
    await oeffneCsv('id;betrag', ['7;15 €'], 'preis-c');
    expect(pruefeAufDaten(v).punkte.some(x => x.art === 'lesart' && x.stufe === 'sperre')).toBe(true);
  });
});

describe('CSV-Export des Protokolls: keine Formeln', () => {
  it('Zellen mit = + - @ werden geschützt', () => { expect(csvZelle('=cmd|x')).toBe("'=cmd|x"); expect(csvZelle('@SUM(1)')).toBe("'@SUM(1)"); });
});

describe('Seite und Export', () => {
  it('die Seite „Protokoll“ zeigt Einträge, Vermerke und die Hinweise zum Anwenden; das CSV hat Kopfzeile und keine Datenwerte', async () => {
    const { render } = await import('svelte/server');
    const Seite = (await import('../seiten/Protokoll.svelte')).default;
    const { protokollCsv, protokollAnhang } = await import('./protokollsaetze');
    await oeffneCsv(SPALTEN, ZEILEN_B, 'seite');
    await schritteVonHand();
    await rueckgaengig();
    const { body } = render(Seite);
    expect(body).toContain('Protokoll der Datenänderungen');
    expect(body).toContain('Umkodieren'); expect(body).toContain('Spalte entfernen');
    expect(body).toContain('Zurückgenommen');
    // Seit Stufe 7 steht die Vorlage auf eigener Seite (Projektmenü): Baustein VorlageBereich.
    const Bereich = (await import('../bausteine/VorlageBereich.svelte')).default;
    const vb = render(Bereich).body;
    expect(vb).toContain('Die Vorlage wiederholt die Schritte. Sie prüft nicht, ob sie zu den neuen Daten passen.');
    expect(vb).toContain('Eigene Notizen aus der alten Fassung bleiben unverändert stehen');
    expect(body).not.toContain('ANDERER_Text'); expect(vb).not.toContain('ANDERER_Text');
    const csv = protokollCsv(s.protokoll);
    expect(csv.charCodeAt(0)).toBe(0xFEFF);
    expect(csv.split('\r\n')[0]).toContain('Betroffene Zeilen');
    expect(csv.split('\r\n').length).toBe(1 + s.protokoll.length + 1);
    expect(csv).not.toContain('ANDERER_Text');
    const a = protokollAnhang(s.protokoll, s.datei);
    expect(a.zeilen.length).toBe(s.protokoll.length);
    expect(JSON.stringify(a)).not.toContain('ANDERER_Text');
  });
});
