/**
 * Sollwerte F3B2 (Fachblatt Feinstruktur 4, 6, 7; Architekturblatt Datenmodell 2.4 und Abschnitt 7): Lesarten prüfen, Füllwörter,
 * Zwischenreflexion, Zwischenfazit, Übersicht, Formhinweise; Gegenprobe mit der ganzen Musterlösung aus docs/feinstruktur/beispiele.
 */
import { describe, expect, it } from 'vitest';
import { pruefeQualProjekt, qualFassung, type QualProjekt, type Sequenzanalyse } from './qualprojekt';
import { alleGedeutet, beginneDeuten, einheitFertig, fuegeEintragHinzu, neueAnalyse, schalteGrenze, zumEinteilen } from './feinstruktur-analyse';
import { SPALTENSATZ_FEINSTRUKTUR } from './feinstruktur-spalten';
import {
  fuellwortAngebot, fuellwortKern, formhinweise, fuegeBelegHinzu, fuegeMusterHinzu, reflexionAngebot, reflexionNach, reflexionsStellen,
  satzanfang, setzeFazitText, setzeStand, speichereReflexion, standVon, uebernimmDeutung, uebersicht, verworfene, zuPruefen,
} from './feinstruktur-pruefen';

import { muster, TEXT, EINHEITEN, MUSTER_GRENZEN, rund, projekt, mitMuster, ganzesMuster } from './feinstruktur-muster.testhilfe';

describe('F3B2 Lesarten prüfen (Fachblatt 6, Architekturblatt 2.4)', () => {
  it('Liste an jeder neuen Einheit: offene und „hält“ aus früheren Einheiten; Stand als neuer Verlaufs-Eintrag mit beiEinheit', () => {
    let sa = beginneDeuten(mitMuster(), 1);
    const r = fuegeEintragHinzu(sa, 0, 'lesarten', 'A', 2, 'PA'); sa = fuegeEintragHinzu(r.analyse, 0, 'lesarten', 'B', 2, 'PB').analyse;
    const a = r.id, b = sa.einheiten[0]!.lesarten[1]!.id;
    expect(zuPruefen(sa, 0)).toEqual([]);
    sa = einheitFertig(sa, 3);
    expect(zuPruefen(sa, 1).map(p => [p.einheit, p.lesart.text, p.stand])).toEqual([[0, 'A', 'offen'], [0, 'B', 'offen']]);
    sa = setzeStand(sa, a, 'haelt', 'passt', 1, 4);
    sa = setzeStand(sa, b, 'verworfen', 'passt nicht', 1, 4);
    expect(sa.einheiten[0]!.lesarten[0]!.verlauf).toEqual([{ stand: 'haelt', beiEinheit: sa.einheiten[1]!.id, begruendung: 'passt', zeit: 4 }]);
    expect(zuPruefen(sa, 2).map(p => [p.lesart.text, p.stand, p.bei])).toEqual([['A', 'haelt', 1]]);
    expect(verworfene(sa, 2).map(p => [p.lesart.text, p.bei])).toEqual([['B', 1]]);
    sa = setzeStand(sa, a, 'verworfen', 'jetzt nicht mehr', 5, 6); // „hält“ ist vorläufig
    expect(sa.einheiten[0]!.lesarten[0]!.verlauf.map(v => v.stand)).toEqual(['haelt', 'verworfen']);
    expect(standVon(sa.einheiten[0]!.lesarten[0]!)).toBe('verworfen');
    expect(sa.einheiten[0]!.lesarten).toHaveLength(2); // nie gelöscht
  });
  it('Stand nur an einer späteren Einheit; Statable setzt nie selbst einen Stand', () => {
    let sa = beginneDeuten(mitMuster(), 1);
    const r = fuegeEintragHinzu(sa, 2, 'lesarten', 'A', 2); sa = r.analyse;
    expect(() => setzeStand(sa, r.id, 'haelt', '', 2, 3)).toThrow();
    expect(() => setzeStand(sa, r.id, 'haelt', '', 1, 3)).toThrow();
    for (let k = 0; k < 10; k++) sa = einheitFertig(sa, 4);
    expect(sa.einheiten[2]!.lesarten[0]!.verlauf).toEqual([]);
  });
});

describe('F3B2 Füllwörter (Fachblatt 4)', () => {
  it('Kern ohne Satzzeichen und Großschreibung; Angebot nur bei genau einem Wort und früherer gedeuteter Einheit, Übernahme nur auf Knopfdruck', () => {
    expect(fuellwortKern('Naja,')).toBe('naja'); expect(fuellwortKern('naja …')).toBe('naja');
    let sa = beginneDeuten(mitMuster(), 1);
    expect(fuellwortAngebot(sa, 3)).toBeUndefined(); // Einheit 1 noch nicht gedeutet
    sa = fuegeEintragHinzu(sa, 0, 'paraphrase', 'P', 2).analyse;
    sa = fuegeEintragHinzu(sa, 0, 'lesarten', 'L', 2, 'PL').analyse;
    for (let k = 0; k < 3; k++) sa = einheitFertig(sa, 3);
    expect(fuellwortAngebot(sa, 3)).toBe(0); // „Naja,“ (4) wie „Naja,“ (1)
    expect(fuellwortAngebot(sa, 2)).toBeUndefined(); // mehrere Wörter
    expect(sa.einheiten[3]!.paraphrase).toEqual([]);
    const neu = uebernimmDeutung(sa, 3, 0, 4);
    expect(neu.einheiten[3]!.uebernommenVon).toBe(sa.einheiten[0]!.id);
    expect(neu.einheiten[3]!.paraphrase.map(e => e.text)).toEqual(['P']);
    expect(neu.einheiten[3]!.paraphrase[0]!.id).not.toBe(sa.einheiten[0]!.paraphrase[0]!.id);
    expect(neu.einheiten[3]!.lesarten[0]!.verlauf).toEqual([]);
    expect(neu.einheiten[3]!.gedeutet).toBe(false);
    expect(fuellwortAngebot(neu, 3)).toBeUndefined();
  });
});

