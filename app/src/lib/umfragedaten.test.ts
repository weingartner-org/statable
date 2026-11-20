import { describe, expect, it } from 'vitest';
import ERW from './testdaten/spaeter-d2-erwartet.json';
import { s } from './sitzung.svelte';
import { gewichtetBeschreiben, tabellenGewichtet, saetzeGewichtet, type Quelle } from './gewichtbeschreibend';
import { planVerteilung, verteilungLesen, pruefeVerteilung, planKreuz, kreuzLesen, pruefeKreuz, UMFRAGE_MAX_KATEGORIEN } from './umfragedaten';
import { umfrageGrenze } from './umfrage';
import type { GewichtAbdruck } from './gewichte';
import { komma } from './ergebnis';

/* Später S-D2, Bauer A2: der reine Teil der Anbindung (Auftrag an R, Antwort lesen, Selbstprüfung, Tabellen und Sätze). R selbst läuft in engine/umfrage.webr.test.ts gegen dieselben Sollwerte. */
s.einst.sprache = 'de'; s.einst.anrede = 'du';
type Z = Record<string, any>;
const J = ERW as unknown as Z;
const fall = (id: string): Z => (J.faelle as Z[]).find(f => f.id === id)!;
const sp = J.daten.apistrat.spalten as Record<string, number[]>;
const alsWebR = (x: any, schluessel = ''): any => (x === null ? { type: 'null' } : Array.isArray(x) ? x.map(v => alsWebR(v, schluessel)) : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, alsWebR(v, k)])) : schluessel === 'warnungen' ? x : [x]);
const abdruck: GewichtAbdruck = { spalte: 'pw', art: 'umfrage', klumpenfrei: true, summe: sp.pw!.reduce((a, b) => a + b, 0), zeilen: 200, rechenweg: 'survey', surveyVersion: '4.5' };
const quelle = (namen: string[]): Quelle => ({ spalten: namen.map(name => ({ name, art: 'zahl', fehlend: [], werteLabels: {} })) as Quelle['spalten'], zeilen: sp.pw!.map((_, i) => namen.map(n => sp[n]![i]!)), w: sp.pw! });
const name = (x: string) => x, wert = (_: string, w: string | number) => String(w);

describe('Auftrag an R: Karte Verteilung', () => {
  const q = quelle(['api00', 'hoch700', 'stype']);
  const e = gewichtetBeschreiben('verteilung', { l1: ['api00', 'hoch700'], l2: [] }, q, abdruck);
  it('Zahlenspalte → Mittelwert (m1), Kategorie-Spalte → Anteil (a1) mit Codes 1, 2, …; alle Zeilen mit Gewicht über 0', () => {
    const p = planVerteilung(e, q, 650);
    expect(p.zeilen).toBe(200); expect(p.mittel).toEqual(['api00']);
    expect(p.spalten.map(x => x.name)).toEqual(['w', 'm1', 'a1', ...(e.kategorien.length > 1 ? ['a2'] : [])].slice(0, p.spalten.length));
    const auf = p.auftraege.map(a => a.aufruf).join('\n'); expect(auf).toContain("sp_umfrage_mittel(d, c('m1'), 'w', NULL, 650)"); expect(auf).toContain("sp_umfrage_anteil(d, 'a1', 'w', NULL, c(1, 2))");
    expect(p.anteile[0]!.werte).toEqual([0, 1]); expect(p.spalten.find(x => x.name === 'a1')!.werte.every(v => v === 1 || v === 2)).toBe(true);
    expect(planVerteilung(e, q, null).auftraege[0]!.aufruf).toContain("'w', NULL, NULL)");
  });
  it('Zeilen ohne Gewicht gehen nicht an R', () => {
    const w = sp.pw!.map((x, i) => (i < 10 ? 0 : x)), q2 = { ...q, w };
    expect(planVerteilung(gewichtetBeschreiben('verteilung', { l1: ['api00'], l2: [] }, q2, abdruck), q2, null).zeilen).toBe(190);
  });
  it('mehr als 30 Kategorien: die 30 häufigsten bekommen ein Intervall, die Tabelle sagt es', () => {
    const viele = { spalten: [{ name: 'k', art: 'zahl', fehlend: [], werteLabels: {}, niveau: 'nominal' }] as Quelle['spalten'], zeilen: Array.from({ length: 400 }, (_, i) => [i % 40]), w: Array(400).fill(1) };
    const ev = gewichtetBeschreiben('verteilung', { l1: ['k'], l2: [] }, viele, abdruck), p = planVerteilung(ev, viele, null);
    expect(ev.kategorien[0]!.werte.length).toBe(40); expect(p.anteile[0]!.codes.length).toBe(UMFRAGE_MAX_KATEGORIEN); expect(p.anteile[0]!.abgeschnitten).toBe(true);
  });
  it('Grenzen vor R: 200 001 Zeilen, 401 Zellen', () => { expect(umfrageGrenze(200001)).toBe('zu-viele-zeilen'); expect(umfrageGrenze(10, 401)).toBe('zu-viele-zellen'); });
});

