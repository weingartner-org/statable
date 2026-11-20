<script lang="ts">
  import { rutsch } from '../lib/rutsch';
  import { onMount, tick } from 'svelte';
  import { d, s, L, Lp, waehle, aktuelleSprache, meldeFehler } from '../lib/sitzung.svelte';
  import { beispieleFuerHilfe } from '../hilfe/artikel-beispiele';
  import { BEISPIELE, type Beispiel } from '../lib/beispiele';
  import { oeffneBeispielDirekt } from '../lib/beispieloeffnen';
  import { sage } from '../lib/ansage';
  import { hilfeBezug } from '../lib/hilfebezug';
  import type { Sprache } from '../i18n/laufzeit';
  import { richtung } from '../i18n/profil';
  import { BEREICHE, type Artikel, type Bereich } from '../hilfe/kern';
  import { artikelModul } from '../hilfe/artikel-laden';
  import Rechnet from '../bausteine/Rechnet.svelte';
  import { verzoegert } from '../lib/laedt.svelte';
  import { suche, VORSCHLAEGE } from '../hilfe/suche';
  import SeitenKopf from '../bausteine/SeitenKopf.svelte';
  import Icon from '../bausteine/Icon.svelte';
  import { trefferAbschnitte } from '../hilfe/aufklappen';
  import Sprachteile from '../bausteine/Sprachteile.svelte';
  import ArtikelBloecke from '../bausteine/ArtikelBloecke.svelte';
  import Marke from '../bausteine/Marke.svelte';
  import PlakatLink from '../bausteine/PlakatLink.svelte';
  import { themaFuerHilfe } from '../lernen/fragen';
  import { probierenFuerHilfe } from '../lernen/probierziele';
  import RandSchalter from '../bausteine/RandSchalter.svelte';
  import BegriffsInhalt from '../bausteine/BegriffsInhalt.svelte';
  import { begriffe } from '../lib/begriffsrand.svelte';
  import { zaehleEinmal } from '../lib/zaehlen';
  import { kuerzelText } from '../lib/kuerzel';

  /** Die Hilfe-App: Suche oben, Inhalt nach Bereichen links, Artikel rechts. `id` kommt aus `#hilfe/<id>`. */
  let { id = '' }: { id?: string } = $props();

  /** Die Artikel (rund 200 KB) werden erst beim Öffnen der Hilfe geladen, in einer fremden Sprache samt ihrer Übersetzungen. */
  let modul = $state<typeof import('../hilfe/artikel')>();
  /** Sprache, für die alles geladen ist: bis die neue Sprache da ist, bleibt die Liste der bisherigen stehen. */
  let geladenFuer = $state<Sprache>();
  let ladefehler = $state(false);
  const animAn = verzoegert(() => !modul && !ladefehler);
  const lade = () => { ladefehler = false; const sp = aktuelleSprache(); artikelModul(sp).then(m => { modul = m; geladenFuer = sp; }, () => (ladefehler = true)); };
  $effect(() => { void aktuelleSprache(); lade(); });
  const liste = $derived(modul && geladenFuer ? modul.artikelListe(geladenFuer) : []);
  const artikel = $derived(liste.find(a => a.id === id));
  const b = $derived(s.einst.bezuege ?? {});
  const bezug = $derived(artikel && (b.excel || b.ti84 || b.spss || b.r || b.jamovi || b.stata) ? hilfeBezug(artikel.id) : null);
  const bezugNamen = $derived([b.excel ? 'Excel' : '', b.ti84 ? 'TI-84' : '', b.spss ? 'SPSS' : '', b.r ? 'R' : '', b.jamovi ? 'jamovi' : '', b.stata ? 'Stata' : ''].filter(Boolean).join(', '));
  const unbekannt = $derived(!!modul && !!id && !artikel);
  const bereichName = (b: Bereich) => { const x = BEREICHE.find(y => y.id === b)!; return waehle(x.name); };
  const inBereich = (b: Bereich) => liste.filter(a => a.bereich === b);
  /** Begriffe A-Z sind rund 1.000 Einträge (Glossar 31.10.): Die Liste zeigt je einen Anfangsbuchstaben. Griechische Zeichen außerhalb der griechischen Sprache und andere Zeichen bilden je eine eigene Gruppe. */
  const anfang = (t: string) => {
    const c = t.trim()[0]?.toLocaleUpperCase() ?? '#', g = c.normalize('NFD')[0] ?? c;
    if (!/\p{L}/u.test(g)) return '#';
    return /\p{Script=Greek}/u.test(g) && aktuelleSprache() !== 'el' ? 'α' : g;
  };
  const anfaenge = $derived([...new Set(inBereich('begriffe').map(a => anfang(a.titel)))]);
  let anfangWahl = $state<string | null>(null);
  /** Name des Buchstaben-Knopfs für Vorlesegeräte: „Buchstabe A“ (nicht nur das Zeichen). */
  const anfangName = (z: string) => z === '#' ? L('Sonstige Zeichen', 'Other characters') : z === 'α' ? L('Griechische Buchstaben', 'Greek letters') : L(`Buchstabe ${z}`, `Letter ${z}`);
  const anfangJetzt = $derived(anfangWahl ?? (artikel?.bereich === 'begriffe' ? anfang(artikel.titel) : anfaenge[0]));
  /** Gibt es zu Artikel oder Begriff Fragen? Dann „Üben (n Fragen)“ - die Zuordnung steht im Hauptpaket, die Fragen werden erst beim Üben geladen. */
  const ueben = (i: string) => themaFuerHilfe(i);
  /** „Ausprobieren“ nur, wo es ein Ziel gibt. */
  const probieren = (i: string) => probierenFuerHilfe(i);
  const titelVon = (i: string) => liste.find(a => a.id === i)?.titel ?? i;
  /** „Ausprobieren mit dem Beispiel …“: die Beispiele, die dieses Verfahren zeigen (Zuordnung in `hilfe/artikel-beispiele.ts`). */
  const beispieleVon = (i: string) => beispieleFuerHilfe(i).map(id => BEISPIELE.find(b => b.id === id)).filter((b): b is Beispiel => !!b);
  let beispielOffen = $state<string | null>(null);
  async function probiereBeispiel(b: Beispiel) {
    beispielOffen = b.id;
    try { await oeffneBeispielDirekt(b); }
    catch (e) {
      meldeFehler(L('Das Beispiel ließ sich nicht öffnen. Bitte noch einmal versuchen.', 'The example could not be opened. Please try again.'));
      if (import.meta.env.DEV) console.warn(e);
    } finally { beispielOffen = null; }
  }

  let frage = $state('');
  let aktiv = $state(0);
  let feld = $state<HTMLInputElement>();
  let kopf = $state<HTMLElement>();
  const treffer = $derived(suche(liste, frage, geladenFuer).slice(0, 25));
  $effect(() => { void frage; aktiv = 0; });
  /** Trefferzahl: erst, wenn die Person kurz aufhört zu tippen (nicht bei jedem Tastendruck), einmal über lib/ansage.ts. */
  $effect(() => {
    const n = treffer.length;
    if (!frage.trim()) return;
    const t = setTimeout(() => sage(n ? L(`${n} Treffer`, `${n} results`) : L('Keine Treffer', 'No results')), 700);
    return () => clearTimeout(t);
  });

  let offen = $state<Record<string, boolean>>({});
  const istOffen = (b: Bereich) => offen[b] ?? (artikel ? artikel.bereich === b : b === 'start');

  /** Sprung aus der Suche: Suchwörter und Artikel; die Abschnitte, in denen sie stehen, öffnen sich. */
  let sprung = $state<{ id: string; frage: string }>();
  /** „Zurück zur Trefferliste“ gibt es nur, solange der geöffnete Artikel aus einer Suche kam. Der Knopf steht im Dokument vor dem Inhaltsverzeichnis (Rest-Block B9). */
  const zeigeZurueck = $derived(!!artikel && !!sprung && !!sprung.frage.trim() && sprung.id === artikel.id);
  function oeffne(i: string) { sprung = { id: i, frage };  frage = ''; location.hash = `hilfe/${i}`; sage(L(`Artikel geöffnet: ${titelVon(i)}`, `Article opened: ${titelVon(i)}`)); }
  function taste(e: KeyboardEvent) {
    if (e.key === 'ArrowDown' && treffer.length) { e.preventDefault(); aktiv = (aktiv + 1) % treffer.length; scrolleAktiv(); }
    else if (e.key === 'ArrowUp' && treffer.length) { e.preventDefault(); aktiv = (aktiv - 1 + treffer.length) % treffer.length; scrolleAktiv(); }
    else if (e.key === 'Enter' && treffer[aktiv]) { e.preventDefault(); oeffne(treffer[aktiv]!.artikel.id); }
    else if (e.key === 'Escape' && frage) { e.preventDefault(); e.stopPropagation(); frage = ''; }
  }
  /** Rückweg vom Artikel zur Trefferliste: gleiche Suche, der zuletzt gewählte Treffer ist wieder der aktive (Fokus im Suchfeld, `aria-activedescendant` zeigt auf ihn). */
  async function zurZuTreffern() {
    const q = sprung?.frage ?? '', gewaehlt = sprung?.id;
    if (!q.trim()) return;
    frage = q;
    location.hash = 'hilfe';
    await tick();
    aktiv = Math.max(0, treffer.findIndex(t => t.artikel.id === gewaehlt));
    feld?.focus(); scrolleAktiv();
  }
  const scrolleAktiv = () => tick().then(() => document.getElementById(`hs-${aktiv}`)?.scrollIntoView({ block: 'nearest' }));

  /** Beim Wechsel des Artikels: Fokus auf dessen Überschrift (nicht beim allerersten Öffnen - dort geht der Fokus ins Suchfeld). */
  let zuletzt: string | undefined | null = null;
  $effect(() => {
    const neu = artikel?.id; void liste;
    if (neu === zuletzt) return;
    const erstes = zuletzt === null; zuletzt = neu;
    if (neu) zaehleEinmal('hilfe', neu);   // Zählung ohne Personenbezug: gelesener Artikel, je Sitzung einmal
    
    tick().then(() => {
      if (!neu) { if (!erstes) feld?.focus(); return; }
      scrollTo(0, 0);
      if (erstes) return;
      kopf?.focus({ preventScroll: true });
    });
  });

  onMount(() => {
    // Die App setzt nach dem Seitenwechsel den Fokus auf die Überschrift; danach springt er ins Suchfeld.
    const t = setTimeout(() => { if (!artikel) feld?.focus(); else kopf?.focus({ preventScroll: true }); }, 60);
    const global = (e: KeyboardEvent) => {
      if (e.key !== '/' || !(e.ctrlKey || e.metaKey) || e.altKey) return;   // WCAG 2.1.4: kein Kürzel aus einer einzelnen Taste
      e.preventDefault(); feld?.focus(); feld?.select();
    };
    addEventListener('keydown', global);
    return () => { clearTimeout(t); removeEventListener('keydown', global); };
  });
  /** Teilt die Blöcke an den Zwischenüberschriften in Abschnitte (der erste kann ohne Überschrift beginnen). */
  function sektionen(bl: Artikel['inhalt']): Artikel['inhalt'][] {
    const aus: Artikel['inhalt'][] = [];
    for (const b of bl) { if (typeof b !== 'string' && 'h' in b || !aus.length) aus.push([]); aus.at(-1)!.push(b); }
    return aus;
  }
