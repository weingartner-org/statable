/**
 * R-Schutz (Stufe 1 große Dateien, 31.10.2026): Eine hängende Rechnung sperrt nicht mehr alle folgenden. Ohne Browser, mit gespieltem R.
 * Geprüft: Abbruch, die nächste Rechnung läuft, toter Worker, Zeitgrenze, Warteschlange, Merker neu, kein doppeltes Laden, spätes `init` schließt sich selbst.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { R_ZEITGRENZE_MS, RAbgebrochen, RMotor } from './webr';

const MANIFEST = { version: 'test', basis: [{ p: 'a.bin', b: 10 }], pakete: { meta: [{ p: 'repo/meta.tgz', b: 10 }] } };
const offen = () => new Promise<never>(() => undefined);

/** Ein gespieltes webR: Jede Instanz merkt sich ihre Aufrufe; `antwort` entscheidet je Code, was evalR tut. */
function spielR(antwort: (code: string) => Promise<unknown> = async () => 1) {
  const instanzen: { codes: string[]; pakete: string[][]; geschlossen: boolean; init: () => Promise<void> }[] = [];
  let initSpaeter: Promise<void> | undefined;
  class WebR {
    codes: string[] = []; pakete: string[][] = []; geschlossen = false;
    constructor() { instanzen.push(this as unknown as typeof instanzen[number]); }
    init() { return initSpaeter ?? Promise.resolve(); }
    close() { this.geschlossen = true; }
    async installPackages(p: string[]) { this.pakete.push(p); }
    async evalRVoid(c: string) { this.codes.push(c); }
    objs = { globalEnv: { bind: async () => undefined } };
    get Shelter() {
      const ich = this;
      return class {
        constructor() {
          return Promise.resolve({
            evalR: async (c: string) => {
              ich.codes.push(c);
              if (c.includes('tryCatch({') && c.includes("'ok'")) return { toString: async () => 'ok', toJs: async (): Promise<unknown> => 'ok' };
              const v = await antwort(c);
              return { toJs: async (): Promise<unknown> => v };
            },
            purge: async () => undefined,
            RList: ich.RList, RDouble: ich.RDouble, RCharacter: ich.RCharacter
          });
        }
      };
    }
    RList = class { constructor() { return Promise.resolve({}); } };
    RDouble = class { constructor() { return Promise.resolve({}); } };
    RCharacter = class { constructor() { return Promise.resolve({}); } };
  }
  return { modul: { WebR }, instanzen, setzeInit: (p: Promise<void> | undefined) => { initSpaeter = p; } };
}

function motor(s: ReturnType<typeof spielR>): RMotor {
  const m = new RMotor();
  (m as unknown as { modul: unknown }).modul = s.modul;
  return m;
}

