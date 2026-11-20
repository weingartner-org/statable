import { describe, expect, it } from 'vitest';
import { s } from './sitzung.svelte';
import { quantilLesen, grenzeText, untenWert, obenWert, type QuantilErgebnis } from './quantil';
import { saetzeQuantil, tabellenQuantil } from './quantilsaetze';
import { katDaten } from './kategreg';
import { strafGerechnet, strafCodeSatz } from './strafreg';
import type { Spalte } from './verzeichnis';

s.einst.sprache = 'de'; s.einst.anrede = 'du';
const sp = (name: string): Spalte => ({ name, bezeichnung: name, art: 'zahl', niveau: 'metrisch', format: '', fehlend: [], fehlendText: '', werteLabels: {} }) as Spalte;
const dt = katDaten('zaehlreg', 'y', ['x'], Array.from({ length: 12 }, (_, i) => [i * 2 + 1, i]), [sp('y'), sp('x')]);
const MAX = 1.7976931348623157e308;
const roh = (unten: number[], oben: number[]) => ({ n: 12, ausgelassen: 0, tau: [0.5], namen: ['(Intercept)', 'p01'], ki_art: 'rang', ergebnisse: [{ tau: 0.5, b: [1, 2], verlust: 3, warnungen: [], rang: { unten, oben } }], ols: { b: [1, 2], se: [0.1, 0.1], unten: [0.8, 1.8], oben: [1.2, 2.2], r2: 0.9, df: 10 } });

describe('Offene Grenzen der Rang-Umkehr (quantreg schreibt ±1,797693e+308)', () => {
  const e: QuantilErgebnis = quantilLesen(roh([-MAX, 1.5], [1.7, MAX]), dt, { ki: 'rang', B: 2000, startwert: 1 });
  it('R-Antwort: offene Grenzen werden ±∞', () => { expect(e.erg[0]!.unten[0]).toBe(-Infinity); expect(e.erg[0]!.oben[1]).toBe(Infinity); expect(e.erg[0]!.oben[0]).toBe(1.7); });
  it('Grenzen nach dem Speichern (null) bleiben offen', () => { expect(untenWert(null)).toBe(-Infinity); expect(obenWert(NaN)).toBe(Infinity); expect(grenzeText(-MAX, 'unten')).toBe('−∞'); expect(grenzeText(MAX, 'oben')).toBe('∞'); });
  it('Satz, APA-Zeile und Tabelle zeigen nie eine Rohzahl', () => {
    const st = saetzeQuantil(e, n => n), tab = JSON.stringify(tabellenQuantil(e, n => n));
    for (const t of [st.haupt, st.zusatz, st.apa, tab]) expect(t).not.toMatch(/e\+308|1797693|NaN|undefined/);
    expect(st.haupt).toMatch(/∞\]/); expect(tab).toMatch(/−∞/); expect(tab).toMatch(/∞/);
  });
  it('der Satz ist ganz: „ändert sich … beim Median um …“ und genau ein 95 %-KI je Angabe', () => {
    const st = saetzeQuantil(e, n => n);
    expect(st.haupt).toMatch(/ändert sich „y“ \(95 %-Konfidenzintervall, Rang-Umkehr\) beim Median um /);
    expect(st.apa.match(/95 %-KI/g)?.length).toBe(1);
  });
});
describe('Strafregression: α und Konstante', () => {
  it('α in der Gerechnet-Zeile ohne führende Null', () => { expect(strafGerechnet({ alpha: 0.5, regel: 'se1', K: 10, R: 5, startwert: 1, n: 50 })).toContain('α = ,50'); expect(strafGerechnet({ alpha: 1, regel: 'se1', K: 10, R: 5, startwert: 1, n: 50 })).toContain('α = 1)'); });
  it('Satz zur konstanten Spalte sagt „wird weggelassen“', () => { expect(strafCodeSatz('konstant', { konstante: 1 })).toMatch(/wird weggelassen/); expect(strafCodeSatz('konstant', { konstante: 2 })).toMatch(/2 Spalten.*werden weggelassen/); });
});
