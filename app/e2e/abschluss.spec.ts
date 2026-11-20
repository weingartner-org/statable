// Abschlussmessung (Welle 7, Kopie von ausgang.spec.ts): axe auf allen Routen aus App.svelte, im Normalmodus und mit emuliertem Kontrastmodus (forced-colors).
// Normalmodus: zusätzlich Tab-Stopps je Route (bis Rundlauf, höchstens 400) und Fachwort-Knöpfe (.begriff-link).
// Kontrastmodus: zusätzlich Fokus-Fotos auf 5 Routen (sichtbar ja/nein durch Vergleich mit und ohne Fokus).
// Ergebnis: app/e2e/ergebnisse/abschluss.json. Die Tests messen nur; sie werden nicht rot, wenn axe Verstöße findet.
import { test, expect, type Browser, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'];
/** Routen ohne Angabe (aus App.svelte, `seite === ...`). */
const FEST = ['start', 'beispiele', 'daten', 'spalten', 'umformen', 'karte', 'blatt', 'protokoll', 'befehle', 'bericht',
  'einstellungen', 'hilfe', 'planen', 'verstehen', 'lernen', 'r-probe', 'impressum', 'datenschutz', 'behoerden', 'tabelle', 'amtlich', 'bearbeiten'];
/** Routen mit Teil (Id), die aus den Links der Seiten gesammelt werden. */
const MIT_TEIL = ['bearbeiten', 'verstehen', 'lernen', 'hilfe', 'blatt'];
const ENTDECKEN_VON = ['bearbeiten', 'daten', 'bericht', 'protokoll', 'lernen', 'verstehen', 'hilfe', 'blatt', 'karte', 'beispiele'];
/** Fünf Routen für die Fokus-Fotos im Kontrastmodus. */
const FOTO_ROUTEN = ['start', 'beispiele', 'daten', 'hilfe', 'einstellungen'];
const MAX_TEIL_JE_PRAEFIX = 4;
const TAB_MAX = 400;
// Die App wählt die Sprache nach dem Browser (sonst Englisch): Deutsch festlegen.
const SPRACHE = { locale: 'de-DE' };
const BEISPIEL_KNOPF = /Öffnen und üben|Open and practice/;
// Lauf aus app/ (npm-Skript), daher relative Pfade.
const ZIEL = path.resolve('e2e/ergebnisse/abschluss.json');
const FOTO_ORDNER = path.resolve('e2e/ergebnisse/kontrast-abschluss');

type Verstoss = { regel: string; impact: string | null | undefined; wcag: string[]; knoten: number; beispiel: string };
type Seite = {
  route: string;
  axe?: { verstoesse: Verstoss[]; bestanden: number; unklar: number };
  titel?: string; h1?: string; inhaltZeichen?: number;
  tab?: { stopps: number; fachwort_stopps: number; fachwort_im_dom: number; rundlauf_erreicht: boolean };
  fehler?: string;
};
type Fokusfoto = { route: string; element: string; rechteck: { x: number; y: number; breite: number; hoehe: number } | null; sichtbar: boolean | null; foto: string; fehler?: string };
type Ergebnis = {
  erstellt: string;
  werkzeug: string;
  hinweis: string;
  routen: string[];
  beispiel_fehler?: string;
  modi: Record<string, Seite[]>;
  kontrast_fokus?: Fokusfoto[];
  zusammenfassung?: Record<string, unknown>;
};

const ergebnis: Ergebnis = {
  erstellt: new Date().toISOString(),
  werkzeug: '@axe-core/playwright, Tags wcag2a, wcag2aa, wcag21aa, wcag22aa; Tab-Weg per Tastatur (Tab); Fokus-Foto-Vergleich',
  hinweis: 'Gemessen am gebauten Stand (vite preview, dist-e2e), Browser-Sprache de-DE. Kontrastmodus per Playwright forcedColors:active, nicht der echte Windows-Kontrastmodus. Tab-Stopps nur im Normalmodus.',
  routen: [],
  modi: {},
};

function summen(seiten: Seite[]) {
  const regeln = new Map<string, { anzahl: number; knoten: number; wcag: string[] }>();
  for (const s of seiten) for (const v of s.axe?.verstoesse ?? []) {
    const r = regeln.get(v.regel) ?? { anzahl: 0, knoten: 0, wcag: v.wcag };
    r.anzahl += 1; r.knoten += v.knoten; regeln.set(v.regel, r);
  }
  const haeufig = [...regeln.entries()].sort((a, b) => b[1].knoten - a[1].knoten).slice(0, 12)
    .map(([regel, r]) => ({ regel, seiten: r.anzahl, knoten: r.knoten, wcag: r.wcag }));
  return {
    seiten_gemessen: seiten.length,
    seiten_mit_fehler: seiten.filter(s => s.fehler).map(s => s.route),
    verstoesse_gesamt: seiten.reduce((n, s) => n + (s.axe?.verstoesse.length ?? 0), 0),
    knoten_gesamt: seiten.reduce((n, s) => n + (s.axe?.verstoesse.reduce((m, v) => m + v.knoten, 0) ?? 0), 0),
    haeufigste_regeln: haeufig,
  };
}

function schreibe() {
  for (const modus of Object.keys(ergebnis.modi)) {
    ergebnis.zusammenfassung = { ...(ergebnis.zusammenfassung ?? {}), [modus]: summen(ergebnis.modi[modus]) };
  }
  ergebnis.erstellt = new Date().toISOString();
  mkdirSync(path.dirname(ZIEL), { recursive: true });
  writeFileSync(ZIEL, JSON.stringify(ergebnis, null, 2), 'utf8');
}

async function warte(page: Page) {
  await page.locator('#inhalt').first().waitFor({ state: 'attached', timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(700);
}

/** Zählt die Tab-Stopps, bis der Fokus wieder außerhalb der Seite landet (Rundlauf) oder das Maximum erreicht ist. */
async function tabWeg(page: Page): Promise<NonNullable<Seite['tab']>> {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  const gesehen = new Set<string>();
  let fachwort = 0;
  let rundlauf = false;
  for (let i = 0; i < TAB_MAX; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body || el === document.documentElement) return null;
      if (!el.hasAttribute('data-ausgang-id')) el.setAttribute('data-ausgang-id', Math.random().toString(36).slice(2));
      return { id: el.getAttribute('data-ausgang-id')!, begriff: el.classList.contains('begriff-link') };
    });
    if (!info) { rundlauf = true; break; }
    if (gesehen.has(info.id)) { rundlauf = true; break; }
    gesehen.add(info.id);
    if (info.begriff) fachwort++;
  }
  const imDom = await page.evaluate(() => document.querySelectorAll('.begriff-link').length);
  return { stopps: gesehen.size, fachwort_stopps: fachwort, fachwort_im_dom: imDom, rundlauf_erreicht: rundlauf };
}

