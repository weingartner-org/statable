<script lang="ts">
  /**
   * Feinstruktur-Arbeitsplatz, Ausschnitt wählen (F3B1): Name, Forschungsfrage, Beiträge von/bis, Zähler und Formhinweise.
   * Nur hier stehen Anfänge der Beiträge im DOM (zum Auswählen), vor dem Anlegen der Analyse.
   */
  import { onMount, tick } from 'svelte';
  import { L, s } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import { iv, legeSequenzanalyseAn, qualProjekt } from '../lib/interviews.svelte';
  import { cpLaenge, cpTeil } from '../lib/qualprojekt';
  import { ausschnittAusBeitraegen, ausschnittInfo, neueAnalyse } from '../lib/feinstruktur-analyse';
  import { formatZeit } from '../lib/zeitmarken';
  import FeinstrukturSpaltensatz from './FeinstrukturSpaltensatz.svelte';

  let { dokId }: { dokId: string } = $props();

  const sprache = (): 'de' | 'en' => (s.einst.sprache === 'de' ? 'de' : 'en');
  const q = $derived(qualProjekt());
  const dok = $derived(q?.dokumente.find(x => x.id === dokId));
  const abschnitte = $derived(dok?.transkript?.abschnitte ?? []);
  let name = $state('');
  let frage = $state('');
  let von = $state(0);
  let bis = $state(0);
  let fehler = $state('');
  /* A4: Spalten der Deutung (Spaltensatz) und „Folgetext verdecken“ vor dem Anlegen; Vorgabe Feinstruktur, Folgetext verdeckt */
  let satzWahl = $state('feinstruktur');
  let verdecken = $state(true);
  const istFs = $derived(satzWahl === 'feinstruktur');
  const vorgabeName = (fs: boolean, dok?: string) => fs ? L(`Feinstrukturanalyse ${dok ?? ''}`, `Fine structure analysis ${dok ?? ''}`) : L(`Sequenzanalyse ${dok ?? ''}`, `Sequential analysis ${dok ?? ''}`);
  // Ein unveränderter Vorgabe-Name folgt der Wahl des Spaltensatzes; einen eigenen Namen lässt Statable stehen
  $effect(() => { const fs = istFs; const d = dok?.name; if (name === vorgabeName(!fs, d)) name = vorgabeName(fs, d); });
  let ueberschrift: HTMLHeadingElement | undefined = $state();

  onMount(() => {
    const d = qualProjekt()?.dokumente.find(x => x.id === dokId);
    name = vorgabeName(true, d?.name);
    const ab = d?.transkript?.abschnitte ?? [];
    const erste = Math.max(0, ab.findIndex(a => d?.transkript?.sprecher.find(x => x.id === a.sprecher)?.rolle === 'befragt'));
    von = erste; bis = erste;
    void tick().then(() => ueberschrift?.focus());
  });

  function beschriftung(k: number): string {
    const a = abschnitte[k]; if (!a || !dok) return '';
    const sp = dok.transkript?.sprecher.find(x => x.id === a.sprecher)?.name;
    const anfang = cpTeil(dok.text, a.start, a.ende).replace(/\s+/g, ' ').trim();
    const kurz = cpLaenge(anfang) > 60 ? cpTeil(anfang, 0, 60) + ' ...' : anfang;
    return `${L('Beitrag', 'Contribution')} ${k + 1}${sp ? ` - ${sp}` : ''}: ${kurz}`;
  }
  const bereich = $derived.by(() => { try { return dok ? ausschnittAusBeitraegen(dok, von, bis) : null; } catch { return null; } });
  const info = $derived(dok && bereich ? ausschnittInfo(dok, bereich.start, bereich.ende, sprache(), satzWahl) : null);

  function anlegen() {
    if (!dok || !bereich) return;
    if (!name.trim()) { fehler = L('Bitte einen Namen eingeben.', 'Please enter a name.'); sage(fehler, 'dringend'); document.getElementById('fe-aus-name')?.focus(); return; }
    try {
      const sa = neueAnalyse({ dok, start: bereich.start, ende: bereich.ende, forschungsfrage: frage.trim(), name: name.trim(), jetzt: Date.now(), kodierende: q?.ich, spaltensatz: satzWahl, folgetextVerdecken: verdecken });
      legeSequenzanalyseAn(sa);
      iv.feinstruktur = sa.id;
      sage(istFs ? L('Feinstrukturanalyse angelegt. Jetzt einteilen.', 'Fine structure analysis created. Now divide.') : L('Sequenzanalyse angelegt. Jetzt einteilen.', 'Sequential analysis created. Now divide.'));
    } catch { fehler = L('Der Ausschnitt ist leer. Bitte andere Beiträge wählen.', 'The excerpt is empty. Please choose other contributions.'); sage(fehler, 'dringend'); }
  }
  function abbrechen() { iv.feinstruktur = null; }
