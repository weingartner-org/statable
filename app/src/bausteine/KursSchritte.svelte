<script lang="ts">
  import { dp } from '../i18n/profil';
  /** Excel-, TI-84- und R-Schritte zu den Kurs-Tests (lib/kurstests.ts); nur die Programme, die in den Einstellungen („Vergleich mit anderen Programmen“) eingeschaltet sind - wie ExcelTiBlock. */
  import { s, L } from '../lib/sitzung.svelte';
  import type { KursSchritte } from '../lib/kurstests';

  let { k }: { k: KursSchritte } = $props();
  const b = $derived(s.einst.bezuege ?? {});
</script>

{#if b.excel || b.ti84 || b.r}
  <div class="heft-text" style="margin-top:var(--a2)">
    {#if b.excel}<h4 style="margin:var(--a2) 0 var(--a1)">Excel</h4><ol>{#each k.excel as z, i (i)}<li>{z}</li>{/each}</ol>{/if}
    {#if b.ti84}<h4 style="margin:var(--a2) 0 var(--a1)">TI-84</h4><ol>{#each k.ti as z, i (i)}<li>{z}</li>{/each}</ol>{/if}
    {#if b.r}<h4 style="margin:var(--a2) 0 var(--a1)">R</h4><ol>{#each k.r as z, i (i)}<li><code>{z}</code></li>{/each}</ol>{/if}
    <p style="margin-top:var(--a1)"><b>{L('Das soll herauskommen', 'This is what should come out')}{dp()}</b> {k.soll}</p>
  </div>
{/if}
