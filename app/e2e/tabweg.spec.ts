// Abschlussmessung Welle 7, Tab-Weg: je Route mit geöffnetem Beispiel bis zum Rundlauf (höchstens 400 Tabs)
// Reihenfolge, Name und Rolle jedes Stopps; melden: Stopps ohne Namen, Tastaturfallen, unsichtbarer Fokus,
// Fokus verdeckt (2.4.11, z. B. unter dem festen Kopf), Stopps pro Seite.
// Rot bei: Stopp ohne Namen, Tastaturfalle. Ergebnis: e2e/ergebnisse/tabweg.json.
// Gegenprobe: derselbe Prüfer auf einer präparierten Seite (page.setContent) muss die Fehler finden.
import { test, expect, type Page } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const TAB_MAX = 400;
const ZIEL = path.resolve('e2e/ergebnisse/tabweg.json');
const BEISPIEL_KNOPF = /Öffnen und üben|Open and practice/;
const FEST = ['start', 'beispiele', 'daten', 'spalten', 'umformen', 'karte', 'blatt/neu', 'protokoll', 'befehle', 'bericht',
  'einstellungen', 'hilfe', 'planen', 'verstehen', 'lernen', 'r-probe', 'impressum', 'datenschutz', 'behoerden',
  'tabelle', 'amtlich', 'bearbeiten', 'hilfe/daten-seite', 'hilfe/fallgewichte', 'lernen/pfad/grundlagen',
  'verstehen/verteilungen', 'verstehen/kennzahlen'];

export type Stopp = {
  nr: number; tag: string; rolle: string; name: string; hatName: boolean;
  rechteck: { x: number; y: number; b: number; h: number };
  unsichtbar: boolean; verdeckt: 'nein' | 'teilweise' | 'ganz';
  verdeckerKlasse?: string;
};
export type TabErgebnis = { stopps: Stopp[]; ohneName: Stopp[]; fallen: Stopp[]; unsichtbar: Stopp[]; verdecktGanz: Stopp[]; verdecktTeil: Stopp[]; rundlauf: boolean };