describe('Antwort lesen, Selbstprüfung, Tabellen und Sätze: Karte Verteilung', () => {
  const q = quelle(['api00', 'hoch700']);
  const e = gewichtetBeschreiben('verteilung', { l1: ['api00', 'hoch700'], l2: [] }, q, abdruck);
  const plan = planVerteilung(e, q, 650);
  // Antwort von R: Mittelwert aus P2, Anteil aus P4a mit den Codes von Statable (Wert 0 → Code 1, Wert 1 → Code 2)
  const anteilR = { ...fall('P4a').soll, kategorien: fall('P4a').soll.kategorien.map((k: Z) => ({ ...k, wert: k.wert + 1 })) };
  const antwort = alsWebR({ mittel: fall('P2').soll, anteile: { a1: anteilR } });
  const gelesen = verteilungLesen(plan, antwort, 650, 'logit');
  it('wird gelesen: camelCase, Skalare statt Vektoren', () => {
    expect('ok' in gelesen).toBe(true); if (!('ok' in gelesen)) return;
    expect(gelesen.ok.mittel!.e.ergebnisse[0].kiU).toBeCloseTo(643.385314, 5); expect(gelesen.ok.anteile[0]!.e.kategorien[1].logit.o).toBeCloseTo(0.4815624, 6); expect(gelesen.ok.survey).toBe('4.5');
  });
  it('Selbstprüfung: gleiche Punktschätzer → null; ein verstellter Mittelwert → Abweichung mit Namen', () => {
    if (!('ok' in gelesen)) return;
    expect(pruefeVerteilung(e, gelesen.ok)).toBeNull();
    const falsch = structuredClone(gelesen.ok); falsch.mittel!.e.ergebnisse[0].mittel += 1;
    const a = pruefeVerteilung(e, falsch); expect(a).not.toBeNull(); expect(a!.was).toBe('api00');
    const falsch2 = structuredClone(gelesen.ok); falsch2.anteile[0]!.e.kategorien[1].p = 0.5; expect(pruefeVerteilung(e, falsch2)).not.toBeNull();
  });
  it('Fehler von R als Text → { fehler }; Fehler der Rechnung bleibt im Ergebnis', () => {
    expect(verteilungLesen(plan, alsWebR({ mittel: { fehler: 'kaputt' }, anteile: {} }), 650, 'logit')).toEqual({ fehler: 'kaputt' });
    const r = verteilungLesen(plan, alsWebR({ mittel: { fehler_code: 'zu-viele-zeilen', n: 250000 }, anteile: {} }), 650, 'logit');
    expect('ok' in r && r.ok.fehler?.fehlerCode).toBe('zu-viele-zeilen');
  });
  it('Tabellen: Mittelwert mit Intervall und Test, Häufigkeiten mit SE und Intervall; „Nur beschreibend“ fällt weg', () => {
    if (!('ok' in gelesen)) return;
    const mitDesign = { ...e, design: gelesen.ok }, t = tabellenGewichtet(mitDesign, name, wert), labels = t.map(x => x.label);
    expect(labels).toContain('Weighted Mean Interval'); expect(labels).toContain('Weighted Frequencies');
    const m = t.find(x => x.label === 'Weighted Mean Interval')!, zellen = m.cells.map(c => c.t).join('|');
    expect(zellen).toContain('662.29'); expect(zellen).toContain('643.39'); expect(zellen).toContain('681.19'); expect(zellen).toContain('1.28'); expect(zellen).toContain('.201');
    const h = t.find(x => x.label === 'Weighted Frequencies')!, hz = h.cells.map(c => c.t).join('|');
    expect(hz).toContain('40.4'); expect(hz).toContain('33.2'); expect(hz).toContain('48.2');
    expect(t.flatMap(x => x.footnotes.map(f => f.t)).join(' ')).not.toContain('Nur beschreibend: Statable zeigt mit einem Umfragegewicht keine Tests');
    const beta = tabellenGewichtet({ ...e, design: { ...gelesen.ok, anteilKi: 'beta' } }, name, wert).find(x => x.label === 'Weighted Frequencies')!.cells.map(c => c.t).join('|');
    expect(beta).toContain('32.9'); expect(beta).toContain('48.4');
    expect(tabellenGewichtet(e, name, wert).map(x => x.label)).not.toContain('Weighted Mean Interval');   // ohne Design: wie vor S-D2
  });
  it('Sätze: Mittelwert (mit Test) und häufigste Kategorie; Zusatz nennt die Methode; ohne Design der alte Zusatz', () => {
    if (!('ok' in gelesen)) return;
    const st = saetzeGewichtet({ ...e, design: gelesen.ok }, name, wert);
    expect(st.haupt).toContain('M = 662,29'); expect(st.haupt).toContain('t(199) = 1,28'); expect(st.haupt).toContain('Logit-Intervall'); expect(st.zusatz).toContain('Taylor'); expect(st.zusatz).not.toContain('nur beschreibende Zahlen');
    expect(saetzeGewichtet(e, name, wert).zusatz).toContain('nur beschreibende Zahlen');
  });
  it('Fehler der ganzen Karte: Satz statt der Intervalle, die beschreibenden Zahlen bleiben', () => {
    const f = verteilungLesen(plan, alsWebR({ mittel: { fehler_code: 'zu-viele-zeilen', n: 250000 }, anteile: {} }), null, 'logit');
    if (!('ok' in f)) return;
    const t = tabellenGewichtet({ ...e, design: f.ok }, name, wert);
    expect(t.map(x => x.label)).toContain('Weighted Descriptive Statistics'); expect(t.flatMap(x => x.footnotes.map(y => y.t)).join(' ')).toMatch(/Zu viele Zeilen/);
    expect(saetzeGewichtet({ ...e, design: f.ok }, name, wert).haupt).toMatch(/Zu viele Zeilen/);
  });
});

