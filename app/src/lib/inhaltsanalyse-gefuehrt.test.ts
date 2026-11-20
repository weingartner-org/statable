import { describe, expect, it } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import { pruefeDocx } from '../../../scripts/docx-pruefen.mjs';
import { kodiere, legeCodeAn, legeFallAn, legeVariableAn, setzeWert } from './kodieren';
import { neuesQualProjekt, pruefeQualProjekt, type QualProjekt } from './qualprojekt';
import {
  aendereTyp, entferneTyp, ergebnisTabelle, evaluativeKategorien, evaluativWord, faelleOhneTyp, fallUebersicht, legeEvaluativeKategorieAn, legeTypAn,
  merkmalsraum, ordneFaelleZu, stufeEin, typenWord,
} from './inhaltsanalyse-gefuehrt';

/** Drei Fälle (Anna, Ben, Cem), je ein Dokument, dazu ein Dokument ohne Fall; Variable Alter; Code „Hilfe“ (ohne Untercodes). */
function projekt() {
  let q = neuesQualProjekt('T');
  q = { ...q, kodierende: [{ id: 'k1', name: 'Ich' }], ich: 'k1' };
  const ids: Record<string, string> = {};
  for (const n of ['Anna', 'Ben', 'Cem']) { const r = legeFallAn(q, n); q = r.q; ids[n] = r.id; }
  const text = 'Satz eins. Satz zwei. Satz drei.';
  q = { ...q, dokumente: ['Anna', 'Ben', 'Cem', 'Frei'].map((n, i) => ({ id: `d${i}`, name: `Interview ${n}`, art: 'text' as const, text, erstellt: 0, geaendert: 0, ...(n !== 'Frei' ? { fall: ids[n]! } : {}) })) };
  const v = legeVariableAn(q, 'Alter', 'ganzzahl'); q = v.q;
  q = setzeWert(q, ids.Anna!, v.id, 20); q = setzeWert(q, ids.Ben!, v.id, 30);
  const k = legeEvaluativeKategorieAn(q, 'Belastung', ['hoch', 'mittel', 'niedrig']); q = k.q;
  const h = legeCodeAn(q, 'Hilfe'); q = h.q;
  return { q, ids, kat: k.id, ausp: k.auspraegungen, hilfe: h.id, alter: v.id };
}
const segVon = (q: QualProjekt, dok: string, start: number): string => q.segmente.find(s => s.dokument === dok && s.start === start)!.id;

