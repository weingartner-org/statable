<script lang="ts" module>
  import type { Teil } from '../hilfe/artikel';
  /** Was der Rand von selbst zeigt, solange niemand ein Wort anklickt: die Erklärung zu dem, was im Blatt gerade passiert (09.10.). */
  export interface RandKontext { titel: string; /** Die eigene APA-Zeile zum Ergebnis im Blatt (Usability 4d); steht in der Leiste statt des Beispiels mit anderen Daten. */ apa?: string; zeile?: string; artikel?: string; teile?: Teil[]; text?: string; /** Abschnitte mit eigener Überschrift; `mehr`: Hilfe-Artikel, auf den verlinkt wird, ohne ihn am Rand zu zeigen. */ absaetze?: { titel: string; text: string }[]; mehr?: string; /** Teile, die hinter „Mehr dazu“ zugeklappt stehen (Usability Stufe 8, R11). */ mehrTeile?: Teil[]; /** Links unter den Absätzen, mit eigener Überschrift (Usability Stufe 6: „Als Nächstes“ in Lernen). */ links?: { href: string; text: string }[]; linksTitel?: string }
</script>

<script lang="ts">
  import { dp } from '../i18n/profil';
  import RandSchalter from './RandSchalter.svelte';
  import { eng } from '../lib/groesse.svelte';
  import ArtikelBloecke from './ArtikelBloecke.svelte';
  import { erklaerungen } from '../lib/texte';
  import { artikelModul } from '../hilfe/artikel-laden';
  import type { Block } from '../hilfe/kern';
  import { s, d, L, Lp, aktuelleSprache } from '../lib/sitzung.svelte';
  import Icon from './Icon.svelte';
  import Rechnet from './Rechnet.svelte';
  import BegriffsInhalt from './BegriffsInhalt.svelte';
  import { begriffe, schliesseBegriffe } from '../lib/begriffsrand.svelte';
  import { untrack } from 'svelte';
  import { verzoegert } from '../lib/laedt.svelte';
  import { dialogFokus } from './dialogFokus';
  let { schluessel = $bindable(null), extra = {}, kontext = null, mitVerlauf = true }: { mitVerlauf?: boolean; schluessel?: string | null; extra?: Record<string, { titel: string; kurz: string; beispiel: string; vorsicht: string; fachwoerter?: string; pruefen?: boolean }>; kontext?: RandKontext | null } = $props();
  const e = $derived(schluessel ? (extra[schluessel] ?? (erklaerungen() as Record<string, typeof extra[string]>)[schluessel]) : null);
  /** Die Artikel kommen erst bei Bedarf (eigener Baustein): bis sie da sind, bleibt der Rand ohne Artikelteil. */
  let bloecke = $state<Block[]>([]);
  /** Die zugeklappten Teile hinter „Mehr dazu“ (`mehrTeile`). */
  let mehrBloecke = $state<Block[]>([]);
  /** Nur beim ganzen Artikel (`alles`): welche Abschnitte offen bleiben, die übrigen klappen ein. Sonst bleibt der Rand wie er war. */
  let offen = $state<string[] | undefined>();
  /** Artikelteil wird gerade geladen (erst nach 150 ms sichtbar): die Lade-Animation steht an der Stelle des Artikelteils. */
  let artikelLaedt = $state(false);
  const artikelAnim = verzoegert(() => artikelLaedt);
  $effect(() => {
    const k = kontext, sp = aktuelleSprache();
    if (!k?.artikel || !k.teile) { bloecke = []; mehrBloecke = []; offen = undefined; artikelLaedt = false; return; }
    const { artikel, teile, mehrTeile } = k; let gilt = true;
    artikelLaedt = true;
    artikelModul(sp).then(m => { if (gilt) { bloecke = m.artikelTeile(artikel, teile, sp); mehrBloecke = mehrTeile?.length ? m.artikelTeile(artikel, mehrTeile, sp) : []; offen = teile.includes('alles') ? m.artikelOffen(artikel, sp) : undefined; } }).catch(() => { if (gilt) { bloecke = []; mehrBloecke = []; offen = undefined; } }).finally(() => { if (gilt) artikelLaedt = false; });
    return () => { gilt = false; };
  });
  /** Jede Wahl mit `data-begriff` (Knopf, Liste, Schalter) zeigt am Rand ihren Begriff (Meldung 31.10.). Am Handy ohne Fenster: Das Fenster stünde sonst bei jeder Wahl im Weg. */
  let wahl = $state<{ titel: string; bloecke: Block[] } | null>(null);
  function aufWahl(ev: Event) {
    const t = ev.target as HTMLElement | null;
    if (!t?.closest) return;
    if (t instanceof HTMLInputElement && t.type === 'checkbox' && !t.checked) return;
    const id = (t instanceof HTMLSelectElement ? t.selectedOptions[0]?.dataset.begriff : undefined) ?? t.closest<HTMLElement>('[data-begriff]')?.dataset.begriff;
    if (!id) return;
    const sp = aktuelleSprache();
    artikelModul(sp).then(m => { const bl = m.artikelTeile(id, ['kurz'], sp); if (bl.length) { schluessel = null; wahl = { titel: m.artikelKopf(id, sp), bloecke: bl }; karte?.scrollTo({ top: 0 }); } }).catch(() => {});
  }
  $effect(() => { document.addEventListener('change', aufWahl); return () => document.removeEventListener('change', aufWahl); });
  $effect(() => { void kontext?.titel; wahl = null; });
  /** Wer etwas anderes wählt (Karte, Schalter, unterstrichenes Wort), lässt die Begriffe hinter sich. */
  $effect(() => { void schluessel; void wahl; void kontext?.titel; untrack(schliesseBegriffe); });
  /** Beginnt der Artikelteil mit einer Überschrift, die so heißt wie der Titel der Leiste, entfällt sie (sonst steht sie doppelt: h2 und h3). */
  const sichtbar = $derived.by(() => {
    const f = bloecke[0], norm = (x: string) => x.trim().toLocaleLowerCase();
    return f && typeof f === 'object' && 'h' in f && kontext && norm(f.h) === norm(kontext.titel) ? bloecke.slice(1) : bloecke;
  });
  let dlg = $state<HTMLDialogElement>();
  let karte = $state<HTMLElement>();
  $effect(() => {
    if (!schluessel) return;
    if (eng(520)) dlg?.showModal(); else { karte?.focus({ preventScroll: true }); karte?.scrollTo({ top: 0 }); karte?.scrollIntoView({ block: 'nearest' }); }
  });
  /** Neuer Zusammenhang (andere Karte, anderer Schritt): oben anfangen. */
  $effect(() => { void kontext?.titel; void kontext?.zeile; void kontext?.absaetze?.[0]?.titel; karte?.scrollTo({ top: 0 }); });
