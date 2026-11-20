import { describe, expect, it } from 'vitest';
import erwartet from './testdaten/spaeter-f-erwartet.json';
import { gewichtIds, gewichtStatus, schwersterStatus, sperrSatz, type Gewicht } from './gewichte';
import { gewichtStellenIds, stellenTitel, verwendetGewicht } from './gewichtkarten';
import { s } from './sitzung.svelte';

/* ===== Welle S-F: Fallgewicht bei den neuen Stellen (Sperrtabelle `TABELLE` in lib/gewichte.ts; Fachblatt S-F „Für alle“, 1.4, 2.4 und „Entscheidungen Opus (18.10.)“ 2 und 4 gehen vor) =====
 * ROTER TEST des Sollwert-Prüfers. Soll: scripts/spaeter-f-erwartet.R → testdaten/spaeter-f-erwartet.json (Abschnitt gewichte). Der Bauer ändert Test und JSON nicht.
 * Bauer A trägt `kaplanmeier:sterbetafel`, `kaplanmeier:cox-zeitabh` und `assistent:intervalle` ein, Bauer B `uebereinstimmung:methodenvergleich` (jeder nur seine Zeilen, Opus führt zusammen).
 *   kaplanmeier:sterbetafel             sperren | sperren   (Opus 2: gesperrt wie Kaplan-Meier, auch wenn ein Häufigkeitsgewicht nachweislich dieselbe Tafel gäbe wie das Wiederholen der Zeilen)
 *   kaplanmeier:cox-zeitabh             sperren | sperren   (das Fallgewicht geht nicht in die neue Tabelle des Umformers)
 *   uebereinstimmung:methodenvergleich  sperren | sperren   (wie uebereinstimmung:icc-krippendorff; Passing-Bablok und Deming)
 *   assistent:intervalle                unberuehrt | unberuehrt   (Daten-Assistent „Zeitpunkte je Person → Intervalle“: Zeilenrechnung, Muster assistent:aggregieren; der Assistent sagt im Satz, dass das Fallgewicht nicht mitgenommen wird)
 *   KEINE Schlüssel für die Raten-Rechner-Kachel und die Zufall-zuteilen-Kachel (Reiter Verstehen, kein Projekt, kein Gewicht: `lernlabor:alle` bleibt unberuehrt) und KEIN `kaplanmeier:raten` (Opus 4: Raten nur als Rechner)
 *   unverändert: kaplanmeier:alle sperren | sperren, uebereinstimmung:kappa rechnen | sperren, uebereinstimmung:icc-krippendorff sperren | sperren, assistent:aggregieren unberuehrt | unberuehrt, lernlabor:alle unberuehrt | unberuehrt
 * Karten (lib/gewichtkarten.ts, `KartenWahl`, drei neue optionale Felder):
 *   kaplanmeier + sterbetafel: true          → gewichtStellenIds = ['kaplanmeier:sterbetafel']      (statt 'kaplanmeier:alle')
 *   kaplanmeier + coxZeit: true              → ['kaplanmeier:cox-zeitabh']
 *   uebereinstimmung + methodenvergleich: true → ['uebereinstimmung:methodenvergleich']             (statt Kappa oder ICC)
 *   stellenTitel(id) ist für alle drei ein eigener Name (nicht „Dieses Verfahren“): Sterbetafel, Cox-Regression mit zeitabhängiger Größe, Methodenvergleich
 * Das Verfahren bleibt bei beiden Gewichtsarten (auch mit „Personen einzeln gezogen: Ja“) gesperrt. */
s.einst.sprache = 'de'; s.einst.anrede = 'du';
type Z = Record<string, any>;
const G = (erwartet as unknown as Z).gewichte as { neue_schluessel: { id: string; h: string; u: string }[]; unveraendert: { id: string; h: string; u: string }[]; karten: { verfahren: string; sterbetafel?: boolean; coxZeit?: boolean; methodenvergleich?: boolean; stellen: string[] }[] };
const gH: Gewicht = { spalte: 'w', art: 'haeufigkeit' }, gU: Gewicht = { spalte: 'wu', art: 'umfrage' };
const gJa = { spalte: 'wu', art: 'umfrage', klumpenfrei: true } as Gewicht;

