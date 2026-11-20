import { describe, expect, it } from 'vitest';
import { s } from './sitzung.svelte';
import { coxBefunde, coxDaten, coxLesen, coxAufruf, coxFehlerText, coxKoeffizienten, phVerletzt, type CoxPraed } from './cox';
import { saetzeCox, tabellenCox, coxPhHinweise, coxUnsicher } from './coxsaetze';
import { VERFAHREN } from './verfahren';
import { saetzeKaplan, tabellenKaplan } from './ueberlebensaetze';
import { kaplanAus } from './ueberleben';
import ERW from './testdaten/welle7-erwartet.json';

/* Welle 7, M1: Sätze, Tabellen und das Lesen der R-Antwort zur Cox-Regression. Die Zahlen kommen aus den Sollwerten (R, survival) - hier wird nur geprüft,
 * dass Statable sie richtig liest und in Worte fasst: Hinweise zuerst, kein „x-mal so wahrscheinlich“, Efron genannt, nicht kausal. */
type Z = Record<string, any>;
const C = (ERW as unknown as { cox: { faelle: Z[] } }).cox;
const fall = (n: string) => C.faelle.find(f => f.name === n)!;
const mitSprache = <T,>(sp: 'de' | 'en', f: () => T): T => { const alt = s.einst.sprache; s.einst.sprache = sp; try { return f(); } finally { s.einst.sprache = alt; } };
/** Sollwerte → R-Antwort in Statables Namen (p01, p02 …; Koeffizienten p01, p02Stufe). */
function alsAntwort(f: Z, ties: 'efron' | 'breslow' = 'efron') {
  const e = JSON.parse(JSON.stringify(f[ties])) as Z, praed: string[] = f.praed;
  const neu = (n: string) => { const i = praed.findIndex(p => n === p || n.startsWith(p)); return i < 0 ? n : `p${String(i + 1).padStart(2, '0')}${n.slice(praed[i]!.length)}`; };
  for (const k of e.koef) k.name = neu(k.name);
  for (const l of e.lr_praed) l.name = neu(l.name);
  for (const p of e.ph?.praed ?? []) p.name = neu(p.name);
  return e;
}
const praedInfos = (f: Z): CoxPraed[] => (f.praed as string[]).map(n => { const koef = (f.efron.koef as Z[]).filter(k => k.name.startsWith(n) && k.name !== n); return koef.length ? { name: n, art: 'faktor' as const, stufen: ['Referenz', ...koef.map(k => k.name.slice(n.length))] } : { name: n, art: 'zahl' as const, stufen: [] }; });
const name = (n: string) => n;

describe('Cox: R-Antwort lesen', () => {
  const f = fall('b_lung_mehrfach'), e = coxLesen(alsAntwort(f), { praed: praedInfos(f) });
  it('Zahlen, Zuordnung der Koeffizienten zu den Prädiktoren, PH und Konkordanz', () => {
    expect(e.n).toBe(227); expect(e.ereignisse).toBe(164); expect(e.npar).toBe(3); expect(e.epvHinweis).toBe(false);
    expect(e.koef.map(k => k.pIdx)).toEqual([0, 1, 2]); expect(e.koef[1]!.stufe).toBe('Frauen');
    expect(e.koef[1]!.hr).toBeCloseTo(0.5754, 3); expect(e.ph!.praed.length).toBe(3); expect(e.konkordanz.c).toBeCloseTo(0.6371, 3);
    expect(phVerletzt(e)).toEqual([]);
  });
  it('Aufruf und Daten für R', () => {
    const dt = coxDaten('zeit', 'status', 2, ['x'], [[10, 2, 1.5], [12, 1, 2.5], [8, null, 3]], [{ name: 'zeit', art: 'zahl', fehlend: [], werteLabels: {}, niveau: 'metrisch' }, { name: 'status', art: 'zahl', fehlend: [], werteLabels: {}, niveau: 'nominal' }, { name: 'x', art: 'zahl', fehlend: [], werteLabels: {}, niveau: 'metrisch' }] as never);
    expect(dt.spalten.map(x => x.name)).toEqual(['zeit', 'ereignis', 'p01']);
    expect(dt.spalten[1]!.werte).toEqual([1, 0, null]);   // Ereignis = Wert 2; Lücke = NA
    expect(coxAufruf(dt)).toContain("sp_cox(d, 'zeit', 'ereignis', c('p01'), character(0), 'efron')");
    expect(coxAufruf(dt, 'breslow')).toContain("'breslow'");
  });
  it('Fehlertexte und Faustregel', () => {
    expect(coxFehlerText('no event among the valid cases')).toMatch(/niemandem/);
    expect(coxFehlerText('etwas anderes')).toBeNull();
    expect(coxKoeffizienten([{ name: 'a', art: 'zahl', stufen: [] }, { name: 'g', art: 'faktor', stufen: ['x', 'y', 'z'] }])).toBe(3);
    expect(coxBefunde(17, [{ name: 'a', art: 'zahl', stufen: [] }, { name: 'g', art: 'faktor', stufen: ['x', 'y', 'z'] }]).map(b => b.code)).toEqual(['epv']);
    expect(coxBefunde(30, [{ name: 'a', art: 'zahl', stufen: [] }, { name: 'g', art: 'faktor', stufen: ['x', 'y', 'z'] }])).toEqual([]);
    expect(coxBefunde(500, Array.from({ length: 9 }, (_, i) => ({ name: `a${i}`, art: 'zahl' as const, stufen: [] }))).map(b => b.art)).toEqual(['sperre']);
  });
});

