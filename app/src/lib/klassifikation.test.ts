import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { s } from './sitzung.svelte';
import { klassLesen, klassIndex, klassZuordnen, klassLaden, klassCacheLeeren, normalisiere, eintraegeJeEbene, klassErgebnisSaetze, klassFehlerSatz, klassNullenWarnung, klassOenaceWarnung, klassQuelleSatz, klassSpracheSatz, klassSchreibweiseSatz, KLASS_LIZENZ, KLASS_NAMENSNENNUNG, KLASSIFIKATIONEN, KLASS_MAX_BYTES, type KlassId, type Klassifikation } from './klassifikation';

s.einst.sprache = 'de'; s.einst.anrede = 'du';
const ordner = new URL('../../public/klass/', import.meta.url);
const text = (id: string) => readFileSync(new URL(`${id}.json`, ordner), 'utf8');
const laden = (id: KlassId): Klassifikation => { const r = klassLesen(text(id), id); if (!r.ok) throw new Error(r.grund); return r.klass; };
const ZU = { ebene: 0, ziel: 'titel', sprache: 'de' } as const;

describe('Die Dateien unter public/klass (Quelle: Statistik Austria, CC BY 4.0)', () => {
  it('genau fünf Dateien (drei Statistik Austria, zwei Eurostat), zusammen unter 900 KB; Größen und Ebenen wie beim Holen', () => {
    const dateien = readdirSync(ordner).sort();
    expect(dateien).toEqual(['isco08.json', 'nuts2021.json', 'nuts2024.json', 'oenace2008.json', 'oenace2025.json']);
    expect(dateien.reduce((a, f) => a + statSync(new URL(f, ordner)).size, 0)).toBeLessThan(900 * 1024);
    expect([laden('oenace2008'), laden('oenace2025'), laden('isco08')].map(k => [k.eintraege.length, k.ebenen])).toEqual([[1697, 5], [1758, 5], [619, 4]]);
    expect(eintraegeJeEbene(laden('isco08'))).toEqual([10, 43, 130, 436]);
  });
  it('Lizenz und Namensnennung stehen in jeder Datei, mit Wortlaut der Quelle; Prüfsumme und Abrufdatum auch', () => {
    const zip: Record<string, string> = { oenace2008: 'OENACE2008', oenace2025: 'OENACE2025', isco08: 'ISCO08' };
    for (const k of KLASSIFIKATIONEN.filter(x => x.anbieter === 'statistik-austria')) {
      const j = JSON.parse(text(k.id));
      expect(j.lizenz).toBe(KLASS_LIZENZ); expect(j.namensnennung).toBe(KLASS_NAMENSNENNUNG);
      expect(j.quelle.sha256).toMatch(/^[0-9a-f]{64}$/); expect(j.quelle.abgerufen).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(j.quelle.adresse).toBe(`https://data.statistik.gv.at/data/OGDEXT_KLASSDB_${zip[k.id]}_1.zip`);
      expect(Object.keys(j).sort()).toEqual(['anzahl', 'e', 'ebenen', 'format', 'id', 'lizenz', 'name', 'namensnennung', 'quelle', 'version']);   // nur die Struktur, nichts weiter
    }
    expect(KLASS_LIZENZ).toBe('Creative Commons Namensnennung 4.0 International (CC BY 4.0)');
    expect(KLASS_NAMENSNENNUNG).toBe('Datenquelle: Statistik Austria - data.statistik.gv.at');
  });
  it('kein Suchschlüssel führt zu zwei Einträgen (sonst würde geraten)', () => {
    for (const k of KLASSIFIKATIONEN) { const kl = laden(k.id); const idx = klassIndex(kl); expect(idx.mehrdeutig, k.id).toBe(0); expect(idx.nachSchluessel.size).toBeGreaterThanOrEqual(kl.eintraege.length); }
  });
  it('der Quelltext von Statable nennt Quelle und Lizenz im Impressum, in sbom.mjs und im Behördenblatt', () => {
    const wurzel = new URL('../../../', import.meta.url);
    for (const d of ['app/src/seiten/Rechtliches.svelte', 'scripts/sbom.mjs', 'docs/STATABLE-FUER-BEHOERDEN.md']) {
      const t = readFileSync(new URL(d, wurzel), 'utf8');
      expect(t, d).toContain('Statistik Austria'); expect(t, d).toContain('CC BY 4.0');
    }
  });
});

