/** Abbildung als getaggtes PDF über die Druckansicht (Johannes 10.11.2026: alle Dokumente barrierefrei; ersetzt das jsPDF-Bild ohne Tags). */
import { describe, expect, it } from 'vitest';
import { abbildungDruckHtml } from './druckansicht';

const bt = { kurz: 'Histogramm der Schlafdauer', beschreibung: ['Die meisten schlafen 6 bis 8 Stunden.'], liste: [], tabelle: { titel: '', kopf: [], zeilen: [], zeilenKopf: false } };

describe('abbildungDruckHtml', () => {
  const html = abbildungDruckHtml({ sprache: 'de', titel: 'Schlaf <Stunden>', src: 'data:image/png;base64,AAAA', breite: 800, hoehe: 400, text: bt });
  it('hat Sprache, Titel und eine Überschrift für Vorleser', () => {
    expect(html).toContain('<html lang="de">');
    expect(html).toContain('<title>Schlaf &lt;Stunden&gt;</title>');
    expect(html).toMatch(/<h1 class="nur-vorleser">Schlaf &lt;Stunden&gt;<\/h1>/);
  });
  it('Bild mit Alternativtext aus Kurztext und Beschreibung, Figur als Gruppe', () => {
    expect(html).toContain('alt="Histogramm der Schlafdauer Die meisten schlafen 6 bis 8 Stunden."');
    expect(html).toContain('<figure role="group"');
  });
  it('Seite so groß wie die Abbildung (16 cm plus Rand)', () => {
    expect(html).toContain('@page{size:170mm 90mm;margin:5mm}');
  });
  it('ohne Bildtext wenigstens „Abbildung 1: Titel“', () => {
    expect(abbildungDruckHtml({ sprache: 'en', titel: 'X', src: 's', breite: 10, hoehe: 10 })).toMatch(/alt="(Abbildung|Figure) 1: X"/);
  });
});
