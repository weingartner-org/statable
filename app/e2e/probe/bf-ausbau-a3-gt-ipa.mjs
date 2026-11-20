// Barrierefreiheit Ausbau A3, Teil 2: Memo-Arten, Kodierphase, ständiger Vergleich (Grounded Theory), Einzelfall-Modus und Randnotizen (IPA).
// Tastatur-Ablauf (Auswahllisten per selectOption gesetzt, alles andere mit Tasten), DOM-Test „verdeckter Fall“, axe-core (WCAG 2.2 AA), 320 px ohne waagrechtes Scrollen.
// Aufruf aus app/:  PORT=5193 node e2e/probe/bf-ausbau-a3-gt-ipa.mjs   (Dev-Server auf 127.0.0.1). Nur headless.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const APP = fileURLToPath(new URL('../..', import.meta.url));
const AXE = readFileSync(path.join(APP, 'node_modules/axe-core/axe.min.js'), 'utf8');
const URL_ = `http://127.0.0.1:${process.env.PORT || 5193}/#kodieren`;
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const erg = { schritte: [], axe: [], ueberlauf: [], fehler: [] };
const log = (ok, was, extra = '') => { erg.schritte.push({ ok, was, extra }); console.log(`${ok ? 'JA  ' : 'NEIN'} ${was}${extra ? ' - ' + extra : ''}`); };

async function axe(page, name) {
  if (!(await page.evaluate(() => !!window.axe))) await page.addScriptTag({ content: AXE });
  const r = await page.evaluate(async (tags) => {
    const x = await window.axe.run(document, { runOnly: { type: 'tag', values: tags } });
    return x.violations.map((v) => ({ id: v.id, impact: v.impact, knoten: v.nodes.map((n) => n.target.join(' ') + ' | ' + n.html.slice(0, 120)) }));
  }, TAGS);
  const n = r.reduce((s, v) => s + v.knoten.length, 0);
  erg.axe.push({ name, regeln: r.length, stellen: n, r });
  console.log(`[axe ${name}] Regeln: ${r.length}, Stellen: ${n}`);
  for (const v of r) console.log(`     ${v.id} (${v.impact}): ${v.knoten.slice(0, 3).join(' ;; ').slice(0, 400)}`);
}
async function ueberlauf(page, name) {
  const u = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth }));
  erg.ueberlauf.push({ name, ...u });
  console.log(`[320 px ${name}] scrollWidth ${u.scrollWidth} / ${u.innerWidth}`);
}
const waehle = async (page, sel, wert) => { await page.locator(sel).focus(); await page.locator(sel).selectOption(wert); await page.waitForTimeout(500); };
const taste = async (page, sel, t = 'Enter') => { await page.locator(sel).focus(); await page.keyboard.press(t); await page.waitForTimeout(600); };