describe('Zuordnen: ÖNACE', () => {
  const k = laden('oenace2008'), idx = klassIndex(k);
  const einer = (c: string | number, opt: Partial<Parameters<typeof klassZuordnen>[3]> = {}) => klassZuordnen(k, idx, [c], { ...ZU, ...opt });
  it('Schreibweisen: 01.11, 0111, A 01.11, A0111, a01.11 gelten als derselbe Code; das Ergebnis ist derselbe Titel', () => {
    const t = 'Anbau von Getreide (ohne Reis), Hülsenfrüchten und Ölsaaten';
    for (const c of ['01.11', '0111', 'A 01.11', 'A0111', 'a01.11', ' 01.11 ']) expect(einer(c).werte, c).toEqual([t]);
    expect(einer('A 01.11').angeglichen).toBe(0);             // genau so schreibt es die Quelle
    expect(einer('01.11').angeglichen).toBe(1);               // der Abschnittsbuchstabe fehlt: angeglichen
    expect(einer('A').werte).toEqual(['LAND- UND FORSTWIRTSCHAFT, FISCHEREI']);
    expect(einer('01.11-0').werte).toEqual([t]);              // Unterklasse
  });
  it('englisch: Titel auf Englisch; Code und Titel auf gewählter Ebene', () => {
    expect(einer('01.11', { sprache: 'en' }).werte).toEqual(['Growing of cereals (except rice), leguminous crops and oil seeds']);
    expect(einer('01.11', { ebene: 1 }).werte).toEqual(['LAND- UND FORSTWIRTSCHAFT, FISCHEREI']);
    expect(einer('01.11', { ebene: 2, ziel: 'code' }).werte).toEqual(['A 01']);
    expect(einer('01.11', { ebene: 3, ziel: 'code' }).werte).toEqual(['A 01.1']);
    expect(einer('01.11', { ebene: 4, ziel: 'code' }).werte).toEqual(['A 01.11']);
    expect(einer('01.11-0', { ebene: 4, ziel: 'code' }).werte).toEqual(['A 01.11']);
  });
  it('gröber als gewünscht: leer und gezählt; nichts wird aufgefüllt', () => {
    const r = einer('01', { ebene: 4 });
    expect(r.werte).toEqual([null]); expect(r.zuGrob).toBe(1); expect(r.gefunden).toBe(0); expect(r.nichtGefunden).toBe(0);
  });
  it('nicht gefunden: leer, gezählt, erste Beispiele ohne Doppelte; keine Näherungssuche', () => {
    const codes = ['01.11', '99.99', '01.111', '0111x', 'Landwirtschaft', '99.99', '', null, undefined, '  ', '04', '04.1', '04.2', '04.3'];
    const r = klassZuordnen(k, idx, codes, ZU);
    expect(r.gefunden).toBe(1); expect(r.leer).toBe(4); expect(r.nichtGefunden).toBe(9);
    expect(r.beispiele).toEqual(['99.99', '01.111', '0111x', 'Landwirtschaft', '04']);
    expect(r.werte.filter(v => v !== null)).toHaveLength(1);
    expect(einer('01.1').werte[0]).toBe('Anbau einjähriger Pflanzen');    // exakt gibt es „01.1“ (Gruppe)
    expect(einer('01.12').werte[0]).toBe('Anbau von Reis');              // und nicht der nächste Code
  });
  it('Zahlenspalten: ganze Zahlen werden als Text gelesen; Zahlen mit Nachkommastellen (1,11) nicht', () => {
    const r = klassZuordnen(k, idx, [1.11, 111, 1, 2, 10], ZU);
    expect(r.nichtGanz).toBe(1);
    expect(r.werte[0]).toBeNull();
    expect(r.beispiele[0]).toBe('1,11');
    expect(klassNullenWarnung()).toContain('als Text lesen');
    expect(r.gefunden).toBe(r.werte.filter(v => v !== null).length);
  });
  it('Sprache der Titel im Fuß', () => {
    expect(klassSpracheSatz('de', true)).toContain('auf Deutsch'); expect(klassSpracheSatz('en', true)).toContain('auf Englisch');
    expect(klassSpracheSatz('en', false)).toContain('Übersetzt in andere Sprachen wird nichts');
  });
  it('Treffer in die andere Richtung: wie viele Einträge der Klassifikation kommen vor', () => {
    const r = klassZuordnen(k, idx, ['01.11', '0111', '01.12', 'x'], ZU);
    expect(r.getroffen).toBe(2);
  });
  it('Sätze: gefunden, nicht gefunden mit Beispielen, leer, zu grob, angeglichen; Warnung ÖNACE 2008 ist nicht 2025', () => {
    const r = klassZuordnen(k, idx, ['01.11', '99.99', null, '01'], { ...ZU, ebene: 4 });
    const t = klassErgebnisSaetze(r, 4).join(' ');
    expect(t).toContain('1 von 4 Zeilen haben einen Wert bekommen'); expect(t).toContain('1 Code wurde in der Klassifikation nicht gefunden und bleibt leer (zum Beispiel 99.99)');
    expect(t).toContain('1 Zeile hat keinen Code'); expect(t).toContain('1 Code liegt gröber als die gewählte Ebene'); expect(t).toContain('angeglichen');
    expect(klassOenaceWarnung()).toContain('nicht gleich'); expect(klassOenaceWarnung()).toContain('keinen Umsteigeschlüssel');
    expect(klassSchreibweiseSatz('oenace')).toContain('„01.11“, „0111“ und „A 01.11“');
    expect(klassQuelleSatz(k)).toContain('Datenquelle: Statistik Austria - data.statistik.gv.at');
  });
});

