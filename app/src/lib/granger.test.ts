import { describe, expect, it, afterEach } from 'vitest';
import { s } from './sitzung.svelte';
import { zitat } from '../i18n/profil';
import ERW from './testdaten/massnahme-erwartet.json';
import {
  grangerKMax, grangerKStandard, grangerKGueltig, grangerSperre, grangerCodeSatz, grangerAufruf, grangerLesen, grangerRichtungSatz, grangerSaetze, grangerWarnungen, grangerTabellen, grangerRCode, grangerHilfeSatz,
  GRANGER_LABELS, type GrangerE, type GrangerFehlerCode
} from './granger';
import { zeitreiheErgebnis, saetzeZeitreihe, tabellenZeitreihe, prognoseBehalten, type ZeitreiheE } from './zeitreiheblatt';

/* Granger-Test (Fachblatt docs/fachblaetter/MASSNAHME.md, Abschnitt 2): alles, was ohne R prüfbar ist - Wahl von k, Sperren, der Aufruf (nur Wörter und Zahlen), Lesen der R-Antwort, Sätze, Warnungen, Tabellen, R-Text.
 * Die Rechnung selbst steht in engine/massnahme.webr.test.ts. Die Zahlen der Antworten kommen aus den Sollwerten (lib/testdaten/massnahme-erwartet.json) nur als Eingabe für Lesen und Sätze. */
s.einst.sprache = 'de'; s.einst.anrede = 'du';
afterEach(() => { s.einst.sprache = 'de'; s.einst.anrede = 'du'; });

