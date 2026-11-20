<script lang="ts">
  /**
   * Zwischenfazit (Feinstruktur F3B2, Fachblatt 7): erst wenn alle Sinneinheiten gedeutet sind. Deutungsmuster in ganzen Sätzen,
   * je Muster Textstellen (Sinneinheit wählen, Statable fügt Nummer und Zitat ein), Bezug zur Forschungsfrage.
   * Der einzige Vorschlag ist ein Satzanfang zur Vorläufigkeit, eingesetzt nur auf Knopfdruck - kein Inhalt.
   */
  import { L, s } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import { aendereSequenzanalyse } from '../lib/interviews.svelte';
  import type { Sequenzanalyse } from '../lib/qualprojekt';
  import { einheitSichtbar } from '../lib/feinstruktur-analyse';
  import { aendereMuster, entferneBeleg, entferneMuster, fuegeBelegHinzu, fuegeMusterHinzu, satzanfang, setzeFazitText } from '../lib/feinstruktur-pruefen';

  let { sa }: { sa: Sequenzanalyse } = $props();
  const sp = (): 'de' | 'en' => (s.einst.sprache === 'de' ? 'de' : 'en');
  const muster = $derived(sa.fazit?.muster ?? []);
  let neu = $state('');
  let wahl = $state<Record<string, string>>({});
  const nrVon = (id: string) => sa.einheiten.findIndex(e => e.id === id) + 1;
  const kurz = (t: string) => (Array.from(t).length > 60 ? Array.from(t).slice(0, 60).join('') + ' …' : t);

  function hinzu() {
    const t = neu.trim();
    if (!t) { sage(L('Bitte zuerst ein Deutungsmuster schreiben.', 'Please write a pattern first.'), 'dringend'); document.getElementById('fe-zf-neu')?.focus(); return; }
    aendereSequenzanalyse(sa.id, x => fuegeMusterHinzu(x, t, Date.now()).analyse);
    neu = ''; sage(L(`Deutungsmuster ${muster.length + 1} hinzugefügt.`, `Pattern ${muster.length + 1} added.`));
  }
  function anfang() {
    if (!neu.startsWith(satzanfang(sp()))) neu = satzanfang(sp()) + neu;
    const el = document.getElementById('fe-zf-neu') as HTMLTextAreaElement | null;
    el?.focus(); queueMicrotask(() => el?.setSelectionRange(neu.length, neu.length));
  }
  function beleg(mid: string, nr: number) {
    const k = Number(wahl[mid] ?? '');
    if (!Number.isInteger(k) || !sa.einheiten[k]) { sage(L('Bitte zuerst eine Sinneinheit wählen.', 'Please choose a unit first.'), 'dringend'); return; }
    aendereSequenzanalyse(sa.id, x => fuegeBelegHinzu(x, mid, k, Date.now()));
    sage(L(`Textstelle Sinneinheit ${k + 1} bei Deutungsmuster ${nr} eingefügt.`, `Passage unit ${k + 1} added to pattern ${nr}.`));
  }
</script>

