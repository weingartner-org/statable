<script lang="ts">
  import '../stil/verstehen.css';
  import VerstehenVerteilungen from './VerstehenVerteilungen.svelte';
  import VerstehenKennzahlen from './VerstehenKennzahlen.svelte';
  import VerstehenVergleich from './VerstehenVergleich.svelte';
  import VerstehenAnteilstest from './VerstehenAnteilstest.svelte';
  import VerstehenZuteilung from './VerstehenZuteilung.svelte';
  import VerstehenEffekt from './VerstehenEffekt.svelte';
  import VerstehenKennlinie from './VerstehenKennlinie.svelte';
  import VerstehenGerade from './VerstehenGerade.svelte';
  import VerstehenProbieren from './VerstehenProbieren.svelte';
  import Lernlabor from './Lernlabor.svelte';

  /** Ein Regler oder Rechner von „Rechner und Regler“ (Adressteil nach `#verstehen/`) eingebettet in eine Lerneinheit. Nichts davon wird gespeichert. */
  let { ziel }: { ziel: string } = $props();
  const teile = $derived(ziel.split('/'));
</script>

<div class="vst">
  {#if teile[0] === 'verteilungen'}<VerstehenVerteilungen />
  {:else if teile[0] === 'kennzahlen'}<VerstehenKennzahlen />
  {:else if teile[0] === 'vergleich'}<VerstehenVergleich />
  {:else if teile[0] === 'anteilstest'}<VerstehenAnteilstest />
  {:else if teile[0] === 'zuteilung'}<VerstehenZuteilung />
  {:else if teile[0] === 'effekt'}<VerstehenEffekt />
  {:else if teile[0] === 'kennlinie'}<VerstehenKennlinie />
  {:else if teile[0] === 'gerade'}<VerstehenGerade />
  {:else if teile[0] === 'probieren'}<VerstehenProbieren teil={teile[1] ?? ''} />
  {:else if teile[0] === 'lernlabor'}<Lernlabor reiter={teile[1] ?? ''} />{/if}
</div>