/** Erster Tab-Stopp: Foto mit Fokus und ohne Fokus. Gleiche Bytes = der Fokus ist nicht zu sehen. */
async function fokusFoto(page: Page, route: string): Promise<Fokusfoto> {
  const name = route.replace(/[^a-z0-9-]/gi, '_');
  const foto = path.join(FOTO_ORDNER, name);
  const ergebnisFoto: Fokusfoto = { route, element: '', rechteck: null, sichtbar: null, foto: '' };
  try {
    mkdirSync(FOTO_ORDNER, { recursive: true });
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const r = el.getBoundingClientRect();
      return {
        beschreibung: `${el.tagName.toLowerCase()} ${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 50)}`,
        rechteck: { x: Math.round(r.x), y: Math.round(r.y), breite: Math.round(r.width), hoehe: Math.round(r.height) },
      };
    });
    if (!info) { ergebnisFoto.fehler = 'Kein Tab-Stopp gefunden'; return ergebnisFoto; }
    ergebnisFoto.element = info.beschreibung;
    ergebnisFoto.rechteck = info.rechteck;
    const clip = {
      x: Math.max(0, info.rechteck.x - 12), y: Math.max(0, info.rechteck.y - 12),
      width: info.rechteck.breite + 24, height: info.rechteck.hoehe + 24,
    };
    const mit = await page.screenshot({ path: `${foto}-fokus.png`, clip });
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    const ohne = await page.screenshot({ path: `${foto}-ohne.png`, clip });
    ergebnisFoto.sichtbar = !mit.equals(ohne);
    ergebnisFoto.foto = `${foto}-fokus.png`;
  } catch (e) {
    ergebnisFoto.fehler = String(e).slice(0, 300);
  }
  return ergebnisFoto;
}

