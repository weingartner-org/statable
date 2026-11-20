import { describe, expect, it } from 'vitest';
import erwartet from './testdaten/spaeter-f2-erwartet.json';
import { gewichtIds, gewichtStatus, schwersterStatus, sperrSatz, type Gewicht } from './gewichte';
import { gewichtStellenIds, stellenTitel, verwendetGewicht } from './gewichtkarten';
import { s } from './sitzung.svelte';

/* ===== Später, Welle S-F2: Fallgewicht bei den neuen Stellen (Sperrtabelle `TABELLE` in lib/gewichte.ts; Fachblatt SPAETER-F2-ERGAENZUNGEN, jeweils „Fallgewicht“, und „Entscheidungen Opus (19.10.)“ 6, 11 gehen vor) =====
 * ROTER TEST des Sollwert-Prüfers. Soll: scripts/spaeter-f2-erwartet.R → testdaten/spaeter-f2-erwartet.json (Abschnitt gewichte). Der Bauer ändert Test und JSON nicht.
 * Bauer B trägt ALLE fünf neuen Zeilen ein (A fasst gewichte.ts nicht an); die Karten-Wahlen `aft`, `frailty`, `kreuz` kommen in `KartenWahl` (lib/gewichtkarten.ts).
 *   kaplanmeier:aft              sperren | sperren   (AFT-Modell, survreg; Karte kaplanmeier, Weitere Wege)
 *   kaplanmeier:frailty          sperren | sperren   (Cox mit Kennung: cluster() oder Frailty)
 *   zeitreihen:kreuz             sperren | sperren   (Kreuzkorrelation; zeitreihen:alle bleibt sperren | sperren)
 *   assistent:zeitreihe          unberuehrt | unberuehrt   (Daten-Assistent „Verschieben und glätten“: Zeilenrechnung; das Fallgewicht geht nicht in die neue Spalte, der Assistent sagt es im Satz; Muster assistent:aggregieren)
 *   diagramm:mittelgruppen       rechnen | beschreibend | design   (Balken Mittelwert nach Gruppe: Häufigkeitsgewicht rechnet n = Σw; Umfragegewicht ohne „einzeln gezogen: Ja“ nur Mittel ohne Striche; mit „Ja“ Striche nach S-D2, gleich gruppen:mittelwerte)
 *   KEINE neuen Schlüssel für die Fallzahl-Seite (`power:alle` bleibt unberuehrt | unberuehrt, alle neuen Fälle sitzen dort) und KEINER für das Raking (der Dialog ERSETZT das Fallgewicht, er ist keine Rechnung mit Gewicht)
 *   unverändert: power:alle, kaplanmeier:alle, kaplanmeier:cox-zeitabh, zeitreihen:alle, gruppen:mittelwerte, assistent:aggregieren
 * Karten (lib/gewichtkarten.ts, `KartenWahl`, drei neue optionale Felder): kaplanmeier + aft: true → ['kaplanmeier:aft']; kaplanmeier + frailty: true → ['kaplanmeier:frailty']; zeitreihen + kreuz: true → ['zeitreihen:kreuz'] (statt 'zeitreihen:alle')
 *   stellenTitel(id): eigener Name: AFT-Modell (Zeitverhältnis), Frailty bzw. Kennung, Kreuzkorrelation, Mittelwerte nach Gruppe. */
s.einst.sprache = 'de'; s.einst.anrede = 'du';
type Z = Record<string, any>;
const G = (erwartet as unknown as Z).gewichte as { neue_schluessel: { id: string; h: string; u: string; d?: string }[]; unveraendert: { id: string; h: string; u: string; d?: string }[]; karten: { verfahren: string; aft?: boolean; frailty?: boolean; kreuz?: boolean; stellen: string[] }[] };
const gH: Gewicht = { spalte: 'w', art: 'haeufigkeit' }, gU: Gewicht = { spalte: 'wu', art: 'umfrage' };
const gJa = { spalte: 'wu', art: 'umfrage', klumpenfrei: true } as Gewicht;
const st = gewichtStatus as (a: string, b: string, c?: boolean) => string;

