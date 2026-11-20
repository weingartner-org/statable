<script lang="ts">
  import { ergebnisAnsage } from '../lib/ansage-ergebnis.svelte';
  import type { OutputItem } from '../engine/types';
  import { L, melde } from '../lib/sitzung.svelte';
  import { Laedt } from '../lib/laedt.svelte';
  import { grangerRechnen } from '../lib/rverfahren.svelte';
  import { GRANGER_LABELS, grangerSperre, grangerCodeSatz, grangerHilfeSatz, grangerKMax, grangerKStandard, grangerKGueltig, grangerSaetze, grangerWarnungen, grangerRCode } from '../lib/granger';
  import type { ZeitreiheE } from '../lib/zeitreiheblatt';
  import Ausgabe from './Ausgabe.svelte';
  import Rechnet from './Rechnet.svelte';
  import HilfeLink from './HilfeLink.svelte';

  /**
   * Der Granger-Test unter der Kreuzkorrelation der Zeitreihen-Karte (Fachblatt MASSNAHME, Abschnitt 2). Ohne Klick wird nichts gerechnet; er rechnet immer in beide Richtungen.
   * k wählt die Person (Vorgabe: die Periode bei Saison, sonst 3; höchstens ein Viertel der Reihe), keine Automatik nach kleinstem p. Gesperrt (mit Satz) bei Lücken, ungleicher Länge, unter 30 Werten und konstanter Reihe.
   * Gespeichert wird die Antwort am Ergebnis des Blatts (ZeitreiheE.granger).
   */
  let { e, name, tabellen, speichere }: { e: ZeitreiheE; name: (n: string) => string; tabellen: OutputItem[]; speichere: (neu: ZeitreiheE) => void } = $props();
  const ID = 'gr';
  const lad = new Laedt();
  const x = $derived(e.y), y = $derived(e.y2 ?? []);
  const sperre = $derived(grangerSperre(x, y));
  const kMax = $derived(grangerKMax(x.length));
  let k = $state(e.granger?.antwort.k ?? grangerKStandard(e.y.length, e.periode));
  let fehler = $state('');
  const namen = $derived({ x: name(e.wert), y: name(e.zweite ?? '') });

  async function rechnen() {
    if (sperre) { fehler = grangerCodeSatz(sperre); melde(fehler); return; }
    if (!grangerKGueltig(k, x.length)) { fehler = grangerCodeSatz('k-ungueltig'); melde(fehler); return; }
    fehler = '';
    try {
      const erg = await lad.mit(() => grangerRechnen(x, y, k));
      if (!erg) return;
      speichere({ ...e, granger: { antwort: erg } });
      melde(L('Der Granger-Test ist gerechnet.', 'The Granger test has been calculated.'));
    } catch (z) { fehler = (z as Error)?.message ?? String(z); melde(fehler); }
  }
  const g = $derived(e.granger);
  const nur = $derived(tabellen.filter(t => t.type === 'table' && GRANGER_LABELS.includes((t as { label: string }).label)));
</script>

<h3 style="font-size:var(--s-klein,.9rem);margin:var(--a5) 0 var(--a2)">{L('Helfen frühere Werte der einen Reihe bei der anderen? (Granger-Test)', 'Do earlier values of one series help with the other? (Granger test)')}</h3>
{#if sperre}
  <p class="hilfe" use:ergebnisAnsage>{grangerCodeSatz(sperre)}</p>
{:else}
  <p class="hilfe">{grangerHilfeSatz()}</p>
  <div class="eingabe" style="max-width:260px;margin-top:var(--a3)"><label for="{ID}-k">{L('k (Zahl der Verzögerungen)', 'k (number of lags)')}</label>
    <input id="{ID}-k" type="number" min="1" max={kMax} step="1" value={k} aria-describedby="{ID}-k-h"
      onchange={(ev) => { const v = Number(ev.currentTarget.value); if (grangerKGueltig(v, x.length)) k = v; else { ev.currentTarget.value = String(k); melde(grangerCodeSatz('k-ungueltig')); } }}>
    <p id="{ID}-k-h" class="hilfe">{L(`Höchstens ${kMax} (ein Viertel der Reihe). Vorgabe: bei Saison die Periode, sonst 3. Das Ergebnis gilt für genau dieses k.`, `At most ${kMax} (a quarter of the series). Default: the period with a season, otherwise 3. The result holds for exactly this k.`)}</p></div>
  <div class="knopfzeile" style="margin-top:var(--a3)">
    <button class="k haupt" type="button" disabled={lad.sichtbar} aria-disabled={lad.aktiv ? 'true' : undefined} onclick={rechnen}>{#if lad.sichtbar}<Rechnet imKnopf />{/if}{g ? L('Granger-Test neu rechnen', 'Recalculate Granger test') : L('Granger-Test rechnen', 'Calculate Granger test')}</button>
  </div>
  {#if lad.sichtbar}<p class="hilfe" role="status" style="margin-top:var(--a2)"><Rechnet text={L('Der Granger-Test wird gerechnet …', 'The Granger test is being calculated …')} /></p>{/if}
  {#if fehler}<p class="hilfe" role="alert" style="margin-top:var(--a2)">{fehler}</p>{/if}
{/if}

{#if g}
  {#each grangerSaetze(g, namen) as s (s)}<p style="margin-top:var(--a2)">{s}</p>{/each}
  <ul class="hilfe" style="margin:var(--a2) 0 var(--a3);padding-inline-start:1.2em">{#each grangerWarnungen(g, namen) as w (w.code)}<li>{w.satz}</li>{/each}</ul>
  <Ausgabe items={nur} nurTabellen />
  <details class="auf" style="margin-top:var(--a3)"><summary>{L('Befehl (R)', 'Command (R)')}</summary><pre class="befehl">{grangerRCode(e.wert, e.zweite ?? '', g.antwort.k)}</pre></details>
{/if}
<p class="hilfe" style="margin-top:var(--a3)"><HilfeLink id="zeitreihe-granger" text={L('Hilfe: Granger-Test lesen', 'Help: reading a Granger test')} /></p>
