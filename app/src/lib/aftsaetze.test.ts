import { describe, expect, it } from 'vitest';
import { s } from './sitzung.svelte';
import { saetzeAft, tabellenAft, saetzeFrailty } from './aftsaetze';
import type { AftErgebnis, AftVerteilung, FrailtyErgebnis } from './aft';

/* S-F2 Prüfung N3 und N5: Wortbildung der Verteilungen (kein „log-logistisch-Modell“, „exponentiell-Verteilung“) und Frailty-Satz ohne „Tiere“. */
s.einst.sprache = 'de'; s.einst.anrede = 'du';
const aft = (dist: AftVerteilung): AftErgebnis => ({
  art: 'aft', dist, praed: [{ name: 'sex', art: 'zahl', stufen: [] }], n: 227, ausgelassen: 0, ereignisse: 164, npar: 2,
  koef: [{ pIdx: -1, achsenabschnitt: true, stufe: '', b: 6, se: .3, z: 20, p: 0, zv: 400, kiU: 300, kiO: 500 }, { pIdx: 0, achsenabschnitt: false, stufe: '', b: .4, se: .12, z: 3.2, p: .001, zv: 1.49, kiU: 1.17, kiO: 1.9 }],
  skala: .73, loglik: -1132, loglik0: -1150, aic: 2274.9, hrWeibull: [{ pIdx: 0, stufe: '', hr: .58, kiU: .41, kiO: .8 }],
  vergleich: [{ dist: 'weibull', aic: 2300, loglik: -1 }, { dist: 'exponential', aic: 2295.1, loglik: -1 }, { dist: 'lognormal', aic: 2303.8, loglik: -1 }, { dist: 'loglogistic', aic: 2285, loglik: -1 }], trennung: false, warnungen: []
});
const text = (e: AftErgebnis) => { const a = saetzeAft(e, x => x); return [a.hinweise.join(' '), a.zusatz, a.apa, ...a.marken.map(m => m.text), JSON.stringify(tabellenAft(e, x => x))].join(' '); };
describe('Wortbildung der Verteilungen (N3)', () => {
  it('de: nie „log-logistisch-Modell“, „exponentiell-Verteilung“, „log-normal-Modell“; stattdessen die Verteilung als Hauptwort', () => {
    for (const d of ['weibull', 'exponential', 'lognormal', 'loglogistic'] as const) { const t = text(aft(d)); expect(t, d).not.toMatch(/(logistisch|normal|exponentiell)-(Modell|Verteilung)/); }
    expect(text(aft('loglogistic'))).toMatch(/log-logistische Verteilung/); expect(text(aft('exponential'))).toMatch(/Exponentialverteilung/); expect(text(aft('lognormal'))).toMatch(/log-normale Verteilung/);
  });
  it('de: AIC-Satz „passt die log-logistische Verteilung am besten“', () => { const t = text(aft('weibull')); expect(t).toMatch(/passt die log-logistische Verteilung am besten/); });
  it('en: nie „exponential-model“, die Verteilung als „… distribution“', () => { s.einst.sprache = 'en'; try { const t = text(aft('loglogistic')); expect(t).toMatch(/log-logistic distribution/); expect(t).not.toMatch(/exponentiell|logistisch/); } finally { s.einst.sprache = 'de'; } });
});
describe('Frailty-Satz (N5)', () => {
  it('„Zeilen derselben Gruppe (z. B. derselben Person)“ statt „Tiere oder Personen“', () => {
    const e: FrailtyErgebnis = { art: 'frailty', modell: 'gamma', ties: 'efron', praed: [{ name: 'rx', art: 'zahl', stufen: [] }], kennung: 'wurf', n: 300, ausgelassen: 0, ereignisse: 42, gruppen: 100, npar: 1, wenigeGruppen: false,
      koef: [{ pIdx: 0, stufe: '', b: .73, se: .32, seNaiv: null, z: 2.3, p: .022, hr: 2.07, kiU: 1.1, kiO: 3.9 }], varianz: 2.02, cLoglik: -217.5, loglik0: -222.7, lrChi2: 10.2, pHalbiert: .0007, rand: false, warnungen: [] };
    const t = saetzeFrailty(e, x => x, 'x').zusatz; expect(t).toMatch(/Zeilen derselben Gruppe \(z\. B\. derselben Person\)/); expect(t).not.toMatch(/Tiere/);
  });
});
