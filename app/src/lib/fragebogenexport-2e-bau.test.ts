import { beforeAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { nodeEngine } from './testengine';
import { bedingungAusXls, planAusXlsform, planPruefen, variablenAusPlan, type Bedingung, type Frage, type FragebogenPlan } from './fragebogenplan';
import { alsLimeSurvey, alsPsppSyntax, alsSurveyJs, alsXlsform, fragebogenHtml, fragebogenWord, kodebuchWord } from './fragebogenexport';
import { pruefeDocx } from '../../../scripts/docx-pruefen.mjs';
import { unzipSync, strFromU8 } from 'fflate';

/* Paket 2E, Tests des Bauers für Entscheid 6 (nicht im Prüfer-Testplan): einheit, maxZeichen, zufall, gueltig, Mehrfachantworten-Set (MRSETS), pflicht.meldung,
 * dazu die Sicherheit der Bild-Datei, die Bedingungs-Schreibweise des Rückwegs und die Gegenproben pyxform, survey-core und axe (mit eigenem Browser-Kontext). Nur Regeln, keine Rechen-Sollwerte. */
const DIR = new URL('./testdaten/fragebogenplan/', import.meta.url);
const original = (): FragebogenPlan => JSON.parse(readFileSync(new URL('export-plan.json', DIR), 'utf8'));
const alle = (p: FragebogenPlan) => p.elemente.flatMap(s => s.elemente);
const frage = (p: FragebogenPlan, id: string) => alle(p).find(x => x.id === id) as Frage;

/** Plan mit allen Feldern aus Entscheid 6. */
function mitExtras(): FragebogenPlan {
  const p = original();
  frage(p, 'stunden').zahl!.einheit = { de: 'Stunden', en: 'hours' };
  frage(p, 'alter').zahl!.einheit = { de: 'Jahre', en: 'years' };
  frage(p, 'kommentar').text_ = { mehrzeilig: true, maxZeichen: 200 };
  frage(p, 'rang').zufall = true;
  (alle(p).find(x => x.id === 'zust') as { zufall?: boolean }).zufall = true;
  frage(p, 'tv_nutzung').gueltig = { regel: { frage: 'studium', ist: '=', wert: 1 }, meldung: { de: 'Nur für Eingeschriebene.', en: 'Only for enrolled students.' } };
  frage(p, 'studium').pflicht = { an: true, meldung: { de: 'Bitte antworten.', en: 'Please answer.' } };
  return p;
}

let e: Awaited<ReturnType<typeof nodeEngine>>;
beforeAll(async () => { e = await nodeEngine(); });
const meldungen = (items: ReturnType<typeof e.run>) => items.filter((i: any) => i.type === 'message').map((i: any) => `${i.severity}: ${i.text}`);

function pythonMitPyxform(): string[] | null {
  for (const c of [['py', '-3'], ['python3'], ['python']]) {
    const r = spawnSync(c[0]!, [...c.slice(1), '-c', 'import pyxform'], { encoding: 'utf8' });
    if (!r.error && r.status === 0) return c;
  }
  return null;
}
const PY = pythonMitPyxform();
function pyxform(bytes: Uint8Array) {
  const dir = mkdtempSync(join(tmpdir(), 'statable-xls-bau-'));
  writeFileSync(join(dir, 'form.xlsx'), bytes);
  const r = spawnSync(PY![0]!, [...PY!.slice(1), '-m', 'pyxform.xls2xform', join(dir, 'form.xlsx'), join(dir, 'form.xml'), '--skip_validate'], { encoding: 'utf8', cwd: dir });
  return { status: r.status, text: `${r.stdout}\n${r.stderr}`, xml: existsSync(join(dir, 'form.xml')) ? readFileSync(join(dir, 'form.xml'), 'utf8') : '' };
}
const sauberPyxform = (t: string) => !/Warnings?:/i.test(t) && /Conversion complete/.test(t);
const wordText = (b: Uint8Array) => [...strFromU8(unzipSync(b)['word/document.xml']!).matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)].map(m => m[1]).join('\n');

