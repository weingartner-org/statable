// Erheben 2, Prüfung 2.1 (Vorschauseite der Bibliothek): gleiche Schritte wie 2b-axe-vorschau.mjs, aber gegen einen schon laufenden
// Vite-Server (PORT, Standard 4352), damit der eigene Serverstart von 2b nicht im Neustart hängt.
// Aufruf: (in app/) npx vite --host 127.0.0.1 --port 4352 --strictPort   und dann   PORT=4352 node e2e/probe/erheben2-vorschau.mjs
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const PORT = process.env.PORT || 4352;
const U = `http://127.0.0.1:${PORT}/src/ausfuellen/vorschau.html#alle`;
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
// Warten, bis der Vite-Server antwortet (der erste Start optimiert Abhängigkeiten, bis zu 6 Minuten).
for (let i = 0; i < 72; i++) {
  try { const r = await fetch(U.replace('#alle', ''), { signal: AbortSignal.timeout(5000) }); if (r.status === 200) break; } catch { /* noch nicht bereit */ }
  await new Promise(r => setTimeout(r, 5000));
}
const b = await chromium.launch();
let verstoesse = 0;
const zeilen = [];
const zeile = (z) => { zeilen.push(z); console.log(z); };
try {
  for (const breite of [1280, 320]) for (const sprache of ['de', 'en']) for (const eng of [false, true]) {
    if (breite === 320 && !eng) continue;
    const page = await (await b.newContext({ locale: sprache === 'de' ? 'de-DE' : 'en-US', viewport: { width: breite, height: 800 } })).newPage();
    page.on('pageerror', e => zeile('PAGEERROR ' + e.message));
    await page.goto(U, { timeout: 60000 }); await page.waitForSelector('[data-seite]', { timeout: 60000 });
    if (sprache === 'en') await page.click('[data-sprache=en]');
    await page.locator('#eng').setChecked(eng);
    await page.waitForTimeout(300);
    const pruefe = async (zustand) => {
      const res = await new AxeBuilder({ page }).withTags(TAGS).analyze();
      verstoesse += res.violations.length;
      zeile(`AXE ${breite} px, ${sprache}, ${eng ? 'eng' : 'Tabelle'}, ${zustand}: ${res.violations.length} Verstöße, ${res.incomplete.length} unklar`);
      for (const v of res.violations) zeile('   VERST ' + v.id + ' ' + v.nodes.map(n => n.target.join(' ') + ' | ' + (n.any[0]?.message || n.all[0]?.message || '').slice(0, 100)).join(' ; '));
      for (const v of res.incomplete) zeile('   unklar: ' + v.id + ' (' + v.nodes.length + ')');
    };
    await pruefe('Ausgangszustand');
    await page.getByRole('radio', { name: sprache === 'de' ? 'Rot' : 'Red' }).first().check();
    await page.getByRole('checkbox', { name: 'Radio' }).first().check();
    await pruefe('Folgefrage eingeblendet');
    const weiter = page.getByRole('button', { name: sprache === 'de' ? 'Weiter' : 'Next', exact: true });
    for (let i = (await weiter.count()) - 1; i >= 0; i--) await weiter.nth(i).click();
    await pruefe('nach „Weiter“ (Fehler)');
    const mass = await page.evaluate(() => ({
      breiter: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      klein: Array.from(document.querySelectorAll('.af button, .af label.opt, .af label.zelle, .af input[type=text], .af input[type=number], .af input[type=date], .af input[type=range]'))
        .filter(e => (e instanceof HTMLElement) && !e.closest('[hidden]')).map(e => { const r = e.getBoundingClientRect(); return { e: e.tagName + '.' + e.className, w: Math.round(r.width), h: Math.round(r.height) }; })
        .filter(x => x.h < 43.5 || x.w < 43.5),
    }));
    zeile(`   Umbruch ${breite} px, ${sprache}, ${eng ? 'eng' : 'Tabelle'}: ${mass.breiter <= 0 ? 'kein waagrechtes Scrollen' : 'ÜBERBREIT um ' + mass.breiter + ' px'}; Ziele unter 44 px: ${mass.klein.length} ${JSON.stringify(mass.klein.slice(0, 3))}`);
    await page.context().close();
  }
} finally { await b.close(); }
zeile(verstoesse === 0 ? 'ERGEBNIS: 0 Verstöße' : `ERGEBNIS: ${verstoesse} Verstöße`);
