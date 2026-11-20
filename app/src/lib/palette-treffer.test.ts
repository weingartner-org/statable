import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  rangiere, anzeige, auswertungen, seiten, hilfeArtikel, fachbegriffe, einstellungen, exporte, abschnittBegriffe,
  kuerzelEintraege, setzeKuerzelQuelle, holeKuerzel, type Eintrag,
} from './palette-treffer';

const alle = (): Eintrag[] => [
  ...seiten([{ hash: 'daten', titel: 'Daten' }, { hash: 'bericht', titel: 'Bericht' }, { hash: 'einstellungen', titel: 'Einstellungen', stichwoerter: ['Optionen'] }]),
  ...auswertungen([
    { id: 'gruppen', titel: 'Unterscheiden sich Gruppen?', zusatz: 't-Test, Varianzanalyse', beispiel: 'z. B. Männer und Frauen' },
    { id: 'zusammenhang', titel: 'Hängen zwei Dinge zusammen?', zusatz: 'Korrelation' },
    { id: 'faktor', titel: 'Messen meine Fragen dasselbe?', zusatz: 'Faktorenanalyse (Hauptkomponenten)' },
  ]),
  ...einstellungen([
    { id: 'kontrast', titel: 'Kontrast: Gelb auf Schwarz', stichwoerter: ['Farben'], aktion: { art: 'thema', wert: 'gs' } },
    { id: 'groesser', titel: 'Alles größer', aktion: { art: 'groesse', schritt: 1 } },
    { id: 'sprache-en', titel: 'English', zusatz: 'Sprache', aktion: { art: 'sprache', wert: 'en' } },
  ]),
  ...exporte([{ name: 'Tabelle' }]),
  ...hilfeArtikel([{ id: 'mittelwert', titel: 'Mittelwert', stichwoerter: ['Durchschnitt'] }, { id: 'median', titel: 'Median' }]),
  ...fachbegriffe([{ id: 'varianz', titel: 'Varianz' }, { id: 'standardabweichung', titel: 'Standardabweichung' }]),
  ...abschnittBegriffe([{ id: 'p-wert', text: 'p-Wert' }, { id: 'p-wert', text: 'p-Wert' }, { id: 'effekt', text: 'Effektstärke' }], ['Fachbegriffe dieses Abschnitts']),
];
const ids = (frage: string, e = alle()) => rangiere(frage, e).map(t => t.id);

describe('Quellen: jede liefert Treffer mit der richtigen Aktion', () => {
  it('Auswertung: Alltagsfrage, Fachbegriff und Beispiel finden dieselbe Karte', () => {
    expect(ids('gruppen')[0]).toBe('auswertung-gruppen');
    expect(ids('varianzanalyse')[0]).toBe('auswertung-gruppen');
    expect(ids('frauen')[0]).toBe('auswertung-gruppen');
    expect(rangiere('korrelation', alle())[0]!.aktion).toEqual({ art: 'karte', id: 'zusammenhang' });
  });
  it('Fachbegriff steht immer neben der Alltagsfrage', () => {
    const t = rangiere('faktorenanalyse', alle())[0]!;
    expect(anzeige(t)).toBe('Messen meine Fragen dasselbe? (Faktorenanalyse (Hauptkomponenten))');
    expect(anzeige({ titel: 'Daten' })).toBe('Daten');
  });
  it('Seite und Reiter', () => expect(rangiere('bericht', alle())[0]!.aktion).toEqual({ art: 'hash', hash: 'bericht' }));
  it('Einstellungen: Kontrast, Größe, Sprache', () => {
    expect(rangiere('gelb', alle())[0]!.aktion).toEqual({ art: 'thema', wert: 'gs' });
    expect(rangiere('groesser', alle())[0]!.aktion).toEqual({ art: 'groesse', schritt: 1 });
    expect(rangiere('english', alle())[0]!.aktion).toEqual({ art: 'sprache', wert: 'en' });
  });
  it('Export', () => expect(rangiere('export', alle())[0]!.aktion).toEqual({ art: 'export', nr: 0 }));
  it('Hilfe-Artikel über Titel und Stichwort', () => {
    expect(rangiere('durchschnitt', alle())[0]!.aktion).toEqual({ art: 'hilfe', id: 'mittelwert' });
  });
  it('Hilfe-Artikel, die die Volltextsuche der Hilfe fand, kommen auch ohne Titeltreffer', () => {
    const e = hilfeArtikel([{ id: 'x', titel: 'Ganz anderer Titel' }], new Set(['x']));
    expect(rangiere('streuung', e).map(t => t.id)).toEqual(['hilfe-x']);
    expect(rangiere('streuung', hilfeArtikel([{ id: 'x', titel: 'Ganz anderer Titel' }]))).toEqual([]);
  });
  it('Fachbegriffe öffnen die Erklärung', () => {
    expect(rangiere('standardab', alle())[0]!.aktion).toEqual({ art: 'begriff', id: 'standardabweichung' });
  });
  it('Fachbegriffe dieses Abschnitts: jedes Wort einmal, über den Gruppennamen alle', () => {
    const t = rangiere('abschnitts', alle()).filter(x => x.quelle === 'abschnitt');
    expect(t.map(x => x.titel)).toEqual(['p-Wert', 'Effektstärke']);
    expect(t[1]!.aktion).toEqual({ art: 'abschnitt', nr: 2 });
  });
  it('Kürzel: bis Auftrag A liefert, ist die Liste leer; danach erscheinen sie', () => {
    expect(holeKuerzel()).toEqual([]);
    expect(kuerzelEintraege()).toEqual([]);
    setzeKuerzelQuelle(() => [{ id: 'wo', text: 'Wo bin ich', tasten: 'Alt + W', wirkung: 'sagt die Stelle an' }]);
    const t = rangiere('wo bin', [...alle(), ...kuerzelEintraege()])[0]!;
    expect(t.aktion).toEqual({ art: 'kuerzel', id: 'wo' }); expect(t.hinweis).toBe('Alt + W');
  });
  afterEach(() => setzeKuerzelQuelle(null));
});

