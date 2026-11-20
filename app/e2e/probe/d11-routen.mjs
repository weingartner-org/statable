// D11 (07.11.): Routen ohne Messung: axe (WCAG 2.2 AA) plus Tab-Weg (Prüfer aus tabweg.spec.ts) mit geöffnetem Beispiel.
// Aufruf (Vorschau auf Port 4200): PORT=4200 node e2e/probe/d11-routen.mjs [route ...]   ohne Angabe: die Routen, die in tabweg.json fehlten, plus tabelle/amtlich/bearbeiten.
// Ergebnis: e2e/ergebnisse/d11-routen.json
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { transformWithOxc } from 'vite';
import { readFileSync, writeFileSync } from 'node:fs';
const quelle = readFileSync(new URL('../tabweg.spec.ts', import.meta.url), 'utf8');
const von = quelle.indexOf('export async function pruefeTabweg'), bis = quelle.indexOf('async function warte');
const js = (await transformWithOxc('const TAB_MAX = 400;\n' + quelle.slice(von, bis), 'x.ts')).code.replace('export async function', 'async function');
const pruefeTabweg = new Function(js + '\nreturn pruefeTabweg;')();
const U = `http://127.0.0.1:${process.env.PORT || 4200}/`;
const STANDARD = ['tabelle', 'amtlich', 'bearbeiten', 'blatt', 'hilfe/daten-vorbereiten', 'hilfe/daten-check', 'bearbeiten/umkodieren', 'bearbeiten/berechnen', 'bearbeiten/auswahl', 'bearbeiten/zusammen',
  'lernen/thema/daten', 'lernen/thema/beschreiben', 'lernen/thema/verteilung', 'verstehen/vergleich', 'verstehen/anteilstest'];
const routen = process.argv.length > 2 ? process.argv.slice(2) : STANDARD;
const b = await chromium.launch();
const page = await (await b.newContext({ locale: 'de-DE', viewport: { width: 1280, height: 800 } })).newPage();
await page.goto(U + '#beispiele'); await page.waitForTimeout(1500);
await page.getByRole('button', { name: /Öffnen und üben/ }).first().click(); await page.waitForTimeout(2500);
const aus = {};
for (const r of routen) {
  try {
    await page.goto(U + '#' + r); await page.locator('#inhalt').first().waitFor({ state: 'attached' }).catch(() => {}); await page.waitForTimeout(1200);
    const ax = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    const e = await pruefeTabweg(page);
    aus[r] = {
      h1: await page.locator('h1').first().textContent().catch(() => null),
      axe: ax.violations.map(v => ({ regel: v.id, knoten: v.nodes.length, beispiel: v.nodes[0]?.html.slice(0, 120) })),
      stopps: e.stopps.length, rundlauf: e.rundlauf, ohneName: e.ohneName.length, fallen: e.fallen.length, unsichtbar: e.unsichtbar.length, verdecktGanz: e.verdecktGanz.length, verdecktTeil: e.verdecktTeil.length,
      ohneNameBeispiele: e.ohneName.slice(0, 3), verdecktTeilBeispiele: e.verdecktTeil.slice(0, 3).map(s => `${s.nr} ${s.tag} ${s.name} <- ${s.verdeckerKlasse}`),
    };
    const x = aus[r];
    console.log(r.padEnd(28), 'axe', x.axe.length, x.axe.map(v => v.regel + '×' + v.knoten).join(','), '| Stopps', x.stopps, 'ohneName', x.ohneName, 'Falle', x.fallen, 'unsichtbar', x.unsichtbar, 'verdeckt ganz/teil', x.verdecktGanz, x.verdecktTeil);
  } catch (err) { aus[r] = { fehler: String(err).slice(0, 200) }; console.log(r, 'FEHLER', aus[r].fehler); }
}
writeFileSync(new URL('../ergebnisse/d11-routen.json', import.meta.url), JSON.stringify({ erstellt: new Date().toISOString(), routen: aus }, null, 2));
await b.close();
