/** Wächter Usability Stufe 9 „Eine Suche“ (Quelltext-Prüfung): Suchknopf im Kopf, gemeinsames Aussehen der Bereichssuchen, neue Ziele der Befehlspalette. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { rangiere, seiten, einstellungen, lerneinheiten, beispieleEintraege, rechner, type Eintrag } from './palette-treffer';

const lies = (p: string) => readFileSync(join(__dirname, '..', p), 'utf8').replace(/\r\n/g, '\n');

describe('Suchknopf in der Kopfzeile', () => {
  const app = lies('App.svelte');
  it('genau ein Knopf .kopf-suche mit Dialog-Hinweis und Kürzel, öffnet die Palette', () => {
    const k = app.match(/<button class="k kopf-suche"[^>]*>/g) ?? [];
    expect(k.length).toBe(1);
    expect(k[0]).toContain('aria-haspopup="dialog"');
    expect(k[0]).toContain('aria-keyshortcuts=');
    expect(app).toMatch(/kopf-suche[\s\S]{0,900}oeffnePalette\(\)/);
  });
  it('steht als erstes Element in .kopf-rechts', () => {
    const i = app.indexOf('<div class="kopf-rechts">');
    expect(app.indexOf('class="k kopf-suche"')).toBeGreaterThan(i);
    expect(app.indexOf('id="rueck"')).toBeGreaterThan(app.indexOf('class="k kopf-suche"'));
  });
  it('der einmalige Strg+K-Hinweis erscheint nicht mehr von selbst', () => {
    expect(app).not.toContain('<StrgKHinweis');
  });
});

describe('Bereichssuchen: gemeinsames Aussehen', () => {
  it('Hilfe, Lernen, Beispiele und Verfahren nutzen .suchfeld, Ids bleiben', () => {
    expect(lies('seiten/Hilfe.svelte')).toMatch(/class="suche suchfeld"[\s\S]{0,200}id="hi-suche"|class="suche suchfeld"[\s\S]{0,400}id="hi-suche"/);
    expect(lies('bausteine/LernSuche.svelte')).toMatch(/class="ls-suche suchfeld"[\s\S]{0,400}id="ls-feld"/);
    expect(lies('seiten/Beispiele.svelte')).toMatch(/class="suchfeld"[\s\S]{0,100}id="bsp-suche"/);
    const b = lies('seiten/Blatt.svelte');
    expect(b).toMatch(/class="suchfeld"[\s\S]{0,100}id="karten-suche"/);
    expect(b).toContain('class="eingabe karten-suche"');
    expect(lies('stil/app.css')).toContain('.suchfeld>input');
  });
  it('Beschriftung „In … suchen“ überall', () => {
    expect(lies('seiten/Hilfe.svelte')).toContain("L('In der Hilfe suchen'");
    expect(lies('bausteine/LernSuche.svelte')).toContain("L('In Lernen suchen'");
    expect(lies('seiten/Beispiele.svelte')).toContain("L('In den Beispielen suchen'");
    expect(lies('seiten/Blatt.svelte')).toContain("L('In den Verfahren suchen'");
    expect(lies('bausteine/DatenSuchen.svelte')).toContain("L('In den Daten suchen …'");
  });
});

describe('Befehlspalette: neue Ziele', () => {
  const q = lies('bausteine/Befehlspalette.svelte');
  it('Lerneinheiten, Beispiele, Rechner, Einstellungsgruppen und Menü „Ansicht“', () => {
    expect(q).toContain('lerneinheiten(lernListe)');
    expect(q).toContain('beispieleEintraege(beispielListe)');
    expect(q).toContain('rechner(rechnerListe)');
    expect(q).toContain('einstellungsGruppen()');
    expect(q).toContain("art: 'ansicht'");
    expect(q).toContain("'statable:ansicht'");
    const t = lies('lib/palette-treffer.ts');
    expect(t).toContain('`lernen/${x.id}`');
    expect(t).toContain('`beispiele/${x.id}`');
    expect(t).toContain('`verstehen/${x.id}`');
    expect(lies('lib/einstellungs-titel.ts')).toMatch(/ez-allg[\s\S]*ez-darst[\s\S]*ez-erg[\s\S]*ez-ein[\s\S]*ez-offline/);
  });
  it('die Einstellungsseite teilt ihre Titel mit der Palette', () => {
    expect(lies('seiten/Einstellungen.svelte')).toContain('einstellungsTitel()');
    expect(lies('seiten/Verstehen.svelte')).toContain('verstehenTitel()');
  });
});

describe('Rangfolge der neuen Einträge', () => {
  const alle = (): Eintrag[] => [
    ...seiten([{ hash: 'start', titel: 'Startseite' }, { hash: 'befehle', titel: 'Befehle' }]),
    ...einstellungen([
      { id: 'ansicht-sprache', titel: 'Sprache wählen', zusatz: 'Menü Ansicht', stichwoerter: ['Language'], aktion: { art: 'ansicht', gruppe: 'sprache' } },
      { id: 'sprache-en', titel: 'English', zusatz: 'Sprache', aktion: { art: 'sprache', wert: 'en' } },
      { id: 'sprache-de', titel: 'Deutsch', zusatz: 'Sprache', aktion: { art: 'sprache', wert: 'de' } },
    ]),
    ...lerneinheiten([{ id: 'skalenniveau', titel: 'Welche Rechnungen sind erlaubt?', zusatz: 'Skalenniveau' }]),
    ...beispieleEintraege([{ id: 'lesetraining', titel: 'Lesetraining', stichwoerter: ['t-Test'] }]),
    ...rechner([{ id: 'effekt', titel: 'Effektstärke sehen: Cohens d und Teststärke' }]),
  ];
  it('„Sprache“ zeigt zuerst „Sprache wählen“, „English“ weiter die Sprache', () => {
    expect(rangiere('Sprache', alle())[0]!.id).toBe('einstellung-ansicht-sprache');
    expect(rangiere('English', alle())[0]!.id).toBe('einstellung-sprache-en');
  });
  it('Lerneinheit, Beispiel und Rechner springen zu ihrer Adresse', () => {
    expect(rangiere('Skalenniveau', alle())[0]!.aktion).toEqual({ art: 'hash', hash: 'lernen/skalenniveau' });
    expect(rangiere('Lesetraining', alle())[0]!.aktion).toEqual({ art: 'hash', hash: 'beispiele/lesetraining' });
    expect(rangiere('Cohens', alle())[0]!.aktion).toEqual({ art: 'hash', hash: 'verstehen/effekt' });
  });
});