describe('Die fünf neuen Schlüssel der Sperrtabelle', () => {
  it('es sind genau fünf', () => { expect(G.neue_schluessel.map(t => t.id).sort()).toEqual(['assistent:zeitreihe', 'diagramm:mittelgruppen', 'kaplanmeier:aft', 'kaplanmeier:frailty', 'zeitreihen:kreuz']); });
  for (const t of G.neue_schluessel) it(`${t.id}: Häufigkeit ${t.h}, Umfrage ${t.u}${t.d ? `, mit „einzeln gezogen: Ja“ ${t.d}` : ''}`, () => {
    expect(gewichtIds(), `${t.id} fehlt in TABELLE`).toContain(t.id); expect(st(t.id, 'haeufigkeit')).toBe(t.h); expect(st(t.id, 'umfrage')).toBe(t.u); expect(st(t.id, 'umfrage', false)).toBe(t.u); expect(st(t.id, 'umfrage', true)).toBe(t.d ?? t.u);
  });
  for (const t of G.unveraendert) it(`unverändert: ${t.id} ${t.h} | ${t.u}${t.d ? ` | ${t.d}` : ''}`, () => { expect(st(t.id, 'haeufigkeit')).toBe(t.h); expect(st(t.id, 'umfrage')).toBe(t.u); if (t.d) expect(st(t.id, 'umfrage', true)).toBe(t.d); });
  it('AFT, Frailty und Kreuzkorrelation sind bei allen Arten gesperrt; der Zeitreihen-Assistent ist unberührt', () => {
    for (const id of ['kaplanmeier:aft', 'kaplanmeier:frailty', 'zeitreihen:kreuz']) for (const art of ['haeufigkeit', 'umfrage'] as const) { expect(st(id, art), `${id} ${art}`).toBe('sperren'); expect(st(id, art, true), `${id} ${art} mit Ja`).toBe('sperren'); }
    for (const art of ['haeufigkeit', 'umfrage'] as const) expect(st('assistent:zeitreihe', art)).toBe('unberuehrt'); expect(sperrSatz('assistent:zeitreihe', gH, 'x')).toBeNull(); expect(sperrSatz('assistent:zeitreihe', gU, 'x')).toBeNull();
  });
  it('Balken: Häufigkeitsgewicht rechnet (kein Sperrsatz), Umfragegewicht nur beschreibend, mit „einzeln gezogen: Ja“ design - wie die Gruppenmittel (gruppen:mittelwerte)', () => {
    expect(st('diagramm:mittelgruppen', 'haeufigkeit')).toBe('rechnen'); expect(st('diagramm:mittelgruppen', 'umfrage')).toBe('beschreibend'); expect(st('diagramm:mittelgruppen', 'umfrage', true)).toBe('design'); expect(sperrSatz('diagramm:mittelgruppen', gH, 'x')).toBeNull();
    for (const art of ['haeufigkeit', 'umfrage'] as const) for (const j of [undefined, true]) expect(st('diagramm:mittelgruppen', art, j as any)).toBe(st('gruppen:mittelwerte', art, j as any));
  });
  it('keine Schlüssel für die Fallzahl-Seite und das Raking: power:alle bleibt die einzige Stelle der Seite „Studie planen“', () => {
    for (const id of ['power:r2zuwachs', 'power:partiell', 'power:anovaplus', 'power:messw', 'raking:alle', 'fallgewicht:raking', 'assistent:raking']) expect(gewichtIds(), id).not.toContain(id);
    expect(st('power:alle', 'haeufigkeit')).toBe('unberuehrt'); expect(st('power:alle', 'umfrage')).toBe('unberuehrt');
  });
});

