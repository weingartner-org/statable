// Wächter (Barrierefreiheit Welle 3, Auftrag B): Struktur aller Tabellen in den .svelte-Dateien.
//  1. Jede <th> trägt `scope` oder `id` (sonst weiß der Screenreader nicht, was sie überschreibt).
//  2. Jede <table> hat einen Namen: <caption>, aria-label(ledby) oder ausdrücklich role="presentation" (Layout).
//  3. Wo Zeilen erkennbar Köpfe haben (`th scope="row"`), steht das ausdrücklich da; die Datentabelle und die Tabellen in Lernen/Üben/Hilfe sind hier fest geprüft.
// Altlasten (Tabellen ohne Namen in Bausteinen, die nicht zu diesem Auftrag gehören) stehen mit Anzahl in `OHNE_NAME_ALT`: die Zahl darf nur sinken, nie steigen.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { scanneTabellen, hatName } from './tabellen-scan';

const WURZEL = join(__dirname, '..');
const alle = (d: string): string[] => readdirSync(d).flatMap(n => { const p = join(d, n); return statSync(p).isDirectory() ? alle(p) : p.endsWith('.svelte') ? [p] : []; });
const DATEIEN = alle(WURZEL).map(p => ({ pfad: relative(WURZEL, p).split(sep).join('/'), q: readFileSync(p, 'utf8') }));

/** Dateien mit Tabellen ohne Namen (Stand 06.11.): Anzahl der noch unbenannten Tabellen je Datei. Siehe docs/barrierefreiheit/TABELLEN-LISTE.md, Abschnitt „offen“. */
export const OHNE_NAME_ALT: Record<string, number> = {
  'bausteine/AmtlichAnzeige.svelte': 2, 'bausteine/AssistentAbgleich.svelte': 2, 'bausteine/AssistentAggregieren.svelte': 1, 'bausteine/AssistentAuffaellig.svelte': 1,
  'bausteine/AssistentAuswahl.svelte': 1, 'bausteine/AssistentBerechnen.svelte': 1, 'bausteine/AssistentDoppelte.svelte': 1, 'bausteine/AssistentEigenschaften.svelte': 1,
  'bausteine/AssistentFehlendcodes.svelte': 1, 'bausteine/AssistentIndex.svelte': 1, 'bausteine/AssistentKlassifikation.svelte': 1, 'bausteine/AssistentPlausibel.svelte': 2,
  'bausteine/AssistentSortieren.svelte': 1, 'bausteine/AssistentVergleichen.svelte': 2, 'bausteine/AssistentZeitreihe.svelte': 1, 'bausteine/AssistentZusammen.svelte': 1,
  'bausteine/EurostatDialog.svelte': 1, 'bausteine/FallgewichtRaking.svelte': 1, 'bausteine/FragebogenDialog.svelte': 1,
  'bausteine/Kuerzelliste.svelte': 1, 'bausteine/PlanenF2.svelte': 2, 'bausteine/PlanenNeu.svelte': 1, 'bausteine/ProbeTabelle.svelte': 1, 'bausteine/QdaDialog.svelte': 1,
  'bausteine/SpaltenWerkzeuge.svelte': 1, 'bausteine/VerstehenAnteilstest.svelte': 1, 'bausteine/VerstehenKennzahlen.svelte': 1, 'bausteine/VerstehenProbieren.svelte': 1,
  'bausteine/VerstehenVerteilungen.svelte': 1, 'seiten/Bericht.svelte': 1, 'seiten/Blatt.svelte': 1, 'seiten/Planen.svelte': 2, 'seiten/Protokoll.svelte': 1,
  'seiten/RProbe.svelte': 1, 'seiten/Umformen.svelte': 2,
};

/** Auftrag B: diese Dateien dürfen keine Altlast haben. */
const STRENG = ['seiten/Daten.svelte', 'bausteine/TextfassungTabelle.svelte', 'bausteine/ArtikelBloecke.svelte', 'bausteine/FrageDiagramm.svelte', 'bausteine/VerstehenUeben.svelte', 'bausteine/TabellenVorschau.svelte', 'bausteine/DatenLesemodus.svelte'];

describe('Tabellen in .svelte: Köpfe', () => {
  it('jede <th> hat scope oder id', () => {
    const schlecht: string[] = [];
    for (const d of DATEIEN) for (const t of scanneTabellen(d.q)) for (const h of t.koepfe) if (!h.scope && !h.id) schlecht.push(`${d.pfad}:${h.zeile} ${h.tag.slice(0, 50)}`);
    expect(schlecht).toEqual([]);
  });
});

describe('Tabellen in .svelte: Namen', () => {
  const unbenannt = (pfad: string, q: string) => scanneTabellen(q).filter(t => !hatName(t)).map(t => `${pfad}:${t.zeile}`);
  it('jede <table> hat caption, aria-label(ledby) oder role="presentation" (Altlasten: Liste, nur abnehmend)', () => {
    const zuViel: string[] = [];
    for (const d of DATEIEN) {
      const n = unbenannt(d.pfad, d.q);
      const erlaubt = OHNE_NAME_ALT[d.pfad] ?? 0;
      if (n.length > erlaubt) zuViel.push(`${d.pfad}: ${n.length} ohne Namen, erlaubt ${erlaubt} (${n.join(', ')})`);
    }
    expect(zuViel).toEqual([]);
  });
  it('die Liste der Altlasten ist nicht zu großzügig (Zahl höher als der Stand: bitte verkleinern)', () => {
    const zuGross: string[] = [];
    for (const [pfad, erlaubt] of Object.entries(OHNE_NAME_ALT)) {
      const d = DATEIEN.find(x => x.pfad === pfad);
      const n = d ? unbenannt(pfad, d.q).length : 0;
      if (n < erlaubt) zuGross.push(`${pfad}: ${n} statt ${erlaubt}`);
    }
    expect(zuGross).toEqual([]);
  });
  it('die Dateien aus Auftrag B haben keine Altlast', () => {
    for (const pfad of STRENG) { expect(OHNE_NAME_ALT[pfad], pfad).toBeUndefined(); }
  });
});

describe('Tabellen in .svelte: Zeilenköpfe ausdrücklich', () => {
  const tab = (pfad: string) => scanneTabellen(DATEIEN.find(d => d.pfad === pfad)!.q);
  it('Hilfe-Tabellen (ArtikelBloecke) legen Zeilenköpfe ausdrücklich fest', () => {
    const q = DATEIEN.find(d => d.pfad === 'bausteine/ArtikelBloecke.svelte')!.q;
    expect(q).toMatch(/zeilenKoepfe/);
    expect(tab('bausteine/ArtikelBloecke.svelte').some(t => t.zeilenKoepfe)).toBe(true);
  });
  it('Textfassung (Lernen, Üben) und Üben-Tabellen: erste Spalte ist Zeilenkopf', () => {
    for (const pfad of ['bausteine/TextfassungTabelle.svelte', 'bausteine/VerstehenUeben.svelte', 'bausteine/FrageDiagramm.svelte']) {
      expect(tab(pfad).every(t => t.zeilenKoepfe), pfad).toBe(true);
    }
  });
  it('Datentabelle und Lesemodus haben Zeilenköpfe und benannte Köpfe', () => {
    for (const pfad of ['seiten/Daten.svelte', 'bausteine/DatenLesemodus.svelte']) {
      const t = tab(pfad)[0]!;
      expect(t.zeilenKoepfe, pfad).toBe(true);
      expect(hatName(t), pfad).toBe(true);
    }
  });
});
