<script lang="ts">
  /**
   * Hinweise des Transkript-Prüfers (Paket 4C-2): aufklappbar, Zahl in der Überschrift, getrennt nach den Regeln nach Dresing und Pehl (8. Auflage 2018)
   * und den weiteren Prüfungen von Statable. Je Hinweis: Satz, Stelle (Sprung zur Überschrift des Beitrags), „Übernehmen“ bei einem Vorschlag.
   * Der Baustein ändert nichts selbst; er ruft `zurStelle` und `uebernehmen` des Aufrufers.
   */
  import { L, Lp } from '../lib/sitzung.svelte';
  import { sageSpaeter } from '../lib/ansage';
  import type { Dokument } from '../lib/qualprojekt';
  import type { Hinweis } from '../lib/transkript-pruefen';
  import { beitragBezeichnung, hinweisAnzeige, kopfAbschnitte } from '../lib/transkript-ansicht';

  let { dok, hinweise, gesperrt, zurStelle, uebernehmen, kopfId }: {
    dok: Dokument; hinweise: Hinweis[]; gesperrt: boolean; kopfId: string;
    zurStelle: (abschnitt: number) => void; uebernehmen: (h: Hinweis) => void;
  } = $props();

  const sprache = (): 'de' | 'en' => (L('de', 'en') === 'en' ? 'en' : 'de');
  const GRENZE = 100;
  let offen = $state(false);
  let alleDP = $state(false), alleSt = $state(false), alleFL = $state(false);

  const dp = $derived(hinweise.filter(h => h.herkunft === 'dresing-pehl'));
  const st = $derived(hinweise.filter(h => h.herkunft === 'statable'));
  const fl = $derived(hinweise.filter(h => h.herkunft === 'froschauer-lueger'));
  const zeile = (h: Hinweis) => hinweisAnzeige(dok, h);
  /** Sprung zur Stelle mit Ansage „Hinweis 3 von 15: Satz“ (Nummer in der Liste aller Hinweise). */
  const springe = (h: Hinweis) => { zurStelle(h.abschnitt); const k = hinweise.indexOf(h) + 1; sageSpaeter(L(`Hinweis ${k} von ${hinweise.length}: ${h.satz}`, `Note ${k} of ${hinweise.length}: ${h.satz}`), 700); };
  /** Gleiche Zählung wie die Ansicht: Kopf-Abschnitte (Kodierschema) heißen „Kopf“, Beiträge zählen ab 1 danach. */
  const kopf = $derived(kopfAbschnitte(dok.transkript?.abschnitte ?? []));
  const stelle = (h: Hinweis): string => { const z = zeile(h); return `${beitragBezeichnung(h.abschnitt, kopf, sprache(), true)}${z.name ? ` (${z.name})` : ''}`; };
</script>

<h4 class="th-kopf"><button class="k leise" id={kopfId} type="button" aria-expanded={offen} aria-controls="iv-hin-inhalt" onclick={() => (offen = !offen)}>{L(`Hinweise zum Text (${hinweise.length})`, `Notes on the text (${hinweise.length})`)}</button></h4>

<div id="iv-hin-inhalt" hidden={!offen}>
  <p class="hilfe">{L('Das sind Hinweise, keine Fehler. Sie entscheiden, was Sie ändern.', 'These are notes, not errors. You decide what to change.')}</p>
  {#if hinweise.length === 0}
    <p>{L('Zu diesem Transkript gibt es keine Hinweise.', 'There are no notes for this transcript.')}</p>
  {/if}
  {#each [
    { id: 'dp', titel: L('Regeln nach Dresing und Pehl (8. Auflage 2018)', 'Rules after Dresing and Pehl (8th edition 2018)'), liste: dp, alle: alleDP },
    { id: 'fl', titel: L('Regeln nach Froschauer und Lueger', 'Rules after Froschauer and Lueger'), liste: fl, alle: alleFL },
    { id: 'st', titel: L('Weitere Prüfungen von Statable', 'More checks by Statable'), liste: st, alle: alleSt },
  ] as g (g.id)}
    {#if g.liste.length}
      <h5 class="gruppe">{g.titel} ({g.liste.length})</h5>
      <ul class="liste">
        {#each g.alle ? g.liste : g.liste.slice(0, GRENZE) as h, k (k)}
          {@const z = zeile(h)}
          <li>
            <p class="satz">{h.satz}</p>
            <p class="stelle">{stelle(h)}{#if z.original}: „{z.original}“{/if}{#if z.vorschlag !== undefined} → „{z.vorschlag}“{/if}</p>
            <div class="knopfzeile">
              <button class="k klein" type="button" aria-label={L(`Zur Stelle: ${stelle(h)}`, `Go to the place: ${stelle(h)}`)} onclick={() => springe(h)}>{L('Zur Stelle', 'Go to place')}</button>
              {#if z.vorschlag !== undefined && !gesperrt}
                <button class="k klein haupt" type="button" aria-label={L(`Vorschlag übernehmen: ${stelle(h)}, „${z.original}“ durch „${z.vorschlag}“ ersetzen`, `Apply the suggestion: ${stelle(h)}, replace "${z.original}" with "${z.vorschlag}"`)} onclick={() => uebernehmen(h)}>{L('Übernehmen', 'Apply')}</button>
              {/if}
            </div>
          </li>
        {/each}
      </ul>
      {#if !g.alle && g.liste.length > GRENZE}
        <button class="k klein" type="button" onclick={() => { if (g.id === 'dp') alleDP = true; else if (g.id === 'fl') alleFL = true; else alleSt = true; }}>{Lp(g.liste.length - GRENZE, 'Den weiteren Hinweis zeigen', `Die weiteren ${g.liste.length - GRENZE} Hinweise zeigen`, 'Show the other note', `Show the other ${g.liste.length - GRENZE} notes`)}</button>
      {/if}
    {/if}
  {/each}
  {#if gesperrt && hinweise.some(h => h.vorschlag !== undefined)}
    <p class="hilfe">{L('Dieser Text hat schon Textstellen mit Codes und ist gesperrt. Vorschläge lassen sich darum nicht übernehmen.', 'This text already has passages with codes and is locked. Suggestions cannot be applied.')}</p>
  {/if}
</div>

<style>
  .th-kopf { margin: 0; font: 650 var(--gr-text, 1rem)/1.3 var(--schrift-ui); }
  .hilfe { margin: 0 0 var(--a2); font-size: var(--gr-klein); color: var(--tinte-2); }
  .gruppe { margin: var(--a3) 0 var(--a1); font: 650 var(--gr-text, 1rem)/1.3 var(--schrift-ui); }
  .liste { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--a2); }
  .liste li { border: 1px solid var(--linie); border-radius: var(--r-klein); padding: var(--a2) var(--a3); }
  .satz, .stelle { margin: 0 0 var(--a1); }
  .stelle { font-size: var(--gr-klein); color: var(--tinte-2); }
</style>
