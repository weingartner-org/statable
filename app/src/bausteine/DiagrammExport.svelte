<script lang="ts">
  import { getContext, type Snippet } from 'svelte';
  import { L, d, melde, sichern, s, einstSpeichern, type Blatt } from '../lib/sitzung.svelte';
  import { gestaltMit, istGrund, sammle, wendeAn, type Gefunden, type Gestalt } from '../lib/gestalt';
  import DiagrammGestalten from './DiagrammGestalten.svelte';
  import { speichereSvg, speicherePngDruck, kopierePng, kannBildKopieren } from '../lib/bild';
  import ExportMenue, { type ExportEintrag } from './ExportMenue.svelte';

  /** Rahmen um ein Diagramm mit dem Menü „Export“: PNG für den Druck (300 dpi bei 16 cm), SVG, PDF, Bild kopieren.
   *  Das Menü sucht das SVG im Rahmen selbst - der Baustein braucht keine Verdrahtung. */
  let { titel, children, klasse = '', sperre = null, kategorien = [] }: { titel: string; children: Snippet; klasse?: string; /** Kategorien, deren Reihenfolge der Editor ändern darf (S-G) */ kategorien?: { label: string; namen: string[]; feld: 'reihe' | 'reiheB' }[]; /** Satz statt Diagramm: mit Fallgewicht zeichnen Diagramme aus einzelnen Zeilen jede Zeile einmal und sind gesperrt (Fachblatt S-A, 1.5) */ sperre?: string | null } = $props();
  let ort = $state<HTMLElement>();
  const svg = () => ort?.querySelector('svg') ?? null;
  /** Läuft das Diagramm über den Rand (Rahmen mit Rollleiste), wird der Rahmen mit der Tastatur erreichbar und beschriftet (Abnahme 3, M4). */
  let rollt = $state(false);
  /** Ein Bereich, der sich scrollen lässt, muss mit der Tastatur erreichbar sein (Region mit Namen, fokussierbar). Nur dann; ein fester Bereich bleibt ein gewöhnliches div.
   *  Die Attribute stehen nicht im Markup, weil sie vom Messergebnis abhängen und nicht beim ersten Zeichnen feststehen. */
  $effect(() => {
    const el = ort; if (!el) return;
    if (rollt) { el.setAttribute('role', 'region'); el.tabIndex = 0; el.setAttribute('aria-label', L(`${titel}, nach rechts scrollbar`, `${titel}, scrollable to the right`)); }
    else { el.removeAttribute('role'); el.removeAttribute('tabindex'); el.removeAttribute('aria-label'); }
  });
  $effect(() => {
    if (!ort || !klasse.includes('scroll') || typeof ResizeObserver === 'undefined') return;
    const el = ort, pruefe = () => { rollt = el.scrollWidth > el.clientWidth + 1; };
    const ro = new ResizeObserver(pruefe); ro.observe(el); for (const k of Array.from(el.children)) ro.observe(k); pruefe();
    return () => ro.disconnect();
  });
  /** Die Leiste mit „Export“ endet bündig an der rechten Kante des Diagramms, wie bei den Tabellen - nicht am Rand des Bildschirms (Johannes 10.10.). */
  let breite = $state(0);
  $effect(() => {
    const el = ort; if (!el || typeof ResizeObserver === 'undefined') return;
    const miss = () => { const v = el.querySelector('svg'); breite = v ? Math.min(Math.round(v.getBoundingClientRect().width), el.clientWidth) : 0; };
    const ro = new ResizeObserver(miss); ro.observe(el); const v = el.querySelector('svg'); if (v) ro.observe(v); miss();
    return () => ro.disconnect();
  });
  /** Diagramm gestalten (S-G): die Wahl steht am Blatt (Schlüssel = Titel), wo es ein Blatt gibt; sonst nur für diese Sitzung. */
  const holeBlatt = getContext<(() => Blatt | null) | undefined>('dgBlatt');
  let lokal = $state<Gestalt | undefined>();
  const g = $derived(gestaltMit(holeBlatt?.()?.gestalt?.[titel] ?? lokal));
  let gestaltOffen = $state(false);
  let gefunden = $state<Gefunden>({ texte: [], farben: [] });
  const kennung = $props.id();
  function aendere(n: Gestalt) {
    const b = holeBlatt?.();
    if (!b) { lokal = istGrund(n) ? undefined : n; return; }
    const rest = { ...(b.gestalt ?? {}) };
    if (istGrund(n)) delete rest[titel]; else rest[titel] = n;
    b.gestalt = Object.keys(rest).length ? rest : undefined;
    void sichern();
  }
  /** Die Wahl auf das gezeichnete SVG setzen und nach jedem Neuzeichnen von Svelte wieder (Originalwerte stehen am Element). */
  let angewendet = false;
  $effect(() => {
    const el = ort; if (!el || typeof MutationObserver === 'undefined') return;
    const x = g, offen = gestaltOffen;
    let uhr: ReturnType<typeof setTimeout> | undefined;
    const opt = { subtree: true, childList: true, characterData: true };
    const mo = new MutationObserver(() => { clearTimeout(uhr); uhr = setTimeout(lauf, 40); });
    function lauf() {
      const v = el!.querySelector('svg'); if (!v) return;
      mo.disconnect();
      if (!istGrund(x) || angewendet) { wendeAn(v, x); angewendet = !istGrund(x); }
      if (offen) gefunden = sammle(v);
      mo.observe(el!, opt);
    }
    lauf();
    return () => { mo.disconnect(); clearTimeout(uhr); };
  });
  const fehler = () => melde(d('Das ließ sich nicht speichern. Versuche es als SVG.', 'Das ließ sich nicht speichern. Versuchen Sie es als SVG.', "That couldn't be saved. Try saving it as SVG."));
  async function los(f: (v: SVGSVGElement) => Promise<void> | void, ok: string) {
    const v = svg(); if (!v) return;
    try { await f(v); melde(ok); } catch (e) { console.error(e); fehler(); }
  }
  const gespeichert = L('Gespeichert. Die Datei liegt bei den Downloads.', 'Saved. You will find the file in your downloads.');
  const eintraege = $derived<ExportEintrag[]>([
    { id: 'png', text: L('PNG (300 dpi, für den Druck)', 'PNG (300 dpi, for print)'), tun: () => los(v => speicherePngDruck(v, titel), gespeichert) },
    { id: 'svg', text: L('SVG (Vektor)', 'SVG (vector)'), tun: () => los(v => speichereSvg(v, titel), gespeichert) },
    { id: 'pdf', text: L('PDF (Abbildung, über Drucken)', 'PDF (figure, via Print)'), tun: () => los(async v => { const { druckeAbbildungBarrierefrei } = await import('../lib/druckansicht'); await druckeAbbildungBarrierefrei(v, titel, ort); }, L('Die Druckansicht ist offen. Dort „Als PDF speichern“ wählen.', 'The print view is open. Choose "Save as PDF" there.')) },
    ...(kannBildKopieren() ? [{ id: 'kopie', text: L('Bild kopieren', 'Copy image'), icon: 'kopieren', tun: () => los(v => kopierePng(v), L('Bild kopiert - in Word einfügen.', 'Image copied - paste it into Word.')) }] : [])
    ,{ id: 'logo', gruppe: L('Einstellung', 'Setting'), text: L('Statable-Logo klein unten in Diagrammen', 'Small Statable logo at the bottom of charts'), pruef: s.einst.bildLogo !== false,
      tun: () => { s.einst.bildLogo = s.einst.bildLogo === false; einstSpeichern(); melde(s.einst.bildLogo !== false ? L('Logo an. Gilt für alle Abbildungen.', 'Logo on. Applies to all figures.') : L('Logo aus. Gilt für alle Abbildungen.', 'Logo off. Applies to all figures.')); } }
  ]);
