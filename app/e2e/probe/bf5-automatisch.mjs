// BF5 (Stufe 5, Barrierefreiheit automatisch): axe, Zielgröße, Umbruch bei 320 px, Kontrastmodus, Tastatur-Durchlauf,
// Dialoge, Word-Protokoll (docx-pruefen), Erstnutzer-Probe nur mit Tastatur. Misst nur, ändert keine App-Datei.
// Aufruf aus app/ (Vorschau auf Port 4255 läuft):  node e2e/probe/bf5-automatisch.mjs
// Ausgabe: Scratchpad-Ordner (Umgebungsvariable BF5_AUS) mit bf5-ergebnis.json und bf5-log.txt
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE || 'http://127.0.0.1:4255';
const AUS = process.env.BF5_AUS || path.join(fileURLToPath(new URL('.', import.meta.url)), 'bf5-aus');
mkdirSync(AUS, { recursive: true });
const REPO = fileURLToPath(new URL('../../../', import.meta.url));
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const TEXTE = {
  de: { bsp: /Beispielprojekt mit zwei Kodierenden laden/, erstellen: /^Tabelle erstellen$/, ueb: /Überschneidungen berechnen/, len: /Segmentlängen berechnen/,
    beginnen: /Einigung beginnen/, weiter: /^Weiter$/, anlegen: /Konsens anlegen/, word: /Protokoll als Word/, hinzu: /^Hinzufügen$/, suchen: /Treffer suchen/,
    ersetzen: /^Ersetzen$/, abbrechen: /^Abbrechen$/, uebung: /Öffnen und üben/, menu: /Mit Passwort speichern …/, sprachParam: '', lang: 'de-DE' },
  en: { bsp: /Load example project with two coders/, erstellen: /^Create table$/, ueb: /Calculate overlaps/, len: /Calculate passage lengths/,
    beginnen: /Start the agreement/, weiter: /^Next$/, anlegen: /Create consensus/, word: /Protocol as Word/, hinzu: /^Add$/, suchen: /Find matches/,
    ersetzen: /^Replace$/, abbrechen: /^Cancel$/, uebung: /Open and practice/, menu: /Save with a password …/, sprachParam: '?sprache=en', lang: 'en-US' },
};

const ergebnis = { laeufe: [], walk: {}, probe: {}, docx: [], fehler: [] };
const logZeilen = [];
const log = (...a) => { const s = a.join(' '); console.log(s); logZeilen.push(s); };

