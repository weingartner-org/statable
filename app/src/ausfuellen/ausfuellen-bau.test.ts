/**
 * Paket 2B, Tests des Bauers für das, was die Prüfer-Tests nicht abdecken (Entscheid 3 in FACHBLATT-STUFE-2.md):
 * `anders` (Textfeld bei Wahl, mit Namen), Pretest-Kommentar, Bild mit `alt`, `zufall` mit festem Startwert, Knopf „Diese Reihenfolge übernehmen“.
 * Gleiche Testumgebung wie ausfuellen.test.ts (echtes Chromium über Playwright, Bibliothek mit vite gebaut, Hilfen aus testhilfe.ts).
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser, type Page } from '@playwright/test';
import type { Antwortliste, Frage, FragebogenPlan, Lok, Seite } from '../lib/fragebogenplan';
import { baueBibliothek, oeffneSeite, zeichne, lies, ansage } from './testhilfe';

let browser: Browser | null = null;
let code = '';
const offen: Page[] = [];
beforeAll(async () => { code = await baueBibliothek(); browser = await chromium.launch(); }, 120_000);
afterAll(async () => { await browser?.close(); });
afterEach(async () => { while (offen.length) await offen.pop()!.close(); });
async function neu(sprache = 'de'): Promise<Page> { const p = await oeffneSeite(browser!, code, sprache); offen.push(p); return p; }

const zw = (de: string): Lok => ({ de, en: de + ' (en)' });
const liste = (id: string, namen: string[], extra: Partial<Antwortliste> = {}): Antwortliste =>
  ({ id, name: id, geordnet: false, optionen: namen.map((n, i) => ({ id: `${id}:${i + 1}`, wert: i + 1, text: zw(n) })), ...extra });
const frage = (id: string, typ: Frage['typ'], extra: Partial<Frage> = {}): Frage =>
  ({ art: 'frage', id, name: id, typ, text: zw(`Frage ${id}`), kodebuch: { niveau: 'nominal' }, ...extra });
const seite = (id: string, elemente: Seite['elemente']): Seite => ({ art: 'seite', id, name: id, titel: zw(`Titel ${id}`), elemente });
const plan = (seiten: Seite[], pretest = false): FragebogenPlan => ({
  format: 'statable-fragebogen', version: 1, id: 'p', revision: 1, titel: zw('Umfrage'), sprachen: ['de', 'en'],
  einstellungen: { fortschritt: false, zurueck: true, pretest, fehlendFilter: 'code' },
  antwortlisten: [liste('farben', ['Rot', 'Grün', 'Blau']), liste('prio', ['Familie', 'Arbeit', 'Freizeit', 'Gesundheit', 'Geld']),
    liste('viele', Array.from({ length: 20 }, (_, i) => `Option ${i + 1}`))],
  skalen: [], elemente: seiten, geaendert: 1 });

const reihenfolge = (p: Page, id: string) => p.locator(`[data-frage="${id}"] label.opt span`).allInnerTexts();

describe('anders (Anderes, und zwar)', () => {
  const einfach = plan([seite('s', [frage('A', 'einfach', { liste: 'farben', anders: { an: true, text: zw('Andere Farbe') }, pflicht: { an: true } })])]);
  const mehr = plan([seite('s', [frage('M', 'mehrfach', { liste: 'farben', anders: { an: true, text: zw('Anderes') } })])]);
  it('einfach: Textfeld erst bei Wahl sichtbar, hat einen Namen, Antwort = Code über dem höchsten + Text unter <id>:anders', async () => {
    const p = await neu(); await zeichne(p, einfach, 's');
    const feld = p.getByRole('textbox', { name: /Andere Farbe/ });
    expect(await feld.isVisible()).toBe(false);
    await p.getByRole('radio', { name: 'Andere Farbe' }).check();
    expect(await feld.isVisible()).toBe(true);
    // NVDA-Nachmessung Stufe 3 (N1): keine Live-Meldung mehr, der Hinweis steht als Beschreibung an der Option
    expect(await ansage(p)).toBe('');
    expect(await p.getByRole('radio', { name: 'Andere Farbe', exact: true }).getAttribute('aria-describedby')).toBeTruthy();
    expect(await p.getByRole('radio', { name: 'Andere Farbe', exact: true }).evaluate(e => document.getElementById(e.getAttribute('aria-describedby')!.split(' ').pop()!)?.textContent)).toContain('Eingabefeld');
    await feld.fill('Türkis');
    expect(await lies(p)).toEqual({ A: 4, 'A:anders': 'Türkis' });
    await p.getByRole('radio', { name: 'Rot' }).check();
    expect(await feld.isVisible()).toBe(false);
    expect(await lies(p)).toEqual({ A: 1 });
  });
  it('einfach: Rundreise, und Pflicht prüft den Text', async () => {
    const p = await neu(); await zeichne(p, einfach, 's', { A: 4, 'A:anders': 'Lila' });
    expect(await p.getByRole('radio', { name: 'Andere Farbe' }).isChecked()).toBe(true);
    expect(await p.getByRole('textbox', { name: /Andere Farbe/ }).inputValue()).toBe('Lila');
    const f = await p.evaluate(([pl, a]) => { const A = (window as any).Ausfuellen; return A.pruefeSeite(pl, (pl as any).elemente[0], a, 'de'); }, [einfach, { A: 4 }] as const);
    expect(f.map((x: any) => x.id)).toEqual(['A']);
  });
  it('mehrfach: Kästchen mit Textfeld, Code in der Liste', async () => {
    const p = await neu(); await zeichne(p, mehr, 's');
    await p.getByRole('checkbox', { name: 'Rot' }).check();
    await p.getByRole('checkbox', { name: 'Anderes' }).check();
    await p.getByRole('textbox', { name: /Anderes/ }).fill('Gelb');
    expect(await lies(p)).toEqual({ M: [1, 4], 'M:anders': 'Gelb' });
  });
});

describe('Pretest-Kommentar', () => {
  const pl = plan([seite('s', [frage('F', 'text')])], true);
  it('nur im Modus vorschau und nur mit einstellungen.pretest: Textfeld mit Namen, Antwort unter <id>:kommentar', async () => {
    const p = await neu(); await zeichne(p, pl, 's', {}, { modus: 'vorschau' });
    const feld = p.getByRole('textbox', { name: /Kommentar/ });
    expect(await feld.isVisible()).toBe(true);
    await p.getByLabel('Frage F', { exact: true }).fill('Antwort');
    await feld.fill('Unklar formuliert');
    expect(await lies(p)).toEqual({ F: 'Antwort', 'F:kommentar': 'Unklar formuliert' });
    expect((await p.evaluate(() => (window as any).__aend.at(-1)))[1]).toBe('F');
    await zeichne(p, pl, 's', {}, { modus: 'ausfuellen' });
    expect(await p.getByRole('textbox', { name: /Kommentar/ }).count()).toBe(0);
    await zeichne(p, plan([seite('s', [frage('F', 'text')])], false), 's', {}, { modus: 'vorschau' });
    expect(await p.getByRole('textbox', { name: /Kommentar/ }).count()).toBe(0);
  });
});

describe('Bild mit Alternativtext', () => {
  it('Frage mit Bild: img mit alt in der Sprache und src über bildUrl; Antwortoption mit Bild behält den Namen aus dem Text', async () => {
    const pl = plan([seite('s', [frage('F', 'einfach', { liste: 'farben', bild: { datei: 'foto.png', alt: zw('Ein Foto') } })])]);
    pl.antwortlisten[0]!.optionen[0]!.bild = { datei: 'rot.png', alt: zw('Roter Kreis') };
    const p = await neu('en'); await zeichne(p, pl, 's', {}, { sprache: 'en' });
    const bilder = await p.evaluate(() => Array.from(document.querySelectorAll('img')).map(i => ({ alt: i.alt, src: i.getAttribute('src') })));
    expect(bilder).toEqual([{ alt: 'Ein Foto (en)', src: 'bilder/foto.png' }, { alt: 'Roter Kreis (en)', src: 'bilder/rot.png' }]);
    expect(await p.getByRole('radio', { name: 'Rot (en)', exact: true }).isVisible()).toBe(true);
  });
});

describe('zufall mit festem Startwert', () => {
  const pl = plan([seite('s', [
    frage('E', 'einfach', { liste: 'viele', zufall: true }),
    frage('R', 'rangfolge', { liste: 'prio', zufall: true }),
    frage('G', 'einfach', { liste: 'viele' }),
  ])]);
  it('gleicher Startwert = gleiche Reihenfolge, anderer Startwert = andere; ohne zufall bleibt die Listenfolge; Codes bleiben', async () => {
    const p = await neu();
    await zeichne(p, pl, 's', {}, { zufallStart: 7 }); const a = await reihenfolge(p, 'E');
    await zeichne(p, pl, 's', {}, { zufallStart: 7 }); const b = await reihenfolge(p, 'E');
    await zeichne(p, pl, 's', {}, { zufallStart: 8 }); const c = await reihenfolge(p, 'E');
    expect(b).toEqual(a);
    expect(c).not.toEqual(a);
    expect([...a].sort()).toEqual(Array.from({ length: 20 }, (_, i) => `Option ${i + 1}`).sort());
    expect(a).not.toEqual(Array.from({ length: 20 }, (_, i) => `Option ${i + 1}`));
    expect(await reihenfolge(p, 'G')).toEqual(Array.from({ length: 20 }, (_, i) => `Option ${i + 1}`));
    await p.getByRole('radio', { name: 'Option 5', exact: true }).first().check();
    expect(await lies(p)).toEqual({ E: 5 });
  });
  it('Rangfolge: gemischte Ausgangsfolge, Antwort nennt Codes in der gewählten Reihenfolge', async () => {
    const p = await neu(); await zeichne(p, pl, 's', {}, { zufallStart: 3 });
    const start = await p.locator('[data-frage="R"] ol > li').evaluateAll(l => l.map(x => Number((x as HTMLElement).dataset.wert)));
    expect([...start].sort()).toEqual([1, 2, 3, 4, 5]);
    await p.getByRole('button', { name: 'Diese Reihenfolge übernehmen' }).click();
    expect(((await lies(p)).R as number[])).toEqual(start);
  });
});

describe('Knopf „Diese Reihenfolge übernehmen“', () => {
  const pl = plan([seite('s', [frage('R', 'rangfolge', { liste: 'prio', pflicht: { an: true } })])]);
  it('unberührt keine Antwort; der Knopf setzt die Ausgangsfolge als Antwort, sagt es an und löst beiAenderung aus', async () => {
    const p = await neu(); await zeichne(p, pl, 's');
    expect(await lies(p)).toEqual({});
    await p.getByRole('button', { name: 'Diese Reihenfolge übernehmen', exact: true }).click();
    expect(await lies(p)).toEqual({ R: [1, 2, 3, 4, 5] });
    expect(await ansage(p)).toBe('Reihenfolge übernommen');
    expect((await p.evaluate(() => (window as any).__aend.at(-1)))[1]).toBe('R');
  });
  it('Pflicht-Rangfolge: ohne Knopf Fehler, danach geht „Weiter“ durch', async () => {
    const p = await neu(); await zeichne(p, pl, 's');
    await p.getByRole('button', { name: 'Weiter', exact: true }).click();
    expect(await p.locator('[data-fehlerliste] a').count()).toBe(1);
    await p.getByRole('button', { name: 'Diese Reihenfolge übernehmen', exact: true }).click();
    expect(await p.locator('[aria-invalid="true"]').count()).toBe(0);
    await p.getByRole('button', { name: 'Weiter', exact: true }).click();
    expect(await p.evaluate(() => (window as any).__weiter)).toEqual([{ R: [1, 2, 3, 4, 5] }]);
  });
  it('englisch: Knopf „Keep this order“', async () => {
    const p = await neu('en'); await zeichne(p, pl, 's', {}, { sprache: 'en' });
    await p.getByRole('button', { name: 'Keep this order', exact: true }).click();
    expect(await lies(p)).toEqual({ R: [1, 2, 3, 4, 5] });
  });
});

describe('Sicherheit: Plan-Text nur als Text', () => {
  it('HTML im Fragetext wird nicht ausgeführt, sondern als Text gezeigt', async () => {
    const pl = plan([seite('s', [frage('F', 'text', { text: { de: '<img src=x onerror="window.__boese=1">Wie heißen Sie?', en: 'x' } })])]);
    const p = await neu(); await zeichne(p, pl, 's');
    await p.waitForTimeout(200);
    expect(await p.evaluate(() => (window as any).__boese)).toBeUndefined();
    expect(await p.locator('[data-frage="F"] img').count()).toBe(0);
    expect(await p.locator('[data-frage="F"] label').innerText()).toContain('<img src=x');
  });
});

describe('Barrierefreiheit (NVDA-Befunde 1 bis 5)', () => {
  const regler = plan([seite('s', [frage('R', 'regler', { zahl: { min: 1, max: 7, schritt: 1, ganz: true }, pflicht: { an: true } })])]);
  it('Regler unbeantwortet: Daumen in der Mitte, aber keine Antwort, „noch keine Antwort“', async () => {
    const p = await neu(); await zeichne(p, regler, 's');
    const r = await p.evaluate(() => { const g = document.querySelector('[data-frage="R"]')!; const rg = g.querySelector<HTMLInputElement>('input[type=range]')!;
      return { wert: rg.value, text: rg.getAttribute('aria-valuetext'), zahl: g.querySelector<HTMLInputElement>('input[type=number]')!.value }; });
    expect(r).toEqual({ wert: '4', text: 'noch keine Antwort', zahl: '' });
    expect(await lies(p)).toEqual({});
  });
  it('erste Taste setzt die Antwort sofort: Ende = Maximum, Pos1 = Minimum, Pfeil = Mitte ± 1, mit Ansage', async () => {
    for (const [taste, erwartet] of [['End', 7], ['Home', 1], ['ArrowRight', 5], ['ArrowLeft', 3], ['PageUp', 5]] as const) {
      const p = await neu(); await zeichne(p, regler, 's');
      await p.locator('input[type=range]').focus();
      await p.keyboard.press(taste);
      expect(await lies(p)).toEqual({ R: erwartet });
      expect(await ansage(p)).toBe(`${erwartet} von 7`);
      expect(await p.locator('input[type=range]').getAttribute('aria-valuetext')).toBe(`${erwartet} von 7`);
    }
  });
  it('Regler mit Stufen: Ende am unbeantworteten Regler setzt das Maximum mit Optionstext', async () => {
    const pl = plan([seite('s', [frage('RL', 'regler', { liste: 'l5x', zahl: { min: 1, max: 5, schritt: 1, ganz: true } })])]);
    pl.antwortlisten.push(liste('l5x', ['a', 'b', 'c', 'd', 'e']));
    const p = await neu(); await zeichne(p, pl, 's');
    await p.locator('input[type=range]').focus(); await p.keyboard.press('End');
    expect(await lies(p)).toEqual({ RL: 5 });
    expect(await p.locator('input[type=range]').getAttribute('aria-valuetext')).toBe('5 von 5, e');
  });
  it('Klick auf den Regler setzt die Antwort, auch auf der Mitte', async () => {
    const p = await neu(); await zeichne(p, regler, 's');
    await p.locator('input[type=range]').click();
    expect(Object.keys(await lies(p))).toEqual(['R']);
  });
  it('Zahlenfeld heißt „<Fragetext> … Wert als Zahl“', async () => {
    const p = await neu(); await zeichne(p, regler, 's');
    expect(await p.getByRole('spinbutton', { name: /Frage R.*Wert als Zahl/ }).isVisible()).toBe(true);
  });

  const pflichtPlan = plan([seite('s', [frage('A', 'einfach', { liste: 'farben', pflicht: { an: true } })])]);
  it('Pflicht: vor der Prüfung kein aria-invalid, kein Fehlertext; nur ein Radio trägt „erforderlich“; nach „Weiter“ aria-invalid', async () => {
    const p = await neu(); await zeichne(p, pflichtPlan, 's');
    expect(await p.locator('[aria-invalid]').count()).toBe(0);
    expect(await p.locator('[data-frage="A"] .fehlertext').count()).toBe(0);
    expect(await p.locator('input:required').count()).toBe(0);      // natives required würde Chromium schon vorher „ungültig“ melden lassen
    expect(await p.locator('input[aria-required="true"]').count()).toBe(1);
    await p.getByRole('button', { name: 'Weiter', exact: true }).click();
    expect(await p.locator('[data-frage="A"] [aria-invalid="true"]').count()).toBeGreaterThan(0);
    expect(await p.locator('[data-frage="A"] .fehlertext').count()).toBe(1);
  });

  it('Abwahl von „Nichts davon“ durch ein anderes Kästchen hat einen eigenen Ansagetext', async () => {
    const pl = plan([seite('s', [frage('M', 'mehrfach', { liste: 'm' })])]);
    pl.antwortlisten.push(liste('m', ['Radio', 'Internet'], { optionen: [
      { id: 'm:1', wert: 1, text: zw('Radio') }, { id: 'm:2', wert: 2, text: zw('Internet') }, { id: 'm:3', wert: 3, text: zw('Nichts davon'), ausschliessend: true }] }));
    const p = await neu(); await zeichne(p, pl, 's');
    await p.getByRole('checkbox', { name: 'Nichts davon' }).check();
    await p.getByRole('checkbox', { name: 'Radio' }).check();
    expect(await ansage(p)).toBe('„Nichts davon“ wurde abgewählt');
    await p.getByRole('checkbox', { name: 'Nichts davon' }).check();
    expect(await ansage(p)).toBe('Die anderen Auswahlen wurden aufgehoben');
  });
});

describe('Seitenfortschritt (NVDA-Befund 4)', () => {
  const filterPlan = (): FragebogenPlan => {
    const pl = plan([
      seite('s1', [frage('A', 'einfach', { liste: 'farben' })]),
      { ...seite('s2', [frage('B', 'text')]), wennGezeigt: { frage: 'A', ist: '=', wert: 1 } },
      seite('s3', [frage('C', 'text')])]);
    pl.einstellungen.fortschritt = true;
    return pl;
  };
  it('Seitenwechsel: „Seite n von m“ wird über die Ansage-Region mitgesagt', async () => {
    const p = await neu(); await zeichne(p, filterPlan(), 's3', { A: 2 });
    await p.evaluate(() => { const w = window as any; w.Ausfuellen.fokussiereSeitentitel(w.__wurzel); });
    expect(await ansage(p)).toBe('Seite 2 von 2');
  });
  it('Filter blendet eine Seite ein: Zahl springt von 2 auf 3, ohne Live-Meldung (NVDA-Nachmessung Stufe 3, N1)', async () => {
    const p = await neu(); await zeichne(p, filterPlan(), 's1');
    expect(await p.getByText('Seite 1 von 2', { exact: true }).isVisible()).toBe(true);
    await p.getByRole('radio', { name: 'Rot' }).check();
    expect(await p.getByText('Seite 1 von 3', { exact: true }).isVisible()).toBe(true);
    expect(await ansage(p)).toBe('');
    await p.getByRole('radio', { name: 'Grün' }).check();
    expect(await p.getByText('Seite 1 von 2', { exact: true }).isVisible()).toBe(true);
    expect(await ansage(p)).toBe('');
  });
});
