import { pathToFileURL } from 'node:url';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { join } from 'node:path';
import { R_START } from './rproben';
import { RMotor, rMotor, rZuJson } from './webr';
import STATABLE_R from './statable.R?raw';
import STATABLE_UMFRAGE_R from './statable-umfrage.R?raw';
import STATABLE_VORHERSAGE_E_R from './statable-vorhersage-e.R?raw';
import ERWE from '../lib/testdaten/spaeter-e-erwartet.json';
import STATABLE_ZEITCLUSTER_R from './statable-zeitcluster.R?raw';
import STATABLE_PROGNOSE_R from './statable-prognose.R?raw';
import STATABLE_GLAETTUNG_R from './statable-glaettung.R?raw';
import STATABLE_KURSPAKET_R from './statable-kurspaket.R?raw';   // Kurs-Paket (Fachblatt KURSPAKET)
import STATABLE_ARMUT_R from './statable-armut.R?raw';   // Abschnitt 3: Armut und Ungleichheit
import ERW_E from '../lib/testdaten/spaeter-e-erwartet.json';
import { clusterBerechnen } from '../lib/clusterlauf';
import { VERFAHREN } from '../lib/verfahren';
import UMFRAGE_ERW from '../lib/testdaten/spaeter-d2-erwartet.json';
import { gewichtetBeschreiben } from '../lib/gewichtbeschreibend';
import { umfrageVerteilungRechnen, umfrageKreuzRechnen } from '../lib/umfragerechnen';
import { gruppenRechnen, regressionRechnen } from '../lib/umfrage-gr-rechnen';
import { umfrageRechnen } from '../lib/rverfahren.svelte';
import { regFaktor } from '../lib/regfaktor';
import ERW3 from '../lib/testdaten/welle3-erwartet.json';
import ERW7 from '../lib/testdaten/welle7-erwartet.json';
import type { Spalte } from '../lib/verzeichnis';
import type { Wert } from '../lib/eingabe';
import { diskriminanzRechnen, loglinearRechnen, manovaRechnen, probitRechnen, wlsRechnen, nlsRechnen, armutRechnen } from '../lib/rverfahren.svelte';
import { diskrRCode } from '../lib/diskriminanz';
import { logRCode, logTerme, type LogWahl } from '../lib/loglinear';
import { manovaRCode } from '../lib/manova';
import { probitRCode } from '../lib/probit';
import { wlsRCode } from '../lib/wls';
import { nlsRCode } from '../lib/nls';
import { armutRCode } from '../lib/armut';
import { quantilRechnen, strafRechnen, ordregRechnen, multregRechnen, zaehlregRechnen, coxRechnen, coxZpRechnen, aftRechnen, frailtyRechnen, metaRechnen, mehrebenenRechnen, omegaRechnen, cfaRechnen, type Quelle } from '../lib/rverfahren.svelte';
import { katRCode } from '../lib/kategreg';
import { quantilRCode } from '../lib/quantilsaetze';
import { strafRCode } from '../lib/strafregsaetze';
import { coxRCode } from '../lib/cox';
import { umformenWechsel, coxZpRCode } from '../lib/coxzeit';
import ERW_F from '../lib/testdaten/spaeter-f-erwartet.json';
import { metaRCode, type MetaEingabe } from '../lib/metaanalyse';
import { mebRCode, type Mehrebenen } from '../lib/mehrebenen';

/* SICHERHEIT (Fremde Dateien): Spaltennamen, Wertelabels und Textwerte mit Backtick, Anführungszeichen, Zeilenumbruch, `system(`, `)`, `;`, `#` und Backslash
 * dürfen in R nichts ausführen. Für JEDES webR-Verfahren: dieselben Daten einmal mit harmlosen und einmal mit gefährlichen Namen, Labels und Textwerten - die Zahlen müssen
 * genau gleich sein, und die Falle (`assign('.pwned', TRUE, globalenv())`, auch `system("touch /tmp/pwned")`) darf nie auslösen.
 * Läuft über die echten Funktionen der App (lib/rverfahren.svelte.ts → RMotor → webR in Node). Regeln: engine/rsicher.ts. Wächter für den Quelltext: rsicher.test.ts. */

const webrOrdner = join(import.meta.dirname, '../../public/webr');
const PAKETE = ['MASS', 'nnet', 'survival', 'metafor', 'lme4', 'lmerTest', 'lavaan', 'psych', 'GPArotation', 'survey', 'quantreg', 'glmnet'];
const da = existsSync(join(webrOrdner, 'repo/bin/emscripten/contrib/4.6/lmerTest_3.2-1.tgz')) && existsSync(join(webrOrdner, 'repo/bin/emscripten/contrib/4.6/nnet_7.3-21.tgz')) && existsSync(join(webrOrdner, 'repo/bin/emscripten/contrib/4.6/glmnet_5.1.tgz')) && existsSync(join(webrOrdner, 'manifest.json'));

const FALLE = `assign('.pwned', TRUE, globalenv())`;
/** Gefährliche Bausteine: jede Zeichenkette versucht, aus Anführungszeichen, Backticks, Klammern oder Kommentar auszubrechen und die Falle auszulösen. */
const GEFAHR = [
  `x'); ${FALLE}; ('`,
  `a\`; ${FALLE}; \`b`,
  `q"); ${FALLE}; ("`,
  `n\n${FALLE}\n`,
  `system("touch /tmp/pwned") ; ${FALLE}`,
  `z)) # \\'); ${FALLE}; #`,
  `\\\\"); ${FALLE}; \\`,
  `}); ${FALLE}; ({`,
  `x\`\n${FALLE}\n#`   // beendet im alten Anzeigecode den Backtick-Namen, setzt eine eigene Zeile und kommentiert den Rest weg
];

type Sitz = { spalten: Spalte[]; zeilen: Wert[][] };
const sp = (name: string, o: Partial<Spalte> = {}): Spalte => ({ name, bezeichnung: name, art: 'zahl', niveau: 'metrisch', format: '', fehlend: [], fehlendText: '', werteLabels: {}, ...o });

/** Gefährliche Fassung derselben Daten: jeder Spaltenname, jedes Wertelabel und jeder Textwert bekommt einen Baustein dazu (am Ende, so bleibt die Reihenfolge). */
function boes(s: Sitz): Sitz & { name: (alt: string) => string } {
  const neu = new Map<string, string>();
  const spalten = s.spalten.map((c, i) => {
    const name = `${GEFAHR[i % GEFAHR.length]}_${i}`;
    neu.set(c.name, name);
    return { ...c, name, bezeichnung: name, werteLabels: Object.fromEntries(Object.entries(c.werteLabels).map(([k, l], j) => [k, l + GEFAHR[(i + j + 1) % GEFAHR.length]])) } as Spalte;
  });
  const zeilen = s.zeilen.map(z => z.map((v, i): Wert => (s.spalten[i]!.art === 'text' && typeof v === 'string' ? v + GEFAHR[(i + 3) % GEFAHR.length] : v)));
  return { spalten, zeilen, name: a => neu.get(a)! };
}
/** Alle Zahlen und Wahrheitswerte eines Ergebnisses, in der Reihenfolge der Felder - Text (Namen, Labels) bleibt außen vor. */
function zahlen(x: unknown, aus: unknown[] = []): unknown[] {
  if (typeof x === 'number' || typeof x === 'boolean' || x === null) aus.push(x);
  else if (Array.isArray(x)) x.forEach(y => zahlen(y, aus));
  else if (x && typeof x === 'object') Object.values(x).forEach(y => zahlen(y, aus));
  return aus;
}

