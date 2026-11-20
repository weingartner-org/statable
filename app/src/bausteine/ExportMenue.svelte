<script lang="ts" module>
  export interface ExportEintrag { id: string; /** Überschrift der Gruppe, zu der der Eintrag gehört (aufeinanderfolgende Einträge mit gleicher Gruppe stehen zusammen). */ gruppe?: string; text: string; icon?: string; tun: () => void | Promise<void>; /** Auswahl-Menü: gewählt ja/nein (Häkchen, menuitemradio) */ an?: boolean; /** kleine Farbmuster vor dem Text */ muster?: string[]; /** Ankreuz-Eintrag (Schalter, menuitemcheckbox): ja/nein mit Häkchen */ pruef?: boolean }
</script>
<script lang="ts">
  import { tick } from 'svelte';
  import { L } from '../lib/sitzung.svelte';
  import Icon from './Icon.svelte';
  import Rechnet from './Rechnet.svelte';
  import { Laedt } from '../lib/laedt.svelte';
  import { zaehle } from '../lib/zaehlen';

  /** Ein Knopf „Export ▾“ mit Menü (Popover, liegt über allem und wird von rollbaren Rahmen nicht abgeschnitten).
   *  Tastatur: Enter, Leertaste oder Pfeil unten öffnet; Pfeile, Pos1/Ende wandern; Esc schließt und gibt den Fokus zurück. */
  let { eintraege, name, haupt = false, beschriftung, klein = false, nurSymbol = false, tipp, symbol = 'download', art = L('Export', 'Export') }: { eintraege: ExportEintrag[]; name: string; haupt?: boolean; beschriftung?: string; klein?: boolean; nurSymbol?: boolean; tipp?: string; symbol?: string; art?: string } = $props();
  let offen = $state(false), knopf = $state<HTMLButtonElement>(), menue = $state<HTMLElement>();
  /** Einträge in Gruppen mit Überschrift zerlegen (ohne `gruppe` bleibt die Liste flach wie bisher). */
  const gruppiert = $derived.by(() => {
    const aus: { name?: string; eintraege: ExportEintrag[] }[] = [];
    for (const e of eintraege) { const l = aus.at(-1); if (l && l.name === e.gruppe) l.eintraege.push(e); else aus.push({ name: e.gruppe, eintraege: [e] }); }
    return aus;
  });
  const uid = `em-${Math.random().toString(36).slice(2, 8)}`;

  function lage() {
    if (!knopf || !menue) return;
    const r = knopf.getBoundingClientRect(), br = menue.offsetWidth, hoch = menue.offsetHeight;
    const links = Math.max(8, Math.min(r.right - br, innerWidth - br - 8));
    const unten = r.bottom + 4 + hoch > innerHeight && r.top - 4 - hoch > 0;
    // Lange Menüs (gruppiertes „Daten bearbeiten“) bleiben im sichtbaren Bereich und rollen darin.
    const top = Math.max(8, Math.min(unten ? r.top - 4 - hoch : r.bottom + 4, innerHeight - hoch - 8));
    menue.style.left = `${links}px`; menue.style.top = `${top}px`;
  }
  async function auf(ziel: 'erste' | 'letzte' = 'erste') {
    offen = true; await tick(); menue?.showPopover(); lage();
    const punkte = [...menue!.querySelectorAll<HTMLElement>('[role^="menuitem"]')];
    (ziel === 'erste' ? punkte[0] : punkte.at(-1))?.focus();
  }
  function zu(fokus = true) { if (menue?.matches(':popover-open')) menue.hidePopover(); offen = false; if (fokus) knopf?.focus(); }
  function knopfTaste(e: KeyboardEvent) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); void auf(e.key === 'ArrowUp' ? 'letzte' : 'erste'); }
  }
  function menueTaste(e: KeyboardEvent) {
    const punkte = [...menue!.querySelectorAll<HTMLElement>('[role^="menuitem"]')], i = punkte.indexOf(document.activeElement as HTMLElement);
    const geh = (k: number) => { e.preventDefault(); punkte[(k + punkte.length) % punkte.length]?.focus(); };
    if (e.key === 'ArrowDown') geh(i + 1); else if (e.key === 'ArrowUp') geh(i - 1);
    else if (e.key === 'Home') geh(0); else if (e.key === 'End') geh(punkte.length - 1);
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); zu(); }
    else if (e.key === 'Tab') zu(false);
  }
  /** Nachladen + Erzeugen (Excel, Word, PDF, Bild …) kann beim ersten Mal Sekunden dauern: Animation im Knopf, Knopf gesperrt (Regel „Nachladen = Animation“). */
  const lad = new Laedt();
  async function waehle(e: ExportEintrag) { zu(); if (e.an === undefined && e.pruef === undefined) zaehle('export', e.id); await lad.mit(() => e.tun()); }
  // Popover schließt von selbst (Klick daneben): Zustand nachführen, Fokus nur zurückgeben, wenn er im Menü lag.
  let zuZeit = 0;
  function umgeschaltet(ev: Event) { if ((ev as ToggleEvent).newState === 'closed') { offen = false; zuZeit = Date.now(); } }
  // Ein Klick auf den Knopf schließt das offene Menü schon beim Drücken (Klick daneben); er darf es nicht gleich wieder öffnen.
  function umschalten() { if (lad.aktiv) return; if (offen) zu(); else if (Date.now() - zuZeit > 250) void auf(); }
