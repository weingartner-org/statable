/**
 * Wann Statable ans Speichern in eine Datei erinnert und was die Anzeige sagt. Reine Funktionen, ohne Oberfläche - darum testbar.
 * Ton: ruhig. Gewarnt wird nur, wo wirklich etwas verloren gehen kann.
 */

import { L, mitFlag } from './sitzung.svelte';
import { ort } from '../i18n/profil';

export const ERINNERN_NACH_MS = 10 * 60 * 1000;
export const BEISPIEL_QUELLE = 'schlaf-und-konzentration.csv';

/** Lohnt sich das Speichern? Nicht bei Beispieldaten und nicht, solange nichts da ist als eine leere Tabelle. */
export function istSchuetzenswert(p: { quelle: string; blaetter: number; sets: number; hatWerte: boolean }): boolean {
  if (p.quelle.startsWith(BEISPIEL_QUELLE)) return false;
  return p.blaetter > 0 || p.sets > 0 || p.hatWerte;
}

/** Warnung beim Schließen des Tabs: nur bei ungespeicherten Änderungen gegenüber der Datei in einem Projekt, das etwas wert ist. */
export const warnenBeimVerlassen = (l: { offen: boolean; ungesichert: boolean; schuetzenswert: boolean }) => l.offen && l.ungesichert && l.schuetzenswert;

/** Der ruhige Hinweis nach längerer Arbeit ohne Datei - einmal je Projekt und Sitzung, abschaltbar. */
export function sollErinnern(l: { offen: boolean; ungesichert: boolean; seit: number | null; jetzt: number; schuetzenswert: boolean; schonGezeigt: boolean; abgeschaltet: boolean }): boolean {
  return l.offen && l.ungesichert && l.schuetzenswert && !l.schonGezeigt && !l.abgeschaltet && l.seit !== null && l.jetzt - l.seit >= ERINNERN_NACH_MS;
}

/** „gerade eben“, „vor 2 Min.“, „vor 3 Std.“, sonst das Datum. */
export function vorZeit(zeit: number, jetzt: number, en: boolean): string {
  return mitFlag(en, () => {
    const min = Math.floor(Math.max(0, jetzt - zeit) / 60000), std = Math.floor(min / 60);
    if (min < 1) return L('gerade eben', 'just now');
    if (min < 60) return L(`vor ${min} Min.`, `${min} min ago`);
    if (min < 1440) return L(`vor ${std} Std.`, `${std} h ago`);
    return new Date(zeit).toLocaleDateString(ort());
  });
}

export type Stand =
  | { art: 'keine' }                                                   // noch nie in eine Datei
  | { art: 'ungesichert'; name?: string }                              // Änderungen seit der Datei
  | { art: 'gespeichert'; name: string; zeit: number; wie: 'datei' | 'download' | 'geoeffnet' }; // `datei`: in der Datei selbst, `download`: heruntergeladen

export function standVon(l: { ungesichert: boolean; ziel: { name: string; zeit: number; art: 'datei' | 'download' | 'geoeffnet' } | null }): Stand {
  if (l.ungesichert) return { art: 'ungesichert', name: l.ziel?.name };
  if (!l.ziel) return { art: 'keine' };
  return { art: 'gespeichert', name: l.ziel.name, zeit: l.ziel.zeit, wie: l.ziel.art };
}

/** Der Satz zum Zustand. */
export function standText(st: Stand, jetzt: number, en: boolean): string {
  return mitFlag(en, () => {
    if (st.art === 'keine') return L('Nicht in einer Datei gespeichert', 'Not saved to a file');
    if (st.art === 'ungesichert') return st.name ? L(`Ungespeicherte Änderungen seit ${st.name}`, `Unsaved changes since ${st.name}`) : L('Ungespeicherte Änderungen', 'Unsaved changes');
    const wann = vorZeit(st.zeit, jetzt, en);
    if (st.wie === 'datei') return L(`Gespeichert in ${st.name} · ${wann}`, `Saved in ${st.name} · ${wann}`);
    if (st.wie === 'geoeffnet') return L(`Geöffnet aus ${st.name} · ${wann}`, `Opened from ${st.name} · ${wann}`);
    return L(`Heruntergeladen als ${st.name} · ${wann}`, `Downloaded as ${st.name} · ${wann}`);
  });
}
