/** Fallgewicht im Projekt (Welle S-A, Teil 1): Prüfung der Spalte, Lage, Vorschlag, Projektdatei, Datenstand der Blätter, Verlauf. */
import { beforeEach, describe, expect, it } from 'vitest';
import { s } from './sitzung.svelte';
import { aktivesGewicht, gewichtFehlerSatz, gewichtHinweise, gewichtLage, gewichtPruefung, gewichtVorschlag, gewichtsKandidaten, pruefeSpalte } from './fallgewicht.svelte';
import { projektAlsDatei, leseProjektdatei } from './projektdatei';
import { standVon } from './blattstand';
import { anhaengen } from './verlauf';
import { stichprobenText } from './berichtsatz';

const sp = (name: string, art = 'zahl', extra: object = {}) => ({ name, bezeichnung: '', art, werteLabels: {}, fehlend: [] as number[], niveau: 'scale', ...extra }) as never;
const daten = (w: (number | null)[], y: number[] = w.map((_, i) => i)) => ({ spalten: [sp('y'), sp('w'), sp('gruppe', 'text')], zeilen: w.map((x, i) => [y[i]!, x, 'a']) });
beforeEach(() => { s.einst.sprache = 'de'; s.einst.anrede = 'du'; Object.assign(s, { gewicht: undefined, gewichtFrage: null, spalten: [], zeilen: [], sets: [] }); });
const lade = (w: (number | null)[]) => { const d = daten(w); Object.assign(s, { spalten: d.spalten, zeilen: d.zeilen }); };

describe('Spalte prüfen und Lage', () => {
  it('Kandidaten sind nur Zahlenspalten', () => { lade([1, 2]); expect(gewichtsKandidaten().map(x => x.name)).toEqual(['y', 'w']); });
  it('ohne Gewicht: Lage „aus“, kein aktives Gewicht', () => { lade([1, 2]); expect(gewichtLage().art).toBe('aus'); expect(aktivesGewicht()).toBeUndefined(); expect(gewichtPruefung()).toBeNull(); });
  it('Häufigkeitsgewicht gilt: Summe und Zeilen; Zeilen mit 0 und fehlende zählen nicht, mit Zahl', () => {
    lade([2, 0, 3, null]); s.gewicht = { spalte: 'w', art: 'haeufigkeit' };
    const l = gewichtLage();
    expect(l.art).toBe('gilt');
    expect(aktivesGewicht()).toEqual({ spalte: 'w', art: 'haeufigkeit', summe: 5, zeilen: 2 });
    const r = pruefeSpalte('w', 'haeufigkeit');
    expect([r.nullZeilen, r.fehlendZeilen]).toEqual([1, 1]);
    const h = gewichtHinweise(r, { spalte: 'w', art: 'haeufigkeit' });
    expect(h.some(x => /1 Zeile hat das Fallgewicht 0/.test(x))).toBe(true);
    expect(h.some(x => /1 Zeile hat kein Fallgewicht/.test(x))).toBe(true);
  });
  it('Spaltenname ohne Beachtung von Groß/klein; „keine Angabe“-Wert der Spalte gilt als fehlend', () => {
    const d = daten([1, 99, 3]); d.spalten[1] = sp('w', 'zahl', { fehlend: [99] });
    Object.assign(s, { spalten: d.spalten, zeilen: d.zeilen, gewicht: { spalte: 'W', art: 'haeufigkeit' } });
    expect(aktivesGewicht()).toEqual({ spalte: 'W', art: 'haeufigkeit', summe: 4, zeilen: 2 });
    expect(pruefeSpalte('w', 'haeufigkeit').fehlendZeilen).toBe(1);
  });
  it('Kommagewicht als Häufigkeit: Lage „fehler“ mit Satz und Angebot Umfragegewicht; negativ: Fehler', () => {
    lade([1.5, 2]); s.gewicht = { spalte: 'w', art: 'haeufigkeit' };
    const l = gewichtLage();
    expect(l.art).toBe('fehler'); expect(aktivesGewicht()).toBeUndefined();
    if (l.art === 'fehler') { expect(gewichtFehlerSatz(l.pruefung, l.gewicht)).toContain('Umfragegewicht'); expect(gewichtFehlerSatz(l.pruefung, l.gewicht)).toContain('ganze Zahl'); }
    lade([1, -2]); s.gewicht = { spalte: 'w', art: 'umfrage' };
    const n = gewichtLage(); expect(n.art).toBe('fehler');
    if (n.art === 'fehler') expect(gewichtFehlerSatz(n.pruefung, n.gewicht)).toContain('negativ');
  });
  it('Pflichtfrage offen: Lage „frage“, kein aktives Gewicht (kein Blatt rechnet)', () => {
    lade([1, 2]); s.gewichtFrage = 'w';
    expect(gewichtLage()).toEqual({ art: 'frage', spalte: 'w' }); expect(aktivesGewicht()).toBeUndefined();
  });
  it('Umfragegewicht: Kish-Hinweis; Summe sehr groß bei Häufigkeit: Hinweis', () => {
    lade([0.6, 1.4, 0.8, 2.1]);
    const u = gewichtHinweise(pruefeSpalte('w', 'umfrage'), { spalte: 'w', art: 'umfrage' });
    expect(u.some(x => /Effektive Stichprobengröße etwa 3,3 statt 4 Personen/.test(x))).toBe(true);
    lade([80000000, 50000000, 30000000]);
    const h = gewichtHinweise(pruefeSpalte('w', 'haeufigkeit'), { spalte: 'w', art: 'haeufigkeit' });
    expect(h.some(x => /sieht nach einem Umfragegewicht aus/.test(x))).toBe(true);
  });
  it('Zwischenspeicher: dieselbe Prüfung, solange Zeilen und Wahl gleich sind; neue Zeilen = neue Prüfung', () => {
    lade([1, 2]); s.gewicht = { spalte: 'w', art: 'haeufigkeit' };
    const a = gewichtPruefung(); expect(gewichtPruefung()).toBe(a);
    s.zeilen = [...s.zeilen, [9, 5, 'a']];
    expect(gewichtPruefung()).not.toBe(a); expect(gewichtPruefung()!.summe).toBe(8);
  });
});

