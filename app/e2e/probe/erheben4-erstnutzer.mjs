// Stufe 4, Punkt 7: Erstnutzer-Probe nur mit Tastatur (keine Maus, kein Klick).
// Aufgabe: „Lege einen Leitfaden mit drei Fragen an, prüfe sie, sortiere sie in einen Block und exportiere ihn als Word.
// Lade dann das Beispielinterview, spiele es ab Beitrag 3 ab und öffne die Redeanteile als Datensatz.“
// Die Probe drückt nur Tab, Umschalt+Tab, Enter, Leertaste und Pfeiltasten. Sie merkt sich, wie viele Tab-Schritte jeder Teil braucht.
// Aufruf aus app/:  node e2e/probe/erheben4-erstnutzer.mjs
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { starteBrowser, oeffne, leerKlick, ERG, sichern } from './erheben4-lib.mjs';

const REPO = 'C:\\Entwicklung\\pspp-web';
const b = await starteBrowser();
const schritte = [];
const logBuch = [];

// Tab, bis das Element passt (höchstens 400 Schritte). Gibt Anzahl und die letzten Namen zurück.
async function tabZu(page, beschreibung, pred, max = 400) {
  const letzte = [];
  for (let i = 1; i <= max; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => { const a = document.activeElement; return a ? { name: window.bfName(a).slice(0, 70), tag: a.tagName, typ: a.type || '' } : null; });
    if (!info) continue;
    letzte.push(`${info.tag}${info.typ ? '[' + info.typ + ']' : ''} „${info.name}“`);
    if (letzte.length > 8) letzte.shift();
    if (pred(info)) return { ok: true, tabs: i, info, letzte };
  }
  return { ok: false, tabs: max, letzte, beschreibung };
}

function protokoll(page, name, res, hinweis = '') {
  const eintrag = { schritt: name, ok: res.ok, tabs: res.tabs, letzte: res.letzte ?? [], hinweis };
  if (!res.ok) eintrag.haengt = `nicht gefunden nach ${res.tabs} Tab-Schritten (gesucht: ${res.beschreibung})`;
  schritte.push(eintrag);
  console.log(`${res.ok ? 'ok   ' : 'HÄNGT'} ${name} | Tab-Schritte: ${res.tabs}${res.ok ? '' : ' | letzte Stellen: ' + res.letzte.slice(-4).join(' ; ')}${hinweis ? ' | ' + hinweis : ''}`);
}

