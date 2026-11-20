import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { spssAngleichen } from './spssangleich';
import { nodeEngine } from './testengine';

/** Nachttest 24.10.2026: Syntax, wie SPSS 27-29 sie aus den Dialogen einfügt (testdaten/spss-einfuegen.sps). Ohne Angleichen brachen 11 von 21 Befehlen in PSPP ab. */
describe('SPSS-Syntax für PSPP angleichen', () => {
  it('T-TEST: /ES fällt weg, die Zeilen zeigen weiter auf den Originaltext', () => {
    const t = 'T-TEST GROUPS=geschlecht(1 2)\n  /MISSING=ANALYSIS\n  /VARIABLES=post\n  /ES DISPLAY(TRUE)\n  /CRITERIA=CI(.95).';
    const a = spssAngleichen(t);
    expect(a.syntax).toBe('T-TEST GROUPS=geschlecht(1 2)\n  /MISSING=ANALYSIS\n  /VARIABLES=post\n  /CRITERIA=CI(.95).');
    expect(a.zeilen).toEqual([0, 1, 2, 4]);
    expect(a.aenderungen).toEqual([{ zeile: 3, befehl: 'T-TEST', grund: 'es', was: '/ES DISPLAY(TRUE)' }]);
  });
  it('ONEWAY: /ES, CILEVEL(0.95) und WELCH; REGRESSION: MISSING LISTWISE, CRITERIA, OUTS', () => {
    const o = spssAngleichen('ONEWAY post BY gruppe\n  /ES=OVERALL\n  /STATISTICS DESCRIPTIVES HOMOGENEITY WELCH\n  /MISSING ANALYSIS\n  /CRITERIA=CILEVEL(0.95)\n  /POSTHOC=TUKEY GH ALPHA(0.05).');
    expect(o.syntax).toBe('ONEWAY post BY gruppe\n  /STATISTICS DESCRIPTIVES HOMOGENEITY\n  /MISSING ANALYSIS\n  /POSTHOC=TUKEY GH ALPHA(0.05).');
    expect(o.aenderungen.map(x => x.grund)).toEqual(['es', 'welch', 'cilevel']);
    const r = spssAngleichen('REGRESSION\n  /MISSING LISTWISE\n  /STATISTICS COEFF OUTS R ANOVA\n  /CRITERIA=PIN(.05) POUT(.10)\n  /NOORIGIN\n  /DEPENDENT post\n  /METHOD=ENTER prae lernzeit.');
    expect(r.syntax).toBe('REGRESSION\n  /STATISTICS COEFF R ANOVA\n  /NOORIGIN\n  /DEPENDENT post\n  /METHOD=ENTER prae lernzeit.');
    expect(r.zeilen).toEqual([0, 2, 4, 5, 6]);
  });
  it('was Zahlen ändern würde, bleibt stehen: PAIRWISE, schrittweise, Indicator(1), CILEVEL(0.90)', () => {
    for (const t of ['REGRESSION /MISSING PAIRWISE /DEPENDENT y /METHOD=ENTER x.', 'ONEWAY y BY g /CRITERIA=CILEVEL(0.90).', 'LOGISTIC REGRESSION VARIABLES y /METHOD=ENTER x g /CATEGORICAL=g /CONTRAST (g)=Indicator(1).'])
      expect(spssAngleichen(t).syntax).toContain(t.includes('PAIRWISE') ? '/MISSING PAIRWISE' : t.includes('0.90') ? 'CILEVEL(0.90)' : 'Indicator(1)');
    expect(spssAngleichen('REGRESSION /CRITERIA=PIN(.05) POUT(.10) /DEPENDENT y /METHOD=STEPWISE x z.').syntax).toContain('/CRITERIA=PIN');
  });
  it('LOGISTIC REGRESSION VARIABLES … /METHOD=ENTER … wird zu … WITH …', () => {
    const a = spssAngleichen('LOGISTIC REGRESSION VARIABLES bestanden\n  /METHOD=ENTER prae geschlecht\n  /CATEGORICAL=geschlecht\n  /CONTRAST (geschlecht)=Indicator\n  /CRITERIA=PIN(.05) POUT(.10) ITERATE(20) CUT(.5).');
    expect(a.syntax).toBe('LOGISTIC REGRESSION bestanden WITH prae geschlecht\n  /CATEGORICAL=geschlecht\n  /CRITERIA= ITERATE(20) CUT(.5).');
    expect(a.aenderungen.map(x => x.grund)).toEqual(['logvariables', 'logcontrast', 'logkrit']);
  });
  it('UNIANOVA wird GLM ohne /PRINT; GLM mit /WSFACTOR geht nicht an PSPP (Meldung von Statable); andere Befehle und Divisionen bleiben unberührt', () => {
    const u = spssAngleichen('UNIANOVA post BY gruppe geschlecht\n  /METHOD=SSTYPE(3)\n  /INTERCEPT=INCLUDE\n  /PRINT ETASQ DESCRIPTIVE\n  /CRITERIA=ALPHA(.05)\n  /DESIGN=gruppe geschlecht gruppe*geschlecht.');
    expect(u.syntax).toBe('GLM post BY gruppe geschlecht\n  /METHOD=SSTYPE(3)\n  /INTERCEPT=INCLUDE\n  /CRITERIA=ALPHA(.05)\n  /DESIGN=gruppe geschlecht gruppe*geschlecht.');
    const g = spssAngleichen('GLM m1 m2 m3\n  /WSFACTOR=zeit 3 Polynomial\n  /WSDESIGN=zeit.');
    expect(g.syntax).toBe('* Statable: uebersprungen.\n* .\n* .');
    expect(g.aenderungen).toEqual([]);
    expect(g.meldungen.vorher).toEqual(['Statable: unsupported GLM /WSFACTOR']);
    const c = 'COMPUTE quote = a / b.\nFREQUENCIES VARIABLES=x\n  /ORDER=ANALYSIS.\n\n* Kommentar /ES.\nT-TEST GROUPS=g(1 2) /VARIABLES=y /ES DISPLAY(TRUE).';
    const r = spssAngleichen(c);
    expect(r.syntax).toBe('COMPUTE quote = a / b.\nFREQUENCIES VARIABLES=x\n  /ORDER=ANALYSIS.\n\n* Kommentar /ES.\nT-TEST GROUPS=g(1 2) /VARIABLES=y.');
    expect(r.zeilen).toEqual([0, 1, 2, 3, 4, 5]);
  });
  it('EXAMINE /CINTERVAL 95 bleibt, wie es ist - PSPP liest den Wert seit 80ddaf8 (nach 2.1.3) in Prozent wie SPSS', () => {
    const a = spssAngleichen('EXAMINE VARIABLES=post BY gruppe\n  /CINTERVAL 95\n  /NOTOTAL.');
    expect(a.syntax).toBe('EXAMINE VARIABLES=post BY gruppe\n  /CINTERVAL 95\n  /NOTOTAL.');
    expect(a.aenderungen).toEqual([]);
  });
  it('Zeilen eines Teil-Laufs (markierter Bereich ab Zeile 10) bleiben richtig', () => {
    const a = spssAngleichen('T-TEST /TESTVAL=50\n  /VARIABLES=prae\n  /ES DISPLAY(TRUE).', [10, 11, 12]);
    expect(a.syntax).toBe('T-TEST /TESTVAL=50\n  /VARIABLES=prae.');
    expect(a.zeilen).toEqual([10, 11]); expect(a.aenderungen[0]!.zeile).toBe(12);
  });
  it('die eingefügte Kurs-Syntax läuft danach in der Engine: nur NONPAR CORR meldet noch einen Fehler; GLM mit Messwiederholung geht gar nicht erst an PSPP', async () => {
    const e = await nodeEngine();
    e.run("GET FILE='/nacht.sav'.", { '/nacht.sav': readFileSync(new URL('../../../pruefdaten/nacht/nacht.sav', import.meta.url)) });
    const a = spssAngleichen(readFileSync(new URL('./testdaten/spss-einfuegen.sps', import.meta.url), 'utf8'));
    const fehler = e.run(a.syntax).filter(i => i.type === 'message' && (i as { severity?: string }).severity === 'error').map(i => String((i as { text: string }).text).split('\n')[0]);
    expect(fehler.length).toBe(1);
    expect(fehler[0]).toMatch(/NONPAR CORR/);
    expect(a.meldungen.vorher).toEqual(['Statable: unsupported GLM /WSFACTOR']);
    expect(JSON.stringify(e.run(a.syntax))).not.toMatch(/9500%|NaN/);
  }, 60000);
});
