// Gemeinsame Helfer für die Stufe-1-Barrierefreiheitsprüfung (Erheben). Nur Messung, kein App-Code.
import AxeBuilder from '@axe-core/playwright';
export const PORT = process.env.PORT || 4211;
export const U = `http://127.0.0.1:${PORT}/`;
export const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
export const LOG = [];
export function rec(zeile) { LOG.push(zeile); console.log('R|' + JSON.stringify(zeile)); }

/** axe: Verstöße und „incomplete“ getrennt, mit Regel-ID, Element und Meldung. */
export async function axe(page, ort, kontext = '') {
  const res = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const verst = res.violations.flatMap(v => v.nodes.map(n => ({ regel: v.id, schwere: v.impact, element: n.target.join(' ').slice(0, 120), meldung: (n.any[0]?.message || n.all[0]?.message || n.none[0]?.message || v.help).slice(0, 160), html: (n.html || '').slice(0, 140) })));
  const unklar = res.incomplete.map(v => ({ regel: v.id, anzahl: v.nodes.length, element: v.nodes[0]?.target.join(' ').slice(0, 100) ?? '', meldung: (v.nodes[0]?.any[0]?.message || v.nodes[0]?.all[0]?.message || v.help).slice(0, 140) }));
  rec({ typ: 'axe', ort, kontext, verstoesse: verst.length, verstoesse_liste: verst, incomplete: unklar });
  return verst.length;
}

/** Sichtbare, bedienbare Elemente im Bereich; markiert sie mit data-pr. */
export async function markiere(page, bereich) {
  return page.evaluate((sel) => {
    const wurzel = document.querySelector(sel) ?? document.body;
    const q = 'a[href],button,input:not([type=hidden]),select,textarea,summary,[tabindex]:not([tabindex="-1"])';
    let i = 0; const liste = [];
    document.querySelectorAll('[data-pr]').forEach(e => e.removeAttribute('data-pr'));
    for (const e of wurzel.querySelectorAll(q)) {
      const r = e.getBoundingClientRect(); const s = getComputedStyle(e);
      const sichtbar = r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
      if (!sichtbar || e.closest('[hidden]') !== null || e.disabled) continue;
      if (e.tabIndex === -1) { liste.push({ id: '-', tag: e.tagName.toLowerCase(), typ: e.type || '', name: (e.getAttribute('aria-label') || e.innerText || '').replace(/s+/g, ' ').trim().slice(0, 60), grp: '', nurVorleser: false, aus: true }); continue; }
      const nur = e.classList.contains('nur-vorleser') || (r.width <= 1 && r.height <= 1);
      const name = (e.getAttribute('aria-label') || (e.labels && e.labels[0]?.innerText) || e.innerText || e.getAttribute('value') || e.getAttribute('title') || e.tagName).replace(/\s+/g, ' ').trim().slice(0, 80);
      e.setAttribute('data-pr', String(i));
      liste.push({ id: String(i), tag: e.tagName.toLowerCase(), typ: e.type || '', name, grp: e.type === 'radio' ? e.name : '', nurVorleser: nur });
      i++;
    }
    return liste;
  }, bereich);
}

/**
 * Tab-Durchlauf im Bereich (vorwärts Tab, rückwärts Umschalt+Tab). Prüft Erreichbarkeit (Schlüssel Typ + Name,
 * überlebt das Neu-Zeichnen durch Svelte), Fokus-Sichtbarkeit (Umriss mind. 2 px oder Schatten) und Fallen.
 */