describe('Cox: Sätze', () => {
  const f = fall('b_lung_mehrfach'), e = coxLesen(alsAntwort(f), { praed: praedInfos(f) });
  const t = saetzeCox(e, name, '2');
  it('Hazard, nicht „x-mal so wahrscheinlich“; Efron genannt; nicht kausal; Konkordanz beschreibend', () => {
    expect(t.zusatz).toMatch(/Bindungen nach Efron/); expect(t.hinweise.join(' ')).not.toMatch(/einziges/); expect(t.zusatz).toMatch(/HR = 0,58, 95 %-KI \[0,41; 0,80\], p < ,001/);
    expect(t.zusatz).toMatch(/mit 0,58-fachem Hazard|auf das 0,58-Fache|Hazard/); expect(t.zusatz + t.vorsicht).not.toMatch(/mal so wahrscheinlich(?! ist)/);
    expect(t.vorsicht).toMatch(/kein Risikoverhältnis/); expect(t.vorsicht).toMatch(/Breslow/); expect(t.vorsicht).toMatch(/keine Ursache/);
    expect(t.zusatz).toMatch(/Konkordanz \(Harrells C\) beträgt ,64/);
    expect(t.apa).toMatch(/^Cox-Regression: LR-Test χ²\(3\) = 30,50, p < ,001; HR = 1,01/);
    expect(t.marken.map(m => m.erklaer)).toContain('hazard-ratio');
  });
  it('englisch: dieselben Zahlen, Satz ohne „times as likely“', () => {
    const en = mitSprache('en', () => saetzeCox(e, name, '2'));
    expect(en.zusatz).toMatch(/times the hazard|rises to/); expect(en.zusatz).not.toMatch(/times as likely/); expect(en.apa).toMatch(/HR = 0.58, 95% CI \[0.41, 0.80\]/);
  });
  it('verletzte Annahme proportionaler Hazards: der Hinweis steht vor den Hazard Ratios, mit p je Prädiktor', () => {
    const g = fall('e_ph_verletzt'), ev = coxLesen(alsAntwort(g), { praed: praedInfos(g) });
    expect(phVerletzt(ev)).toEqual([0]);
    const h = coxPhHinweise(ev, name); expect(h.length).toBe(1); expect(h[0]).toMatch(/Annahme proportionaler Hazards ist für „gruppe“ verletzt \(p < ,001\)/);
    const k = saetzeKaplan({ ...kaplanAus([[0, 1, 1], [0, 2, 1], [0, 3, 0], [1, 1, 1], [1, 2, 0], [1, 3, 1]], { zeit: 'zeit', ereignis: 'status', gruppe: 'g', gruppenNamen: ['A', 'B'], werte: ['0', '1'], ereignisIndex: 1, zeilen: 6, ausgelassen: 0 }), cox: ev });
    expect(k.zusatz.indexOf('verletzt')).toBeGreaterThan(-1); expect(k.zusatz.indexOf('verletzt')).toBeLessThan(k.zusatz.indexOf('HR = '));
    expect(k.marken.some(m => m.erklaer === 'proportionale-hazards' && m.hinweis)).toBe(true);
  });
  it('wenige Ereignisse (Peduzzi): Hinweis im Ergebnis', () => {
    const g = fall('f_wenig_ereignisse'), ev = coxLesen(alsAntwort(g), { praed: praedInfos(g) });
    expect(ev.epvHinweis).toBe(true); expect(saetzeCox(ev, name, '1').hinweise.join(' ')).toMatch(/Wenige Ereignisse: 17 Ereignisse bei 3 Koeffizienten/);
  });
  it('Tabellen: Hazard Ratios und Tests, in die Tabellen der Karte eingehängt', () => {
    const tab = tabellenCox(e, name); expect(tab.map(x => x.label)).toEqual(['Cox Regression', 'Cox Tests']);
    expect(tab[0]!.cells.some(c => c.t === 'HR')).toBe(true);
    const k = { ...kaplanAus([[0, 1, 1], [0, 2, 1], [0, 3, 0], [1, 1, 1], [1, 2, 0], [1, 3, 1]], { zeit: 'zeit', ereignis: 'status', gruppe: 'g', gruppenNamen: ['A', 'B'], werte: ['0', '1'], ereignisIndex: 1, zeilen: 6, ausgelassen: 0 }), cox: e };
    expect(tabellenKaplan(k).slice(-2).map(x => x.label)).toEqual(['Cox Regression', 'Cox Tests']);
  });
});

