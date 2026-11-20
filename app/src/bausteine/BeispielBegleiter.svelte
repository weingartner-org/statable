<script lang="ts">
  import { rutsch } from '../lib/rutsch';
  import { s, L } from '../lib/sitzung.svelte';
  import { beispielNach, t } from '../lib/beispiele';
  import { lauf, beendeLauf, frageVorschlag } from '../lib/beispielvorschlag.svelte';
  import { VERFAHREN } from '../lib/verfahren';
  import { metaDirekt } from '../lib/metaentwurf.svelte';
  import Icon from './Icon.svelte';
  import { eng } from '../lib/groesse.svelte';
  import { lernSchrittOffen, lernstand } from '../lib/lernzustand.svelte';
  import { einheitNach } from '../lernen/lernplan';
  import { abschnitte, istFertig } from '../lernen/lernstand';

  let { seite }: { seite: string } = $props();

  const bsp = $derived(lauf.a && s.projekt && s.projekt.id === lauf.a.projekt ? beispielNach(lauf.a.id) ?? null : null);
  const schritt = $derived(bsp ? bsp.schritte[Math.min(lauf.schritt, bsp.schritte.length - 1)]! : null);
  const sichtbar = $derived(!!bsp && ['daten', 'spalten', 'blatt', 'bericht', 'befehle'].includes(seite));

  /** Das Beispiel kam aus „Lernen“ und steht auf dem Schritt dieses Abschnitts: das Öffnen der Frage wird gemerkt (ein Ergebnis danach schließt den Abschnitt ab). */
  const von = $derived(lauf.a?.von);
  /** Der Abschnitt in „Lernen“ ist schon durchgemacht (Frage geöffnet und gerechnet): dann ist „Zurück zum Lernen“ der Hauptknopf, nicht noch einmal „Frage öffnen“. */
  const erledigt = $derived.by(() => {
    const e = von ? einheitNach(von.einheit) : undefined;
    const a = e && von && e.id === von.einheit ? abschnitte(e).find(x => x.schluessel === von.schluessel) : undefined;   // ohne `von` (Beispiel nicht aus Lernen geöffnet) gäbe undefined === undefined sonst abschnitte(undefined)
    return !!e && !!a && von!.schritt === lauf.schritt && istFertig(lernstand.st, e, a);
  });
  function oeffneFrage() {
    if (!schritt) return;
    if (von && von.schritt === lauf.schritt && s.projekt) lernSchrittOffen(von.einheit, von.schluessel, schritt.art, s.projekt.id);
    if (eng(759)) lauf.offen = false;   // auf dem Handy nicht die Frage verdecken
    if (schritt.art === 'planen') { location.hash = 'planen'; return; }
    if (schritt.art === 'meta') { metaDirekt.an = true; if (location.hash !== '#blatt/neu') location.hash = 'blatt/neu'; return; }   // wie beim Öffnen des Beispiels: gleich die Meta-Karte mit der eingetragenen Tabelle
    const w = schritt.w ?? {};
    if (!VERFAHREN.some(v => v.id === schritt.art)) return;
    // Wurde eine Frage umgepolt (Spalte „pa3R“), nimmt die Frage die umgepolte Spalte.
    // Die Schritte nennen die Spalten wie in der Datei; in den Daten heißen sie wie in der Sprache beim Öffnen (lauf.a.namen).
    const ers = (l?: string[]) => (l ?? []).map(d => lauf.a?.namen?.[d] ?? d).map(n => (s.spalten.some(x => x.name === n + 'R') ? n + 'R' : n));
    frageVorschlag.v = { art: schritt.art, w: { l1: ers(w.l1), l2: ers(w.l2), l3: ers(w.l3), l4: ers(w.l4) } };
    if (location.hash === '#blatt/neu') { scrollTo({ top: 0, behavior: 'smooth' }); /* schon dort: der Zustand wirkt sofort */ } else location.hash = 'blatt/neu';
  }
  /** Meldet die Höhe des Begleiters an die Seite: die Seitenleiste endet darüber (app.css `.begleiter-da .rand`), statt darunter verdeckt zu werden. */
  function misse(knoten: HTMLElement) {
    const w = document.documentElement;
    const setze = () => { w.style.setProperty('--begleiter-h', `${knoten.offsetHeight}px`); w.classList.add('begleiter-da'); };
    setze();
    const b = new ResizeObserver(setze);
    b.observe(knoten);
    return { destroy() { b.disconnect(); w.style.removeProperty('--begleiter-h'); w.classList.remove('begleiter-da'); } };
  }
  /** Ein Ausschnitt aus „Lernen“ hat nur die Spalten dieses Schrittes: kein Blättern zu anderen Schritten. */
  const ausschnitt = $derived(!!lauf.a?.nur?.length);
  const weiter = (n: number) => { if (bsp) lauf.schritt = Math.max(0, Math.min(bsp.schritte.length - 1, lauf.schritt + n)); };
