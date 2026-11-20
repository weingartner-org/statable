// Barrierefreiheit Stufe F2 (Feinstruktur: Protokolle, Einwilligung, Fristen), Fachblatt-Prüfplan B17-B20 und Abschnitt 3 (Erstnutzer-Probe).
// 1. axe-core (WCAG 2.2 AA) in fünf Zuständen: (a) Interviewprotokoll, (b) Gedächtnisprotokoll Schritt 3 mit Deutungsmarker,
//    (c) Feldnotiz, (d) Einwilligung mit „Zitate“ widerrufen, (e) Löschdatum gestern (Hinweise beim Öffnen).
// 2. Tastatur-Durchlauf der Erstnutzer-Probe F2 (nur Tab, Umschalt+Tab, Leertaste, Pfeile, Enter): Gedächtnisprotokoll in drei Schritten,
//    Einwilligung für einen Fall, Widerruf „Zitate“. Hänger werden notiert.
// 3. Sichtprüfung per Skript: Rechtschreibschalter, Deutungsliste unter dem Feld, Radiogruppen in fieldset/legend, Umbruch bei 320 px.
// 4. Word: Interviewprotokoll (Editor-Knopf) und Einwilligungsvorlage (Word) herunterladen nach docs/feinstruktur/bf-f2/.
// Aufruf aus app/:  PORT=4292 node e2e/probe/bf-feinstruktur-f2-axe.mjs   (Vorschau auf 127.0.0.1)
// Nur headless. Schreibt docs/feinstruktur/bf-f2/axe.json.
import { chromium } from 'playwright';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const APP = fileURLToPath(new URL('../..', import.meta.url));
const AXE = readFileSync(path.join(APP, 'node_modules/axe-core/axe.min.js'), 'utf8');
const BASIS = `http://127.0.0.1:${process.env.PORT || 4292}/`;
const URL_ = BASIS + '#interviews';
const OUT_DIR = path.resolve(APP, '../docs/feinstruktur/bf-f2');
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

const ergebnis = { zeitpunkt: new Date().toISOString(), url: URL_, browser: 'chromium headless', zustaende: [], sicht: {}, tastatur: { protokoll: [], hakte: [] }, word: {}, fehler: [] };
const gestern = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); })();

async function axeLauf(page) {
  if (!(await page.evaluate(() => !!window.axe))) await page.addScriptTag({ content: AXE });
  return page.evaluate(async (tags) => {
    const r = await window.axe.run(document, { runOnly: { type: 'tag', values: tags } });
    const map = (x) => ({
      id: x.id, impact: x.impact, hilfe: x.help,
      knoten: x.nodes.map((n) => ({
        ziel: n.target.join(' '),
        meldung: (n.any[0]?.message || n.all[0]?.message || n.none[0]?.message || '').slice(0, 200),
        html: n.html.slice(0, 160),
      })),
    });
    return { verstoesse: r.violations.map(map), unklar: r.incomplete.map(map), bestanden: r.passes.length };
  }, TAGS);
}

async function zustandAxe(page, name, notiz = '') {
  const r = await axeLauf(page);
  const anzahl = r.verstoesse.reduce((s, v) => s + v.knoten.length, 0);
  ergebnis.zustaende.push({ name, notiz, verstoesseRegeln: r.verstoesse.length, verstoesseKnoten: anzahl, unklarRegeln: r.unklar.length, bestanden: r.bestanden, ...r });
  console.log(`[${name}] Regeln mit Verstoß: ${r.verstoesse.length} (Stellen: ${anzahl}), unklar: ${r.unklar.length}, bestanden: ${r.bestanden}${notiz ? ' | ' + notiz : ''}`);
  for (const v of r.verstoesse) console.log(`    ${v.id} (${v.impact}): ${v.knoten.map((k) => k.ziel).join(' ; ').slice(0, 220)}`);
  return r;
}

