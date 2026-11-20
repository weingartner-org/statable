<script lang="ts">
  /**
   * Deutungskarte einer Sinneinheit (Feinstruktur F3B1): je Spalte des Spaltensatzes ein Abschnitt (lib/feinstruktur-spalten.ts), nicht fest geschrieben.
   * Jeder Abschnitt: Überschrift Ebene 3, Satz „worum“, ausklappbare Leitfragen, Liste der Einträge (ändern, löschen), Feld zum Hinzufügen.
   * Kein Feld ist Pflicht. Hier steht nur Text, den die Person selbst geschrieben hat; kein Wort aus dem Ausschnitt.
   */
  import { L, s } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import { aendereSequenzanalyse, eigeneSpaltensaetze } from '../lib/interviews.svelte';
  import type { Eintrag, Lesart, Sequenzanalyse } from '../lib/qualprojekt';
  import { aendereEintrag, entferneEintrag, fuegeEintragHinzu } from '../lib/feinstruktur-analyse';
  import { eintraegeAn, satzFuer, spaltenText, type Spalte } from '../lib/feinstruktur-spalten';
  import { setzePerson } from '../lib/feinstruktur-gruppe';
  import FeinstrukturZusammenlegen from './FeinstrukturZusammenlegen.svelte';

  let { sa, idx, lesen = false, nr, person = '' }: { sa: Sequenzanalyse; idx: number; lesen?: boolean; /** bei früheren Einheiten: Nummer für den Screenreader in jeder Überschrift */ nr?: number; /** Gruppenmodus (F3c): Name der Person, die einträgt (freiwillig) */ person?: string } = $props();
  const herkunft = (e: Eintrag | Lesart): string => [e.gruppe, e.person].filter(Boolean).join(', ');
  const zusammengefuehrt = $derived(sa.herkunft?.art === 'zusammengefuehrt');

  const sprache = $derived(s.einst.sprache);
  const satz = $derived(satzFuer(sa, eigeneSpaltensaetze()));
  const einheit = $derived(sa.einheiten[idx]!);
  let neu = $state<Record<string, string>>({});
  let neuPruefung = $state<Record<string, string>>({});

  const eintraege = (sp: Spalte): (Eintrag | Lesart)[] => eintraegeAn(einheit, sp) as (Eintrag | Lesart)[];
  const pruefungVon = (e: Eintrag | Lesart): string => ('pruefung' in e ? e.pruefung : '');
  const feldId = (kennung: string, art: string) => `fe-k${idx}-${kennung}-${art}`;

  function aenderText(sp: Spalte, id: string, text: string) { aendereSequenzanalyse(sa.id, x => aendereEintrag(x, idx, sp, id, { text }, Date.now())); }
  function aenderPruefung(sp: Spalte, id: string, pruefung: string) { aendereSequenzanalyse(sa.id, x => aendereEintrag(x, idx, sp, id, { pruefung }, Date.now())); }
  function loesche(sp: Spalte, id: string, name: string, nr: number) {
    aendereSequenzanalyse(sa.id, x => entferneEintrag(x, idx, sp, id, Date.now()));
    sage(L(`${name} ${nr} gelöscht.`, `${name} ${nr} deleted.`));
  }
  function fuegeHinzu(sp: Spalte, name: string) {
    const kennung = sp.kennung;
    const t = (neu[kennung] ?? '').trim();
    if (!t) { sage(L('Bitte zuerst etwas eintragen.', 'Please enter something first.'), 'dringend'); document.getElementById(feldId(kennung, 'neu'))?.focus(); return; }
    const p = (neuPruefung[kennung] ?? '').trim();
    aendereSequenzanalyse(sa.id, x => { const r = fuegeEintragHinzu(x, idx, sp, t, Date.now(), p); return person.trim() ? setzePerson(r.analyse, idx, sp, r.id, person, Date.now()) : r.analyse; });
    neu[kennung] = ''; neuPruefung[kennung] = '';
    sage(L(`${name} hinzugefügt.`, `${name} added.`));
    document.getElementById(feldId(kennung, 'neu'))?.focus();
  }
</script>

