import { describe, expect, it } from 'vitest';
import ERW from './testdaten/spaeter-f-erwartet.json';
import { s } from './sitzung.svelte';
import type { Spalte } from './verzeichnis';
import type { Wert } from './eingabe';
import { zeitpunkteZuIntervallen, ereignisWerte, istNullEins } from './umformenintervalle';
import { intervallTabelleAus, coxZeitVorbereiten, coxZeitPunkte, coxZeitInfo, schlageZeitSpaltenVor } from './ueberlebenkarte';
import { pruefeIntervalle } from './coxzeit';

/* Später S-F (Bauer A): der Assistent „Zeitpunkte je Person → Intervalle“ als Tabelle (Spalten, Werte, Hinweise) und die Anbindung der Tabelle in Intervall-Form an die Karte. Die Umformung selbst (Zeilen, Regeln) prüft coxzeit.test.ts gegen survival::tmerge. */
s.einst.sprache = 'de'; s.einst.anrede = 'du';
type Z = Record<string, any>;
const J = ((ERW as unknown as Z).coxzeit.umformer.jasa.eingabe) as Z;
const sp = (name: string, o: Partial<Spalte> = {}): Spalte => ({ name, bezeichnung: '', art: 'zahl', niveau: 'metrisch', format: 'F8.2', fehlend: [], fehlendText: '', werteLabels: {}, ...o });
const daten = (kennungText = false) => ({
  spalten: [sp('pat', kennungText ? { art: 'text', format: 'A8' } : {}), sp('ende'), sp('tot'), sp('tx'), sp('alter'), sp('op'), sp('jahr')],
  zeilen: (J.kennung as number[]).map((k, i): Wert[] => [kennungText ? `P${k}` : k, J.ende[i], J.ereignis[i], J.wechsel[i] ?? null, J.age[i], J.surgery[i], J.year[i]])
});
const opt = (o: Partial<Parameters<typeof zeitpunkteZuIntervallen>[1]> = {}) => ({ kennung: 'pat', ende: 'ende', ereignis: 'tot', ereignisWert: null, wechsel: 'tx', fest: ['alter', 'op', 'jahr'], wertName: 'transplantation', regel: 'streng' as const, ...o });