</script>

<span class="em">
  <button class="k" class:leise={!nurSymbol} class:export-symbol={nurSymbol} class:haupt class:klein class:nur-symbol={nurSymbol} type="button" bind:this={knopf} data-tipp={tipp ?? L('Speichern oder kopieren, je nach Inhalt als Word, Excel, PDF oder Bild', 'Save or copy, depending on the content as Word, Excel, PDF or image')} aria-haspopup="menu" aria-expanded={offen} aria-controls={offen ? uid : undefined}
    aria-label={art ? `${art}: ${name}` : name} aria-disabled={lad.aktiv ? 'true' : undefined} onclick={umschalten} onkeydown={knopfTaste}>
    {#if lad.sichtbar}<Rechnet imKnopf />{:else}<Icon n={symbol} />{/if}{#if !nurSymbol}<span>{beschriftung ?? art}</span>{" "}<span class="pfeil" aria-hidden="true">▾</span>{/if}</button><span class="nur-vorleser" role="status">{lad.sichtbar ? L('Wird geladen …', 'Loading …') : ''}</span>
  <div id={uid} class="em-menue" role="menu" tabindex="-1" popover="auto" aria-label={name} bind:this={menue} onkeydown={menueTaste} ontoggle={umgeschaltet}>
    {#snippet punkt(e: ExportEintrag)}
      {#if e.an !== undefined}
        <button class="em-punkt" type="button" role="menuitemradio" aria-checked={e.an} tabindex="-1" onclick={() => waehle(e)}><span class="haken" aria-hidden="true">{#if e.an}<Icon n="haken" />{/if}</span>{#if e.muster}<span class="muster" aria-hidden="true">{#each e.muster as m}<i style:background={m}></i>{/each}</span>{/if}<span>{e.text}</span></button>
      {:else if e.pruef !== undefined}
        <button class="em-punkt" type="button" role="menuitemcheckbox" aria-checked={e.pruef} tabindex="-1" onclick={() => waehle(e)}><span class="haken" aria-hidden="true">{#if e.pruef}<Icon n="haken" />{/if}</span><span>{e.text}</span></button>
      {:else}
        <button class="em-punkt" type="button" role="menuitem" tabindex="-1" onclick={() => waehle(e)}><Icon n={e.icon ?? 'download'} /><span>{e.text}</span></button>
      {/if}
    {/snippet}
    {#if offen}{#each gruppiert as g, gi (gi)}
      {#if g.name}<div class="em-gruppe" role="group" aria-label={g.name}><span class="em-kopf" aria-hidden="true">{g.name}</span>{#each g.eintraege as e (e.id)}{@render punkt(e)}{/each}</div>
      {:else}{#each g.eintraege as e (e.id)}{@render punkt(e)}{/each}{/if}
    {/each}{/if}
  </div>
</span>

<style>
  .em { display: inline-flex; }
  .export-symbol { color: var(--akzent-tinte); }
  .pfeil { font-size: .8em; opacity: .7; }
  .em-menue { max-height: calc(100vh - 16px); overflow-y: auto; position: fixed; inset: auto; margin: 0; padding: var(--a1, 4px); min-width: 15rem; max-width: calc(100vw - 16px); background: var(--blatt-gehoben); color: var(--tinte); border: 1px solid var(--linie-stark); border-radius: var(--r); box-shadow: var(--schatten-heben); }
  .em-menue:not(:popover-open) { display: none; }
  .em-menue:popover-open { display: flex; flex-direction: column; gap: 2px; }
  .em-punkt { display: flex; align-items: center; gap: var(--a2); width: 100%; padding: var(--a2) var(--a3); background: none; border: 0; border-radius: calc(var(--r) - 2px); color: inherit; font: inherit; text-align: start; cursor: pointer; }
  .em-punkt:hover, .em-punkt:focus-visible { background: var(--akzent-hell); }
  .em-gruppe { display: flex; flex-direction: column; gap: 2px; padding-top: var(--a1); border-top: 1px solid var(--linie); margin-top: var(--a1); }
  .em-gruppe:first-child { border-top: 0; margin-top: 0; padding-top: 0; }
  .em-kopf { padding: var(--a1) var(--a3); font-size: var(--gr-klein); font-weight: 600; color: var(--tinte-2); }
  .haken { display: inline-flex; width: 18px; flex: none; color: var(--akzent-tinte); }
  .muster { display: inline-flex; flex: none; gap: 2px; }
  .muster i { width: 10px; height: 16px; border-radius: 3px; border: 1px solid var(--linie); }
</style>