type Granger = { name: string; x: number[]; y: number[]; k: number; F: number; df1: number; df2: number; p: number; n: number };
const GR = (ERW as unknown as { granger: Granger[] }).granger;
const sauber = (t: string) => expect(t).not.toMatch(/Fachblatt|\.md\b|\.R\b|\.ts\b|sp_granger|sp_prog|MASSNAHME|docs\//);
const n = { x: 'Eier', y: 'Hühner' };
const richtung = (g: Granger) => ({ F: g.F, df1: g.df1, df2: g.df2, p: g.p });
/** Die Antwort von R, wie `rZuJson` sie liefert. */
const roh = (extra: Record<string, unknown> = {}): Record<string, unknown> => ({
  k: [3], n: [51], xy: { F: [GR[0]!.F], df1: [3], df2: [44], p: [GR[0]!.p] }, yx: { F: [GR[1]!.F], df1: [3], df2: [44], p: [GR[1]!.p] }, kpss_x: [0.7], kpss_y: [0.3], ...extra
});
const lesen = (extra: Record<string, unknown> = {}): GrangerE => { const l = grangerLesen(roh(extra)); if (!l.ok) throw new Error('Lesen: ' + l.code); return { antwort: l.antwort }; };

describe('Wahl von k', () => {
  it('Vorgabe: Periode bei Saison, sonst 3; höchstens ein Viertel der Reihe (mindestens 1); keine Automatik', () => {
    expect(grangerKStandard(180, 12)).toBe(12); expect(grangerKStandard(180, 1)).toBe(3); expect(grangerKStandard(180, 4)).toBe(4);
    expect(grangerKStandard(30, 12)).toBe(7); expect(grangerKStandard(30, 1)).toBe(3); expect(grangerKStandard(8, 1)).toBe(2);
    expect(grangerKMax(54)).toBe(13); expect(grangerKMax(192)).toBe(48); expect(grangerKMax(3)).toBe(1);
  });
  it('gültig sind ganze Zahlen von 1 bis ⌊n/4⌋', () => {
    expect(grangerKGueltig(1, 54)).toBe(true); expect(grangerKGueltig(13, 54)).toBe(true);
    for (const k of [0, 14, -1, 2.5, NaN, Infinity]) expect(grangerKGueltig(k, 54), String(k)).toBe(false);
  });
});

describe('Sperren', () => {
  const x = Array.from({ length: 40 }, (_, i) => Math.sin(i)), y = Array.from({ length: 40 }, (_, i) => Math.cos(i * 1.3));
  it('ungleiche Länge, Lücken, unter 30 Werte, konstante Reihe - in dieser Reihenfolge; sonst keine Sperre', () => {
    expect(grangerSperre(x, y)).toBeNull();
    expect(grangerSperre(x.slice(0, 39), y)).toBe('laenge');
    expect(grangerSperre(x.map((v, i) => (i === 3 ? null : v)), y)).toBe('luecken'); expect(grangerSperre(x, y.map((v, i) => (i === 3 ? NaN : v)))).toBe('luecken');
    expect(grangerSperre(x.slice(0, 29), y.slice(0, 29))).toBe('zu-kurz'); expect(grangerSperre(x.slice(0, 30), y.slice(0, 30))).toBeNull();
    expect(grangerSperre(x.map(() => 2), y)).toBe('konstant'); expect(grangerSperre(x, y.map(() => 0))).toBe('konstant');
    expect(grangerSperre(x.map(() => 2).slice(0, 39), y)).toBe('laenge');
  });
  it('jeder Code hat einen ganzen Satz, deutsch und englisch, ohne Verweis auf Fachblatt', () => {
    const codes: GrangerFehlerCode[] = ['laenge', 'luecken', 'zu-kurz', 'konstant', 'k-ungueltig', 'nicht-eindeutig', 'r-fehler'];
    for (const c of codes) {
      const de = grangerCodeSatz(c); expect(de, c).toMatch(/\.$/); sauber(de);
      s.einst.sprache = 'en'; const en = grangerCodeSatz(c); s.einst.sprache = 'de';
      expect(en, c).not.toBe(de); expect(en, c).not.toMatch(/Reihe|Werte|Lücken|Verzögerung/);
    }
    sauber(grangerHilfeSatz());
  });
});

describe('Aufruf an R: nur Wörter und Zahlen', () => {
  it('sp_granger mit den Spalten x und y der Tabelle d und k als ganzer Zahl', () => {
    expect(grangerAufruf(12).code).toBe("tryCatch(sp_granger(d$x, d$y, 12L), error = function(e) list(fehler = conditionMessage(e)))");
  });
  it('k als Text, Bruch oder unendlich wirft; nichts wird eingesetzt', () => {
    for (const k of ['3); system("x")', 2.5, NaN, Infinity, null, undefined]) expect(() => grangerAufruf(k as never), String(k)).toThrow();
  });
});

describe('R-Antwort lesen', () => {
  it('beide Richtungen, k, Zahl der Fälle und KPSS je Reihe', () => {
    const a = lesen().antwort;
    expect(a.k).toBe(3); expect(a.n).toBe(51); expect(a.xy).toEqual(richtung(GR[0]!)); expect(a.yx).toEqual(richtung(GR[1]!)); expect([a.kpssX, a.kpssY]).toEqual([0.7, 0.3]);
  });
  it('Fehler: Kennwörter werden Codes, alles Unbekannte wird r-fehler, nichts wirft', () => {
    for (const c of ['laenge', 'luecken', 'zu-kurz', 'konstant', 'k-ungueltig', 'nicht-eindeutig']) expect(grangerLesen({ fehler: [c] })).toEqual({ ok: false, code: c });
    expect(grangerLesen({ fehler: ['Fehler in lm'] })).toEqual({ ok: false, code: 'r-fehler' });
    for (const x of [null, undefined, 3, 'x', [], { type: 'null' }, {}, roh({ xy: { F: [null], df1: [3], df2: [44], p: [0.1] } }), roh({ kpss_x: [null] }), roh({ k: [] })]) expect(grangerLesen(x).ok, JSON.stringify(x)).toBe(false);
  });
});

describe('Sätze', () => {
  it('Eier → Hühner (k = 3): F(3, 44) = 5,40, p = ,003 - „helfen, vorherzusagen“, nie „verursacht“; Hühner → Eier: kein deutlicher Beitrag', () => {
    const [a, b] = grangerSaetze(lesen(), n);
    expect(a).toBe(`Frühere Werte von ${zitat('Eier')} helfen, ${zitat('Hühner')} vorherzusagen, über die Vergangenheit von ${zitat('Hühner')} hinaus (F(3, 44) = 5,40, p = ,003, k = 3).`);
    expect(b).toBe(`Für frühere Werte von ${zitat('Hühner')} ergibt sich kein deutlicher Beitrag zur Vorhersage von ${zitat('Eier')} (F(3, 44) = 0,59, p = ,624, k = 3).`);
    for (const t of [a!, b!]) { expect(t).not.toMatch(/verursach|bewirk|Ursache|Grund/i); sauber(t); }
  });
  it('englisch: „help to predict“, Dezimalpunkt, kein deutscher Rest', () => {
    s.einst.sprache = 'en';
    const [a, b] = grangerSaetze(lesen(), { x: 'Eggs', y: 'Chickens' });
    expect(a).toBe(`Earlier values of ${zitat('Eggs')} help to predict ${zitat('Chickens')}, beyond the past of ${zitat('Chickens')} (F(3, 44) = 5.40, p = .003, k = 3).`); expect(b).toContain('show no clear contribution'); expect(b).toContain('p = .624');
  });
  it('Grenze: p = ,05 zählt nicht als „helfen“', () => {
    expect(grangerRichtungSatz({ F: 3, df1: 3, df2: 44, p: 0.05 }, 3, 'a', 'b')).toMatch(/kein deutlicher Beitrag/);
    expect(grangerRichtungSatz({ F: 3, df1: 3, df2: 44, p: 0.0499 }, 3, 'a', 'b')).toMatch(/helfen/);
  });
});

describe('Warnungen', () => {
  it('„Vorauslaufen ist keine Ursache“ und „hängt von k ab“ stehen immer; der Satz zur Stationarität nur bei KPSS über 0,463', () => {
    const w = (extra: Record<string, unknown>) => grangerWarnungen(lesen(extra), n);
    expect(w({ kpss_x: [0.2], kpss_y: [0.463] }).map(x => x.code)).toEqual(['ursache', 'k']);
    expect(w({}).map(x => x.code)).toEqual(['ursache', 'stationaer', 'k']);
    const st = w({}).find(x => x.code === 'stationaer')!.satz;
    expect(st).toContain(`Nach KPSS wirkt die Reihe ${zitat('Eier')} nicht stationär (KPSS 0,700, Grenze 0,463)`); expect(st).toMatch(/vorher differenziert/); expect(st).toMatch(/Statable differenziert nicht von selbst/);
    const beide = w({ kpss_x: [0.9], kpss_y: [0.6] }).find(x => x.code === 'stationaer')!.satz; expect(beide).toContain(`wirken die Reihen ${zitat('Eier')} und ${zitat('Hühner')} nicht stationär`); expect(beide).toContain('0,900 / 0,600');
  });
  it('Texte: Vorauslaufen ist keine Ursache; k durchprobieren ist falsch; sachlich, keine doppelten Sätze, englisch ohne deutschen Rest', () => {
    const de = grangerWarnungen(lesen(), n).map(x => x.satz);
    expect(de[0]).toMatch(/^Vorauslaufen ist keine Ursache\./); expect(de.join(' ')).toMatch(/dritter Einfluss kann beide Reihen treiben/); expect(de[2]).toMatch(/Mehrere k durchzuprobieren und das kleinste p zu nehmen ist falsch/);
    expect(new Set(de).size).toBe(de.length); de.forEach(sauber);
    s.einst.sprache = 'en'; const en = grangerWarnungen(lesen(), { x: 'Eggs', y: 'Chickens' }).map(x => x.satz);
    en.forEach((t, i) => { expect(t).not.toBe(de[i]); expect(t).not.toMatch(/Reihe|Verzögerung|Vorauslaufen|Ursache|Einfluss/); });
    expect(en[0]).toMatch(/^Leading is not causing/);
  });
});

describe('Tabellen und R-Text', () => {
  it('Granger-Test: beide Richtungen mit k, F, df1, df2, p; KPSS je Reihe mit Grenze', () => {
    const t = grangerTabellen(lesen(), n);
    expect(t.map(x => x.label)).toEqual([...GRANGER_LABELS]);
    expect(t[0]!.cells.map(c => c.t)).toEqual(expect.arrayContaining([`${zitat('Eier')} → ${zitat('Hühner')}`, '5.405', '44', ',003', `${zitat('Hühner')} → ${zitat('Eier')}`, '0.592', ',624']));
    expect(t[1]!.cells.map(c => c.t)).toEqual(expect.arrayContaining(['0.700', '0.463', '0.300']));
    for (const x of t) { x.footnotes.forEach(f => sauber(f.t)); sauber(x.title!.t); }
  });
  it('R-Text: zwei lm und anova, ohne lmtest; ein gefährlicher Spaltenname steht nie roh im Text', () => {
    const c = grangerRCode('eier', 'huehner', 3);
    expect(c).toContain('x <- daten$eier'); expect(c).toContain('y <- daten$huehner'); expect(c).toContain('k <- 3'); expect(c).toContain('anova(m0, m1)'); expect(c).not.toMatch(/lmtest|grangertest|library/); sauber(c);
    const b = grangerRCode('x`\nassign(".pwned", TRUE)\n#`', 'y', 3);
    expect(b).not.toMatch(/^assign/m); expect(b).toContain('daten$`x\\`');
  });
});

describe('am Blatt: Sätze, Tabellen, alte Projektdateien', () => {
  const sp = (name: string, art: 'zahl' | 'datum') => ({ name, bezeichnung: name, art, niveau: 'metrisch' as const, format: art === 'datum' ? 'EDATE10' : 'F8.2', fehlend: [], fehlendText: '', werteLabels: {} });
  const monatsDaten = (k: number) => Array.from({ length: k }, (_, i) => `01.${String((i % 12) + 1).padStart(2, '0')}.${1990 + Math.floor(i / 12)}`);
  const blatt = (): ZeitreiheE => {
    const g = GR[2]!;   // Benzinpreis → Fahrer: 192 Plätze
    s.spalten = [sp('datum', 'datum'), sp('fahrer', 'zahl'), sp('benzin', 'zahl')] as never; s.zeilen = monatsDaten(g.y.length).map((d, i) => [d, g.y[i]!, g.x[i]!]) as never;
    const r = zeitreiheErgebnis('fahrer', 'datum', { zweite: 'benzin' }); if (!r.ok) throw new Error('kein Ergebnis');
    return r.e;
  };
  it('Sätze und Tabellen der Karte enthalten den Granger-Test erst nach dem Klick; die erste Reihe steht links vom Pfeil', () => {
    const e = blatt(); expect(e.granger).toBeUndefined();
    expect(saetzeZeitreihe(e).zusatz).not.toMatch(/Frühere Werte/); expect(tabellenZeitreihe(e).map(t => t.label)).not.toEqual(expect.arrayContaining(GRANGER_LABELS as string[]));
    const mit: ZeitreiheE = { ...e, granger: lesen() };
    const sz = saetzeZeitreihe(mit, x => x);
    expect(sz.zusatz).toContain(`Frühere Werte von ${zitat('fahrer')} helfen, ${zitat('benzin')} vorherzusagen`); expect(sz.vorsicht).toContain('Vorauslaufen ist keine Ursache'); expect(sz.vorsicht).toContain('Das Ergebnis hängt von k ab');
    const tab = tabellenZeitreihe(mit, x => x); expect(tab.map(t => t.label)).toEqual(expect.arrayContaining(GRANGER_LABELS as string[]));
    expect(tab.find(t => t.label === 'Granger-Test')!.cells.map(c => c.t)).toContain(`${zitat('fahrer')} → ${zitat('benzin')}`);
  });
  it('beim Neurechnen des Blatts bleibt der Granger-Test, wenn beide Reihen dieselben sind, sonst fällt er weg', () => {
    const e: ZeitreiheE = { ...blatt(), granger: lesen() }, neu = blatt();
    expect(prognoseBehalten(e, neu).granger).toBeDefined();
    expect(prognoseBehalten(e, { ...neu, y2: neu.y2!.map((v, i) => (i === 5 && v !== null ? v + 1 : v)) }).granger).toBeUndefined();
    expect(prognoseBehalten(e, { ...neu, zweite: 'andere' }).granger).toBeUndefined();
  });
});
