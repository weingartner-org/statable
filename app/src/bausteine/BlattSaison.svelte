<script lang="ts">
  import { ergebnisAnsage } from '../lib/ansage-ergebnis.svelte';
  import { L, melde } from '../lib/sitzung.svelte';
  import HilfeLink from './HilfeLink.svelte';
  import type { ZeitreiheE } from '../lib/zeitreiheblatt';
  import { saisonSperre, saisonSperreSatz, saisonWarnungen, saisonHilfeSatz, saisonDateien, type SaisonModell } from '../lib/saisoncode';

  /**
   * Der Abschnitt „Saisonbereinigung mit X-13 (in R auf dem eigenen Rechner)“ der Zeitreihen-Karte (Fachblatt SAISON-EUROSTAT, Abschnitt 1).
   * Statable rechnet hier nichts: Es erzeugt die Reihe als CSV und ein R-Skript zum Mitnehmen; das Skript wird in der App nie ausgeführt.
   * Gesperrt (mit Satz statt Knöpfen) bei anderem Raster als Monat oder Quartal, bei Lücken und unter 3 vollen Jahren. Die drei Warnungen sind immer sichtbar.
   */
  let { e }: { e: ZeitreiheE } = $props();
  const ID = 'zr-saison';
  let modell = $state<SaisonModell>('seats');
  const sperre = $derived(saisonSperre(e));
  const dateien = $derived(sperre ? null : saisonDateien(e, e.wert, modell));

  function herunter(inhalt: string, name: string, typ: string) {
    const url = URL.createObjectURL(new Blob([inhalt], { type: typ }));
    const a = Object.assign(document.createElement('a'), { href: url, download: name });
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
    melde(L(`${name} wurde gespeichert. Sie liegt bei den Downloads.`, `${name} was saved. You will find it in your downloads.`));
  }
</script>

<h3 style="font-size:var(--s-klein,.9rem);margin:var(--a5) 0 var(--a2)">{L('Saisonbereinigung mit X-13 (in R auf dem eigenen Rechner)', 'Seasonal adjustment with X-13 (in R on your own computer)')}</h3>
<p class="hilfe">{saisonHilfeSatz()} <HilfeLink id="saisonbereinigung-r" text={L('Hilfe: Saisonbereinigung', 'Help: seasonal adjustment')} /></p>
{#if sperre}
  <p class="hilfe" use:ergebnisAnsage>{saisonSperreSatz(sperre, e)}</p>
{:else if dateien}
  <div class="korr-wahl" role="radiogroup" aria-labelledby="{ID}-m-t" style="margin:var(--a2) 0">
    <span id="{ID}-m-t" class="nur-vorleser">{L('Verfahren', 'Method')}</span>
    <div class="segment">{#each [['seats', 'SEATS'], ['x11', 'X-11']] as [w, tx]}<label><input type="radio" name="{ID}-m" value={w} checked={modell === w} onchange={() => (modell = w as SaisonModell)}>{tx}</label>{/each}</div>
    <p class="hilfe" style="margin-top:var(--a2)">{L('Die Vorgabe ist der Standard des Pakets seasonal (SEATS).', 'The default is the standard of the package seasonal (SEATS).')}</p>
  </div>
  <div class="knopfzeile">
    <button class="k haupt" type="button" onclick={() => herunter(dateien.csv, dateien.csvName, 'text/csv;charset=utf-8')}>{L('Reihe als CSV speichern', 'Save the series as CSV')}</button>
    <button class="k haupt" type="button" onclick={() => herunter(dateien.r, dateien.rName, 'text/plain;charset=utf-8')}>{L('R-Skript speichern', 'Save the R script')}</button>
  </div>
  <p class="hilfe" style="margin-top:var(--a2)">{L('Beide Dateien in denselben Ordner legen und das Skript in R ausführen. Es schreibt eine zweite CSV-Datei mit der bereinigten Reihe; sie lässt sich in Statable wieder öffnen.', 'Put both files in the same folder and run the script in R. It writes a second CSV file with the adjusted series; it can be opened in Statable again.')}</p>
  <details class="auf" style="margin-top:var(--a3)"><summary>{L('R-Skript ansehen', 'View the R script')}</summary><pre class="befehl">{dateien.r}</pre></details>
{/if}
<ul class="hilfe" style="margin:var(--a3) 0;padding-inline-start:1.2em">{#each saisonWarnungen() as w (w.code)}<li>{w.satz}</li>{/each}</ul>