try {
  const { ctx, page, fehler } = await oeffne(b, { sprache: 'de', breite: 1280 });
  const kurz = (r) => (r.ok ? r : { ...r });
  const tasteEnter = () => page.keyboard.press('Enter');
  await leerKlick(page);

  // 1. Leitfaden anlegen
  let r = await tabZu(page, 'Neuer Leitfaden', (i) => i.name === 'Neuer Leitfaden');
  protokoll(page, '1 Neuer Leitfaden', r);
  if (r.ok) { await tasteEnter(); await page.waitForTimeout(400); }

  // 2. Drei Fragen eingeben und hinzufügen
  r = await tabZu(page, 'Fragen-Feld', (i) => i.tag === 'TEXTAREA' && /Fragen \(eine je Zeile\)/.test(i.name));
  protokoll(page, '2 Fragen-Feld', r);
  if (r.ok) {
    await page.keyboard.type('Wie planen Sie Ihre Woche?\nWas hilft Ihnen dabei?\nWann fällt es Ihnen schwer?');
    r = await tabZu(page, 'Fragen hinzufügen', (i) => i.name === 'Fragen hinzufügen');
    protokoll(page, '2b Fragen hinzufügen', r);
    if (r.ok) { await tasteEnter(); await page.waitForTimeout(400); }
  }

  // 3. Prüfen: jede Frage behalten (Leertaste auf dem Auswahlfeld „Behalten“)
  r = await tabZu(page, '2. Prüfen', (i) => i.name === '2. Prüfen');
  protokoll(page, '3 Schritt 2 Prüfen öffnen', r);
  if (r.ok) {
    await tasteEnter(); await page.waitForTimeout(400);
    for (let n = 1; n <= 3; n++) {
      r = await tabZu(page, `Behalten (Frage ${n})`, (i) => i.name === 'Behalten' && i.typ === 'radio');
      protokoll(page, `3.${n} Frage ${n} behalten`, r);
      if (!r.ok) break;
      await page.keyboard.press('Space');
    }
  }

  // 4. Sortieren: Block anlegen, jede Frage zuordnen
  r = await tabZu(page, '3. Sortieren', (i) => i.name === '3. Sortieren');
  protokoll(page, '4 Schritt 3 Sortieren öffnen', r);
  if (r.ok) {
    await tasteEnter(); await page.waitForTimeout(400);
    r = await tabZu(page, 'Neuer Block (Thema)', (i) => i.tag === 'INPUT' && /Neuer Block/.test(i.name));
    protokoll(page, '4.1 Blockname', r);
    if (r.ok) {
      await page.keyboard.type('Zeitplanung');
      r = await tabZu(page, 'Block anlegen', (i) => i.name === 'Block anlegen');
      protokoll(page, '4.2 Block anlegen', r);
      if (r.ok) { await tasteEnter(); await page.waitForTimeout(400); }
    }
    for (let n = 1; n <= 3; n++) {
      r = await tabZu(page, `Blockauswahl (Frage ${n})`, (i) => i.tag === 'SELECT');
      protokoll(page, `4.${n + 2} Frage ${n} einem Block zuordnen`, r);
      if (!r.ok) break;
      await page.keyboard.press('ArrowDown');
    }
  }

  // 5. Word-Export
  r = await tabZu(page, 'Leitfaden als Word', (i) => i.name === 'Leitfaden als Word', 400);
  protokoll(page, '5 Leitfaden als Word', r);
  if (r.ok) {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 20000 }).catch(() => null), tasteEnter()]);
    if (dl) {
      const datei = `${ERG}\\erstnutzer-${dl.suggestedFilename()}`;
      await dl.saveAs(datei);
      let ausgang;
      try { execFileSync('node', ['scripts/docx-pruefen.mjs', datei], { cwd: REPO, stdio: 'pipe' }); ausgang = 0; } catch (e) { ausgang = e.status; }
      schritte[schritte.length - 1].hinweis = `Datei „${dl.suggestedFilename()}“, docx-pruefen Ausgang ${ausgang}`;
      console.log('   Word:', dl.suggestedFilename(), 'Ausgang', ausgang);
    } else {
      schritte[schritte.length - 1].hinweis = 'Kein Download nach Enter (3 s)';
      console.log('   Kein Download nach Enter');
    }
  }

  // 6. Beispielinterview laden
  r = await tabZu(page, 'Beispielinterview laden', (i) => i.name === 'Beispielinterview laden (erfunden)');
  protokoll(page, '6 Beispielinterview laden', r);
  if (r.ok) {
    await tasteEnter();
    const offen = await page.waitForSelector('#iv-offen-t', { timeout: 60000 }).then(() => true).catch(() => false);
    await page.waitForTimeout(800);
    const fokus = await page.evaluate(() => window.bfName(document.activeElement).slice(0, 60));
    schritte.push({ schritt: '6b Transkript geöffnet, Fokus liegt auf', ok: offen, tabs: 0, hinweis: `Fokus nach dem Öffnen: „${fokus}“` });
    console.log(`   Transkript offen: ${offen} | Fokus: „${fokus}“`);
  }

  // 7. Ab Beitrag 3 abspielen: dritter Knopf „Ab … abspielen“
  let treffer = null;
  for (let n = 1; n <= 3; n++) {
    r = await tabZu(page, `„Ab … abspielen“ Beitrag ${n}`, (i) => i.tag === 'BUTTON' && /^Ab hier abspielen/.test(i.name));
    protokoll(page, `7.${n} „Ab … abspielen“ (Beitrag ${n})`, r);
    if (!r.ok) break;
    treffer = r;
  }
  if (treffer) {
    await tasteEnter();
    await page.waitForTimeout(2500);
    const laeuft = await page.evaluate(() => window.bfLaeuft());
    schritte.push({ schritt: '7 Abspielen ab Beitrag 3', ok: laeuft > 0, tabs: 0, hinweis: `„läuft“-Markierung sichtbar: ${laeuft > 0}` });
    console.log(`   Abspielen ab Beitrag 3: „läuft“ sichtbar ${laeuft > 0}`);
  }

  // 8. Redeanteile als Datensatz öffnen
  r = await tabZu(page, 'Redeanteile als Datensatz öffnen', (i) => i.tag === 'BUTTON' && /Redeanteile als Datensatz öffnen/.test(i.name));
  protokoll(page, '8 Redeanteile als Datensatz', r);
  if (r.ok) {
    await tasteEnter();
    const erzeugt = await page.waitForSelector('text=Datensatz erzeugt', { timeout: 40000 }).then(() => true).catch(() => false);
    const meldungen = await page.evaluate(() => [...document.querySelectorAll('[role=status], [role=alert], .melde, .banner')].map((x) => x.innerText.trim()).filter(Boolean).slice(-3));
    console.log('   Meldungen nach Enter:', JSON.stringify(meldungen).slice(0, 400));
    const titel = await page.evaluate(() => (document.querySelector('h1, h2')?.innerText || '').slice(0, 80));
    const neu = await page.evaluate(() => { const d = document.querySelector('dialog[open] h2'); return d ? 'Dialog: ' + d.innerText.slice(0, 60) : 'kein Dialog'; });
    schritte[schritte.length - 1].hinweis = `Meldung „Datensatz erzeugt“: ${erzeugt}; Oberfläche nach Enter: Überschrift „${titel}“, Datenansicht sichtbar: ${neu}, Adresse: ${page.url().replace(/^https?:\/\/[^/]+/, '')}`;
    console.log('   Nach Enter:', schritte[schritte.length - 1].hinweis);
  }
  if (fehler.length) console.log('Seitenfehler:', fehler.join(' || '));
  await ctx.close();
} finally {
  await b.close();
  sichern('erheben4-erstnutzer.json', schritte);
}
const haengt = schritte.filter((s) => s.haengt);
console.log(`Schritte: ${schritte.length}, hängen: ${haengt.length}`);