describe('Assistent: Zeitpunkte je Person → Intervalle', () => {
  it('Stanford-Herzdaten streng: 169 Zeilen, Spalten Kennung, start, stopp, ereignis, Größe und die festen; die Größe trägt Labels', () => {
    const u = zeitpunkteZuIntervallen(daten(), opt());
    expect(u.zeilen.length).toBe(169); expect(u.spalten.map(c => c.name)).toEqual(['pat', 'start', 'stopp', 'ereignis', 'transplantation', 'alter', 'op', 'jahr']);
    expect(u.zeilen.every(z => z.length === u.spalten.length)).toBe(true); expect(Object.keys(u.spalten[4]!.werteLabels)).toEqual(['0', '1']);
    expect(u.hinweise.map(h => h.art)).toEqual(['intervalle', 'unsterblich']);
    const h = u.hinweise[0] as Z; expect(h.hinweise).toMatchObject({ personen: 103, zeilen: 169, ereignisse: 75, wechselAmEnde: 1, regel: 'streng' });
  });
  it('Regel „zählt schon“: 170 Zeilen; die Kennung bleibt die ursprüngliche (auch als Text)', () => {
    const u = zeitpunkteZuIntervallen(daten(true), opt({ regel: 'zaehlt' }));
    expect(u.zeilen.length).toBe(170); expect(typeof u.zeilen[0]![0]).toBe('string'); expect(u.spalten[0]!.art).toBe('text');
  });
  it('ohne Kennungsspalte: Zeilennummer als neue Spalte; die Tabelle besteht die Prüfung der Intervall-Form ohne Fehler', () => {
    const u = zeitpunkteZuIntervallen(daten(), opt({ kennung: null }));
    expect(u.spalten[0]!.name).toBe('person'); expect(u.zeilen[0]![0]).toBe(1);
    const p = pruefeIntervalle(u.zeilen.map(z => ({ kennung: z[0] as number, start: z[1] as number, stopp: z[2] as number, ereignis: z[3] as number, wert: z[4] as number })));
    expect(p.fehler).toEqual([]); expect(p.personenMitWechsel).toBe(66);
  });
  it('falsche Wahl wirft „spalten“; keine gültige Person wirft „keine-personen“; Namen mit Anführungszeichen und doppelte Namen werden PSPP-Namen', () => {
    const d = daten();
    expect(() => zeitpunkteZuIntervallen(d, opt({ ende: 'gibtsnicht' }))).toThrow('spalten'); expect(() => zeitpunkteZuIntervallen(d, opt({ ende: 'tot' }))).toThrow('spalten');
    expect(() => zeitpunkteZuIntervallen({ ...d, zeilen: d.zeilen.map(z => z.map((v, i) => (i === 1 ? null : v))) }, opt())).toThrow('keine-personen');
    const u = zeitpunkteZuIntervallen(d, opt({ wertName: "x'); assign('.pwned', TRUE); ('" }));
    expect(u.spalten[4]!.name).toMatch(/^[A-Za-z][A-Za-z0-9_]*$/); expect(new Set(u.spalten.map(c => c.name.toLowerCase())).size).toBe(u.spalten.length);
    const dop = zeitpunkteZuIntervallen({ ...d, spalten: d.spalten.map(c => (c.name === 'alter' ? { ...c, name: 'start' } : c)) }, opt({ fest: ['start', 'op'] }));
    expect(new Set(dop.spalten.map(c => c.name.toLowerCase())).size).toBe(dop.spalten.length);
  });
  it('Ereignisspalte mit Text oder Werten 1/2: die Auswahl des Ereigniswerts', () => {
    const d = daten(); const t = { ...d, spalten: d.spalten.map(c => (c.name === 'tot' ? sp('tot', { art: 'text', format: 'A5' }) : c)), zeilen: d.zeilen.map(z => z.map((v, i) => (i === 2 ? (v === 1 ? 'tot' : 'lebt') : v))) };
    expect(ereignisWerte(t, 'tot')).toEqual(['lebt', 'tot']); expect(istNullEins(ereignisWerte(t, 'tot'))).toBe(false); expect(istNullEins([0, 1])).toBe(true); expect(istNullEins([])).toBe(false);
    const u = zeitpunkteZuIntervallen(t, opt({ ereignisWert: 'tot' })); expect((u.hinweise[0] as Z).hinweise.ereignisse).toBe(75);
    const fehl = { ...d, spalten: d.spalten.map(c => (c.name === 'tot' ? { ...c, fehlend: [9] } : c)), zeilen: d.zeilen.map((z, i) => z.map((v, j) => (j === 2 && i < 3 ? 9 : v))) };
    expect(ereignisWerte(fehl, 'tot')).toEqual([0, 1]);
  });
});

