import { describe, expect, it } from 'vitest';
import { FAECHER, HEIMAT, kartenGruppen, sichtbar, beispielReihenfolge, PSYCHOLOGIE_BEISPIELE, type KartenGruppe } from './fach';
import { VERFAHREN } from './verfahren';

/* Eigene Tests des Baus (Welle S-A, Teil 4): die Gruppierung der Kartenliste nach Fach. Die Gruppen sind die von Blatt.svelte (KARTENGRUPPEN). */
const GRUPPEN: KartenGruppe[] = [
  { id: 'unterschied', titel: 'u', ids: ['gruppen', 'kreuz', 'praepost', 'messwiederholung', 'einzelfall'] },
  { id: 'zusammenhang', titel: 'z', ids: ['zusammenhang', 'korrmatrix', 'vorhersage'] },
  { id: 'fragebogen', titel: 'f', ids: ['skala', 'faktor', 'uebereinstimmung', 'kategorien'] },
  { id: 'beschreiben', titel: 'b', ids: ['verteilung'] },
  { id: 'mixed', titel: 'm', ids: ['faelle'] },
  { id: 'weitere', titel: 'w', ids: ['mehrebenen', 'meta', 'kaplanmeier', 'mediation', 'moderation'], zu: true }
];
const alle = (g: KartenGruppe[]) => g.flatMap(x => x.ids);

describe('Kartenliste nach Fach (kartenGruppen)', () => {
  it('Bildung und Psychologie: dieselben 19 Karten in denselben Gruppen, nur die Reihenfolge ändert sich (Psychologie vorne, Weitere zuletzt)', () => {
    const g = kartenGruppen(GRUPPEN, 'bildung');
    expect(alle(g).length).toBe(19);
    expect([...alle(g)].sort()).toEqual([...alle(GRUPPEN)].sort());
    for (const x of GRUPPEN) expect([...(g.find(y => y.id === x.id)?.ids ?? [])].sort(), x.id).toEqual([...x.ids].sort());
    expect(g[0]!.id).toBe('fragebogen'); expect(g[0]!.ids.slice(0, 2)).toEqual(['skala', 'faktor']);
    expect(g.at(-1)!.id).toBe('weitere'); expect(g.at(-1)!.ids.slice(0, 3)).toEqual(['mediation', 'moderation', 'mehrebenen']);
    expect(g.find(x => x.id === 'unterschied')!.ids.slice(0, 3)).toEqual(['messwiederholung', 'praepost', 'gruppen']);
  });
  it('andere Fächer und „Alle“: Gruppen und Reihenfolge unverändert gegenüber der Matrix', () => {
    expect(kartenGruppen(GRUPPEN, 'alle')[0]!.id).toBe('unterschied');
    for (const f of ['medizin', 'bio', 'wirtschaft', 'technik', 'informatik'] as const) expect(kartenGruppen(GRUPPEN, f)[0]!.id, f).toBe('unterschied');
  });
  it('Beispiele: bei Bildung und Psychologie stehen die vier Psychologie-Beispiele zuerst, sonst bleibt die Liste', () => {
    const liste = ['a', 'schlafentzug', 'b', 'aggression', 'c', 'anker-effekt', 'woerter-erkennen'].map(id => ({ id }));
    expect(beispielReihenfolge(liste, 'bildung').map(x => x.id)).toEqual([...PSYCHOLOGIE_BEISPIELE, 'a', 'b', 'c']);
    for (const f of ['medizin', 'bio', 'wirtschaft', 'technik', 'informatik', 'alle'] as const) expect(beispielReihenfolge(liste, f)).toBe(liste);
  });
  it('Alle Verfahren zeigen: ebenfalls wie heute, nichts ausgeblendet, die eingeklappte Gruppe bleibt eingeklappt', () => {
    expect(kartenGruppen(GRUPPEN, 'alle')).toEqual(GRUPPEN);
  });
  it('Jede Karte erscheint höchstens einmal; die Zahl stimmt mit der Matrix; die Gruppen sind nie leer', () => {
    for (const f of FAECHER) {
      const g = kartenGruppen(GRUPPEN, f.id), ids = alle(g);
      expect(new Set(ids).size, f.id).toBe(ids.length);
      expect(ids.sort(), f.id).toEqual(alle(GRUPPEN).filter(i => sichtbar(i, f.id) !== 'nein').sort());
      expect(g.every(x => x.ids.length > 0), f.id).toBe(true);
    }
  });
  it('Medizin: Meta-Analyse und Kaplan-Meier stehen an ihrem Platz, Mediation, Moderation und Mehrebenen eingeklappt, Einzelfall, Fälle und Kategorien fehlen', () => {
    const g = kartenGruppen(GRUPPEN, 'medizin'), id = (n: string) => g.find(x => x.id === n)?.ids ?? [];
    expect(id('unterschied')).toEqual(expect.arrayContaining(['meta', 'kaplanmeier'])); expect(id('weitere').sort()).toEqual(['mediation', 'mehrebenen', 'moderation']);
    expect(alle(g)).not.toContain('einzelfall'); expect(alle(g)).not.toContain('faelle'); expect(alle(g)).not.toContain('kategorien');
    expect(g.find(x => x.id === 'weitere')?.zu).toBe(true);
  });
  it('Technik: die Gruppe „Weitere Verfahren“ entfällt ganz; die Kern-Karten bleiben in ihren Gruppen', () => {
    const g = kartenGruppen(GRUPPEN, 'technik');
    expect(g.find(x => x.id === 'weitere')).toBeUndefined(); expect(alle(g).length).toBe(9); expect(g.find(x => x.id === 'zusammenhang')?.ids).toEqual(['zusammenhang', 'korrmatrix', 'vorhersage']);
  });
  it('Wirtschaft: Mediation, Moderation und Mehrebenen wandern in ihre Heimatgruppe', () => {
    const g = kartenGruppen(GRUPPEN, 'wirtschaft');
    expect(g.find(x => x.id === 'zusammenhang')?.ids).toEqual(['zusammenhang', 'korrmatrix', 'vorhersage', 'mehrebenen', 'mediation', 'moderation']);
    expect(g.find(x => x.id === 'weitere')?.ids).toEqual(['kaplanmeier']);
  });
  it('die Heimat ist eine echte Gruppe, und jede Karte der Heimat gibt es als Verfahren', () => {
    for (const [karte, heimat] of Object.entries(HEIMAT)) { expect(GRUPPEN.some(x => x.id === heimat && !x.zu)).toBe(true); expect(VERFAHREN.some(v => v.id === karte)).toBe(true); }
  });
});
