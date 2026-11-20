/**
 * Stufe 3C: Fragebogen-Datei (eine einzelne HTML-Datei zum Ausfüllen) und Link zum Ausfüllen.
 *
 * Bauweg (docs/erheben/BAU-AUSFUELLSEITE.md): `src/ausfuellen/seite.ts` wird beim Laden des virtuellen Moduls `virtual:ausfuellseite` (vite.config.ts) zu EINER minifizierten
 * JS-Datei gebündelt; hier wird sie zusammen mit dem Plan in ein HTML-Gerüst gesetzt. Der Import ist dynamisch: der Baustein mit dem Skript wird nur geladen, wenn jemand die Datei erzeugt.
 *
 * Was in die Datei und den Link kommt, regelt `planFuerAusfuellen`: eine Liste erlaubter Felder (nie `codes`, `herkunft`, `geprueft` ...). Besonders: die Liste der Einmal-Codes
 * steht nie darin, nur `codeVerlangt` (sonst könnte jemand gültige Codes ablesen).
 */
import type { FragebogenPlan } from './fragebogenplan';
import { kodierePlan } from '../ausfuellen/planlink';
import { lok } from '../ausfuellen/pruefen';
import { texte } from '../ausfuellen/texte';
import { dateiname } from './dateiname';

export const LINK_BASIS = 'https://statable.eu/ausfuellen/';
/** Länger als das (Zeichen hinter dem `#`), schlägt Statable die Datei statt des Links vor: Messenger kürzen lange Links. */
export const LINK_MAX_ZEICHEN = 8000;

const ERLAUBT = ['format', 'version', 'id', 'revision', 'titel', 'sprachen', 'einleitung', 'einwilligung', 'abschluss', 'einstellungen', 'antwortlisten', 'skalen', 'elemente', 'empfaenger'] as const;

/** Der Teil des Plans, den Befragte brauchen (Erlaubnisliste; `codeVerlangt` nur als ja/nein, falls der Plan Codes verlangt). */
export function planFuerAusfuellen(plan: FragebogenPlan): Record<string, unknown> {
  const roh = plan as unknown as Record<string, unknown>;
  const aus: Record<string, unknown> = {};
  for (const k of ERLAUBT) if (roh[k] !== undefined) aus[k] = roh[k];
  aus.einstellungen = { ...plan.einstellungen, pretest: false };
  if (roh.codeVerlangt) aus.codeVerlangt = true;
  return aus;
}

export interface LinkInfo { link: string; laenge: number; zuLang: boolean }
export function fragebogenLinkInfo(plan: FragebogenPlan): LinkInfo {
  const teil = kodierePlan(planFuerAusfuellen(plan));
  return { link: `${LINK_BASIS}#${teil}`, laenge: teil.length, zuLang: teil.length > LINK_MAX_ZEICHEN };
}
export const fragebogenLink = (plan: FragebogenPlan): string => fragebogenLinkInfo(plan).link;

const html = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
/** JSON für `<script type="application/json">`: `<` wird zu `<`, damit weder `</script>` noch `<!--` im Text die Seite aufbrechen. */
const jsonImSkript = (x: unknown) => JSON.stringify(x).replace(/</g, '\\u003c').split(String.fromCharCode(0x2028)).join('\\u2028').split(String.fromCharCode(0x2029)).join('\\u2029');
const skriptImSkript = (s: string) => s.replace(/<\/(script)/gi, '<\\/$1').replace(/<!--/g, '<\\!--');

/** Dateiname wie bei den anderen Exporten: „<Titel> - Fragebogen-Datei.html“ (dateiname.ts). */
export function fragebogenDateiname(plan: FragebogenPlan): string {
  return `${dateiname(lok(plan.titel, plan.sprachen[0] ?? 'de', plan) || 'Fragebogen')} - Fragebogen-Datei.html`;
}

/** Die ganze Fragebogen-Datei als Text (UTF-8). Läuft ohne Netz; eine Content-Security-Policy im Kopf verbietet der Datei jeden Netzzugriff. */
export async function fragebogenDatei(plan: FragebogenPlan): Promise<string> {
  const { default: skript } = await import('virtual:ausfuellseite');
  const sp = plan.sprachen[0] ?? 'de';
  const titel = lok(plan.titel, sp, plan) || texte.de.fragebogen;
  return `<!doctype html>
<html lang="${html(sp)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; connect-src 'none'; form-action 'none'; base-uri 'none'">
<title>${html(titel)}</title>
</head>
<body>
<div id="wurzel"><noscript><main style="font:1rem/1.5 system-ui,sans-serif;max-width:40rem;margin:0 auto;padding:1rem"><p lang="de">${html(texte.de.ohneSkript)}</p><p lang="en">${html(texte.en.ohneSkript)}</p></main></noscript></div>
<script type="application/json" id="statable-plan">${jsonImSkript(planFuerAusfuellen(plan))}</script>
<script>${skriptImSkript(skript)}</script>
</body>
</html>
`;
}
