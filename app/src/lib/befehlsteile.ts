/**
 * Befehle (Syntax) in einzelne Befehle teilen - zum Anhaken auf der Seite „Befehle“ - und Fehlerstellen der Engine zurück in den Text führen.
 * Ein Befehl endet mit einem Punkt am Zeilenende, einer leeren Zeile oder einer Zeile, die ganz links mit einem Wort beginnt. Kommentare (* …, COMMENT) gehören zum folgenden Befehl,
 * ein Datenblock (BEGIN DATA … END DATA) zum Befehl davor (meist DATA LIST) - beides läuft nur zusammen.
 */
export interface Teil { von: number; bis: number; text: string; kopf: string }

export function teileBefehle(text: string): Teil[] {
  const zeilen = text.replace(/\r/g, '').split('\n');
  const teile: Teil[] = [];
  let start = -1, letzte = -1, kopf = '', befehl = false, kommentar = false, daten = false;
  const schliesse = (bis: number) => {
    if (befehl) {
      const v = teile.at(-1);
      if (/^BEGIN\s+DATA\b/i.test(kopf) && v) { v.bis = bis; v.text = zeilen.slice(v.von, bis + 1).join('\n'); }
      else teile.push({ von: start, bis, text: zeilen.slice(start, bis + 1).join('\n'), kopf });
      start = -1; kopf = ''; befehl = false;
    }
  };
  zeilen.forEach((z, i) => {
    const t = z.trim();
    if (daten) { letzte = i; if (/^END\s+DATA\b/i.test(t)) { daten = false; schliesse(i); } return; }
    if (t === '') { if (befehl) schliesse(letzte); return; }
    // Wie PSPP: eine Zeile, die ganz links mit einem Buchstaben beginnt, startet einen neuen Befehl - auch ohne Punkt davor.
    if (befehl && /^[A-Za-z]/.test(z)) schliesse(letzte);
    if (start < 0) start = i;
    letzte = i;
    if (kommentar) { kommentar = !t.endsWith('.'); return; }
    if (!befehl && /^(\*|COMMENT\b)/i.test(t)) { kommentar = !t.endsWith('.'); return; }
    if (!befehl) { befehl = true; kopf = t; }
    if (/^BEGIN\s+DATA\b/i.test(t)) { daten = true; return; }
    if (t.endsWith('.')) schliesse(i);
  });
  if (befehl) schliesse(letzte);
  return teile;
}

/** Ausgewählte Teile als ein Lauf; zeilen[k] = Zeile im ganzen Text, aus der Zeile k des Laufs stammt. */
export function lauf(text: string, teile: Teil[]): { syntax: string; zeilen: number[] } {
  const alle = text.replace(/\r/g, '').split('\n');
  const zeilen = teile.flatMap(t => Array.from({ length: t.bis - t.von + 1 }, (_, k) => t.von + k));
  return { syntax: zeilen.map(z => alle[z]).join('\n'), zeilen };
}

/** Stelle aus einer Meldung der Engine („2.40-2.44: error: …“, Zeile.Spalte, ab 1). */
export function stelleAus(meldung: string): { z1: number; s1: number; z2: number; s2: number } | null {
  const m = /^(\d+)\.(\d+)(?:-(\d+)\.(\d+))?:/.exec(meldung) ?? /^(\d+)():/.exec(meldung);
  if (!m) return null;
  const z1 = Number(m[1]), s1 = Number(m[2] || 0);
  return { z1, s1, z2: m[3] ? Number(m[3]) : z1, s2: m[4] ? Number(m[4]) : s1 };
}

/** Zeichenbereich im ganzen Text für eine Stelle des Laufs. Ohne Spalte: die ganze Zeile. */
export function bereich(text: string, zeilen: number[], st: { z1: number; s1: number; z2: number; s2: number }): { von: number; bis: number; zeile: number } | null {
  const alle = text.split('\n');
  const a = zeilen[st.z1 - 1], b = zeilen[st.z2 - 1] ?? a;
  if (a === undefined || b === undefined || a >= alle.length) return null;
  const anfang = (z: number) => alle.slice(0, z).reduce((n, x) => n + x.length + 1, 0);
  const von = anfang(a) + (st.s1 ? Math.min(st.s1 - 1, alle[a]!.length) : 0);
  const bis = st.s2 ? anfang(b) + Math.min(st.s2, alle[b]?.length ?? 0) : anfang(b) + (alle[b]?.length ?? 0);
  return { von, bis: Math.max(bis, von + 1), zeile: a + 1 };
}
