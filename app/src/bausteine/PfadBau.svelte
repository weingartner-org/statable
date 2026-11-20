<script lang="ts">
  /**
   * Eigenen Lernpfad zusammenstellen: Name, links die Auswahl (Suche, einklappbare Bereiche, ganzen Pfad übernehmen), rechts „Mein Pfad“ mit Reihenfolge.
   * Ohne Ziehen und Fallenlassen: Häkchen, ↑ und ↓, damit es mit Tastatur und Screenreader geht. Gespeichert wird erst mit „Speichern“.
   */
  import { tick, untrack, onMount } from 'svelte';
  import { L, Lp, d, waehle } from '../lib/sitzung.svelte';
  import { fokusNachVerschieben } from '../lib/ordnen';
  import { EINHEITEN, PFADE, BEREICHE_LERNEN, einheitNach, type Einheit } from '../lernen/lernplan';
  import { MAX_NAME, MAX_EINHEITEN, einheitenMitFragen } from '../lernen/eigenepfade';
  import { MAX_AUTO } from '../lernen/abschlusstest';
  import { eigenerPfad, speichereEigenen, istVoll } from '../lib/eigenepfade.svelte';
  import { glatt } from '../hilfe/suche';
  import Zurueck from './Zurueck.svelte';

  /** Kennung des Pfads, der bearbeitet wird; ohne: ein neuer. */
  let { id }: { id?: string } = $props();

  onMount(() => { scrollTo(0, 0); });
  const vorhanden = untrack(() => (id ? eigenerPfad(id) : undefined));
  let name = $state(vorhanden?.name ?? '');
  let gewaehlt = $state<string[]>(vorhanden ? [...vorhanden.einheiten].filter(i => !!einheitNach(i)) : []);
  let pruefung = $state(vorhanden ? vorhanden.pruefung !== false : true);
  let suche = $state('');
  let offen = $state<Record<string, boolean>>({});
  let uebernehme = $state('');
  let status = $state('');
  let nameEl = $state<HTMLInputElement>();

  const gruppen = BEREICHE_LERNEN.map(b => ({ b, liste: EINHEITEN.filter(e => e.bereich === b.id) })).filter(g => g.liste.length);
  const titel = (e: Einheit) => waehle(e.fach);
  const hat = (i: string) => gewaehlt.includes(i);
  const zahlIn = (liste: Einheit[]) => liste.filter(e => hat(e.id)).length;

  const treffer = $derived.by(() => {
    const w = glatt(suche).split(/\s+/).filter(Boolean);
    if (!w.length) return [];
    return EINHEITEN.filter(e => { const t = glatt(`${e.fach.de} ${e.alltag.de} ${e.fach.en} ${e.alltag.en}`); return w.every(x => t.includes(x)); });
  });

  const meldung = (t: string) => { status = t; };
  const gewaehltText = () => Lp(gewaehlt.length, `${gewaehlt.length} Einheit im Pfad`, `${gewaehlt.length} Einheiten im Pfad`, `${gewaehlt.length} unit in the path`, `${gewaehlt.length} units in the path`);

  function schalte(e: Einheit) {
    if (hat(e.id)) { gewaehlt = gewaehlt.filter(i => i !== e.id); meldung(`${L('Entfernt: ', 'Removed: ')}${titel(e)}. ${gewaehltText()}.`); return; }
    if (gewaehlt.length >= MAX_EINHEITEN) { meldung(L('Mehr Einheiten passen nicht in einen Pfad.', 'No more units fit in one path.')); return; }
    gewaehlt = [...gewaehlt, e.id];
    meldung(`${L('Hinzugefügt: ', 'Added: ')}${titel(e)}. ${gewaehltText()}.`);
  }
  function fuegeHinzu(liste: Einheit[]) {
    const neu = liste.filter(e => !hat(e.id)).map(e => e.id).slice(0, Math.max(0, MAX_EINHEITEN - gewaehlt.length));
    gewaehlt = [...gewaehlt, ...neu];
    meldung(`${Lp(neu.length, `${neu.length} Einheit hinzugefügt`, `${neu.length} Einheiten hinzugefügt`, `${neu.length} unit added`, `${neu.length} units added`)}. ${gewaehltText()}.`);
  }
  function uebernimmPfad() {
    const p = PFADE.find(x => x.id === uebernehme);
    if (!p) return;
    // Mit eigener Abschlussprüfung kommt der Abschlusstest des festen Pfads nicht mit (sonst stehen am Ende zwei Tests).
    fuegeHinzu(p.einheiten.map(i => einheitNach(i)).filter((e): e is Einheit => !!e && !(pruefung && e.abschlussVon)));
    uebernehme = '';
  }
  async function verschiebe(i: number, d: -1 | 1) {
    const j = i + d;
    if (j < 0 || j >= gewaehlt.length) return;
    const a = [...gewaehlt];
    [a[i], a[j]] = [a[j]!, a[i]!];
    gewaehlt = a;
    meldung(`${titel(einheitNach(a[j]!)!)}: ${L(`Platz ${j + 1} von ${a.length}`, `position ${j + 1} of ${a.length}`)}`);
    await fokusNachVerschieben('pb:' + a[j], d, '');
  }
  async function entferne(i: number) {
    const e = einheitNach(gewaehlt[i]!)!;
    gewaehlt = gewaehlt.filter((_, k) => k !== i);
    meldung(`${L('Entfernt: ', 'Removed: ')}${titel(e)}. ${gewaehltText()}.`);
    await tick();
    (document.getElementById(`pb-weg-${gewaehlt[Math.min(i, gewaehlt.length - 1)]}`) ?? nameEl)?.focus();
  }

  const neuUndVoll = !id && istVoll();
  const kannSpeichern = $derived(name.trim().length > 0 && gewaehlt.length > 0 && !neuUndVoll);
  function speichern(ev: Event) {
    ev.preventDefault();
    if (!kannSpeichern) { meldung(!name.trim() ? L('Bitte dem Pfad einen Namen geben.', 'Please give the path a name.') : L('Bitte mindestens eine Einheit wählen.', 'Please choose at least one unit.')); if (!name.trim()) nameEl?.focus(); return; }
    const neu = speichereEigenen(name, gewaehlt, id, pruefung);
    if (neu) location.hash = `lernen/pfad/${neu}`;
  }
