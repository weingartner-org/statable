<script lang="ts">
  import { tick } from 'svelte';
  import type { Blatt } from '../lib/sitzung.svelte';
  import { L, d } from '../lib/sitzung.svelte';
  import { sprichtFuerRang, type RangErgebnis, type RangVorschlag } from '../lib/rangtests';
  import { rangGruendeText, rangTestName } from '../lib/rangsaetze';
  import { rangAnschalten } from '../lib/rangwahl';

  /** Usability Stufe 4c: Sprechen die Daten für einen Rangtest, steht der Hinweis mit Knopf OBEN im Ergebnis (nicht erst unter allen Zahlen).
   *  Der Knopf tut dasselbe wie die Wahl „Ohne Normalverteilung (Rangtest)“ unter dem Ergebnis (`rangAnschalten`). Statable schaltet nie von selbst um. */
  let { blatt, paired, rang, nachrechnen, vorschlag, sperre = null }: { blatt: Blatt; paired: boolean | 'mw'; rang: RangErgebnis | null; nachrechnen: () => RangErgebnis | null; vorschlag: RangVorschlag | null; sperre?: string | null } = $props();
  const r = $derived(rang ?? nachrechnen());
  const zeigen = $derived(!sperre && !!vorschlag && sprichtFuerRang(vorschlag) && !!r && !blatt.rang && !blatt.robust);
  async function los() {
    if (!rangAnschalten(blatt, rang, nachrechnen)) return;
    await tick();
    document.getElementById('f3-t')?.focus();
  }
</script>

{#if zeigen && vorschlag && r}
  <div class="rang-empfehlung" role="group" aria-labelledby="rang-emp-t">
    <p id="rang-emp-t"><b>{L(`Die Daten sprechen für einen Rangtest: ${rangGruendeText(vorschlag, paired)}.`, `The data point to a rank test: ${rangGruendeText(vorschlag, paired)}.`)}</b></p>
    <p class="hilfe">{d('Du entscheidest. Die Wahl steht auch unten unter „Annahme einer Normalverteilung“.', 'Sie entscheiden. Die Wahl steht auch unten unter „Annahme einer Normalverteilung“.', 'You decide. The choice is also below under "Assumption of a normal distribution".')}</p>
    <div class="knopfzeile"><button class="k" type="button" data-begriff="rangtest" onclick={los}>{L(`Mit Rangtest rechnen (${rangTestName(r)})`, `Calculate with rank test (${rangTestName(r)})`)}</button></div>
  </div>
{/if}

<style>
  .rang-empfehlung { margin: 0 0 var(--a3); padding: var(--a2) var(--a3); background: var(--akzent-hell); border: 1px solid var(--linie-stark); border-inline-start-width: 4px; border-radius: var(--r-klein); max-width: var(--breite-text); }
  .rang-empfehlung p { margin: 0 0 var(--a2); }
  .rang-empfehlung .knopfzeile { margin-top: var(--a2); }
</style>