describe('evaluativ', () => {
  it('Kategorie mit Ausprägungen in Reihenfolge; nur Codes mit Untercodes', () => {
    const { q, kat } = projekt();
    const k = evaluativeKategorien(q);
    expect(k.map(x => x.name)).toEqual(['Belastung']);
    expect(k[0]!.auspraegungen.map(a => a.name)).toEqual(['hoch', 'mittel', 'niedrig']);
    expect(k[0]!.id).toBe(kat);
  });
  it('Fehler beim Anlegen', () => {
    const { q } = projekt();
    expect(() => legeEvaluativeKategorieAn(q, 'X', [' ', ''])).toThrow('auspraegung-fehlt');
    expect(() => legeEvaluativeKategorieAn(q, 'X', ['a', 'A'])).toThrow('auspraegung-doppelt');
    expect(() => legeEvaluativeKategorieAn(q, 'Belastung', ['a'])).toThrow('name-vergeben');
  });
  it('Fall-Übersicht: keine / nicht eingestuft / eine / unterschiedlich, Dokumente ohne Fall extra', () => {
    let { q, kat, ausp } = projekt();
    q = kodiere(q, 'd0', 0, 10, kat, 'k1');          // Anna: Stelle ohne Ausprägung
    q = kodiere(q, 'd1', 0, 10, ausp[0]!, 'k1');     // Ben: hoch
    q = kodiere(q, 'd1', 11, 21, ausp[0]!, 'k1');
    q = kodiere(q, 'd3', 0, 10, ausp[2]!, 'k1');     // Dokument ohne Fall
    let u = fallUebersicht(q, kat);
    expect(u.map(z => z.ergebnis.art)).toEqual(['nicht-eingestuft', 'eine', 'keine', 'eine']);
    expect(u[1]!.ergebnis.auspraegung).toBe(ausp[0]);
    expect(u[3]!.fallId).toBeNull();
    expect(u[1]!.stellen[0]!.text).toBe('Satz eins.');
    q = stufeEin(q, segVon(q, 'd1', 11), kat, ausp[1]!, 'k1');
    u = fallUebersicht(q, kat);
    expect(u[1]!.ergebnis.art).toBe('unterschiedlich');
  });
  it('stufeEin setzt genau eine Ausprägung; null lässt die Stelle in der Kategorie', () => {
    let { q, kat, ausp } = projekt();
    q = kodiere(q, 'd0', 0, 10, kat, 'k1');
    const s = segVon(q, 'd0', 0);
    q = stufeEin(q, s, kat, ausp[0]!, 'k1');
    q = stufeEin(q, s, kat, ausp[1]!, 'k1');
    expect(q.kodierungen.filter(k => k.segment === s).map(k => k.code).sort()).toEqual([kat, ausp[1]!].sort());
    expect(stufeEin(q, s, kat, ausp[1]!, 'k1')).toBe(q);
    q = stufeEin(q, s, kat, null, 'k1');
    expect(q.kodierungen.filter(k => k.segment === s).map(k => k.code)).toEqual([kat]);
    expect(fallUebersicht(q, kat)[0]!.ergebnis.art).toBe('nicht-eingestuft');
  });
  it('stufeEin ändert nur die eigenen Kodierungen; andere Personen bleiben und stehen in `andere`', () => {
    let { q, kat, ausp } = projekt();
    q = kodiere(q, 'd0', 0, 10, ausp[0]!, 'k2');      // andere Person: hoch
    const s = segVon(q, 'd0', 0);
    q = stufeEin(q, s, kat, ausp[2]!, 'k1');           // ich: niedrig
    expect(q.kodierungen.filter(k => k.segment === s && k.kodierende === 'k2').map(k => k.code)).toEqual([ausp[0]]);
    const st = fallUebersicht(q, kat, 'k1')[0]!.stellen[0]!;
    expect(st.meine).toEqual([ausp[2]]);
    expect(st.andere).toEqual([{ auspraegung: ausp[0], kodierende: 'k2' }]);
    expect(fallUebersicht(q, kat)[0]!.ergebnis.art).toBe('unterschiedlich');
    q = stufeEin(q, s, kat, null, 'k1');
    expect(q.kodierungen.filter(k => k.segment === s && k.kodierende === 'k2').map(k => k.code)).toEqual([ausp[0]]);
  });
  it('null bei Stelle, die nur die Ausprägung trägt: Stelle bleibt', () => {
    let { q, kat, ausp } = projekt();
    q = kodiere(q, 'd0', 0, 10, ausp[0]!, 'k1');
    const s = segVon(q, 'd0', 0);
    q = stufeEin(q, s, kat, null, 'k1');
    expect(q.segmente.some(x => x.id === s)).toBe(true);
    expect(fallUebersicht(q, kat)[0]!.stellen).toHaveLength(1);
  });
  it('Ergebnistabelle: Häufigkeit in fester Reihenfolge, gekreuzt mit Variable', () => {
    let { q, kat, ausp, alter } = projekt();
    q = kodiere(q, 'd0', 0, 10, ausp[0]!, 'k1');
    q = kodiere(q, 'd1', 0, 10, ausp[0]!, 'k1');
    q = kodiere(q, 'd3', 0, 10, ausp[2]!, 'k1');
    const t = ergebnisTabelle(q, kat);
    expect(t.zeilen.map(z => z.anzahl)).toEqual([2, 0, 0, 0, 0, 1]);
    expect(t.gesamt).toBe(3);
    const x = ergebnisTabelle(q, kat, alter);
    expect(x.spalten!.map(s => s.name)).toEqual(['20', '30', 'fehlt']);
    expect(x.zeilen[0]!.nachWert).toEqual([1, 1, 0]);
    expect(x.zeilen[5]!.nachWert).toEqual([0, 0, 1]);
    expect(x.nachWertGesamt).toEqual([1, 1, 1]);
  });
});