<div class="karte">
  {#each satz.spalten as sp (sp.kennung)}
    {@const name = spaltenText(sp.eintragName, sprache)}
    {@const liste = eintraege(sp)}
    <section class="spalte" aria-label={spaltenText(sp.name, sprache)}>
      <h3>{spaltenText(sp.name, sprache)}{#if nr}<span class="nur-sr">{L(` - Sinneinheit ${nr}`, ` - unit ${nr}`)}</span>{/if}</h3>
      {#if spaltenText(sp.worum, sprache)}<p class="worum">{spaltenText(sp.worum, sprache)}</p>{/if}
      {#if !lesen && sp.leitfragen.length}
        <details class="leit">
          <summary>{L('Leitfragen', 'Guiding questions')}</summary>
          <ul>{#each sp.leitfragen as lf, i (i)}<li>{spaltenText(lf, sprache)}</li>{/each}</ul>
        </details>
      {/if}
      {#if liste.length}
        <ol class="eintraege">
          {#each liste as e, i (e.id)}
            <li>
              {#if lesen}
                <span>{e.text}</span>{#if herkunft(e)} <span class="herkunft">({herkunft(e)})</span>{/if}{#if sp.mitPruefung && pruefungVon(e)}<br /><span class="para">{L('Prüfkriterium: ', 'Test criterion: ')}{pruefungVon(e)}</span>{/if}
              {:else}
                <div class="zeile">
                  <input type="text" value={e.text} aria-label="{name} {i + 1}{herkunft(e) ? ` (${herkunft(e)})` : ''}" oninput={(ev) => aenderText(sp, e.id, ev.currentTarget.value)} />
                  <button type="button" class="k klein leise" aria-label={L(`${name} ${i + 1} löschen`, `Delete ${name} ${i + 1}`)} onclick={() => loesche(sp, e.id, name, i + 1)}>{L('Löschen', 'Delete')}</button>
                </div>
                {#if herkunft(e)}<span class="herkunft" aria-hidden="true">{herkunft(e)}</span>{/if}
                {#if sp.mitPruefung}
                  <input type="text" class="pruef" value={pruefungVon(e)} aria-label={L(`Prüfkriterium zu ${name} ${i + 1}: Was müsste später vorkommen, was dürfte nicht?`, `Test criterion for ${name} ${i + 1}: what would have to appear later, what must not?`)}
                    oninput={(ev) => aenderPruefung(sp, e.id, ev.currentTarget.value)} />
                {/if}
              {/if}
            </li>
          {/each}
        </ol>
        {#if zusammengefuehrt && !lesen && liste.length >= 2}<FeinstrukturZusammenlegen {sa} {idx} feld={sp} {name} {liste} mitPruefung={!!sp.mitPruefung} />{/if}
      {:else}
        <p class="leer">{L('Noch kein Eintrag.', 'No entry yet.')}</p>
      {/if}
      {#if !lesen}
        <div class="neu">
          <label for={feldId(sp.kennung, 'neu')}>{L(`${name}: neuer Eintrag`, `${name}: new entry`)}</label>
          <input type="text" id={feldId(sp.kennung, 'neu')} value={neu[sp.kennung] ?? ''} oninput={(ev) => { neu[sp.kennung] = ev.currentTarget.value; }}
            onkeydown={(ev) => { if (ev.key === 'Enter') { ev.preventDefault(); fuegeHinzu(sp, name); } }} />
          {#if sp.mitPruefung}
            <label for={feldId(sp.kennung, 'neu-pruef')}>{L('Prüfkriterium: Was müsste später vorkommen, was dürfte nicht?', 'Test criterion: what would have to appear later, what must not?')}</label>
            <input type="text" id={feldId(sp.kennung, 'neu-pruef')} value={neuPruefung[sp.kennung] ?? ''} oninput={(ev) => { neuPruefung[sp.kennung] = ev.currentTarget.value; }} />
          {/if}
          <button type="button" class="k" onclick={() => fuegeHinzu(sp, name)}>{L(`${name} hinzufügen`, `Add ${name}`)}</button>
        </div>
      {/if}
    </section>
  {/each}
</div>

<style>
  .karte { display: flex; flex-direction: column; gap: var(--a3); }
  .spalte { border-top: 1px solid var(--linie-stark); padding-top: var(--a2); }
  h3 { margin: 0 0 .25rem; font-size: 1.05rem; }
  .worum { margin: .25rem 0; color: var(--tinte-2); }
  .leit { margin: .25rem 0; }
  .leit summary { cursor: pointer; }
  .eintraege { margin: .5rem 0; padding-inline-start: 1.4rem; display: grid; gap: .5rem; }
  .zeile { display: flex; gap: .5rem; align-items: center; }
  .zeile input { flex: 1; }
  .pruef { margin-top: .25rem; width: 100%; }
  input[type='text'] { box-sizing: border-box; font: inherit; padding: .35rem .5rem; border: 1px solid var(--linie-stark); border-radius: var(--r-klein); background: var(--blatt); color: var(--tinte); width: 100%; }
  input[type='text']:focus-visible { outline: var(--fokus-outline); outline-offset: 2px; }
  .neu { display: grid; gap: .35rem; justify-items: start; }
  .neu label { font-weight: 600; }
  .para, .leer, .herkunft { color: var(--tinte-2); }
  .herkunft { font-size: .9em; }
  .nur-sr { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
</style>
