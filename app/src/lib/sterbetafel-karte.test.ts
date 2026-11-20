import { describe, expect, it } from 'vitest';
import ERW from './testdaten/spaeter-f-erwartet.json';
import { s } from './sitzung.svelte';
import { kaplanAus } from './ueberleben';
import { sterbetafelAusKaplan } from './sterbetafel';
import { sterbetafelHinweise, sterbetafelFehlerSatz, saetzeSterbetafel, tabellenSterbetafel, intervallText } from './sterbetafelsaetze';
import { saetzeKaplan, tabellenKaplan } from './ueberlebensaetze';
import { zahlFeld } from './ueberlebenwahl';

/* Später S-F (Bauer A): die Sterbetafel in der Karte Kaplan-Meier - aus dem Ergebnis der Karte (Kaplan), Sätze, Hinweise, Tabellen. Die Zahlen der Tafel selbst prüft sterbetafel.test.ts gegen R. */
s.einst.sprache = 'de'; s.einst.anrede = 'du';
type Z = Record<string, any>;
const L = ((ERW as unknown as Z).sterbetafel.daten as Z).lung as Z;
const zeit = L.zeit as number[], ereignis = L.ereignis as number[], sex = (L.geschlecht as number[]).map(v => v - 1);
const kaplan = (gruppen: number[] | null, namen: string[]) => kaplanAus(zeit.map((t, i) => [gruppen ? gruppen[i]! : 0, t, ereignis[i] === 1 ? 1 : 0] as [number, number, 0 | 1]), { zeit: 'zeit', ereignis: 'status', gruppe: gruppen ? 'sex' : '', gruppenNamen: namen, werte: ['zensiert', 'tot'], ereignisIndex: 1, zeilen: zeit.length, ausgelassen: 0 });
const keinNaN = (x: unknown) => expect(JSON.stringify(x)).not.toMatch(/NaN|undefined/);

describe('Sterbetafel aus dem Ergebnis der Karte (lung)', () => {
  it('ohne Gruppen: Voreinstellung der Intervalle (Breite 100, Ende 1000), Median 319,38, kein Test', () => {
    const a = sterbetafelAusKaplan(kaplan(null, ['']), { einheit: 'Tagen' }) as Z;
    expect(a.fehler).toBeUndefined(); expect([a.breite, a.ende, a.anfaenge.length, a.aufgerundet]).toEqual([100, 1000, 11, false]);
    expect(a.gesamt.median.wert).toBeCloseTo(319.3774, 4); expect(a.gruppen).toEqual([]); expect(a.gehan).toBeNull(); expect(a.paarweise).toEqual([]); keinNaN(a);
  });
  it('nach Geschlecht: je Gruppe eine Tafel, Wilcoxon (Gehan) näherungsweise D = 13,528, ein Paar entfällt (zwei Gruppen)', () => {
    const a = sterbetafelAusKaplan(kaplan(sex, ['Männer', 'Frauen']), { breite: 100, ende: 1000 }) as Z;
    expect(a.gruppen.map((g: Z) => g.name)).toEqual(['Männer', 'Frauen']); expect(a.gruppen.every((g: Z) => g.tafel)).toBe(true);
    expect(a.gehan.D).toBeCloseTo(13.52836, 4); expect(a.gehan.df).toBe(1); expect(a.paarweise).toEqual([]);
    expect(a.gruppen[0].tafel.median.wert).toBeCloseTo(262.6827, 3); expect(a.gruppen[1].tafel.zeilen.length).toBe(10); keinNaN(a);
  });
  it('drei Gruppen: drei Paare mit Holm (nie kleiner als das einfache p), df = 2', () => {
    const ecog = (L.ecog as (number | null)[]), i = ecog.map((v, k) => (v !== null && v < 3 ? k : -1)).filter(k => k >= 0);
    const k = kaplanAus(i.map(j => [ecog[j]!, zeit[j]!, ereignis[j] === 1 ? 1 : 0] as [number, number, 0 | 1]), { zeit: 'zeit', ereignis: 'status', gruppe: 'ecog', gruppenNamen: ['0', '1', '2'], werte: ['zensiert', 'tot'], ereignisIndex: 1, zeilen: i.length, ausgelassen: 0 });
    const a = sterbetafelAusKaplan(k, { breite: 100, ende: 1000 }) as Z;
    expect(a.gehan.df).toBe(2); expect(a.paarweise.length).toBe(3); a.paarweise.forEach((p: Z) => { expect(p.pHolm).toBeGreaterThanOrEqual(p.p - 1e-15); expect(p.pHolm).toBeLessThanOrEqual(1); expect(p.name).toMatch(/ - /); }); keinNaN(a);
  });
  it('Fehler der Wahl als Code mit Satz, nie ein Absturz: Breite 0 oder Unsinn, Ende 0, zu viele Intervalle, zu große Breite', () => {
    const k = kaplan(null, ['']);
    for (const [o, code] of [[{ breite: 0 }, 'breite'], [{ breite: NaN }, 'breite'], [{ breite: 100, ende: 0 }, 'zu-wenige-intervalle'], [{ breite: 5000 }, 'zu-wenige-intervalle'], [{ breite: 10, ende: 1000 }, 'zu-viele-intervalle'], [{ ende: NaN }, 'zu-wenige-intervalle']] as const) {
      const a = sterbetafelAusKaplan(k, o as never) as Z; expect(a.fehler, JSON.stringify(o)).toBe(code); expect(sterbetafelFehlerSatz(a.fehler)).toMatch(/[.!?]$/);
    }
  });
  it('zahlFeld: Komma und Punkt, leer = Voreinstellung, Unsinn = NaN', () => {
    expect(zahlFeld('')).toBeNull(); expect(zahlFeld(' 12,5 ')).toBe(12.5); expect(zahlFeld('7.25')).toBe(7.25); expect(Number.isNaN(zahlFeld('abc') as number)).toBe(true); expect(Number.isNaN(zahlFeld('1;2') as number)).toBe(true);
  });
});