describe('Fachprüfung: Cox bei verletzter Annahme, Trennung, Ereignis benannt', () => {
  const g = fall('e_ph_verletzt'), ev = coxLesen(alsAntwort(g), { praed: praedInfos(g) });
  it('PH verletzt und Modell nicht signifikant: kein „belegen den Zusammenhang nicht“, sondern der Hinweis auf sich aufhebende Effekte', () => {
    const n = { ...ev, modelltest: { ...ev.modelltest, p: 0.4 } };
    const z = saetzeCox(n, name, 'status = 1').zusatz;
    expect(z).toContain('Das HR ist nicht signifikant, aber die Annahme proportionaler Hazards ist verletzt: Gegenläufige Effekte zu verschiedenen Zeiten (sich kreuzende Kurven) können sich im HR aufheben. Die Kaplan-Meier-Kurven zeigen den Verlauf.');
    expect(z).not.toContain('belegen den Zusammenhang darum nicht');
    const ok = { ...fall('b_lung_mehrfach') }; const e2 = coxLesen(alsAntwort(ok), { praed: praedInfos(ok) });
    expect(saetzeCox({ ...e2, modelltest: { ...e2.modelltest, p: 0.4 } }, name, 'x').zusatz).toContain('Die Daten belegen den Zusammenhang darum nicht');   // ohne verletzte Annahme bleibt es dabei
    expect(mitSprache('en', () => saetzeCox(n, name, 'status = 1').zusatz)).toContain('opposite effects at different times (crossing curves) can cancel out in the HR');
  });
  it('Hinweis zur Annahme: „ein einzelnes Hazard Ratio“, nicht „ein einziges HR“', () => {
    expect(coxPhHinweise(ev, name)[0]).toMatch(/ein einzelnes Hazard Ratio fasst das nur ungenau zusammen/);
  });
  it('Trennung: „nicht schätzbar“ statt B = −20, SE = 2878, HR < 0,001', () => {
    const f = fall('b_lung_mehrfach'), e = coxLesen(alsAntwort(f), { praed: praedInfos(f) });
    const t = { ...e, trennung: true, koef: e.koef.map((k, i) => (i === 1 ? { ...k, b: -20.1, se: 2878.4, z: -0.007, p: 0.99, hr: 1.9e-9, kiU: 0, kiO: Infinity } : k)) };
    expect(coxUnsicher(t, t.koef[1]!)).toBe(true); expect(coxUnsicher(t, t.koef[0]!)).toBe(false); expect(coxUnsicher({ ...t, trennung: false }, t.koef[1]!)).toBe(false);
    const tab = tabellenCox(t, name)[0]!, zellen = tab.cells.map(c => c.t);
    expect(zellen).toContain('nicht schätzbar'); expect(zellen.join(' ')).not.toMatch(/2878|20\.10|< 0\.001/);
    const s = saetzeCox(t, name, 'tod = 1'); expect(s.zusatz).toMatch(/lässt sich keine Hazard Ratio schätzen/); expect(s.zusatz).not.toMatch(/2878/); expect(s.apa).toMatch(/HR nicht schätzbar/);
  });
  it('das Ereignis steht mit Spaltennamen im Satz (z. B. „tod = 1“), nicht nur „1“', () => {
    const f = fall('b_lung_mehrfach'), e = coxLesen(alsAntwort(f), { praed: praedInfos(f) });
    const k = kaplanAus([[0, 1, 1], [0, 2, 1], [0, 3, 0], [1, 1, 1], [1, 2, 0], [1, 3, 1]], { zeit: 'zeit', ereignis: 'tod', gruppe: 'g', gruppenNamen: ['A', 'B'], werte: ['0', '1'], ereignisIndex: 1, zeilen: 6, ausgelassen: 0 });
    const z = saetzeKaplan({ ...k, cox: e }, name).zusatz;
    expect(z).toContain('„tod = 1“'); expect(z).not.toMatch(/tritt „1“/);
  });
  it('„Gerechnet“ nennt bei Cox die Cox-Regression mit Efron', () => {
    const km = VERFAHREN.find(v => v.id === 'kaplanmeier')!;
    expect(km.fachwort({ l1: ['t'], l2: ['e'], l3: [], l4: ['x'] }, {} as never)).toBe('Kaplan-Meier-Schätzer, Log-Rank-Test, Cox-Regression (Efron für gleiche Zeiten)');
    expect(km.fachwort({ l1: ['t'], l2: ['e'], l3: [], l4: [] }, {} as never)).toBe('Kaplan-Meier-Schätzer, Log-Rank-Test');
  });
});
