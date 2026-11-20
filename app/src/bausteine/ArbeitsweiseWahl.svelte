<script lang="ts">
  /**
   * Schalter „Meine Arbeitsweise“ (Stufe A3, Fachblatt Arbeitsweisen 7, Prüfplan A-B5): ein `select` mit dem Satz „Was ändert sich?“
   * (`aria-describedby`). Nach dem Wechsel bleibt der Fokus auf dem Schalter, die Ansage nennt Arbeitsweise und Änderung.
   * Der Schalter setzt nur Voreinstellungen; Rückgängig nimmt den Wechsel zurück. Nichts wird gesperrt oder gelöscht.
   */
  import { L } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import { aendere } from '../lib/kodieren.svelte';
  import { ARBEITSWEISEN, type Arbeitsweise, type QualProjekt } from '../lib/qualprojekt';
  import { ARBEITSWEISE_TEXT, arbeitsweise, setzeArbeitsweise } from '../lib/arbeitsweise';
  import { istMac } from '../lib/kuerzel';

  interface Props {
    q: QualProjekt;
    /** nach dem Wechsel (Startansicht setzen, Einzelfall anbieten) */
    gewechselt?: (a: Arbeitsweise) => void;
  }
  let { q, gewechselt }: Props = $props();

  const akt = $derived(arbeitsweise(q));
  const name = (a: Arbeitsweise): string => L(ARBEITSWEISE_TEXT[a].name[0], ARBEITSWEISE_TEXT[a].name[1]);
  /** Auf dem Mac heißt das Kürzel Cmd+K wie im Suchknopf (Mac-Befund N3, 14.11.). */
  const satz = (a: Arbeitsweise): string => {
    const t = L(ARBEITSWEISE_TEXT[a].aenderung[0], ARBEITSWEISE_TEXT[a].aenderung[1]);
    return istMac() ? t.replace(/(Strg|Ctrl)\+K/g, 'Cmd+K') : t;
  };
  /** Hilfe je Arbeitsweise (Lehreinheiten A1 und A3) */
  const HILFE: Record<Arbeitsweise, string> = {
    allgemein: 'eh-verfahren', 'ta-reflexiv': 'eh-thematische-analyse', codebuch: 'eh-verfahren', framework: 'eh-framework-methode',
    'grounded-theory': 'eh-grounded-theory-memos', ipa: 'eh-ipa-einzelfall', sequenzanalyse: 'eh-verfahren',
  };

  function wahl(e: Event & { currentTarget: HTMLSelectElement }) {
    const a = e.currentTarget.value as Arbeitsweise;
    if (!(ARBEITSWEISEN as readonly string[]).includes(a) || a === akt) return;
    const alt = akt;
    aendere(L(`Arbeitsweise wieder „${name(alt)}“`, `Approach back to "${name(alt)}"`), q0 => setzeArbeitsweise(q0, a));
    gewechselt?.(a);
    sage(L(`Arbeitsweise: ${name(a)}. ${satz(a)}`, `Approach: ${name(a)}. ${satz(a)}`));
  }
</script>

<div class="aw">
  <label for="ko-arbeitsweise">{L('Meine Arbeitsweise (Verfahren)', 'My approach (method)')}</label>
  <select id="ko-arbeitsweise" value={akt} onchange={wahl} aria-describedby="ko-arbeitsweise-satz">
    {#each ARBEITSWEISEN as a (a)}<option value={a}>{name(a)}</option>{/each}
  </select>
  <p class="hilfe" id="ko-arbeitsweise-satz">
    {L('Was ändert sich?', 'What changes?')} {satz(akt)}
    {#if ARBEITSWEISE_TEXT[akt].quelle}<span class="quelle">({L('Quelle', 'Source')}: {ARBEITSWEISE_TEXT[akt].quelle})</span>{/if}
    {' '}<a href="#hilfe/{HILFE[akt]}">{L('Mehr dazu in der Hilfe', 'More in the help')}</a>
  </p>
</div>

<style>
  .aw { display: flex; flex-wrap: wrap; align-items: center; gap: var(--a2); }
  .aw select { min-height: 24px; max-width: 100%; }
  .hilfe { flex-basis: 100%; margin: 0; font-size: var(--gr-klein); color: var(--tinte-2); }
  .quelle { white-space: normal; }
</style>
