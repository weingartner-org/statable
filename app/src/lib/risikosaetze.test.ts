import { describe, expect, it } from 'vitest';
import { s } from './sitzung.svelte';
import type { Kreuz, Saetze } from './ergebnis';
import { gruppeVorschlag, risikoVorschlag, mitRisiko, nntText, risikoStandard, risikoTafel, risikoVon, tabellenRisiko, type RisikoWahl } from './risikosaetze';
import { saetzeKreuz } from './ergebnis';

/* Welle 7, M2: Rollen, Sätze und Tabelle der Risikomaße. Die Zahlen prüft risiko.test.ts gegen R; hier: Rollen, NNT-Schreibweise (Altman), Nullzelle, Fall-Kontroll, Pflichtwahl „erwünscht“. */
const kreuz = (tab: number[][], extra: Partial<Kreuz> = {}): Kreuz => ({ art: 'kreuz', gezaehlt: 'Ereignis', gruppen: 'Gruppe', chi2: 0, df: 1, p: 1, n: tab.flat().reduce((a, b) => a + b, 0), v: 0, stufen: 1, unter5: 0, zellen: 4, minErwartet: 10, je: [],
  zaehlung: { zeilen: ['Aspirin', 'Placebo'], spalten: ['Herzinfarkt', 'kein Herzinfarkt'], tab }, ...extra });
const basis: Saetze = { haupt: 'H', zusatz: 'Z', vorsicht: 'V', apa: 'A', marken: [] };
const wahl = (extra: Partial<RisikoWahl> = {}): RisikoWahl => ({ gruppe: 'zeilen', gruppePos: 0, ereignisPos: 0, erwuenscht: false, ...extra });
const mitSprache = <T,>(sp: 'de' | 'en', f: () => T): T => { const alt = s.einst.sprache; s.einst.sprache = sp; try { return f(); } finally { s.einst.sprache = alt; } };

describe('Rollen und Tafel', () => {
  it('Zeilen als Gruppe: Zeile 1 = gewählte Gruppe, Spalte 1 = Ereignis; Tausch von Gruppe und Ereignis dreht die Tafel', () => {
    const tab = [[139, 10898], [239, 10795]];
    expect(risikoTafel(tab, wahl())).toEqual([[139, 10898], [239, 10795]]);
    expect(risikoTafel(tab, wahl({ gruppePos: 1 }))).toEqual([[239, 10795], [139, 10898]]);
    expect(risikoTafel(tab, wahl({ ereignisPos: 1 }))).toEqual([[10898, 139], [10795, 239]]);
    expect(risikoTafel(tab, wahl({ gruppe: 'spalten' }))).toEqual([[139, 239], [10898, 10795]]);   // die Spalten sind die Gruppen
  });
  it('Vorschlag: „ja“ und „positiv“ werden erkannt, „erwünscht“ bleibt offen (Pflichtwahl)', () => {
    const e = kreuz([[5, 5], [5, 5]]); e.zaehlung!.zeilen = ['nein', 'ja']; e.zaehlung!.spalten = ['kein Ereignis', 'Ereignis'];
    const w = risikoStandard(e)!; expect(w.gruppePos).toBe(1); expect(w.erwuenscht).toBeNull();
    const drei = kreuz([[1, 2, 3], [4, 5, 6]]); drei.zaehlung!.spalten = ['a', 'b', 'c']; expect(risikoStandard(drei)).toBeNull();
  });
});

