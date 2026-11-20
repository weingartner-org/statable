// Welle 6, Auftrag A: alle Einheiten des Lernplans mit der Tastatur durchspielen und messen (nur lesen, nichts ändern).
// Nicht Teil von `npm run e2e` (zu lang). Vorarbeit: die Fragenliste je Einheit kommt aus `lernpfade-meta.json`
// (erzeugt von `node e2e/probe/lernpfade-meta-bauen.mjs <ausgabeordner>`; sie enthält Kennungen, Fragenart, Bild-/Tabellenbezug und Lösungen der Rechenaufgaben).
//
// Aufruf (App muss laufen, z. B. `npx vite preview --outDir dist-e2e --host 127.0.0.1 --port 4192 --strictPort`):
//   node e2e/probe/lernpfade-durchlauf.mjs <meta.json> <ausgabeordner> [einheit-id ...]
//   Ohne Einheiten: alle. Je Einheit entsteht <ausgabeordner>/einheit-<id>.json; schon vorhandene werden übersprungen.
//   BASIS=http://127.0.0.1:4192/ setzt die Adresse.
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const [metaPfad, ausOrdner, ...nurEinheiten] = process.argv.slice(2);
if (!metaPfad || !ausOrdner) { console.error('Aufruf: node lernpfade-durchlauf.mjs <meta.json> <ausgabeordner> [einheit ...]'); process.exit(2); }
const BASIS = process.env.BASIS ?? 'http://127.0.0.1:4192/';
const meta = JSON.parse(readFileSync(metaPfad, 'utf8'));
mkdirSync(ausOrdner, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ locale: 'de-DE', viewport: { width: 1400, height: 900 } });
const page = await ctx.newPage();
const konsole = [];
page.on('pageerror', e => konsole.push('pageerror: ' + String(e).slice(0, 200)));
page.on('console', m => { if (m.type() === 'error') konsole.push('console.error: ' + m.text().slice(0, 200)); });

const ZEIT = (ms) => page.waitForTimeout(ms);
/** Kurzbeschreibung des fokussierten Elements. */
const aktiv = () => page.evaluate(() => {
  const a = document.activeElement;
  if (!a || a === document.body) return 'body';
  const t = (a.getAttribute('aria-label') || a.textContent || a.value || '').replace(/\s+/g, ' ').trim().slice(0, 40);
  return `${a.tagName.toLowerCase()}${a.id ? '#' + a.id : ''}${a.getAttribute('role') ? '[role=' + a.getAttribute('role') + ']' : ''} "${t}"`;
});
const istKopfRueck = (s) => /^h3#ue-rueck-t/.test(s);