describe('Vorschlag der Daten-Seite (nur Vorschlag, nie von selbst)', () => {
  const mit = (name: string, w: (number | null)[]) => { const d = daten(w); d.spalten[1] = sp(name); Object.assign(s, { spalten: d.spalten, zeilen: d.zeilen }); };
  it('Name wie Gewicht und nur positive Zahlen: Vorschlag', () => { for (const n of ['w', 'gewicht', 'Weight', 'wgt', 'gew_h', 'w_haushalt', 'Gewichtung']) { mit(n, [1, 2, 0.5]); expect(gewichtVorschlag()?.name, n).toBe(n); } });
  it('Keine Vorschläge bei Nullen, Lücken, anderem Namen, oder wenn schon eines gilt', () => {
    mit('w', [1, 0, 2]); expect(gewichtVorschlag()).toBeNull();
    mit('w', [1, null, 2]); expect(gewichtVorschlag()).toBeNull();
    mit('alter', [1, 2, 3]); expect(gewichtVorschlag()).toBeNull();
    mit('w', [1, 2, 3]); s.gewicht = { spalte: 'w', art: 'umfrage' }; expect(gewichtVorschlag()).toBeNull();
    s.gewicht = undefined; s.gewichtFrage = 'w'; expect(gewichtVorschlag()).toBeNull();
  });
});

