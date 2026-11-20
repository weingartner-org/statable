<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { d, L } from '../lib/sitzung.svelte';
  import { rAbbrechen, rKosten, rStatus } from '../lib/rverfahren.svelte';
  import { R_HINWEIS_MS } from '../lib/rlauf.svelte';
  import Icon from './Icon.svelte';
  import Rechnet from './Rechnet.svelte';
  /** Hinweis vor dem ersten Laden von R (webR) und der Knopf, der die Rechnung startet. Ist R schon geladen, steht nur der Knopf. */
  let { knopf, los, laeuft = false, haupt = true, gross = false, pakete, mitKosten = false, gesperrt = false, fehlt = $bindable(false) }: { knopf: string; los: () => void; laeuft?: boolean; haupt?: boolean; gross?: boolean; /** welche R-Pakete das Verfahren braucht (für die Größenangabe); ohne Angabe: lavaan und psych */ pakete?: string[]; /** Die Kosten stehen im Knopf („… (lädt R, ca. 21 MB)“) statt in einem Absatz davor: für Knöpfe, deren Klick schon die Zustimmung ist (Vorschläge) */ mitKosten?: boolean; /** Die Frage ist gesperrt: Knopf wie bei den übrigen Sperren (`aria-disabled`); ein Klick führt zur Meldung der Prüfliste */ gesperrt?: boolean; fehlt?: boolean } = $props();
  let kosten = $state<{ basisMB: number; paketeMB: number } | null | undefined>(undefined);
  onMount(async () => { if (!rStatus.bereit) { kosten = await rKosten(pakete); fehlt = kosten === null; } });
  const prozent = $derived(rStatus.gesamt ? Math.min(100, Math.round((rStatus.geladen / rStatus.gesamt) * 100)) : 0);
  /** R lädt schon, weil die Wahl feststeht (Vorwärmen, gestartet von der Seite, die diese Wahl hält): die Anzeige steht hier, damit man sieht, was passiert. */
  const vorlaedt = $derived(rStatus.vor && !laeuft && !rStatus.bereit);
  let lange = $state(false);
  $effect(() => {
    if (!laeuft) { lange = false; return; }
    const uhr = setTimeout(() => { lange = true; }, R_HINWEIS_MS);
    untrack(() => { rStatus.knoepfe++; });   // Dieser Knopf steht da: Die Leiste RLauft ist dann nicht nötig
    return () => { clearTimeout(uhr); untrack(() => { rStatus.knoepfe--; }); };
  });
</script>

<div class="r-start">
  {#if vorlaedt && kosten !== null}
    <!-- Erscheint erst nach einem Moment (CSS), damit bereits zwischengespeichertes R nicht aufblitzt. Die Zahlen sind für Vorleser verborgen, sonst spräche die Zeile bei jedem Häppchen. -->
    <div class="r-fort r-vor" role="status">
      <span class="nur-vorleser">{L('R wird geladen …', 'Loading R …')}</span>
      <p class="heft-text" style="margin:0" aria-hidden="true"><Rechnet text={rStatus.text || L('R wird geladen …', 'Loading R …')} /></p>
      {#if rStatus.gesamt && rStatus.geladen < rStatus.gesamt}<progress max="100" value={prozent} aria-hidden="true"></progress>{/if}
    </div>
  {:else if !rStatus.bereit && !laeuft}
    {#if kosten === null}
      <p class="heft-text">{L('R ist in dieser Installation von Statable nicht enthalten. Dieses Verfahren steht hier deshalb nicht zur Verfügung.', 'R is not included in this installation of Statable. This method is therefore not available here.')}</p>
    {:else if kosten && !mitKosten && kosten.paketeMB < 1}
      <p class="heft-text">{d(`Dafür lädt Statable einmalig R (ca. ${kosten.basisMB} MB), danach in etwa 1 s. Deine Daten bleiben auf deinem Gerät.`, `Dafür lädt Statable einmalig R (ca. ${kosten.basisMB} MB), danach in etwa 1 s. Ihre Daten bleiben auf Ihrem Gerät.`, `For this, Statable loads R once (about ${kosten.basisMB} MB), afterwards it takes about 1 s. Your data stay on your device.`)}</p>
    {:else if kosten && !mitKosten}
      <p class="heft-text">{d(`Dafür lädt Statable einmalig R (ca. ${kosten.basisMB} MB + ${kosten.paketeMB} MB), danach in etwa 1 s. Deine Daten bleiben auf deinem Gerät.`, `Dafür lädt Statable einmalig R (ca. ${kosten.basisMB} MB + ${kosten.paketeMB} MB), danach in etwa 1 s. Ihre Daten bleiben auf Ihrem Gerät.`, `For this, Statable loads R once (about ${kosten.basisMB} MB + ${kosten.paketeMB} MB), afterwards it takes about 1 s. Your data stay on your device.`)}</p>
    {/if}
  {/if}
  {#if laeuft}
    <div role="status" class="r-fort">
      <span class="nur-vorleser">{L('R rechnet …', 'R is calculating …')}</span>
      <p class="heft-text" style="margin:0" aria-hidden="true"><Rechnet text={rStatus.text || L('R rechnet …', 'R is calculating …')} /></p>
      {#if rStatus.gesamt && rStatus.geladen < rStatus.gesamt}<progress max="100" value={prozent} aria-label={L('Ladefortschritt', 'Loading progress')}></progress>{/if}
    </div>
    <!-- Eigene Ansage-Zone, die schon vor dem Hinweis da ist: So hören Vorleser ihn genau einmal. -->
    <p class="heft-text r-lange" role="status">{#if lange}{L('Das dauert länger. Bei großen Daten ist das normal. Warten oder abbrechen ist beides möglich: Die Daten bleiben unverändert.', 'This is taking longer. With large data that is normal. You can wait or cancel: the data stay unchanged.')}{/if}</p>
    {#if rStatus.belegt}<div class="knopfzeile"><button class="k" type="button" onclick={rAbbrechen}>{L('Abbrechen', 'Cancel')}</button></div>{/if}
  {:else if kosten !== null}
    <div class="knopfzeile"><button class="k {haupt ? 'haupt' : ''} {gross ? 'gross' : ''}" type="button" aria-disabled={gesperrt ? 'true' : undefined} onclick={los}><Icon n="motor" />{knopf}{#if mitKosten && !rStatus.bereit && kosten}{' '}<small>{L(`(lädt R, ca. ${kosten.basisMB + kosten.paketeMB} MB)`, `(loads R, about ${kosten.basisMB + kosten.paketeMB} MB)`)}</small>{/if}</button></div>
  {/if}
</div>

<style>
  .r-start { margin-top: var(--a2); }
  .r-vor { opacity: 0; animation: r-vor-ein .2s .45s forwards; }
  @keyframes r-vor-ein { to { opacity: 1; } }
  .r-lange { margin: var(--a2) 0 0; }
  .r-fort progress { width: 100%; max-width: 360px; margin-top: var(--a2); accent-color: var(--akzent); }
</style>
