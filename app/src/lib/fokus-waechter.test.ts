import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** Wächter Barrierefreiheit Welle 1: Ein Fokusring darf nie ersatzlos abgeschaltet werden.
 *  Regel: Eine CSS-Regel, deren Selektor `:focus` oder `:focus-visible` enthält und die `outline:none` / `outline:0` setzt,
 *  braucht in derselben Regel einen Ersatz (anderer `outline` oder `border`). Ausnahme: `[tabindex="-1"]`-Behälter (nur programmatisch fokussiert).
 *  Gelesen werden `stil/*.css` und alle `<style>`-Blöcke der `.svelte`-Dateien.
 *  Grundmenge: siehe letzter Test (zählt, was der Wächter überhaupt gesehen hat). */

const SRC = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

function dateien(ordner: string, endung: string, aus: string[] = []): string[] {
  for (const n of readdirSync(ordner)) {
    const p = join(ordner, n);
    if (statSync(p).isDirectory()) { if (n !== 'node_modules') dateien(p, endung, aus); }
    else if (p.endsWith(endung)) aus.push(p);
  }
  return aus;
}

export type Regel = { selektor: string; inhalt: string };

/** Zerlegt CSS in einfache Regeln (auch innerhalb von @media). Kommentare fallen weg. */
export function regeln(css: string): Regel[] {
  const ohne = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const aus: Regel[] = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(ohne))) aus.push({ selektor: m[1].trim(), inhalt: m[2].replace(/\s*:\s*/g, ':') });
  return aus;
}

const OUTLINE_AUS = /(?:^|;|\s)outline(?:-style)?\s*:\s*(?:none|0)(?:\s|;|!|$)/i;
const OUTLINE_ERSATZ = /(?:^|;|\s)outline\s*:\s*(?!none|0(?:\s|;|!|$))[^;]+/i;
const RAHMEN = /(?:^|;|\s)border(?:-color|-width|-style)?\s*:/i;
const FOKUS = /:focus(?:-visible)?(?![\w-])/;

/** Gibt die Selektoren zurück, die den Fokusring ersatzlos abschalten. */
export function verstoesse(css: string): string[] {
  return regeln(css)
    .filter((r) => FOKUS.test(r.selektor) && OUTLINE_AUS.test(r.inhalt))
    .filter((r) => !/\[tabindex=["']?-1["']?\]/.test(r.selektor))
    .filter((r) => !(OUTLINE_ERSATZ.test(r.inhalt) || RAHMEN.test(r.inhalt)))
    .map((r) => r.selektor);
}

function styleBloecke(svelte: string): string {
  return [...svelte.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n');
}

/** Ausnahmen in .svelte-<style>-Blöcken: seit Welle 7 (06.11.2026) leer bis auf den Codebaum (6c), alle Dateien nutzen echten `outline`. Neue Einträge nur mit Begründung. */
const AUSNAHMEN_SVELTE: Record<string, string> = {
  // Stufe 6c (VO5): verschachtelter Baum nach APG. Das treeitem (li) umschließt seine Untercodes; der echte outline sitzt an der Zeile
  // (`.eintrag:focus-visible > .zeile`), sonst läge der Ring um den ganzen Teilbaum.
  'bausteine/CodeBaum.svelte': 'Ring an der Zeile des treeitems (.eintrag:focus-visible > .zeile), nicht am li mit dem Teilbaum',
};

describe('Fokus-Wächter: kein Fokusring ohne Ersatz', () => {
  it('erkennt den Fehler (Selbstprüfung an Beispieltext)', () => {
    expect(verstoesse('.a:focus-visible{outline:none;box-shadow:0 0 0 2px red}')).toEqual(['.a:focus-visible']);
    expect(verstoesse('.a:focus{outline:0}')).toEqual(['.a:focus']);
    expect(verstoesse('@media (x){.a:focus-visible{outline: none}}')).toEqual(['.a:focus-visible']);
    expect(verstoesse('.a:focus-visible{outline:none;border-color:red}')).toEqual([]);
    expect(verstoesse('.a:focus-visible{outline:3px solid red}')).toEqual([]);
    expect(verstoesse('#x[tabindex="-1"]:focus{outline:none}')).toEqual([]);
    expect(verstoesse('.a{outline:none}')).toEqual([]);
    expect(verstoesse('.a:focus-within{outline:none}')).toEqual([]);
  });

  const css = dateien(join(SRC, 'stil'), '.css');
  for (const datei of css) {
    it(`${datei.slice(SRC.length)}: kein :focus ohne Ersatz`, () => {
      expect(verstoesse(readFileSync(datei, 'utf8'))).toEqual([]);
    });
  }

  const sv = dateien(SRC, '.svelte');
  const gefunden: Record<string, string[]> = {};
  for (const datei of sv) {
    const rel = datei.slice(SRC.length).replace(/\\/g, '/');
    const v = verstoesse(styleBloecke(readFileSync(datei, 'utf8')));
    if (v.length) gefunden[rel] = v;
  }

  it('.svelte-<style>-Blöcke: nur die eingetragenen Ausnahmen', () => {
    const neu = Object.keys(gefunden).filter((d) => !(d in AUSNAHMEN_SVELTE));
    expect(neu, 'neue Dateien mit outline:none ohne Ersatz: Ring ergänzen oder bewusst in AUSNAHMEN_SVELTE eintragen').toEqual([]);
  });

  it('die Ausnahmenliste ist nicht veraltet (jeder Eintrag verstößt noch)', () => {
    const veraltet = Object.keys(AUSNAHMEN_SVELTE).filter((d) => !(d in gefunden));
    expect(veraltet, 'behoben: Eintrag streichen').toEqual([]);
  });

  it('Grundmenge: Wächter hat CSS und .svelte-Dateien wirklich gesehen', () => {
    expect(css.length).toBeGreaterThanOrEqual(4);
    expect(sv.length).toBeGreaterThan(50);
    expect(readFileSync(join(SRC, 'stil/app.css'), 'utf8')).toMatch(/:focus-visible\s*\{/);
  });
});
