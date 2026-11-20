/**
 * Aktionen der Oberfläche „Fragebogen planen“ (Paket 2C): Hinzufügen, Vorlage einfügen, Verschieben, Löschen mit Rückfrage, Springen zu einem Befund.
 * Jede Aktion ruft `tue` aus fragebogen-editor.svelte.ts (Verlauf, Speichern, Ansage); die reine Logik steht in fragebogenplan-editor.ts.
 */
import { s, L } from './sitzung.svelte';
import { sage } from './ansage';
import type { Element as PlanElement, FragebogenPlan, Seite } from './fragebogenplan';
import {
  befundZiel, elementVon, finde, hinzufuegen, idsInnerhalb, loeschen, lokText, setzeText, verschieben, verweiseAuf, type Neu
} from './fragebogenplan-editor';
import { vorlageEinfuegen, vorlageName, type VorlageId } from './fragebogenplan-vorlagen';
import { aktuellerPlan, ed, tue } from './fragebogen-editor.svelte';

/** Die Sprache der Anzeige: die der Oberfläche, wenn der Plan sie hat, sonst die erste des Plans. */
export const anzeigeSprache = (plan: FragebogenPlan): string => (plan.sprachen.includes(s.einst.sprache) ? s.einst.sprache : plan.sprachen[0] ?? 'de');
const kurz = (t: string, n = 60) => (t.length > n ? t.slice(0, n - 1) + '…' : t);
/** Wie ein Element oder eine Seite heißt: Kurzlabel oder Text, sonst der Name. */
export function anzeigeTitel(plan: FragebogenPlan, x: Seite | PlanElement): string {
  const sp = anzeigeSprache(plan);
  if (x.art === 'seite') return kurz(lokText(x.titel, sp) || x.name);
  if (x.art === 'frage') return kurz(lokText(x.kurz, sp) || lokText(x.text, sp) || x.name);
  return kurz(lokText(x.text, sp) || x.name);
}
export const artWort = (art: 'seite' | 'frage' | 'block' | 'hinweis'): string =>
  art === 'seite' ? L('Seite', 'Page') : art === 'frage' ? L('Frage', 'Question') : art === 'block' ? L('Block', 'Block') : L('Hinweis', 'Note');

/** Wo steht das Element? „Stelle 2 von 4 auf Seite 1 von 2“ (für Ansagen). */
export function stelleText(plan: FragebogenPlan, id: string): string {
  const f = finde(plan, id);
  if (!f) return '';
  if (!f.element) return L(`Seite ${f.seiteIndex + 1} von ${plan.elemente.length}`, `page ${f.seiteIndex + 1} of ${plan.elemente.length}`);
  return L(`Position ${f.index + 1} von ${f.seite.elemente.length} auf Seite ${f.seiteIndex + 1} von ${plan.elemente.length}`, `position ${f.index + 1} of ${f.seite.elemente.length} on page ${f.seiteIndex + 1} of ${plan.elemente.length}`);
}

