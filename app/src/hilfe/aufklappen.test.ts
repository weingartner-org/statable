import { describe, it, expect } from 'vitest';
import { artikelListe, artikelOffen } from './artikel';
import { abschnitte, trefferAbschnitte } from './aufklappen';
import { artikelText, type Block } from './kern';

/** Die 20 Artikel aus docs/fachblaetter/ARTIKEL-BLOCK1.md: Kurz höchstens 50 Wörter, Kurz plus „So geht es“ höchstens 120 (30.10.2026). */
const BLOCK1 = ['frage-gruppen', 'frage-praepost', 'frage-zusammenhang', 'frage-korrmatrix', 'frage-vorhersage', 'frage-verteilung', 'frage-kreuz', 'frage-faktor', 'frage-skala', 'frage-messwiederholung', 'frage-mediation', 'frage-moderation', 'frage-posthoc', 'voraussetzungen-pruefen', 'normalverteilung-pruefen', 'teststaerke', 'power', 'hierarchische-regression', 'ergebnissatz', 'blatt-seite'];
/** Die 30 Artikel aus docs/fachblaetter/ARTIKEL-BLOCK2.md: dieselben Grenzen (30.10.2026). */
const BLOCK2 = ['tabelle-veroeffentlichung', 'zweifaktorielle-varianzanalyse', 'kovarianzanalyse', 'friedman-test', 'rangtests-weitere', 'vielfalt-diversitaet', 'zufallsverfahren-permutation', 'mcnemar-test-cochran-q', 'aequivalenztest-tost', 'reliable-change-index', 'quantilregression', 'strafregression', 'ordinale-regression', 'multinomiale-regression', 'zaehldaten-regression', 'risikomasse', 'zusammenhangsmasse', 'mantel-haenszel', 'frage-uebereinstimmung', 'messgenauigkeit-typical-error', 'intercoder', 'bootstrap-intervalle', 'frage-mehrebenen', 'frage-meta', 'frage-einzelfall', 'frage-kaplanmeier', 'cox-regression', 'sterbetafel', 'cox-zeitabhaengig', 'aft-modell'];
/** Die 53 Artikel aus docs/fachblaetter/ARTIKEL-BLOCK3.md (30.10.2026; ueber-statable blieb unverändert): Kurz oben und höchstens 50 Wörter, Kurz plus So geht es höchstens 120, höchstens 5 Schritte. */
const BLOCK3 = ['erste-schritte', 'spss-menue', 'datenschutz-projekt', 'tastatur', 'start-seite', 'beispiele-seite', 'installieren-offline', 'einstellungen-seite', 'projektmenue', 'daten-seite', 'daten-oeffnen', 'spalten-seite', 'reihenfolge-gruppen', 'daten-check', 'raking', 'mikrodaten-schuetzen', 'kalibrieren-gewichte', 'fallgewichte', 'umstrukturieren', 'daten-vorbereiten', 'excel-blatt-uhrzeit', 'eigenschaften-uebernehmen', 'datensaetze-vergleichen', 'keine-angabe-bereich', 'klassen-bilden', 'normwerte', 'verschieben-glaetten', 'cox-frailty', 'balken-mittelwerte', 'frage-kategorien', 'frage-faelle', 'frage-mehrfachantworten', 'fallzahl-ergaenzen', 'methodenvergleich', 'anpassungstests', 'frage-partialkorrelation', 'roc-kurve', 'mein-fachgebiet', 'verstehen', 'verstehen-effekt', 'verstehen-kennlinie', 'verstehen-gerade', 'verstehen-verteilungen', 'verstehen-kennzahlen', 'verstehen-zuteilung', 'verstehen-anteilstest', 'lernlabor', 'diagramm-anpassen', 'bayes-faktor', 'bericht-seite', 'statable-zitieren', 'befehle-seite', 'syntax-grundlagen'];
/** Die 22 Artikel, die der PC neu gebaut hat, im neuen Stil (31.10.2026): dieselben Grenzen wie Block 3, Für Fachleute steht am Ende. */
const BLOCK4 = ['eurostat-oeffnen', 'fallkontrolle-abgleich', 'frage-armut', 'frage-cluster', 'frage-diskriminanz', 'frage-loglinear', 'frage-manova', 'frage-zeitreihen', 'gewichtete-regression', 'indexzahlen', 'karte', 'klassifikation', 'nichtlineare-regression', 'plausibilitaet', 'probit-regression', 'saisonbereinigung-r', 'umfrage-stichprobenplan', 'vorlage-protokoll', 'zeitreihe-granger', 'zeitreihe-kreuzkorrelation', 'zeitreihe-massnahme', 'zeitreihe-prognose'];
const woerter = (bl: Block[]) => (artikelText({ id: '', bereich: 'start', titel: '', stichwoerter: [], inhalt: bl, verwandt: [] }).match(/\S+/g) ?? []).length;