describe('Sätze zu den Risikomaßen', () => {
  const e = kreuz([[139, 10898], [239, 10795]], { risiko: wahl() });
  it('ohne Wahl nichts (die Sätze der Kreuztabelle bleiben, wie sie sind)', () => {
    expect(mitRisiko(basis, kreuz([[139, 10898], [239, 10795]]))).toBe(basis);
    expect(tabellenRisiko(kreuz([[139, 10898], [239, 10795]]))).toEqual([]);
  });
  it('Risiken, Risikodifferenz (Newcombe), relatives Risiko, Odds Ratio und NNTB nach Altman', () => {
    const t = mitRisiko(basis, e);
    expect(t.zusatz).toContain('Gelesen als Vergleich zweier Gruppen'); expect(t.zusatz).toContain('RD = −,009, ');
    expect(t.zusatz).toMatch(/0,9 Prozentpunkte weniger in „Aspirin“/); expect(t.zusatz).toMatch(/relatives Risiko RR = 0,58, 95 %-KI \[0,47; 0,72\]/);
    expect(t.zusatz).toContain('einer NNT (NNTB 110,3; 95 %-KI NNTB 79,8 bis 176,7): Bei etwa 110 Personen'); expect(t.zusatz).not.toMatch(/NNT von/); expect(t.zusatz).toMatch(/ein Mal weniger auf \(unerwünscht, NNTB\)/);
    expect(t.apa).toMatch(/RD = −,009, 95 %-KI \[−,013; −,006\]; RR = 0,58, 95 %-KI \[0,47; 0,72\]; OR = 0,58/); expect(t.apa).toContain('NNTB 110,3 (NNTB 79,8 bis 176,7)');
    expect(t.vorsicht).toMatch(/keine Ursache/); expect(t.marken.map(m => m.erklaer)).toEqual(expect.arrayContaining(['risikodifferenz', 'relatives-risiko', 'nnt']));
  });
  it('Ereignis erwünscht: dieselbe Zahl, NNTH (Schaden) mit gespiegeltem Satz', () => {
    const t = mitRisiko(basis, kreuz([[139, 10898], [239, 10795]], { risiko: wahl({ erwuenscht: true }) }));
    expect(t.zusatz).toMatch(/NNTH 110/); expect(t.zusatz).toMatch(/ein Mal weniger auf \(erwünscht, NNTH\)/);
  });
  it('Pflichtwahl offen: keine NNT, Hinweis', () => {
    const t = mitRisiko(basis, kreuz([[139, 10898], [239, 10795]], { risiko: wahl({ erwuenscht: null }) }));
    expect(t.zusatz).toContain('Für die NNT fehlt die Angabe, ob das Ereignis erwünscht ist.'); expect(t.apa).not.toMatch(/NNT/); expect(t.marken.some(m => m.erklaer === 'nnt')).toBe(false);
    expect(risikoVon(kreuz([[139, 10898], [239, 10795]], { risiko: wahl({ erwuenscht: null }) }))!.m.nnt!.wert).toBeGreaterThan(0);
  });
  it('NNT durch unendlich: „NNTH 20,0 bis ∞ bis NNTB 4,0“ (immer eine Stelle), nie ein negatives Intervall', () => {
    const a = nntText({ wert: 10, art: 'NNTB', intervall: { typ: 'durchUnendlich', nntb: 4, nnth: 20 } });
    expect(a).toEqual({ wert: 'NNTB 10,0', intervall: 'NNTH 20,0 bis ∞ bis NNTB 4,0' });
    const t = mitRisiko(basis, kreuz([[12, 28], [9, 31]], { risiko: wahl({ erwuenscht: true }) }));
    expect(t.zusatz).toMatch(/bis ∞ bis/); expect(t.zusatz).toContain('Das Intervall reicht durch unendlich'); expect(t.zusatz + t.apa).not.toMatch(/NNT[BH]? [−-]/);
    expect(mitSprache('en', () => mitRisiko(basis, kreuz([[12, 28], [9, 31]], { risiko: wahl({ erwuenscht: true }) })).zusatz)).toMatch(/NNTH \d+(\.\d)? to ∞ to NNTB/);
  });
  it('Nullzelle: RR und OR nicht schätzbar (keine stille Korrektur), RD geht', () => {
    const t = mitRisiko(basis, kreuz([[0, 25], [6, 19]], { risiko: wahl() }));
    expect(t.zusatz).toContain('Das relative Risiko ist nicht schätzbar (Nullzelle)'); expect(t.zusatz).toContain('Das Odds Ratio ist nicht schätzbar (Nullzelle)'); expect(t.zusatz).toContain('Eine Zelle der Tabelle ist leer');
    expect(t.apa).toContain('RR nicht schätzbar (Nullzelle)'); expect(t.apa).toMatch(/RD = −,240/);
    const tab = tabellenRisiko(kreuz([[0, 25], [6, 19]], { risiko: wahl() }))[0]!; expect(tab.cells.filter(c => c.t.startsWith('nicht schätzbar')).length).toBe(2);
  });
  it('Fall-Kontroll-Studie: nur das Odds Ratio, ohne Rollenwahl', () => {
    const k = kreuz([[40, 60], [20, 80]], { studie: 'fallKontrolle' });
    const t = mitRisiko(basis, k); expect(t.zusatz).toContain('Fall-Kontroll-Studie'); expect(t.zusatz).toMatch(/Odds Ratio = 2,67/); expect(t.zusatz).not.toMatch(/RD = |RR = |NNT von|Prozentpunkte/);
    expect(t.apa).toMatch(/OR = 2,67/); const tab = tabellenRisiko(k); expect(tab.length).toBe(1); expect(tab[0]!.cells.some(c => c.t === 'Odds Ratio')).toBe(true);
    expect(mitRisiko(basis, kreuz([[0, 25], [6, 19]], { studie: 'fallKontrolle' })).zusatz).toContain('nicht schätzbar');
  });
  it('Tabelle: Risiken, RD, RR, OR; NNT in der Fußnote mit Altman-Schreibweise', () => {
    const tab = tabellenRisiko(e)[0]!; const t = tab.cells.map(c => c.t);
    expect(t).toEqual(expect.arrayContaining(['Risikodifferenz (RD)', 'Relatives Risiko (RR)', 'Odds Ratio (OR)'])); expect(tab.footnotes.map(f => f.t).join(' ')).toMatch(/NNT nach Altman \(1998\): NNTB 110,3, 95 %-KI NNTB 79,8 bis 176,7/);
  });
});