/** Fügt Seite, Frage, Block oder Hinweis hinter der Auswahl hinzu; der Fokus geht auf das neue Element. */
export function neuHinzu(art: Neu) {
  const plan = aktuellerPlan();
  if (!plan) return;
  const r = hinzufuegen(plan, art, ed.auswahl || null);
  tue(L(`${artWort(art)} hinzugefügt: ${stelleText(r.plan, r.id)}.`, `${artWort(art)} added: ${stelleText(r.plan, r.id)}.`), () => r.plan, { auswahl: r.id, fokus: true });
}
/** Fügt eine Vorlage ein; Hinweis und Fokus wie beim Hinzufügen. */
export function vorlageHinzu(v: VorlageId, opt: { block?: boolean; fehlend?: boolean }) {
  const plan = aktuellerPlan();
  if (!plan) return;
  const r = vorlageEinfuegen(plan, v, ed.auswahl || null, opt);
  const text = L(`Vorlage „${vorlageName(v)}“ eingefügt: ${stelleText(r.plan, r.id)}.${r.listeWiederverwendet ? ' Die vorhandene Antwortliste wird mitbenutzt.' : ''}${r.hinweis ? ' ' + r.hinweis : ''}`,
    `Template "${vorlageName(v)}" inserted: ${stelleText(r.plan, r.id)}.${r.listeWiederverwendet ? ' The existing answer list is reused.' : ''}${r.hinweis ? ' ' + r.hinweis : ''}`);
  if (tue(text, () => r.plan, { auswahl: r.id, fokus: true })) ed.vorlagenHinweis = r.hinweis;
}
/** Verschiebt die Auswahl um eine Stelle und sagt, wohin. */
export function verschiebeAuswahl(richtung: -1 | 1, id = ed.auswahl) {
  const plan = aktuellerPlan();
  if (!plan || !id) return;
  const r = verschieben(plan, id, richtung);
  const x = elementVon(plan, id);
  if (!r.ok || !x) { sage(richtung < 0 ? L('Weiter nach oben geht nicht.', 'It cannot move further up.') : L('Weiter nach unten geht nicht.', 'It cannot move further down.')); return; }
  const titel = anzeigeTitel(plan, x);
  tue(L(`${artWort(x.art)} „${titel}“ verschoben: ${stelleText(r.plan, id)}.`, `${artWort(x.art)} "${titel}" moved: ${stelleText(r.plan, id)}.`), () => r.plan, { auswahl: id, fokus: true });
}
/** Löscht die Auswahl nach Rückfrage. */
export function loescheMitRueckfrage(id = ed.auswahl) {
  const plan = aktuellerPlan();
  const x = plan && id ? elementVon(plan, id) : null;
  if (!plan || !x) return;
  const titel = anzeigeTitel(plan, x);
  const drin = idsInnerhalb(plan, id).length - 1, verwaist = verweiseAuf(plan, id).length;
  const text = [
    L(`${artWort(x.art)} „${titel}“ wird gelöscht.`, `${artWort(x.art)} "${titel}" will be deleted.`),
    x.art === 'seite' && drin > 0 ? L(`Die ${drin} Elemente der Seite gehen mit.`, `The ${drin} elements on the page go with it.`) : '',
    verwaist > 0 ? L(`${verwaist} andere Bedingung(en) verweisen darauf und werden zu Fehlern bei den Befunden.`, `${verwaist} other condition(s) refer to it and become errors in the findings.`) : '',
    L('Mit „Rückgängig“ lässt sich das zurücknehmen.', 'You can take this back with "Undo".')
  ].filter(Boolean).join(' ');
  ed.rueckfrage = {
    titel: L(`${artWort(x.art)} löschen?`, `Delete ${artWort(x.art).toLowerCase()}?`), text, ja: L('Löschen', 'Delete'),
    tun: () => {
      const jetzt = aktuellerPlan();
      if (!jetzt) return;
      const r = loeschen(jetzt, id);
      tue(L(`${artWort(x.art)} „${titel}“ gelöscht.${r.nachher ? '' : ' Der Fragebogen ist jetzt leer.'}`, `${artWort(x.art)} "${titel}" deleted.${r.nachher ? '' : ' The questionnaire is now empty.'}`), () => r.plan, { auswahl: r.nachher ?? '', fokus: !!r.nachher });
    }
  };
}
/** Springt zu dem, was ein Befund meint (Element in der Gliederung oder Liste). */
export function springeZu(element: string | undefined) {
  const plan = aktuellerPlan();
  if (!plan) return;
  const z = befundZiel(plan, element);
  if (z.auswahl) { ed.ansicht = 'gliederung'; ed.auswahl = z.auswahl; ed.fokusAuf = z.auswahl; }
  else if (z.liste) { ed.ansicht = 'listen'; ed.liste = z.liste; ed.fokusAuf = 'liste:' + z.liste; }
  else sage(L('Dieser Befund gehört zum ganzen Fragebogen.', 'This finding belongs to the whole questionnaire.'));
}
/** Ändert den Text einer Sprache (der Name folgt, solange er der Vorschlag ist), mit Ansage. */
export function aendereText(id: string, sprache: string, text: string, was: string) {
  tue(L(`${was} (${sprache}) geändert.`, `${was} (${sprache}) changed.`), p => setzeText(p, id, sprache, text));
}