/** Liest die Frage aus dem DOM. */
const lies = () => page.evaluate(() => {
  const q = document.querySelector('section.ue-frage');
  if (!q) return null;
  const txt = (e) => (e?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const tabellen = [...q.querySelectorAll('.ue-tab table')].map(t => ({
    kopf: t.querySelectorAll('thead th[scope=col]').length, zeilen: t.querySelectorAll('tbody tr').length,
    zeilenkoepfe: t.querySelectorAll('tbody th[scope=row]').length, name: !!(t.querySelector('caption') || t.getAttribute('aria-labelledby'))
  }));
  const bilder = [...q.querySelectorAll('figure.fd')].map(f => {
    const svg = f.querySelector('svg.diagramm');
    const d = f.querySelector('details.bb-text');
    return { name: svg?.getAttribute('aria-label') ?? '', role: svg?.getAttribute('role') ?? '', beschreibung: txt(d?.querySelector('.bb-inhalt p')).length, datentabelle: d?.querySelectorAll('table tbody tr').length ?? 0, tabellenKopf: d?.querySelectorAll('th[scope=col]').length ?? 0 };
  });
  const einzel = [...q.querySelectorAll('.ue-antworten button.ue-antwort')];
  const mehr = [...q.querySelectorAll('.ue-aussage')];
  return {
    lauf: txt(q.querySelector('.ue-lauf')), stamm: txt(q.querySelector('#ue-stamm')), fall: txt(q.querySelector('.ue-fall')),
    mehrfach: mehr.length > 0,
    antworten: einzel.map(b => txt(b.querySelector('span:not(.nur-vorleser)'))),
    aussagen: mehr.map(m => txt(m.querySelector('label span'))),
    tabellen, bilder,
    rueck: !!q.querySelector('.ue-rueck'), rueckKopf: txt(q.querySelector('#ue-rueck-t')),
  };
});
/** Nach der Rückmeldung: Rückmeldungstext, Erklärung unmittelbar danach, Aussagenurteile. */
const liesRueck = () => page.evaluate(() => {
  const txt = (e) => (e?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const q = document.querySelector('section.ue-frage');
  const h = q?.querySelector('#ue-rueck-t');
  const next = h?.nextElementSibling;
  const region = h?.closest('.ue-rueck');
  const richtigIst = [...(region?.querySelectorAll('p') ?? [])].map(txt).find(t => t.startsWith('Richtig ist:')) ?? '';
  const urteile = [...q?.querySelectorAll('.ue-aussage') ?? []].map(a => ({ stimmt: txt(a.querySelector('.ue-urteil b')).startsWith('Die Aussage stimmt.'), text: txt(a.querySelector('label span')), eingeschaetzt: /^\s*Richtig eingeschätzt/.test(txt(a.querySelector('.ue-urteil p')).replace(/^Die Aussage stimm\w+( nicht)?\.\s*/, '')) }));
  const gewaehlt = [...q?.querySelectorAll('.ue-antworten button[aria-pressed=true] span:not(.nur-vorleser)') ?? []].map(txt);
  return { kopf: txt(h), naechsteTag: next?.tagName ?? '', naechsterText: txt(next).slice(0, 80), laenge: txt(region).length, richtigIst: richtigIst.replace(/^Richtig ist:\s*/, ''), urteile, gewaehlt, links: region?.querySelectorAll('a').length ?? 0, ansage: txt(document.getElementById('ansage-hoeflich')) };
});

/** Mit Tab bis zu einem Element, das `test` erfüllt (läuft im Browser); liefert Zahl der Tastendrücke oder -1. */
async function tabBis(test, max = 20) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab');
    if (await page.evaluate(test)) return i + 1;
  }
  return -1;
}
const alsAntwort = () => !!document.activeElement?.closest?.('.ue-antworten') && document.activeElement.tagName === 'BUTTON';
const alsKasten = () => document.activeElement instanceof HTMLInputElement && document.activeElement.type === 'checkbox' && !!document.activeElement.closest('.ue-aussage');
const alsNaechste = () => { const a = document.activeElement; return a?.tagName === 'BUTTON' && /^(Nächste Frage|Zum Ergebnis)$/.test(a.textContent.trim()); };

