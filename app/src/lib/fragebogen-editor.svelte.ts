/**
 * Zustand der Seite „Fragebogen planen“ (Paket 2C): welcher Plan, welches Element, Rückgängig, Speichern.
 *
 * Wo die Pläne liegen: bei offenem Projekt in `s.fragebogen` (Autospeichern über `sichern`, mit dem Projekt in der .statable-Datei), ohne Projekt als Entwurf
 * in diesem Modul (nur für diese Sitzung; „Als Datei speichern“ rettet ihn, „Ins Projekt übernehmen“ legt ihn in ein geöffnetes Projekt).
 * Jede Änderung geht über `tue`: ein Schritt im Verlauf, ein Speichern, eine Ansage. Die Pläne selbst sind unveränderlich (jede Änderung ergibt einen neuen Plan).
 */
import { s, L, melde, setzeFragebogen, setzeFragebogenPretest } from './sitzung.svelte';
import { sage } from './ansage';
import type { FragebogenPlan } from './fragebogenplan';
import { neuerPlan } from './fragebogenplan-editor';
import { anzahlKommentare, kommentareJeFrage, type PretestPlan } from './pretest';
import { planUebernehmen } from './fragebogenplan-datei';

export interface Rueckfrage { titel: string; text: string; ja: string; tun: () => void }
export type Ansicht = 'gliederung' | 'listen' | 'kodebuch' | 'eingabe' | 'abgleich';
export const ed = $state({
  planId: '' as string,
  /** gewähltes Element oder gewählte Seite (id) */
  auswahl: '' as string,
  ansicht: 'gliederung' as Ansicht,
  /** Nach dem nächsten Zeichnen bekommt dieses Element den Fokus (neu hinzugefügt, verschoben, gesprungen) */
  fokusAuf: '' as string,
  /** gewählte Liste in der Listenansicht */
  liste: '' as string,
  /** Hinweis zur zuletzt eingefügten Vorlage (bleibt stehen, bis er geschlossen wird) */
  vorlagenHinweis: '' as string,
  /** zählt jede Änderung des Verlaufs, damit „Rückgängig“ sich meldet */
  verlaufZahl: 0,
  /** Rückfrage vor dem Löschen (ein Dialog für die ganze Seite) */
  rueckfrage: null as Rueckfrage | null,
  /** Zähler: erhöhen, damit das Formular sein erstes Feld fokussiert */
  fokusFormular: 0,
  /** „geprüft“-Haken der Befundlisten mit Haken (Qualitätsprüfung 2D), Schlüssel `<liste>|<regel>|<element>`; nur diese Sitzung */
  geprueft: {} as Record<string, boolean>,
  /** Pretest-Antworten (Paket 2G), Schlüssel = Plan-id; Entwurf ohne Projekt (nur diese Sitzung; mit Projekt liegt es in `s.fragebogenPretest`): `vorschau` = gemerkte Durchgänge der Vorschau, `daten` = aus den Daten des Projekts eingelesen (`<name>_kommentar`) */
  pretest: {} as Record<string, PretestPlan>
});

/** Gesammelte Pretest-Antworten eines Plans: bei offenem Projekt aus dem Projekt (mit der Projektdatei gespeichert), sonst der Entwurf dieser Sitzung. */
export const pretestVon = (planId: string): PretestPlan | undefined => (s.projekt ? s.fragebogenPretest : ed.pretest)[planId];
function pretestAblegen(neu: Record<string, PretestPlan>) { if (s.projekt) void setzeFragebogenPretest(neu); else ed.pretest = neu; }
const pretestAlle = (): Record<string, PretestPlan> => (s.projekt ? s.fragebogenPretest : ed.pretest);
/** Alle Pretest-Antwortsätze des Plans (Vorschau-Durchgänge, dann eingelesene Daten). */
export const pretestSaetze = (planId: string): Record<string, unknown>[] => { const p = pretestVon(planId); return p ? [...p.vorschau, ...p.daten] : []; };
/** Kommentare je Frage und Block des Plans (leer, wenn nichts gesammelt ist). */
export const pretestKommentare = (plan: FragebogenPlan): Record<string, string[]> => kommentareJeFrage(plan, pretestSaetze(plan.id));
export const pretestAnzahl = (plan: FragebogenPlan): number => anzahlKommentare(pretestKommentare(plan));
export function pretestMerke(planId: string, art: 'vorschau' | 'daten', saetze: Record<string, unknown>[]) {
  const alle = pretestAlle(), alt = alle[planId] ?? { vorschau: [], daten: [] };
  pretestAblegen({ ...alle, [planId]: { ...alt, [art]: art === 'vorschau' ? [...alt.vorschau, ...saetze] : saetze } });
}
export function pretestLeere(planId: string) { const { [planId]: _weg, ...rest } = pretestAlle(); void _weg; pretestAblegen(rest); }
/** Legt die Pretest-Kommentare, die ohne Projekt entstanden sind, in das offene Projekt (schon vorhandene des Projekts bleiben). */
export function pretestInsProjekt() {
  if (!s.projekt || !Object.keys(ed.pretest).length) return;
  const neu = { ...s.fragebogenPretest }; for (const [id, e] of Object.entries(ed.pretest)) if (!neu[id]) neu[id] = e;
  ed.pretest = {}; void setzeFragebogenPretest(neu);
}