<div class="zf">
  <h3>{L('Zwischenfazit', 'Interim conclusion')}</h3>
  <p class="hilfe">{L('Fassen Sie die Deutungsmuster in ganzen Sätzen zusammen, vorläufig formuliert. Belegen Sie jedes Muster mit Textstellen und beziehen Sie es auf die Forschungsfrage.', 'Summarise the patterns of interpretation in full sentences, phrased provisionally. Support each pattern with passages and relate it to the research question.')}</p>

  {#if muster.length}
    <ol class="muster">
      {#each muster as m, i (m.id)}
        <li>
          <label for="fe-zf-m-{m.id}">{L(`Deutungsmuster ${i + 1}`, `Pattern ${i + 1}`)}</label>
          <textarea id="fe-zf-m-{m.id}" rows="4" value={m.text} oninput={(ev) => { const v = ev.currentTarget.value; aendereSequenzanalyse(sa.id, x => aendereMuster(x, m.id, v, Date.now())); }}></textarea>
          <p class="klein">{L('Textstellen:', 'Passages:')}</p>
          {#if m.belege.length}
            <ul>
              {#each m.belege as b (b.einheit)}
                <li>{L(`Sinneinheit ${nrVon(b.einheit)}`, `Unit ${nrVon(b.einheit)}`)}: „{b.zitat}“
                  <button type="button" class="k klein leise" aria-label={L(`Textstelle Sinneinheit ${nrVon(b.einheit)} aus Deutungsmuster ${i + 1} entfernen`, `Remove passage unit ${nrVon(b.einheit)} from pattern ${i + 1}`)}
                    onclick={() => { aendereSequenzanalyse(sa.id, x => entferneBeleg(x, m.id, b.einheit, Date.now())); sage(L('Textstelle entfernt.', 'Passage removed.')); }}>{L('Entfernen', 'Remove')}</button></li>
              {/each}
            </ul>
          {:else}<p class="klein">{L('Noch keine Textstelle.', 'No passage yet.')}</p>{/if}
          <div class="zeile">
            <label for="fe-zf-w-{m.id}">{L(`Sinneinheit für Deutungsmuster ${i + 1}`, `Unit for pattern ${i + 1}`)}</label>
            <select id="fe-zf-w-{m.id}" value={wahl[m.id] ?? ''} onchange={(ev) => { wahl[m.id] = ev.currentTarget.value; }}>
              <option value="">{L('bitte wählen', 'please choose')}</option>
              {#each sa.einheiten as _, k (k)}<option value={String(k)}>{k + 1}: {kurz(einheitSichtbar(sa, k))}</option>{/each}
            </select>
            <button type="button" class="k" onclick={() => beleg(m.id, i + 1)}>{L('Textstelle einfügen', 'Insert passage')}</button>
          </div>
          <button type="button" class="k klein leise" onclick={() => { aendereSequenzanalyse(sa.id, x => entferneMuster(x, m.id, Date.now())); sage(L(`Deutungsmuster ${i + 1} gelöscht.`, `Pattern ${i + 1} deleted.`)); }}>{L(`Deutungsmuster ${i + 1} löschen`, `Delete pattern ${i + 1}`)}</button>
        </li>
      {/each}
    </ol>
  {/if}

  <label for="fe-zf-neu">{L('Neues Deutungsmuster', 'New pattern')}</label>
  <textarea id="fe-zf-neu" rows="4" bind:value={neu}></textarea>
  <p class="klein" id="fe-zf-anfang">{L(`Vorschlag nur für den Anfang, damit das Muster vorläufig klingt: „${satzanfang('de').trim()} …“. Den Inhalt schreiben Sie.`, `Suggestion for the start only, so the pattern sounds provisional: “${satzanfang('en').trim()} …”. You write the content.`)}</p>
  <div class="zeile">
    <button type="button" class="k leise" aria-describedby="fe-zf-anfang" onclick={anfang}>{L('Satzanfang einsetzen', 'Insert sentence start')}</button>
    <button type="button" class="k" onclick={hinzu}>{L('Deutungsmuster hinzufügen', 'Add pattern')}</button>
  </div>

  <label for="fe-zf-bezug">{L('Bezug zur Forschungsfrage', 'Relation to the research question')}</label>
  <p class="klein" id="fe-zf-bezug-h">{L('Forschungsfrage: ', 'Research question: ')}{sa.forschungsfrage}</p>
  <textarea id="fe-zf-bezug" rows="3" aria-describedby="fe-zf-bezug-h" value={sa.fazit?.bezugForschungsfrage ?? ''}
    oninput={(ev) => { const v = ev.currentTarget.value; aendereSequenzanalyse(sa.id, x => setzeFazitText(x, { bezugForschungsfrage: v }, Date.now())); }}></textarea>
</div>

<style>
  .zf { border: 1px solid var(--linie-stark); border-radius: var(--r-klein); padding: .5rem .75rem; display: grid; gap: .35rem; }
  h3 { margin: 0; font-size: 1.1rem; }
  .hilfe, .klein { margin: 0; color: var(--tinte-2); }
  label { font-weight: 600; }
  .muster { margin: 0; padding-inline-start: 1.2rem; display: grid; gap: .75rem; }
  .muster li { display: grid; gap: .3rem; }
  .muster ul { margin: 0; padding-inline-start: 1rem; }
  .zeile { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; }
  textarea, select { box-sizing: border-box; width: 100%; font: inherit; padding: .35rem .5rem; border: 1px solid var(--linie-stark); border-radius: var(--r-klein); background: var(--blatt); color: var(--tinte); }
  .zeile > * { min-width: 0; max-width: 100%; }
  .zeile label { flex-basis: 100%; }
  .muster li { overflow-wrap: anywhere; }
  textarea:focus-visible, select:focus-visible { outline: var(--fokus-outline); outline-offset: 2px; }
</style>
