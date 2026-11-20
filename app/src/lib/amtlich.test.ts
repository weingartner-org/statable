import { describe, expect, it, beforeAll } from 'vitest';
import { s } from './sitzung.svelte';
import { setzePuf, ladeSoll, type SollTabelle } from './amtlich-probe';
import { amtlichWahlAus, leereAmtlichWahl, amtlichGrund, amtlichJs, amtlichPlan, amtlichWeg, zahlText, type AmtlichWahl, type AmtlichGrund } from './amtlich';
import { amtlichBerechne, neuesAmtlichBlatt, saetzeAmtlich, tabellenAmtlich, type AmtlichBerechnet } from './amtlichblatt';
import { berichtTabellen, excelTabellen, saetzeZu, gerechneteN } from './berichtsatz';
import { gewichtLage } from './fallgewicht.svelte';
import { repSpalten, planRep, istRepPlan } from './genauigkeit';
import { eigeneTabellen } from './eigenercode';
import { tabelleDe } from './export';

/* M5a, reiner Teil (ohne R): Punktschätzer und Fallzahlen der Tabelle gegen survey (Soll: pruefdaten/mikro/amtlich-soll.R -> amtlich-soll.json),
 * Geheimhaltung, Kennzeichnung, Zeichenerklärung und: die Ausgabe (Tabelle, Bericht, Excel, Word) enthält nie gesperrte Werte, nie Fallzahlen gesperrter Zellen, nie das Prüfprotokoll.
 * Die Standardfehler von R prüft engine/amtlich.webr.test.ts. */
const SOLL = ladeSoll();
const wahl = (x: Partial<AmtlichWahl>): AmtlichWahl => amtlichWahlAus({ ...leereAmtlichWahl(), ...x });
const rel = (a: number, b: number) => Math.abs(a - b) / Math.max(Math.abs(b), 1e-9);

function grundUndJs(w: AmtlichWahl) {
  const l = gewichtLage(); if (l.art !== 'gilt') throw new Error('Gewicht');
  const g = amtlichGrund(w, { spalten: s.spalten, zeilen: s.zeilen, w: l.pruefung.w }, false) as AmtlichGrund;
  return { g, roh: amtlichJs(w, g) };
}
/** Vergleicht Punktschätzer und Fälle mit dem Soll aus survey, nach den Namen der Stufen (die Reihenfolge der Namen darf abweichen). */
function gleichSoll(w: AmtlichWahl, soll: SollTabelle) {
  const { g, roh } = grundUndJs(w);
  expect([...g.zeilen].map(String).sort()).toEqual([...soll.zeilen].sort());
  const R = g.zeilen.length, C = g.spalten.length;
  const ps = (i: number) => (i < R ? soll.zeilen.indexOf(String(g.zeilen[i])) : R), qs = (j: number) => (j < C ? (g.hatSpalte ? soll.spalten.indexOf(String(g.spalten[j])) : 0) : C);
  let verglichen = 0;
  for (let i = 0; i <= R; i++) for (let j = 0; j <= C; j++) {
    const e = soll.est[ps(i)]![qs(j)];
    if (e === null || e === undefined) continue;
    expect(rel(roh[i]![j]!.schaetzer!, e), `Zelle ${i},${j}: ${roh[i]![j]!.schaetzer} gegen ${e}`).toBeLessThan(1e-9); verglichen++;
  }
  const nr = (i: number, j: number) => { let t = 0; for (let a = 0; a < R; a++) for (let b = 0; b < C; b++) if ((i === R || a === i) && (j === C || b === j)) t += g.n[a]![b]!; return t; };
  for (let i = 0; i <= R; i++) for (let j = 0; j <= C; j++) expect(nr(i, j), `n ${i},${j}`).toBe(soll.n[ps(i)]![qs(j)]);
  return verglichen;
}