describe('Karte: Tabelle in Intervall-Form → Prüfung und Daten für R', () => {
  const u = zeitpunkteZuIntervallen(daten(), opt());
  const sd = { spalten: u.spalten, zeilen: u.zeilen };
  const c = { kennung: 'pat', start: 'start', stopp: 'stopp', ereignis: 'ereignis', wert: 'transplantation', fest: ['alter', 'op', 'jahr'] };
  it('Vorbereitung: 169 Zeilen, 103 Personen, 75 Ereignisse, die Größe ist 0/1; Prüfung ohne Fehler und ohne Hinweis', () => {
    const v = coxZeitVorbereiten(sd.zeilen, sd.spalten, c, 1);
    expect([v.zeilen.length, v.personen, v.ereignisse, v.binaer, v.ausgelassen]).toEqual([169, 103, 75, true, 0]); expect(v.pruefung.fehler).toEqual([]); expect(v.pruefung.hinweise).toEqual([]);
    expect(v.praed.map(p => p.name)).toEqual(['transplantation', 'alter', 'op', 'jahr']);
    const info = coxZeitInfo(v, c, 169); expect(info).toMatchObject({ personen: 103, zeilen: 169, binaer: true, wechselPersonen: 66 });
  });
  it('Ereigniswert aus einer Text-Spalte; Zeilen mit Lücke in Start oder Stopp fallen weg und werden gezählt', () => {
    const t = { spalten: sd.spalten.map(x => (x.name === 'ereignis' ? { ...x, art: 'text' as const } : x)), zeilen: sd.zeilen.map((z, i) => z.map((v, j) => (j === 3 ? (v === 1 ? 'tot' : 'lebt') : j === 1 && i === 5 ? null : v))) };
    const v = coxZeitVorbereiten(t.zeilen, t.spalten, c, 'tot'); expect(v.ausgelassen).toBe(1); expect(v.ereignisse).toBeLessThanOrEqual(75);
  });
  it('Prüfliste: fehlende Spalten, doppelte Spalten, Text-Prädiktor, Lücke in der Tabelle - jeweils eine Sperre mit Satz', () => {
    const l4 = ['transplantation', 'alter', 'op', 'jahr'], v = coxZeitVorbereiten(sd.zeilen, sd.spalten, c, 1), n = (x: string) => x;
    expect(coxZeitPunkte({ ...c, start: '' }, l4, sd.spalten, null, n)[0]!.art).toBe('sperre');
    expect(coxZeitPunkte({ ...c, wert: '' }, l4, sd.spalten, null, n)[0]!.art).toBe('sperre');
    expect(coxZeitPunkte({ ...c, kennung: 'start' }, l4, sd.spalten, null, n)[0]!.text).toMatch(/mehrfach/);
    const mitText = sd.spalten.map(x => (x.name === 'alter' ? { ...x, art: 'text' as const } : x)); expect(coxZeitPunkte(c, l4, mitText, v, n)[0]!.text).toMatch(/weder eine Zahlenspalte/);
    const zweite = sd.zeilen.findIndex(z => (z[1] as number) > 0), luecke = coxZeitVorbereiten(sd.zeilen.map((z, i) => (i === zweite ? z.map((v, j) => (j === 1 ? (v as number) + 0.25 : v)) : z)), sd.spalten, c, 1); const pl = coxZeitPunkte(c, l4, sd.spalten, luecke, n);
    expect(pl.some(x => x.art === 'sperre')).toBe(true); expect(pl.every(x => !/NaN|undefined/.test(x.text))).toBe(true);
    const ok = coxZeitPunkte(c, l4, sd.spalten, v, n); expect(ok.some(x => x.art === 'sperre')).toBe(false); expect(ok.some(x => x.art === 'ok' && /103 Personen/.test(x.text))).toBe(true); expect(ok.some(x => /bekannt/.test(x.klein ?? ''))).toBe(true);
  });
  it('wenig Wechsel und Ereignisse nur in einem Zustand: Hinweise statt Sperre', () => {
    const wenige = zeitpunkteZuIntervallen({ ...daten(), zeilen: daten().zeilen.map((z, i) => z.map((v, j) => (j === 3 && i > 3 ? null : v))) }, opt());
    const v = coxZeitVorbereiten(wenige.zeilen, wenige.spalten, c, 1), p = coxZeitPunkte(c, ['transplantation', 'alter', 'op', 'jahr'], wenige.spalten, v, x => x);
    expect(p.some(x => x.art === 'hinweis' && /Wechsel/.test(x.text))).toBe(true); expect(p.some(x => x.art === 'sperre')).toBe(false);
  });
  it('Vorschlag der Spalten: Kennung und Start nach dem Namen, die erste Angabe als zeitabhängige Größe', () => {
    const sp2 = [sp('id'), sp('start'), sp('stopp'), sp('ereignis'), sp('wert'), sp('alter')];
    expect(schlageZeitSpaltenVor(sp2, 'stopp', 'ereignis', ['wert', 'alter'])).toEqual({ kennung: 'id', start: 'start', wert: 'wert' });
    expect(schlageZeitSpaltenVor([sp('a'), sp('b')], 'a', 'b', [])).toEqual({ kennung: '', start: '', wert: '' });
  });
  it('intervallTabelleAus: „keine Angabe“-Codes in Zahlenspalten werden Lücken', () => {
    const t = intervallTabelleAus(sd.zeilen, sd.spalten.map(x => (x.name === 'alter' ? { ...x, fehlend: [-8] } : x)), c, 1);
    expect(t.fest.alter!.length).toBe(sd.zeilen.length); expect(t.kennung.length).toBe(sd.zeilen.length);
  });
});

