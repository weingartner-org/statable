<script lang="ts">
  import { rutsch } from '../lib/rutsch';
  import { tick } from 'svelte';
  import { ort, profil } from '../i18n/profil';
  import { s, d, L, melde, benenneUm, projektSpeichern, meldeGespeichert, entferneProjekt } from '../lib/sitzung.svelte';
  import { fragVorEntfernen } from '../lib/rueckfrage.svelte';
  import { zahlDe } from '../lib/format';
  import Icon from './Icon.svelte';

  /** „Zuletzt bearbeitet“: die Projekte im Browser. Höchstens fünf sichtbar, das erste ist der Hauptknopf „Weiterarbeiten“.
   *  Menü je Zeile: Umbenennen, Als Datei speichern, Aus dem Browser entfernen. */
  let { oeffne }: { oeffne: (id: string, name: string) => void } = $props();
  const MAX = 5;
  let alle = $state(false);
  let menue = $state<string | null>(null);
  let umbenennenId = $state<string | null>(null);
  let neuerName = $state('');
  const sichtbar = $derived(alle ? s.projekte : s.projekte.slice(0, MAX));

  /** "heute, 10:30" · "gestern, 18:05" · "Montag, 09:12" (diese Woche) · "28.09.2026" (älter); englisch "today, 10:35 AM" · "Oct 7, 2026" */
  const zeit = (t: number) => {
    const loc = ort(), zwoelf = new Intl.DateTimeFormat(loc, { hour: 'numeric' }).resolvedOptions().hour12 === true;
    const dt = new Date(t), uhr = dt.toLocaleTimeString(loc, { hour: zwoelf ? 'numeric' : '2-digit', minute: '2-digit' });
    const tage = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(t).setHours(0, 0, 0, 0)) / 864e5);
    if (tage === 0) return `${L('heute', 'today')}, ${uhr}`;
    if (tage === 1) return `${L('gestern', 'yesterday')}, ${uhr}`;
    if (tage < 7) return `${dt.toLocaleDateString(loc, { weekday: 'long' })}, ${uhr}`;
    return dt.toLocaleDateString(loc, profil().datum.folge === 'MTJ' ? { month: 'short', day: 'numeric', year: 'numeric' } : { day: '2-digit', month: '2-digit', year: 'numeric' });
  };
  const groesse = (b: number) => (b < 1e6 ? `${Math.max(1, Math.round(b / 1e3))} KB` : `${zahlDe(b / 1e6, 1)} MB`);
  const meta = (p: (typeof s.projekte)[number]) => [
    zeit(p.zeit),
    p.spalten !== undefined && p.faelle !== undefined ? L(`${p.spalten} Spalten × ${p.faelle} Fälle`, `${p.spalten} columns × ${p.faelle} cases`) : '',
    groesse(p.groesse)
  ].filter(Boolean).join(' · ');

  /* Menü: schließt bei Escape, Klick daneben und Fokus nach draußen. */
  let liste = $state<HTMLElement>();
  $effect(() => {
    if (menue === null) return;
    const draussen = (e: PointerEvent) => { if (!(e.target as HTMLElement).closest?.('.pl-menue-ort')) menue = null; };
    const taste = (e: KeyboardEvent) => { if (e.key === 'Escape' && menue !== null) { e.preventDefault(); const id = menue; menue = null; document.getElementById(`pl-m-${id}`)?.focus(); } };
    const wegFokus = (e: FocusEvent) => { if (e.relatedTarget && !(e.relatedTarget as HTMLElement).closest?.('.pl-menue-ort')) menue = null; };
    addEventListener('pointerdown', draussen); liste?.addEventListener('keydown', taste); liste?.addEventListener('focusout', wegFokus);
    return () => { removeEventListener('pointerdown', draussen); liste?.removeEventListener('keydown', taste); liste?.removeEventListener('focusout', wegFokus); };
  });

  async function umbenennenStart(id: string, name: string) {
    menue = null; umbenennenId = id; neuerName = name;
    await tick(); const f = document.getElementById(`pl-n-${id}`) as HTMLInputElement | null; f?.focus(); f?.select();
  }
  async function umbenennenFertig(id: string, uebernehmen: boolean) {
    if (umbenennenId !== id) return;
    umbenennenId = null;
    if (uebernehmen && neuerName.trim()) await benenneUm(id, neuerName);
    await tick(); document.getElementById(`pl-m-${id}`)?.focus();
  }
  async function alsDatei(id: string) {
    menue = null;
    const name = await projektSpeichern(id);
    if (name) meldeGespeichert(name);
  }
  async function entfernen(p: (typeof s.projekte)[number]) {
    menue = null;
    if (!(await fragVorEntfernen({ id: p.id, name: p.name, blaetter: p.blaetter }))) { document.getElementById(`pl-m-${p.id}`)?.focus(); return; }
    await entferneProjekt(p.id);
    melde(L(`„${p.name}“ ist aus dem Browser entfernt.`, `"${p.name}" was removed from the browser.`));
    await tick(); document.getElementById('weiter-t')?.focus();
  }
