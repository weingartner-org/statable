<script lang="ts" module>
  import type { Farbe } from '../lernen/lernstand';
  export interface Punkt {
    href: string;
    /** Sichtbarer und gesprochener Name. */
    name: string;
    farbe: Farbe;
    /** Zusatz für das Sprechen, zum Beispiel „8 von 26 richtig“. */
    zusatz?: string;
  }
</script>

<script lang="ts">
  import '../stil/lernen.css';
  import { L } from '../lib/sitzung.svelte';
  import { zaehleFarben } from '../lernen/lernstand';

  /**
   * Der Fortschrittsbalken einer Einheit als Reiter: ein Reiter je Abschnitt, Klick springt. Die Reiter sind echte Links in einer Liste.
   * Grün (Kreis mit Haken) = durchgemacht, Rot (Raute mit Kreuz) = übersprungen, Grau (leerer Ring) = noch nicht erreicht.
   * Der aktuelle Reiter ist hell und trägt `aria-current`. Der Zustand steht auch als Text.
   */
  let { punkte, aktuell = -1, beschriftung }: { punkte: Punkt[]; aktuell?: number; beschriftung: string } = $props();

  const z = $derived(zaehleFarben(punkte.map(p => p.farbe)));
  const zeile = $derived(z.rot ? L(`${z.gruen} von ${punkte.length} durchgemacht, ${z.rot} übersprungen`, `${z.gruen} of ${punkte.length} completed, ${z.rot} skipped`) : L(`${z.gruen} von ${punkte.length} durchgemacht`, `${z.gruen} of ${punkte.length} completed`));
  const zustand = (f: Farbe) => (f === 'gruen' ? L('durchgemacht', 'completed') : f === 'rot' ? L('übersprungen', 'skipped') : L('noch offen', 'not done yet'));
  const sprech = (p: Punkt, i: number) => L(`Abschnitt ${i + 1} von ${punkte.length}: ${p.name}, ${zustand(p.farbe)}`, `Section ${i + 1} of ${punkte.length}: ${p.name}, ${zustand(p.farbe)}`) + (p.zusatz ? `, ${p.zusatz}` : '');
</script>

<nav class="lb" aria-label={beschriftung}>
  <p class="lb-zeile">{zeile}</p>
  <ol class="lb-liste">
    {#each punkte as p, i (p.href)}
      <li class="lb-punkt {p.farbe}" data-aktuell={i === aktuell ? '' : undefined}>
        <a href={p.href} aria-label={sprech(p, i)} aria-current={i === aktuell ? 'step' : undefined}>
          <svg class="lb-zeichen" viewBox="0 0 26 26" aria-hidden="true" focusable="false">
            {#if p.farbe === 'gruen'}
              <circle class="lb-feld" cx="13" cy="13" r="10" />
              <path class="lb-marke" d="M8.5 13.2l3.2 3.2 5.5-6.4" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
            {:else if p.farbe === 'rot'}
              <path class="lb-feld" d="M13 2l11 11-11 11L2 13z" />
              <path class="lb-marke" d="M9.5 9.5l7 7M16.5 9.5l-7 7" stroke-width="2.4" stroke-linecap="round" />
            {:else}
              <circle class="lb-ring" cx="13" cy="13" r="8.5" fill="none" stroke-width="2.4" />
            {/if}
          </svg>
          <span class="lb-name" aria-hidden="true">{p.name}</span>
        </a>
      </li>
    {/each}
  </ol>
</nav>
