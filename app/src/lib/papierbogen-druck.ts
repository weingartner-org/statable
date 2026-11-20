/**
 * Papierbogen zum Scannen (E8, Teil 2a): der Antwortbogen als druckbare HTML-Datei.
 * Aufbau: Antwortbogen (Eckmarken, Kennleiste, Kästchen mit Nummer und Code) NEBEN der gewöhnlichen Papierfassung, die den Wortlaut enthält.
 * Auf dem Antwortbogen steht je Zeile die Fragenummer, über den Kästchen der Anfang des Fragetextes und unter jedem Kästchen der Code.
 * Jeder Bogen bekommt seine eigene Nummer in der Kennleiste (1 bis Anzahl). Die Datei braucht kein Netz: im Browser öffnen, Drucken, „Als PDF speichern“ oder auf Papier.
 * Wichtig fürs Drucken: „Tatsächliche Größe“ (100 %), keine Kopf- und Fußzeilen, Hintergrundgrafiken an, sonst stimmen die Maße nicht.
 */
import type { FragebogenPlan } from './fragebogenplan';
import { modellVon } from './fragebogenexport';
import { bogenFragenVon, bogenLayout, KENN, MARKEN, SEITE_MM, type LSeite } from './papierbogen';

export const MAX_BOEGEN = 500;
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const mm = (v: number) => `${Math.round(v * 1000) / 1000}mm`;

export interface BogenDruck { html: string; seiten: number; boegen: number; fragen: number; nichtLesbar: number[] }

function seiteHtml(s: LSeite, kopf: string, titel: Map<number, string>, bogen: number, von: number, sp: string): string {
  const t: string[] = [];
  MARKEN.forEach(m => t.push(`<i class="m" style="left:${mm(m.x)};top:${mm(m.y)};width:${mm(m.s)};height:${mm(m.s)}"></i>`));
  s.bits.forEach((b, i) => { if (b) t.push(`<i class="m" style="left:${mm(KENN.x0 + i * KENN.schritt)};top:${mm(KENN.y)};width:${mm(KENN.zelle)};height:${mm(KENN.zelle)}"></i>`); });
  t.push(`<p class="kopf" style="left:30mm;top:15mm;width:150mm">${esc(kopf)}</p>`);
  t.push(`<p class="klein" style="left:30mm;top:31mm;width:150mm">${esc(sp === 'de' ? `Bogen ${bogen} von ${von}, Seite ${s.seite}. Nur mit dunklem Stift ein Kästchen ausfüllen oder ankreuzen. Nichts außerhalb der Kästchen markieren.` : `Sheet ${bogen} of ${von}, page ${s.seite}. Mark one box with a dark pen. Do not mark anywhere outside the boxes.`)}</p>`);
  const gesehen = new Set<number>();
  for (const k of s.kaestchen) {
    if (!gesehen.has(k.nr)) {
      gesehen.add(k.nr);
      const x = k.x - 10, y = k.y - 3.6;
      t.push(`<p class="nr" style="left:${mm(x < 4 ? 4 : x)};top:${mm(k.y)}">${k.nr}</p>`);
      t.push(`<p class="fr" style="left:${mm(k.x)};top:${mm(y)};width:${mm(170)}">${esc((titel.get(k.nr) ?? '').slice(0, 90))}</p>`);
    }
    t.push(`<i class="k" style="left:${mm(k.x)};top:${mm(k.y)};width:${mm(k.s)};height:${mm(k.s)}"></i>`);
    t.push(`<p class="cd" style="left:${mm(k.x - 1.5)};top:${mm(k.y + k.s + 0.2)};width:${mm(k.s + 3)}">${k.code}</p>`);
  }
  return `<section class="s" aria-label="${esc(sp === 'de' ? `Bogen ${bogen}, Seite ${s.seite}` : `Sheet ${bogen}, page ${s.seite}`)}">${t.join('')}</section>`;
}

/** Baut die Datei. Wirft `planFehler…` bei Fehlern im Plan und `keineFragen`, wenn keine Frage ankreuzbar ist. */
export function papierbogenDruck(plan: FragebogenPlan, sprache: string, anzahl: number): BogenDruck {
  const n = Math.max(1, Math.min(MAX_BOEGEN, Math.floor(anzahl) || 1));
  const { fragen, nichtLesbar } = bogenFragenVon(plan, sprache);
  if (!fragen.length) throw new Error('keineFragen');
  const m = modellVon(plan, sprache, true);
  const titel = new Map<number, string>();
  for (const sei of m.seiten) for (const e of sei.inhalt) if (e.art === 'frage') titel.set(e.nr, e.text);
  const teile: string[] = [];
  let seiten = 0;
  for (let b = 1; b <= n; b++) {
    const lay = bogenLayout(fragen, { planId: plan.id, revision: plan.revision, bogen: b });
    for (const s of lay) { teile.push(seiteHtml(s, m.titel, titel, b, n, sprache)); seiten++; }
  }
  const css = `@page{size:A4;margin:0}html,body{margin:0;background:#fff}body{font-family:Arial,Helvetica,sans-serif;color:#000}
.s{position:relative;width:${SEITE_MM.b}mm;height:${SEITE_MM.h}mm;overflow:hidden;page-break-after:always;break-after:page}
.s *{position:absolute;margin:0;box-sizing:border-box}
.m{background:#000;display:block}.k{border:0.4mm solid #000;background:#fff;display:block}
.kopf{font-size:11pt;font-weight:bold;line-height:1.1}.klein{font-size:6.5pt;line-height:1.15}
.nr{font-size:9pt;font-weight:bold;width:9mm;text-align:end;line-height:1}.fr{font-size:6.5pt;line-height:1;white-space:nowrap;overflow:hidden}
.cd{font-size:6pt;text-align:center;line-height:1}
@media screen{body{background:#ddd}.s{background:#fff;margin:6mm auto;box-shadow:0 0 3mm #0006}}`;
  const l = sprache === 'de' ? 'de' : 'en';
  const html = `<!doctype html><html lang="${l}"><head><meta charset="utf-8"><title>${esc(m.titel)} - ${l === 'de' ? 'Antwortbogen zum Scannen' : 'Answer sheet for scanning'}</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body>${teile.join('')}</body></html>`;
  return { html, seiten, boegen: n, fragen: fragen.length, nichtLesbar };
}

export const papierbogenDateiname = (plan: FragebogenPlan, sprache: string): string => {
  const roh = (plan.titel[sprache] ?? Object.values(plan.titel)[0] ?? 'fragebogen').toString();
  return `${roh.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'fragebogen'}-antwortbogen.html`;
};
