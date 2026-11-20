// Abschlussmessung Welle 7, Zoom und Reflow: 1.4.10 (320 x 640), 1.4.4 (Fenster 640 CSS-Pixel = Browserzoom 200 % auf 1280 Pixel),
// 1.4.12 (Textabstand per eingespritztem CSS), 1.3.4 (Hoch- und Querformat).
// Je Route (Beispiel geöffnet): waagrechtes Seitenscrollen, abgeschnittener Text (overflow hidden/clip mit Text, scrollWidth/-Height größer
// als Box; nur NEU gegenüber derselben Seite ohne Textabstand), Überlappung bedienbarer Elemente (neu gegenüber ohne Textabstand).
// Rot bei: waagrechtem Seitenscrollen (320, 640, Hoch- und Querformat). Abgeschnittenes und Überlappungen stehen im Ergebnis
// e2e/ergebnisse/zoom.json und werden in ABSCHLUSS.md bewertet. Gegenprobe: derselbe Prüfer auf einer präparierten Seite.
import { test, expect, type Page } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const ZIEL = path.resolve('e2e/ergebnisse/zoom.json');
const BEISPIEL_KNOPF = /Öffnen und üben|Open and practice/;
const ROUTEN = ['start', 'beispiele', 'daten', 'spalten', 'umformen', 'karte', 'blatt/neu', 'protokoll', 'befehle', 'bericht',
  'einstellungen', 'hilfe', 'planen', 'verstehen', 'lernen', 'r-probe', 'impressum', 'datenschutz', 'behoerden',
  'tabelle', 'amtlich', 'bearbeiten', 'hilfe/daten-seite', 'hilfe/fallgewichte', 'lernen/pfad/grundlagen',
  'verstehen/verteilungen', 'verstehen/kennzahlen'];
const TEXTABSTAND = `*{line-height:1.5 !important;letter-spacing:0.12em !important;word-spacing:0.16em !important}
p,li,dd,h1,h2,h3,h4,h5,h6{margin-bottom:2em !important}`;

export type Messung = { ueberlaufX: boolean; scrollBreite: number; fensterBreite: number; verursacher: string[]; abgeschnitten: string[]; ueberlappt: string[] };

/** Misst Seitenüberlauf, abgeschnittenen Text und Überlappung bedienbarer Elemente im aktuellen Zustand. */
export async function messeLayout(page: Page): Promise<Messung> {
  return page.evaluate(() => {
    const kurz = (e: Element) => `${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}${typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : ''}`;
    const schluessel = (e: Element) => `${kurz(e)} "${(e.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40)}"`;
    const sichtbar = (e: Element) => { const s = getComputedStyle(e); const r = e.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0; };
    const doc = document.documentElement;
    const ueberlaufX = doc.scrollWidth > innerWidth + 1;
    const verursacher: string[] = [];
    if (ueberlaufX) {
      for (const e of Array.from(document.body.querySelectorAll('*'))) {
        if (!sichtbar(e)) continue;
        const r = e.getBoundingClientRect();
        if (r.right <= innerWidth + 1) continue;
        let enthalten = false;
        for (let p = e.parentElement; p && p !== document.body && p !== doc; p = p.parentElement) {
          const o = getComputedStyle(p).overflowX;
          if (o !== 'visible') { enthalten = true; break; }
        }
        if (!enthalten) verursacher.push(`${kurz(e)} rechts=${Math.round(r.right)}`);
        if (verursacher.length >= 6) break;
      }
    }
    const abgeschnitten: string[] = [];
    for (const e of Array.from(document.body.querySelectorAll('*'))) {
      const s = getComputedStyle(e);
      const clipX = ['hidden', 'clip'].includes(s.overflowX), clipY = ['hidden', 'clip'].includes(s.overflowY);
      if (!clipX && !clipY) continue;
      const h = e as HTMLElement;
      if (h.clientWidth <= 4 || h.clientHeight <= 4 || !sichtbar(e)) continue;
      if (!(e.textContent ?? '').trim()) continue;
      if ((clipX && h.scrollWidth > h.clientWidth + 1) || (clipY && h.scrollHeight > h.clientHeight + 1)) {
        abgeschnitten.push(schluessel(e) + (s.textOverflow === 'ellipsis' ? ' [ellipsis]' : ''));
      }
    }
    const bedien = Array.from(document.querySelectorAll('a[href],button,input:not([type=hidden]),select,textarea,[role=button],[role=tab],[tabindex="0"]')).filter(sichtbar).slice(0, 400);
    const rects = bedien.map(e => e.getBoundingClientRect());
    const ueberlappt: string[] = [];
    for (let i = 0; i < bedien.length; i++) for (let j = i + 1; j < bedien.length; j++) {
      if (bedien[i].contains(bedien[j]) || bedien[j].contains(bedien[i])) continue;
      const a = rects[i], b = rects[j];
      const w = Math.min(a.right, b.right) - Math.max(a.left, b.left), hh = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (w > 3 && hh > 3) ueberlappt.push(`${schluessel(bedien[i])} x ${schluessel(bedien[j])}`);
    }
    return { ueberlaufX, scrollBreite: doc.scrollWidth, fensterBreite: innerWidth, verursacher, abgeschnitten, ueberlappt };
  });
}

