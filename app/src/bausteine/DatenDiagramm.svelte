<script lang="ts">
  import { ergebnisAnsage } from '../lib/ansage-ergebnis.svelte';
  import { dialogFokus } from './dialogFokus';
  import { tick } from 'svelte';
  import { s, L } from '../lib/sitzung.svelte';
  import { istFehlend } from '../lib/fehlend';
  import { lesbar, type Spalte } from '../lib/verzeichnis';
  import { kennung } from '../lib/verfahren';
  import { sperrSatz } from '../lib/gewichte';
  import { stellenTitel } from '../lib/gewichtkarten';
  import { frageVorschlag } from '../lib/beispielvorschlag.svelte';
  import { diagrammArt, haeufigkeitAus, kreuzAus, zahlenAus, paareAus, type DiagrammArt } from '../lib/datendiagramm';
  import type { Kreuz } from '../lib/ergebnis';
  import { fundSchluessel } from '../lib/datencheck';
  import { fundTitel, fundSatz, erledigeFund, lasseFund } from '../lib/datencheckaktion';
  import Icon from './Icon.svelte';
  import DiagrammExport from './DiagrammExport.svelte';
  import Verteilungsdiagramm from './Verteilungsdiagramm.svelte';
  import Haeufigkeitsdiagramm from './Haeufigkeitsdiagramm.svelte';
  import Streudiagramm from './Streudiagramm.svelte';
  import Kreuzdiagramm from './Kreuzdiagramm.svelte';
  import BalkenBlock from './BalkenBlock.svelte';
  import StreuErweitert from './StreuErweitert.svelte';
  import HistogrammErweitert from './HistogrammErweitert.svelte';
  import SpaghettiBlock from './SpaghettiBlock.svelte';

  /**
   * Diagramm direkt aus der Datenansicht (Friedrich Beckmann, 28.10.2026: „a direct way to plots“ - wer von Excel kommt, sucht das Bild bei den Daten, nicht bei den Fragen).
   * Eine oder zwei Spalten wählen, das passende Bild erscheint sofort: Zahl → Histogramm oder Boxplot, Gruppen → Säulen, Zahl × Zahl → Streudiagramm,
   * Zahl × Gruppen → Mittelwert nach Gruppe, Gruppen × Gruppen → gruppierte Säulen. Es sind dieselben Diagramme wie in den Auswertungen (Export, Gestalten);
   * „Genauer auswerten“ öffnet die passende Frage mit diesen Spalten. Gerechnet wird nichts Neues: die Bilder zählen und zeichnen nur.
   */
  let { offen = $bindable(false), start = '' }: { offen?: boolean; start?: string } = $props();
  let dlg = $state<HTMLDialogElement>();
  let a = $state(''), b = $state('');
  let verteilung = $state<'hist' | 'box'>('hist'), prozent = $state(false);

  const wahl = $derived(s.spalten.filter(sp => sp.art !== 'datum' && !kennung(sp)));
  const sp = (n: string): Spalte | undefined => s.spalten.find(x => x.name === n);
  const name = (n: string) => lesbar(sp(n));
  const art = $derived<DiagrammArt | null>(a ? diagrammArt(sp(a)!, b ? sp(b) : undefined, s.zeilen, s.spalten) : null);
  /** Histogramm, Boxplot und Streudiagramm zeichnen jede Zeile einmal - mit Fallgewicht gesperrt wie in der Auswertung (Fachblatt S-A, 1.5). Säulen zählen mit Gewicht. */
  const gwSatz = (id: string): string | null => (s.gewicht ? sperrSatz(id, s.gewicht, stellenTitel(id)) : null);

  $effect(() => {
    if (offen && dlg && !dlg.open) {
      if (start && wahl.some(x => x.name === start)) { a = start; b = ''; }
      else if (!a || !wahl.some(x => x.name === a)) { a = wahl[0]?.name ?? ''; b = ''; }
      dlg.showModal(); tick().then(() => document.getElementById('dd-a')?.focus());
    } else if (!offen && dlg?.open) dlg.close();
  });
  function zu() { offen = false; }
  function genauer() {
    if (!art) return;
    const w = art.frage.w;
    frageVorschlag.v = { art: art.frage.art, w: { l1: w.l1 ?? [], l2: w.l2 ?? [], l3: [], l4: [] } };
    offen = false;
    location.hash = 'blatt/neu';
  }
  const tausch = () => { const x = a; a = b; b = x; };
  /** Offene Funde des Daten-Checks zu den gewählten Spalten (29.10.2026): ein Platzhalter wie 99, uneinheitliche Schreibweisen oder ein sehr auffälliger Wert
   *  verzerren das Bild - der Hinweis steht darüber, mit denselben Knöpfen wie in der Seitenleiste. Leere Felder verzerren nichts und bleiben dort. */
  const funde = $derived(s.funde.filter(f => f.art !== 'leer' && (f.spalte === a || (!!b && f.spalte === b)) && !s.entscheid[fundSchluessel(f)]));
