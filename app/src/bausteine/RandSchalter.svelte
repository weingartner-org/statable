<script lang="ts">
  import { s, L } from '../lib/sitzung.svelte';
  /** Kurzer Text, der am eingeklappten Rand stehen bleibt (zum Beispiel „Daten-Check · 4“): so verschwindet nichts hinter einem bloßen Pfeil. */
  let { text }: { text?: string } = $props();
  /** Flacher Schalter am oberen Rand der Seitenleiste: klappt sie ein und wieder aus. Beim Öffnen der App ist sie immer ausgeklappt. */
  $effect(() => { document.documentElement.classList.toggle('rand-eng', s.randEng); return () => document.documentElement.classList.remove('rand-eng'); });
</script>

<button class="rand-schalter" class:mit-text={!!text && s.randEng} type="button" aria-expanded={!s.randEng} data-tipp={s.randEng ? L('Seitenleiste ausklappen', 'Expand the side panel') : L('Seitenleiste einklappen', 'Collapse the side panel')}
  aria-label={s.randEng ? (text ? `${L('Seitenleiste ausklappen', 'Expand the side panel')}: ${text}` : L('Seitenleiste ausklappen', 'Expand the side panel')) : L('Seitenleiste einklappen', 'Collapse the side panel')} onclick={() => (s.randEng = !s.randEng)}>
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class:gedreht={s.randEng}><path d="M9 6l6 6-6 6"/></svg>{#if text && s.randEng}<span class="rand-text">{text}</span>{/if}
</button>
