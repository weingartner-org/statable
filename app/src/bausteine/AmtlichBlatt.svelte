<script lang="ts">
  import { s, L, sichern, melde, type Blatt } from '../lib/sitzung.svelte';
  import { amtlichBerechnetVon, amtlichRechneNeu, amtlichWahlVon } from '../lib/amtlichblatt';
  import { fehlendeSpalten } from '../lib/blattstand';
  import { zitat } from '../i18n/profil';
  import { schliessen } from '../lib/blattentfernen.svelte';
  import { Laedt } from '../lib/laedt.svelte';
  import AmtlichAnzeige from './AmtlichAnzeige.svelte';
  import Rechnet from './Rechnet.svelte';
  import Icon from './Icon.svelte';

  /**
   * Das Blatt „Tabelle für die Veröffentlichung“ im Heft. Es speichert die Wahl (und, wenn R gerechnet hat, die Rohwerte von R); die Tabelle mit Geheimhaltung und Kennzeichnung
   * entsteht bei jedem Aufruf neu. Passt der Stand der Daten nicht mehr zur Rechnung in R, steht keine Zahl da, bis neu gerechnet ist. Ändern der Wahl: Seite #amtlich/<Blatt>.
   */
  let { blatt }: { blatt: Blatt } = $props();
  const r = $derived(amtlichBerechnetVon(blatt));
  const wahl = $derived(amtlichWahlVon(blatt));
  const fehlt = $derived(fehlendeSpalten(blatt, s));
  const lad = new Laedt();
  let fehler = $state('');
  async function neuRechnen() {
    fehler = '';
    await lad.mit(async () => {
      try {
        const g = await amtlichRechneNeu(wahl);
        (blatt.ergebnis as { r: unknown }).r = g;
        await sichern(); melde(L('Die Tabelle ist neu gerechnet.', 'The table is recalculated.'));
      } catch (e) { fehler = (e as Error).message; }
    });
  }
  /** Quelle und Fußnote stehen in der Wahl des Blatts und kommen mit in jede Ausgabe. */
  const feld = (name: 'quelle' | 'fussnote', wert: string) => { const w = (blatt.ergebnis as { wahl: Record<string, unknown> }).wahl; w[name] = wert; void sichern(); };
</script>

<div class="tisch ohne-rand"><article class="blatt" aria-labelledby="amt-t">
  <div class="blatt-kopf"><h1 id="amt-t">{blatt.titel}</h1>
    <label class="schalter"><input type="checkbox" bind:checked={blatt.imBericht} onchange={() => { void sichern(); melde(blatt.imBericht ? L('Im Bericht.', 'In the report.') : L('Nicht mehr im Bericht. Das Blatt bleibt im Heft.', 'No longer in the report. The page stays in your notebook.')); }}>{L('Im Bericht', 'In report')}</label>
    <a class="k" href="#amtlich/{blatt.id}"><Icon n="stift" />{L('Tabelle ändern', 'Change the table')}</a>
    <button class="k leise" type="button" onclick={() => (schliessen.offen = { id: blatt.id, titel: blatt.titel })}><Icon n="zu" />{L('Blatt schließen', 'Close page')}</button></div>
  {#if fehlt.length}<p class="veraltet-hinweis" role="note"><b>{L(`Es fehlt: ${fehlt.map(zitat).join(', ')}. Die Tabelle lässt sich ändern oder das Blatt schließen.`, `Missing: ${fehlt.map(zitat).join(', ')}. You can change the table or close the page.`)}</b></p>{/if}
  {#if r.art === 'ok'}
    <AmtlichAnzeige {r} />
    <section class="am-felder" aria-labelledby="am-f-t"><h2 id="am-f-t">{L('Quelle und Fußnote', 'Source and note')}</h2>
      <div class="as-feld"><label for="am-quelle">{L('Quelle', 'Source')}</label><input id="am-quelle" type="text" value={wahl.quelle} oninput={(e) => feld('quelle', e.currentTarget.value)}></div>
      <div class="as-feld"><label for="am-fuss">{L('Fußnote', 'Note')}</label><textarea id="am-fuss" rows="2" value={wahl.fussnote} oninput={(e) => feld('fussnote', e.currentTarget.value)}></textarea></div>
      <p class="am-klein">{L('Beides steht unter der Tabelle, auch in Bericht, Word, PDF und Excel.', 'Both appear below the table, also in the report, Word, PDF and Excel.')}</p></section>
  {:else if r.art === 'rechnen'}
    <p class="veraltet-hinweis" role="note"><b>{L('Neu rechnen:', 'Recalculate:')}</b> {L('Die Daten oder die Wahl haben sich seit der letzten Rechnung geändert. Bis zur neuen Rechnung steht hier keine Zahl, auch nicht im Bericht.', 'The data or the choice have changed since the last calculation. Until it is recalculated no number is shown, also not in the report.')}</p>
    <div class="knopfzeile"><button class="k haupt" type="button" aria-disabled={lad.aktiv ? 'true' : undefined} onclick={neuRechnen}>{#if lad.sichtbar}<Rechnet imKnopf />{/if}{L('Mit R neu rechnen', 'Recalculate with R')}</button></div>
    {#if lad.sichtbar}<p><Rechnet text={L('Die Tabelle wird mit R gerechnet. Beim ersten Mal wird R geladen …', 'The table is being calculated with R. The first time R is loaded …')} /></p>{/if}
  {:else if r.art === 'fehler'}<p class="am-fehler" role="alert">{r.text}</p>
  {:else}<p class="am-klein">{L('Die Wahl ist unvollständig. Über „Tabelle ändern“ ergänzen.', 'The choice is incomplete. Complete it via "Change the table".')}</p>{/if}
  {#if fehler}<p class="am-fehler" role="alert">{fehler}</p>{/if}
</article></div>

<style>
  .am-felder { margin-top: var(--a4); border-top: 1px solid var(--linie); padding-top: var(--a3); max-width: 720px; }
  .am-felder .as-feld { display: flex; flex-direction: column; gap: var(--a1); margin-bottom: var(--a3); }
  .am-felder label { font: 650 var(--gr-klein)/1.3 var(--schrift-ui); }
  .am-felder input, .am-felder textarea { width: 100%; max-width: 720px; }
  .am-felder h2 { font: 650 var(--gr-text)/1.3 var(--schrift-ui); margin-bottom: var(--a2); }
  .am-klein { color: var(--tinte-2); max-width: var(--breite-text); }
  .am-fehler { color: var(--verlust); max-width: var(--breite-text); }
</style>
