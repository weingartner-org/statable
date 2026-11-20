import { describe, expect, it } from 'vitest';
import erwartet from './testdaten/spaeter-e-erwartet.json';
import { gewichtIds, gewichtStatus, schwersterStatus, sperrSatz, type Gewicht } from './gewichte';
import { gewichtStellenIds, stellenTitel, verwendetGewicht } from './gewichtkarten';
import { s } from './sitzung.svelte';

/* ===== Welle S-E: Fallgewicht bei den neuen Stellen (Sperrtabelle `TABELLE` in lib/gewichte.ts; Fachblatt S-E „Für alle“, 1.7, 2.8, 3.8, 4.10 und „Entscheidungen Opus (18.10.)“ 4) =====
 * ROTER TEST des Sollwert-Prüfers. Soll: scripts/spaeter-e-erwartet.R → testdaten/spaeter-e-erwartet.json (Abschnitt gewichte). Der Bauer ändert Test und JSON nicht.
 * Bauer A trägt `vorhersage:quantil` und `vorhersage:penalisiert` ein, Bauer B `zeitreihen:alle` und `cluster:alle` (jeder nur seine Zeilen, Opus führt zusammen).
 *   vorhersage:quantil      sperren | sperren   (auch Häufigkeitsgewicht: weights= gibt andere Standardfehler als das Wiederholen der Zeilen)
 *   vorhersage:penalisiert  sperren | sperren   (gleiche Fälle stünden in Training und Test der Kreuzvalidierung)
 *   zeitreihen:alle         sperren | sperren   (jeder Zeitpunkt zählt einmal)
 *   cluster:alle            sperren | sperren   (Mehrfachfälle verzerren die Gruppen)
 *   unverändert: vorhersage:linear rechnen | sperren (mit Haken design), vorhersage:zufall rechnen | sperren, vorhersage:logistik, vorhersage:ordinal-multinomial-zaehl
 * Karten (lib/gewichtkarten.ts, `KartenWahl`, nur zwei neue optionale Felder):
 *   vorhersage + quantil: true      → gewichtStellenIds = ['vorhersage:quantil']       (statt 'vorhersage:linear')
 *   vorhersage + penalisiert: true  → gewichtStellenIds = ['vorhersage:penalisiert']
 *   verfahren 'zeitreihen' → ['zeitreihen:alle'] · 'cluster' → ['cluster:alle']
 *   stellenTitel(id) ist für alle vier ein eigener Name (nicht „Dieses Verfahren“): Quantilregression, Strafregression, Zeitreihe, Clusteranalyse
 * Das Verfahren bleibt bei beiden Gewichtsarten (auch mit „Personen einzeln gezogen: Ja“) gesperrt. */
s.einst.sprache = 'de'; s.einst.anrede = 'du';
type Z = Record<string, any>;
const G = (erwartet as unknown as Z).gewichte as { neue_schluessel: { id: string; h: string; u: string }[]; unveraendert: { id: string; h: string; u: string }[]; karten: { verfahren: string; quantil?: boolean; penalisiert?: boolean; stellen: string[] }[] };
const gH: Gewicht = { spalte: 'w', art: 'haeufigkeit' }, gU: Gewicht = { spalte: 'wu', art: 'umfrage' };
const gJa = { spalte: 'wu', art: 'umfrage', klumpenfrei: true } as Gewicht;

