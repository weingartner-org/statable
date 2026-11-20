import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** F3 (WCAG 1.3.1, 3.3.2, 4.1.2), Quellwächter: Jedes `input`, `select`, `textarea` hat einen Namen (`label for`, umschließendes `label`, `aria-label`, `aria-labelledby`),
 *  und jede Gruppe von Auswahlkreisen steht in `fieldset`/`legend` oder `role="radiogroup"` mit Namen. Laufzeit: `app/e2e/probe/d11-routen.mjs` (axe über 15 Routen) und `abschluss.spec.ts` (axe label, select-name auf 40 Routen).
 *  Der Quellwächter erkennt nur statisch bekannte Namen; dynamische Namen (`{...spread}`, berechnete `id`) müssen mit `aria-label` stehen. */
const SRC = fileURLToPath(new URL('..', import.meta.url));

function dateien(ordner: string, aus: string[] = []): string[] {
  for (const n of readdirSync(ordner)) {
    const p = join(ordner, n);
    if (statSync(p).isDirectory()) { if (n !== 'node_modules' && n !== 'sprachen') dateien(p, aus); }
    else if (n.endsWith('.svelte')) aus.push(p);
  }
  return aus;
}
const ohneScript = (t: string) => t.replace(/<script[\s\S]*?<\/script>/g, m => ' '.repeat(m.length)).replace(/<style[\s\S]*?<\/style>/g, m => ' '.repeat(m.length));

interface Tag { tag: string; text: string; pos: number }
/** Alle Start-Tags dieser Namen; `{ ... }` mit Zeichenketten darin zählt als ein Stück. */
function tags(t: string, namen = 'input|select|textarea'): Tag[] {
  const aus: Tag[] = [];
  const re = new RegExp(`<(${namen})\\b`, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(t))) {
    let i = m.index + m[0].length, tief = 0, q: string | null = null;
    for (; i < t.length; i++) {
      const c = t[i]!;
      if (q) { if (c === q) q = null; continue; }
      if (tief > 0) {
        if (c === '"' || c === "'" || c === '`') q = c; else if (c === '{') tief++; else if (c === '}') tief--;
        continue;
      }
      if (c === '{') tief++; else if (c === '"' || c === "'") q = c; else if (c === '>') break;
    }
    aus.push({ tag: m[1]!, text: t.slice(m.index, i + 1), pos: m.index });
  }
  return aus;
}