/** Eine Frage beantworten: nur mit Tab, Leertaste, Eingabe. `plan`: Einzelwahl `{ index }`, Mehrfach `{ haken: Set<Index> }`. */
async function beantworte(z, plan) {
  const notiz = [];
  let fokusVorher = await aktiv();
  if (!/^h2#ue-stamm/.test(fokusVorher)) notiz.push(`Fokus vor der Antwort: ${fokusVorher}`);
  let weg = true;
  if (!z.mehrfach) {
    const n = await tabBis(alsAntwort);
    if (n < 0) { weg = false; notiz.push('Antwortknopf per Tab nicht erreichbar'); }
    else {
      for (let k = 0; k < plan.index; k++) await page.keyboard.press('Tab');
      const a = await aktiv();
      await page.keyboard.press(plan.leertaste ? 'Space' : 'Enter');
      if (!plan.leertaste) notiz.push('');
      void a;
    }
  } else {
    // Aussagen der Reihe nach: Tab zum Kasten, Leertaste wenn angehakt werden soll
    for (let k = 0; k < z.aussagen.length; k++) {
      const n = await tabBis(alsKasten, 6);
      if (n < 0) { weg = false; notiz.push(`Kasten ${k + 1} per Tab nicht erreichbar`); break; }
      if (plan.haken.has(k)) await page.keyboard.press('Space');
    }
    if (weg) {
      const n = await tabBis(() => document.activeElement?.tagName === 'BUTTON' && document.activeElement.textContent.trim() === 'Prüfen', 4);
      if (n < 0) { weg = false; notiz.push('Prüfen per Tab nicht erreichbar'); } else await page.keyboard.press('Enter');
    }
  }
  if (!weg) {
    // Rückfall mit Klick, damit die Messung weiterläuft (der Tastaturweg ist dann „nein“)
    if (!z.mehrfach) await page.locator('.ue-antworten button.ue-antwort').nth(plan.index).click();
    else { for (const k of plan.haken) await page.locator('.ue-aussage input').nth(k).check(); await page.getByRole('button', { name: 'Prüfen', exact: true }).click(); }
  }
  await ZEIT(120);
  return { weg, notiz: notiz.filter(Boolean) };
}

/** Auf die nächste Frage: Tab bis „Nächste Frage“, Eingabe, Fokus lesen. */
async function weiterZurNaechsten() {
  const n = await tabBis(alsNaechste, 25);
  if (n < 0) {
    await page.getByRole('button', { name: /^(Nächste Frage|Zum Ergebnis)$/ }).click();
    await ZEIT(150);
    return { n: -1, fokus: await aktiv() };
  }
  await page.keyboard.press('Enter');
  await ZEIT(150);
  return { n, fokus: await aktiv() };
}

/** Eine Runde durch alle Fragen der Auswahl. `modus`: 'erst' (Einzel: erste Antwort, Mehrfach: nichts angehakt) oder 'zweit' (Einzel: gerade das Gegenteil, Mehrfach: alles Richtige). */
async function runde(modus, wissen, erwartet, kopf) {
  const zeilen = [];
  for (let nr = 0; nr < 400; nr++) {
    const z = await lies();
    if (!z) break;
    const m = erwartet?.[nr];
    const b = { nr: nr + 1, lauf: z.lauf, mehrfach: z.mehrfach, tabellen: z.tabellen, bilder: z.bilder, stamm: z.stamm, antworten: z.antworten, aussagen: z.aussagen, notiz: [] };
    b.id = m?.id ?? '(zufällig gezogen)';
    if (m && m.mehrfach !== undefined && m.mehrfach !== z.mehrfach) b.notiz.push(`Fragenart weicht von der Liste ab (Liste ${m.mehrfach ? 'mehrfach' : 'einzel'})`);
    b.ziel = m ? { tabelle: m.tabelle, diagramm: m.diagramm } : null;
    const wiss = wissen[z.stamm];
    let plan;
    if (!z.mehrfach) {
      let idx = 0;
      if (modus === 'zweit' && wiss) {
        const richtigIdx = z.antworten.indexOf(wiss.richtigText);
        if (wiss.erstRichtig) idx = z.antworten.findIndex((_, i) => i !== richtigIdx);
        else idx = richtigIdx >= 0 ? richtigIdx : 0;
        if (richtigIdx < 0) b.notiz.push('Richtige Antwort aus Runde 1 nicht wiedergefunden');
      }
      plan = { index: idx, leertaste: nr % 2 === 1 };
    } else {
      const haken = new Set();
      if (modus === 'zweit' && wiss) z.aussagen.forEach((t, i) => { if (wiss.wahr.includes(t)) haken.add(i); });
      plan = { haken };
    }
    const { weg, notiz } = await beantworte(z, plan);
    b.weg = weg; b.notiz.push(...notiz);
    const fokus = await aktiv();
    const r = await liesRueck();
    b.fokusNachAntwort = fokus;
    b.rueck = r.kopf;
    b.erklaerungImLesefluss = r.naechsteTag === 'P' && r.naechsterText.length > 15;
    b.erklaerungNaechstes = `${r.naechsteTag} "${r.naechsterText.slice(0, 40)}"`;
    b.ansageText = r.ansage;
    b.gesamtlaenge = r.laenge;
    // Tabfolge von der Rückmeldung bis zum Weiter-Knopf: sind Links/Erklärung per Tab erreichbar?
    b.richtig = z.mehrfach ? /^4 von 4/.test(r.kopf) : r.kopf === 'Richtig.';
    if (!z.mehrfach) {
      if (b.richtig) wissen[z.stamm] = { richtigText: r.gewaehlt[0] ?? z.antworten[plan.index], erstRichtig: modus === 'erst' };
      else wissen[z.stamm] = { richtigText: r.richtigIst, erstRichtig: false };
    } else wissen[z.stamm] = { wahr: r.urteile.filter(u => u.stimmt).map(u => u.text) };
    // Fokus nach Antwort gehört zur Rückmeldung?
    b.fokusAufRueckmeldung = istKopfRueck(fokus);
    const wz = await weiterZurNaechsten();
    b.tabsZumWeiter = wz.n;
    b.fokusNachWeiter = wz.fokus;
    const ende = /^h2#ue-ende-t/.test(wz.fokus);
    b.fokusNeueFrageOk = ende || /^h2#ue-stamm/.test(wz.fokus);
    zeilen.push(b);
    if (ende) break;
  }
  return zeilen;
}

async function neuStart() {
  // „Alle noch einmal“ per Tab erreichen
  const n = await tabBis(() => document.activeElement?.tagName === 'BUTTON' && /^(Alle noch einmal|Neue Runde)$/.test(document.activeElement.textContent.trim()), 150);
  if (n < 0) { await page.getByRole('button', { name: /Alle noch einmal|Neue Runde/ }).click(); await ZEIT(200); return { weg: false, tabs: -1, fokus: await aktiv() }; }
  await page.keyboard.press('Enter');
  await ZEIT(200);
  return { weg: true, tabs: n, fokus: await aktiv() };
}

async function auswahlFragen(einheitId, erwartet) {
  const aus = { fragen: [], notizen: [] };
  await page.waitForSelector('section.ue-frage, .ue-ende, [role=alert]', { timeout: 20000 });
  const wissen = {};
  const r1 = await runde('erst', wissen, erwartet);
  const ende1 = await page.evaluate(() => document.querySelector('#ue-ende-t')?.textContent ?? '');
  aus.ende1 = ende1;
  const ns = await neuStart();
  aus.neuStartMitTastatur = ns.weg; aus.tabsNeuStart = ns.tabs; aus.fokusNachNeuStart = ns.fokus;
  if (!/^h2#ue-stamm/.test(ns.fokus)) aus.notizen.push(`Nach „Alle noch einmal“ steht der Fokus auf ${ns.fokus}`);
  const r2 = await runde('zweit', wissen, erwartet);
  aus.zaehlt = { erst: r1.length, zweit: r2.length, erwartet: erwartet?.length ?? null };
  for (let i = 0; i < r1.length; i++) aus.fragen.push({ erst: r1[i], zweit: r2[i] ?? null });
  return aus;
}

// ---- Rechenaufgaben ----
async function rechneAufgabe(aid) {
  const sch = meta.aufgaben[aid];
  const aus = { aufgabe: aid, schritte: [] };
  if (!sch) { aus.fehler = 'keine Lösung in der Liste'; return aus; }
  for (let i = 0; i < sch.length; i++) {
    const s = sch[i];
    const feld = page.locator(`#ra-${aid}-f${i}`);
    const zeile = { schritt: i + 1, einheit: s.einheit };
    try {
      await feld.waitFor({ timeout: 5000 });
      await feld.focus();
      const label = await page.evaluate(id => { const f = document.getElementById(id); return { name: document.querySelector(`label[for=${id}]`)?.textContent?.trim() ?? '', labelledby: document.getElementById(f.getAttribute('aria-labelledby'))?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 60) ?? '', einheitImNamen: false }; }, `ra-${aid}-f${i}`);
      zeile.name = label;
      const fmt = (x, st) => String(Number(x).toFixed(st)).replace('.', ',');
      const falsch = Math.abs(s.falsch - s.soll) < 1e-9 ? s.soll + 7.3 : s.falsch;
      await feld.fill(fmt(falsch, Math.max(s.stellen, 0)));
      await page.keyboard.press('Enter');
      await ZEIT(200);
      zeile.falsch = await page.evaluate(id => { const f = document.getElementById(id); const r = document.getElementById(f.getAttribute('aria-describedby')); return { invalid: f.getAttribute('aria-invalid'), grund: r?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 100), ansage: document.getElementById('ansage-hoeflich')?.textContent ?? '' }; }, `ra-${aid}-f${i}`);
      zeile.fokusNachFalsch = await aktiv();
      await feld.fill(fmt(s.soll, Math.max(s.stellen, 0)));
      await page.keyboard.press('Enter');
      await ZEIT(250);
      zeile.richtig = { ansage: await page.evaluate(() => document.getElementById('ansage-hoeflich')?.textContent ?? ''), invalid: await feld.getAttribute('aria-invalid') };
      zeile.fokusNachRichtig = await aktiv();
    } catch (e) { zeile.fehler = String(e).slice(0, 150); }
    aus.schritte.push(zeile);
  }
  aus.fertigText = await page.evaluate(() => document.querySelector('.ra-fertig')?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 60) ?? '');
  return aus;
}

