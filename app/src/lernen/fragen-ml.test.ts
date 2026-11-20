/**
 * V5 Teil 2 (14.11.2026): Die Zahlen des Lernpfads „Maschinelles Lernen verstehen“ (Hilfe-Artikel `ml-…`, Fragen `ml-…`) stammen aus
 * scripts/ueben-erwartet-ml.R (Palmer-Pinguine). Dieser Wächter vergleicht die Zahlen in Artikeln und Fragen mit lib/testdaten/ueben-erwartet-ml.json
 * und prüft, dass Pfad, Einheiten und der Sprung aus dem Lernlabor-Reiter „Vorhersagen“ zusammenpassen.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { FRAGEN } from './fragen-ml';
import { ROH_ML } from '../hilfe/artikel-ml';
import { PFADE, pfadNach, einheitNach } from './lernplan';
import { pfadGruppen } from './pfadgruppen';

type Nachbar = { tiefe: number; masse: number; abstand: number; geschlecht: string };
const s = JSON.parse(readFileSync(new URL('../lib/testdaten/ueben-erwartet-ml.json', import.meta.url), 'utf8')) as Record<string, unknown>;
const n = (k: string) => s[k] as number;
const de = (x: number) => String(x).replace('.', ',');
const txt = (o: unknown) => JSON.stringify(o);
const artikel = (id: string) => txt(ROH_ML.find(r => r.id === id));
const frage = (id: string) => txt(FRAGEN.find(f => f.id === id));
const beide = (t: string, x: number, einheit = '') => { expect(t, `${x}${einheit}`).toContain(de(x) + einheit); expect(t, `${x}${einheit}`).toContain(String(x) + (einheit === ' %' ? '%' : einheit)); };
const nachbarn = s.nachbarn as Nachbar[], rohNachbarn = s.roh_nachbarn as Nachbar[];
const kf = s.k15_konfusion as number[][], testMinK = s.test_min_k as number[];

describe('V5 Teil 2: Maschinelles Lernen verstehen', () => {
  it('Pfad mit vier neuen Einheiten in „Vertiefen“, je Einheit mindestens 4 Fragen, alle Fragen eingebunden', () => {
    const p = pfadNach('maschinelles-lernen')!;
    expect(p.einheiten.slice(0, 4)).toEqual(['ml-grundidee', 'ml-knn', 'ml-ueberanpassung', 'ml-konfusionsmatrix']);
    expect(p.einheiten.at(-1)).toBe('abschluss-maschinelles-lernen');
    const alle = p.einheiten.slice(0, 4).flatMap(id => {
      const e = einheitNach(id)!;
      expect(e.fragen.length).toBeGreaterThanOrEqual(4); expect(e.probieren).toContain('lernlabor/vorhersagen'); expect(e.hilfe[0]).toBe(id);
      return e.fragen;
    });
    expect(alle).toEqual(FRAGEN.map(f => f.id));
    expect(pfadGruppen(PFADE).find(g => g.id === 'vertiefen')!.pfade.map(x => x.id)).toContain('maschinelles-lernen');
  });

  it('Aufteilung, Kennzahlen und Fehler wie in R (Artikel)', () => {
    const g = artikel('ml-grundidee'), k = artikel('ml-knn'), u = artikel('ml-ueberanpassung'), m = artikel('ml-konfusionsmatrix');
    expect(g).toContain(`Von ${n('n')} Palmer-Pinguinen`); expect(g).toContain(`${n('training')} Tiere`);
    expect(g).toContain(`${n('test_weiblich')} weiblich und ${n('test_maennlich')} männlich`);
    expect(g).toContain(`k = ${n('cv_bestes_k')}`); expect(g).toContain(`Trefferquote bei ${100 - n('test_fehler_bestes_k_prozent')} %`);
    beide(k, n('sd_masse'), ' g'); beide(k, n('sd_tiefe'), ' mm'); beide(k, n('mittel_tiefe'), ' mm'); beide(k, n('mittel_masse'), ' g');
    beide(k, n('q_std_tiefe')); beide(k, n('q_std_masse'));
    expect(k).toContain(`roh ${n('q_roh_tiefe')} und die Masse ${n('q_roh_masse')}`);
    expect(k).toContain(`von ${n('k15_fehler_prozent')} % auf ${n('roh_k15_fehler_prozent')} %`);
    beide(k, n('fall_tiefe'), ' mm'); expect(k).toContain(`${n('fall_masse')} g`);
    for (const nb of nachbarn) { beide(k, nb.abstand); expect(k).toContain(`'${nb.masse} g'`.slice(1, -1)); }
    for (const nb of rohNachbarn) { expect(nb.masse).toBe(n('fall_masse')); expect(k).toContain(de(nb.tiefe)); }
    expect(u).toContain(`${de(n('k1_fehler_training_prozent'))} % (${n('k1_fehler_training_faelle')} von ${n('training')} Tieren falsch), Testfehler ${n('k1_fehler_test_prozent')} %`);
    expect(u).toContain(`bei k = ${n('cv_bestes_k')} am kleinsten: ${de(n('cv_fehler_prozent'))} % (${n('cv_fehler_faelle')} von ${n('training')}`);
    expect(u).toContain(`Testfehler bei ${n('test_fehler_bestes_k_prozent')} %`);
    expect(u).toContain(`k = ${testMinK.join(' oder ')} mit ${n('test_min_prozent')} %`);
    for (const z of kf) expect(m).toContain(`"${z[0]}","${z[1]}","${z[0]! + z[1]!}"`);
    expect(m).toContain(`(${kf[0]![0]} + ${kf[1]![1]}) / 100 = ${n('k15_treffer_prozent')} %`);
    beide(m, n('k15_sens_weiblich_prozent'), ' %'); beide(m, n('k15_sens_maennlich_prozent'), ' %');
    expect(m).toContain(`trifft hier ${n('immer_weiblich_prozent')} %`);
  });

  it('Zahlen der Fragen wie in R', () => {
    const geschlechtDe = (g: string) => g;
    expect(frage('ml-kn-hand')).toContain(nachbarn.map(x => `${geschlechtDe(x.geschlecht)} (${de(x.abstand)})`).join(', '));
    expect(frage('ml-ue-luecke')).toContain(`${de(n('k1_fehler_training_prozent'))} % (${n('k1_fehler_training_faelle')} von ${n('training')} Tieren falsch), Testfehler ${n('k1_fehler_test_prozent')} %`);
    expect(frage('ml-ue-wahl')).toContain(`k = ${n('cv_bestes_k')} (${de(n('cv_fehler_prozent'))} %)`);
    expect(frage('ml-ue-wahl')).toContain(`k = ${testMinK[0]} mit ${n('test_min_prozent')} %`);
    expect(frage('ml-kn-roh-fehler')).toContain(`standardisiert ${n('k15_fehler_prozent')} % Fehler, mit rohen Werten ${n('roh_k15_fehler_prozent')} %`);
    expect(frage('ml-km-sens')).toContain(`${de(n('k15_anteil_richtig_unter_vorhergesagt_weiblich_prozent'))} % (${kf[0]![0]} von ${n('k15_vorhergesagt_weiblich')})`);
    expect(frage('ml-km-raten')).toContain(`${n('immer_weiblich_prozent')} %; die ${n('k15_treffer_prozent')} %`);
    expect(frage('ml-km-treffer')).toContain(`Von ${kf[0]![0]! + kf[0]![1]!} weiblichen Tieren werden ${kf[0]![0]} als weiblich und ${kf[0]![1]} als männlich vorhergesagt, von ${kf[1]![0]! + kf[1]![1]!} männlichen ${kf[1]![1]} als männlich und ${kf[1]![0]} als weiblich`);
    beide(frage('ml-km-treffer'), n('k15_sens_weiblich_prozent'), ' %'); beide(frage('ml-km-treffer'), n('k15_sens_maennlich_prozent'), ' %');
    beide(frage('ml-kn-standard'), n('sd_tiefe'), ' mm'); beide(frage('ml-kn-standard'), n('sd_masse'), ' g');
    beide(frage('ml-kn-standard'), n('q_std_tiefe')); beide(frage('ml-kn-standard'), n('q_std_masse'));
  });

  it('Sprung aus dem Lernlabor-Reiter „Vorhersagen“ in den Pfad', () => {
    const quelle = readFileSync(new URL('../bausteine/LernlaborVorhersagen.svelte', import.meta.url), 'utf8');
    expect(quelle).toContain('href="#lernen/pfad/maschinelles-lernen"');
  });
});
