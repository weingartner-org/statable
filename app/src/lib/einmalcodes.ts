/**
 * Einmal-Codes (Teilnahme-Codes) für Fragebögen, Paket 3D. Grundlage: docs/erheben/FACHBLATT-STUFE-3.md.
 * Alphabet nach Crockford (32 Zeichen, ohne I, L, O, U: nichts, was sich beim Abtippen verwechseln lässt).
 * Zufall NUR aus crypto.getRandomValues (nie Math.random); fehlt es, wird geworfen statt etwas Schwächeres zu nehmen.
 */
export const CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function gruppiere(zeichen: string): string {
  return zeichen.match(/.{1,4}/g)?.join('-') ?? '';
}

/** Erzeugt `n` verschiedene Codes mit `laenge` Zeichen (ohne Bindestriche, 4 bis 32), gesetzt in Vierergruppen („ABCD-EFGH“). */
export function erzeugeCodes(n: number, laenge = 8): string[] {
  if (!Number.isInteger(n) || n < 0) throw new RangeError('n muss eine ganze Zahl ab 0 sein');
  if (!Number.isInteger(laenge) || laenge < 4 || laenge > 32) throw new RangeError('laenge muss eine ganze Zahl von 4 bis 32 sein');
  if (n > 32 ** laenge) throw new RangeError('Es gibt nicht so viele verschiedene Codes');
  if (n === 0) return [];
  const bytes = new Uint8Array(laenge);
  const gesehen = new Set<string>();
  const liste: string[] = [];
  while (liste.length < n) {
    const kr = globalThis.crypto;
    if (!kr || typeof kr.getRandomValues !== 'function') throw new Error('crypto.getRandomValues ist nicht verfügbar');
    kr.getRandomValues(bytes);
    let roh = '';
    for (let i = 0; i < laenge; i++) roh += CODE_ALPHABET[(bytes[i] ?? 0) % 32];
    const c = gruppiere(roh);
    if (gesehen.has(c)) continue;
    gesehen.add(c);
    liste.push(c);
  }
  return liste;
}

/** Die Liste als CSV (UTF-8, Semikolon, wie Excel in Deutschland sie öffnet): Nr;Code;Ausgegeben. Codes enthalten nur Buchstaben, Ziffern und „-“, brauchen also kein Maskieren. */
export function codesCsv(codes: { code: string; ausgegeben?: boolean }[], de = true): string {
  const kopf = de ? 'Nr;Code;Ausgegeben' : 'No;Code;Issued';
  const ja = de ? 'ja' : 'yes', nein = de ? 'nein' : 'no';
  return [kopf, ...codes.map((c, i) => `${i + 1};${c.code};${c.ausgegeben ? ja : nein}`)].join('\r\n') + '\r\n';
}

/** Kanonische Form eines getippten Codes: groß, ohne Leerraum und Bindestriche, O→0, I und L→1, Vierergruppen. Sonstiges bleibt unverändert. */
export function normalisiereCode(eingabe: string): string {
  const roh = String(eingabe ?? '').toUpperCase().replace(/[\s-]+/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
  return gruppiere(roh);
}