</script>

{#if sichtbar && bsp && schritt}
  <aside class="begleiter" use:misse class:zu={!lauf.offen} aria-label={L('Beispiel-Begleiter', 'Example guide')}>
    <header>
      <button class="k leise kopf-knopf" type="button" aria-expanded={lauf.offen} onclick={() => (lauf.offen = !lauf.offen)}>
        <Icon n="blatt" /><span class="titel">{t(bsp.titel)}</span>
        {#if !ausschnitt}<span class="nr">{lauf.schritt + 1}/{bsp.schritte.length}</span>{/if}
      </button>
    </header>
    {#if lauf.offen}
      <div class="inhalt" transition:rutsch>
        <h2>{t(schritt.titel)}</h2>
        <p>{t(schritt.text)}</p>
        <div class="knopfzeile">
          {#if erledigt && von}
            <a class="k haupt" href="#lernen/{von.einheit}/{von.nr}">{L('Zurück zum Lernen', 'Back to learning')}</a>
            <button class="k leise" type="button" onclick={oeffneFrage}>{schritt.art === 'planen' ? L('Zur Planung', 'To planning') : L('Frage noch einmal öffnen', 'Open the question again')}</button>
          {:else}
            <button class="k haupt" type="button" onclick={oeffneFrage}>{schritt.art === 'planen' ? L('Zur Planung', 'To planning') : L('Frage öffnen', 'Open the question')}</button>
          {/if}
        </div>
        <div class="unten">
          {#if !ausschnitt}
            <button class="k leise" type="button" disabled={lauf.schritt === 0} onclick={() => weiter(-1)}>{L('Zurück', 'Back')}</button>
            <button class="k leise" type="button" disabled={lauf.schritt >= bsp.schritte.length - 1} onclick={() => weiter(1)}>{L('Nächste Frage', 'Next question')}</button>
          {/if}
          <button class="k leise" type="button" onclick={beendeLauf}>{L('Beenden', 'Close guide')}</button>
          {#if von && !erledigt}<a class="k leise" href="#lernen/{von.einheit}/{von.nr}">{L('Zurück zum Lernen', 'Back to learning')}</a>{/if}
        </div>
        {#if bsp.quelle}<p class="quelle">{t(bsp.quelle)}</p>{/if}
      </div>
    {/if}
  </aside>
{/if}

<style>
  .begleiter{position:fixed;inset-inline-end: var(--a3);bottom:var(--a3);width:min(24rem,calc(100vw - 2 * var(--a3)));max-height:70vh;overflow:auto;background:var(--blatt);border-radius:var(--r-gross);box-shadow:0 8px 28px rgba(0,0,0,.22);border:1px solid var(--linie-stark);z-index:40}
  .kopf-knopf{width:100%;display:flex;align-items:center;gap:var(--a2);justify-content:flex-start;text-align: start}
  .titel{flex:1;font-weight:650}
  .nr{color:var(--tinte-2)}
  .inhalt{padding:0 var(--a4) var(--a3)}
  h2{font:650 var(--gr-h2)/1.3 var(--schrift-ui);margin-bottom:var(--a2)}
  .inhalt p{color:var(--tinte)}
  .knopfzeile{margin-top:var(--a3);display:flex;flex-wrap:wrap;gap:var(--a2)}
  .unten{display:flex;flex-wrap:wrap;gap:var(--a1,4px);margin-top:var(--a2)}
  .quelle{font-size:.85em;color:var(--tinte-2);margin-top:var(--a2)}
  :global(:where(:root.eng-760)) .begleiter{bottom:calc(var(--a3) + 64px)}   /* gefühlte Breite (lib/groesse.svelte.ts) */
</style>
