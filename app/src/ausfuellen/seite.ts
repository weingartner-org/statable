/**
 * Ausfüllseite (Stufe 3C): eigenständiger Einstieg, reines TypeScript, KEINE Oberflächen-Abhängigkeit und KEIN scrypt.
 * Dieselbe Datei wird auf zwei Wegen ausgeliefert (Bauweg: docs/erheben/BAU-AUSFUELLSEITE.md):
 *   1. als Fragebogen-Datei: `fragebogenDatei(plan)` setzt das gebündelte Skript in EINE HTML-Datei (Plan als JSON in `<script id="statable-plan">`);
 *   2. als feste Seite `ausfuellen/index.html` (Vite-Mehrseiten-Eintrag), die den Plan aus `location.hash` liest (Link).
 * Plan lesen: `window.__STATABLE_PLAN__` → `<script id="statable-plan" type="application/json">` → `location.hash` (base64url von deflate-JSON, ./planlink.ts).
 * Der Ablauf selbst steht in `ablauf.ts` (geteilt mit der Erhebungsstation).
 */
import { STIL } from './stil';
import { t } from './texte';
import { dekodierePlan } from './planlink';
import { verschluesseleAntwort } from '../lib/antwortsatz';
import { starteAusfuellen, istPlan, h, sprachVonGeraet, type Plan } from './ablauf';

const SEITENSTIL = `
html{color-scheme:light}
body{margin:0;background:#fff;color:#1a1a1a}
`;

function ladePlan(): unknown {
  const w = (window as unknown as { __STATABLE_PLAN__?: unknown }).__STATABLE_PLAN__;
  if (w && typeof w === 'object') return w;
  const el = document.getElementById('statable-plan');
  if (el?.textContent?.trim()) return JSON.parse(el.textContent);
  if (location.hash.length > 1) return dekodierePlan(location.hash);
  throw new Error('kein Plan');
}

function starte(): void {
  const wurzel = document.getElementById('wurzel') ?? document.body.appendChild(h('div', { id: 'wurzel' }));
  document.head.append(h('style', {}, SEITENSTIL));
  let plan: Plan;
  try {
    const roh = ladePlan();
    if (!istPlan(roh)) throw new Error('kein gültiger Plan');
    plan = roh;
  } catch {
    const sp = sprachVonGeraet();
    document.head.append(h('style', { id: 'statable-af-stil' }, STIL));
    document.documentElement.lang = sp.startsWith('en') ? 'en' : 'de';
    document.title = t(sp, 'fragebogen');
    wurzel.replaceChildren(
      h('header', { class: 'af kopf' }, h('h1', {}, t(sp, 'fragebogen'))),
      h('main', { class: 'af', id: 'haupt' }, h('p', { 'data-fehler-seite': 'keinPlan' }, t(sp, 'keinPlan'))),
    );
    return;
  }
  window.addEventListener('hashchange', () => location.reload());
  starteAusfuellen(wurzel, plan, { verschluessele: verschluesseleAntwort });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', starte); else starte();
