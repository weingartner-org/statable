<script lang="ts">
  /** Linke Spalte des Raten-Rechners (Später S-F, M4): Gruppen mit Ereignissen und Personenzeit, Zeiteinheit, Maßstab, Niveau, Vergleichsgruppe. Rechnet nichts; das Ergebnis steht in VerstehenRatenErgebnis. */
  import { L, d } from '../lib/sitzung.svelte';
  import { ganzZahl, proz } from '../i18n/profil';
  import { rz } from '../lib/ratenzustand.svelte';
  import { MAX_GRUPPEN_RATEN, type Zeiteinheit } from '../lib/raten';
    import Icon from './Icon.svelte';

  if (!rz.gestartet) {
    rz.gestartet = true;
    rz.gruppen = [{ name: 'A', x: '11', t: '800' }, { name: 'B', x: '21', t: '3011' }];
    rz.vergleich = 1;
  }
  const EINHEITEN: { id: Zeiteinheit; text: () => string }[] = [
    { id: 'tage', text: () => L('Tage', 'Days') }, { id: 'wochen', text: () => L('Wochen', 'Weeks') }, { id: 'monate', text: () => L('Monate', 'Months') }, { id: 'jahre', text: () => L('Jahre', 'Years') }
  ];
  const MASSSTAEBE = [1, 100, 1000, 100000];
  const hinzu = () => { if (rz.gruppen.length < MAX_GRUPPEN_RATEN) rz.gruppen.push({ name: String.fromCharCode(65 + rz.gruppen.length), x: '', t: '' }); };
  const weg = (i: number) => { if (rz.gruppen.length > 1) { rz.gruppen.splice(i, 1); if (rz.vergleich >= rz.gruppen.length) rz.vergleich = 0; } };
</script>

<fieldset class="vst-gruppe"><legend>{L('2  Die Gruppen', '2  The groups')}</legend>
  <div class="vst-rollt"><table class="vst-tabelle" aria-label={L('Gruppen mit Ereignissen und Personenzeit', 'Groups with events and person-time')}>
    <thead><tr><th scope="col">{L('Name', 'Name')}</th><th scope="col">{L('Ereignisse', 'Events')}</th><th scope="col">{L('Personenzeit', 'Person-time')}</th><th scope="col"><span class="nur-vorleser">{L('Entfernen', 'Remove')}</span></th></tr></thead>
    <tbody>{#each rz.gruppen as g, i (i)}
      <tr><td><input type="text" autocomplete="off" aria-label={L(`Name der Gruppe ${i + 1}`, `Name of group ${i + 1}`)} bind:value={g.name}></td>
        <td><input type="text" inputmode="numeric" autocomplete="off" aria-label={L(`Ereignisse in Gruppe ${i + 1}`, `Events in group ${i + 1}`)} bind:value={g.x}></td>
        <td><input type="text" inputmode="decimal" autocomplete="off" aria-label={L(`Personenzeit in Gruppe ${i + 1}`, `Person-time in group ${i + 1}`)} bind:value={g.t}></td>
        <td>{#if rz.gruppen.length > 1}<button type="button" class="k leise" onclick={() => weg(i)} aria-label={L(`Gruppe ${i + 1} entfernen`, `Remove group ${i + 1}`)}><Icon n="x" /></button>{/if}</td></tr>
    {/each}</tbody></table></div>
  <div><button type="button" class="k" onclick={hinzu} disabled={rz.gruppen.length >= MAX_GRUPPEN_RATEN}><Icon n="plus" /> {L('Gruppe hinzufügen', 'Add a group')}</button></div>
  <span class="hilfe">{d('Ereignisse: wie viele Fälle eingetreten sind. Personenzeit: die Summe der tatsächlichen Beobachtungszeit aller Personen der Gruppe, nicht Personenzahl mal eine mittlere Dauer. Statable rät die Einheit der Zeit nie: wähle sie unten selbst.', 'Ereignisse: wie viele Fälle eingetreten sind. Personenzeit: die Summe der tatsächlichen Beobachtungszeit aller Personen der Gruppe, nicht Personenzahl mal eine mittlere Dauer. Statable rät die Einheit der Zeit nie: Wählen Sie sie unten selbst.', 'Events: how many cases occurred. Person-time: the sum of the actual observation time of all people in the group, not the number of people times an average duration. Statable never guesses the time unit: choose it yourself below.')}</span>
</fieldset>

<fieldset class="vst-gruppe"><legend>{L('3  Einheit, Maßstab und Vergleich', '3  Unit, scale and comparison')}</legend>
  <div class="eingabe"><span class="lbl" id="vr-einheit-l">{L('In welcher Einheit ist die Zeit angegeben?', 'In which unit is the time given?')}</span>
    <div class="segment" role="radiogroup" aria-labelledby="vr-einheit-l">{#each EINHEITEN as e}<label><input type="radio" name="vr-einheit" value={e.id} bind:group={rz.einheit}>{e.text()}</label>{/each}</div></div>
  <div class="eingabe"><span class="lbl" id="vr-je-l">{L('Raten zeigen je … Personenjahre', 'Show rates per … person-years')}</span>
    <div class="segment" role="radiogroup" aria-labelledby="vr-je-l">{#each MASSSTAEBE as m}<label><input type="radio" name="vr-je" value={m} bind:group={rz.je}>{ganzZahl(m)}</label>{/each}</div></div>
  <div class="eingabe"><span class="lbl" id="vr-niv-l">{L('Niveau der Intervalle', 'Level of the intervals')}</span>
    <div class="segment" role="radiogroup" aria-labelledby="vr-niv-l">{#each [0.9, 0.95, 0.99] as nv}<label data-begriff="vertrauensniveau"><input type="radio" name="vr-niv" value={nv} bind:group={rz.niveau}>{proz(String(Math.round(nv * 100)))}</label>{/each}</div></div>
  {#if rz.gruppen.length > 1}
    <div class="eingabe"><label for="vr-vgl">{L('Vergleichsgruppe (im Nenner des Ratenverhältnisses)', 'Reference group (denominator of the rate ratio)')}</label>
      <select id="vr-vgl" bind:value={rz.vergleich}>{#each rz.gruppen as g, i (i)}<option value={i}>{g.name || L(`Gruppe ${i + 1}`, `Group ${i + 1}`)}</option>{/each}</select></div>
  {/if}
</fieldset>