</script>

{#snippet wort()}
  {#if e}
    <h2>{e.titel}</h2><p>{e.kurz}</p>
    <p class="beispiel"><b>{d('Beispiel', 'Beispiel', 'Example')}{dp()}</b> {e.beispiel}</p>
    <p class="vorsicht">{e.vorsicht}</p>
    {#if e.fachwoerter}<p class="fachwoerter"><b>{L('Fachwörter', 'Technical terms')}{dp()}</b> {e.fachwoerter}</p>{/if}
  {/if}
{/snippet}

<aside class="rand" aria-label={L('Rand: Erklärungen', 'Margin: explanations')}>
  <RandSchalter />
  <div class="notiz rand-kontext" bind:this={karte} tabindex="-1">
    {#if begriffe.stapel.length && begriffe.imRand}
      <BegriffsInhalt />
    {:else if e}
      {@render wort()}
      {#if kontext}<p><button class="k leise klein-knopf" type="button" onclick={() => (schluessel = null)}><Icon n="rueck" />{L('Zurück zur Erklärung', 'Back to the explanation')}</button></p>{/if}
    {:else if wahl}
      <h2>{wahl.titel}</h2>
      <ArtikelBloecke bloecke={wahl.bloecke} />
      {#if kontext}<p><button class="k leise klein-knopf" type="button" onclick={() => (wahl = null)}><Icon n="rueck" />{L('Zurück zur Erklärung', 'Back to the explanation')}</button></p>{/if}
    {:else if kontext}
      <h2>{kontext.titel}</h2>
      {#if kontext.zeile}<p class="rand-jetzt">{kontext.zeile}</p>{/if}
      {#if kontext.text}<p>{kontext.text}</p>{/if}
      {#each kontext.absaetze ?? [] as a (a.titel)}<h3>{a.titel}</h3><p>{a.text}</p>{/each}
      {#if kontext.links?.length}{#if kontext.linksTitel}<h3>{kontext.linksTitel}</h3>{/if}<ul class="rand-links">{#each kontext.links as l (l.href)}<li><a href={l.href}>{l.text}</a></li>{/each}</ul>{/if}
      <ArtikelBloecke bloecke={sichtbar} {offen} eigeneApa={kontext.apa} />
      {#if mehrBloecke.length}<details class="rand-mehr-teil"><summary>{L('Mehr dazu', 'More')}</summary><ArtikelBloecke bloecke={mehrBloecke} /></details>{/if}
      <p class="rand-laedt" role="status">{#if artikelAnim.an}<Rechnet text={L('Wird geladen …', 'Loading …')} />{/if}</p>
      {#if kontext.mehr}<p class="rand-mehr"><a href="#hilfe/{kontext.mehr}">{L('Ganzen Artikel in der Hilfe lesen', 'Read the full article in the help')}</a></p>{/if}
      {#if kontext.artikel && bloecke.length}<p class="rand-mehr"><a href="#hilfe/{kontext.artikel}">{L('Ganzen Artikel in der Hilfe lesen', 'Read the full article in the help')}</a></p>{/if}
    {:else}
      <h2>{L('Am Rand', 'In the margin')}</h2><p class="rand-leer">{d('Wähle eine Marke oder ein unterstrichenes Wort. Hier steht dann, was es bedeutet.', 'Wählen Sie eine Marke oder ein unterstrichenes Wort. Hier steht dann, was es bedeutet.', "Select a tag or an underlined word. Here you'll see what it means.")}</p>
    {/if}
  </div>
  <!-- Verlauf (10.10.): nur, wenn es an den Daten etwas rückgängig zu machen gibt - eine „0“ sagte nichts; in den Einstellungen nie. -->
  {#if mitVerlauf && s.verlauf.length}<div class="notiz"><p style="display:flex;gap:var(--a2)"><Icon n="rueck" /><span style="color:var(--tinte-2)">{Lp(s.verlauf.length, `1 Änderung an den Daten lässt sich rückgängig machen. Zuletzt: ${s.verlauf.at(-1)!.text}`, `${s.verlauf.length} Änderungen an den Daten lassen sich rückgängig machen. Zuletzt: ${s.verlauf.at(-1)!.text}`, `1 change to the data can be undone. Last: ${s.verlauf.at(-1)!.text}`, `${s.verlauf.length} changes to the data can be undone. Last: ${s.verlauf.at(-1)!.text}`)}</span></p></div>{/if}
</aside>
<dialog bind:this={dlg} use:dialogFokus class="blatt-unten" onclose={() => (schluessel = null)}>
  <div class="dialog-innen"><div class="dialog-kopf"><div class="notiz im-dialog">{@render wort()}</div>
    <button class="k leise nur-symbol" type="button" aria-label={L('Schließen', 'Close')} onclick={() => dlg?.close()}><Icon n="zu" /></button></div></div>
</dialog>