describe('Fachprüfung: ein Odds Ratio, Vergleichsgruppe, keine Doppelungen', () => {
  const tab = [[30, 70], [15, 85]];   // Zeile 1 „Aspirin“: 30 von 100, Zeile 2 „Placebo“: 15 von 100
  const alles = (e: Kreuz) => { const st = mitRisiko(saetzeKreuz(e), e); return { ...st, alle: [st.zusatz, st.apa, st.marken.map(m => m.text).join(' '), ...tabellenRisiko(e).flatMap(x => x.cells.map(c => c.t))].join(' | ') }; };
  it('mit gewählten Rollen steht genau ein OR - in Satz, Chip, APA und Tabelle dasselbe, in der gewählten Richtung', () => {
    for (const w of [wahl(), wahl({ gruppePos: 1 })]) {
      const e = kreuz(tab, { risiko: w }), a = risikoVon(e)!, or = a.m.or!.wert, st = alles(e);
      const zahlen: string[] = [...(st.zusatz.match(/Odds Ratio (?:ist |= )(\d+,\d+)/g) ?? []), ...(st.apa.match(/OR = \d+,\d+/g) ?? [])];
      expect(zahlen.length, st.zusatz).toBe(2);
      const erwartet = String(Math.round(or * 100) / 100).replace('.', ',').replace(/^(\d+)$/, '$1,00').replace(/^(\d+,\d)$/, '$10');
      expect(st.zusatz.match(/Odds Ratio ist (\d+,\d+)/)![1]).toBe(erwartet); expect(st.apa.match(/OR = (\d+,\d+)/g)!.length).toBe(1);
      expect(st.marken.filter(m => /^Odds Ratio/.test(m.text)).length).toBe(1); expect(st.marken.find(m => /^Odds Ratio/.test(m.text))!.text).toBe(`Odds Ratio = ${erwartet}`);
      const tz = tabellenRisiko(e)[0]!.cells.filter(c => c.n !== undefined); expect(tz.some(c => Math.abs(c.n! - or) < 1e-9)).toBe(true);
    }
    const e1 = alles(kreuz(tab, { risiko: wahl() })), e2 = alles(kreuz(tab, { risiko: wahl({ gruppePos: 1 }) }));
    expect(e1.apa).not.toBe(e2.apa);   // andere Richtung, anderes OR - aber nie beide zugleich
    expect((e1.apa.match(/OR = /g) ?? []).length).toBe(1);
  });
  it('Fall-Kontroll: ein OR (Richtung der Tabelle, genannt), kein doppelter Ursache-Satz', () => {
    const e = kreuz(tab, { studie: 'fallKontrolle' }), st = alles(e);
    expect((st.zusatz.match(/Odds Ratio/g) ?? []).length).toBe(2);   // „nur das Odds Ratio zulässig“ und der Wert
    expect((st.apa.match(/OR = /g) ?? []).length).toBe(1); expect(st.zusatz).toContain('die Chance (Odds) für „Herzinfarkt“ statt „kein Herzinfarkt“ in „Aspirin“ im Vergleich zu „Placebo“');
    expect((st.vorsicht.match(/keine Ursache/g) ?? []).length).toBe(1);
    expect(st.marken.filter(m => /^Odds Ratio/.test(m.text)).length).toBe(1);
  });
  it('ohne Wahl bleibt das OR der Tabelle (genau eins)', () => {
    const st = alles(kreuz(tab)); expect((st.apa.match(/OR = /g) ?? []).length).toBe(1);
  });
  it('Vorschlag: Placebo, Kontrolle, Control, ohne, keine, Standard, usual care sind die Vergleichsgruppe, sonst die erste Stufe', () => {
    expect(gruppeVorschlag(['Aspirin', 'Placebo'])).toBe(0); expect(gruppeVorschlag(['Placebo', 'Aspirin'])).toBe(1);
    expect(gruppeVorschlag(['Behandlung', 'Kontrolle'])).toBe(0); expect(gruppeVorschlag(['Kontrollgruppe', 'Intervention'])).toBe(1);
    expect(gruppeVorschlag(['Control', 'Treatment'])).toBe(1); expect(gruppeVorschlag(['mit Training', 'ohne Training'])).toBe(0);
    expect(gruppeVorschlag(['Intervention', 'Standard'])).toBe(0); expect(gruppeVorschlag(['Usual care', 'Programm'])).toBe(1); expect(gruppeVorschlag(['keine', 'Förderung'])).toBe(1);
    expect(gruppeVorschlag(['A', 'B'])).toBe(1);   // sonst ist die erste Stufe die Vergleichsgruppe
    const e = kreuz([[5, 5], [5, 5]]); e.zaehlung!.zeilen = ['Placebo', 'Wirkstoff'];
    expect(risikoStandard(e)!.gruppePos).toBe(1);
    e.zaehlung!.zeilen = ['Wirkstoff', 'Placebo']; expect(risikoStandard(e)!.gruppePos).toBe(0);
  });
  it('NNT: immer eine Stelle, keine Doppelung der Zahl', () => {
    expect(nntText({ wert: 5, art: 'NNTB', intervall: { typ: 'nntb', von: 3.3333, bis: 10 } })).toEqual({ wert: 'NNTB 5,0', intervall: 'NNTB 3,3 bis 10,0' });
    const z = mitRisiko(basis, kreuz([[0, 25], [6, 19]], { risiko: wahl() })).zusatz; expect(z).not.toMatch(/NNT von/);
  });
  it('Ereignis-Vorschlag ohne Verneinung: „Rückfall“ statt „kein Rückfall“, Pflichtwahl „erwünscht“ bleibt offen', () => {
    for (const sp of [['kein Rückfall', 'Rückfall'], ['Rückfall', 'kein Rückfall']]) {
      const e = kreuz([[5, 5], [5, 5]]); e.zaehlung!.spalten = sp;
      const w = risikoStandard(e)!; expect(sp[w.ereignisPos]).toBe('Rückfall'); expect(w.erwuenscht).toBeNull();
    }
    const g = kreuz([[5, 5], [5, 5]]); g.zaehlung!.zeilen = ['Placebo', 'Wirkstoff']; g.zaehlung!.spalten = ['bestanden', 'nicht bestanden'];
    expect(g.zaehlung!.spalten[risikoStandard(g)!.ereignisPos]).toBe('bestanden');
    const h = kreuz([[5, 5], [5, 5]]); h.zaehlung!.zeilen = ['kein Rückfall', 'Rückfall']; h.zaehlung!.spalten = ['Gruppe A', 'Gruppe B'];
    // Gruppen in den Spalten: das Ereignis kommt aus den Zeilen
    expect(h.zaehlung!.zeilen[risikoVorschlag(h, 'spalten').ereignisPos]).toBe('Rückfall');
  });
});
