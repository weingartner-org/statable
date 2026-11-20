<script lang="ts">
  import { L, d } from '../lib/sitzung.svelte';
  import type { Block } from '../hilfe/kern';
  import { abschnitte, istUeberschrift } from '../hilfe/aufklappen';
  import Kursiv from './Kursiv.svelte';
  import Sprachteile from './Sprachteile.svelte';
  import { verlinkeAbschnitt, type Kandidat, type Linkteil } from '../hilfe/verlinken';
  /**
   * Setzt die Blöcke eines Hilfe-Artikels (Hilfe-App und Rand neben der Auswertung).
   * `offen`: Abschnitte, deren Überschrift nicht in dieser Liste steht, stehen eingeklappt (ohne die Liste: alles offen) (`details`, Überschrift im `summary`).
   * `aufgeklappt`: Kommt man aus der Suche und steht das Gesuchte hier, stehen die eingeklappten Abschnitte offen.
   * `begriffe`: Kandidaten für Links auf andere Begriffe (`hilfe/verlinken.ts`); ohne sie bleibt der Text ohne Links.
   */
  let { bloecke, offen, aufgeklappt = false, begriffe, eigeneApa }: { bloecke: Block[]; offen?: string[]; aufgeklappt?: boolean; begriffe?: Kandidat[]; /** Die APA-Zeile zum eigenen Ergebnis: ersetzt das Beispiel mit anderen Daten (Usability 4d). */ eigeneApa?: string } = $props();
  const gruppen = $derived(abschnitte(bloecke));
  /** Links je Gruppe und Block (einmal je Begriff und Abschnitt). Ohne `offen` ist alles ein Abschnitt. */
  const teile = $derived(new Map<Block[], (Linkteil[] | undefined)[]>((offen ? gruppen : [bloecke]).map(g => [g, begriffe?.length ? verlinkeAbschnitt(g, begriffe) : []])));
  const ab = (g: Block[], i: number) => teile.get(g)?.[i];
  /** Ob die erste Spalte die Zeilen benennt (`th scope="row"`): ausdrücklich über das Feld `zeilenKoepfe` der Tabelle; ohne Angabe gilt es, denn die Hilfe-Tabellen (Was/Anzahl, Funktion/Rechnet mit) sind Nachschlagetabellen mit dem Schlüssel links. */
  const zeilenKoepfe = (t: object) => (t as { zeilenKoepfe?: boolean }).zeilenKoepfe !== false;
</script>

