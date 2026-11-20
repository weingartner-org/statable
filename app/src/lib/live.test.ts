import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { liveRechner, laufnummer, rechnetVonSelbst, brauchtR, spaltenStand, ENTPRELLEN_MS } from './live';

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

/** Eine Rechnung, die wir von außen beenden können. */
function steuerbar() {
  const offen: { schluessel: string; fertig: (v: string) => void; gilt: () => boolean }[] = [];
  const rechne = vi.fn((schluessel: string, gilt: () => boolean) => new Promise<string>(res => offen.push({ schluessel, gilt, fertig: v => res(v) })));
  return { rechne, offen };
}

describe('Entprellen', () => {
  it('viele Änderungen kurz hintereinander lösen genau eine Rechnung aus - mit dem letzten Wunsch', async () => {
    const { rechne, offen } = steuerbar();
    const gezeigt: string[] = [];
    const r = liveRechner<string>({ rechne, zeige: e => gezeigt.push(e) });
    r.uebernimm('start');
    r.wunsch('a'); vi.advanceTimersByTime(100);
    r.wunsch('b'); vi.advanceTimersByTime(100);
    r.wunsch('c'); vi.advanceTimersByTime(ENTPRELLEN_MS - 1);
    expect(rechne).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(rechne).toHaveBeenCalledTimes(1);
    expect(offen[0]!.schluessel).toBe('c');
    offen[0]!.fertig('Ergebnis c'); await vi.advanceTimersByTimeAsync(0);
    expect(gezeigt).toEqual(['Ergebnis c']);
  });
  it('gleicher Schlüssel wie das Angezeigte: keine Rechnung', () => {
    const { rechne } = steuerbar();
    const r = liveRechner<string>({ rechne, zeige: () => {} });
    r.uebernimm('x'); r.wunsch('x'); vi.advanceTimersByTime(1000);
    expect(rechne).not.toHaveBeenCalled();
  });
  it('Zurück zum angezeigten Stand vor Ablauf der Wartezeit: keine Rechnung', () => {
    const { rechne } = steuerbar();
    const r = liveRechner<string>({ rechne, zeige: () => {} });
    r.uebernimm('x'); r.wunsch('y'); vi.advanceTimersByTime(100); r.wunsch('x'); vi.advanceTimersByTime(1000);
    expect(rechne).not.toHaveBeenCalled();
  });
  it('meldet „beschäftigt“ beim Wunsch und „ruhig“ erst mit dem fertigen Ergebnis', async () => {
    const { rechne, offen } = steuerbar();
    const zustand: boolean[] = [];
    const r = liveRechner<string>({ rechne, zeige: () => {}, beschaeftigt: b => zustand.push(b) });
    r.uebernimm('x'); r.wunsch('y'); expect(zustand).toEqual([true]);
    vi.advanceTimersByTime(ENTPRELLEN_MS); expect(zustand).toEqual([true]);
    offen[0]!.fertig('ok'); await vi.advanceTimersByTimeAsync(0); expect(zustand).toEqual([true, false]);
  });
});

