// Paket 2B: axe auf der Vorschauseite der Fragetypen-Bibliothek (src/ausfuellen/vorschau.html), bei 1280 und 320 Pixel, de und en,
// im Ausgangszustand und nach „Weiter“ auf allen Seiten (Fehlerzustand). Startet selbst einen Vite-Server (ohne Svelte). Aufruf in app/:  node e2e/probe/2b-axe-vorschau.mjs
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';

const APP = fileURLToPath(new URL('../..', import.meta.url));
const PORT0 = Number(process.env.PORT || 4351);
const server = await createServer({ configFile: false, root: APP, logLevel: 'error', server: { port: PORT0, host: '127.0.0.1', strictPort: false } });
await server.listen();
const PORT = server.httpServer.address().port;
const U = `http://127.0.0.1:${PORT}/src/ausfuellen/vorschau.html#alle`;
const b = await chromium.launch();
let verstoesse = 0;
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
try {
  for (const breite of [1280, 320]) for (const sprache of ['de', 'en']) for (const eng of [false, true]) {
    if (breite === 320 && !eng) continue;   // Handy-Breite zeigt die Gruppenfolge (die Seite stellt das selbst ein)
    const page = await (await b.newContext({ locale: sprache === 'de' ? 'de-DE' : 'en-US', viewport: { width: breite, height: 800 } })).newPage();
    await page.goto(U); await page.waitForSelector('[data-seite]');
    if (sprache === 'en') await page.click('[data-sprache=en]');
    await page.locator('#eng').setChecked(eng);
    await page.waitForTimeout(300);
    const pruefe = async (zustand) => {
      const res = await new AxeBuilder({ page }).withTags(TAGS).analyze();
      verstoesse += res.violations.length;
      console.log(`${breite} px, ${sprache}, ${eng ? 'eng' : 'Tabelle'}, ${zustand}: ${res.violations.length} Verstöße, ${res.incomplete.length} unklar`);
      for (const v of res.violations) console.log('   ', v.id, v.nodes.map(n => n.target.join(' ') + ' | ' + (n.any[0]?.message || n.all[0]?.message || '').slice(0, 100)));
      for (const v of res.incomplete) console.log('    unklar:', v.id, v.nodes.length);
    };
    await pruefe('Ausgangszustand');
    await page.getByRole('radio', { name: sprache === 'de' ? 'Rot' : 'Red' }).first().check();   // blendet die Folgefrage ein
    await page.getByRole('checkbox', { name: sprache === 'de' ? 'Radio' : 'Radio' }).first().check();
    await pruefe('Folgefrage eingeblendet');
    const weiter = page.getByRole('button', { name: sprache === 'de' ? 'Weiter' : 'Next', exact: true });
    for (let i = (await weiter.count()) - 1; i >= 0; i--) await weiter.nth(i).click();
    await pruefe('nach „Weiter“ (Fehler)');
    // Umbruch (kein waagrechtes Scrollen) und Zielgröße (Knöpfe, Auswahlzeilen, Felder mindestens 44 × 44; Ausnahme: Texteingaben schmaler nur in der Breite)
    const mass = await page.evaluate(() => ({
      breiter: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      klein: Array.from(document.querySelectorAll('.af button, .af label.opt, .af label.zelle, .af input[type=text], .af input[type=number], .af input[type=date], .af input[type=range]'))
        .filter(e => (e instanceof HTMLElement) && !e.closest('[hidden]')).map(e => { const r = e.getBoundingClientRect(); return { e: e.tagName + '.' + e.className, w: Math.round(r.width), h: Math.round(r.height) }; })
        .filter(x => x.h < 43.5 || x.w < 43.5),
    }));
    console.log(`   Umbruch: ${mass.breiter <= 0 ? 'kein waagrechtes Scrollen' : 'ÜBERBREIT um ' + mass.breiter + ' px'}; Ziele unter 44 px: ${mass.klein.length}`, mass.klein.slice(0, 5));
    await page.context().close();
  }
} finally { await b.close(); await server.close(); }
console.log(verstoesse === 0 ? 'ERGEBNIS: 0 Verstöße' : `ERGEBNIS: ${verstoesse} Verstöße`);
process.exit(verstoesse === 0 ? 0 : 1);