describe('typenbildend', () => {
  function mitStellen() {
    const p = projekt();
    let q = p.q;
    q = kodiere(q, 'd0', 0, 10, p.ausp[0]!, 'k1'); q = kodiere(q, 'd1', 0, 10, p.ausp[0]!, 'k1');
    q = kodiere(q, 'd2', 0, 10, p.ausp[2]!, 'k1'); q = kodiere(q, 'd0', 11, 21, p.hilfe, 'k1');
    return { ...p, q };
  }
  it('Merkmalsraum: Kombinationen in fester Reihenfolge, mit Fällen', () => {
    const { q, kat, hilfe, ids } = mitStellen();
    const r = merkmalsraum(q, [kat, hilfe]);
    expect(r.merkmale.map(m => m.name)).toEqual(['Belastung', 'Hilfe']);
    expect(r.zeilen.map(z => z.werte)).toEqual([['hoch', 'ja'], ['hoch', 'nein'], ['niedrig', 'nein']]);
    expect(r.zeilen.map(z => z.anzahl)).toEqual([1, 1, 1]);
    expect(r.zeilen[1]!.faelle).toEqual([{ id: ids.Ben, name: 'Ben' }]);
  });
  it('Variable: fehlend als „fehlt“ zuletzt; mehr als 3 Merkmale wirft', () => {
    const { q, alter, hilfe, kat } = mitStellen();
    expect(merkmalsraum(q, [alter]).zeilen.map(z => z.werte[0])).toEqual(['20', '30', 'fehlt']);
    expect(merkmalsraum(q, [alter], 'en').zeilen.at(-1)!.werte[0]).toBe('missing');
    expect(() => merkmalsraum(q, [alter, hilfe, kat, 'x'])).toThrow('zu-viele');
    expect(merkmalsraum(q, []).zeilen).toEqual([]);
  });
  it('Typen anlegen, ändern, zuordnen (ein Fall höchstens in einem Typ), löschen', () => {
    const { q: q0, ids, kat } = mitStellen();
    let r = legeTypAn(q0, ' Helfer ', [kat], 'Suchen Hilfe');
    let q = r.q; const t1 = r.id;
    expect(() => legeTypAn(q, '', [])).toThrow('name-leer');
    expect(() => legeTypAn(q, 'helfer', [])).toThrow('name-vergeben');
    r = legeTypAn(q, 'Einzelgänger', [kat]); q = r.q; const t2 = r.id;
    let z = ordneFaelleZu(q, t1, [ids.Anna!, ids.Ben!], true);
    expect(z.umgezogen).toEqual([]);
    z = ordneFaelleZu(z.q, t2, [ids.Ben!, ids.Cem!], true);
    expect(z.umgezogen).toEqual([{ fallId: ids.Ben, vonTypId: t1, vonTyp: 'Helfer' }]);
    q = z.q;
    expect(q.typen!.find(t => t.id === t1)!.faelle).toEqual([ids.Anna]);
    expect(q.typen!.find(t => t.id === t2)!.faelle).toEqual([ids.Ben, ids.Cem]);
    expect(faelleOhneTyp(q)).toEqual([]);
    q = ordneFaelleZu(q, t2, [ids.Cem!], false).q;
    expect(faelleOhneTyp(q)).toEqual([{ id: ids.Cem, name: 'Cem' }]);
    q = aendereTyp(q, t1, { name: 'Helfende', beschreibung: '' });
    expect(q.typen![0]!.name).toBe('Helfende'); expect(q.typen![0]!.beschreibung).toBeUndefined();
    expect(() => aendereTyp(q, t1, { name: 'einzelgänger' })).toThrow('name-vergeben');
    q = entferneTyp(entferneTyp(q, t1), t2);
    expect(q.typen).toBeUndefined();
  });
  it('Rundweg durch den Leser: Fassung 3, Typen bleiben', () => {
    const { q: q0, ids, kat } = mitStellen();
    const r = legeTypAn(q0, 'A', [kat]);
    const q = ordneFaelleZu(r.q, r.id, [ids.Anna!], true).q;
    const l = pruefeQualProjekt(JSON.parse(JSON.stringify(q)));
    expect(l.version).toBe(3);
    expect(l.typen![0]!.faelle).toEqual([ids.Anna]);
  });
});

describe('Word', () => {
  for (const sp of ['de', 'en'] as const) {
    it(`typenWord und evaluativWord: docx-pruefen ohne Befund (${sp}), keine Dokumenttexte`, async () => {
      const p = projekt();
      let q = kodiere(p.q, 'd0', 0, 10, p.ausp[0]!, 'k1');
      const r = legeTypAn(q, 'Typ A', [p.kat, p.alter], 'Beschreibung');
      q = ordneFaelleZu(r.q, r.id, [p.ids.Anna!], true).q;
      const a = await typenWord(q, sp);
      expect(pruefeDocx(a)).toEqual([]);
      const da = strFromU8(unzipSync(a)['word/document.xml']!);
      expect(da).toContain('Typ A'); expect(da).toContain('Anna'); expect(da).toContain('hoch'); expect(da).not.toContain('Satz eins');
      const b = await evaluativWord(q, p.kat, sp);
      expect(pruefeDocx(b)).toEqual([]);
      const db = strFromU8(unzipSync(b)['word/document.xml']!);
      expect(db).toContain('Belastung'); expect(db).toContain('Ben'); expect(db).not.toContain('Satz eins');
    });
  }
  it('leere Typen: Hinweis', async () => {
    const a = await typenWord(projekt().q, 'de');
    expect(pruefeDocx(a)).toEqual([]);
    expect(strFromU8(unzipSync(a)['word/document.xml']!)).toContain('noch keine Typen');
  });
});