let entwurf = $state.raw<FragebogenPlan[]>([]);
let entwurfBilder = $state.raw<Record<string, Uint8Array>>({});
interface Schritt { plan: FragebogenPlan; auswahl: string }
const VERLAEUFE = new Map<string, Schritt[]>();
const VERLAUF_MAX = 100;

export const mitProjekt = () => !!s.projekt;
export const plaene = (): FragebogenPlan[] => (s.projekt ? s.fragebogen : entwurf);
export const bilder = (): Record<string, Uint8Array> => (s.projekt ? s.fragebogenBilder : entwurfBilder);
/** Der gewählte Plan (der erste, solange keiner gewählt ist). */
export const aktuellerPlan = (): FragebogenPlan | null => { const l = plaene(); return l.find(p => p.id === ed.planId) ?? l[0] ?? null; };
/** Liegt ein Entwurf bereit, der noch in keinem Projekt ist, während ein Projekt offen ist? */
export const entwurfWartet = (): boolean => !!s.projekt && entwurf.length > 0;

function ablegen(liste: FragebogenPlan[], neueBilder?: Record<string, Uint8Array>) {
  if (s.projekt) void setzeFragebogen(liste, neueBilder);
  else { entwurf = liste; if (neueBilder) entwurfBilder = neueBilder; }
}
function tausche(neu: FragebogenPlan) { ablegen(plaene().map(p => (p.id === neu.id ? neu : p))); }

export function verlaufLaenge(): number { void ed.verlaufZahl; const p = aktuellerPlan(); return p ? (VERLAEUFE.get(p.id)?.length ?? 0) : 0; }

/**
 * Eine Änderung: `fn` bekommt den Plan und liefert den neuen (oder denselben: dann geschieht nichts).
 * `text` ist die Ansage für Vorlesegeräte. `auswahl` setzt das gewählte Element danach; `fokus` schickt den Fokus dorthin (nach dem Hinzufügen auf das neue Element).
 */
export function tue(text: string, fn: (p: FragebogenPlan) => FragebogenPlan, opt: { auswahl?: string; fokus?: boolean; leise?: boolean } = {}): boolean {
  const alt = aktuellerPlan();
  if (!alt) return false;
  const neu0 = fn(alt);
  if (neu0 === alt || JSON.stringify(neu0) === JSON.stringify(alt)) return false;   // nichts geändert: kein Schritt im Verlauf
  const liste = VERLAEUFE.get(alt.id) ?? [];
  liste.push({ plan: alt, auswahl: ed.auswahl });
  if (liste.length > VERLAUF_MAX) liste.shift();
  VERLAEUFE.set(alt.id, liste); ed.verlaufZahl++;
  tausche({ ...neu0, revision: alt.revision + 1, geaendert: Date.now() });
  if (opt.auswahl !== undefined) { ed.auswahl = opt.auswahl; if (opt.fokus) ed.fokusAuf = opt.auswahl; }
  if (!opt.leise) sage(text);
  return true;
}
/** Nimmt den letzten Schritt zurück. */
export function rueckgaengig(): boolean {
  const alt = aktuellerPlan();
  const liste = alt ? VERLAEUFE.get(alt.id) : undefined;
  const schritt = liste?.pop();
  if (!alt || !schritt) return false;
  ed.verlaufZahl++;
  tausche(schritt.plan);
  ed.auswahl = schritt.auswahl;
  ed.fokusAuf = schritt.auswahl;
  melde(L('Die letzte Änderung ist rückgängig gemacht.', 'The last change has been undone.'));
  return true;
}