describe('Entscheid 6: einheit, maxZeichen, zufall, gueltig, pflicht.meldung', () => {
  it('der Plan ist gültig', () => {
    expect(planPruefen(mitExtras()).filter(b => b.art === 'fehler')).toEqual([]);
  });

  it('XLSForm: eigene Spalten und Spaltenköpfe; pyxform ohne Fehler und Warnung; Rückweg bringt alles zurück', async () => {
    const p = mitExtras();
    const bytes = await alsXlsform(p);
    if (PY) { const r = pyxform(bytes); expect(r.status, r.text).toBe(0); expect(sauberPyxform(r.text), r.text).toBe(true); expect(r.xml).toContain('randomize'); }
    else console.warn('ÜBERSPRUNGEN (pyxform-Teil): Python/pyxform fehlt.');
    const { plan: z, meldungen: m } = await planAusXlsform(bytes, 'x.xlsx');
    expect(m.filter(x => x.art === 'relevant' || x.art === 'uebersprungen')).toEqual([]);
    expect((alle(z).find(x => x.id === 'stunden') as Frage).zahl!.einheit).toEqual({ de: 'Stunden', en: 'hours' });
    expect((alle(z).find(x => x.id === 'alter') as Frage).zahl).toMatchObject({ min: 16, max: 99, ganz: true, einheit: { de: 'Jahre', en: 'years' } });
    expect((alle(z).find(x => x.id === 'kommentar') as Frage).text_).toEqual({ mehrzeilig: true, maxZeichen: 200 });
    expect((alle(z).find(x => x.id === 'rang') as Frage).zufall).toBe(true);
    expect((alle(z).find(x => x.id === 'zust') as { zufall?: boolean }).zufall).toBe(true);
    expect((alle(z).find(x => x.id === 'tv_nutzung') as Frage).gueltig).toEqual(frage(p, 'tv_nutzung').gueltig);
    expect((alle(z).find(x => x.id === 'studium') as Frage).pflicht).toEqual({ an: true, meldung: { de: 'Bitte antworten.', en: 'Please answer.' } });
  });

  it('XLSForm: Seite ohne Titel und Fremddateien bleiben wie bisher (keine statable-Spalten, relevant nur als Meldung)', async () => {
    const p = original();
    delete p.elemente[0]!.titel;
    const bytes = await alsXlsform(p);
    if (PY) { const r = pyxform(bytes); expect(r.status, r.text).toBe(0); }
    const { plan: z } = await planAusXlsform(bytes, 'x.xlsx');
    expect(z.elemente[0]!.titel).toBeUndefined();
  });

  it('PSPP: Standard ohne MRSETS; mit mrsets: true ein MDGROUP je Mehrfachfrage, läuft in der Engine ohne Meldung', () => {
    const p = original();
    expect(alsPsppSyntax(p)).not.toContain('MRSETS');
    const s = alsPsppSyntax(p, { mrsets: true });
    expect(s).toContain("MRSETS /MDGROUP NAME=$medien VARIABLES=medien_1 medien_2 medien_3 medien_4 medien_m8 VALUE=1 LABEL='Welche Medien nutzen Sie?'.");
    const v = variablenAusPlan(p);
    e.run(`NEW FILE.\nDATA LIST FREE /${v.map(x => (x.typ === 'zahl' ? `${x.name} (F8.0)` : x.typ === 'text' ? `${x.name} (A255)` : `${x.name} (SDATE10)`)).join(' ')}.\nBEGIN DATA\n${v.map(x => (x.typ === 'zahl' ? '1' : x.typ === 'text' ? "'x'" : '2026-11-08')).join(' ')}\nEND DATA.`);
    expect(meldungen(e.run(s)).filter(x => !/MRSETS is implemented/.test(x))).toEqual([]);
  });

  it('PSPP: Skalenname, der kein Variablenname ist, sperrt den Export; Umpolung ohne Wertebereich steht als Kommentar', () => {
    const p = original();
    p.skalen[0]!.name = 'a b';
    expect(() => alsPsppSyntax(p)).toThrow(/^planFehler/);
    const q = original();
    (alle(q).find(x => x.id === 'zust') as { items: { umgepolt?: boolean }[] }).items[0]!.umgepolt = true;
    expect(alsPsppSyntax(q)).toContain('COMPUTE zust_z1_u = (1 + 5) - zust_z1.');
  });

  it('LimeSurvey: zusätzliche Spalten nur bei Bedarf, jede Zeile hat so viele Zellen wie der Kopf; Standardumfang bleibt bei 19 Spalten', () => {
    expect(alsLimeSurvey(original()).text.split('\n')[0]!.split('\t').length).toBe(19);
    const t = alsLimeSurvey(mitExtras()).text;
    const zeilen = t.split('\n').filter(Boolean).map(z => z.split('\t'));
    const kopf = zeilen[0]!;
    expect(kopf.slice(19)).toEqual(['em_validation_q', 'em_validation_q_tip', 'maximum_chars', 'random_order']);
    for (const z of zeilen) expect(z.length).toBe(kopf.length);
    const q = (n: string) => zeilen.find(z => z[2] === 'Q' && z[4] === n && z[8] === 'de')!;
    expect(q('kommentar')[kopf.indexOf('maximum_chars')]).toBe('200');
    expect(q('rang')[kopf.indexOf('random_order')]).toBe('1');
    expect(q('tvnutzung')[kopf.indexOf('em_validation_q')]).toBe("studium.NAOK == '1'");
    expect(q('stunden')[7]).toBe('(Stunden)');
  });

  it('SurveyJS: survey-core lädt (ohne noneValue), maxLength, Zufall, Prüfregel und Einheit wirken; nicht() filtert', async ctx => {
    const sc = (await import(/* @vite-ignore */ 'survey-core').catch(() => null)) as null | { Model: new (j: unknown) => any };
    if (!sc) { console.warn('ÜBERSPRUNGEN: survey-core fehlt.'); ctx.skip(); return; }
    const p = mitExtras();
    frage(p, 'tv_nutzung').wennGezeigt = { nicht: { oder: [{ frage: 'alter', ist: '<', wert: 5 }, { frage: 'medien', gewaehlt: 2 }] } };
    const j = JSON.parse(JSON.stringify(alsSurveyJs(p)));
    for (const s of j.pages) for (const x of s.elements) delete x.noneValue;   // survey-core 3.2.4 kennt die Eigenschaft nicht (siehe Bericht)
    const m = new sc.Model(j);
    expect(m.jsonErrors ?? []).toEqual([]);
    expect(m.getQuestionByName('kommentar').maxLength).toBe(200);
    expect(m.getQuestionByName('rang').choicesOrder).toBe('random');
    expect(m.getQuestionByName('stunden').description).toContain('Stunden');
    m.setValue('studium', 1); m.setValue('alter', 30); m.setValue('medien', [1]);
    expect(m.getQuestionByName('tv_nutzung').isVisible).toBe(true);
    m.setValue('alter', 3); expect(m.getQuestionByName('tv_nutzung').isVisible).toBe(false);
    m.setValue('alter', 30); m.setValue('medien', [2]); expect(m.getQuestionByName('tv_nutzung').isVisible).toBe(false);
    m.setValue('medien', [1]); m.setValue('studium', 2); m.setValue('tv_nutzung', 1);
    expect(m.getQuestionByName('tv_nutzung').hasErrors(false)).toBe(true);
  });

  it('Sicherheit: Bild-Datei mit Schema oder .. wird nie zu einem <img> (HTML, LimeSurvey, SurveyJS)', async () => {
    for (const datei of ['javascript:alert(1)', 'https://fremd.example/x.png', '../geheim.png', '//fremd.example/x.png']) {
      const p = original();
      (alle(p).find(x => x.id === 'h_bild') as { bild: { datei: string } }).bild.datei = datei;
      expect(fragebogenHtml(p, 'de')).not.toMatch(/<img/i);
      expect(alsLimeSurvey(p).text).not.toContain('<img');
      expect(JSON.stringify(alsSurveyJs(p))).not.toContain('imageLink');
      expect(wordText(await fragebogenWord(p))).toContain(datei);
    }
  });

  it('Sicherheit: Steuerzeichen im Text zerstören weder xlsx noch docx', async () => {
    const p = original();
    p.titel.de = 'Titel\u0000mit\u0001Steuerzeichen\u000b';
    (alle(p).find(x => x.id === 'geb') as Frage).text.de = 'Wann\u0002 geboren?';
    const { plan: z } = await planAusXlsform(await alsXlsform(p), 'x.xlsx');
    expect(z.titel.de).toBe('TitelmitSteuerzeichen');
    expect(pruefeDocx(await fragebogenWord(p))).toEqual([]);
    expect(pruefeDocx(await kodebuchWord(p))).toEqual([]);
  });

  it('Word und HTML: Einheit, Bereich, Pflicht, Filter in Englisch; keine Datei ohne Befund', async () => {
    const p = mitExtras();
    const w = await fragebogenWord(p, { sprache: 'en' });
    expect(pruefeDocx(w)).toEqual([]);
    const t = wordText(w);
    expect(t).toContain('Number from 16 to 99, whole number, unit: years');
    expect(t).toContain('Required question');
    expect(t).toMatch(/Answer only if question 4 = “Yes \(1\)”/);
    expect(fragebogenHtml(p, 'en')).toContain('unit: hours');
  });

  it('Gegenprobe axe (Chromium über Playwright, eigener Kontext): keine Verstöße; sonst übersprungen mit Meldung', async ctx => {
    let browser: any = null;
    try { const { chromium } = await import('@playwright/test'); browser = await chromium.launch(); } catch { /* kein Browser */ }
    if (!browser) { console.warn('ÜBERSPRUNGEN: kein Chromium für Playwright startbar.'); ctx.skip(); return; }
    try {
      const AxeBuilder = (await import('@axe-core/playwright')).default;
      const dir = mkdtempSync(join(tmpdir(), 'statable-html-bau-'));
      for (const s of ['de', 'en']) {
        writeFileSync(join(dir, `f-${s}.html`), fragebogenHtml(mitExtras(), s));
        const context = await browser.newContext();
        const page = await context.newPage();
        await page.goto(`file:///${join(dir, `f-${s}.html`).replace(/\\/g, '/')}`);
        const r = await new AxeBuilder({ page }).analyze();
        expect(r.violations.map((v: { id: string }) => v.id), s).toEqual([]);
        await context.close();
      }
    } finally { await browser.close(); }
  });
});