describe('Punktschätzer und Fallzahlen gleich survey (ohne R)', () => {
  beforeAll(() => setzePuf('umfrage', false));
  it('Hochrechnung Erwerbsstatus × Bundesland, mit Rändern', () => { expect(gleichSoll(wahl({ zeile: 'erwerbsstatus', spalte: 'bundesland', inhalt: 'anzahl' }), SOLL.rep_anzahl!)).toBe(4 * 10); });
  it('Anteil je Zeile', () => { gleichSoll(wahl({ zeile: 'erwerbsstatus', spalte: 'bundesland', inhalt: 'zeile' }), SOLL.rep_zeile!); });
  it('Anteil je Spalte', () => { gleichSoll(wahl({ zeile: 'erwerbsstatus', spalte: 'bundesland', inhalt: 'spalte' }), SOLL.rep_spalte!); });
  it('Anteil am Gesamt', () => { gleichSoll(wahl({ zeile: 'erwerbsstatus', spalte: 'bundesland', inhalt: 'gesamt' }), SOLL.rep_gesamt!); });
  it('Mittelwert und Summe des Einkommens nach Geschlecht (ohne Spalten)', () => {
    gleichSoll(wahl({ zeile: 'geschlecht', inhalt: 'mittel', wert: 'einkommen' }), SOLL.rep_mittel_geschlecht!);
    gleichSoll(wahl({ zeile: 'geschlecht', inhalt: 'summe', wert: 'einkommen' }), SOLL.rep_summe_geschlecht!);
  });
  it('Mittelwert des Einkommens nach Geschlecht × Bildung (nur Fälle mit Einkommen zählen)', () => { gleichSoll(wahl({ zeile: 'geschlecht', spalte: 'bildung', inhalt: 'mittel', wert: 'einkommen' }), SOLL.rep_mittel_geschlecht_bildung!); });
  it('Linearisierung: dieselben Punktschätzer (Erwerbsstatus × Geschlecht)', () => {
    gleichSoll(wahl({ zeile: 'erwerbsstatus', spalte: 'geschlecht', inhalt: 'anzahl' }), SOLL.lin_anzahl!);
    gleichSoll(wahl({ zeile: 'erwerbsstatus', spalte: 'geschlecht', inhalt: 'spalte' }), SOLL.lin_spalte!);
  });
});

describe('Wahl und Weg', () => {
  it('ohne Spalten gibt es keinen Anteil je Zeile oder Spalte; Runden nur für Anzahl und Summe; Grenzen werden bereinigt', () => {
    expect(amtlichWahlAus({ zeile: 'a', inhalt: 'zeile' }).inhalt).toBe('gesamt');
    expect(amtlichWahlAus({ zeile: 'a', spalte: 'b', inhalt: 'zeile' }).inhalt).toBe('zeile');
    expect(amtlichWahlAus({ zeile: 'a', inhalt: 'mittel', geheim: 'runden' }).geheim).toBe('sperren');
    expect(amtlichWahlAus({ zeile: 'a', inhalt: 'anzahl', geheim: 'runden', rundenBasis: 5 }).rundenBasis).toBe(5);
    expect(amtlichWahlAus({ grenzen: { nMinX: 40, nMinKlammer: 30, cvKlammer: Number.NaN } }).grenzen).toEqual({ nMinX: 40, nMinKlammer: 40, cvKlammer: 0.2 });
  });
  it('R nur mit Stichprobenplan oder Replikationsgewichten', () => {
    const gw = (art: 'umfrage' | 'haeufigkeit', klumpenfrei?: boolean) => ({ spalte: 'g', art, klumpenfrei, summe: 1, zeilen: 1 });
    const rep = { an: true, anfang: 'w_rep', typ: 'bootstrap' as const, fay: null, scale: null };
    expect(amtlichWeg(wahl({}), undefined)).toBe('js');
    expect(amtlichWeg(wahl({}), gw('haeufigkeit'))).toBe('js');
    expect(amtlichWeg(wahl({}), gw('umfrage', false))).toBe('js');
    expect(amtlichWeg(wahl({}), gw('umfrage', true))).toBe('design');
    expect(amtlichWeg(wahl({ rep }), gw('umfrage', false))).toBe('rep');
    expect(amtlichWeg(wahl({ rep }), gw('haeufigkeit'))).toBe('js');
  });
  it('Zahlen: Tausendertrenner und Dezimalzeichen der Sprache', () => {
    s.einst.sprache = 'de';
    expect(zahlText(1234567, 0)).toBe('1\u00a0234\u00a0567'); expect(zahlText(12.34, 1)).toBe('12,3'); expect(zahlText(-0.04, 1)).toBe('0,0'); expect(zahlText(-5.5, 1)).toBe('−5,5');
  });
});