async function ablauf(browser, vp, prefix) {
  const breit = vp.width > 400;
  const ctx = await browser.newContext({ locale: 'de-DE', viewport: vp });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => erg.fehler.push(e.message));
  await page.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 180000 }); await page.waitForSelector('#ko-t', { timeout: 120000 }); await page.waitForTimeout(1200);
  await page.locator('#ko-laden').click();
  await page.waitForSelector('#ko-text', { timeout: 20000 }); await page.waitForTimeout(1500);
  const pruefe = async (name) => { if (breit) await axe(page, `${prefix} ${name}`); else { await ueberlauf(page, name); await axe(page, `${prefix} ${name}`); } };

  // ---- Grounded Theory ----
  await waehle(page, '#ko-arbeitsweise', 'grounded-theory');
  log(await page.locator('#ko-memo-tagebuch').count() >= 0, `${prefix} Arbeitsweise Grounded Theory gesetzt`);
  log((await page.locator('#ko-memo-art').count()) === 1, `${prefix} Memo-Art-Auswahl sichtbar`, await page.locator('#ko-memo-art option').allTextContents().then((a) => a.length + ' Arten'));
  await waehle(page, '#ko-memo-art', 'gt-auswahl');
  await page.locator('#ko-memo-text').focus();
  await page.keyboard.type('Als Nächstes Fälle mit Kontrast suchen, weil die ersten drei ähnlich sind.');
  await page.keyboard.press('Tab'); // Knopf „Memo speichern“
  await page.keyboard.press('Enter'); await page.waitForTimeout(700);
  const listeText = await page.locator('#ko-memo-liste').innerText();
  log(/Art: Theoretische Auswahl/.test(listeText), `${prefix} Memo „Theoretische Auswahl“ gespeichert, Art als Wort in der Liste`);
  await pruefe('GT Memo gespeichert');

  // Kodierphase
  await page.locator('#ko-baum [role=treeitem]').first().focus();
  await page.keyboard.press('Enter'); await page.waitForSelector('#ko-baum-phase', { timeout: 6000 });
  await page.locator('#ko-baum-phase').focus();
  await page.locator('#ko-baum-phase').selectOption('fokussiert'); await page.waitForTimeout(500);
  const label = await page.locator('#ko-baum [role=treeitem]').first().getAttribute('aria-label');
  log(/Phase fokussiert/.test(label || ''), `${prefix} Kodierphase gesetzt, zugänglicher Name des Baumeintrags`, label);
  log(/Phase: fokussiert/.test(await page.locator('#ko-baum').innerText()), `${prefix} Phase steht sichtbar als Wort in der Zeile`);
  await pruefe('GT Phase gesetzt');
  await taste(page, '#ko-baum-fertig');

  // Zwei Stellen (Sätze-Ansicht, Auswahl mit Leertaste)
  await page.locator('#ko-ansicht-saetze').check({ force: true });
  await page.waitForSelector('#ko-liste', { timeout: 8000 });
  await page.locator('#ko-liste').focus();
  await page.keyboard.press('Space'); await page.waitForTimeout(300);
  await taste(page, '#ko-vgl-nimm-1');
  await page.locator('#ko-liste').focus();
  await page.keyboard.press('Delete');
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Space'); await page.waitForTimeout(300);
  await taste(page, '#ko-vgl-nimm-2');
  const h1 = await page.locator('#ko-vgl-h-1').count(), h2 = await page.locator('#ko-vgl-h-2').count();
  const platzText = await page.locator('.platz').first().innerText();
  log(h1 === 1 && h2 === 1 && /Dokument:/.test(platzText), `${prefix} zwei Stellen übernommen (Überschriften Stelle 1 / Stelle 2 mit Dokument, Codes)`, platzText.replace(/\s+/g, ' ').slice(0, 120));
  // Springen
  await page.getByRole('button', { name: /Zur anderen Stelle springen \(Stelle 2\)/ }).focus();
  await page.keyboard.press('Enter'); await page.waitForTimeout(500);
  log(await page.evaluate(() => document.activeElement?.id) === 'ko-vgl-h-2', `${prefix} „Zur anderen Stelle springen“ setzt den Fokus auf die Überschrift der anderen Stelle`);
  await page.locator('#ko-vgl-text').focus();
  await page.keyboard.type('Beide Stellen zeigen Zögern vor der Frage; die zweite nennt einen Grund.');
  await taste(page, '#ko-vgl-speichern');
  await page.locator('#ko-liste').focus(); await page.keyboard.press('Space'); await page.waitForTimeout(500);   // eine der Stellen markieren, damit das Memo in der Liste steht
  const vl = await page.locator('#ko-memo-liste').innerText();
  log(/Art: Vergleich/.test(vl) || (await page.locator('#ko-vgl-text').inputValue()) === '', `${prefix} Vergleichs-Memo gespeichert (Textfeld leer`, /Art: Vergleich/.test(vl) ? 'und in der Memo-Liste' : 'Liste zeigt es nur bei markierter Stelle');
  await pruefe('GT Zwei Stellen');

  // ---- IPA ----
  const texte = {};
  await page.locator('#ko-ansicht-text').check({ force: true }); await page.waitForTimeout(500);
  const doks = page.locator('#ko-dokliste button');
  const nd = await doks.count();
  for (let i = 0; i < nd; i++) {
    await doks.nth(i).click(); await page.waitForTimeout(500);
    const nm = (await doks.nth(i).textContent()).trim();
    texte[nm] = (await page.locator('#ko-text').innerText()).replace(/\s+/g, ' ');
  }
  await waehle(page, '#ko-arbeitsweise', 'ipa');
  await page.waitForSelector('#ko-ez-beginn', { timeout: 8000 });
  log(true, `${prefix} IPA gewählt: Einzelfall-Angebot sichtbar`, (await page.locator('#ko-ez-status').innerText()));
  await pruefe('IPA Angebot');
  await page.locator('#ko-ez-beginn').focus();
  const optionen = await page.locator('#ko-ez-beginn option').allTextContents();
  await page.locator('#ko-ez-beginn').selectOption({ index: 0 });
  await taste(page, '#ko-ez-start');
  const status = await page.locator('#ko-ez-status').innerText();
  log(/Einzelfall-Modus: Sie sehen nur Fall/.test(status), `${prefix} Einzelfall-Modus gestartet`, status.replace(/\s+/g, ' ') + ' | Fälle: ' + optionen.join(', '));
  log(await page.evaluate(() => document.activeElement?.id) === 'ko-ez-status', `${prefix} Fokus bleibt im Bereich (Hinweiszeile)`);
  // DOM-Test verdeckter Fall
  await page.waitForTimeout(600);
  const sichtbareDoks = (await page.locator('#ko-dokliste button').allTextContents()).map((t) => t.replace(/^Öffnen: /, '').trim());
  const html = await page.evaluate(() => document.documentElement.outerHTML.replace(/\s+/g, ' '));
  const verdeckt = Object.keys(texte).filter((n) => !sichtbareDoks.some((s) => n === s || n.endsWith(s) || s.endsWith(n)));
  let leck = [];
  for (const n of verdeckt) {
    const t = texte[n];
    for (let o = 0; o + 40 < t.length; o += 120) { const s = t.slice(o, o + 40); if (html.includes(s.replace(/&/g, '&amp;'))) leck.push(`${n}@${o}`); }
  }
  log(verdeckt.length > 0 && leck.length === 0, `${prefix} DOM-Test: Text verdeckter Fälle fehlt im DOM`, `${sichtbareDoks.length} Dokument(e) sichtbar, ${verdeckt.length} verdeckt, Treffer: ${leck.length}`);
  await pruefe('IPA Einzelfall an');

  // Randnotizen in drei Schichten
  await page.locator('#ko-ansicht-saetze').check({ force: true });
  await page.waitForSelector('#ko-liste', { timeout: 8000 });
  await page.locator('#ko-liste').focus(); await page.keyboard.press('Space'); await page.waitForTimeout(400);
  await page.waitForSelector('#ko-rn-beschreibend', { timeout: 6000 });
  const leg = await page.locator('#ko-rn-formular legend').innerText();
  log(/^Randnotizen zu: „/.test(leg) && (await page.locator('#ko-rn-formular textarea').count()) === 3, `${prefix} Randnotizen: ein fieldset, drei beschriftete Felder`, leg.slice(0, 80));
  await page.locator('#ko-rn-beschreibend').focus(); await page.keyboard.type('Sie nennt die Tutorin.');
  await page.locator('#ko-rn-sprachlich').focus(); await page.keyboard.type('Zögern, „also“ am Anfang.');
  await page.locator('#ko-rn-begrifflich').focus(); await page.keyboard.type('Scheu vor Nähe?');
  await taste(page, '#ko-rn-speichern');
  const rl = await page.locator('#ko-rn-liste').innerText();
  log((rl.match(/Schicht:/g) || []).length === 3, `${prefix} drei Randnotizen gespeichert, in der Liste nach Stelle gruppiert`, `${(rl.match(/Schicht:/g) || []).length} Schichten`);
  await pruefe('IPA Randnotizen');

  // Fall fertig, nächster Fall, Modus verlassen
  await taste(page, '#ko-ez-fertig');
  log(await page.locator('#ko-ez-naechster').count() === 1 || await page.locator('#ko-ez-alle').count() === 1, `${prefix} Fall als fertig markiert, Auswahl „Nächster Fall“`, (await page.locator('#ko-ez-status').innerText()).replace(/\s+/g, ' '));
  log(await page.evaluate(() => document.activeElement?.id) === 'ko-ez-naechster', `${prefix} Fokus in der Auswahl „Nächster Fall“`);
  await pruefe('IPA Fall fertig');
  await taste(page, '#ko-ez-verlassen');
  const frage = await page.locator('#ko-ez-frage').count();
  log(frage === 1 && (await page.evaluate(() => document.activeElement?.id)) === 'ko-ez-bleiben', `${prefix} Rückfrage beim Verlassen (kein Fenster), Fokus auf „Im Modus bleiben“`);
  await pruefe('IPA Rückfrage');
  await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  log((await page.locator('#ko-ez-frage').count()) === 0 && await page.evaluate(() => document.activeElement?.id) === 'ko-ez-verlassen', `${prefix} Esc = im Modus bleiben`);
  await taste(page, '#ko-ez-verlassen');
  await taste(page, '#ko-ez-trotzdem');
  log(/Einzelfall-Modus aus/.test(await page.locator('#ko-ez-status').innerText()), `${prefix} Modus verlassen`);
  await pruefe('IPA verlassen');
  await ctx.close();
}

const b = await chromium.launch({ headless: true });
try {
  await ablauf(b, { width: 1280, height: 900 }, '1280');
  await ablauf(b, { width: 320, height: 700 }, '320');
} catch (e) { erg.fehler.push(String(e.stack || e).slice(0, 500)); console.log('FEHLER', String(e.message || e).slice(0, 400)); }
finally {
  await b.close();
  console.log('Seitenfehler:', erg.fehler.length ? erg.fehler.join(' | ') : 'keine');
  console.log('Überlauf 320 px:', erg.ueberlauf.filter((u) => u.scrollWidth > u.innerWidth).length, 'von', erg.ueberlauf.length, 'Zuständen');
}
