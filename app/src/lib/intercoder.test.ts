import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { intercoder } from './intercoder';
import { kappaAusTabelle, kappaTabelle } from './uebereinstimmung';

/* Fachblatt G2 (docs/fachblaetter/G2-INTERCODER.md): Intercoder-Übereinstimmung - prozentuale Übereinstimmung, Fleiss' Kappa, Brennan-Prediger, Krippendorffs Alpha.
 * Sollwerte: R 4.6.1, irrCAC (ungerundet) als erste Quelle; zweite Quelle irr::kripp.alpha / irr::kappam.fleiss; dritte Quelle (Alpha) eigene Koinzidenzmatrix nach Krippendorff (2011).
 * Skript: scripts/intercoder-erwartet.R, Daten: testdaten/intercoder-erwartet.json. Die Tests sind absichtlich ROT, bis `lib/intercoder.ts` gebaut ist.
 *
 * API, die der Bauer in app/src/lib/intercoder.ts anlegt (Rechenkern ohne Oberfläche, neben lib/uebereinstimmung.ts):
 *
 *   export interface Koef { wert: number | null; se: number | null; unten: number | null; oben: number | null }
 *   export interface IntercoderErgebnis {
 *     nEinheiten: number;                      // Einheiten mit >= 2 Kodierungen (nur sie gehen in Alpha und in pa ein)
 *     nNurEine: number;                        // Einheiten mit genau einer Kodierung (gehen nicht in Alpha ein; Fleiss/BP/Prozent folgen irrCAC auf allen Zeilen), werden genannt
 *     prozent: Koef;                           // prozentuale Übereinstimmung als Anteil 0..1 (irrCAC pa.coeff.raw)
 *     cohen: number | null;                    // Cohens Kappa, ungewichtet - nur bei genau 2 Kodierenden (Zeilen mit beiden Werten), sonst null
 *     fleiss: Koef | null;                     // Fleiss' Kappa (irrCAC fleiss.kappa.raw); null bei genau 2 Kodierenden (dort wäre es Scotts Pi, wird nicht angezeigt)
 *     bp: Koef;                                // Brennan-Prediger (irrCAC bp.coeff.raw), q = Zahl der beobachteten Kategorien
 *     alpha: Koef;                             // Krippendorffs Alpha in der Skala skalaGenutzt
 *     skalaGenutzt: 'nominal' | 'ordinal' | 'interval';   // bei Text-Kategorien IMMER 'nominal', auch wenn 'ordinal'/'interval' verlangt wurde (kein Fehler)
 *     hauptwert: 'cohen' | 'fleiss';           // 2 Kodierende: 'cohen', ab 3: 'fleiss'
 *     allesGleich: boolean;                    // unter den Einheiten mit >= 2 Kodierungen kommt nur EINE Kategorie vor
 *     paradox: boolean;                        // prozent.wert >= 0,90 und Hauptwert (cohen bzw. fleiss.wert) < 0,40; bei allesGleich false
 *   }
 *   export function intercoder(spalten: (string | number | null)[][], skala: 'nominal' | 'ordinal' | 'interval'): IntercoderErgebnis;
 *
 *   - `spalten`: eine Spalte je Kodierende (Spalte = Array über die Einheiten), null = fehlend. Gleiche Länge.
 *   - KI aller Koef: wert ± qt(0,975, nEinheiten - 1) · se, oben bei 1 gekappt, unten NICHT gekappt (Fachblatt). se = analytischer Standardfehler von irrCAC (Gwet 2014), Formeln s. irrCAC-Quelltext;
 *     bei Alpha mit den Gewichten der Skala (ordinal: Krippendorffs Ordinalmetrik aus den Häufigkeiten der PAARBAREN Werte; interval: (a-b)^2).
 *   - Prozent, Fleiss und BP rechnen GENAU wie irrCAC auf ALLEN Zeilen (Gwet 2014; Entscheidung Opus 15.10.): Einheiten mit nur einer Kodierung werden NICHT vorgefiltert. pe (Randverteilung), SE
 *     und Freiheitsgrade zählen sie mit (KI-Freiheitsgrade = Zahl aller Zeilen - 1); der Paaranteil pa nimmt nur Einheiten mit >= 2 Kodierungen (so macht es irrCAC). Alpha dagegen rechnet nur mit
 *     Einheiten mit >= 2 Kodierungen (Koinzidenzmatrix), KI-Freiheitsgrade = nEinheiten - 1. nNurEine bleibt als Feld.
 *   - Alpha = Krippendorffs Alpha mit Koinzidenzmatrix (fehlende Werte erlaubt). Achtung: irr::kripp.alpha ist bei vollständigen Daten mit >= 3 Kodierenden FALSCH (Sollwert ist irrCAC / eigene Koinzidenzmatrix).
 *   - Alles gleich (allesGleich = true): Kein Absturz. fleiss (ab 3 Kodierenden; sonst null), bp und alpha sind Koef mit wert/se/unten/oben = null; prozent.wert = 1; cohen = null; paradox false.
 *   - Rechenfälle ohne Ergebnis (weniger als 2 Einheiten mit >= 2 Kodierungen): nicht getestet, aber ohne Absturz (z. B. Koef mit null).
 *   - p-Werte (irrCAC: einseitig) gibt das Modul nicht aus; das JSON hat sie als p_einseitig. */

