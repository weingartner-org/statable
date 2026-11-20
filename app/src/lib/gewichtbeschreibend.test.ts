import { describe, expect, it } from 'vitest';
import erwartet from './testdaten/spaeter-a-erwartet.json';
import erwartetC from './testdaten/spaeter-c-erwartet.json';
import { gewichtetBeschreiben, gewichtetN, saetzeGewichtet, tabellenGewichtet, type GewichteteKarte, type Quelle } from './gewichtbeschreibend';
import { gewichtFuss, gewichtBerichtSatz, pruefeGewicht, wKorrelation } from './gewichte';
import { BESCHREIBEND, gewichtStellenIds } from './gewichtkarten';
import { gewichtStatus } from './gewichte';
import { s } from './sitzung.svelte';

/* Umfragegewicht, nur beschreibend (lib/gewichtbeschreibend.ts): Zahlen gegen die Sollwerte aus R (Abschnitt gewichte.umfrage, scripts/spaeter-a-erwartet.R).
 * Karte → Teile der Sperrtabelle (lib/gewichtkarten.ts). Sätze und Tabellen: kein p, kein KI, kein Standardfehler. */
const U = (erwartet as any).gewichte.umfrage, d = U.daten;
/** S-C T8 (Entscheidung Opus 1): SD bei Umfragegewicht auf Σw = Zeilen normiert; neue Sollwerte aus spaeter-c-erwartet.json (abweichungen.beschreibe_umfragegewicht.betroffen[].neu). */
const NEU = (erwartetC as any).abweichungen.beschreibe_umfragegewicht.betroffen.map((b: any) => b.neu);
s.einst.sprache = 'de'; s.einst.anrede = 'du';
const nah = (ist: number, soll: number, tol = 1e-9) => expect(Math.abs(ist - soll), `${ist} gegen ${soll}`).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(soll)));

const spalten = ['gruppe', 'jn', 'kat', 'y', 'wu'].map(name => ({ name, art: 'zahl', fehlend: [] as number[], niveau: name === 'y' ? 'scale' : 'nominal' }));
const zeilen = d.y.map((_: number, i: number) => [d.gruppe[i], d.jn[i], d.kat[i], d.y[i], d.wu[i]]);
const pr = pruefeGewicht(d.wu, 'umfrage');
const q: Quelle = { spalten, zeilen, w: pr.w };
const g = { spalte: 'wu', art: 'umfrage' as const, summe: pr.summe, zeilen: pr.zeilen };

describe('Umfragegewicht, beschreibend: Karten gegen R', () => {
  it('Verteilung einer Zahl: Mittel, SD, Min/Max, Quartile (HAVERAGE mit normierten Gewichten), Kish', () => {
    const e = gewichtetBeschreiben('verteilung', { l1: ['y'], l2: [] }, q, g), z = e.zahlen[0]!.b;
    nah(z.mittel, U.mittel); nah(z.sd, NEU[2].sd); nah(z.min, U.min); nah(z.max, U.max); nah(z.q25, U.q25); nah(z.q50, U.q50); nah(z.q75, U.q75);
    nah(e.kish, U.kish_neff); expect(z.se).toBeUndefined();
  });
  it('Verteilung einer Kategorie: gewichtete Häufigkeiten und Prozente', () => {
    const e = gewichtetBeschreiben('verteilung', { l1: ['kat'], l2: [] }, q, g), k = e.kategorien[0]!;
    expect(e.zahlen).toHaveLength(0);
    k.werte.forEach((w, i) => { nah(w as number, U.prozent_kat.werte[i]); nah(k.summe[i]!, U.prozent_kat.summe[i]); nah(k.prozent[i]!, U.prozent_kat.prozent[i]); });
  });
  it('Kreuztabelle gruppe × jn: Zählungen und Prozente', () => {
    const k = gewichtetBeschreiben('kreuz', { l1: ['jn'], l2: ['gruppe'] }, q, g).kreuz!.k, r = U.kreuz_gruppe_jn;
    r.summe.forEach((z: number[], i: number) => z.forEach((v, j) => { nah(k.summe[i]![j]!, v); nah(k.zeilenprozent[i]![j]!, r.zeilenprozent[i][j]); nah(k.gesamtprozent[i]![j]!, r.gesamtprozent[i][j]); nah(k.spaltenprozent[i]![j]!, r.spaltenprozent[j][i]); }));
  });
  it('Gruppenvergleich: nur Mittelwerte je Gruppe (kein Test, kein p)', () => {
    const e = gewichtetBeschreiben('gruppen', { l1: ['y'], l2: ['gruppe'] }, q, g), gr = e.gruppen!;
    expect(gr.je).toHaveLength(2);
    gr.je.forEach((j, i) => { nah(j.b.mittel, U.mittel_je_gruppe[i].mittel); nah(j.b.summe, U.mittel_je_gruppe[i].summe); nah(j.b.sd, NEU[3].sd[i]); expect(j.b.se).toBeUndefined(); });
    nah(gr.gesamt.mittel, U.mittel);
    expect(JSON.stringify(e)).not.toMatch(/"(p|ki|kiLo|kiHi|se|t)":/);
  });
  it('Zusammenhang: gewichtetes r, unabhängig von der Skala der Gewichte', () => {
    const e = gewichtetBeschreiben('zusammenhang', { l1: ['y'], l2: ['kat'] }, q, g).zusammenhang!;
    const r = wKorrelation(d.y, d.kat, d.wu);
    nah(e.r, r); expect(e.n).toBe(12);
    nah(wKorrelation(d.y, d.kat, d.wu.map((v: number) => 7 * v)), r);
    expect(Math.abs(wKorrelation(d.y, d.kat, d.y.map(() => 1)) - r)).toBeGreaterThan(1e-4);   // das Gewicht wirkt
  });
  it('Gewichte 0 und Lücken zählen nicht', () => {
    const w2 = [...pr.w]; w2[0] = 0;
    const e = gewichtetBeschreiben('verteilung', { l1: ['y'], l2: [] }, { ...q, w: w2 }, g);
    expect(e.zahlen[0]!.b.zeilen).toBe(11);
    expect(gewichtetN(e)).toBe(11);
  });
});