{#snippet einzeln(b: Block, t?: Linkteil[])}
  {#if typeof b === 'string'}<p class="heft-text">{#if t}{#each t as x}{#if x.id}<a class="begriff-link" href="#hilfe/{x.id}"><Sprachteile text={x.text} /></a>{:else}<Sprachteile text={x.text} />{/if}{/each}{:else}<Sprachteile text={b} />{/if}</p>
  {:else if 'h' in b}<h3 class="zw-h"><Sprachteile text={b.h} /></h3>
  {:else if 'ul' in b}<ul class="heft-text liste">{#each b.ul as x}<li><Sprachteile text={x} /></li>{/each}</ul>
  {:else if 'ol' in b}<ol class="heft-text liste">{#each b.ol as x}<li><Sprachteile text={x} /></li>{/each}</ol>
  {:else if 'code' in b}<!-- svelte-ignore a11y_no_noninteractive_tabindex --><pre class="code" tabindex="0"><code>{b.code}</code></pre>
  {:else if 'tabelle' in b}{@const zk = zeilenKoepfe(b.tabelle)}<table class="hilfe-tabelle" aria-label={b.tabelle.kopf.join(' / ')}><thead><tr>{#each b.tabelle.kopf as x}<th scope="col"><Sprachteile text={x} /></th>{/each}</tr></thead><tbody>{#each b.tabelle.zeilen as z}<tr>{#each z as x, i}{#if zk && i === 0}<th scope="row"><Sprachteile text={x} /></th>{:else}<td><Sprachteile text={x} /></td>{/if}{/each}</tr>{/each}</tbody></table>
  {:else if 'falsch' in b}
    <aside class="falsch" aria-label={b.falsch.kopf}>
      <p class="f-zeile f-nein"><span class="f-marke"><span class="f-zeichen" aria-hidden="true">✗</span> {b.falsch.nein}:</span> <Sprachteile text={b.falsch.mythos} /></p>
      <p class="f-zeile f-ja"><span class="f-marke"><span class="f-zeichen" aria-hidden="true">✓</span> {b.falsch.ja}:</span> <Sprachteile text={b.falsch.richtig} /></p>
    </aside>
  {:else if 'mitnehmen' in b}
    <section class="mitnehmen" aria-label={b.mitnehmen.kopf}>
      <p class="mn-kopf">{b.mitnehmen.kopf}</p>
      <ul class="liste">{#each b.mitnehmen.punkte as x}<li><Sprachteile text={x} /></li>{/each}</ul>
    </section>
  {:else if eigeneApa}<p class="apa"><span>{d('Für deine Arbeit (deine Daten)', 'Für Ihre Arbeit (Ihre Daten)', 'For your paper (your data)')}</span><code><Kursiv text={eigeneApa} /></code></p>
  {:else}<p class="apa"><span>{L('Beispiel für die Arbeit (andere Daten)', 'Example for the paper (other data)')}</span><code><bdi dir="ltr">{b.apa}</bdi></code></p>{/if}
{/snippet}

{#if offen}
  {#each gruppen as g}
    {@const k = g[0]}
    {#if k && istUeberschrift(k) && !offen.includes(k.h)}
      <details class="auf abschnitt" open={aufgeklappt}>
        <summary><h3 class="zw-h"><Sprachteile text={k.h} /></h3></summary>
        {#each g.slice(1) as b, i}{@render einzeln(b, ab(g, i + 1))}{/each}
      </details>
    {:else}{#each g as b, i}{@render einzeln(b, ab(g, i))}{/each}{/if}
  {/each}
{:else}
  {#each bloecke as b, i}{@render einzeln(b, ab(bloecke, i))}{/each}
{/if}

<style>
  .zw-h { font: 650 var(--gr-h2)/1.3 var(--schrift-ui); margin: var(--a4) 0 var(--a1); }
  .liste { padding-inline-start: 1.4em; list-style: revert; display: grid; gap: var(--a1); margin: var(--a2) 0; }
  .code { margin: var(--a2) 0; padding: var(--a3); background: var(--blatt-2); border: 1px solid var(--linie); border-radius: var(--r-klein); overflow: auto; font: 400 var(--gr-klein)/1.5 var(--schrift-befehl); max-width: var(--breite-text); }
  .apa { margin: var(--a2) 0; padding: var(--a2) var(--a3); background: var(--akzent-hell); border-radius: var(--r-klein); max-width: var(--breite-text); display: grid; gap: 2px; }
  .apa span { font-size: var(--gr-klein); color: var(--akzent-tinte); font-weight: 650; }
  .apa code { font-family: var(--schrift-ui); font-size: var(--gr-text); }
  .hilfe-tabelle { width: 100%; max-width: var(--breite-text); border-collapse: collapse; margin: var(--a2) 0; font: 400 var(--gr-text)/1.4 var(--schrift-ui); }
  .hilfe-tabelle th, .hilfe-tabelle td { padding: var(--a1) var(--a2); text-align: start; vertical-align: top; border-bottom: 1px solid var(--linie); overflow-wrap: anywhere; hyphens: auto; }
  .hilfe-tabelle th { font-weight: 650; border-bottom-color: var(--linie-stark); }
  .abschnitt { margin-top: var(--a3); }
  .abschnitt > summary .zw-h { margin: 0; font: 650 var(--gr-text)/1.3 var(--schrift-ui); color: inherit; }
  .begriff-link { color: inherit; text-decoration: underline dotted; text-underline-offset: 3px; }
  .begriff-link:hover, .begriff-link:focus-visible { color: var(--akzent-tinte); text-decoration-style: solid; }
  /* „Stimmt nicht - so ist es“ und „Zum Mitnehmen“: Rahmen mit Linie links; die Bedeutung steht im Text (Marke und Wort), nie nur in der Farbe */
  .falsch, .mitnehmen { margin: var(--a3) 0; padding: var(--a2) var(--a3); max-width: var(--breite-text); border: 1px solid var(--linie-stark); border-inline-start-width: 4px; border-radius: var(--r-klein); background: var(--blatt-2); }
  .falsch { border-inline-start-style: dashed; }
  .f-zeile { margin: var(--a1) 0; }
  .f-marke { font-weight: 650; }
  .f-zeichen { display: inline-block; min-width: 1.1em; font-weight: 700; }
  .f-ja .f-marke { color: var(--akzent-tinte); }
  .mn-kopf { margin: 0 0 var(--a1); font: 650 var(--gr-text)/1.3 var(--schrift-ui); color: var(--akzent-tinte); }
  .mitnehmen .liste { margin: var(--a1) 0; }
  .zw-h:first-child { margin-top: 0; }
</style>
