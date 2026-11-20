// Probe: Spricht NVDA die Live-Region überhaupt? (Stufe 5, Nachmessung B2). Aufruf: NVDA_PORT=4246 node e2e/probe/nvda-ansage-probe.mjs
import { sleep, K, note, rec, spoken, mitNvda, nachVorn } from './nvda-erheben1-lib.mjs';
const BASE = `http://127.0.0.1:${process.env.NVDA_PORT ?? 4246}/`;
await mitNvda('ansage-probe', async (page) => {
  await page.goto(BASE + '#interviews'); await page.waitForSelector('#iv-t'); await sleep(1500);
  await page.bringToFront(); await nachVorn();
  await page.focus('#iv-einlesen'); await sleep(800); await spoken();
  for (const [tag, js] of [
    ['A direkt in Region (ohne Fokuswechsel)', () => { document.getElementById('ansage-hoeflich').textContent = 'Probe eins Region.'; }],
    ['B leeren, dann 100 ms später füllen', () => { const r = document.getElementById('ansage-hoeflich'); r.textContent = ''; setTimeout(() => { r.textContent = 'Probe zwei Region.'; }, 100); }],
    ['C dringend', () => { const r = document.getElementById('ansage-dringend'); r.textContent = ''; setTimeout(() => { r.textContent = 'Probe drei dringend.'; }, 100); }],
    ['D Fokus wechseln, 500 ms später Region', () => { document.getElementById('iv-t')?.setAttribute('tabindex', '-1'); document.getElementById('iv-t')?.focus(); setTimeout(() => { const r = document.getElementById('ansage-hoeflich'); r.textContent = ''; setTimeout(() => { r.textContent = 'Probe vier nach Fokus.'; }, 100); }, 500); }],
  ]) { const vorn = await nachVorn(); await page.evaluate(js); await sleep(3500); rec({ schritt: tag, vorn, gesagt: await spoken() }); }
  note('Region', JSON.stringify(await page.evaluate(() => { const r = document.getElementById('ansage-hoeflich'); const cs = getComputedStyle(r); return { live: r.getAttribute('aria-live'), role: r.getAttribute('role'), parent: r.parentElement?.tagName, inert: !!r.closest('[inert]'), hidden: r.closest('[aria-hidden=true]') ? 'aria-hidden!' : '', clip: cs.clip, pos: cs.position, disp: cs.display, vis: cs.visibility }; })));
});