describe('Hilfe: sichtbarer Teil und Aufklappen', () => {
  for (const sp of ['de', 'en'] as const) {
    it(`Block 1 (${sp}): Kurz höchstens 50 Wörter, Kurz plus So geht es höchstens 120`, () => {
      const liste = artikelListe(sp);
      for (const id of BLOCK1) {
        const a = liste.find(x => x.id === id)!;
        const offen = abschnitte(a.inhalt).filter(g => { const k = g[0]; return typeof k === 'object' && 'h' in k && a.offen!.includes(k.h) && g !== undefined; });
        const kurz = offen[0]!, so = offen[1];
        expect(woerter(kurz.slice(1)), `${id} ${sp} Kurz`).toBeLessThanOrEqual(50);
        expect(woerter(kurz.slice(1)) + (so ? woerter(so.slice(1)) : 0), `${id} ${sp} sichtbar`).toBeLessThanOrEqual(120);
      }
    });
  }
  for (const sp of ['de', 'en'] as const) {
    it(`Block 2 (${sp}): Kurz höchstens 50 Wörter, Kurz plus So geht es höchstens 120, Kurz oben, Für Fachleute unten`, () => {
      const liste = artikelListe(sp);
      for (const id of BLOCK2) {
        const a = liste.find(x => x.id === id)!;
        const hs = a.inhalt.filter((b): b is { h: string } => typeof b === 'object' && 'h' in b).map(b => b.h);
        expect(hs[0], id).toBe(sp === 'de' ? 'Kurz' : 'In brief'); expect(hs.at(-1) === (sp === 'de' ? 'Für Fachleute' : 'For specialists') || hs.includes(sp === 'de' ? 'Quellen' : 'Sources') || hs.at(-1) === (sp === 'de' ? 'Quelle' : 'Source'), id).toBe(true);
        const offen = abschnitte(a.inhalt).filter(g => { const k = g[0]; return typeof k === 'object' && 'h' in k && a.offen!.includes(k.h); });
        const kurz = offen[0]!, so = offen[1]!;
        expect(woerter(kurz.slice(1)), `${id} ${sp} Kurz`).toBeLessThanOrEqual(50);
        expect(woerter(kurz.slice(1)) + woerter(so.slice(1)), `${id} ${sp} sichtbar`).toBeLessThanOrEqual(120);
        expect(typeof so[0] === 'object' && 'h' in so[0] && /^(So geht es|How it works)/.test(so[0].h), `${id} So geht es folgt auf Kurz`).toBe(true);
        const schritte = so.find(b => typeof b === 'object' && 'ol' in b) as { ol: string[] } | undefined;
        expect(schritte?.ol.length ?? 0, `${id} Schritte`).toBeLessThanOrEqual(5);
      }
    });
  }
  for (const sp of ['de', 'en'] as const) {
    it(`Block 3 (${sp}): Kurz oben und höchstens 50 Wörter, Kurz plus So geht es höchstens 120, höchstens 5 Schritte`, () => {
      const liste = artikelListe(sp);
      for (const id of BLOCK3) {
        const a = liste.find(x => x.id === id)!;
        const hs = a.inhalt.filter((b): b is { h: string } => typeof b === 'object' && 'h' in b).map(b => b.h);
        expect(hs[0], id).toBe(sp === 'de' ? 'Kurz' : 'In brief');
        const offen = abschnitte(a.inhalt).filter(g => { const k = g[0]; return typeof k === 'object' && 'h' in k && a.offen!.includes(k.h); });
        const kurz = offen[0]!, so = offen[1];
        expect(woerter(kurz.slice(1)), `${id} ${sp} Kurz`).toBeLessThanOrEqual(50);
        expect(woerter(kurz.slice(1)) + (so ? woerter(so.slice(1)) : 0), `${id} ${sp} sichtbar`).toBeLessThanOrEqual(120);
        if (so) {
          expect(typeof so[0] === 'object' && 'h' in so[0] && /^(So geht es|How it works)/.test(so[0].h), `${id} So geht es folgt auf Kurz`).toBe(true);
          const schritte = so.find(b => typeof b === 'object' && 'ol' in b) as { ol: string[] } | undefined;
          expect(schritte?.ol.length ?? 0, `${id} Schritte`).toBeLessThanOrEqual(5);
        }
        expect(hs.filter(h => h === hs[0]).length, `${id} ${sp} Kurz nur einmal`).toBe(1);
        expect(new Set(hs).size, `${id} ${sp} keine doppelte Überschrift`).toBe(hs.length);
      }
    });
  }
  for (const sp of ['de', 'en'] as const) {
    it(`Block 4 (${sp}): Kurz oben und höchstens 50 Wörter, Kurz plus So geht es höchstens 120, höchstens 5 Schritte, Für Fachleute am Ende`, () => {
      const liste = artikelListe(sp);
      for (const id of BLOCK4) {
        const a = liste.find(x => x.id === id)!;
        const hs = a.inhalt.filter((b): b is { h: string } => typeof b === 'object' && 'h' in b).map(b => b.h);
        expect(hs[0], id).toBe(sp === 'de' ? 'Kurz' : 'In brief');
        const offen = abschnitte(a.inhalt).filter(g => { const k = g[0]; return typeof k === 'object' && 'h' in k && a.offen!.includes(k.h); });
        const kurz = offen[0]!, so = offen[1]!;
        expect(woerter(kurz.slice(1)), `${id} ${sp} Kurz`).toBeLessThanOrEqual(50);
        expect(woerter(kurz.slice(1)) + woerter(so.slice(1)), `${id} ${sp} sichtbar`).toBeLessThanOrEqual(120);
        expect(typeof so[0] === 'object' && 'h' in so[0] && /^(So geht es|How it works)/.test(so[0].h), `${id} So geht es folgt auf Kurz`).toBe(true);
        expect((so.find(b => typeof b === 'object' && 'ol' in b) as { ol: string[] } | undefined)?.ol.length ?? 0, `${id} Schritte`).toBeLessThanOrEqual(5);
        const fach = sp === 'de' ? 'Für Fachleute' : 'For specialists', quellen = sp === 'de' ? /^Quellen?$/ : /^Sources?$/;
        const i = hs.indexOf(fach);
        if (i >= 0) expect(hs.slice(i + 1).every(h => quellen.test(h)), `${id} ${sp} Für Fachleute am Ende`).toBe(true);
        expect(new Set(hs).size, `${id} ${sp} keine doppelte Überschrift`).toBe(hs.length);
      }
    });
  }
  it('offen: Kurz und So geht es immer; Ergebnis lesen und Falsch verstanden nur bei frage-*', () => {
    expect(artikelOffen('frage-gruppen', 'de')).toEqual(expect.arrayContaining(['Kurz', 'So geht es in Statable', 'Ergebnis lesen', 'Was oft falsch verstanden wird']));
    expect(artikelOffen('frage-gruppen', 'de')).not.toContain('Voraussetzungen');
    expect(artikelOffen('frage-gruppen', 'en')).toContain('In brief');
    const o = artikelOffen('power', 'de');
    expect(o).toContain('So geht es in Statable'); expect(o).not.toContain('Ergebnis lesen'); expect(o).not.toContain('Für Fachleute');
    expect(artikelOffen('gibt-es-nicht', 'de')).toEqual([]);
  });
  it('Sprung aus der Suche: nur eingeklappte Abschnitte mit den meisten Suchwörtern öffnen sich', () => {
    const bl: Block[] = [{ h: 'Kurz' }, 'Welch rechnet', { h: 'Voraussetzungen' }, 'Die kleinste Gruppe hat mindestens 10 Personen', { h: 'Typische Beispiele' }, 'Wartezeit in Tagen'];
    const g = abschnitte(bl), offen = ['Kurz'];
    expect([...trefferAbschnitte(g, 'kleinste Gruppe', offen)]).toEqual([1]);
    expect([...trefferAbschnitte(g, 'Welch', offen)]).toEqual([]);
    expect([...trefferAbschnitte(g, '', offen)]).toEqual([]);
  });
});