async function laufe(sprache, breite, mitForced) {
  const T = TEXTE[sprache];
  const b = await chromium.launch();
  const ctx = await b.newContext({ locale: T.lang, viewport: { width: breite, height: 900 }, serviceWorkers: 'block', acceptDownloads: true });
  const page = await ctx.newPage();
  const lauf = { sprache, breite, zustaende: [] };
  ergebnis.laeufe.push(lauf);
  page.on('pageerror', e => ergebnis.fehler.push(`[${sprache} ${breite}] Seitenfehler: ${e.message.slice(0, 200)}`));
  page.on('console', m => { if (m.type() === 'error') ergebnis.fehler.push(`[${sprache} ${breite}] Konsole: ${m.text().slice(0, 200)}`); });

  const fokus = () => page.evaluate(() => { const e = document.activeElement; return e ? `${e.tagName}#${e.id} "${(e.innerText || e.getAttribute('aria-label') || '').trim().slice(0, 60)}"` : '-'; });

  // Zustand prüfen: axe, Zielgröße, Umbruch, Scrollbereiche, Kontrastmodus, Tastatur-Durchlauf
  async function zustand(name, { dialog = false } = {}) {
    const z = { name };
    const r = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    z.axeVerstoesse = r.violations.map(v => ({ id: v.id, impact: v.impact, knoten: v.nodes.map(n => n.target.join(' ')).slice(0, 5), beschreibung: v.help }));
    z.unklarGruppen = {}; for (const v of r.incomplete) for (const n of v.nodes) { const k = v.id + ':' + (n.any[0]?.data?.messageKey || n.all[0]?.data?.messageKey || n.any[0]?.message?.slice(0, 40) || '?'); (z.unklarGruppen[k] ||= { anzahl: 0, beispiel: n.target.join(' ').slice(0, 120) }).anzahl++; }
    z.axeUnklar = r.incomplete.map(v => ({ id: v.id, anzahl: v.nodes.length, knoten: v.nodes.map(n => n.target.join(' ')).slice(0, 4), grund: (v.nodes[0]?.any[0]?.message || v.nodes[0]?.all[0]?.message || '').slice(0, 160) }));
    z.zielgroesse = await page.evaluate(() => {
      const sel = 'button, a[href], input:not([type=hidden]), select, textarea, summary, [role=button], [role=radio], [role=checkbox], [role=tab]';
      const out = [];
      for (const e of document.querySelectorAll(sel)) {
        if (e.closest('[hidden],[inert]')) continue;
        const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden') continue;
        let q = e;
        if (e.matches('input[type=radio],input[type=checkbox]') && e.closest('label')) q = e.closest('label');
        const r = q.getBoundingClientRect(); if (r.width <= 1 || r.height <= 1) continue; // nur Lesehilfe (sr-only)
        if (r.width < 24 || r.height < 24) {
          const wortlink = e.tagName === 'BUTTON' && e.tabIndex === -1 && !!e.closest('p,li,h1,h2,h3,h4,h5,h6,td,dd');
          out.push({ tag: e.tagName, text: (e.innerText || e.value || e.getAttribute('aria-label') || '').trim().slice(0, 40), groesse: `${Math.round(r.width)}x${Math.round(r.height)}`, wortlink });
        }
      }
      return out;
    });
    z.umbruch = await page.evaluate(() => ({ seiteScrollBreite: document.documentElement.scrollWidth, fenster: innerWidth }));
    z.scrollbereiche = await page.evaluate(() => [...document.querySelectorAll('*')].filter(e => {
      const s = getComputedStyle(e); if (!['auto', 'scroll'].includes(s.overflowX)) return false;
      if (e.scrollWidth <= e.clientWidth + 1 || e.clientWidth < 5) return false; return !!e.getBoundingClientRect().width;
    }).map(e => ({ tag: e.tagName, klasse: String(e.className).slice(0, 40), tabIndex: e.tabIndex, name: e.getAttribute('aria-label') || e.getAttribute('aria-labelledby') || '', erreichbar: e.tabIndex >= 0 })));
    // Tastatur-Durchlauf mit Tab
    z.tab = await tabwalk(dialog ? 40 : 160, dialog);
    // Kontrastmodus (nur bei 1280 px)
    if (mitForced) {
      await page.emulateMedia({ forcedColors: 'active' });
      await page.waitForTimeout(250);
      z.kontrast = await page.evaluate(() => {
        const out = [];
        for (const e of document.querySelectorAll('button, input:not([type=hidden]), select, textarea, [role=button], summary')) {
          if (e.closest('[hidden],[inert]')) continue;
          const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden') continue;
          const r = e.getBoundingClientRect(); if (r.width <= 1 || r.height <= 1) continue;
          const rand = s.borderTopStyle !== 'none' || s.outlineStyle !== 'none' || (s.appearance && s.appearance !== 'none' && s.appearance !== 'auto');
          if (!rand && e.tagName !== 'INPUT') out.push((e.innerText || e.getAttribute('aria-label') || e.tagName).trim().slice(0, 40));
        }
        const fa = [...document.querySelectorAll('[style*="forced-color-adjust"], button, input')].filter(e => getComputedStyle(e).forcedColorAdjust === 'none').length;
        return { ohneRand: out.slice(0, 12), ohneRandAnzahl: out.length, forcedColorAdjustNone: fa };
      });
      z.kontrastTab = await tabwalk(40, dialog, true);
      await page.emulateMedia({ forcedColors: 'none' });
      await page.waitForTimeout(150);
    }
    lauf.zustaende.push(z);
    log(`[${sprache} ${breite}] ${name}: axe ${z.axeVerstoesse.length} Verstöße, ${z.axeUnklar.length} Regeln unklar, Zielgröße ${z.zielgroesse.length} unter 24 px, Seitenbreite ${z.umbruch.seiteScrollBreite}/${z.umbruch.fenster}, Scrollbereiche ${z.scrollbereiche.length}, Tab-Falle ${z.tab.falle}, ohne Fokusrahmen ${z.tab.ohneSichtbar}, außerhalb Dialog ${z.tab.ausDialog}`);
    return z;
  }

  async function tabwalk(n, dialog, forced = false) {
    const st = { schritte: n, verschiedene: 0, ohneSichtbar: 0, ohneSichtbarBeispiele: [], falle: 0, ausDialog: 0, weg: [] };
    const gesehen = new Set(); let letzter = null, gleich = 0;
    for (let i = 0; i < n; i++) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => {
        const e = document.activeElement; if (!e || e === document.body) return null;
        const s = getComputedStyle(e); const d = document.querySelector('dialog[open]');
        const sichtbar = (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2) || (s.boxShadow && s.boxShadow !== 'none');
        const w = (window.__tabIds ||= new WeakMap()); if (!w.has(e)) w.set(e, (window.__tabZaehler = (window.__tabZaehler || 0) + 1));
        return { key: `${e.tagName}#${e.id}|n${w.get(e)}|${(e.innerText || e.getAttribute('aria-label') || e.name || '').trim().slice(0, 40)}`, sichtbar, aussen: d ? !d.contains(e) : false, name: (e.innerText || e.getAttribute('aria-label') || '').trim().slice(0, 50), rolle: e.getAttribute('role') || e.tagName };
      });
      if (!info) { st.weg.push('kein Fokus'); continue; }
      if (!gesehen.has(info.key)) { gesehen.add(info.key); st.verschiedene++; }
      if (!info.sichtbar) { st.ohneSichtbar++; if (st.ohneSichtbarBeispiele.length < 6) st.ohneSichtbarBeispiele.push(info.key); }
      if (info.aussen) st.ausDialog++;
      if (info.key === letzter) { gleich++; if (gleich === 4) st.falle++; } else { gleich = 0; }
      letzter = info.key;
    }
    st.verschiedeneNamen = [...gesehen].length;
    return st;
  }

  // Tab bis ein Ziel erreicht ist (für die Erstnutzer-Probe)
  async function tabBis(sel, re, max = 400) {
    let n = 0; const weg = [];
    for (; n < max; n++) {
      await page.keyboard.press('Tab');
      const hit = await page.evaluate(({ sel, re }) => {
        const e = document.activeElement; if (!e) return { hit: false, txt: '' };
        const txt = (e.innerText || e.getAttribute('aria-label') || (e.labels && e.labels[0] && e.labels[0].innerText) || '').trim();
        const ok = (sel && e.matches(sel)) || (re && new RegExp(re).test(txt) && e.matches('button,a,input,select,textarea,summary,[role=radio],[role=button]'));
        return { hit: !!ok, txt: `${e.tagName}#${e.id} "${txt.slice(0, 50)}"` };
      }, { sel, re: re ? re.source : null });
      weg.push(hit.txt);
      if (hit.hit) return { schritte: n + 1, weg, gefunden: true };
    }
    return { schritte: n, weg: weg.slice(-8), gefunden: false };
  }

  const fehlerStelle = async (name, aktion) => { try { await aktion(); } catch (e) { log(`[${sprache} ${breite}] ${name}: NICHT GEMESSEN (${e.message.split('\n')[0].slice(0, 160)})`); lauf.zustaende.push({ name, nichtGemessen: e.message.split('\n')[0].slice(0, 200) }); } };

  await page.goto(`${BASE}/${T.sprachParam}#beispiele`, { timeout: 240000 });
  await page.getByRole('button', { name: T.uebung }).first().click({ timeout: 240000 });
  await page.waitForTimeout(2500);
  await page.goto(`${BASE}/${T.sprachParam}#interviews`, { timeout: 240000 });
  await page.waitForSelector('#iv-t', { timeout: 240000 });
  await page.waitForTimeout(1500);

  await zustand('01 Seite leer', { }).catch(e => log('Fehler 01', e.message));
  await page.getByRole('button', { name: T.bsp }).click();
  await page.waitForSelector('#qx-erg-t', { timeout: 60000 });
  await page.waitForTimeout(800);
  await zustand('02 Beispielprojekt eingelesen');

  await page.getByRole('button', { name: T.erstellen }).click();
  await page.waitForSelector('#qm-erg-t');
  await page.getByRole('button', { name: T.ueb }).click();
  await page.waitForSelector('#qm-ueb-erg-t');
  await page.getByRole('button', { name: T.len }).click();
  await page.waitForSelector('#qm-len-erg-t');
  await zustand('03 Fall-Code-Matrix mit Überschneidungen');

  await page.locator('#qu-schw').selectOption('90').catch(async () => { log('Schwelle 90 nicht als Wert, Liste:', await page.locator('#qu-schw option').allInnerTexts()); });
  await page.locator('#qu-berechnen').click();
  await page.waitForSelector('#qu-erg-t');
  await page.waitForTimeout(400);
  log(`[${sprache} ${breite}] Schwelle gewählt: ${await page.locator('#qu-schw').inputValue()} | Fokus nach Berechnen: ${await fokus()}`);
  await zustand('04 Übereinstimmung (90 %)');

  await page.getByRole('button', { name: T.beginnen }).click();
  await page.waitForSelector('#qk-t');
  await page.waitForTimeout(300);
  await zustand('05 Einigung beginnen, erste Abweichung');

  await page.locator('input[name="qk-wahl"]').first().check();
  await page.getByRole('button', { name: T.weiter }).click();
  await page.waitForTimeout(400);
  await zustand('06 Fehler: Begründung leer');
  await page.fill('#qk-begr', 'Die Definition passt');
  await page.getByRole('button', { name: T.weiter }).click();
  await page.waitForTimeout(400);
  await zustand('07 Abweichung entschieden (Weiter)');

  // Restliche Abweichungen entscheiden, bis „Konsens anlegen“ frei ist
  for (let k = 0; k < 12; k++) {
    const frei = await page.getByRole('button', { name: T.anlegen }).getAttribute('aria-disabled');
    if (frei !== 'true') break;
    if (await page.locator('input[name="qk-wahl"]').count() === 0) break;
    await page.locator('input[name="qk-wahl"]').first().check();
    await page.fill('#qk-begr', 'Weiterer Fall entschieden');
    if (await page.getByRole('button', { name: T.weiter }).count()) await page.getByRole('button', { name: T.weiter }).click();
    await page.waitForTimeout(250);
  }
  await page.getByRole('button', { name: T.anlegen }).click();
  await page.waitForSelector('#qk-erg-t', { timeout: 15000 });
  await page.waitForTimeout(800);
  await zustand('08 Konsens-Ergebnis');

  await fehlerStelle('Word-Protokoll', async () => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.getByRole('button', { name: T.word }).click()]);
    const datei = path.join(AUS, `protokoll-${sprache}-${breite}.docx`);
    await dl.saveAs(datei);
    let ausgang = 0, ausgabe = '';
    try { ausgabe = execFileSync('node', ['scripts/docx-pruefen.mjs', datei], { cwd: REPO, encoding: 'utf8' }); }
    catch (e) { ausgang = e.status; ausgabe = (e.stdout || '') + (e.stderr || ''); }
    ergebnis.docx.push({ sprache, breite, datei, ausgang, ausgabe: ausgabe.slice(-600) });
    log(`[${sprache} ${breite}] Word-Protokoll gespeichert, docx-pruefen Ausgang ${ausgang}`);
  });

  // Beispielinterview: Pseudonymisieren
  await fehlerStelle('Beispielinterview', async () => {
    await page.locator('#iv-beispiel').click();
    await page.waitForSelector('#iv-offen-t', { timeout: 20000 });
    await page.locator('#pn-name').scrollIntoViewIfNeeded();
    await page.locator('#pn-name').fill('Lena');
    await page.getByRole('button', { name: T.hinzu }).click();
    await page.waitForTimeout(300);
    await page.locator('#pn-suchen').click();
    await page.waitForSelector('#pn-treffer-t', { timeout: 15000 });
    await page.waitForTimeout(400);
    await zustand('09 Pseudonymisieren: Treffer gefunden');
    await fehlerStelle('Ersetzen-Dialog', async () => {
      await page.locator('#pn-ersetzen').click();
      await page.waitForSelector('#pn-dlg-t');
      await page.waitForTimeout(500);
      await zustand('10 Ersetzen-Dialog offen', { dialog: true });
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      const offen = await page.evaluate(() => !!document.querySelector('dialog[open]'));
      log(`[${sprache} ${breite}] Esc im Ersetzen-Dialog: offen=${offen}, Fokus=${await fokus()}`);
      ergebnis.probe[`esc-ersetzen-${sprache}-${breite}`] = { offen, fokus: await fokus() };
      await page.locator('#pn-ersetzen').click();
      await page.waitForSelector('#pn-dlg-t');
      await page.locator('.pnd').getByRole('button', { name: T.abbrechen }).click();
      await page.waitForTimeout(300);
      const offen2 = await page.evaluate(() => !!document.querySelector('dialog[open]'));
      log(`[${sprache} ${breite}] Abbrechen im Ersetzen-Dialog: offen=${offen2}, Fokus=${await fokus()}`);
      ergebnis.probe[`abbrechen-ersetzen-${sprache}-${breite}`] = { offen: offen2, fokus: await fokus() };
    });
  });

  // Passwort-Dialog: Fehler „verschieden“, dann Abbrechen
  await fehlerStelle('Passwort-Dialog', async () => {
    await page.locator('.pm-knopf').click({ timeout: 15000 });
    await page.getByRole('button', { name: T.menu }).click({ timeout: 15000 });
    await page.waitForSelector('#pw-1');
    await page.waitForTimeout(500);
    await zustand('11 Passwort setzen (leer)', { dialog: true });
    await page.locator('#pw-1').fill('Geheim 1234');
    await page.locator('#pw-2').fill('Anders 1234');
    await page.locator('dialog[open] button[type=submit]').click();
    await page.waitForSelector('#pw-fehl', { timeout: 10000 });
    log(`[${sprache} ${breite}] Passwort-Fehler: "${(await page.locator('#pw-fehl').innerText()).trim()}" | aria-describedby pw-2: ${await page.locator('#pw-2').getAttribute('aria-describedby')} | Fokus: ${await fokus()}`);
    await zustand('12 Passwort verschieden (Fehler)', { dialog: true });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    const offen = await page.evaluate(() => !!document.querySelector('dialog[open]'));
    log(`[${sprache} ${breite}] Esc im Passwort-Dialog: offen=${offen}, Fokus=${await fokus()}`);
    ergebnis.probe[`esc-passwort-${sprache}-${breite}`] = { offen, fokus: await fokus() };
    if (offen) await page.locator('dialog[open]').getByRole('button', { name: T.abbrechen }).click();
    await page.waitForTimeout(300);
  });

  await zustand('13 Ende: Seite nach allen Dialogen');
  await b.close();
}