describe('F3B2 Zwischenreflexion, Zwischenfazit, Übersicht, Formhinweise (Fachblatt 7)', () => {
  it('Reflexion nach jeder 4. Einheit angeboten, nie Pflicht; eine je Stelle', () => {
    let sa = beginneDeuten(mitMuster(), 1);
    expect(reflexionsStellen(sa)).toEqual([3, 7]);
    for (let k = 0; k < 4; k++) sa = einheitFertig(sa, 2);
    expect(reflexionAngebot(sa, 4)).toBe(3);
    expect(reflexionAngebot(sa, 3)).toBeUndefined();
    sa = einheitFertig(sa, 2); // ohne Reflexion weiter: geht
    expect(sa.aktuelleEinheit).toBe(5);
    expect(formhinweise(sa, 'de')).toContain('Nach Sinneinheit 4: Zwischenreflexion fehlt.');
    sa = speichereReflexion(sa, 3, { begriffe: 'a', bisher: 'b', pruefen: 'c' }, 3);
    sa = speichereReflexion(sa, 3, { begriffe: 'a2', bisher: 'b', pruefen: 'c' }, 4);
    expect(sa.reflexionen).toHaveLength(1); expect(reflexionNach(sa, 3)?.begriffe).toBe('a2');
    expect(formhinweise(sa, 'de').some(h => h.includes('Zwischenreflexion'))).toBe(false);
  });
  it('Zwischenfazit erst, wenn alle gedeutet; Beleg mit Kennung und Zitat aus Statable; nur ein Satzanfang als Vorschlag', () => {
    let sa = beginneDeuten(mitMuster(), 1);
    expect(() => fuegeMusterHinzu(sa, 'x', 2)).toThrow();
    for (let k = 0; k < 10; k++) sa = einheitFertig(sa, 2);
    const r = fuegeMusterHinzu(sa, 'Muster', 3); sa = r.analyse;
    expect(formhinweise(sa, 'de')).toContain('Zwischenfazit, Deutungsmuster 1: keine Textstelle.');
    sa = fuegeBelegHinzu(sa, r.id, 2, 3); sa = fuegeBelegHinzu(sa, r.id, 2, 3);
    expect(sa.fazit!.muster[0]!.belege).toEqual([{ einheit: sa.einheiten[2]!.id, zitat: EINHEITEN[2] }]);
    expect(formhinweise(sa, 'de').some(h => h.startsWith('Zwischenfazit'))).toBe(false);
    expect(satzanfang('de')).toBe('Nach diesem Ausschnitt deutet sich an, dass ');
  });
  it('Übersicht: in Phase Deuten nur bis zur aktuellen Einheit, Spalten aus dem Spaltensatz; danach alle', () => {
    let sa = beginneDeuten(mitMuster(), 1);
    sa = einheitFertig(einheitFertig(sa, 2), 2);
    const u = uebersicht(sa);
    expect(u.map(z => z.text)).toEqual(EINHEITEN.slice(0, 3));
    expect(u[0]!.spalten.map(x => x.kennung)).toEqual(SPALTENSATZ_FEINSTRUKTUR.spalten.map(x => x.kennung));
    for (let k = 0; k < 8; k++) sa = einheitFertig(sa, 3);
    expect(uebersicht(sa).map(z => z.text)).toEqual(EINHEITEN);
    expect(uebersicht(zumEinteilen(sa, 4))).toHaveLength(10);
  });
  it('Formhinweise: Spalte leer nur bei gedeuteten Einheiten, Lesart ohne Prüfkriterium; keiner ohne Grund, keiner nach der aktuellen Einheit', () => {
    let sa = beginneDeuten(mitMuster(), 1);
    expect(formhinweise(sa, 'de')).toEqual([]);
    sa = fuegeEintragHinzu(sa, 0, 'lesarten', 'L', 2).analyse;
    expect(formhinweise(sa, 'de')).toEqual(['Sinneinheit 1: Lesart 1 hat kein Prüfkriterium.']);
    sa = einheitFertig(sa, 3);
    expect(formhinweise(sa, 'de')).toContain('Sinneinheit 1: Die Spalte „Paraphrase“ ist leer.');
    expect(formhinweise(sa, 'de').some(h => h.includes('Latente'))).toBe(false);
    expect(formhinweise(sa, 'de').every(h => /^Sinneinheit 1:/.test(h))).toBe(true);
  });
  it('Gegenprobe: die ganze Musterlösung lässt sich abbilden und übersteht Speichern und Laden', () => {
    const sa = ganzesMuster();
    expect(alleGedeutet(sa)).toBe(true);
    expect(sa.reflexionen.map(r => sa.einheiten.findIndex(e => e.id === r.nachEinheit) + 1)).toEqual([4, 8]);
    expect(verworfene(sa, 10).map(p => `${p.einheit + 1}:${p.lesart.text.slice(0, 12)}`).length).toBe(5);
    expect(sa.einheiten.flatMap(e => e.lesarten).filter(l => l.verlauf.length > 1).length).toBeGreaterThan(5);
    expect(sa.fazit!.muster[0]!.belege.length).toBe((muster.zwischenfazit.belege as unknown[]).length);
    expect(sa.fazit!.muster[0]!.belege[0]!.zitat).toBe(EINHEITEN[2]);
    const q = rund(projekt(sa));
    expect(q.sequenzanalysen![0]).toEqual(JSON.parse(JSON.stringify(sa)));
    expect(qualFassung(q)).toBe(2);
  });
});