/** Der Prüfer: drückt Tab und liest nach jedem Druck Name, Rolle, Rechteck und Verdeckung des Fokuselements. */
export async function pruefeTabweg(page: Page, max = TAB_MAX): Promise<TabErgebnis> {
  // Startpunkt der Tab-Folge an den Anfang der Seite setzen (sonst beginnt Tab dort, wo der Fokus der Route zuletzt war und die Kopfzeile fehlt).
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    window.getSelection()?.removeAllRanges();
    const b = document.body; const hatte = b.hasAttribute('tabindex');
    if (!hatte) b.setAttribute('tabindex', '-1');
    b.focus({ preventScroll: true });
    b.blur();
    if (!hatte) b.removeAttribute('tabindex');
    window.scrollTo(0, 0);
  });
  const stopps: Stopp[] = [];
  const ids = new Set<string>();
  const fallen: Stopp[] = [];
  let rundlauf = false;
  let letzte = '';
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate((nr) => {
      let el = document.activeElement as HTMLElement | null;
      while (el && el.shadowRoot && el.shadowRoot.activeElement) el = el.shadowRoot.activeElement as HTMLElement;
      if (!el || el === document.body || el === document.documentElement) return null;
      if (!el.hasAttribute('data-tw-id')) el.setAttribute('data-tw-id', Math.random().toString(36).slice(2));
      const tag = el.tagName.toLowerCase();
      const typ = (el as HTMLInputElement).type;
      const explizit = el.getAttribute('role');
      const rolle = explizit || ({ a: el.hasAttribute('href') ? 'link' : 'generic', button: 'button', select: 'combobox', textarea: 'textbox', summary: 'button',
        input: typ === 'checkbox' ? 'checkbox' : typ === 'radio' ? 'radio' : typ === 'range' ? 'slider' : ['button', 'submit', 'reset', 'image'].includes(typ) ? 'button' : typ === 'file' ? 'button' : 'textbox' } as Record<string, string>)[tag] || tag;
      const text = (n: Node | null) => (n?.textContent ?? '').replace(/\s+/g, ' ').trim();
      const sicht = (n: Element) => { const s = getComputedStyle(n); return s.display !== 'none' && s.visibility !== 'hidden'; };
      let name = (el.getAttribute('aria-label') || '').trim();
      if (!name) { const lb = el.getAttribute('aria-labelledby'); if (lb) name = lb.split(/\s+/).map(id => text(document.getElementById(id))).join(' ').trim(); }
      if (!name && (el as HTMLInputElement).labels?.length) name = Array.from((el as HTMLInputElement).labels!).map(l => text(l)).join(' ').trim();
      if (!name && tag === 'input' && ['button', 'submit', 'reset'].includes(typ)) name = ((el as HTMLInputElement).value || '').trim();
      if (!name && tag === 'summary') name = text(el);
      if (!name && (el.getAttribute('title') || '').trim()) name = el.getAttribute('title')!.trim();
      if (!name) {
        // Name aus Inhalt: Text und alt von Bildern sichtbarer Kinder
        const teile: string[] = [];
        const lauf = (n: Node) => {
          if (n.nodeType === 3) { teile.push(n.textContent ?? ''); return; }
          if (n.nodeType !== 1) return;
          const e = n as Element;
          if (!sicht(e) || e.getAttribute('aria-hidden') === 'true') return;
          const al = e.getAttribute('aria-label'); if (al) { teile.push(al); return; }
          if (e.tagName.toLowerCase() === 'img') { teile.push(e.getAttribute('alt') ?? ''); return; }
          if (e.tagName.toLowerCase() === 'svg') { const t = e.querySelector('title'); if (t) teile.push(t.textContent ?? ''); return; }
          e.childNodes.forEach(lauf);
        };
        el.childNodes.forEach(lauf);
        name = teile.join(' ').replace(/\s+/g, ' ').trim();
      }
      if (!name && tag === 'input' && ['text', 'search', 'email', 'number', 'url', 'tel', 'password'].includes(typ || 'text') && (el as HTMLInputElement).placeholder) name = (el as HTMLInputElement).placeholder.trim();
      const r = el.getBoundingClientRect();
      const unsichtbar = r.width === 0 || r.height === 0 || r.right <= 0 || r.bottom <= 0 || r.left >= innerWidth || r.top >= innerHeight;
      // Verdeckung: fünf Prüfpunkte im Rechteck; nur Punkte im Fenster zählen
      const pts = [[.5, .5], [.1, .1], [.9, .1], [.1, .9], [.9, .9]].map(([fx, fy]) => [r.left + r.width * fx, r.top + r.height * fy]);
      let verdeckt = 0, gezaehlt = 0; let verdecker = '';
      for (const [x, y] of pts) {
        if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue;
        gezaehlt++;
        const oben = document.elementFromPoint(x, y);
        if (oben && !(el.contains(oben) || oben.contains(el) || oben === el)) { verdeckt++; verdecker = verdecker || `${oben.tagName.toLowerCase()}.${(oben.className && typeof oben.className === 'string' ? oben.className : '').split(' ')[0]}`; }
      }
      const v: 'nein' | 'teilweise' | 'ganz' = !gezaehlt || !verdeckt ? 'nein' : verdeckt === gezaehlt ? 'ganz' : 'teilweise';
      return { id: el.getAttribute('data-tw-id')!, tag, rolle, name, rechteck: { x: Math.round(r.x), y: Math.round(r.y), b: Math.round(r.width), h: Math.round(r.height) }, unsichtbar, verdeckt: v, verdecker, nr };
    }, stopps.length + 1);
    if (!info) { rundlauf = true; break; }
    const stopp: Stopp = { nr: info.nr, tag: info.tag, rolle: info.rolle, name: info.name.slice(0, 80), hatName: info.name.length > 0, rechteck: info.rechteck, unsichtbar: info.unsichtbar, verdeckt: info.verdeckt, verdeckerKlasse: info.verdecker || undefined };
    if (info.id === letzte) { fallen.push(stopp); break; } // Fokus bleibt trotz Tab im selben Element: Tastaturfalle
    if (ids.has(info.id)) { rundlauf = true; break; }
    ids.add(info.id); letzte = info.id;
    stopps.push(stopp);
  }
  return {
    stopps, fallen, rundlauf,
    ohneName: stopps.filter(s => !s.hatName),
    unsichtbar: stopps.filter(s => s.unsichtbar),
    verdecktGanz: stopps.filter(s => s.verdeckt === 'ganz'),
    verdecktTeil: stopps.filter(s => s.verdeckt === 'teilweise'),
  };
}

