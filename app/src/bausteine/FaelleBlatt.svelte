<script lang="ts" module>
  import type { FaelleZustand } from '../lib/faelle';
  /** Der Verlauf für „Rückgängig“ je Blatt: nur für diese Bearbeitungen (Verschieben, Namen, Notizen, Markierungen, Schwellen), nur in dieser Sitzung. */
  const VERLAEUFE = new Map<string, FaelleZustand[]>();
  const VERLAUF_MAX = 100;
</script>

<script lang="ts">
  import { L, d, melde, sichern, type Blatt } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import { bildeGruppen, gruppeJeFall, type Faelle } from '../lib/faelle';
  import { faelleVonBlatt } from '../lib/faelledaten';
  import { tabellenFaelle, beschreibtNurText, passungZaehlung } from '../lib/faellesaetze';
  import Icon from './Icon.svelte';
  import Ausgabe from './Ausgabe.svelte';
  import FaelleTeilung from './FaelleTeilung.svelte';
  import FaelleTabelle from './FaelleTabelle.svelte';
  import FaelleGruppen from './FaelleGruppen.svelte';
  import FaelleAuswahl from './FaelleAuswahl.svelte';

  /**
   * Fälle vergleichen (Welle 4, G1): die Tabelle Fall × Spalten, der Vorschlag für Gruppen, die Gruppen mit Kennwerten, Notizen und Zitaten.
   * Das Blatt hält nur die Auswahl der Spalten und `blatt.faelle` (den Zustand); die Fälle entstehen bei jedem Aufruf neu aus den Daten (lib/faelledaten.ts).
   * Jede Bearbeitung geht über `tue`: ein Schritt im Verlauf, ein Speichern, eine Ansage für Vorlesegeräte.
   */
  let { blatt }: { blatt: Blatt } = $props();

  const e = $derived(faelleVonBlatt(blatt));
  const gruppen = $derived(bildeGruppen(e));
  const gruppeVon = $derived(gruppeJeFall(e, gruppen));
  const nummer = $derived(new Map(gruppen.map((g, i) => [g.id, i])));
  let zaehler = $state(0);   // zählt jede Änderung des Verlaufs, damit „Rückgängig“ sich meldet
  const verlauf = $derived((void zaehler, VERLAEUFE.get(blatt.id) ?? []));

  /** Eine Bearbeitung: `fn` ändert eine Kopie des Zustands; der alte Zustand kommt in den Verlauf, der neue ins Blatt (und mit der Projektdatei weg). */
  function tue(text: string, fn: (x: Faelle) => void) {
    const vorher = structuredClone($state.snapshot(e.zustand)) as FaelleZustand;
    const kopie: Faelle = { ...e, zustand: structuredClone($state.snapshot(e.zustand)) as FaelleZustand };
    fn(kopie);
    const liste = VERLAEUFE.get(blatt.id) ?? [];
    liste.push(vorher);
    if (liste.length > VERLAUF_MAX) liste.shift();
    VERLAEUFE.set(blatt.id, liste); zaehler++;
    blatt.faelle = kopie.zustand;
    void sichern();
    sage(text);
  }
  function zurueck() {
    const liste = VERLAEUFE.get(blatt.id) ?? [], vorher = liste.pop();
    if (!vorher) return;
    zaehler++;
    blatt.faelle = vorher;
    void sichern();
    melde(L('Die letzte Änderung ist rückgängig gemacht.', 'The last change has been undone.'));   // melde sagt es schon an: nicht zusätzlich eine eigene Region
  }
  /** Ein Gruppenname ist an der Fallnummer erkennbar, nicht nur an der Farbe: jede Gruppe hat eine Nummer. */
  const farbe = (id: string) => (nummer.get(id) ?? 0) % 6 + 1;
</script>

<section class="faelle" aria-labelledby="faelle-t-{blatt.id}">
  <div class="faelle-kopf">
    <h3 id="faelle-t-{blatt.id}">{L('Fälle und Gruppen', 'Cases and groups')}</h3>
    <button class="k leise" type="button" aria-disabled={verlauf.length ? undefined : 'true'} onclick={zurueck}><Icon n="rueck" />{L('Rückgängig', 'Undo')}</button>
  </div>
  <p class="heft-text">{d('Statable stellt jeden Fall in eine Zeile und bildet aus den Zahlen und Gruppen einen ersten Vorschlag für Gruppen. Lies die Texte, verschiebe Fälle, benenne die Gruppen und halte deine Deutung in der Notiz fest. Alles hier beschreibt nur diese Fälle.', 'Statable stellt jeden Fall in eine Zeile und bildet aus den Zahlen und Gruppen einen ersten Vorschlag für Gruppen. Lesen Sie die Texte, verschieben Sie Fälle, benennen Sie die Gruppen und halten Sie Ihre Deutung in der Notiz fest. Alles hier beschreibt nur diese Fälle.', 'Statable puts each case in one row and forms a first suggestion for groups from the numbers and groups. Read the texts, move cases, name the groups and write down your interpretation in the note. Everything here only describes these cases.')}</p>

  <FaelleTeilung {e} {tue} />
  <FaelleTabelle {e} {gruppen} {gruppeVon} {farbe} {tue} />
  <FaelleGruppen {e} {gruppen} {farbe} {tue} />
  <FaelleAuswahl {e} {tue} />

  <details class="auf" style="margin-top:var(--a4)"><summary>{L('So steht es im Bericht (Joint Display)', 'How it appears in the report (joint display)')}</summary>
    <p class="heft-text" style="margin:var(--a2) 0">{L('Eine Zeile je Gruppe: Zahl der Fälle, Kennwerte, die markierten Zitate und die Notiz. Word, PDF und Excel enthalten diese Tabelle; Excel dazu die volle Tabelle aller Fälle.', 'One row per group: number of cases, summary figures, the marked quotes and the note. Word, PDF and Excel contain this table; Excel also contains the full table of all cases.')}</p>
    <div class="joint"><Ausgabe items={tabellenFaelle(e, gruppen)} nurTabellen /></div>
    <p class="heft-text" style="margin:var(--a2) 0 0">{L('Passung, gezählt', 'Fit, counted')}: {passungZaehlung(gruppen)}</p>
  </details>
  <p class="heft-text faelle-grenze">{beschreibtNurText()}</p>
</section>

<style>
  .faelle { margin-top: var(--a5); }
  .faelle-kopf { display: flex; align-items: center; justify-content: space-between; gap: var(--a3); flex-wrap: wrap; }
  .faelle-kopf h3 { font-size: var(--gr-h2); margin: 0; }
  .joint { overflow-x: auto; max-width: 100%; }
  .joint :global(td), .joint :global(th) { vertical-align: top; max-width: 38ch; overflow-wrap: anywhere; }
  .faelle-grenze { margin-top: var(--a3); color: var(--tinte-2); }
</style>
