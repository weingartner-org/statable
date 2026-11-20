/** Rückfrage vor dem Entfernen eines Projekts aus dem Browser. Die Seite ruft `fragVorEntfernen`, der Dialog (bausteine/Ersetzen.svelte) antwortet. */
import { projektSpeichern, meldeGespeichert } from './sitzung.svelte';

export type Antwort = 'speichern' | 'weiter' | 'abbrechen';
export interface Entfernen { id: string; name: string; blaetter: number }
export const rueckfrage = $state({ offen: null as null | Entfernen });
let antworte: ((a: Antwort) => void) | null = null;

export function beantworte(a: Antwort) { antworte?.(a); antworte = null; rueckfrage.offen = null; }

const frage = (f: Entfernen) => new Promise<Antwort>(ok => { antworte?.('abbrechen'); antworte = ok; rueckfrage.offen = f; });

/** true = entfernen. „Erst als Datei speichern“ lädt die Datei herunter und entfernt dann. */
export async function fragVorEntfernen(p: Entfernen): Promise<boolean> {
  const a = await frage(p);
  if (a !== 'speichern') return a === 'weiter';
  const name = await projektSpeichern(p.id);
  if (!name) return false;   // nichts gespeichert - dann auch nichts entfernen
  meldeGespeichert(name);
  return true;
}
