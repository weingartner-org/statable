<script lang="ts">
  /** Dialog „Tastenkürzel“ (Alt+T): alle Kürzel aus `lib/kuerzel.ts`, nach Bereichen, durchsuchbar. Ein Fenster, das einmal in `App.svelte` steht. */
  import { onMount } from 'svelte';
  import { L, Lp } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import { KUERZEL, BEREICHE, empfaenger, zeige } from '../lib/kuerzel';
  import Icon from './Icon.svelte';
  import { dialogFokus } from './dialogFokus';

  let dlg = $state<HTMLDialogElement>();
  let frage = $state('');
  /** Ohne Umlaute und Großschreibung vergleichen. */
  const norm = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const gruppen = $derived.by(() => {
    const q = norm(frage.trim());
    return BEREICHE.map(b => ({
      id: b.id, name: b.text(),
      zeilen: KUERZEL.filter(k => k.bereich === b.id && (!q || norm([k.anzeige, zeige(k.anzeige), k.text(), k.wirkung(), k.gilt?.() ?? ''].join(' ')).includes(q))),
    })).filter(g => g.zeilen.length);
  });
  const zahl = $derived(gruppen.reduce((n, g) => n + g.zeilen.length, 0));

  /** Trefferzahl höflich ansagen, nach kurzer Ruhe und nur, wenn gesucht wird (nicht je Buchstabe). */
  $effect(() => {
    if (!frage.trim()) return;
    const n = zahl;
    const t = setTimeout(() => sage(Lp(n, `${n} Kürzel gefunden`, `${n} Kürzel gefunden`, `${n} shortcut found`, `${n} shortcuts found`)), 500);
    return () => clearTimeout(t);
  });

  onMount(() => {
    empfaenger.liste = () => { if (dlg && !dlg.open) { frage = ''; dlg.showModal(); } };
    return () => { empfaenger.liste = null; };
  });
</script>

<dialog bind:this={dlg} use:dialogFokus={{ erstes: '#kl-suche' }} class="kuerzel" aria-labelledby="kl-t">
  <div class="dialog-innen">
    <div class="dialog-kopf"><Icon n="info" /><h2 id="kl-t">{L('Tastenkürzel', 'Keyboard shortcuts')}</h2></div>
    <div class="eingabe">
      <label for="kl-suche">{L('Kürzel suchen', 'Search shortcuts')}</label>
      <input id="kl-suche" type="search" bind:value={frage} autocomplete="off" spellcheck="false" onkeydown={(e) => { if (e.key === 'Escape') { e.preventDefault(); dlg?.close(); } }} />
    </div>
    <div class="kl-inhalt">
      {#each gruppen as g (g.id)}
        <h3>{g.name}</h3>
        <table>
          <thead><tr><th scope="col">{L('Kürzel', 'Shortcut')}</th><th scope="col">{L('Was es tut', 'What it does')}</th></tr></thead>
          <tbody>
            {#each g.zeilen as k (k.id)}
              <tr>
                <th scope="row"><kbd>{zeige(k.anzeige)}</kbd></th>
                <td><b>{k.text()}</b><br>{k.wirkung()}{#if k.gilt} <span class="kl-gilt">({k.gilt()})</span>{/if}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      {:else}
        <p>{L('Dazu gibt es kein Kürzel.', 'There is no shortcut for this.')}</p>
      {/each}
    </div>
    <p class="kl-sr">{L('Mit Screenreader: Esc zweimal drücken, wenn das Fenster beim ersten Mal nicht schließt.', 'With a screen reader: press Esc twice if the window does not close the first time.')}</p>
    <div class="knopfzeile"><button class="k haupt" type="button" onclick={() => dlg?.close()}>{L('Schließen', 'Close')}</button></div>
  </div>
</dialog>

<style>
  dialog.kuerzel { width: min(42rem, calc(100vw - 2rem)); }
  .kl-inhalt { overflow: auto; max-height: min(55vh, 28rem); padding-inline-end: var(--a2); }
  .kl-inhalt h3 { font: 650 var(--gr-klein)/1.3 var(--schrift-ui); color: var(--tinte-2); margin: var(--a3) 0 var(--a1); }
  .kl-inhalt table { width: 100%; border-collapse: collapse; }
  .kl-inhalt th, .kl-inhalt td { text-align: start; vertical-align: top; padding: var(--a2); border-bottom: 1px solid var(--linie); font-weight: 400; }
  .kl-inhalt thead th { font-weight: 650; color: var(--tinte-2); font-size: var(--gr-klein); }
  .kl-inhalt tbody th { white-space: nowrap; }
  .kl-sr { color: var(--tinte-2); font-size: var(--gr-klein); margin: var(--a2) 0 0; }
  .kl-gilt { color: var(--tinte-2); }
  kbd { font: 600 var(--gr-klein)/1.2 var(--schrift-ui); padding: 2px 6px; border: 1px solid var(--linie-stark); border-radius: 4px; background: var(--blatt-2); }
</style>
