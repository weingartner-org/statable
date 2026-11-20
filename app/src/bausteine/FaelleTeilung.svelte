<script lang="ts">
  import { L, d } from '../lib/sitzung.svelte';
  import { teilungInfo, teile, runde2, stufenVon, type Faelle } from '../lib/faelle';
  import { teilungSatz, bindungenHinweis } from '../lib/faellesaetze';
  import { zahlDe } from '../lib/format';
  import Icon from './Icon.svelte';

  /**
   * Der Vorschlag für Gruppen aus den Zahlen und Gruppen: je Zahlenspalte die Teilung am Median (Voreinstellung) mit den Größen beider Hälften,
   * bei Bindungen am Median der Hinweis mit beiden Größen. Unter „Weitere Wege“ eine eigene Schwelle je Zahlenspalte („bis einschließlich“).
   */
  let { e, tue }: { e: Faelle; tue: (text: string, fn: (x: Faelle) => void) => void } = $props();

  const zahlenSpalten = $derived(e.q.flatMap((sp, qi) => { const i = teilungInfo(e, sp.name); return i ? [{ sp, qi, i }] : []; }));
  const gruppenSpalten = $derived(e.q.flatMap((sp, qi) => (sp.art === 'gruppe' ? [{ sp, n: stufenVon(e, qi).length }] : [])));
  const teilbar = $derived(zahlenSpalten.filter(z => z.i.modus !== 'keine'));
  let fehler = $state<Record<string, string>>({});

  /** Eine Zahl so lesen, wie sie getippt wird (Komma oder Punkt); leer = null. */
  const lies = (t: string): number | null | undefined => {
    const x = t.trim().replace(/−/g, '-').replace(',', '.');
    if (x === '') return null;
    const v = Number(x);
    return Number.isFinite(v) ? v : undefined;
  };
  function setze(spalte: string, bezeichnung: string, text: string, feld: HTMLInputElement) {
    const v = lies(text);
    if (v === undefined) { fehler[spalte] = L(`„${text}“ ist keine Zahl. Bitte eine Zahl wie 3,5 eingeben.`, `"${text}" is not a number. Please enter a number such as 3.5.`); return; }
    fehler[spalte] = '';
    if (v === null) { tue(L(`${bezeichnung}: wieder am Median geteilt.`, `${bezeichnung}: split at the median again.`), x => teile(x, spalte, { modus: 'median' })); feld.value = ''; return; }
    tue(L(`${bezeichnung}: geteilt an der Schwelle ${zahlDe(v)}.`, `${bezeichnung}: split at the threshold ${zahlDe(v)}.`), x => teile(x, spalte, { modus: 'eigen', wert: v }));
  }
</script>

<div class="teilung" role="group" aria-labelledby="teilung-t">
  <h4 id="teilung-t">{L('Vorschlag für Gruppen', 'Suggested groups')}</h4>
  <ul class="teilung-liste">
    {#each zahlenSpalten as z (z.sp.name)}
      {@const b = bindungenHinweis(z.i, z.sp.bezeichnung)}
      <li>
        <p>{teilungSatz(z.i, z.sp.bezeichnung)}</p>
        {#if b}<p class="hinweis" role="note"><Icon n="hinweis" k="hw" /><span><b>{b.text}.</b> {b.klein}</span></p>{/if}
      </li>
    {/each}
    {#each gruppenSpalten as g (g.sp.name)}
      <li><p>{L(`${g.sp.bezeichnung}: Jede Stufe ist eine Gruppe (${g.n}).`, `${g.sp.bezeichnung}: each level is a group (${g.n}).`)}</p></li>
    {/each}
  </ul>
  <p class="klein">{d('Der Median ist ein Startpunkt, kein Befund. „bis“ schließt den Wert selbst ein. Gruppen mit fehlender Angabe stehen für sich, sie werden nie still weggelassen.', 'Der Median ist ein Startpunkt, kein Befund. „bis“ schließt den Wert selbst ein. Gruppen mit fehlender Angabe stehen für sich, sie werden nie still weggelassen.', 'The median is a starting point, not a finding. "Up to" includes the value itself. Groups with a missing entry stand on their own and are never silently left out.')}</p>
  {#if teilbar.length}
    <details class="auf weitere-wege" open={teilbar.some(z => z.i.modus === 'eigen')}>
      <summary>{L('Weitere Wege', 'More options')}</summary>
      <p class="klein" style="margin:var(--a2) 0">{d('Eine eigene Schwelle teilt die Spalte an einem Wert deiner Wahl (zum Beispiel einem Cut-off aus dem Testhandbuch). Fälle genau auf der Schwelle gehören zu „bis“. Leer lassen: wieder am Median teilen.', 'Eine eigene Schwelle teilt die Spalte an einem Wert Ihrer Wahl (zum Beispiel einem Cut-off aus dem Testhandbuch). Fälle genau auf der Schwelle gehören zu „bis“. Leer lassen: wieder am Median teilen.', 'Your own threshold splits the column at a value of your choice (for example a cut-off from the test manual). Cases exactly at the threshold belong to "up to". Leave empty: split at the median again.')}</p>
      {#each teilbar as z, k (z.sp.name)}
        <div class="eingabe schwelle">
          <label for="schwelle-{k}">{L(`Eigene Schwelle für ${z.sp.bezeichnung}`, `Own threshold for ${z.sp.bezeichnung}`)}</label>
          <input id="schwelle-{k}" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" style="max-width:10ch"
            value={z.i.modus === 'eigen' ? z.i.schwelleText : ''} placeholder={z.i.median === null ? '' : zahlDe(runde2(z.i.median))}
            onchange={(ev) => setze(z.sp.name, z.sp.bezeichnung, ev.currentTarget.value, ev.currentTarget)} aria-describedby={fehler[z.sp.name] ? `schwelle-f-{k} schwelle-h-{k}` : `schwelle-h-{k}`} aria-invalid={fehler[z.sp.name] ? 'true' : undefined}>
          <span id="schwelle-h-{k}" class="klein">{z.i.modus === 'eigen' ? L(`Median zum Vergleich: ${zahlDe(runde2(z.i.median!))}`, `Median for comparison: ${zahlDe(runde2(z.i.median!))}`) : L('Voreinstellung: Median', 'Default: median')}</span>
        {#if fehler[z.sp.name]}<p id="schwelle-f-{k}" class="klein fehler" role="alert">{fehler[z.sp.name]}</p>{/if}
        </div>
      {/each}
    </details>
  {/if}
</div>

<style>
  .teilung { margin-top: var(--a4); padding: var(--a3) var(--a4); background: var(--blatt-2); border-radius: var(--r-klein); }
  .teilung h4 { margin: 0 0 var(--a2); font-size: var(--gr-text); }
  .teilung-liste { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--a2); }
  .teilung-liste p { margin: 0; max-width: var(--breite-text); }
  .hinweis { display: flex; gap: var(--a2); align-items: flex-start; margin-top: var(--a1) !important; padding: var(--a2) var(--a3); background: var(--hinweis-hell); border-inline-start: 3px solid var(--hinweis); border-radius: var(--r-klein); font-size: var(--gr-klein); }
  .klein { font-size: var(--gr-klein); color: var(--tinte-2); margin: var(--a2) 0 0; max-width: var(--breite-text); }
  .schwelle { margin-bottom: var(--a3); }
  .fehler { color: var(--verlust); }
</style>