describe('Die vier neuen Schlüssel der Sperrtabelle', () => {
  it('es sind genau vier', () => { expect(G.neue_schluessel.map(t => t.id).sort()).toEqual(['assistent:intervalle', 'kaplanmeier:cox-zeitabh', 'kaplanmeier:sterbetafel', 'uebereinstimmung:methodenvergleich']); });
  for (const t of G.neue_schluessel) it(`${t.id}: Häufigkeit ${t.h}, Umfrage ${t.u}, auch mit „Personen einzeln gezogen: Ja“`, () => {
    expect(gewichtIds(), `${t.id} fehlt in TABELLE`).toContain(t.id);
    expect(gewichtStatus(t.id, 'haeufigkeit')).toBe(t.h); expect(gewichtStatus(t.id, 'umfrage')).toBe(t.u);
    expect((gewichtStatus as (a: string, b: string, c?: boolean) => string)(t.id, 'umfrage', true)).toBe(t.u);
  });
  for (const t of G.unveraendert) it(`unverändert: ${t.id} ${t.h} | ${t.u}`, () => { expect(gewichtStatus(t.id, 'haeufigkeit')).toBe(t.h); expect(gewichtStatus(t.id, 'umfrage')).toBe(t.u); });
  it('Sterbetafel, Cox mit zeitabhängiger Größe und Methodenvergleich sind bei beiden Arten gesperrt; der Intervall-Assistent ist unberührt', () => {
    for (const id of ['kaplanmeier:sterbetafel', 'kaplanmeier:cox-zeitabh', 'uebereinstimmung:methodenvergleich']) for (const art of ['haeufigkeit', 'umfrage'] as const) expect(gewichtStatus(id, art), `${id} ${art}`).toBe('sperren');
    for (const art of ['haeufigkeit', 'umfrage'] as const) expect(gewichtStatus('assistent:intervalle', art)).toBe('unberuehrt'); expect(sperrSatz('assistent:intervalle', gH, 'x')).toBeNull(); expect(sperrSatz('assistent:intervalle', gU, 'x')).toBeNull();
  });
  it('keine Schlüssel für die Verstehen-Kacheln (Raten, Zufall zuteilen) und keinen für Raten in der Karte: Opus 4/6', () => {
    for (const id of ['kaplanmeier:raten', 'verstehen:raten', 'verstehen:zuteilung', 'zuteilung:alle', 'raten:alle']) expect(gewichtIds(), id).not.toContain(id);
  });
});

describe('Karten nennen die neuen Stellen', () => {
  for (const art of ['haeufigkeit', 'umfrage'] as const) {
    for (const k of G.karten) it(`${k.verfahren}${k.sterbetafel ? ' + Sterbetafel' : ''}${k.coxZeit ? ' + Cox zeitabhängig' : ''}${k.methodenvergleich ? ' + Methodenvergleich' : ''} (${art}): ${k.stellen.join(', ')}`, () => {
      const ids = gewichtStellenIds({ verfahren: k.verfahren, art, ...(k.sterbetafel ? { sterbetafel: true } : {}), ...(k.coxZeit ? { coxZeit: true } : {}), ...(k.methodenvergleich ? { methodenvergleich: true } : {}) } as any);
      expect(ids).toEqual(k.stellen); expect(schwersterStatus(ids, art)).toBe('sperren'); expect(schwersterStatus(ids, art, true as any)).toBe('sperren'); expect(verwendetGewicht(k.verfahren, art)).toBe(true);
    });
  }
  it('ohne die neuen Wahlen bleiben die Karten wie bisher (Kaplan-Meier: eine Stelle; Übereinstimmung: Kappa, mit ICC die ICC-Stelle)', () => {
    expect(gewichtStellenIds({ verfahren: 'kaplanmeier', art: 'haeufigkeit' })).toEqual(['kaplanmeier:alle']); expect(gewichtStellenIds({ verfahren: 'uebereinstimmung', art: 'haeufigkeit' })).toEqual(['uebereinstimmung:kappa']);
    expect(gewichtStellenIds({ verfahren: 'uebereinstimmung', art: 'haeufigkeit', iccInter: true })).toEqual(['uebereinstimmung:icc-krippendorff']);
  });
  it('Methodenvergleich gewinnt gegen die ICC-Wahl (zwei Zahlenspalten: die Option ersetzt Kappa/ICC nicht, sie ist eine eigene Stelle); Sterbetafel und Cox zusammen ergeben nur die Stelle der gewählten Option, keine zweite', () => {
    expect(gewichtStellenIds({ verfahren: 'uebereinstimmung', art: 'haeufigkeit', iccInter: true, methodenvergleich: true } as any)).toEqual(['uebereinstimmung:methodenvergleich']);
    expect(gewichtStellenIds({ verfahren: 'kaplanmeier', art: 'haeufigkeit', coxZeit: true } as any)).toHaveLength(1);
  });
});

describe('Sperrsätze: eigener Name, Wort „Fallgewicht“, Spaltenname des Gewichts', () => {
  const titel = { 'kaplanmeier:sterbetafel': /Sterbetafel/, 'kaplanmeier:cox-zeitabh': /Cox/, 'uebereinstimmung:methodenvergleich': /Methodenvergleich/ } as Record<string, RegExp>;
  for (const [id, re] of Object.entries(titel)) it(`${id}: stellenTitel nennt das Verfahren, der Sperrsatz bei beiden Arten`, () => {
    const t = stellenTitel(id); expect(t, id).not.toBe('Dieses Verfahren'); expect(t).toMatch(re);
    for (const g of [gH, gU, gJa]) { const satz = sperrSatz(id, g, t)!; expect(satz, `${id} ${g.art}`).toBeTruthy(); expect(satz).toContain(t); expect(satz).toContain(g.spalte); expect(satz).not.toMatch(/(?<!Fall|Häufigkeits|Umfrage)[Gg]ewicht(?!et)/); }
    expect(sperrSatz(id, gH, t)!).toContain('Fallgewicht');
  });
  it('Cox mit zeitabhängiger Größe heißt im Titel „zeitabhängig“ (nicht nur „Cox“): man erkennt die Option', () => { expect(stellenTitel('kaplanmeier:cox-zeitabh')).toMatch(/zeitabhängig/); });
  it('englisch: derselbe Titel ist übersetzt', () => {
    s.einst.sprache = 'en';
    try { for (const id of Object.keys(titel)) { const t = stellenTitel(id); expect(t).not.toBe('Dieses Verfahren'); expect(t).not.toMatch(/Die |Der |Das /); } } finally { s.einst.sprache = 'de'; }
  });
});
