<script lang="ts">
  /**
   * Lesarten prüfen (Feinstruktur F3B2, Fachblatt 6): bei jeder neuen Sinneinheit die offenen und vorläufig haltenden Lesarten früherer
   * Einheiten mit Prüfkriterium. Der Mensch setzt den Stand mit Begründung; Statable setzt nie selbst (keine Vorauswahl).
   * Verworfene Lesarten bleiben immer sichtbar, mit dem Wort „verworfen“ und der Einheit. Keine Zählung, keine Rangfolge.
   * Nicht vorauslesen: hier stehen nur Texte der Person und Nummern bis zur aktuellen Einheit.
   */
  import { L, s } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import { aendereSequenzanalyse } from '../lib/interviews.svelte';
  import type { LesartStandArt, Sequenzanalyse } from '../lib/qualprojekt';
  import { setzeStand, standWort, verworfene, zuPruefen } from '../lib/feinstruktur-pruefen';

  let { sa, idx }: { sa: Sequenzanalyse; idx: number } = $props();
  const sp = (): 'de' | 'en' => (s.einst.sprache === 'de' ? 'de' : 'en');
  const liste = $derived(zuPruefen(sa, idx));
  const weg = $derived(verworfene(sa, idx));
  let wahl = $state<Record<string, LesartStandArt | undefined>>({});
  let grund = $state<Record<string, string>>({});
  const fid = (id: string, art: string) => `fe-lp-${idx}-${id}-${art}`;

  function festhalten(id: string, nr: string) {
    const st = wahl[id];
    if (!st) { sage(L('Bitte zuerst einen Stand wählen.', 'Please choose a status first.'), 'dringend'); document.getElementById(fid(id, 'offen'))?.focus(); return; }
    aendereSequenzanalyse(sa.id, x => setzeStand(x, id, st, (grund[id] ?? '').trim(), idx, Date.now()));
    wahl[id] = undefined; grund[id] = '';
    sage(L(`Lesart ${nr}: Stand „${standWort(st, 'de')}“ an Sinneinheit ${idx + 1} festgehalten.`, `Reading ${nr}: status “${standWort(st, 'en')}” recorded at unit ${idx + 1}.`));
  }
</script>

{#if liste.length || weg.length}
  <div class="lp">
    <h3>{L('Lesarten prüfen', 'Check readings')}</h3>
    <p class="hilfe">{L(`Prüfen Sie die Lesarten früherer Sinneinheiten an Sinneinheit ${idx + 1}: Hält sie, ist sie verworfen, oder bleibt sie offen? „Hält“ ist vorläufig und kann später fallen.`, `Check the readings of earlier units against unit ${idx + 1}: does it hold, is it rejected, or does it stay open? “Holds” is provisional and may fall later.`)}</p>
    {#if liste.length}
      <ol class="liste">
        {#each liste as p (p.lesart.id)}
          {@const nr = `${p.einheit + 1}.${sa.einheiten[p.einheit]!.lesarten.indexOf(p.lesart) + 1}`}
          <li>
            <p class="titel"><strong>{L(`Lesart ${nr} (Sinneinheit ${p.einheit + 1})`, `Reading ${nr} (unit ${p.einheit + 1})`)}:</strong> {p.lesart.text}</p>
            <p class="klein">{L('Prüfkriterium: ', 'Test criterion: ')}{p.lesart.pruefung || L('(keines eingetragen)', '(none entered)')}</p>
            <p class="klein">{L('Bisher: ', 'So far: ')}{standWort(p.stand, sp())}{#if p.bei !== undefined}{L(` an Sinneinheit ${p.bei + 1}`, ` at unit ${p.bei + 1}`)}{/if}{#if p.lesart.verlauf.at(-1)?.begruendung} - {p.lesart.verlauf.at(-1)?.begruendung}{/if}</p>
            <fieldset>
              <legend>{L(`Stand von Lesart ${nr} an Sinneinheit ${idx + 1}`, `Status of reading ${nr} at unit ${idx + 1}`)}</legend>
              {#each ['haelt', 'verworfen', 'offen'] as const as st (st)}
                <label class="eigen-wahl"><input type="radio" id={fid(p.lesart.id, st)} name={fid(p.lesart.id, 'stand')} value={st} checked={wahl[p.lesart.id] === st} onchange={() => { wahl[p.lesart.id] = st; }} /> {standWort(st, sp())}</label>
              {/each}
              <label class="block" for={fid(p.lesart.id, 'grund')}>{L('Begründung', 'Reason')}</label>
              <input type="text" id={fid(p.lesart.id, 'grund')} value={grund[p.lesart.id] ?? ''} oninput={(ev) => { grund[p.lesart.id] = ev.currentTarget.value; }} />
              <button type="button" class="k" onclick={() => festhalten(p.lesart.id, nr)}>{L(`Stand von Lesart ${nr} festhalten`, `Record status of reading ${nr}`)}</button>
            </fieldset>
          </li>
        {/each}
      </ol>
    {/if}
    {#if weg.length}
      <h4>{L('Verworfene Lesarten', 'Rejected readings')}</h4>
      <ul class="weg">
        {#each weg as p (p.lesart.id)}
          <li><span class="marke">{L('verworfen', 'rejected')}</span> {L(`an Sinneinheit ${(p.bei ?? 0) + 1}`, `at unit ${(p.bei ?? 0) + 1}`)}: {p.lesart.text}{#if p.lesart.verlauf.at(-1)?.begruendung} - {L('Begründung: ', 'Reason: ')}{p.lesart.verlauf.at(-1)?.begruendung}{/if} <span class="klein">({L(`Lesart aus Sinneinheit ${p.einheit + 1}`, `reading from unit ${p.einheit + 1}`)})</span></li>
        {/each}
      </ul>
    {/if}
  </div>
{/if}

<style>
  .eigen-wahl { display: inline-flex; gap: var(--a2); align-items: center; min-height: 24px; margin-inline-end: var(--a4); }
  .lp { border: 1px solid var(--linie-stark); border-radius: var(--r-klein); padding: .5rem .75rem; display: grid; gap: .35rem; }
  h3 { margin: 0; font-size: 1.1rem; }
  h4 { margin: .5rem 0 0; font-size: 1rem; }
  .hilfe, .klein { color: var(--tinte-2); margin: 0; }
  .liste { margin: 0; padding-inline-start: 1.2rem; display: grid; gap: .75rem; }
  .titel { margin: 0; }
  fieldset { border: 1px solid var(--linie); border-radius: var(--r-klein); padding: .35rem .5rem; display: flex; flex-wrap: wrap; gap: .35rem .9rem; align-items: center; }
  legend { font-weight: 600; }
  .block { flex-basis: 100%; font-weight: 600; }
  input[type='text'] { flex-basis: 100%; box-sizing: border-box; font: inherit; padding: .35rem .5rem; border: 1px solid var(--linie-stark); border-radius: var(--r-klein); background: var(--blatt); color: var(--tinte); }
  input:focus-visible { outline: var(--fokus-outline); outline-offset: 2px; }
  .weg { margin: 0; padding-inline-start: 1.2rem; }
  .marke { font-weight: 700; }
</style>
