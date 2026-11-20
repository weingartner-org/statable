<script lang="ts">
  /** Ein geteilter Pfad aus einem Link: erst Vorschau, gespeichert wird erst mit dem Knopf. Der Pfad ist danach eine eigene, bearbeitbare Kopie. */
  import { L, Lp, d, waehle } from '../lib/sitzung.svelte';
  import { einheitNach, type Einheit } from '../lernen/lernplan';
  import { dekodiere, pruefeKennungen, type Blatt } from '../lernen/eigenepfade';
  import { speichereEigenen, istVoll } from '../lib/eigenepfade.svelte';
  import Zurueck from './Zurueck.svelte';
  import Rechnet from './Rechnet.svelte';
  import { ladeKurzlink, type Geladen } from '../lib/pfadlink';
  import { verzoegert } from '../lib/laedt.svelte';

  /** `code`: langer Link (#lernen/import/<code>); `kurz`: Kurzlink (#lernen/l/<kurz>), der Pfad kommt vom Server. */
  let { code, kurz }: { code: string; kurz?: string } = $props();

  let geladen = $state<Geladen | null>(null);
  const laedt = $derived(kurz !== undefined && geladen === null);
  const anim = verzoegert(() => laedt);
  $effect(() => { if (kurz === undefined) return; let aus = false; void ladeKurzlink(kurz).then(g => { if (!aus) geladen = g; }); return () => { aus = true; }; });

  const roh = $derived(kurz === undefined ? dekodiere(code) : geladen && typeof geladen === 'object' ? geladen : null);
  const geprueft = $derived(roh ? pruefeKennungen(roh.einheiten, i => !!einheitNach(i)) : undefined);
  const liste = $derived((geprueft?.gut ?? []).map(i => einheitNach(i)).filter((e): e is Einheit => !!e));
  const fehlt = $derived(geprueft?.unbekannt.length ?? 0);
  const voll = $derived(istVoll());
  /** Übungsblatt aus dem Link (V3): gewählte Fragen, gemischt, vorgesehene Zeit. */
  const blatt = $derived<Blatt | undefined>(roh && 'blatt' in roh ? (roh.blatt as Blatt | undefined) : undefined);
  function speichern() {
    if (!roh || !liste.length) return;
    const id = speichereEigenen(roh.name, liste.map(e => e.id), undefined, roh.pruefung, blatt);
    if (id) location.hash = `lernen/pfad/${id}`;
  }
</script>

<div class="blatt-kopf"><h1 id="ln-t" tabindex="-1">{L('Geteilter Lernpfad', 'Shared learning path')}</h1><Zurueck ziel="lernen/pfad/grundlagen" /></div>

{#if laedt}
  {#if anim.an}<Rechnet text={L('Lernpfad wird geladen …', 'Loading the learning path …')} />{/if}
{:else if !roh || !liste.length}
  <p role="alert">{#if geladen === 'kein-server'}{d('Der Server von Statable ist gerade nicht erreichbar. Versuche es später noch einmal.', 'Der Server von Statable ist gerade nicht erreichbar. Versuchen Sie es später noch einmal.', 'The Statable server cannot be reached right now. Please try again later.')}{:else}{L('Dieser Link ist kaputt oder unvollständig. Bitte um einen neuen Link.', 'This link is broken or incomplete. Please ask for a new link.')}{/if} <a href="#lernen/pfad/grundlagen">{L('Zu den Lernpfaden', 'To the learning paths')}</a></p>
{:else}
  <section class="pb-vorschau" aria-labelledby="pi-name">
    <h2 id="pi-name">{roh.name}</h2>
    <p class="ln-klein">{Lp(liste.length, `${liste.length} Einheit`, `${liste.length} Einheiten`, `${liste.length} unit`, `${liste.length} units`)}. {d('Du bekommst eine Kopie, die du ändern kannst. Dein Lernstand bleibt bei den Einheiten.', 'Sie bekommen eine Kopie, die Sie ändern können. Ihr Lernstand bleibt bei den Einheiten.', 'You get a copy that you can change. Your progress stays with the units.')}</p>
    {#if blatt}<p>{Lp(blatt.fragen.length, `Mit Übungsblatt: ${blatt.fragen.length} Frage`, `Mit Übungsblatt: ${blatt.fragen.length} Fragen`, `With a practice sheet: ${blatt.fragen.length} question`, `With a practice sheet: ${blatt.fragen.length} questions`)}{#if blatt.minuten}{L(`, vorgesehen etwa ${blatt.minuten} Minuten (nur ein Hinweis).`, `, about ${blatt.minuten} minutes planned (only a guide).`)}{:else}.{/if} {L('Es steht nach den Einheiten am Ende des Pfads.', 'It comes after the units, at the end of the path.')}</p>{/if}
    {#if fehlt}<p class="ln-hinweis">{Lp(fehlt, `${fehlt} Einheit aus dem Link gibt es in dieser Fassung nicht und wird ausgelassen.`, `${fehlt} Einheiten aus dem Link gibt es in dieser Fassung nicht und werden ausgelassen.`, `${fehlt} unit from the link does not exist in this version and is left out.`, `${fehlt} units from the link do not exist in this version and are left out.`)}</p>{/if}
    <ol class="pb-reihenfolge">
      {#each liste as e, k (e.id)}<li><span class="ln-zeile-text"><strong>{k + 1}. {waehle(e.fach)}</strong><span class="ln-klein">{waehle(e.alltag)}</span></span></li>{/each}
    </ol>
    {#if voll}<p role="status">{d('Du hast schon die höchste Zahl eigener Pfade. Lösche zuerst einen.', 'Sie haben schon die höchste Zahl eigener Pfade. Löschen Sie zuerst einen.', 'You already have the maximum number of your own paths. Delete one first.')}</p>{/if}
    <div class="pb-fuss">
      <button type="button" class="k haupt" disabled={voll} onclick={speichern}>{L('In meine Pfade speichern', 'Save to my paths')}</button>
      <a class="k leise" href="#lernen/pfad/grundlagen">{L('Nicht speichern', 'Do not save')}</a>
    </div>
  </section>
{/if}
