import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { stationen, rundgangSichtbar, randEngBeiStart, pruefAnzahl } from './rundgang';

describe('Rundgang: Stationen je Weg (Usability Stufe 3)', () => {
  it('Schritt für Schritt: sechs Stationen in fester Reihenfolge', () => {
    expect(stationen(false)).toEqual(['weise', 'fach', 'daten', 'check', 'neu', 'bericht']);
  });
  it('Ich kenne mich aus: drei Stationen (Weise, Fach, Daten-Check)', () => {
    expect(stationen(true)).toEqual(['weise', 'fach', 'check']);
  });
  it('Die Frage nach der Arbeitsweise steht immer zuerst, danach das Fach, der Daten-Check ist in beiden Wegen dabei', () => {
    for (const p of [false, true]) { const st = stationen(p); expect(st[0]).toBe('weise'); expect(st[1]).toBe('fach'); expect(st).toContain('check'); expect(new Set(st).size).toBe(st.length); }
  });
});

describe('Rundgang: wann er erscheint', () => {
  it('neue Leute: ja, solange rundgang gilt; nie, wenn er beendet ist', () => {
    expect(rundgangSichtbar({ rundgang: true, profi: false }, false)).toBe(true);
    expect(rundgangSichtbar({ rundgang: false, profi: false }, false)).toBe(false);
  });
  it('bestehende Profis bekommen keinen Rundgang', () => {
    expect(rundgangSichtbar({ rundgang: true, profi: true }, false)).toBe(false);
    expect(rundgangSichtbar({ rundgang: true, profi: true, rundgangErneut: false }, false)).toBe(false);
  });
  it('nach „Wieder zeigen“ erscheint er auch für Profis', () => {
    expect(rundgangSichtbar({ rundgang: true, profi: true, rundgangErneut: true }, false)).toBe(true);
  });
  it('wer im Rundgang „Ich kenne mich aus“ wählt, sieht ihn zu Ende (offen)', () => {
    expect(rundgangSichtbar({ rundgang: true, profi: true }, true)).toBe(true);
    expect(rundgangSichtbar({ rundgang: false, profi: true }, true)).toBe(false);   // beendet: weg
  });
});

describe('Seitenleiste und Daten-Check-Zahl', () => {
  it('startet nur bei „Ich kenne mich aus“ eingeklappt', () => { expect(randEngBeiStart(true)).toBe(true); expect(randEngBeiStart(false)).toBe(false); });
  it('zählt offene Funde und Lesehinweise, nicht die erledigten', () => {
    const funde = [{ k: 'a' }, { k: 'b' }, { k: 'c' }];
    const schl = (f: { k: string }) => f.k;
    expect(pruefAnzahl(funde, {}, 0, schl)).toBe(3);
    expect(pruefAnzahl(funde, { a: 'erledigt', b: 'gelassen' }, 0, schl)).toBe(1);
    expect(pruefAnzahl(funde, { a: 'erledigt' }, 2, schl)).toBe(4);
    expect(pruefAnzahl([], {}, 0, schl)).toBe(0);
  });
});

describe('Wächter: Rundgang.svelte ohne „Heft“ und „Blatt“', () => {
  const q = readFileSync(new URL('../bausteine/Rundgang.svelte', import.meta.url), 'utf8');
  // Nur Anzeigetexte zählen: Kommentare (// und /* */ und <!-- -->) fallen weg.
  const text = q.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/^\s*\/\/.*$/gm, '');
  it('deutsch', () => { expect(text).not.toMatch(/\bHeft\b|\bBlatt\b|\bBlätter/); });
  it('englisch', () => { expect(text).not.toMatch(/notebook|\bpage\b|\bpages\b/i); });
  it('Titel „Neue Auswertung“ und „Reiter und Bericht“ stehen drin', () => {
    expect(text).toContain("'Neue Auswertung'"); expect(text).toContain("'Reiter und Bericht'");
  });
});

describe('Einstellungen laden (alte gespeicherte Werte)', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });
  const lade = async (gespeichert: Record<string, unknown> | null) => {
    vi.resetModules();
    vi.stubGlobal('localStorage', { getItem: (k: string) => (k === 'statable-einst' && gespeichert ? JSON.stringify(gespeichert) : null), setItem: () => {}, removeItem: () => {} });
    return (await import('./sitzung.svelte')).s;
  };
  it('alte Einstellungen ohne die neuen Felder: Standardwerte', async () => {
    const s = await lade({ profi: false, rundgang: true, fach: 'psychologie' });
    expect(s.einst.rundgangErneut).toBe(false); expect(s.einst.strgKGesehen).toBe(false); expect(s.rundgangOffen).toBe(false);
  });
  it('Seitenleiste: bei profi eingeklappt, sonst ausgeklappt', async () => {
    expect((await lade({ profi: true, rundgang: true })).randEng).toBe(true);
    expect((await lade({ profi: false, rundgang: true })).randEng).toBe(false);
    expect((await lade(null)).randEng).toBe(false);
  });
  it('gespeicherte neue Felder bleiben erhalten', async () => {
    const s = await lade({ profi: true, rundgang: false, strgKGesehen: true, rundgangErneut: true });
    expect(s.einst.strgKGesehen).toBe(true); expect(s.einst.rundgangErneut).toBe(true);
  });
});
