<script lang="ts">
  import { teile } from '../lib/kursiv';
  import { richtung } from '../i18n/profil';
  import { isoliereFormeln } from '../i18n/bidi';
  let { text }: { text: string } = $props();
  /** In Sprachen von rechts nach links steht jede Angabe („t(97) = 2,31“) in einem eigenen Abschnitt von links nach rechts (i18n/bidi.ts). */
  const anzeige = $derived(richtung() === 'rtl' ? isoliereFormeln(text) : text);
</script>
{#each teile(anzeige) as st, i (i)}{#if st.stil === 'italic'}<i>{st.t}</i>{:else}{st.t}{/if}{/each}