// Aktives Element: Tag, id, Rolle, Name, Gruppe (name-Attribut), Fokusrahmen
const info = (page) => page.evaluate(() => {
  const e = document.activeElement;
  if (!e || e === document.body || e === document.documentElement) return null;
  const cs = getComputedStyle(e);
  const ids = (s) => s.split(/\s+/).map((i) => document.getElementById(i)?.textContent || '').join(' ');
  let name = e.getAttribute('aria-label') || (e.getAttribute('aria-labelledby') ? ids(e.getAttribute('aria-labelledby')) : '');
  if (!name && e.labels && e.labels.length) name = [...e.labels].map((l) => l.textContent).join(' ');
  if (!name) name = (e.textContent || e.value || '');
  name = name.replace(/\s+/g, ' ').trim().slice(0, 90);
  const rahmen = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || (!!cs.boxShadow && cs.boxShadow !== 'none');
  return { tag: e.tagName.toLowerCase(), id: e.id || '', typ: e.type || '', gruppe: e.getAttribute('name') || '', wert: e.type === 'checkbox' || e.type === 'radio' ? String(e.checked) : (e.value || ''), name, rahmen, fokusVisible: e.matches(':focus-visible'), umriss: `${cs.outlineStyle} ${cs.outlineWidth}` };
});

// Tab (oder Umschalt+Tab) bis ein Element passt. Gibt den Weg zurück, damit Hänger sichtbar sind.
async function tabBis(page, praed, { max = 150, rueck = false, label = '' } = {}) {
  const taste = rueck ? 'Shift+Tab' : 'Tab';
  const weg = [];
  for (let i = 0; i < max; i++) {
    await page.keyboard.press(taste);
    const x = await info(page);
    if (!x) return { ok: false, grund: 'Fokus fiel auf body', n: i + 1, weg };
    weg.push(`${x.tag}${x.typ ? '[' + x.typ + ']' : ''} „${x.name.slice(0, 40)}“${x.fokusVisible || x.rahmen ? '' : ' (ohne sichtbaren Fokus)'}`);
    if (praed(x)) return { ok: true, n: i + 1, name: x.name, id: x.id, weg, label };
  }
  return { ok: false, grund: `nicht erreicht nach ${max} Tastendrücken (${label})`, n: max, weg };
}

