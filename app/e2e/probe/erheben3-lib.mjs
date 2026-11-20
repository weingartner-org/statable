// Stufe 3 (Erheben ohne Server), automatische Prüfung: gemeinsame Helfer. Nur Messung, kein App-Code.
// Aufruf-Basis: BASIS=http://localhost:4231 (fester Bau in app/dist-erheben3, `vite preview`).
import AxeBuilder from '@axe-core/playwright';
import { tabDurchlauf, breite, rec, LOG, markiere } from './erheben1-lib.mjs';
export { tabDurchlauf, breite, rec, LOG };

export const BASIS = process.env.BASIS || 'http://localhost:4231';
export const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/** axe mit Regelsatz. Gibt Verstöße und „unklar“ getrennt zurück (kein Beschönigen). */
export async function axeSeite(page, ort, kontext = '', bereich = null) {
  let a = new AxeBuilder({ page }).withTags(TAGS);
  if (bereich) a = a.include(bereich);
  const res = await a.analyze();
  const verst = res.violations.flatMap(v => v.nodes.map(n => ({ regel: v.id, element: n.target.join(' ').slice(0, 100), meldung: (n.any[0]?.message || n.all[0]?.message || v.help).slice(0, 140) })));
  const unklar = res.incomplete.reduce((s, v) => s + v.nodes.length, 0);
  rec({ typ: 'axe', ort, kontext, verstoesse: verst.length, unklar, beispiele: verst.slice(0, 5) });
  return verst.length;
}

/** Zielgröße: sichtbare Bedienelemente unter `min` CSS-Pixel (24 für Forschende, 44 für Befragte). */
export async function zielgroesse(page, ort, min, bereich = 'body') {
  const d = await page.evaluate(({ sel, min }) => {
    const w = document.querySelector(sel) ?? document.body; const klein = []; let n = 0;
    for (const e of w.querySelectorAll('button,a[href],input:not([type=hidden]),select,textarea,summary,[role=button],[role=radio],[role=checkbox]')) {
      const r = e.getBoundingClientRect(); const s = getComputedStyle(e);
      if (r.width === 0 || r.height === 0 || s.visibility === 'hidden' || s.display === 'none' || e.classList.contains('nur-vorleser') || e.closest('[hidden]')) continue;
      if (e.closest('[aria-hidden=true]')) continue;
      n++;
      // Auswahlfelder: die Beschriftung zählt mit, wenn sie klickbar ist (label mit for): Fläche = größere aus Feld und Label
      let flaeche = r;
      const lab = e.labels && e.labels[0];
      if ((e.type === 'radio' || e.type === 'checkbox') && lab) { const lr = lab.getBoundingClientRect(); flaeche = { width: Math.max(r.width, lr.width), height: Math.max(r.height, lr.height) }; }
      if (flaeche.width < min || flaeche.height < min) klein.push(`${e.tagName.toLowerCase()}${e.type ? '[' + e.type + ']' : ''} ${Math.round(flaeche.width)}x${Math.round(flaeche.height)} „${(e.getAttribute('aria-label') || (lab && lab.innerText) || e.innerText || e.value || '').trim().replace(/\s+/g, ' ').slice(0, 40)}“`);
    }
    return { n, klein };
  }, { sel: bereich, min });
  rec({ typ: 'ziele', ort, min, geprueft: d.n, unter: d.klein.length, beispiele: d.klein.slice(0, 10) });
  return d;
}

