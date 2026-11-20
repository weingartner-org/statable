/**
 * Zeitmarken umwandeln (Fachblatt Stufe 4, 4B). Alles intern in ganzen Millisekunden.
 * Formen: f4 `#hh:mm:ss-d#` (Zehntel, abgerundet), vtt `hh:mm:ss.mmm`, srt `hh:mm:ss,mmm`, klammer `[hh:mm:ss]`, hms `hh:mm:ss` (Sekunden abgerundet).
 * Stunden mindestens zweistellig, darüber so viele Stellen wie nötig.
 */

export type ZeitForm = 'f4' | 'vtt' | 'srt' | 'klammer' | 'hms';

const zwei = (n: number): string => String(n).padStart(2, '0');

function teile(ms: number): { h: number; m: number; s: number; ms: number } {
  const g = Math.max(0, Math.floor(Number.isFinite(ms) ? ms : 0));
  return { h: Math.floor(g / 3_600_000), m: Math.floor(g / 60_000) % 60, s: Math.floor(g / 1000) % 60, ms: g % 1000 };
}

export function formatZeit(ms: number, form: ZeitForm): string {
  const t = teile(ms);
  const hms = `${zwei(t.h)}:${zwei(t.m)}:${zwei(t.s)}`;
  const tausendstel = String(t.ms).padStart(3, '0');
  switch (form) {
    case 'f4': return `#${hms}-${Math.floor(t.ms / 100)}#`;
    case 'vtt': return `${hms}.${tausendstel}`;
    case 'srt': return `${hms},${tausendstel}`;
    case 'klammer': return `[${hms}]`;
    case 'hms': return hms;
  }
}

const HMS = /^(\d{2,}):(\d{2}):(\d{2})$/;
const HMS_MS = /^(\d{2,}):(\d{2}):(\d{2})[.,](\d{3})$/;
const MS_MS = /^(\d{2}):(\d{2})[.,](\d{3})$/;
const F4 = /^#(\d{2,}):(\d{2}):(\d{2})-(\d)#$/;

const gueltig = (m: number, s: number): boolean => m < 60 && s < 60;

/** Der ganze Text muss eine Zeit sein (Leerraum außen wird ignoriert); sonst `null`. */
export function leseZeit(text: string): number | null {
  let t = String(text ?? '').trim();
  if (!t) return null;
  let r: RegExpExecArray | null;
  if ((r = F4.exec(t))) { const [h, m, s, d] = [Number(r[1]), Number(r[2]), Number(r[3]), Number(r[4])]; return gueltig(m, s) ? ((h * 60 + m) * 60 + s) * 1000 + d * 100 : null; }
  if ((t.startsWith('[') && t.endsWith(']')) || (t.startsWith('(') && t.endsWith(')'))) t = t.slice(1, -1);
  if ((r = HMS.exec(t))) { const [h, m, s] = [Number(r[1]), Number(r[2]), Number(r[3])]; return gueltig(m, s) ? ((h * 60 + m) * 60 + s) * 1000 : null; }
  if ((r = HMS_MS.exec(t))) { const [h, m, s, x] = [Number(r[1]), Number(r[2]), Number(r[3]), Number(r[4])]; return gueltig(m, s) ? ((h * 60 + m) * 60 + s) * 1000 + x : null; }
  if ((r = MS_MS.exec(t))) { const [m, s, x] = [Number(r[1]), Number(r[2]), Number(r[3])]; return gueltig(m, s) ? (m * 60 + s) * 1000 + x : null; }
  return null;
}

/** Zeit zum Vorlesen: „1 Minute 23“ / „1 minute 23“ (Ansagen für Screenreader; die Sekunden stehen ohne Einheit hinter den Minuten). */
export function sprechZeit(ms: number, sprache: 'de' | 'en' | string = 'de'): string {
  const t = teile(ms);
  const de = sprache === 'de';
  const wort = (n: number, de1: string, deN: string, en1: string, enN: string) => `${n} ${de ? (n === 1 ? de1 : deN) : (n === 1 ? en1 : enN)}`;
  const teilen: string[] = [];
  if (t.h > 0) teilen.push(wort(t.h, 'Stunde', 'Stunden', 'hour', 'hours'));
  if (t.m > 0) teilen.push(wort(t.m, 'Minute', 'Minuten', 'minute', 'minutes'));
  if (t.h > 0 || t.m > 0) { if (t.s > 0) teilen.push(t.m > 0 ? String(t.s) : wort(t.s, 'Sekunde', 'Sekunden', 'second', 'seconds')); }
  else teilen.push(wort(t.s, 'Sekunde', 'Sekunden', 'second', 'seconds'));
  return teilen.join(' ');
}