</script>

{#if sperre}
<div class="dgx dgx-gesperrt" role="note"><p class="heft-text">{sperre}</p></div>
{:else}
<div class="dgx {klasse}">
  <div class="dgx-leiste" style:max-width={breite ? `${breite}px` : null}><button type="button" class="k leise dgx-gestalten" aria-expanded={gestaltOffen} aria-controls={gestaltOffen ? `dgx-g-${kennung}` : undefined} onclick={() => (gestaltOffen = !gestaltOffen)}>{L('Gestalten', 'Style')}</button><ExportMenue {eintraege} klein name={`${L('Abbildung', 'Figure')}: ${titel}`} /></div>
  {#if gestaltOffen}<div id="dgx-g-{kennung}"><DiagrammGestalten {g} {gefunden} {aendere} {kategorien} schliesse={() => (gestaltOffen = false)} /></div>{/if}
  <div class="dgx-ort" class:rollt bind:this={ort}>{@render children()}</div>
  {#if rollt}<p class="dgx-hinweis">{L('Nach rechts wischen oder scrollen, um den Rest zu sehen.', 'Swipe or scroll to the right to see the rest.')}</p>{/if}
</div>
{/if}

<style>
  .dgx-leiste { display: flex; justify-content: flex-end; align-items: center; gap: var(--a2); margin-bottom: 2px; }
.dgx-scroll .dgx-ort { overflow-x: auto; }
  .dgx-ort.rollt { background: linear-gradient(to right, var(--blatt) 30%, transparent) left / 24px 100% no-repeat local, linear-gradient(to left, var(--blatt) 30%, transparent) right / 24px 100% no-repeat local, radial-gradient(farthest-side at 0 50%, rgba(0,0,0,.22), transparent) left / 10px 100% no-repeat scroll, radial-gradient(farthest-side at 100% 50%, rgba(0,0,0,.22), transparent) right / 10px 100% no-repeat scroll; }
  .dgx-ort.rollt:focus-visible { outline: 2px solid var(--akzent); outline-offset: 2px; }
  .dgx-hinweis { margin: var(--a1) 0 0; font-size: var(--s-klein, .85rem); color: var(--tinte-2); }
</style>