/** Ein Abschnitt, der nicht aus Fragen besteht: Überschrift und grobe Zählung. */
const abschnittProbe = () => page.evaluate(() => {
  const s = document.querySelector('.ln-abschnitt');
  const bilder = [...(s?.querySelectorAll('svg, img, canvas') ?? [])].filter(e => e.getAttribute('aria-hidden') !== 'true' && !e.closest('[aria-hidden=true]'));
  const ohneName = bilder.filter(e => !(e.getAttribute('aria-label') || e.getAttribute('alt') || e.querySelector('title') || e.getAttribute('aria-labelledby'))).length;
  const ranges = [...(s?.querySelectorAll('input[type=range]') ?? [])];
  return {
    h2: s?.querySelector('h2')?.textContent?.trim() ?? '', laenge: (s?.textContent ?? '').length,
    tabellen: s?.querySelectorAll('table').length ?? 0, tabellenOhneKopf: [...(s?.querySelectorAll('table') ?? [])].filter(t => !t.querySelector('th')).length,
    bilder: bilder.length, bilderOhneName: ohneName, regler: ranges.length, reglerOhneWorte: ranges.filter(r => !r.getAttribute('aria-valuetext')).length,
    reglerOhneName: ranges.filter(r => !(r.getAttribute('aria-label') || r.getAttribute('aria-labelledby') || r.labels?.length)).length
  };
});