describe('Rangfolge', () => {
  const e: Eintrag[] = [
    { id: 'teil', quelle: 'seite', titel: 'Die Vorhersage', aktion: { art: 'hash', hash: 'a' } },
    { id: 'anfang', quelle: 'seite', titel: 'Der Hersteller', aktion: { art: 'hash', hash: 'b' } },
  ];
  it('Wortanfang vor Teilwort', () => {
    // „her“: Hersteller beginnt mit „her“, Vorhersage enthält es nur
    expect(rangiere('her', e).map(t => t.id)).toEqual(['anfang', 'teil']);
  });
  it('ganzes Wort vor Wortanfang', () => {
    const l: Eintrag[] = [{ id: 'a', quelle: 'seite', titel: 'Mittelwertvergleich', aktion: { art: 'hash', hash: 'a' } }, { id: 'b', quelle: 'seite', titel: 'Mittelwert', aktion: { art: 'hash', hash: 'b' } }];
    expect(rangiere('mittelwert', l).map(t => t.id)).toEqual(['b', 'a']);
  });
  it('Titel zählt mehr als Stichwort bei gleichem Treffer', () => {
    const l: Eintrag[] = [{ id: 's', quelle: 'seite', titel: 'Anderes', stichwoerter: ['Median'], aktion: { art: 'hash', hash: 'a' } }, { id: 't', quelle: 'hilfe', titel: 'Median', aktion: { art: 'hilfe', id: 'm' } }];
    expect(rangiere('median', l).map(t => t.id)).toEqual(['t', 's']);
  });
  it('mehrere Wörter in der Reihenfolge der Eingabe vor vertauschten', () => {
    const l: Eintrag[] = [{ id: 'v', quelle: 'einstellung', titel: 'Farben: Schwarz auf Gelb', aktion: { art: 'thema', wert: 'sg' } }, { id: 'r', quelle: 'einstellung', titel: 'Farben: Gelb auf Schwarz', aktion: { art: 'thema', wert: 'gs' } }];
    expect(rangiere('gelb auf schwarz', l).map(t => t.id)).toEqual(['r', 'v']);
  });
  it('alle Suchwörter müssen passen', () => {
    expect(ids('gruppen korrelation')).toEqual([]);
    expect(ids('kontrast schwarz')).toEqual(['einstellung-kontrast']);
  });
});

describe('kein Treffer, Umlaute, leere Eingabe', () => {
  it('kein Treffer: leere Liste', () => { expect(ids('qwertzuiop')).toEqual([]); });
  it('Umlaute und Groß/Klein egal', () => {
    expect(ids('GRÖSSER')).toContain('einstellung-groesser');
    expect(ids('groesser')).toContain('einstellung-groesser');
    expect(ids('GROSSER')).toContain('einstellung-groesser');
    expect(ids('haengen')[0]).toBe('auswertung-zusammenhang');
    expect(ids('Hängen')[0]).toBe('auswertung-zusammenhang');
    expect(ids('effektstaerke')[0]).toBe('abschnitt-2');
  });
  it('leere Eingabe: Vorschläge aus Abschnitt, Seiten und Einstellungen, keine Hilfe und kein Export', () => {
    const q = rangiere('  ', alle()).map(t => t.quelle);
    expect(q[0]).toBe('abschnitt');
    expect(new Set(q)).toEqual(new Set(['abschnitt', 'seite', 'einstellung']));
  });
  it('höchstens `max` Treffer', () => { expect(rangiere('e', alle(), 3).length).toBeLessThanOrEqual(3); });
});