describe('Projektdatei, Datenstand der Blätter, Verlauf', () => {
  const proj = (g?: { spalte: string; art: string }) => ({ name: 'p', quelle: 'q', sav: new Uint8Array([1]), blaetter: [], entscheid: {}, zeit: 1, ...(g ? { gewicht: g as never } : {}) });
  it('Projektdatei: Fallgewicht hin und zurück; alte Dateien und kaputte Angaben: ungewichtet', () => {
    expect(leseProjektdatei(projektAlsDatei(proj({ spalte: 'w', art: 'haeufigkeit' }))).gewicht).toEqual({ spalte: 'w', art: 'haeufigkeit' });
    expect(leseProjektdatei(projektAlsDatei(proj())).gewicht).toBeUndefined();
    const roh = JSON.parse(new TextDecoder().decode(projektAlsDatei(proj()))); roh.gewicht = { spalte: 'w', art: 'unsinn' };
    expect(leseProjektdatei(new TextEncoder().encode(JSON.stringify(roh))).gewicht).toBeUndefined();
    roh.gewicht = 'w'; expect(leseProjektdatei(new TextEncoder().encode(JSON.stringify(roh))).gewicht).toBeUndefined();
  });
  it('Datenstand: ein Fallgewicht (Spalte, Art oder Werte) ändert den Stand aller Blätter; ohne Gewicht bleibt der alte Stand', () => {
    const d = daten([1, 2, 3]), w = { l1: ['y'], l2: [], l3: [], l4: [] };
    const ohne = standVon(w, { ...d, sets: [] });
    expect(standVon(w, { ...d, sets: [], gewicht: undefined })).toBe(ohne);
    const mitH = standVon(w, { ...d, sets: [], gewicht: { spalte: 'w', art: 'haeufigkeit' } });
    expect(mitH).not.toBe(ohne);
    expect(standVon(w, { ...d, sets: [], gewicht: { spalte: 'w', art: 'umfrage' } })).not.toBe(mitH);
    const d2 = daten([1, 2, 4]);
    expect(standVon(w, { ...d2, sets: [], gewicht: { spalte: 'w', art: 'haeufigkeit' } })).not.toBe(mitH);
    expect(standVon(w, { ...d, sets: [], gewicht: { spalte: 'w', art: 'haeufigkeit' } })).toBe(mitH);
  });
  it('Verlauf: ein Schritt hält das Fallgewicht, das zu seinem Datenstand gehört (null = ungewichtet)', () => {
    const l = anhaengen([], { text: 'a', sav: new Uint8Array(1), entscheid: {}, gewicht: null });
    const m = anhaengen(l, { text: 'b', sav: new Uint8Array(1), entscheid: {}, gewicht: { spalte: 'w', art: 'umfrage' } });
    expect(m.map(x => x.gewicht)).toEqual([null, { spalte: 'w', art: 'umfrage' }]);
  });
});

describe('Einleitungssatz des Berichts mit Fallgewicht', () => {
  const b = (gewicht?: object) => ({ id: 'x', titel: 't', art: 'kreuz', l1: null, l2: null, syntax: '', items: [], ergebnis: null, imBericht: true, notiz: '', zeit: 1, ...(gewicht ? { gewicht } : {}) }) as never;
  it('Häufigkeitsgewicht: „nahmen 14 Personen teil“ wäre falsch - der Satz nennt Zeilen und N', () => {
    const t = stichprobenText([b({ spalte: 'w', art: 'haeufigkeit', summe: 29, zeilen: 12 })], 14, false).text;
    expect(t).not.toContain('nahmen'); expect(t).toContain('Die Daten enthalten 14 Zeilen.'); expect(t).toContain('N = 29 aus 12 Zeilen');
  });
  it('Umfragegewicht: eine Zeile ist eine Person; ungewichtet: wie bisher', () => {
    expect(stichprobenText([b({ spalte: 'w', art: 'umfrage', summe: 9.1, zeilen: 8 })], 8, false).text).toContain('An der Untersuchung nahmen 8 Personen teil.');
    expect(stichprobenText([b()], 8, false).text).toBe('An der Untersuchung nahmen 8 Personen teil.');
  });
});
