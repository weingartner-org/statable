import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { s, melde, meldeFehler, schliesseMeldung, rueckgaengigHinweis } from './sitzung.svelte';
import { KUERZEL, AKTIONEN } from './kuerzel';

/** F5 (WCAG 2.2.1): Meldungen verschwinden nach 7 s / 15 s. Darum gibt es „Letzte Meldungen“: einen Verlauf, der in der Kürzel-Liste und in der Palette steht,
 *  und jede Meldung mit „Rückgängig“ nennt den Tastenweg (Strg+Z) im Text, den auch der Screenreader hört. */
const q = (p: string) => readFileSync(fileURLToPath(new URL('../' + p, import.meta.url)), 'utf8');

describe('Meldungsverlauf', () => {
  beforeEach(() => { vi.useFakeTimers(); s.meldungen = []; s.meldungsverlauf = []; });
  afterEach(() => vi.useRealTimers());

  it('jede Meldung bleibt im Verlauf, auch nachdem sie verschwunden ist; die jüngste steht vorn', () => {
    melde('Erste'); melde('Zweite', true); meldeFehler('Dritte');
    vi.advanceTimersByTime(20_000);
    expect(s.meldungen.map(m => m.text)).toEqual(['Dritte']);   // nur der Fehler bleibt stehen
    schliesseMeldung(s.meldungen[0]!.id);
    expect(s.meldungen).toEqual([]);
    expect(s.meldungsverlauf.map(m => m.text.split(' ')[0])).toEqual(['Dritte', 'Zweite', 'Erste']);
  });
  it('der Verlauf ist begrenzt (letzte 30)', () => {
    for (let i = 0; i < 45; i++) melde('M' + i);
    expect(s.meldungsverlauf.length).toBe(30);
    expect(s.meldungsverlauf[0]!.text).toBe('M44');
  });
  it('eine Meldung mit „Rückgängig“ nennt den Tastenweg im Text', () => {
    melde('Spalte gelöscht.', true);
    const m = s.meldungsverlauf[0]!;
    expect(m.rueck).toBe(true);
    expect(rueckgaengigHinweis()).toMatch(/Strg\+Z|Cmd\+Z/);
    expect(m.hinweis).toBe(rueckgaengigHinweis());
    melde('Nur Info.');
    expect(s.meldungsverlauf[0]!.hinweis).toBeUndefined();
  });
});

describe('Meldungsverlauf: auffindbar', () => {
  it('Kürzel-Liste hat „Letzte Meldungen“ mit Empfänger', () => {
    const k = KUERZEL.find(x => x.id === 'meldungen');
    expect(k, 'Kürzel meldungen fehlt').toBeTruthy();
    expect(k!.text()).toMatch(/Meldungen|messages/i);
    expect(typeof AKTIONEN.meldungen).toBe('function');
  });
  it('Palette führt den Eintrag wirklich aus (nicht nur ansagen) und der Dialog steht in App.svelte', () => {
    expect(q('bausteine/Befehlspalette.svelte')).toMatch(/ausfuehren/);
    expect(q('App.svelte')).toMatch(/<Meldungsverlauf\s*\/>/);
    expect(q('bausteine/Meldungsverlauf.svelte')).toMatch(/empfaenger\.meldungen/);
  });
  it('die Toast-Karte in App.svelte zeigt den Hinweis auf Strg+Z', () => {
    expect(q('App.svelte')).toMatch(/m\.hinweis/);
  });
  it('Esc schließt die Meldung auch bei geschlossenen Menüs und aufgeklappter Seitenleiste (nur ein wirklich offenes Fenster hat Vorrang)', () => {
    const app = q('App.svelte');
    expect(app, 'Wächter prüft nicht, ob das Menü offen ist: [role=menu] gilt auch für geschlossene Menüs, [aria-expanded=true] auch für die Seitenleiste').not.toMatch(/\[role=menu\], \[aria-expanded=true\]/);
    expect(app).toMatch(/popupOffen\(\)/);
  });
});
