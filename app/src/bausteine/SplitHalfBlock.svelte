<script lang="ts">
  import { tick } from 'svelte';
  import { ergebnisAnsage } from '../lib/ansage-ergebnis.svelte';
  import { L, melde, rechne, sichern, type Blatt } from '../lib/sitzung.svelte';
  import { merkeSyntax } from '../lib/befehlsspeicher.svelte';
  import { Laedt } from '../lib/laedt.svelte';
  import { splitHalf, splitHalfSyntax, ohneNull, type Skala } from '../lib/ergebnis';
  import { splitHalfSatz, splitHalfHinweis, tabellenSplitHalf } from '../lib/splithalf-saetze';
  import Ausgabe from './Ausgabe.svelte';
  import Rechnet from './Rechnet.svelte';
  import HilfeLink from './HilfeLink.svelte';
  import Icon from './Icon.svelte';

  /**
   * Testhalbierung (Split-Half, Stufe 6.6) unter der Karte „Skala“: PSPP `RELIABILITY /MODEL=SPLIT(ceil(k/2))`. Ohne Klick wird nichts gerechnet.
   * Die Teilung ist fest: die ersten ceil(k/2) Fragen in der gewählten Reihenfolge, wie in SPSS. Die Antwort steht am Ergebnis des Blatts (Skala.splitHalf).
   */
  let { blatt, e, fragen, umpolen, name }: { blatt: Blatt; e: Skala; fragen: string[]; umpolen: boolean; name: (n: string) => string } = $props();
  const lad = new Laedt();
  let fehler = $state('');
  const sh = $derived(e.splitHalf);
  const zuWenig = $derived(fragen.length < 4);
  const befehl = $derived(splitHalfSyntax(fragen));
  const tabellen = $derived(sh ? tabellenSplitHalf(sh, fragen, name) : []);

  async function rechnen() {
    if (lad.aktiv || zuWenig) return;
    fehler = '';
    try {
      const erg = await lad.mit(async () => splitHalf(await rechne(befehl)));
      if (!erg) return;
      blatt.ergebnis = { typ: 'skala', e: { ...e, splitHalf: erg } };
      sichern();
      melde(L('Testhalbierung gerechnet.', 'Split-half calculated.'));
      await tick(); document.getElementById('sh-ergebnis')?.focus();
    } catch (x) { fehler = (x as Error).message; melde(fehler); await tick(); document.getElementById('sh-fehler')?.focus(); }
  }
</script>

<details class="auf" style="margin-top:var(--a4)"><summary>{L('Wie zuverlässig ist die Skala, wenn man sie halbiert? (Testhalbierung, Spearman-Brown)', 'How reliable is the scale when it is cut in half? (split-half reliability, Spearman-Brown)')}</summary>
  {#if zuWenig}
    <p class="heft-text" style="margin:var(--a2) 0">{L('Die Testhalbierung braucht mindestens vier Fragen (zwei je Hälfte).', 'Split-half reliability needs at least four questions (two per half).')}</p>
  {:else}
    <p class="heft-text" style="margin:var(--a2) 0">{L(`Die Skala wird in zwei Hälften geteilt (Testhalbierung, Split-Half): die ersten ${Math.ceil(fragen.length / 2)} Fragen und die übrigen ${Math.floor(fragen.length / 2)}. Jede Hälfte ergibt eine Summe; die Korrelation der beiden Summen zeigt, wie gut die Hälften übereinstimmen. Weil jede Hälfte nur halb so lang ist wie die Skala, rechnet die Spearman-Brown-Formel auf die ganze Länge hoch. Der Guttman-Split-Half-Koeffizient tut dasselbe, ohne gleiche Streuung der Hälften anzunehmen.`, `The scale is cut into two halves (split-half): the first ${Math.ceil(fragen.length / 2)} questions and the remaining ${Math.floor(fragen.length / 2)}. Each half gives a sum; the correlation of the two sums shows how well the halves agree. Because each half is only half as long as the scale, the Spearman-Brown formula projects the value to full length. The Guttman split-half coefficient does the same without assuming equal spread of the halves.`)}</p>
    <p class="heft-text">{L('Die Teilung hängt von der Reihenfolge der Fragen ab: Die erste Hälfte sind die ersten Fragen der Skala, wie in SPSS (Reliabilitätsanalyse, Modell „Split-Half“).', 'The split depends on the order of the questions: the first half is the first questions of the scale, as in SPSS (reliability analysis, model "Split-Half").')}</p>
    {#if umpolen && !sh}
      <p class="heft-text">{L('Polt zuerst die gegenläufigen Fragen um (siehe unten bei „Weiter mit der Skala“). Danach stimmt die Testhalbierung.', 'First reverse-code the questions that run against the others (see "Next steps with the scale" below). Then the split-half result is correct.')}</p>
    {/if}
    <div class="knopfzeile" style="margin-top:var(--a2)">
      <button class="k haupt" type="button" disabled={lad.sichtbar} aria-disabled={lad.aktiv ? 'true' : undefined} onclick={rechnen}>{#if lad.sichtbar}<Rechnet imKnopf />{/if}{sh ? L('Halbierung neu rechnen', 'Recalculate split-half') : L('Halbierung rechnen', 'Calculate split-half')}</button>
    </div>
    {#if lad.sichtbar}<p class="heft-text" style="margin-top:var(--a2)"><Rechnet text={L('Die Testhalbierung wird gerechnet …', 'The split-half is being calculated …')} /></p>{/if}
    {#if fehler}<p id="sh-fehler" class="heft-text" tabindex="-1" style="color:var(--fehler, #b3261e)">{fehler}</p>{/if}
    {#if sh}
      <p id="sh-ergebnis" class="ergebnis-satz" tabindex="-1" style="font-size:1.05rem;margin-top:var(--a3)" use:ergebnisAnsage>{splitHalfSatz(sh)}</p>
      <Ausgabe items={tabellen} nurTabellen />
      <p class="heft-text">{splitHalfHinweis(sh)}</p>
      {#if sh.n && e.n && sh.n < e.n}<p class="heft-text">{L(`Es gehen ${sh.n} von ${e.n} Personen ein.`, `${sh.n} of ${e.n} people are included.`)}</p>{/if}
    {/if}
    <details class="auf" style="margin-top:var(--a2)"><summary>{L('Befehl (PSPP)', 'Command (PSPP)')}</summary><pre class="befehl">{befehl}</pre>
      <div class="knopfzeile" style="margin-top:var(--a2)"><button class="k leise" type="button" onclick={() => { merkeSyntax(befehl, L('Testhalbierung', 'Split-half')); location.hash = 'befehle'; }}><Icon n="befehl" />{L('In den Befehlen öffnen', 'Open in Commands')}</button></div></details>
  {/if}
  <p class="hilfe" style="margin-top:var(--a3)"><HilfeLink id="testhalbierung" text={L('Hilfe: Testhalbierung lesen', 'Help: reading a split-half result')} /></p>
</details>