/** Felder ohne erkennbaren Namen (leere Liste = alles in Ordnung). */
export function felderOhneName(roh: string): string[] {
  const t = ohneScript(roh);
  const probleme: string[] = [];
  for (const x of tags(t)) {
    const a = x.text;
    if (/\btype=["']?(hidden|submit|button|reset|image)\b/.test(a)) continue;
    if (/\baria-hidden=["']?true/.test(a)) continue;
    if (/\shidden(?=[\s>/])/.test(a)) continue;   // Attribut `hidden`: nicht im Zugänglichkeitsbaum (versteckte Dateiwahl, ein Knopf öffnet sie)
    if (/\baria-label(ledby)?=/.test(a)) continue;
    if (/\{\.\.\./.test(a)) { probleme.push(`Spread ohne aria-label: ${a.replace(/\s+/g, ' ').slice(0, 90)}`); continue; }
    const vor = t.slice(Math.max(0, x.pos - 600), x.pos);
    if (vor.lastIndexOf('<label') > vor.lastIndexOf('</label>')) continue;   // steht im label
    const id = /\bid=(?:"([^"]+)"|\{([^}]+)\})/.exec(a);
    if (id) {
      const festes = id[1], ausdruck = id[2]?.trim();
      if (festes && (t.includes(`for="${festes}"`) || t.includes(`for={'${festes}'}`) || t.includes(`for={\`${festes}\`}`))) continue;
      if (ausdruck && [...t.matchAll(/\bfor=\{([^}]+)\}/g)].some(z => z[1]!.trim() === ausdruck)) continue;
      // `id` mit eingebauter Auswahl (id="x-{i}") und `for="x-{i}"`
      if (festes && [...t.matchAll(/\bfor="([^"]+)"/g)].some(z => z[1] === festes)) continue;
    }
    probleme.push(`${x.tag} ohne Namen: ${a.replace(/\s+/g, ' ').slice(0, 110)}`);
  }
  return probleme;
}

/** Auswahlkreise (`type="radio"`) ohne Gruppe: nicht in `fieldset`, nicht in einem Element mit `role="radiogroup"`/`role="group"` (mit Namen), nicht in `role="radiogroup"` über `{#each}`. */
export function radiosOhneGruppe(roh: string): string[] {
  const t = ohneScript(roh);
  const probleme: string[] = [];
  for (const x of tags(t, 'input')) {
    if (!/\btype=["']?radio\b/.test(x.text)) continue;
    const vor = t.slice(0, x.pos);
    const fs = vor.lastIndexOf('<fieldset'), fsEnde = vor.lastIndexOf('</fieldset>');
    if (fs > fsEnde) continue;
    const regex = /<[a-z][^>]*role=["'](radiogroup|group)["'][^>]*>/gi;
    let rg = -1, ende = -1, m: RegExpExecArray | null;
    while ((m = regex.exec(vor))) { rg = m.index; ende = m.index + m[0].length; }
    // Ein Gruppenelement zählt, wenn es nach dem letzten Abschluss seiner Art steht (grobe Näherung: kein </div> mit gleicher Tiefe prüfbar) und einen Namen trägt
    if (rg >= 0 && /aria-label(ledby)?=/.test(vor.slice(rg, ende)) && x.pos - rg < 8000) continue;
    probleme.push(`radio ohne fieldset/radiogroup: ${x.text.replace(/\s+/g, ' ').slice(0, 100)}`);
  }
  return probleme;
}

/** `required`-Felder haben `aria-required`, Felder mit `aria-invalid` haben `aria-describedby` (oder `aria-errormessage`). */
export function pflichtUndFehler(roh: string): string[] {
  const t = ohneScript(roh);
  const probleme: string[] = [];
  for (const x of tags(t)) {
    const a = x.text;
    if (/\brequired\b(?!-)/.test(a) && !/\baria-required=/.test(a)) probleme.push(`required ohne aria-required: ${a.replace(/\s+/g, ' ').slice(0, 100)}`);
    if (/\baria-invalid=/.test(a) && !/\baria-(describedby|errormessage)=/.test(a)) probleme.push(`aria-invalid ohne aria-describedby: ${a.replace(/\s+/g, ' ').slice(0, 100)}`);
  }
  return probleme;
}

describe('Formulare: Gegenproben (der Wächter erkennt den Fehler)', () => {
  it('Feld ohne Namen', () => {
    expect(felderOhneName('<input type="text" bind:value={x} />')).toHaveLength(1);
    expect(felderOhneName('<select bind:value={x}><option>a</option></select>')).toHaveLength(1);
    expect(felderOhneName('<textarea></textarea>')).toHaveLength(1);
  });
  it('Feld mit Namen ist in Ordnung', () => {
    expect(felderOhneName('<label for="a">A</label><input id="a" />')).toEqual([]);
    expect(felderOhneName('<label>A <input type="text" /></label>')).toEqual([]);
    expect(felderOhneName("<input aria-label={name} />")).toEqual([]);
    expect(felderOhneName('<input aria-labelledby="x" />')).toEqual([]);
    expect(felderOhneName('<label for={nid}>A</label><input id={nid} />')).toEqual([]);
    expect(felderOhneName('<input type="hidden" />')).toEqual([]);
    expect(felderOhneName('<input type="file" hidden onchange={x}>')).toEqual([]);
    expect(felderOhneName('<input type="file" class="nur-vorleser" tabindex="-1">')).toHaveLength(1);
  });
  it('Label an anderer id zählt nicht', () => {
    expect(felderOhneName('<label for="b">B</label><input id="a" />')).toHaveLength(1);
  });
  it('Radiogruppe ohne fieldset/legend', () => {
    expect(radiosOhneGruppe('<div><input type="radio" name="x" /></div>')).toHaveLength(1);
    expect(radiosOhneGruppe('<fieldset><legend>L</legend><input type="radio" name="x" /></fieldset>')).toEqual([]);
    expect(radiosOhneGruppe('<div role="radiogroup" aria-label="L"><input type="radio" /></div>')).toEqual([]);
    expect(radiosOhneGruppe('<div role="radiogroup"><input type="radio" /></div>')).toHaveLength(1);
  });
  it('Pflicht und Fehler', () => {
    expect(pflichtUndFehler('<input required />')).toHaveLength(1);
    expect(pflichtUndFehler('<input required aria-required="true" />')).toEqual([]);
    expect(pflichtUndFehler('<input aria-invalid="true" />')).toHaveLength(1);
    expect(pflichtUndFehler('<input aria-invalid={f} aria-describedby="e" />')).toEqual([]);
  });
});

/** Ausnahmen mit Grund und Beleg (Datei, Text), der dort wirklich stehen muss. */
const AUSNAHMEN: { datei: string; art: 'name' | 'gruppe'; grund: string; beleg: [string, string] }[] = [
  { datei: 'bausteine/Befehlsfeld.svelte', art: 'name', grund: 'Die `id` kommt als Eigenschaft; das Label steht beim Aufrufer.', beleg: ['seiten/Befehle.svelte', '<label for="syntax">'] },
  { datei: 'bausteine/KonfirmatorischeFa.svelte', art: 'gruppe', grund: 'Auswahlkreise einer Tabellenzeile: jeder trägt „Frage: Faktor“ als Namen, die Zeile hat einen Zeilenkopf (`th scope=row`). Ein `role` an `tr` würde die Tabelle zerstören.', beleg: ['bausteine/KonfirmatorischeFa.svelte', '<tr><th scope="row"'] },
];
const ausgenommen = (datei: string, art: 'name' | 'gruppe') => AUSNAHMEN.some(a => a.datei === datei && a.art === art);

describe('Formulare in der App (Quelle)', () => {
  const q = dateien(SRC).map(p => [p.slice(SRC.length).replace(/\\/g, '/'), readFileSync(p, 'utf8')] as const);
  it('jede Ausnahme hat ihren Beleg', () => {
    for (const a of AUSNAHMEN) expect(q.find(([d]) => d === a.beleg[0])?.[1].includes(a.beleg[1]), `${a.datei}: ${a.grund}`).toBe(true);
  });
  it('jedes Feld hat einen Namen', () => {
    const alle = q.filter(([d]) => !ausgenommen(d, 'name')).flatMap(([d, t]) => felderOhneName(t).map(p => `${d}: ${p}`));
    expect(alle).toEqual([]);
  });
  it('jede Gruppe von Auswahlkreisen hat fieldset/legend oder radiogroup mit Namen', () => {
    const alle = q.filter(([d]) => !ausgenommen(d, 'gruppe')).flatMap(([d, t]) => radiosOhneGruppe(t).map(p => `${d}: ${p}`));
    expect(alle).toEqual([]);
  });
  it('Pflichtfelder haben aria-required, Fehlerfelder aria-describedby', () => {
    const alle = q.flatMap(([d, t]) => pflichtUndFehler(t).map(p => `${d}: ${p}`));
    expect(alle).toEqual([]);
  });
});
