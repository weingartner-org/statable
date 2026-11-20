<script lang="ts">
  import { spalteNach } from '../lib/sitzung.svelte';
  import { lesbar } from '../lib/verzeichnis';
  import { ebenenOeffnen } from '../lib/mebvorschlag.svelte';
  import { ebenenHinweisText } from '../lib/mehrebenensaetze';
  import type { GruppenVorschlag } from '../lib/mehrebenen';
  import type { Werte } from '../lib/verfahren';
  import Icon from './Icon.svelte';
  import HilfeLink from './HilfeLink.svelte';
  import { L } from '../lib/sitzung.svelte';

  /** Ruhiger Hinweis im Ergebnis von „Unterscheiden sich Gruppen?“ und „Lässt sich etwas vorhersagen?“: Die Daten sind nach einer Spalte gruppiert.
   *  Der Knopf öffnet die Mehrebenen-Frage, schon ausgefüllt. */
  let { v, w }: { v: GruppenVorschlag; w: Werte } = $props();
  const t = $derived(ebenenHinweisText(v, n => { const sp = spalteNach(n); return sp ? lesbar(sp, true) : n; }));
</script>

<aside class="ebenen-hinweis" aria-label={L('Hinweis: gruppierte Daten', 'Note: grouped data')}>
  <Icon n="ebenen" />
  <div><p><b>{t.kurz}</b></p><p class="heft-text">{t.klein} <HilfeLink id="frage-mehrebenen" text={L('Hilfe: Mehrebenenmodell', 'Help: multilevel model')} /></p>
    <div class="knopfzeile"><button class="k" type="button" onclick={() => ebenenOeffnen(w)}>{t.knopf}</button></div></div>
</aside>

<style>
  .ebenen-hinweis { display: flex; gap: var(--a3); align-items: flex-start; margin: var(--a4) 0; padding: var(--a3) var(--a4); background: var(--akzent-hell); border-inline-start: 4px solid var(--akzent); border-radius: var(--r-klein, 6px); }
  .ebenen-hinweis p { margin: 0 0 var(--a1); }
  .ebenen-hinweis :global(svg) { flex: none; margin-top: 2px; color: var(--akzent-tinte); }
  .ebenen-hinweis b { font-weight: 600; }
</style>