/** Wählt einen Plan. */
export function waehlePlan(id: string) { ed.planId = id; ed.auswahl = ''; ed.liste = ''; ed.verlaufZahl++; }

/** Legt einen neuen, leeren Plan an und wählt ihn. */
export function legeNeuenPlanAn(titel?: { de: string; en: string }): FragebogenPlan {
  const p = neuerPlan(titel ?? { de: 'Neuer Fragebogen', en: 'New questionnaire' });
  ablegen([...plaene(), p]);
  waehlePlan(p.id);
  // Verzögert: Der Fokus wandert danach auf die Überschrift „Gliederung“; eine sofortige Ansage ginge in der Fokusansage unter.
  setTimeout(() => sage(L('Neuer Fragebogen angelegt.', 'New questionnaire created.')), 500);
  return p;
}
/** Nimmt einen gelesenen Plan (aus Datei oder XLSForm) als NEUEN Plan auf; ein Plan mit vergebener id bekommt eine neue. */
export function nimmPlanAuf(plan: FragebogenPlan, neueBilder: Record<string, Uint8Array> = {}): FragebogenPlan {
  const { plan: p, bilder: b } = planUebernehmen(plan, neueBilder, plaene().map(x => x.id));
  ablegen([...plaene(), p], { ...bilder(), ...b });
  waehlePlan(p.id);
  return p;
}
/** Löscht einen Plan samt seinen Bildern (nicht rückgängig zu machen: die Oberfläche fragt vorher). */
export function loeschePlan(id: string) {
  const rest: Record<string, Uint8Array> = {};
  for (const [k, v] of Object.entries(bilder())) if (!k.startsWith(id + '/')) rest[k] = v;
  ablegen(plaene().filter(p => p.id !== id), rest);
  VERLAEUFE.delete(id); pretestLeere(id);
  if (ed.planId === id) waehlePlan('');
}
/** Legt den Entwurf (ohne Projekt entstanden) in das offene Projekt. */
export function entwurfInsProjekt(): number {
  if (!s.projekt || !entwurf.length) return 0;
  const n = entwurf.length;
  const neuePlaene = [...s.fragebogen, ...entwurf.filter(e => !s.fragebogen.some(p => p.id === e.id))];
  void setzeFragebogen(neuePlaene, { ...s.fragebogenBilder, ...entwurfBilder });
  entwurf = []; entwurfBilder = {};
  return n;
}

/* ---------- Bilder (liegen im Projekt als Bytes, Schlüssel `<plan-id>/<datei>`) */
export function setzeBildDatei(planId: string, datei: string, bytes: Uint8Array) { ablegen(plaene(), { ...bilder(), [`${planId}/${datei}`]: bytes }); }
export const bildBytes = (planId: string, datei: string): Uint8Array | undefined => bilder()[`${planId}/${datei}`];
export function bildEntfernen(planId: string, datei: string) { const b = { ...bilder() }; delete b[`${planId}/${datei}`]; ablegen(plaene(), b); }

/** Eine Adresse für die Vorschau eines Bildes (Blob aus den gespeicherten Bytes, je Bild nur einmal). */
const bildAdressen = new Map<string, { bytes: Uint8Array; url: string }>();
const BILD_TYP: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml' };
export const bildTypOk = (name: string): boolean => /\.(png|jpe?g|gif|webp|svg)$/i.test(name);
export function bildUrl(planId: string, datei: string): string {
  const bytes = bildBytes(planId, datei);
  if (!bytes || typeof URL === 'undefined') return '';
  const k = `${planId}/${datei}`, alt = bildAdressen.get(k);
  if (alt && alt.bytes === bytes) return alt.url;
  if (alt) URL.revokeObjectURL(alt.url);
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: BILD_TYP[(datei.split('.').pop() ?? '').toLowerCase()] ?? 'application/octet-stream' }));
  bildAdressen.set(k, { bytes, url });
  return url;
}

/** Nur für Tests. */
export function setzeEntwurfFuerTest(liste: FragebogenPlan[]) { entwurf = liste; entwurfBilder = {}; }