</script>

{#if s.projekte.length}
  <section class="pl" aria-label={L('Projektliste', 'Project list')} bind:this={liste}>
    <h2 id="weiter-t" tabindex="-1">{L('Zuletzt bearbeitet', 'Recently edited')}</h2>
    <ul>
      {#each sichtbar as p, i (p.id)}
        <li class="pl-zeile" class:erste={i === 0}>
          {#if umbenennenId === p.id}
            <Icon n="ordner" />
            <input id="pl-n-{p.id}" class="pl-name-feld" type="text" maxlength="120" autocomplete="off" aria-label={L('Neuer Name', 'New name')} bind:value={neuerName}
              onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); umbenennenFertig(p.id, true); } else if (e.key === 'Escape') { e.stopPropagation(); umbenennenFertig(p.id, false); } }}
              onblur={() => umbenennenFertig(p.id, true)}>
          {:else if i === 0}
            <Icon n="ordner" /><span class="pl-text"><b>{p.name}</b><small>{meta(p)}</small></span>
            <button class="k haupt" type="button" onclick={() => oeffne(p.id, p.name)} aria-label={L(`Weiterarbeiten an „${p.name}“`, `Continue with "${p.name}"`)}>{L('Weiterarbeiten', 'Continue')}</button>
          {:else}
            <button class="pl-oeffnen" type="button" onclick={() => oeffne(p.id, p.name)}><Icon n="ordner" /><span class="pl-text"><b>{p.name}</b><small>{meta(p)}</small></span></button>
          {/if}
          <span class="pl-menue-ort">
            <button class="k leise nur-symbol" id="pl-m-{p.id}" type="button" aria-expanded={menue === p.id} aria-haspopup="true" aria-controls="pl-feld-{p.id}"
              aria-label={L(`Weitere Aktionen für „${p.name}“`, `More actions for "${p.name}"`)} data-tipp={menue === p.id ? undefined : L('Umbenennen, speichern, entfernen', 'Rename, save, remove')}
              onclick={() => (menue = menue === p.id ? null : p.id)}><Icon n="mehr" /></button>
            {#if menue === p.id}
              <div class="pl-feld klappt" transition:rutsch id="pl-feld-{p.id}" role="group" aria-label={L(`Aktionen für „${p.name}“`, `Actions for "${p.name}"`)}>
                <button class="k leise" type="button" onclick={() => umbenennenStart(p.id, p.name)}><Icon n="stift" /><span>{L('Umbenennen', 'Rename')}</span></button>
                <button class="k leise" type="button" onclick={() => alsDatei(p.id)}><Icon n="download" /><span>{L('Als Datei speichern', 'Save as file')}</span></button>
                <button class="k leise" type="button" onclick={() => entfernen(p)}><Icon n="x" /><span>{L('Aus dem Browser entfernen', 'Remove from browser')}</span></button>
              </div>
            {/if}
          </span>
        </li>
      {/each}
    </ul>
    {#if s.projekte.length > MAX}
      <button class="k leise pl-mehr" type="button" aria-expanded={alle} onclick={() => (alle = !alle)}>{alle ? L('Weniger anzeigen', 'Show fewer') : L(`Alle anzeigen (${s.projekte.length})`, `Show all (${s.projekte.length})`)}</button>
    {/if}
    <p class="pl-hinweis">{d('Die Projekte liegen nur in diesem Browser. Mit „Als Datei speichern“ kannst du sie mitnehmen.', 'Die Projekte liegen nur in diesem Browser. Mit „Als Datei speichern“ können Sie sie mitnehmen.', 'The projects are kept only in this browser. Use "Save as file" to take them with you.')}</p>
  </section>
{/if}

<style>
  .pl { margin: 0 0 var(--a6); }
  .pl h2 { font: 650 var(--gr-text) var(--schrift-ui); color: var(--tinte-2); margin-bottom: var(--a2); }
  .pl ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--a2); }
  .pl-zeile { display: flex; align-items: center; gap: var(--a3); min-height: 56px; padding-block: var(--a1); padding-inline: var(--a4) var(--a2); border-radius: var(--r); background: var(--blatt); position: relative; }
  .pl-zeile:hover { box-shadow: var(--schatten-blatt); }
  .pl-zeile.erste { padding-top: var(--a2); padding-bottom: var(--a2); }
  .pl-oeffnen { display: flex; align-items: center; gap: var(--a3); flex: 1; min-width: 0; min-height: var(--ziel); background: none; border: 0; color: var(--tinte); font: inherit; text-align: start; cursor: pointer; padding: 0; border-radius: var(--r-klein); }
  .pl-oeffnen:focus-visible { outline: 2px solid var(--fokus); outline-offset: 2px; }
  .pl-text { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .pl-text b { white-space: normal; overflow-wrap: anywhere; }
  .pl-text small { color: var(--tinte-2); font-size: var(--gr-klein); white-space: normal; overflow-wrap: anywhere; }
  .pl-name-feld { flex: 1; min-width: 0; font: inherit; color: var(--tinte); background: var(--blatt); border: 1px solid var(--linie-stark); border-radius: var(--r-klein); min-height: var(--ziel); padding: 0 var(--a3); }
  .pl-name-feld:focus-visible { border-color: var(--fokus); }
  .pl-menue-ort { position: relative; }
  .pl-menue-ort > .k { color: var(--tinte); border: 1px solid var(--linie-stark); background: var(--blatt-gehoben, var(--blatt)); min-width: 40px; min-height: 40px; }
  .pl-menue-ort > .k:hover, .pl-menue-ort > .k[aria-expanded="true"] { border-color: var(--akzent); background: var(--akzent-hell); }
  .pl-feld { position: absolute; inset-inline-end: 0; top: calc(100% + var(--a1)); z-index: 40; width: min(17.5rem, calc(100vw - 2 * var(--a4))); padding: var(--a2); background: var(--blatt-gehoben); border: 1px solid var(--linie-stark); border-radius: var(--r); box-shadow: var(--schatten-heben); display: flex; flex-direction: column; gap: 2px; }
  .pl-feld .k { justify-content: flex-start; width: 100%; }
  .pl-feld .k span { flex: 1; text-align: start; }
  .pl-mehr { margin-top: var(--a2); }
  .pl-hinweis { margin-top: var(--a2); color: var(--tinte-2); font-size: var(--gr-klein); }
  :global(:where(:root.eng-520)) .pl-zeile.erste .k.haupt { padding: 0 var(--a3); }   /* gefühlte Breite (lib/groesse.svelte.ts) */
</style>
