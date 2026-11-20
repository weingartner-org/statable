<script lang="ts">
  import { L, d, sichern } from '../lib/sitzung.svelte';
  import type { Blatt } from '../lib/sitzung.svelte';
  import type { Verteilung } from '../lib/ergebnis';
  import { saetzeVielfalt, vielfaltAnzeigen } from '../lib/diversitaetsaetze';
  import HilfeLink from './HilfeLink.svelte';

  /** „Wie vielfältig?“ unter der Häufigkeitstabelle (Welle S-B, Teil 5): die Zahlen stehen in der Tabelle „Wie vielfältig?“ (und im Bericht); hier stehen der Satz, der immer sagt, bei wie vielen
   *  Antworten gerechnet wurde, und die beiden Schalter: „nur besetzte Kategorien“ (statt aller möglichen Antworten, die die Wertebeschriftungen festlegen) und „Weitere Zahlen“
   *  (Gini-Simpson roh und unverzerrt, 1/Σp²). Die Wahl gehört zum Ergebnis (`e.vielfalt`). */
  let { blatt, e, melde }: { blatt: Blatt; e: Verteilung; melde: (t: string) => void } = $props();
  const kennung = $props.id();
  const anzeigen = $derived(vielfaltAnzeigen(e));
  function setze(neu: Verteilung['vielfalt'], satz: string) {
    blatt.ergebnis = { typ: 'verteilung', e: { ...e, vielfalt: neu } } as Blatt['ergebnis'];
    void sichern(); melde(satz);
  }
  function nurBesetzte(name: string, an: boolean) {
    setze({ ...e.vielfalt, nurBesetzte: { ...(e.vielfalt?.nurBesetzte ?? {}), [name]: an } }, an ? L('Es zählen nur die besetzten Kategorien.', 'Only the occupied categories count.') : L('Es zählen alle möglichen Antworten.', 'All possible answers count.'));
  }
  function mehr(an: boolean) {
    setze({ ...e.vielfalt, mehr: an }, an ? L('Weitere Zahlen stehen in der Tabelle.', 'More numbers are in the table.') : L('Weitere Zahlen sind ausgeblendet.', 'More numbers are hidden.'));
  }
</script>

{#if anzeigen.length}
  <details class="auf" style="margin-top:var(--a4)"><summary>{L('Wie vielfältig? (Verteilung der Kategorien)', 'How diverse? (distribution of the categories)')}</summary>
    {#each anzeigen as a (a.h.name)}
      {@const st = saetzeVielfalt(a)}
      <div style="margin:var(--a3) 0">
        <h3 style="font-size:var(--s-klein,.9rem);margin-bottom:var(--a2)">{a.h.name}</h3>
        <p class="ergebnis-satz">{st.haupt}</p>
        <p class="heft-text" style="margin-top:var(--a2)">{st.zusatz}</p>
        <p class="heft-text" style="margin-top:var(--a2);color:var(--tinte-2)">{st.vorsicht}</p>
        {#if a.schalterWirkt || a.nurBesetzte}
          <label class="schalter" style="margin-top:var(--a2)"><input type="checkbox" checked={a.nurBesetzte} onchange={(ev) => nurBesetzte(a.h.name, ev.currentTarget.checked)}>{L('Nur besetzte Kategorien zählen', 'Count only occupied categories')}</label>
          <p class="hilfe">{d('Die Wertebeschriftungen legen mehr mögliche Antworten fest, als in den Daten vorkommen. Normal zählen alle möglichen Antworten (der Fragebogen ist die Grundlage). Setzt du den Haken, zählen nur die Antworten, die jemand gewählt hat; IQV und J werden dann größer.', 'Die Wertebeschriftungen legen mehr mögliche Antworten fest, als in den Daten vorkommen. Normal zählen alle möglichen Antworten (der Fragebogen ist die Grundlage). Setzen Sie den Haken, zählen nur die Antworten, die jemand gewählt hat; IQV und J werden dann größer.', 'The value labels define more possible answers than occur in the data. Normally all possible answers count (the questionnaire is the basis). If you tick the box, only the answers somebody chose count; IQV and J then get larger.')}</p>
        {/if}
      </div>
    {/each}
    <label class="schalter"><input type="checkbox" checked={!!e.vielfalt?.mehr} onchange={(ev) => mehr(ev.currentTarget.checked)} aria-describedby="viel-mehr-{kennung}">{L('Weitere Zahlen zeigen (Gini-Simpson, 1/Σp²)', 'Show more numbers (Gini-Simpson, 1/Σp²)')}</label>
    <p id="viel-mehr-{kennung}" class="hilfe">{L('Gini-Simpson ist die Wahrscheinlichkeit, dass zwei zufällig gezogene Personen verschiedene Antworten haben; unverzerrt heißt: für die Stichprobe korrigiert. 1/Σp² ist die zweite effektive Kategorienzahl.', 'Gini-Simpson is the probability that two randomly drawn people have different answers; unbiased means corrected for the sample. 1/Σp² is the second effective number of categories.')} <HilfeLink id="vielfalt-diversitaet" text={L('Hilfe: Wie vielfältig?', 'Help: How diverse?')} /></p>
  </details>
{/if}
