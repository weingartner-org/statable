/**
 * Ein Beispiel aus dem Katalog öffnen und den Begleiter starten - dieselben Schritte wie „Öffnen und üben“ auf der Seite „Beispiele“,
 * hier für den Bereich „Lernen“ (mit dem Weg zurück).
 */
import { s, L, waehle, oeffneBeispielNr, neueStudie } from './sitzung.svelte';
import { META_FEEDBACK, type Beispiel } from './beispiele';
import { entwurf, metaUmstellen, metaDirekt } from './metaentwurf.svelte';
import { lauf, starteLauf, setzeVon, type LaufVon } from './beispielvorschlag.svelte';
import { dez } from '../i18n/profil';

function metaFuellen() {
  metaUmstellen('es', 'se');
  entwurf.verhaeltnis = false; entwurf.kh = true; entwurf.massName = L('Hedges g', 'Hedges g');
  entwurf.zeilen = META_FEEDBACK.map(([name, y, se]) => ({ name: waehle(name), w: [dez(String(y)), dez(String(se))] }));
}

/** Die Spalten, die ein Schritt braucht (Namen wie in der Datei); leer, wenn er keine nennt - dann bleibt das ganze Beispiel. */
const spaltenDes = (b: Beispiel, schritt: number): string[] => {
  const w = b.schritte[schritt]?.w;
  return w ? [...new Set([...(w.l1 ?? []), ...(w.l2 ?? []), ...(w.l3 ?? []), ...(w.l4 ?? [])])] : [];
};

/** Läuft das Beispiel schon im offenen Projekt, wird nichts neu geladen. Sonst werden Daten (oder die Meta-Tabelle) geöffnet. */
export async function oeffneBeispielVonLernen(b: Beispiel, von: LaufVon): Promise<void> {
  const nur = b.datei ? spaltenDes(b, von.schritt) : [];
  if (lauf.a?.id === b.id && s.projekt && lauf.a.projekt === s.projekt.id && (lauf.a.nur ?? []).join('|') === nur.join('|')) {
    setzeVon(von);
    location.hash = b.datei ? 'daten' : 'blatt/neu';
    return;
  }
  if (!b.datei) {
    metaDirekt.an = true;
    await neueStudie(waehle(b.titel), [{ bezeichnung: L('Nummer', 'ID'), art: 'zahl', gruppen: '' }]);
    metaFuellen();
    starteLauf(b.id, s.projekt!.id, undefined, von);
    location.hash = 'blatt/neu';
  } else {
    const namen = await oeffneBeispielNr(b, nur);
    starteLauf(b.id, s.projekt!.id, namen, von, nur);
    location.hash = 'daten';
  }
}

/** Ein Beispiel von außerhalb des Lernbereichs öffnen (zum Beispiel aus der Hilfe): Daten laden, Begleiter starten, zur Tabelle springen. */
export async function oeffneBeispielDirekt(b: Beispiel): Promise<void> {
  if (!b.datei) {
    metaDirekt.an = true;
    await neueStudie(waehle(b.titel), [{ bezeichnung: L('Nummer', 'ID'), art: 'zahl', gruppen: '' }]);
    metaFuellen();
    starteLauf(b.id, s.projekt!.id);
    location.hash = 'blatt/neu';
  } else {
    const namen = await oeffneBeispielNr(b);
    starteLauf(b.id, s.projekt!.id, namen);
    location.hash = 'daten';
  }
}