type Wert = string | number | null;
interface K { wert: number | null; se: number | null; unten: number | null; oben: number | null; p_einseitig?: number | null; wert_ref?: number; wert_irr_roh?: number; wert_irr_korrigiert?: number }
interface Fall {
  name: string; beschreibung: string; daten: Wert[][]; text: boolean; n_kodierende: number; n_einheiten: number; n_nur_eine: number; alles_gleich: boolean;
  skalen: ('nominal' | 'ordinal' | 'interval')[]; skala_genutzt: 'nominal' | null; cohen?: number | null;
  pa: K; fleiss: K; bp: K; alpha: Record<string, K>; hauptwert: 'cohen' | 'fleiss'; hauptwert_wert: number | null; paradox: boolean;
}
const J = JSON.parse(readFileSync(new URL('./testdaten/intercoder-erwartet.json', import.meta.url), 'utf8')) as { faelle: Fall[] };
const fall = (n: string) => J.faelle.find(f => f.name === n)!;
const spaltenVon = (f: Fall): Wert[][] => Array.from({ length: f.n_kodierende }, (_, j) => f.daten.map(z => z[j]!));
const nah = (a: number | null | undefined, b: number | null, tol = 1e-9) => {
  if (b === null) { expect(a ?? null).toBeNull(); return; }
  expect(a, 'Wert fehlt').toBeTypeOf('number');
  expect(Math.abs(a! - b) / Math.max(1, Math.abs(b))).toBeLessThan(tol);
};
const koef = (e: { wert: number | null; se: number | null; unten: number | null; oben: number | null } | null | undefined, s: K, ohneSe = false) => {
  expect(e, 'Koef fehlt').not.toBeNull(); expect(e).toBeDefined();
  nah(e!.wert, s.wert, 1e-9);
  if (ohneSe) return;
  nah(e!.se, s.se, 1e-8); nah(e!.unten, s.unten, 1e-8); nah(e!.oben, s.oben, 1e-8);
};

