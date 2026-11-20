/** Abschlusstest A1: zu große Tabellen werden vor dem Einlesen erkannt und gemeldet, statt den Tab abstürzen zu lassen. */
import { describe, expect, it } from 'vitest';
import { schaetzeText, schaetzeSav, urteil, groesse, ZELLEN, ZEILEN_MAX, maxZeilen, zuGrossText, langsamText, groesseAusBytes, maxBytesTabelle } from './groessengrenze';
import { pruefeGroesseVorher, pruefeGroesseNachher, DateiFehler } from './einlesen';

const csv = (zeilen: number, spalten: number) => { const kopf = Array.from({ length: spalten }, (_, i) => `spalte${i}`).join(';'); const z = Array.from({ length: spalten }, (_, i) => (i * 7.31).toFixed(2)).join(';'); return { kopf, z, text: kopf + '\n' + Array.from({ length: 300 }, () => z).join('\n') + '\n', gesamt: kopf.length + 1 + zeilen * (z.length + 1) }; };

describe('Größe schätzen und bewerten', () => {
  it('CSV: Zeilen und Spalten aus dem Anfang der Datei', () => {
    const c = csv(1_000_000, 47), g = schaetzeText(c.text.slice(0, 65536), c.gesamt)!;
    expect(g.spalten).toBe(47); expect(g.zeilen / 1_000_000).toBeGreaterThan(0.97); expect(g.zeilen / 1_000_000).toBeLessThan(1.03); expect(g.geschaetzt).toBe(true);
  });
  it('zu kurzer Anfang: keine Schätzung', () => { expect(schaetzeText('a;b\n1;2\n', 100000)).toBeNull(); });
  it('die Grenzen: bis 10 Mio. Zellen ok, bis 50 Mio. langsam, darüber zu groß', () => {
    expect(urteil(groesse(200_000, 47))).toBe('ok'); expect(urteil(groesse(300_000, 47))).toBe('langsam');
    expect(urteil(groesse(1_000_000, 47))).toBe('langsam'); expect(urteil(groesse(1_100_000, 47))).toBe('zugross');
    expect(urteil(groesse(400_000, 47))).toBe('langsam');   // stürzte vorher ab, jetzt geht es (635 MB)
    expect(ZELLEN.stopp).toBe(50_000_000);
  });
  it('wenige Spalten: trotzdem höchstens 1 Mio. Zeilen (Höhe der Tabelle)', () => {
    expect(urteil(groesse(ZEILEN_MAX, 5))).toBe('ok'); expect(urteil(groesse(ZEILEN_MAX + 1, 5))).toBe('zugross');
    expect(maxZeilen(5)).toBe(ZEILEN_MAX); expect(maxZeilen(47)).toBe(ZEILEN_MAX); expect(maxZeilen(100)).toBe(500_000);
  });
  it('eine Schätzung hat 15 % Spielraum: eine Datei mit genau 1 Mio. Zeilen wird nicht fälschlich abgelehnt', () => {
    expect(urteil({ ...groesse(1_030_000, 47), geschaetzt: true })).toBe('langsam'); expect(urteil({ ...groesse(1_200_000, 47), geschaetzt: true })).toBe('zugross');
    expect(urteil(groesse(1_030_000, 47))).toBe('zugross');
  });
  it('SPSS-Kopfsatz: Fälle und Länge eines Falls', () => {
    const b = new Uint8Array(176); b.set([0x24, 0x46, 0x4c, 0x32]); const v = new DataView(b.buffer);
    v.setInt32(64, 2, true); v.setInt32(68, 47, true); v.setInt32(80, 1_200_000, true);
    expect(schaetzeSav(b)).toMatchObject({ zeilen: 1_200_000, spalten: 47 });
    expect(schaetzeSav(new Uint8Array(176))).toBeNull();
  });
  it('Meldung: wie groß, was Statable schafft, was man tun kann', () => {
    const m = zuGrossText('gross.csv', { zeilen: 1_500_000, spalten: 47, zellen: 70_500_000, geschaetzt: true });
    expect(m.titel).toContain('zu groß'); expect(m.text).toMatch(/etwa 1[\s.,  ]?500[\s.,  ]?000 Zeilen und 47 Spalten/); expect(m.text).toMatch(/bis zu 1[\s.,\u00a0\u202f]?000[\s.,\u00a0\u202f]?000 Zeilen/);
    expect(m.tun).toMatch(/Spalten[\s\S]*Zufallsauswahl/);
    expect(langsamText(groesse(300_000, 47))).toMatch(/300[\s.,  ]?000 Zeilen · 47 Spalten/);
  });
});

describe('vor dem Einlesen', () => {
  const datei = (text: string, size: number, name = 'a.csv') => ({ name, size, slice: () => ({ arrayBuffer: async () => new TextEncoder().encode(text).buffer }) }) as unknown as File;
  it('eine 2-Mio.-Zeilen-CSV wird abgelehnt, ohne sie ganz zu lesen', async () => {
    const c = csv(2_000_000, 47);
    await expect(pruefeGroesseVorher(datei(c.text, c.gesamt), 'csv')).rejects.toMatchObject({ grund: 'gross' });
  });
  it('eine 300.000-Zeilen-CSV geht durch (nur Hinweis nach dem Öffnen)', async () => {
    const c = csv(300_000, 47);
    await expect(pruefeGroesseVorher(datei(c.text, c.gesamt), 'csv')).resolves.toBeUndefined();
  });
  it('eine riesige Excel-Datei wird nach der Dateigröße abgelehnt, eine mittlere nicht', async () => {
    await expect(pruefeGroesseVorher(datei('', maxBytesTabelle * 1.2, 'a.xlsx'), 'xlsx')).rejects.toBeInstanceOf(DateiFehler);
    await expect(pruefeGroesseVorher(datei('', 20e6, 'a.xlsx'), 'xlsx')).resolves.toBeUndefined();
    expect(groesseAusBytes(36e6).zellen).toBe(10_000_000);
  });
  it('nach dem Einlesen: genaue Zählung', () => {
    expect(() => pruefeGroesseNachher(1_200_000, 47, 'x.xlsx')).toThrowError(DateiFehler);
    expect(() => pruefeGroesseNachher(999_999, 47, 'x.xlsx')).not.toThrow();
  });
});
