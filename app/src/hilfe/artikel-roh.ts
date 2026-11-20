/**
 * Typen und Bauhelfer für die Rohdaten der Hilfe-Artikel. Eigene kleine Datei, damit `artikel.ts` und `artikel-zusatz.ts` einander nicht im Kreis einlesen.
 */
import { type Bereich } from './kern';
import { type Paar } from '../i18n/laufzeit';

/** Block der Rohdaten: jeder Text ein Textpaar mit P (der Bau hängt den Schlüssel an); Code und APA-Zeilen sind ein Text, wenn sie sprachneutral sind. */
export type RohBlock = Paar | { h: Paar } | { ul: Paar[] } | { ol: Paar[] } | { code: string | Paar } | { apa: string | Paar } | { tabelle: { kopf: Paar[]; zeilen: (Paar | string)[][] } }
  /** „Stimmt nicht - so ist es“: eine Fehlvorstellung (`mythos`, als Behauptung formuliert) und die Richtigstellung (`richtig`). */
  | { falsch: { mythos: Paar; richtig: Paar } }
  /** „Zum Mitnehmen“: drei bis fünf Merksätze am Ende des Artikels. */
  | { mitnehmen: Paar[] };
export interface Roh { id: string; bereich: Bereich; titel: Paar; sw: Paar; inhalt: RohBlock[]; verwandt?: string[] }
export const a = (id: string, bereich: Bereich, titel: Paar, sw: Paar, inhalt: RohBlock[], verwandt: string[] = []): Roh => ({ id, bereich, titel, sw, inhalt, verwandt });

/** Block „Stimmt nicht - so ist es“ (Fehlvorstellung und Richtigstellung). */
export const falsch = (mythos: Paar, richtig: Paar): RohBlock => ({ falsch: { mythos, richtig } });
/** Block „Zum Mitnehmen“ (drei bis fünf Merksätze). */
export const mitnehmen = (...punkte: Paar[]): RohBlock => ({ mitnehmen: punkte });