describe('Anker aus dem Fachblatt', () => {
  it('Krippendorff (2011), 4 Kodierende x 12 Einheiten mit Lücken: Alpha nominal ,743 · ordinal ,815 · interval ,849', () => {
    const sp = spaltenVon(fall('A_krippendorff_beispiel'));
    expect(intercoder(sp, 'nominal').alpha.wert!).toBeCloseTo(0.743, 3);
    expect(intercoder(sp, 'ordinal').alpha.wert!).toBeCloseTo(0.815, 3);
    expect(intercoder(sp, 'interval').alpha.wert!).toBeCloseTo(0.849, 3);
    // Wahrer Wert, nicht nur dreistellig
    nah(intercoder(sp, 'nominal').alpha.wert, 0.743421, 1e-6);
  });
  it('Fleiss (1971), irr::diagnoses (30 Fälle, 6 Kodierende): Kappa ,430', () => {
    const e = intercoder(spaltenVon(fall('B_diagnoses')), 'nominal');
    expect(e.fleiss!.wert!).toBeCloseTo(0.430, 3);
    nah(e.fleiss!.wert, 0.4302445, 1e-6);   // irr::kappam.fleiss(diagnoses)
    expect(e.hauptwert).toBe('fleiss');
  });
  it('Die Einheit mit nur einer Kodierung im Krippendorff-Beispiel (Einheit 12) wird gezählt und geht nicht in Alpha ein: 11 Einheiten', () => {
    const e = intercoder(spaltenVon(fall('A_krippendorff_beispiel')), 'nominal');
    expect(e.nEinheiten).toBe(11); expect(e.nNurEine).toBe(1);
  });
});

describe('Alle Fälle gegen R (irrCAC ungerundet; Werte 1e-9, SE und KI 1e-8)', () => {
  for (const f of J.faelle) {
    for (const s of f.skalen) {
      it(`${f.name} (${s}): ${f.beschreibung}`, () => {
        const e = intercoder(spaltenVon(f), s);
        expect(e.nEinheiten, 'nEinheiten').toBe(f.n_einheiten);
        expect(e.nNurEine, 'nNurEine').toBe(f.n_nur_eine);
        expect(e.allesGleich, 'allesGleich').toBe(f.alles_gleich);
        expect(e.hauptwert, 'hauptwert').toBe(f.hauptwert);
        expect(e.paradox, 'paradox').toBe(f.paradox);
        expect(e.skalaGenutzt, 'skalaGenutzt').toBe(f.text ? 'nominal' : s);
        // Prozentuale Übereinstimmung
        if (f.alles_gleich) nah(e.prozent.wert, 1); else koef(e.prozent, f.pa);
        // Fleiss: bei 2 Kodierenden nicht anzeigen (null), sonst gegen irrCAC
        if (f.n_kodierende === 2) expect(e.fleiss, 'Fleiss bei 2 Kodierenden').toBeNull();
        else koef(e.fleiss, f.fleiss);
        // Brennan-Prediger und Alpha
        koef(e.bp, f.bp);
        koef(e.alpha, f.alpha[f.text ? 'nominal' : s]!);
        // Cohen nur bei 2 Kodierenden
        if (f.n_kodierende === 2) nah(e.cohen, f.cohen!); else expect(e.cohen ?? null).toBeNull();
      });
    }
  }
});

describe('Obere Grenze 1 gekappt, untere nicht', () => {
  it('Krippendorff-Beispiel: Prozent, Fleiss, BP, Alpha haben KI-Obergrenze genau 1', () => {
    const e = intercoder(spaltenVon(fall('A_krippendorff_beispiel')), 'nominal');
    for (const k of [e.prozent, e.fleiss!, e.bp, e.alpha]) expect(k.oben).toBe(1);
  });
  it('Zwei Einheiten: KI mit 1 Freiheitsgrad (t = 12,706) ist riesig, die Untergrenze liegt unter -1 und wird NICHT gekappt', () => {
    const f = fall('J_zwei_einheiten'), e = intercoder(spaltenVon(f), 'nominal');
    expect(e.nEinheiten).toBe(2);
    expect(e.alpha.unten!).toBeLessThan(-4);
    koef(e.alpha, f.alpha.nominal!); koef(e.fleiss, f.fleiss); koef(e.bp, f.bp); koef(e.prozent, f.pa);
  });
});

