<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { OutputItem } from '../engine/types';
  import { L } from '../lib/sitzung.svelte';
  import Ausgabe from './Ausgabe.svelte';
  import HilfeLink from './HilfeLink.svelte';

  /**
   * Das Ergebnis der Verfahren des Kurs-Pakets (Fachblatt KURSPAKET): MANOVA, Diskriminanzanalyse, loglineare Modelle, Probit, gewichtete Regression.
   * Sätze und Warnungen stehen im Textteil des Blatts (Saetze.vorsicht, immer sichtbar); hier stehen die Tabellen, optional Wege davor und danach, der Befehl (R) und der Hilfe-Link.
   */
  let { tabellen, rcode, hilfeId, hilfeText, vorn, hinten }: { tabellen: OutputItem[]; rcode: string; hilfeId: string; hilfeText: string; vorn?: Snippet; hinten?: Snippet } = $props();
</script>

{@render vorn?.()}
<Ausgabe items={tabellen} nurTabellen />
{@render hinten?.()}
<details class="auf" style="margin-top:var(--a3)"><summary>{L('Befehl (R)', 'Command (R)')}</summary><pre class="befehl">{rcode}</pre></details>
<p class="hilfe" style="margin-top:var(--a3)"><HilfeLink id={hilfeId} text={hilfeText} /></p>