export async function tabDurchlauf(page, bereich, ort, maxSchritte = 260) {
  const liste = await markiere(page, bereich);
  const schluessel = (x) => x.typ === 'radio' ? 'radio|' + x.grp : x.tag + (x.typ ? '[' + x.typ + ']' : '') + '|' + x.name;
  const erwartet = liste.filter(x => !x.nurVorleser && !x.aus);
  const ausgelassen = liste.filter(x => x.aus).map(x => x.name);
  const fokus = () => page.evaluate((sel) => {
    const e = document.activeElement;
    const w = document.querySelector(sel) ?? document.body;
    if (!e || e === document.body) return { innen: false };
    const innen = w.contains(e);
    const s = getComputedStyle(e);
    const sichtbar = (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2) || (s.boxShadow && s.boxShadow !== 'none');
    const name = (e.getAttribute('aria-label') || (e.labels && e.labels[0]?.innerText) || e.innerText || e.getAttribute('value') || e.getAttribute('title') || e.tagName).replace(/\s+/g, ' ').trim().slice(0, 80);
    return { innen, key: e.type === 'radio' ? 'radio|' + e.name : e.tagName.toLowerCase() + (e.type ? '[' + e.type + ']' : '') + '|' + name, outline: `${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor}`, schatten: s.boxShadow, sichtbar };
  }, bereich);
  const vorwaerts = [], unsichtbar = [];
  await page.evaluate((sel) => { const w = document.querySelector(sel) ?? document.body; w.querySelector('[data-pr]')?.focus(); }, bereich);
  let aussen = 0;
  for (let k = 0; k < maxSchritte; k++) {
    const f = await fokus();
    if (!f.innen) { aussen++; if (k > 0 && aussen >= 2) break; }
    else { aussen = 0; vorwaerts.push(f.key); if (!f.sichtbar) unsichtbar.push({ key: f.key, outline: f.outline, schatten: f.schatten }); }
    await page.keyboard.press('Tab');
  }
  const letzte = vorwaerts.slice(-12);
  const falle = letzte.length >= 12 && new Set(letzte).size <= 2;
  const rueck = [];
  await page.evaluate((sel) => { const w = document.querySelector(sel) ?? document.body; const a = [...w.querySelectorAll('[data-pr]')]; for (let i = a.length - 1; i >= 0; i--) { a[i].focus(); if (document.activeElement === a[i]) break; } }, bereich);
  aussen = 0;
  for (let k = 0; k < maxSchritte; k++) {
    const f = await fokus();
    if (!f.innen) { aussen++; if (k > 0 && aussen >= 2) break; } else { aussen = 0; rueck.push(f.key); }
    await page.keyboard.press('Shift+Tab');
  }
  const besucht = new Set([...vorwaerts, ...rueck]);
  const nichtErreicht = erwartet.filter(x => !besucht.has(schluessel(x)));
  const ergebnis = {
    typ: 'tab', ort, bereich, bedienelemente: erwartet.length,
    vorwaerts_erreicht: new Set(vorwaerts).size, rueckwaerts_erreicht: new Set(rueck).size,
    nicht_erreicht: nichtErreicht.map(x => `${x.tag}${x.typ ? '[' + x.typ + ']' : ''} „${x.name}“`),
    fokus_unsichtbar: unsichtbar.length,
    fokus_unsichtbar_beispiele: [...new Map(unsichtbar.map(u => [u.key, u])).values()].slice(0, 5).map(u => `${u.key} (Umriss ${u.outline}, Schatten ${u.schatten})`),
    falle, ausgelassen_tabindex_minus1: ausgelassen.length, ausgelassen_beispiele: [...new Set(ausgelassen)].slice(0, 6), reihenfolge_anfang: vorwaerts.slice(0, 10)
  };
  rec(ergebnis);
  return ergebnis;
}

/** Breite: waagrechtes Scrollen der Seite? Elemente, die über den Rand ragen, außer in eigenen Scroll-Behältern. */
export async function breite(page, ort) {
  const d = await page.evaluate(() => {
    const W = document.documentElement.clientWidth;
    const ragt = [];
    for (const e of document.querySelectorAll('body *')) {
      const r = e.getBoundingClientRect(); if (r.width === 0 || r.height === 0) continue;
      if (r.right > W + 1) {
        let p = e.parentElement, geschuetzt = false;
        while (p && p !== document.body) { const o = getComputedStyle(p).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden') { geschuetzt = true; break; } p = p.parentElement; }
        if (!geschuetzt) ragt.push(`${e.tagName.toLowerCase()}.${String(e.className).slice(0, 40)} rechts ${Math.round(r.right)}`);
      }
    }
    return { scrollBreite: document.documentElement.scrollWidth, fensterBreite: W, ragt: ragt.slice(0, 8), anzahlRagt: ragt.length };
  });
  rec({ typ: 'breite', ort, ...d, waagrecht: d.scrollBreite > d.fensterBreite + 1 });
  return d;
}

/** Zielgröße: sichtbare Schaltflächen, Eingaben, Auswahlfelder unter 24 x 24 CSS-Pixel (rein gemessen; axe prüft Abstände getrennt). */
export async function ziele(page, ort, bereich = 'body') {
  const d = await page.evaluate((sel) => {
    const w = document.querySelector(sel) ?? document.body; const klein = [];
    let n = 0;
    for (const e of w.querySelectorAll('button,input:not([type=hidden]),select,textarea,summary')) {
      const r = e.getBoundingClientRect(); const s = getComputedStyle(e);
      if (r.width === 0 || r.height === 0 || s.visibility === 'hidden' || e.classList.contains('nur-vorleser')) continue;
      n++;
      if (r.width < 24 || r.height < 24) klein.push(`${e.tagName.toLowerCase()}${e.type ? '[' + e.type + ']' : ''} ${Math.round(r.width)}x${Math.round(r.height)} „${(e.getAttribute('aria-label') || e.innerText || e.value || '').trim().slice(0, 40)}“`);
    }
    return { n, klein };
  }, bereich);
  rec({ typ: 'ziele', ort, geprueft: d.n, unter24: d.klein.length, beispiele: d.klein.slice(0, 8) });
  return d;
}

/** Neue Seite mit deutscher Sprache; optional Breite und forced-colors. */
export async function seite(browser, breitePx = 1280, extra = {}) {
  const ctx = await browser.newContext({ locale: 'de-DE', viewport: { width: breitePx, height: 800 }, ...extra });
  return ctx.newPage();
}
