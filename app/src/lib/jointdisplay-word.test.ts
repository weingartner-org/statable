/** Joint Display als Word und HTML (Stufe A2): Beispielprojekt „Um Hilfe bitten“, Themen nach `first_generation`. */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { strFromU8, unzipSync } from 'fflate';
import { pruefeDocx } from '../../../scripts/docx-pruefen.mjs';
import { s } from './sitzung.svelte';
import { pruefeQualProjekt, type QualProjekt } from './qualprojekt';
import { umfrageDaten } from './mixed-beispiel';
import { aendereJd, jdAufbau, legeJdAn, setzeBeleg, setzeJdMeta, setzeJdPassung, setzeVerknuepfung, type DatenSicht } from './mixed';
import { htmlText, jointDisplayHtml, jointDisplayWord } from './jointdisplay-word';

s.einst.sprache = 'en';

function beispiel(): { q: QualProjekt; daten: DatenSicht; jd: string } {
  let q = pruefeQualProjekt(JSON.parse(readFileSync(new URL('../../public/beispiel/mixed/hilfe-projekt.json', import.meta.url), 'utf8')));
  const d = umfrageDaten(readFileSync(new URL('../../public/beispiel/mixed/umfrage.csv', import.meta.url), 'utf8'));
  const daten = { spalten: d.spalten, zeilen: d.zeilen } as unknown as DatenSicht;
  const variable = q.variablen.find(v => v.name === 'survey_id')!.id;
  q = setzeVerknuepfung(q, { variable, spalte: 'survey_id' });
  const fg = q.variablen.find(v => v.name === 'first_generation')!.id;
  const r = legeJdAn(q, 'qual-nach-gruppen', 'Themes by first generation');
  q = aendereJd(r.q, r.id, j => ({ ...j, gruppierung: { quelle: 'variable', id: fg }, zeilen: (q.themen ?? []).slice(0, 2).map(t => ({ art: 'thema' as const, id: t.id })) }));
  return { q, daten, jd: r.id };
}
const optionen = { titel: 'Themes by first generation', art: 'Themes or codes by group', hinweis: 'Statable only counts.', sprache: 'en' as const };

describe('Joint Display als Word und HTML', () => {
  it('Word besteht das Prüfskript, enthält Zahl, Zitat mit Quelle, Passung und Meta-Inferenz', async () => {
    let { q, daten, jd } = beispiel();
    const j0 = q.jointDisplays!.find(j => j.id === jd)!;
    const aufbau0 = jdAufbau(q, j0, { daten });
    const zelle = aufbau0.zeilen[0]!.zellen.find(z => z.kandidaten?.length)!;
    q = setzeBeleg(q, jd, `thema:${j0.zeilen[0]!.id}`, zelle.gruppe!, zelle.kandidaten![0]!);
    q = setzeJdPassung(q, jd, `thema:${j0.zeilen[0]!.id}`, 'erweiterung');
    q = setzeJdMeta(q, jd, `thema:${j0.zeilen[0]!.id}`, 'Own reading by the author.');
    const aufbau = jdAufbau(q, q.jointDisplays!.find(j => j.id === jd)!, { daten });
    const zitat = aufbau.zeilen[0]!.zellen.find(z => z.beleg)!.beleg!;
    const bytes = await jointDisplayWord(aufbau, optionen);
    expect(pruefeDocx(bytes)).toEqual([]);
    const doc = strFromU8(unzipSync(bytes)['word/document.xml']!);
    expect(doc).toContain('Own reading by the author.');
    expect(doc).toContain('expansion');
    expect(doc).toContain(' of ');
    expect(doc.replace(/<[^>]+>/g, '')).toContain(zitat.quelle);
    expect(doc).toContain('w:tblHeader');
    const de = await jointDisplayWord(aufbau, { ...optionen, sprache: 'de', titel: 'Themen nach Erstakademiker' });
    expect(pruefeDocx(de)).toEqual([]);
    expect(strFromU8(unzipSync(de)['word/document.xml']!)).toContain('Erweiterung');
  });

  it('ohne Wahl steht kein Zitat im Word und im HTML', async () => {
    const { q, daten, jd } = beispiel();
    const aufbau = jdAufbau(q, q.jointDisplays!.find(j => j.id === jd)!, { daten });
    expect(aufbau.zeilen.every(z => z.zellen.every(c => !c.beleg))).toBe(true);
    const h = jointDisplayHtml(aufbau, optionen);
    expect(h).not.toContain('<blockquote');
    const bytes = await jointDisplayWord(aufbau, optionen);
    expect(pruefeDocx(bytes)).toEqual([]);
  });

  it('HTML: lang, caption, th scope, Kopf mit n, Escaping von Text aus Dateien', () => {
    const { q, daten, jd } = beispiel();
    const aufbau = jdAufbau(q, q.jointDisplays!.find(j => j.id === jd)!, { daten });
    const gefaehrlich = { ...aufbau, zeilen: aufbau.zeilen.map((z, i) => ({ ...z, name: i === 0 ? 'Thema <b>fett</b> & "x"' : z.name, meta: i === 0 ? '<script>alert(1)</script>' : z.meta, zellen: z.zellen.map((c, k) => (i === 0 && k === 0 ? { ...c, beleg: { segment: 'x', text: 'ein <b>Zitat</b> & mehr', quelle: 'Interview <i>1</i>' } } : c)) })) };
    const h = jointDisplayHtml(gefaehrlich, optionen);
    expect(h).toContain('<html lang="en">');
    expect(h).toContain('<caption>');
    expect(h).toContain('<th scope="col">');
    expect(h).toContain('<th scope="row">');
    expect(h).toMatch(/\(n = \d+\)/);
    expect(h).toContain('&lt;b&gt;Zitat&lt;/b&gt;');
    expect(h).toContain('&lt;b&gt;fett&lt;/b&gt;');
    expect(h).toContain('&lt;script&gt;');
    expect(h).not.toContain('<b>');
    expect(h).not.toContain('<script>');
    expect(h).not.toContain('<i>1</i>');
    expect(h).toContain('<blockquote>');
  });

  it('htmlText: ungültige XML-Zeichen und Umbrüche', () => {
    expect(htmlText('a\u0001b\nc')).toBe('ab c');
    expect(htmlText(`<>&"'`)).toBe('&lt;&gt;&amp;&quot;&#39;');
  });
});