async function frisch(browser, vp = { width: 1280, height: 800 }) {
  const ctx = await browser.newContext({ locale: 'de-DE', viewport: vp, acceptDownloads: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => ergebnis.fehler.push('pageerror: ' + e.message));
  await page.goto(URL_); await page.waitForSelector('#iv-t', { timeout: 30000 }).catch(() => {}); await page.waitForTimeout(1200);
  return { ctx, page };
}

async function beispiel(page) {
  await page.locator('#iv-beispiel').click();
  const da = await page.waitForSelector('details.fall', { timeout: 40000 }).then(() => true).catch(() => false);
  await page.waitForTimeout(800);
  return da;
}

// Setzt Details auf offen (nur Vorbereitung; die Tastatur-Probe öffnet selbst)
async function fallsOffen(page) { await page.evaluate(() => document.querySelectorAll('details.fall').forEach((d) => { d.open = true; })); await page.waitForTimeout(300); }
async function auf(page, loc) { await loc.evaluate((el) => { const d = el.closest('details'); if (d) d.open = true; }); }

async function probiere(name, fn) {
  try { await fn(); } catch (e) { ergebnis.fehler.push({ wo: name, fehler: String(e.message || e).slice(0, 300) }); console.log(`FEHLER in ${name}: ${String(e.message || e).slice(0, 200)}`); }
}

// ---------- 1. axe-Zustände
async function axeZustaende(browser) {
  // (a) Interviewprotokoll
  await probiere('a', async () => {
    const { ctx, page } = await frisch(browser);
    await page.locator('#pr-neu-iv').click(); await page.waitForSelector('#pr-editor-t', { timeout: 8000 });
    await page.waitForTimeout(500);
    await zustandAxe(page, '(a) Abschnitt Protokolle, neues Interviewprotokoll');
    await ctx.close();
  });

  // (b) Gedächtnisprotokoll, Schritt 3, Deutungsmarker „Er war offensichtlich nervös.“
  await probiere('b', async () => {
    const { ctx, page } = await frisch(browser);
    await page.locator('#pr-neu-ge').click(); await page.waitForSelector('#pr-s1', { timeout: 8000 });
    await page.locator('#pr-s1').fill('Wir sprachen über den Termin am Morgen.');
    await page.locator('button', { hasText: 'Weiter zu Schritt 2' }).click(); await page.waitForSelector('#pr-s2');
    await page.locator('#pr-s2').fill('Der Ablauf war ruhig.');
    await page.locator('button', { hasText: 'Weiter zu Schritt 3' }).click(); await page.waitForSelector('#pr-ab-b-0');
    await page.locator('label.schalter', { hasText: 'Hinweise „Beobachtet oder gedeutet?“ zeigen' }).locator('input').check({ force: true });
    await page.locator('#pr-ab-b-0').fill('Er war offensichtlich nervös.');
    await page.waitForTimeout(1500);
    const dm = await page.evaluate(() => ({ liste: !!document.querySelector('[id^="pr-dm-"]'), beschreibung: document.getElementById('pr-ab-b-0')?.getAttribute('aria-describedby') || '' }));
    ergebnis.sicht.deutungsmarker = dm;
    console.log(`[(b) Deutung] Liste da: ${dm.liste}, aria-describedby: ${dm.beschreibung}`);
    await zustandAxe(page, '(b) Gedächtnisprotokoll Schritt 3 mit Deutungsmarker', `Liste da: ${dm.liste}`);
    await ctx.close();
  });

  // (c) Feldnotiz
  await probiere('c', async () => {
    const { ctx, page } = await frisch(browser);
    await page.locator('#pr-notiz').fill('Feldnotiz Probe: Der Raum war laut.');
    await page.locator('button', { hasText: 'Feldnotiz speichern' }).click(); await page.waitForTimeout(800);
    await zustandAxe(page, '(c) Feldnotiz gespeichert');
    await ctx.close();
  });

  // (d) Einwilligung, Punkt „Zitate“ widerrufen
  await probiere('d', async () => {
    const { ctx, page } = await frisch(browser);
    if (!(await beispiel(page))) ergebnis.fehler.push({ wo: 'd', fehler: 'Beispielinterview nicht geladen (keine Fälle)' });
    await fallsOffen(page);
    await page.locator('button', { hasText: /^Einwilligung für Fall .* anlegen$/ }).first().click().catch(() => {});
    await page.waitForSelector('input[name$="-zitate"]', { timeout: 8000 }).catch(() => {});
    await page.locator('input[name$="-zitate"][value="widerrufen"]').check({ force: true }).catch(() => {});
    await page.waitForTimeout(700);
    ergebnis.sicht.zitateStand = await page.evaluate(() => [...document.querySelectorAll('fieldset.punkt legend')].map((l) => l.textContent.trim()).filter((t) => /Zitate/.test(t)));
    console.log(`[(d) Stand] ${JSON.stringify(ergebnis.sicht.zitateStand)}`);
    await zustandAxe(page, '(d) Einwilligung, Punkt Zitate widerrufen', JSON.stringify(ergebnis.sicht.zitateStand));
    await ctx.close();
  });

  // (e) Löschdatum gestern eintragen, Hinweise beim Öffnen sichtbar
  await probiere('e', async () => {
    const { ctx, page } = await frisch(browser);
    if (!(await beispiel(page))) ergebnis.fehler.push({ wo: 'e', fehler: 'Beispielinterview nicht geladen (keine Fälle)' });
    await fallsOffen(page);
    await page.locator('button', { hasText: /^Einwilligung für Fall .* anlegen$/ }).first().click().catch(() => {});
    await page.waitForSelector('select[id^="ew-loa-"]', { timeout: 8000 }).catch(() => {});
    await page.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true; }));
    await page.waitForTimeout(300);
    await page.locator('select[id^="ew-loa-"]').first().selectOption('aufnahme');
    await page.locator('input[id^="ew-lob-"]').first().fill(gestern);
    await page.locator('button', { hasText: 'Löschdatum eintragen' }).first().click().catch(() => {});
    await page.waitForTimeout(1000);
    const hinw = await page.evaluate(() => document.getElementById('ew-hinw-t')?.textContent.trim() || '');
    ergebnis.sicht.hinweise = hinw;
    console.log(`[(e) Hinweise] Überschrift: „${hinw}“`);
    await zustandAxe(page, '(e) Hinweise beim Öffnen, Löschdatum gestern', `Hinweis-Überschrift: „${hinw}“`);
    // B20: der Hinweis bleibt stehen (nicht nach Sekunden verschwinden)
    await page.waitForTimeout(6000);
    const bleibt = await page.evaluate(() => !!document.getElementById('ew-hinw-t'));
    ergebnis.sicht.fristBleibtStehen = bleibt;
    console.log(`[B20] Hinweis nach 6 s noch da: ${bleibt}`);
    await ctx.close();
  });
}