describe('Bedingungen im XLSForm-Rückweg', () => {
  const fall: [string, Bedingung][] = [
    ["${a} = 1", { frage: 'a', ist: '=', wert: 1 }],
    ["${a} != -2.5", { frage: 'a', ist: '≠', wert: -2.5 }],
    ["selected(${c}, '3')", { frage: 'c', gewaehlt: 3 }],
    ["${a} != ''", { frage: 'a', beantwortet: true }],
    ["not(${a} < 5 or selected(${c}, '2'))", { nicht: { oder: [{ frage: 'a', ist: '<', wert: 5 }, { frage: 'c', gewaehlt: 2 }] } }],
    ["(${b} = 1 and ${a} >= 2) or ${b} = ''", { oder: [{ und: [{ frage: 'b', ist: '=', wert: 1 }, { frage: 'a', ist: '≥', wert: 2 }] }, { frage: 'b', beantwortet: false }] }]
  ];
  it.each(fall)('liest %s', (t, b) => { expect(bedingungAusXls(t)).toEqual(b); });
  it.each(['', '${a} = ', "${a} = 'x'", 'jr:choice-name(${a}, "${a}") = 1', '${a} = 1 and', '(${a} = 1', 'today() > 3', "${a} = 1; DROP"])('lehnt „%s“ ab (null)', t => { expect(bedingungAusXls(t)).toBeNull(); });
});

describe('Sperre', () => {
  it('Listenname mit Leerzeichen und Verweis auf eine fehlende Liste sperren alle Exporte', async () => {
    const p = original(); p.antwortlisten[0]!.name = 'ja nein';
    await expect(alsXlsform(p)).rejects.toThrow(/^planFehler/);
    const q = original(); frage(q, 'studium').liste = 'gibt_es_nicht';
    expect(() => alsLimeSurvey(q)).toThrow(/^planFehler/);
  });
  it('unbekannte Sprache im Aufruf: Fehler, kein stiller Rückfall', async () => {
    expect(() => fragebogenHtml(original(), 'fr')).toThrow(/^sprache/);
    await expect(fragebogenWord(original(), { sprache: 'fr' })).rejects.toThrow(/^sprache/);
    await expect(kodebuchWord(original(), 'fr')).rejects.toThrow(/^sprache/);
  });
});