describe('Das Fach ändert nie einen Rechenweg', () => {
  it('Sterbetafel und Sätze sind mit zwei Fächern gleich', () => {
    const lauf = () => { const a = sterbetafelAusKaplan(kaplan(sex, ['Männer', 'Frauen']), { einheit: 'Tagen' }) as never as import('./sterbetafel').SterbetafelAnzeige; return JSON.stringify([a, saetzeSterbetafel(a), tabellenSterbetafel(a)]); };
    const alt = s.einst.fach;
    try { s.einst.fach = 'bildung' as never; const a = lauf(); s.einst.fach = 'medizin' as never; expect(lauf()).toBe(a); } finally { s.einst.fach = alt; }
  });
});

describe('Sätze, Hinweise und Tabellen der Karte', () => {
  const k = kaplan(sex, ['Männer', 'Frauen']);
  const a = sterbetafelAusKaplan(k, { breite: 100, ende: 1000, einheit: 'Tagen' }) as never as import('./sterbetafel').SterbetafelAnzeige;
  it('Sätze sind ganze Sätze ohne NaN; der Testsatz steht in der Zusammenfassung der Karte', () => {
    const t = saetzeSterbetafel(a); keinNaN(t);
    expect(t.haupt).toMatch(/Sterbetafel/); expect(t.haupt).toContain('Männer'); expect(t.zusatz).toContain('χ²(1) = 13,53'); expect(t.vorsicht).toMatch(/Log-Rank/);
    const km = saetzeKaplan({ ...k, sterbe: a }, x => x); expect(km.zusatz).toContain('Wilcoxon (Gehan)'); expect(km.apa).toContain('Sterbetafel'); keinNaN(km);
  });
  it('Hinweise: Kaplan-Meier-Unterschied, kein Verweis auf den IBM-Text, offenes Intervall - und bei sehr ungleicher Zensierung eine Warnung', () => {
    const h = sterbetafelHinweise(a); expect(h.map(x => x.text).join(' ')).toMatch(/kein Kaplan-Meier/); expect(h.map(x => `${x.text} ${x.klein ?? ''}`).join(' ')).not.toMatch(/IBM/); expect(h.some(x => /offen/.test(x.text))).toBe(true);
    const ungleich = { ...a, gruppen: a.gruppen.map((g, i) => (i === 0 ? { ...g, tafel: { ...g.tafel!, zensiert: 0, n: 100 } } : { ...g, tafel: { ...g.tafel!, zensiert: 60, n: 100 } })) };
    expect(sterbetafelHinweise(ungleich).some(x => /verschieden zensiert/.test(x.text))).toBe(true);
    expect(sterbetafelHinweise({ ...a, gesamt: { ...a.gesamt, n: 12 } }).some(x => /Wenige Fälle/.test(x.text))).toBe(true);
  });
  it('Tabellen: Tafel gesamt und je Gruppe, Median, Test; das offene Intervall hat Striche statt NaN; Zeilen der Karte hängen sie an', () => {
    const t = tabellenSterbetafel(a); expect(t.length).toBe(1 + 2 + 1 + 1); keinNaN(t);
    const km = tabellenKaplan({ ...k, sterbe: a }, x => x); expect(km.length).toBeGreaterThan(t.length); expect(km.some(x => x.label === 'Life Table')).toBe(true); expect(km.some(x => x.label === 'Wilcoxon Gehan')).toBe(true);
    expect(intervallText(a.gesamt.zeilen[0]!)).toBe('0 bis unter 100'); expect(intervallText(a.gesamt.zeilen[10]!)).toBe('1000 und mehr');
  });
  it('Zeiteinheit als gewähltes Wort: „Zeiteinheit: Tage“ steht für sich, nie hinter einer Zahl; ohne Wahl steht keine Einheit; freier Text steht hinter der Zahl', () => {
    const mit = (einheit: string) => saetzeSterbetafel({ ...a, einheit }).haupt;
    expect(mit('tage')).toContain('Intervallen der Breite 100 gerechnet (Zeiteinheit: Tage; n = 228'); expect(mit('tage')).not.toMatch(/\d Tage/);
    expect(mit('monate')).toContain('Zeiteinheit: Monate'); expect(mit('')).not.toMatch(/Zeiteinheit/); expect(mit('')).toMatch(/Zum Zeitpunkt \d+ hatten noch/); keinNaN(mit(''));
    expect(mit('Tagen')).toContain('Intervallen von 100 Tagen');
    s.einst.sprache = 'en';
    try { expect(mit('jahre')).toContain('(time unit: years; n = 228'); } finally { s.einst.sprache = 'de'; }
    expect(JSON.stringify(tabellenSterbetafel({ ...a, einheit: 'wochen' }))).toContain('Zeiteinheit: Wochen.');
  });
  it('englisch: keine deutschen Reste in den Wörtern der Tafel', () => {
    s.einst.sprache = 'en';
    try { const t = saetzeSterbetafel(a); expect(t.haupt).toMatch(/life table/); expect(`${t.haupt} ${t.zusatz} ${t.vorsicht}`).not.toMatch(/Sterbetafel|Intervallen|Ereignisse/); keinNaN(tabellenSterbetafel(a)); } finally { s.einst.sprache = 'de'; }
  });
});