describe('Zuordnen: ISCO-08', () => {
  const k = laden('isco08'), idx = klassIndex(k);
  it('4-stellige Codes, Ebene 1 bis 4; ein Punkt gehört nicht zum Code und wird nicht weggelassen', () => {
    const e2511 = k.eintraege.find(e => e.edv === '2511')!;
    expect(klassZuordnen(k, idx, ['2511'], ZU).werte[0]).toBe(e2511.de);
    expect(klassZuordnen(k, idx, ['2511'], { ...ZU, ebene: 1, sprache: 'en' }).werte[0]).toBe('Professionals');
    expect(klassZuordnen(k, idx, ['25.11', '251 1'], ZU).werte).toEqual([null, e2511.de]);
    expect(klassZuordnen(k, idx, [2511, 110], ZU)).toMatchObject({ gefunden: 1, nichtGefunden: 1 });    // 0110 ohne führende Null ist 110: nicht gefunden
    expect(klassZuordnen(k, idx, ['0110'], ZU).werte[0]).toBe('Offiziere in regulären Streitkräften');
  });
  it('normalisiere', () => { expect(normalisiere(' a 01.11-0 ', 'oenace')).toBe('A01110'); expect(normalisiere('25 11', 'isco')).toBe('2511'); expect(normalisiere('25.11', 'isco')).toBe('25.11'); });
});

describe('Fremde Eingabe: die Datei und ihre Texte', () => {
  const gut = () => JSON.parse(text('isco08'));
  it('kaputtes JSON, fremdes Format, falsche Form, zu groß', () => {
    expect(klassLesen('{')).toEqual({ ok: false, grund: 'unlesbar' });
    expect(klassLesen('[]')).toEqual({ ok: false, grund: 'fremd' });
    expect(klassLesen(JSON.stringify({ ...gut(), format: 'x' }))).toEqual({ ok: false, grund: 'fremd' });
    expect(klassLesen(JSON.stringify({ ...gut(), id: 'andere' }))).toEqual({ ok: false, grund: 'fremd' });
    expect(klassLesen(text('isco08'), 'oenace2008')).toEqual({ ok: false, grund: 'fremd' });
    expect(klassLesen(JSON.stringify({ ...gut(), e: [] }))).toEqual({ ok: false, grund: 'form' });
    expect(klassLesen(JSON.stringify({ ...gut(), e: [[1, 'A', 'A', 5, 'x']] }))).toEqual({ ok: false, grund: 'form' });
    expect(klassLesen(JSON.stringify({ ...gut(), e: [[0, 'A', 'A', 'x', 'y']] }))).toEqual({ ok: false, grund: 'form' });
    expect(klassLesen(JSON.stringify({ ...gut(), e: Array.from({ length: 20_001 }, () => [1, 'A', 'A', 'x', 'y']) }))).toEqual({ ok: false, grund: 'zu-gross' });
    expect(klassLesen(' '.repeat(KLASS_MAX_BYTES + 1))).toEqual({ ok: false, grund: 'zu-gross' });
  });
  it('<script> als Titel bleibt Text; __proto__, constructor und toString als Code finden nichts', () => {
    const j = gut(); j.e = [[1, '1', '1', '<script>alert(1)</script>', '<img src=x onerror=alert(1)>'], [2, '11', '11', 'Titel', 'Title']];
    const r = klassLesen(JSON.stringify(j), 'isco08');
    expect(r.ok).toBe(true); if (!r.ok) return;
    const idx = klassIndex(r.klass);
    const z = klassZuordnen(r.klass, idx, ['1', '__proto__', 'constructor', 'toString'], ZU);
    expect(z.werte[0]).toBe('<script>alert(1)</script>');     // unverändert als Text; die Oberfläche setzt es nur als Textknoten
    expect(z.nichtGefunden).toBe(3);
  });
  it('Laden bei Bedarf: eine Adresse unter klass/, nur einmal; Fehler als Satz, danach erneut möglich; kein Netz im Test', async () => {
    klassCacheLeeren();
    const aufrufe: string[] = [];
    const holen = async (a: string) => { aufrufe.push(a); return text('isco08'); };
    const [a, b] = await Promise.all([klassLaden('isco08', holen), klassLaden('isco08', holen)]);
    expect(a).toBe(b); expect(aufrufe).toEqual(['klass/isco08.json']);
    klassCacheLeeren();
    await expect(klassLaden('isco08', async () => { throw new Error('x'); })).rejects.toThrow(klassFehlerSatz('netz'));
    await expect(klassLaden('isco08', async () => '{"kaputt"')).rejects.toThrow(klassFehlerSatz('unlesbar'));
    await expect(klassLaden('isco08', holen)).resolves.toBeDefined();
  });
  it('Fehlersätze in beiden Sprachen', () => {
    expect(klassFehlerSatz('netz')).toContain('Prüfe die Verbindung');
    s.einst.sprache = 'en';
    try { expect(klassFehlerSatz('netz')).toBe('The classification could not be loaded. Check the connection and try again.'); } finally { s.einst.sprache = 'de'; }
  });
});
beforeEach(() => klassCacheLeeren());
