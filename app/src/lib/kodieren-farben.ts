/**
 * Farben für Codes (Stufe 6b2, Fachblatt 3.4): zehn benannte Farben. Jede hat auf weißem Grund mindestens 3:1 (WCAG 1.4.11, Zeichen ohne Text);
 * die Farbe ist nie die einzige Information (der Name steht daneben, im Kontrastmodus trägt der Punkt einen Rand in Textfarbe).
 */
export interface Farbe { wert: string; de: string; en: string }

export const FARBEN: readonly Farbe[] = [
  { wert: '#1f5fa8', de: 'Blau', en: 'Blue' },
  { wert: '#2e7d32', de: 'Grün', en: 'Green' },
  { wert: '#c62828', de: 'Rot', en: 'Red' },
  { wert: '#b45309', de: 'Orange', en: 'Orange' },
  { wert: '#6a3fa0', de: 'Violett', en: 'Purple' },
  { wert: '#00796b', de: 'Petrol', en: 'Teal' },
  { wert: '#ad1457', de: 'Rosa', en: 'Pink' },
  { wert: '#6d4c41', de: 'Braun', en: 'Brown' },
  { wert: '#5f6b73', de: 'Grau', en: 'Grey' },
  { wert: '#7a6a00', de: 'Ocker', en: 'Ochre' },
];

const lin = (c: number): number => { const x = c / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
/** Farbe `#rrggbb` im Lab-Raum (D65) */
function lab(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const r = lin((n >> 16) & 255), g = lin((n >> 8) & 255), b = lin(n & 255);
  const f = (t: number): number => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const x = f((0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047), y = f(0.2126 * r + 0.7152 * g + 0.0722 * b), z = f((0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

/** Die Farbe der Liste, die einer beliebigen Farbe `#rrggbb` am nächsten liegt (Abstand im Lab-Raum). */
export function naechsteFarbe(wert: string): Farbe {
  if (!/^#[0-9a-f]{6}$/i.test(wert)) return FARBEN[8]!;
  const l = lab(wert);
  let best = FARBEN[0]!, d0 = Infinity;
  for (const f of FARBEN) { const m = lab(f.wert); const d = (l[0] - m[0]) ** 2 + (l[1] - m[1]) ** 2 + (l[2] - m[2]) ** 2; if (d < d0) { d0 = d; best = f; } }
  return best;
}

/** Name der Farbe in der Sprache; eine Farbe außerhalb der Liste (zum Beispiel aus einer Datei) heißt „ähnlich ‹nächste Farbe›“ (kein Hex-Wert im zugänglichen Text). */
export function farbName(wert: string | undefined, sprache: 'de' | 'en'): string {
  if (!wert) return sprache === 'de' ? 'keine' : 'none';
  const f = FARBEN.find(x => x.wert.toLowerCase() === wert.toLowerCase());
  if (f) return sprache === 'de' ? f.de : f.en;
  const n = naechsteFarbe(wert);
  return sprache === 'de' ? `ähnlich ${n.de}` : `similar to ${n.en}`;
}

const kanal = (c: number): number => { const x = c / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
const leuchte = (hex: string): number => {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * kanal((n >> 16) & 255) + 0.7152 * kanal((n >> 8) & 255) + 0.0722 * kanal(n & 255);
};

/** Kontrastverhältnis zweier Farben `#rrggbb` (WCAG 2). */
export function kontrast(a: string, b: string): number {
  const x = leuchte(a), y = leuchte(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
