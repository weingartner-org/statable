<script lang="ts">
  import { d, L } from '../lib/sitzung.svelte';
  import SeitenKopf from '../bausteine/SeitenKopf.svelte';
  import { sage } from '../lib/ansage';
  import { BETRAEGE, FREI_URL, ERINNERUNG_STUNDEN, erinnerungAus, erinnerungSchalten, stundenGenutzt } from '../lib/spende';
  /** Die Seite „Unterstützen" (Johannes 23.11.2026): Schalter unten auf der Startseite, die Erinnerung nach je 10 Stunden führt auch hierher.
   *  ★ Kein Versprechen am Knopf (lib/spende.ts): der Text sagt, dass Statable für alle kostenlos bleibt, und nennt keine Gegenleistung. */
  let aus = $state(erinnerungAus());
  const stunden = stundenGenutzt();
  /** Keine eigene Live-Region (Wächter lib/ansage-waechter.test.ts): die Ansage läuft über `sage`. */
  function schalten() { aus = !aus; erinnerungSchalten(aus); sage(aus ? L('Die Erinnerung ist abgeschaltet.', 'The reminder is switched off.') : L('Die Erinnerung ist eingeschaltet.', 'The reminder is switched on.'), 'hoeflich'); }
</script>

<div class="tisch ohne-rand"><section class="blatt rund recht" aria-labelledby="re-t">
  <SeitenKopf titelId="re-t" titel={L('Statable unterstützen', 'Support Statable')} zurueck />
  <p><strong>{L('Statable ist und bleibt kostenlos und werbefrei - für alle.', 'Statable is and stays free and without adverts - for everyone.')}</strong></p>
  <p>{d('Wenn Statable dir nützt, ist eine kleine Spende willkommen. Sie geht in Serverkosten und Wartung.', 'Wenn Statable Ihnen nützt, ist eine kleine Spende willkommen. Sie geht in Serverkosten und Wartung.', 'If Statable is useful to you, a small donation is welcome. It goes towards server costs and upkeep.')}</p>
  <ul class="betraege">
    {#each BETRAEGE as b (b.euro)}
      <li><a class="k" href={b.url} target="_blank" rel="noopener noreferrer">{L(`${b.euro} Euro`, `€${b.euro}`)}<span class="nur-vorleser">{L(' spenden - öffnet die Bezahlseite von Stripe in einem neuen Tab', ' donation - opens Stripe\'s payment page in a new tab')}</span></a></li>
    {/each}
    <li><a class="k" href={FREI_URL} target="_blank" rel="noopener noreferrer">{L('Betrag selbst wählen', 'Choose your own amount')}<span class="nur-vorleser">{d(' - öffnet die Bezahlseite von Stripe in einem neuen Tab; dort stellst du bei „Menge“ ein, wie viele Euro du geben möchtest', ' - öffnet die Bezahlseite von Stripe in einem neuen Tab; dort stellen Sie bei „Menge“ ein, wie viele Euro Sie geben möchten', ' - opens Stripe\'s payment page in a new tab; there, set "Quantity" to the number of euros you would like to give')}</span></a></li>
  </ul>
  <h2>{L('Erinnerung', 'Reminder')}</h2>
  <p>{L(`Nach jeweils ${ERINNERUNG_STUNDEN} Stunden aktiver Nutzung erscheint ein kleiner Hinweis auf diese Seite. Die Zeit wird nur in diesem Browser gezählt und geht an keinen Server.`, `After every ${ERINNERUNG_STUNDEN} hours of active use, a small notice points to this page. The time is counted in this browser only and goes to no server.`)}{#if stunden > 0}{' '}{L(`Bisher: ${stunden} Stunden.`, `So far: ${stunden} hours.`)}{/if}</p>
  <p class="erinnerung">
    {#if aus}{L('Die Erinnerung ist abgeschaltet.', 'The reminder is switched off.')} <button type="button" class="k" onclick={schalten}>{L('Wieder einschalten', 'Switch on again')}</button>
    {:else}{L('Die Erinnerung ist eingeschaltet.', 'The reminder is switched on.')} <button type="button" class="k" onclick={schalten}>{L('Abschalten', 'Switch off')}</button>{/if}
  </p>
  <h2>{L('Datenschutz', 'Privacy')}</h2>
  <p>{L('Bezahlt wird bei Stripe in einem neuen Tab. Statable erfährt nicht, wer zahlt, und erhält keine Zahlungsdaten.', 'Payment is made at Stripe in a new tab. Statable does not learn who pays and receives no payment data.')} <a href="#datenschutz">{L('Datenschutz', 'Privacy')}</a></p>
</section></div>

<style>
  .betraege { list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: var(--a2); margin: var(--a3) 0; }
  .recht h2 { font: 650 var(--gr-h2)/1.3 var(--schrift-ui); margin: var(--a6) 0 var(--a2); }
  .recht p { max-width: 65ch; line-height: var(--zh); margin-bottom: var(--a3); }
  .erinnerung { display: flex; flex-wrap: wrap; align-items: center; gap: var(--a2); }
</style>