const abrufe: string[] = [];
beforeEach(() => {
  abrufe.length = 0;
  vi.stubGlobal('document', { baseURI: 'http://test/', documentElement: { lang: 'de' } });
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const pfad = String(url).replace(/^.*\/webr\//, '');
    abrufe.push(pfad);
    return new Response(pfad === 'manifest.json' ? JSON.stringify(MANIFEST) : new Uint8Array(10));
  }));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('R abbrechen', () => {
  it('eine hängende Rechnung endet mit RAbgebrochen, der Worker wird geschlossen, die nächste Rechnung läuft in frischem R', async () => {
    let haengen = true;
    const s = spielR(async () => (haengen ? offen() : 42));
    const m = motor(s);
    const lang = m.rechne('lang()');
    await vi.waitFor(() => expect(s.instanzen[0]?.codes).toContain('lang()'));
    m.neustart();
    const e = await lang.catch(x => x);
    expect(e).toBeInstanceOf(RAbgebrochen);
    expect((e as RAbgebrochen).grund).toBe('person');
    expect((e as Error).message).toMatch(/abgebrochen\. Die Daten sind unverändert/);
    expect(s.instanzen[0]!.geschlossen).toBe(true);
    haengen = false;
    expect(await m.rechne<number>('kurz()')).toBe(42);
    expect(s.instanzen).toHaveLength(2);
    expect(s.instanzen[1]!.geschlossen).toBe(false);
  });

  it('das alte R bekommt nach dem Abbruch keinen Aufruf mehr (purge, rm), sonst hinge es dort wieder', async () => {
    const s = spielR(async () => offen());
    const m = motor(s);
    const lang = m.rechne('lang()', { a: 'x' });
    await vi.waitFor(() => expect(s.instanzen[0]?.codes).toContain('lang()'));
    m.neustart();
    await lang.catch(() => undefined);
    expect(s.instanzen[0]!.codes.filter(c => c.startsWith('rm('))).toEqual([]);
  });

  it('auch das Einspielen der Daten und das Laden der Pakete lassen sich abbrechen', async () => {
    const s = spielR();
    const m = motor(s);
    await m.bereit();
    (s.instanzen[0] as unknown as { installPackages: () => Promise<void> }).installPackages = offen;
    const pakete = m.pakete(['meta']);
    await vi.waitFor(() => expect(abrufe).toContain('repo/meta.tgz'));
    await new Promise(r => setTimeout(r, 0));
    m.neustart();
    expect(await pakete.catch(x => x)).toBeInstanceOf(RAbgebrochen);
    await m.bereit();
    (s.instanzen[1] as unknown as { RDouble: unknown }).RDouble = class { constructor() { return offen(); } };
    const daten = m.daten('d', [{ name: 'y', art: 'zahl', werte: [1] }]);
    await new Promise(r => setTimeout(r, 0));
    m.neustart();
    expect(await daten.catch(x => x)).toBeInstanceOf(RAbgebrochen);
  });

  it('ein Neustart während des Starts: die alte Instanz schließt sich nach ihrem init selbst, kein Doppelstart', async () => {
    const s = spielR();
    let initFertig!: () => void;
    s.setzeInit(new Promise<void>(r => { initFertig = r; }));
    const m = motor(s);
    const erst = m.bereit();
    await vi.waitFor(() => expect(s.instanzen).toHaveLength(1));
    m.neustart();
    expect(await erst.catch(x => x)).toBeInstanceOf(RAbgebrochen);
    s.setzeInit(undefined);
    await m.bereit();
    expect(s.instanzen).toHaveLength(2);
    initFertig();
    await new Promise(r => setTimeout(r, 0));
    expect(s.instanzen[0]!.geschlossen).toBe(true);
    expect(s.instanzen[1]!.geschlossen).toBe(false);
  });

  it('kein doppeltes Laden: nach dem Neustart holt R keine fertige Datei noch einmal', async () => {
    const m = motor(spielR());
    await m.bereit();
    m.neustart();
    await m.bereit();
    expect(abrufe.filter(a => a === 'a.bin')).toHaveLength(1);
  });

  it('zwei gleichzeitige Rechnungen nach dem Neustart starten nur ein neues R', async () => {
    const s = spielR();
    const m = motor(s);
    await m.bereit();
    m.neustart();
    await Promise.all([m.rechne('a()'), m.rechne('b()')]);
    expect(s.instanzen).toHaveLength(2);
  });
});

describe('totes R', () => {
  it.each(['memory access out of bounds', 'RuntimeError: unreachable', 'Aborted(OOM)'])('„%s“ führt zu einem Neustart und einer verständlichen Meldung', async meldung => {
    let einmal = true;
    const s = spielR(async () => { if (einmal) { einmal = false; throw new Error(meldung); } return 7; });
    const m = motor(s);
    const e = await m.rechne('x()').catch(x => x);
    expect(e).toBeInstanceOf(RAbgebrochen);
    expect((e as RAbgebrochen).grund).toBe('tot');
    expect((e as Error).message).toMatch(/abgestürzt/);
    expect(s.instanzen[0]!.geschlossen).toBe(true);
    expect(await m.rechne<number>('x()')).toBe(7);
  });

  it('ein gewöhnlicher R-Fehler bleibt ein gewöhnlicher Fehler, R lebt weiter', async () => {
    const s = spielR(async () => { throw new Error('object not found'); });
    const m = motor(s);
    const e = await m.rechne('x()').catch(x => x);
    expect(e).not.toBeInstanceOf(RAbgebrochen);
    expect((e as Error).message).toBe('object not found');
    expect(s.instanzen[0]!.geschlossen).toBe(false);
  });
});