describe('Rest-Block B7: Lesemodus der Datentabelle über die Palette', () => {
  it('„Lesemodus“, „Screenreader“ und die Alltagsfrage finden den Eintrag; Fachbegriff steht daneben', async () => {
    const m = await import('./palette-treffer');
    const e = (m as unknown as { lesemodusEintrag: (t: string, z: string) => Eintrag }).lesemodusEintrag('Datentabelle in Seiten lesen', 'Lesemodus');
    expect(e.aktion).toEqual({ art: 'lesemodus' });
    expect(anzeige(e)).toBe('Datentabelle in Seiten lesen (Lesemodus)');
    for (const q of ['lesemodus', 'datentabelle', 'screenreader', 'braille']) expect(rangiere(q, [...alle(), e])[0]?.id).toBe(e.id);
  });
});

describe('Befehlspalette: Seiten und Einstellungs-Schalter (07.11.2026)', () => {
  const quelle = (pfad: string) => readFileSync(new URL(pfad, import.meta.url), 'utf8');
  const palette = quelle('../bausteine/Befehlspalette.svelte');
  const app = quelle('../App.svelte');
  const seitenBlock = palette.slice(palette.indexOf('const seitenListe'), palette.indexOf('const einstellungsListe'));
  const mitDaten = seitenBlock.slice(seitenBlock.indexOf('if (p) {'), seitenBlock.indexOf('    l.push(\n      { hash: \'lernen\''));
  it('die Seiten, die offene Daten brauchen, stehen nur mit Projekt in der Liste', () => {
    for (const h of ['spalten', 'bearbeiten', 'umformen', 'tabelle', 'amtlich', 'karte']) {
      expect(mitDaten, h).toContain(`hash: '${h}'`);
      expect(app, h).toMatch(new RegExp(`BRAUCHT_DATEN = \\[[^\\]]*'${h}'`));
    }
  });
  it('Impressum, Datenschutz und Barrierefreiheit sind immer Ziele und Seiten der App', () => {
    for (const h of ['impressum', 'datenschutz', 'barrierefreiheit']) {
      expect(seitenBlock).toContain(`hash: '${h}'`);
      expect(mitDaten).not.toContain(`hash: '${h}'`);
      expect(app).toContain(`seite === '${h}'`);
    }
  });
  it('Kursmodus und Übungsmodus: Schalter in der Palette, Ziel-Element in den Einstellungen', () => {
    const einst = quelle('../seiten/Einstellungen.svelte');
    const e = einstellungen([
      { id: 'kursmodus', titel: 'Kursmodus', zusatz: 'Welch oder klassisch', aktion: { art: 'einstellungsfeld', feld: 'ez-kurs' } },
      { id: 'uebungsmodus', titel: 'Übungsmodus', zusatz: 'Deutung ausblenden', aktion: { art: 'einstellungsfeld', feld: 'ez-deutung' } },
    ]);
    expect(rangiere('kursmodus', e)[0]!.aktion).toEqual({ art: 'einstellungsfeld', feld: 'ez-kurs' });
    expect(rangiere('ubungsmodus', e)[0]!.aktion).toEqual({ art: 'einstellungsfeld', feld: 'ez-deutung' });
    expect(anzeige(rangiere('kursmodus', e)[0]!)).toBe('Kursmodus (Welch oder klassisch)');
    expect(palette).toContain("feld: 'ez-kurs'"); expect(palette).toContain("feld: 'ez-deutung'");
    expect(einst).toContain('id="ez-kurs"'); expect(einst).toContain('id="ez-deutung"');
  });
});

describe('U1: Werkzeug vor gleichnamigem Fachbegriff', () => {
  it('„Joint Display“ findet zuerst das Werkzeug im Kodier-Arbeitsplatz, dann den Fachbegriff', () => {
    const e = [
      ...fachbegriffe([{ id: 'joint-display', titel: 'Joint Display' }]),
      ...seiten([{ hash: 'kodieren/joint-display', titel: 'Zahlen und Zitate zusammen zeigen (Joint Display, Mixed Methods)', zusatz: 'Kodier-Arbeitsplatz, Auswerten', stichwoerter: ['Joint Display', 'Mixed Methods'] }]),
    ];
    const t = rangiere('Joint Display', e);
    expect(t.map(x => x.id)).toEqual(['seite-kodieren/joint-display', 'begriff-joint-display']);
  });
  it('ein Fachbegriff ohne gleichnamiges Werkzeug bleibt vorn', () => {
    const e = [
      ...fachbegriffe([{ id: 'median', titel: 'Median' }]),
      ...seiten([{ hash: 'daten', titel: 'Daten', stichwoerter: ['Mittelwert und Median ansehen'] }]),
    ];
    expect(rangiere('Median', e)[0]!.id).toBe('begriff-median');
  });
});
