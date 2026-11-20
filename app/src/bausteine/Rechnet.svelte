<script lang="ts">
  /**
   * Kleine Lade-Animation für eine Zeile (10.10., Johannes): die vier Punkte aus dem Logo, ohne Kachel und Linie. Sie ploppen nacheinander
   * auf, der letzte wird Koralle - derselbe 3,2-s-Takt wie die große Animation in index.html. Damit man sieht: es kommt gleich etwas.
   * Im Knopf (`imKnopf`) nehmen alle Punkte die Schriftfarbe an, sonst verschwänden sie auf dem Petrol.
   * Ohne `text` steht nur die Animation (stumm für Vorleser - der Text steht dann daneben).
   */
  let { text = '', imKnopf = false }: { text?: string; imKnopf?: boolean } = $props();
</script>

<span class="rechnet" class:im-knopf={imKnopf}><svg class="punkte" viewBox="9 10 48 41" aria-hidden="true"><circle class="p p1" cx="15" cy="45" r="4.5" /><circle class="p p2" cx="26" cy="40" r="5.5" /><circle class="p p3" cx="36" cy="28" r="6.5" /><circle class="p p4" cx="48" cy="19" r="8" /></svg>{#if text}<span>{text}</span>{/if}</span>

<style>
  .rechnet { display: inline-flex; align-items: center; gap: .5em; vertical-align: middle; }
  .punkte { width: 1.6em; height: 1.35em; flex: none; overflow: visible; }
  .p { fill: var(--akzent); transform-box: fill-box; transform-origin: center; animation: 3.2s cubic-bezier(.3, 1.4, .5, 1) infinite both; }
  .p1 { animation-name: auf1; } .p2 { animation-name: auf2; } .p3 { animation-name: auf3; } .p4 { animation-name: auf4; }
  .im-knopf .p { fill: currentColor; }
  .im-knopf .p4 { animation-name: auf4-knopf; }
  @keyframes auf1 { 0%, 6% { transform: scale(0); } 16%, 84% { transform: scale(1); opacity: 1; } 96%, 100% { transform: scale(1); opacity: 0; } }
  @keyframes auf2 { 0%, 14% { transform: scale(0); } 24%, 84% { transform: scale(1); opacity: 1; } 96%, 100% { transform: scale(1); opacity: 0; } }
  @keyframes auf3 { 0%, 22% { transform: scale(0); } 32%, 84% { transform: scale(1); opacity: 1; } 96%, 100% { transform: scale(1); opacity: 0; } }
  @keyframes auf4 { 0%, 32% { transform: scale(0); fill: var(--akzent); } 42% { transform: scale(1.25); fill: var(--akzent); } 50%, 84% { transform: scale(1); fill: var(--dg-b); opacity: 1; } 96%, 100% { transform: scale(1); fill: var(--dg-b); opacity: 0; } }
  @keyframes auf4-knopf { 0%, 32% { transform: scale(0); } 42% { transform: scale(1.25); } 50%, 84% { transform: scale(1); opacity: 1; } 96%, 100% { transform: scale(1); opacity: 0; } }
  /* Weniger Bewegung: die Punkte stehen still, nur ein ruhiges Pulsieren der Deckkraft. */
  @media (prefers-reduced-motion: reduce) {
    .p { animation: still 2.4s ease-in-out infinite; transform: none; }
    .p4 { fill: var(--dg-b); } .im-knopf .p4 { fill: currentColor; }
    @keyframes still { 0%, 100% { opacity: 1; } 50% { opacity: .4; } }
  }
</style>
