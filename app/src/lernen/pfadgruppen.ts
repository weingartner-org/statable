/**
 * Die Lernpfade in Gruppen (Usability Stufe 6, 10.11.2026): „Grundlagen“, „Für dein Fach“, „Vertiefen“ und ganz vorn, wenn es sie gibt, „Eigene Pfade“.
 * Die Kennungen der Pfade und ihre Reihenfolge innerhalb einer Gruppe bleiben, wie sie sind. Was in keiner Liste steht, kommt nach „Vertiefen“.
 */
import { P, type Paar } from '../i18n/laufzeit';
import type { Pfad } from './lernplan';

export type PfadGruppeId = 'eigene' | 'grundlagen' | 'fach' | 'vertiefen';
export interface PfadGruppe { id: PfadGruppeId; name: Paar; pfade: Pfad[] }

const GRUNDLAGEN = ['grundlagen', 'grundlagen-2', 'grundlagen-3'];
const FACH = ['psychologie', 'bildung', 'medizin', 'technik', 'wirtschaft', 'oekonometrie', 'natur'];

/** `eigen`: sagt, ob eine Kennung zu einem selbst gebauten Pfad gehört (ohne Angabe: keiner). */
export function pfadGruppen(pfade: Pfad[], eigen: (id: string) => boolean = () => false): PfadGruppe[] {
  const g = (id: PfadGruppeId, name: Paar, liste: Pfad[]): PfadGruppe => ({ id, name, pfade: liste });
  const e = pfade.filter(p => eigen(p.id)), fest = pfade.filter(p => !eigen(p.id));
  const gr = fest.filter(p => GRUNDLAGEN.includes(p.id)), fa0 = fest.filter(p => FACH.includes(p.id));
  // „Wirtschaft: Ursachen schätzen (Ökonometrie)“ steht gleich hinter „Wirtschaft“, die übrigen bleiben in der Reihenfolge der Pfade
  const oe = fa0.find(p => p.id === 'oekonometrie'), fa = fa0.filter(p => p.id !== 'oekonometrie'), wi = fa.findIndex(p => p.id === 'wirtschaft');
  if (oe) fa.splice(wi >= 0 ? wi + 1 : fa.length, 0, oe);
  const rest = fest.filter(p => !GRUNDLAGEN.includes(p.id) && !FACH.includes(p.id));
  return [
    ...(e.length ? [g('eigene', P('Eigene Pfade', 'Your own paths'), e)] : []),
    g('grundlagen', P('Grundlagen', 'Basics'), gr),
    g('fach', P('Nach Fach', 'By subject'), fa),
    g('vertiefen', P('Vertiefen', 'Going deeper'), rest)
  ].filter(x => x.pfade.length);
}