const neu = (nachher: string[], vorher: string[]) => nachher.filter(x => !vorher.includes(x));

async function warte(page: Page, ms = 500) {
  await page.locator('#inhalt').first().waitFor({ state: 'attached', timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(ms);
}

test.describe('Zoom und Reflow', () => {
  test('Gegenprobe: der Prüfer findet Überlauf, abgeschnittenen Text und Überlappung', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.setContent(`<!doctype html><html><body>
      <div style="width:600px;height:20px;background:#ccc">breit</div>
      <div id="k" style="width:50px;height:20px;overflow:hidden;white-space:nowrap">Dieser Text ist viel zu lang für die Box</div>
      <button style="position:absolute;top:100px;left:10px;width:100px;height:30px">Eins</button>
      <button style="position:absolute;top:110px;left:50px;width:100px;height:30px">Zwei</button></body></html>`);
    const m = await messeLayout(page);
    expect(m.ueberlaufX).toBe(true);
    expect(m.verursacher.length).toBeGreaterThan(0);
    expect(m.abgeschnitten.some(x => x.includes('#k'))).toBe(true);
    expect(m.ueberlappt.length).toBeGreaterThan(0);
    // Textabstand-Einspritzung macht Text in fester Höhe sichtbar zu groß
    await page.setContent(`<!doctype html><html><body><div id="z" style="height:24px;overflow:hidden;width:200px">Kurzer Text</div></body></html>`);
    const vorher = await messeLayout(page);
    await page.addStyleTag({ content: TEXTABSTAND + ' #z{width:60px !important}' });
    const nachher = await messeLayout(page);
    expect(neu(nachher.abgeschnitten, vorher.abgeschnitten).length).toBeGreaterThan(0);
  });

  test('alle Routen: 320x640, 640 (= Zoom 200 %), Textabstand, Hoch- und Querformat', async ({ browser }) => {
    test.setTimeout(1_800_000);
    const ctx = await browser.newContext({ locale: 'de-DE', viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    const ergebnis: Record<string, any> = {};
    const schreibe = () => { mkdirSync(path.dirname(ZIEL), { recursive: true }); writeFileSync(ZIEL, JSON.stringify({ erstellt: new Date().toISOString(),
      hinweis: 'dist-e2e, de-DE, Chromium. 200 %: Fenster 640 CSS-Pixel (entspricht Browserzoom 200 % auf 1280). Textabstand: WCAG-1.4.12-CSS, nur Neues gegenüber ohne Textabstand.', routen: ergebnis }, null, 1), 'utf8'); };
    await page.goto('./#beispiele');
    await warte(page, 800);
    await page.getByRole('button', { name: BEISPIEL_KNOPF }).first().click({ timeout: 15_000 });
    await page.waitForFunction(() => location.hash !== '#beispiele', undefined, { timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const formate: [string, number, number][] = [['320x640', 320, 640], ['640x512 (Zoom 200 %)', 640, 512], ['390x844 hoch', 390, 844], ['844x390 quer', 844, 390]];
    for (const r of ROUTEN) {
      const e: Record<string, any> = {};
      try {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto('./#' + r);
        await warte(page, 800);
        e['inhalt'] = await page.evaluate(() => ({ titel: document.title, h1: document.querySelector('#inhalt h1')?.textContent?.trim() ?? '', zeichen: (document.querySelector('#inhalt')?.textContent ?? '').length }));
        for (const [name, w, h] of formate) {
          await page.setViewportSize({ width: w, height: h });
          await page.waitForTimeout(400);
          const m = await messeLayout(page);
          e[name] = { ueberlaufX: m.ueberlaufX, scrollBreite: m.scrollBreite, fensterBreite: m.fensterBreite, verursacher: m.verursacher, abgeschnittenOhneAbstand: m.abgeschnitten.length, ueberlapptOhneAbstand: m.ueberlappt.length };
          // Textabstand je Format 1280, 320 und 640
          if (name === '320x640' || name.startsWith('640')) {
            const h2 = await page.addStyleTag({ content: TEXTABSTAND });
            await page.waitForTimeout(400);
            const t = await messeLayout(page);
            await h2.evaluate(el => el.remove());
            e[name].mitTextabstand = {
              ueberlaufX: t.ueberlaufX, neuAbgeschnitten: neu(t.abgeschnitten, m.abgeschnitten).slice(0, 10), neuUeberlappt: neu(t.ueberlappt, m.ueberlappt).slice(0, 10),
              neuAbgeschnittenAnzahl: neu(t.abgeschnitten, m.abgeschnitten).length, neuUeberlapptAnzahl: neu(t.ueberlappt, m.ueberlappt).length,
            };
          }
        }
        // Textabstand auch im breiten Fenster
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.waitForTimeout(400);
        const b0 = await messeLayout(page);
        const h3 = await page.addStyleTag({ content: TEXTABSTAND });
        await page.waitForTimeout(400);
        const b1 = await messeLayout(page);
        await h3.evaluate(el => el.remove());
        e['1280x800'] = { abgeschnittenOhneAbstand: b0.abgeschnitten.length, ueberlapptOhneAbstand: b0.ueberlappt.length, mitTextabstand: {
          ueberlaufX: b1.ueberlaufX, neuAbgeschnitten: neu(b1.abgeschnitten, b0.abgeschnitten).slice(0, 10), neuUeberlappt: neu(b1.ueberlappt, b0.ueberlappt).slice(0, 10),
          neuAbgeschnittenAnzahl: neu(b1.abgeschnitten, b0.abgeschnitten).length, neuUeberlapptAnzahl: neu(b1.ueberlappt, b0.ueberlappt).length } };
      } catch (err) { e['fehler'] = String(err).slice(0, 300); }
      ergebnis[r] = e;
      schreibe();
    }
    // Dialog: Befehlspalette (Strg+K) bei 320 und mit Textabstand
    {
      const e: Record<string, any> = {};
      try {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto('./#daten'); await warte(page, 800);
        await page.keyboard.press('Control+k');
        await page.waitForTimeout(600);
        const offen = await page.locator('[role=dialog]:visible').count();
        e['geoeffnet'] = offen;
        if (offen) {
          for (const [name, w, h] of [['1280x800', 1280, 800], ['320x640', 320, 640]] as [string, number, number][]) {
            await page.setViewportSize({ width: w, height: h }); await page.waitForTimeout(400);
            const m = await messeLayout(page);
            const h2 = await page.addStyleTag({ content: TEXTABSTAND }); await page.waitForTimeout(400);
            const t = await messeLayout(page); await h2.evaluate(el => el.remove());
            const rect = await page.locator('[role=dialog]:visible').first().evaluate(el => { const r = el.getBoundingClientRect(); return { links: Math.round(r.left), rechts: Math.round(r.right), oben: Math.round(r.top), unten: Math.round(r.bottom), fenster: [innerWidth, innerHeight] }; });
            e[name] = { ueberlaufX: m.ueberlaufX, dialogRechteck: rect, neuAbgeschnitten: neu(t.abgeschnitten, m.abgeschnitten).slice(0, 10), neuUeberlappt: neu(t.ueberlappt, m.ueberlappt).slice(0, 10) };
          }
        }
      } catch (err) { e['fehler'] = String(err).slice(0, 300); }
      ergebnis['dialog:befehlspalette'] = e;
      schreibe();
    }
    await ctx.close();
    const rot: string[] = [];
    for (const [r, e] of Object.entries(ergebnis)) {
      if (e.fehler) rot.push(`${r}: Messfehler ${e.fehler}`);
      for (const f of ['320x640', '640x512 (Zoom 200 %)', '390x844 hoch', '844x390 quer']) if (e[f]?.ueberlaufX) rot.push(`${r} @${f}: waagrechtes Seitenscrollen (${e[f].scrollBreite} > ${e[f].fensterBreite}) ${e[f].verursacher.join('; ')}`);
    }
    expect(rot, rot.join('\n')).toEqual([]);
  });
});
