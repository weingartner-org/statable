/**
 * Farbige Befehle: zerlegt Syntax in Stücke mit Art (Befehl, Unterbefehl, Text, Kommentar, Daten).
 * Die Trennung der Befehle folgt denselben Regeln wie befehlsteile.ts (Punkt am Zeilenende, leere Zeile, Zeile ganz links).
 * Die Stücke ergeben zusammen genau den Text - die Farbschicht liegt Zeichen für Zeichen unter dem Eingabefeld.
 */
export type Art = 'befehl' | 'unter' | 'text' | 'kommentar' | 'daten';
export interface Stueck { t: string; art?: Art }

// Befehle aus zwei Wörtern; alle übrigen sind ein Wort (T-TEST zählt mit Bindestrich als eines).
const ZWEI = /^(SELECT\s+IF|SORT\s+CASES|VALUE\s+LABELS|ADD\s+VALUE\s+LABELS|VARIABLE\s+(?:LABELS|LEVEL|WIDTH|ALIGNMENT|ROLE)|MISSING\s+VALUES|DATA\s+LIST|NEW\s+FILE|NPAR\s+TESTS|SPLIT\s+FILE|BEGIN\s+DATA|END\s+DATA|SAVE\s+TRANSLATE|GET\s+DATA|DISPLAY\s+\w+|DELETE\s+VARIABLES|RENAME\s+VARIABLES|MATCH\s+FILES|ADD\s+FILES|DO\s+IF|END\s+IF|ELSE\s+IF|DO\s+REPEAT|END\s+REPEAT|LOOP|END\s+LOOP|FILE\s+LABEL|N\s+OF\s+CASES)\b/i;
const EIN = /^[A-Za-z][A-Za-z0-9-]*/;

function rest(z: string, aus: Stueck[]) {
  // Text in Hochkommas, Unterbefehle (/NAME) und Schlüsselwörter in der Zeile.
  const re = /('(?:[^']|'')*'?|"(?:[^"]|"")*"?)|(\/\s*[A-Za-z][A-Za-z0-9-]*)|\b(BY|WITH|TO|ALL|INTO|THRU|LOWEST|HIGHEST|ELSE|AND|OR|NOT|PAIRED|SYSMIS|MISSING)\b/gi;
  let i = 0;
  for (let m = re.exec(z); m; m = re.exec(z)) {
    if (m.index > i) aus.push({ t: z.slice(i, m.index) });
    aus.push({ t: m[0], art: m[1] ? 'text' : 'unter' });
    i = m.index + m[0].length;
  }
  if (i < z.length) aus.push({ t: z.slice(i) });
}

export function faerbe(text: string): Stueck[] {
  const aus: Stueck[] = [];
  let befehl = false, kommentar = false, daten = false;
  text.split('\n').forEach((z, n) => {
    if (n > 0) aus.push({ t: '\n' });
    const t = z.trim();
    if (daten) { aus.push({ t: z, art: /^END\s+DATA\b/i.test(t) ? 'befehl' : 'daten' }); if (/^END\s+DATA\b/i.test(t)) { daten = false; befehl = false; } return; }
    if (t === '') { befehl = false; kommentar = false; aus.push({ t: z }); return; }
    if (kommentar) { aus.push({ t: z, art: 'kommentar' }); kommentar = !t.endsWith('.'); return; }
    if (befehl && /^[A-Za-z]/.test(z)) befehl = false;
    if (!befehl && /^(\*|COMMENT\b)/i.test(t)) { aus.push({ t: z, art: 'kommentar' }); kommentar = !t.endsWith('.'); return; }
    if (!befehl) {
      const vorne = z.length - z.trimStart().length, w = (ZWEI.exec(t) ?? EIN.exec(t))?.[0];
      if (vorne) aus.push({ t: z.slice(0, vorne) });
      if (w) { aus.push({ t: w, art: 'befehl' }); rest(z.slice(vorne + w.length), aus); } else rest(z.slice(vorne), aus);
      befehl = true;
      if (/^BEGIN\s+DATA\b/i.test(t)) daten = true;
    } else rest(z, aus);
    if (t.endsWith('.') && !daten) befehl = false;
  });
  return aus.filter(x => x.t !== '');
}