/* ---------- Daten ---------- */
type DS = { n: number; spalten: Record<string, { typ: 'zahl' | 'gruppe'; werte: (number | null)[]; labels?: string[] }> };
function ausJson(D: DS, o: { ordinal?: string[] } = {}): Sitz {
  const namen = Object.keys(D.spalten);
  const spalten = namen.map(name => {
    const c = D.spalten[name]!;
    return sp(name, { niveau: o.ordinal?.includes(name) ? 'ordinal' : c.typ === 'gruppe' ? 'nominal' : 'metrisch', werteLabels: c.typ === 'gruppe' ? Object.fromEntries(c.labels!.map((l, i) => [String(i + 1), l])) : {} });
  });
  return { spalten, zeilen: Array.from({ length: D.n }, (_, i) => namen.map((n): Wert => D.spalten[n]!.werte[i] ?? null)) };
}
/** Macht eine Gruppen-Spalte (Codes 1 … k mit Labels) zu einer Textspalte mit diesen Labels als Werten. */
function alsText(s: Sitz, name: string, texte: string[]): Sitz {
  const i = s.spalten.findIndex(c => c.name === name);
  return {
    spalten: s.spalten.map((c, j) => (j === i ? { ...c, art: 'text' as const, niveau: 'nominal' as const, werteLabels: {} } : c)),
    zeilen: s.zeilen.map(z => z.map((v, j): Wert => (j === i ? (typeof v === 'number' ? texte[v - 1]! : null) : v)))
  };
}
function lcg(seed: number) { let x = seed; return () => { x = (x * 1664525 + 1013904223) % 4294967296; return x / 4294967296; }; }
const norm = (u: () => number) => Math.sqrt(-2 * Math.log(u() + 1e-12)) * Math.cos(2 * Math.PI * u());

/** Mehrebenen: 12 Gruppen (Text) à 10 Personen, y, x (Zahl), z (Gruppe mit Labels ja/nein). */
function mehrebenenDaten(): Sitz {
  const u = lcg(7), zeilen: Wert[][] = [];
  for (let g = 0; g < 12; g++) { const eff = norm(u) * 3; for (let k = 0; k < 10; k++) { const x = Math.round(norm(u) * 10 + 50), z = u() < 0.5 ? 1 : 2; zeilen.push([`K${String(g + 1).padStart(2, '0')}`, Math.round((50 + 0.4 * x + (z === 2 ? 2 : 0) + eff + norm(u) * 4) * 100) / 100, x, z]); } }
  return { spalten: [sp('klasse', { art: 'text', niveau: 'nominal' }), sp('leistung'), sp('vorwissen'), sp('geschlecht', { niveau: 'nominal', werteLabels: { '1': 'weiblich', '2': 'männlich' } })], zeilen };
}
/** Sechs Fragen (zwei Faktoren), 200 Personen. */
function fragenDaten(): Sitz {
  const u = lcg(11), zeilen: Wert[][] = [];
  for (let i = 0; i < 200; i++) { const a = norm(u), b = 0.4 * a + norm(u); zeilen.push([0.8, 0.7, 0.6].map(l => Math.round((l * a + norm(u) * 0.6) * 100) / 100).concat([0.8, 0.7, 0.6].map(l => Math.round((l * b + norm(u) * 0.6) * 100) / 100))); }
  return { spalten: ['f1', 'f2', 'f3', 'f4', 'f5', 'f6'].map(n => sp(n)), zeilen };
}

