import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/** Wächter Barrierefreiheit Welle 4 (Diagramme): Jeder Baustein, der ein Bild zeichnet (`<svg … role="img">` oder `class="diagramm"`), holt den Text aus `bildtext(` (lib/bildtext/)
 *  und zeigt ihn mit `<BildBeschreibung`. Der Name des Bildes (`aria-label`) kommt aus `….kurz`, nicht aus einem eigenen Text und nicht aus `aria-labelledby`.
 *  Neue Diagramme müssen sich also anbinden. Was kein Datendiagramm ist (Logos, Symbole, Fortschrittsringe), steht mit Grund in `AUSNAHMEN`.
 *  Stand und Liste der Bausteine: docs/barrierefreiheit/DIAGRAMME-LISTE.md. */

const SRC = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

/** Datei (relativ zu app/src, mit /) → Grund, warum sie kein Bildtext braucht. */
export const AUSNAHMEN: Record<string, string> = {
  'bausteine/BildBeschreibung.svelte': 'ist der Baustein selbst (Tabelle und Text, kein Bild)',
  'bausteine/KonfirmatorischeFa.svelte': 'zeichnet nichts selbst, bindet Pfaddiagramm.svelte ein (das hat den Bildtext)',
  'bausteine/LernRing.svelte': 'Fortschrittsring der Lerneinheiten, kein Datendiagramm; der Fortschritt steht im Namen und als Text daneben',
  'seiten/Daten.svelte': 'nur ein Symbol (Fallgewicht-Markierung) mit role="img", kein Diagramm'
};

function dateien(ordner: string, aus: string[] = []): string[] {
  for (const n of readdirSync(ordner)) {
    const p = join(ordner, n);
    if (statSync(p).isDirectory()) { if (n !== 'node_modules') dateien(p, aus); }
    else if (p.endsWith('.svelte')) aus.push(p);
  }
  return aus;
}
const rel = (p: string) => relative(SRC, p).replace(/\\/g, '/');
/** Ohne Kommentare (HTML und Block), damit ein Wort im Kommentar nichts vortäuscht. */
const ohneKommentare = (t: string) => t.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

/** Hat die Datei ein Bild? Ein `<svg>` mit role="img" oder der Klasse `diagramm`. */
export const zeichnetBild = (t: string): boolean => /<svg\b[^>]*(role="img"|class="[^"]*\bdiagramm\b[^"]*")/.test(t);

const alle = dateien(SRC).map(p => ({ pfad: rel(p), text: ohneKommentare(readFileSync(p, 'utf8')) }));
const mitBild = alle.filter(d => zeichnetBild(d.text) || /\brole="img"/.test(d.text));

describe('Diagramm-Bausteine hängen am Bildtext (Welle 4)', () => {
  it('die Suche findet die Diagramm-Bausteine (nicht leer, DIAGRAMME-LISTE hat rund 75 Dateien)', () => {
    expect(mitBild.length).toBeGreaterThan(60);
  });
  it('die Ausnahmen gibt es noch und brauchen ihre Ausnahme (sonst streichen)', () => {
    for (const a of Object.keys(AUSNAHMEN)) {
      const d = alle.find(x => x.pfad === a);
      expect(d, `Ausnahme ${a} existiert nicht mehr: aus der Liste streichen`).toBeTruthy();
      const angebunden = /bildtext\(/.test(d!.text) && /<BildBeschreibung\b/.test(d!.text);
      if (a !== 'bausteine/BildBeschreibung.svelte') expect(angebunden, `${a} ist inzwischen angebunden: Ausnahme streichen`).toBe(false);
    }
  });
  const pflicht = mitBild.filter(d => !(d.pfad in AUSNAHMEN));
  it.each(pflicht.map(d => [d.pfad, d.text] as const))('%s ruft bildtext( auf und bindet <BildBeschreibung ein', (pfad, text) => {
    expect(/\bbildtext\(/.test(text), `${pfad}: kein Aufruf von bildtext(`).toBe(true);
    expect(/<BildBeschreibung\b/.test(text), `${pfad}: <BildBeschreibung fehlt`).toBe(true);
    expect(/import\s+BildBeschreibung\b/.test(text), `${pfad}: BildBeschreibung nicht importiert`).toBe(true);
  });
  it.each(pflicht.map(d => [d.pfad, d.text] as const))('%s: jedes Bild mit role="img" nimmt seinen Namen aus .kurz, nicht aus aria-labelledby', (pfad, text) => {
    const tags = text.match(/<svg\b[^>]*>/g) ?? [];
    for (const tag of tags.filter(t => /role="img"/.test(t))) {
      expect(/aria-labelledby/.test(tag), `${pfad}: aria-labelledby statt bildtext(...).kurz: ${tag.slice(0, 80)}`).toBe(false);
      expect(/aria-label=\{[^}]*\.kurz[^}]*\}/.test(tag), `${pfad}: aria-label nicht aus .kurz: ${tag.slice(0, 80)}`).toBe(true);
    }
  });
  it('jede Datei mit n Bildern (role="img") bindet mindestens ein <BildBeschreibung ein, bei mehreren Bildern gleich viele oder in Verzweigungen weniger, aber nie keines', () => {
    for (const d of pflicht) {
      const bilder = (d.text.match(/<svg\b[^>]*role="img"/g) ?? []).length;
      const bb = (d.text.match(/<BildBeschreibung\b/g) ?? []).length;
      if (bilder > 0) expect(bb, `${d.pfad}: ${bilder} Bild(er), aber ${bb} BildBeschreibung`).toBeGreaterThan(0);
    }
  });
});
