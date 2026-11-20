import { describe, expect, it } from 'vitest';
import { artikelListe } from './artikel';
import { beschreibung, hilfeSeiten, istPfadId } from './seiten';

const eingabe = () => ({
  sprachen: ['de', 'en'] as const as ('de' | 'en')[],
  artikel: { de: artikelListe('de'), en: artikelListe('en') },
  unterzeile: { de: 'Statistik für Studium und Forschung', en: 'Statistics for study and research' },
  schrift: { normal: 'assets/a.woff2', fett: 'assets/b.woff2' }
});

describe('Hilfe-Artikel als Webseiten', () => {
  it('jede Artikel-Id geht als Pfad', () => {
    const falsch = artikelListe('de').map(a => a.id).filter(id => !istPfadId(id));
    expect(falsch).toEqual([]);
  });

  it('eine Seite je Artikel und Sprache, Übersicht, CSS und Sitemap', () => {
    const e = eingabe(), n = e.artikel.de.length;
    const d = hilfeSeiten(e);
    expect(d.filter(x => /^(de|en)\/hilfe\/[^/]+\/index\.html$/.test(x.pfad))).toHaveLength(2 * n);
    expect(d.map(x => x.pfad)).toEqual(expect.arrayContaining(['de/hilfe/index.html', 'en/hilfe/index.html', 'hilfe.css', 'sitemap.xml']));
    expect(d.find(x => x.pfad === 'sitemap.xml')!.inhalt.match(/<url>/g)).toHaveLength(1 + 2 * (n + 1));
  });

  it('Kopf: Hauptadresse, Sprachfassungen, Knopf in die App', () => {
    const s = hilfeSeiten(eingabe()).find(x => x.pfad === 'en/hilfe/p-wert/index.html')!.inhalt;
    expect(s).toContain('<link rel="canonical" href="https://statable.eu/en/hilfe/p-wert/">');
    expect(s).toContain('hreflang="de" href="https://statable.eu/de/hilfe/p-wert/"');
    expect(s).toContain('hreflang="x-default" href="https://statable.eu/en/hilfe/p-wert/"');
    expect(s).toContain('href="../../../?sprache=en#hilfe/p-wert"');
    expect(s).toContain('<html lang="en">');
  });

  it('Text aus Artikeln wird maskiert, auch im eingebetteten JSON', () => {
    const e = eingabe();
    e.artikel.de = [{ id: 'probe', bereich: 'start', titel: 'a <b> & "c" </script>', stichwoerter: [], inhalt: ['<img src=x>'], verwandt: [] }];
    const s = hilfeSeiten({ ...e, sprachen: ['de'] }).find(x => x.pfad === 'de/hilfe/probe/index.html')!.inhalt;
    expect(s).not.toContain('<img src=x>');
    expect(s).not.toContain('a <b> &');
    expect(s).toContain('<h1>a &lt;b&gt; &amp; &quot;c&quot; &lt;/script&gt;</h1>');
    // genau zwei: das eingebettete JSON-LD und die Besucherzählung (seit 25.10.) - kein drittes aus dem Artikeltext
    expect(s.match(/<\/script>/g)).toHaveLength(2);
    expect(s).toContain('<script src="../../../zaehlen-hilfe.js" defer></script>');
  });

  it('Lizenz CC BY 4.0 und Lehrmaterial-Daten (AMB) für OERSI', () => {
    const s = hilfeSeiten(eingabe()).find(x => x.pfad === 'de/hilfe/p-wert/index.html')!.inhalt;
    expect(s).toContain('<link rel="license" href="https://creativecommons.org/licenses/by/4.0/">');
    const daten = JSON.parse(s.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1]!) as Record<string, unknown>[];
    const amb = daten.find(d => Array.isArray(d['@context']) && (d['@context'] as unknown[]).includes('https://w3id.org/kim/amb/context.jsonld'))!;
    expect(amb).toMatchObject({ id: 'https://statable.eu/de/hilfe/p-wert/', type: ['LearningResource', 'TechArticle'], inLanguage: ['de'], license: { id: 'https://creativecommons.org/licenses/by/4.0/' } });
    expect(amb.name).toBe('p-Wert');
  });

  it('Beschreibung höchstens rund 155 Zeichen', () => {
    for (const a of artikelListe('de')) expect(beschreibung(a).length).toBeLessThanOrEqual(157);
  });
});
