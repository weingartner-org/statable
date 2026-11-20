<script lang="ts">
  import { ergebnisAnsage } from '../lib/ansage-ergebnis.svelte';
  /** Rechte Spalte des Raten-Rechners (Später S-F, M4): Raten mit exaktem Intervall, Ratenverhältnis (exakt bedingt), Ratendifferenz (Wald) und die Sätze. */
  import { L } from '../lib/sitzung.svelte';
  import { ganzZahl, iv } from '../i18n/profil';
  import { pWert } from '../lib/ergebnis';
  import { liesZahl } from '../lib/verteilungen';
  import { rz } from '../lib/ratenzustand.svelte';
  import { ratenRechnen } from '../lib/raten';
  import { ratenSaetze, ratenFehlerSatz, ratenZahl, verhaeltnisZahl, jahreZahl } from '../lib/ratensaetze';
    import Icon from './Icon.svelte';

  const ergebnis = $derived(ratenRechnen({
    gruppen: rz.gruppen.map(g => ({ name: g.name.trim() || '-', ereignisse: liesZahl(g.x), zeit: liesZahl(g.t) })),
    einheit: rz.einheit, je: rz.je, vergleich: rz.vergleich, niveau: rz.niveau
  }));
  const name = (i: number) => rz.gruppen[i]?.name.trim() || L(`Gruppe ${i + 1}`, `Group ${i + 1}`);
</script>

{#if !ergebnis.ok}
  <div class="banner" use:ergebnisAnsage><Icon n="hinweis" /><p>{ratenFehlerSatz(ergebnis.code, ergebnis.gruppe)}</p></div>
{:else}
  {@const e = ergebnis}
  <section class="vst-ergebnis" aria-labelledby="vr-erg-t"><h2 id="vr-erg-t">{L(`Raten je ${ganzZahl(e.je)} Personenjahre`, `Rates per ${ganzZahl(e.je)} person-years`)}</h2>
    <div class="vst-rollt"><table class="vst-tabelle" aria-label={L('Raten je Gruppe mit exaktem Intervall', 'Rates per group with exact interval')}>
      <thead><tr><th scope="col">{L('Gruppe', 'Group')}</th><th scope="col" class="zahl-sp">{L('Ereignisse', 'Events')}</th><th scope="col" class="zahl-sp">{L('Personenjahre', 'Person-years')}</th><th scope="col" class="zahl-sp">{L('Rate', 'Rate')}</th><th scope="col">{L('Exaktes Intervall', 'Exact interval')}</th></tr></thead>
      <tbody>{#each e.gruppen as g, i (i)}
        <tr><th scope="row">{name(i)}</th><td class="zahl-sp">{ganzZahl(g.ereignisse)}</td><td class="zahl-sp">{jahreZahl(g.personenjahre)}</td><td class="zahl-sp">{ratenZahl(g.rate)}</td><td>{iv(ratenZahl(g.unten), ratenZahl(g.oben))}</td></tr>
      {/each}</tbody></table></div>
  </section>

  {#if e.vergleiche.length}
    <section class="vst-block" aria-labelledby="vr-vgl-t"><h2 id="vr-vgl-t">{L(`Vergleich mit der Gruppe ${name(rz.vergleich)}`, `Comparison with group ${name(rz.vergleich)}`)}</h2>
      <div class="vst-rollt"><table class="vst-tabelle" aria-label={L('Ratenverhältnis und Ratendifferenz', 'Rate ratio and rate difference')}>
        <thead><tr><th scope="col">{L('Gruppe', 'Group')}</th><th scope="col" class="zahl-sp">{L('Ratenverhältnis', 'Rate ratio')}</th><th scope="col">{L('Exaktes Intervall', 'Exact interval')}</th><th scope="col" class="zahl-sp">p</th><th scope="col" class="zahl-sp">{L('Differenz', 'Difference')}</th><th scope="col">{L('Näherung (Wald)', 'Approximation (Wald)')}</th></tr></thead>
        <tbody>{#each e.vergleiche as v (v.gruppe)}
          <tr><th scope="row">{name(v.gruppe)}</th>
            <td class="zahl-sp">{v.rr === null ? L('nicht definiert', 'not defined') : verhaeltnisZahl(v.rr)}</td>
            <td>{v.unten === null || v.oben === null ? '-' : iv(verhaeltnisZahl(v.unten), verhaeltnisZahl(v.oben))}</td>
            <td class="zahl-sp">{v.p === null ? '-' : pWert(v.p).replace(/^= /, '')}</td>
            <td class="zahl-sp">{ratenZahl(v.diff)}</td><td>{iv(ratenZahl(v.diffUnten), ratenZahl(v.diffOben))}</td></tr>
        {/each}</tbody></table></div>
    </section>
  {/if}

  <section class="vst-block" aria-labelledby="vr-satz-t"><h2 id="vr-satz-t">{L('In Worten', 'In words')}</h2>
    {#each ratenSaetze(e) as satz}<p class="vst-zeile">{satz}</p>{/each}
  </section>
  <p class="banner ruhig vst-hinweis"><Icon n="info" /><span>{L('Das Ratenverhältnis ist exakt (wie R poisson.test), die Intervalle der Raten nach Garwood. Nur die Differenz ist eine Näherung und bei weniger als etwa 10 Ereignissen je Gruppe unsicher.', 'The rate ratio is exact (as R poisson.test), the intervals of the rates after Garwood. Only the difference is an approximation and is uncertain with fewer than about 10 events per group.')} <a href="#hilfe/verstehen-kennzahlen">{L('Mehr dazu', 'More')}</a></span></p>
{/if}
