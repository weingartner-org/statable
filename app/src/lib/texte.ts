/**
 * Erklärtexte und Meldungs-Regeln in der gewählten Sprache.
 * Deutsch (messages.de.json) und Englisch (messages.en.json) sind fest eingebunden. Jede andere Sprache steht in messages.<code>.json
 * (gleicher Aufbau; nur Titel/Text/Tun/Erklärungen werden übersetzt, `muster` und `original` bleiben) und wird bei Bedarf geladen:
 * `ladeTexte(sp)` beim Wählen der Sprache (neben `ladeSprache`). Fehlt die Datei oder ein Feld, gilt der englische Text.
 */
import de from './messages.de.json';
import en from './messages.en.json';
import { aktuelleSprache } from './sitzung.svelte';
import type { Sprache } from '../i18n/laufzeit';

type Texte = typeof de;
/** Die Teile, die eine Sprachdatei liefern darf (alles ist freiwillig; Lücken füllt das Englische). */
export type FremdTexte = Partial<{ erklaer: Record<string, Partial<Texte['erklaer'][keyof Texte['erklaer']]>>; meldung: unknown[]; rueckfall: unknown }>;

/** Alle weiteren Sprachdateien - eigener Baustein je Sprache. Deutsch und Englisch sind ausgenommen (statisch eingebunden). */
const lader = import.meta.glob<FremdTexte>(['./messages.*.json', '!./messages.de.json', '!./messages.en.json'], { import: 'default' });
const datei = (sp: Sprache) => `./messages.${sp}.json`;
const geladen: Partial<Record<Sprache, FremdTexte>> = {};
const fertig: Partial<Record<Sprache, Texte>> = {};

/** Gibt es für diese Sprache eine eigene Textdatei? */
// Sprache: Deutsch und Englisch stehen fest im Code, alle anderen in einer Datei - das ist die Quellenwahl, kein Text.
export const hatTexte = (sp: Sprache) => sp === 'de' || sp === 'en' || datei(sp) in lader;

/** Lädt die Erklärtexte und Meldungen einer Sprache (nichts zu tun für Deutsch, Englisch und Sprachen ohne Datei). */
export async function ladeTexte(sp: Sprache): Promise<void> {
  if (sp === 'de' || sp === 'en' || geladen[sp]) return;
  const f = lader[datei(sp)];
  if (!f) return;
  geladen[sp] = await f();
  delete fertig[sp];
}

const nurText = (x: unknown): string | undefined => (typeof x === 'string' && x.trim() ? x : undefined);
const obj = (x: unknown): Record<string, unknown> => (x && typeof x === 'object' ? (x as Record<string, unknown>) : {});
/** Text mit Anrede: Zeichenkette (eine Fassung) oder { du, sie }; fehlt etwas, bleibt der englische. */
const anrede = (basis: { du: string; sie: string }, x: unknown) => {
  const o = obj(x), eins = nurText(x);
  return { du: eins ?? nurText(o.du) ?? basis.du, sie: eins ?? nurText(o.sie) ?? nurText(o.du) ?? basis.sie };
};

/** Englisch als Grundlage, darüber alles, was die Sprachdatei Feld für Feld liefert. `muster` und `original` kommen immer aus der Grundlage. */
export function mische(f: FremdTexte): Texte {
  const e = en as unknown as Texte;
  const erklaer = Object.fromEntries(Object.entries(e.erklaer).map(([k, x]) => {
    const y = obj(obj(f.erklaer)[k]);
    return [k, { ...x, ...Object.fromEntries((['titel', 'kurz', 'beispiel', 'vorsicht', 'fachwoerter', 'statable'] as const).map(n => [n, nurText(y[n]) ?? (x as Record<string, unknown>)[n]]).filter(([, v]) => v !== undefined)) }];
  }));
  const fm = new Map((Array.isArray(f.meldung) ? f.meldung : []).map(m => [obj(m).id, obj(m)]));
  const meldung = e.meldung.map(m => {
    const y = fm.get(m.id) ?? {};
    return { ...m, titel: nurText(y.titel) ?? m.titel, text: anrede(m.text, y.text), tun: anrede(m.tun, y.tun) };
  });
  const r = obj(f.rueckfall);
  const rueckfall = { ...e.rueckfall, titel: nurText(r.titel) ?? e.rueckfall.titel, text: anrede(e.rueckfall.text, r.text), tun: anrede(e.rueckfall.tun, r.tun) };
  return { ...e, erklaer, meldung, rueckfall } as unknown as Texte;
}

const quelle = (sp: Sprache): Texte => {
  if (sp === 'de') return de;
  const f = geladen[sp];
  if (sp === 'en' || !f) return en as unknown as Texte;
  return (fertig[sp] ??= mische(f));
};
export const erklaerungen = (sp: Sprache = aktuelleSprache()) => quelle(sp).erklaer;
export const meldungsRegeln = (sp: Sprache = aktuelleSprache()) => quelle(sp).meldung;
export const rueckfallText = (sp: Sprache = aktuelleSprache()) => quelle(sp).rueckfall;
