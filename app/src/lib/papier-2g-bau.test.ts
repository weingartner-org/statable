import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { strFromU8, unzipSync } from 'fflate';
import type { FragebogenPlan } from './fragebogenplan';
import { papierTextfassung, papierTextfassungWord, papierTextZeilen } from './papier';
import { erzeugeExport, exportEintraege, sperrFehler, type ExportId } from './fragebogenexport-menue';
import { kommentarSaetzeAusTabelle } from './pretest';
import { pruefeDocx } from '../../../scripts/docx-pruefen.mjs';

/* Bauer-Tests zu Paket 2G (die Prüfer-Tests papier-2g.test.ts und pretest-2g.test.ts bleiben unberührt): Word-Fassung der Textfassung, Export-Menü, Kommentare aus Tabellen. */
const plan = (): FragebogenPlan => JSON.parse(readFileSync(new URL('./testdaten/fragebogenplan/export-plan.json', import.meta.url), 'utf8'));
const absaetze = (b: Uint8Array) => [...strFromU8(unzipSync(b)['word/document.xml']!).matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)].map(m => [...m[0].matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)].map(t => t[1]).join(''));

describe('Textfassung als Word', () => {
  it('pruefeDocx ohne Befund, gleiche Zeilen wie die Textfassung, keine Tabelle', async () => {
    const b = await papierTextfassungWord(plan(), 'de');
    expect(pruefeDocx(b)).toEqual([]);
    expect(strFromU8(unzipSync(b)['word/document.xml']!)).not.toMatch(/<w:tbl[ >]/);
    const nichtLeer = papierTextfassung(plan(), 'de').split('\n').filter(z => z.trim());
    expect(absaetze(b).filter(t => t.trim()).map(t => t.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>'))).toEqual(nichtLeer);
  });
  it('englisch ohne Befund; Sperre bei Fehlern', async () => {
    expect(pruefeDocx(await papierTextfassungWord(plan(), 'en'))).toEqual([]);
    const p = plan(); p.antwortlisten[0]!.optionen[0]!.text = {};
    await expect(papierTextfassungWord(p, 'de')).rejects.toThrow(/^planFehler/);
  });
  it('unbekannte Sprache wirft statt still auf eine andere auszuweichen', () => {
    expect(() => papierTextZeilen(plan(), 'fr')).toThrow(/sprache/);
  });
  it('Block: Aussagen und Optionen je eine Zeile, Kästchen nirgends', () => {
    const t = papierTextfassung(plan(), 'de');
    expect(t).toMatch(/^9\.1 /m);
    expect(t).not.toContain('☐');
    expect(t).not.toMatch(/_{2,}/);
  });
});

describe('Export-Menü', () => {
  it('zehn Einträge mit Fachbegriff, LimeSurvey mit Warnhinweis', () => {
    const e = exportEintraege();
    expect(e.map(x => x.id)).toEqual(['xlsform', 'limesurvey', 'surveyjs', 'pspp', 'kodebuch', 'word', 'html', 'papier-standard', 'papier-gross', 'text']);
    expect(e.find(x => x.id === 'limesurvey')!.warnung).toMatch(/LimeSurvey/);
    expect(e.every(x => x.name && x.was)).toBe(true);
  });
  it('jeder Eintrag erzeugt eine nicht leere Datei mit Namen aus dem Titel; Word-Dateien ohne Befund', async () => {
    const p = plan();
    for (const x of exportEintraege()) {
      const d = await erzeugeExport(x.id as ExportId, p, 'de', { textAuchWord: x.id === 'text' });
      expect(d.length, x.id).toBe(x.id === 'text' ? 2 : 1);
      for (const f of d) {
        expect(f.bytes.length, f.name).toBeGreaterThan(50);
        expect(f.name.startsWith(p.titel.de!.replace(/[\\/:*?"<>|$]+/g, '').trim().slice(0, 80)), f.name).toBe(true);
        if (f.name.endsWith('.docx')) expect(pruefeDocx(f.bytes), f.name).toEqual([]);
      }
    }
  });
  it('gesperrt bei Fehlern: sperrFehler nennt sie, kein Export wird erzeugt', async () => {
    const p = plan(); p.antwortlisten[0]!.optionen[0]!.text = {};
    expect(sperrFehler(p).length).toBeGreaterThan(0);
    for (const id of ['xlsform', 'pspp', 'kodebuch', 'word', 'html', 'papier-standard', 'papier-gross', 'text', 'surveyjs', 'limesurvey'] as ExportId[])
      await expect(erzeugeExport(id, p, 'de'), id).rejects.toThrow(/^planFehler/);
  });
});

describe('Kommentare aus der Datentabelle', () => {
  it('nimmt nur Spalten mit „_kommentar“ und nur Zeilen mit Text', () => {
    const s = kommentarSaetzeAusTabelle([{ name: 'id' }, { name: 'alter_kommentar' }, { name: 'zust_kommentar' }], [[1, 'zu direkt', null], [2, '  ', ''], [3, null, 'unklar']]);
    expect(s).toEqual([{ alter_kommentar: 'zu direkt' }, { zust_kommentar: 'unklar' }]);
  });
});