async function einheit(id) {
  const datei = join(ausOrdner, `einheit-${id.replace(/[^\w-]/g, '_')}.json`);
  if (existsSync(datei) && !process.env.NEU) return 'übersprungen';
  const e = meta.einheiten[id];
  const aus = { einheit: id, pfade: meta.pfade.filter(p => p.einheiten.includes(id)).map(p => p.id), abschnitte: [], konsole: [] };
  const t0 = Date.now();
  try {
    if (e.abschlussVon) {
      const pf = meta.pfade.find(p => p.id === e.abschlussVon);
      await page.goto(`${BASIS}#lernen/pruefung/${e.abschlussVon}`);
      await page.waitForSelector('#ln-t', { timeout: 20000 });
      await ZEIT(300);
      const erw = pf.abschluss?.length ? pf.abschluss.map(i => ({ id: i, mehrfach: undefined })) : null;
      aus.abschnitte.push({ art: 'abschlusstest', ...(await auswahlFragen(id, erw?.map(x => ({ id: x.id }))) ) });
    } else {
      const liste = [];
      if (e.hilfe) liste.push({ art: 'erklaerung' });
      for (const r of e.rechnen) liste.push({ art: 'rechnen', ziel: r });
      for (let i = 0; i < e.beispiele; i++) liste.push({ art: 'beispiel' });
      for (const p of e.probieren) liste.push({ art: 'regler', ziel: p });
      if (e.fragen.length) liste.push({ art: 'fragen' });
      for (let k = 0; k < liste.length; k++) {
        const a = liste[k];
        await page.goto(`${BASIS}#lernen/${id}/${k + 1}`);
        await page.waitForSelector('#ln-abs-t', { timeout: 20000 });
        await ZEIT(350);
        const rec = { art: a.art, nr: k + 1 };
        if (a.art === 'fragen') Object.assign(rec, await auswahlFragen(id, e.fragen));
        else if (a.art === 'rechnen') { Object.assign(rec, await abschnittProbe()); rec.aufgabe = await rechneAufgabe(a.ziel); }
        else Object.assign(rec, await abschnittProbe());
        aus.abschnitte.push(rec);
      }
    }
  } catch (err) { aus.fehler = String(err).slice(0, 300); }
  aus.sekunden = Math.round((Date.now() - t0) / 1000);
  aus.konsole = konsole.splice(0);
  writeFileSync(datei, JSON.stringify(aus));
  return aus.fehler ? 'FEHLER ' + aus.fehler : `ok ${aus.sekunden}s`;
}

const alle = Object.keys(meta.einheiten);
const reihe = nurEinheiten.length ? nurEinheiten : alle;
for (const id of reihe) {
  if (!meta.einheiten[id]) { console.log(id, 'unbekannt'); continue; }
  console.log(new Date().toISOString().slice(11, 19), id, await einheit(id));
}
await browser.close();