describe('Anzeige-Entscheidung: 2 Kodierende', () => {
  const f = fall('D_zwei_kodierende');
  it('Hauptwert ist Cohens Kappa (wie heute), Fleiss wird nicht ausgegeben - obwohl es als Scotts Pi in R anders ausfällt', () => {
    expect(f.fleiss.wert).not.toBeNull();
    expect(Math.abs(f.fleiss.wert! - f.cohen!)).toBeGreaterThan(1e-4);   // der Grund für die Entscheidung
    const e = intercoder(spaltenVon(f), 'nominal');
    expect(e.hauptwert).toBe('cohen'); expect(e.fleiss).toBeNull();
    nah(e.cohen, 0.6197719, 1e-6);   // irr::kappa2
  });
  it('Cohen aus dem Modul stimmt mit kappaAusTabelle (lib/uebereinstimmung.ts) überein', () => {
    const sp = spaltenVon(f), paare = sp[0]!.map((a, i) => [a, sp[1]![i]!] as [string | number, string | number]);
    nah(intercoder(sp, 'nominal').cohen, kappaAusTabelle(kappaTabelle(paare).tab).kappa);
  });
  it('Krippendorffs Alpha und BP erscheinen auch bei 2 Kodierenden', () => {
    const e = intercoder(spaltenVon(f), 'ordinal');
    koef(e.alpha, f.alpha.ordinal!); koef(e.bp, f.bp); koef(e.prozent, f.pa);
  });
});

describe('Kappa-Paradox: Übereinstimmung >= 0,90 und Kappa < 0,40', () => {
  it('seltene Kategorie (93,3 % Übereinstimmung, Fleiss ,215, BP ,867): paradox', () => {
    const e = intercoder(spaltenVon(fall('C_seltene_kategorie')), 'nominal');
    expect(e.paradox).toBe(true); expect(e.prozent.wert!).toBeGreaterThanOrEqual(0.9); expect(e.fleiss!.wert!).toBeLessThan(0.4);
    nah(e.bp.wert, 0.8666667, 1e-6);
  });
  it('kein Paradox, wenn Kappa >= ,40 (Krippendorff-Beispiel: Fleiss ,76) oder die Übereinstimmung < 90 % (diagnoses)', () => {
    expect(intercoder(spaltenVon(fall('A_krippendorff_beispiel')), 'nominal').paradox).toBe(false);
    expect(intercoder(spaltenVon(fall('B_diagnoses')), 'nominal').paradox).toBe(false);
  });
});

describe('Alles gleich', () => {
  const f = fall('F_alles_gleich');
  for (const s of ['nominal', 'ordinal', 'interval'] as const) {
    it(`${s}: kein Absturz, Kennwerte null, Übereinstimmung 100 %`, () => {
      const e = intercoder(spaltenVon(f), s);
      expect(e.allesGleich).toBe(true);
      expect(e.prozent.wert).toBe(1);
      expect(e.fleiss!.wert).toBeNull(); expect(e.bp.wert).toBeNull(); expect(e.alpha.wert).toBeNull();
      for (const k of [e.fleiss!, e.bp, e.alpha]) { expect(k.se).toBeNull(); expect(k.unten).toBeNull(); expect(k.oben).toBeNull(); }
      expect(e.paradox).toBe(false);
      expect(e.nEinheiten).toBe(5); expect(e.nNurEine).toBe(0);
    });
  }
  it('R liefert hier scheinbar Fleiss = 1 (irrCAC, pe = 1e-15) bzw. NaN (irr): das gilt nicht', () => {
    const j = J.faelle.find(x => x.name === 'F_alles_gleich') as unknown as { irrCAC_roh: { fleiss: number }; irr_roh: { fleiss: number | null } };
    expect(j.irrCAC_roh.fleiss).toBe(1);
    expect(intercoder(spaltenVon(f), 'nominal').fleiss!.wert).toBeNull();
  });
  it('zwei Kodierende, alles gleich: fleiss null, cohen null, kein Absturz', () => {
    const e = intercoder([[1, 1, 1, 1], [1, 1, 1, 1]], 'nominal');
    expect(e.allesGleich).toBe(true); expect(e.fleiss).toBeNull(); expect(e.cohen ?? null).toBeNull(); expect(e.prozent.wert).toBe(1);
    expect(e.alpha.wert).toBeNull(); expect(e.hauptwert).toBe('cohen'); expect(e.paradox).toBe(false);
  });
  it('alles gleich auch mit Lücken und Text', () => {
    const e = intercoder([['ja', 'ja', null, 'ja'], ['ja', null, 'ja', 'ja'], [null, 'ja', 'ja', 'ja']], 'nominal');
    expect(e.allesGleich).toBe(true); expect(e.prozent.wert).toBe(1); expect(e.alpha.wert).toBeNull(); expect(e.nEinheiten).toBe(4);
  });
});