describe('Tabellen und Sätze: beschreibend, ohne Test', () => {
  const name = (n: string) => n, wert = (_: string, w: string | number) => String(w);
  for (const [karte, wahl] of [['verteilung', { l1: ['y', 'kat'], l2: [] }], ['kreuz', { l1: ['jn'], l2: ['gruppe'] }], ['gruppen', { l1: ['y'], l2: ['gruppe'] }], ['zusammenhang', { l1: ['y'], l2: ['kat'] }]] as [GewichteteKarte, { l1: string[]; l2: string[] }][])
    it(karte, () => {
      const e = gewichtetBeschreiben(karte, wahl, q, g), t = tabellenGewichtet(e, name, wert), sa = saetzeGewichtet(e, name, wert);
      expect(t.length).toBeGreaterThan(0);
      for (const x of t) { expect(x.gewicht?.spalte).toBe('wu'); expect(x.cells.length).toBeGreaterThan(0); }
      const alle = [sa.haupt, sa.zusatz, sa.vorsicht, ...t.flatMap(x => x.cells.map(c => c.t))].join(' ');
      expect(alle).toContain('Gewichtet mit wu');
      expect(alle).not.toMatch(/\bp\s*[<=]|\bp-Wert|Konfidenz|95 %/);
      expect(sa.apa).toBe('');
      expect(sa.vorsicht).toContain('Effektive Stichprobengröße');
    });
});

