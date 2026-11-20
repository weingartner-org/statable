import { describe, expect, it } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';
import { pruefeDocx } from '../../../scripts/docx-pruefen.mjs';
import { mitCodeProtokoll } from './codebuch-protokoll';
import { neuesQualProjekt, type Code, type QualProjekt } from './qualprojekt';
import { artenIn, codesImProtokoll, methodenanhangWord, protokollWord, protokollZeilen } from './nachvollziehbarkeit';

const code = (id: string, name: string, extra: Partial<Code> = {}): Code => ({ id, name, kodierbar: true, reihenfolge: 0, ...extra });
const mit = (q: QualProjekt, f: (q: QualProjekt) => QualProjekt, zeit: number): QualProjekt => mitCodeProtokoll(q, f(q), zeit);

/** Projekt mit Verlauf: neu, umbenannt, Definition, Anker, gelöscht */
function projekt(): QualProjekt {
  let q: QualProjekt = { ...neuesQualProjekt('Studie Hilfe'), ich: 'k1', kodierende: [{ id: 'k1', name: 'Anna Beispiel' }] };
  q = mit(q, p => ({ ...p, codes: [code('c1', 'Belastung'), code('c2', 'Hilfe', { reihenfolge: 1 }), code('c3', 'Alt', { reihenfolge: 2, elternId: 'c2' })] }), 1_000_000);
  q = mit(q, p => ({ ...p, codes: p.codes.map(c => (c.id === 'c1' ? { ...c, name: 'Stress' } : c)) }), 2_000_000);
  q = mit(q, p => ({ ...p, codes: p.codes.map(c => (c.id === 'c1' ? { ...c, definition: 'Gefühl von Überforderung', anker: [{ text: 'GEHEIMER ANKERTEXT AUS DEM INTERVIEW' }] } : c)) }), 3_000_000);
  q = mit(q, p => ({ ...p, codes: p.codes.filter(c => c.id !== 'c3') }), 4_000_000);
  return { ...q, dokumente: [{ id: 'd1', name: 'Interview 1', text: 'GEHEIMER DOKUMENTTEXT' } as never], faelle: [{ id: 'f1', name: 'Fall A', werte: {} }, { id: 'f2', name: 'Fall B', werte: {} }] };
}
const text = async (b: Uint8Array) => strFromU8(unzipSync(b)['word/document.xml']!);

describe('Änderungsprotokoll: Zeilen', () => {
  const q = projekt();
  it('neueste zuerst, Person, Art als fester Text, heutiger Name', () => {
    const z = protokollZeilen(q, 'de');
    expect(z.length).toBeGreaterThanOrEqual(5);
    expect(z[0]!.art).toBe('code.geloescht');
    expect(z.every((x, i) => i === 0 || z[i - 1]!.zeit >= x.zeit)).toBe(true);
    expect(z.every(x => x.person === 'Anna Beispiel')).toBe(true);
    const um = z.find(x => x.art === 'code.umbenannt')!;
    expect(um.artText).toBe('Code umbenannt'); expect(um.codeName).toBe('Stress'); expect(um.vorher).toBe('Belastung'); expect(um.nachher).toBe('Stress');
    expect(protokollZeilen(q, 'en').find(x => x.art === 'code.umbenannt')!.artText).toBe('Code renamed');
  });
  it('gelöschter Code mit Zusatz, Anker als Zahl, nie Ankertext', () => {
    const z = protokollZeilen(q, 'de');
    expect(z.find(x => x.art === 'code.geloescht')!.codeName).toBe('Alt (gelöscht)');
    expect(z.find(x => x.art === 'code.anker')!.nachher).toBe('1 Ankerbeispiel');
    expect(JSON.stringify(z)).not.toContain('GEHEIMER');
  });
  it('Filter nach Art und Code; Auswahllisten', () => {
    expect(protokollZeilen(q, 'de', { art: 'code.neu' })).toHaveLength(3);
    const c1 = protokollZeilen(q, 'de', { code: 'c1' });
    expect(c1.length).toBe(4); expect(c1.every(x => x.code === 'c1')).toBe(true);
    expect(protokollZeilen(q, 'de', { art: 'code.neu', code: 'c1' })).toHaveLength(1);
    expect(artenIn(q)).toContain('code.geloescht');
    expect(codesImProtokoll(q, 'de').map(c => c.name)).toContain('Alt (gelöscht)');
  });
  it('ohne Person: Strich', () => {
    const z = protokollZeilen({ ...q, kodierende: [] }, 'de');
    expect(z[0]!.person).toBe('-');
  });
});