describe('Zeitgrenze', () => {
  it('bricht erst nach R_ZEITGRENZE_MS von selbst ab, nicht früher', async () => {
    const s = spielR(async () => offen());
    const m = motor(s);
    await m.bereit();
    vi.useFakeTimers();
    let ende: unknown;
    void m.rechne('lang()').catch(x => { ende = x; });
    await vi.advanceTimersByTimeAsync(R_ZEITGRENZE_MS - 1000);
    expect(ende).toBeUndefined();
    await vi.advanceTimersByTimeAsync(2000);
    expect(ende).toBeInstanceOf(RAbgebrochen);
    expect((ende as RAbgebrochen).grund).toBe('zeit');
    expect(s.instanzen[0]!.geschlossen).toBe(true);
  });
});

describe('Warteschlange und Merker (rverfahren)', () => {
  it('Abbruch: die wartende Rechnung läuft nicht los, der Satz kommt unverändert an, eine neue Rechnung legt die festen Funktionen wieder an', async () => {
    const q = await import('../lib/rverfahren.svelte');
    const { rMotor } = await import('./webr');
    let haengen = true;
    const s = spielR(async c => (c.includes('sp_omega(') && haengen ? offen() : { omega: [0.8], n: [3], n_alle: [3], k: [3] }));
    (rMotor() as unknown as { modul: unknown }).modul = s.modul;
    const quelle = { zeilen: [[1, 2, 3], [2, 3, 4], [3, 4, 6]], spalten: ['a', 'b', 'c'].map(name => ({ name, art: 'zahl', bezeichnung: '', fehlend: [] })) } as unknown as Parameters<typeof q.omegaRechnen>[2];
    const eins = q.omegaRechnen(['a', 'b', 'c'], {}, quelle);
    const zwei = q.omegaRechnen(['a', 'b', 'c'], {}, quelle);
    expect(q.rStatus.belegt).toBe(true);
    await vi.waitFor(() => expect(s.instanzen[0]?.codes.some(c => c.includes('sp_omega(d'))).toBe(true));
    q.rAbbrechen();
    const f1 = await eins.catch(x => x), f2 = await zwei.catch(x => x);
    expect(f1).toBeInstanceOf(q.Fertig);
    expect((f1 as Error).message).toMatch(/^Rechnung abgebrochen/);   // nicht „R: …“
    expect((f2 as Error).message).toMatch(/^Rechnung abgebrochen/);
    expect(q.rStatus.bereit).toBe(false);
    expect(q.rStatus.text).toBe('');
    expect(q.rStatus.laedt).toBe(false);
    await vi.waitFor(() => expect(q.rStatus.belegt).toBe(false));
    expect(s.instanzen).toHaveLength(1);                                   // die zweite ist gar nicht erst losgelaufen
    haengen = false;
    const ok = await q.omegaRechnen(['a', 'b', 'c'], {}, quelle);
    expect(ok.omega).toBe(0.8);
    expect(s.instanzen).toHaveLength(2);
    expect(s.instanzen[1]!.codes.some(c => c.includes('sp_omega <-') || c.length > 2000)).toBe(true);   // die festen Funktionen stehen wieder im neuen R
    q.rAbbrechen();                                                        // nichts läuft: tut nichts
    expect(s.instanzen[1]!.geschlossen).toBe(false);
  });
});