describe('Einheiten mit nur einer Kodierung', () => {
  it('Alpha (alle Skalen) ist so, als gäbe es die Einheiten nicht: G (2 solche Einheiten) hat dasselbe Alpha, SE und KI wie A (1 solche Einheit)', () => {
    const g = fall('G_einheit_mit_einer_kodierung'), a = fall('A_krippendorff_beispiel');
    for (const s of ['nominal', 'ordinal', 'interval'] as const) {
      const eg = intercoder(spaltenVon(g), s), ea = intercoder(spaltenVon(a), s);
      expect(eg.nNurEine).toBe(2); expect(ea.nNurEine).toBe(1); expect(eg.nEinheiten).toBe(11);
      for (const k of ['wert', 'se', 'unten', 'oben'] as const) nah(eg.alpha[k], ea.alpha[k], 1e-12);
    }
  });
  it('Prozent, Fleiss und BP folgen irrCAC auf ALLEN Zeilen (Gwet 2014): Fleiss in A ,761169, in G ,758291 - die zusätzliche Einheit verändert Randverteilung, SE und KI', () => {
    const g = fall('G_einheit_mit_einer_kodierung'), a = fall('A_krippendorff_beispiel');
    const eg = intercoder(spaltenVon(g), 'nominal'), ea = intercoder(spaltenVon(a), 'nominal');
    nah(ea.fleiss!.wert, 0.761169, 1e-6); nah(eg.fleiss!.wert, 0.758291, 1e-6);
    expect(Math.abs(eg.fleiss!.wert! - ea.fleiss!.wert!)).toBeGreaterThan(1e-3);
    nah(ea.prozent.se, 0.125609, 1e-5); nah(eg.prozent.se, 0.142537, 1e-5);   // irrCAC pa.coeff.raw, n = alle Zeilen
    expect(eg.fleiss!.se!).toBeGreaterThan(ea.fleiss!.se!);
    koef(eg.fleiss, g.fleiss); koef(eg.bp, g.bp); koef(eg.prozent, g.pa);
  });
});

describe('Text-Kategorien: Alpha immer nominal', () => {
  const h = fall('H_text_ja_nein'), k = fall('K_text_drei_kategorien_luecken');
  for (const f of [h, k]) {
    for (const s of ['nominal', 'ordinal', 'interval'] as const) {
      it(`${f.name}: verlangt ${s} -> skalaGenutzt 'nominal', Alpha wie nominal, kein Fehler`, () => {
        const e = intercoder(spaltenVon(f), s);
        expect(e.skalaGenutzt).toBe('nominal');
        koef(e.alpha, f.alpha.nominal!);
        koef(e.fleiss, f.fleiss); koef(e.bp, f.bp);
      });
    }
  }
  it('Text und Zahlencodes derselben Struktur geben dasselbe nominale Ergebnis (Text ja/nein = 1/2)', () => {
    const text = spaltenVon(h), zahl = text.map(sp => sp.map(v => v === null ? null : v === 'ja' ? 1 : 2));
    const a = intercoder(text, 'nominal'), b = intercoder(zahl, 'nominal');
    for (const [x, y] of [[a.alpha, b.alpha], [a.fleiss!, b.fleiss!], [a.bp, b.bp], [a.prozent, b.prozent]] as const) { nah(x.wert, y.wert, 1e-12); nah(x.se, y.se, 1e-12); }
  });
});

