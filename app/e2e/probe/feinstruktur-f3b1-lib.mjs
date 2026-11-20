// Gemeinsame Hilfen der Prüfskripte F3B1 (Feinstruktur-Arbeitsplatz im echten Bau, Vorschau von dist-f3b1).
// Aufbau wie in src/bausteine/FeinstrukturArbeitsplatz.test.ts: Beispiel-Projekt über #beispiele, dann „Beispielinterview laden (erfunden)“ oder eine eigene Transkript-Datei.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const APP = fileURLToPath(new URL('../..', import.meta.url));
export const AXE = readFileSync(path.join(APP, 'node_modules/axe-core/axe.min.js'), 'utf8');
export const BASIS = `http://127.0.0.1:${process.env.PORT || 4294}/`;
export const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/** Merkt alle Ansagen der zwei Live-Regionen (lib/ansage.ts: #ansage-hoeflich, #ansage-dringend) in window.__ans */
const beobachter = () => {
  window.__ans = window.__ans || [];
  const start = () => {
    for (const id of ['ansage-hoeflich', 'ansage-dringend']) {
      const e = document.getElementById(id);
      if (!e || e.__beo) continue;
      e.__beo = true;
      new MutationObserver(() => { const t = e.textContent; if (t) window.__ans.push({ kanal: id.slice(7), text: t }); }).observe(e, { childList: true, characterData: true, subtree: true });
    }
  };
  setInterval(start, 100);
};

export async function neuerKontext(browser, { ansicht = 'woerter', vp = { width: 1280, height: 900 } } = {}) {
  const ctx = await browser.newContext({ locale: 'de-DE', viewport: vp, acceptDownloads: true });
  const page = await ctx.newPage();
  await page.addInitScript(beobachter);
  // Ansicht nur beim ersten Laden der Sitzung vorbelegen (nach dem Neuladen gilt die gespeicherte Wahl)
  await page.addInitScript((a) => { try { if (!sessionStorage.getItem('__ans_init')) { localStorage.setItem('statable-feinstruktur-ansicht', a); sessionStorage.setItem('__ans_init', '1'); } } catch { /* egal */ } }, ansicht);
  return { ctx, page };
}
export async function projektOeffnen(page) {
  await page.goto(BASIS + '#beispiele', { timeout: 180000 });
  await page.getByRole('button', { name: 'Öffnen', exact: true }).first().click({ timeout: 120000 });
  await page.waitForFunction(() => !location.hash.startsWith('#beispiele'), undefined, { timeout: 240000 });
  await page.waitForTimeout(3000);
  await page.evaluate(() => { location.hash = 'interviews'; });
}
export async function beispielinterview(page) {
  await page.getByRole('button', { name: 'Beispielinterview laden (erfunden)' }).click({ timeout: 120000 });
  await page.getByRole('button', { name: /^Feinstrukturanalyse beginnen: / }).first().waitFor({ timeout: 120000 });
}
export async function bereit(browser, opt = {}) {
  const k = await neuerKontext(browser, opt);
  await projektOeffnen(k.page);
  await beispielinterview(k.page);
  return k;
}
/** Ausschnitt wählen: Beitrag von/bis (Indizes; Vorgabe: erster Beitrag der befragten Person bis +2) */
export async function legeAn(page, name, { von = null, bis = null } = {}) {
  await page.getByRole('button', { name: /^Feinstrukturanalyse beginnen: / }).first().click({ timeout: 60000 });
  await page.getByRole('heading', { level: 2, name: 'Ausschnitt für die Feinstrukturanalyse wählen' }).waitFor();
  await page.locator('#fe-aus-name').fill(name);
  const v = von ?? Number(await page.locator('#fe-aus-von').inputValue());
  await page.locator('#fe-aus-von').selectOption({ index: v });
  const n = await page.locator('#fe-aus-bis option').count();
  await page.locator('#fe-aus-bis').selectOption({ index: bis ?? Math.min(n - 1, v + 2) });
  return page;
}
export async function anlegenKlick(page) {
  await page.getByRole('button', { name: 'Feinstrukturanalyse anlegen' }).click();
  await page.getByRole('heading', { level: 2, name: /^Einteilen: Sinneinheiten setzen/ }).waitFor();
}
/** Ansicht Wörter, Grenzen vor den Wörtern mit diesen Indizes (aufsteigend), nur Tastatur im Wortfeld */
export async function grenzenWoerter(page, idxs) {
  await page.locator('[role=option]').first().focus();
  let pos = 0;
  for (const g of idxs) { while (pos < g) { await page.keyboard.press('ArrowRight'); pos++; } await page.keyboard.press('Enter'); }
}
export async function axeLauf(page) {
  if (!(await page.evaluate(() => !!window.axe))) await page.addScriptTag({ content: AXE });
  return page.evaluate(async (tags) => {
    const r = await window.axe.run(document, { runOnly: { type: 'tag', values: tags } });
    const map = (x) => ({ id: x.id, impact: x.impact, hilfe: x.help,
      knoten: x.nodes.map((n) => ({ ziel: n.target.join(' '), meldung: (n.any[0]?.message || n.all[0]?.message || n.none[0]?.message || '').slice(0, 200), html: n.html.slice(0, 160) })) });
    return { verstoesse: r.violations.map(map), unklar: r.incomplete.map(map), bestanden: r.passes.length };
  }, TAGS);
}
export const ueberbreite = (page) => page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
export const info = (page) => page.evaluate(() => {
  const e = document.activeElement;
  if (!e || e === document.body) return null;
  const name = (e.getAttribute('aria-label') || (e.labels && e.labels[0]?.textContent) || e.textContent || e.value || '').replace(/\s+/g, ' ').trim().slice(0, 80);
  return { tag: e.tagName.toLowerCase(), id: e.id || '', rolle: e.getAttribute('role') || '', name, fokusSichtbar: e.matches(':focus-visible') };
});
