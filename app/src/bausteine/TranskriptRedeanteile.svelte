<script lang="ts">
  /**
   * Redeanteile eines Transkripts (Paket 4C-2): echte Tabelle (Spalten- und Zeilenköpfe), Satz zur Deutung, Ausgabe als Datensatz, CSV und Word.
   * Die Namen der Personen kommen nie als Code in R oder PSPP: der Datensatz geht über `oeffneNeueDaten` (Werte als Text und Zahlen).
   */
  import { tick } from 'svelte';
  import { L, melde, oeffneNeueDaten } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import { behalteInterviews } from '../lib/interviews.svelte';
  import { Laedt } from '../lib/laedt.svelte';
  import { dateiname } from '../lib/dateiname';
  import type { Dokument, Fall } from '../lib/qualprojekt';
  import { redeanteile, redeanteileCsv, redeanteileKopf, redeanteileZellen } from '../lib/redeanteile';
  import { redeanteileDatensatz, rollenName, sprechzeitMinSek, zuordnungVon } from '../lib/transkript-ansicht';
  import Rechnet from './Rechnet.svelte';

  let { dok, alle, faelle }: { dok: Dokument; alle: Dokument[]; faelle: Fall[] } = $props();
  const sprache = (): 'de' | 'en' => (L('de', 'en') === 'en' ? 'en' : 'de');
  const lade = new Laedt();

  const zeilen = $derived(redeanteile(dok, zuordnungVon(dok)));
  const kopf = $derived(redeanteileKopf(sprache()).map((k, i) => (i === 5 ? L('Sprechzeit (Min.:Sek.)', 'Speaking time (min:sec)') : k)));
  const zellen = (z: (typeof zeilen)[number]) => { const c = redeanteileZellen({ ...z, rolle: z.rolle ? rollenName(z.rolle, sprache()) : undefined }); c[5] = z.sprechzeitMs === null ? '' : sprechzeitMinSek(z.sprechzeitMs); return c; };
  const mitZeit = $derived(zeilen.some(z => z.sprechzeitMs !== null));

  async function alsCsv() {
    const { herunterladen } = await import('../lib/export');
    herunterladen(new TextEncoder().encode(redeanteileCsv(zeilen, sprache())), `${dateiname(dok.name)} - ${L('Redeanteile', 'Speaking shares')}.csv`, 'text/csv;charset=utf-8');
    sage(L('Redeanteile als CSV gespeichert.', 'Speaking shares saved as CSV.'));
  }
  async function alsWord() {
    await lade.mit(async () => {
      const [{ redeanteileWord }, { herunterladen }] = await Promise.all([import('../lib/transkript-ausgabe'), import('../lib/export')]);
      const bytes = await redeanteileWord(zeilen, dok.name, sprache());
      herunterladen(bytes, `${dateiname(dok.name)} - ${L('Redeanteile', 'Speaking shares')}.docx`, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      sage(L('Redeanteile als Word-Datei gespeichert.', 'Speaking shares saved as Word file.'));
    });
  }
  async function alsDatensatz() {
    await lade.mit(async () => {
      try {
        const t = redeanteileDatensatz(alle, faelle, sprache());
        if (!t.zeilen.length) { sage(L('Es gibt keine Redeanteile zum Öffnen.', 'There are no speaking shares to open.'), 'dringend'); return; }
        await behalteInterviews(() => oeffneNeueDaten(L('Redeanteile', 'Speaking shares'), L(`Redeanteile (${alle.length} Transkripte)`, `Speaking shares (${alle.length} transcripts)`), t.spalten, t.zeilen));
        melde(L(`Datensatz erzeugt: ${t.zeilen.length} Zeilen, eine je Dokument und Person. Sie sehen ihn jetzt in der Datenansicht.`, `Data set created: ${t.zeilen.length} rows, one per document and person. You now see it in the data view.`));
        location.hash = 'daten';   // sichtbarer Weg zum neuen Datensatz (wie bei den Assistenten)
        await tick();
      } catch (e) { melde(L(`Der Datensatz ließ sich nicht erzeugen: ${(e as Error).message}`, `The data set could not be created: ${(e as Error).message}`)); }
    });
  }
</script>

{#if zeilen.length === 0}
  <p>{L('Dieses Transkript hat keine Beiträge, also auch keine Redeanteile.', 'This transcript has no contributions, so there are no speaking shares either.')}</p>
{:else}
  <!-- svelte-ignore a11y_no_noninteractive_tabindex (scrollbarer Bereich per Tastatur erreichbar) -->
  <div class="rahmen" role="region" tabindex="0" aria-label={L('Redeanteile, seitlich scrollbar', 'Speaking shares, scrollable sideways')}>
    <table class="tab">
      <caption class="nur-vorleser">{L(`Redeanteile je Person: ${dok.name}`, `Speaking shares by person: ${dok.name}`)}</caption>
      <thead><tr>{#each kopf as k (k)}<th scope="col">{k}</th>{/each}</tr></thead>
      <tbody>
        {#each zeilen as z (z.person)}
          {@const c = zellen(z)}
          <tr><th scope="row">{c[0]}</th>{#each c.slice(1) as x, i (i)}<td>{x}</td>{/each}</tr>
        {/each}
      </tbody>
    </table>
  </div>
  {#if !mitZeit}<p class="hilfe">{L('Dieses Transkript hat nicht für alle Beiträge Zeitangaben. Darum gibt es keine Sprechzeit, nur Wörter.', 'This transcript does not have times for all contributions. So there is no speaking time, only words.')}</p>{/if}
  <p class="hilfe">{L('Redeanteile sagen, wie viel jemand spricht, nicht was. Im Interview soll die befragte Person meist deutlich mehr sprechen.', 'Speaking shares say how much someone speaks, not what is said. In an interview the interviewee usually speaks considerably more.')}</p>
  <div class="knopfzeile">
    <button class="k haupt" type="button" aria-disabled={lade.aktiv ? 'true' : undefined} onclick={() => { if (!lade.aktiv) void alsDatensatz(); }}>{L('Redeanteile als Datensatz öffnen (alle Transkripte)', 'Open speaking shares as data set (all transcripts)')}</button>
    <button class="k" type="button" onclick={() => void alsCsv()}>{L('Als CSV', 'As CSV')}</button>
    <button class="k" type="button" aria-disabled={lade.aktiv ? 'true' : undefined} onclick={() => { if (!lade.aktiv) void alsWord(); }}>{L('Als Word', 'As Word')}</button>
  </div>
  {#if lade.sichtbar}<p class="hilfe"><Rechnet text={L('Wird erzeugt …', 'Creating …')} /></p>{/if}
{/if}

<style>
  .rahmen { overflow-x: auto; }
  .rahmen:focus-visible { box-shadow: var(--fokus-ring); }
  .tab { border-collapse: collapse; width: 100%; font-size: var(--gr-klein); }
  .tab th, .tab td { text-align: start; padding: var(--a2) var(--a3); border-bottom: 1px solid var(--linie); vertical-align: middle; }
  .tab thead th { font-weight: 650; }
  .tab tbody th { font-weight: 600; }
  .hilfe { margin: var(--a2) 0; font-size: var(--gr-klein); color: var(--tinte-2); }
</style>
