/**
 * Testhilfe Feinstruktur: die Musterlösung (docs/feinstruktur/beispiele/muster-feinstruktur.json) über die Funktionen des Arbeitsplatzes
 * eingetragen. Gemeinsam für die Sollwerte F3B2 (feinstruktur-pruefen.test.ts) und F3c (Gruppe, Word).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { cpLaenge, neuesQualProjekt, pruefeQualProjekt, type Dokument, type QualProjekt, type Sequenzanalyse } from './qualprojekt';
import { beginneDeuten, einheitFertig, fuegeEintragHinzu, neueAnalyse, schalteGrenze } from './feinstruktur-analyse';
import { fuegeBelegHinzu, fuegeMusterHinzu, setzeFazitText, setzeStand, speichereReflexion } from './feinstruktur-pruefen';

export const muster = JSON.parse(readFileSync(fileURLToPath(new URL('../../../docs/feinstruktur/beispiele/muster-feinstruktur.json', import.meta.url)), 'utf8'));
export const TEXT: string = muster.ausschnitt.text;
export const EINHEITEN: string[] = muster.sinneinheiten.map((e: { text: string }) => e.text);
export const MUSTER_GRENZEN = EINHEITEN.slice(1).map((_, i) => cpLaenge(EINHEITEN.slice(0, i + 1).join(' ') + ' '));
export const rund = (p: unknown): QualProjekt => pruefeQualProjekt(JSON.parse(JSON.stringify(p)));

export function projekt(sa: Sequenzanalyse): QualProjekt {
  const q = neuesQualProjekt('F3B2');
  const d: Dokument = { id: 'd1', name: 'Interview B', art: 'text', text: 'B: ' + TEXT, erstellt: 1, geaendert: 1 };
  q.dokumente.push(d);
  q.sequenzanalysen = [sa];
  return q;
}
export function mitMuster(): Sequenzanalyse {
  let sa = neueAnalyse({ start: 3, ende: 3 + cpLaenge(TEXT), text: TEXT, forschungsfrage: muster.forschungsfrage, name: 'Muster', jetzt: 1 });
  sa.dokument = 'd1';
  for (const g of MUSTER_GRENZEN) { const r = schalteGrenze(sa, g, 2); if (r.art !== 'geaendert') throw new Error(r.art); sa = r.analyse; }
  return sa;
}

export type MusterLesart = { id: string; text: string; pruefung: string };
export type MusterEinheit = { text: string; paraphrase: string | string[]; intentionen: string | string[]; rollen: string | string[]; lesarten: MusterLesart[]; standFrueherer: { einheit: number; id: string; stand: 'offen' | 'haelt' | 'verworfen'; begruendung: string }[] };
export const alsListe = (x: string | string[]) => (Array.isArray(x) ? x : [x]);

/** Die ganze Musterlösung über die Funktionen des Arbeitsplatzes eingetragen (Architekturblatt Abschnitt 7). */
export function ganzesMuster(): Sequenzanalyse {
  let sa = beginneDeuten(mitMuster(), 1);
  const ids = new Map<string, string>();
  (muster.sinneinheiten as MusterEinheit[]).forEach((me, k) => {
    for (const s of me.standFrueherer) sa = setzeStand(sa, ids.get(`${s.einheit}${s.id}`)!, s.stand, s.begruendung, k, 5);
    for (const t of alsListe(me.paraphrase)) sa = fuegeEintragHinzu(sa, k, 'paraphrase', t, 5).analyse;
    for (const t of alsListe(me.intentionen)) sa = fuegeEintragHinzu(sa, k, 'intentionen', t, 5).analyse;
    for (const t of alsListe(me.rollen)) sa = fuegeEintragHinzu(sa, k, 'rollen', t, 5).analyse;
    for (const l of me.lesarten) { const r = fuegeEintragHinzu(sa, k, 'lesarten', l.text, 5, l.pruefung); sa = r.analyse; ids.set(`${k + 1}${l.id}`, r.id); }
    sa = einheitFertig(sa, 6);
    const mr = (muster.zwischenreflexionen as { nachEinheit: number; begriffe: string; bisher: string; pruefen: string }[]).find(r => r.nachEinheit === k + 1);
    if (mr) sa = speichereReflexion(sa, k, { begriffe: mr.begriffe, bisher: mr.bisher, pruefen: mr.pruefen }, 7);
  });
  const r = fuegeMusterHinzu(sa, muster.zwischenfazit.text, 8); sa = r.analyse;
  for (const b of muster.zwischenfazit.belege as { sinneinheit: number }[]) sa = fuegeBelegHinzu(sa, r.id, b.sinneinheit - 1, 8);
  return setzeFazitText(sa, { bezugForschungsfrage: muster.forschungsfrage }, 8);
}