/** Kontrastmodus (forced-colors): Bedienelemente ohne Rand, Umriss und ohne Text; unbenannte Eingaben. */
export async function kontrastmodus(page, ort, bereich = 'body') {
  const d = await page.evaluate((sel) => {
    const aktiv = matchMedia('(forced-colors: active)').matches;
    const w = document.querySelector(sel) ?? document.body; const ohneRand = []; const ohneName = []; let n = 0;
    for (const e of w.querySelectorAll('button,a[href],input:not([type=hidden]),select,textarea,summary,[role=button]')) {
      const r = e.getBoundingClientRect(); const s = getComputedStyle(e);
      if (r.width === 0 || r.height === 0 || s.visibility === 'hidden' || s.display === 'none' || e.closest('[hidden]')) continue;
      if (e.classList.contains('nur-vorleser')) continue;
      n++;
      const rand = parseFloat(s.borderTopWidth) > 0 && s.borderTopStyle !== 'none';
      const umriss = s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0;
      const text = (e.innerText || e.textContent || e.value || '').trim().length > 0;
      if (!rand && !umriss && !text && !['checkbox', 'radio', 'file'].includes(e.type)) ohneRand.push(e.outerHTML.slice(0, 120));
      else if (!rand && !umriss && text && e.tagName !== 'INPUT' && e.tagName !== 'SELECT' && e.tagName !== 'TEXTAREA') { /* Text ist sichtbar; zählt als sichtbar */ }
      const hatName = !!(e.getAttribute('aria-label') || e.getAttribute('aria-labelledby') || e.title || (e.labels && e.labels.length) || (e.innerText || e.textContent || '').trim() || e.getAttribute('value') || e.getAttribute('alt'));
      if (!hatName) ohneName.push(e.outerHTML.slice(0, 120));
    }
    return { aktiv, n, ohneRand: ohneRand.slice(0, 10), ohneRandAnzahl: ohneRand.length, ohneName: ohneName.slice(0, 10), ohneNameAnzahl: ohneName.length };
  }, bereich);
  rec({ typ: 'kontrastmodus', ort, ...d });
  return d;
}

/** Seite mit deutschem oder englischem Browser, optional Gerät. */
export async function neueSeite(browser, { breitePx = 1280, hoehePx = 900, sprache = 'de-DE', extra = {} } = {}) {
  const ctx = await browser.newContext({ locale: sprache, viewport: { width: breitePx, height: hoehePx }, acceptDownloads: true, ...extra });
  const page = await ctx.newPage();
  page.on('pageerror', e => rec({ typ: 'seitenfehler', meldung: e.message.slice(0, 200) }));
  return { ctx, page };
}

/** Waagrechtes Scrollen über die ganze Seite (documentElement). */
export async function keinUeberlauf(page, ort) {
  const d = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  rec({ typ: 'ueberlauf', ort, scrollBreite: d.sw, fenster: d.cw, waagrecht: d.sw > d.cw + 1 });
  return d.sw <= d.cw + 1;
}

/**
 * Tastatur-Erreichbarkeit: vorwärts mit Tab durch den Bereich; jedes Element wird über data-pr (von markiere) wiedererkannt,
 * nicht über Namen (Namen können sich bei Eingaben doppeln). Gibt erreichte und nicht erreichte Elemente zurück.
 */
export async function tabWalk(page, bereich, ort, max = 400) {
  const liste = await markiere(page, bereich);
  const soll = liste.filter(x => !x.nurVorleser && !x.aus && x.id !== '-');
  await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
  const erreicht = new Set(); const unsichtbar = []; let leer = 0; let erster = null; let ausserhalb = 0;
  for (let k = 0; k < max; k++) {
    await page.keyboard.press('Tab');
    const f = await page.evaluate(() => {
      const e = document.activeElement;
      if (!e || e === document.body) return null;
      const s = getComputedStyle(e);
      const sichtbar = (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2) || (!!s.boxShadow && s.boxShadow !== 'none');
      return { pr: e.getAttribute('data-pr'), sichtbar, html: e.outerHTML.slice(0, 110), outline: `${s.outlineStyle} ${s.outlineWidth}`, schatten: s.boxShadow };
    });
    if (!f) { leer++; if (leer >= 3) break; continue; }
    leer = 0;
    if (f.pr === null) { ausserhalb++; continue; }
    if (erster === null) erster = f.pr;
    else if (f.pr === erster) break;
    erreicht.add(f.pr);
    if (!f.sichtbar) unsichtbar.push(`${f.html} (Umriss ${f.outline}, Schatten ${f.schatten})`);
  }
  const nicht = [];
  for (const x of soll) if (!erreicht.has(x.id)) nicht.push(`${x.tag}${x.typ ? '[' + x.typ + ']' : ''} „${x.name}“ ${await page.evaluate(id => document.querySelector(`[data-pr="${id}"]`)?.outerHTML.slice(0, 150) ?? '', x.id)}`);
  const ergebnis = { typ: 'tab', ort, bereich, bedienelemente: soll.length, erreicht: erreicht.size, nicht_erreicht: nicht.length, nicht_erreicht_beispiele: nicht.slice(0, 6), fokus_unsichtbar: unsichtbar.length, fokus_unsichtbar_beispiele: [...new Set(unsichtbar)].slice(0, 4), ausserhalb_der_markierung: ausserhalb };
  rec(ergebnis);
  return ergebnis;
}
