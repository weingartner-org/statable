import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { entprellt, glatt, ERGEBNIS_RUHE_MS, eingabeJuengst, setzeEingabeZeit, EINGABE_FENSTER_MS } from './ansage-ergebnis.svelte';

/** F6: Ergebnis-Ansagen mit Ruhe. Die Uhr ist von Hand gestellt, kein echtes Warten. */
function uhr() {
  let jetzt = 0; const f: { ab: number; f: () => void; weg: boolean }[] = [];
  return {
    nach: (g: () => void, ms: number) => { const e = { ab: jetzt + ms, f: g, weg: false }; f.push(e); return () => { e.weg = true; }; },
    weiter: (ms: number) => { jetzt += ms; for (const e of f) if (!e.weg && e.ab <= jetzt) { e.weg = true; e.f(); } },
  };
}

describe('entprellt: genau eine Ansage nach dem letzten Wert', () => {
  it('Wertefolge 100, 110, 120, 130 im Abstand von 200 ms: nur „130“ kommt, nach der Ruhe', () => {
    const u = uhr(); const gesagt: string[] = [];
    const e = entprellt(t => gesagt.push(t), ERGEBNIS_RUHE_MS, u.nach);
    for (const w of ['N = 100', 'N = 110', 'N = 120', 'N = 130']) { e.push(w); u.weiter(200); }
    expect(gesagt).toEqual([]);
    u.weiter(ERGEBNIS_RUHE_MS);
    expect(gesagt).toEqual(['N = 130']);
    u.weiter(10_000);
    expect(gesagt).toEqual(['N = 130']);
  });
  it('nach einer Pause zählt der nächste Wert wieder als eigene Ansage', () => {
    const u = uhr(); const gesagt: string[] = [];
    const e = entprellt(t => gesagt.push(t), ERGEBNIS_RUHE_MS, u.nach);
    e.push('a'); u.weiter(ERGEBNIS_RUHE_MS); e.push('b'); u.weiter(ERGEBNIS_RUHE_MS);
    expect(gesagt).toEqual(['a', 'b']);
  });
  it('stop nimmt eine wartende Ansage zurück (Element verschwindet)', () => {
    const u = uhr(); const gesagt: string[] = [];
    const e = entprellt(t => gesagt.push(t), ERGEBNIS_RUHE_MS, u.nach);
    e.push('x'); e.stop(); u.weiter(5000);
    expect(gesagt).toEqual([]);
  });
});

describe('glatt und Eingabefenster', () => {
  it('glatt faltet Leerraum und trimmt', () => { expect(glatt('  N = 5 \n  Personen ')).toBe('N = 5 Personen'); expect(glatt(null)).toBe(''); });
  it('eingabeJuengst gilt nur im Fenster nach einer Eingabe', () => {
    setzeEingabeZeit(1000);
    expect(eingabeJuengst(1000 + EINGABE_FENSTER_MS - 1)).toBe(true);
    expect(eingabeJuengst(1000 + EINGABE_FENSTER_MS)).toBe(false);
  });
});

describe('Quelltext (F6): umgestellte Stellen', () => {
  const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
  it('Ergebnis-Zahlen in Planen und Verstehen haben kein aria-live mehr, sondern die entprellte Aktion', () => {
    for (const p of ['bausteine/PlanenF2.svelte', 'bausteine/PlanenNeu.svelte', 'bausteine/VerstehenAnteilstest.svelte', 'bausteine/VerstehenKennzahlen.svelte', 'bausteine/VerstehenVerteilungen.svelte']) {
      const t = src(p);
      expect(t, p).not.toMatch(/class="(vst-)?gross"[^>]*aria-live/);
      expect(t, p).toMatch(/use:ergebnisAnsage/);
    }
  });
  it('Blatt: „Ergebnis aktualisiert“ nur über sage() und nicht, wenn die Rechnung schon „fertig“ gesagt hat; keine eigene Region mehr', () => {
    const t = src('seiten/Blatt.svelte');
    expect(t).toMatch(/if \(!endeJuengstAngesagt\(\)\) sage\(L\('Ergebnis aktualisiert\./);
    expect(t).not.toMatch(/\{ansage\}/);
  });
  it('Lernlabor-Ergebnisse: kein aria-live um den ganzen Bereich (sonst liest NVDA Bild und Tabelle bei jeder Änderung neu)', () => {
    for (const n of ['Baumrechner', 'Bootstrap', 'Randomisierung', 'Stichprobe', 'Ueberdeckung', 'Vierfelder', 'Zufall']) expect(src(`bausteine/Lernlabor${n}.svelte`), n).not.toMatch(/aria-live/);
  });
  it('Stellen, an denen der Fokus die Meldung trägt, haben kein role=status mehr (Doppel mit Fokus)', () => {
    for (const p of ['bausteine/Skalen.svelte', 'bausteine/Mehrfachsets.svelte', 'bausteine/Normwerte.svelte']) expect(src(p), p).toMatch(/<p tabindex="-1" bind:this=|<p[^>]*tabindex="-1"[^>]*bind:this=/);
  });
});
