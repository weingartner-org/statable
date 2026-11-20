/**
 * Die eigenen Lernpfade im Browser (`localStorage`, wie der Lernstand: nichts auf einem Server, nichts in der .statable-Datei).
 * Die Regeln stehen rein in `lernen/eigenepfade.ts`; hier liegen der reaktive Stand, das Speichern und die zusammengelegte Liste mit den festen Pfaden.
 */
import { EINHEITEN, PFADE, type Pfad } from '../lernen/lernplan';
import { alsPfad, bereinigeName, leseEigene, neueId, pruefeKennungen, pruefeBlatt, kodiere, mitPruefung, MAX_PFADE, type EigenerPfad, type Blatt } from '../lernen/eigenepfade';

const SCHLUESSEL = 'statable-eigene-pfade';
const lies = (): EigenerPfad[] => { try { return leseEigene(localStorage.getItem(SCHLUESSEL)); } catch { return []; } };
export const eigenePfade = $state<{ liste: EigenerPfad[] }>({ liste: lies() });
/** Trägt die Abschlussprüfungen der eigenen Pfade als Einheiten ein (`alsPfad`), damit `#lernen/abschluss-mein-…` sie findet. */
eigenePfade.liste.forEach(alsPfad);

const gibtEs = (id: string) => EINHEITEN.some(e => e.id === id);

function setze(liste: EigenerPfad[]) {
  eigenePfade.liste = liste;
  liste.forEach(alsPfad);
  try { localStorage.setItem(SCHLUESSEL, JSON.stringify(liste)); } catch { /* ohne Speicher gilt die Liste bis zum Neuladen */ }
}

/** Alle Pfade für die Seitenleiste: zuerst die eigenen, dann die festen. */
export const allePfade = (): Pfad[] => [...eigenePfade.liste.map(alsPfad), ...PFADE];
export const pfadFinden = (id: string): Pfad | undefined => allePfade().find(p => p.id === id);
export const eigenerPfad = (id: string): EigenerPfad | undefined => eigenePfade.liste.find(p => p.id === id);
export const istVoll = () => eigenePfade.liste.length >= MAX_PFADE;

/**
 * Speichert einen neuen (ohne `id`) oder bestehenden Pfad. Gibt die Kennung zurück, oder `undefined`, wenn nichts zu speichern war.
 * `blatt`: Übungsblatt eines neuen Pfads (aus einem Link); beim Bearbeiten bleibt das vorhandene Blatt stehen, es ändert sich nur über `setzeBlatt`.
 */
export function speichereEigenen(name: string, einheiten: string[], id?: string, pruefung = true, blatt?: Blatt): string | undefined {
  const n = bereinigeName(name), { gut } = pruefeKennungen(einheiten, gibtEs);
  if (!n || !gut.length) return undefined;
  const alt = id ? eigenerPfad(id) : undefined;
  const b = alt ? alt.blatt : blatt ? pruefeBlatt(blatt.fragen, blatt.mischen, blatt.minuten) : undefined;
  const neuerPfad = (i: string): EigenerPfad => ({ id: i, name: n, einheiten: gut, ...(pruefung ? {} : { pruefung: false }), ...(b ? { blatt: b } : {}) });
  if (id && alt) { setze(eigenePfade.liste.map(p => p.id === id ? neuerPfad(id) : p)); return id; }
  if (istVoll()) return undefined;
  let neu = neueId();
  while (eigenerPfad(neu)) neu = neueId();
  setze([neuerPfad(neu), ...eigenePfade.liste]);
  return neu;
}
export const loescheEigenen = (id: string) => setze(eigenePfade.liste.filter(p => p.id !== id));
/** Übungsblatt eines Pfads setzen oder (mit `undefined` oder ohne Fragen) entfernen. */
export function setzeBlatt(id: string, blatt: Blatt | undefined): void {
  const b = blatt ? pruefeBlatt(blatt.fragen, blatt.mischen, blatt.minuten) : undefined;
  setze(eigenePfade.liste.map(p => {
    if (p.id !== id) return p;
    const { blatt: _alt, ...rest } = p;
    return b ? { ...rest, blatt: b } : rest;
  }));
}

/** Der Link zum Teilen; der Code trägt Name und Kennungen, sonst nichts. */
export const teilLink = (p: EigenerPfad): string => `${location.origin}${location.pathname}#lernen/import/${kodiere(p.name, p.einheiten, mitPruefung(p), p.blatt)}`;
