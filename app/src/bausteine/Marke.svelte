<script lang="ts">
  import Logo from './Logo.svelte';
  /** Marke mit Slogan (Johannes 18.10.2026): Zeichen, „statable“ und darunter „turn numbers into insight“, genau so breit wie der Name.
   *  Maße wie im Ladebildschirm (index.html), aus den Schriftmaßen von Atkinson Hyperlegible Next gerechnet: alles in em der Wortmarke,
   *  Slogan 0,3177 em, Zeichen von der Oberkante von „able“ bis zur Grundlinie des Slogans (1,302 em, 0,112 em tiefer).
   *  Der Slogan bleibt in jeder Sprache Englisch. Unter 40 px Wortmarke wird er kleiner als 13 px - dort nur die Marke ohne Slogan zeigen. */
  let { groesse = 44 }: { groesse?: number } = $props();
</script>

<span class="marke-slogan" style="font-size:{groesse}px">
  <span class="ms-logo"><Logo groesse={Math.round(groesse * 1.302)} /></span>
  <span class="ms-text"><span class="ms-wort"><span class="ms-stat">stat</span><span class="ms-able">able</span></span><span class="ms-slogan" lang="en">turn numbers into insight</span></span>
</span>

<style>
  .marke-slogan { display: inline-flex; align-items: flex-start; gap: .35em; font-family: 'Atkinson Hyperlegible Next', var(--schrift-ui); color: var(--tinte); }
  .ms-logo { display: block; line-height: 0; margin-top: .112em; flex: none; }
  .ms-text { display: flex; flex-direction: column; align-items: flex-start; gap: .135em; }
  .ms-wort { font-size: 1em; line-height: 1; letter-spacing: -.02em; font-weight: 300; }
  .ms-able { font-weight: 800; color: var(--akzent); }
  .ms-slogan { font-size: .3177em; line-height: 1; font-weight: 400; color: var(--tinte-2); white-space: nowrap; }
</style>