describe('Der Plan an R enthält nichts aus der Datei', () => {
  beforeAll(() => setzePuf('umfrage', true));
  it('nur eigene Namen (w, a1, b1, g1, e1 …, q1 …, rw1 …) und Zahlen; Spaltennamen der Datei stehen nur in den Daten', () => {
    const l = gewichtLage(); if (l.art !== 'gilt') throw new Error('Gewicht');
    const q = { spalten: s.spalten, zeilen: s.zeilen, w: l.pruefung.w };
    for (const inhalt of ['anzahl', 'zeile', 'spalte', 'gesamt', 'mittel', 'summe'] as const) {
      const w = wahl({ zeile: 'geschlecht', spalte: 'bildung', inhalt, wert: 'einkommen' });
      const g = amtlichGrund(w, q, false) as AmtlichGrund, p = amtlichPlan(w, g, undefined);
      if ('fehler' in p) throw new Error(p.fehler);
      for (const a of p.auftraege) { expect(a.aufruf).not.toMatch(/geschlecht|bildung|einkommen|erwerbsstatus|bundesland|männlich|weiblich/); expect(a.aufruf).toMatch(/^sp_umfrage_(total|anteil|mittel)\(d, /); }
      expect(p.spalten.map(x => x.name).every(n => /^(w|a1|b1|g1|e\d+|q\d+)$/.test(n))).toBe(true);
    }
  });
  it('Replikationsgewichte: Spalten über gemeinsamen Anfang, scale, Typ aus der festen Liste', () => {
    const l = gewichtLage(); if (l.art !== 'gilt') throw new Error('Gewicht');
    const q = { spalten: s.spalten, zeilen: s.zeilen, w: l.pruefung.w };
    expect(repSpalten(s.spalten.map(x => x.name), 'w_rep').length).toBe(50);
    const rp = planRep(q, { anfang: 'w_rep', typ: 'bootstrap', scale: 1 / 49 });
    if (!istRepPlan(rp)) throw new Error('Plan');
    const w = wahl({ zeile: 'erwerbsstatus', spalte: 'bundesland', inhalt: 'anzahl' }), g = amtlichGrund(w, q, false) as AmtlichGrund;
    const p = amtlichPlan(w, g, rp); if ('fehler' in p) throw new Error(p.fehler);
    expect(p.auftraege.length).toBe(4); expect(p.auftraege[0]!.aufruf).toContain("list(anfang = 'rw', typ = 'bootstrap'"); expect(p.auftraege[0]!.aufruf).toContain('scale = 0.0204');
  });
});

describe('Geheimhaltung, Kennzeichnung und Ausgabe ohne gesperrte Werte', () => {
  beforeAll(() => setzePuf('umfrage', false));
  const ok = (r: AmtlichBerechnet) => { if (r.art !== 'ok') throw new Error(JSON.stringify(r)); return r; };
  const tab = (x: Partial<AmtlichWahl>) => ok(amtlichBerechne(wahl({ zeile: 'erwerbsstatus', spalte: 'bundesland', inhalt: 'anzahl', ...x })));
  const alleTexte = (r: ReturnType<typeof tab>) => [r.item.title?.t ?? '', ...r.item.cells.map(c => c.t), ...r.item.footnotes.map(f => f.t)];

  it('ohne Geheimhaltung: kleine Zellen bekommen nur die Kennzeichnung (Klammer unter 30 Fällen), Zeichenerklärung nennt nur die vorkommenden Zeichen', () => {
    const r = tab({ geheim: 'aus' });
    expect(r.t.geheim).toBeNull(); expect(r.t.anzahlGeheim).toBe(0);
    const i = r.t.zeilenName.indexOf('arbeitslos'), j = r.t.spaltenName.indexOf('Burgenland');   // 14 Fälle: unter 30, über 10
    expect(r.t.zellen[i]![j]!.kennzeichen).toBe('klammer'); expect(r.t.zellen[i]![j]!.text).toMatch(/^\(\d/);
    expect(r.t.zellen[r.t.zeilenName.indexOf('erwerbstätig')]![j]!.kennzeichen).toBe('');
    expect(r.t.zeichen.map(z => z.zeichen)).toEqual(['( )']);
    expect(r.t.fuss.join(' ')).toContain('Hochgerechnet mit dem Gewicht „gewicht“');
  });
  it('Sperren mit Grenze 20: Zellen unter 20 Fällen sind „x“, mit Zeichenerklärung und Fußnote; Fallzahlen nur im Prüfprotokoll', () => {
    const r = tab({ geheim: 'sperren', minN: 20 });
    expect(r.t.geheim).not.toBeNull(); expect(r.t.geheim!.geschuetzt).toBe(true);
    // Burgenland 14, Vorarlberg 17, Salzburg 18, Tirol 19 arbeitslos: primär gesperrt; dazu mindestens eine weitere (zweite Sperrung je Zeile und Spalte)
    expect(r.t.geheim!.primaer).toBeGreaterThanOrEqual(4); expect(r.t.geheim!.sekundaer).toBeGreaterThan(0);
    r.t.zellen.forEach(z => z.forEach(c => { if (c.gesperrt) expect(c.text).toBe('x'); else expect(c.text).not.toBe('x'); }));
    const gesperrt = r.t.zellen.flat().filter(c => c.gesperrt).length;
    expect(gesperrt).toBe(r.t.geheim!.gesamt); expect(r.t.anzahlGeheim).toBe(gesperrt);
    expect(r.t.zeichen.map(z => z.zeichen)).toContain('x');
    expect(alleTexte(r).join('|')).toContain('sind gesperrt');
    expect(r.t.protokoll.sperren.length).toBe(gesperrt); expect(r.t.protokoll.saetze.length).toBeGreaterThan(0);
  });
  it('Die veröffentlichbare Fassung enthält weder Werte noch Fallzahlen gesperrter Zellen noch das Prüfprotokoll', () => {
    const ohne = grundUndJs(wahl({ zeile: 'erwerbsstatus', spalte: 'bundesland', inhalt: 'anzahl' }));
    const r = tab({ geheim: 'sperren', minN: 20, quelle: 'Erfundene Daten', fussnote: 'Eine Fußnote.' });
    const texte = alleTexte(r).join('\n');
    let geprueft = 0;
    r.t.zellen.forEach((z, i) => z.forEach((c, j) => {
      if (!c.gesperrt) return;
      const wert = ohne.roh[i]![j]!.schaetzer!;
      const treffer = r.item.cells.filter(x => x.t === zahlText(wert, 0) || x.t === `(${zahlText(wert, 0)})`);
      expect(treffer.length, `Wert ${zahlText(wert, 0)} der gesperrten Zelle ${i},${j} steht in der Ausgabe`).toBe(0); geprueft++;
    }));
    expect(geprueft).toBeGreaterThan(4);
    // Die Fallzahlen der gesperrten Zellen (14, 17, 18, 19 …) stehen nirgends als Zahl in der Ausgabe
    for (const sp of r.t.protokoll.sperren) expect(r.item.cells.some(c => c.t === String(sp.n)), `Fallzahl ${sp.n}`).toBe(false);
    expect(texte).not.toMatch(/Prüfprotokoll|Fälle je Zelle|Eingrenzung|zusätzlich gesperrt wegen/);
    expect(texte).toContain('Quelle: Erfundene Daten'); expect(texte).toContain('Eine Fußnote.');
    expect(r.item.cells.some(c => /\bn\s*=/.test(c.t))).toBe(false);
    expect(JSON.stringify(r.item)).not.toContain('fallzahlen');
  });
  it('Bericht, Excel, Word und PDF-Weg (berichtTabellen/excelTabellen/saetzeZu/tabelleDe) geben nur die veröffentlichbare Fassung aus', () => {
    const r = tab({ geheim: 'sperren', minN: 20 });
    const b = neuesAmtlichBlatt(r.w, null);
    expect(eigeneTabellen(b)).toBe(true); expect(tabellenAmtlich(b)).toHaveLength(1);
    const bt = berichtTabellen(b), et = excelTabellen(b);
    expect(bt).toHaveLength(1); expect(et).toHaveLength(1); expect(JSON.stringify(bt[0])).toBe(JSON.stringify(r.item));
    const sz = saetzeZu(b), satz = [sz?.haupt, sz?.zusatz, sz?.apa].join(' ');
    expect(satz).toContain('Zellen sind aus Gründen der Geheimhaltung gesperrt'); expect(satz).not.toMatch(/Prüfprotokoll|Fälle je Zelle/);
    expect(gerechneteN(b)).toBeNull();
    // Word, PDF und Excel bauen alle über tabelleDe
    const de = tabelleDe(bt[0]!, null), alle = de.zeilen.flat().map(z => z.t).join('|') + de.fuss.join('|');
    expect(alle).not.toMatch(/Prüfprotokoll|Fälle je Zelle/);
    expect(de.zeilen.flat().filter(z => z.t === 'x').length).toBe(r.t.anzahlGeheim);
    expect(b.titel).toContain('Veröffentlichung');
  });
  it('Runden auf 5: alle Zahlen sind Vielfache von 5, Hinweis „Summen können abweichen“', () => {
    const r = tab({ geheim: 'runden', rundenBasis: 5, grenzen: { nMinX: 0, nMinKlammer: 0, cvKlammer: 9 } });
    expect(r.t.rund).not.toBeNull(); expect(r.t.fuss.join(' ')).toContain('Summen können abweichen');
    for (const z of r.t.zellen.flat()) { const v = Number(z.text.replace(/[^\d,]/g, '').replace(',', '.')); expect(v % 5).toBe(0); expect(z.n).toBe(v); }
  });
  it('Mittelwert mit Sperre: Zellen ohne Fälle sind „-“; Anteil je Zeile: der Zeilenrand ist 100', () => {
    const m = ok(amtlichBerechne(wahl({ zeile: 'bundesland', spalte: 'erwerbsstatus', inhalt: 'mittel', wert: 'einkommen', geheim: 'sperren', minN: 3 })));
    expect(m.t.wertKopf).toBe('Mittelwert'); expect(m.t.spaltenName).toContain('nicht erwerbstätig');
    const ne = m.t.spaltenName.indexOf('nicht erwerbstätig'); expect(m.t.zellen.every(z => z[ne]!.text === '-')).toBe(true);   // keine Zahl, kein Einkommen: „-“
    const a = tab({ inhalt: 'zeile' });
    expect(a.t.zellen[0]![a.t.spaltenName.length]!.text).toBe('100,0');
  });
  it('Ungewichtet (kein Fallgewicht): Fußnote „Ungewichtete Zahlen“, Zahlen sind die Zahl der Befragten', () => {
    setzePuf('keins');
    const r = tab({ inhalt: 'anzahl' });
    expect(r.t.fuss.join(' ')).toContain('Ungewichtete Zahlen'); expect(r.t.zellen[r.t.zeilenName.length]![r.t.spaltenName.length]!.text).toBe(zahlText(8000, 0));
    expect(r.t.hilfe.join(' ')).toContain('Ohne Gewicht');
    setzePuf('umfrage', false);
  });
  it('Umfragegewicht ohne Stichprobenplan und ohne Replikationsgewichte: keine Genauigkeit, mit Satz warum; mit Replikationsgewichten verlangt die Tabelle R', () => {
    const r = tab({});
    expect(r.t.mitGenauigkeit).toBe(false); expect(r.t.hilfe.join(' ')).toContain('Stichprobenplan ist nicht bekannt');
    const rep = { an: true, anfang: 'w_rep', typ: 'bootstrap' as const, fay: null, scale: 1 / 49 };
    expect(amtlichBerechne(wahl({ zeile: 'erwerbsstatus', spalte: 'bundesland', inhalt: 'anzahl', rep })).art).toBe('rechnen');
    expect(amtlichBerechne(wahl({ zeile: 'erwerbsstatus', spalte: 'bundesland', inhalt: 'anzahl', rep: { ...rep, anfang: 'zzz' } })).art).toBe('fehler');
  });
  it('Ein Blatt mit altem Stand der Rechnung in R gibt keine Zahl aus', () => {
    const w = wahl({ zeile: 'erwerbsstatus', spalte: 'bundesland', inhalt: 'anzahl', rep: { an: true, anfang: 'w_rep', typ: 'bootstrap', fay: null, scale: 1 / 49 } });
    const b = neuesAmtlichBlatt(w, { schluessel: 'alt', roh: [] });
    expect(tabellenAmtlich(b)).toEqual([]); expect(saetzeAmtlich(b)?.haupt).toContain('nicht aktuell');
  });
});