// ---------- 2. Erstnutzer-Probe, nur Tastatur, plus Sichtprüfungen
async function erstnutzer(browser) {
  const { ctx, page } = await frisch(browser);
  const P = ergebnis.tastatur.protokoll; const H = ergebnis.tastatur.hakte;
  const merke = (s, d = {}) => { P.push({ s, ...d }); console.log('  ' + s + ' ' + JSON.stringify(d).slice(0, 240)); };
  const haken = (t) => { H.push(t); merke('HÄNGER: ' + t); };
  const weg = async (r, t) => { merke(t, { ok: r.ok, n: r.n, name: r.name, grund: r.grund, weg: r.weg?.slice(-6) }); if (!r.ok) haken(`${t}: ${r.grund}`); return r.ok; };
  const fokus = async () => info(page);

  // Schritt 0: Beispiel laden (Fälle für die Einwilligung)
  if (!(await weg(await tabBis(page, (x) => x.id === 'iv-beispiel', { label: 'Beispiel' }), 'Tab bis „Beispielinterview laden“'))) { await ctx.close(); return; }
  await page.keyboard.press('Enter');
  const da = await page.waitForSelector('details.fall', { timeout: 40000 }).then(() => true).catch(() => false);
  merke('Enter: Beispielinterview', { geladen: da });
  if (!da) haken('Beispielinterview nicht geladen (keine Fälle für die Einwilligung)');

  // Schritt 1: Gedächtnisprotokoll anlegen
  if (!(await weg(await tabBis(page, (x) => x.id === 'pr-neu-ge', { label: 'neu-ge' }), 'Tab bis „Neues Gedächtnisprotokoll“'))) { await finish(); return; }
  await page.keyboard.press('Enter'); await page.waitForTimeout(900);
  let f = await fokus();
  merke('Enter: Fokus nach Anlegen', { id: f?.id, name: f?.name, sichtbar: f?.fokusVisible });
  if (f?.id !== 'pr-editor-t' && !f?.id.startsWith('pr-')) haken(`Nach dem Anlegen steht der Fokus nicht im Editor (bei ${f?.id || 'body'})`);

  // Rechtschreib-Schalter am Feld Schritt 1 (B17): Vorgabe aus, Schalter ist vor dem Feld
  if (!(await weg(await tabBis(page, (x) => x.typ === 'checkbox' && x.name.startsWith('Rechtschreibhinweise'), { max: 40, label: 'Schalter' }), 'Tab bis Schalter „Rechtschreibhinweise zeigen“'))) { await finish(); return; }
  f = await fokus();
  merke('Schalter Rechtschreib, Vorgabe', { angekreuzt: f?.wert });
  if (!(await weg(await tabBis(page, (x) => x.id === 'pr-s1', { max: 10, label: 'pr-s1' }), 'Tab bis Feld Schritt 1'))) { await finish(); return; }
  const sp = await page.locator('#pr-s1').getAttribute('spellcheck');
  merke('Feld Schritt 1, spellcheck-Vorgabe', { spellcheck: sp });
  await page.keyboard.type('Wir sprachen über den Termin am Morgen.', { delay: 10 });

  // Schritt 2
  if (!(await weg(await tabBis(page, (x) => x.tag === 'button' && x.name === 'Weiter zu Schritt 2', { max: 20, label: 'weiter2' }), 'Tab bis „Weiter zu Schritt 2“'))) { await finish(); return; }
  await page.keyboard.press('Enter'); await page.waitForTimeout(700);
  f = await fokus(); merke('Enter: Fokus nach Schritt 2', { id: f?.id });
  if (!(await weg(await tabBis(page, (x) => x.id === 'pr-s2', { max: 40, label: 'pr-s2' }), 'Tab bis Feld Schritt 2'))) { await finish(); return; }
  await page.keyboard.type('Der Ablauf war ruhig.', { delay: 10 });
  if (!(await weg(await tabBis(page, (x) => x.tag === 'button' && x.name === 'Weiter zu Schritt 3', { max: 20, label: 'weiter3' }), 'Tab bis „Weiter zu Schritt 3“'))) { await finish(); return; }
  await page.keyboard.press('Enter'); await page.waitForTimeout(700);

  // Schritt 3: Beobachtung mit Deutungswort; Deutungsliste unter dem Feld (B18)
  if (!(await weg(await tabBis(page, (x) => x.id === 'pr-ab-b-0', { max: 40, label: 'pr-ab-b-0' }), 'Tab bis Beobachtung Abschnitt 1'))) { await finish(); return; }
  await page.keyboard.type('Er war offensichtlich nervös.', { delay: 10 });
  await page.waitForTimeout(1200);
  const dm = await page.evaluate(() => ({ liste: !!document.querySelector('[id^="pr-dm-"]'), im: document.querySelector('[id^="pr-dm-"]')?.getAttribute('aria-label') || '' }));
  merke('Deutungsliste unter dem Feld', dm);
  if (!dm.liste) haken('Deutungsmarker-Liste erscheint nicht (Schalter „Beobachtet oder gedeutet?“ aus oder nicht gefunden)');

  // Einwilligung für einen Fall (Abschnitt Einwilligung)
  if (!(await weg(await tabBis(page, (x) => x.tag === 'summary' && /^Fall /.test(x.name), { max: 400, label: 'fall-summary' }), 'Tab bis Fall-Zeile (aufklappen)'))) { await finish(); return; }
  await page.keyboard.press('Enter'); await page.waitForTimeout(400);
  if (!(await weg(await tabBis(page, (x) => x.tag === 'button' && /^Einwilligung für Fall .* anlegen$/.test(x.name), { max: 60, label: 'einw-anlegen' }), 'Tab bis „Einwilligung für Fall … anlegen“'))) { await finish(); return; }
  await page.keyboard.press('Enter'); await page.waitForTimeout(800);
  f = await fokus(); merke('Enter: Fokus nach Anlegen Einwilligung', { id: f?.id, name: f?.name });

  // Stand „Zitate“ auf widerrufen. Nach dem Anlegen steht der Fokus auf body (Hänger, siehe Protokoll):
  // zur Fortsetzung setzt das Skript den Fokus in die Gruppe „Zitate“, danach nur Pfeiltasten.
  f = await fokus();
  const offen = await page.evaluate(() => [...document.querySelectorAll('details.fall')].map((d) => d.open));
  const sichtbareRadios = await page.evaluate(() => document.querySelectorAll('input[name$="-zitate"]').length + ' da, ' + [...document.querySelectorAll('input[name$="-zitate"]')].filter((x) => x.offsetParent !== null).length + ' sichtbar');
  merke('Zustand nach Anlegen', { fokus: f?.tag ?? 'body', fallOffen: offen, radios: sichtbareRadios });
  if (!f || f.tag === 'body' || !f.id) {
    haken(`Nach „Einwilligung für Fall … anlegen“ (Enter) steht der Fokus auf body; der Fall klappt zu (details.fall open=${JSON.stringify(offen)}), die Einwilligungsfelder sind nicht erreichbar. Zur Fortsetzung Fall per Skript aufgeklappt und Fokus in die Gruppe Zitate gesetzt.`);
    await page.evaluate(() => { document.querySelectorAll('details.fall').forEach((d) => { d.open = true; }); });
    await page.waitForTimeout(300);
    await page.evaluate(() => { const r = [...document.querySelectorAll('input[name$="-zitate"]')].find((x) => x.offsetParent !== null); r?.focus(); });
    await page.waitForTimeout(200);
  }
  // F2-Nachpruefung: H1 behoben, Fokus steht im Feld Fassung; per Tab in die Gruppe Zitate (ohne Eingriff).
  if (f && /^ew-fass-/.test(f.id)) { const w = await tabBis(page, (x) => x.typ === 'radio' && x.gruppe.endsWith('-zitate'), { max: 60, label: 'zitate' }); merke('H1 nachher: Fokus nach Anlegen im Feld Fassung; Tab bis Gruppe Zitate', { ok: w.ok, n: w.n }); }
  const zitateOk = await page.evaluate(() => document.activeElement?.getAttribute('name')?.endsWith('-zitate') ?? false);
  merke('Fokus in Gruppe Zitate', { ok: zitateOk });
  for (let i = 0; i < 6; i++) { if ((await fokus())?.name === 'widerrufen') break; await page.keyboard.press('ArrowDown'); await page.waitForTimeout(150); }
  f = await fokus();
  merke('Pfeil ab x3 in Gruppe Zitate', { wert: f?.name, gruppe: f?.gruppe });
  if (f?.name !== 'widerrufen') haken('Pfeiltasten in der Radio-Gruppe Zitate landen nicht bei „widerrufen“');
  await page.keyboard.press('Space'); await page.waitForTimeout(600);
  const stand = await page.evaluate(() => [...document.querySelectorAll('fieldset.punkt legend')].map((l) => l.textContent.trim()).filter((t) => /Zitate/.test(t)));
  merke('Stand Zitate als Wort sichtbar', { stand });
  if (!stand.some((t) => /widerrufen/.test(t))) haken('Stand „widerrufen“ bei Zitate nicht als Wort sichtbar');

  // Widerruf eintragen: Aufklappen, Umfang Zitate, Knopf. Nach der Änderung klappt der Fall wieder zu (Hänger, siehe Protokoll):
  // zur Fortsetzung wird er per Skript aufgeklappt.
  const fallZu = await page.evaluate(() => [...document.querySelectorAll('details.fall')].map((d) => d.open));
  merke('Fall nach Stand-Änderung', { fallOffen: fallZu });
  if (fallZu.some((o) => !o)) { haken(`Nach der Änderung „widerrufen“ klappt der Fall zu (details.fall open=${JSON.stringify(fallZu)}); Widerruf-Bereich nicht per Tastatur erreichbar. Zur Fortsetzung per Skript aufgeklappt.`); await page.evaluate(() => document.querySelectorAll('details.fall').forEach((d) => { d.open = true; })); await page.waitForTimeout(300); await page.evaluate(() => { const r = [...document.querySelectorAll('input[name$="-zitate"]')].find((x) => x.offsetParent !== null); r?.focus(); }); await page.waitForTimeout(200); }
  if (!(await weg(await tabBis(page, (x) => x.tag === 'summary' && x.name === 'Widerruf eintragen', { max: 200, label: 'widerruf-summary' }), 'Tab bis „Widerruf eintragen“ (Aufklappen)'))) { await finish(); return; }
  await page.keyboard.press('Enter'); await page.waitForTimeout(500);
  if (!(await weg(await tabBis(page, (x) => x.typ === 'checkbox' && x.name.startsWith('Zitate'), { max: 60, label: 'umfang-zitate' }), 'Tab bis Umfang „Zitate“'))) { await finish(); return; }
  await page.keyboard.press('Space');
  if (!(await weg(await tabBis(page, (x) => x.tag === 'button' && x.name === 'Widerruf eintragen', { max: 60, label: 'widerruf-knopf' }), 'Tab bis Knopf „Widerruf eintragen“'))) { await finish(); return; }
  await page.keyboard.press('Enter'); await page.waitForTimeout(800);
  const meldung = await page.evaluate(() => [...document.querySelectorAll('[aria-live], [role=status], [role=alert], .hinweis')].map((e) => e.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(-3));
  merke('Enter: Widerruf eingetragen', { meldung });

  await finish();

  async function finish() {
    // Sichtprüfungen: Umbruch bei 320 px, Radiogruppen in fieldset
    const uhr = await page.evaluate(() => { const e = document.getElementById('pr-zeit'); if (!e) return null; e.focus(); const cs = getComputedStyle(e); return { focusVisible: e.matches(':focus-visible'), umriss: `${cs.outlineStyle} ${cs.outlineWidth}`, schatten: cs.boxShadow }; });
    ergebnis.sicht.fokusUhrzeit = uhr;
    console.log('[Fokus pr-zeit]', JSON.stringify(uhr));
    const radios = await page.evaluate(() => [...document.querySelectorAll('input[type=radio]')].map((r) => ({ name: r.name, ohneFieldset: !r.closest('fieldset') })));
    const ohneFs = radios.filter((r) => r.ohneFieldset);
    ergebnis.sicht.radiogruppen = { anzahl: radios.length, ohneFieldset: ohneFs.length, beispiele: ohneFs.slice(0, 5).map((r) => r.name) };
    console.log(`[Radio] ${radios.length} Radiofelder, ohne fieldset: ${ohneFs.length}`);
    await page.setViewportSize({ width: 320, height: 700 }); await page.waitForTimeout(600);
    const breit = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    ergebnis.sicht.umbruch320 = { ueberbreite_px: breit };
    console.log(`[320 px] waagrechte Überbreite: ${breit} px`);
    await page.setViewportSize({ width: 1280, height: 800 });
    ergebnis.erstnutzer = { hakte: H.length, geschafft: H.length === 0 };
    await ctx.close();
  }
}

// ---------- 3. Word
async function word(browser) {
  const { ctx, page } = await frisch(browser);
  mkdirSync(OUT_DIR, { recursive: true });
  // Interviewprotokoll: Beispiel laden (Projekt-Entwurf), neues Protokoll, Editor-Knopf
  await beispiel(page).catch(() => false);
  await page.locator('#pr-neu-iv').click(); await page.waitForSelector('#pr-editor-t', { timeout: 8000 });
  await page.locator('#pr-f-ort, #pr-ort').first().fill('Café').catch(() => {});
  const [dl1] = await Promise.all([
    page.waitForEvent('download', { timeout: 25000 }).catch(() => null),
    page.locator('button', { hasText: 'Als Word-Datei speichern' }).first().click(),
  ]);
  if (dl1) { const z = path.join(OUT_DIR, 'interviewprotokoll.docx'); await dl1.saveAs(z); ergebnis.word.interviewprotokoll = { datei: z, vorgeschlagen: dl1.suggestedFilename() }; }
  else ergebnis.word.interviewprotokoll = { fehler: 'kein Download' };
  // Einwilligungsvorlage
  await page.locator('#iv-einw-t').scrollIntoViewIfNeeded().catch(() => {});
  const [dl2] = await Promise.all([
    page.waitForEvent('download', { timeout: 25000 }).catch(() => null),
    page.locator('button', { hasText: 'Vorlage als Word speichern' }).first().click(),
  ]);
  if (dl2) { const z = path.join(OUT_DIR, 'einwilligungsvorlage.docx'); await dl2.saveAs(z); ergebnis.word.einwilligung = { datei: z, vorgeschlagen: dl2.suggestedFilename() }; }
  else ergebnis.word.einwilligung = { fehler: 'kein Download' };
  console.log('[Word]', JSON.stringify(ergebnis.word));
  await ctx.close();
}

mkdirSync(OUT_DIR, { recursive: true });
const b = await chromium.launch({ headless: true });
try {
  await probiere('Axe-Zustände', () => axeZustaende(b));
  await probiere('Erstnutzer', () => erstnutzer(b));
  await probiere('Word', () => word(b));
} finally {
  await b.close();
  writeFileSync(path.join(OUT_DIR, 'axe.json'), JSON.stringify(ergebnis, null, 2), 'utf8');
  console.log('Geschrieben:', path.join(OUT_DIR, 'axe.json'));
}