describe('Karte Kreuztabelle: Auftrag, Antwort, Selbstprüfung, Tabelle', () => {
  const q = quelle(['stype', 'awards']);
  const e = gewichtetBeschreiben('kreuz', { l1: ['awards'], l2: ['stype'] }, q, abdruck);
  const plan = planKreuz(e, q), k = e.kreuz!.k, ges = k.summe.flat().reduce((a, b) => a + b, 0);
  const anteile: number[] = []; for (let j = 0; j < k.spalten.length; j++) for (let i = 0; i < k.zeilen.length; i++) anteile.push(k.summe[i]![j]! / ges);
  const antwort = alsWebR({ ...fall('P12').soll, anteile });
  it('Codes = Platz in den sortierten Werten; 6 Zellen; Aufruf', () => {
    expect(plan.zellen).toBe(6); expect(plan.zeilen).toBe(200); expect(plan.aufruf).toContain("sp_umfrage_kreuz(d, 'z', 's', 'w', NULL)");
    expect(new Set(plan.spalten.find(x => x.name === 'z')!.werte)).toEqual(new Set([1, 2, 3])); expect(new Set(plan.spalten.find(x => x.name === 's')!.werte)).toEqual(new Set([1, 2]));
  });
  it('gelesen; Selbstprüfung: Zellanteile gleich → null, verstellt → Abweichung', () => {
    const l = kreuzLesen(plan, antwort); expect('ok' in l).toBe(true); if (!('ok' in l)) return;
    expect(l.ok.e.f).toBeCloseTo(13.6839436, 6); expect(pruefeKreuz(e, l.ok)).toBeNull();
    const falsch = structuredClone(l.ok); falsch.e.anteile[0] += 0.01; expect(pruefeKreuz(e, falsch)).not.toBeNull();
    expect(pruefeKreuz(e, { ...l.ok, e: { fehlerCode: 'eine-stufe' } })).toBeNull();
  });
  it('Tabelle Rao-Scott: F zweiter Ordnung und χ² erster Ordnung; Satz F(1,89; 376,71) = 13,68; nie Pearson', () => {
    const l = kreuzLesen(plan, antwort); if (!('ok' in l)) return;
    const mit = { ...e, design: l.ok }, t = tabellenGewichtet(mit, name, wert), r = t.find(x => x.label === 'Rao-Scott Test')!, z = r.cells.map(c => c.t).join('|');
    expect(z).toContain('13.68'); expect(z).toContain('1.89'); expect(z).toContain('376.71'); expect(z).toContain('27.37'); expect(z).not.toContain('19.48'); expect(z).not.toContain('601.47');
    expect(t[1]!.label).toBe('Rao-Scott Test');
    expect(saetzeGewichtet(mit, name, wert).haupt).toContain('F(1,89; 376,71) = 13,68');
  });
  it('Fehlercode (eine Stufe): Satz statt Test, Zählungen bleiben', () => {
    const l = kreuzLesen(plan, alsWebR(fall('P18').soll)); if (!('ok' in l)) return;
    const t = tabellenGewichtet({ ...e, design: l.ok }, name, wert);
    expect(t.map(x => x.label)).not.toContain('Rao-Scott Test'); expect(t.flatMap(x => x.footnotes.map(f => f.t)).join(' ')).toMatch(/nur eine Stufe/);
    expect(komma(1, 0)).toBe('1');
  });
});
