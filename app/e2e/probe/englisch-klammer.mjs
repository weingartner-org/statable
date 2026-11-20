// Probe WCAG 3.1.2: englische Klammern in deutschen Texten tragen lang="en"; deutsche Klammern nicht.
// Aufruf: PORT=4196 node e2e/probe/englisch-klammer.mjs
import { chromium } from '@playwright/test';
import { createRequire } from 'node:module';
const PORT = process.env.PORT ?? '4195';
const b = await chromium.launch(); const ctx = await b.newContext({ locale: 'de-DE', viewport: { width: 1280, height: 800 } }); const page = await ctx.newPage();
let summe = 0, falsch = 0;
for (const r of ['hilfe/faktorenanalyse', 'hilfe/partial-least-squares', 'hilfe/faktorwert', 'hilfe/posterior-predictive-check', 'hilfe/p-wert', 'lernen', 'verstehen/verteilungen']) {
  await page.goto(`http://127.0.0.1:${PORT}/#` + r); await page.waitForTimeout(2000);
  const t = await page.evaluate(() => {
    const wurzel = document.querySelector('#inhalt') ?? document.body;
    const mit = [...wurzel.querySelectorAll('[lang="en"]')].filter(e => e.closest('#inhalt') && !e.classList.contains('start-slogan'));
    const lang = mit.map(e => e.textContent);
    // Klammern mit englischem Wortlaut ohne lang? (nur Anzeige, zur Sichtprüfung)
    const txt = wurzel.innerText ?? ''; const alle = [...new Set(txt.match(/\((?:[a-z][a-z-]+)(?: [a-z-]+){0,3}\)/gi) || [])].slice(0, 12);
    const falsche = lang.filter(x => /^(mittelwert|test|median|norm|varianz|streuung)$/i.test(x ?? ''));
    return { mitLang: lang.length, lang: lang.slice(0, 8), klammern: alle, falsche };
  });
  summe += t.mitLang; falsch += t.falsche.length;
  console.log(r, JSON.stringify(t));
}
console.log('SUMME lang=en:', summe, 'falsch markiert:', falsch);
await b.close();