describe('Die vier neuen Schlüssel der Sperrtabelle', () => {
  it('es sind genau vier', () => { expect(G.neue_schluessel.map(t => t.id).sort()).toEqual(['cluster:alle', 'vorhersage:penalisiert', 'vorhersage:quantil', 'zeitreihen:alle']); });
  for (const t of G.neue_schluessel) it(`${t.id}: Häufigkeit ${t.h}, Umfrage ${t.u}, auch mit „Personen einzeln gezogen: Ja“`, () => {
    expect(gewichtIds(), `${t.id} fehlt in TABELLE`).toContain(t.id);
    expect(gewichtStatus(t.id, 'haeufigkeit')).toBe(t.h); expect(gewichtStatus(t.id, 'umfrage')).toBe(t.u);
    expect((gewichtStatus as (a: string, b: string, c?: boolean) => string)(t.id, 'umfrage', true)).toBe(t.u);
    expect(t.h).toBe('sperren'); expect(t.u).toBe('sperren');
  });
  for (const t of G.unveraendert) it(`unverändert: ${t.id} ${t.h} | ${t.u}`, () => { expect(gewichtStatus(t.id, 'haeufigkeit')).toBe(t.h); expect(gewichtStatus(t.id, 'umfrage')).toBe(t.u); });
});

describe('Karten nennen die neuen Stellen', () => {
  for (const art of ['haeufigkeit', 'umfrage'] as const) {
    for (const k of G.karten) it(`${k.verfahren}${k.quantil ? ' + Quantilregression' : ''}${k.penalisiert ? ' + Strafregression' : ''} (${art}): ${k.stellen.join(', ')}`, () => {
      const ids = gewichtStellenIds({ verfahren: k.verfahren, art, ...(k.quantil ? { quantil: true } : {}), ...(k.penalisiert ? { penalisiert: true } : {}) } as any);
      expect(ids).toEqual(k.stellen);
      expect(schwersterStatus(ids, art)).toBe('sperren');
      expect(schwersterStatus(ids, art, true as any)).toBe('sperren');
      expect(verwendetGewicht(k.verfahren, art)).toBe(true);
    });
  }
  it('ohne die neuen Wahlen bleibt die Karte Vorhersage wie bisher (lineare Regression)', () => {
    expect(gewichtStellenIds({ verfahren: 'vorhersage', art: 'haeufigkeit' })).toEqual(['vorhersage:linear']);
    expect(gewichtStellenIds({ verfahren: 'vorhersage', art: 'haeufigkeit', zufall: true })).toEqual(['vorhersage:linear', 'vorhersage:zufall']);
  });
  it('die Quantilregression mit Zufallsverfahren-Wahl hängt nichts Zweites an (der Bootstrap gehört zur Quantilregression)', () => {
    expect(gewichtStellenIds({ verfahren: 'vorhersage', art: 'haeufigkeit', quantil: true, zufall: true } as any)).toEqual(['vorhersage:quantil']);
  });
});

describe('Sperrsätze: eigener Name, Wort „Fallgewicht“, Spaltenname des Gewichts', () => {
  const titel = { 'vorhersage:quantil': /Quantil/, 'vorhersage:penalisiert': /(Straf|Lasso|Ridge)/, 'zeitreihen:alle': /Zeitreihe/, 'cluster:alle': /Cluster/ } as Record<string, RegExp>;
  for (const [id, re] of Object.entries(titel)) it(`${id}: stellenTitel nennt das Verfahren, der Sperrsatz bei beiden Arten`, () => {
    const t = stellenTitel(id); expect(t, id).not.toBe('Dieses Verfahren'); expect(t).toMatch(re);
    for (const g of [gH, gU, gJa]) { const satz = sperrSatz(id, g, t)!; expect(satz, `${id} ${g.art}`).toBeTruthy(); expect(satz).toContain(t); expect(satz).toContain(g.spalte); expect(satz).not.toMatch(/(?<!Fall|Häufigkeits|Umfrage)[Gg]ewicht(?!et)/); }
    expect(sperrSatz(id, gH, t)!).toContain('Fallgewicht');
  });
  it('englisch: derselbe Titel ist übersetzt', () => {
    s.einst.sprache = 'en';
    try { for (const id of Object.keys(titel)) { const t = stellenTitel(id); expect(t).not.toBe('Dieses Verfahren'); expect(t).not.toMatch(/Die |Der |Das /); } } finally { s.einst.sprache = 'de'; }
  });
});
