<script lang="ts">
  import { tick } from 'svelte';
  import { s, L } from '../lib/sitzung.svelte';
  import { lesbar } from '../lib/verzeichnis';
  import { sage } from '../lib/ansage';
  import { seitenZahl, zeilenBereich, klemmeSeite, seiteVonZeile } from '../lib/datenseiten';
  /**
   * Lesemodus der Datentabelle (Barrierefreiheit Welle 3): feste Seiten zu 50 Zeilen als echte Tabelle (nicht virtuell), Vor/Zurück; zu einer Zeile springt das Feld „Zu Zeile springen“ der Datenseite.
   * Ein Seitenwechsel wird höflich angesagt („Seite 3 von 120, Zeilen 101 bis 150“). Die Knöpfe bleiben am Rand der Tabelle erreichbar (`aria-disabled` statt `disabled`),
   * damit der Fokus nicht auf `body` fällt.
   */
  let { zelle, fundZellen, blitz = -1, seite = $bindable(0) }: {
    zelle: (v: string | number | null, i: number) => { t: string; k: string };
    fundZellen: Set<string>;
    blitz?: number;
    seite?: number;
  } = $props();

  const n = $derived(s.zeilen.length);
  const seiten = $derived(seitenZahl(n));
  const aktuell = $derived(klemmeSeite(seite, n));
  const bereich = $derived(zeilenBereich(aktuell, n));
  const sichtbar = $derived(s.zeilen.slice(bereich.von > 0 ? bereich.von - 1 : 0, bereich.bis));
  const seitenSatz = $derived(L(`Seite ${aktuell + 1} von ${seiten}`, `Page ${aktuell + 1} of ${seiten}`));
  const bereichSatz = $derived(bereich.von ? L(`Zeilen ${bereich.von} bis ${bereich.bis}`, `rows ${bereich.von} to ${bereich.bis}`) : L('keine Zeilen', 'no rows'));

  /** Wechselt die Seite und sagt sie an. */
  function geheSeite(neu: number) {
    const k = klemmeSeite(neu, n);
    if (k === aktuell) return false;
    seite = k;
    // `aktuell` und die Sätze sind erst im nächsten Takt neu; darum hier direkt rechnen.
    const b = zeilenBereich(k, n);
    sage(`${L(`Seite ${k + 1} von ${seiten}`, `Page ${k + 1} of ${seiten}`)}, ${L(`Zeilen ${b.von} bis ${b.bis}`, `rows ${b.von} to ${b.bis}`)}`);
    return true;
  }
  const vor = () => { geheSeite(aktuell + 1); };
  const zurueck = () => { geheSeite(aktuell - 1); };

  /** Zeile `r` (ab 0): richtige Seite, dann der Fokus auf die Zeilenüberschrift. */
  export async function geheZuZeile(r: number, i?: number | null): Promise<boolean> {
    if (r < 0 || r >= n) return false;
    geheSeite(seiteVonZeile(r));
    await tick();
    const el = document.getElementById(i != null ? `dc-${r}-${i}` : `dz-${r}`);
    el?.focus({ preventScroll: true });
    el?.scrollIntoView({ block: 'center', behavior: 'auto' });
    return !!el;
  }
</script>

<div class="lese">
  <div class="lese-leiste" role="group" aria-label={L('Seiten der Datentabelle', 'Pages of the data table')}>
    <button class="k" type="button" aria-disabled={aktuell === 0} onclick={zurueck}>{L('Zurück', 'Back')}</button>
    <span class="lese-seite">{seitenSatz} · {bereichSatz}</span>
    <button class="k" type="button" aria-disabled={aktuell >= seiten - 1} onclick={vor}>{L('Weiter', 'Next')}</button>
  </div>
  <!-- svelte-ignore a11y_no_noninteractive_tabindex (scrollbarer Bereich muss per Tastatur erreichbar sein, WCAG 2.1.1) -->
  <div class="raster-huelle lese-huelle" tabindex="0" role="region" aria-label={L(`Datentabelle, ${seitenSatz}`, `Data table, ${seitenSatz}`)}>
    <table class="raster koepfe-name lese-raster" aria-label={L(`Datentabelle, ${bereichSatz} von ${n}`, `Data table, ${bereichSatz} of ${n}`)}>
      <thead><tr><th scope="col" class="ecke"><span class="nur-vorleser">{L('Zeile', 'Row')}</span></th>
        {#each s.spalten as sp}<th scope="col" class="lese-kopf"><span class="kopf-in"><span class="kopf-text">{lesbar(sp)}</span>{#if sp.bezeichnung}<small>{sp.name}</small>{/if}</span></th>{/each}</tr></thead>
      <tbody>
        {#each sichtbar as z, j (bereich.von - 1 + j)}
          {@const r = bereich.von - 1 + j}
          <tr class:blitz={blitz === r}><th scope="row" id="dz-{r}" tabindex="-1">{r + 1}</th>
            {#each z as v, i}{@const c = zelle(v, i)}<td id="dc-{r}-{i}" tabindex="-1" class="{c.k}{fundZellen.has(`${r}:${s.spalten[i]!.name}`) ? ' fund' : ''}">{c.t}</td>{/each}</tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<style>
  .lese-leiste { display: flex; flex-wrap: wrap; align-items: center; gap: var(--a2) var(--a3); margin: var(--a2) 0; }
  .lese-seite { font-weight: 600; }
  .lese :global(button[aria-disabled='true']) { opacity: .55; }
  .lese-raster :global(th.lese-kopf) { white-space: normal; max-width: 16rem; }
</style>