describe('Word', () => {
  it('Änderungsprotokoll: docx-pruefen grün, gefiltert, ohne Dokumenttext', async () => {
    for (const sp of ['de', 'en'] as const) {
      const b = await protokollWord(projekt(), sp);
      expect(pruefeDocx(b)).toEqual([]);
      const x = await text(b);
      expect(x).toContain('Stress'); expect(x).toContain('Alt (');
      expect(x).not.toContain('GEHEIMER');
    }
    const g = await text(await protokollWord(projekt(), 'de', { art: 'code.umbenannt' }));
    expect(g).toContain('1 von'); expect(g).not.toContain('Ankerbeispiel');
    const leer = await protokollWord(neuesQualProjekt('Leer'), 'de');
    expect(pruefeDocx(leer)).toEqual([]);
    expect(await text(leer)).toContain('Keine Einträge');
  });

  it('Methodenanhang: Abschnitte in Reihenfolge, grün, kein Dokumenttext', async () => {
    const q: QualProjekt = { ...projekt(), einwilligungen: [{ id: 'e1', fall: 'f1', fassung: 'V1', form: 'schriftlich', punkte: [{ punkt: 'zitate', stand: 'erteilt', notiz: 'GEHEIME NOTIZ' }], erstellt: 1, geaendert: 1 }], protokolle: [{ id: 'p1', art: 'interview', kopf: {}, felder: { raum: 'GEHEIMER RAUM' }, erstellt: 1, geaendert: 1 }],
      typen: [{ id: 't1', name: 'Typ Sucher', beschreibung: 'Sucht früh Hilfe', faelle: ['f1'], merkmale: ['c2'] }] };
    const b = await methodenanhangWord(q, 'de');
    expect(pruefeDocx(b)).toEqual([]);
    const x = await text(b);
    const reihe = ['Projekt und Kodierende', 'Codebaum', 'Änderungsprotokoll (gekürzt)', 'Übereinstimmung der Kodierenden', 'KI-Nutzung', 'REFI-QDA-Datei', 'Einwilligung', 'Protokolle', 'Typen der typenbildenden'];
    const pos = reihe.map(r => x.indexOf(r));
    expect(pos.every(p => p >= 0)).toBe(true);
    expect([...pos].sort((a, b2) => a - b2)).toEqual(pos);
    expect(x).toContain('Anna Beispiel'); expect(x).toContain('Fall A'); expect(x).toContain('Interviewprotokoll'); expect(x).toContain('Typ Sucher');
    expect(x).not.toContain('Phase');
    expect(x).not.toContain('GEHEIM');
    expect(x).toContain('Statable schreibt keine Übereinstimmungszahl');
    // Einwilligung: nur ja/nein je Fall, keine Punkte
    expect(x).toContain('Einwilligung dokumentiert'); expect(x).not.toContain('zitate');
    expect(pruefeDocx(await methodenanhangWord(q, 'en'))).toEqual([]);
  });

  it('Methodenanhang ohne Einwilligung, Protokolle, Typen: diese Abschnitte fehlen; Phase erscheint, wenn vorhanden', async () => {
    const q = projekt();
    q.codes = q.codes.map(c => (c.id === 'c2' ? ({ ...c, phase: 'fokussiert' } as Code) : c));
    const x = await text(await methodenanhangWord(q, 'de'));
    expect(x).not.toContain('Einwilligung dokumentiert'); expect(x).not.toContain('Typen der typenbildenden');
    expect(x).toContain('Phase'); expect(x).toContain('fokussiert');
  });

  it('KI-Nutzung: drei Zustände, Text wörtlich', async () => {
    const q = projekt();
    expect(await text(await methodenanhangWord(q, 'de'))).toContain('Noch nicht angegeben.');
    const nein = await text(await methodenanhangWord({ ...q, kiNutzung: { genutzt: false, zwecke: [], geaendert: 1 } }, 'de'));
    expect(nein).toContain('Nach Angabe der Forschenden keine KI genutzt.'); expect(nein).not.toContain('Noch nicht angegeben.');
    const ja = await text(await methodenanhangWord({ ...q, kiNutzung: { genutzt: true, zwecke: ['transkription', 'anderes'], text: 'Whisper (lokal) für die erste Rohfassung & Korrektur', geaendert: 1 } }, 'de'));
    expect(ja).toContain('Transkription, Anderes'); expect(ja).toContain('Whisper (lokal) für die erste Rohfassung &amp; Korrektur');
    expect(ja).not.toContain('keine KI genutzt');
  });

  it('Übereinstimmung bei reflexiver Themenanalyse; Protokoll gekürzt auf 50', async () => {
    const q = { ...projekt(), arbeitsweise: 'ta-reflexiv' as const };
    expect(await text(await methodenanhangWord(q, 'de'))).toContain('reflexiver Themenanalyse wird keine Übereinstimmungszahl');
    let g: QualProjekt = neuesQualProjekt('Viele');
    for (let i = 0; i < 60; i++) g = mit(g, p => ({ ...p, codes: [...p.codes, code('x' + i, 'Code ' + i, { reihenfolge: i })] }), 1000 + i * 100_000);
    const x = await text(await methodenanhangWord(g, 'de'));
    expect(x).toContain('60 Einträge'); expect(x).toContain('50 gezeigt');
  });
});