</script>

<div class="blatt-kopf"><h1 id="ln-t" tabindex="-1">{id ? L('Eigenen Pfad bearbeiten', 'Edit your path') : L('Eigenen Pfad erstellen', 'Create your own path')}</h1><Zurueck ziel={id ? `lernen/pfad/${id}` : 'lernen/pfad/grundlagen'} /></div>

{#if id && !vorhanden}
  <p role="status">{L('Diesen Pfad gibt es nicht (mehr).', 'This path does not exist (any more).')} <a href="#lernen/pfad/grundlagen">{L('Zu den Lernpfaden', 'To the learning paths')}</a></p>
{:else if neuUndVoll}
  <p role="status">{d('Du hast schon die höchste Zahl eigener Pfade. Lösche zuerst einen.', 'Sie haben schon die höchste Zahl eigener Pfade. Löschen Sie zuerst einen.', 'You already have the maximum number of your own paths. Delete one first.')} <a href="#lernen/pfad/grundlagen">{L('Zu den Lernpfaden', 'To the learning paths')}</a></p>
{:else}
<form class="pb" onsubmit={speichern}>
  <p class="ln-klein">{d('Wähle Einheiten aus allen Bereichen, bring sie in eine Reihenfolge und gib dem Pfad einen Namen. Du kannst ihn danach mit einem Link teilen.', 'Wählen Sie Einheiten aus allen Bereichen, bringen Sie sie in eine Reihenfolge und geben Sie dem Pfad einen Namen. Sie können ihn danach mit einem Link teilen.', 'Choose units from all areas, put them in order and give the path a name. You can then share it with a link.')}</p>
  <div class="pb-name">
    <label for="pb-name">{L('Name des Pfads', 'Name of the path')}</label>
    <input id="pb-name" type="text" maxlength={MAX_NAME} autocomplete="off" bind:value={name} bind:this={nameEl} />
  </div>

  <div class="pb-zwei">
    <section class="pb-wahl" aria-labelledby="pb-wahl-t">
      <h2 id="pb-wahl-t">{L('Einheiten wählen', 'Choose units')}</h2>
      <div class="pb-werkzeug">
        <label for="pb-suche">{L('Einheit suchen', 'Search units')}</label>
        <input id="pb-suche" type="search" autocomplete="off" bind:value={suche} />
      </div>
      <div class="pb-werkzeug">
        <label for="pb-pfad">{L('Ganzen Pfad übernehmen', 'Take over a whole path')}</label>
        <div class="pb-reihe">
          <select id="pb-pfad" bind:value={uebernehme}>
            <option value="">{L('Pfad wählen …', 'Choose a path …')}</option>
            {#each PFADE as p (p.id)}<option value={p.id}>{waehle(p.name)}</option>{/each}
          </select>
          <button type="button" class="k" disabled={!uebernehme} onclick={uebernimmPfad}>{L('Einheiten hinzufügen', 'Add the units')}</button>
        </div>
      </div>

      {#if suche.trim()}
        <h3 class="pb-klein-h">{Lp(treffer.length, `${treffer.length} Treffer`, `${treffer.length} Treffer`, `${treffer.length} result`, `${treffer.length} results`)}</h3>
        <ul class="pb-liste">
          {#each treffer as e (e.id)}
            <li><label><input type="checkbox" checked={hat(e.id)} onchange={() => schalte(e)} /><span class="ln-zeile-text"><strong>{titel(e)}</strong><span class="ln-klein">{waehle(e.alltag)}</span></span></label></li>
          {/each}
        </ul>
      {:else}
        {#each gruppen as g (g.b.id)}
          <details class="pb-bereich" bind:open={offen[g.b.id]}>
            <summary><span class="pb-bname">{waehle(g.b.name)}</span><span class="ln-klein">{L(`${zahlIn(g.liste)} von ${g.liste.length} gewählt`, `${zahlIn(g.liste)} of ${g.liste.length} chosen`)}</span></summary>
            <button type="button" class="k leise pb-alle" onclick={() => fuegeHinzu(g.liste)} disabled={zahlIn(g.liste) === g.liste.length}>{L('Alle hinzufügen', 'Add all')}<span class="nur-vorleser"> - {waehle(g.b.name)}</span></button>
            <ul class="pb-liste">
              {#each g.liste as e (e.id)}
                <li><label><input type="checkbox" checked={hat(e.id)} onchange={() => schalte(e)} /><span class="ln-zeile-text"><strong>{titel(e)}</strong><span class="ln-klein">{waehle(e.alltag)}</span></span></label></li>
              {/each}
            </ul>
          </details>
        {/each}
      {/if}
    </section>

    <section class="pb-mein" aria-labelledby="pb-mein-t">
      <h2 id="pb-mein-t">{L('Mein Pfad', 'My path')}</h2>
      <p class="ln-klein">{gewaehltText()}</p>
      {#if gewaehlt.length}
        <ol class="pb-reihenfolge">
          {#each gewaehlt as i, k (i)}
            {@const e = einheitNach(i)}
            {#if e}
              <li>
                <span class="ln-zeile-text"><strong>{k + 1}. {titel(e)}</strong><span class="ln-klein">{waehle(e.alltag)}</span></span>
                <span class="pb-knoepfe">
                  <button type="button" class="k leise" id="pb-auf-{i}" data-ord="hoch" data-ord-key="pb:{i}" disabled={k === 0} onclick={() => verschiebe(k, -1)} aria-label={`${L('Nach oben', 'Move up')}: ${titel(e)}`}>↑</button>
                  <button type="button" class="k leise" id="pb-ab-{i}" data-ord="runter" data-ord-key="pb:{i}" disabled={k === gewaehlt.length - 1} onclick={() => verschiebe(k, 1)} aria-label={`${L('Nach unten', 'Move down')}: ${titel(e)}`}>↓</button>
                  <button type="button" class="k leise" id="pb-weg-{i}" onclick={() => entferne(k)} aria-label={`${L('Entfernen', 'Remove')}: ${titel(e)}`}>✕</button>
                </span>
              </li>
            {/if}
          {/each}
        </ol>
      {:else}
        <p class="ln-hinweis">{d('Noch leer. Hake links Einheiten an.', 'Noch leer. Haken Sie links Einheiten an.', 'Still empty. Tick units on the left.')}</p>
      {/if}
    </section>
  </div>

  <div class="pb-pruefung">
    <label><input type="checkbox" bind:checked={pruefung} aria-describedby="pb-pruefung-hinweis" />{L('Abschlussprüfung aus allen Einheiten dazubauen', 'Add a final test from all units')}</label>
    <p class="ln-klein" id="pb-pruefung-hinweis">{!pruefung
      ? L('Am Ende des Pfads steht keine Prüfung.', 'There is no test at the end of the path.')
      : einheitenMitFragen(gewaehlt)
        ? L(`Am Ende des Pfads steht ein Abschlusstest: je Einheit mit Fragen eine Frage, höchstens ${MAX_AUTO}, zufällig gewählt.`, `At the end of the path there is a final test: one question per unit that has questions, at most ${MAX_AUTO}, chosen at random.`)
        : L('Keine der gewählten Einheiten hat Fragen, darum entsteht noch keine Prüfung.', 'None of the chosen units has questions, so no test is created yet.')}</p>
  </div>

  <p class="pb-status" role="status">{status}</p>
  <div class="pb-fuss">
    <button type="submit" class="k haupt" disabled={!kannSpeichern}>{L('Speichern', 'Save')}</button>
    <a class="k leise" href={id ? `#lernen/pfad/${id}` : '#lernen/pfad/grundlagen'}>{L('Abbrechen', 'Cancel')}</a>
  </div>
</form>
{/if}
