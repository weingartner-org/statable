/**
 * Vorwärmen von R (31.10.2026, Vorgabe Johannes): R wird geladen, sobald klar ist, dass es gebraucht wird - ohne Browser, mit gespieltem `fetch`.
 * Geprüft: echte Bytes zählen über alle Stufen, Abbrechen stoppt, eine Rechnung macht das Vorladen unabhängig vom Abbruch, keine Datei doppelt.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RMotor, type RFortschritt } from './webr';

const MANIFEST = {
  version: 'test',
  basis: [{ p: 'a.bin', b: 4000 }, { p: 'b.bin', b: 6000 }],
  pakete: { meta: [{ p: 'repo/meta.tgz', b: 10000 }], leer: [] }
};

/** Ein gespielter Server: jede Datei kommt in Stücken zu 1000 Bytes, nach jedem Stück wartet er `pause` ms; zählt die Abrufe je Datei. */
function server(pause = 5) {
  const abrufe: Record<string, number> = {};
  const gelesen: Record<string, number> = {};
  const fetchMock = vi.fn(async (url: string) => {
    const pfad = String(url).replace(/^.*\/webr\//, '');
    abrufe[pfad] = (abrufe[pfad] ?? 0) + 1;
    if (pfad === 'manifest.json') return new Response(JSON.stringify(MANIFEST));
    const gesamt = [...MANIFEST.basis, ...MANIFEST.pakete.meta].find(d => d.p === pfad)!.b;
    let n = 0;
    const body = new ReadableStream<Uint8Array>({
      async pull(c) {
        await new Promise(r => setTimeout(r, pause));
        if (n >= gesamt) { c.close(); return; }
        const k = Math.min(1000, gesamt - n); n += k; gelesen[pfad] = n; c.enqueue(new Uint8Array(k));
      }
    });
    return new Response(body);
  });
  return { fetchMock, abrufe, gelesen };
}

beforeEach(() => { vi.stubGlobal('document', { baseURI: 'http://test/', documentElement: { lang: 'de' } }); });
afterEach(() => { vi.unstubAllGlobals(); });

/** Nach den Dateien versucht `start()` webr.js zu laden (im Test nicht vorhanden): das ist das erwartete Ende des Ladens. */
/** Wartet auf einen Zustand statt auf eine feste Zeit: Unter Windows laufen Zeitgeber nur alle rund 15 ms. */
const bis = async (f: () => boolean) => { while (!f()) await new Promise(r => setTimeout(r, 1)); };
const bisZumStart = (p: Promise<void>) => p.then(() => 'fertig', e => (e as Error).name === 'AbortError' ? 'abgebrochen' : 'fehler: ' + (e as Error).message.slice(0, 40));

describe('R vorwärmen', () => {
  it('zählt die echten Bytes aller Stufen zu einem Fortschritt von 0 bis zur Summe', async () => {
    const s = server(0); vi.stubGlobal('fetch', s.fetchMock);
    const m = new RMotor(); const f: RFortschritt[] = []; m.onFortschritt = x => f.push(x);
    await bisZumStart(m.vorwaermen(['meta']));
    const lade = f.filter(x => x.phase === 'laden' && x.gesamt > 0);
    expect(lade[0]!.gesamt).toBe(20000);                    // Basis 10000 + Paket 10000: eine Summe
    expect(lade.at(-1)!.geladen).toBe(10000);               // die Basis ist da; das Paket folgt nach dem Start (hier bricht der Test dort ab)
    expect(lade.every((x, i) => i === 0 || x.geladen >= lade[i - 1]!.geladen)).toBe(true);   // nie rückwärts
    expect(lade.at(-1)!.text).toMatch(/R wird geladen … \d+|< 1 von (< 1|0|\d+) MB/);
  });

  it('Abbrechen stoppt das Laden mitten in einer Datei; fertige Dateien bleiben', async () => {
    const s = server(25); vi.stubGlobal('fetch', s.fetchMock);
    const m = new RMotor();
    const p = bisZumStart(m.vorwaermen(['meta']));
    await bis(() => (s.gelesen['b.bin'] ?? 0) >= 4000);
    m.abbrechen();
    expect(await p).toBe('abgebrochen');
    const bisher = { ...s.gelesen };
    await new Promise(r => setTimeout(r, 80));
    expect(s.gelesen).toEqual(bisher);                      // nach dem Abbruch kommt nichts mehr an
    expect((s.gelesen['b.bin'] ?? 0) < 6000).toBe(true);    // b.bin war noch nicht fertig
  });

  it('eine echte Rechnung (bereit) macht das Laden unabhängig vom Abbruch und lädt keine Datei doppelt', async () => {
    const s = server(3); vi.stubGlobal('fetch', s.fetchMock);
    const m = new RMotor();
    const vor = bisZumStart(m.vorwaermen([]));
    await new Promise(r => setTimeout(r, 10));
    const echt = bisZumStart(m.bereit());                   // jemand drückt „Rechnen“, während vorgeladen wird
    m.abbrechen();                                          // die Wahl wird verlassen - aber R wird gebraucht
    const [a, b] = await Promise.all([vor, echt]);
    expect(a).not.toBe('abgebrochen'); expect(b).not.toBe('abgebrochen');
    expect(s.abrufe['a.bin']).toBe(1); expect(s.abrufe['b.bin']).toBe(1);
    expect(s.gelesen['b.bin']).toBe(6000);                  // ganz geladen
  });

  it('Abbrechen ohne laufendes Laden schadet einer späteren Rechnung nicht', async () => {
    const s = server(0); vi.stubGlobal('fetch', s.fetchMock);
    const m = new RMotor();
    m.abbrechen();
    expect(await bisZumStart(m.bereit())).not.toBe('abgebrochen');
    expect(s.gelesen['b.bin']).toBe(6000);
  });

  it('nach einem Abbruch lädt ein neuer Versuch weiter und holt nur, was fehlt', async () => {
    const s = server(25); vi.stubGlobal('fetch', s.fetchMock);
    const m = new RMotor();
    const p = bisZumStart(m.vorwaermen([]));
    await bis(() => (s.gelesen['b.bin'] ?? 0) >= 5000); m.abbrechen(); await p;
    const a1 = s.abrufe['a.bin'] ?? 0;
    await bisZumStart(m.vorwaermen([]));
    expect(s.abrufe['a.bin']).toBe(a1);                     // a.bin war fertig, wird nicht noch einmal geholt
    expect(s.gelesen['b.bin']).toBe(6000);
  });
});

describe('Datensparmodus', () => {
  it('lädt R nicht vorab, wenn der Browser Daten sparen soll', async () => {
    const q = await import('../lib/rverfahren.svelte');
    Object.defineProperty(navigator, 'connection', { value: { saveData: true }, configurable: true });
    const frei = q.rHalten(['metafor']);
    expect(q.rStatus.vor).toBeFalsy();
    frei();
    Reflect.deleteProperty(navigator, 'connection');
  });
});