describe('Eine Kategorie kommt bei einer Person nie vor', () => {
  const f = fall('I_kategorie_fehlt_bei_einer_person');
  it('Kategorie 3 bei Kodierender 3 nie: alle Kennwerte, die Kategorien sind die Vereinigung aller Kodierenden (q = 3 für BP)', () => {
    const sp = spaltenVon(f);
    expect(sp[2]!.includes(3)).toBe(false);
    for (const s of f.skalen) {
      const e = intercoder(sp, s);
      koef(e.fleiss, f.fleiss); koef(e.bp, f.bp); koef(e.alpha, f.alpha[s]!); koef(e.prozent, f.pa);
    }
    // BP: Zufallsübereinstimmung 1/q mit q = 3 -> (pa - 1/3) / (1 - 1/3)
    nah(intercoder(sp, 'nominal').bp.wert, (f.pa.wert! - 1 / 3) / (1 - 1 / 3), 1e-9);
  });
  it('Text-Variante (ja/nein/unklar, Lücken): "unklar" bei Kodierender 3 nie', () => {
    const k = fall('K_text_drei_kategorien_luecken'), sp = spaltenVon(k);
    expect(sp[2]!.includes('unklar')).toBe(false);
    const e = intercoder(sp, 'nominal');
    koef(e.fleiss, k.fleiss); koef(e.bp, k.bp); koef(e.alpha, k.alpha.nominal!);
    nah(e.bp.wert, (k.pa.wert! - 1 / 3) / (1 - 1 / 3), 1e-9);
  });
});

describe('Nur 2 Einheiten', () => {
  it('rechnet (kein Absturz), 1 Freiheitsgrad im KI, alle Skalen', () => {
    const f = fall('J_zwei_einheiten');
    for (const s of f.skalen) {
      const e = intercoder(spaltenVon(f), s);
      expect(e.nEinheiten).toBe(2);
      koef(e.alpha, f.alpha[s]!); koef(e.fleiss, f.fleiss); koef(e.bp, f.bp); koef(e.prozent, f.pa);
    }
  });
});

describe('Lücken und Reihenfolge', () => {
  it('Vertauschen der Kodierenden-Spalten ändert nichts', () => {
    const f = fall('E_ordinal_luecken'), sp = spaltenVon(f), umgekehrt = [...sp].reverse();
    for (const s of f.skalen) {
      const a = intercoder(sp, s), b = intercoder(umgekehrt, s);
      nah(a.alpha.wert, b.alpha.wert, 1e-12); nah(a.fleiss!.wert, b.fleiss!.wert, 1e-12); nah(a.bp.wert, b.bp.wert, 1e-12); nah(a.prozent.wert, b.prozent.wert, 1e-12);
    }
  });
  it('Vertauschen der Einheiten (Zeilen) ändert nichts', () => {
    const f = fall('A_krippendorff_beispiel'), sp = spaltenVon(f), um = sp.map(c => [...c].reverse());
    for (const s of f.skalen) nah(intercoder(sp, s).alpha.wert, intercoder(um, s).alpha.wert, 1e-12);
  });
  it('Alpha ordinal und interval bei 1-5 mit Lücken (E) gegen R', () => {
    const f = fall('E_ordinal_luecken');
    nah(intercoder(spaltenVon(f), 'ordinal').alpha.wert, 0.87804, 1e-5); nah(intercoder(spaltenVon(f), 'interval').alpha.wert, 0.873998, 1e-5);
  });
});
