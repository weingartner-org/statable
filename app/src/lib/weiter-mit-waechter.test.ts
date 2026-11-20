import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** (f3-t und f4-t gibt es zweimal: als noch geschlossene Schritte und als echte Abschnitte; es zählt der letzte.)
 *  Wächter Stufe 4a „Statable usable machen“: Alle Zusatzblöcke unter dem Ergebnis stehen an genau einer Stelle, im Abschnitt „Weiter mit …“
 *  (zwischen Schritt 3 „Ergebnis“ und Schritt 4 „Für deine Arbeit“); „Als Nächstes“ ist in die Gruppen aufgelöst. */
const SRC = fileURLToPath(new URL('..', import.meta.url));
const t = readFileSync(join(SRC, 'seiten/Blatt.svelte'), 'utf-8');
const von = t.indexOf('id="wm-t"'), bis = t.lastIndexOf('id="f4-t"'), f3 = t.lastIndexOf('id="f3-t"');

const MARKEN = ['<ExcelTiBlock', '<BlattKursFTest', '<MatchingBlock', '<BlattZusatz', '<QcaBlock', '<BlattPosthoc', '<KontrasteBlock', '<BlattZufall', '<StreuErweitert',
  '<ImputationBlock', '<KreuzResiduen', '<KorrespondenzBlock', '<BaumBlock', '<RaschBlock', '<KonfirmatorischeFa', '<Rocdiagramm', "<summary>{L('Weitere Auswertungen'", 'Weiter mit der Skala'];

describe('Weiter-mit-Wächter (Blatt.svelte)', () => {
  it('der Abschnitt „Weiter mit …“ gibt es genau einmal, zwischen Schritt 3 und Schritt 4', () => {
    expect(t.split('id="wm-t"').length - 1).toBe(1);
    expect(f3).toBeGreaterThan(-1);
    expect(von).toBeGreaterThan(f3);
    expect(bis).toBeGreaterThan(von);
  });
  it('die drei Gruppen stehen im Abschnitt', () => {
    for (const g of ['wm-g-genauer', 'wm-g-anders', 'wm-g-naechste']) { const i = t.indexOf(`id="${g}"`); expect(i, g).toBeGreaterThan(von); expect(i, g).toBeLessThan(bis); }
  });
  for (const m of MARKEN) {
    it(`${m} steht nur im Abschnitt „Weiter mit …“`, () => {
      const orte: number[] = []; let i = -1;
      while ((i = t.indexOf(m, i + 1)) !== -1) orte.push(i);
      expect(orte.length, m).toBeGreaterThan(0);
      for (const o of orte) { expect(o, m).toBeGreaterThan(von); expect(o, m).toBeLessThan(bis); }
    });
  }
  it('„Als Nächstes“ ist aufgelöst: kein <NaechsterSchritt mehr', () => {
    expect(t).not.toContain('<NaechsterSchritt');
    expect(t).toContain('<WeiterMitListe');
  });
});