describe.skipIf(!da)('Sicherheit: gefährliche Namen, Labels und Textwerte in allen webR-Verfahren (braucht: bash scripts/webr-holen.sh)', () => {
  let server: Server; let r: any; let motor: RMotor;
  const pwned = async () => (await r.evalRBoolean(`exists('.pwned', envir = globalenv())`)) as boolean;
  const entschaerfen = async () => { await r.evalRVoid(`if (exists('.pwned', envir = globalenv())) rm('.pwned', envir = globalenv())`); };
  /** Zwei Läufe mit denselben Daten, harmlos und gefährlich: gleiche Zahlen, nichts ausgeführt. */
  async function gleich<T>(f: (q: Quelle, b?: ReturnType<typeof boes>) => Promise<T>, harmlos: Sitz) {
    await entschaerfen();
    const a = await f(harmlos);
    const b = boes(harmlos);
    const c = await f(b, b);
    expect(await pwned(), 'die Falle hat ausgelöst: Code aus den Daten wurde ausgeführt').toBe(false);
    expect(zahlen(c).length, 'es kamen Zahlen zurück').toBeGreaterThan(5);
    expect(zahlen(c)).toEqual(zahlen(a));
    return { a, c };
  }

  beforeAll(async () => {
    server = createServer((req, res) => {
      const f = join(webrOrdner, 'repo', decodeURIComponent((req.url ?? '/').split('?')[0]!));
      if (!existsSync(f)) { res.statusCode = 404; res.end(); return; }
      createReadStream(f).pipe(res);
    });
    await new Promise<void>(ok => server.listen(0, ok));
    const port = (server.address() as { port: number }).port;
    const { WebR } = await import(/* @vite-ignore */ pathToFileURL(join(webrOrdner, 'webr.mjs')).href) as { WebR: new (o: object) => any };
    r = new WebR({ baseUrl: webrOrdner + '/', repoUrl: `http://localhost:${port}/`, channelType: 3 });
    await r.init(); await r.evalRVoid(R_START);
    await r.installPackages(PAKETE, { quiet: true });
    motor = rMotor();
    motor.einhaengen(r, PAKETE);
  }, 900000);
  afterAll(() => { r?.close?.(); server?.close(); });

  it('Messlatte: die Falle löst aus, wenn Text als Code ausgewertet wird - und der Nachweis sieht es', async () => {
    await entschaerfen();
    expect(await pwned()).toBe(false);
    // 1. direkte Ausführung (der Fehler, den es zu verhindern gilt)
    await r.evalRVoid(FALLE);
    expect(await pwned()).toBe(true);
    await entschaerfen();
    // 2. R wertet Namen in Formeln als Ausdrücke aus: ein "Spaltenname" mit Aufruf löst bei model.frame aus
    await r.evalRVoid(`invisible(stats::model.frame(stats::reformulate("rep(${FALLE}, 3)", 'y'), data.frame(y = 1:3)))`);
    expect(await pwned(), 'reformulate + model.frame führt Namen aus (darum sp_id)').toBe(true);
    await entschaerfen();
    expect(await pwned()).toBe(false);
  });

  it('RMotor.daten lehnt jeden Namen ab, der nicht /^[A-Za-z][A-Za-z0-9_.]*$/ ist; doppelte Namen auch', async () => {
    await entschaerfen();
    for (const g of GEFAHR) {
      await expect(motor.daten('d', [{ name: g, art: 'zahl', werte: [1, 2] }])).rejects.toThrow(/Unsicher/);
      await expect(motor.daten(g, [{ name: 'y', art: 'zahl', werte: [1, 2] }])).rejects.toThrow(/Unsicher/);
    }
    for (const n of ['a b', 'a`b', "a'b", 'a\nb', '1a', '.a', '_a', 'a-b', 'ä', 'if', 'NULL', '', 'a'.repeat(65), 'a\n']) await expect(motor.daten('d', [{ name: n, art: 'zahl', werte: [1] }])).rejects.toThrow();
    await expect(motor.daten('d', [{ name: 'y', art: 'zahl', werte: [1] }, { name: 'y', art: 'zahl', werte: [2] }])).rejects.toThrow(/Doppelt/);
    expect(await pwned()).toBe(false);
    await motor.daten('d', [{ name: 'p01', art: 'zahl', werte: [1, 2] }, { name: 'y.1_a', art: 'text', werte: ['x', null] }]);   // gültige Namen gehen
    expect(await r.evalRBoolean('is.data.frame(d)')).toBe(true);
  });

  it('RMotor.rechne: Argumente (Text) werden nur als Objekte gebunden, nie ausgewertet - auch mit Backtick, Zeilenumbruch, Klammern', async () => {
    await entschaerfen();
    for (const g of GEFAHR) {
      const o = await motor.rechne<{ n: number[]; gleich: boolean[]; liste: number[] }>(`list(n = nchar(.sp_arg$t, 'chars'), gleich = identical(.sp_arg$t, .sp_arg$t), liste = length(.sp_arg$l))`, { t: g, l: [g, g + g] });
      expect(o.n[0]).toBe([...g].length); expect(o.gleich[0]).toBe(true); expect(o.liste[0] ?? o.liste).toBe(2);
      expect(await pwned()).toBe(false);
    }
    // Argumentnamen sind Bezeichner
    await expect(motor.rechne('1', { ['a`b']: 'x' })).rejects.toThrow(/Unsicher/);
    await expect(motor.rechne('1', { a: 5 as unknown as string })).rejects.toThrow();
    // nach dem Lauf ist `.sp_arg` weg
    expect(await r.evalRBoolean(`exists('.sp_arg', envir = globalenv())`)).toBe(false);
  });

  it('R-Seite: sp_id lehnt gefährliche Namen in allen Verfahren ab (zweite Sperre), nichts läuft', async () => {
    await entschaerfen();
    await motor.rechne(`{ ${STATABLE_R}\nTRUE }`);
    await motor.rechne(`{ ${STATABLE_VORHERSAGE_E_R}\nTRUE }`);
    const d = `data.frame(y = c(1, 2, 3, 1, 2, 3), p01 = c(1, 2, 3, 4, 5, 7), zeit = c(1, 2, 3, 4, 5, 6), ereignis = c(1, 0, 1, 1, 0, 1))`;
    for (const g of GEFAHR) {
      const gs = `.sp_arg$g`;
      for (const aufruf of [
        `sp_ordreg(${d}, 'y', ${gs}, character(0), NULL)`, `sp_multreg(${d}, ${gs}, 'p01', character(0), 'a', NULL)`, `sp_zaehlreg(${d}, 'y', 'p01', character(0), 'auto', ${gs})`,
        `sp_cox(${d}, ${gs}, 'ereignis', 'p01')`, `sp_cox(${d}, 'zeit', 'ereignis', ${gs})`, `tryCatch(sp_mehrebenen(${d}, ${gs}, ''), error = function(e) list(fehler = conditionMessage(e)))`,
        `tryCatch(sp_mehrebenen(${d}, 'p01', ${gs}), error = function(e) list(fehler = conditionMessage(e)))`,
        `sp_quantil(${d}, ${gs}, 'p01', character(0), c(0.5), 'nid', 100L, 1L)`, `sp_quantil(${d}, 'y', ${gs}, character(0), c(0.5), 'nid', 100L, 1L)`, `sp_quantil(${d}, 'y', 'p01', ${gs}, c(0.5), 'nid', 100L, 1L)`,
        `sp_glmnet(${d}, ${gs}, c('p01', 'zeit', 'ereignis'), character(0), 1, list(c(1L, 2L, 1L, 2L, 1L, 2L)), 'se1', TRUE)`, `sp_glmnet(${d}, 'y', ${gs}, character(0), 1, list(c(1L, 2L, 1L, 2L, 1L, 2L)), 'se1', TRUE)`
      ]) {
        const o = await motor.rechne<{ fehler: string[] | string }>(aufruf, { g });
        expect(String(o.fehler), aufruf).toMatch(/unsafe name/);
        expect(await pwned()).toBe(false);
      }
    }
    for (const art of GEFAHR) {
      const o = await motor.rechne<{ fehler?: string }>(`tryCatch(sp_meta(data.frame(yi = 1:3, sei = c(.1, .2, .3)), .sp_arg$a), error = function(e) list(fehler = conditionMessage(e)))`, { a: art });
      expect(String(o.fehler)).toMatch(/arg/i);
    }
    expect(await pwned()).toBe(false);
  });

  it('ordinale Regression: gefährliche Spaltennamen, Wertelabels der Zielstufen und Gruppen', async () => {
    const h = ausJson((ERW3 as unknown as { datensaetze: Record<string, DS> }).datensaetze.ordinal_eigen!, { ordinal: ['y'] });
    const { a } = await gleich((q, b) => ordregRechnen(b ? b.name('y') : 'y', (b ? [b.name('x'), b.name('g')] : ['x', 'g']), q), h);
    expect(a.n).toBeGreaterThan(100);
  }, 300000);

  it('multinomiale Regression: gefährliche Referenzkategorie, Zielstufen, Namen und Labels', async () => {
    const h = ausJson((ERW3 as unknown as { datensaetze: Record<string, DS> }).datensaetze.multi_eigen!);
    const gefahrLabel = (b: ReturnType<typeof boes> | undefined, name: string, code: string) => (b ? b.spalten.find(c => c.name === b.name(name))!.werteLabels[code]! : h.spalten.find(c => c.name === name)!.werteLabels[code]!);
    const { a } = await gleich((q, b) => multregRechnen(b ? b.name('v') : 'v', b ? [b.name('alter'), b.name('w')] : ['alter', 'w'], gefahrLabel(b, 'v', '2'), q), h);
    expect(a.referenz).toBe('Rad');
  }, 300000);

  it('Zähldaten-Regression: gefährliche Namen (auch die Beobachtungszeit) und Gruppenlabels', async () => {
    const h = ausJson((ERW3 as unknown as { datensaetze: Record<string, DS> }).datensaetze.zaehl_offset!);
    for (const modell of ['auto', 'poisson', 'negbin'] as const) {
      const { a } = await gleich((q, b) => zaehlregRechnen(b ? b.name('y') : 'y', b ? [b.name('x'), b.name('g')] : ['x', 'g'], { modell, zeit: b ? b.name('zeit') : 'zeit' }, q), h);
      expect(a.offset).toBe('zeit');
    }
  }, 300000);

  it('Cox-Regression: gefährliche Namen, Gruppenlabels, Textwerte der Ereignisspalte und Ereigniswert', async () => {
    const h = ausJson((ERW7 as unknown as { cox: { datensaetze: Record<string, DS> } }).cox.datensaetze.gebunden!);
    const { a } = await gleich((q, b) => coxRechnen(b ? b.name('zeit') : 'zeit', b ? b.name('ereignis') : 'ereignis', 1, b ? [b.name('gruppe'), b.name('x')] : ['gruppe', 'x'], q), h);
    expect(a.ereignisse).toBeGreaterThan(10);
    // Ereignisspalte (ja/nein) und Gruppe als Text, Ereigniswert ein Text
    const i = h.spalten.findIndex(c => c.name === 'ereignis');
    const zeilen = h.zeilen.map((z): Wert[] => z.map((v, j): Wert => (j === i ? (v === 1 ? 'ja' : v === 0 ? 'nein' : null) : v)));
    const sitz: Sitz = alsText({ spalten: h.spalten.map((c, j) => (j === i ? { ...c, art: 'text' as const, niveau: 'nominal' as const, werteLabels: {} } : c)), zeilen }, 'gruppe', ['A', 'B', 'C']);
    await entschaerfen();
    const ok = await coxRechnen('zeit', 'ereignis', 'ja', ['gruppe', 'x'], sitz);
    const b = boes(sitz);
    const ew = 'ja' + GEFAHR[(i + 3) % GEFAHR.length];
    const bos = await coxRechnen(b.name('zeit'), b.name('ereignis'), ew, [b.name('gruppe'), b.name('x')], b);
    expect(await pwned()).toBe(false);
    expect(zahlen(bos)).toEqual(zahlen(ok));
    expect(zahlen(ok)).toEqual(zahlen(a));   // Text- und Zahlenspalte rechnen dasselbe
  }, 300000);

  it('AFT-Modell und Cox mit Kennung (Später S-F2): Spaltennamen voller Anführungszeichen, Gruppenlabels und Textkennung - gleiche Zahlen wie mit harmlosen, nichts ausgeführt', async () => {
    const h0 = ausJson((ERW7 as unknown as { cox: { datensaetze: Record<string, DS> } }).cox.datensaetze.gebunden!);
    // eine Kennung als Text: je drei Zeilen gehören zusammen (die Textwerte bekommen im gefährlichen Lauf ebenfalls einen Baustein)
    const h: Sitz = { spalten: [...h0.spalten, sp('kennung', { art: 'text', niveau: 'nominal' })], zeilen: h0.zeilen.map((z, i): Wert[] => [...z, `k${Math.floor(i / 3)}`]) };
    const iz = h.spalten.findIndex(c => c.name === 'zeit');
    expect(h.zeilen.every(z => typeof z[iz] === 'number' && (z[iz] as number) > 0), 'AFT braucht Zeiten über 0').toBe(true);
    await entschaerfen();
    const bestimme = (b?: ReturnType<typeof boes>) => { const n = (a: string) => (b ? b.name(a) : a); return { zeit: n('zeit'), ereignis: n('ereignis'), praed: [n('gruppe'), n('x')], kennung: n('kennung') }; };
    for (const dist of ['weibull', 'lognormal'] as const) {
      const { a } = await gleich((q, b) => { const w = bestimme(b); return aftRechnen(w.zeit, w.ereignis, 1, w.praed, dist, q); }, h);
      expect(a.ereignisse).toBeGreaterThan(10); expect(a.vergleich).toHaveLength(4);
    }
    for (const art of ['cluster', 'gamma'] as const) {
      const { a } = await gleich((q, b) => { const w = bestimme(b); return frailtyRechnen(w.zeit, w.ereignis, 1, w.kennung, w.praed, art, 'efron', q); }, h);
      expect(a.gruppen).toBeGreaterThan(5);
    }
    expect(await pwned()).toBe(false);
  }, 300000);

  it('Meta-Analyse: gefährliche Studiennamen und Maßbezeichnung; ein gefährliches Maß (art) wird abgelehnt, nichts läuft', async () => {
    const ein = (art: 'es' | 'smd' | 'r', zeilen: number[][], namen: string[]): MetaEingabe => ({ art, massName: GEFAHR[0]!, verhaeltnis: false, kh: true, namen, zeilen });
    const S = GEFAHR.slice(0, 6);
    await entschaerfen();
    const a1 = await metaRechnen(ein('es', [[0.2, 0.1], [0.5, 0.2], [0.35, 0.15], [0.1, 0.12], [0.6, 0.25], [0.3, 0.1]], ['a', 'b', 'c', 'd', 'e', 'f']));
    const b1 = await metaRechnen(ein('es', [[0.2, 0.1], [0.5, 0.2], [0.35, 0.15], [0.1, 0.12], [0.6, 0.25], [0.3, 0.1]], S));
    const a2 = await metaRechnen(ein('smd', [[10, 2, 20, 12, 2, 20], [11, 3, 25, 12, 3, 25], [9, 2.5, 30, 10.5, 2.5, 30], [10, 2, 22, 11, 2, 21]], ['a', 'b', 'c', 'd']));
    const b2 = await metaRechnen(ein('smd', [[10, 2, 20, 12, 2, 20], [11, 3, 25, 12, 3, 25], [9, 2.5, 30, 10.5, 2.5, 30], [10, 2, 22, 11, 2, 21]], S.slice(0, 4)));
    const a3 = await metaRechnen(ein('r', [[0.3, 50], [0.4, 80], [0.2, 40], [0.5, 100]], ['a', 'b', 'c', 'd']));
    const b3 = await metaRechnen(ein('r', [[0.3, 50], [0.4, 80], [0.2, 40], [0.5, 100]], S.slice(0, 4)));
    expect(await pwned()).toBe(false);
    for (const [x, y] of [[a1, b1], [a2, b2], [a3, b3]] as const) { expect(zahlen(y.studien.map(s => [s.yi, s.sei, s.gewicht])).length).toBeGreaterThan(3); expect(zahlen([y.est, y.se, y.tau2, y.q])).toEqual(zahlen([x.est, x.se, x.tau2, x.q])); }
    for (const g of GEFAHR) {
      await expect(metaRechnen(ein(g as 'es', [[0.2, 0.1], [0.5, 0.2]], ['a', 'b']))).rejects.toThrow();
    }
    expect(await pwned()).toBe(false);
  }, 300000);

  it('Mehrebenen-Modell: gefährliche Namen der Spalten, Gruppenwerte (Text) und Labels; auch mit zufälliger Steigung', async () => {
    const h = mehrebenenDaten();
    for (const opt of [{}, { steigung: 'vorwissen', zentrieren: true }] as { steigung?: string; zentrieren?: boolean }[]) {
      const { a } = await gleich((q, b) => mehrebenenRechnen(b ? b.name('leistung') : 'leistung', b ? b.name('klasse') : 'klasse', b ? [b.name('vorwissen'), b.name('geschlecht')] : ['vorwissen', 'geschlecht'],
        { ...opt, steigung: opt.steigung ? (b ? b.name(opt.steigung) : opt.steigung) : undefined }, q), h);
      expect((a as Mehrebenen).mitPraed).toBe(true);
    }
  }, 600000);

  it('McDonalds Omega: gefährliche Fragennamen (auch mit Bootstrap-Wahl und mehreren Faktoren)', async () => {
    const h = fragenDaten();
    await gleich((q, b) => omegaRechnen(b ? h.spalten.map(c => b.name(c.name)) : h.spalten.map(c => c.name), { nf: 2 }, q), h);
    await gleich((q, b) => omegaRechnen((b ? h.spalten.map(c => b.name(c.name)) : h.spalten.map(c => c.name)).slice(0, 4), { fiml: true }, q), h);
  }, 600000);

  it('Konfirmatorische Faktorenanalyse: gefährliche Fragen- und Faktornamen', async () => {
    const h = fragenDaten();
    await gleich((q, b) => {
      const n = (a: string) => (b ? b.name(a) : a);
      return cfaRechnen([{ name: GEFAHR[0]! + 'F1', fragen: ['f1', 'f2', 'f3'].map(n) }, { name: GEFAHR[1]! + 'F2', fragen: ['f4', 'f5', 'f6'].map(n) }], {}, q);
    }, h);
  }, 600000);

  /* ---------- Später S-E (Bauer B): Clusteranalyse (Ward, k-Means) ---------- */
  /** iris (150 Fälle, vier Zahlen) und eine Zahl mit Lücken; die Namen der Spalten sind Unsinn mit Anführungszeichen, wenn `boes` greift. */
  function clusterSitz(): Sitz {
    const D = (ERW_E as unknown as { daten: { iris: Record<string, number[]> } }).daten.iris;
    const namen = ['laenge_kelch', 'breite_kelch', 'laenge_blatt', 'breite_blatt'];
    const zeilen = D[namen[0]!]!.map((_, i): Wert[] => namen.map(n => D[n]![i]!));
    zeilen[3]![1] = null; zeilen[40]![2] = null;
    return { spalten: namen.map(n => sp(n)), zeilen };
  }
  it('Clusteranalyse, R-Seite: sp_id lehnt gefährliche Namen der Merkmale ab, nichts läuft', async () => {
    await entschaerfen();
    await motor.rechne(`{ ${STATABLE_R}\nTRUE }`); await motor.rechne(`{ ${STATABLE_ZEITCLUSTER_R}\nTRUE }`);
    const d = `data.frame(v1 = c(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12), v2 = c(2, 1, 4, 3, 6, 5, 8, 7, 10, 9, 12, 11))`;
    for (const g of GEFAHR) {
      for (const aufruf of [`sp_cluster_ward(${d}, ${`.sp_arg$g`}, TRUE, c(2L))`, `sp_cluster_kmeans(${d}, ${`.sp_arg$g`}, TRUE, 2L, 5L, 1L, NULL)`]) {
        const o = await motor.rechne<{ fehler: string[] | string }>(aufruf, { g });
        expect(String(o.fehler), aufruf).toMatch(/unsafe name/);
        expect(await pwned()).toBe(false);
      }
    }
  });
  it('Clusteranalyse (Ward und k-Means): gefährliche Namen der Merkmale - gleiche Zahlen, nichts ausgeführt', async () => {
    const h = clusterSitz();
    for (const verfahren of ['ward', 'kmeans'] as const) {
      const { a } = await gleich((q, b) => clusterBerechnen(h.spalten.map(c => (b ? b.name(c.name) : c.name)), { verfahren, standardisiert: true }, q), h);
      expect(a.ks.length, verfahren).toBeGreaterThan(3); expect(a.n).toBe(148); expect(a.ausgelassen).toBe(2);
    }
  }, 600000);

  it('Prognose, R-Seite: Text an der Stelle der Reihe löst nichts aus (die Prognose nimmt nur Zahlen, nie Namen)', async () => {
    await entschaerfen();
    await motor.rechne(`{ ${STATABLE_PROGNOSE_R}\nTRUE }`);
    for (const g of GEFAHR) {
      for (const aufruf of [`sp_prognose_arima(.sp_arg$g, 1L, 3L, FALSE, FALSE, 0L, 1L, 1L, 0L, 0L, 0L, FALSE, 0L)`, `sp_prognose_glaettung(.sp_arg$g, 1L, 3L, 'einfach', 0L)`]) {
        const o = await motor.rechne<{ fehler: string[] | string }>(aufruf, { g });
        expect(['r-fehler', 'nicht-konvergiert'], aufruf).toContain(String(o.fehler));   // Text statt Zahlen: ein Fehlerkennwort, nie ein Absturz und nie Ausführung
        expect(await pwned()).toBe(false);
      }
    }
  }, 600000);

  it('Maßnahme und Granger, R-Seite: Text an der Stelle der Reihe löst nichts aus (nur Zahlen, nie Namen)', async () => {
    await entschaerfen();
    await motor.rechne(`{ ${STATABLE_PROGNOSE_R}\nTRUE }`);
    for (const g of GEFAHR) {
      for (const aufruf of [`sp_massnahme(.sp_arg$g, 1L, 3L, 'stufe', FALSE, 0L, 1L, 1L, 0L, 0L, 0L, FALSE, 3L)`, `sp_massnahme_vorschlag(.sp_arg$g, 1L, 3L, FALSE)`, `sp_granger(.sp_arg$g, .sp_arg$g, 3L)`, `sp_granger(1:40, .sp_arg$g, 3L)`]) {
        const o = await motor.rechne<{ fehler: string[] | string }>(aufruf, { g });
        expect(['r-fehler', 'nicht-konvergiert', 'rand', 'zu-kurz', 'konstant', 'luecken-nur-selbst', 'laenge'], aufruf).toContain(String(o.fehler));   // Text statt Zahlen: ein Fehlerkennwort, nie ein Absturz und nie Ausführung
        expect(await pwned()).toBe(false);
      }
    }
  }, 600000);

  it('Glättung (ETS) und Modell auf neue Daten, R-Seite: Text an der Stelle der Reihe und der Koeffizienten löst nichts aus (nur Zahlen, nie Namen)', async () => {
    await entschaerfen();
    await motor.rechne(`{ ${STATABLE_PROGNOSE_R}
TRUE }`);
    await motor.rechne(`{ ${STATABLE_GLAETTUNG_R}
TRUE }`);
    for (const g of GEFAHR) {
      for (const aufruf of [`sp_prognose_ets(.sp_arg$g, 1L, 3L, 'AAdN', 0L)`, `sp_prognose_ets(rep(.sp_arg$g, 30), 1L, 3L, 'AAdN', 5L)`, `sp_prognose_ets_auto(.sp_arg$g, 1L, 3L, 0L)`, `sp_prognose_ets_auto(rep(.sp_arg$g, 30), 12L, 3L, 0L)`,
        `sp_prognose_neu(.sp_arg$g, 1L, 3L, FALSE, 1L, 1L, 0L, 0L, 0L, 0L, FALSE, c(0.3))`, `sp_prognose_neu(rep(.sp_arg$g, 30), 1L, 3L, FALSE, 1L, 1L, 0L, 0L, 0L, 0L, FALSE, c(0.3))`, `sp_prognose_neu(1:40 + 0, 1L, 3L, FALSE, 1L, 1L, 0L, 0L, 0L, 0L, FALSE, .sp_arg$g)`]) {
        const o = await motor.rechne<{ fehler: string[] | string }>(aufruf, { g });
        expect(['r-fehler', 'nicht-konvergiert', 'kein-modell', 'zu-kurz', 'modell-passt-nicht', 'zu-kurz-saison'], aufruf).toContain(String(o.fehler));   // Text statt Zahlen: ein Fehlerkennwort, nie ein Absturz und nie Ausführung
        expect(await pwned()).toBe(false);
      }
      // die Automatik in Schritten: Text statt Zahlen gibt kein Modell, nie Ausführung; ein Modell außerhalb der Liste wird abgelehnt
      const st = await motor.rechne<{ k: string[] }>(`sp_ets_start(rep(.sp_arg$g, 30), 1L)`, { g });
      expect(st.k).toEqual(['ANN', 'AAN', 'AAdN']);
      const k = await motor.rechne<{ fehler?: string; aicc?: unknown }>(`sp_ets_kandidat(rep(.sp_arg$g, 30), 1L, 'ANN')`, { g });
      expect(k.fehler).toBeUndefined();
      expect(String((await motor.rechne<{ fehler: string }>(`sp_ets_ende(rep(.sp_arg$g, 30), 1L, 3L, 0L)`, { g })).fehler)).toBe('kein-modell');
      expect(String((await motor.rechne<{ fehler: string }>(`sp_ets_kandidat(1:30 + 0, 1L, .sp_arg$g)`, { g })).fehler)).toBe('r-fehler');
      expect(await pwned()).toBe(false);
    }
  }, 600000);

  /* ---------- Später S-D2: die fünf Umfrage-Arten (survey) ---------- */
  /** apistrat (200 Schulen): Zahlen, ein Text (stype), Gruppen mit Labels, Gewicht pw, 0/1-Ziel. */
  function umfrageSitz(): Sitz {
    const A = (UMFRAGE_ERW as unknown as { daten: { apistrat: { spalten: Record<string, number[]> } } }).daten.apistrat.spalten;
    const spalten = [sp('api00'), sp('stype', { art: 'text', niveau: 'nominal' }), sp('awards', { niveau: 'nominal', werteLabels: { '1': 'nein', '2': 'ja' } }), sp('meals'), sp('ell'), sp('pw'), sp('hoch700', { niveau: 'nominal', werteLabels: { '0': 'nein', '1': 'ja' } })];
    const zeilen = A.api00!.map((_, i): Wert[] => [A.api00![i]!, ['E', 'H', 'M'][A.stype![i]! - 1]!, A.awards![i]!, A.meals![i]!, A.ell![i]!, A.pw![i]!, A.hoch700![i]!]);
    return { spalten, zeilen };
  }
  const UMFRAGE_GEWICHT = { spalte: 'pw', art: 'umfrage' as const, klumpenfrei: true, summe: 6194, zeilen: 200 };
  it('survey, R-Seite: sp_id lehnt gefährliche Namen in den Formeln der Umfrage-Funktionen ab, nichts läuft', async () => {
    await entschaerfen();
    await motor.rechne(`{ ${STATABLE_R}\nTRUE }`); await motor.rechne(`{ ${STATABLE_UMFRAGE_R}\nTRUE }`);
    // eine Tabelle, in der die gefährliche Zeichenkette wirklich ein Spaltenname ist
    const dg = `local({ d <- data.frame(p01 = c(1, 2, 3, 4, 5, 7, 2, 1), w = c(1, 1, 2, 2, 1, 1, 1, 2), b = c(1, 2, 1, 2, 2, 1, 1, 2)); d[[.sp_arg$g]] <- c(1, 2, 3, 1, 2, 3, 5, 4); d })`;
    for (const g of GEFAHR) {
      const gs = `.sp_arg$g`;
      const m = await motor.rechne<{ ergebnisse: { meldung: string[] }[] }>(`sp_umfrage_mittel(${dg}, ${gs}, 'w', NULL, NULL)`, { g });
      expect(String(m.ergebnisse[0]!.meldung), 'mittel').toMatch(/unsafe name/);
      const a = await motor.rechne<{ meldung: string[] }>(`sp_umfrage_anteil(${dg}, ${gs}, 'w', NULL, NULL)`, { g });
      expect(String(a.meldung), 'anteil').toMatch(/unsafe name/);
      const r2 = await motor.rechne<{ meldung: string[] }>(`sp_umfrage_regression(${dg}, 'p01', ${gs}, FALSE, 'w', NULL)`, { g });
      expect(String(r2.meldung), 'regression Prädiktor').toMatch(/unsafe name/);
      for (const aufruf of [`sp_umfrage_regression(${dg}, ${gs}, 'p01', FALSE, 'w', NULL)`, `sp_umfrage_kreuz(${dg}, ${gs}, 'b', 'w', NULL)`, `sp_umfrage_gruppen(${dg}, ${gs}, 'b', c(1, 2), 'w', NULL)`]) {
        await motor.rechne<unknown>(aufruf, { g });   // rechnet oder meldet einen Fehler - nie eine Ausnahme, nichts ausgeführt
      }
      expect(await pwned()).toBe(false);
    }
  });

  it('survey, Verteilung: gefährliche Namen, Labels und Textwerte - gleiche Zahlen, nichts ausgeführt', async () => {
    const h = umfrageSitz();
    const { a } = await gleich(async (q, b) => {
      const n = (x: string) => (b ? b.name(x) : x), w = q.zeilen.map(z => z[q.spalten.findIndex(c => c.name === n('pw'))] as number), quelle = { spalten: q.spalten, zeilen: q.zeilen, w };
      const e = gewichtetBeschreiben('verteilung', { l1: [n('api00'), n('stype'), n('hoch700')], l2: [] }, quelle, UMFRAGE_GEWICHT);
      return umfrageVerteilungRechnen(e, quelle, 650, 'logit');
    }, h);
    expect(a.mittel!.e.ergebnisse[0].mittel).toBeCloseTo(662.287363, 5); expect(a.anteile.length).toBe(2);
  }, 300000);
  it('survey, Kreuztabelle: gefährliche Namen, Labels und Textwerte - gleiche Zahlen, nichts ausgeführt', async () => {
    const h = umfrageSitz();
    const { a } = await gleich(async (q, b) => {
      const n = (x: string) => (b ? b.name(x) : x), w = q.zeilen.map(z => z[q.spalten.findIndex(c => c.name === n('pw'))] as number), quelle = { spalten: q.spalten, zeilen: q.zeilen, w };
      const e = gewichtetBeschreiben('kreuz', { l1: [n('awards')], l2: [n('stype')] }, quelle, UMFRAGE_GEWICHT);
      return umfrageKreuzRechnen(e, quelle);
    }, h);
    expect(a.e.f).toBeCloseTo(13.6839436, 6);
  }, 300000);
  it('survey, Gruppenvergleich und Regression (linear, logistisch, mit Gruppen-Spalte als Text): gefährliche Namen, Labels und Textwerte - gleiche Zahlen, nichts ausgeführt', async () => {
    const h = umfrageSitz();
    const vorb = (q: Sitz, b?: ReturnType<typeof boes>) => {
      const n = (x: string) => (b ? b.name(x) : x), iw = q.spalten.findIndex(c => c.name === n('pw'));
      const faktor = (nm: string) => regFaktor(q.spalten.find(x => x.name === nm)!, q.zeilen.map(z => z[q.spalten.findIndex(c => c.name === nm)]).filter((v): v is string | number => v !== null), q.spalten.map(x => x.name));
      return { n, w: q.zeilen.map(z => z[iw] as number), faktor };
    };
    const g1 = await gleich((q, b) => { const { n, w } = vorb(q, b); return gruppenRechnen(umfrageRechnen, n('api00'), n('awards'), w, q.zeilen, q.spalten).then(r => r.r); }, h);
    expect(g1.a.test.art).toBe('t');
    const g3 = await gleich((q, b) => { const { n, w } = vorb(q, b); return gruppenRechnen(umfrageRechnen, n('api00'), n('stype'), w, q.zeilen, q.spalten).then(r => r.r); }, h);
    expect(g3.a.test.art).toBe('wald-f');
    const lin = await gleich((q, b) => { const { n, w, faktor } = vorb(q, b); return regressionRechnen(umfrageRechnen, n('api00'), [n('ell'), n('meals'), n('stype')], null, faktor, w, q.zeilen, q.spalten).then(r => r.r); }, h);
    expect(lin.a.koef.length).toBe(5);
    const log = await gleich((q, b) => { const { n, w, faktor } = vorb(q, b); return regressionRechnen(umfrageRechnen, n('hoch700'), [n('ell'), n('meals')], { ereignis: '1', referenz: '0', text: false }, faktor, w, q.zeilen, q.spalten).then(r => r.r); }, h);
    expect(log.a.koef.length).toBe(3);
  }, 600000);


  /** Daten der Später-S-E-Tests (Quantil, Strafregression) als Sitzung: Zahlen-Spalten und eine Gruppen-Spalte mit Beschriftungen. */
  function eDaten(ds: string, zahlSp: string[], gruppe: string, ziel: string): Sitz {
    const D = (ERWE as unknown as { daten: Record<string, Record<string, (number | null)[]>>; gruppen_labels: Record<string, string[]> }).daten[ds]!;
    const lab = (ERWE as unknown as { gruppen_labels: Record<string, string[]> }).gruppen_labels[gruppe]!, namen = [ziel, ...zahlSp, gruppe], n = D[ziel]!.length;
    return { spalten: namen.map(c => (c === gruppe ? sp(c, { niveau: 'nominal', werteLabels: Object.fromEntries(lab.map((l, i) => [String(i + 1), l])) }) : sp(c))), zeilen: Array.from({ length: n }, (_, i) => namen.map((c): Wert => D[c]![i] ?? null)) };
  }

  it('Quantilregression: gefährliche Spaltennamen und Gruppenlabels - gleiche Zahlen (Bootstrap und nid), nichts ausgeführt', async () => {
    const h = eDaten('quant', ['bildung', 'alter'], 'gruppe', 'einkommen');
    const { a } = await gleich((q, b) => quantilRechnen(b ? b.name('einkommen') : 'einkommen', b ? [b.name('bildung'), b.name('gruppe')] : ['bildung', 'gruppe'], { tau: [0.5], ki: 'standard' }, q), h);
    expect(a.ki).toBe('bootstrap'); expect(a.n).toBe(149);   // alter wird hier nicht gebraucht: nur die eine Lücke im Einkommen zählt
    const { a: r } = await gleich((q, b) => quantilRechnen(b ? b.name('einkommen') : 'einkommen', b ? [b.name('bildung'), b.name('alter')] : ['bildung', 'alter'], { tau: [0.25, 0.75], ki: 'rang' }, q), h);
    expect(r.ki).toBe('rang');
  }, 300000);

  it('Strafregression: gefährliche Spaltennamen und Gruppenlabels, Faltungen als Text-Argumente - gleiche Zahlen, nichts ausgeführt', async () => {
    const h = eDaten('vorhersage_glm', ['X1', 'X2', 'X3', 'X5'], 'gr', 'y');
    const { a } = await gleich((q, b) => strafRechnen(b ? b.name('y') : 'y', b ? ['X1', 'X2', 'X3', 'X5', 'gr'].map(c => b.name(c)) : ['X1', 'X2', 'X3', 'X5', 'gr'], { alpha: 1, regel: 'se1', standardisieren: true }, q), h);
    expect(a.n).toBe(120); expect(a.K).toBe(10);
  }, 300000);

  it('Cox mit zeitabhängiger Größe (Später S-F): gefährliche Kennungen, Größennamen und Spaltennamen - gleiche Zahlen wie mit harmlosen, nichts ausgeführt', async () => {
    await entschaerfen();
    const J0 = (ERW_F as unknown as { coxzeit: { umformer: { jasa: { eingabe: Record<string, (number | null)[]> } } } }).coxzeit.umformer.jasa.eingabe;
    const lauf = async (kennung: (string | number | null)[], wert: string, fest: [string, string, string]) => {
      const u = umformenWechsel({ kennung, ende: J0.ende!, ereignis: J0.ereignis!, wechsel: J0.wechsel!, fest: { [fest[0]]: J0.age!, [fest[1]]: J0.surgery!, [fest[2]]: J0.year! } }, { regel: 'zaehlt' });
      if (!u.ok) throw new Error('Umformer');
      return coxZpRechnen(u.zeilen, { wertName: wert, festNamen: fest });
    };
    const a = await lauf(J0.kennung!, 'Transplantation', ['Alter', 'Operation', 'Jahr']);
    const b = await lauf(J0.kennung!.map((k, i) => `${GEFAHR[i % GEFAHR.length]}_${k}`), GEFAHR[0]!, [GEFAHR[1]!, GEFAHR[2]!, GEFAHR[3]!]);
    expect(await pwned(), 'die Falle hat ausgelöst: Code aus den Daten wurde ausgeführt').toBe(false);
    expect(a.n).toBe(170); expect(a.ereignisse).toBe(75); expect(zahlen(a).length).toBeGreaterThan(20);
    expect(zahlen(b)).toEqual(zahlen(a));
  }, 300000);

  /* ---------- Kurs-Paket (Fachblatt KURSPAKET): Diskriminanz, loglineare Modelle, MANOVA, Probit, gewichtete Regression ---------- */
  /** iris (150 Fälle, vier Zahlen) mit Gruppe, zwei weiteren Kategorien, einer Ja/Nein-Zielgröße und einem Präzisionsgewicht; eine Lücke. */
  function kursSitz(): Sitz {
    const D = (ERW_E as unknown as { daten: { iris: Record<string, number[]> } }).daten.iris;
    const num = ['laenge_kelch', 'breite_kelch', 'laenge_blatt', 'breite_blatt'];
    const zeilen = D[num[0]!]!.map((_, i): Wert[] => [...num.map(n => D[n]![i]!), ['setosa', 'versi', 'virgi'][Math.floor(i / 50)]!, i % 2 ? 'ja' : 'nein', ['rot', 'gruen', 'blau', 'gelb', 'weiss'][i % 5]!, i % 7 < 3 ? 1 : 0, 1 + (i % 4) * 0.5]);
    zeilen[7]![0] = null;
    return { spalten: [...num.map(n => sp(n)), sp('gruppe', { art: 'text', niveau: 'nominal' }), sp('f2', { art: 'text', niveau: 'nominal' }), sp('f3', { art: 'text', niveau: 'nominal' }), sp('ziel'), sp('gewicht')], zeilen };
  }
  it('Kurs-Paket, R-Seite: sp_id lehnt gefährliche Namen in allen fünf Verfahren ab (zweite Sperre), nichts läuft', async () => {
    await entschaerfen();
    await motor.rechne(`{ ${STATABLE_R}\nTRUE }`); await motor.rechne(`{ ${STATABLE_KURSPAKET_R}\nTRUE }`);
    const d = `data.frame(g = c('a', 'b', 'a', 'b', 'a', 'b', 'a', 'b', 'a', 'b'), v1 = c(1, 2, 3, 4, 5, 6, 7, 8, 9, 10), v2 = c(2, 1, 4, 3, 6, 5, 8, 7, 10, 9), v3 = c(1, 0, 1, 1, 0, 0, 1, 0, 1, 0), v4 = c(1, 1, 2, 2, 1, 1, 2, 2, 1, 1))`;
    for (const g of GEFAHR) {
      const gs = '.sp_arg$g';
      for (const aufruf of [
        `sp_diskr(${d}, ${gs}, c('v1', 'v2'), NULL)`, `sp_diskr(${d}, 'g', ${gs}, NULL)`,
        `sp_loglin(${d}, ${gs}, NULL, list(list('g')))`, `sp_loglin(${d}, c('g', 'v3'), ${gs}, list(list('g')))`, `sp_loglin(${d}, c('g', 'v3'), NULL, list(list(${gs})))`,
        `sp_manova(${d}, ${gs}, 'g', NULL)`, `sp_manova(${d}, c('v1', 'v2'), ${gs}, NULL)`,
        `sp_probit(${d}, ${gs}, 'v1', character(0))`, `sp_probit(${d}, 'v3', ${gs}, character(0))`, `sp_probit(${d}, 'v3', 'v1', ${gs})`,
        `sp_wls(${d}, ${gs}, 'v1', character(0), 'v4')`, `sp_wls(${d}, 'v2', ${gs}, character(0), 'v4')`, `sp_wls(${d}, 'v2', 'v1', character(0), ${gs})`,
        `sp_nls(${d}, 'potenz', ${gs}, 'v1')`, `sp_nls(${d}, 'potenz', 'v1', ${gs})`
      ]) {
        const o = await motor.rechne<{ fehler: string[] | string }>(aufruf, { g });
        expect(String(o.fehler), aufruf).toMatch(/unsafe name/);
        expect(await pwned()).toBe(false);
      }
    }
  });
  it('Nichtlineare Regression, R-Seite: ein Formelwort außerhalb der festen Auswahl wird abgelehnt (keine freie Formel), nichts läuft', async () => {
    await entschaerfen();
    await motor.rechne(`{ ${STATABLE_R}
TRUE }`); await motor.rechne(`{ ${STATABLE_KURSPAKET_R}
TRUE }`);
    const d = `data.frame(v1 = c(1, 2, 3, 4, 5, 6, 7, 8, 9, 10), v2 = c(2, 1, 4, 3, 6, 5, 8, 7, 10, 9))`;
    for (const g of GEFAHR) {
      const o = await motor.rechne<{ fehler: string[] | string }>(`sp_nls(${d}, .sp_arg$g, 'v1', 'v2')`, { g });
      expect(String(o.fehler), g).toMatch(/unknown formula/);
      expect(await pwned()).toBe(false);
    }
  });
  it('Diskriminanzanalyse und MANOVA: gefährliche Spaltennamen und Textwerte der Gruppe - gleiche Zahlen, nichts ausgeführt', async () => {
    const h = kursSitz(), num = ['laenge_kelch', 'breite_kelch', 'laenge_blatt', 'breite_blatt'];
    const { a } = await gleich((q, b) => diskriminanzRechnen(b ? b.name('gruppe') : 'gruppe', num.map(n => (b ? b.name(n) : n)), q), h);
    expect(a.k).toBe(3); expect(a.ausgelassen).toBe(1);
    const { a: m } = await gleich((q, b) => manovaRechnen(b ? b.name('gruppe') : 'gruppe', num.map(n => (b ? b.name(n) : n)), q), h);
    expect(m.k).toBe(3);
  }, 300000);
  it('Loglineare Modelle: gefährliche Namen und Textwerte der Kategorien - gleiche Zahlen, auch mit eigenem Modell', async () => {
    const h = kursSitz();
    for (const wahl of [{ art: 'zwei', eigen: [] }, { art: 'eigen', eigen: [[0, 1]] }] as LogWahl[]) {
      const { a } = await gleich((q, b) => loglinearRechnen(['gruppe', 'f2', 'f3'].map(n => (b ? b.name(n) : n)), null, wahl, q), h);
      expect(a.zellen).toBe(30);
    }
  }, 300000);
  it('Probit und gewichtete Regression: gefährliche Namen, Gruppenlabels der Vorhersagespalte und Gewichtsspalte - gleiche Zahlen, nichts ausgeführt', async () => {
    const h = kursSitz();
    const { a } = await gleich((q, b) => probitRechnen(b ? b.name('ziel') : 'ziel', (b ? ['laenge_kelch', 'gruppe'].map(n => b.name(n)) : ['laenge_kelch', 'gruppe']), q), h);
    expect(a.n).toBe(149);
    const { a: w } = await gleich((q, b) => wlsRechnen(b ? b.name('laenge_blatt') : 'laenge_blatt', (b ? ['breite_kelch', 'gruppe'].map(n => b.name(n)) : ['breite_kelch', 'gruppe']), b ? b.name('gewicht') : 'gewicht', q), h);
    expect(w.n).toBe(150);
  }, 300000);

  it('Nichtlineare Regression: gefährliche Spaltennamen - gleiche Zahlen, nichts ausgeführt', async () => {
    const h = kursSitz();
    const { a } = await gleich((q, b) => nlsRechnen(b ? b.name('laenge_blatt') : 'laenge_blatt', [b ? b.name('laenge_kelch') : 'laenge_kelch'], 'potenz', q), h);
    expect(a.n).toBe(149); expect(a.ausgelassen).toBe(1);
  }, 300000);

  /* ---------- Abschnitt 3: Armut und Ungleichheit (survey) ---------- */
  /** 120 Haushalte: Einkommen, Gewicht, Klumpen (12 Haushalte-Gruppen, Text) und Schicht (3, Text); die Klumpen liegen verschachtelt in den Schichten. */
  function armutSitz(): Sitz {
    const u = lcg(5), zeilen: Wert[][] = [];
    for (let i = 0; i < 120; i++) zeilen.push([Math.round(Math.exp(9 + norm(u) * 0.6) * 100) / 100, Math.round((1 + u() * 3) * 100) / 100, `K${i % 12}`, `S${i % 3}`]);
    return { spalten: [sp('einkommen'), sp('gewicht'), sp('klumpen', { art: 'text', niveau: 'nominal' }), sp('schicht', { art: 'text', niveau: 'nominal' })], zeilen };
  }
  it('Armut, R-Seite: sp_id lehnt gefährliche Spaltennamen der Daten ab (zweite Sperre), nichts läuft', async () => {
    await entschaerfen();
    await motor.rechne(`{ ${STATABLE_R}\nTRUE }`); await motor.rechne(`{ ${STATABLE_ARMUT_R}\nTRUE }`);
    for (const g of GEFAHR) {
      const o = await motor.rechne<{ fehler: string[] | string }>(`sp_armut(setNames(data.frame(c(1, 2, 3), c(1, 1, 1)), c('e', .sp_arg$g)), FALSE, FALSE)`, { g });
      expect(String(o.fehler)).toMatch(/unsafe name/);
      expect(await pwned()).toBe(false);
    }
  });
  it('Armut: gefährliche Spaltennamen, Wertelabels und Textwerte von Klumpen und Schicht - gleiche Zahlen, nichts ausgeführt', async () => {
    const h = armutSitz();
    const { a } = await gleich((q, b) => armutRechnen(b ? b.name('einkommen') : 'einkommen', b ? b.name('gewicht') : 'gewicht', b ? b.name('klumpen') : 'klumpen', b ? b.name('schicht') : 'schicht', q), h);
    expect(a.n).toBe(120); expect(a.klumpenN).toBe(12); expect(a.schichtN).toBe(3);
    const { a: e } = await gleich((q, b) => armutRechnen(b ? b.name('einkommen') : 'einkommen', b ? b.name('gewicht') : 'gewicht', null, null, q), h);
    expect(e.klumpen).toBeNull();
  }, 300000);

  it('Anzeigecode („Befehl ansehen“): mit gefährlichen Namen und Labels ein gültiges R-Programm ohne fremde Aufrufe - die Namen bleiben ganze Namen', async () => {
    await entschaerfen();
    const ZEIGE = (code: string) => motor.rechne<{ ok: boolean[]; namen: string[]; fremd: string[] }>(`local({
      ex <- tryCatch(parse(text = .sp_arg$code), error = function(e) NULL)
      if (is.null(ex)) return(list(ok = FALSE, namen = character(0), fremd = character(0)))
      alle <- unique(all.names(ex)); fn <- unique(all.names(ex, functions = TRUE))
      list(ok = TRUE, namen = alle, fremd = intersect(alle, c('assign', 'system', 'system2', 'eval', 'parse', 'source', 'writeLines', 'unlink', 'file.remove', 'Sys.setenv', 'download.file')))
    })`, { code });
    const T = (de: string) => de;
    const stufen = ['niedrig' + GEFAHR[0], 'mittel' + GEFAHR[1], 'hoch' + GEFAHR[2]];
    const praed = [{ name: GEFAHR[3]!, art: 'zahl' as const, stufen: [] }, { name: GEFAHR[4]!, art: 'faktor' as const, stufen: [GEFAHR[5]!, GEFAHR[6]!] }];
    const codes: [string, string, string[]][] = [
      ['ordinal', katRCode({ art: 'ordreg', ziel: GEFAHR[7]!, praed, stufen }, T), [GEFAHR[7]!, GEFAHR[3]!, GEFAHR[4]!]],
      ['multinomial', katRCode({ art: 'multreg', ziel: GEFAHR[7]!, praed, stufen, referenz: stufen[1] }, T), [GEFAHR[7]!, GEFAHR[3]!]],
      ['zähl', katRCode({ art: 'zaehlreg', ziel: GEFAHR[7]!, praed, stufen: [], modell: 'negbin', zeit: GEFAHR[2]! }, T), [GEFAHR[7]!, GEFAHR[2]!]],
      ['cox', coxRCode({ zeit: GEFAHR[0]!, ereignis: GEFAHR[1]!, ereignisWert: GEFAHR[2]!, praed }, T), [GEFAHR[0]!, GEFAHR[1]!, GEFAHR[3]!]],
      ['mehrebenen', mebRCode({ y: GEFAHR[0]!, gruppe: GEFAHR[1]!, praed: praed.map(p => ({ name: p.name, art: p.art, stufen: p.stufen })), steigung: GEFAHR[3]!, zentriert: true, mitPraed: true } as unknown as Mehrebenen, T), [GEFAHR[0]!, GEFAHR[1]!, GEFAHR[3]!]],
      ['quantil', quantilRCode({ ziel: GEFAHR[7]!, praed, taus: [0.25, 0.5], ki: 'bootstrap', B: 2000, startwert: 20261008 }), [GEFAHR[7]!, GEFAHR[3]!, GEFAHR[4]!]],
      ['cox zeitabhängig', coxZpRCode({ start: GEFAHR[0]!, stopp: GEFAHR[1]!, ereignis: GEFAHR[2]!, praed: [GEFAHR[3]!, GEFAHR[4]!] }, T), [GEFAHR[0]!, GEFAHR[1]!, GEFAHR[3]!]],
      ['strafregression', strafRCode({ ziel: GEFAHR[7]!, praed, alpha: 1, regel: 'se1', standardisieren: true, K: 10, R: 5, startwert: 20261008 }), [GEFAHR[7]!, GEFAHR[3]!, GEFAHR[4]!]],
      ['diskriminanz', diskrRCode(GEFAHR[0]!, [GEFAHR[3]!, GEFAHR[4]!], 'groesse'), [GEFAHR[0]!]],
      ['loglinear', logRCode([GEFAHR[0]!, GEFAHR[1]!, GEFAHR[2]!], GEFAHR[3]!, logTerme({ art: 'zwei', eigen: [] }, 3)), [GEFAHR[0]!, GEFAHR[1]!, GEFAHR[2]!, GEFAHR[3]!]],
      ['manova', manovaRCode(GEFAHR[0]!, [GEFAHR[3]!, GEFAHR[4]!]), [GEFAHR[0]!]],
      ['probit', probitRCode(GEFAHR[7]!, [GEFAHR[3]!, GEFAHR[4]!]), [GEFAHR[7]!, GEFAHR[3]!, GEFAHR[4]!]],
      ['gewichtete Regression', wlsRCode(GEFAHR[7]!, [GEFAHR[3]!, GEFAHR[4]!], GEFAHR[2]!), [GEFAHR[7]!, GEFAHR[3]!, GEFAHR[4]!, GEFAHR[2]!]],
      ['nichtlineare Regression (Michaelis-Menten)', nlsRCode(GEFAHR[7]!, GEFAHR[3]!, 'michaelis'), [GEFAHR[7]!, GEFAHR[3]!]],
      ['nichtlineare Regression (logistisch)', nlsRCode(GEFAHR[7]!, GEFAHR[3]!, 'logistisch'), [GEFAHR[7]!, GEFAHR[3]!]],
      ['armut', armutRCode(GEFAHR[0]!, GEFAHR[1]!, GEFAHR[2]!, GEFAHR[3]!, 0.5), [GEFAHR[0]!, GEFAHR[1]!, GEFAHR[2]!, GEFAHR[3]!]],
      ['cluster', VERFAHREN.find(v => v.id === 'cluster')!.syntax({ l1: [GEFAHR[0]!, GEFAHR[3]!, GEFAHR[8]!], l2: [], l3: [], l4: [] }, {} as never), []],
      ['meta', metaRCode({ art: 'es', massName: GEFAHR[0]!, verhaeltnis: false, kh: true, namen: [GEFAHR[1]!], zeilen: [[0.1, 0.2], [Number.NaN, 5]] }, T), []]
    ];
    for (const [was, code, namen] of codes) {
      const o = await ZEIGE(code);
      expect(o.ok, `${was}: der angezeigte R-Code lässt sich lesen:\n${code}`).toBeTruthy();
      expect([o.fremd].flat().filter(Boolean), `${was}: kein fremder Aufruf`).toEqual([]);
      for (const n of namen) expect(o.namen, `${was}: der Name steht als ein Name im Code`).toContain(n);
    }
    expect(await pwned()).toBe(false);
    // und der Gegenbeweis für den Fehler, der vorher drin war: ein Backtick im Namen beendete im alten Anzeigecode den Namen
    const alt = (n: string) => (/^[A-Za-z.][A-Za-z0-9._]*$/.test(n) ? n : `\`${n}\``);   // so baute lib/kategreg.ts und lib/cox.ts den Namen bisher
    const bisher = await ZEIGE(`daten$${alt(GEFAHR[8]!)} <- factor(daten$${alt(GEFAHR[8]!)}, levels = c('A', 'B'))`);
    expect([bisher.fremd].flat(), 'Messlatte: der alte Anzeigecode enthielt bei einem Backtick im Namen einen fremden Aufruf').toContain('assign');
  });

  it('Datenübergabe selbst bleibt objektbasiert: gefährliche Textwerte und Labels kommen unverändert in R an', async () => {
    await entschaerfen();
    await motor.daten('d', [
      { name: 'v1', art: 'text', werte: [...GEFAHR, null] },
      { name: 'v2', art: 'faktor', werte: [1, 2, 3, 1, 2, 3, 1, 2, 3, null], labels: GEFAHR.slice(0, 3).map((label, i) => ({ wert: i + 1, label })) },
      { name: 'v3', art: 'zahl', werte: [1, 2, 3, 4, 5, 6, 7, 8, 9, null] }
    ]);
    const o = await motor.rechne<{ txt: string[]; lev: string[]; na: boolean[] }>(`list(txt = d$v1, lev = levels(d$v2), na = is.na(d$v1))`);
    expect(o.txt.slice(0, GEFAHR.length)).toEqual(GEFAHR);
    expect(o.lev).toEqual(GEFAHR.slice(0, 3));
    expect(await pwned()).toBe(false);
  });
});