describe('Karte → Stellen der Sperrtabelle', () => {
  it('jede Stelle gibt es in der Tabelle (kein Fehler), für beide Arten', () => {
    for (const v of ['verteilung', 'kreuz', 'gruppen', 'praepost', 'messwiederholung', 'zusammenhang', 'korrmatrix', 'vorhersage', 'mediation', 'moderation', 'skala', 'faktor', 'uebereinstimmung', 'mehrebenen', 'meta', 'kaplanmeier', 'einzelfall', 'faelle', 'kategorien'])
      for (const art of ['haeufigkeit', 'umfrage'] as const)
        for (const opt of [{}, { set: true, gruppen2: true, logistik: true, katModell: true, rangKorr: true, jaNein: true, iccInter: true, aequi: true }]) {
          const ids = gewichtStellenIds({ verfahren: v, art, ...opt });
          expect(ids.length, v).toBeGreaterThan(0);
          for (const id of ids) expect(() => gewichtStatus(id, art), `${v}: ${id}`).not.toThrow();
        }
  });
  it('Umfragegewicht: die vier beschreibenden Karten haben nur beschreibende Teile, kein Test', () => {
    for (const v of BESCHREIBEND) {
      const ids = gewichtStellenIds({ verfahren: v, art: 'umfrage' });
      expect(ids.every(i => gewichtStatus(i, 'umfrage') === 'beschreibend'), `${v}: ${ids}`).toBe(true);
    }
  });
  it('Umfragegewicht: alles andere mit p-Wert ist gesperrt oder Hinweis', () => {
    for (const v of ['praepost', 'messwiederholung', 'korrmatrix', 'vorhersage', 'mediation', 'moderation', 'skala', 'faktor', 'uebereinstimmung', 'mehrebenen', 'kaplanmeier']) {
      const st = gewichtStellenIds({ verfahren: v, art: 'umfrage' }).map(i => gewichtStatus(i, 'umfrage'));
      expect(st.includes('sperren'), v).toBe(true);
    }
    for (const v of ['meta', 'einzelfall', 'faelle', 'kategorien']) expect(gewichtStellenIds({ verfahren: v, art: 'umfrage' }).map(i => gewichtStatus(i, 'umfrage'))).toEqual(['hinweis']);
  });
  it('Häufigkeitsgewicht: Rangkorrelation, logistische Regression, Bootstrap-Mediation, Cronbachs Alpha, Korrelationsmatrix sind gesperrt, Pearson und lineare Regression rechnen', () => {
    const st = (v: string, o: object = {}) => gewichtStellenIds({ verfahren: v, art: 'haeufigkeit', ...o }).map(i => gewichtStatus(i, 'haeufigkeit'));
    expect(st('zusammenhang', { rangKorr: true })).toEqual(['sperren']); expect(st('zusammenhang')).toEqual(['rechnen']);
    expect(st('vorhersage', { logistik: true })).toEqual(['sperren']); expect(st('vorhersage')).toEqual(['rechnen']);
    expect(st('mediation')).toContain('sperren'); expect(st('skala')).toEqual(['sperren']); expect(st('korrmatrix')).toEqual(['sperren']);
    expect(st('gruppen')).toEqual(['rechnen', 'rechnen']); expect(st('gruppen', { aequi: true })).toContain('sperren');
  });
});

describe('Fußzeile und Satz im Methodenteil', () => {
  const h = { spalte: 'w', art: 'haeufigkeit' as const, summe: 15, zeilen: 8 }, u = { spalte: 'wu', art: 'umfrage' as const, summe: 9.1, zeilen: 8 };
  it('Fußzeile', () => {
    expect(gewichtFuss(h)).toBe('Gewichtet mit w als Häufigkeit (N = 15 aus 8 Zeilen).');
    expect(gewichtFuss(u)).toBe('Gewichtet mit wu als Umfragegewicht (n = 8, Summe der Gewichte 9,1).');
  });
  it('Methodensatz: ungewichtet leer; alle, einige, zwei verschiedene; Umfrage nennt fehlende Tests', () => {
    expect(gewichtBerichtSatz([{ art: 'gruppen' }, { art: 'kreuz' }])).toBe('');
    expect(gewichtBerichtSatz([{ art: 'kreuz', gewicht: h }, { art: 'kreuz', gewicht: h }])).toContain('Alle Auswertungen sind mit dem Fallgewicht w, Häufigkeitsgewicht, N = 15 aus 8 Zeilen gewichtet.');
    expect(gewichtBerichtSatz([{ art: 'kreuz', gewicht: h }, { art: 'kreuz' }])).toContain('1 von 2 Auswertungen');
    expect(gewichtBerichtSatz([{ art: 'kreuz', gewicht: h }, { art: 'kreuz', gewicht: u }])).toContain('2 von 2 Auswertungen sind gewichtet (w, Häufigkeitsgewicht');
    expect(gewichtBerichtSatz([{ art: 'kreuz', gewicht: u }])).toContain('Tests und Intervalle fehlen');
    expect(gewichtBerichtSatz([{ art: 'gruppen', gewicht: h }])).toContain('Diagramme, die einzelne Zeilen zeigen, fehlen');
    expect(gewichtBerichtSatz([{ art: 'kreuz', gewicht: h }])).not.toContain('Diagramme');
    // Tabelle für die Veröffentlichung nennt ihre Fehlerrechnung selbst - kein Widerspruch „Tests und Intervalle fehlen“ (Mikrodaten 24.10.)
    expect(gewichtBerichtSatz([{ art: 'amtlich', gewicht: u }])).not.toContain('Tests und Intervalle fehlen');
  });
});