async function warte(page: Page) {
  await page.locator('#inhalt').first().waitFor({ state: 'attached', timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(700);
}

test.describe('Tab-Weg', () => {
  test('Gegenprobe: der Prüfer findet Stopp ohne Namen, Tastaturfalle und unsichtbaren Fokus', async ({ page }) => {
    await page.setContent(`<!doctype html><html lang="de"><body>
      <button>Gut benannt</button>
      <div tabindex="0" id="namenlos" role="button"></div>
      <input id="falle" aria-label="Falle" onkeydown="if(event.key==='Tab')event.preventDefault()">
      <button style="position:absolute;left:-500px">Nicht im Fenster</button></body></html>`);
    const e = await pruefeTabweg(page, 12);
    expect(e.ohneName.map(s => s.rolle)).toContain('button');
    expect(e.ohneName.length).toBeGreaterThanOrEqual(1);
    expect(e.fallen.length).toBe(1);
    // Falle steht vor dem unsichtbaren Knopf: dort bricht der Prüfer ab; der unsichtbare Fokus wird getrennt geprüft
    await page.setContent(`<!doctype html><html><body><button>A</button><button style="position:absolute;left:-500px">B</button><div style="position:fixed;top:0;left:0;width:100%;height:50px;background:red" class="kopf"></div></body></html>`);
    const u = await pruefeTabweg(page, 6);
    expect(u.unsichtbar.length).toBeGreaterThanOrEqual(1);
    expect(u.verdecktGanz.length + u.verdecktTeil.length).toBeGreaterThanOrEqual(1); // Knopf A liegt unter dem festen Balken
  });

  test('alle Routen mit geöffnetem Beispiel: Name, Rolle, Falle, Sichtbarkeit, Verdeckung', async ({ browser }) => {
    test.setTimeout(1_800_000);
    const ctx = await browser.newContext({ locale: 'de-DE' });
    const page = await ctx.newPage();
    await page.goto('./#start');
    await warte(page);
    const ergebnis: Record<string, unknown> = {};
    const schreibe = () => { mkdirSync(path.dirname(ZIEL), { recursive: true }); writeFileSync(ZIEL, JSON.stringify({ erstellt: new Date().toISOString(), hinweis: 'dist-e2e, de-DE, Chromium, Beispiel geöffnet, Tab bis Rundlauf (max 400)', routen: ergebnis }, null, 1), 'utf8'); };
    await page.goto('./#beispiele');
    await warte(page);
    await page.getByRole('button', { name: BEISPIEL_KNOPF }).first().click({ timeout: 15_000 });
    await page.waitForFunction(() => location.hash !== '#beispiele', undefined, { timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(1500);
    for (const r of FEST) {
      try {
        await page.goto('./#' + r);
        await warte(page);
        const e = await pruefeTabweg(page);
        ergebnis[r] = {
          stopps: e.stopps.length, rundlauf: e.rundlauf,
          ohneName: e.ohneName, fallen: e.fallen, unsichtbar: e.unsichtbar, verdecktGanz: e.verdecktGanz,
          verdecktTeilAnzahl: e.verdecktTeil.length, verdecktTeil: e.verdecktTeil.slice(0, 8),
          protokoll: e.stopps.map(s => `${s.nr}|${s.rolle}|${s.name}`),
        };
      } catch (err) { ergebnis[r] = { fehler: String(err).slice(0, 300) }; }
      schreibe();
    }
    await ctx.close();
    const rot: string[] = [];
    for (const [r, e] of Object.entries(ergebnis) as [string, any][]) {
      if (e.fehler) rot.push(`${r}: Messfehler ${e.fehler}`);
      if (e.ohneName?.length) rot.push(`${r}: ${e.ohneName.length} Stopp(s) ohne Namen`);
      if (e.fallen?.length) rot.push(`${r}: Tastaturfalle`);
    }
    expect(rot, rot.join('\n')).toEqual([]);
  });
});
