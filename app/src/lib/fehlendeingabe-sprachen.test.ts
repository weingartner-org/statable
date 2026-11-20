import { afterEach, describe, expect, it } from 'vitest';
import { s } from './sitzung.svelte';
import { FREIGEGEBEN, ladeSprache, type Sprache } from '../i18n/laufzeit';
import { fehlendAlsText, leseFehlendEingabe } from './fehlendeingabe';

/* Anzeige und Lesen müssen in jeder Sprache zusammenpassen: Das Wort für „bis“ kommt aus demselben L() (Leitfaden Falle 25). Echte Sprachdateien aus i18n/sprachen/. */
const vorher = s.einst.sprache;
afterEach(() => { s.einst.sprache = vorher; });

describe('Fehlend-Bereich: die Anzeige wird in jeder Sprache wieder gelesen', () => {
  for (const sp of FREIGEGEBEN) it(`${sp}: „-9 … -1; 99“ kommt unverändert zurück`, async () => {
    if (sp !== 'de' && sp !== 'en') await ladeSprache(sp as Sprache);
    s.einst.sprache = sp;
    for (const q of [{ fehlend: [99], fehlendBereich: { von: -9, bis: -1 } }, { fehlend: [], fehlendBereich: { von: -9, bis: -1 } }, { fehlend: [], fehlendBereich: { von: -Infinity, bis: 0 } }, { fehlend: [-1], fehlendBereich: { von: 5, bis: Infinity } }]) {
      const text = fehlendAlsText(q);
      expect(leseFehlendEingabe(text), `${sp}: „${text}“`).toEqual(q);
    }
  });
  it('das Wort in der Anzeige kollidiert nicht mit Einzelwerten und Zahlen', async () => {
    await ladeSprache('pt'); s.einst.sprache = 'pt';
    expect(leseFehlendEingabe('99; -9 a -1')).toEqual({ fehlend: [99], fehlendBereich: { von: -9, bis: -1 } });
    expect(leseFehlendEingabe('-9, -8, 99')).toEqual({ fehlend: [-9, -8, 99] });
  });
});
