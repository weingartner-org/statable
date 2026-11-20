<script lang="ts">
  import { L, aktuelleSprache } from '../lib/sitzung.svelte';
  import { artikelModul } from '../hilfe/artikel-laden';
  import type { Block } from '../hilfe/kern';
  import { begriffe, zurueckBegriff } from '../lib/begriffsrand.svelte';
  import ArtikelBloecke from './ArtikelBloecke.svelte';
  import Sprachteile from './Sprachteile.svelte';
  import Icon from './Icon.svelte';
  import { fokusAuf } from '../lib/fokus';
  /**
   * Der Begriff, den die Seitenleiste gerade erklärt (oberster Eintrag des Stapels). „Zurück“ zeigt den Begriff davor;
   * `basis`: Steht unter dem ersten Begriff noch ein Erklärtext (Rand neben der Auswertung), führt „Zurück“ dorthin, sonst schließt es.
   */
  let { basis = true }: { basis?: boolean } = $props();
  const id = $derived(begriffe.stapel.at(-1));
  let inhalt = $state<{ id: string; titel: string; bloecke: Block[] } | null>(null);
  $effect(() => {
    const i = id, sp = aktuelleSprache();
    if (!i) { inhalt = null; return; }
    let gilt = true;
    artikelModul(sp).then(m => { if (gilt) inhalt = { id: i, titel: m.artikelKopf(i, sp), bloecke: m.artikelTeile(i, ['kurz'], sp) }; }).catch(() => { if (gilt) inhalt = null; });
    return () => { gilt = false; };
  });
  /** Überschrift der Erklärung: Hierhin geht der Fokus, sobald der Begriff geladen ist (NVDA liest dann Begriff und Anfang der Erklärung). */
  let ueberschrift = $state<HTMLElement>();
  $effect(() => { if (inhalt && inhalt.id === id && ueberschrift && begriffe.ueberschriftFokus) { begriffe.ueberschriftFokus = false; fokusAuf(ueberschrift); } });
  const zurueckText = $derived(begriffe.stapel.length > 1 ? L('Zurück', 'Back') : basis ? L('Zurück zur Erklärung', 'Back to the explanation') : L('Schließen', 'Close'));
</script>

{#if inhalt && inhalt.id === id}
  <div data-nolink-wurzel>
    <h2 bind:this={ueberschrift} tabindex="-1" data-begriff-ueberschrift><Sprachteile text={inhalt.titel} /></h2>
    <ArtikelBloecke bloecke={inhalt.bloecke} />
    <p class="rand-mehr"><a href="#hilfe/{inhalt.id}">{L('Ganzen Artikel in der Hilfe lesen', 'Read the full article in the help')}</a></p>
  </div>
{/if}
<p><button class="k leise klein-knopf" type="button" onclick={zurueckBegriff}><Icon n="rueck" />{zurueckText}</button></p>