</script>

<div class="fe">
  <h2 id="fe-aus-h" tabindex="-1" bind:this={ueberschrift}>{L('Ausschnitt für die Feinstrukturanalyse wählen', 'Choose the excerpt for the fine structure analysis')}</h2>
  {#if !dok}
    <p>{L('Das Transkript gibt es nicht mehr.', 'The transcript no longer exists.')}</p>
  {:else}
    <p>{L('Transkript: ', 'Transcript: ')}{dok.name}</p>
    <label class="feldname" for="fe-aus-name">{L('Name der Analyse', 'Name of the analysis')}</label>
    <input type="text" id="fe-aus-name" bind:value={name} />
    <label class="feldname" for="fe-aus-frage">{L('Forschungsfrage (vor dem Deuten nötig, später änderbar)', 'Research question (needed before interpreting, can be changed later)')}</label>
    <textarea id="fe-aus-frage" rows="2" bind:value={frage}></textarea>
    <label class="feldname" for="fe-aus-von">{L('Ausschnitt von Beitrag', 'Excerpt from contribution')}</label>
    <select id="fe-aus-von" bind:value={von}>{#each abschnitte as _, k (k)}<option value={k}>{beschriftung(k)}</option>{/each}</select>
    <label class="feldname" for="fe-aus-bis">{L('bis Beitrag', 'to contribution')}</label>
    <select id="fe-aus-bis" bind:value={bis}>{#each abschnitte as _, k (k)}<option value={k}>{beschriftung(k)}</option>{/each}</select>
    {#if info}
      <ul class="zaehler" aria-label={L('Umfang des Ausschnitts', 'Size of the excerpt')}>
        <li>{L(`Wörter der befragten Person: ${info.woerterBefragt}`, `Words of the interviewee: ${info.woerterBefragt}`)}</li>
        {#if info.redezeitMs !== null}<li>{L('Redezeit der befragten Person: ', 'Speaking time of the interviewee: ')}{formatZeit(info.redezeitMs, 'hms')}</li>{/if}
        <li>{L(`Zeilen (etwa): ${info.zeilen}`, `Lines (about): ${info.zeilen}`)}</li>
      </ul>
      {#each info.hinweise as h, k (k)}<p class="hinweis">{h}</p>{/each}
    {/if}
    <FeinstrukturSpaltensatz bind:wahl={satzWahl} bind:verdecken />
    {#if fehler}<p class="fehler">{fehler}</p>{/if}
    <p class="zeile">
      <button type="button" class="k haupt" onclick={anlegen} aria-disabled={bereich ? undefined : 'true'}>{istFs ? L('Feinstrukturanalyse anlegen', 'Create fine structure analysis') : L('Sequenzanalyse anlegen', 'Create sequential analysis')}</button>
      <button type="button" class="k leise" onclick={abbrechen}>{L('Abbrechen', 'Cancel')}</button>
    </p>
  {/if}
</div>

<style>
  .fe { display: flex; flex-direction: column; gap: .5rem; }
  h2 { margin: 0; font-size: 1.3rem; }
  h2[tabindex='-1']:focus { outline: none; }
  h2[tabindex='-1']:focus-visible { outline: var(--fokus-outline); outline-offset: 4px; }
  .feldname { font-weight: 600; margin-top: .5rem; }
  input[type='text'], textarea, select { width: 100%; box-sizing: border-box; font: inherit; padding: .4rem .5rem; border: 1px solid var(--linie-stark); border-radius: var(--r-klein); background: var(--blatt); color: var(--tinte); }
  :is(input, textarea, select):focus-visible { outline: var(--fokus-outline); outline-offset: 2px; }
  .zaehler { margin: .25rem 0; padding-inline-start: 1.2rem; }
  .hinweis { color: var(--tinte-2); margin: .25rem 0; }
  .fehler { color: var(--fehler, #b00020); }
  .zeile { display: flex; gap: .5rem; flex-wrap: wrap; }
</style>
