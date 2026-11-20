import { describe, expect, it } from 'vitest';
import { formatZeit, leseZeit } from './zeitmarken';

/* Fachblatt Stufe 4B, Abschnitt "Zeitmarken umwandeln" und 4A "Zeitformate".
 * ROT, bis lib/zeitmarken.ts gebaut ist. API:
 *   formatZeit(ms: number, form: 'f4'|'vtt'|'srt'|'klammer'|'hms'): string   // ms = ganze Millisekunden >= 0
 *   leseZeit(text: string): number | null                                      // ganzer Text muss eine Zeit sein (Leerraum außen wird ignoriert); sonst null
 * Formen: f4 `#hh:mm:ss-d#` (Zehntel, abgerundet), vtt `hh:mm:ss.mmm`, srt `hh:mm:ss,mmm`, klammer `[hh:mm:ss]`, hms `hh:mm:ss` (Sekunden abgerundet).
 * Stunden mindestens zweistellig, darüber so viele Stellen wie nötig (100 h -> `100`).
 * leseZeit versteht außerdem: `mm:ss.mmm` (VTT ohne Stunden), `(hh:mm:ss)`, `[hh:mm:ss]`, `hh:mm:ss`, f4. Minuten und Sekunden >= 60 sind ungültig.
 */

describe('formatZeit', () => {
  it('83 499 ms in allen Formen (f4: Zehntel abgerundet)', () => {
    expect(formatZeit(83499, 'f4')).toBe('#00:01:23-4#');
    expect(formatZeit(83499, 'vtt')).toBe('00:01:23.499');
    expect(formatZeit(83499, 'srt')).toBe('00:01:23,499');
    expect(formatZeit(83499, 'klammer')).toBe('[00:01:23]');
    expect(formatZeit(83499, 'hms')).toBe('00:01:23');
  });
  it('0 ms', () => {
    expect(formatZeit(0, 'f4')).toBe('#00:00:00-0#');
    expect(formatZeit(0, 'vtt')).toBe('00:00:00.000');
    expect(formatZeit(0, 'srt')).toBe('00:00:00,000');
    expect(formatZeit(0, 'klammer')).toBe('[00:00:00]');
    expect(formatZeit(0, 'hms')).toBe('00:00:00');
  });
  it('f4 rundet nie auf: 83 999 ms -> -9, 99 ms -> -0', () => {
    expect(formatZeit(83999, 'f4')).toBe('#00:01:23-9#');
    expect(formatZeit(99, 'f4')).toBe('#00:00:00-0#');
    expect(formatZeit(100, 'f4')).toBe('#00:00:00-1#');
  });
  it('vtt/srt: Millisekunden mit führenden Nullen', () => {
    expect(formatZeit(1005, 'vtt')).toBe('00:00:01.005');
    expect(formatZeit(1005, 'srt')).toBe('00:00:01,005');
  });
  it('genau 10 Stunden und mehr', () => {
    expect(formatZeit(36_000_000, 'hms')).toBe('10:00:00');
    expect(formatZeit(36_000_000, 'f4')).toBe('#10:00:00-0#');
    expect(formatZeit(123_456_789, 'vtt')).toBe('34:17:36.789');
    expect(formatZeit(123_456_789, 'klammer')).toBe('[34:17:36]');
  });
  it('100 Stunden: Stundenstellen wachsen mit', () => {
    expect(formatZeit(360_000_000, 'hms')).toBe('100:00:00');
  });
  it('Grenze 59:59.999 und 1:00:00', () => {
    expect(formatZeit(3_599_999, 'vtt')).toBe('00:59:59.999');
    expect(formatZeit(3_600_000, 'vtt')).toBe('01:00:00.000');
  });
});

describe('leseZeit', () => {
  it('vtt, srt, mm:ss.mmm', () => {
    expect(leseZeit('00:01:23.499')).toBe(83499);
    expect(leseZeit('00:01:23,499')).toBe(83499);
    expect(leseZeit('01:23.456')).toBe(83456);
    expect(leseZeit('00:00.000')).toBe(0);
  });
  it('f4: Zehntel werden zu Hundertern', () => {
    expect(leseZeit('#00:01:23-4#')).toBe(83400);
    expect(leseZeit('#10:00:00-0#')).toBe(36_000_000);
  });
  it('klammer, runde Klammer, nackte hms', () => {
    expect(leseZeit('[00:01:23]')).toBe(83000);
    expect(leseZeit('(00:01:23)')).toBe(83000);
    expect(leseZeit('00:01:23')).toBe(83000);
    expect(leseZeit('34:17:36')).toBe(123_456_000);
  });
  it('Leerraum außen wird ignoriert', () => {
    expect(leseZeit('  [00:00:05] ')).toBe(5000);
  });
  it('Umlauf: vtt und srt verlustfrei, andere bis auf die Genauigkeit des Formats', () => {
    for (const ms of [0, 1, 999, 1000, 83499, 3_599_999, 36_000_000, 123_456_789]) {
      expect(leseZeit(formatZeit(ms, 'vtt'))).toBe(ms);
      expect(leseZeit(formatZeit(ms, 'srt'))).toBe(ms);
      expect(leseZeit(formatZeit(ms, 'f4'))).toBe(Math.floor(ms / 100) * 100);
      expect(leseZeit(formatZeit(ms, 'hms'))).toBe(Math.floor(ms / 1000) * 1000);
      expect(leseZeit(formatZeit(ms, 'klammer'))).toBe(Math.floor(ms / 1000) * 1000);
    }
  });
  it('ungültige Eingaben ergeben null', () => {
    for (const s of ['', ' ', 'abc', '12', '1:2', '00:61:00', '00:00:61', '00:01:23.', '00:01:23.12345x', '#00:01:23#', '#00:01:23-44#', '#00:01:23-a#',
      '[00:01:23', '00:01:23]', '-00:00:01', '00:-1:00', '10:30 Uhr', 'um 00:01:23', '99:99:99', '00:60.000']) {
      expect(leseZeit(s), `Eingabe "${s}"`).toBeNull();
    }
  });
});
