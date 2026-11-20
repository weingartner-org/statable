import { describe, expect, it } from 'vitest';
import erwartet from './testdaten/spaeter-d-erwartet.json';
import { gewichtIds, gewichtStatus, schwersterStatus, sperrSatz, type Gewicht } from './gewichte';
import { gewichtStellenIds } from './gewichtkarten';
import { s } from './sitzung.svelte';

/* ===== Welle S-D: Fallgewicht bei den neuen Stellen (Sperrtabelle `TABELLE` in lib/gewichte.ts; Fachblatt S-D „Für alle“ und „Entscheidungen Opus“ 1, 4, 5, 6) =====
 * Soll: scripts/spaeter-d-erwartet.R → testdaten/spaeter-d-erwartet.json (gewichte). Bauer A trägt `mediation:bedingt` ein, Bauer B `referenz:alle` und `ausreisser:alle` (jeder nur seine Zeile, Opus führt zusammen).
 *   mediation:bedingt   sperren | sperren   Modelle 6, 7, 14 (Bootstrap, Produktterm)
 *   referenz:alle       sperren | sperren   Referenzbereich: eine Referenzperson zählt einmal
 *   ausreisser:alle     hinweis | hinweis   Ausreißertests prüfen Zeilen (wie datencheck:alle): „Das Fallgewicht wird hier nicht verwendet.“
 *   unverändert: faelle:alle und kategorien:alle hinweis | hinweis (G11, G12 wohnen dort), power:alle unberührt | unberührt (M9)
 * Karten (lib/gewichtkarten.ts, `KartenWahl`, jeweils NUR ein neues optionales Feld):
 *   mediation  + bedingt: true   → gewichtStellenIds enthält zusätzlich 'mediation:bedingt' (sonst unverändert ['mediation:pfade', 'mediation:bootstrap'])
 *   verteilung + referenz: true  → zusätzlich 'referenz:alle';  verteilung + ausreisser: true → zusätzlich 'ausreisser:alle'
 *   stellenTitel('mediation:bedingt' | 'referenz:alle' | 'ausreisser:alle') ist ein eigener Name (nicht „Dieses Verfahren“).
 */
s.einst.sprache = 'de'; s.einst.anrede = 'du';
const G = (erwartet as any).gewichte, T = G.neue_schluessel as { id: string; h: string; u: string; was: string }[], U = G.unveraendert as { id: string; h: string; u: string }[];
const gH: Gewicht = { spalte: 'w', art: 'haeufigkeit' }, gU: Gewicht = { spalte: 'wu', art: 'umfrage' };

describe('Die drei neuen Schlüssel der Sperrtabelle', () => {
  it('es sind genau drei, mit den Sollzuständen aus den Entscheidungen', () => {
    expect(T.map(t => t.id).sort()).toEqual(['ausreisser:alle', 'mediation:bedingt', 'referenz:alle']);
  });
  for (const t of T) it(`${t.id}: Häufigkeit ${t.h}, Umfrage ${t.u}`, () => {
    expect(gewichtIds(), `${t.id} fehlt in TABELLE`).toContain(t.id);
    expect(gewichtStatus(t.id, 'haeufigkeit')).toBe(t.h); expect(gewichtStatus(t.id, 'umfrage')).toBe(t.u);
  });
  for (const t of U) it(`unverändert: ${t.id} ${t.h} | ${t.u}`, () => { expect(gewichtStatus(t.id, 'haeufigkeit')).toBe(t.h); expect(gewichtStatus(t.id, 'umfrage')).toBe(t.u); });
  it('bedingte Mediation und Referenzbereich sind bei beiden Gewichtsarten gesperrt, die Ausreißertests nur ein Hinweis', () => {
    for (const art of ['haeufigkeit', 'umfrage'] as const) { expect(gewichtStatus('mediation:bedingt', art)).toBe('sperren'); expect(gewichtStatus('referenz:alle', art)).toBe('sperren'); expect(gewichtStatus('ausreisser:alle', art)).toBe('hinweis'); }
  });
});

describe('Karten nennen die neuen Stellen nur, wenn die Option gewählt ist', () => {
  for (const art of ['haeufigkeit', 'umfrage'] as const) {
    it(`Mediation (${art}): bedingt → mediation:bedingt dazu, ohne bleibt alles wie in S-A`, () => {
      expect(gewichtStellenIds({ verfahren: 'mediation', art })).toEqual(['mediation:pfade', 'mediation:bootstrap']);
      expect(gewichtStellenIds({ verfahren: 'mediation', art, bedingt: true } as any)).toEqual(['mediation:pfade', 'mediation:bootstrap', 'mediation:bedingt']);
      expect(schwersterStatus(gewichtStellenIds({ verfahren: 'mediation', art, bedingt: true } as any), art)).toBe('sperren');
    });
    it(`Verteilung (${art}): Referenzbereich und Ausreißertests sind eigene Stellen`, () => {
      const basis = gewichtStellenIds({ verfahren: 'verteilung', art });
      expect(basis).not.toContain('referenz:alle'); expect(basis).not.toContain('ausreisser:alle');
      expect(gewichtStellenIds({ verfahren: 'verteilung', art, referenz: true } as any)).toEqual([...basis, 'referenz:alle']);
      expect(gewichtStellenIds({ verfahren: 'verteilung', art, ausreisser: true } as any)).toEqual([...basis, 'ausreisser:alle']);
    });
  }
  it('die Ausreißertests sperren die Karte Verteilung nicht (schwerster Status bleibt der der Verteilung), der Referenzbereich sperrt sie', () => {
    const v = gewichtStellenIds({ verfahren: 'verteilung', art: 'haeufigkeit', ausreisser: true } as any); expect(schwersterStatus(v, 'haeufigkeit')).not.toBe('sperren');
    expect(schwersterStatus(gewichtStellenIds({ verfahren: 'verteilung', art: 'haeufigkeit', referenz: true } as any), 'haeufigkeit')).toBe('sperren');
  });
});

describe('Sperrsätze: Wort „Fallgewicht“, kein bloßes „Gewicht“', () => {
  const nurFallgewicht = (t: string) => expect(t.match(/(?<!Fall|Häufigkeits|Umfrage)[Gg]ewicht(?!et)/g), t).toBeNull();
  it('bedingte Mediation und Referenzbereich: mit beiden Gewichtsarten ein Satz mit dem Titel', () => {
    for (const id of ['mediation:bedingt', 'referenz:alle']) for (const g of [gH, gU]) { const t = sperrSatz(id, g, 'Der Referenzbereich')!; expect(t, `${id} ${g.art}`).toContain('Der Referenzbereich'); expect(t).toContain(g.spalte); nurFallgewicht(t); }
    expect(sperrSatz('referenz:alle', gH, 'x')!).toContain('Fallgewicht');
  });
  it('Ausreißertests: nur der Hinweis „Das Fallgewicht wird hier nicht verwendet.“, bei beiden Arten', () => {
    for (const g of [gH, gU]) expect(sperrSatz('ausreisser:alle', g, 'Der Ausreißertest')).toBe('Das Fallgewicht wird hier nicht verwendet.');
  });
});