describe('Gruppen unter den festen Größen und das Vorziehen am Ereignistag', () => {
  it('Gruppen-Spalte (Text oder Codes mit Beschriftungen) wird Faktor mit Vergleichsgruppe zuerst; Zahlen bleiben linear', async () => {
    const { coxZpDaten, coxZpAufruf } = await import('./coxzeit');
    const d = daten();
    const text = { spalten: [...d.spalten, sp('klasse', { art: 'text', format: 'A3', niveau: 'nominal' })], zeilen: d.zeilen.map((z, i) => [...z, ['b', 'a', 'c'][i % 3]!] as Wert[]) };
    const u = zeitpunkteZuIntervallen(text, opt({ fest: ['alter', 'klasse'] }));
    const c = { kennung: 'pat', start: 'start', stopp: 'stopp', ereignis: 'ereignis', wert: 'transplantation', fest: ['alter', 'klasse'] };
    const v = coxZeitVorbereiten(u.zeilen, u.spalten, c, 1);
    expect(v.faktoren).toEqual({ klasse: ['a', 'b', 'c'] }); expect(v.praed.map(p => p.art)).toEqual(['zahl', 'zahl', 'faktor']);
    const dt = coxZpDaten(v.zeilen, { wertName: 'transplantation', festNamen: c.fest, faktoren: v.faktoren });
    expect(dt.spalten[6]!.art).toBe('faktor'); expect(new Set(dt.spalten[6]!.werte)).toEqual(new Set([1, 2, 3])); expect((dt.spalten[6] as { labels: { wert: number; label: string }[] }).labels).toEqual([{ wert: 1, label: 'a' }, { wert: 2, label: 'b' }, { wert: 3, label: 'c' }]);
    expect(coxZpAufruf(dt)).toContain("c('p01', 'p02', 'p03'), c('p03'), 'efron'"); expect(dt.spalten[5]!.art).toBe('zahl');
    const p = coxZeitPunkte(c, ['transplantation', 'alter', 'klasse'], u.spalten, v, x => x); expect(p.some(x => /als Gruppe gerechnet: Vergleichsgruppe ist „a“/.test(x.text))).toBe(true); expect(p.some(x => x.art === 'sperre')).toBe(false);
  });
  it('Codes 1 bis 3 mit Wertebeschriftungen werden nicht linear gerechnet; eine Textspalte mit 20 Stufen wird gesperrt', () => {
    const d = daten();
    const mit = { spalten: [...d.spalten, sp('typ', { niveau: 'nominal', werteLabels: { '1': 'x', '2': 'y', '3': 'z' } })], zeilen: d.zeilen.map((z, i) => [...z, (i % 3) + 1] as Wert[]) };
    const u = zeitpunkteZuIntervallen(mit, opt({ fest: ['typ'] })), c = { kennung: 'pat', start: 'start', stopp: 'stopp', ereignis: 'ereignis', wert: 'transplantation', fest: ['typ'] };
    expect(coxZeitVorbereiten(u.zeilen, u.spalten, c, 1).faktoren).toEqual({ typ: ['x', 'y', 'z'] });
    const viele = { spalten: [...d.spalten, sp('ort', { art: 'text', format: 'A3', niveau: 'nominal' })], zeilen: d.zeilen.map((z, i) => [...z, `o${i % 20}`] as Wert[]) };
    const u2 = zeitpunkteZuIntervallen(viele, opt({ fest: ['ort'] })), c2 = { ...c, fest: ['ort'] }, v2 = coxZeitVorbereiten(u2.zeilen, u2.spalten, c2, 1);
    expect(v2.faktoren).toEqual({}); expect(coxZeitPunkte(c2, ['transplantation', 'ort'], u2.spalten, v2, x => x)[0]!.text).toMatch(/weder eine Zahlenspalte noch eine Gruppe/);
  });
  it('Vorziehen „zählt schon“: die Hälfte des kleinsten Zeitabstands; bei Jahren ein Bruchteil, nie vor den Beginn; der Satz nennt den Betrag', async () => {
    const { umformenWechsel } = await import('./coxzeit'), { umformSatz } = await import('./coxzeitsaetze');
    const jahre = umformenWechsel({ kennung: ['a', 'b', 'c'], ende: [2.5, 4, 0.3], ereignis: [1, 1, 1], wechsel: [2.5, 1.5, 0.3] }, { regel: 'zaehlt' }) as Z;
    expect(jahre.vorzug).toBeCloseTo(0.15, 12);   // Zeitwerte 0; 0,3; 1,5; 2,5; 4 → kleinster Abstand 0,3 → halber 0,15
    const c = jahre.zeilen.filter((r: Z) => r.person === 3); expect(c.map((r: Z) => [r.start, r.stopp, r.wert])).toEqual([[0, 0.15, 0], [0.15, 0.3, 1]]);
    expect(jahre.zeilen.every((r: Z) => r.start >= 0 && r.stopp > r.start)).toBe(true);
    expect(umformSatz(jahre.hinweise, jahre.vorzug)).toContain('um 0,15 Zeiteinheiten vorgezogen');
    const tage = umformenWechsel({ kennung: ['a', 'b'], ende: [10, 9], ereignis: [1, 1], wechsel: [10, 3] }, { regel: 'zaehlt' }) as Z; expect(tage.vorzug).toBe(0.5);   // Zeitwerte 0; 3; 9; 10 → kleinster Abstand 1
    expect((umformenWechsel({ kennung: ['a'], ende: [10], ereignis: [1], wechsel: [10] }) as Z).vorzug).toBeUndefined();
  });
});
