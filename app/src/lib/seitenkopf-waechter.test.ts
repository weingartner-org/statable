import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Wächter Stufe 1 „Statable usable machen“: Alle Seiten haben denselben Seitenkopf (`bausteine/SeitenKopf.svelte`), jede Seite hat höchstens einen Zurück-Ausgang,
 *  und die Kopfzeile oben rechts hat Größe, Farben und Sprache nur noch im Menü „Ansicht“. */
const SRC = fileURLToPath(new URL('..', import.meta.url));
const lies = (p: string) => readFileSync(join(SRC, p), 'utf-8');
const seiten = readdirSync(join(SRC, 'seiten')).filter(n => n.endsWith('.svelte'));

/** Ausnahmen mit Grund: Start hat keinen Seitenkopf (Willkommen-Seite), Blatt folgt in Stufe 4. */
const AUSNAHMEN: Record<string, string> = {
  'Start.svelte': 'Startseite mit eigener Begrüßung, kein Seitenkopf',
  'Blatt.svelte': 'kommt in Stufe 4 (Blatt-Umbau)',
};

describe('Seitenkopf-Wächter', () => {
  it('es gibt Seiten zu prüfen', () => expect(seiten.length).toBeGreaterThan(15));
  it('jede Ausnahme nennt einen Grund und gibt es wirklich', () => {
    for (const [n, grund] of Object.entries(AUSNAHMEN)) { expect(seiten, n).toContain(n); expect(grund.length).toBeGreaterThan(5); }
  });
  for (const n of seiten.filter(n => !(n in AUSNAHMEN))) {
    it(`${n}: nutzt <SeitenKopf> und hat keine eigene Kopfzeile mit <h1`, () => {
      const t = lies(`seiten/${n}`);
      expect(t, 'SeitenKopf fehlt').toContain('<SeitenKopf');
      expect(t.match(/<div[^>]*class="(?:blatt-kopf|daten-kopf)[^"]*"[^>]*>\s*(?:<div[^>]*>\s*)?<h1/g) ?? [], 'eigene Kopfzeile mit h1').toEqual([]);
    });
    it(`${n}: höchstens ein <Zurueck`, () => {
      const t = lies(`seiten/${n}`);
      // Mehrere SeitenKopf-Aufrufe in einer Datei (z. B. Rechtliches) sind je ein Zweig; ein Zurück je Aufruf ist erlaubt, daneben kein weiteres <Zurueck.
      expect((t.match(/<Zurueck/g) ?? []).length, 'eigenes <Zurueck daneben').toBeLessThanOrEqual(0);
    });
  }
  it('Kopfzeile: Größe, Farben und Sprache nicht mehr einzeln, sondern im Menü Ansicht', () => {
    const app = lies('App.svelte');
    expect(app).toContain('<AnsichtMenue />');
    for (const c of ['<Groesse', '<Farbwahl', '<Sprachwahl']) expect(app, c).not.toContain(c);
    const menue = lies('bausteine/AnsichtMenue.svelte');
    for (const c of ['<Groesse flach', '<Farbwahl flach', '<Sprachwahl flach']) expect(menue, c).toContain(c);
  });
  it('Spalten hat genau einen Ausgang „Fertig“, kein „Zurück“ und kein „Fertig - zur Frage“', () => {
    const t = lies('seiten/Spalten.svelte');
    expect(t).toMatch(/'Fertig', 'Done'/);
    expect(t).not.toContain('Fertig - zur Frage');
  });
});