</script>

<div class="tisch {begriffe.stapel.length && begriffe.imRand ? '' : 'ohne-rand'}"><section class="blatt rund hilfe {artikel || unbekannt ? 'mit-artikel' : ''} {frage.trim() ? 'sucht' : ''}" aria-labelledby="hi-t">
  <SeitenKopf titelId="hi-t" titel={L('Hilfe', 'Help')} zurueck={!!(artikel || unbekannt)} />

  <div class="suche suchfeld">
    <label class="nur-vorleser" for="hi-suche">{L('In der Hilfe suchen', 'Search in help')}</label>
    <Icon n="suche" />
    <input id="hi-suche" bind:this={feld} bind:value={frage} type="search" autocomplete="off" spellcheck="false" enterkeyhint="search"
      placeholder={L('In der Hilfe suchen, z. B. „Mittelwert“', 'Search in help, e.g. "mean"')}
      role="combobox" aria-expanded={!!frage.trim() && treffer.length > 0} aria-controls={frage.trim() && treffer.length ? 'hi-treffer' : undefined} aria-autocomplete="list" aria-activedescendant={treffer.length ? `hs-${aktiv}` : undefined}
      onkeydown={taste}>
    <kbd aria-hidden="true" class="schraeg">/</kbd>
  </div>

  <div class="raster" class:mit-zurueck={zeigeZurueck}>
    {#if zeigeZurueck && sprung}<div class="zu-treffern-zeile"><button type="button" class="k leise zu-treffern" onclick={zurZuTreffern}><Icon n="links" />{L('Zurück zur Trefferliste', 'Back to the results')}{' '}<span class="nur-vorleser">{L(`für „${sprung.frage.trim()}“`, `for "${sprung.frage.trim()}"`)}</span></button></div>{/if}
    <nav class="inhalt" aria-label={L('Inhalt der Hilfe', 'Help contents')}>
      {#if !modul}
        {#if ladefehler}<p class="leise-text" role="status">{L('Die Hilfe konnte nicht geladen werden (kein Netz?).', 'The help could not be loaded (no connection?).')} <button type="button" class="k leise klein-knopf" onclick={lade}>{L('Nochmal versuchen', 'Try again')}</button></p>
        {:else}<p class="leise-text" role="status">{#if animAn.an}<Rechnet text={L('Hilfe wird geladen …', 'Loading help …')} />{/if}</p>{/if}
      {:else if frage.trim()}
        {#if treffer.length}
          <ul class="treffer" id="hi-treffer" role="listbox" aria-label={L('Treffer', 'Results')}>
            {#each treffer as t, i (t.artikel.id)}
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <li id="hs-{i}" role="option" aria-selected={i === aktiv} aria-labelledby="hs-{i}-t" aria-describedby="hs-{i}-b hs-{i}-v" class:aktiv={i === aktiv} onclick={() => oeffne(t.artikel.id)} onmousemove={() => (aktiv = i)}>
                <span class="t-titel" id="hs-{i}-t">{#each t.titel as p}{#if p.treffer}<mark><Sprachteile text={p.text} /></mark>{:else}<Sprachteile text={p.text} />{/if}{/each}</span>
                <span class="t-bereich" id="hs-{i}-b">{bereichName(t.artikel.bereich)}</span>
                {#if t.fach}<span class="t-fach">{L('Fachbegriff: ', 'Technical term: ')}{t.fach}</span>{/if}
                <span class="t-text" id="hs-{i}-v">{#each t.ausschnitt as p}{#if p.treffer}<mark>{p.text}</mark>{:else}{p.text}{/if}{/each}</span>
                {#if ueben(t.artikel.id)}{@const u = ueben(t.artikel.id)!}<a class="t-ueben" href="#verstehen/ueben/{u.id}" onclick={(e) => e.stopPropagation()}>{Lp(u.n, `Üben (${u.n} Frage)`, `Üben (${u.n} Fragen)`, `Practise (${u.n} question)`, `Practise (${u.n} questions)`)}</a>{/if}
                {#if probieren(t.artikel.id)}<a class="t-ueben" href="#verstehen/{probieren(t.artikel.id)}" onclick={(e) => e.stopPropagation()}>{L('Ausprobieren', 'Try it out')}</a>{/if}
              </li>
            {/each}
          </ul>
        {:else}
          <p class="leise-text">{L('Dazu steht nichts in der Hilfe. Andere Schreibweise oder ein Oberbegriff (z. B. „Gruppen“, „Korrelation“) kann helfen.', 'Nothing in the help matches. Try another spelling or a broader term (e.g. "groups", "correlation").')}</p>
          <div id="hi-vorschlaege">
            <p class="leise-text">{L('Vielleicht hilft einer dieser Einstiege:', 'Maybe one of these starting points helps:')}</p>
            <ul class="vorschlaege">
              {#each VORSCHLAEGE as v (v)}{#if liste.some(a => a.id === v)}<li><a href="#hilfe/{v}" onclick={() => (frage = '')}>{titelVon(v)}</a></li>{/if}{/each}
            </ul>
          </div>
        {/if}
      {:else}
        <ul class="bereiche" id="hi-bereiche">
          {#each BEREICHE as b (b.id)}
            <li>
              <button type="button" class="b-kopf" aria-expanded={istOffen(b.id)} aria-controls="hb-{b.id}" onclick={() => (offen[b.id] = !istOffen(b.id))}>
                <span class="pfeil" aria-hidden="true">{istOffen(b.id) ? '▾' : richtung() === 'rtl' ? '◂' : '▸'}</span>{bereichName(b.id)}<span class="zahl">{inBereich(b.id).length}</span>
              </button>
              {#if istOffen(b.id)}
                {#if b.id === 'begriffe'}<div class="b-anfaenge" role="group" aria-label={L('Anfangsbuchstabe', 'First letter')}>{#each anfaenge as z (z)}<button type="button" class="b-anfang" aria-label={anfangName(z)} aria-current={z === anfangJetzt ? 'true' : undefined} onclick={() => (anfangWahl = z)}>{z}</button>{/each}</div>{/if}
                <ul id="hb-{b.id}" class="b-liste" transition:rutsch>
                  {#each b.id === 'begriffe' ? inBereich(b.id).filter(a => anfang(a.titel) === anfangJetzt) : inBereich(b.id) as a (a.id)}
                    <li><a href="#hilfe/{a.id}" aria-current={a.id === id ? 'page' : undefined}><Sprachteile text={a.titel} /></a></li>
                  {/each}
                </ul>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
    </nav>

    <article class="artikel">
      {#if artikel}
        <a class="k leise nur-schmal-zurueck" href="#hilfe"><Icon n="links" />{L('Alle Hilfe-Themen', 'All help topics')}</a>
        <p class="krumen">{bereichName(artikel.bereich)}</p>
        <h2 id="hi-art" tabindex="-1" bind:this={kopf}><Sprachteile text={artikel.titel} /></h2>
        {@render inhalt(artikel)}
        {#if ueben(artikel.id) || probieren(artikel.id)}<p class="heft-text knopfzeile">
          {#if ueben(artikel.id)}{@const u = ueben(artikel.id)!}<a class="k" href="#verstehen/ueben/{u.id}">{Lp(u.n, `Üben (${u.n} Frage)`, `Üben (${u.n} Fragen)`, `Practise (${u.n} question)`, `Practise (${u.n} questions)`)}</a>{/if}
          {#if probieren(artikel.id)}<a class="k" href="#verstehen/{probieren(artikel.id)}">{L('Ausprobieren', 'Try it out')}</a>{/if}</p>{/if}
        {#if beispieleVon(artikel.id).length}<p class="heft-text knopfzeile">
          {#each beispieleVon(artikel.id) as b (b.id)}<button type="button" class="k" disabled={beispielOffen !== null} onclick={() => probiereBeispiel(b)}>{L(`Ausprobieren mit dem Beispiel „${waehle(b.titel)}“`, `Try it with the example “${waehle(b.titel)}”`)}</button>{/each}</p>{/if}
        {#if bezug}
          <details class="auf" style="margin-top:var(--a4)"><summary>{L('So geht es in', 'How to do it in')} {bezugNamen}</summary>
            {#if b.excel && bezug.excel.length}<h3 style="margin:var(--a3) 0 var(--a1)">Excel</h3><ul class="heft-text">{#each bezug.excel as z, i (i)}<li>{z}</li>{/each}</ul>{/if}
            {#if b.ti84 && bezug.ti.length}<h3 style="margin:var(--a3) 0 var(--a1)">TI-84</h3><ul class="heft-text">{#each bezug.ti as z, i (i)}<li>{z}</li>{/each}</ul>{/if}
            {#if b.spss && bezug.spss.length}<h3 style="margin:var(--a3) 0 var(--a1)">SPSS</h3><ul class="heft-text">{#each bezug.spss as z, i (i)}<li>{z}</li>{/each}</ul>{/if}
            {#if b.r && bezug.r.length}<h3 style="margin:var(--a3) 0 var(--a1)">R</h3><ul class="heft-text">{#each bezug.r as z, i (i)}<li><code>{z}</code></li>{/each}</ul>{/if}
            {#if b.jamovi && bezug.jamovi.length}<h3 style="margin:var(--a3) 0 var(--a1)">jamovi</h3><ul class="heft-text">{#each bezug.jamovi as z, i (i)}<li>{z}</li>{/each}</ul>{/if}
            {#if b.stata && bezug.stata.length}<h3 style="margin:var(--a3) 0 var(--a1)">Stata</h3><ul class="heft-text">{#each bezug.stata as z, i (i)}<li><code>{z}</code></li>{/each}</ul>{/if}
            <p class="heft-text" style="color:var(--tinte-2)">{L('Namen und Menüs hängen von der Version und der Sprache des Programms ab; hier stehen sie passend zur Sprache von Statable. Kleine Abweichungen in der letzten Stelle kommen vom Runden.', 'Names and menus depend on the version and the language of the program; here they match the language of Statable. Small differences in the last digit come from rounding.')}</p>
          </details>
        {/if}
        {#if artikel.verwandt.length}
          <aside class="verwandt" aria-labelledby="hi-verw"><h3 id="hi-verw">{L('Verwandt', 'Related')}</h3>
            <ul>{#each artikel.verwandt as v}<li><a href="#hilfe/{v}"><Sprachteile text={titelVon(v)} /></a></li>{/each}</ul></aside>
        {/if}
      {:else if !modul}
        {#if !ladefehler && animAn.an}<p class="heft-text"><Rechnet /></p>{/if}
      {:else}
        {#if unbekannt}<p class="banner ruhig" role="status" style="margin-bottom:var(--a4)">{L('Diesen Hilfe-Artikel gibt es nicht (mehr). Hier die Übersicht:', 'This help article does not exist (any more). Here is the overview:')}</p>{/if}
        <h2 class="ueber-h">{L('Wobei kann die Hilfe helfen?', 'What can the help cover?')}</h2>
        <p class="heft-text">{L('Oben suchen (Taste „Strg + /“) oder ein Thema wählen.', 'Search above (key "Ctrl + /") or choose a topic.')}</p>
        <div class="kacheln" style="margin-top:var(--a4)">
          {#each BEREICHE as b (b.id)}
            {@const erste = inBereich(b.id)[0]}
            <a class="kachel" href="#hilfe/{erste?.id ?? ''}"><b>{bereichName(b.id)}</b><span>{waehle(b.kurz)}</span></a>
          {/each}
        </div>
        <h2 class="ueber-h">{L('So fängt man an', 'How to start')}</h2>
        {#if liste.find(a => a.id === 'erste-schritte')}{@render inhalt(liste.find(a => a.id === 'erste-schritte')!)}{/if}
        <p class="heft-text">{d(`Nicht gefunden, was du suchst, oder stimmt etwas nicht? „Melden“ oben rechts (${kuerzelText('melden')}) schickt eine Nachricht, auf Wunsch mit einem Bild der Seite.`, `Nicht gefunden, was Sie suchen, oder stimmt etwas nicht? „Melden“ oben rechts (${kuerzelText('melden')}) schickt eine Nachricht, auf Wunsch mit einem Bild der Seite.`, `Could not find what you need, or is something wrong? "Report" at the top right (${kuerzelText('melden')}) sends a message, with a picture of the page if you like.`)}</p>
        <h2 class="ueber-h">{L('Statable weitersagen', 'Tell others about Statable')}</h2>
        <p class="heft-text"><Marke groesse={40} /></p>
        <p class="heft-text">{L('Ein Plakat zum Ausdrucken - für ein schwarzes Brett, eine Lehrveranstaltung oder ein Büro.', 'A poster to print - for a notice board, a course or an office.')}</p>
        <PlakatLink />
        <p class="heft-text"><a href="#impressum">{L('Plakat in anderen Sprachen', 'Poster in other languages')}</a></p>
        <p class="heft-text"><a href="#hilfe/ueber-statable">{L('Über Statable', 'About Statable')}</a> · <a href="#impressum">{L('Impressum und Quelltext', 'Legal notice and source code')}</a> · <a href="#datenschutz">{L('Datenschutz', 'Privacy')}</a> · <a href="#barrierefreiheit">{L('Erklärung zur Barrierefreiheit', 'Accessibility statement')}</a></p>
      {/if}
    </article>
  </div>
</section>{#if begriffe.stapel.length && begriffe.imRand}<aside class="rand" aria-label={L('Rand: Erklärungen', 'Margin: explanations')}><RandSchalter /><div class="notiz rand-kontext"><BegriffsInhalt basis={false} /></div></aside>{/if}</div>

{#snippet inhalt(a: Artikel)}{@const gr = sektionen(a.inhalt)}{@const auf = sprung?.id === a.id ? trefferAbschnitte(gr, sprung.frage, a.offen ?? []) : new Set<number>()}<div class="text-rahmen"><div class="text-spalten">{#key a.id}{#each gr as g, i}<div class="sektion"><ArtikelBloecke bloecke={g} offen={a.offen ?? []} aufgeklappt={auf.has(i)} /></div>{/each}{/key}</div></div>{/snippet}

<style>
  .suche { position: relative; display: flex; align-items: center; margin-bottom: var(--a4); }
  /* Lupe und Eingabefeld: gemeinsames Aussehen `.suchfeld` in stil/app.css (Stufe 9) */
  .schraeg { position: absolute; inset-inline-end: var(--a3); border: 1px solid var(--linie-stark); border-radius: 4px; padding: 0 6px; font: 600 var(--gr-klein)/1.5 var(--schrift-ui); color: var(--tinte-2); }
  .suche:focus-within .schraeg { display: none; }
  .raster { display: grid; grid-template-columns: minmax(240px, 300px) minmax(0, 1fr); gap: var(--a6); align-items: start; }
  .inhalt { position: sticky; top: var(--a3); max-height: calc(100vh - 140px); overflow: auto; padding-block: 6px; padding-inline: 6px var(--a2); margin-block: -6px; margin-inline: -6px 0; }
  ul { list-style: none; margin: 0; padding: 0; }
  .b-kopf { display: flex; align-items: center; gap: var(--a2); width: 100%; min-height: 36px; padding: 0 var(--a2); border: 0; background: transparent; color: var(--tinte); font: 650 var(--gr-text)/1.3 var(--schrift-ui); text-align: start; cursor: pointer; border-radius: var(--r-klein); }
  .b-kopf:hover { background: var(--blatt-2); }
  .pfeil { width: 1em; color: var(--tinte-2); }
  .zahl { margin-inline-start: auto; color: var(--tinte-2); font-weight: 400; font-size: var(--gr-klein); }
  .b-liste { margin-block: 0 var(--a2); margin-inline: var(--a4) 0; border-inline-start: 1px solid var(--linie); }
  .b-liste a { display: block; padding: 6px var(--a3); color: var(--tinte); text-decoration: none; border-inline-start: 3px solid transparent; margin-inline-start: -1px; font-size: var(--gr-text); line-height: 1.3; }
  .b-liste a:hover { background: var(--blatt-2); }
  .b-liste a[aria-current] { border-inline-start-color: var(--akzent); background: var(--akzent-hell); color: var(--akzent-tinte); font-weight: 650; }
  .treffer li { padding: var(--a2) var(--a3); border-radius: var(--r-klein); cursor: pointer; display: grid; gap: 2px; border: 1px solid transparent; }
  .treffer li.aktiv { background: var(--akzent-hell); border-color: var(--akzent); }
  .t-titel { font-weight: 650; }
  .t-ueben { justify-self: start; font-size: var(--gr-klein); font-weight: 650; color: var(--akzent-tinte); }
  .t-fach { font-size: var(--gr-klein); color: var(--tinte-2); }
  .vorschlaege { margin: 0; padding-inline-start: var(--a5); display: grid; gap: var(--a2); }
  .b-anfaenge { display: flex; flex-wrap: wrap; gap: 2px; margin: var(--a1) 0 var(--a2); }
  .b-anfang { min-width: 1.9em; padding: 2px 4px; border: 1px solid transparent; border-radius: 6px; background: none; color: var(--tinte-2); font: inherit; font-size: var(--gr-klein); cursor: pointer; }
  .b-anfang:hover { border-color: var(--linie, currentColor); }
  .b-anfang[aria-current="true"] { background: var(--akzent-tinte); color: var(--blatt); font-weight: 700; }
  .t-bereich { font-size: var(--gr-klein); color: var(--akzent-tinte); }
  .t-text { font-size: var(--gr-klein); color: var(--tinte-2); line-height: 1.4; }
  mark { background: #FFE9A8; color: #1D2530; border-radius: 2px; padding: 0 1px; }
  .leise-text { color: var(--tinte-2); }
  .artikel { min-width: 0; }
  /* Breites Fenster (11.10.): der Artikel läuft in Abschnitten (je Zwischenüberschrift) nebeneinander. Jede Spalte hat höchstens die lesbare
     Zeilenlänge (--breite-text, 68ch); passt nur eine, bleibt es wie bisher eine Spalte. Abschnitte reißen nie auseinander. */
  .text-rahmen { container-type: inline-size; font: 400 var(--gr-text)/1.55 var(--schrift-heft); }
  .text-spalten { display: grid; grid-template-columns: minmax(0, var(--breite-text)); column-gap: var(--a7); row-gap: var(--a4); align-items: start; justify-content: start; }
  @container (min-width: calc(2 * 56ch + 3rem)) { .text-spalten { grid-template-columns: repeat(2, minmax(0, var(--breite-text))); } }
  @container (min-width: calc(3 * 56ch + 6rem)) { .text-spalten { grid-template-columns: repeat(3, minmax(0, var(--breite-text))); } }
  .sektion { min-width: 0; }
  .krumen { font-size: var(--gr-klein); color: var(--akzent-tinte); font-weight: 650; margin: 0 0 var(--a1); }
  .artikel h2 { font: 650 var(--gr-h1)/var(--zh-eng) var(--schrift-heft); margin: 0 0 var(--a3); scroll-margin-top: var(--a6); }
  .artikel h2:focus-visible { outline: var(--fokus-outline); outline-offset: 2px; border-radius: 4px; }
  .zu-treffern { margin-bottom: var(--a2); }
  :global(:where(:root:not(.eng-759))) .raster.mit-zurueck > .zu-treffern-zeile { grid-column: 2; grid-row: 1; }
  :global(:where(:root:not(.eng-759))) .raster.mit-zurueck > .inhalt { grid-column: 1; grid-row: 1 / span 2; }
  :global(:where(:root:not(.eng-759))) .raster.mit-zurueck > .artikel { grid-column: 2; grid-row: 2; }
  :global(:where(:root:not(.eng-759))) .raster.mit-zurueck { row-gap: 0; }
  .ueber-h { font: 650 var(--gr-h2)/1.3 var(--schrift-ui); margin: var(--a5) 0 var(--a2); }
  .ueber-h:first-child { margin-top: 0; }
  .artikel :global(.heft-text) { margin-top: var(--a2); }
  .verwandt { margin-top: var(--a6); padding-top: var(--a3); border-top: 1px solid var(--linie); }
  .verwandt h3 { font: 650 var(--gr-text)/1.3 var(--schrift-ui); margin: 0 0 var(--a2); }
  .verwandt ul { display: flex; flex-wrap: wrap; gap: var(--a2); }
  .verwandt a { display: inline-block; padding: 4px var(--a3); border: 1px solid var(--linie-stark); border-radius: var(--r-rund); text-decoration: none; color: var(--akzent-tinte); font-size: var(--gr-klein); }
  .verwandt a:hover { background: var(--akzent-hell); }
  .nur-schmal-zurueck { display: none; margin-bottom: var(--a2); }
  /* gefühlte Breite bis 759 px (lib/groesse.svelte.ts) */
  :global(:where(:root.eng-759)) .raster { grid-template-columns: minmax(0, 1fr); }
  :global(:where(:root.eng-759)) .inhalt { position: static; max-height: none; overflow: visible; padding: 0; }
  /* Handy: ohne Artikel Suche + Inhalt, mit Artikel nur der Artikel (Zurück-Knopf führt zur Liste). */
  :global(:where(:root.eng-759)) .hilfe:not(.mit-artikel) .artikel, :global(:where(:root.eng-759)) .hilfe.sucht .artikel { display: none; }
  :global(:where(:root.eng-759)) .hilfe.mit-artikel:not(.sucht) .inhalt { display: none; }
  :global(:where(:root.eng-759)) .hilfe.mit-artikel .nur-schmal-zurueck { display: inline-flex; }
</style>