describe('Karten nennen die neuen Stellen', () => {
  for (const art of ['haeufigkeit', 'umfrage'] as const) {
    for (const k of G.karten) it(`${k.verfahren}${k.aft ? ' + AFT' : ''}${k.frailty ? ' + Frailty' : ''}${k.kreuz ? ' + Kreuzkorrelation' : ''} (${art}): ${k.stellen.join(', ')}`, () => {
      const ids = gewichtStellenIds({ verfahren: k.verfahren, art, ...(k.aft ? { aft: true } : {}), ...(k.frailty ? { frailty: true } : {}), ...(k.kreuz ? { kreuz: true } : {}) } as any);
      expect(ids).toEqual(k.stellen); expect(schwersterStatus(ids, art)).toBe('sperren'); expect(schwersterStatus(ids, art, true as any)).toBe('sperren'); expect(verwendetGewicht(k.verfahren, art)).toBe(true);
    });
  }
  it('ohne die neuen Wahlen bleiben die Karten wie bisher (kaplanmeier:alle, zeitreihen:alle); die S-F-Wahlen sterbetafel und coxZeit wirken weiter', () => {
    expect(gewichtStellenIds({ verfahren: 'kaplanmeier', art: 'haeufigkeit' })).toEqual(['kaplanmeier:alle']); expect(gewichtStellenIds({ verfahren: 'zeitreihen', art: 'haeufigkeit' })).toEqual(['zeitreihen:alle']);
    expect(gewichtStellenIds({ verfahren: 'kaplanmeier', art: 'haeufigkeit', coxZeit: true })).toEqual(['kaplanmeier:cox-zeitabh']); expect(gewichtStellenIds({ verfahren: 'kaplanmeier', art: 'haeufigkeit', sterbetafel: true })).toEqual(['kaplanmeier:sterbetafel']);
  });
  it('AFT und Frailty zusammen mit der Cox-Regression sind eigene Stellen: je eine Stelle je gewählter Option, keine doppelte', () => {
    const ids = gewichtStellenIds({ verfahren: 'kaplanmeier', art: 'haeufigkeit', aft: true, frailty: true } as any); expect(ids).toContain('kaplanmeier:aft'); expect(ids).toContain('kaplanmeier:frailty'); expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('Sperrsätze: eigener Name, Wort „Fallgewicht“, Spaltenname des Gewichts', () => {
  const titel = { 'kaplanmeier:aft': /AFT|Zeitverhältnis/, 'kaplanmeier:frailty': /Frailty|Kennung|Cluster/, 'zeitreihen:kreuz': /Kreuzkorrelation/ } as Record<string, RegExp>;
  for (const [id, re] of Object.entries(titel)) it(`${id}: stellenTitel nennt das Verfahren, der Sperrsatz bei allen Arten`, () => {
    const t = stellenTitel(id); expect(t, id).not.toBe('Dieses Verfahren'); expect(t).toMatch(re);
    for (const g of [gH, gU, gJa]) { const satz = sperrSatz(id, g, t)!; expect(satz, `${id} ${g.art}`).toBeTruthy(); expect(satz).toContain(t); expect(satz).toContain(g.spalte); expect(satz).not.toMatch(/(?<!Fall|Häufigkeits|Umfrage)[Gg]ewicht(?!et)/); }
    expect(sperrSatz(id, gH, t)!).toContain('Fallgewicht');
  });
  it('der Titel der Balken-Stelle nennt die Mittelwerte nach Gruppe', () => { expect(stellenTitel('diagramm:mittelgruppen')).not.toBe('Dieses Verfahren'); expect(stellenTitel('diagramm:mittelgruppen')).toMatch(/Mittelwert/); });
  it('englisch: die Titel sind übersetzt', () => {
    s.einst.sprache = 'en';
    try { for (const id of [...Object.keys(titel), 'diagramm:mittelgruppen']) { const t = stellenTitel(id); expect(t, id).not.toBe(stellenTitel('unbekannt:unbekannt')); expect(t).not.toMatch(/Die |Der |Das /); } } finally { s.einst.sprache = 'de'; }
  });
});