describe('Überholte Rechnungen (Laufnummer)', () => {
  it('eine ältere Rechnung, die nach der neueren fertig wird, wird nie angezeigt', async () => {
    const { rechne, offen } = steuerbar();
    const gezeigt: string[] = [];
    const r = liveRechner<string>({ rechne, zeige: e => gezeigt.push(e) });
    r.uebernimm('0');
    r.wunsch('1'); vi.advanceTimersByTime(ENTPRELLEN_MS);          // Lauf 1 startet
    r.wunsch('2'); vi.advanceTimersByTime(ENTPRELLEN_MS);          // Lauf 2 startet, Lauf 1 ist überholt
    expect(offen.map(o => o.schluessel)).toEqual(['1', '2']);
    expect(offen[0]!.gilt()).toBe(false);
    expect(offen[1]!.gilt()).toBe(true);
    offen[1]!.fertig('E2'); await vi.advanceTimersByTimeAsync(0);
    offen[0]!.fertig('E1'); await vi.advanceTimersByTimeAsync(0);   // zu spät
    expect(gezeigt).toEqual(['E2']);
  });
  it('eine ältere Rechnung, die VOR der neueren fertig wird, wird auch nicht angezeigt, wenn schon etwas anderes gewünscht ist', async () => {
    const { rechne, offen } = steuerbar();
    const gezeigt: string[] = [];
    const r = liveRechner<string>({ rechne, zeige: e => gezeigt.push(e) });
    r.uebernimm('0');
    r.wunsch('1'); vi.advanceTimersByTime(ENTPRELLEN_MS);
    r.wunsch('2');                                                   // Wunsch geändert, Lauf 1 noch unterwegs
    offen[0]!.fertig('E1'); await vi.advanceTimersByTimeAsync(0);
    expect(gezeigt).toEqual([]);
    await vi.advanceTimersByTimeAsync(ENTPRELLEN_MS);
    expect(offen.at(-1)!.schluessel).toBe('2');
    offen.at(-1)!.fertig('E2'); await vi.advanceTimersByTimeAsync(0);
    expect(gezeigt).toEqual(['E2']);
  });
  it('Hin und zurück (A, B, A) während A rechnet: A wird angezeigt, B nie', async () => {
    const { rechne, offen } = steuerbar();
    const gezeigt: string[] = [];
    const r = liveRechner<string>({ rechne, zeige: e => gezeigt.push(e) });
    r.uebernimm('0');
    r.wunsch('A'); vi.advanceTimersByTime(ENTPRELLEN_MS);
    r.wunsch('B'); vi.advanceTimersByTime(50);
    r.wunsch('A');
    await vi.advanceTimersByTimeAsync(ENTPRELLEN_MS * 2);
    expect(rechne).toHaveBeenCalledTimes(1);
    offen[0]!.fertig('EA'); await vi.advanceTimersByTimeAsync(0);
    expect(gezeigt).toEqual(['EA']);
  });
  it('eine verworfene Rechnung (Seite verlassen) zeigt nichts', async () => {
    const { rechne, offen } = steuerbar();
    const gezeigt: string[] = [];
    const r = liveRechner<string>({ rechne, zeige: e => gezeigt.push(e) });
    r.uebernimm('0'); r.wunsch('1'); vi.advanceTimersByTime(ENTPRELLEN_MS);
    r.verwerfe();
    offen[0]!.fertig('E1'); await vi.advanceTimersByTimeAsync(0);
    expect(gezeigt).toEqual([]);
  });
  it('ein Fehler zeigt kein Ergebnis und erlaubt denselben Wunsch erneut', async () => {
    const aufrufe: ((e: Error) => void)[] = [];
    const rechne = vi.fn(() => new Promise<string>((_, rej) => aufrufe.push(rej)));
    const fehler = vi.fn(); const zeige = vi.fn();
    const r = liveRechner<string>({ rechne, zeige, fehler });
    r.uebernimm('0'); r.wunsch('1'); vi.advanceTimersByTime(ENTPRELLEN_MS);
    aufrufe[0]!(new Error('x')); await vi.advanceTimersByTimeAsync(0);
    expect(fehler).toHaveBeenCalledTimes(1); expect(zeige).not.toHaveBeenCalled();
    r.wunsch('1'); vi.advanceTimersByTime(ENTPRELLEN_MS);
    expect(rechne).toHaveBeenCalledTimes(2);
  });
  it('laufnummer: nur die jüngste gilt', () => {
    const l = laufnummer(); const a = l.neu(); const b = l.neu();
    expect(l.aktuell(a)).toBe(false); expect(l.aktuell(b)).toBe(true);
  });
});

describe('R nur, wenn schon geladen', () => {
  it('PSPP-Verfahren und eigener Code rechnen immer von selbst', () => {
    for (const id of ['gruppen', 'kreuz', 'zusammenhang', 'vorhersage', 'messwiederholung', 'kaplanmeier', 'mediation'])
      expect(rechnetVonSelbst({ sofort: true, verfahrenId: id, rBereit: false })).toBe(true);
  });
  it('Mehrebenen und Meta-Analyse: nur mit geladenem R', () => {
    for (const id of ['mehrebenen', 'meta']) {
      expect(brauchtR(id)).toBe(true);
      expect(rechnetVonSelbst({ sofort: true, verfahrenId: id, rBereit: false })).toBe(false);
      expect(rechnetVonSelbst({ sofort: true, verfahrenId: id, rBereit: true })).toBe(true);
    }
  });
  it('mit ausgeschaltetem „Sofort rechnen“ rechnet nichts von selbst', () => {
    expect(rechnetVonSelbst({ sofort: false, verfahrenId: 'gruppen', rBereit: true })).toBe(false);
  });
});

describe('Datenstand', () => {
  const sp = [{ name: 'a', art: 'zahl', fehlend: [] as number[] }, { name: 'b', art: 'zahl', fehlend: [] as number[] }];
  const z = [[1, 2], [3, 4]];
  it('gleich bei gleichen Daten, anders bei geänderten Werten der benutzten Spalten', () => {
    expect(spaltenStand(['a'], sp, z)).toBe(spaltenStand(['a'], sp, [[1, 2], [3, 4]]));
    expect(spaltenStand(['a'], sp, z)).not.toBe(spaltenStand(['a'], sp, [[1, 2], [5, 4]]));
  });
  it('eine nicht benutzte Spalte ändert den Stand nicht', () => {
    expect(spaltenStand(['a'], sp, z)).toBe(spaltenStand(['a'], sp, [[1, 9], [3, 9]]));
  });
  it('neue Zeile und neue „keine Angabe“-Werte ändern den Stand', () => {
    expect(spaltenStand(['a'], sp, z)).not.toBe(spaltenStand(['a'], sp, [...z, [5, 6]]));
    expect(spaltenStand(['a'], sp, z)).not.toBe(spaltenStand(['a'], [{ ...sp[0]!, fehlend: [3] }, sp[1]!], z));
  });
});