async function erstnutzer() {
  const T = TEXTE.de;
  const b = await chromium.launch();
  const page = await (await b.newContext({ locale: 'de-DE', viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' })).newPage();
  const schritte = [];
  const tun = async (name, aktion) => { schritte.push(name); try { await aktion(); return true; } catch (e) { schritte.push(`  !! hängt: ${e.message.split('\n')[0].slice(0, 160)}`); return false; } };
  await page.goto(`${BASE}/#interviews`, { timeout: 240000 });
  await page.waitForSelector('#iv-t', { timeout: 240000 });
  await page.waitForTimeout(2500);
  const bsp = await tabBisFn(page, null, T.bsp.source);
  schritte.push(`Beispielprojekt-Knopf per Tab: ${bsp.schritte} Tab-Schritte, gefunden=${bsp.gefunden}`);
  if (bsp.gefunden) { await page.keyboard.press('Enter'); await page.waitForSelector('#qx-erg-t', { timeout: 60000 }).catch(() => schritte.push('  !! Ergebnis nicht gekommen')); await page.waitForTimeout(800); }
  const ueb = await tabBisFn(page, '#qu-berechnen', null);
  schritte.push(`Übereinstimmung „Berechnen“ per Tab: ${ueb.schritte} Tab-Schritte, gefunden=${ueb.gefunden}, Wege (letzte 8): ${ueb.weg.join(' > ')}`);
  if (ueb.gefunden) { await page.keyboard.press('Enter'); await page.waitForSelector('#qu-erg-t', { timeout: 15000 }).catch(() => schritte.push('  !! kein Ergebnis')); await page.waitForTimeout(500); schritte.push(`  Ergebnis-Überschrift: Fokus ${await page.evaluate(() => document.activeElement?.id)}`); }
  const beg = await tabBisFn(page, null, T.beginnen.source);
  schritte.push(`„Einigung beginnen“ per Tab: ${beg.schritte} Tab-Schritte, gefunden=${beg.gefunden}`);
  if (beg.gefunden) { await page.keyboard.press('Enter'); await page.waitForSelector('#qk-t', { timeout: 15000 }).catch(() => schritte.push('  !! Konsens startet nicht')); await page.waitForTimeout(300); }
  const rad = await tabBisFn(page, 'input[name="qk-wahl"]', null);
  schritte.push(`erste Option der Abweichung per Tab: ${rad.schritte} Tab-Schritte, gefunden=${rad.gefunden}`);
  if (rad.gefunden) { await page.keyboard.press('Space'); }
  const beg2 = await tabBisFn(page, '#qk-begr', null);
  schritte.push(`Begründungsfeld per Tab: ${beg2.schritte} Tab-Schritte, gefunden=${beg2.gefunden}`);
  if (beg2.gefunden) { await page.keyboard.type('Die Definition passt'); }
  const wei = await tabBisFn(page, null, T.weiter.source);
  schritte.push(`„Weiter“ per Tab: ${wei.schritte} Tab-Schritte, gefunden=${wei.gefunden}`);
  if (wei.gefunden) { await page.keyboard.press('Enter'); await page.waitForTimeout(400); schritte.push(`  Fortschritt: ${await page.locator('#qk-fortschritt').innerText().catch(() => 'nicht gefunden')}`); }
  ergebnis.probe.erstnutzer = schritte;
  log('Erstnutzer-Probe:\n' + schritte.join('\n'));
  await b.close();
}

async function tabBisFn(page, sel, re) {
  let n = 0; const weg = [];
  for (; n < 400; n++) {
    await page.keyboard.press('Tab');
    const hit = await page.evaluate(({ sel, re }) => {
      const e = document.activeElement; if (!e) return { hit: false, txt: '' };
      const txt = (e.innerText || e.getAttribute('aria-label') || (e.labels && e.labels[0] && e.labels[0].innerText) || '').trim();
      const ok = (sel && e.matches(sel)) || (re && new RegExp(re).test(txt) && e.matches('button,a,input,select,textarea,summary,[role=radio],[role=button]'));
      return { hit: !!ok, txt: `${e.tagName}#${e.id} "${txt.slice(0, 50)}"` };
    }, { sel, re });
    weg.push(hit.txt);
    if (hit.hit) return { schritte: n + 1, weg: weg.slice(-8), gefunden: true };
  }
  return { schritte: n, weg: weg.slice(-8), gefunden: false };
}

// Ablauf: de und en, 1280 und 320 px; Kontrastmodus nur im 1280-px-Lauf
for (const sprache of ['de', 'en']) {
  for (const breite of [1280, 320]) {
    try { await laufe(sprache, breite, breite === 1280); }
    catch (e) { ergebnis.fehler.push(`[${sprache} ${breite}] Abbruch: ${e.message.split('\n')[0].slice(0, 200)}`); log(`[${sprache} ${breite}] ABBRUCH: ${e.message.split('\n')[0]}`); }
  }
}
try { await erstnutzer(); } catch (e) { ergebnis.fehler.push('Erstnutzer: ' + e.message.slice(0, 200)); }
writeFileSync(path.join(AUS, 'bf5-ergebnis.json'), JSON.stringify(ergebnis, null, 1), 'utf8');
writeFileSync(path.join(AUS, 'bf5-log.txt'), logZeilen.join('\n'), 'utf8');
log('Fertig. Ergebnis:', path.join(AUS, 'bf5-ergebnis.json'));