async function messe(page: Page, route: string, seiten: Seite[], mitTab: boolean) {
  const seite: Seite = { route };
  try {
    await page.goto('./#' + route);
    await warte(page);
    const r = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    seite.axe = {
      bestanden: r.passes.length,
      unklar: r.incomplete.length,
      verstoesse: r.violations.map(v => ({
        regel: v.id,
        impact: v.impact,
        wcag: v.tags.filter(t => t.startsWith('wcag')),
        knoten: v.nodes.length,
        beispiel: v.nodes[0]?.target?.join(' ') ?? '',
      })),
    };
    const kopf = await page.evaluate(() => ({ titel: document.title, h1: document.querySelector('#inhalt h1')?.textContent?.trim() ?? '', z: (document.querySelector('#inhalt')?.textContent ?? '').length }));
    seite.titel = kopf.titel; seite.h1 = kopf.h1; seite.inhaltZeichen = kopf.z;
    if (mitTab) seite.tab = await tabWeg(page);
  } catch (e) {
    seite.fehler = String(e).slice(0, 300);
  }
  seiten.push(seite);
  schreibe();
}

async function lauf(browser: Browser, modus: 'normal' | 'kontrast') {
  const ctx = await browser.newContext(modus === 'kontrast'
    ? { ...SPRACHE, forcedColors: 'active', colorScheme: 'dark' }
    : { ...SPRACHE });
  const page = await ctx.newPage();
  const mitTab = modus === 'normal';
  const seiten: Seite[] = [];
  ergebnis.modi[modus] = seiten;

  // Start ohne Projekt
  await messe(page, 'start', seiten, mitTab);
  seiten[seiten.length - 1].route = 'start (ohne Projekt)';

  // Beispiel öffnen, damit Daten-Routen Inhalt haben
  await page.goto('./#beispiele');
  await warte(page);
  try {
    await page.getByRole('button', { name: BEISPIEL_KNOPF }).first().click({ timeout: 15_000 });
    await page.waitForFunction(() => location.hash !== '#beispiele', undefined, { timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(1500);
  } catch (e) {
    // Ohne geöffnetes Beispiel bleiben die Daten-Routen leer; der Fehler steht im Ergebnis.
    ergebnis.beispiel_fehler = String(e).slice(0, 300);
  }

  // Routen mit Teil aus den Links der Seiten sammeln
  const teile = new Map<string, Set<string>>();
  for (const p of ENTDECKEN_VON) {
    await page.goto('./#' + p);
    await warte(page);
    const hrefs = await page.$$eval('a[href^="#"]', as => as.map(a => a.getAttribute('href') ?? ''));
    for (const h of hrefs) {
      const [s, ...rest] = h.slice(1).split('/');
      if (!MIT_TEIL.includes(s) || rest.length === 0) continue;
      const menge = teile.get(s) ?? new Set<string>();
      if (menge.size < MAX_TEIL_JE_PRAEFIX) menge.add(rest.join('/'));
      teile.set(s, menge);
    }
  }
  const routen = [...FEST.filter(r => r !== 'start' && r !== 'beispiele')];
  for (const [s, menge] of teile) for (const t of menge) routen.push(`${s}/${t}`);
  ergebnis.routen = routen;
  const messbar = routen.filter(r => !r.endsWith('(kein Link gefunden)'));
  for (const r of ['start', 'beispiele', ...messbar]) {
    if (r === 'start') { await messe(page, 'start', seiten, mitTab); seiten[seiten.length - 1].route = 'start (mit Projekt, falls geöffnet)'; continue; }
    await messe(page, r, seiten, mitTab);
  }
  for (const r of routen.filter(r => r.endsWith('(kein Link gefunden)'))) seiten.push({ route: r, fehler: 'Kein Link auf einer Seite gefunden, nicht gemessen' });

  if (modus === 'kontrast') {
    ergebnis.kontrast_fokus = [];
    for (const r of FOTO_ROUTEN) {
      await page.goto('./#' + r);
      await warte(page);
      ergebnis.kontrast_fokus.push(await fokusFoto(page, r));
      schreibe();
    }
  }
  schreibe();
  await ctx.close();
  expect(seiten.length).toBeGreaterThan(5);
}

test.describe('Abschlussmessung', () => {
  test('Normalmodus: axe und Tab-Stopps auf allen Routen', async ({ browser }) => {
    test.setTimeout(1_800_000);
    await lauf(browser, 'normal');
  });

  test('Kontrastmodus (forced-colors): axe auf allen Routen, Fokus-Fotos auf 5 Routen', async ({ browser }) => {
    test.setTimeout(1_800_000);
    await lauf(browser, 'kontrast');
  });
});
