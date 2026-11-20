<script lang="ts">
  /**
   * Übersicht der Feinstrukturanalyse (F3B2): alle sichtbaren Sinneinheiten als echte Tabelle, Spalten aus dem Spaltensatz
   * (lib/feinstruktur-spalten.ts), Stand je Einheit, Lesarten mit ihrem Stand (verworfene sichtbar), Zwischenreflexionen, Formhinweise.
   * Nicht vorauslesen: in Phase Deuten nur bis zur aktuellen Einheit (`uebersicht`, `sichtbarBis`).
   */
  import { L, s } from '../lib/sitzung.svelte';
  import type { Lesart, Sequenzanalyse } from '../lib/qualprojekt';
  import { satzFuer, spaltenText } from '../lib/feinstruktur-spalten';
  import { eigeneSpaltensaetze } from '../lib/interviews.svelte';
  import { formhinweise, reflexionNach, reflexionsStellen, sichtbarBis, standVon, standWort, uebersicht } from '../lib/feinstruktur-pruefen';

  let { sa }: { sa: Sequenzanalyse } = $props();
  const sp = (): 'de' | 'en' => (s.einst.sprache === 'de' ? 'de' : 'en');
  const eigene = $derived(eigeneSpaltensaetze());
  const satz = $derived(satzFuer(sa, eigene));
  const zeilen = $derived(uebersicht(sa, eigene));
  const bis = $derived(sichtbarBis(sa));
  const hinweise = $derived(formhinweise(sa, sp(), eigene));
  const stellen = $derived(reflexionsStellen(sa).filter(k => k <= bis));
  const nrVon = (id: string) => sa.einheiten.findIndex(e => e.id === id) + 1;
  const istLesart = (e: object): e is Lesart => 'verlauf' in e;
</script>

<div class="ub">
  <!-- svelte-ignore a11y_no_noninteractive_tabindex (rollbare Tabelle muss per Tastatur erreichbar sein, axe scrollable-region-focusable) -->
  <div class="rollen" role="region" aria-labelledby="fe-ub-cap" tabindex="0">
    <table>
      <caption id="fe-ub-cap">{bis < sa.einheiten.length - 1
        ? L(`Übersicht der Sinneinheiten 1 bis ${bis + 1}`, `Overview of units 1 to ${bis + 1}`)
        : L(`Übersicht aller ${sa.einheiten.length} Sinneinheiten`, `Overview of all ${sa.einheiten.length} units`)}</caption>
      <thead>
        <tr>
          <th scope="col">{L('Nr.', 'No.')}</th>
          <th scope="col">{L('Sinneinheit', 'Unit')}</th>
          {#each satz.spalten as x (x.kennung)}<th scope="col">{spaltenText(x.name, s.einst.sprache)}</th>{/each}
          <th scope="col">{L('Stand', 'Status')}</th>
        </tr>
      </thead>
      <tbody>
        {#each zeilen as z (z.einheit.id)}
          <tr>
            <th scope="row">{z.nr}</th>
            <td class="text">{z.text}</td>
            {#each z.spalten as c (c.kennung)}
              <td>
                {#if c.eintraege.length}
                  <ul>
                    {#each c.eintraege as e (e.id)}
                      <li>{e.text}{#if istLesart(e)}{@const st = standVon(e)}{@const v = e.verlauf.at(-1)}
                        <br /><span class="klein">{L('Prüfkriterium: ', 'Test criterion: ')}{e.pruefung || '-'}</span>
                        <br /><span class="stand" class:weg={st === 'verworfen'}>{standWort(st, sp())}{#if v}{L(` an Sinneinheit ${nrVon(v.beiEinheit)}`, ` at unit ${nrVon(v.beiEinheit)}`)}{/if}</span>
                      {/if}</li>
                    {/each}
                  </ul>
                {:else}<span class="klein">-</span>{/if}
              </td>
            {/each}
            <td>{z.einheit.gedeutet ? L('gedeutet', 'interpreted') : L('in Arbeit', 'in progress')}{#if z.einheit.uebernommenVon}<br /><span class="klein">{L(`Deutung aus Sinneinheit ${nrVon(z.einheit.uebernommenVon)} übernommen`, `interpretation taken from unit ${nrVon(z.einheit.uebernommenVon)}`)}</span>{/if}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  {#if stellen.length}
    <h4>{L('Zwischenreflexionen', 'Interim reflections')}</h4>
    <ul class="zr">
      {#each stellen as k (k)}
        {@const r = reflexionNach(sa, k)}
        <li>
          <strong>{L(`Nach Sinneinheit ${k + 1}:`, `After unit ${k + 1}:`)}</strong>
          {#if r}
            <dl>
              <dt>{L('Begriffe und Spuren', 'Terms and traces')}</dt><dd>{r.begriffe || '-'}</dd>
              <dt>{L('Bisher gefunden', 'Found so far')}</dt><dd>{r.bisher || '-'}</dd>
              <dt>{L('Noch zu prüfen', 'Still to check')}</dt><dd>{r.pruefen || '-'}</dd>
            </dl>
          {:else}{L('fehlt', 'missing')}{/if}
        </li>
      {/each}
    </ul>
  {/if}

  {#if hinweise.length}
    <h4>{L('Hinweise zur Form', 'Notes on form')}</h4>
    <p class="klein">{L('Nur zur Form, nie zum Inhalt. Kein Feld ist Pflicht.', 'Only about form, never about content. No field is required.')}</p>
    <ul>{#each hinweise as h, i (i)}<li>{h}</li>{/each}</ul>
  {/if}
</div>

<style>
  .ub { display: grid; gap: .5rem; }
  .rollen { overflow-x: auto; }
  .rollen:focus-visible { outline: var(--fokus-outline); outline-offset: 2px; }
  table { border-collapse: collapse; font-size: .92rem; min-width: 100%; }
  caption { text-align: start; font-weight: 700; padding: .25rem 0; }
  th, td { border: 1px solid var(--linie-stark); padding: .3rem .4rem; vertical-align: top; text-align: start; }
  thead th { background: var(--blatt-2); }
  td ul { margin: 0; padding-inline-start: 1rem; }
  .text { font-weight: 600; min-width: 8rem; }
  .klein { color: var(--tinte-2); }
  .stand { font-weight: 600; }
  .stand.weg { color: var(--tinte-2); }
  h4 { margin: .5rem 0 0; }
  dl { margin: .25rem 0; }
  dt { font-weight: 600; }
  dd { margin: 0 0 .25rem 1rem; }
</style>
