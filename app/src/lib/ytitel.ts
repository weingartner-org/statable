/**
 * Senkrechter Achsentitel (Regel 10.10., Johannes): nie abschneiden, sondern in Zeilen umbrechen, die zur Länge der Achse passen.
 * Er beschreibt den Verlauf nach oben - ein „Abweichung bei Beschäftigung während d…“ sagt nichts. Höchstens drei Zeilen; erst ein noch
 * längerer Titel endet mit „…“. Jede weitere Zeile rückt zum Diagramm hin; der linke Rand wächst um `zusatz`, damit nichts die Achsenzahlen trifft.
 * Die Breite ist geschätzt (keine Messung im Export und in Tests): Atkinson Hyperlegible ist breit, darum großzügig.
 */
export const Y_MAX_ZEILEN = 3;
export const yZeilenHoehe = (px: number) => Math.round(px * 1.25);

export function yZeilen(text: string, laenge: number, px = 13, fett = false, max = Y_MAX_ZEILEN): string[] {
  const zeichen = Math.max(8, Math.floor(laenge / (px * (fett ? 0.62 : 0.58))));
  const woerter = text.trim().split(/\s+/).filter(Boolean);
  const zeilen: string[] = [];
  let z = '';
  for (const w of woerter) {
    if (!z) z = w;
    else if ((z + ' ' + w).length <= zeichen) z += ' ' + w;
    else { zeilen.push(z); z = w; }
  }
  if (z) zeilen.push(z);
  // ein einzelnes Wort, das länger als die Achse ist, wird hart geteilt
  const hart = zeilen.flatMap(l => (l.length <= zeichen ? [l] : l.match(new RegExp(`.{1,${zeichen - 1}}`, 'g'))!.map((t, i, a) => (i < a.length - 1 ? t + '-' : t))));
  if (hart.length <= max) return hart;
  const rest = hart.slice(0, max);
  const letzte = rest[max - 1]!;
  rest[max - 1] = (letzte.length >= zeichen - 1 ? letzte.slice(0, zeichen - 2).replace(/[\s,;-]+\S*$/, '') : letzte) + ' …';
  return rest;
}

/** Wie viel breiter der linke Rand werden muss: eine Zeilenhöhe je zusätzlicher Zeile. */
export const yZusatz = (text: string, laenge: number, px = 13, fett = false) => (yZeilen(text, laenge, px, fett).length - 1) * yZeilenHoehe(px);

/**
 * Lange Achsenzahlen (Meldung 29.10.: 350000 lief in den senkrechten Titel): Beim üblichen linken Rand von 64 passen rund 29 px neben den Titel; was breiter ist, kommt zum Rand dazu.
 * Geschätzt wie oben, Komma und Punkt sind schmal. `marken` = die Achsenzahlen als fertiger Text.
 */
export function yMarkenZusatz(marken: string[], px = 13) {
  const breite = Math.max(0, ...marken.map(m => [...m].reduce((a, c) => a + (c === ',' || c === '.' ? 0.3 : 0.62), 0))) * px;
  return Math.max(0, Math.ceil(breite - 29));
}

/**
 * Waagrechter Achsentitel (Regel 10.10., wie der senkrechte): nie abschneiden, in Zeilen umbrechen, höchstens drei, dann „…“.
 * `breite` = Breite der Achse. Die erste Zeile bleibt, wo der einzeilige Titel stünde; weitere Zeilen rücken nach unten.
 * Das Diagramm wird um `xZusatz` höher (H und U wachsen beide), damit nichts die Achsenzahlen trifft und die Zeichenfläche gleich bleibt.
 */
export const xZeilen = (text: string, breite: number, px = 13, fett = false) => yZeilen(text, breite, px, fett);
export const xZusatz = (text: string, breite: number, px = 13, fett = false) => (xZeilen(text, breite, px, fett).length - 1) * yZeilenHoehe(px);