</script>

<dialog bind:this={dlg} use:dialogFokus class="dd" aria-labelledby="dd-t" onclose={() => { offen = false; }} oncancel={(e) => { e.preventDefault(); zu(); }}>
  <div class="dialog-innen">
    <div class="dialog-kopf"><Icon n="diagramm" /><h2 id="dd-t">{L('Diagramm', 'Chart')}</h2>
      <button class="k leise nur-symbol" type="button" aria-label={L('Schließen', 'Close')} onclick={zu}><Icon n="x" /></button></div>
    <div class="dd-wahl">
      <div class="eingabe"><label for="dd-a">{L('Spalte', 'Column')}</label>
        <select id="dd-a" bind:value={a}>{#each wahl as x (x.name)}<option value={x.name}>{lesbar(x)}</option>{/each}</select></div>
      <div class="eingabe"><label for="dd-b">{L('Zweite Spalte (optional)', 'Second column (optional)')}</label>
        <select id="dd-b" bind:value={b}><option value="">{L('Keine', 'None')}</option>{#each wahl.filter(x => x.name !== a) as x (x.name)}<option value={x.name}>{lesbar(x)}</option>{/each}</select></div>
      {#if b}<button class="k leise nur-symbol dd-tausch" type="button" aria-label={L('Spalten tauschen', 'Swap columns')} data-tipp={L('Spalten tauschen', 'Swap columns')} onclick={tausch}><Icon n="umformen" /></button>{/if}
    </div>

    {#each funde as f (fundSchluessel(f))}
      <div class="fund-karte dd-fund" role="note"><h3><Icon n="hinweis" k="hw" />{fundTitel(f)}</h3>
        <p>{fundSatz(f)} {L('Das verändert auch dieses Diagramm.', 'This also changes this chart.')}</p>
        <div class="knopfzeile">
          {#if f.art === 'schreibweise'}<button class="k haupt" type="button" onclick={() => erledigeFund(f)}>{L('Zusammenfassen', 'Merge')}</button><button class="k leise" type="button" onclick={() => lasseFund(f)}>{L('So lassen', 'Leave as is')}</button>
          {:else if f.art === 'platzhalter'}<button class="k haupt" type="button" onclick={() => erledigeFund(f)}>{L('Als „keine Angabe“ behandeln', 'Treat as "no answer"')}</button><button class="k leise" type="button" onclick={() => lasseFund(f)}>{L('So lassen', 'Leave as is')}</button>
          {:else}<button class="k" type="button" onclick={() => lasseFund(f)}>{L('Wert behalten', 'Keep value')}</button>{/if}
        </div></div>
    {/each}
    {#if art}
      <p class="dd-satz" use:ergebnisAnsage>{art.satz}</p>
      {#if art.art === 'verteilung'}
        <div class="dd-schalter" role="group" aria-label={L('Art des Diagramms', 'Type of chart')}>
          <button class="k" class:leise={verteilung !== 'hist'} type="button" aria-pressed={verteilung === 'hist'} onclick={() => (verteilung = 'hist')}>{L('Histogramm', 'Histogram')}</button>
          <button class="k" class:leise={verteilung !== 'box'} type="button" aria-pressed={verteilung === 'box'} onclick={() => (verteilung = 'box')}>{L('Boxplot', 'Box plot')}</button></div>
        <DiagrammExport sperre={gwSatz(verteilung === 'box' ? 'diagramm:box' : 'diagramm:histogramm')} titel={`${name(a)} - ${verteilung === 'box' ? L('Boxplot', 'Box plot') : L('Histogramm', 'Histogram')}`}><Verteilungsdiagramm werte={zahlenAus(sp(a)!, s.zeilen, s.spalten)} titel={name(a)} art={verteilung} /></DiagrammExport>
        {#if verteilung === 'hist' && !s.gewicht}<HistogrammErweitert spalte={a} name={name} />{/if}
      {:else if art.art === 'saeulen'}
        {@const h = haeufigkeitAus(sp(a)!, name(a), s.zeilen, s.spalten, s.gewicht?.spalte)}
        <div class="dd-schalter" role="group" aria-label={L('Werte', 'Values')}>
          <button class="k" class:leise={prozent} type="button" aria-pressed={!prozent} onclick={() => (prozent = false)}>{L('Anzahl', 'Count')}</button>
          <button class="k" class:leise={!prozent} type="button" aria-pressed={prozent} onclick={() => (prozent = true)}>{L('Prozent', 'Percent')}</button></div>
        <DiagrammExport titel={`${name(a)} - ${L('Säulendiagramm', 'Bar chart')}`}><Haeufigkeitsdiagramm {h} {prozent} /></DiagrammExport>
      {:else if art.art === 'streu'}
        <DiagrammExport sperre={gwSatz('diagramm:streu')} titel={`${name(art.y)} ${L('und', 'and')} ${name(art.x)} - ${L('Streudiagramm', 'Scatter plot')}`}><Streudiagramm punkte={paareAus(sp(art.x)!, sp(art.y)!, s.zeilen, s.spalten)} xText={name(art.x)} yText={name(art.y)} /></DiagrammExport>
        {#if !s.gewicht}<StreuErweitert x={art.x} y={art.y} {name} /><SpaghettiBlock zeit={art.x} wert={art.y} person={s.spalten.find(c => kennung(c))?.name ?? ''} {name} />{/if}
      {:else if art.art === 'gruppenmittel'}
        <BalkenBlock yName={art.y} gName={art.g} {name} />
      {:else if art.art === 'kreuz'}
        {@const k = kreuzAus(sp(art.gezaehlt)!, sp(art.gruppen)!, name(art.gezaehlt), name(art.gruppen), s.zeilen, s.spalten, s.gewicht?.spalte)}
        <DiagrammExport titel={`${name(art.gezaehlt)} ${L('nach', 'by')} ${name(art.gruppen)} - ${L('Säulendiagramm', 'Bar chart')}`}><Kreuzdiagramm e={k as unknown as Kreuz} /></DiagrammExport>
      {/if}
    {/if}

    <div class="knopfzeile">
      {#if art && art.art !== 'keins'}<button class="k haupt" type="button" data-tipp={L('Öffnet die passende Frage mit diesen Spalten: Kennwerte, Test, Satz für den Bericht', 'Opens the matching question with these columns: statistics, test, sentence for the report')} onclick={genauer}>{L('Genauer auswerten', 'Analyse in more detail')}</button>{/if}
      <button class="k leise" type="button" onclick={zu}>{L('Schließen', 'Close')}</button>
    </div>
  </div>
</dialog>

<style>
  dialog.dd { width: min(52rem, calc(100vw - 2rem)); overflow: auto; }
  .dd-wahl { display: flex; gap: var(--a3); flex-wrap: wrap; align-items: flex-end; }
  .dd-wahl .eingabe { flex: 1 1 14rem; min-width: 0; }
  .dd-wahl select { width: 100%; }
  .dd-tausch { flex: none; }
  .dd-satz { margin: 0; color: var(--tinte-2); }
  .dd-fund { box-shadow: none; border: 1px solid var(--linie); }
  .dd-schalter { display: flex; gap: var(--a2); flex-wrap: wrap; }
</style>
